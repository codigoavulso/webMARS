// Mutation testing for the assembler, the runtime and the Pipeline Lab model.
//
// Coverage says a line ran. It does not say the suite would notice if that line
// were wrong. This script answers the second question directly: it edits the
// shipped source to introduce a specific, plausible defect, runs a chosen slice
// of the suite, and records whether the suite failed.
//
//   killed    the tests failed - the defect would have been caught
//   survived  the tests still passed - the defect would have shipped
//   timeout   the mutant hung; counted as killed, since a hang fails CI too
//   invalid   the mutation did not apply, e.g. the anchor text moved
//
// The mutation score is killed / (killed + survived). It is a property of the
// tests, not of the code, and a low score on a mutant is a request for a test,
// not a licence to delete the mutant.
//
// No third-party runner: mutants are hand-written anchored edits rather than
// generated ones, so every entry describes a defect a person could plausibly
// introduce, and the whole thing stays dependency-free like the rest of the
// repository.
//
// Usage:
//   node scripts/mutation-test.mjs                run every mutant
//   node scripts/mutation-test.mjs --id <id>      run one mutant
//   node scripts/mutation-test.mjs --no-write     leave docs/mutation-report.md alone

import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = resolve(projectRoot, "docs/mutation-report.md");
const TIMEOUT_MS = 180000;

const CORE = "assets/js/app-modules/00-core.js";
const PIPELINE = "tools/pipeline-lab.js";

// Test slices. A mutant runs only the suites that could plausibly detect it, so
// a full pass stays minutes rather than hours. A slice that is too narrow shows
// up as a survivor, which is the safe direction to be wrong in.
const SLICES = {
  isa: [
    "tests/core-regression.test.mjs",
    "tests/runtime-regression.test.mjs",
    "tests/runtime-isa-regression.test.mjs",
    "tests/runtime-memory-invariants.test.mjs"
  ],
  assembler: [
    "tests/core-regression.test.mjs",
    "tests/runtime-isa-regression.test.mjs",
    "tests/examples-catalog-regression.test.mjs"
  ],
  pipeline: [
    "tests/pipeline-lab-microarchitecture.test.mjs",
    "tests/tool-runtime-regression.test.mjs",
    "tests/pipeline-labs.test.mjs"
  ]
};

// Each mutant: a unique id, the file, the slice to run, what defect it stands
// for, and either one anchored `find`/`replace` pair or an `edits` array of
// them. Several edits are needed when a guard is duplicated: removing only one
// copy leaves the behaviour unchanged, which measures the redundancy rather
// than the tests.
const MUTANTS = [
  {
    id: "core-signextend-off",
    file: CORE,
    slice: "isa",
    describes: "sign extension of a 16-bit immediate is dropped",
    find: "const signExtend16 = (value) => ((Number(value) || 0) << 16) >> 16;",
    replace: "const signExtend16 = (value) => (Number(value) || 0) & 0xffff;"
  },
  {
    id: "core-branch-inverted",
    file: CORE,
    slice: "isa",
    describes: "beq and bne swap their conditions",
    find: "        const take = opcode === \"beq\"\n          ? this.registers[rs] === this.registers[rt]\n          : this.registers[rs] !== this.registers[rt];",
    replace: "        const take = opcode === \"beq\"\n          ? this.registers[rs] !== this.registers[rt]\n          : this.registers[rs] === this.registers[rt];"
  },
  {
    id: "core-zero-register-writable",
    file: CORE,
    slice: "isa",
    describes: "$zero stops being hard-wired to zero",
    find: "forceZeroRegister() {",
    replace: "forceZeroRegister() {\n    return;"
  },
  {
    id: "core-alignment-check-removed",
    file: CORE,
    slice: "isa",
    describes: "unaligned word reads stop being rejected",
    find: "    this.assertAddressInStrictMemoryModel(addr, 4, \"read\");\n    if (addr % 4 !== 0) {",
    replace: "    this.assertAddressInStrictMemoryModel(addr, 4, \"read\");\n    if (false) {"
  },
  {
    id: "core-directive-unknown-accepted",
    file: CORE,
    slice: "assembler",
    describes: "an unrecognised directive is silently accepted",
    // The rejection is duplicated across the data-segment handler and both
    // assembler passes; all copies have to go or the defect does not exist.
    edits: [
      {
        find: [
          "    errors.push({",
          "      line: lineNumber,",
          `      message: translateText('"{directive}" directive is invalid or not implemented in MARS', { directive })`,
          "    });"
        ].join("\n"),
        replace: "    return;"
      },
      {
        find: "if (!recognizedDirectives.has(directive)) {",
        replace: "if (false) {",
        all: true
      }
    ]
  },
  {
    id: "pipeline-forwarding-ignored",
    file: PIPELINE,
    slice: "pipeline",
    describes: "the forwarding setting stops affecting hazard detection",
    find: "    if (config.forwarding) {",
    replace: "    if (false) {"
  },
  {
    id: "pipeline-loaduse-not-detected",
    file: PIPELINE,
    slice: "pipeline",
    describes: "a load-use hazard stops producing a bubble",
    find: "      if (!producer || producer.bubble || !producer.isLoad) return null;",
    replace: "      return null;"
  },
  {
    id: "pipeline-flush-count-off-by-one",
    file: PIPELINE,
    slice: "pipeline",
    describes: "a misprediction discards one instruction too few",
    find: '            flushStages = (resolutionStage === "EX" ? ["ID", "IF"] : ["IF"]).slice(config.delaySlot ? 1 : 0);',
    replace: '            flushStages = (resolutionStage === "EX" ? ["ID", "IF"] : ["IF"]).slice(config.delaySlot ? 1 : 0).slice(1);'
  },
  {
    id: "pipeline-delayslot-fallthrough",
    file: PIPELINE,
    slice: "pipeline",
    describes: "the delay slot stops shifting the sequential successor",
    find: "      return instruction.index + (this.config.delaySlot && instruction.isControl ? 2 : 1);",
    replace: "      return instruction.index + 1;"
  },
  {
    id: "pipeline-memory-latency-ignored",
    file: PIPELINE,
    slice: "pipeline",
    describes: "configured memory latency stops occupying the MEM stage",
    find: "          memCyclesLeft = nextStages.MEM.usesMemory ? config.memoryLatency : 1;",
    replace: "          memCyclesLeft = 1;"
  },
  {
    id: "pipeline-labels-unresolved",
    file: PIPELINE,
    slice: "pipeline",
    describes: "symbolic branch targets stop resolving against the label table",
    find: "        return token && this.labels.has(token) ? this.labels.get(token) : null;",
    replace: "        return null;"
  },
  {
    id: "pipeline-hash-constant",
    file: PIPELINE,
    slice: "pipeline",
    describes: "the program hash stops depending on the program",
    find: "    return `fnv1a:${hash.toString(16).padStart(8, \"0\")}`;",
    replace: "    return `fnv1a:00000000`;"
  }
];

async function runSlice(files) {
  try {
    await run(process.execPath, ["--test", ...files], {
      cwd: projectRoot,
      timeout: TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024
    });
    return { status: "passed", detail: "" };
  } catch (error) {
    if (error.killed || error.signal) {
      return { status: "timeout", detail: error.signal || "timeout" };
    }
    const detail = String(error.stderr || error.stdout || error.message || "test failure")
      .trim()
      .split(/\r?\n/)
      .slice(-8)
      .join("\n");
    return { status: "failed", detail };
  }
}

// Only one mutant is active at a time. Synchronous writes make restoration
// safe inside signal handlers: there is no pending asynchronous mutation write
// that could finish after the original source has been put back.
let activeMutation = null;

function restoreMutation(mutation = activeMutation) {
  if (!mutation) return;
  writeFileSync(mutation.path, mutation.original, "utf8");
  if (activeMutation === mutation) activeMutation = null;
}

function handleTermination(signal) {
  try {
    if (activeMutation) {
      const relativePath = activeMutation.file;
      restoreMutation();
      process.stderr.write(`\nRestored ${relativePath} after ${signal}.\n`);
    }
  } catch (error) {
    process.stderr.write(`\nCould not restore the active mutation after ${signal}: ${error.message}\n`);
  }
  process.exit(signal === "SIGINT" ? 130 : 143);
}

process.once("SIGINT", () => handleTermination("SIGINT"));
process.once("SIGTERM", () => handleTermination("SIGTERM"));

function applyEdits(source, edits) {
  let mutated = source;
  for (const edit of edits) {
    const occurrences = mutated.split(edit.find).length - 1;
    // An anchor that is missing, or ambiguous when a single hit was intended,
    // means the source moved. Reporting that is the point of the invalid state.
    if (occurrences === 0) return { error: "anchor not found" };
    if (occurrences !== 1 && edit.all !== true) {
      return { error: `anchor found ${occurrences} times, expected exactly 1` };
    }
    mutated = edit.all === true
      ? mutated.split(edit.find).join(edit.replace)
      : mutated.replace(edit.find, edit.replace);
  }
  return { mutated };
}

async function evaluate(mutant) {
  const path = resolve(projectRoot, mutant.file);
  const original = await readFile(path, "utf8");
  const edits = mutant.edits || [{ find: mutant.find, replace: mutant.replace }];
  const { mutated, error } = applyEdits(original, edits);
  if (error) return { ...mutant, outcome: "invalid", detail: error };

  const mutation = { file: mutant.file, path, original };
  activeMutation = mutation;
  try {
    writeFileSync(path, mutated, "utf8");
    const testRun = await runSlice(SLICES[mutant.slice]);
    const outcome = testRun.status === "passed"
      ? "survived"
      : testRun.status === "timeout" ? "timeout" : "killed";
    return { ...mutant, outcome, detail: "" };
  } finally {
    restoreMutation(mutation);
  }
}

async function verifyBaselines(mutants) {
  const slices = [...new Set(mutants.map((mutant) => mutant.slice))];
  for (const slice of slices) {
    process.stdout.write(`baseline ${slice} ... `);
    const result = await runSlice(SLICES[slice]);
    if (result.status !== "passed") {
      process.stdout.write(`${result.status}\n`);
      throw new Error(
        `Baseline slice '${slice}' ${result.status} before mutation; aborting without changing source.`
        + (result.detail ? `\n${result.detail}` : "")
      );
    }
    process.stdout.write("passed\n");
  }
}

function buildReport(results, version) {
  const killed = results.filter((entry) => entry.outcome === "killed" || entry.outcome === "timeout");
  const survived = results.filter((entry) => entry.outcome === "survived");
  const invalid = results.filter((entry) => entry.outcome === "invalid");
  const scored = killed.length + survived.length;
  const score = scored ? (killed.length / scored) * 100 : 0;

  const rows = results.map((entry) => {
    const status = { killed: "killed", timeout: "killed (timeout)", survived: "**SURVIVED**", invalid: "invalid" }[entry.outcome];
    return `| \`${entry.id}\` | \`${entry.file}\` | ${entry.describes} | ${status} |`;
  }).join("\n");

  return `# webMARS mutation report

Generated by \`scripts/mutation-test.mjs\` for webMARS ${version}.
Regenerate with \`npm run mutation\`. Do not edit this file by hand.

## What this measures

Coverage says a line ran. It does not say the suite would notice if that line
were wrong. Each mutant below introduces one specific, plausible defect into
the shipped source, runs the suites that could plausibly detect it, and records
whether they failed.

- **killed** - the tests failed, so the defect would have been caught.
- **survived** - the tests still passed, so the defect would have shipped.
- **invalid** - the mutation did not apply, usually because the anchored source
  moved. An invalid mutant measures nothing and is excluded from the score.

The mutation score is \`killed / (killed + survived)\`. It is a property of the
tests, not of the code. A survivor is a request for a test; it is never a
reason to delete the mutant.

Mutants are hand-written and anchored rather than machine-generated, so every
one of them describes a defect a person could plausibly introduce. That keeps
the set small and meaningful, at the cost of not being exhaustive: a high score
here does not mean the suite would catch every possible fault.

## Result

| Metric | Value |
| --- | --- |
| Mutation score | ${score.toFixed(1)}% |
| Killed | ${killed.length} |
| Survived | ${survived.length} |
| Invalid | ${invalid.length} |
| Total mutants | ${results.length} |

## Mutants

| Id | File | Defect introduced | Outcome |
| --- | --- | --- | --- |
${rows}

${survived.length
    ? `## Survivors to address\n\n${survived.map((entry) => `- \`${entry.id}\` (\`${entry.file}\`): ${entry.describes}. No test in the \`${entry.slice}\` slice fails when this is broken.`).join("\n")}`
    : "## Survivors to address\n\nNone: every mutant in this set is detected by the suite."}

${invalid.length
    ? `## Invalid mutants\n\n${invalid.map((entry) => `- \`${entry.id}\`: ${entry.detail}. Re-anchor it against the current source.`).join("\n")}`
    : ""}

## Method

- Every selected test slice passes once against the unmodified tree before any
  mutant is written. A broken baseline aborts the run instead of earning false
  "killed" results.
- The mutated file is restored synchronously from memory both in a \`finally\`
  block and in the \`SIGINT\`/\`SIGTERM\` handlers, so an interrupted run cannot
  leave a mutation in the working tree.
- Each mutant runs only the suites that could detect it, listed in the script's
  \`SLICES\` table. A slice that is too narrow shows up as a survivor, which is
  the safe direction to be wrong in.
- A mutant that hangs is counted as killed: a hang fails CI just as a failing
  assertion does.
`;
}

async function main() {
  const idIndex = process.argv.indexOf("--id");
  const only = idIndex === -1 ? null : process.argv[idIndex + 1];
  const write = !process.argv.includes("--no-write");
  const selected = only ? MUTANTS.filter((mutant) => mutant.id === only) : MUTANTS;
  if (!selected.length) {
    process.stderr.write(`No mutant matches '${only}'.\n`);
    process.exitCode = 1;
    return;
  }

  await verifyBaselines(selected);

  const results = [];
  for (const mutant of selected) {
    process.stdout.write(`${mutant.id} ... `);
    const result = await evaluate(mutant);
    results.push(result);
    process.stdout.write(`${result.outcome}${result.detail ? ` (${result.detail})` : ""}\n`);
  }

  const version = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version;
  if (write && !only) await writeFile(reportPath, buildReport(results, version), "utf8");

  const survived = results.filter((entry) => entry.outcome === "survived");
  const invalid = results.filter((entry) => entry.outcome === "invalid");
  const killed = results.length - survived.length - invalid.length;
  process.stdout.write(`\n${killed} killed, ${survived.length} survived, ${invalid.length} invalid.\n`);
  if (survived.length || invalid.length) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  process.stderr.write(`[mutation] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
