import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const EDGE_PATH = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = Number(process.env.EDGE_DEBUG_PORT || 9222);
const TARGET_URL = process.env.SMOKE_TARGET_URL || "http://localhost:8080/";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getTarget() {
  for (let i = 0; i < 40; i += 1) {
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
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message || "CDP error"));
    else resolve(message.result);
  };

  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  return { socket, send };
}

async function main() {
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
    const page = await getTarget();
    const { socket, send } = await createCdpClient(page);
    try {
      await send("Page.enable");
      await send("Runtime.enable");
      await wait(1200);

      const backendCheck = await send("Runtime.evaluate", {
        expression: `(() => {
          const engine = createMarsEngine({
            settings: { ...DEFAULT_SETTINGS, coreBackend: "wasm" },
            memoryMap: { ...DEFAULT_MEMORY_MAP }
          });
          return {
            engineBackend: engine.getBackendInfo(),
            wasmBridge: window.WebMarsWasmCore?.status || null,
            nativeFactory: typeof window.WebMarsNativeFactory?.createEngineSync === "function"
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      const assembleCheck = await send("Runtime.evaluate", {
        expression: `(async () => {
          const engine = createMarsEngine({
            settings: { ...DEFAULT_SETTINGS, coreBackend: "wasm" },
            memoryMap: { ...DEFAULT_MEMORY_MAP }
          });
          const assembled = engine.assemble(".text\\nmain:\\naddi $t0, $zero, 5\\naddi $t1, $zero, 7\\naddu $t2, $t0, $t1\\nli $v0, 10\\nsyscall\\n", {
            sourceName: "main.s"
          });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const backendAfterWarmup = engine.getBackendInfo();
          const step1 = engine.step({ includeSnapshot: false });
          const step2 = engine.step({ includeSnapshot: false });
          return {
            assembled,
            backendAfterWarmup,
            step1,
            step2,
            backendAfterSteps: engine.getBackendInfo()
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      const nativeAssembleCheck = await send("Runtime.evaluate", {
        expression: `(async () => {
          const engine = createMarsEngine({
            settings: { ...DEFAULT_SETTINGS, coreBackend: "wasm" },
            memoryMap: { ...DEFAULT_MEMORY_MAP }
          });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const result = engine.assemble(".data\\nvalue: .word 7\\n.text\\nmain:\\nli $t0, 5\\nlw $t1, value\\nli $v0, 10\\nsyscall\\n", {
            sourceName: "native-assemble.s"
          });
          const snapshot = engine.getSnapshot({
            includeDataRows: false
          });
          return {
            result,
            backend: engine.getBackendInfo(),
            pc: snapshot.pc,
            textRowCount: snapshot.textRows.length,
            labels: snapshot.labels
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      const nativePreprocessCheck = await send("Runtime.evaluate", {
        expression: `(async () => {
          const engine = createMarsEngine({
            settings: { ...DEFAULT_SETTINGS, coreBackend: "wasm" },
            memoryMap: { ...DEFAULT_MEMORY_MAP }
          });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const result = engine.assemble(".include \\"defs.inc\\"\\n.data\\nvalue: .word CONST:2\\n.text\\nmain:\\ntwice $t0\\nsgt $t1, $t0, $zero\\nla $t2, extSym\\nli $v0, 10\\nsyscall\\n", {
            sourceName: "native-preprocess.s",
            includeMap: new Map([
              ["defs.inc", ".eqv CONST 7\\n.extern extSym 4\\n.macro twice (%r)\\naddiu %r, %r, CONST\\n.end_macro\\n"]
            ])
          });
          const snapshot = engine.getSnapshot({
            includeDataRows: true
          });
          return {
            result,
            backend: engine.getBackendInfo(),
            textRowCount: snapshot.textRows.length,
            labels: snapshot.labels,
            firstDataRow: snapshot.dataRows[0] || null
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      const fallbackAssembleCheck = await send("Runtime.evaluate", {
        expression: `(async () => {
          const engine = createMarsEngine({
            settings: { ...DEFAULT_SETTINGS, coreBackend: "wasm" },
            memoryMap: { ...DEFAULT_MEMORY_MAP }
          });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const result = engine.assemble(".macro twice (%r)\\naddiu %r, %r, 1\\n.end_macro\\n.text\\nmain:\\ntwice($t0)\\nli $v0, 10\\nsyscall\\n", {
            sourceName: "fallback-assemble.s"
          });
          return {
            result,
            backend: engine.getBackendInfo()
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      const delegateCheck = await send("Runtime.evaluate", {
        expression: `(async () => {
          const engine = createMarsEngine({
            settings: { ...DEFAULT_SETTINGS, coreBackend: "wasm" },
            memoryMap: { ...DEFAULT_MEMORY_MAP }
          });
          engine.setRuntimeHooks({
            writeOutput() { return true; }
          });
          const assembled = engine.assemble(".text\\nmain:\\naddi $a0, $zero, 42\\nli $v0, 1\\nsyscall\\naddi $t0, $zero, 9\\nli $v0, 10\\nsyscall\\n", {
            sourceName: "delegate.s"
          });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const before = engine.getBackendInfo();
          const step1 = engine.step({ includeSnapshot: false });
          const step2 = engine.step({ includeSnapshot: false });
          const step3 = engine.step({ includeSnapshot: false });
          const step4 = engine.step({ includeSnapshot: false });
          const step5 = engine.step({ includeSnapshot: false });
          const afterSyscall = engine.getBackendInfo();
          const backstep = engine.backstep();
          const snapshot = engine.getSnapshot({
            includeTextRows: false,
            includeDataRows: false,
            includeLabels: false
          });
          return {
            assembled,
            before,
            step1,
            step2,
            step3,
            step4,
            step5,
            afterSyscall,
            backstep,
            snapshot: {
              pc: snapshot.pc,
              backstepDepth: snapshot.backstepDepth,
              backstepHistoryBytes: snapshot.backstepHistoryBytes,
              registerA0: snapshot.registers?.find?.((entry) => entry?.name === "$a0")?.value ?? null,
              registerV0: snapshot.registers?.find?.((entry) => entry?.name === "$v0")?.value ?? null
            },
            afterBackstep: engine.getBackendInfo()
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      const batchDelegateCheck = await send("Runtime.evaluate", {
        expression: `(async () => {
          const engine = createMarsEngine({
            settings: { ...DEFAULT_SETTINGS, coreBackend: "wasm" },
            memoryMap: { ...DEFAULT_MEMORY_MAP }
          });
          engine.setRuntimeHooks({
            writeOutput() { return true; }
          });
          engine.assemble(".text\\nmain:\\naddi $a0, $zero, 42\\nli $v0, 1\\nsyscall\\naddi $t0, $zero, 9\\nli $v0, 10\\nsyscall\\n", {
            sourceName: "delegate-batch.s"
          });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const result = engine.stepMany(100, { includeSnapshot: false });
          const snapshot = engine.getSnapshot({
            includeTextRows: false,
            includeDataRows: false,
            includeLabels: false
          });
          return {
            backend: engine.getBackendInfo(),
            result,
            pc: snapshot.pc,
            backstepDepth: snapshot.backstepDepth
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      const breakpointBatchCheck = await send("Runtime.evaluate", {
        expression: `(async () => {
          const engine = createMarsEngine({
            settings: { ...DEFAULT_SETTINGS, coreBackend: "wasm" },
            memoryMap: { ...DEFAULT_MEMORY_MAP }
          });
          engine.assemble(".text\\nmain:\\naddiu $t0, $zero, 1\\naddiu $t1, $zero, 2\\n", {
            sourceName: "breakpoint-batch.s"
          });
          await new Promise((resolve) => setTimeout(resolve, 1200));
          const snapshotBefore = engine.getSnapshot({
            includeTextRows: false,
            includeDataRows: false,
            includeLabels: false
          });
          engine.toggleBreakpoint(snapshotBefore.pc);
          const result = engine.stepMany(100, { includeSnapshot: false });
          return {
            backend: engine.getBackendInfo(),
            result
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      const benchmarkCheck = await send("Runtime.evaluate", {
        expression: `(async () => {
          const source = ".text\\nmain:\\naddiu $t0, $zero, 0\\naddiu $t1, $zero, 20000\\nloop:\\naddiu $t0, $t0, 1\\nbne $t0, $t1, loop\\naddu $t2, $t0, $zero\\n";
          const runBenchmark = async (backend) => {
            const engine = createMarsEngine({
              settings: { ...DEFAULT_SETTINGS, coreBackend: backend },
              memoryMap: { ...DEFAULT_MEMORY_MAP }
            });
            engine.assemble(source, { sourceName: backend + ".s" });
            if (backend === "wasm") {
              await new Promise((resolve) => setTimeout(resolve, 1200));
            }
            const started = performance.now();
            let iterations = 0;
            let last = null;
            if (backend === "wasm" && typeof engine.stepMany === "function") {
              last = engine.stepMany(100000, { includeSnapshot: false });
              iterations = last?.stepsExecuted || 0;
            } else {
              while (iterations < 100000) {
                last = engine.step({ includeSnapshot: false });
                iterations += 1;
                if (!last?.ok || last?.done || last?.stoppedOnBreakpoint || last?.waitingForInput) break;
              }
            }
            return {
              backend: engine.getBackendInfo(),
              elapsedMs: performance.now() - started,
              iterations,
              last
            };
          };
          return {
            js: await runBenchmark("js"),
            wasm: await runBenchmark("wasm")
          };
        })()`,
        awaitPromise: true,
        returnByValue: true
      });

      console.log(JSON.stringify({
        backendCheck: backendCheck.result.value,
        assembleCheck: assembleCheck.result.value,
        nativeAssembleCheck: nativeAssembleCheck.result.value,
        nativePreprocessCheck: nativePreprocessCheck.result.value,
        fallbackAssembleCheck: fallbackAssembleCheck.result.value,
        delegateCheck: delegateCheck.result.value,
        batchDelegateCheck: batchDelegateCheck.result.value,
        breakpointBatchCheck: breakpointBatchCheck.result.value,
        benchmarkCheck: benchmarkCheck.result.value
      }, null, 2));
    } finally {
      socket.close();
    }
  } finally {
    if (!browser.killed) browser.kill("SIGKILL");
    await wait(250);
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore user-data-dir cleanup failures on Windows.
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
