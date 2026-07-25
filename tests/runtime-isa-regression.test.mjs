import assert from "node:assert/strict";
import test from "node:test";
import { createJavaScriptEngine } from "./helpers/engines.mjs";

function registers(engine) {
  return engine.exportRuntimeState({ includeProgram: false }).registers;
}

function instructionRow(engine, opcode) {
  const normalized = String(opcode).toLowerCase();
  const row = engine.getSnapshot().textRows.find((entry) => {
    return String(entry.basic ?? entry.source ?? "").trim().split(/\s+/u)[0]?.toLowerCase() === normalized;
  });
  assert.ok(row, `instruction ${opcode} was not assembled`);
  return row;
}

function labelAddress(engine, label) {
  const entry = engine.getSnapshot().labels.find((candidate) => candidate.label === label);
  assert.ok(entry, `label ${label} was not assembled`);
  return entry.address >>> 0;
}

function stepToAddress(engine, address, limit = 30) {
  const target = address >>> 0;
  for (let count = 0; count < limit && (engine.getSnapshot().pc >>> 0) !== target; count += 1) {
    const result = engine.step({ includeSnapshot: false });
    assert.equal(result.ok, true);
    assert.equal(result.done, false, `program halted before ${target.toString(16)}`);
    assert.notEqual(result.stoppedOnBreakpoint, true);
  }
  assert.equal(engine.getSnapshot().pc >>> 0, target);
}

function assertAddressException(engine, result, expectedCode, expectedAddress) {
  const state = engine.exportRuntimeState({ includeProgram: false });
  assert.equal(result.ok, true);
  assert.equal(result.done, true);
  assert.equal(result.exception, true);
  assert.equal(((state.cop0[13] >>> 2) & 0x1f), expectedCode);
  assert.equal(state.cop0[8] >>> 0, expectedAddress >>> 0);
}

test("breakpoints allow one Step or Go continuation and re-arm when control returns", async () => {
  const stepEngine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxBacksteps: 20 }
  });
  const stepSource = `
.text
main:
  addiu $t0, $zero, 1
paused:
  addiu $t1, $zero, 2
  li    $v0, 10
  syscall
`;
  assert.equal(stepEngine.assemble(stepSource, { sourceName: "breakpoint-step.s" }).ok, true);
  const pausedAddress = labelAddress(stepEngine, "paused");
  assert.equal(stepEngine.toggleBreakpoint(pausedAddress), true);
  assert.equal(stepEngine.go(20).stoppedOnBreakpoint, true);

  const stepped = stepEngine.step({ includeSnapshot: false });
  assert.equal(stepped.ok, true);
  assert.notEqual(stepped.stoppedOnBreakpoint, true);
  assert.equal(registers(stepEngine)[9], 2);
  assert.equal(
    stepEngine.getSnapshot().textRows.find((row) => (row.address >>> 0) === pausedAddress)?.breakpoint,
    true
  );

  assert.equal(stepEngine.backstep().ok, true);
  const stoppedAgainAfterBackstep = stepEngine.step({ includeSnapshot: false });
  assert.equal(stoppedAgainAfterBackstep.stoppedOnBreakpoint, true);

  const goEngine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  assert.equal(goEngine.assemble(stepSource, { sourceName: "breakpoint-go.s" }).ok, true);
  assert.equal(goEngine.toggleBreakpoint(labelAddress(goEngine, "paused")), true);
  assert.equal(goEngine.go(20).stoppedOnBreakpoint, true);
  assert.equal(goEngine.go(20).done, true);
  assert.equal(registers(goEngine)[9], 2);

  const loopEngine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const loopSource = `
.text
main:
  addiu $t0, $t0, 1
  j     main
  nop
`;
  assert.equal(loopEngine.assemble(loopSource, { sourceName: "breakpoint-loop.s" }).ok, true);
  const loopAddress = labelAddress(loopEngine, "main");
  assert.equal(loopEngine.toggleBreakpoint(loopAddress), true);
  assert.equal(loopEngine.go(20).stoppedOnBreakpoint, true);
  const looped = loopEngine.go(20);
  assert.equal(looped.stoppedOnBreakpoint, true);
  assert.equal(registers(loopEngine)[8], 1);
});

test("link instructions use PC+8 with delayed branching and preserve JALR targets", async () => {
  const cases = [
    {
      opcode: "jal",
      linkRegister: 31,
      source: `
.text
main:
  jal target
  nop
target:
  li $v0, 10
  syscall
`
    },
    {
      opcode: "jalr",
      linkRegister: 8,
      source: `
.text
main:
  la   $t0, target
  jalr $t0, $t0
  nop
target:
  li $v0, 10
  syscall
`
    },
    {
      opcode: "bgezal",
      linkRegister: 31,
      source: `
.text
main:
  li     $t0, 0
  bgezal $t0, target
  nop
target:
  li $v0, 10
  syscall
`
    },
    {
      opcode: "bltzal",
      linkRegister: 31,
      source: `
.text
main:
  li     $t0, -1
  bltzal $t0, target
  nop
target:
  li $v0, 10
  syscall
`
    }
  ];

  for (const entry of cases) {
    const engine = await createJavaScriptEngine({
      settings: { startAtMain: true, delayedBranching: true }
    });
    const assembled = engine.assemble(entry.source, { sourceName: `${entry.opcode}-delayed-link.s` });
    assert.equal(assembled.ok, true, JSON.stringify(assembled.errors ?? []));
    const branch = instructionRow(engine, entry.opcode);
    const target = labelAddress(engine, "target");
    stepToAddress(engine, branch.address);

    const jumped = engine.step({ includeSnapshot: false });
    assert.equal(jumped.ok, true);
    assert.equal(registers(engine)[entry.linkRegister] >>> 0, ((branch.address >>> 0) + 8) >>> 0);
    assert.equal(engine.getSnapshot().pc >>> 0, ((branch.address >>> 0) + 4) >>> 0);

    const delaySlot = engine.step({ includeSnapshot: false });
    assert.equal(delaySlot.ok, true);
    assert.equal(engine.getSnapshot().pc >>> 0, target);
  }

  const nonDelayed = await createJavaScriptEngine({
    settings: { startAtMain: true, delayedBranching: false }
  });
  const source = `
.text
main:
  jal target
target:
  li $v0, 10
  syscall
`;
  assert.equal(nonDelayed.assemble(source, { sourceName: "jal-no-delay.s" }).ok, true);
  const jal = instructionRow(nonDelayed, "jal");
  assert.equal(nonDelayed.step({ includeSnapshot: false }).ok, true);
  assert.equal(registers(nonDelayed)[31] >>> 0, ((jal.address >>> 0) + 4) >>> 0);
});

test("self-modifying code executes the instruction word currently stored in text memory", async () => {
  const engine = await createJavaScriptEngine({
    settings: {
      startAtMain: true,
      selfModifyingCode: true
    }
  });
  const source = `
.text
main:
  addiu $t0, $zero, 1
  li    $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "self-modifying-fetch.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors ?? []));

  const instruction = instructionRow(engine, "addiu");
  assert.equal(engine.readWord(instruction.address) >>> 0, 0x24080001);

  engine.writeWord(instruction.address, 0x2408002a);
  assert.equal(engine.readWord(instruction.address) >>> 0, 0x2408002a);

  const result = engine.step({ includeSnapshot: false });
  assert.equal(result.ok, true);
  assert.equal(result.exception, false);
  assert.equal(registers(engine)[8], 42);
});

test("executable COP1 instructions have real machine encodings in text memory", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  add.s   $f0, $f2, $f4
  mov.d   $f6, $f8
  c.eq.s  $f2, $f4
  cvt.w.d $f6, $f8
`;
  const assembled = engine.assemble(source, { sourceName: "cop1-machine-code.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors ?? []));

  const expectedWords = new Map([
    ["add.s", 0x46041000],
    ["mov.d", 0x46204186],
    ["c.eq.s", 0x46041032],
    ["cvt.w.d", 0x462041a4]
  ]);
  for (const [opcode, expectedWord] of expectedWords) {
    const row = instructionRow(engine, opcode);
    assert.equal(row.machineCodeHex, `0x${expectedWord.toString(16).padStart(8, "0")}`);
    assert.equal(row.code, row.machineCodeHex);
    assert.equal(engine.readWord(row.address) >>> 0, expectedWord);
  }
});

test("JALR preserves an explicit $zero destination in its machine encoding", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  jalr $zero, $t0
`;
  const assembled = engine.assemble(source, { sourceName: "jalr-zero-destination.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors ?? []));

  const jalr = instructionRow(engine, "jalr");
  const machineWord = engine.readWord(jalr.address) >>> 0;
  assert.equal(machineWord, 0x01000009);
  assert.equal((machineWord >>> 11) & 0x1f, 0);
});

test("machine-code execution preserves MTHI and MTLO source registers", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  addiu $t0, $zero, 7
  mthi  $t0
  mtlo  $t0
  mfhi  $t1
  mflo  $t2
`;
  const assembled = engine.assemble(source, { sourceName: "hi-lo-machine-code.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors ?? []));
  assert.equal(engine.go(20).done, true);
  assert.equal(registers(engine)[9], 7);
  assert.equal(registers(engine)[10], 7);
});

test("assembler rejects branches whose target cannot fit the signed 16-bit word offset", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text 0x00400000
main:
  beq $zero, $zero, far
.text 0x80000000
far:
  nop
`;
  const assembled = engine.assemble(source, { sourceName: "branch-offset-out-of-range.s" });
  assert.equal(assembled.ok, false);
  assert.ok((assembled.errors ?? []).length > 0);
  assert.match(JSON.stringify(assembled.errors), /branch|offset|range|16-bit/i);
});

test("assembler rejects immediate operands outside their encoded field domains", async () => {
  const cases = [
    ["addi-signed-high", "addi $t0, $zero, 32768"],
    ["addiu-signed-low", "addiu $t0, $zero, -32769"],
    ["andi-unsigned-high", "andi $t0, $zero, 65536"],
    ["lui-unsigned-high", "lui $t0, 65536"],
    ["shift-amount-high", "sll $t0, $t1, 32"]
  ];

  for (const [name, instruction] of cases) {
    const engine = await createJavaScriptEngine({
      settings: {
        startAtMain: true,
        extendedAssembler: false
      }
    });
    const assembled = engine.assemble(
      `.text\nmain:\n  ${instruction}\n`,
      { sourceName: `${name}.s` }
    );
    assert.equal(assembled.ok, false, `${instruction} must not be silently truncated`);
    assert.ok((assembled.errors ?? []).length > 0, `${instruction} must report an assembly error`);
  }
});

test("BGEZAL and BLTZAL write the link register even when the branch is not taken", async () => {
  const cases = [
    ["bgezal", -1],
    ["bltzal", 0]
  ];

  for (const delayedBranching of [false, true]) {
    for (const [opcode, sourceValue] of cases) {
      const engine = await createJavaScriptEngine({
        settings: { startAtMain: true, delayedBranching }
      });
      const source = `
.text
main:
  li     $ra, 99
  li     $t0, ${sourceValue}
branch:
  ${opcode} $t0, target
  addiu  $s0, $zero, 7
target:
  nop
`;
      const assembled = engine.assemble(source, {
        sourceName: `${opcode}-not-taken-${delayedBranching ? "delayed" : "immediate"}.s`
      });
      assert.equal(assembled.ok, true, JSON.stringify(assembled.errors ?? []));
      const branch = instructionRow(engine, opcode);
      stepToAddress(engine, branch.address);

      const result = engine.step({ includeSnapshot: false });
      assert.equal(result.ok, true);
      assert.equal(result.exception, false);
      assert.equal(
        registers(engine)[31] >>> 0,
        ((branch.address >>> 0) + (delayedBranching ? 8 : 4)) >>> 0
      );
      assert.equal(engine.getSnapshot().pc >>> 0, ((branch.address >>> 0) + 4) >>> 0);
    }
  }
});

test("misaligned JR and JALR targets raise AdEL, including after a delay slot", async () => {
  for (const opcode of ["jr", "jalr"]) {
    const engine = await createJavaScriptEngine({
      settings: { startAtMain: true, delayedBranching: false }
    });
    const jump = opcode === "jr" ? "jr $t0" : "jalr $t1, $t0";
    const source = `
.text
main:
  li $t0, 0x00400001
  ${jump}
  nop
`;
    assert.equal(engine.assemble(source, { sourceName: `${opcode}-misaligned.s` }).ok, true);
    const row = instructionRow(engine, opcode);
    stepToAddress(engine, row.address);
    const stateBeforeJump = engine.exportRuntimeState({ includeProgram: false });
    const result = engine.step({ includeSnapshot: false });
    assertAddressException(engine, result, 4, 0x00400001);
    if (opcode === "jalr") {
      assert.equal(registers(engine)[9] >>> 0, ((row.address >>> 0) + 4) >>> 0);
    }
    assert.equal(engine.backstep().ok, true);
    const restored = engine.exportRuntimeState({ includeProgram: false });
    assert.equal(restored.pc >>> 0, stateBeforeJump.pc >>> 0);
    assert.deepEqual(restored.cop0, stateBeforeJump.cop0);
    assert.deepEqual(restored.registers, stateBeforeJump.registers);
  }

  const delayed = await createJavaScriptEngine({
    settings: { startAtMain: true, delayedBranching: true }
  });
  const delayedSource = `
.text
main:
  li    $t0, 0x00400001
  jr    $t0
  addiu $s0, $zero, 7
`;
  assert.equal(delayed.assemble(delayedSource, { sourceName: "jr-misaligned-delayed.s" }).ok, true);
  const jr = instructionRow(delayed, "jr");
  stepToAddress(delayed, jr.address);
  const jumpResult = delayed.step({ includeSnapshot: false });
  assert.notEqual(jumpResult.exception, true);
  const fetchResult = delayed.step({ includeSnapshot: false });
  assertAddressException(delayed, fetchResult, 4, 0x00400001);
  assert.equal(registers(delayed)[16], 7);
});

test("LL and SC maintain, invalidate, serialize, and backstep their reservation", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxBacksteps: 30 }
  });
  const source = `
.data
.align 2
value: .word 5
.text
main:
  la    $t0, value
  ll    $t1, 0($t0)
  li    $t1, 9
  sc    $t1, 0($t0)
  li    $t2, 11
  sc    $t2, 0($t0)
  li    $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "ll-sc-state.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors ?? []));
  const sc = instructionRow(engine, "sc");
  const valueAddress = labelAddress(engine, "value");
  stepToAddress(engine, sc.address);
  assert.equal(engine.getSnapshot().llReservationAddress, valueAddress);

  const exported = engine.exportRuntimeState();
  assert.equal(exported.llReservationAddress, valueAddress);
  const restored = await createJavaScriptEngine({ settings: { startAtMain: true, maxBacksteps: 30 } });
  restored.importRuntimeState(exported);
  assert.equal(restored.step({ includeSnapshot: false }).ok, true);
  assert.equal(registers(restored)[9], 1);
  assert.equal(restored.readWord(valueAddress), 9);

  assert.equal(engine.step({ includeSnapshot: false }).ok, true);
  assert.equal(registers(engine)[9], 1);
  assert.equal(engine.readWord(valueAddress), 9);
  assert.equal(engine.backstep().ok, true);
  assert.equal(engine.getSnapshot().llReservationAddress, valueAddress);
  assert.equal(registers(engine)[9], 9);
  assert.equal(engine.readWord(valueAddress), 5);
  assert.equal(engine.step({ includeSnapshot: false }).ok, true);
  assert.equal(registers(engine)[9], 1);
  assert.equal(engine.go(20).done, true);
  assert.equal(registers(engine)[10], 0);
  assert.equal(engine.readWord(valueAddress), 9);

  const invalidated = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const invalidatedSource = `
.data
.align 2
value: .word 5
.text
main:
  la $t0, value
  ll $t1, 0($t0)
  li $t2, 77
  sw $t2, 0($t0)
  li $t1, 88
  sc $t1, 0($t0)
  li $v0, 10
  syscall
`;
  assert.equal(invalidated.assemble(invalidatedSource, { sourceName: "ll-sc-invalidated.s" }).ok, true);
  assert.equal(invalidated.go(30).done, true);
  assert.equal(registers(invalidated)[9], 0);
  assert.equal(invalidated.readWord(labelAddress(invalidated, "value")), 77);

  const otherWord = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const otherWordSource = `
.data
.align 2
values: .word 5, 6
.text
main:
  la $t0, values
  ll $t1, 0($t0)
  li $t2, 77
  sw $t2, 4($t0)
  li $t1, 88
  sc $t1, 0($t0)
  li $v0, 10
  syscall
`;
  assert.equal(otherWord.assemble(otherWordSource, { sourceName: "ll-sc-other-word.s" }).ok, true);
  assert.equal(otherWord.go(30).done, true);
  assert.equal(registers(otherWord)[9], 1);
  assert.equal(otherWord.readWord(labelAddress(otherWord, "values")), 88);
});

test("SC validates bad addresses even without a reservation", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  li $t0, 123
  sc $t0, 1($zero)
`;
  assert.equal(engine.assemble(source, { sourceName: "sc-misaligned.s" }).ok, true);
  const result = engine.go(20);
  assertAddressException(engine, result, 5, 1);
  assert.equal(registers(engine)[8], 123);
});

test("LWL and LWR enforce strict memory ranges without changing merge behavior", async () => {
  for (const opcode of ["lwl", "lwr"]) {
    const engine = await createJavaScriptEngine({
      settings: { startAtMain: true, strictMarsCompatibility: true }
    });
    const source = `
.text
main:
  li $t0, 0xaabbccdd
  ${opcode} $t0, 1($zero)
`;
    assert.equal(engine.assemble(source, { sourceName: `${opcode}-strict.s` }).ok, true);
    let observedReads = 0;
    engine.registerMemoryObserver({
      start: 0,
      end: 3,
      onRead() {
        observedReads += 1;
      }
    });
    const result = engine.go(20);
    assertAddressException(engine, result, 4, 1);
    assert.equal(registers(engine)[8] >>> 0, 0xaabbccdd);
    assert.equal(observedReads, 0);
  }

  const merged = await createJavaScriptEngine({
    settings: { startAtMain: true, strictMarsCompatibility: true }
  });
  const mergeSource = `
.data
bytes: .byte 0x11, 0x22, 0x33, 0x44
.text
main:
  la  $t2, bytes
  li  $t0, 0xaabbccdd
  lwl $t0, 1($t2)
  li  $t1, 0xaabbccdd
  lwr $t1, 2($t2)
  li  $v0, 10
  syscall
`;
  assert.equal(merged.assemble(mergeSource, { sourceName: "lwl-lwr-merge.s" }).ok, true);
  let mergedReads = 0;
  const bytesAddress = labelAddress(merged, "bytes");
  merged.registerMemoryObserver({
    start: bytesAddress,
    end: bytesAddress + 3,
    onRead() {
      mergedReads += 1;
    }
  });
  assert.equal(merged.go(30).done, true);
  assert.equal(registers(merged)[8] >>> 0, 0x2211ccdd);
  assert.equal(registers(merged)[9] >>> 0, 0xaabb4433);
  assert.equal(mergedReads, 4);
});

test("CVT.W.S and CVT.W.D use default nearest-even COP1 rounding", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = `
.text
main:
  cvt.w.s $f1,  $f0
  cvt.w.s $f3,  $f2
  cvt.w.s $f5,  $f4
  cvt.w.s $f7,  $f6
  cvt.w.d $f10, $f8
  cvt.w.d $f14, $f12
  li      $v0, 10
  syscall
`;
  const assembled = engine.assemble(source, { sourceName: "cvt-word-rounding.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors ?? []));
  engine.setFloat32(0, 1.6);
  engine.setFloat32(2, -2.5);
  engine.setFloat32(4, Number.NaN);
  engine.setFloat32(6, Number.POSITIVE_INFINITY);
  engine.setFloat64(8, 3.5);
  engine.setFloat64(12, 2147483648);

  assert.equal(engine.go(30).done, true);
  const cop1 = engine.exportRuntimeState({ includeProgram: false }).cop1;
  assert.equal(cop1[1], 2);
  assert.equal(cop1[3], -2);
  assert.equal(cop1[5], 0x7fffffff);
  assert.equal(cop1[7], 0x7fffffff);
  assert.equal(cop1[10], 4);
  assert.equal(cop1[14], 0x7fffffff);
});

test("FCSR selects all four CVT.W rounding modes and survives snapshots", async () => {
  const cases = [
    { mode: 0, input: 1.6, expected: 2 },
    { mode: 1, input: -1.6, expected: -1 },
    { mode: 2, input: 1.2, expected: 2 },
    { mode: 3, input: -1.2, expected: -2 }
  ];

  for (const entry of cases) {
    const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
    const source = `
.text
main:
  li      $t0, ${entry.mode}
  ctc1    $t0, $31
  cvt.w.s $f2, $f0
  cfc1    $t1, $31
  li      $v0, 10
  syscall
`;
    const assembled = engine.assemble(source, { sourceName: `fcsr-rounding-${entry.mode}.s` });
    assert.equal(assembled.ok, true, JSON.stringify(assembled.errors ?? []));
    engine.setFloat32(0, entry.input);
    assert.equal(engine.go(20).done, true);

    const exported = engine.exportRuntimeState();
    assert.equal(exported.cop1[2], entry.expected);
    assert.equal(exported.registers[9] & 0x3, entry.mode);
    assert.equal(exported.fpuControlStatus & 0x3, entry.mode);

    const restored = await createJavaScriptEngine({ settings: { startAtMain: true } });
    restored.importRuntimeState(exported);
    assert.equal(restored.getSnapshot().fpuControlStatus & 0x3, entry.mode);
  }
});

test("go continues through handled exceptions with the same result as repeated Step", async () => {
  const source = `
.text
main:
  lw    $t0, 1($zero)
  addiu $s0, $zero, 42
  li    $v0, 10
  syscall
.ktext 0x80000180
handler:
  mfc0  $k0, $14
  addiu $k0, $k0, 4
  mtc0  $k0, $14
  addiu $s1, $zero, 99
  eret
`;
  const goEngine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const stepEngine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  assert.equal(goEngine.assemble(source, { sourceName: "handled-exception-go.s" }).ok, true);
  assert.equal(stepEngine.assemble(source, { sourceName: "handled-exception-step.s" }).ok, true);

  const result = goEngine.go(50);
  assert.equal(result.done, true);
  assert.equal(result.exception, false);
  assert.equal(registers(goEngine)[16], 42);
  assert.equal(registers(goEngine)[17], 99);
  assert.equal((goEngine.exportRuntimeState({ includeProgram: false }).cop0[12] & (1 << 1)), 0);

  for (let count = 0; count < 50 && !stepEngine.getSnapshot().halted; count += 1) {
    const stepped = stepEngine.step({ includeSnapshot: false });
    assert.equal(stepped.ok, true);
  }
  assert.equal(registers(stepEngine)[16], registers(goEngine)[16]);
  assert.equal(registers(stepEngine)[17], registers(goEngine)[17]);
  assert.equal(stepEngine.getSnapshot().halted, true);

  const budgetEngine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  assert.equal(budgetEngine.assemble(source, { sourceName: "handled-exception-budget.s" }).ok, true);
  const budgetResult = budgetEngine.go(1);
  assert.equal(budgetResult.done, false);
  assert.equal(budgetResult.exception, false);
  assert.equal(budgetResult.stepLimitReached, true);
  assert.equal(budgetResult.stepsExecuted, 1);
  assert.equal(budgetEngine.getSnapshot().pc >>> 0, labelAddress(budgetEngine, "handler"));
});
