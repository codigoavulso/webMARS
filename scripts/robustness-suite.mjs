import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const resultDir = join(repoRoot, "test-results");
const resultPath = join(resultDir, "robustness-suite.json");

const EDGE_PATH = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = Number(process.env.EDGE_DEBUG_PORT || 9223);
const APP_PORT = Number(process.env.ROBUSTNESS_APP_PORT || 8081);
const TARGET_URL = process.env.ROBUSTNESS_TARGET_URL || `http://localhost:${APP_PORT}/`;

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

function buildBrowserSuiteSource() {
  return String.raw`(() => {
    const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));
    const suite = [];

    const toMessage = (error) => {
      if (error instanceof Error) return error.stack || error.message;
      return String(error);
    };

    const assert = (condition, message) => {
      if (!condition) throw new Error(message);
    };

    const createEngineWithWarmup = async (backend = "wasm", overrides = {}) => {
      const engine = createMarsEngine({
        settings: { ...DEFAULT_SETTINGS, coreBackend: backend, ...(overrides.settings || {}) },
        memoryMap: { ...DEFAULT_MEMORY_MAP, ...(overrides.memoryMap || {}) }
      });
      if (backend === "wasm") {
        await wait(1200);
      }
      return engine;
    };

    const runProgram = async ({ backend = "wasm", source, settings = {}, memoryMap = {}, maxSteps = 1000, hooks = null }) => {
      const engine = await createEngineWithWarmup(backend, { settings, memoryMap });
      if (hooks && typeof engine.setRuntimeHooks === "function") {
        engine.setRuntimeHooks(hooks);
      }
      const assembled = engine.assemble(source, { sourceName: backend + "-suite.s" });
      const result = engine.stepMany(maxSteps, { includeSnapshot: false });
      const snapshot = engine.getSnapshot({
        includeDataRows: false,
        includeLabels: true,
        includeTextRows: false
      });
      return { engine, assembled, result, snapshot };
    };

    const getRegisterValue = (snapshot, name) => {
      const entry = Array.isArray(snapshot?.registers)
        ? snapshot.registers.find((item) => item?.name === name)
        : null;
      return entry ? (entry.value | 0) : null;
    };

    const addCase = (name, fn) => {
      suite.push({ name, fn });
    };

    addCase("backend_bootstrap_ready", async () => {
      const engine = await createEngineWithWarmup("wasm");
      const info = engine.getBackendInfo();
      assert(info && typeof info === "object", "Missing backend info.");
      assert(String(info.backend || "").includes("wasm"), "WASM backend was not selected.");
      assert(window.WebMarsWasmCore?.status, "WASM bridge status missing.");
      return { backend: info, bridge: window.WebMarsWasmCore.status };
    });

    addCase("js_wasm_parity_basic_execution", async () => {
      const source = ".text\nmain:\naddi $t0, $zero, 5\naddi $t1, $zero, 7\naddu $t2, $t0, $t1\nli $v0, 10\nsyscall\n";
      const jsRun = await runProgram({ backend: "js", source });
      const wasmRun = await runProgram({ backend: "wasm", source });
      assert(jsRun.assembled.ok === true, "JS backend failed to assemble baseline program.");
      assert(wasmRun.assembled.ok === true, "WASM backend failed to assemble baseline program.");
      assert(getRegisterValue(jsRun.snapshot, "$t2") === 12, "JS backend produced wrong result.");
      assert(getRegisterValue(wasmRun.snapshot, "$t2") === 12, "WASM backend produced wrong result.");
      assert(getRegisterValue(jsRun.snapshot, "$t2") === getRegisterValue(wasmRun.snapshot, "$t2"), "JS/WASM register mismatch.");
      return {
        jsBackend: jsRun.engine.getBackendInfo(),
        wasmBackend: wasmRun.engine.getBackendInfo(),
        registerT2: getRegisterValue(wasmRun.snapshot, "$t2"),
        jsPc: jsRun.snapshot.pc >>> 0,
        wasmPc: wasmRun.snapshot.pc >>> 0
      };
    });

    addCase("self_modifying_code_blocked_by_default", async () => {
      const source = ".text\nmain:\nli $t0, 0x00400000\nli $t1, 0x12345678\nsw $t1, 0($t0)\nli $v0, 10\nsyscall\n";
      const run = await runProgram({ backend: "wasm", source, maxSteps: 20 });
      assert(run.assembled.ok === true, "Program for self-modifying-code test did not assemble.");
      assert(run.result.exception === true || run.result.done === true, "Expected runtime exception or halt.");
      assert(/Self-modifying code/i.test(String(run.result.message || "")), "Expected self-modifying code protection message.");
      return {
        message: run.result.message,
        haltReason: run.result.haltReason || null
      };
    });

    addCase("self_modifying_code_can_be_enabled_explicitly", async () => {
      const engine = await createEngineWithWarmup("wasm", {
        settings: { selfModifyingCode: true }
      });
      const source = ".text\nmain:\nli $v0, 10\nsyscall\n";
      const assembled = engine.assemble(source, { sourceName: "selfmod-enabled.s" });
      assert(assembled.ok === true, "Failed to assemble setup program.");
      const target = DEFAULT_MEMORY_MAP.textBase >>> 0;
      engine.writeWord(target, 0x12345678);
      const written = engine.readWord(target);
      assert((written >>> 0) === 0x12345678, "Explicit self-modifying write did not persist.");
      return {
        backend: engine.getBackendInfo(),
        address: target,
        value: written >>> 0
      };
    });

    addCase("memory_limit_enforced", async () => {
      const engine = await createEngineWithWarmup("wasm", {
        settings: { maxMemoryBytes: 64 }
      });
      let caught = "";
      try {
        for (let i = 0; i < 80; i += 1) {
          engine.writeByte((DEFAULT_MEMORY_MAP.dataBase + i) >>> 0, 0x41);
        }
      } catch (error) {
        caught = toMessage(error);
      }
      assert(/Memory limit exceeded/i.test(caught), "Expected memory limit guard to trigger.");
      return {
        message: caught,
        memoryUsageBytes: typeof engine.getMemoryUsageBytes === "function" ? engine.getMemoryUsageBytes() : null
      };
    });

    addCase("circular_include_rejected_safely", async () => {
      const engine = await createEngineWithWarmup("wasm");
      const result = engine.assemble('.include "a.inc"\n.text\nmain:\nli $v0, 10\nsyscall\n', {
        sourceName: "main.s",
        includeMap: new Map([
          ["main.s", '.include "a.inc"\n.text\nmain:\nli $v0, 10\nsyscall\n'],
          ["a.inc", '.include "b.inc"\n.eqv A 1\n'],
          ["b.inc", '.include "a.inc"\n.eqv B 2\n']
        ])
      });
      assert(result.ok === false, "Circular include should fail assembly.");
      const text = JSON.stringify(result.errors || []);
      assert(/circular include detected/i.test(text), "Expected circular include error.");
      return { errors: result.errors };
    });

    addCase("unterminated_macro_is_rejected", async () => {
      const engine = await createEngineWithWarmup("wasm");
      const result = engine.assemble(".macro broken (%r)\naddiu %r, %r, 1\n.text\nmain:\nli $v0, 10\nsyscall\n", {
        sourceName: "macro-unterminated.s"
      });
      assert(result.ok === false, "Unterminated macro should fail assembly.");
      const text = JSON.stringify(result.errors || []);
      assert(/missing \.end_macro/i.test(text), "Expected unterminated macro error.");
      return { errors: result.errors };
    });

    addCase("expression_sandbox_blocks_code_execution", async () => {
      const engine = await createEngineWithWarmup("wasm");
      window.__webMarsRobustnessProbe = 0;
      const result = engine.assemble(".data\nvalue: .word 1+globalThis.__webMarsRobustnessProbe\n.text\nmain:\nli $v0, 10\nsyscall\n", {
        sourceName: "expression-guard.s"
      });
      assert(result.ok === false, "Hostile expression should not assemble cleanly.");
      assert(window.__webMarsRobustnessProbe === 0, "Expression evaluation mutated global state.");
      return {
        errors: result.errors,
        probe: window.__webMarsRobustnessProbe
      };
    });

    addCase("unaligned_memory_access_faults_cleanly", async () => {
      const source = ".data\nbuf: .space 8\n.text\nmain:\nla $t0, buf\naddi $t0, $t0, 1\nlw $t1, 0($t0)\nli $v0, 10\nsyscall\n";
      const run = await runProgram({ backend: "wasm", source, maxSteps: 20 });
      assert(run.assembled.ok === true, "Unaligned access test did not assemble.");
      assert(run.result.exception === true || /aligned/i.test(String(run.result.message || "")), "Expected unaligned access exception.");
      assert(/aligned/i.test(String(run.result.message || "")), "Expected alignment message.");
      return {
        message: run.result.message,
        cause: run.snapshot?.cop0?.cause ?? null
      };
    });

    addCase("breakpoint_batch_stop_is_stable", async () => {
      const engine = await createEngineWithWarmup("wasm");
      const assembled = engine.assemble(".text\nmain:\naddiu $t0, $zero, 1\naddiu $t1, $zero, 2\nli $v0, 10\nsyscall\n", {
        sourceName: "breakpoint.s"
      });
      assert(assembled.ok === true, "Breakpoint test did not assemble.");
      const before = engine.getSnapshot({ includeTextRows: false, includeDataRows: false, includeLabels: false });
      engine.toggleBreakpoint(before.pc >>> 0);
      const result = engine.stepMany(100, { includeSnapshot: false });
      assert(result.stoppedOnBreakpoint === true, "Expected breakpoint stop.");
      const after = engine.getSnapshot({ includeTextRows: false, includeDataRows: false, includeLabels: false });
      assert((after.steps | 0) === 0, "Breakpoint stop should not execute instructions.");
      return {
        message: result.message,
        pc: after.pc >>> 0,
        steps: after.steps | 0
      };
    });

    addCase("delegate_syscall_preserves_state_and_backstep", async () => {
      const source = ".text\nmain:\naddi $a0, $zero, 42\nli $v0, 1\nsyscall\naddi $t0, $zero, 9\nli $v0, 10\nsyscall\n";
      const engine = await createEngineWithWarmup("wasm");
      const assembled = engine.assemble(source, { sourceName: "delegate.s" });
      assert(assembled.ok === true, "Delegate test did not assemble.");
      const step1 = engine.step({ includeSnapshot: false });
      const step2 = engine.step({ includeSnapshot: false });
      const step3 = engine.step({ includeSnapshot: false });
      const step4 = engine.step({ includeSnapshot: false });
      const beforeBackstep = engine.getSnapshot({ includeTextRows: false, includeDataRows: false, includeLabels: false });
      assert(step3.ok === true, "Delegated syscall step should succeed.");
      assert(step3.runIo === true || /42/.test(String(step3.message || "")), "Expected syscall step to surface output state.");
      assert((getRegisterValue(beforeBackstep, "$t0") | 0) === 9, "Expected post-syscall state to survive.");
      const backstep = engine.backstep();
      assert(backstep.ok === true, "Backstep failed after delegated syscall.");
      const afterBackstep = engine.getSnapshot({ includeTextRows: false, includeDataRows: false, includeLabels: false });
      assert((getRegisterValue(afterBackstep, "$t0") | 0) !== 9, "Backstep did not restore pre-final-step state.");
      return {
        stepMessages: [step1.message, step2.message, step3.message, step4.message],
        beforeBackstepPc: beforeBackstep.pc >>> 0,
        afterBackstepPc: afterBackstep.pc >>> 0,
        backstepDepth: afterBackstep.backstepDepth | 0
      };
    });

    addCase("session_roundtrip_restores_machine_state", async () => {
      const source = ".text\nmain:\naddi $t0, $zero, 2\naddi $t0, $t0, 5\naddi $t1, $t0, 3\nli $v0, 10\nsyscall\n";
      const original = await createEngineWithWarmup("wasm");
      const assembled = original.assemble(source, { sourceName: "session-roundtrip.s" });
      assert(assembled.ok === true, "Session roundtrip test did not assemble.");
      original.step();
      original.step();
      const exported = original.exportNativeState({
        includeProgram: true,
        includeBreakpoints: true,
        includeExecutionPlan: true
      });
      const restored = await createEngineWithWarmup("wasm");
      restored.importNativeState(exported, {
        preserveProgram: false,
        preserveBreakpoints: false
      });
      const before = original.getSnapshot({ includeTextRows: false, includeDataRows: false, includeLabels: false });
      const after = restored.getSnapshot({ includeTextRows: false, includeDataRows: false, includeLabels: false });
      assert((before.pc >>> 0) === (after.pc >>> 0), "PC was not restored.");
      assert(getRegisterValue(before, "$t0") === getRegisterValue(after, "$t0"), "Register $t0 mismatch after restore.");
      assert((before.steps | 0) === (after.steps | 0), "Step counter mismatch after restore.");
      return {
        pc: after.pc >>> 0,
        steps: after.steps | 0,
        registerT0: getRegisterValue(after, "$t0")
      };
    });

    addCase("program_arguments_with_quotes_are_stable", async () => {
      const engine = await createEngineWithWarmup("wasm", {
        settings: {
          programArguments: true,
          programArgumentsLine: 'first "two words" third'
        }
      });
      const assembled = engine.assemble(".text\nmain:\nli $v0, 10\nsyscall\n", { sourceName: "argv.s" });
      assert(assembled.ok === true, "Program-arguments test did not assemble.");
      const snapshot = engine.getSnapshot({ includeTextRows: false, includeDataRows: false, includeLabels: false });
      assert((getRegisterValue(snapshot, "$a0") | 0) === 3, "argc was not materialized correctly.");
      return {
        argc: getRegisterValue(snapshot, "$a0"),
        argvAddress: getRegisterValue(snapshot, "$a1") >>> 0,
        parsed: Array.isArray(engine.lastProgramArguments) ? [...engine.lastProgramArguments] : null
      };
    });

    return (async () => {
      const results = [];
      for (const testCase of suite) {
        const startedAt = performance.now();
        try {
          const detail = await testCase.fn();
          results.push({
            name: testCase.name,
            ok: true,
            durationMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
            detail
          });
        } catch (error) {
          results.push({
            name: testCase.name,
            ok: false,
            durationMs: Math.round((performance.now() - startedAt) * 1000) / 1000,
            error: toMessage(error)
          });
        }
      }

      const passed = results.filter((entry) => entry.ok).length;
      const failed = results.length - passed;
      return {
        generatedAt: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        totals: {
          total: results.length,
          passed,
          failed
        },
        results
      };
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

  const userDataDir = mkdtempSync(join(tmpdir(), "webmars-edge-"));
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
      await wait(1500);

      const evaluation = await send("Runtime.evaluate", {
        expression: buildBrowserSuiteSource(),
        awaitPromise: true,
        returnByValue: true
      });

      const report = evaluation?.result?.value;
      if (!report || typeof report !== "object") {
        throw new Error("Browser suite did not return a valid report.");
      }

      report.host = {
        targetUrl: TARGET_URL,
        edgePath: EDGE_PATH,
        appPort: APP_PORT,
        debugPort: DEBUG_PORT
      };

      writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

      const summaryLine = `Robustness suite: ${report.totals.passed}/${report.totals.total} passed`;
      console.log(summaryLine);
      for (const entry of report.results) {
        const prefix = entry.ok ? "PASS" : "FAIL";
        console.log(`${prefix} ${entry.name} (${entry.durationMs} ms)`);
        if (!entry.ok) {
          console.log(String(entry.error || "").trim());
        }
      }

      if (report.totals.failed > 0) {
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
      // Ignore user-data-dir cleanup failures on Windows.
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
