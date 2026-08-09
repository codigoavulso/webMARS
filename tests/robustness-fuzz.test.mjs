// Bounded, deterministic fuzzing plus extreme-state tests.
//
// The property under test is not "the input is accepted" - most of these inputs
// are nonsense and must be rejected. It is that the assembler, the runtime and
// the state importer always fail *as a diagnostic*, never by throwing an
// unhandled error, hanging, or returning a half-built machine that later code
// would trust.
//
// Every generator is driven by a seeded PRNG, so a failure names an exact seed
// that reproduces it. Seeds are fixed constants rather than time-derived: a
// suite that fuzzes differently on every run cannot be used as a regression
// gate.

import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createJavaScriptEngine, projectRoot } from "./helpers/engines.mjs";

// mulberry32: small, fast and exactly reproducible from a 32-bit seed.
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.floor(random() * values.length) % values.length];
}

const OPCODES = [
  "add", "addu", "addi", "addiu", "sub", "and", "or", "xor", "nor", "slt",
  "sll", "srl", "sra", "lw", "sw", "lb", "sb", "lui", "beq", "bne", "j", "jal",
  "jr", "mult", "div", "mfhi", "mflo", "syscall", "nop", "li", "la", "move",
  "wrongop", "b", "sllv", "teq"
];
const REGISTERS = [
  "$zero", "$at", "$v0", "$a0", "$t0", "$t9", "$s0", "$s7", "$sp", "$ra",
  "$0", "$31", "$99", "$notareg", "$"
];
const IMMEDIATES = [
  "0", "1", "-1", "65535", "65536", "-32768", "-32769", "2147483647",
  "-2147483648", "4294967296", "0x7fffffff", "0xffffffff", "0x", "1e10",
  "0b1010", "99999999999999999999", "'a'", '"x"', "", "+", "--3"
];
const DIRECTIVES = [
  ".text", ".data", ".word", ".byte", ".half", ".ascii", ".asciiz", ".space",
  ".align", ".globl", ".eqv", ".macro", ".end_macro", ".include", ".notadirective"
];
const PUNCTUATION = ["", ",", "(", ")", "$", "#", ":", "\t", "  ", "((", "))", ",,"];

// Statements that are valid by construction. Without them the generator only
// ever exercises the rejection path, and a fuzz suite that never produces an
// acceptable input tests half of what it claims to.
function validStatement(random) {
  const safeRegisters = ["$t0", "$t1", "$t2", "$s0", "$s1", "$a0", "$v0"];
  const shape = random();
  const rd = pick(random, safeRegisters);
  const rs = pick(random, safeRegisters);
  const rt = pick(random, safeRegisters);
  if (shape < 0.30) return `  ${pick(random, ["add", "addu", "sub", "and", "or", "xor", "slt"])} ${rd}, ${rs}, ${rt}`;
  if (shape < 0.50) return `  addi ${rd}, ${rs}, ${Math.floor(random() * 200) - 100}`;
  if (shape < 0.62) return `  ${pick(random, ["sll", "srl", "sra"])} ${rd}, ${rs}, ${Math.floor(random() * 31)}`;
  if (shape < 0.72) return `  li ${rd}, ${Math.floor(random() * 1000)}`;
  if (shape < 0.80) return `  move ${rd}, ${rs}`;
  if (shape < 0.88) return `  ${pick(random, ["beq", "bne"])} ${rs}, ${rt}, fuzz_end`;
  if (shape < 0.94) return `  nop`;
  return `  ${pick(random, ["mult", "multu"])} ${rs}, ${rt}`;
}

function randomStatement(random) {
  const shape = random();
  if (shape < 0.16) {
    return `${pick(random, DIRECTIVES)} ${pick(random, IMMEDIATES)}${pick(random, PUNCTUATION)}`;
  }
  if (shape < 0.24) return `label${Math.floor(random() * 6)}:`;
  if (shape < 0.30) return pick(random, PUNCTUATION).repeat(1 + Math.floor(random() * 3));
  const opcode = pick(random, OPCODES);
  const operandCount = Math.floor(random() * 4);
  const operands = [];
  for (let index = 0; index < operandCount; index += 1) {
    operands.push(random() < 0.6 ? pick(random, REGISTERS) : pick(random, IMMEDIATES));
  }
  if (random() < 0.15) operands.push(`${pick(random, IMMEDIATES)}(${pick(random, REGISTERS)})`);
  if (random() < 0.1) operands.push(`label${Math.floor(random() * 6)}`);
  return `${opcode} ${operands.join(", ")}`;
}

// `hostileRatio` is the share of lines drawn from the hostile generator. At 0
// the program is valid by construction; at 1 it is pure noise.
function randomProgram(seed, lines = 24, hostileRatio = 0.5) {
  const random = createRandom(seed);
  const statements = [".text", "main:"];
  for (let index = 0; index < lines; index += 1) {
    statements.push(random() < hostileRatio ? `  ${randomStatement(random)}` : validStatement(random));
  }
  statements.push("fuzz_end:");
  statements.push("  li $v0, 10");
  statements.push("  syscall");
  return statements.join("\n");
}

// Assembling must always return a verdict. Anything that escapes as a thrown
// error is a crash the user would see as a blank screen.
async function assembleSafely(source, name) {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  let result;
  try {
    result = engine.assemble(source, { sourceName: name });
  } catch (error) {
    assert.fail(`${name} threw instead of reporting a diagnostic: ${error && error.stack}`);
  }
  assert.equal(typeof result, "object", `${name} must return a result object`);
  assert.equal(typeof result.ok, "boolean", `${name} must report ok as a boolean`);
  if (!result.ok) {
    assert.ok(Array.isArray(result.errors) && result.errors.length > 0,
      `${name} rejected the program without saying why`);
    result.errors.forEach((entry) => {
      assert.equal(typeof entry.message, "string", `${name} produced an error with no message`);
      assert.ok(entry.message.length > 0, `${name} produced an empty diagnostic`);
    });
  }
  return { engine, result };
}

test("the assembler answers every fuzzed program with a verdict, never a crash", async () => {
  let accepted = 0;
  let rejected = 0;
  for (let seed = 1; seed <= 90; seed += 1) {
    for (const hostileRatio of [0, 0.35, 1]) {
      const source = randomProgram(seed, 20, hostileRatio);
      const { result } = await assembleSafely(source, `fuzz-assemble-${seed}-${hostileRatio}.s`);
      if (result.ok) accepted += 1;
      else rejected += 1;
    }
  }
  // Both outcomes must occur, or the suite is only testing one path.
  assert.ok(accepted > 0, "the generator must sometimes produce an assemblable program");
  assert.ok(rejected > 0, "the generator must sometimes produce a rejected program");
});

test("running a fuzzed program terminates and never leaves the runtime mid-step", async () => {
  for (let seed = 500; seed <= 560; seed += 1) {
    const name = `fuzz-run-seed-${seed}.s`;
    const { engine, result } = await assembleSafely(randomProgram(seed, 16, 0.25), name);
    if (!result.ok) continue;

    let outcome;
    try {
      // A hard step budget is what turns an accidental infinite loop into a
      // reported limit rather than a hung tab.
      outcome = engine.go(2000);
    } catch (error) {
      assert.fail(`${name} threw during execution: ${error && error.stack}`);
    }
    assert.equal(typeof outcome, "object", `${name} must return a run result`);
    const snapshot = engine.getSnapshot();
    assert.equal(typeof snapshot.pc, "number", `${name} must leave a numeric PC`);
    assert.ok(Number.isFinite(snapshot.steps), `${name} must leave a finite step count`);
    // Either it finished, hit the budget, or raised an exception - all three are
    // controlled outcomes. What must not happen is silently running forever.
    assert.ok(
      outcome.done === true || outcome.stepLimitReached === true || outcome.exception === true,
      `${name} neither completed, hit the step limit, nor raised: ${JSON.stringify(outcome).slice(0, 200)}`
    );
  }
});

test("state import rejects corrupted payloads without throwing", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  assert.equal(engine.assemble(".text\nmain:\n  li $v0, 10\n  syscall\n", { sourceName: "base.s" }).ok, true);
  const valid = engine.exportRuntimeState({ includeProgram: true });
  const before = engine.exportRuntimeState({ includeProgram: true });

  const corruptions = [
    null,
    undefined,
    42,
    "not json",
    [],
    {},
    { registers: null },
    { registers: "nope" },
    { registers: [1, 2, 3] },
    { registers: new Array(32).fill("x") },
    { ...valid, registers: new Array(32).fill(Number.NaN) },
    { ...valid, registers: new Array(4).fill(0) },
    { ...valid, pc: "0x00400000" },
    { ...valid, pc: Number.NaN },
    { ...valid, pc: -1 },
    { ...valid, memoryWords: "corrupt" },
    { ...valid, memoryWords: [[0x10010001, 1]] },
    { ...valid, memoryMap: [] },
    { ...valid, memoryMap: { ...valid.memoryMap, heapBase: "0x10040000" } },
    { ...valid, textRows: "corrupt" },
    { ...valid, cop0: null },
    { ...valid, fpuFlags: [0, 1, 2] }
  ];

  // Refusal is atomic: neither the machine nor the cache generation changes.
  corruptions.forEach((payload, index) => {
    let result = null;
    assert.doesNotThrow(() => {
      result = engine.importRuntimeState(payload);
    }, `corruption #${index} (${JSON.stringify(payload)?.slice(0, 60)}) must be refused, not thrown on`);
    assert.equal(result, false, `corruption #${index} must report refusal`);
    assert.deepEqual(
      engine.exportRuntimeState({ includeProgram: true }),
      before,
      `corruption #${index} mutated the previous machine state`
    );
  });

  // A valid import advances the local generation even when the serialized
  // snapshot carries the same revision, so every cache sees a new lifecycle.
  const previousRevision = engine.getSnapshot().runtimeRevision;
  assert.equal(engine.importRuntimeState(valid), true);
  assert.equal(engine.getSnapshot().runtimeRevision, (previousRevision + 1) >>> 0);
  assert.deepEqual(
    engine.exportRuntimeState({ includeProgram: false }).registers,
    valid.registers,
    "a valid state must still restore after invalid ones were refused"
  );
});

test("a long program assembles and runs within its step budget", async () => {
  // 4000 instructions is past the point where a quadratic pass would show up as
  // a timeout rather than as a wrong answer.
  const body = Array.from({ length: 4000 }, (_unused, index) => `  addi $t0, $t0, ${index % 7}`).join("\n");
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff } });
  const assembled = engine.assemble(`.text\nmain:\n${body}\n  li $v0, 10\n  syscall\n`, { sourceName: "long.s" });
  assert.equal(assembled.ok, true, assembled.errors?.[0]?.message);

  const snapshot = engine.getSnapshot();
  assert.equal(snapshot.textRows.length, 4002);
  const result = engine.go(10000);
  assert.equal(result.done, true, "a straight-line program must terminate inside its budget");

  const expected = Array.from({ length: 4000 }, (_unused, index) => index % 7).reduce((sum, value) => sum + value, 0);
  assert.equal(engine.exportRuntimeState({ includeProgram: false }).registers[8], expected);
});

test("extreme memory addresses are diagnosed, not silently accepted", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  assert.equal(engine.assemble(".text\nmain:\n  li $v0, 10\n  syscall\n", { sourceName: "mem.s" }).ok, true);

  // Reads that must fail: unaligned, and far outside any mapped segment.
  // Errors are constructed inside the engine's vm realm, so `instanceof Error`
  // is false here even though they are proper errors. Shape is what matters.
  const assertDiagnostic = (error, label) => {
    assert.equal(typeof error, "object", `${label} threw a non-object`);
    assert.equal(typeof error.message, "string", `${label} threw without a message`);
    assert.ok(error.message.length > 0, `${label} threw an empty message`);
    assert.ok(error.name === undefined || typeof error.name === "string", `${label} threw a nameless error`);
  };

  [0x00400001, 0x00400002, 0x00400003].forEach((address) => {
    let thrown = null;
    try {
      engine.readWord(address);
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown, `unaligned read at 0x${address.toString(16)} must be refused`);
    assertDiagnostic(thrown, `unaligned read at 0x${address.toString(16)}`);
    assert.match(String(thrown.message), /align/i, "the diagnostic must say the address is unaligned");
  });

  // Reads at segment edges may succeed or be refused; either is a decision. A
  // raw JavaScript failure with no message is not.
  [0x00000000, 0x7ffffffc, 0xfffffffc, 0xffff0000].forEach((address) => {
    try {
      const value = engine.readWord(address);
      assert.equal(typeof value, "number", `read at 0x${address.toString(16)} returned a non-number`);
    } catch (error) {
      assertDiagnostic(error, `read at 0x${address.toString(16)}`);
    }
  });

  assert.equal(engine.getSnapshot().halted === true || engine.getSnapshot().halted === false, true,
    "the engine must still report a usable snapshot after refused accesses");
});

test("the Pipeline Lab survives malformed instruction rows", async () => {
  const source = await readFile(resolve(projectRoot, "tools/pipeline-lab.js"), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: "tools/pipeline-lab.js" });
  const core = context.MarsPipelineLabCore;

  const malformed = [
    {},
    { basic: "" },
    { basic: "   " },
    { basic: "###" },
    { basic: "add" },
    { basic: "add $t0" },
    { basic: "add $t0, $t1, $t2", address: "not a number" },
    { basic: "beq $t0, $t1, nosuchlabel", address: 0x00400000 },
    { basic: "j 0xffffffff", address: 0x00400004 },
    { basic: null },
    { source: undefined, basic: undefined },
    { basic: "lw $t0, 0($t1)", address: Number.NaN }
  ];

  const simulator = core.createSimulator(malformed, { forwarding: true });
  const result = simulator.run(500);
  assert.equal(result.done, true, "a malformed program must still drain the pipeline");
  assert.equal(result.program.length, malformed.length);
  assert.ok(Number.isFinite(result.cycle) && result.cycle > 0);
  assert.ok(Number.isFinite(result.cpi));

  // Exports must stay well-formed even when every row was junk.
  const report = simulator.report();
  assert.match(report.program.hash, /^fnv1a:[0-9a-f]{8}$/);
  assert.equal(typeof simulator.toCSV("timeline"), "string");
  assert.equal(typeof simulator.toCSV("metrics"), "string");
  assert.doesNotThrow(() => JSON.stringify(report));

  // Backstepping all the way out must land exactly on the initial state.
  const fresh = core.createSimulator(malformed, { forwarding: true });
  for (let step = 0; step < 6; step += 1) fresh.step();
  for (let step = 0; step < 20; step += 1) fresh.back();
  const rewound = fresh.snapshot();
  assert.equal(rewound.cycle, 0);
  assert.equal(rewound.completed, 0);
  assert.equal(rewound.canBack, false);
});

test("fuzzed programs that assemble also survive the Pipeline Lab model", async () => {
  const source = await readFile(resolve(projectRoot, "tools/pipeline-lab.js"), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: "tools/pipeline-lab.js" });
  const core = context.MarsPipelineLabCore;

  let modelled = 0;
  for (let seed = 900; seed <= 940; seed += 1) {
    const { engine, result } = await assembleSafely(randomProgram(seed, 14, 0.2), `fuzz-pipeline-seed-${seed}.s`);
    if (!result.ok) continue;
    modelled += 1;
    const snapshot = engine.getSnapshot();
    const simulator = core.createSimulator(snapshot.textRows, {
      profile: "forwarding",
      labels: snapshot.labels,
      outcomeModel: "backward-taken"
    });
    const outcome = simulator.run(5000);
    assert.equal(outcome.done, true, `seed ${seed} did not drain within its cycle budget`);
    assert.ok(outcome.completed >= 0);
    assert.ok(Number.isFinite(outcome.cpi), `seed ${seed} produced a non-finite CPI`);
  }
  assert.ok(modelled > 0, "at least one fuzzed program must reach the timing model");
});
