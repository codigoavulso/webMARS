// The Pipeline Lab replaying a recorded webMARS run.
//
// The static model never executes anything, so it can only assume how a branch
// resolved and can never say what a register held. Replaying a recording
// replaces both assumptions with facts, and that changes what the model is
// allowed to claim. These tests pin the difference:
//
//   - branch outcomes come from the recording, not from `outcomeModel`;
//   - a register value exists only where the runtime supplied one;
//   - a value reaches the register file in WB and not before, which is the
//     whole reason the forwarding options matter;
//   - a recording the model cannot follow is reported, never guessed at.
//
// A failure here means the tool is showing a student numbers the runtime did
// not produce, which is worse than showing none.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

const pipelineLabPath = resolve(projectRoot, "tools/pipeline-lab.js");

async function loadCore() {
  const source = await readFile(pipelineLabPath, "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: "tools/pipeline-lab.js" });
  return context.MarsPipelineLabCore;
}

// Objects built inside the VM realm are structurally equal but not
// prototype-equal, so comparisons round-trip through JSON first.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const BASE = 0x00400000;

function rows(statements) {
  return statements.map((basic, index) => ({
    basic,
    index,
    address: BASE + index * 4,
    addressHex: `0x${(BASE + index * 4).toString(16).padStart(8, "0")}`
  }));
}

function at(index) {
  return BASE + index * 4;
}

// A counted loop: three iterations, so the backward branch is taken twice and
// falls through once.
const loopProgram = rows([
  "addiu $t0,$zero,3",              // 0
  "addiu $t1,$zero,10",             // 1
  "addiu $t0,$t0,-1",               // 2  loop body
  "bne $t0,$zero,0x00400008",       // 3
  "add $t2,$t1,$t0"                 // 4
]);

const loopRecording = [
  { address: at(0), step: 1, writes: [{ name: "$t0", before: 0, after: 3 }] },
  { address: at(1), step: 2, writes: [{ name: "$t1", before: 0, after: 10 }] },
  { address: at(2), step: 3, writes: [{ name: "$t0", before: 3, after: 2 }] },
  { address: at(3), step: 4, writes: [] },
  { address: at(2), step: 5, writes: [{ name: "$t0", before: 2, after: 1 }] },
  { address: at(3), step: 6, writes: [] },
  { address: at(2), step: 7, writes: [{ name: "$t0", before: 1, after: 0 }] },
  { address: at(3), step: 8, writes: [] },
  { address: at(4), step: 9, writes: [{ name: "$t2", before: 0, after: 10 }] }
];

function replay(core, program, recording, options = {}) {
  const simulator = core.createSimulator(program, { forwarding: true, source: "execution", ...options });
  simulator.setExecutionTrace(recording, { initialRegisters: options.initialRegisters ?? { $t0: 0, $t1: 0, $t2: 0 } });
  return simulator;
}

test("the recorded stream is a source, not a profile", async () => {
  const core = await loadCore();
  assert.deepEqual([...core.TRACE_SOURCES], ["static", "execution"]);
  // Replaying a recording must not turn a named profile into "custom": the
  // profile describes the microarchitecture, not which stream it is fed.
  const simulator = replay(core, loopProgram, loopRecording, { profile: "forwarding" });
  assert.equal(simulator.report().profile.id, "forwarding");
  assert.equal(simulator.report().source, "execution");
  assert.equal(core.createSimulator(loopProgram, { profile: "forwarding" }).report().source, "static");
});

test("branch outcomes come from the recording rather than from the assumption", async () => {
  const core = await loadCore();
  const replayed = replay(core, loopProgram, loopRecording).run(400).metrics.branches;

  // The loop really ran three times: taken, taken, fall through.
  assert.equal(replayed.total, 3);
  assert.equal(replayed.taken, 2);
  assert.equal(replayed.notTaken, 1);
  // Predicting "not taken" is therefore wrong exactly twice, whatever the
  // static outcome model would have assumed.
  assert.equal(replayed.mispredicted, 2);
  assert.equal(replayed.predicted, 1);

  // The static model, told to assume every branch falls through, sees one
  // branch and never a misprediction. Same program, different claim.
  const assumed = core.createSimulator(loopProgram, { forwarding: true }).run(400).metrics.branches;
  assert.equal(assumed.total, 1);
  assert.equal(assumed.taken, 0);
  assert.equal(assumed.mispredicted, 0);
});

test("register values exist only where the runtime supplied them", async () => {
  const core = await loadCore();

  const assumed = core.createSimulator(loopProgram, { forwarding: true }).run(400);
  assert.equal(assumed.registers.some((entry) => entry.known), false,
    "the static model executes nothing, so it must not report a value for any register");

  const replayed = replay(core, loopProgram, loopRecording).run(400);
  const values = Object.fromEntries(replayed.registers.filter((entry) => entry.known).map((entry) => [entry.name, entry.value]));
  assert.deepEqual(values, { $t0: 0, $t1: 10, $t2: 10 });
});

test("a write reaches the register file in WB and not before", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);

  // Step until the first instruction is in WB. With five stages that is cycle
  // five; every earlier cycle must still show the value it started with.
  const seen = [];
  for (let cycle = 1; cycle <= 5; cycle += 1) {
    const snapshot = simulator.step();
    const entry = snapshot.registers.find((register) => register.name === "$t0");
    seen.push({ cycle: snapshot.cycle, value: entry.value, stage: entry.inFlight ? entry.inFlight.stage : null });
  }

  assert.deepEqual(seen.map((entry) => entry.value), [0, 0, 0, 0, 3]);
  // Before it commits, the value is visible as in flight, which is exactly the
  // value a forwarding path would carry. At cycle five the file finally holds
  // 3 while the loop body, already in EX, has the next $t0 in flight behind it
  // -- the pipeline is a queue of pending writes, not a single one.
  assert.deepEqual(seen.map((entry) => entry.stage), [null, null, "EX", "MEM", "EX"]);
  const atFive = simulator.snapshot().registers.find((register) => register.name === "$t0");
  assert.equal(atFive.value, 3);
  assert.equal(atFive.inFlight.value, 2);

  const log = plain(simulator.snapshot().registerLog);
  assert.deepEqual(log.map((entry) => `C${entry.cycle} ${entry.writes.map((write) => `${write.name}=${write.after}`).join(",")}`),
    ["C5 $t0=3"]);
});

test("the youngest pending write wins when EX and MEM target the same register", async () => {
  const core = await loadCore();
  const program = rows([
    "addiu $t0,$zero,1",
    "addiu $t0,$zero,2",
    "addiu $t1,$zero,3"
  ]);
  const recording = [
    { address: at(0), step: 1, writes: [{ name: "$t0", before: 0, after: 1 }] },
    { address: at(1), step: 2, writes: [{ name: "$t0", before: 1, after: 2 }] },
    { address: at(2), step: 3, writes: [{ name: "$t1", before: 0, after: 3 }] }
  ];
  const simulator = replay(core, program, recording);
  for (let cycle = 0; cycle < 4; cycle += 1) simulator.step();

  const pending = simulator.snapshot().registers.find((register) => register.name === "$t0").inFlight;
  assert.deepEqual(plain(pending), {
    stage: "EX",
    value: 2,
    text: "addiu $t0,$zero,2"
  });
});

test("the register log records every commit with its cycle and its webMARS step", async () => {
  const core = await loadCore();
  const snapshot = replay(core, loopProgram, loopRecording).run(400);

  assert.deepEqual(
    plain(snapshot.registerLog).map((entry) => [entry.cycle, entry.step, entry.writes.map((write) => `${write.name}=${write.after}`).join(",")]),
    [
      [5, 1, "$t0=3"],
      [6, 2, "$t1=10"],
      [7, 3, "$t0=2"],
      [11, 5, "$t0=1"],
      [15, 7, "$t0=0"],
      [17, 9, "$t2=10"]
    ]
  );
});

test("an instruction carries the operand values it really read", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);
  // Advance until the final add, which reads $t1 and $t0 after the loop. The
  // same instruction is also fetched speculatively on the wrong path of each
  // taken branch; those copies never executed, so they carry no values and are
  // skipped by requiring a position in the recording.
  let guard = 0;
  while (guard < 400) {
    const snapshot = simulator.step();
    const slot = snapshot.stages.ID;
    if (slot && !slot.bubble && slot.index === 4 && typeof slot.tracePos === "number") {
      assert.deepEqual(plain(slot.traceReads), { $t1: 10, $t0: 0 });
      assert.deepEqual(plain(slot.traceWrites).map((write) => [write.name, write.before, write.after]), [["$t2", 0, 10]]);
      return;
    }
    guard += 1;
  }
  assert.fail("the final add never reached ID on the recorded path");
});

test("wrong-path instructions are fetched but carry no values and commit nothing", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);
  simulator.run(400);

  const discarded = simulator.report().timeline.filter((row) => row.flushed);
  assert.ok(discarded.length > 0, "predicting not-taken on a taken branch must discard instructions");
  // A discarded instruction never executed, so it has no webMARS step and its
  // registers must never appear in the log.
  discarded.forEach((row) => assert.equal(row.step, null));

  const committedUids = new Set(simulator.snapshot().registerLog.map((entry) => entry.uid));
  discarded.forEach((row) => assert.equal(committedUids.has(row.uid), false));
});

test("replaying is deterministic and reverses exactly", async () => {
  const core = await loadCore();
  const first = replay(core, loopProgram, loopRecording).run(400);
  const second = replay(core, loopProgram, loopRecording).run(400);
  assert.equal(first.cycle, second.cycle);
  assert.deepEqual(
    JSON.parse(JSON.stringify(first.registerLog)),
    JSON.parse(JSON.stringify(second.registerLog))
  );

  const simulator = replay(core, loopProgram, loopRecording);
  for (let step = 0; step < 9; step += 1) simulator.step();
  const before = JSON.stringify(simulator.report());
  simulator.step();
  simulator.step();
  simulator.back();
  simulator.back();
  assert.equal(JSON.stringify(simulator.report()), before,
    "backstep must restore the register file as well as the timeline");
});

test("a recording that ends mid-run drains instead of stalling", async () => {
  const core = await loadCore();
  const snapshot = replay(core, loopProgram, loopRecording.slice(0, 4)).run(400);
  assert.equal(snapshot.done, true);
  assert.equal(snapshot.execution.replayed, 4);
  // The last recorded branch has no successor, so its direction is unknown
  // rather than "not taken": counting it as a prediction result would invent a
  // statistic the recording does not support.
  assert.equal(snapshot.metrics.branches.total, 0);
});

test("a discontinuity no branch predicts resynchronises instead of deadlocking", async () => {
  const core = await loadCore();
  // Two runs of the same program spliced together, as happens when a program
  // is reset and run again while the tool is recording.
  const program = rows(["addiu $t0,$zero,3", "addiu $t1,$zero,7", "syscall"]);
  const run = (offset) => [
    { address: at(0), step: offset + 1, writes: [{ name: "$t0", before: 0, after: 3 }] },
    { address: at(1), step: offset + 2, writes: [{ name: "$t1", before: 0, after: 7 }] },
    { address: at(2), step: offset + 3, writes: [] }
  ];
  const snapshot = replay(core, program, [...run(0), ...run(3)]).run(400);

  assert.equal(snapshot.done, true);
  assert.equal(snapshot.execution.replayed, 6);
  assert.equal(snapshot.events.filter((event) => event.reason === "resynchronised").length, 1);
});

test("instructions executed outside the assembled program are counted, not invented", async () => {
  const core = await loadCore();
  const program = rows(["addiu $t0,$zero,3", "syscall"]);
  const snapshot = replay(core, program, [
    { address: at(0), step: 1, writes: [{ name: "$t0", before: 0, after: 3 }] },
    // An exception handler lives outside the text rows the model knows about.
    { address: 0x80000180, step: 2, writes: [{ name: "$k0", before: 0, after: 1 }] },
    { address: at(1), step: 3, writes: [] }
  ]).run(400);

  assert.equal(snapshot.execution.outsideProgram, 1);
  assert.equal(snapshot.execution.recorded, 2);
  assert.equal(snapshot.done, true);
  assert.equal(snapshot.registers.some((entry) => entry.name === "$k0" && entry.known), false);
});

test("the register CSV is one row per committed write", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);
  simulator.run(400);
  const lines = simulator.toCSV("registers").split("\n");

  assert.equal(lines[0], "cycle,step,instruction,register,before,after,after_hex");
  assert.equal(lines.length, 7);
  assert.equal(lines[1], `5,1,"addiu $t0,$zero,3",$t0,0,3,0x00000003`);

  // The static model has nothing to export, and says so with a header and no
  // rows rather than with zeroes.
  const assumed = core.createSimulator(loopProgram, { forwarding: true });
  assumed.run(400);
  assert.equal(assumed.toCSV("registers").split("\n").length, 1);
});

test("following a stepping program fills the pipeline instead of draining it", async () => {
  const core = await loadCore();
  // Nine independent instructions, so nothing stalls and the pipeline fills at
  // one stage per step. Any drain-and-refill shows up immediately.
  const program = rows([
    "addiu $t0,$zero,1", "addiu $t1,$zero,2", "addiu $t2,$zero,3",
    "addiu $t3,$zero,4", "addiu $t4,$zero,5", "addiu $t5,$zero,6"
  ]);
  const recording = program.map((row, index) => ({
    address: at(index),
    step: index + 1,
    writes: [{ name: `$t${index}`, before: 0, after: index + 1 }]
  }));

  const simulator = replay(core, program, recording, { initialRegisters: {} });
  const occupancy = [];
  for (let executed = 1; executed <= recording.length; executed += 1) {
    // Exactly what the tool does when webMARS reports one more instruction.
    simulator.setExecutionTrace(recording.slice(0, executed), { initialRegisters: {} });
    const snapshot = simulator.seekFetched(executed, 400);
    occupancy.push(["IF", "ID", "EX", "MEM", "WB"]
      .filter((stage) => snapshot.stages[stage] && !snapshot.stages[stage].bubble).length);
  }

  // One step fills one more stage, up to the depth of the pipeline. Seeking to
  // where the newest instruction *retires* would give [1, 1, 1, 1, 1, 1]: every
  // younger stage empty, because the recording holds nothing after it. That was
  // the defect this pins.
  assert.deepEqual(occupancy, [1, 2, 3, 4, 5, 5]);
});

test("the newest recorded instruction is the one entering the pipeline", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);

  for (let executed = 1; executed <= 4; executed += 1) {
    simulator.setExecutionTrace(loopRecording.slice(0, executed), { initialRegisters: { $t0: 0, $t1: 0, $t2: 0 } });
    const snapshot = simulator.seekFetched(executed, 400);
    const fetching = snapshot.stages.IF;
    assert.ok(fetching && !fetching.bubble, `nothing is being fetched after ${executed} step(s)`);
    assert.equal(fetching.traceStep, loopRecording[executed - 1].step,
      "IF must hold the instruction webMARS just executed");
  }
});

test("seeking by fetched instruction is reversible", async () => {
  const core = await loadCore();
  const forwards = replay(core, loopProgram, loopRecording);
  forwards.seekFetched(4);
  const arrived = JSON.stringify(forwards.report());

  const backwards = replay(core, loopProgram, loopRecording);
  backwards.run(400);
  backwards.seekFetched(4);
  assert.equal(JSON.stringify(backwards.report()), arrived);
});

test("the static stream can also be walked one instruction at a time", async () => {
  const core = await loadCore();
  // No recording at all: the instruction-granular transport must still move,
  // keyed on what the fetch stage has taken in.
  const simulator = core.createSimulator(loopProgram, { forwarding: true });

  const first = simulator.seekFetchedInstructions(1, 400);
  assert.equal(first.trace.length, 1);
  assert.equal(first.cycle, 1);

  const third = simulator.seekFetchedInstructions(3, 400);
  assert.equal(third.trace.length, 3);

  const back = simulator.seekFetchedInstructions(1, 400);
  assert.equal(back.trace.length, 1);
  assert.equal(back.cycle, 1, "rewinding by instruction must land on the same cycle it left");
});

test("seeking by retired instruction lands where both clocks agree", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);
  simulator.run(400);

  // After seeking to N, every instruction webMARS executed up to step N has
  // written back here too, so the two register files hold the same values.
  // Rebuilding the state from the recording independently must agree.
  for (let retired = 1; retired <= loopRecording.length; retired += 1) {
    const snapshot = simulator.seekRetired(retired);
    assert.equal(snapshot.execution.retired, retired);
    assert.equal(snapshot.execution.retiredStep, loopRecording[retired - 1].step);

    const expected = new Map();
    loopRecording.slice(0, retired).forEach((entry) => {
      entry.writes.forEach((write) => expected.set(write.name, write.after));
    });
    expected.forEach((value, name) => {
      const register = snapshot.registers.find((entry) => entry.name === name);
      assert.equal(register.value, value, `${name} disagrees after ${retired} retired instruction(s)`);
    });
  }
});

test("seeking is reversible and reaches the same state from either direction", async () => {
  const core = await loadCore();
  const forwards = replay(core, loopProgram, loopRecording);
  forwards.seekRetired(5);
  const arrivedForwards = JSON.stringify(forwards.report());

  const backwards = replay(core, loopProgram, loopRecording);
  backwards.run(400);
  backwards.seekRetired(5);
  assert.equal(JSON.stringify(backwards.report()), arrivedForwards,
    "stepping forward to an instruction and rewinding back to it must give the same state");
});

test("seeking clamps to the recording instead of running away", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);

  assert.equal(simulator.seekRetired(-5).execution.retired, 0);
  assert.equal(simulator.seekRetired(0).cycle, 0);
  const beyond = simulator.seekRetired(loopRecording.length + 50);
  assert.equal(beyond.execution.retired, loopRecording.length);
  // Asking for more than was recorded stops at the last recorded instruction
  // rather than spinning against the cycle budget.
  assert.equal(beyond.cycle, replay(core, loopProgram, loopRecording).run(400).cycle);
});

test("switching the stream restarts the replay rather than reinterpreting it", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);
  simulator.run(400);
  assert.equal(simulator.snapshot().source, "execution");

  // The static stream must not inherit the recording's cycle count, register
  // values or branch statistics: it is a different claim about the program.
  const asStatic = simulator.setSource("static");
  assert.equal(asStatic.source, "static");
  assert.equal(asStatic.cycle, 0);
  assert.equal(asStatic.registers.some((entry) => entry.known), false);

  const back = simulator.setSource("execution");
  assert.equal(back.source, "execution");
  assert.equal(back.cycle, 0);
  // Switching to the stream already selected is not a reset.
  const unchanged = simulator.run(400);
  assert.equal(simulator.setSource("execution").cycle, unchanged.cycle);
  // An unknown name falls back to the static stream rather than throwing.
  assert.equal(simulator.setSource("nonsense").source, "static");
});

test("clearing the recording leaves a model that still runs", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);
  simulator.run(400);

  const cleared = simulator.clearExecutionTrace();
  assert.equal(cleared.execution.recorded, 0);
  assert.equal(cleared.cycle, 0);
  assert.equal(cleared.registers.some((entry) => entry.known), false);
  // Following an empty recording means there is nothing to replay -- not that
  // the assembled program should be replayed in its place.
  assert.equal(cleared.followingExecution, true);
  assert.equal(simulator.run(400).cycle, 0);
});

test("profile and forwarding shortcuts agree with setting the configuration", async () => {
  const core = await loadCore();
  const byProfile = core.createSimulator(loopProgram, {});
  byProfile.setProfile("delay-slot");
  const byConfig = core.createSimulator(loopProgram, { profile: "delay-slot" });
  assert.deepEqual(plain(byProfile.snapshot().config), plain(byConfig.snapshot().config));
  assert.equal(byProfile.report().profile.id, "delay-slot");

  // An unknown profile is ignored rather than clearing the configuration.
  const before = plain(byProfile.snapshot().config);
  byProfile.setProfile("no-such-profile");
  assert.deepEqual(plain(byProfile.snapshot().config), before);

  const toggled = core.createSimulator(loopProgram, { forwarding: false });
  assert.equal(toggled.setForwarding(true).config.forwarding, true);
  assert.equal(toggled.setForwarding(false).config.forwarding, false);
});

test("toJSON is the report, so a simulator can be serialised directly", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);
  simulator.run(400);
  assert.deepEqual(plain(simulator.toJSON()), plain(simulator.report()));
  assert.equal(JSON.parse(JSON.stringify(simulator)).schema, "webmars.pipeline-report/1");
});

test("reloading a program drops a recording that no longer describes it", async () => {
  const core = await loadCore();
  const simulator = replay(core, loopProgram, loopRecording);
  simulator.run(400);
  assert.ok(simulator.snapshot().execution.recorded > 0);

  // The addresses would still resolve against a different program while
  // meaning something else, so the binding is redone rather than trusted.
  const other = rows(["addiu $t0,$zero,1", "addiu $t1,$zero,2"]);
  const reloaded = simulator.loadProgram(other);
  assert.equal(reloaded.program.length, 2);
  assert.equal(reloaded.cycle, 0);
  // The raw recording survives, but only the instructions the new program
  // actually contains are replayable.
  assert.ok(reloaded.execution.recorded <= loopRecording.length);
});

test("an empty program is finished before it starts", async () => {
  const core = await loadCore();
  const simulator = core.createSimulator([], {});
  const snapshot = simulator.snapshot();
  assert.equal(snapshot.done, true);
  assert.equal(snapshot.cycle, 0);
  assert.equal(simulator.step().cycle, 0);
  assert.equal(simulator.back().cycle, 0);
  assert.equal(simulator.seekFetched(5).cycle, 0);
  assert.equal(simulator.instructionTrace(0), null);
});

test("labels are accepted in every shape the runtime hands them over in", async () => {
  const core = await loadCore();
  const program = rows(["beq $t0,$t1,target", "addiu $t2,$zero,1", "addiu $t3,$zero,2"]);
  const target = at(2);

  // The runtime's list form, a plain map, and a Map all have to resolve to the
  // same instruction index, or a branch target silently becomes unresolvable
  // and every prediction reports a hit.
  const shapes = [
    [{ label: "target", address: target }],
    { target },
    new Map([["target", target]])
  ];
  shapes.forEach((labels) => {
    const simulator = core.createSimulator(program, { forwarding: true, labels });
    assert.equal(simulator.snapshot().program[0].targetIndex, 2, `labels as ${labels.constructor.name} did not resolve`);
  });

  // Nothing, and entries that are not addresses, leave the target unresolved
  // rather than throwing or resolving to instruction zero.
  [null, undefined, [{ label: "", address: target }], { target: "not a number" }].forEach((labels) => {
    const simulator = core.createSimulator(program, { forwarding: true, labels });
    assert.equal(simulator.snapshot().program[0].targetIndex, null);
  });
});

test("register reads and writes are decoded for the instruction families the model claims", async () => {
  const core = await loadCore();
  const decode = (basic) => {
    const instruction = core.decodeInstruction({ basic }, 0);
    return { reads: [...instruction.reads], writes: [...instruction.writes], kind: instruction.kind };
  };

  assert.deepEqual(decode("mult $t0,$t1"), { reads: ["$t0", "$t1"], writes: ["$hi", "$lo"], kind: "alu" });
  assert.deepEqual(decode("mfhi $t2"), { reads: ["$hi"], writes: ["$t2"], kind: "alu" });
  assert.deepEqual(decode("mtlo $t3"), { reads: ["$t3"], writes: ["$lo"], kind: "alu" });
  assert.deepEqual(decode("jalr $t4,$t5"), { reads: ["$t5"], writes: ["$t4"], kind: "jump" });
  assert.deepEqual(decode("jalr $t5"), { reads: ["$t5"], writes: ["$ra"], kind: "jump" });
  assert.deepEqual(decode("sc $t6,0($t7)"), { reads: ["$t6", "$t7"], writes: ["$t6"], kind: "store" });
  assert.deepEqual(decode("bgezal $t8,0x00400000").writes, ["$ra"]);
  // $zero is never a dependency, however it is written.
  assert.deepEqual(decode("addiu $zero,$t0,1").writes, []);
  // An opcode the model does not know still reports its registers as reads, so
  // it cannot silently look independent of everything around it.
  const unknown = core.decodeInstruction({ basic: "frobnicate $t0,$t1" }, 0);
  assert.equal(unknown.supported, false);
  assert.deepEqual([...unknown.reads], ["$t0", "$t1"]);
  // Floating point flows through the stages but its latency is not modelled.
  assert.equal(core.decodeInstruction({ basic: "add.s $f0,$f1,$f2" }, 0).timingModelled, false);
  assert.equal(core.decodeInstruction({ basic: "mfc1 $t0,$f0" }, 0).timingModelled, false);
});

test("a configuration matching no profile reports itself as custom", async () => {
  const core = await loadCore();
  const simulator = core.createSimulator(loopProgram, { forwarding: true, memoryLatency: 5, loopIterations: 7 });
  simulator.run(400);
  const report = simulator.report();

  assert.equal(report.profile.id, "custom");
  assert.equal(report.profile.version, 0);
  assert.equal(report.config.memoryLatency, 5);

  // Out-of-range values are clamped rather than accepted, so a report can never
  // describe a configuration the model cannot run.
  const clamped = core.normalizeConfig({ memoryLatency: 99, loopIterations: -3, branchPrediction: "wishful" });
  assert.equal(clamped.memoryLatency, 8);
  assert.equal(clamped.loopIterations, 1);
  assert.equal(clamped.branchPrediction, "not-taken");

  // The metric sheet flattens the nested counters so a spreadsheet can read it.
  const metrics = simulator.toCSV("metrics").split("\n");
  assert.equal(metrics[0], "metric,value");
  assert.ok(metrics.some((line) => line.startsWith("config_memoryLatency,5")));
  assert.ok(metrics.some((line) => line.startsWith("hazards_raw,")));
  assert.ok(metrics.some((line) => line.startsWith("branches_mispredicted,")));
  assert.ok(metrics.some((line) => line.startsWith("source,")));
});

// A recorded run visits the same instruction thousands of times, which the
// static stream never did. Two things that were harmless at a few hundred
// cycles stop being harmless there, and both are pinned here.
test("replaying a long loop does not cost memory quadratic in cycles", async () => {
  const core = await loadCore();
  const program = rows([
    "addiu $t0,$t0,1", "addiu $t1,$t1,1", "addiu $t2,$t2,1", "bne $t0,$zero,0x00400000"
  ]);
  const recording = [];
  for (let iteration = 0; iteration < 1500; iteration += 1) {
    [0, 1, 2, 3].forEach((index) => recording.push({
      address: at(index),
      step: recording.length + 1,
      writes: index === 0 ? [{ name: "$t0", before: iteration, after: iteration + 1 }] : []
    }));
  }

  const simulator = replay(core, program, recording, { initialRegisters: {} });
  const snapshot = simulator.run(40000);
  assert.ok(snapshot.cycle > 6000, "the loop must actually have been replayed");

  // The per-instruction timeline row grows by one key per cycle its instruction
  // occupies a stage. Storing the row that preceded each change made the
  // history cost the row's size every cycle, so a replay of this size used to
  // exhaust the heap. The history must record the key to remove, not the row.
  const retained = simulator.history.filter((entry) => entry.timelineChanges.some((change) => "row" in change));
  assert.equal(retained.length, 0, "history entries must not retain timeline rows");
  simulator.history.forEach((entry) => {
    entry.timelineChanges.forEach((change) => {
      assert.equal(typeof change.cycle, "number");
      assert.equal(typeof change.index, "number");
    });
  });
});

test("stepping back through a replayed loop restores the timeline exactly", async () => {
  const core = await loadCore();
  const program = rows(["addiu $t0,$t0,1", "addiu $t1,$t1,1", "bne $t0,$zero,0x00400000"]);
  const recording = [];
  for (let iteration = 0; iteration < 12; iteration += 1) {
    [0, 1, 2].forEach((index) => recording.push({
      address: at(index),
      step: recording.length + 1,
      writes: index === 0 ? [{ name: "$t0", before: iteration, after: iteration + 1 }] : []
    }));
  }

  // Rewinding rebuilds each row by removing one key. Reaching cycle N by
  // stepping back must give the same rows as reaching it by stepping forward,
  // or the undo is dropping or keeping the wrong one.
  const forwards = replay(core, program, recording, { initialRegisters: {} });
  for (let cycle = 0; cycle < 14; cycle += 1) forwards.step();
  const expected = plain(forwards.snapshot().timeline);

  const backwards = replay(core, program, recording, { initialRegisters: {} });
  backwards.run(400);
  while (backwards.snapshot().cycle > 14) backwards.back();
  assert.deepEqual(plain(backwards.snapshot().timeline), expected);
  assert.equal(backwards.snapshot().cycle, 14);
});

test("the register log survives its own trimming across a backstep", async () => {
  const core = await loadCore();
  const program = rows(["addiu $t0,$t0,1", "bne $t0,$zero,0x00400000"]);
  const recording = [];
  // Enough commits to cross the trim threshold, which prunes the log and has to
  // adjust every history entry's recorded length by the same amount -- once.
  for (let iteration = 0; iteration < 5000; iteration += 1) {
    recording.push({ address: at(0), step: recording.length + 1, writes: [{ name: "$t0", before: iteration, after: iteration + 1 }] });
    recording.push({ address: at(1), step: recording.length + 1, writes: [] });
  }
  const simulator = replay(core, program, recording, { initialRegisters: {} });
  simulator.run(40000);

  const before = simulator.snapshot().registerLog.length;
  assert.ok(before > 0, "the run must have committed register writes");
  simulator.back();
  const after = simulator.snapshot().registerLog.length;
  assert.ok(after === before || after === before - 1,
    `one backstep may drop at most one commit, but the log went from ${before} to ${after}`);
});

test("the register view reports every register and which ones the program uses", async () => {
  const core = await loadCore();
  const simulator = core.createSimulator(rows(["addiu $t0,$zero,3", "addiu $t1,$zero,7"]), { forwarding: true });
  simulator.run(50);
  const registers = simulator.snapshot().registers;

  // Every architectural register is present, so the interface can offer "all".
  assert.deepEqual(plain(registers).map((entry) => entry.name), plain(core.REGISTER_ORDER));
  // And each says whether this program mentions it, so "used" is a narrower
  // set rather than the same one under a different name.
  assert.deepEqual(plain(registers).filter((entry) => entry.used).map((entry) => entry.name), ["$zero", "$t0", "$t1"]);
  assert.equal(registers.find((entry) => entry.name === "$sp").used, false);
});

test("forwarding still changes the timing of a replayed run", async () => {
  const core = await loadCore();
  const forwarded = replay(core, loopProgram, loopRecording, { forwarding: true }).run(400);
  const stalling = replay(core, loopProgram, loopRecording, { forwarding: false }).run(400);

  // Same instructions, same outcomes, different microarchitecture: the values
  // committed must be identical while the cycle counts differ.
  assert.ok(stalling.cycle > forwarded.cycle,
    "stalling until WB must take longer than forwarding on a dependent sequence");
  assert.deepEqual(
    forwarded.registers.filter((entry) => entry.known).map((entry) => [entry.name, entry.value]),
    stalling.registers.filter((entry) => entry.known).map((entry) => [entry.name, entry.value])
  );
});
