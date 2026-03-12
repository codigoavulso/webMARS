import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const resultDir = join(repoRoot, "test-results");
const resultPath = join(resultDir, "ui-menus-suite.json");
const EDGE_PATH = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = Number(process.env.UI_MENUS_DEBUG_PORT || 9226);
const APP_PORT = Number(process.env.UI_MENUS_APP_PORT || 8084);
const TARGET_URL = process.env.UI_MENUS_TARGET_URL || `http://localhost:${APP_PORT}/`;

const examples = (JSON.parse(readFileSync(join(repoRoot, "web", "examples", "examples.json"), "utf8").replace(/^\uFEFF/, "")).examples || [])
  .map((x) => ({ label: String(x.label || ""), category: String(x.category || ""), path: String(x.path || ""), fileCount: Array.isArray(x.files) ? x.files.length : 1 }))
  .filter((x) => x.label && x.category && x.path);
const tools = (JSON.parse(readFileSync(join(repoRoot, "web", "tools", "tools.json"), "utf8").replace(/^\uFEFF/, "")).tools || [])
  .map((x) => ({ id: String(x.id || ""), label: String(x.label || "") }))
  .filter((x) => x.id && x.label)
  .sort((a, b) => a.label.localeCompare(b.label));
const browserScriptTemplate = readFileSync(join(repoRoot, "web", "scripts", "ui-menus-browser.js"), "utf8");

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function waitForHttpReady(url) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function getTarget() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const targets = await response.json();
      const page = targets.find((entry) => String(entry?.url || "").startsWith(TARGET_URL));
      if (page?.webSocketDebuggerUrl) return page;
    } catch {}
    await wait(250);
  }
  throw new Error(`No DevTools target found for ${TARGET_URL}`);
}

async function createCdpClient(page) {
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 1;
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const task = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message || "CDP error"));
    else task.resolve(message.result);
  };
  await new Promise((resolveOpen, rejectOpen) => {
    socket.onopen = resolveOpen;
    socket.onerror = rejectOpen;
  });
  const send = (method, params = {}) => new Promise((resolveTask, rejectTask) => {
    const id = nextId++;
    pending.set(id, { resolve: resolveTask, reject: rejectTask });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return { socket, send };
}

function buildBrowserTestSource() {
  return browserScriptTemplate
    .replace("__EXAMPLES__", JSON.stringify(examples))
    .replace("__TOOLS__", JSON.stringify(tools));
}

async function main() {
  mkdirSync(resultDir, { recursive: true });
  const server = spawn(process.execPath, ["scripts/serve-web.mjs"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(APP_PORT) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let serverLog = "";
  server.stdout.on("data", (chunk) => { serverLog += String(chunk); });
  server.stderr.on("data", (chunk) => { serverLog += String(chunk); });

  const userDataDir = mkdtempSync(join(tmpdir(), "webmars-ui-menus-"));
  const browser = spawn(EDGE_PATH, [
    "--headless=new",
    "--disable-gpu",
    "--window-size=1400,1000",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    TARGET_URL
  ], { stdio: "ignore", detached: false });

  try {
    await waitForHttpReady(TARGET_URL);
    const page = await getTarget();
    const { socket, send } = await createCdpClient(page);
    try {
      await send("Page.enable");
      await send("Runtime.enable");
      await send("Page.bringToFront");
      await wait(1800);
      const evaluation = await send("Runtime.evaluate", {
        expression: buildBrowserTestSource(),
        awaitPromise: true,
        returnByValue: true
      });
      const report = evaluation?.result?.value;
      if (!report || typeof report !== "object") throw new Error("UI menus suite did not return a valid report.");
      report.host = { targetUrl: TARGET_URL, edgePath: EDGE_PATH, appPort: APP_PORT, debugPort: DEBUG_PORT };
      writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
      console.log(`UI menus suite: ${report.summary.passed}/${report.summary.total} passed`);
      for (const entry of report.cases) {
        const prefix = entry.ok ? "PASS" : "FAIL";
        console.log(`${prefix} ${entry.name} (${entry.durationMs} ms)`);
        if (!entry.ok) console.log(String(entry.error || "").trim());
      }
      if (report.summary.failed > 0) {
        if (serverLog.trim().length) {
          console.log("Server log:");
          console.log(serverLog.trim());
        }
        process.exitCode = 1;
      }
    } finally {
      socket.close();
    }
  } finally {
    if (!browser.killed) browser.kill("SIGKILL");
    if (!server.killed) server.kill("SIGKILL");
    await wait(250);
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  const fallbackReport = { generatedAt: new Date().toISOString(), fatal: true, error: message };
  try {
    mkdirSync(resultDir, { recursive: true });
    writeFileSync(resultPath, `${JSON.stringify(fallbackReport, null, 2)}\n`, "utf8");
  } catch {}
  console.error(message);
  process.exit(1);
});
