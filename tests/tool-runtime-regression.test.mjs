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

test("Run trace preserves each decoded instruction and exact changed word without sharing the final map", async () => {
  const source = await readFile(runtimePath, "utf8");
  const helperSource = sourceBetween(source, "function createRunToolTraceContext", "\nfunction runLoopTick");
  const context = vm.createContext({});
  vm.runInContext(`
    function toHex(value) {
      return "0x" + (value >>> 0).toString(16).padStart(8, "0");
    }
    ${helperSource}
    const baseline = {
      pc: 0x00400000,
      steps: 0,
      registers: [{ index: 8, name: "$t0", value: 65 }],
      cop1: [],
      textRows: [{ address: 0x00400000, basic: "nop", source: "nop", isCurrent: true }],
      labels: [{ label: "main", address: 0x00400000 }],
      memoryWords: new Map()
    };
    const traceContext = createRunToolTraceContext(baseline);
    let call = 0;
    const options = [];
    const engine = {
      memoryWords: new Map([[0xffff000c, 65]]),
      step(stepOptions) {
        options.push(stepOptions);
        call += 1;
        return {
          ok: true,
          executedAddress: 0x00400000,
          executedInstruction: "sw $t0,0($t1)",
          machineWord: 0xad280000,
          snapshot: {
            pc: 0x00400000,
            steps: call,
            registers: [{ index: 8, name: "$t0", value: 65 + call }],
            cop1: [],
            lastMemoryWriteAddress: 0xffff000c
          }
        };
      }
    };
    const first = executeRunStepWithToolTrace(engine, traceContext, true);
    engine.memoryWords.set(0xffff000c, 66);
    const second = executeRunStepWithToolTrace(engine, traceContext, true);
    const plain = executeRunStepWithToolTrace(engine, traceContext, false);
    globalThis.observed = {
      firstInstruction: first.toolSnapshot.runtimeTrace.previousSnapshot.textRows[0].basic,
      firstPreviousSteps: first.toolSnapshot.runtimeTrace.previousSnapshot.steps,
      secondPreviousSteps: second.toolSnapshot.runtimeTrace.previousSnapshot.steps,
      firstWord: first.toolSnapshot.memoryWords.get(0xffff000c),
      secondWord: second.toolSnapshot.memoryWords.get(0xffff000c),
      sameMap: first.toolSnapshot.memoryWords === second.toolSnapshot.memoryWords,
      firstOptions: options[0],
      plainOptions: options[2],
      plainSnapshot: plain.toolSnapshot
    };
  `, context);

  const observed = context.observed;
  assert.equal(observed.firstInstruction, "sw $t0,0($t1)");
  assert.equal(observed.firstPreviousSteps, 0);
  assert.equal(observed.secondPreviousSteps, 1);
  assert.equal(observed.firstWord, 65);
  assert.equal(observed.secondWord, 66);
  assert.equal(observed.sameMap, false);
  assert.equal(observed.firstOptions.includeSnapshot, true);
  assert.equal(observed.firstOptions.snapshotOptions.includeMemoryWords, false);
  assert.equal(observed.plainOptions.includeSnapshot, false);
  assert.equal(observed.plainSnapshot, null);
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
    assert.match(source, /runtimeTrace\?\.previousSnapshot/);
    assert.match(source, /delivery\.isLast !== false/);
  }
});
