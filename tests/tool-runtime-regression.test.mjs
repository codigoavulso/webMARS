import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

const managerPath = resolve(projectRoot, "assets/js/app-modules/12-ui-tool-manager.js");
const runtimePath = resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js");
const uiPath = resolve(projectRoot, "assets/js/app-modules/10-ui.js");
const pipelineLabPath = resolve(projectRoot, "tools/pipeline-lab.js");

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

async function loadPipelineLabCore() {
  const source = await readFile(pipelineLabPath, "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context);
  assert.ok(context.MarsPipelineLabCore, "Pipeline Lab exposes its deterministic core");
  return context.MarsPipelineLabCore;
}

test("Pipeline Lab decodes load dependencies", async () => {
  const core = await loadPipelineLabCore();
  const instruction = core.decodeInstruction({ basic: "lw $t0, 8($t1)", address: 0x00400000 });

  assert.equal(instruction.opcode, "lw");
  assert.equal(instruction.isLoad, true);
  assert.deepEqual([...instruction.reads], ["$t1"]);
  assert.deepEqual([...instruction.writes], ["$t0"]);
});

test("Pipeline Lab models RAW stalls and configurable forwarding", async () => {
  const core = await loadPipelineLabCore();
  const rows = [
    { basic: "add $t0, $t1, $t2" },
    { basic: "sub $t3, $t0, $t4" },
    { basic: "or $t5, $t6, $t7" }
  ];

  const withoutForwarding = core.createSimulator(rows, { forwarding: false }).run();
  assert.equal(withoutForwarding.cycle, 9);
  assert.equal(withoutForwarding.completed, 3);
  assert.equal(withoutForwarding.stalls, 2);
  assert.equal(withoutForwarding.cpi, 3);

  const withForwarding = core.createSimulator(rows, { forwarding: true }).run();
  assert.equal(withForwarding.cycle, 7);
  assert.equal(withForwarding.completed, 3);
  assert.equal(withForwarding.stalls, 0);
  assert.equal(withForwarding.cpi, 7 / 3);
});

test("Pipeline Lab inserts one load-use stall with forwarding", async () => {
  const core = await loadPipelineLabCore();
  const simulator = core.createSimulator([
    { basic: "lw $t0, 0($t1)" },
    { basic: "add $t2, $t0, $t3" }
  ], { forwarding: true });
  const result = simulator.run();

  assert.equal(result.cycle, 7);
  assert.equal(result.completed, 2);
  assert.equal(result.stalls, 1);
  assert.equal(Object.values(result.timeline[1]).filter((stage) => stage === "ID*").length, 1);
});

test("Pipeline Lab can restore the exact previous cycle", async () => {
  const core = await loadPipelineLabCore();
  const simulator = core.createSimulator([
    { basic: "add $t0, $t1, $t2" },
    { basic: "sub $t3, $t0, $t4" }
  ]);
  simulator.step();
  simulator.step();
  const previous = JSON.parse(JSON.stringify(simulator.step()));
  simulator.step();
  const restored = JSON.parse(JSON.stringify(simulator.back()));

  assert.deepEqual(restored, previous);
});

test("Pipeline Lab keeps large-program timelines persistent and bounded in the UI", async () => {
  const core = await loadPipelineLabCore();
  const rows = Array.from({ length: 12000 }, (_, index) => ({
    index,
    basic: "add $t0, $t1, $t2"
  }));
  const simulator = core.createSimulator(rows, { forwarding: true });
  simulator.step();
  const firstTimeline = simulator.snapshot().timeline;
  simulator.step();
  const secondTimeline = simulator.snapshot().timeline;

  assert.equal(Object.isFrozen(firstTimeline), true);
  assert.equal(Object.isFrozen(secondTimeline), true);
  assert.notEqual(secondTimeline, firstTimeline);
  assert.equal(secondTimeline[1000], firstTimeline[1000], "untouched instruction histories are shared");

  const completed = core.createSimulator(rows, { forwarding: true }).run(13000);
  assert.equal(completed.done, true);
  assert.equal(completed.cycle, 12004);
  assert.equal(completed.completed, 12000);

  const source = await readFile(pipelineLabPath, "utf8");
  assert.match(source, /const maxVisibleInstructions = 160;/);
  assert.match(source, /const maxVisibleCycles = 80;/);
  assert.match(source, /simulator\.program\.length \* 4 \+ 16/);
});

test("Pipeline Lab is present in the primary and fallback tool catalogs", async () => {
  const [manifestSource, managerSource] = await Promise.all([
    readFile(resolve(projectRoot, "tools/tools.json"), "utf8"),
    readFile(managerPath, "utf8")
  ]);
  const manifest = JSON.parse(manifestSource);
  assert.deepEqual(
    manifest.tools.find((tool) => tool.id === "pipeline-lab"),
    { label: "Pipeline Lab", script: "./tools/pipeline-lab.js", id: "pipeline-lab" }
  );
  assert.match(managerSource, /\{ id: "pipeline-lab", label: "Pipeline Lab", script: "\.\/tools\/pipeline-lab\.js" \}/);
});

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
  assert.match(ttySource, /let suppressDeviceObservers = false;/);
  assert.match(ttySource, /function captureMmioState\(\)/);
  assert.match(ttySource, /mmio: captureMmioState\(\)/);
  assert.match(ttySource, /suppressHistory \|\| suppressDeviceObservers/);
  assert.match(ttySource, /onBackstep\(event\)/);
  assert.doesNotMatch(ttySource, /onRuntimeEvent\(/);
  assert.match(ttySource, /data-tty="keyboard-input"/);
  assert.match(ttySource, /inputmode="text"/);
  assert.match(ttySource, /canvas\.addEventListener\("pointerdown", \(event\) => \{/);
  assert.match(ttySource, /if \(connected\) event\.preventDefault\(\);/);
  assert.match(ttySource, /keyboardInput\?\.addEventListener\("input"/);
  assert.match(ttySource, /keyboardInput\?\.addEventListener\("compositionend"/);
  assert.match(ttySource, /event\.inputType !== "deleteContentBackward"/);
  assert.match(ttySource, /data-tty="settings-toggle"/);
  // The settings toggle sits in the always-visible display options bar in both
  // layouts, and collapsing hides the whole settings panel.
  assert.match(ttySource, /class="tool-btn mars-tool-display-settings-toggle"/);
  assert.match(ttySource, /\.tty-ansi-settings-collapsed \.tty-ansi-main > \.mars-tool-panel:first-child \{[\s\S]*?display: none;/);
  assert.match(ttySource, /\.tty-ansi-settings-collapsed \.tty-ansi-main \{[\s\S]*?grid-template-rows: minmax\(0, 1fr\);/);
  assert.match(ttySource, /root\.classList\.toggle\("tty-ansi-settings-collapsed", settingsCollapsed\);/);
  assert.match(ttySource, /settingsToggle\?\.addEventListener\("click"/);
  assert.match(ttySource, /settingsToggle\.setAttribute\("aria-expanded", settingsCollapsed \? "false" : "true"\);/);
  assert.match(ttySource, /\.tool-window \.tty-ansi-viewport \{[\s\S]*?padding: 0;/);
  assert.match(ttySource, /\.desktop-stacked \.tty-ansi-canvas \{[\s\S]*?width: 100% !important;[\s\S]*?height: auto !important;/);
  assert.match(ttySource, /html\.mobile-keyboard-visible \.tty-ansi-main > \.mars-tool-panel:first-child/);
  assert.match(ttySource, /html\.mobile-keyboard-visible \.tty-ansi-tool > \.mars-tool-footer/);
  assert.match(ttySource, /\.tool-window \.tty-ansi-keyboard-input \{[\s\S]*?left: 0;[\s\S]*?top: 0;/);
  assert.match(ttySource, /html\.mobile-keyboard-visible \.tty-ansi-canvas \{[\s\S]*?margin-top: auto;[\s\S]*?margin-bottom: 0;/);
  assert.match(ttySource, /mouseTrackingMode:\s*0/);
  assert.match(ttySource, /parameter === "1000" \|\| parameter === "1002" \|\| parameter === "1003"/);
  assert.match(ttySource, /parameter === "1006"/);
  assert.match(ttySource, /function sendMouseEvent\(event, kind, wheelDelta = 0, overrides = \{\}\)/);
  assert.match(ttySource, /`\\u001b\[<\$\{code\};\$\{cell\.col\};\$\{cell\.row\}\$\{suffix\}`/);
  assert.match(ttySource, /canvas\.addEventListener\("pointerup"/);
  assert.match(ttySource, /canvas\.addEventListener\("pointermove"/);
  assert.match(ttySource, /canvas\.addEventListener\("wheel"/);

  const keyboardSource = await readFile(resolve(projectRoot, "tools/keyboard-display-mmio.js"), "utf8");
  assert.match(keyboardSource, /registerMemoryObserver\(/);
  assert.match(keyboardSource, /registerInstructionObserver\(/);
  assert.match(keyboardSource, /suppressDeviceObservers/);
  assert.match(keyboardSource, /lastRuntimeRevision !== previousRuntimeRevision/);
  assert.match(keyboardSource, /runtimeRevision/);
  assert.match(keyboardSource, /onBackstep\(event\)/);
  assert.match(keyboardSource, /WebMarsExternalInterrupts\?\.keyboard/);
  assert.match(keyboardSource, /WebMarsExternalInterrupts\?\.display/);
  assert.match(keyboardSource, /requestInterrupt\(KEYBOARD_INTERRUPT_CAUSE\)/);
  assert.match(keyboardSource, /requestInterrupt\(DISPLAY_INTERRUPT_CAUSE\)/);
  assert.doesNotMatch(keyboardSource, /onRuntimeEvent\(/);

  const digitalLabSource = await readFile(resolve(projectRoot, "tools/digital-lab-sim.js"), "utf8");
  assert.match(digitalLabSource, /installCounterObserver\(\)/);
  assert.match(digitalLabSource, /requestInterrupt\(TIMER_INTERRUPT_CAUSE\)/);
  assert.match(digitalLabSource, /requestInterrupt\(HEXA_KEYBOARD_INTERRUPT_CAUSE\)/);
  assert.doesNotMatch(digitalLabSource, /isExternalInterruptEnabled\(\)/);

  const clockSource = await readFile(resolve(projectRoot, "tools/system-clock.js"), "utf8");
  assert.match(clockSource, /requestExternalInterrupt\(TIMER_INTERRUPT_CAUSE\)/);
  assert.doesNotMatch(clockSource, /isExternalInterruptEnabled\(\)/);

  const cacheSource = await readFile(resolve(projectRoot, "tools/cache-simulator.js"), "utf8");
  assert.doesNotMatch(cacheSource, /log:\s*String\(controls\.log\.value/);
  assert.match(cacheSource, /logLength:/);
  assert.match(cacheSource, /onRuntimeEvent\(event,\s*delivery\s*=\s*\{\}\)/);
  assert.match(cacheSource, /delivery\.retainHistory !== false/);
  assert.match(cacheSource, /onRuntimeBatchEnd\(\)/);

  const bhtSource = await readFile(resolve(projectRoot, "tools/bht-simulator.js"), "utf8");
  assert.match(bhtSource, /let currentInstruction = ""/);
  assert.match(bhtSource, /delivery\.retainHistory !== false/);
  assert.match(bhtSource, /MAX_LOG_LINES\s*=\s*1000/);
  assert.match(bhtSource, /MAX_LOGGED_BRANCHES_PER_BATCH\s*=\s*128/);
  assert.match(bhtSource, /requestAnimationFrame\(/);
  assert.doesNotMatch(bhtSource, /logLines\.splice\(0,/);
  assert.doesNotMatch(bhtSource, /instructionField\.value = statement/);

  const marsBotSource = await readFile(resolve(projectRoot, "tools/mars-bot.js"), "utf8");
  assert.match(marsBotSource, /if \(!connected \|\| !moving \|\| frameTimer != null\) return/);
  assert.match(marsBotSource, /onRuntimeBatchEnd\(\)/);
  assert.doesNotMatch(marsBotSource, /clearState\(\);\s*ensureTimer\(\)/);
});

test("high-frequency analytical tools consume decoded instruction batches", async () => {
  const batchedTools = [
    "tools/instruction-counter.js",
    "tools/instruction-statistics.js",
    "tools/bht-simulator.js",
    "tools/cache-simulator.js",
    "tools/mips-xray.js"
  ];
  for (const relativePath of batchedTools) {
    const source = await readFile(resolve(projectRoot, relativePath), "utf8");
    assert.match(source, /onRuntimeEventBatch\(events/);
    assert.match(source, /event(?:\?|\.)\.opcode|event\.opcode/);
  }
});

test("stack visualizer decodes the instruction text the runtime actually emits", async () => {
  const source = await readFile(resolve(projectRoot, "tools/stack-visualizer.js"), "utf8");
  const helperSource = sourceBetween(source, "const REGISTER_NAMES", "\n  host.register(");
  const context = vm.createContext({});
  vm.runInContext(`
    ${helperSource}
    globalThis.observed = {
      store: parseInstruction("sw $31, 4($29)"),
      operand: parseMemoryOperand("4($29)"),
      negativeOperand: parseMemoryOperand("-8($sp)"),
      numericStack: normalizeRegisterToken("$29"),
      numericReturn: normalizeRegisterToken("$31"),
      namedRegister: normalizeRegisterToken("$ra"),
      raChange: findRegisterChange([29, 100, 92, 31, 0, 64], 31),
      missingChange: findRegisterChange([29, 100, 92], 31),
      ascii: asciiOfWord(0x21694d41),
      address: parseAddressText(" 0x7fffeffc "),
      rejected: parseAddressText("stack")
    };
  `, context);

  const observed = context.observed;
  // The disassembly uses numeric register names, so the tool must map them back.
  assert.equal(observed.store.op, "sw");
  assert.deepEqual([...observed.store.operands], ["$31", "4($29)"]);
  assert.equal(observed.numericStack, "$sp");
  assert.equal(observed.numericReturn, "$ra");
  assert.equal(observed.namedRegister, "$ra");
  assert.equal(observed.operand.offset, 4);
  assert.equal(observed.operand.base, "$sp");
  assert.equal(observed.negativeOperand.offset, -8);
  assert.deepEqual({ ...observed.raChange }, { before: 0, after: 64 });
  assert.equal(observed.missingChange, null);
  assert.equal(observed.ascii, "AMi!");
  assert.equal(observed.address, 0x7fffeffc);
  assert.equal(observed.rejected, null);
});

test("stack visualizer tracks frames and rewinds through the central delta history", async () => {
  const source = await readFile(resolve(projectRoot, "tools/stack-visualizer.js"), "utf8");

  assert.match(source, /ctx\.createToolDeltaHistory\(/);
  assert.match(source, /isConnected: \(\) => connected/);
  assert.match(source, /onRuntimeEvent\(event, delivery = \{\}\)/);
  assert.match(source, /delivery\.retainHistory !== false/);
  assert.match(source, /onRuntimeBatchEnd\(\)/);
  assert.match(source, /history\.rewind\(event\.stepAfter \| 0\)/);
  assert.match(source, /history\.pruneBefore\(event\.historyStartStep \| 0\)/);

  // A recursive call leaves $ra untouched, so the return address must come from the
  // tracked register instead of an address computed from the call site.
  assert.match(source, /Number\.isFinite\(trackedRa\) \? trackedRa : readRegister\(REG_RA\)/);
  assert.doesNotMatch(source, /event\.executedAddress \+ 8/);

  // Two programs can share a label count, so the symbol table follows the runtime
  // revision rather than the number of labels alone.
  assert.match(source, /syncLabels\(snapshot, lastRuntimeRevision !== revision\)/);

  // The window can be resized down to roughly 520x320, and mobile mode reuses the
  // same stacked geometry with touch-sized controls and touch gestures.
  assert.match(source, /\.sv-tool\.sv-small \.sv-main \{[\s\S]*?grid-template-columns:minmax\(0, 1fr\);/);
  assert.match(source, /classList\.toggle\("sv-small", width < 780\)/);
  assert.match(source, /classList\.toggle\("sv-tiny", height < 400\)/);
  assert.match(source, /\.desktop-stacked \.sv-tool \.sv-main \{[\s\S]*?grid-template-columns:minmax\(0, 1fr\);/);
  assert.match(source, /\.desktop-stacked \.sv-tool \.sv-footer \.tool-btn \{[\s\S]*?min-height:30px;/);
  assert.match(source, /canvas\[data-sv="detail"\][\s\S]*?touch-action:none;|\.sv-detail-pane canvas \{[\s\S]*?touch-action:none;/);
  assert.match(source, /pinchOrigin = \{ distance: pinchDistance\(\)/);

  const manifest = JSON.parse(await readFile(resolve(projectRoot, "tools/tools.json"), "utf8"));
  assert.ok(
    manifest.tools.some((tool) => tool.id === "stack-visualizer" && tool.script === "./tools/stack-visualizer.js"),
    "the tools manifest must expose the stack visualizer"
  );
  const managerSource = await readFile(managerPath, "utf8");
  assert.match(managerSource, /id: "stack-visualizer", label: "Stack Visualizer"/);
});

test("tools drive execution through the runtime control bridge, not the commands", async () => {
  const managerSource = await readFile(managerPath, "utf8");
  const runtimeSource = await readFile(runtimePath, "utf8");

  assert.match(managerSource, /const runtimeControlBridge = Object\.freeze\(\{/);
  assert.match(managerSource, /runtimeControls: runtimeControlBridge/);
  assert.match(managerSource, /setRuntimeControls\(controls\) \{/);
  assert.match(runtimeSource, /toolManager\.setRuntimeControls\?\.\(\{[\s\S]*?isRunning: \(\) => runActive === true/);
  for (const command of ["go", "step", "backstep", "pause", "stop", "reset"]) {
    assert.match(runtimeSource, new RegExp(`${command}: \\(\\) => commands\\.${command}\\(\\)`));
  }

  // The bridge must stay inert until the runtime installs the real commands.
  const context = vm.createContext({});
  const bridgeSource = sourceBetween(managerSource, "  let runtimeControls = null;", "\n  let placementIndex");
  vm.runInContext(`
    ${bridgeSource}
    const before = { available: runtimeControlBridge.isAvailable(), running: runtimeControlBridge.isRunning() };
    runtimeControlBridge.step();
    const calls = [];
    runtimeControls = { step: () => calls.push("step"), isRunning: () => true };
    runtimeControlBridge.step();
    globalThis.observed = {
      before,
      after: { available: runtimeControlBridge.isAvailable(), running: runtimeControlBridge.isRunning() },
      calls
    };
  `, context);
  assert.deepEqual({ ...context.observed.before }, { available: false, running: false });
  assert.deepEqual({ ...context.observed.after }, { available: true, running: true });
  assert.deepEqual([...context.observed.calls], ["step"]);
});

test("stack visualizer stops execution exactly on its armed condition", async () => {
  const source = await readFile(resolve(projectRoot, "tools/stack-visualizer.js"), "utf8");

  // Stops go through the runtime's own breakpoint path so the run loop unwinds
  // normally instead of being torn down mid-batch.
  assert.match(source, /function placeBreakpoint\(address\)/);
  assert.match(source, /engine\.toggleBreakpoint\(target\)/);
  assert.match(source, /armedBreakpoint = \{ address: target, owned \}/);
  assert.match(source, /if \(armedBreakpoint\.owned/);

  // Inside a memory observer the program counter still points at the running
  // instruction, so the stop is queued and armed by the instruction observer.
  assert.match(source, /queuedObserverStop = t\("\{address\} was written with \{value\}"/);
  assert.match(source, /if \(queuedObserverStop\) \{[\s\S]*?armAt\(nextPc, message\);/);
  assert.match(source, /registerInstructionObserver\(\(detail\) => \{/);
  assert.match(source, /registerMemoryObserver\(\{/);

  for (const condition of ["call", "over", "finish", "sp", "watch"]) {
    assert.match(source, new RegExp(`data-sv-until="${condition}"`));
  }
  assert.match(source, /ctx\.runtimeControls\?\.go\?\.\(\)/);
  assert.match(source, /ctx\.runtimeControls\?\.step\?\.\(\)/);
  assert.match(source, /function resolveStepOver\(\)/);
  assert.match(source, /if \(pendingResume\) return;/);
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
    const RUN_STEP_OPTIONS_PLAIN = Object.freeze({
      includeSnapshot: false,
      includeMessage: false,
      includeRuntimeEvent: false
    });
    const RUN_STEP_OPTIONS_TRACED = Object.freeze({
      includeSnapshot: false,
      includeMessage: false,
      includeRuntimeEvent: true
    });
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

test("interactive Run sleeps until the next instruction instead of polling every frame", async () => {
  const source = await readFile(runtimePath, "utf8");
  const helperSource = sourceBetween(source, "function getNextRunLoopDelay", "\nfunction runLoopTick");
  const context = vm.createContext({});
  vm.runInContext(`
    const RUN_SPEED_UNLIMITED = 40;
    const RUN_LOOP_INTERVAL_MS = 16;
    const RUN_LOOP_MAX_IDLE_DELAY_MS = 50;
    let runLastTickAt = 1000;
    let runStepCarry = 0;
    const performance = { now: () => 1000 };
    ${helperSource}
    const atTwenty = getNextRunLoopDelay(20, 1000);
    const atThirty = getNextRunLoopDelay(30, 1000);
    const unlimited = getNextRunLoopDelay(RUN_SPEED_UNLIMITED, 1000);
    runStepCarry = 0.75;
    const nearDeadline = getNextRunLoopDelay(20, 1000);
    globalThis.observed = { atTwenty, atThirty, unlimited, nearDeadline };
  `, context);

  assert.deepEqual(
    { ...context.observed },
    { atTwenty: 50, atThirty: 34, unlimited: 16, nearDeadline: 13 }
  );
  assert.match(source, /scheduleRunLoop\(getNextRunLoopDelay\(speed\)\)/);
});

test("no-interaction Run yields without the nested timer clamp", async () => {
  const source = await readFile(runtimePath, "utf8");

  assert.match(source, /new window\.MessageChannel\(\)/);
  assert.match(source, /runLoopTaskChannel\.port2\.postMessage\(runScheduleGeneration\)/);
  assert.match(source, /speed === RUN_SPEED_UNLIMITED[\s\S]*?scheduleRunLoop\(0, true\)/);
  assert.match(source, /const RUN_LOOP_MAX_BATCH_UNLIMITED = 2048/);
  assert.match(source, /else \{\s*result = engine\.step\(RUN_STEP_OPTIONS_PLAIN\);/);
});

test("interactive Run updates the PC without rebuilding the full text segment", async () => {
  const [runtimeSource, uiSource] = await Promise.all([
    readFile(runtimePath, "utf8"),
    readFile(uiPath, "utf8")
  ]);

  assert.match(runtimeSource, /includeTextRows:\s*false,[\s\S]*?includeLabels:\s*false/);
  assert.match(runtimeSource, /incrementalRuntime:\s*true/);
  assert.match(runtimeSource, /function snapshotHasProgramRows\(snapshot\)/);
  assert.match(runtimeSource, /Number\(snapshot\.textRowCount\)/);
  assert.match(uiSource, /options\.incrementalRuntime === true/);
  assert.match(uiSource, /snapshot\?\.textRowsIncluded === false/);
  assert.match(uiSource, /Number\(snapshot\?\.runtimeRevision\) === Number\(lastSnapshot\?\.runtimeRevision\)/);
  assert.match(uiSource, /snapshot\?\.labelsIncluded === false/);
  assert.match(uiSource, /querySelectorAll\("tr\.current-row, tr\.updated-row"\)/);
  assert.match(uiSource, /querySelector\(`tr\[data-text-address="\$\{snapshot\.pc >>> 0\}"\]`\)/);
  assert.match(uiSource, /refs\.registers\.body\.querySelector\("tr\[data-register-key\]"\)/);
  assert.match(uiSource, /row\.classList\.toggle\("updated-row", changed\)/);
});

test("an assembled program never loses its text segment mid-assembly", async () => {
  const uiSource = await readFile(uiPath, "utf8");
  const guardSource = sourceBetween(uiSource, "      const sameAssembly = Boolean(lastSnapshot)", "\n      lastSnapshot = snapshot;");
  const context = vm.createContext({});
  vm.runInContext(`
    function applyGuards(lastSnapshot, snapshot, options, renderedRows) {
      const execute = {
        textBody: {
          querySelectorAll: () => ({ length: renderedRows })
        }
      };
      ${guardSource}
      return { textRows: snapshot.textRows, incrementalRuntime: Boolean(incrementalRuntime) };
    }
    const rows = [{ address: 0x00400000 }, { address: 0x00400004 }];
    globalThis.observed = {
      // A run-time snapshot that omits the rows keeps the rendered program.
      omitted: applyGuards(
        { runtimeRevision: 2, textRows: rows, labels: [] },
        { runtimeRevision: 2, assembled: true, textRowsIncluded: false, textRows: [], labels: [] },
        {},
        2
      ),
      // A snapshot that claims to carry the rows but arrives empty must not blank it.
      emptied: applyGuards(
        { runtimeRevision: 2, textRows: rows, labels: [] },
        { runtimeRevision: 2, assembled: true, textRows: [], labels: [] },
        {},
        2
      ),
      // A new assembly is allowed to render an empty program.
      reassembled: applyGuards(
        { runtimeRevision: 2, textRows: rows, labels: [] },
        { runtimeRevision: 3, assembled: true, textRows: [], labels: [] },
        {},
        2
      ),
      // A stale table forces a full render instead of a highlight-only update.
      staleTable: applyGuards(
        { runtimeRevision: 2, textRows: rows, labels: [] },
        { runtimeRevision: 2, assembled: true, textRowsIncluded: false, textRows: [], labels: [] },
        { incrementalRuntime: true },
        7
      ),
      freshTable: applyGuards(
        { runtimeRevision: 2, textRows: rows, labels: [] },
        { runtimeRevision: 2, assembled: true, textRowsIncluded: false, textRows: [], labels: [] },
        { incrementalRuntime: true },
        2
      )
    };
  `, context);

  const observed = context.observed;
  assert.equal(observed.omitted.textRows.length, 2);
  assert.equal(observed.emptied.textRows.length, 2, "an empty snapshot must not blank the current assembly");
  assert.equal(observed.reassembled.textRows.length, 0, "a new assembly renders its own rows");
  assert.equal(observed.staleTable.incrementalRuntime, false, "a stale table must be rebuilt");
  assert.equal(observed.freshTable.incrementalRuntime, true);
});

test("the runtime asks the engine again before rendering a program without rows", async () => {
  const runtimeSource = await readFile(runtimePath, "utf8");
  const helperSource = sourceBetween(runtimeSource, "function withProgramRows(snapshot)", "\nfunction syncSnapshot");
  const context = vm.createContext({});
  vm.runInContext(`
    function chooseFresherSnapshot(preferred, live) {
      const preferredRows = Array.isArray(preferred.textRows) ? preferred.textRows.length : 0;
      const liveRows = Array.isArray(live.textRows) ? live.textRows.length : 0;
      return liveRows > preferredRows ? live : preferred;
    }
    let reads = 0;
    const rows = [{ address: 4194304 }];
    const engine = {
      getSnapshot() {
        reads += 1;
        return { assembled: true, runtimeRevision: 2, steps: 5, textRows: rows };
      }
    };
    ${helperSource}
    globalThis.observed = {
      recovered: withProgramRows({ assembled: true, runtimeRevision: 2, steps: 5, textRows: [] }).textRows.length,
      readsAfterRecovery: reads,
      lightweightUntouched: withProgramRows({ assembled: true, textRowsIncluded: false, textRows: [] }).textRows.length,
      populatedUntouched: withProgramRows({ assembled: true, textRows: rows }).textRows.length,
      readsTotal: reads
    };
  `, context);

  const observed = context.observed;
  assert.equal(observed.recovered, 1, "an assembled snapshot without rows is repaired from the engine");
  assert.equal(observed.readsAfterRecovery, 1);
  assert.equal(observed.lightweightUntouched, 0, "a deliberately lightweight snapshot is left alone");
  assert.equal(observed.populatedUntouched, 1);
  assert.equal(observed.readsTotal, 1, "the engine is only queried when rows are unexpectedly missing");
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

test("every tool speaks the selected language and refreshes when it changes", async () => {
  // Static markup is translated by the shell, but anything a tool writes at
  // runtime needs its own t() call, and an open window has to re-translate
  // instead of waiting to be reopened.
  const toolsDirectory = resolve(projectRoot, "tools");
  const manifest = JSON.parse(
    (await readFile(resolve(toolsDirectory, "tools.json"), "utf8")).replace(/^\uFEFF/, "")
  );
  const entries = Array.isArray(manifest) ? manifest : (manifest.tools || []);
  assert.ok(entries.length > 0, "The tool manifest must not be empty.");

  const catalogs = {};
  const i18n = {
    getCatalog(code) { return catalogs[code] || null; },
    registerLanguage(code, table) { catalogs[code] = table; }
  };
  for (const language of ["en", "es", "pt", "zh", "hi", "ar", "fr", "bn", "ru", "id"]) {
    const source = await readFile(resolve(projectRoot, "assets", "js", "i18n", `${language}.js`), "utf8");
    vm.runInNewContext(source, { window: { WebMarsI18n: i18n }, globalThis: { WebMarsI18n: i18n } });
  }

  for (const entry of entries) {
    const label = String(entry.label || entry.name || "");
    const script = String(entry.script || `./tools/${entry.id}.js`);
    const source = await readFile(resolve(projectRoot, script.replace(/^\.\//, "")), "utf8");

    assert.ok(
      Object.hasOwn(catalogs.en, label),
      `'${label}' is missing from the English catalog, so the Tools menu cannot translate it`
    );

    // A tool that rewrites text at runtime must own a t() helper and re-run it
    // on a language change; one that only ships static markup needs neither.
    const rewritesAtRuntime = /\.(?:textContent|innerHTML)\s*=|postMars\(/.test(source);
    if (!rewritesAtRuntime) continue;

    assert.match(
      source,
      /function t\(message/,
      `'${label}' writes text at runtime but has no t() helper`
    );
    assert.doesNotMatch(
      source,
      /textContent\s*=\s*(?:connected\s*\?\s*)?"(?:Connect to MIPS|Disconnect from MIPS)"/,
      `'${label}' hardcodes the English connect label`
    );
  }
});

test("static markup translation ignores the indentation around a label", async () => {
  // Labels written across several lines, and text after an inline <input>,
  // carry whitespace into the text node. Keying on the raw value left them
  // permanently English.
  const source = await readFile(
    resolve(projectRoot, "assets/js/app-modules/09-ui-translation.js"),
    "utf8"
  );
  const context = {
    translateText: (value) => (value === "Draw hash marks" ? "Desenhar marcas de escala" : value),
    document: null,
    window: {}
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: "09-ui-translation.js" });
  const translateStaticTree = context.WebMarsModules.uiTranslation.translateStaticTree;

  const textNode = { nodeValue: " Draw hash marks\n            ", isConnected: true, parentElement: { tagName: "LABEL" } };
  let served = false;
  const root = {
    querySelectorAll: () => [],
  };
  context.document = {
    createTreeWalker: () => ({
      nextNode() {
        if (served) return null;
        served = true;
        return textNode;
      }
    })
  };
  context.NodeFilter = { SHOW_TEXT: 4 };

  translateStaticTree(root);
  assert.equal(textNode.nodeValue, " Desenhar marcas de escala\n            ");
});

test("the memory map ends free space exactly at $sp, never inside the stack band", async () => {
  // Padding the stack band downwards painted memory the program has never
  // touched as stack and left the $sp marker floating in the middle of the
  // band, which reads as a stack that is already deep.
  const source = await readFile(resolve(projectRoot, "tools/stack-visualizer.js"), "utf8");
  const buildSource = sourceBetween(source, "      function buildSegments()", "      function segmentAt(");

  function segmentsFor({ sp, deepest }) {
    const context = vm.createContext({
      memoryMap: () => ({
        textBase: 0x00400000,
        externBase: 0x10000000,
        dataBase: 0x10010000,
        heapBase: 0x10040000,
        stackPointer: 0x7fffeffc,
        stackBase: 0x7ffffffc,
        kernelTextBase: 0x80000000,
        kernelDataBase: 0x90000000,
        mmioBase: 0xffff0000
      }),
      currentSp: () => sp,
      deepestSp: deepest,
      ctx: { engine: { reservedHeapMappedBytes: 0 } }
    });
    vm.runInContext(`${buildSource}\nglobalThis.result = buildSegments();`, context);
    return context.result;
  }

  const pick = (segments, id) => segments.find((segment) => segment.id === id);

  const atRest = segmentsFor({ sp: 0x7fffeffc, deepest: 0x7fffeffc });
  assert.equal(pick(atRest, "free").end, 0x7fffeffc, "free space must run up to $sp");
  assert.equal(pick(atRest, "stack").start, 0x7fffeffc, "the stack band must start at $sp");

  // Once the program pushes, the band grows downwards to the deepest $sp seen
  // and free space still stops precisely where the stack begins.
  const pushed = segmentsFor({ sp: 0x7fffef00, deepest: 0x7fffee80 });
  assert.equal(pick(pushed, "stack").start, 0x7fffee80);
  assert.equal(pick(pushed, "free").end, 0x7fffee80);

  for (const segments of [atRest, pushed]) {
    const stack = pick(segments, "stack");
    assert.ok(stack.end > stack.start, "the stack band must never collapse");
    assert.equal(pick(segments, "free").end, stack.start, "the bands must not overlap or leave a gap");
  }

  // The argument page MARS keeps above the initial $sp is 4 KB against a stack of
  // tens of bytes. Folded into one band it left the frames as an invisible sliver,
  // so it is its own band and the stack band stops at the initial $sp.
  for (const segments of [atRest, pushed]) {
    const stack = pick(segments, "stack");
    const args = pick(segments, "args");
    assert.ok(args, "the argument page must have its own band");
    assert.equal(stack.end, 0x7ffff000, "the stack band stops just above the initial $sp");
    assert.equal(args.start, stack.end, "the argument band continues where the stack band ends");
    assert.equal(args.end, 0x80000000, "the argument band reaches the top of the stack segment");
  }

  // Every address from the heap to the top of the segment stays covered: a gap
  // would make segmentAt() return null and the detail view lose its colouring.
  const ordered = [...atRest].sort((a, b) => a.start - b.start);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].start > ordered[index - 1].end) {
      assert.fail(`gap between '${ordered[index - 1].label}' and '${ordered[index].label}'`);
    }
  }
});

test("the map usage cache returns the same record shape on a hit as on a miss", async () => {
  // computeDensity caches per segment list. Returning only the bucket array on a
  // cache hit, while the miss path returned the whole record, blanked the memory
  // map on every second frame with "cannot read properties of undefined".
  const source = await readFile(resolve(projectRoot, "tools/stack-visualizer.js"), "utf8");
  const densitySource = sourceBetween(source, "      function computeDensity(", "      // Bytes are what a student counts");

  const words = new Map([[0x10010000, 1], [0x10010004, 2], [0x7fffeffc, 3]]);
  const context = vm.createContext({
    performance: { now: () => 1000 },
    memoryWords: () => words,
    densityCache: null,
    densityStamp: 0,
    DENSITY_REFRESH_MS: 250,
    MAX_DENSITY_SCAN: 60000
  });
  const segments = [
    { id: "data", start: 0x10010000, end: 0x10040000 },
    { id: "stack", start: 0x7fffef00, end: 0x7ffff000 }
  ];
  vm.runInContext(`
    ${densitySource}
    globalThis.run = (segments) => computeDensity(segments, 8);
  `, context);

  const miss = context.run(segments);
  const hit = context.run(segments);

  for (const [name, result] of [["miss", miss], ["hit", hit]]) {
    assert.ok(Array.isArray(result.data), `${name}: data must be the per-segment buckets`);
    assert.ok(Array.isArray(result.touched), `${name}: touched must carry the per-segment totals`);
    assert.equal(result.data.length, segments.length, `${name}: one bucket array per segment`);
  }
  assert.deepEqual([...hit.touched], [...miss.touched], "a cache hit must report the same totals");
  assert.deepEqual([...hit.touched], [2, 1], "words are counted into the segment that contains them");
});

test("map band heights come from region size alone, on one shared scale", async () => {
  // The bands used to carry hand-tuned weights, so a 64 KB region could be drawn
  // taller than a 256 MB one. Height now derives from the span and nothing else:
  // equal sizes must produce equal heights, and bigger must never be shorter.
  const source = await readFile(resolve(projectRoot, "tools/stack-visualizer.js"), "utf8");
  const scaleSource = sourceBetween(source, "      function bandShare(", "      // Colour carries the second dimension");
  const context = vm.createContext({});
  vm.runInContext(`${scaleSource}\nglobalThis.bandShare = bandShare;`, context);
  const { bandShare } = context;

  const buildSource = sourceBetween(source, "      function buildSegments()", "      function segmentAt(");
  assert.doesNotMatch(buildSource, /weight:/, "segments must not carry hand-tuned weights any more");

  // Real spans from the default memory map.
  const spans = {
    mmio: 0x10000,
    extern: 0x10000,
    text: 0x0fc00000,
    ktext: 0x10000000,
    data: 0x30000,
    stack: 44,
    args: 0x1000
  };

  assert.equal(
    bandShare(spans.mmio),
    bandShare(spans.extern),
    "two 64 KB regions must claim exactly the same height"
  );
  for (const [smaller, bigger] of [["data", "text"], ["stack", "args"], ["args", "data"], ["text", "ktext"]]) {
    assert.ok(
      bandShare(spans[smaller]) < bandShare(spans[bigger]),
      `'${smaller}' is smaller than '${bigger}' and must not be drawn taller`
    );
  }

  // One law for every band: doubling the size adds the same amount of height
  // wherever it happens, which is what makes the strip readable end to end.
  const step = bandShare(2048) - bandShare(1024);
  for (const size of [4096, 0x100000, 0x10000000]) {
    assert.ok(
      Math.abs((bandShare(size * 2) - bandShare(size)) - step) < 0.01,
      `the scale must treat a doubling at ${size} like a doubling anywhere else`
    );
  }
});

test("stack visualizer keeps its memory map inside the medium layout", async () => {
  const source = await readFile(resolve(projectRoot, "tools/stack-visualizer.js"), "utf8");

  // At medium widths the inspector becomes a second grid row. The fixed-height
  // bottom chart and readout must yield space, and the canvas must be allowed to
  // shrink, otherwise the map overflows its pane at ordinary laptop heights.
  assert.match(source, /\.sv-tool\.sv-medium \.sv-side \{[\s\S]*?max-height:110px;/);
  assert.match(source, /\.sv-tool\.sv-medium \.sv-map-pane canvas\[data-sv="map"\] \{ min-height:0; \}/);
  assert.match(source, /\.sv-tool\.sv-medium \.sv-readout \{ display:none; \}/);
  assert.match(source, /\.sv-tool\.sv-medium \.sv-bottom \{ height:120px; \}/);
});

test("stack visualizer initially centers the memory window on $sp", async () => {
  const source = await readFile(resolve(projectRoot, "tools/stack-visualizer.js"), "utf8");
  const helperSource = sourceBetween(source, "      function defaultViewAddress()", "      function centerView(");

  assert.match(
    source,
    /function renderAll\(\) \{\s*if \(followSp\) centerView\(currentSp\(\)\);/,
    "Follow $sp must keep the view centered before the tool is connected too"
  );

  for (const highTop of [true, false]) {
    const context = vm.createContext({
      currentSp: () => 0x7fffeffc,
      ZOOM_LEVELS: [{ bytesPerRow: 4 }],
      zoomIndex: 0,
      visibleRowCount: () => 10,
      highTop
    });
    vm.runInContext(`${helperSource}\nglobalThis.top = defaultViewAddress();`, context);

    const direction = highTop ? -1 : 1;
    const middle = (context.top + direction * 5 * 4) >>> 0;
    assert.equal(middle, 0x7fffeffc, `the ${highTop ? "high-top" : "low-top"} view must center on $sp`);
  }
});

test("fitting a window to a virtual display removes scrollbars without leaving slack", async () => {
  const source = await readFile(managerPath, "utf8");
  const helperSource = sourceBetween(source, "function computeDisplayFitSize", "\nfunction createToolManager");
  const context = vm.createContext({});
  vm.runInContext(helperSource, context);
  const compute = context.computeDisplayFitSize;

  const base = {
    windowWidth: 800,
    windowHeight: 600,
    displayWidth: 640,
    displayHeight: 400,
    viewportWidth: 640,
    viewportHeight: 400,
    contentScrollWidth: 780,
    contentClientWidth: 780,
    contentScrollHeight: 580,
    contentClientHeight: 580,
    minWidth: 200,
    minHeight: 120,
    maxWidth: 1600,
    maxHeight: 1000
  };

  const settled = compute(base);
  assert.equal(settled.width, 800, "a viewport already matching the display must not move");
  assert.equal(settled.height, 600);

  // A viewport wider and shorter than the display: shed the empty band on one
  // axis while growing out of the scrollbar on the other.
  const mismatched = compute({ ...base, viewportWidth: 760, viewportHeight: 300 });
  assert.equal(mismatched.width, 800 - 120);
  assert.equal(mismatched.height, 600 + 100);

  // Fractions of a pixel are what keep a scrollbar alive, so they round up.
  const fractional = compute({ ...base, viewportHeight: 399.9 });
  assert.equal(fractional.height, 601);

  // Settings and footer spilling out of the window set a floor under the fit.
  const crowded = compute({
    ...base,
    displayWidth: 128,
    viewportWidth: 640,
    contentScrollWidth: 780,
    contentClientWidth: 600
  });
  assert.equal(crowded.width, 980, "chrome that already overflows must not be squeezed further");
  assert.equal(crowded.floorWidth, 980, "the floor travels to the next pass so it is not shrunk away again");

  // A display taller than the desktop keeps its vertical scrollbar, so the
  // width has to carry it instead of paying with a horizontal scrollbar.
  const oversized = compute({
    ...base,
    displayHeight: 2000,
    viewportHeight: 400,
    scrollbarWidth: 15,
    maxHeight: 700
  });
  assert.equal(oversized.height, 700);
  assert.equal(oversized.width, 815);
  assert.equal(oversized.clamped, true);
});

test("the display fit is desktop-only, undone by hand and routed through the window manager", async () => {
  const source = await readFile(managerPath, "utf8");
  const uiSource = await readFile(uiPath, "utf8");

  // Stacked panels span the screen, so there is no window geometry to fit.
  assert.match(source, /desktop\?\.classList\?\.contains\("desktop-stacked"\) !== true/);
  assert.match(uiSource, /\.desktop-stacked \.tool-window \.mars-tool-display-fit \{\s*display: none;/);

  // Sizing goes through the manager so the result is clamped to the desktop and
  // remembered like any other window geometry.
  assert.match(uiSource, /function resizeWindow\(windowId, size = \{\}\) \{[\s\S]*?setWindowMetrics\(entry, metrics, true\);/);
  assert.match(uiSource, /^\s{4}resizeWindow,$/m);
  assert.match(source, /windowManager\.resizeWindow\(root\.id, target\)/);

  // Dragging a resize handle is an explicit override of the automatic size.
  assert.match(source, /classList\.contains\("window-resize-handle"\)[\s\S]*?setEnabled\(false\)/);

  for (const toolPath of [
    "tools/tty-ansi-terminal.js",
    "tools/bitmap-display.js",
    "tools/bitmap-terminal-tool.js"
  ]) {
    const toolSource = await readFile(resolve(projectRoot, toolPath), "utf8");
    assert.match(toolSource, /ctx\.createDisplayFitController\(\{/, `${toolPath} must offer the fit`);
    assert.match(toolSource, /class="mars-tool-display-fit"/, `${toolPath} must expose the fit checkbox`);
    assert.match(toolSource, /fit-window" type="checkbox" checked/, `${toolPath} must enable fit by default`);
    assert.match(toolSource, /Fit window to display/, `${toolPath} must label the fit checkbox`);
    assert.match(toolSource, /mars-tool-display-settings-toggle/, `${toolPath} must offer the settings toggle`);
    assert.match(toolSource, /let settingsCollapsed = true;/, `${toolPath} must hide settings by default`);
    assert.match(toolSource, /displayFit\.setEnabled\(true\);/, `${toolPath} must start fitted`);
    assert.match(toolSource, /displayFit\.setEnabled\(/, `${toolPath} must wire the checkbox`);
    assert.match(toolSource, /displayFit\.request\(\)/, `${toolPath} must refit when the display changes`);
  }
});

test("TTY terminal defers right-margin wrap and preserves VT display state", async () => {
  const source = await readFile(resolve(projectRoot, "tools/tty-ansi-terminal.js"), "utf8");
  const createCellSource = sourceBetween(source, "  function createCell()", "\n\n  // Pointer motion is lossy");
  const terminalCoreSource = sourceBetween(source, "      function cloneCell(", "\n      function updateMetrics()");
  const context = vm.createContext({});

  vm.runInContext(`
    const TERMINAL_GEOMETRY = { columns: 80, rows: 25 };
    const DEC_SPECIAL_GRAPHICS = Object.freeze({});
    const CP437_BOX_DRAWING = Object.freeze({});
    const encodingSelect = { value: "ansi" };
    const mouseMotionCoalescer = { reset() {} };
    const activeMousePointers = new Map();
    const history = { ensure() { return null; } };
    let terminalState = null;
    let savedCursor = { row: 0, col: 0 };
    let activeHistoryStep = null;
    let suppressHistory = true;
    let dirtyAll = false;
    let dirty = new Set();
    let inputQueue = [];
    let observerReadCount = 0;
    let observerWriteCount = 0;
    let snapshotReadCount = 0;
    let snapshotWriteCount = 0;
    let polledTxCount = 0;
    let crlfTranslationEnabled = false;
    function getSnapshotStep() { return 0; }
    function captureMmioState() { return {}; }
    function scheduleRender() {}
    ${createCellSource}
    ${terminalCoreSource}
    resetTerminalState();
    globalThis.feed = (text) => {
      String(text).split("").forEach((character) => processTerminalByte(character.charCodeAt(0)));
    };
    globalThis.resetTerminal = () => resetTerminalState();
    globalThis.readTerminal = () => cloneTerminalState(terminalState);
  `, context);

  context.feed("A".repeat(80 * 25));
  let state = context.readTerminal();
  assert.equal(state.cells.every((cell) => cell.ch === "A"), true, "the 80x25 frame must remain intact");
  assert.equal(state.cursorRow, 24);
  assert.equal(state.cursorCol, 79);
  assert.equal(state.wrapPending, true, "the bottom-right cell sets deferred wrap instead of scrolling");

  context.feed("\x1b[1;1H");
  state = context.readTerminal();
  assert.equal(state.cursorRow, 0);
  assert.equal(state.cursorCol, 0);
  assert.equal(state.wrapPending, false, "explicit cursor motion cancels deferred wrap");

  context.resetTerminal();
  context.feed("A".repeat(80 * 25));
  context.feed("B");
  state = context.readTerminal();
  assert.equal(state.cells[24 * 80].ch, "B", "the next printable character performs the pending scroll and wrap");
  assert.equal(state.cells[(25 * 80) - 1].ch, " ");
  assert.equal(state.cursorRow, 24);
  assert.equal(state.cursorCol, 1);
  assert.equal(state.wrapPending, false);

  context.resetTerminal();
  context.feed("A".repeat(80));
  context.feed("\r");
  state = context.readTerminal();
  assert.equal(state.wrapPending, false, "a carriage return cancels deferred wrap");
  assert.equal(state.cursorCol, 0);

  for (const [control, expectedRow, expectedColumn, label] of [
    ["\n", 1, 79, "line feed"],
    ["\b", 0, 78, "backspace"],
    ["\t", 0, 79, "tab"]
  ]) {
    context.resetTerminal();
    context.feed("A".repeat(80));
    context.feed(control);
    state = context.readTerminal();
    assert.equal(state.wrapPending, false, `${label} cancels deferred wrap`);
    assert.equal(state.cursorRow, expectedRow);
    assert.equal(state.cursorCol, expectedColumn);
  }

  context.feed("\x1b[5;7H\x1b[2J");
  state = context.readTerminal();
  assert.equal(state.cursorRow, 4, "ED 2 must not home the cursor");
  assert.equal(state.cursorCol, 6, "ED 2 must preserve the cursor column");
  assert.equal(state.cells.every((cell) => cell.ch === " "), true);

  context.feed("\x1b[?25l\x1b[2mX");
  state = context.readTerminal();
  assert.equal(state.cursorVisible, false);
  assert.equal(state.cells[(4 * 80) + 6].dim, true, "SGR 2 is stored on the rendered cell");
  assert.equal(state.currentDim, true);

  context.feed("\x1b[22mY\x1b[?25h");
  state = context.readTerminal();
  assert.equal(state.cells[(4 * 80) + 7].dim, false, "SGR 22 clears both bold and dim intensity");
  assert.equal(state.currentDim, false);
  assert.equal(state.cursorVisible, true);
});

test("TTY mouse motion coalesces to the latest report without delaying barriers", async () => {
  const source = await readFile(resolve(projectRoot, "tools/tty-ansi-terminal.js"), "utf8");
  const coalescerSource = sourceBetween(
    source,
    "  function createLatestMouseMotionCoalescer(",
    "\n\n  host.register"
  );
  const context = vm.createContext({});
  vm.runInContext(`${coalescerSource}\nglobalThis.createCoalescer = createLatestMouseMotionCoalescer;`, context);

  let ready = false;
  let nextFrame = 1;
  const callbacks = new Map();
  const emitted = [];
  const coalescer = context.createCoalescer({
    schedule(callback) {
      const id = nextFrame;
      nextFrame += 1;
      callbacks.set(id, callback);
      return id;
    },
    cancel(id) {
      callbacks.delete(id);
    },
    canFlush: () => ready,
    emit(bytes) {
      emitted.push([...bytes]);
    }
  });
  const runFrames = () => {
    const queued = [...callbacks.values()];
    callbacks.clear();
    queued.forEach((callback) => callback());
  };

  coalescer.enqueue([1], "cell-1");
  coalescer.enqueue([2], "cell-2");
  runFrames();
  assert.equal(emitted.length, 0, "motion waits while previous receiver bytes are queued");
  assert.equal(coalescer.pendingByteCount(), 1, "only the newest position remains pending");

  coalescer.enqueue([3], "cell-3");
  assert.equal(coalescer.flush(true), true, "a press/release/keyboard barrier can force the pending motion first");
  assert.deepEqual(emitted, [[3]]);
  assert.equal(callbacks.size, 0, "forcing a barrier cancels the scheduled frame");
  assert.equal(coalescer.enqueue([3], "cell-3"), false, "identical positions are deduplicated");

  coalescer.clearDedupe();
  ready = true;
  assert.equal(coalescer.enqueue([4], "cell-3"), true);
  runFrames();
  assert.deepEqual(emitted, [[3], [4]]);

  assert.match(source, /\.tty-ansi-canvas \{[\s\S]*?touch-action: none;/);
  assert.match(source, /canvas\.addEventListener\("pointercancel"/);
  assert.match(source, /canvas\.addEventListener\("lostpointercapture"/);
  const queueSource = sourceBetween(source, "      function queueInputBytes(", "\n\n      function echoInputBytes(");
  assert.ok(
    queueSource.indexOf("mouseMotionCoalescer.flush(true)") < queueSource.indexOf("appendInputBytes(bytes)"),
    "a non-motion event must flush the latest position before appending its own bytes"
  );
});
