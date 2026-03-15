import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const resultDir = join(repoRoot, "test-results");
const resultPath = join(resultDir, "backend-mode-smoke.json");

const EDGE_PATH = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = Number(process.env.EDGE_DEBUG_PORT || 9226);
const APP_PORT = Number(process.env.BACKEND_MODE_APP_PORT || 8083);
const TARGET_URL = process.env.BACKEND_MODE_TARGET_URL || `http://localhost:${APP_PORT}/`;

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function waitForHttpReady(url) {
  for (let i = 0; i < 80; i += 1) {
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

async function getTarget() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const targets = await response.json();
      const page = targets.find((entry) => String(entry?.url || "").startsWith(TARGET_URL));
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      // Keep waiting for the browser endpoint.
    }
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

function buildBrowserTestSource() {
  return String.raw`(() => {
    const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));
    const assert = (condition, message) => {
      if (!condition) throw new Error(message);
    };

    const source = [
      ".text",
      "main:",
      "addi $t0, $zero, 3",
      "addi $t1, $zero, 4",
      "addu $t2, $t0, $t1",
      "li $v0, 10",
      "syscall",
      ""
    ].join("\n");

    const combos = [
      { name: "js_js", assemblerBackendMode: "js", simulatorBackendMode: "js" },
      { name: "hybrid_js", assemblerBackendMode: "hybrid", simulatorBackendMode: "js" },
      { name: "js_hybrid", assemblerBackendMode: "js", simulatorBackendMode: "hybrid" },
      { name: "hybrid_hybrid", assemblerBackendMode: "hybrid", simulatorBackendMode: "hybrid" }
    ];

    return (async () => {
      const report = {
        generatedAt: new Date().toISOString(),
        wasmBridge: window.WebMarsWasmCore?.status || null,
        cases: []
      };

      for (const combo of combos) {
        const started = performance.now();
        let beforeAssemble = null;
        let assembled = null;
        let engine = null;
        try {
          const settings = {
            ...DEFAULT_SETTINGS,
            assemblerBackendMode: combo.assemblerBackendMode,
            simulatorBackendMode: combo.simulatorBackendMode,
            coreBackend: combo.simulatorBackendMode === "hybrid" ? "wasm" : "js"
          };
          engine = createMarsEngine({
            settings,
            memoryMap: { ...DEFAULT_MEMORY_MAP }
          });
          await wait(1400);
          beforeAssemble = typeof engine.getBackendInfo === "function" ? engine.getBackendInfo() : null;
          assembled = engine.assemble(source, {
            sourceName: combo.name + ".s"
          });
          assert(assembled && assembled.ok === true, combo.name + ": assemble failed");
          await wait(150);
          const afterAssemble = typeof engine.getBackendInfo === "function" ? engine.getBackendInfo() : null;
          const step = typeof engine.step === "function"
            ? engine.step({ includeSnapshot: false })
            : null;
          assert(step && step.ok === true, combo.name + ": first step failed");
          const afterStep = typeof engine.getBackendInfo === "function" ? engine.getBackendInfo() : null;

          if (combo.assemblerBackendMode === "js") {
            assert(assembled.native !== true, combo.name + ": assembler should remain JS");
          }
          if (combo.assemblerBackendMode === "hybrid" && report.wasmBridge?.ready === true) {
            assert(assembled.native === true, combo.name + ": assembler should use experimental native path");
          }
          if (combo.simulatorBackendMode === "js") {
            assert(afterStep?.backend === "js", combo.name + ": simulator should remain JS");
          }
          if (combo.simulatorBackendMode === "hybrid" && report.wasmBridge?.ready === true) {
            assert(afterStep?.backend === "wasm", combo.name + ": simulator should use experimental native path");
          }

          report.cases.push({
            name: combo.name,
            ok: true,
            durationMs: Math.round((performance.now() - started) * 1000) / 1000,
            detail: {
              selection: combo,
              beforeAssemble,
              assembled: {
                ok: assembled.ok === true,
                native: assembled.native === true,
                fallback: assembled.fallback === true
              },
              afterAssemble,
              afterStep,
              stepSummary: {
                done: step.done === true,
                halted: step.halted === true,
                waitingForInput: step.waitingForInput === true
              }
            }
          });
        } catch (error) {
          report.cases.push({
            name: combo.name,
            ok: false,
            durationMs: Math.round((performance.now() - started) * 1000) / 1000,
            error: error instanceof Error ? (error.stack || error.message) : String(error),
            detail: {
              assembled: typeof assembled === "object" && assembled
                ? {
                    ok: assembled.ok === true,
                    native: assembled.native === true,
                    fallback: assembled.fallback === true,
                    reason: assembled.reason || "",
                    errors: Array.isArray(assembled.errors) ? assembled.errors : [],
                    warnings: Array.isArray(assembled.warnings) ? assembled.warnings : []
                  }
                : null,
              beforeAssemble,
              afterAssemble: typeof engine?.getBackendInfo === "function" ? engine.getBackendInfo() : null
            }
          });
        }
      }

      report.summary = {
        total: report.cases.length,
        passed: report.cases.filter((entry) => entry.ok).length,
        failed: report.cases.filter((entry) => !entry.ok).length
      };
      return report;
    })();
  })()`;
}

async function main() {
  mkdirSync(resultDir, { recursive: true });

  const server = spawn(process.execPath, ["scripts/serve-web.mjs"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(APP_PORT) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let serverLog = "";
  server.stdout.on("data", (chunk) => {
    serverLog += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    serverLog += String(chunk);
  });

  const userDataDir = mkdtempSync(join(tmpdir(), "webmars-backend-modes-"));
  const browser = spawn(EDGE_PATH, [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    TARGET_URL
  ], {
    stdio: "ignore",
    detached: false
  });

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
      if (!report || typeof report !== "object") {
        throw new Error("Backend mode smoke test did not return a valid report.");
      }

      report.host = {
        targetUrl: TARGET_URL,
        edgePath: EDGE_PATH,
        appPort: APP_PORT,
        debugPort: DEBUG_PORT
      };

      writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

      console.log(`Backend mode smoke: ${report.summary.passed}/${report.summary.total} passed`);
      for (const entry of report.cases) {
        const prefix = entry.ok ? "PASS" : "FAIL";
        console.log(`${prefix} ${entry.name} (${entry.durationMs} ms)`);
        if (!entry.ok) console.log(String(entry.error || "").trim());
      }

      if (report.summary.failed > 0) {
        process.exitCode = 1;
      }
    } finally {
      socket.close();
    }
  } finally {
    if (!browser.killed) browser.kill("SIGKILL");
    if (!server.killed) server.kill("SIGKILL");
    await wait(250);
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup failures on Windows.
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  const fallbackReport = {
    generatedAt: new Date().toISOString(),
    fatal: true,
    error: message
  };
  try {
    mkdirSync(resultDir, { recursive: true });
    writeFileSync(resultPath, `${JSON.stringify(fallbackReport, null, 2)}\n`, "utf8");
  } catch {
    // Ignore fallback persistence failure.
  }
  console.error(message);
  process.exit(1);
});
