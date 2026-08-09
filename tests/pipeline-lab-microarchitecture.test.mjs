// Microarchitecture tests for the Pipeline Lab timing model.
//
// These are deliberately separate from the ISA regression suites: nothing here
// asserts what a program computes, only how many cycles the cycle-accurate
// model claims it takes and why. A failure means the timing model moved, which
// invalidates published pipeline reports even when the functional runtime is
// unchanged.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

const pipelineLabPath = resolve(projectRoot, "tools/pipeline-lab.js");

// Objects built inside the VM realm are structurally equal but not
// prototype-equal, so comparisons round-trip through JSON first.
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

async function loadCore() {
  const source = await readFile(pipelineLabPath, "utf8");
  const context = vm.createContext({});
  // Naming the script lets V8 coverage attribute it to the real file.
  vm.runInContext(source, context, { filename: "tools/pipeline-lab.js" });
  return context.MarsPipelineLabCore;
}

// Assembled rows carry real addresses so branch targets resolve to indexes.
function rows(statements, base = 0x00400000) {
  return statements.map((basic, index) => ({
    basic,
    index,
    address: base + index * 4,
    addressHex: `0x${(base + index * 4).toString(16).padStart(8, "0")}`
  }));
}

const branchProgram = rows([
  "beq $t0,$t1,0x00400010",
  "add $t2,$t3,$t4",
  "add $t5,$t6,$t7",
  "add $s0,$s1,$s2",
  "add $s3,$s4,$s5",
  "add $s6,$s7,$t0"
]);

test("profiles are named and versioned so reports stay comparable", async () => {
  const core = await loadCore();
  const ids = plain(core.PROFILES).map((profile) => profile.id);
  assert.deepEqual(ids, [
    "stall-only", "forwarding", "delay-slot", "predict-taken",
    "early-resolution", "slow-memory", "strict-traps", "bht-dynamic"
  ]);
  core.PROFILES.forEach((profile) => {
    assert.equal(typeof profile.label, "string");
    assert.ok(profile.version >= 1);
    assert.equal(profile.config.outcomeModel, "sequential");
  });
});

test("always-not-taken prediction never mispredicts a fall-through branch", async () => {
  const core = await loadCore();
  const result = core.createSimulator(branchProgram, { forwarding: true }).run(200);

  assert.equal(result.metrics.branches.total, 1);
  assert.equal(result.metrics.branches.mispredicted, 0);
  assert.equal(result.metrics.flushes, 0);
  assert.equal(result.cycle, 10);
});

test("always-taken prediction costs two flushed instructions when resolved in EX", async () => {
  const core = await loadCore();
  const result = core.createSimulator(branchProgram, {
    forwarding: true,
    branchPrediction: "taken"
  }).run(200);

  assert.equal(result.metrics.branches.mispredicted, 1);
  assert.equal(result.metrics.flushes, 2);
  assert.equal(result.metrics.hazards.control, 1);
  assert.equal(result.cycle, 12);
  assert.equal(result.completed, 6);
  assert.equal(result.trace.filter((entry) => entry.flushed).length, 2);
});

test("a delay slot and earlier resolution each remove one flushed instruction", async () => {
  const core = await loadCore();
  const delaySlot = core.createSimulator(branchProgram, {
    forwarding: true,
    branchPrediction: "taken",
    delaySlot: true
  }).run(200);
  const earlyResolution = core.createSimulator(branchProgram, {
    forwarding: true,
    branchPrediction: "taken",
    branchResolution: "ID"
  }).run(200);

  assert.equal(delaySlot.metrics.flushes, 1);
  assert.equal(delaySlot.cycle, 11);
  assert.equal(earlyResolution.metrics.flushes, 1);
  assert.equal(earlyResolution.cycle, 11);
});

test("delay slots keep the sequential successor after an untaken branch", async () => {
  const core = await loadCore();
  const result = core.createSimulator(branchProgram, { forwarding: true, delaySlot: true }).run(200);

  assert.equal(result.metrics.flushes, 0);
  assert.equal(result.completed, 6);
  assert.equal(result.trace.length, 6, "no instruction is fetched twice");
});

test("memory latency produces structural stalls, not data stalls", async () => {
  const core = await loadCore();
  const program = rows(["lw $t0,0($t1)", "add $t2,$t4,$t5", "add $t6,$t7,$t8"]);
  const fast = core.createSimulator(program, { forwarding: true }).run(200);
  const slow = core.createSimulator(program, { forwarding: true, memoryLatency: 3 }).run(200);

  assert.equal(fast.metrics.structuralStalls, 0);
  assert.equal(slow.metrics.structuralStalls, 2);
  assert.equal(slow.metrics.hazards.structural, 2);
  assert.equal(slow.metrics.dataStalls, 0);
  assert.equal(slow.cycle, fast.cycle + 2);
  assert.equal(slow.completed, 3);
});

test("load-use and write-back stalls are counted as data hazards by type", async () => {
  const core = await loadCore();
  const program = rows(["lw $t0,0($t1)", "add $t2,$t0,$t3"]);
  const forwarded = core.createSimulator(program, { forwarding: true }).run(200);
  const stalling = core.createSimulator(program, { forwarding: false }).run(200);

  assert.equal(forwarded.metrics.hazards["load-use"], 1);
  assert.equal(forwarded.metrics.hazards.raw, 0);
  assert.equal(stalling.metrics.hazards.raw, 2);
  assert.equal(stalling.metrics.dataStalls, 2);
});

test("serialized traps hold instruction fetch until the trapping instruction retires", async () => {
  const core = await loadCore();
  const program = rows(["li $v0,1", "syscall", "add $t0,$t1,$t2"]);
  const relaxed = core.createSimulator(program, { forwarding: true }).run(200);
  const strict = core.createSimulator(program, { forwarding: true, serializeTraps: true }).run(200);

  assert.equal(relaxed.metrics.exceptionStalls, 0);
  assert.equal(relaxed.cycle, 7);
  assert.equal(strict.metrics.exceptionStalls, 4);
  assert.equal(strict.cycle, 11);
  assert.equal(strict.completed, 3);
});

test("the backward-taken outcome model terminates and re-traces the loop body", async () => {
  const core = await loadCore();
  const program = rows([
    "add $t0,$t0,$t1",
    "bne $t0,$t2,0x00400000",
    "add $t3,$t3,$t4"
  ]);
  const result = core.createSimulator(program, {
    forwarding: true,
    outcomeModel: "backward-taken",
    loopIterations: 3
  }).run(500);

  assert.equal(result.done, true);
  assert.equal(result.metrics.branches.taken, 3);
  assert.equal(result.metrics.branches.notTaken, 1);
  assert.equal(result.trace.filter((entry) => entry.index === 0).length, 4);
});

test("unsupported and unmodelled opcodes are reported instead of silently timed", async () => {
  const core = await loadCore();
  const result = core.createSimulator(rows([
    "add.s $f0,$f1,$f2",
    "mfc1 $t0,$f0",
    "add $t1,$t2,$t3"
  ]), { forwarding: true }).run(200);

  assert.deepEqual(plain(result.unmodelled).map((entry) => entry.opcode), ["add.s", "mfc1"]);
  assert.equal(result.program[2].timingModelled, true);
});

test("each stall, flush and trap records an explainable event", async () => {
  const core = await loadCore();
  const simulator = core.createSimulator(rows([
    "lw $t0,0($t1)",
    "add $t2,$t0,$t3",
    "beq $t2,$t3,0x00400000"
  ]), { forwarding: true, branchPrediction: "taken" });
  const result = simulator.run(200);
  const kinds = plain(result.events).map((event) => `${event.type}:${event.reason}`);

  assert.ok(kinds.includes("data:load-use"));
  assert.ok(kinds.includes("control:misprediction"));
  result.events.forEach((event) => {
    assert.ok(event.cycle >= 1);
    assert.equal(typeof event.instructionText, "string");
  });
});

test("dependencies name the instruction that produced each source register", async () => {
  const core = await loadCore();
  const result = core.createSimulator(rows([
    "add $t0,$t1,$t2",
    "sub $t3,$t0,$t4"
  ])).run(200);

  assert.deepEqual(plain(result.program[0].dependencies), []);
  assert.deepEqual(plain(result.program[1].dependencies), [{ register: "$t0", producerIndex: 0 }]);
});

test("an instruction trace lists every cycle and stage it occupied", async () => {
  const core = await loadCore();
  const simulator = core.createSimulator(rows(["lw $t0,0($t1)", "add $t2,$t0,$t3"]), { forwarding: true });
  simulator.run(200);

  assert.deepEqual(plain(simulator.instructionTrace(0).stages), [
    { cycle: 1, stage: "IF" },
    { cycle: 2, stage: "ID" },
    { cycle: 3, stage: "EX" },
    { cycle: 4, stage: "MEM" },
    { cycle: 5, stage: "WB" }
  ]);
  assert.equal(simulator.instructionTrace(99), null);
});

test("backstep restores metrics, events and the trace exactly", async () => {
  const core = await loadCore();
  const simulator = core.createSimulator(branchProgram, {
    forwarding: true,
    branchPrediction: "taken"
  });
  for (let step = 0; step < 6; step += 1) simulator.step();
  const before = JSON.parse(JSON.stringify(simulator.report()));
  simulator.step();
  simulator.step();
  simulator.back();
  simulator.back();

  assert.deepEqual(JSON.parse(JSON.stringify(simulator.report())), before);
});

test("reports carry the version, profile and program hash needed to reproduce them", async () => {
  const core = await loadCore();
  const simulator = core.createSimulator(branchProgram, { profile: "predict-taken" });
  simulator.run(200);
  const report = simulator.report();

  assert.equal(report.schema, "webmars.pipeline-report/1");
  assert.equal(report.model.id, "webmars.pipeline-lab");
  assert.equal(report.profile.id, "predict-taken");
  assert.equal(report.profile.version, 1);
  assert.match(report.program.hash, /^fnv1a:[0-9a-f]{8}$/);
  assert.equal(report.metrics.cycles, 12);
  assert.equal(report.timeline.length, 8);
  assert.equal(report.timeline[0].stages[1], "IF");

  // The same program and configuration must hash and time identically.
  const repeat = core.createSimulator(branchProgram, { profile: "predict-taken" });
  repeat.run(200);
  assert.deepEqual(plain(repeat.report()), plain(report));
});

// A report identifies its program only by hash. A hash that stops depending on
// the program silently makes two different runs look like the same one, which
// is exactly the claim the evidence package rests on.
test("the program hash distinguishes programs and ignores configuration", async () => {
  const core = await loadCore();
  const hashOf = (statements, config = {}) => core.createSimulator(rows(statements), config).snapshot().programHash;

  const base = hashOf(["add $t0,$t1,$t2", "sub $t3,$t0,$t4"]);
  assert.match(base, /^fnv1a:[0-9a-f]{8}$/);

  // Same program, different configuration: the hash must not move.
  assert.equal(hashOf(["add $t0,$t1,$t2", "sub $t3,$t0,$t4"], { profile: "predict-taken" }), base);

  // A different opcode, a different register, a different order and a
  // different length must each produce a different hash.
  assert.notEqual(hashOf(["addu $t0,$t1,$t2", "sub $t3,$t0,$t4"]), base);
  assert.notEqual(hashOf(["add $t0,$t1,$t5", "sub $t3,$t0,$t4"]), base);
  assert.notEqual(hashOf(["sub $t3,$t0,$t4", "add $t0,$t1,$t2"]), base);
  assert.notEqual(hashOf(["add $t0,$t1,$t2"]), base);

  // The exported report carries the same value.
  const simulator = core.createSimulator(rows(["add $t0,$t1,$t2", "sub $t3,$t0,$t4"]));
  simulator.run(100);
  assert.equal(simulator.report().program.hash, base);
});

test("CSV export covers both the timeline and the metric summary", async () => {
  const core = await loadCore();
  const simulator = core.createSimulator(rows(["lw $t0,0($t1)", "add $t2,$t0,$t3"]), { forwarding: true });
  simulator.run(200);

  const timeline = simulator.toCSV("timeline").split("\n");
  assert.equal(timeline[0], "uid,index,address,instruction,flushed,C1,C2,C3,C4,C5,C6,C7");
  assert.equal(timeline.length, 3);
  assert.match(timeline[2], /^1,1,0x00400004,"add \$t2,\$t0,\$t3",no,/);

  const metrics = simulator.toCSV("metrics");
  assert.match(metrics, /^metric,value$/m);
  assert.match(metrics, /^config_forwarding,true$/m);
  assert.match(metrics, /^program_hash,fnv1a:[0-9a-f]{8}$/m);
  assert.match(metrics, /^hazards_load-use,1$/m);
});

test("control lines are derived per instruction for the architecture view", async () => {
  const core = await loadCore();
  const decoded = plain(["add $t0,$t1,$t2", "lw $t0,0($t1)", "sw $t0,0($t1)", "beq $t0,$t1,0x00400000"]
    .map((basic, index) => core.decodeInstruction({ basic }, index)));

  assert.deepEqual(decoded[0].control, {
    RegWrite: true, MemRead: false, MemWrite: false, MemToReg: false,
    ALUSrc: false, RegDst: true, Branch: false, Jump: false
  });
  assert.deepEqual(decoded[1].control, {
    RegWrite: true, MemRead: true, MemWrite: false, MemToReg: true,
    ALUSrc: true, RegDst: false, Branch: false, Jump: false
  });
  assert.equal(decoded[2].control.MemWrite, true);
  assert.equal(decoded[2].control.RegWrite, false);
  assert.equal(decoded[3].control.Branch, true);
});

test("forwarding paths name their source pipeline register", async () => {
  const core = await loadCore();
  const simulator = core.createSimulator(rows([
    "add $t0,$t1,$t2",
    "sub $t3,$t0,$t4",
    "or $t5,$t0,$t6"
  ]), { forwarding: true });

  // Cycle 4 puts the consumer in EX with its producer in MEM (EX/MEM).
  for (let step = 0; step < 4; step += 1) simulator.step();
  const first = plain(simulator.snapshot().activeForwarding);
  assert.deepEqual(first, [{
    from: "MEM", pipelineRegister: "EX/MEM", to: "EX", register: "$t0",
    producerText: "add $t0,$t1,$t2", consumerText: "sub $t3,$t0,$t4"
  }]);

  simulator.step();
  const second = plain(simulator.snapshot().activeForwarding);
  assert.deepEqual(second.map((path) => [path.pipelineRegister, path.register]), [["MEM/WB", "$t0"]]);
});

test("no forwarding path is reported when the configuration has no forwarding", async () => {
  const core = await loadCore();
  const simulator = core.createSimulator(rows(["add $t0,$t1,$t2", "sub $t3,$t0,$t4"]), { forwarding: false });
  simulator.run(200);

  assert.deepEqual(plain(simulator.snapshot().activeForwarding), []);
});

test("the architecture view is wired to the model, not to hard-coded values", async () => {
  const source = await readFile(pipelineLabPath, "utf8");

  assert.match(source, /data-plab-view-tab="architecture"/);
  assert.match(source, /buildDatapathMarkup\(\)/);
  // Every signal group the tool offers must exist in the drawing.
  for (const group of ["control", "forwarding", "hazard", "values"]) {
    assert.match(source, new RegExp(`data-plab-group="${group}"`));
    assert.match(source, new RegExp(`data-group="${group}"`));
  }
  for (const line of ["RegWrite", "MemRead", "MemWrite", "MemToReg", "ALUSrc", "RegDst", "Branch"]) {
    assert.ok(source.includes(`"${line}"`), `control line ${line} must reach the datapath`);
  }
  for (const register of ["IF/ID", "ID/EX", "EX/MEM", "MEM/WB"]) {
    assert.ok(source.includes(`"${register}"`), `pipeline register ${register} must be drawn`);
  }
  // Static labels go through the catalog so the diagram is translatable.
  assert.match(source, /node\.textContent = t\(source\);/);
});

test("the tool stays subscribed to runtime snapshots after the first assembly", async () => {
  const [source, managerSource] = await Promise.all([
    readFile(pipelineLabPath, "utf8"),
    readFile(resolve(projectRoot, "assets/js/app-modules/12-ui-tool-manager.js"), "utf8")
  ]);

  // activeInstances() drops any tool whose isConnected() is false, so a tool
  // with no connect control must report true or it only ever sees the seed
  // snapshot captured when its window is created.
  assert.match(managerSource, /isRuntimeActive: typeof instance\.isConnected === "function"/);
  assert.match(source, /isConnected: \(\) => true/);
  assert.doesNotMatch(source, /isConnected: \(\) => false/);
});

test("configurations are comparable side by side on the same program", async () => {
  const core = await loadCore();
  const results = core.compareConfigurations(rows([
    "lw $t0,0($t1)",
    "add $t2,$t0,$t3",
    "sub $t4,$t2,$t5"
  ]));

  assert.equal(results.length, core.PROFILES.length);
  const byId = Object.fromEntries(plain(results).map((entry) => [entry.profile, entry]));
  assert.ok(byId.forwarding.cycles < byId["stall-only"].cycles, "forwarding removes stalls");
  assert.ok(byId["slow-memory"].cycles > byId.forwarding.cycles, "slower memory costs cycles");
  results.forEach((entry) => {
    assert.equal(entry.completed, 3);
    assert.ok(entry.version >= 1);
  });
});
