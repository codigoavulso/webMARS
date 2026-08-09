// The Pipeline Lab against the canonical textbook examples.
//
// Patterson and Hennessy, *Computer Organization and Design*, chapter 4, works
// through a small set of code sequences whose cycle counts and stall behaviour
// are stated in the text and drawn as pipeline diagrams. Those sequences are the
// closest thing to an external oracle this model has: if webMARS disagrees with
// them, the model is wrong, not the book.
//
// Each case below records the textbook's claim in prose and asserts it against
// the model. A case that cannot be expressed in this model is stated as such
// rather than approximated.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

async function loadCore() {
  const source = await readFile(resolve(projectRoot, "tools/pipeline-lab.js"), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: "tools/pipeline-lab.js" });
  return context.MarsPipelineLabCore;
}

function rows(statements, base = 0x00400000) {
  return statements.map((basic, index) => ({
    basic,
    index,
    address: base + index * 4,
    addressHex: `0x${(base + index * 4).toString(16).padStart(8, "0")}`
  }));
}

// The stage each instruction occupied, per cycle, as the book draws it.
// Rebuilt in this realm: an array produced by the vm's own `map` is structurally
// equal but not prototype-equal, which a strict deepEqual rejects.
function diagram(snapshot) {
  return [...snapshot.trace].map((entry) => {
    const cycles = Object.keys(entry.stages).map(Number).sort((left, right) => left - right);
    return cycles.map((cycle) => `C${cycle + 1}:${entry.stages[cycle]}`).join(" ");
  });
}

test("a five-stage pipeline retires one instruction per cycle once full", async () => {
  // COD 4.5: with N independent instructions the pipeline takes N + 4 cycles,
  // four of which are the fill. Steady state is one instruction per cycle.
  const core = await loadCore();
  for (const count of [1, 4, 10, 50]) {
    const program = rows(Array.from({ length: count }, (_unused, index) => `addi $t${index % 8}, $zero, ${index}`));
    const result = core.createSimulator(program, { profile: "forwarding" }).run(500);
    assert.equal(result.cycle, count + 4, `${count} independent instructions should take ${count + 4} cycles`);
    assert.equal(result.completed, count);
    assert.equal(result.metrics.stalls, 0);
  }
});

test("the textbook load-use sequence stalls exactly one cycle with forwarding", async () => {
  // COD 4.7, the canonical hazard sequence:
  //   lw  $2, 20($1)
  //   and $4, $2, $5
  //   or  $8, $2, $6
  //   add $9, $4, $2
  //   slt $1, $6, $7
  // The book states that with forwarding the only unavoidable stall is the
  // load-use pair (lw then and), costing exactly one bubble.
  const core = await loadCore();
  const program = rows([
    "lw $2, 20($1)",
    "and $4, $2, $5",
    "or $8, $2, $6",
    "add $9, $4, $2",
    "slt $1, $6, $7"
  ]);

  const forwarded = core.createSimulator(program, { profile: "forwarding" }).run(500);
  assert.equal(forwarded.metrics.stalls, 1, "exactly one stall survives forwarding");
  assert.equal(forwarded.metrics.hazards["load-use"], 1, "and it is the load-use hazard");
  assert.equal(forwarded.metrics.hazards.raw, 0, "no write-back stall remains");
  // Five instructions, one bubble: 5 + 4 + 1.
  assert.equal(forwarded.cycle, 10);
  assert.equal(forwarded.completed, 5);
});

test("the same sequence without forwarding stalls on every dependency", async () => {
  // COD 4.7 contrasts the forwarded machine with one that must wait for
  // write-back. Each dependent instruction then waits two cycles.
  const core = await loadCore();
  const program = rows([
    "lw $2, 20($1)",
    "and $4, $2, $5",
    "or $8, $2, $6",
    "add $9, $4, $2",
    "slt $1, $6, $7"
  ]);

  const stalling = core.createSimulator(program, { profile: "stall-only" }).run(500);
  assert.ok(stalling.cycle > 10, "stalling until write-back must cost more than forwarding");
  assert.equal(stalling.metrics.hazards["load-use"], 0, "without forwarding every hazard is a plain RAW stall");
  assert.ok(stalling.metrics.hazards.raw >= 3, "each of the three dependencies stalls");
  assert.equal(stalling.completed, 5);
});

test("forwarding sources match the EX/MEM and MEM/WB registers the book names", async () => {
  // COD 4.7 derives the forwarding unit from two sources: the EX/MEM register
  // for a result one instruction old, and MEM/WB for one two instructions old.
  const core = await loadCore();
  const simulator = core.createSimulator(rows([
    "sub $2, $1, $3",
    "and $12, $2, $5",
    "or $13, $6, $2"
  ]), { profile: "forwarding" });

  const seen = new Set();
  for (let step = 0; step < 12; step += 1) {
    simulator.step();
    simulator.snapshot().activeForwarding.forEach((path) => seen.add(path.pipelineRegister));
  }
  assert.deepEqual([...seen].sort(), ["EX/MEM", "MEM/WB"],
    "both forwarding sources described in the text must occur in this sequence");
});

test("a taken-branch penalty matches the resolution stage, as the book derives it", async () => {
  // COD 4.8: the branch penalty is the number of instructions already fetched
  // when the outcome becomes known. Resolving in EX costs two; moving the
  // decision to ID costs one. The book presents both.
  const core = await loadCore();
  const program = rows([
    "add $t1, $t2, $t3",
    "beq $t1, $t4, 0x00400014",
    "add $t5, $t6, $t7",
    "add $s0, $s1, $s2",
    "add $s3, $s4, $s5",
    "add $s6, $s7, $t0"
  ]);

  const inEx = core.createSimulator(program, { profile: "predict-taken" }).run(500);
  const inId = core.createSimulator(program, { profile: "predict-taken", branchResolution: "ID" }).run(500);

  assert.equal(inEx.metrics.branches.mispredicted, 1);
  assert.equal(inEx.metrics.flushes, 2, "resolving in EX discards two instructions");
  assert.equal(inId.metrics.flushes, 1, "resolving in ID discards one");
  assert.equal(inEx.cycle - inId.cycle, 1, "the saved instruction is one cycle");
});

test("a delay slot removes exactly one discarded instruction", async () => {
  // COD 4.8 presents the delay slot as the architectural alternative to
  // flushing: the instruction after the branch always executes, so it is never
  // on the wrong path.
  const core = await loadCore();
  const program = rows([
    "add $t1, $t2, $t3",
    "beq $t1, $t4, 0x00400014",
    "add $t5, $t6, $t7",
    "add $s0, $s1, $s2",
    "add $s3, $s4, $s5",
    "add $s6, $s7, $t0"
  ]);

  const withoutSlot = core.createSimulator(program, { profile: "predict-taken" }).run(500);
  const withSlot = core.createSimulator(program, { profile: "predict-taken", delaySlot: true }).run(500);

  assert.equal(withoutSlot.metrics.flushes - withSlot.metrics.flushes, 1);
  assert.equal(withoutSlot.cycle - withSlot.cycle, 1);
});

test("CPI follows the classic performance equation on these sequences", async () => {
  // COD 1.6 and 4.5: CPI is cycles divided by completed instructions, and a
  // stall raises it by exactly the stall's share of the instruction count.
  const core = await loadCore();
  const clean = core.createSimulator(rows([
    "addi $t0, $zero, 1",
    "addi $t1, $zero, 2",
    "addi $t2, $zero, 3",
    "addi $t3, $zero, 4"
  ]), { profile: "forwarding" }).run(500);

  const stalled = core.createSimulator(rows([
    "lw $t0, 0($sp)",
    "add $t1, $t0, $t0",
    "addi $t2, $zero, 3",
    "addi $t3, $zero, 4"
  ]), { profile: "forwarding" }).run(500);

  assert.equal(clean.cpi, clean.cycle / clean.completed);
  assert.equal(clean.cycle, 8);
  assert.equal(stalled.cycle, clean.cycle + 1, "one bubble costs exactly one cycle");
  assert.ok(stalled.cpi > clean.cpi);
  assert.equal(Number((stalled.cpi - clean.cpi).toFixed(4)), 0.25, "one stall over four instructions raises CPI by 0.25");
});

test("the timing diagram places each instruction one stage behind the previous", async () => {
  // Every pipeline figure in the chapter has the same shape: instruction i+1
  // enters a stage exactly one cycle after instruction i did.
  const core = await loadCore();
  const simulator = core.createSimulator(rows([
    "addi $t0, $zero, 1",
    "addi $t1, $zero, 2",
    "addi $t2, $zero, 3"
  ]), { profile: "forwarding" });
  const snapshot = simulator.run(500);

  assert.deepEqual(diagram(snapshot), [
    "C1:IF C2:ID C3:EX C4:MEM C5:WB",
    "C2:IF C3:ID C4:EX C5:MEM C6:WB",
    "C3:IF C4:ID C5:EX C6:MEM C7:WB"
  ]);
});

test("cases the model cannot express are stated, not approximated", async () => {
  const core = await loadCore();
  // The book's structural-hazard example uses a single unified memory, so an
  // instruction fetch collides with a data access. This model has separate
  // instruction and data paths and charges only the data-memory port, which is
  // the split-cache machine the chapter moves to. The difference is recorded in
  // docs/pipeline-lab.md rather than being papered over here.
  const program = rows(["lw $t0, 0($sp)", "lw $t1, 4($sp)", "add $t2, $zero, $zero"]);
  const result = core.createSimulator(program, { profile: "forwarding", memoryLatency: 2 }).run(500);

  assert.ok(result.metrics.structuralStalls > 0, "the data-memory port is modelled");
  const doc = await readFile(resolve(projectRoot, "docs/pipeline-lab.md"), "utf8");
  assert.match(doc, /latência de fetch de instruções é sempre um ciclo/,
    "the unified-memory limitation must stay documented");
});
