// The guided labs make numerical claims to students. This suite re-runs every
// claim against the real assembler and the real Pipeline Lab model, so a lab
// sheet can never quietly disagree with the tool the student is using.

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
import { createJavaScriptEngine, projectRoot } from "./helpers/engines.mjs";

const labsRoot = resolve(projectRoot, "docs/labs");
const catalog = JSON.parse(await readFile(resolve(labsRoot, "labs.json"), "utf8"));

async function loadCore() {
  const source = await readFile(resolve(projectRoot, "tools/pipeline-lab.js"), "utf8");
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: "tools/pipeline-lab.js" });
  return context.MarsPipelineLabCore;
}

// Assemble with the production engine so the labs exercise the same basic
// forms, addresses and label table the tool receives in the browser.
async function assembleProgram(fileName) {
  const source = await readFile(resolve(labsRoot, "programs", fileName), "utf8");
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const assembled = engine.assemble(source, { sourceName: fileName });
  assert.equal(assembled.ok, true, `${fileName} must assemble: ${assembled.message || ""}`);
  const snapshot = engine.getSnapshot();
  return { textRows: snapshot.textRows, labels: snapshot.labels };
}

test("the lab catalog declares the model version it was measured against", () => {
  assert.equal(catalog.schema, "webmars.pipeline-labs/1");
  assert.equal(catalog.model.id, "webmars.pipeline-lab");
  assert.match(catalog.version, /^\d+\.\d+\.\d+$/);
  assert.equal(typeof catalog.language, "string");
  assert.ok(catalog.labs.length >= 7, "the first lab set covers the seven roadmap topics");
});

test("every lab states duration, prerequisites and objectives", () => {
  catalog.labs.forEach((lab) => {
    assert.ok(lab.minutes > 0, `${lab.id} must state a duration`);
    assert.ok(Array.isArray(lab.prerequisites) && lab.prerequisites.length, `${lab.id} must state prerequisites`);
    assert.ok(lab.objectives.length >= 2, `${lab.id} must state at least two objectives`);
    assert.ok(lab.runs.length >= 1, `${lab.id} must have at least one measured run`);
  });
});

test("every lab sheet and solution exists and names its version", async () => {
  const sheets = await readdir(labsRoot);
  for (const lab of catalog.labs) {
    assert.ok(sheets.includes(lab.file), `missing lab sheet ${lab.file}`);
    const text = await readFile(resolve(labsRoot, lab.file), "utf8");
    assert.ok(text.includes(catalog.version), `${lab.file} must name lab set version ${catalog.version}`);
    assert.match(text, /## Objectives/);
    assert.match(text, /## Prerequisites/);
    assert.match(text, /## Steps/);
    assert.match(text, /## Predict before you run/);
    assert.match(text, /## Reflection/);
    // Answers live in a separate file so a sheet can be handed out as is.
    assert.doesNotMatch(text, /## Answers/);

    const solution = await readFile(resolve(labsRoot, "solutions", lab.file), "utf8");
    assert.match(solution, /## Answers/);
    assert.ok(solution.includes(catalog.version));
  }
});

test("every measured run reproduces exactly on the current model", async () => {
  const core = await loadCore();
  const assembled = new Map();

  for (const lab of catalog.labs) {
    for (const run of lab.runs) {
      if (!assembled.has(run.program)) assembled.set(run.program, await assembleProgram(run.program));
      const { textRows, labels } = assembled.get(run.program);
      const simulator = core.createSimulator(textRows, { ...run.config, labels });
      const result = simulator.run(1000);
      const actual = {
        instructions: textRows.length,
        cycles: result.cycle,
        completed: result.completed,
        stalls: result.metrics.stalls,
        flushes: result.metrics.flushes,
        structuralStalls: result.metrics.structuralStalls,
        mispredicted: result.metrics.branches.mispredicted
      };
      assert.deepEqual(actual, run.expected, `${lab.id} / ${run.program} / ${JSON.stringify(run.config)}`);
      assert.equal(result.done, true, `${lab.id} must run to completion`);
    }
  }
});

test("lab sheets quote only numbers the catalog measured", async () => {
  // A sheet may state a cycle count only if some run in that lab produced it.
  for (const lab of catalog.labs) {
    const text = await readFile(resolve(labsRoot, lab.file), "utf8");
    const allowed = new Set(lab.runs.flatMap((run) => Object.values(run.expected)));
    const quoted = [...text.matchAll(/\*\*(\d+) cycles\*\*/g)].map((match) => Number(match[1]));
    assert.ok(quoted.length > 0, `${lab.file} should quote at least one measured cycle count`);
    quoted.forEach((value) => {
      assert.ok(allowed.has(value), `${lab.file} quotes ${value} cycles, which no run in ${lab.id} produced`);
    });
  }
});

test("the teacher guide points at the labs that exist", async () => {
  const guide = await readFile(resolve(labsRoot, "README.md"), "utf8");
  assert.ok(guide.includes(catalog.version));
  catalog.labs.forEach((lab) => {
    assert.ok(guide.includes(lab.file), `the teacher guide must link ${lab.file}`);
  });
  assert.match(guide, /## Running a lab without the author/);
});
