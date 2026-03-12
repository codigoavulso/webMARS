import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const resultDir = join(repoRoot, "test-results");
const resultPath = join(resultDir, "runtime-controls-smoke.json");

const EDGE_PATH = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = Number(process.env.EDGE_DEBUG_PORT || 9224);
const APP_PORT = Number(process.env.RUNTIME_CONTROLS_APP_PORT || 8082);
const TARGET_URL = process.env.RUNTIME_CONTROLS_TARGET_URL || `http://localhost:${APP_PORT}/`;

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

    const byId = (id) => {
      const element = document.getElementById(id);
      assert(element, "Missing element #" + id);
      return element;
    };

    const click = async (id) => {
      byId(id).click();
      await wait(80);
    };

    const setEditorSource = async (source) => {
      const editor = byId("source-editor");
      editor.focus();
      editor.value = source;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(120);
    };

    const waitFor = async (predicate, timeoutMs, label) => {
      const started = performance.now();
      while ((performance.now() - started) < timeoutMs) {
        if (predicate()) return;
        await wait(50);
      }
      throw new Error("Timed out waiting for " + label);
    };

    const waitForBackstepEnabled = async (timeoutMs, label) => {
      const started = performance.now();
      while ((performance.now() - started) < timeoutMs) {
        if (!byId("btn-backstep").disabled) return;
        const controlInputs = window.WebMarsRuntimeDebug?.getControlInputs?.() || null;
        if (controlInputs?.canBackstep) {
          window.WebMarsRuntimeDebug?.refreshControls?.();
          if (!byId("btn-backstep").disabled) return;
        }
        await wait(50);
      }
      throw new Error("Timed out waiting for " + label);
    };

    const buttonState = () => ({
      assembleDisabled: byId("btn-assemble").disabled,
      goDisabled: byId("btn-go").disabled,
      stepDisabled: byId("btn-step").disabled,
      backstepDisabled: byId("btn-backstep").disabled,
      resetDisabled: byId("btn-reset").disabled,
      pauseDisabled: byId("btn-pause").disabled,
      stopDisabled: byId("btn-stop").disabled
    });

    const debugSnapshot = () => window.WebMarsRuntimeDebug?.getSnapshot?.({
      includeDataRows: false,
      includeLabels: false,
      includeMemoryWords: false
    }) || null;

    const debugFlags = () => ({
      buttons: window.WebMarsRuntimeDebug?.getButtonState?.() || null,
      run: window.WebMarsRuntimeDebug?.getRunFlags?.() || null,
      inputs: window.WebMarsRuntimeDebug?.getControlInputs?.() || null,
      snapshot: debugSnapshot(),
      dom: window.WebMarsRuntimeDebug?.getControlDomState?.() || null,
      liveBackstepDisabled: byId("btn-backstep").disabled
    });

    const textRowCount = () => document.querySelectorAll("#text-segment-body tr[data-text-address]").length;
    const textBodyText = () => (document.getElementById("text-segment-body")?.textContent || "").trim();

    const setRunSpeed = async (value) => {
      const slider = byId("run-speed-slider");
      slider.value = String(value);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(80);
    };

    const assertControlsRecoveredAfterPause = () => {
      assert(byId("btn-assemble").disabled === false, "Assemble should be enabled after pause.");
      assert(byId("btn-go").disabled === false, "Go should be enabled after pause.");
      assert(byId("btn-step").disabled === false, "Step should be enabled after pause.");
      assert(byId("btn-backstep").disabled === false, "Backstep should stay enabled after pause when history exists.");
      assert(byId("btn-pause").disabled === true, "Pause should be disabled after pausing.");
      assert(byId("btn-stop").disabled === true, "Stop should be disabled after pause.");
    };

    const finiteProgram = [
      ".text",
      "main:",
      "addi $t0, $zero, 1",
      "addi $t1, $t0, 2",
      "addi $t2, $t1, 3",
      "li $v0, 10",
      "syscall",
      ""
    ].join("\n");

    const loopProgram = [
      ".text",
      "main:",
      "addi $t0, $t0, 1",
      "j main",
      "nop",
      ""
    ].join("\n");

    return (async () => {
      const report = {
        generatedAt: new Date().toISOString(),
        cases: []
      };

      const runCase = async (name, fn) => {
        const started = performance.now();
        try {
          const detail = await fn();
          report.cases.push({
            name,
            ok: true,
            durationMs: Math.round((performance.now() - started) * 1000) / 1000,
            detail
          });
        } catch (error) {
          report.cases.push({
            name,
            ok: false,
            durationMs: Math.round((performance.now() - started) * 1000) / 1000,
            error: error instanceof Error ? (error.stack || error.message) : String(error)
          });
        }
      };

      await runCase("step_backstep_cycle", async () => {
      await setEditorSource(finiteProgram);
      await click("btn-assemble");
      await waitFor(() => !byId("btn-step").disabled, 3000, "step enabled after assemble");
      assert(byId("btn-backstep").disabled === true, "Backstep should start disabled after assemble.");
      assert(textRowCount() > 0, "Text segment should be loaded after assemble.");

      await click("btn-step");
        try {
          await waitForBackstepEnabled(2500, "backstep enabled after one step");
        } catch (error) {
          const refreshed = window.WebMarsRuntimeDebug?.refreshControls?.() || null;
          throw new Error((error instanceof Error ? error.message : String(error)) + " :: " + JSON.stringify({
            beforeRefresh: debugFlags(),
            afterRefresh: refreshed
          }));
        }

        await click("btn-backstep");
        await waitFor(() => byId("btn-backstep").disabled === true, 2000, "backstep disabled after returning to start");
        assert(textRowCount() > 0, "Backstep should not clear the text segment.");
        assert(!/No text segment loaded/i.test(textBodyText()), "Backstep should not replace text rows with empty-state message.");

        return {
          buttons: buttonState(),
          textRows: textRowCount(),
          debug: debugFlags()
        };
      });

      await runCase("pause_cycle", async () => {
        await setEditorSource(loopProgram);
        await click("btn-assemble");
        await waitFor(() => !byId("btn-go").disabled, 3000, "go enabled after assemble");
        await setRunSpeed(5);

        await click("btn-go");
        await waitFor(() => byId("btn-pause").disabled === false, 2000, "pause enabled while running");
        await waitFor(() => (window.WebMarsRuntimeDebug?.getControlInputs?.()?.canBackstep === true), 3000, "backstep available before pausing interactive run");

        await click("btn-pause");
        await waitFor(() => byId("btn-pause").disabled === true, 2000, "pause disabled after pausing");
        await waitFor(() => byId("btn-backstep").disabled === false, 2000, "backstep enabled after pausing interactive run");
        assertControlsRecoveredAfterPause();

        return {
          buttons: buttonState(),
          debug: debugFlags()
        };
      });

      await runCase("pause_cycle_unlimited", async () => {
        await setEditorSource(loopProgram);
        await click("btn-assemble");
        await waitFor(() => !byId("btn-go").disabled, 3000, "go enabled after assemble");
        await setRunSpeed(40);

        await click("btn-go");
        await waitFor(() => byId("btn-pause").disabled === false, 2000, "pause enabled while running at unlimited speed");
        await wait(250);

        await click("btn-pause");
        await waitFor(() => byId("btn-pause").disabled === true, 2000, "pause disabled after pausing unlimited run");
        await waitFor(() => byId("btn-step").disabled === false, 2000, "step enabled after pausing unlimited run");
        await waitFor(() => byId("btn-backstep").disabled === false, 2000, "backstep enabled after pausing unlimited run");
        assertControlsRecoveredAfterPause();

        return {
          buttons: buttonState(),
          debug: debugFlags()
        };
      });

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

  const userDataDir = mkdtempSync(join(tmpdir(), "webmars-controls-"));
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
        throw new Error("Runtime controls smoke test did not return a valid report.");
      }

      report.host = {
        targetUrl: TARGET_URL,
        edgePath: EDGE_PATH,
        appPort: APP_PORT,
        debugPort: DEBUG_PORT
      };

      writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

      console.log(`Runtime controls smoke: ${report.summary.passed}/${report.summary.total} passed`);
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
