import assert from "node:assert/strict";
import test from "node:test";
import { createJavaScriptEngine, loadMiniCCompiler } from "./helpers/engines.mjs";

function registers(engine) {
  return engine.exportRuntimeState({ includeProgram: false }).registers;
}

test("runtime snapshots identify each fresh machine lifecycle", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const initialRevision = engine.getSnapshot().runtimeRevision;
  const source = `
.text
main:
  nop
`;

  assert.equal(engine.assemble(source, { sourceName: "revision-one.s" }).ok, true);
  const firstAssemblyRevision = engine.getSnapshot().runtimeRevision;
  assert.notEqual(firstAssemblyRevision, initialRevision);

  assert.equal(engine.assemble(source, { sourceName: "revision-two.s" }).ok, true);
  const secondAssemblyRevision = engine.getSnapshot().runtimeRevision;
  assert.notEqual(secondAssemblyRevision, firstAssemblyRevision);
});

test("data directives, labels, and load instructions work together", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.data
value:   .word 0x12345678
message: .asciiz "OK"
.text
.globl main
main:
  la   $t0, value
  lw   $t1, 0($t0)
  la   $t2, message
  lbu  $t3, 0($t2)
  lbu  $t4, 1($t2)
  li   $v0, 10
  syscall
`;

  const assembled = engine.assemble(source, { sourceName: "data-labels.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  const result = engine.go(100);
  assert.equal(result.ok, true);
  assert.equal(result.done, true);

  const state = registers(engine);
  assert.equal(state[9] | 0, 0x12345678);
  assert.equal(state[11] | 0, "O".charCodeAt(0));
  assert.equal(state[12] | 0, "K".charCodeAt(0));
  assert.equal(engine.readWord(state[8] >>> 0) >>> 0, 0x12345678);
});

test("print syscalls emit the expected run I/O stream", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  li $a0, 42
  li $v0, 1
  syscall
  li $a0, 10
  li $v0, 11
  syscall
  li $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "syscall-output.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));

  let output = "";
  for (let index = 0; index < 30 && !engine.getSnapshot().halted; index += 1) {
    const result = engine.step({ includeSnapshot: false });
    assert.equal(result.ok, true);
    if (result.runIo) output += result.message;
  }
  assert.equal(output, "42\n");
  assert.equal(engine.getSnapshot().halted, true);
});

test("backstep restores registers, memory, program counter, and step count", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true, maxBacksteps: 20 } });
  const source = `
.text
main:
  addi $t0, $zero, 1
  addi $t0, $t0, 2
  sw   $t0, 0($sp)
  li   $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "backstep.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  const stackAddress = registers(engine)[29] >>> 0;

  assert.equal(engine.step({ includeSnapshot: false }).ok, true);
  assert.equal(engine.step({ includeSnapshot: false }).ok, true);
  const storePc = engine.getSnapshot().pc >>> 0;
  assert.equal(engine.step({ includeSnapshot: false }).ok, true);
  assert.equal(engine.readWord(stackAddress), 3);

  const undoStore = engine.backstep();
  assert.equal(undoStore.ok, true);
  assert.equal(engine.readWord(stackAddress), 0);
  assert.equal(engine.getSnapshot().pc >>> 0, storePc);
  assert.equal(engine.getSnapshot().steps, 2);
  assert.equal(registers(engine)[8], 3);

  const undoAdd = engine.backstep();
  assert.equal(undoAdd.ok, true);
  assert.equal(registers(engine)[8], 1);
  assert.equal(engine.getSnapshot().steps, 1);
});

test("backstep history retains inverse deltas instead of full machine snapshots", async () => {
  const engine = await createJavaScriptEngine({
    settings: {
      startAtMain: true,
      maxBacksteps: 100
    }
  });
  const source = `
.text
main:
  addiu $t0, $zero, 1
  addiu $t1, $zero, 2
  sw    $t1, 0($sp)
  nop
`;
  const assembled = engine.assemble(source, { sourceName: "delta-history.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));

  const first = engine.step({ includeSnapshot: false, includeRuntimeEvent: true });
  assert.equal(first.ok, true);
  assert.equal(first.runtimeEvent.type, "instruction");
  assert.deepEqual(Array.from(first.runtimeEvent.registerChanges), [8, 0, 1]);

  const firstJournal = engine.executionHistory.at(0);
  assert.equal(Object.hasOwn(firstJournal, "registers"), false);
  assert.equal(Object.hasOwn(firstJournal, "registerBaseline"), false);
  assert.equal(Object.hasOwn(firstJournal, "cop0Registers"), false);
  assert.equal(Object.hasOwn(firstJournal, "cop1Registers"), false);
  assert.deepEqual(Array.from(firstJournal.r), [8, 0]);
  assert.equal(Object.hasOwn(firstJournal, "c0"), false);
  assert.equal(Object.hasOwn(firstJournal, "c1"), false);
  assert.equal(Object.hasOwn(firstJournal, "ff"), false);
  assert.equal(Object.hasOwn(firstJournal, "m"), false);

  assert.equal(engine.step({ includeSnapshot: false }).ok, true);
  const store = engine.step({ includeSnapshot: false, includeRuntimeEvent: true });
  assert.equal(store.ok, true);
  assert.equal(store.runtimeEvent.memoryAccesses.some((access) => access.kind === "write"), true);
  const storeJournal = engine.executionHistory.at(2);
  assert.equal(storeJournal.m.length, 2);
  assert.equal(storeJournal.m[0], registers(engine)[29] >>> 0);
  assert.equal(storeJournal.m[1]?.constructor?.name, "Uint8Array");
  assert.equal(storeJournal.m[1].length, 1);

  const snapshot = engine.getSnapshot();
  assert.equal(snapshot.backstepHistoryStartStep, 0);
  assert.equal(snapshot.backstepDepth, 3);
  assert.equal(engine.backstep().ok, true);
  assert.equal(engine.backstep().ok, true);
  assert.equal(registers(engine)[9], 0);
});

test("long ALU histories remain sparse and bounded per instruction", async () => {
  const engine = await createJavaScriptEngine({
    settings: {
      startAtMain: true,
      maxBacksteps: 20000,
      maxBackstepHistoryBytes: 8 * 1024 * 1024
    }
  });
  const source = `
.text
main:
  li    $t0, 3000
loop:
  addiu $t0, $t0, -1
  bgtz  $t0, loop
  nop
`;
  const assembled = engine.assemble(source, { sourceName: "sparse-history.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  const result = engine.go(12000);
  assert.equal(result.ok, true);
  assert.equal(result.done, true);

  assert.ok(engine.executionHistory.length >= 6000);
  assert.ok(engine.getBackstepHistoryUsageBytes() < 2 * 1024 * 1024);
  engine.executionHistory.forEach((journal) => {
    assert.equal(Object.hasOwn(journal, "registerBaseline"), false);
    assert.equal(Object.hasOwn(journal, "registers"), false);
    assert.ok((journal.r?.length ?? 0) <= 2);
  });
});

test("the last 100 instructions remain backsteppable when one journal exceeds the history budget", async () => {
  const input = "x".repeat(72 * 1024);
  const engine = await createJavaScriptEngine({
    settings: {
      startAtMain: true,
      maxBacksteps: 100,
      maxBackstepHistoryBytes: 64 * 1024
    }
  });
  engine.setRuntimeHooks({
    readInput() {
      return input;
    }
  });
  const source = `
.data
buffer: .space 131072
.text
main:
  la   $a0, buffer
  li   $a1, 131072
  li   $v0, 8
  syscall
${Array.from({ length: 99 }, () => "  nop").join("\n")}
`;
  const assembled = engine.assemble(source, { sourceName: "bounded-large-journal.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));

  let syscallResult = null;
  for (let index = 0; index < 20; index += 1) {
    const result = engine.step({ includeSnapshot: false, includeRuntimeEvent: true });
    assert.equal(result.ok, true);
    if (result.executedInstruction === "syscall") {
      syscallResult = result;
      break;
    }
  }

  assert.ok(syscallResult);
  const snapshot = engine.getSnapshot();
  assert.equal(snapshot.backstepDepth, snapshot.steps);
  assert.ok(engine.getBackstepHistoryUsageBytes() > 64 * 1024);
  assert.equal(engine.getBackstepHistoryBudgetBytes(), 64 * 1024);
  const bufferAddress = registers(engine)[4] >>> 0;
  assert.equal(engine.readByte(bufferAddress, false), "x".charCodeAt(0));
  assert.equal(engine.readByte(bufferAddress + input.length - 1, false), "x".charCodeAt(0));
  assert.equal(syscallResult.runtimeEvent.memoryAccesses.length, 1);
  assert.ok(syscallResult.runtimeEvent.memoryAccesses[0].accessCount > 68 * 1024);

  for (let index = 0; index < 99; index += 1) {
    assert.equal(engine.step({ includeSnapshot: false, includeMessage: false }).ok, true);
  }
  const fullWindow = engine.getSnapshot();
  assert.equal(fullWindow.backstepDepth, 100);
  assert.equal(fullWindow.backstepHistoryStartStep, snapshot.steps - 1);
  assert.ok(engine.getBackstepHistoryUsageBytes() > 64 * 1024);

  for (let index = 0; index < 100; index += 1) {
    assert.equal(engine.backstep().ok, true);
  }
  assert.equal(engine.readByte(bufferAddress, false), 0);
  assert.equal(engine.readByte(bufferAddress + input.length - 1, false), 0);
  assert.equal(engine.getSnapshot().backstepDepth, 0);
});

test("backstep journal evicts in constant-time order and reports the shared history window", async () => {
  const engine = await createJavaScriptEngine({
    settings: {
      startAtMain: true,
      maxBacksteps: 3,
      maxBackstepHistoryBytes: 1024 * 1024
    }
  });
  const source = `
.text
main:
  addiu $t0, $zero, 1
  addiu $t0, $t0, 1
  addiu $t0, $t0, 1
  addiu $t0, $t0, 1
  addiu $t0, $t0, 1
  nop
`;
  const assembled = engine.assemble(source, { sourceName: "journal-window.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  for (let index = 0; index < 5; index += 1) {
    assert.equal(engine.step({ includeSnapshot: false }).ok, true);
  }

  const snapshot = engine.getSnapshot();
  assert.equal(snapshot.steps, 5);
  assert.equal(snapshot.backstepDepth, 3);
  assert.equal(snapshot.backstepHistoryStartStep, 2);
  assert.equal(engine.executionHistory.peekOldest().s, 2);

  assert.equal(engine.backstep().ok, true);
  assert.equal(engine.backstep().ok, true);
  assert.equal(engine.backstep().ok, true);
  assert.equal(engine.getSnapshot().steps, 2);
  assert.equal(engine.backstep().ok, false);
});

test("breakpoints stop before the selected instruction and resume cleanly", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  addi $t0, $zero, 1
  addi $t1, $zero, 2
  li   $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "breakpoint.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  const secondInstruction = engine.getSnapshot().textRows[1].address >>> 0;
  assert.equal(engine.toggleBreakpoint(secondInstruction), true);

  const paused = engine.go(20);
  assert.equal(paused.ok, true);
  assert.equal(paused.stoppedOnBreakpoint, true);
  assert.equal(engine.getSnapshot().pc >>> 0, secondInstruction);
  assert.equal(registers(engine)[8], 1);
  assert.equal(registers(engine)[9], 0);

  assert.equal(engine.toggleBreakpoint(secondInstruction), false);
  const resumed = engine.go(20);
  assert.equal(resumed.ok, true);
  assert.equal(resumed.done, true);
  assert.equal(registers(engine)[9], 2);
});

test("delayed branching executes exactly one delay-slot instruction", async () => {
  const source = `
.text
main:
  addi $t0, $zero, 1
  beq  $t0, $t0, target
  addi $t1, $zero, 7
  addi $t1, $zero, 99
target:
  addi $t2, $zero, 3
  li   $v0, 10
  syscall
`;
  const normal = await createJavaScriptEngine({ settings: { startAtMain: true, delayedBranching: false } });
  const delayed = await createJavaScriptEngine({ settings: { startAtMain: true, delayedBranching: true } });
  assert.equal(normal.assemble(source, { sourceName: "branch-normal.s" }).ok, true);
  assert.equal(delayed.assemble(source, { sourceName: "branch-delayed.s" }).ok, true);
  assert.equal(normal.go(50).done, true);
  assert.equal(delayed.go(50).done, true);
  assert.equal(registers(normal)[9], 0);
  assert.equal(registers(delayed)[9], 7);
  assert.equal(registers(delayed)[10], 3);
});

test("memory alignment, text protection, and configured capacity are enforced", async () => {
  const engine = await createJavaScriptEngine({ settings: { maxMemoryBytes: 4, selfModifyingCode: false } });
  assert.throws(() => engine.writeWord(0x10010001, 1), /aligned|alignment/i);
  assert.throws(() => engine.writeWord(0x00400000, 1), /self-modifying/i);

  engine.writeWord(0x10010000, 0x01020304);
  assert.equal(engine.readWord(0x10010000) >>> 0, 0x01020304);
  assert.throws(() => engine.writeByte(0x10010004, 1), /memory limit exceeded/i);
});

test("reserved heap and sparse memory share one global capacity limit", async () => {
  const engine = await createJavaScriptEngine({
    settings: { maxMemoryBytes: 8, selfModifyingCode: false }
  });
  const state = engine.exportRuntimeState({ includeProgram: false });
  const heapBase = state.memoryMap.heapBase >>> 0;
  const dataBase = state.memoryMap.dataBase >>> 0;

  assert.equal(engine.reserveHeapBytes(8, 1), heapBase);
  assert.equal(engine.getAccountedMemoryUsageBytes(), 8);
  engine.writeDoubleWords(heapBase, 0x04030201, 0x08070605);
  assert.equal(engine.getAccountedMemoryUsageBytes(), 8);
  assert.throws(() => engine.writeByte(dataBase, 1), /memory limit exceeded/i);
  assert.equal(engine.readByte(dataBase, false), 0);
  assert.equal(engine.getAccountedMemoryUsageBytes(), 8);

  const restoredEngine = await createJavaScriptEngine({
    settings: { maxMemoryBytes: 8, selfModifyingCode: false }
  });
  restoredEngine.importRuntimeState(engine.exportRuntimeState());
  assert.equal(restoredEngine.getAccountedMemoryUsageBytes(), 8);
  assert.throws(() => restoredEngine.writeByte(dataBase, 1), /memory limit exceeded/i);

  const overlappingEngine = await createJavaScriptEngine({
    settings: { maxMemoryBytes: 1, selfModifyingCode: false }
  });
  const overlappingHeapBase = overlappingEngine
    .exportRuntimeState({ includeProgram: false })
    .memoryMap.heapBase >>> 0;
  overlappingEngine.writeByte(overlappingHeapBase, 0xaa);
  assert.equal(overlappingEngine.reserveHeapBytes(1, 1), overlappingHeapBase);
  assert.equal(overlappingEngine.getAccountedMemoryUsageBytes(), 1);
});

test("backstep restores heap memory accounting after undoing a store", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxBacksteps: 20, selfModifyingCode: false }
  });
  const source = `
.text
main:
  li   $v0, 9
  li   $a0, 4
  syscall
  move $t0, $v0
  li   $t1, 0x01020304
  sw   $t1, 0($t0)
  li   $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "heap-backstep-accounting.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  const initialState = engine.exportRuntimeState({ includeProgram: false });
  const heapBase = initialState.memoryMap.heapBase >>> 0;
  const dataBase = initialState.memoryMap.dataBase >>> 0;
  const initialUsage = engine.getAccountedMemoryUsageBytes();
  engine.setSettings({ maxMemoryBytes: initialUsage + 4 });

  for (let index = 0; index < 20 && engine.readWord(heapBase) === 0; index += 1) {
    assert.equal(engine.step({ includeSnapshot: false }).ok, true);
  }
  assert.equal(engine.readWord(heapBase) >>> 0, 0x01020304);
  assert.equal(engine.getAccountedMemoryUsageBytes(), initialUsage + 4);

  const undone = engine.backstep();
  assert.equal(undone.ok, true);
  assert.equal(engine.readWord(heapBase) >>> 0, 0);
  assert.equal(engine.getAccountedMemoryUsageBytes(), initialUsage + 4);
  assert.throws(() => engine.writeByte(dataBase, 1), /memory limit exceeded/i);
});

test("failed multi-byte stores are atomic at the memory limit", async () => {
  const engine = await createJavaScriptEngine({ settings: { maxMemoryBytes: 3, selfModifyingCode: false } });
  let observedWrites = 0;
  engine.registerMemoryObserver({
    start: 0x10010000,
    end: 0x10010003,
    onWrite() {
      observedWrites += 1;
    }
  });

  assert.throws(() => engine.writeWord(0x10010000, 0x01020304), /memory limit exceeded/i);
  assert.equal(engine.readWord(0x10010000) >>> 0, 0);
  assert.equal(engine.exportRuntimeState({ includeProgram: false }).memoryUsageBytes, 0);
  assert.equal(engine.getSnapshot().lastMemoryWriteAddress, null);
  assert.equal(observedWrites, 0);

  engine.writeWord(0x10010000, 0x00030201);
  assert.equal(engine.exportRuntimeState({ includeProgram: false }).memoryUsageBytes, 3);
  engine.writeWord(0x10010000, 0x03020100);
  assert.equal(engine.readWord(0x10010000) >>> 0, 0x03020100);
  assert.equal(engine.exportRuntimeState({ includeProgram: false }).memoryUsageBytes, 3);
  engine.writeWord(0x10010000, 0x00030201);
  assert.equal(engine.readWord(0x10010000) >>> 0, 0x00030201);
  assert.equal(engine.exportRuntimeState({ includeProgram: false }).memoryUsageBytes, 3);

  const halfEngine = await createJavaScriptEngine({
    settings: { maxMemoryBytes: 1, selfModifyingCode: false }
  });
  assert.throws(() => halfEngine.writeHalf(0x10010000, 0x0102), /memory limit exceeded/i);
  assert.equal(halfEngine.readHalf(0x10010000), 0);
  assert.equal(halfEngine.exportRuntimeState({ includeProgram: false }).memoryUsageBytes, 0);

  const doubleEngine = await createJavaScriptEngine({
    settings: { maxMemoryBytes: 7, selfModifyingCode: false }
  });
  assert.throws(
    () => doubleEngine.writeDoubleWords(0x10010000, 0x04030201, 0x08070605),
    /memory limit exceeded/i
  );
  assert.equal(doubleEngine.readWord(0x10010000) >>> 0, 0);
  assert.equal(doubleEngine.readWord(0x10010004) >>> 0, 0);
  assert.equal(doubleEngine.exportRuntimeState({ includeProgram: false }).memoryUsageBytes, 0);
});

test("unaligned SWL and SWR stores are atomic when capacity is exhausted", async () => {
  for (const opcode of ["swl", "swr"]) {
    for (let offset = 0; offset < 4; offset += 1) {
      const storeWidth = opcode === "swl" ? offset + 1 : 4 - offset;
      const engine = await createJavaScriptEngine({
        settings: { startAtMain: true, selfModifyingCode: false }
      });
      const source = `
.text
main:
  li $t0, 0x10010000
  li $t1, 0x01020304
  ${opcode} $t1, ${offset}($t0)
  li $v0, 10
  syscall
`;
      const assembled = engine.assemble(source, { sourceName: `${opcode}-atomic.s` });
      assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
      const initialMemoryUsage = engine.exportRuntimeState({ includeProgram: false }).memoryUsageBytes;
      engine.setSettings({
        maxMemoryBytes: engine.getAccountedMemoryUsageBytes() + storeWidth - 1
      });

      const result = engine.go(30);
      assert.equal(result.ok, true);
      assert.equal(result.done, true);
      assert.equal(result.exception, true);
      assert.match(result.message, /memory limit exceeded/i);
      assert.equal(engine.readWord(0x10010000) >>> 0, 0);
      assert.equal(
        engine.exportRuntimeState({ includeProgram: false }).memoryUsageBytes,
        initialMemoryUsage
      );
    }
  }
});

test("unaligned stores preserve byte layout and notify observers after the full store", async () => {
  const baseAddress = 0x10010000;
  const cases = [
    ["swl", 0, 0x00000001, [[baseAddress, 1]]],
    ["swl", 1, 0x00000102, [[baseAddress + 1, 1], [baseAddress, 2]]],
    ["swl", 2, 0x00010203, [[baseAddress + 2, 1], [baseAddress + 1, 2], [baseAddress, 3]]],
    ["swl", 3, 0x01020304, [[baseAddress + 3, 1], [baseAddress + 2, 2], [baseAddress + 1, 3], [baseAddress, 4]]],
    ["swr", 0, 0x01020304, [[baseAddress, 4], [baseAddress + 1, 3], [baseAddress + 2, 2], [baseAddress + 3, 1]]],
    ["swr", 1, 0x02030400, [[baseAddress + 1, 4], [baseAddress + 2, 3], [baseAddress + 3, 2]]],
    ["swr", 2, 0x03040000, [[baseAddress + 2, 4], [baseAddress + 3, 3]]],
    ["swr", 3, 0x04000000, [[baseAddress + 3, 4]]]
  ];

  for (const [opcode, offset, expectedWord, expectedWrites] of cases) {
    const engine = await createJavaScriptEngine({
      settings: { startAtMain: true, selfModifyingCode: false }
    });
    const source = `
.text
main:
  li $t0, 0x10010000
  li $t1, 0x01020304
  ${opcode} $t1, ${offset}($t0)
  li $v0, 10
  syscall
`;
    const assembled = engine.assemble(source, { sourceName: `${opcode}-${offset}-layout.s` });
    assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));

    const observedWrites = [];
    engine.registerMemoryObserver({
      start: baseAddress,
      end: baseAddress + 3,
      onWrite(event) {
        observedWrites.push([
          event.address >>> 0,
          event.value & 0xff,
          engine.readWord(baseAddress) >>> 0
        ]);
      }
    });

    const result = engine.go(30);
    assert.equal(result.done, true);
    assert.equal(result.exception, false);
    assert.equal(engine.readWord(baseAddress) >>> 0, expectedWord);
    assert.deepEqual(
      observedWrites,
      expectedWrites.map(([address, value]) => [address, value, expectedWord])
    );
  }
});

test("synchronous instruction observers participate in the same atomic backstep journal", async () => {
  const engine = await createJavaScriptEngine({ settings: { maxBacksteps: 16 } });
  const source = `
.text
.globl main
main:
  lui $t0, 0x1001
  ori $t1, $zero, 1
  sw $t1, 0($t0)
  nop
`;
  const assembled = engine.assemble(source);
  assert.equal(assembled.ok, true);

  const base = 0x10010000;
  const detach = engine.registerInstructionObserver((detail) => {
    if (String(detail.executedInstruction).trim().startsWith("sw ")) {
      engine.writeByte(base + 4, 0x7f);
    }
  });

  let storeResult = null;
  while (!engine.halted) {
    const result = engine.step({ includeSnapshot: false });
    if (String(result.executedInstruction).trim().startsWith("sw ")) {
      storeResult = result;
      break;
    }
  }

  assert.ok(storeResult);
  assert.equal(engine.readWord(base) >>> 0, 1);
  assert.equal(engine.readByte(base + 4, false), 0x7f);
  assert.equal(engine.backstep().ok, true);
  assert.equal(engine.readWord(base) >>> 0, 0);
  assert.equal(engine.readByte(base + 4, false), 0);
  detach();
});

test("LDC1 and SDC1 preserve little-endian double word order", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.data
.align 3
input:  .double 1.0
result: .space 8
.text
main:
  la    $t0, input
  ldc1  $f0, 0($t0)
  add.d $f2, $f0, $f0
  la    $t1, result
  sdc1  $f2, 0($t1)
  li    $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "cop1-double-word-order.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  const labels = new Map(
    engine.exportRuntimeState().labels.map((entry) => [entry.label, entry.address >>> 0])
  );
  const resultAddress = labels.get("result");
  assert.equal(Number.isFinite(resultAddress), true);

  const result = engine.go(30);
  assert.equal(result.ok, true);
  assert.equal(result.done, true);
  assert.equal(result.exception, false);
  assert.equal(engine.readWord(resultAddress) >>> 0, 0x00000000);
  assert.equal(engine.readWord((resultAddress + 4) >>> 0) >>> 0, 0x40000000);
});

test("SDC1 stores the even FPR as the low word", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.data
.align 3
result: .space 8
.text
main:
  la    $t0, result
  li    $t1, 0x55667788
  mtc1  $t1, $f0
  li    $t1, 0x11223344
  mtc1  $t1, $f1
  sdc1  $f0, 0($t0)
  li    $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "cop1-sdc1-word-order.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  const labels = new Map(
    engine.exportRuntimeState().labels.map((entry) => [entry.label, entry.address >>> 0])
  );
  const resultAddress = labels.get("result");
  assert.equal(Number.isFinite(resultAddress), true);

  const result = engine.go(30);
  assert.equal(result.ok, true);
  assert.equal(result.done, true);
  assert.equal(result.exception, false);
  assert.equal(engine.readWord(resultAddress) >>> 0, 0x55667788);
  assert.equal(engine.readWord((resultAddress + 4) >>> 0) >>> 0, 0x11223344);
});

test("sbrk cannot bypass the configured memory limit through signed overflow", async () => {
  const engine = await createJavaScriptEngine({
    settings: {
      startAtMain: true,
      maxMemoryBytes: 1024
    }
  });
  const source = `
.text
main:
  li $v0, 9
  li $a0, 1
  syscall
  move $s0, $v0
  li $v0, 9
  li $a0, 0x7fffffff
  syscall
  li $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "sbrk-limit-overflow.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  const initialState = engine.exportRuntimeState({ includeProgram: false });
  const heapBase = initialState.memoryMap.heapBase >>> 0;

  const result = engine.go(30);
  const finalState = engine.exportRuntimeState({ includeProgram: false });
  assert.equal(result.ok, true);
  assert.equal(result.done, true);
  assert.equal(result.exception, true);
  assert.match(result.message, /memory limit exceeded|heap address space exceeded/i);
  assert.equal(registers(engine)[16] >>> 0, heapBase);
  assert.equal(finalState.heapPointer >>> 0, (heapBase + 1) >>> 0);
  assert.ok(finalState.memoryUsageBytes <= finalState.maxMemoryBytes);
  assert.ok(engine.getAccountedMemoryUsageBytes() <= engine.getMaxMemoryBytes());
});

test("go respects its execution budget without falsely halting the program", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  addi $t0, $t0, 1
  j main
`;
  const assembled = engine.assemble(source, { sourceName: "execution-budget.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  const result = engine.go(5);
  assert.equal(result.ok, true);
  assert.equal(result.done, false);
  assert.equal(result.stepLimitReached, true);
  assert.equal(result.waitingForInput, false);
  assert.equal(result.exception, false);
  assert.equal(result.haltReason, null);
  assert.equal(result.stepsExecuted, 5);
  assert.equal(engine.getSnapshot().steps, 5);
  assert.equal(registers(engine)[8], 3);
});

test("go reports waiting, exception, and halt reasons without ambiguity", async () => {
  const waitingEngine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  waitingEngine.setRuntimeHooks({
    readInput: () => ({ wait: true, message: "Waiting in regression test." })
  });
  const waitingSource = `
.text
main:
  li $v0, 5
  syscall
  li $v0, 10
  syscall
`;
  assert.equal(waitingEngine.assemble(waitingSource, { sourceName: "waiting.s" }).ok, true);
  const waiting = waitingEngine.go(20);
  assert.equal(waiting.ok, true);
  assert.equal(waiting.done, false);
  assert.equal(waiting.waitingForInput, true);
  assert.equal(waiting.exception, false);
  assert.equal(waiting.haltReason, null);
  assert.equal(waiting.stepLimitReached, false);
  assert.equal(waiting.stepsExecuted, 1);

  const exceptionEngine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const exceptionSource = `
.text
main:
  lw $t0, 1($zero)
  li $v0, 10
  syscall
`;
  assert.equal(exceptionEngine.assemble(exceptionSource, { sourceName: "exception.s" }).ok, true);
  const exception = exceptionEngine.go(20);
  assert.equal(exception.ok, true);
  assert.equal(exception.done, true);
  assert.equal(exception.exception, true);
  assert.equal(exception.waitingForInput, false);
  assert.equal(exception.haltReason, null);
  assert.equal(exception.stepLimitReached, false);
  assert.equal(exception.stepsExecuted, 1);

  const exitEngine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const exitSource = `
.text
main:
  li $v0, 10
  syscall
`;
  assert.equal(exitEngine.assemble(exitSource, { sourceName: "exit.s" }).ok, true);
  const exited = exitEngine.go(20);
  assert.equal(exited.ok, true);
  assert.equal(exited.done, true);
  assert.equal(exited.exception, false);
  assert.equal(exited.haltReason, "exit");
  assert.equal(exited.stepLimitReached, false);
  assert.equal(exited.stepsExecuted, 2);
});

test("runtime state can be exported, changed, and restored", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  addi $t0, $zero, 5
  addi $t0, $t0, 6
  li   $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "state-roundtrip.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  assert.equal(engine.step({ includeSnapshot: false }).ok, true);
  const saved = engine.exportRuntimeState();
  const savedPc = engine.getSnapshot().pc >>> 0;
  assert.equal(registers(engine)[8], 5);

  assert.equal(engine.go(20).done, true);
  assert.equal(registers(engine)[8], 11);
  engine.importRuntimeState(saved);
  assert.equal(engine.getSnapshot().pc >>> 0, savedPc);
  assert.equal(engine.getSnapshot().halted, false);
  assert.equal(registers(engine)[8], 5);
  assert.equal(engine.go(20).done, true);
  assert.equal(registers(engine)[8], 11);
});

test("runtime state JSON roundtrip preserves services, files, arguments, images, and breakpoints", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  nop
`;
  assert.equal(engine.assemble(source, { sourceName: "complete-runtime-state.s" }).ok, true);
  const mainAddress = engine.getSnapshot().pc >>> 0;
  assert.equal(engine.toggleBreakpoint(mainAddress), true);

  engine.randomStreams.set(7, 0x12345678);
  engine.openFiles.set(3, {
    fd: 3,
    name: "cursor.txt",
    flag: 0,
    cursor: 2,
    stdio: false,
    data: Uint8Array.from([97, 98, 99, 100, 101, 102])
  });
  engine.virtualFileSystem.set("cursor.txt", Uint8Array.from([97, 98, 99, 100, 101, 102]));
  engine.stdinClosed = true;
  engine.argsRegistry = [{ kind: "int", name: "count", address: 0x10010000 }];
  engine.lastProgramArguments = ["-count", "12", "tail"];
  const firstImageHandle = engine.createImageHandle(2, 3, 0x10011000, "image.json");

  const saved = JSON.parse(JSON.stringify(engine.exportRuntimeState()));
  assert.deepEqual(saved.breakpoints, [mainAddress]);
  assert.equal(saved.openFiles.find(([fd]) => fd === 3)[1].cursor, 2);
  assert.deepEqual(saved.openFiles.find(([fd]) => fd === 3)[1].data, [97, 98, 99, 100, 101, 102]);

  engine.randomStreams.set(7, 0);
  engine.openFiles.get(3).cursor = 6;
  engine.virtualFileSystem.set("cursor.txt", Uint8Array.from([120]));
  engine.stdinClosed = false;
  engine.argsRegistry = [];
  engine.lastProgramArguments = [];
  engine.imageHandles.clear();
  assert.equal(engine.toggleBreakpoint(mainAddress), false);

  engine.importRuntimeState(saved);
  assert.equal(engine.randomStreams.get(7) >>> 0, 0x12345678);
  assert.equal(engine.openFiles.get(3).cursor, 2);
  assert.deepEqual(Array.from(engine.openFiles.get(3).data), [97, 98, 99, 100, 101, 102]);
  assert.deepEqual(Array.from(engine.getVirtualFileBytes("cursor.txt")), [97, 98, 99, 100, 101, 102]);
  assert.equal(engine.stdinClosed, true);
  assert.equal(engine.argsRegistry[0].name, "count");
  assert.deepEqual(Array.from(engine.lastProgramArguments), ["-count", "12", "tail"]);
  assert.equal(engine.getImageHandle(firstImageHandle).width, 2);
  assert.equal(engine.getImageHandle(firstImageHandle).height, 3);
  assert.notEqual(engine.createImageHandle(1, 1, 0x10012000), firstImageHandle);
  assert.equal(
    engine.getSnapshot().textRows.find((row) => (row.address >>> 0) === mainAddress)?.breakpoint,
    true
  );

  const withoutBreakpoints = engine.exportRuntimeState({ includeBreakpoints: false });
  assert.equal(Object.hasOwn(withoutBreakpoints, "breakpoints"), false);
  engine.importRuntimeState(withoutBreakpoints);
  assert.equal(engine.getSnapshot().textRows[0].breakpoint, true);
  engine.importRuntimeState({ ...withoutBreakpoints, breakpoints: [] });
  assert.equal(engine.getSnapshot().textRows[0].breakpoint, false);

  engine.randomStreams.set(1, 1);
  engine.openFiles.set(3, {
    fd: 3,
    name: "legacy.txt",
    flag: 0,
    cursor: 1,
    stdio: false,
    data: Uint8Array.from([1])
  });
  engine.stdinClosed = true;
  engine.argsRegistry = [{ kind: "flag", name: "legacy", address: 1 }];
  engine.imageHandles.set(firstImageHandle, {
    id: firstImageHandle,
    width: 1,
    height: 1,
    dataAddress: 0,
    path: ""
  });
  const legacySnapshot = { ...withoutBreakpoints };
  delete legacySnapshot.randomStreams;
  delete legacySnapshot.openFiles;
  delete legacySnapshot.stdinClosed;
  delete legacySnapshot.argsRegistry;
  delete legacySnapshot.lastProgramArguments;
  delete legacySnapshot.imageHandles;
  delete legacySnapshot.nextImageHandleId;
  engine.importRuntimeState(legacySnapshot);
  assert.equal(engine.randomStreams.size, 0);
  assert.deepEqual(Array.from(engine.openFiles.keys()), [0, 1, 2]);
  assert.equal(engine.stdinClosed, false);
  assert.equal(engine.argsRegistry.length, 0);
  assert.equal(engine.lastProgramArguments.length, 0);
  assert.equal(engine.imageHandles.size, 0);
  assert.equal(engine.nextImageHandleId, 1);
});

test("random streams resume from the exact exported state", async () => {
  const engine = await createJavaScriptEngine();
  engine.registers[4] = 7;
  engine.registers[5] = 12345;
  engine.registers[2] = 40;
  assert.equal(engine.executeSyscall().exception, undefined);

  engine.registers[2] = 41;
  assert.equal(engine.executeSyscall().exception, undefined);
  const saved = JSON.parse(JSON.stringify(engine.exportRuntimeState()));

  engine.registers[2] = 41;
  assert.equal(engine.executeSyscall().exception, undefined);
  const expectedNextValue = engine.registers[4] | 0;

  engine.importRuntimeState(saved);
  engine.registers[2] = 41;
  assert.equal(engine.executeSyscall().exception, undefined);
  assert.equal(engine.registers[4] | 0, expectedNextValue);
});

test("float and double input syscalls require the whole value to be valid", async () => {
  for (const service of [6, 7]) {
    const invalid = await createJavaScriptEngine({ settings: { startAtMain: true } });
    invalid.setRuntimeHooks({ readInput: () => "1.25garbage" });
    const invalidSource = `
.text
main:
  li $v0, ${service}
  syscall
`;
    assert.equal(invalid.assemble(invalidSource, { sourceName: `invalid-float-${service}.s` }).ok, true);
    const invalidResult = invalid.go(10);
    const invalidState = invalid.exportRuntimeState({ includeProgram: false });
    assert.equal(invalidResult.done, true);
    assert.equal(invalidResult.exception, true);
    assert.equal(((invalidState.cop0[13] >>> 2) & 0x1f), 8);
    assert.match(invalidResult.message, service === 6 ? /invalid float input/i : /invalid double input/i);

    const valid = await createJavaScriptEngine({ settings: { startAtMain: true } });
    valid.setRuntimeHooks({ readInput: () => " -1.25e+2 " });
    assert.equal(valid.assemble(invalidSource, { sourceName: `valid-float-${service}.s` }).ok, true);
    const validResult = valid.go(10);
    assert.equal(validResult.exception, false);
    assert.equal(validResult.haltReason, "cliff");
    assert.equal(service === 6 ? valid.getFloat32(0) : valid.getFloat64(0), -125);
  }

  for (const service of [52, 53]) {
    const dialog = await createJavaScriptEngine({ settings: { startAtMain: true } });
    dialog.setRuntimeHooks({ readInput: () => "1.25garbage" });
    const source = `
.text
main:
  li $v0, ${service}
  syscall
  li $v0, 10
  syscall
`;
    assert.equal(dialog.assemble(source, { sourceName: `invalid-dialog-${service}.s` }).ok, true);
    const result = dialog.go(20);
    assert.equal(result.done, true);
    assert.equal(result.exception, false);
    assert.equal(registers(dialog)[5], -1);
    assert.equal(service === 52 ? dialog.getFloat32(0) : dialog.getFloat64(0), 0);
  }
});

test("falling off the final instruction reports cliff through Step and Go", async () => {
  const source = `
.text
main:
  nop
`;
  const stepEngine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  assert.equal(stepEngine.assemble(source, { sourceName: "cliff-step.s" }).ok, true);
  const initialPc = stepEngine.getSnapshot().pc >>> 0;
  const stepped = stepEngine.step({ includeSnapshot: false });
  assert.equal(stepped.done, true);
  assert.equal(stepped.exception, false);
  assert.equal(stepped.haltReason, "cliff");
  assert.match(stepped.message, /program completed/i);
  assert.equal(stepEngine.getSnapshot().pc >>> 0, (initialPc + 4) >>> 0);
  assert.equal(stepEngine.getSnapshot().steps, 1);

  const goEngine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  assert.equal(goEngine.assemble(source, { sourceName: "cliff-go.s" }).ok, true);
  const result = goEngine.go(10);
  assert.equal(result.done, true);
  assert.equal(result.haltReason, "cliff");
  assert.equal(result.stepLimitReached, false);
  assert.equal(result.stepsExecuted, 1);
  assert.match(result.message, /program completed/i);
});

test("persistent VFS writes report storage failure and roll back file and image state", async () => {
  const values = new Map();
  const storageState = { failWrites: false };
  const localStorage = {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      if (storageState.failWrites) throw new Error("quota exceeded");
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    }
  };
  const engine = await createJavaScriptEngine({}, { localStorage });

  assert.equal(engine.setVirtualFileBytes("stable.bin", Uint8Array.from([1, 2])), true);
  engine.openFiles.set(3, {
    fd: 3,
    name: "stable.bin",
    flag: 1,
    cursor: 2,
    stdio: false,
    data: Uint8Array.from([1, 2])
  });
  const bufferAddress = 0x10011000;
  engine.writeBytesAtomic(bufferAddress, [3, 4, 5]);

  engine.registers[2] = 15;
  engine.registers[4] = 3;
  engine.registers[5] = bufferAddress;
  engine.registers[6] = 1;
  const successfulWrite = engine.executeSyscall();
  assert.equal(successfulWrite.exception, undefined);
  assert.equal(engine.registers[2], 1);
  assert.deepEqual(Array.from(engine.getVirtualFileBytes("stable.bin")), [1, 2, 3]);
  assert.deepEqual(Array.from(engine.openFiles.get(3).data), [1, 2, 3]);
  assert.equal(engine.openFiles.get(3).cursor, 3);
  const persistedBeforeFailure = values.get("webmars-vfs-v1");

  storageState.failWrites = true;
  engine.registers[2] = 15;
  engine.registers[4] = 3;
  engine.registers[5] = bufferAddress + 1;
  engine.registers[6] = 2;
  const failedWrite = engine.executeSyscall();

  assert.equal(failedWrite.exception, undefined);
  assert.equal(engine.registers[2], -1);
  assert.deepEqual(Array.from(engine.getVirtualFileBytes("stable.bin")), [1, 2, 3]);
  assert.deepEqual(Array.from(engine.openFiles.get(3).data), [1, 2, 3]);
  assert.equal(engine.openFiles.get(3).cursor, 3);
  assert.equal(values.get("webmars-vfs-v1"), persistedBeforeFailure);
  assert.equal(engine.setVirtualFileBytes("lost.bin", [9]), false);
  assert.equal(engine.getVirtualFileBytes("lost.bin"), null);

  const newFilePath = engine.allocateCString("cannot-open.bin");
  engine.registers[2] = 13;
  engine.registers[4] = newFilePath;
  engine.registers[5] = 1;
  const failedOpen = engine.executeSyscall();
  assert.equal(failedOpen.exception, undefined);
  assert.equal(engine.registers[2], -1);
  assert.equal(engine.getVirtualFileBytes("cannot-open.bin"), null);
  assert.equal(engine.openFiles.size, 4);

  const pixelAddress = engine.allocateWordArray([0xff112233]);
  const imageHandle = engine.createImageHandle(1, 1, pixelAddress);
  const pathAddress = engine.allocateCString("failed-image.json");
  engine.registers[2] = 99;
  engine.registers[4] = imageHandle;
  engine.registers[5] = pathAddress;
  const failedImageSave = engine.executeSyscall();

  assert.equal(failedImageSave.exception, true);
  assert.match(failedImageSave.message, /could not persist/i);
  assert.equal(engine.getVirtualFileBytes("failed-image.json"), null);
  assert.equal(engine.getImageHandle(imageHandle).path, "");
  assert.equal(values.get("webmars-vfs-v1"), persistedBeforeFailure);
});

test("buffer, string, array, and image syscalls reject enormous sizes before work", async () => {
  const huge = 0x7fffffff;

  {
    const engine = await createJavaScriptEngine();
    let inputRequests = 0;
    engine.setRuntimeHooks({
      readInput() {
        inputRequests += 1;
        return "unused";
      }
    });
    engine.registers[2] = 8;
    engine.registers[4] = 0x10011000;
    engine.registers[5] = huge;
    const startedAt = Date.now();
    const result = engine.executeSyscall();
    assert.equal(result.exception, true);
    assert.match(result.message, /limit/i);
    assert.equal(inputRequests, 0);
    assert.ok(Date.now() - startedAt < 1000);
  }

  {
    const engine = await createJavaScriptEngine();
    engine.openFiles.set(3, {
      fd: 3,
      name: "bounded.bin",
      flag: 1,
      cursor: 0,
      stdio: false,
      data: new Uint8Array(0)
    });
    engine.registers[2] = 15;
    engine.registers[4] = 3;
    engine.registers[5] = 0x10011000;
    engine.registers[6] = huge;
    const result = engine.executeSyscall();
    assert.equal(result.exception, true);
    assert.match(result.message, /limit/i);
    assert.equal(engine.openFiles.get(3).cursor, 0);
    assert.equal(engine.openFiles.get(3).data.length, 0);
  }

  {
    const engine = await createJavaScriptEngine();
    engine.registers[2] = 82;
    engine.registers[4] = 0x10011000;
    engine.registers[5] = huge;
    const result = engine.executeSyscall();
    assert.equal(result.exception, true);
    assert.match(result.message, /limit/i);
  }

  {
    const engine = await createJavaScriptEngine();
    const arrayAddress = 0x10011004;
    engine.writeWord(arrayAddress - 4, huge);
    const heapBefore = engine.heapPointer;
    engine.registers[2] = 84;
    engine.registers[4] = arrayAddress;
    const result = engine.executeSyscall();
    assert.equal(result.exception, true);
    assert.match(result.message, /limit/i);
    assert.equal(engine.heapPointer, heapBefore);
  }

  {
    const engine = await createJavaScriptEngine();
    const heapBefore = engine.heapPointer;
    engine.registers[2] = 95;
    engine.registers[4] = huge;
    engine.registers[5] = 2;
    const result = engine.executeSyscall();
    assert.equal(result.exception, true);
    assert.match(result.message, /limit|dimensions/i);
    assert.equal(engine.heapPointer, heapBefore);
    assert.equal(engine.imageHandles.size, 0);
  }
});

test("step counts remain non-negative and exact beyond the signed 32-bit boundary", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxBacksteps: 10 }
  });
  assert.equal(engine.assemble(`
.text
main:
  nop
  nop
`, { sourceName: "large-step-counter.s" }).ok, true);

  engine.steps = 0x80000000;
  const stepped = engine.step({ includeSnapshot: false });
  assert.equal(stepped.ok, true);
  assert.equal(engine.getSnapshot().steps, 0x80000001);
  assert.equal(engine.exportRuntimeState({ includeProgram: false }).steps, 0x80000001);

  const backed = engine.backstep();
  assert.equal(backed.ok, true);
  assert.equal(engine.getSnapshot().steps, 0x80000000);
  assert.equal(backed.runtimeEvent.stepBefore, 0x80000001);
  assert.equal(backed.runtimeEvent.stepAfter, 0x80000000);
});

test("oversized data reservations cannot wrap or overlap the address space", async () => {
  for (const source of [
    `.data
before: .word 1
gap: .space 4294967296
after: .word 2
`,
    `.data
.extern giant, 4294967296
.extern next, 4
`
  ]) {
    const engine = await createJavaScriptEngine({
      settings: { strictMarsCompatibility: false }
    });
    const assembled = engine.assemble(source, { sourceName: "oversized-data.s" });
    assert.equal(assembled.ok, false);
    assert.ok(assembled.errors.length > 0);
  }

  const strict = await createJavaScriptEngine({
    settings: { strictMarsCompatibility: true }
  });
  const strictResult = strict.assemble(`
.data
.space 2147483648
`, { sourceName: "strict-oversized-space.s" });
  assert.equal(strictResult.ok, false);
});

test("floating-point directives reject trailing non-numeric text", async () => {
  for (const directive of [".float", ".double"]) {
    const engine = await createJavaScriptEngine();
    const result = engine.assemble(`
.data
value: ${directive} 1.25garbage
`, { sourceName: `invalid-${directive.slice(1)}.s` });
    assert.equal(result.ok, false);
    assert.match(result.errors[0]?.message || "", /invalid/i);
  }
});

test("break codes must fit the encoded 20-bit field", async () => {
  for (const code of [-1, 0x100000, 0x100000000]) {
    const engine = await createJavaScriptEngine();
    const result = engine.assemble(`
.text
main:
  break ${code}
`, { sourceName: "invalid-break-code.s" });
    assert.equal(result.ok, false);
    assert.match(result.errors[0]?.message || "", /range/i);
  }

  const valid = await createJavaScriptEngine();
  assert.equal(valid.assemble(`
.text
main:
  break 1048575
`, { sourceName: "valid-break-code.s" }).ok, true);
});

test("random syscalls reproduce java.util.Random sequences used by MARS", async () => {
  const engine = await createJavaScriptEngine();
  const seed = () => {
    engine.registers[2] = 40;
    engine.registers[4] = 7;
    engine.registers[5] = 1;
    assert.equal(engine.executeSyscall().exception, undefined);
  };

  seed();
  engine.registers[2] = 41;
  engine.executeSyscall();
  assert.equal(engine.registers[4] | 0, -1155869325);

  seed();
  engine.registers[2] = 42;
  engine.registers[5] = 100;
  engine.executeSyscall();
  assert.equal(engine.registers[4] | 0, 85);

  seed();
  engine.registers[2] = 43;
  engine.executeSyscall();
  assert.equal(engine.getFloat32(0), 0.7308781743049622);

  seed();
  engine.registers[2] = 44;
  engine.executeSyscall();
  assert.equal(engine.getFloat64(0), 0.7308781907032909);
});

test("InputDialogString leaves a zero-length buffer untouched", async () => {
  const engine = await createJavaScriptEngine();
  engine.setRuntimeHooks({ readInput: () => "abc" });
  const messageAddress = engine.allocateCString("Value");
  const bufferAddress = engine.allocateCString("z");

  engine.registers[2] = 54;
  engine.registers[4] = messageAddress;
  engine.registers[5] = bufferAddress;
  engine.registers[6] = 0;
  const result = engine.executeSyscall();

  assert.equal(result.exception, undefined);
  assert.equal(engine.getByte(bufferAddress), "z".charCodeAt(0));
  assert.equal(engine.registers[5] | 0, -4);
});

test("backstep restores image metadata changed by image_save", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxBacksteps: 10 }
  });
  assert.equal(engine.assemble(`
.text
main:
  syscall
  nop
`, { sourceName: "image-save-backstep.s" }).ok, true);

  const pixels = engine.allocateWordArray([0xff112233]);
  const handle = engine.createImageHandle(1, 1, pixels, "old-image.json");
  const pathAddress = engine.allocateCString("new-image.json");
  engine.registers[2] = 99;
  engine.registers[4] = handle;
  engine.registers[5] = pathAddress;

  assert.equal(engine.step({ includeSnapshot: false }).exception, false);
  assert.equal(engine.getImageHandle(handle).path, "new-image.json");
  assert.notEqual(engine.getVirtualFileBytes("new-image.json"), null);

  assert.equal(engine.backstep().ok, true);
  assert.equal(engine.getImageHandle(handle).path, "old-image.json");
  assert.equal(engine.getVirtualFileBytes("new-image.json"), null);
});

async function compileAndRunMiniC(source, sourceName = "runtime-guard.c", maxSteps = 500) {
  const compiler = await loadMiniCCompiler();
  const compiled = compiler.compile(source, {
    sourceName,
    subset: "C0",
    targetAbi: "o32"
  });
  assert.equal(compiled.ok, true, JSON.stringify(compiled.errors || []));
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const assembled = engine.assemble(compiled.asm, { sourceName: `${sourceName}.s` });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));
  return { engine, result: engine.go(maxSteps), asm: compiled.asm };
}

test("Mini-C rejects overflowing allocations before multiplication or zero-fill", async () => {
  for (const length of [1073741823, 1073741825]) {
    const { engine, result } = await compileAndRunMiniC(
      `int main(void) { int* values = alloc_array(int, ${length}); return 0; }`,
      `alloc-overflow-${length}.c`,
      100
    );
    assert.equal(result.done, true);
    assert.equal(result.exception, true);
    assert.match(result.message, /code = 8/);
    assert.equal(engine.exportRuntimeState({ includeProgram: false }).heapPointer >>> 0, 0x10040000);
  }
});

test("Mini-C invalid shifts and safety guards raise runtime exceptions", async () => {
  const cases = [
    ["shift-high.c", "int main(void) { return 1 << 32; }", 11],
    ["shift-negative.c", "int main(void) { return 8 >> -1; }", 11],
    ["assert.c", "int main(void) { assert(false); return 0; }", 1],
    ["null.c", "int main(void) { int* value = NULL; return *value; }", 3],
    ["bounds.c", "int main(void) { int* values = alloc_array(int, 1); return values[1]; }", 5]
  ];
  for (const [sourceName, source, breakCode] of cases) {
    const { result } = await compileAndRunMiniC(source, sourceName, 200);
    assert.equal(result.done, true, sourceName);
    assert.equal(result.exception, true, sourceName);
    assert.match(result.message, new RegExp(`code = ${breakCode}$`), sourceName);
  }
});

test("data repetition factors are bounded before either assembly pass", async () => {
  const engine = await createJavaScriptEngine();
  const result = engine.assemble(`
.data
values: .word 0:1073741824
`, { sourceName: "oversized-repetition.s" });
  assert.equal(result.ok, false);
  assert.match(result.errors[0]?.message || "", /repetition factor/i);
  assert.equal(engine.exportRuntimeState({ includeProgram: false }).memoryUsageBytes, 0);
});

test("not-taken branches still identify exceptions in their delay slot", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, delayedBranching: true }
  });
  assert.equal(engine.assemble(`
.text
main:
  li $t0, 1
branch:
  beq $t0, $zero, target
  lw $t1, 1($zero)
target:
  nop
.ktext 0x80000180
handler:
  li $v0, 10
  syscall
`, { sourceName: "not-taken-delay-exception.s" }).ok, true);
  assert.equal(engine.go(50).done, true);
  const state = engine.exportRuntimeState({ includeProgram: false });
  assert.equal((state.cop0[13] >>> 31) & 1, 1);
  assert.equal(state.cop0[14] >>> 0, 0x00400004);
});

test("file and VFS backstep history stores byte-range deltas", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxBacksteps: 100, maxMemoryBytes: 64 * 1024 * 1024 }
  });
  const initialLength = 64 * 1024;
  assert.equal(engine.setVirtualFileBytes("delta.bin", new Uint8Array(initialLength)), true);
  assert.equal(engine.assemble(`
.data
name: .asciiz "delta.bin"
one: .byte 1
.text
main:
  la $a0, name
  li $a1, 9
  li $v0, 13
  syscall
  move $s0, $v0
  li $t0, 10
loop:
  move $a0, $s0
  la $a1, one
  li $a2, 1
  li $v0, 15
  syscall
  addiu $t0, $t0, -1
  bnez $t0, loop
  nop
  move $a0, $s0
  li $v0, 16
  syscall
  li $v0, 10
  syscall
`, { sourceName: "resource-deltas.s" }).ok, true);
  assert.equal(engine.go(500).done, true);
  const finalState = engine.exportRuntimeState({ includeProgram: false });
  assert.equal(engine.getVirtualFileBytes("delta.bin").length, initialLength + 10);
  assert.ok(finalState.backstepHistoryBytes < 64 * 1024, finalState.backstepHistoryBytes);

  while (engine.exportRuntimeState({ includeProgram: false }).backstepDepth > 0) {
    assert.equal(engine.backstep().ok, true);
  }
  assert.equal(engine.getVirtualFileBytes("delta.bin").length, initialLength);
  assert.equal(
    Array.from(engine.exportRuntimeState({ includeProgram: false }).openFiles, ([fd]) => fd).join(","),
    "0,1,2"
  );
});

test("failed allocating syscalls roll back resources and raise Syscall exceptions", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxMemoryBytes: 256 }
  });
  assert.equal(
    engine.setVirtualFileBytes("f", new TextEncoder().encode(`${"x".repeat(300)}\n`)),
    true
  );
  assert.equal(engine.assemble(`
.data
name: .asciiz "f"
.text
main:
  la $a0, name
  li $a1, 0
  li $v0, 13
  syscall
  move $a0, $v0
  li $v0, 69
  syscall
  li $v0, 10
  syscall
.ktext 0x80000180
handler:
  li $v0, 10
  syscall
`, { sourceName: "atomic-file-readline.s" }).ok, true);
  assert.equal(engine.go(100).done, true);
  const state = engine.exportRuntimeState({ includeProgram: false });
  const file = state.openFiles.find(([fd]) => fd === 3)?.[1];
  assert.equal((state.cop0[13] >>> 2) & 0x1f, 8);
  assert.equal(file?.cursor, 0);
  assert.equal(state.heapPointer >>> 0, 0x10040000);
});

test("self-modifying code executes words written into empty text addresses", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, selfModifyingCode: true }
  });
  assert.equal(engine.assemble(`
.text
.globl main
main:
  la $t0, generated
  li $t1, 0x0000000c
  sw $t1, 0($t0)
  li $v0, 10
  jr $t0
  nop
generated:
`, { sourceName: "self-modifying-empty-text.s" }).ok, true);

  const result = engine.go(30);
  assert.equal(result.done, true);
  assert.equal(result.exception, false);
  assert.equal(result.haltReason, "exit");
  assert.equal(engine.exportRuntimeState({ includeProgram: false }).steps, 7);
});

test("null-terminated strings beyond 16 KiB are complete and bounded scans fail explicitly", async () => {
  const engine = await createJavaScriptEngine({ settings: { maxMemoryBytes: 1024 * 1024 } });
  const address = 0x10010000;
  const textLength = 20000;
  const bytes = new Uint8Array(textLength + 1);
  bytes.fill("a".charCodeAt(0), 0, textLength);
  engine.writeBytesAtomic(address, bytes);

  engine.registers[2] = 4;
  engine.registers[4] = address;
  const result = engine.executeSyscall();
  assert.equal(result.runIo, true);
  assert.equal(result.message.length, textLength);
  assert.equal(result.message, "a".repeat(textLength));
  assert.throws(
    () => engine.readNullTerminatedString(address, 1024),
    /maximum supported length/i
  );
});
