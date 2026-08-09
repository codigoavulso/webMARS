// The Pipeline Lab's branch history table against the BHT Simulator's.
//
// Two tools that both claim to model "a branch history table" are only useful
// together if they model the *same* one. These tests extract the predictor from
// each and drive them through identical outcome sequences: a divergence is a
// defect, not a variant.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

const pipelinePath = resolve(projectRoot, "tools/pipeline-lab.js");
const bhtPath = resolve(projectRoot, "tools/bht-simulator.js");

async function loadPipelineCore() {
  const source = await readFile(pipelinePath, "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: "tools/pipeline-lab.js" });
  return context.MarsPipelineLabCore;
}

// The BHT Simulator has no exported core, so its entry class is lifted out of
// the source. If that extraction stops working, the comparison below is
// meaningless, so the test says so rather than passing quietly.
async function loadBhtEntryClass() {
  const source = await readFile(bhtPath, "utf8");
  const start = source.indexOf("class BHTEntry {");
  assert.notEqual(start, -1, "the BHT Simulator no longer defines BHTEntry; re-anchor this test");
  const end = source.indexOf("\n  }", source.indexOf("predictionText()", start));
  const classSource = source.slice(start, end + 4);
  const context = vm.createContext({ t: (text) => text });
  vm.runInContext(`${classSource}\nglobalThis.BHTEntry = BHTEntry;`, context, { filename: "tools/bht-simulator.js" });
  return context.BHTEntry;
}

function rows(statements, base = 0x00400000) {
  return statements.map((basic, index) => ({
    basic,
    index,
    address: base + index * 4,
    addressHex: `0x${(base + index * 4).toString(16).padStart(8, "0")}`
  }));
}

test("both tools index the table the same way", async () => {
  const core = await loadPipelineCore();
  const bhtSource = await readFile(bhtPath, "utf8");

  // The BHT Simulator computes ((address >>> 2) % entries).
  assert.match(bhtSource, /\(\(address >>> 2\) % entries\) >>> 0/,
    "the BHT Simulator's index formula changed; the Pipeline Lab must follow");

  const table = core.createBranchTable({ bhtEntries: 16, bhtHistorySize: 1, bhtInitialTaken: false });
  [0x00400000, 0x00400004, 0x00400040, 0x0040003c].forEach((address) => {
    assert.equal(core.branchTableIndex(table, address), ((address >>> 2) % 16) >>> 0);
  });
  // Two addresses 16 words apart must collide in a 16-entry table.
  assert.equal(core.branchTableIndex(table, 0x00400000), core.branchTableIndex(table, 0x00400040));
});

test("the two predictors agree on every step of an outcome sequence", async () => {
  const core = await loadPipelineCore();
  const BHTEntry = await loadBhtEntryClass();

  // Patterns chosen to exercise the rule that matters: a wrong prediction only
  // flips the entry when the whole history agrees with the new outcome.
  const sequences = [
    [true, true, true, true, true],
    [false, false, false, false],
    [true, false, true, false, true, false],
    [true, true, false, true, true, false, true, true],
    [false, true, true, true, false, false, false, true]
  ];

  for (const historySize of [1, 2]) {
    for (const initialTaken of [false, true]) {
      for (const outcomes of sequences) {
        const reference = new BHTEntry(historySize, initialTaken);
        const table = core.createBranchTable({
          bhtEntries: 8, bhtHistorySize: historySize, bhtInitialTaken: initialTaken
        });
        const address = 0x00400000;
        const label = `history=${historySize} init=${initialTaken} outcomes=${outcomes.join(",")}`;

        outcomes.forEach((taken, step) => {
          assert.equal(
            core.branchTablePredicts(table, address),
            reference.prediction === true,
            `${label}: prediction diverged before step ${step}`
          );
          core.updateBranchTable(table, address, taken);
          reference.update(taken);
        });

        assert.equal(core.branchTablePredicts(table, address), reference.prediction === true,
          `${label}: final prediction diverged`);
      }
    }
  }
});

test("a settled pattern is not overturned by a single surprise", async () => {
  // With a two-deep history, one contrary outcome must not flip the entry;
  // two in a row must. This is the property the shared update rule exists for.
  const core = await loadPipelineCore();
  const table = core.createBranchTable({ bhtEntries: 8, bhtHistorySize: 2, bhtInitialTaken: true });
  const address = 0x00400000;

  assert.equal(core.branchTablePredicts(table, address), true);
  core.updateBranchTable(table, address, false);
  assert.equal(core.branchTablePredicts(table, address), true, "one surprise must not flip a settled entry");
  core.updateBranchTable(table, address, false);
  assert.equal(core.branchTablePredicts(table, address), false, "two agreeing surprises must flip it");
});

test("the model learns across iterations of a loop", async () => {
  const core = await loadPipelineCore();
  // A backward branch taken several times: a static not-taken predictor
  // mispredicts every iteration, while the table should stop mispredicting once
  // it has learned the pattern.
  const program = rows([
    "add $t0,$t0,$t1",
    "bne $t0,$t2,0x00400000",
    "add $t3,$t3,$t4"
  ]);
  const options = { forwarding: true, outcomeModel: "backward-taken", loopIterations: 6 };

  const staticNotTaken = core.createSimulator(program, options).run(1000);
  const dynamic = core.createSimulator(program, { ...options, branchPrediction: "bht" }).run(1000);

  assert.equal(staticNotTaken.metrics.branches.taken, 6);
  assert.equal(dynamic.metrics.branches.taken, 6, "the outcome model is unchanged by the predictor");
  assert.ok(
    dynamic.metrics.branches.mispredicted < staticNotTaken.metrics.branches.mispredicted,
    `a learning predictor must beat always-not-taken on a loop: ${dynamic.metrics.branches.mispredicted} vs ${staticNotTaken.metrics.branches.mispredicted}`
  );
  assert.ok(dynamic.cycle < staticNotTaken.cycle, "fewer mispredictions must mean fewer cycles");
});

test("the table is restored exactly by backstep", async () => {
  const core = await loadPipelineCore();
  const simulator = core.createSimulator(rows([
    "add $t0,$t0,$t1",
    "bne $t0,$t2,0x00400000",
    "add $t3,$t3,$t4"
  ]), { forwarding: true, branchPrediction: "bht", outcomeModel: "backward-taken", loopIterations: 4 });

  for (let step = 0; step < 14; step += 1) simulator.step();
  const before = JSON.parse(JSON.stringify(simulator.snapshot().branchTable));
  simulator.step();
  simulator.step();
  simulator.back();
  simulator.back();

  assert.deepEqual(JSON.parse(JSON.stringify(simulator.snapshot().branchTable)), before);
});

test("the table is reported only when the table is in use", async () => {
  const core = await loadPipelineCore();
  const program = rows(["beq $t0,$t1,0x00400000", "add $t2,$t3,$t4"]);

  assert.equal(core.createSimulator(program, { profile: "forwarding" }).run(100).branchTable, null,
    "a static predictor must not report a table it does not have");

  const dynamic = core.createSimulator(program, { profile: "bht-dynamic" }).run(100);
  assert.ok(dynamic.branchTable, "the bht profile must report its table");
  assert.equal(dynamic.branchTable.entries, 16);
  assert.equal(dynamic.branchTable.historySize, 1);
  assert.ok(dynamic.branchTable.rows.length >= 1, "the branch that executed must occupy an entry");
});

test("the configuration choices match the ones the BHT Simulator offers", async () => {
  const core = await loadPipelineCore();
  const bhtSource = await readFile(bhtPath, "utf8");

  core.BHT_ENTRY_CHOICES.forEach((entries) => {
    assert.match(bhtSource, new RegExp(`value="${entries}"`),
      `the BHT Simulator does not offer ${entries} entries; the two tools must stay configurable alike`);
  });
  assert.deepEqual([...core.BHT_HISTORY_CHOICES], [1, 2]);
});
