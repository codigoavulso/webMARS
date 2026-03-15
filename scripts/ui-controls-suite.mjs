import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const resultDir = join(repoRoot, "test-results");
const resultPath = join(resultDir, "ui-controls-suite.json");

const EDGE_PATH = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = Number(process.env.UI_CONTROLS_DEBUG_PORT || 9225);
const APP_PORT = Number(process.env.UI_CONTROLS_APP_PORT || 8083);
const TARGET_URL = process.env.UI_CONTROLS_TARGET_URL || `http://localhost:${APP_PORT}/`;

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
      await wait(100);
    };

    const setEditorSource = async (source) => {
      const editor = byId("source-editor");
      editor.focus();
      editor.value = source;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(150);
    };

    const setRunSpeed = async (value) => {
      const slider = byId("run-speed-slider");
      slider.value = String(value);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(100);
    };

    const submitRunInput = async (value) => {
      const input = byId("run-input-field");
      input.focus();
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await click("run-input-send");
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

    const buttons = () => ({
      compileDisabled: byId("btn-compile-c0").disabled,
      assembleDisabled: byId("btn-assemble").disabled,
      goDisabled: byId("btn-go").disabled,
      stepDisabled: byId("btn-step").disabled,
      backstepDisabled: byId("btn-backstep").disabled,
      resetDisabled: byId("btn-reset").disabled,
      pauseDisabled: byId("btn-pause").disabled,
      stopDisabled: byId("btn-stop").disabled
    });

    const debugState = () => ({
      buttons: window.WebMarsRuntimeDebug?.getButtonState?.() || null,
      run: window.WebMarsRuntimeDebug?.getRunFlags?.() || null,
      inputs: window.WebMarsRuntimeDebug?.getControlInputs?.() || null,
      snapshot: window.WebMarsRuntimeDebug?.getSnapshot?.({
        includeDataRows: false,
        includeLabels: false,
        includeMemoryWords: false
      }) || null,
      error: window.WebMarsRuntimeDebug?.getLastControlSyncError?.() || null
    });

    const runOutput = () => String(byId("run-messages").value || byId("run-messages").textContent || "");
    const textRowCount = () => document.querySelectorAll("#text-segment-body tr[data-text-address]").length;

    const assertButtons = (expected, label) => {
      const current = buttons();
      Object.entries(expected).forEach(([key, value]) => {
        assert(current[key] === value, label + " :: expected " + key + "=" + value + ", got " + current[key]);
      });
      return current;
    };

    const waitForButtons = async (expected, timeoutMs, label) => {
      await waitFor(() => {
        const current = buttons();
        return Object.entries(expected).every(([key, value]) => current[key] === value);
      }, timeoutMs, label);
      return buttons();
    };

    const seedAssemblyFile = async (source = "", name = "src/main.s") => {
      const setEditorFiles = window.WebMarsRuntimeDebug?.setEditorFiles;
      assert(typeof setEditorFiles === "function", "Missing runtime debug file setter.");
      setEditorFiles([{ name, source }], name);
      await wait(150);
    };

    const assembleProgram = async (source) => {
      await seedAssemblyFile(source);
      await click("btn-assemble");
      await waitFor(() => !byId("btn-go").disabled, 4000, "go enabled after assemble");
      assert(textRowCount() > 0, "Text segment should be loaded after assemble.");
    };

    const factorialProgram = [
      "# Recursive factorial (faculty classic)",
      "# Reads n and prints n! (for small n).",
      "",
      ".data",
      "ask: .asciiz \"n (0..12)? \"",
      "out: .asciiz \"factorial = \"",
      "",
      ".text",
      "main:",
      "  li $v0, 4",
      "  la $a0, ask",
      "  syscall",
      "",
      "  li $v0, 5",
      "  syscall",
      "  move $a0, $v0",
      "",
      "  jal fact",
      "  move $s0, $v0",
      "",
      "  li $v0, 4",
      "  la $a0, out",
      "  syscall",
      "",
      "  li $v0, 1",
      "  move $a0, $s0",
      "  syscall",
      "",
      "  li $v0, 11",
      "  li $a0, '\\n'",
      "  syscall",
      "",
      "  li $v0, 10",
      "  syscall",
      "",
      "# int fact(int n)",
      "fact:",
      "  addiu $sp, $sp, -8",
      "  sw    $ra, 4($sp)",
      "  sw    $a0, 0($sp)",
      "",
      "  blez  $a0, fact_base",
      "  li    $t0, 1",
      "  beq   $a0, $t0, fact_base",
      "",
      "  addiu $a0, $a0, -1",
      "  jal   fact",
      "",
      "  lw    $t1, 0($sp)",
      "  mul   $v0, $v0, $t1",
      "  j     fact_end",
      "",
      "fact_base:",
      "  li    $v0, 1",
      "",
      "fact_end:",
      "  lw    $ra, 4($sp)",
      "  addiu $sp, $sp, 8",
      "  jr    $ra",
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
            error: error instanceof Error ? (error.stack || error.message) : String(error),
            debug: debugState()
          });
        }
      };

      await runCase("idle_and_assemble_controls", async () => {
        await seedAssemblyFile("");
        assertButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: true,
          stepDisabled: true,
          backstepDisabled: true,
          resetDisabled: true,
          pauseDisabled: true,
          stopDisabled: true
        }, "initial controls");

        await assembleProgram(factorialProgram);
        assertButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: false,
          stepDisabled: false,
          backstepDisabled: true,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, "controls after assemble");

        return {
          buttons: buttons(),
          debug: debugState()
        };
      });

      await runCase("step_and_backstep_controls", async () => {
        await assembleProgram(factorialProgram);

        await click("btn-step");
        await waitFor(() => byId("btn-backstep").disabled === false, 2500, "backstep enabled after step");
        assertButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: false,
          stepDisabled: false,
          backstepDisabled: false,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, "controls after one step");

        await click("btn-backstep");
        await waitFor(() => byId("btn-backstep").disabled === true, 2000, "backstep disabled after returning to start");
        assertButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: false,
          stepDisabled: false,
          backstepDisabled: true,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, "controls after backstep to start");

        return {
          buttons: buttons(),
          debug: debugState()
        };
      });

      await runCase("go_waiting_for_input_and_stop", async () => {
        await assembleProgram(factorialProgram);
        await setRunSpeed(25);

        await click("btn-go");
        await waitFor(() => debugState().run?.runPausedForInput === true, 5000, "runtime waiting for input");
        assertButtons({
          compileDisabled: true,
          assembleDisabled: true,
          goDisabled: true,
          stepDisabled: true,
          backstepDisabled: true,
          resetDisabled: true,
          pauseDisabled: true,
          stopDisabled: false
        }, "controls while waiting for input");

        await click("btn-stop");
        await waitFor(() => debugState().run?.runPausedForInput === false, 3000, "input wait cleared after stop");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: true,
          stepDisabled: true,
          backstepDisabled: false,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, 3000, "controls after stop from input wait");
        assert(debugState().snapshot?.halted === true, "Program should be halted after stop.");

        return {
          buttons: buttons(),
          debug: debugState()
        };
      });

      await runCase("pause_resume_and_reset_with_factorial_input", async () => {
        await assembleProgram(factorialProgram);
        await setRunSpeed(25);

        await click("btn-go");
        await waitFor(() => debugState().run?.runPausedForInput === true, 5000, "runtime waiting for input before resume");
        await submitRunInput("10");
        await waitFor(() => debugState().run?.runActive === true && byId("btn-pause").disabled === false, 4000, "runtime resumed after input");
        await wait(150);

        await click("btn-pause");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: false,
          stepDisabled: false,
          backstepDisabled: false,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, 3000, "controls after pause during factorial run");

        await click("btn-go");
        await waitFor(() => debugState().snapshot?.halted === true, 12000, "factorial run halted after resume");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: true,
          stepDisabled: true,
          backstepDisabled: false,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, 3000, "controls after halted factorial run");
        await click("btn-reset");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: false,
          stepDisabled: false,
          backstepDisabled: true,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, 4000, "controls after reset");
        assert(debugState().snapshot?.halted === false, "Reset should restore a non-halted assembled state.");

        return {
          buttons: buttons(),
          debug: debugState(),
          output: runOutput()
        };
      });

      await runCase("file_type_aliases_drive_mode_and_actions", async () => {
        const setEditorFiles = window.WebMarsRuntimeDebug?.setEditorFiles;
        assert(typeof setEditorFiles === "function", "Missing runtime debug file setter.");

        setEditorFiles([
          { name: "src/main.c", source: "int main(void) { return 0; }\n" }
        ], "src/main.c");
        await waitForButtons({
          compileDisabled: false,
          assembleDisabled: true
        }, 2000, "controls for active .c source");
        assert(byId("mode-c0").classList.contains("active"), ".c source should activate C0 mode.");

        setEditorFiles([
          { name: "include/runtime.h0", source: "int puts(char* text);\n" }
        ], "include/runtime.h0");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: true
        }, 2000, "controls for active .h0 header");
        assert(byId("mode-c0").classList.contains("active"), ".h0 header should stay in C0 mode.");

        setEditorFiles([
          { name: "src/main.mips", source: factorialProgram }
        ], "src/main.mips");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: false
        }, 2000, "controls for active .mips source");
        assert(byId("mode-assembly").classList.contains("active"), ".mips source should activate Assembly mode.");

        return {
          buttons: buttons(),
          debug: debugState()
        };
      });

      await runCase("reset_uses_last_successful_assembly_after_switching_to_c", async () => {
        const setEditorFiles = window.WebMarsRuntimeDebug?.setEditorFiles;
        assert(typeof setEditorFiles === "function", "Missing runtime debug file setter.");
        const mixedFiles = [
          { name: "src/main.s", source: factorialProgram },
          { name: "src/helper.c", source: "int main(void) { return 0; }\n" }
        ];

        setEditorFiles(mixedFiles, "src/main.s");
        await wait(150);
        await click("btn-assemble");
        await waitFor(() => !byId("btn-go").disabled, 4000, "assembled ASM before switching tabs");

        setEditorFiles(mixedFiles, "src/helper.c");
        await waitForButtons({
          compileDisabled: false,
          assembleDisabled: true,
          resetDisabled: false
        }, 2000, "controls after switching to active C source");

        await click("btn-reset");
        await waitForButtons({
          compileDisabled: false,
          assembleDisabled: true,
          goDisabled: false,
          stepDisabled: false,
          resetDisabled: false
        }, 4000, "controls after reset from active C tab");
        assert(textRowCount() > 0, "Reset should preserve the previously assembled ASM program.");

        return {
          buttons: buttons(),
          debug: debugState()
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

  const userDataDir = mkdtempSync(join(tmpdir(), "webmars-ui-controls-"));
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
        throw new Error("UI controls suite did not return a valid report.");
      }

      report.host = {
        targetUrl: TARGET_URL,
        edgePath: EDGE_PATH,
        appPort: APP_PORT,
        debugPort: DEBUG_PORT
      };

      writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

      console.log(`UI controls suite: ${report.summary.passed}/${report.summary.total} passed`);
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
