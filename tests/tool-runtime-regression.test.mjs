import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

const managerPath = resolve(projectRoot, "assets/js/app-modules/12-ui-tool-manager.js");
const runtimePath = resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js");

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

test("tool batches reach hidden tools in order and isolate failures", async () => {
  const source = await readFile(managerPath, "utf8");
  const helperSource = sourceBetween(source, "function deliverToolSnapshotBatch", "\nfunction createToolManager");
  const context = vm.createContext({});
  vm.runInContext(`
    ${helperSource}
    const received = [];
    const failures = [];
    const metadata = [];
    const hiddenRoot = { classList: { contains: () => true } };
    const instances = new Map([
      ["broken", {
        windowRoot: hiddenRoot,
        onSnapshot(snapshot) {
          failures.push("attempt-" + snapshot.steps);
          throw new Error("broken tool");
        }
      }],
      ["hidden-device", {
        windowRoot: hiddenRoot,
        onSnapshot(snapshot, delivery) {
          received.push(snapshot.steps);
          metadata.push([delivery.batchIndex, delivery.isLast]);
        }
      }]
    ]);
    deliverToolSnapshotBatch(instances, [{ steps: 1 }, { steps: 2 }, { steps: 3 }], (id) => failures.push(id));
    globalThis.observed = { received, failures, metadata };
  `, context);

  assert.deepEqual([...context.observed.received], [1, 2, 3]);
  assert.deepEqual(
    [...context.observed.metadata].map((entry) => [...entry]),
    [[0, false], [1, false], [2, true]]
  );
  assert.equal([...context.observed.failures].filter((value) => value === "broken").length, 3);
});

test("runtime event batches flush each tool once even when the final event is irrelevant", async () => {
  const source = await readFile(managerPath, "utf8");
  const helperSource = sourceBetween(source, "function deliverToolSnapshotBatch", "\nfunction createToolManager");
  const context = vm.createContext({});
  vm.runInContext(`
    ${helperSource}
    const processed = [];
    let flushes = 0;
    const instances = new Map([["cache", {
      runtimeEventConsumer: true,
      onRuntimeEvent(event) {
        if (event.memoryAccesses?.length) processed.push(event.stepAfter);
      },
      onRuntimeBatchEnd(delivery) {
        flushes += 1;
        globalThis.batchSize = delivery.batchSize;
      }
    }]]);
    deliverToolRuntimeEventBatch(instances, [
      { type: "instruction", stepAfter: 1, memoryAccesses: [{ kind: "read", address: 4 }] },
      { type: "instruction", stepAfter: 2, memoryAccesses: [] }
    ]);
    globalThis.observed = { processed, flushes };
  `, context);

  assert.deepEqual([...context.observed.processed], [1]);
  assert.equal(context.observed.flushes, 1);
  assert.equal(context.batchSize, 2);
});

test("runtime event batches identify only deltas inside the final backstep window", async () => {
  const source = await readFile(managerPath, "utf8");
  const helperSource = sourceBetween(source, "function deliverToolSnapshotBatch", "\nfunction createToolManager");
  const context = vm.createContext({});
  vm.runInContext(`
    ${helperSource}
    const retention = [];
    const instances = new Map([["counter", {
      runtimeEventConsumer: true,
      onRuntimeEvent(event, delivery) {
        retention.push([
          event.stepAfter,
          delivery.retainHistory,
          delivery.finalHistoryStartStep
        ]);
      }
    }]]);
    deliverToolRuntimeEventBatch(instances, [
      { type: "instruction", stepAfter: 100, historyStartStep: 0 },
      { type: "instruction", stepAfter: 101, historyStartStep: 1 },
      { type: "instruction", stepAfter: 102, historyStartStep: 2 }
    ]);
    globalThis.retention = retention;
  `, context);

  assert.deepEqual([...context.retention].map((entry) => [...entry]), [
    [100, true, 2],
    [101, true, 2],
    [102, true, 2]
  ]);

  vm.runInContext(`
    retention.length = 0;
    deliverToolRuntimeEventBatch(instances, [
      { type: "instruction", stepAfter: 1, historyStartStep: 0 },
      { type: "instruction", stepAfter: 2, historyStartStep: 0 },
      { type: "instruction", stepAfter: 3, historyStartStep: 2 }
    ]);
  `, context);
  assert.deepEqual([...context.retention].map((entry) => [...entry]), [
    [1, false, 2],
    [2, false, 2],
    [3, true, 2]
  ]);
});

test("batched tool state processes every event but journals only the backsteppable suffix", async () => {
  const source = await readFile(managerPath, "utf8");
  const helperSource = sourceBetween(source, "function deliverToolSnapshotBatch", "\nfunction createToolManager");
  const context = vm.createContext({});
  vm.runInContext(`
    ${helperSource}
    let total = 0;
    const history = createToolDeltaHistory({
      applyInverse(delta) {
        total = delta.before;
      }
    });
    const instances = new Map([["counter", {
      runtimeEventConsumer: true,
      onRuntimeEvent(event, delivery) {
        if (delivery.retainHistory) history.record(event.stepAfter, { before: total });
        total += 1;
        history.pruneBefore(event.historyStartStep);
      }
    }]]);
    const events = Array.from({ length: 720 }, (_unused, index) => ({
      type: "instruction",
      stepAfter: index + 1,
      historyStartStep: Math.max(0, index - 99)
    }));
    deliverToolRuntimeEventBatch(instances, events);
    const afterBatch = {
      total,
      entries: history.getEntryCount(),
      currentStep: history.getCurrentStep()
    };
    history.rewind(719);
    const afterOneBackstep = total;
    history.rewind(620);
    globalThis.observed = {
      afterBatch,
      afterOneBackstep,
      afterWindowBackstep: total,
      remaining: history.getEntryCount()
    };
  `, context);

  assert.equal(context.observed.afterBatch.total, 720);
  assert.equal(context.observed.afterBatch.entries, 100);
  assert.equal(context.observed.afterBatch.currentStep, 720);
  assert.equal(context.observed.afterOneBackstep, 719);
  assert.equal(context.observed.afterWindowBackstep, 620);
  assert.equal(context.observed.remaining, 0);
});

test("central tool delta history rewinds sparsely and follows the engine window", async () => {
  const source = await readFile(managerPath, "utf8");
  const helperSource = sourceBetween(source, "function createToolDeltaHistory", "\nfunction createToolManager");
  const context = vm.createContext({});
  vm.runInContext(`
    ${helperSource}
    const restored = [];
    const history = createToolDeltaHistory({
      applyInverse(delta, step) {
        restored.push([step, delta.before]);
      }
    });
    history.record(1, { before: "a" });
    history.record(3, { before: "c" });
    history.record(5, { before: "e" });
    history.pruneBefore(1);
    const beforeRewind = history.getEntryCount();
    const applied = history.rewind(2);
    history.record(3, { before: "new-c" });
    history.sync({ steps: 3, backstepDepth: 1, backstepHistoryStartStep: 2 });
    globalThis.observed = {
      beforeRewind,
      applied,
      restored,
      currentStep: history.getCurrentStep(),
      remaining: history.getEntryCount()
    };
  `, context);

  assert.equal(context.observed.beforeRewind, 2);
  assert.equal(context.observed.applied, 2);
  assert.deepEqual([...context.observed.restored].map((entry) => [...entry]), [
    [5, "e"],
    [3, "c"]
  ]);
  assert.equal(context.observed.currentStep, 3);
  assert.equal(context.observed.remaining, 1);
});

test("stateful tools use central deltas and expose active runtime consumers", async () => {
  const paths = ["tools/tty-ansi-terminal.js", "tools/cache-simulator.js", "tools/keyboard-display-mmio.js", "tools/mars-bot.js"];
  for (const relativePath of paths) {
    const source = await readFile(resolve(projectRoot, relativePath), "utf8");
    assert.doesNotMatch(source, /\bstepHistory\b/, `${relativePath} still owns a full per-step history`);
    assert.doesNotMatch(source, /\bpreviousSnapshot\b|runtimeTrace|textRows\s*\|\|\s*\[\]\)\.find/, `${relativePath} still parses the legacy per-step snapshot trace`);
    assert.match(source, /ctx\.createToolDeltaHistory\(/);
    assert.match(source, /isConnected:\s*\(\)\s*=>\s*connected/);
  }

  const ttySource = await readFile(resolve(projectRoot, "tools/tty-ansi-terminal.js"), "utf8");
  assert.match(ttySource, /cells:\s*new Map\(\)/);
  assert.match(ttySource, /recordCellBefore\(/);
  assert.match(ttySource, /registerMemoryObserver\(/);
  assert.match(ttySource, /onBackstep\(event\)/);
  assert.doesNotMatch(ttySource, /onRuntimeEvent\(/);
  assert.match(ttySource, /data-tty="keyboard-input"/);
  assert.match(ttySource, /inputmode="text"/);
  assert.match(ttySource, /canvas\.addEventListener\("pointerdown", \(event\) => \{/);
  assert.match(ttySource, /if \(connected\) event\.preventDefault\(\);/);
  assert.match(ttySource, /keyboardInput\?\.addEventListener\("input"/);
  assert.match(ttySource, /keyboardInput\?\.addEventListener\("compositionend"/);
  assert.match(ttySource, /event\.inputType !== "deleteContentBackward"/);

  const keyboardSource = await readFile(resolve(projectRoot, "tools/keyboard-display-mmio.js"), "utf8");
  assert.match(keyboardSource, /registerMemoryObserver\(/);
  assert.match(keyboardSource, /registerInstructionObserver\(/);
  assert.match(keyboardSource, /suppressDeviceObservers/);
  assert.match(keyboardSource, /lastRuntimeRevision !== previousRuntimeRevision/);
  assert.match(keyboardSource, /runtimeRevision/);
  assert.match(keyboardSource, /onBackstep\(event\)/);
  assert.doesNotMatch(keyboardSource, /onRuntimeEvent\(/);

  const cacheSource = await readFile(resolve(projectRoot, "tools/cache-simulator.js"), "utf8");
  assert.doesNotMatch(cacheSource, /log:\s*String\(controls\.log\.value/);
  assert.match(cacheSource, /logLength:/);
  assert.match(cacheSource, /onRuntimeEvent\(event,\s*delivery\s*=\s*\{\}\)/);
  assert.match(cacheSource, /delivery\.retainHistory !== false/);
  assert.match(cacheSource, /onRuntimeBatchEnd\(\)/);

  const bhtSource = await readFile(resolve(projectRoot, "tools/bht-simulator.js"), "utf8");
  assert.match(bhtSource, /let currentInstruction = ""/);
  assert.match(bhtSource, /delivery\.retainHistory !== false/);
  assert.doesNotMatch(bhtSource, /instructionField\.value = statement/);

  const marsBotSource = await readFile(resolve(projectRoot, "tools/mars-bot.js"), "utf8");
  assert.match(marsBotSource, /if \(!connected \|\| !moving \|\| frameTimer != null\) return/);
  assert.match(marsBotSource, /onRuntimeBatchEnd\(\)/);
  assert.doesNotMatch(marsBotSource, /clearState\(\);\s*ensureTimer\(\)/);
});

test("floating-point tool accepts register zero as a valid attachment", async () => {
  const source = await readFile(resolve(projectRoot, "tools/float-representation.js"), "utf8");
  assert.doesNotMatch(source, /Number\.parseInt\(registerSelect\.value,\s*10\)\s*\|\|\s*-1/);
  assert.match(source, /Number\.isInteger\(parsedRegister\)/);
  assert.match(source, /parsedRegister >= 0 && parsedRegister < 32/);
});

test("Run requests compact runtime events without per-instruction snapshots", async () => {
  const source = await readFile(runtimePath, "utf8");
  const helperSource = sourceBetween(source, "function executeRunStepWithRuntimeEvent", "\nfunction runLoopTick");
  const context = vm.createContext({});
  vm.runInContext(`
    ${helperSource}
    let call = 0;
    const options = [];
    const engine = {
      step(stepOptions) {
        options.push(stepOptions);
        call += 1;
        return {
          ok: true,
          runtimeEvent: {
            type: "instruction",
            stepAfter: call,
            executedInstruction: "sw $t0,0($t1)",
            memoryAccesses: [{
              kind: "write",
              address: 0xffff000c,
              size: 4,
              value: 64 + call
            }]
          }
        };
      }
    };
    const first = executeRunStepWithRuntimeEvent(engine, true);
    const second = executeRunStepWithRuntimeEvent(engine, true);
    const plain = executeRunStepWithRuntimeEvent(engine, false);
    globalThis.observed = {
      firstInstruction: first.runtimeEvent.executedInstruction,
      firstStep: first.runtimeEvent.stepAfter,
      secondStep: second.runtimeEvent.stepAfter,
      firstWord: first.runtimeEvent.memoryAccesses[0].value,
      secondWord: second.runtimeEvent.memoryAccesses[0].value,
      firstOptions: options[0],
      plainOptions: options[2],
      plainEvent: plain.runtimeEvent
    };
  `, context);

  const observed = context.observed;
  assert.equal(observed.firstInstruction, "sw $t0,0($t1)");
  assert.equal(observed.firstStep, 1);
  assert.equal(observed.secondStep, 2);
  assert.equal(observed.firstWord, 65);
  assert.equal(observed.secondWord, 66);
  assert.equal(observed.firstOptions.includeSnapshot, false);
  assert.equal(observed.firstOptions.includeRuntimeEvent, true);
  assert.equal(observed.plainOptions.includeSnapshot, false);
  assert.equal(observed.plainOptions.includeRuntimeEvent, false);
  assert.equal(observed.plainEvent, null);
  assert.doesNotMatch(source, /runtimeTrace/);
});

test("runtime UI recovery reuses the delivered snapshot and skips reads while Run is busy", async () => {
  const source = await readFile(runtimePath, "utf8");
  const helperSource = sourceBetween(
    source,
    "function scheduleBackstepButtonRecovery",
    "\nfunction scheduleRuntimeControlRecovery"
  );
  assert.match(helperSource, /if \(runBusy\) \{\s*refs\.buttons\.backstep\.disabled = true;\s*return;/);
  assert.match(helperSource, /snapshot && typeof snapshot === "object"/);
  assert.match(source, /scheduleBackstepButtonRecovery\(snapshot\)/);
});

test("runtime memory validation keeps the dialog open and preserves its selection", async () => {
  const source = await readFile(runtimePath, "utf8");
  const helperSource = sourceBetween(
    source,
    "function resolveRuntimeMemoryPreferenceSelection",
    "\nasync function openRuntimeMemoryPreferencesPanel"
  );
  const context = vm.createContext({});
  vm.runInContext(`
    function toHex(value) {
      return "0x" + (value >>> 0).toString(16).padStart(8, "0");
    }
    function isValidAddressPreference(value) {
      const text = String(value || "").trim();
      if (!/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(text)) return false;
      const parsed = Number(text);
      return Number.isInteger(parsed) && parsed >= 0 && parsed <= 0xffffffff;
    }
    function translateText(value) {
      return String(value || "");
    }
    const posted = [];
    function postMarsMessage(value) {
      posted.push(String(value || ""));
    }
    ${helperSource}
    const options = {
      ids: ["Default", "Compact"],
      activeConfigId: "Default",
      originalExceptionText: "0x80000180",
      presets: {
        Default: { exceptionHandlerAddress: 0x80000180 },
        Compact: { exceptionHandlerAddress: 0x00000180 }
      },
      defaultMemoryMap: { exceptionHandlerAddress: 0x80000180 }
    };
    const dialogMessages = [];
    const dialog = {
      setMessage(message, tone) {
        dialogMessages.push({ message, tone });
      }
    };
    const invalidResult = validateRuntimeMemoryDialogSelection({
      memoryConfiguration: "Default",
      exceptionHandlerAddress: "123abc"
    }, dialog, options);
    const presetSelection = resolveRuntimeMemoryPreferenceSelection({
      memoryConfiguration: "Compact",
      exceptionHandlerAddress: "0x80000180"
    }, options);
    globalThis.observed = {
      invalidResult,
      dialogMessages,
      posted,
      presetSelection
    };
  `, context);

  assert.equal(context.observed.invalidResult.close, false);
  assert.equal(context.observed.dialogMessages.length, 1);
  assert.equal(context.observed.dialogMessages[0].tone, "error");
  assert.match(context.observed.dialogMessages[0].message, /32-bit decimal or hexadecimal/);
  assert.equal(context.observed.posted.length, 1);
  assert.equal(context.observed.presetSelection.selectedId, "Compact");
  assert.equal(context.observed.presetSelection.exceptionSource, "0x00000180");
  assert.match(
    source,
    /beforeResolve:\s*\(values, dialog\) => validateRuntimeMemoryDialogSelection\(values, dialog, selectionContext\)/
  );
});

test("instruction counters accept consecutive executions at the same PC", async () => {
  for (const relativePath of ["tools/instruction-counter.js", "tools/instruction-statistics.js"]) {
    const source = await readFile(resolve(projectRoot, relativePath), "utf8");
    assert.doesNotMatch(source, /\blastAddress\b/, `${relativePath} still deduplicates by PC`);
    assert.match(source, /onRuntimeEvent\(event,\s*delivery\s*=\s*\{\}\)/);
    assert.match(source, /onRuntimeBatchEnd\(\)/);
    assert.match(source, /delivery\.retainHistory !== false/);
  }
});

test("bitmap display coalesces writes without redrawing stale snapshot memory", async () => {
  const source = await readFile(resolve(projectRoot, "tools/bitmap-display.js"), "utf8");
  assert.match(source, /ctx\.engine\?\.memoryWords instanceof Map/);
  assert.match(source, /pendingWriteAddress != null && pendingWriteAddress !== nextWriteAddress/);
  assert.match(source, /fullRedrawNeeded = true/);
});

test("both Bitmap tools consume committed runtime configuration and accept dynamic dimensions", async () => {
  for (const relativePath of ["tools/bitmap-display.js", "tools/bitmap-terminal-tool.js"]) {
    const source = await readFile(resolve(projectRoot, relativePath), "utf8");
    assert.match(source, /getBitmapMmioConfig/);
    assert.match(source, /function syncBitmapMmioConfig/);
    assert.match(source, /function ensureSelectOption/);
    assert.match(source, /onRuntimeEvent\(event\)/);
    assert.match(source, /syncBitmapMmioConfig\(false\)/);
    assert.match(source, /ctx\.engine\?\.memoryWords instanceof Map/);
  }
});
