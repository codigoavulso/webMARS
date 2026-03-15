import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

export const EDGE_PATH = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

export const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

export function normalizeBackendMode(value, fallback = "js") {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "hybrid" ? "hybrid" : fallback;
}

export async function waitForHttpReady(url) {
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Keep polling until the local server is up.
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

export async function getTarget(debugPort, targetUrl) {
  for (let i = 0; i < 120; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const targets = await response.json();
      const page = targets.find((entry) => String(entry?.url || "").startsWith(targetUrl));
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      // Keep waiting for the browser endpoint.
    }
    await wait(250);
  }
  throw new Error(`No DevTools target found for ${targetUrl}`);
}

export async function createCdpClient(page) {
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 1;

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolvePending, rejectPending } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectPending(new Error(message.error.message || "CDP error"));
    else resolvePending(message.result);
  };

  await new Promise((resolveOpen, rejectOpen) => {
    socket.onopen = resolveOpen;
    socket.onerror = rejectOpen;
  });

  const send = (method, params = {}) => new Promise((resolvePending, rejectPending) => {
    const id = nextId++;
    pending.set(id, { resolvePending, rejectPending });
    socket.send(JSON.stringify({ id, method, params }));
  });

  return { socket, send };
}

export async function launchBrowserHarness({ repoRoot, appPort, targetUrl, debugPort, edgePath = EDGE_PATH }) {
  const userDataDir = mkdtempSync(join(tmpdir(), `webmars-parity-${appPort}-`));
  const server = spawn(process.execPath, ["scripts/serve-web.mjs"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(appPort) },
    stdio: "ignore",
    detached: false
  });

  const browser = spawn(edgePath, [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    targetUrl
  ], {
    stdio: "ignore",
    detached: false
  });

  await waitForHttpReady(targetUrl);
  const page = await getTarget(debugPort, targetUrl);
  const cdp = await createCdpClient(page);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Page.bringToFront");
  await wait(1400);

  return { server, browser, userDataDir, ...cdp };
}

export function cleanupBrowserHarness(harness) {
  try { harness?.socket?.close?.(); } catch {}
  try { harness?.server?.kill?.(); } catch {}
  try { harness?.browser?.kill?.(); } catch {}
  try { if (harness?.userDataDir) rmSync(harness.userDataDir, { recursive: true, force: true }); } catch {}
}

export function normalizeText(text) {
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeDiagnosticMessage(text) {
  return normalizeText(text).replace(/\\/g, "/");
}

export function comparePrimitive(label, left, right, mismatches) {
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    mismatches.push({ area: label, detail: { left, right } });
  }
}

export function mapBy(list, keyFn) {
  const map = new Map();
  (Array.isArray(list) ? list : []).forEach((entry) => map.set(keyFn(entry), entry));
  return map;
}

export function formatHex(value) {
  return `0x${(Number(value) >>> 0).toString(16).padStart(8, "0")}`;
}
