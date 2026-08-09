// Guards the public evidence package: the compatibility matrix must describe
// the committed code, and the citation metadata must describe the committed
// release. Both are things an external reader is invited to trust, so a stale
// file here is a correctness failure, not a documentation nit.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

const run = promisify(execFile);
const matrixPath = resolve(projectRoot, "docs/comparison-matrix.md");
const citationPath = resolve(projectRoot, "CITATION.cff");

async function currentVersion() {
  return JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version;
}

test("the compatibility matrix is regenerated from the current code", async () => {
  const before = await readFile(matrixPath, "utf8");
  await run(process.execPath, [resolve(projectRoot, "scripts/generate-comparison-matrix.mjs")], { cwd: projectRoot });
  const after = await readFile(matrixPath, "utf8");

  assert.equal(after, before, "run `npm run docs:matrix` and commit the result");
});

test("every matrix row carries one of the four declared capability classes", async () => {
  const matrix = await readFile(matrixPath, "utf8");
  const allowed = new Set(["complete", "partial", "webMARS extension", "not supported"]);

  // Some sections list a layout rather than a capability - the MMIO register
  // offsets, for instance. Applying the capability rule to those would force a
  // meaningless grade onto a table of addresses, so the check is scoped to the
  // sections that actually make a support claim.
  const layoutSections = new Set(["Bitmap and terminal register layout"]);
  let section = "";
  let checked = 0;

  matrix.split("\n").forEach((line) => {
    const heading = /^#{2,3}\s+(.*)$/.exec(line);
    if (heading) {
      section = heading[1].trim();
      return;
    }
    if (!line.startsWith("| `")) return;
    if (layoutSections.has(section)) return;
    checked += 1;
    const cells = line.split("|").map((cell) => cell.trim());
    assert.ok(
      cells.some((cell) => allowed.has(cell)),
      `row without a declared capability class in "${section}": ${line}`
    );
  });

  assert.ok(checked > 200, "the matrix should cover the full instruction set");
  assert.doesNotMatch(matrix, /\|\s*[ABCD]\s*\|/, "the matrix must not use opaque A/B/C/D grading");
});

test("syscall evidence requires a real setup and invocation in an automated test", async () => {
  const matrix = await readFile(matrixPath, "utf8");
  const rowFor = (number, name) => matrix.split("\n")
    .find((line) => line.startsWith(`| ${number} | \`${name}\` |`));

  const printInt = rowFor(1, "PrintInt");
  assert.ok(printInt, "the PrintInt row must exist");
  assert.match(printInt, /\| complete \|/, "PrintInt has direct runtime coverage");
  assert.match(printInt, /tests\/.*\.test\.mjs/);
  assert.doesNotMatch(
    printInt,
    /accessibility\.test\.mjs/,
    "a contrast ratio such as 21:1 is not evidence that syscall 1 was exercised"
  );

  const printBinary = rowFor(35, "PrintIntBinary");
  assert.ok(printBinary, "the PrintIntBinary row must exist");
  assert.match(
    printBinary,
    /\| partial \|.*_no direct evidence_/,
    "an implemented syscall without a semantic automated test must remain partial"
  );
});

test("the matrix separates functional support from pipeline timing", async () => {
  const matrix = await readFile(matrixPath, "utf8");

  assert.match(matrix, /is never cycle-accurate/);
  assert.match(matrix, /Timing claims belong exclusively to the Pipeline Lab/);
  assert.match(matrix, /## Known differences from MARS 4\.5/);
  assert.match(matrix, /## Differences from the Patterson and Hennessy model/);
  assert.match(matrix, /## Limitations known at/);
});

// Every generated report, the command that produces it, and the npm script that
// runs that command. A report that exists but is unreachable, or a command
// documented but undefined, both defeat the point of publishing evidence.
const EVIDENCE_REPORTS = Object.freeze([
  { file: "docs/comparison-matrix.md", script: "docs:matrix", generator: "scripts/generate-comparison-matrix.mjs" },
  { file: "docs/mars-conformance.md", script: "differential", generator: "scripts/differential-mars.mjs" },
  { file: "docs/coverage-report.md", script: "coverage", generator: "scripts/measure-coverage.mjs" },
  { file: "docs/mutation-report.md", script: "mutation", generator: "scripts/mutation-test.mjs" },
  { file: "docs/benchmark.md", script: "benchmark", generator: "scripts/benchmark.mjs" },
  { file: "docs/accessibility.md", script: "audit:a11y", generator: "scripts/audit-accessibility.mjs" }
]);

test("every evidence report exists, is generated, and says so", async () => {
  const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
  for (const report of EVIDENCE_REPORTS) {
    const text = await readFile(resolve(projectRoot, report.file), "utf8");
    assert.ok(
      text.includes(report.generator),
      `${report.file} must name the script that generated it`
    );
    assert.match(
      text,
      /Do not edit this file by hand/,
      `${report.file} must warn against hand editing`
    );
    assert.ok(packageJson.scripts[report.script], `package.json defines no "${report.script}" script`);
    // The generator itself must exist, or the instruction is a dead end.
    await readFile(resolve(projectRoot, report.generator), "utf8");
  }
});

test("the evidence index links every report and refuses the claims it cannot make", async () => {
  const evidence = await readFile(resolve(projectRoot, "docs/evidence.md"), "utf8");
  EVIDENCE_REPORTS.forEach((report) => {
    const name = report.file.replace("docs/", "");
    assert.ok(evidence.includes(name), `docs/evidence.md does not link ${name}`);
    assert.ok(evidence.includes(`npm run ${report.script}`), `docs/evidence.md does not give the command for ${name}`);
  });
  assert.match(evidence, /## What is deliberately not claimed/);
  assert.match(evidence, /not cycle-accurate/);
  assert.match(evidence, /Full WCAG 2\.2 AA conformance is not claimed/);
  assert.match(evidence, /No cross-browser performance claim is made/);
});

test("the README routes a reader to the evidence rather than restating it", async () => {
  const readme = await readFile(resolve(projectRoot, "README.md"), "utf8");
  assert.ok(readme.includes("docs/evidence.md"), "the README must point at the evidence index");
  EVIDENCE_REPORTS.forEach((report) => {
    assert.ok(readme.includes(`npm run ${report.script}`), `the README omits npm run ${report.script}`);
  });
  assert.match(readme, /not\*\* cycle-accurate|not cycle-accurate/,
    "the README must state that the functional runtime is not cycle-accurate");
});

test("the technical summary anchors every figure to a generated report", async () => {
  const summary = await readFile(resolve(projectRoot, "docs/technical-summary.md"), "utf8");
  const version = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version;

  assert.ok(summary.includes(version), "the summary must name the version it describes");
  ["comparison-matrix.md", "mars-conformance.md", "coverage-report.md", "mutation-report.md", "benchmark.md", "accessibility.md"]
    .forEach((name) => assert.ok(summary.includes(name), `the summary does not link ${name}`));
  // A summary without stated threats to validity is a marketing document.
  assert.match(summary, /## Threats to validity/);
  assert.match(summary, /No usability study has been conducted/);
  assert.match(summary, /## Reproducing these results/);
});

test("the matrix and the citation name the version they describe", async () => {
  const version = await currentVersion();
  const [matrix, citation] = await Promise.all([
    readFile(matrixPath, "utf8"),
    readFile(citationPath, "utf8")
  ]);

  assert.match(matrix, new RegExp(`for webMARS ${version.replace(/\./g, "\\.")}`));
  assert.match(citation, new RegExp(`^version: "${version.replace(/\./g, "\\.")}"$`, "m"));
  assert.match(citation, /^cff-version: 1\.2\.0$/m);
  assert.match(citation, /^license: MIT$/m);
  assert.match(citation, /^repository-code: /m);
});
