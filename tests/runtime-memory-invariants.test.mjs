import assert from "node:assert/strict";
import test from "node:test";
import { createJavaScriptEngine } from "./helpers/engines.mjs";

const COMPACT_MEMORY_MAPS = [
  {
    id: "CompactDataAtZero",
    textBase: 0x00003000,
    externBase: 0x00001000,
    dataSegmentBase: 0x00000000,
    globalPointer: 0x00001800,
    dataBase: 0x00000000,
    heapBase: 0x00002000,
    stackPointer: 0x00002ffc,
    stackBase: 0x00002ffc,
    kernelBase: 0x00004000,
    kernelTextBase: 0x00004000,
    kernelDataBase: 0x00005000,
    exceptionHandlerAddress: 0x00004180,
    mmioBase: 0x00007f00
  },
  {
    id: "CompactTextAtZero",
    textBase: 0x00000000,
    externBase: 0x00001000,
    dataSegmentBase: 0x00001000,
    globalPointer: 0x00001800,
    dataBase: 0x00002000,
    heapBase: 0x00003000,
    stackPointer: 0x00003ffc,
    stackBase: 0x00003ffc,
    kernelBase: 0x00004000,
    kernelTextBase: 0x00004000,
    kernelDataBase: 0x00005000,
    exceptionHandlerAddress: 0x00004180,
    mmioBase: 0x00007f00
  }
];

function cop0(engine) {
  return engine.exportRuntimeState({ includeProgram: false }).cop0;
}

test("nested exceptions preserve the original EPC and BD context", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  lw $t0, 1($zero)
.ktext 0x80000180
handler:
  lw $t1, 1($zero)
`;
  assert.equal(engine.assemble(source, { sourceName: "nested-exceptions.s" }).ok, true);

  const mainAddress = engine.getSnapshot().pc >>> 0;
  const first = engine.step({ includeSnapshot: false });
  assert.equal(first.exception, true);
  assert.equal(cop0(engine)[14] >>> 0, mainAddress);
  const firstCause = cop0(engine)[13] >>> 0;

  const nested = engine.step({ includeSnapshot: false });
  assert.equal(nested.exception, true);
  assert.equal(cop0(engine)[14] >>> 0, mainAddress);
  assert.equal((cop0(engine)[13] >>> 31) & 1, (firstCause >>> 31) & 1);
});

test("strict memory and text protection follow both compact presets", async () => {
  for (const memoryMap of COMPACT_MEMORY_MAPS) {
    const engine = await createJavaScriptEngine({
      memoryMap,
      settings: {
        strictMarsCompatibility: true,
        selfModifyingCode: false
      }
    });
    assert.throws(
      () => engine.readWord(0x00100000),
      /strict mars memory mode rejected/i,
      memoryMap.id
    );
    assert.throws(
      () => engine.writeWord(memoryMap.textBase, 0x01020304),
      /self-modifying code is disabled/i,
      memoryMap.id
    );
    assert.doesNotThrow(() => engine.writeWord(memoryMap.dataBase, 0x01020304));
    assert.equal(engine.readWord(memoryMap.dataBase) >>> 0, 0x01020304);
  }
});

test("runtime-state import rejects oversized memory before mutating the engine", async () => {
  const source = await createJavaScriptEngine({ settings: { maxMemoryBytes: 32 } });
  source.writeDoubleWords(0x10010000, 0x04030201, 0x08070605);
  const snapshot = source.exportRuntimeState();

  const target = await createJavaScriptEngine({ settings: { maxMemoryBytes: 4 } });
  target.registers[8] = 77;
  target.writeByte(0x10010020, 0xaa);
  const before = JSON.stringify(target.exportRuntimeState());

  assert.throws(
    () => target.importRuntimeState(snapshot),
    /memory limit exceeded/i
  );
  assert.equal(JSON.stringify(target.exportRuntimeState()), before);
});

test("sbrk cannot cross the stack guard and leaves the heap unchanged", async () => {
  const engine = await createJavaScriptEngine();
  const initial = engine.exportRuntimeState({ includeProgram: false });
  engine.registers[2] = 9;
  engine.registers[4] = 0x70000000;

  const result = engine.executeSyscall();
  const after = engine.exportRuntimeState({ includeProgram: false });
  assert.equal(result.exception, true);
  assert.match(result.message, /heap address space exceeded/i);
  assert.equal(after.heapPointer >>> 0, initial.heapPointer >>> 0);
});

test("failed instruction and data assembly roll back all emitted bytes and rows", async () => {
  const instructionEngine = await createJavaScriptEngine({
    settings: { maxMemoryBytes: 1 }
  });
  const instructionResult = instructionEngine.assemble(`
.text
main:
  addiu $t0, $zero, 1
`, { sourceName: "instruction-capacity.s" });
  assert.equal(instructionResult.ok, false);
  assert.match(instructionResult.errors.map((entry) => entry.message).join("\n"), /memory limit exceeded/i);
  assert.equal(instructionEngine.getSnapshot().memoryUsageBytes, 0);
  assert.equal(instructionEngine.getSnapshot().textRows.length, 0);

  const dataEngine = await createJavaScriptEngine({
    settings: { maxMemoryBytes: 3 }
  });
  const dataResult = dataEngine.assemble(`
.data
value: .word 0x01020304
`, { sourceName: "data-capacity.s" });
  assert.equal(dataResult.ok, false);
  assert.match(dataResult.errors.map((entry) => entry.message).join("\n"), /memory limit exceeded/i);
  assert.equal(dataEngine.getSnapshot().memoryUsageBytes, 0);
  assert.equal(dataEngine.readWord(0x10010000) >>> 0, 0);
});

test("syscall memory faults report Address Load or Store with BadVAddr", async () => {
  const loadEngine = await createJavaScriptEngine({
    settings: { startAtMain: true, strictMarsCompatibility: true }
  });
  assert.equal(loadEngine.assemble(`
.text
main:
  syscall
`, { sourceName: "syscall-address-load.s" }).ok, true);
  loadEngine.registers[2] = 4;
  loadEngine.registers[4] = 1;
  const loadResult = loadEngine.step({ includeSnapshot: false });
  assert.equal(loadResult.exception, true);
  assert.equal((cop0(loadEngine)[13] >>> 2) & 0x1f, 4);
  assert.equal(cop0(loadEngine)[8] >>> 0, 1);

  const storeEngine = await createJavaScriptEngine({
    settings: { startAtMain: true, strictMarsCompatibility: true }
  });
  storeEngine.setRuntimeHooks({ readInput: () => "abc" });
  assert.equal(storeEngine.assemble(`
.text
main:
  syscall
`, { sourceName: "syscall-address-store.s" }).ok, true);
  storeEngine.registers[2] = 8;
  storeEngine.registers[4] = 1;
  storeEngine.registers[5] = 4;
  const storeResult = storeEngine.step({ includeSnapshot: false });
  assert.equal(storeResult.exception, true);
  assert.equal((cop0(storeEngine)[13] >>> 2) & 0x1f, 5);
  assert.equal(cop0(storeEngine)[8] >>> 0, 1);
  assert.equal(storeEngine.getSnapshot().memoryUsageBytes, loadEngine.getSnapshot().memoryUsageBytes);
});

test("syscall string writes are atomic when capacity is exhausted", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  engine.setRuntimeHooks({ readInput: () => "abc" });
  assert.equal(engine.assemble(`
.text
main:
  syscall
`, { sourceName: "syscall-capacity-store.s" }).ok, true);
  const dataAddress = engine.exportRuntimeState({ includeProgram: false }).memoryMap.dataBase >>> 0;
  const assembledUsage = engine.getAccountedMemoryUsageBytes();
  engine.setSettings({ maxMemoryBytes: assembledUsage + 2 });
  engine.registers[2] = 8;
  engine.registers[4] = dataAddress;
  engine.registers[5] = 4;

  const result = engine.step({ includeSnapshot: false });
  assert.equal(result.exception, true);
  assert.equal((cop0(engine)[13] >>> 2) & 0x1f, 5);
  assert.equal(cop0(engine)[8] >>> 0, dataAddress);
  assert.equal(engine.readWord(dataAddress) >>> 0, 0);
});
