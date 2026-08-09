// Measures real JavaScript coverage of the shipped source and enforces
// per-module thresholds.
//
// The application modules are executed through `vm.runInContext` in the test
// harness, not through the module loader, so `node --test
// --experimental-test-coverage` reports nothing for them. Raw V8 coverage does
// see them, because the harness passes a `filename` to every vm script. This
// script therefore drives the suite with NODE_V8_COVERAGE and reduces the raw
// byte ranges itself.
//
// Definitions used throughout, so a published number cannot be misread:
//
//   function coverage - V8 function records with an execution count above zero,
//                       over all function records in the file.
//   branch coverage   - V8 block ranges (every range after a function's own
//                       outermost range) with a count above zero. This is block
//                       coverage, V8's proxy for branch coverage; it is not
//                       condition coverage.
//   line coverage     - a line is executable when it holds code that some V8
//                       range covers, and covered when the innermost range over
//                       its code has a count above zero. Blank lines, lines
//                       holding only a line comment, and lines inside a block
//                       comment are not executable and are excluded.
//
// Usage:
//   node scripts/measure-coverage.mjs            measure, report, enforce
//   node scripts/measure-coverage.mjs --reuse    reuse coverage/raw from a previous run
//   node scripts/measure-coverage.mjs --no-write leave docs/coverage-report.md alone

import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rawDirectory = resolve(projectRoot, "coverage/raw");
const reportPath = resolve(projectRoot, "docs/coverage-report.md");

// Only files that ship to the browser are measured. Test helpers and build
// scripts are excluded: covering them says nothing about the product.
const MEASURED_PREFIXES = ["assets/js/app-modules/", "assets/js/", "tools/"];
const EXCLUDED = [/\.generated\.js$/, /assets\/js\/i18n\//, /assets\/js\/app\.bundle\.js$/];

// A tool is one file with two halves. The pure model runs anywhere and is what
// the tests drive through `vm.runInContext`; the interface below this line is
// behind `typeof document === "undefined"`, which returns before any of it
// executes. Counting those lines in the denominator does not measure a testing
// gap - no Node test can reach them by construction - it just moves the number
// whenever the interface grows. Measurement stops at the guard, so the
// percentage means "of the code these tests can run", and the floors below can
// be read as what they claim to be.
const DOM_GUARD = /^\s*const host = root\.MarsWebTools;\s*$/m;

function measurableSource(path, source) {
  if (!path.startsWith("tools/")) return source;
  const guard = source.match(DOM_GUARD);
  if (!guard || guard.index === undefined) return source;
  return source.slice(0, guard.index);
}

// Function and branch counts come from V8's records, not from the text, so
// trimming the source is not enough: the records for the interface half have to
// be dropped too, or the same code would be excluded from one metric and
// counted in the other two.
function measurableFunctions(functions, limit) {
  if (limit === null) return functions;
  return functions.filter((fn) => {
    const outermost = fn.ranges?.[0];
    return outermost ? outermost.startOffset < limit : false;
  });
}

// Thresholds are per critical module, not a single project-wide average, so a
// well-covered module cannot mask a bare one. They are *regression floors* set
// just under what the suite currently achieves, not aspirational targets:
// their job is to fail the build when coverage drops. Raise one when coverage
// rises; never lower one to make a run pass.
const THRESHOLDS = {
  "assets/js/app-modules/00-core.js": { lines: 60, branches: 48, functions: 72 },
  "assets/js/app-modules/00-core-store.js": { lines: 34, branches: 0, functions: 66 },
  "assets/js/app-modules/00-i18n.js": { lines: 55, branches: 12, functions: 53 },
  // Raised with the 0.5.6 measurement change: the denominator is now the half
  // of the file a Node test can reach, so these are the real numbers rather
  // than the whole file diluted by an interface no harness can execute.
  "tools/pipeline-lab.js": { lines: 85, branches: 71, functions: 86 },
  "tools/example-register-watch.js": { lines: 22, branches: 50, functions: 65 }
};

function normalizeUrl(url) {
  let path = String(url || "");
  if (path.startsWith("file://")) path = new URL(path).pathname.replace(/^\/(?=[A-Za-z]:)/, "");
  path = path.replace(/\\/g, "/");
  const rootPrefix = projectRoot.replace(/\\/g, "/") + "/";
  if (path.startsWith(rootPrefix)) path = path.slice(rootPrefix.length);
  return path;
}

function isMeasured(path) {
  if (!path.endsWith(".js")) return false;
  if (EXCLUDED.some((pattern) => pattern.test(path))) return false;
  return MEASURED_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Which source offsets hold executable code, and which of them ran. V8 gives
// nested ranges where the innermost one wins, so ranges are applied in order of
// decreasing size and the last write for a byte is the innermost.
function buildByteCoverage(length, functions) {
  const state = new Int8Array(length).fill(-1); // -1 not executable, 0 uncovered, 1 covered
  const ranges = [];
  functions.forEach((fn) => {
    fn.ranges.forEach((range) => ranges.push(range));
  });
  ranges.sort((left, right) => (right.endOffset - right.startOffset) - (left.endOffset - left.startOffset));
  ranges.forEach((range) => {
    const start = Math.max(0, range.startOffset);
    const end = Math.min(length, range.endOffset);
    const value = range.count > 0 ? 1 : 0;
    for (let offset = start; offset < end; offset += 1) state[offset] = value;
  });
  return state;
}

// Comments and blank lines are not executable. A byte-level scan is enough
// here: the sources use plain `//` and `/* */` comments, and a false positive
// only ever removes a line from the denominator, never invents a covered one.
function classifyLines(source) {
  const lines = source.split("\n");
  const executableMask = [];
  let inBlockComment = false;
  let offset = 0;
  const lineOffsets = [];
  for (const line of lines) {
    lineOffsets.push(offset);
    const trimmed = line.trim();
    let executable = trimmed.length > 0;
    if (inBlockComment) {
      executable = false;
      if (trimmed.includes("*/")) inBlockComment = false;
    } else if (trimmed.startsWith("//")) {
      executable = false;
    } else if (trimmed.startsWith("/*")) {
      executable = false;
      if (!trimmed.includes("*/")) inBlockComment = true;
    }
    executableMask.push(executable);
    offset += line.length + 1;
  }
  return { lines, lineOffsets, executableMask };
}

function measureFile(source, functions) {
  const state = buildByteCoverage(source.length, functions);
  const { lines, lineOffsets, executableMask } = classifyLines(source);

  let executableLines = 0;
  let coveredLines = 0;
  const uncovered = [];
  lines.forEach((line, index) => {
    if (!executableMask[index]) return;
    const start = lineOffsets[index];
    const end = start + line.length;
    let sawExecutable = false;
    let sawCovered = false;
    for (let offset = start; offset < end; offset += 1) {
      if (/\s/.test(source[offset])) continue;
      if (state[offset] === -1) continue;
      sawExecutable = true;
      if (state[offset] === 1) { sawCovered = true; break; }
    }
    if (!sawExecutable) return;
    executableLines += 1;
    if (sawCovered) coveredLines += 1;
    else uncovered.push(index + 1);
  });

  const totalFunctions = functions.length;
  const coveredFunctions = functions.filter((fn) => fn.ranges.some((range) => range.count > 0)).length;

  let totalBranches = 0;
  let coveredBranches = 0;
  functions.forEach((fn) => {
    fn.ranges.slice(1).forEach((range) => {
      totalBranches += 1;
      if (range.count > 0) coveredBranches += 1;
    });
  });

  const percent = (covered, total) => (total === 0 ? 100 : (covered / total) * 100);
  return {
    lines: percent(coveredLines, executableLines),
    branches: percent(coveredBranches, totalBranches),
    functions: percent(coveredFunctions, totalFunctions),
    executableLines,
    coveredLines,
    totalBranches,
    coveredBranches,
    totalFunctions,
    coveredFunctions,
    uncoveredLines: uncovered
  };
}

// Several test processes may write several files; a file can also appear more
// than once when a module is instantiated in more than one vm context. Counts
// are summed per range so repeated instantiation does not erase coverage.
function mergeFunctions(existing, incoming) {
  if (!existing) return incoming.map((fn) => ({ ...fn, ranges: fn.ranges.map((range) => ({ ...range })) }));
  if (existing.length !== incoming.length) {
    // Different instrumentation of the same path: keep whichever saw more.
    const score = (list) => list.reduce((sum, fn) => sum + fn.ranges.filter((range) => range.count > 0).length, 0);
    return score(incoming) > score(existing) ? incoming : existing;
  }
  existing.forEach((fn, index) => {
    const other = incoming[index];
    if (!other || fn.ranges.length !== other.ranges.length) return;
    fn.ranges.forEach((range, rangeIndex) => { range.count += other.ranges[rangeIndex].count; });
  });
  return existing;
}

async function collectRawCoverage() {
  const files = await readdir(rawDirectory);
  const byPath = new Map();
  for (const name of files) {
    if (!name.endsWith(".json")) continue;
    let parsed;
    try {
      parsed = JSON.parse(await readFile(resolve(rawDirectory, name), "utf8"));
    } catch {
      continue;
    }
    for (const script of parsed.result || []) {
      const path = normalizeUrl(script.url);
      if (!isMeasured(path)) continue;
      byPath.set(path, mergeFunctions(byPath.get(path), script.functions));
    }
  }
  return byPath;
}

async function testCommand() {
  const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
  const script = packageJson.scripts.test;
  return script.replace(/^node --test /, "").trim().split(/\s+/);
}

function formatPercent(value) {
  return `${value.toFixed(2)}%`;
}

// Shipped modules the harness never loads as whole files. The suite exercises
// them by extracting source fragments and evaluating those, which V8 attributes
// to an anonymous script, so no file-level number exists for them. Naming them
// is the difference between an honest report and a flattering one.
async function findUnmeasuredSources(measured) {
  const directories = ["assets/js/app-modules", "tools"];
  const missing = [];
  for (const directory of directories) {
    const entries = await readdir(resolve(projectRoot, directory));
    for (const name of entries) {
      const path = `${directory}/${name}`;
      if (!isMeasured(path)) continue;
      if (!measured.has(path)) missing.push(path);
    }
  }
  return missing.sort();
}

async function buildReport(measurements, failures, version) {
  const rows = [...measurements.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  const totals = rows.reduce((accumulator, [, metrics]) => ({
    executableLines: accumulator.executableLines + metrics.executableLines,
    coveredLines: accumulator.coveredLines + metrics.coveredLines,
    totalBranches: accumulator.totalBranches + metrics.totalBranches,
    coveredBranches: accumulator.coveredBranches + metrics.coveredBranches,
    totalFunctions: accumulator.totalFunctions + metrics.totalFunctions,
    coveredFunctions: accumulator.coveredFunctions + metrics.coveredFunctions
  }), { executableLines: 0, coveredLines: 0, totalBranches: 0, coveredBranches: 0, totalFunctions: 0, coveredFunctions: 0 });

  const overall = {
    lines: totals.executableLines ? (totals.coveredLines / totals.executableLines) * 100 : 0,
    branches: totals.totalBranches ? (totals.coveredBranches / totals.totalBranches) * 100 : 0,
    functions: totals.totalFunctions ? (totals.coveredFunctions / totals.totalFunctions) * 100 : 0
  };

  const unmeasured = await findUnmeasuredSources(measurements);
  const table = rows.map(([path, metrics]) => {
    const threshold = THRESHOLDS[path];
    const gate = threshold
      ? `${threshold.lines}/${threshold.branches}/${threshold.functions}`
      : "-";
    return `| \`${path}\` | ${formatPercent(metrics.lines)} | ${formatPercent(metrics.branches)} | ${formatPercent(metrics.functions)} | ${metrics.executableLines} | ${gate} |`;
  }).join("\n");

  return `# webMARS coverage report

Generated by \`scripts/measure-coverage.mjs\` for webMARS ${version}.
Regenerate with \`npm run coverage\`. Do not edit this file by hand.

## How these numbers are defined

A count of passing tests is not coverage, and coverage is not correctness.
This report states exactly what it measured:

- **Line coverage** - a line is *executable* when it holds code that some V8
  range covers, and *covered* when the innermost range over that code ran at
  least once. Blank lines, line comments and block comments are excluded from
  the denominator.
- **Branch coverage** - V8 *block* coverage: every range inside a function
  other than the function's own outermost range. It is not condition coverage,
  so \`a && b\` counts as one construct, not two.
- **Function coverage** - function records V8 saw execute at least once.

The application modules run through \`vm.runInContext\` in the test harness, so
\`node --test --experimental-test-coverage\` reports nothing for them. These
numbers come from raw V8 coverage instead, which does observe vm scripts.

Files not measured: generated reference data, translation catalogs, the loader
bundle, build scripts and the tests themselves.

A tool under \`tools/\` is measured only up to its \`const host =
root.MarsWebTools;\` line. Everything below it is guarded by \`typeof document
=== "undefined"\` and returns before executing, so no Node test can reach it by
construction. Counting those lines would not measure a testing gap; it would
only move the percentage whenever the interface grew. The number therefore
means *of the code these tests can run*, and the interface half is neither
covered nor uncovered here - it is unmeasured, like the modules listed further
down.

## Overall

| Metric | Result |
| --- | --- |
| Line coverage | ${formatPercent(overall.lines)} (${totals.coveredLines} of ${totals.executableLines}) |
| Block (branch) coverage | ${formatPercent(overall.branches)} (${totals.coveredBranches} of ${totals.totalBranches}) |
| Function coverage | ${formatPercent(overall.functions)} (${totals.coveredFunctions} of ${totals.totalFunctions}) |
| Files measured | ${rows.length} |

## Per file

Thresholds are given as line/branch/function minimums and are enforced by
\`npm run coverage\`, which exits non-zero when a critical module drops below
them. A dash means the file has no threshold yet.

| File | Lines | Branches | Functions | Executable lines | Threshold |
| --- | --- | --- | --- | --- | --- |
${table}

## Threshold status

${failures.length === 0
    ? "All critical modules are at or above their thresholds."
    : failures.map((failure) => `- **FAIL** \`${failure.path}\`: ${failure.metric} ${formatPercent(failure.actual)} is below the ${failure.expected}% minimum.`).join("\n")}

## Shipped modules with no file-level coverage

These files ship to the browser but never appear in the coverage data, because
the suite exercises them by extracting source fragments and evaluating those
rather than loading the file. V8 attributes such a fragment to an anonymous
script, so no per-file number exists. **They are not thereby covered, and they
are not thereby uncovered - they are unmeasured.**

${unmeasured.length ? unmeasured.map((path) => `- \`${path}\``).join("\n") : "_None._"}

Closing this gap means loading these modules as whole scripts with a
\`filename\`, the way \`tests/helpers/engines.mjs\` already does for the core.

## What this report does not tell you

- Coverage records that a line ran, not that its behaviour was checked. The
  mutation report in [mutation-report.md](mutation-report.md) is the measure of
  whether the tests would notice a change.
- Rendering paths that need a real DOM never execute under Node, which is most
  of why a tool file sits well below its own logic coverage.
- A module with no threshold is not thereby exempt from review; it simply has
  no floor recorded yet.
- The number of tests in this repository is not a coverage figure and must not
  be quoted as one.
`;
}

async function main() {
  const reuse = process.argv.includes("--reuse");
  const write = !process.argv.includes("--no-write");

  if (!reuse) {
    await rm(resolve(projectRoot, "coverage"), { recursive: true, force: true });
    await mkdir(rawDirectory, { recursive: true });
    const testFiles = await testCommand();
    process.stdout.write(`Running ${testFiles.length} test files with V8 coverage...\n`);
    try {
      await run(process.execPath, ["--test", ...testFiles], {
        cwd: projectRoot,
        env: { ...process.env, NODE_V8_COVERAGE: rawDirectory },
        maxBuffer: 64 * 1024 * 1024
      });
    } catch (error) {
      process.stderr.write("The test suite failed; coverage of a failing suite is not reported.\n");
      process.stderr.write(String(error.stdout || error.message).slice(-4000) + "\n");
      process.exitCode = 1;
      return;
    }
  }

  const rawByPath = await collectRawCoverage();
  const measurements = new Map();
  for (const [path, functions] of rawByPath) {
    // V8 attributes coverage to whatever filename a script was run under, and
    // a test may name a script that never existed on disk -- the scaffold suite
    // generates a tool into a temporary sandbox and runs it as
    // "tools/probe-widget.js". Coverage can only describe files this repository
    // ships, so an absent one is skipped rather than crashing the report.
    let source;
    try {
      source = await readFile(resolve(projectRoot, path), "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      continue;
    }
    const measured = measurableSource(path, source);
    const limit = measured.length === source.length ? null : measured.length;
    measurements.set(path, measureFile(measured, measurableFunctions(functions, limit)));
  }

  const failures = [];
  for (const [path, threshold] of Object.entries(THRESHOLDS)) {
    const metrics = measurements.get(path);
    if (!metrics) {
      failures.push({ path, metric: "coverage", actual: 0, expected: threshold.lines });
      continue;
    }
    for (const metric of ["lines", "branches", "functions"]) {
      if (metrics[metric] + 1e-9 < threshold[metric]) {
        failures.push({ path, metric, actual: metrics[metric], expected: threshold[metric] });
      }
    }
  }

  const version = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version;
  if (write) await writeFile(reportPath, await buildReport(measurements, failures, version), "utf8");

  process.stdout.write(`Measured ${measurements.size} files. `);
  if (failures.length) {
    process.stdout.write(`${failures.length} threshold failure(s):\n`);
    failures.forEach((failure) => {
      process.stdout.write(`  ${failure.path}: ${failure.metric} ${failure.actual.toFixed(2)}% < ${failure.expected}%\n`);
    });
    process.exitCode = 1;
    return;
  }
  process.stdout.write("All thresholds met.\n");
}

await main();
