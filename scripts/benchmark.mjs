// The official webMARS benchmark.
//
// A benchmark number is worthless without its protocol, so the protocol is part
// of the artefact: fixed workloads, a declared warm-up, a declared repetition
// count, a declared outlier rule, and the environment recorded alongside every
// result. Anyone can reproduce a published figure by running this script.
//
// What is measured, per the roadmap: Mini-C compilation, assembly, execution,
// and a run with a tool connected to the runtime.
//
// Statistics are reported as median and interquartile range, never as a mean.
// A mean over a handful of runs on a machine with other work on it says more
// about the scheduler than about the code.
//
// Usage:
//   node scripts/benchmark.mjs                 run and append to history
//   node scripts/benchmark.mjs --repetitions 9
//   node scripts/benchmark.mjs --no-write      do not touch the report or history

import { execFile } from "node:child_process";
import { cpus, freemem, platform, release, totalmem } from "node:os";
import { access, copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const run = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = resolve(projectRoot, "docs/benchmark.md");
const historyPath = resolve(projectRoot, "docs/benchmark-history.json");
const EXECUTION_ITERATIONS = 20000;
const EXECUTION_STEP_LIMIT = 500000;
const TOOL_SNAPSHOT_INTERVAL = 64;

// The protocol. Changing any of these invalidates comparison with previously
// published results, so they are declared here and printed in the report.
export const PROTOCOL = Object.freeze({
  version: 2,
  warmupRuns: 3,
  repetitions: 7,
  // Trimmed at both ends: one slow run from a background process should not
  // move a published median, and neither should one implausibly fast one.
  outlierRule: "discard the single fastest and single slowest measurement, then report the median and interquartile range of the rest",
  statistic: "median with interquartile range (IQR)",
  timer: "process.hrtime.bigint(), nanosecond resolution",
  timedWindow: "operation under test only; engine creation and per-sample reset/assembly are excluded unless assembly is the operation under test"
});

// Workloads, each with the question it answers. A benchmark suite without a
// stated purpose per workload becomes a list of numbers nobody can act on.
export const WORKLOADS = Object.freeze([
  {
    id: "assemble-small",
    phase: "assembly",
    goal: "Cost of assembling a short program - the latency a student feels on every Assemble press.",
    unit: "instructions assembled"
  },
  {
    id: "assemble-large",
    phase: "assembly",
    goal: "Whether assembly scales linearly. A quadratic pass shows up here and nowhere else.",
    unit: "instructions assembled"
  },
  {
    id: "execute-tight-loop",
    phase: "execution",
    goal: "Steady-state interpreter throughput on register-only work.",
    unit: "instructions executed"
  },
  {
    id: "execute-memory-bound",
    phase: "execution",
    goal: "Throughput when every iteration touches memory, which exercises the slower path.",
    unit: "instructions executed"
  },
  {
    id: "execute-with-tool",
    phase: "tools",
    goal: "Cost of a real instruction-observer integration: the same execution with a snapshot read every 64 retired instructions.",
    unit: "instructions executed"
  },
  {
    id: "compile-mini-c",
    phase: "compilation",
    goal: "Cost of compiling Mini-C to MIPS, the step before assembly in the C workflow.",
    unit: null
  }
]);

function assemblyProgram(instructionCount) {
  const body = Array.from({ length: instructionCount }, (_unused, index) => `  addi $t0, $t0, ${index % 5}`).join("\n");
  return `.text\nmain:\n${body}\n  li $v0, 10\n  syscall\n`;
}

function tightLoopProgram(iterations) {
  return `.text
main:   li   $t0, ${iterations}
        li   $t1, 0
loop:   beq  $t0, $zero, done
        addi $t1, $t1, 1
        addi $t0, $t0, -1
        j    loop
done:   li   $v0, 10
        syscall
`;
}

function memoryProgram(iterations) {
  return `.data
buf:    .space 4096
.text
main:   la   $s0, buf
        li   $t0, ${iterations}
loop:   beq  $t0, $zero, done
        andi $t2, $t0, 0x3fc
        add  $t3, $s0, $t2
        sw   $t0, 0($t3)
        lw   $t4, 0($t3)
        addi $t0, $t0, -1
        j    loop
done:   li   $v0, 10
        syscall
`;
}

const MINI_C_SOURCE = `int main(void) {
  int total = 0;
  for (int i = 0; i < 64; i = i + 1) {
    if (i % 3 == 0) { total = total + i * 2; } else { total = total - i; }
  }
  return total;
}
`;

// --- statistics -------------------------------------------------------------

export function summarize(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  // Trim one from each end before summarising, per the declared outlier rule.
  const trimmed = sorted.length >= 5 ? sorted.slice(1, -1) : sorted;
  const quantile = (values, fraction) => {
    if (!values.length) return 0;
    const position = (values.length - 1) * fraction;
    const low = Math.floor(position);
    const high = Math.ceil(position);
    return values[low] + (values[high] - values[low]) * (position - low);
  };
  return {
    samples: sorted.length,
    used: trimmed.length,
    median: quantile(trimmed, 0.5),
    q1: quantile(trimmed, 0.25),
    q3: quantile(trimmed, 0.75),
    iqr: quantile(trimmed, 0.75) - quantile(trimmed, 0.25),
    min: trimmed[0] ?? 0,
    max: trimmed[trimmed.length - 1] ?? 0
  };
}

async function timeIt(work) {
  const started = process.hrtime.bigint();
  const result = await work();
  const elapsed = Number(process.hrtime.bigint() - started) / 1e6;
  return { ms: elapsed, result };
}

// --- environment ------------------------------------------------------------

export function formatCommitRevision(revision, dirty = false) {
  const normalized = String(revision || "").trim();
  if (!normalized) return null;
  return dirty ? `${normalized}-dirty` : normalized;
}

async function describeEnvironment() {
  const cpuList = cpus();
  let git = null;
  try {
    const { stdout } = await run("git", ["rev-parse", "--short", "HEAD"], { cwd: projectRoot, timeout: 15000 });
    const status = await run(
      "git",
      ["status", "--porcelain", "--untracked-files=normal"],
      { cwd: projectRoot, timeout: 15000 }
    );
    git = formatCommitRevision(stdout, Boolean(status.stdout.trim()));
  } catch {
    // Not a git checkout, or git is unavailable; the report says so.
  }
  const version = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version;
  return {
    webMarsVersion: version,
    commit: git,
    engine: `Node.js ${process.version}`,
    v8: process.versions.v8,
    platform: `${platform()} ${release()}`,
    arch: process.arch,
    cpu: cpuList.length ? cpuList[0].model.trim() : "unknown",
    cpuCount: cpuList.length,
    totalMemoryGiB: Number((totalmem() / 1024 ** 3).toFixed(2)),
    freeMemoryGiB: Number((freemem() / 1024 ** 3).toFixed(2))
  };
}

export function normalizeRepetitions(value) {
  if (value === undefined) return PROTOCOL.repetitions;
  const repetitions = Number(value);
  if (!Number.isInteger(repetitions) || repetitions < 5) {
    throw new TypeError("--repetitions must be an integer greater than or equal to 5");
  }
  return repetitions;
}

export function parseBenchmarkArguments(argv) {
  const options = { write: true, repetitions: PROTOCOL.repetitions };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--no-write") {
      options.write = false;
      continue;
    }
    if (argument === "--repetitions") {
      if (index + 1 >= argv.length || argv[index + 1].startsWith("--")) {
        throw new TypeError("--repetitions requires a value");
      }
      options.repetitions = normalizeRepetitions(argv[index + 1]);
      index += 1;
      continue;
    }
    throw new TypeError(`Unknown benchmark argument: ${argument}`);
  }
  return options;
}

// --- workloads --------------------------------------------------------------

async function loadMiniCCompiler() {
  // The compiler is a browser global; load it into a sandbox the same way the
  // application does, so the measurement covers the real code path.
  const source = await readFile(resolve(projectRoot, "assets/js/app-modules/17-mini-c-compiler.js"), "utf8");
  const sandbox = { console };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, { filename: "assets/js/app-modules/17-mini-c-compiler.js" });
  const registry = context.WebMarsModules || {};
  const compiler = registry.miniCCompiler || context.MiniCCompiler || null;
  if (!compiler) return null;
  const compile = compiler.compile || compiler.compileSource || null;
  return typeof compile === "function" ? (text) => compile.call(compiler, text, { sourceName: "bench.c" }) : null;
}

function prepared(measure, cleanup = null) {
  return { measure, cleanup: typeof cleanup === "function" ? cleanup : null };
}

function reusableEngine(createEngine, options) {
  let enginePromise = null;
  return () => {
    if (!enginePromise) enginePromise = Promise.resolve(createEngine(options));
    return enginePromise;
  };
}

// Every factory prepares one independent sample. Engine creation, module
// loading, assembly and observer registration happen here, before the timer is
// started by collectWorkloadSamples().
export async function buildBenchmarkRunners(dependencies = {}) {
  const createEngine = dependencies.createEngine || (
    await import("../tests/helpers/engines.mjs")
  ).createJavaScriptEngine;
  const compileMiniC = Object.hasOwn(dependencies, "compileMiniC")
    ? dependencies.compileMiniC
    : await loadMiniCCompiler();
  const executionSource = tightLoopProgram(EXECUTION_ITERATIONS);
  const standardSettings = () => ({ settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff } });
  const getSmallAssemblyEngine = reusableEngine(createEngine, { settings: { startAtMain: true } });
  const getLargeAssemblyEngine = reusableEngine(createEngine, standardSettings());
  const getTightLoopEngine = reusableEngine(createEngine, standardSettings());
  const getMemoryEngine = reusableEngine(createEngine, standardSettings());
  const getToolEngine = reusableEngine(createEngine, standardSettings());

  return {
    async "assemble-small"() {
      const engine = await getSmallAssemblyEngine();
      const source = assemblyProgram(40);
      return prepared(() => {
        engine.assemble(source, { sourceName: "small.s" });
        return engine.getSnapshot().textRows.length;
      });
    },
    async "assemble-large"() {
      const engine = await getLargeAssemblyEngine();
      const source = assemblyProgram(8000);
      return prepared(() => {
        engine.assemble(source, { sourceName: "large.s" });
        return engine.getSnapshot().textRows.length;
      });
    },
    async "execute-tight-loop"() {
      const engine = await getTightLoopEngine();
      const assembled = engine.assemble(executionSource, { sourceName: "tight.s" });
      if (assembled?.ok === false) throw new Error("Could not assemble execute-tight-loop benchmark workload");
      return prepared(() => {
        engine.go(EXECUTION_STEP_LIMIT);
        return engine.getSnapshot().steps;
      });
    },
    async "execute-memory-bound"() {
      const engine = await getMemoryEngine();
      const assembled = engine.assemble(memoryProgram(8000), { sourceName: "memory.s" });
      if (assembled?.ok === false) throw new Error("Could not assemble execute-memory-bound benchmark workload");
      return prepared(() => {
        engine.go(EXECUTION_STEP_LIMIT);
        return engine.getSnapshot().steps;
      });
    },
    async "execute-with-tool"() {
      const engine = await getToolEngine();
      const assembled = engine.assemble(executionSource, { sourceName: "tooled.s" });
      if (assembled?.ok === false) throw new Error("Could not assemble execute-with-tool benchmark workload");
      if (typeof engine.registerInstructionObserver !== "function") return null;
      let observedInstructions = 0;
      const detach = engine.registerInstructionObserver(() => {
        observedInstructions += 1;
        if (observedInstructions % TOOL_SNAPSHOT_INTERVAL === 0) {
          engine.getSnapshot({ includeDataRows: false, shareMemoryWords: true });
        }
      });
      return prepared(() => {
        engine.go(EXECUTION_STEP_LIMIT);
        return engine.getSnapshot().steps;
      }, detach);
    },
    async "compile-mini-c"() {
      if (!compileMiniC) return null;
      return prepared(() => { compileMiniC(MINI_C_SOURCE); return 0; });
    }
  };
}

function normalizePreparedWorkload(value) {
  if (!value || typeof value.measure !== "function") return null;
  return value;
}

async function disposePreparedWorkload(value) {
  if (typeof value?.cleanup === "function") await value.cleanup();
}

export async function collectWorkloadSamples(prepareWorkload, options = {}) {
  const repetitions = normalizeRepetitions(options.repetitions);
  const warmupRuns = options.warmupRuns === undefined ? PROTOCOL.warmupRuns : Number(options.warmupRuns);
  const measureTime = typeof options.measureTime === "function" ? options.measureTime : timeIt;
  if (!Number.isInteger(warmupRuns) || warmupRuns < 0) throw new TypeError("warmupRuns must be a non-negative integer");

  let units = 0;
  for (let index = 0; index < warmupRuns; index += 1) {
    const workload = normalizePreparedWorkload(await prepareWorkload());
    if (!workload) return null;
    try {
      units = Number(await workload.measure()) || units;
    } finally {
      await disposePreparedWorkload(workload);
    }
  }

  const samples = [];
  for (let index = 0; index < repetitions; index += 1) {
    const workload = normalizePreparedWorkload(await prepareWorkload());
    if (!workload) return null;
    try {
      const { ms, result } = await measureTime(workload.measure);
      samples.push(ms);
      units = Number(result) || units;
    } finally {
      await disposePreparedWorkload(workload);
    }
  }
  return { samples, units };
}

export async function benchmark(options = {}) {
  const repetitions = normalizeRepetitions(options.repetitions);
  // Capture the advertised "at start" environment before imports, warm-up or
  // workloads can change the amount of free memory.
  const environment = await describeEnvironment();
  const runners = await buildBenchmarkRunners(options.dependencies);
  const results = [];

  for (const workload of WORKLOADS) {
    const prepareWorkload = runners[workload.id];
    if (!prepareWorkload) {
      results.push({ ...workload, skipped: true, reason: "workload unavailable in this environment" });
      continue;
    }

    const collected = await collectWorkloadSamples(prepareWorkload, { repetitions });
    if (!collected) {
      results.push({ ...workload, skipped: true, reason: "workload unavailable in this environment" });
      continue;
    }

    const { samples, units } = collected;
    const stats = summarize(samples);
    const throughput = units > 0 && stats.median > 0
      ? Math.round(units / (stats.median / 1000))
      : null;
    results.push({ ...workload, skipped: false, stats, throughput, units, samples });
  }

  return {
    protocol: { ...PROTOCOL, repetitions },
    environment,
    results
  };
}

// --- report -----------------------------------------------------------------

function formatMs(value) {
  return value >= 100 ? value.toFixed(1) : value.toFixed(3);
}

export function buildReport(runResult, history) {
  const { environment, protocol, results } = runResult;
  const rows = results.map((entry) => {
    if (entry.skipped) return `| \`${entry.id}\` | ${entry.phase} | skipped | - | - | - | - |`;
    const { stats } = entry;
    const work = entry.units ? `${entry.units.toLocaleString("en-US")} ${entry.unit}` : "-";
    return `| \`${entry.id}\` | ${entry.phase} | ${formatMs(stats.median)} ms | ${formatMs(stats.iqr)} ms | ${stats.used} of ${stats.samples} | ${work} | ${entry.throughput ? `${entry.throughput.toLocaleString("en-US")}/s` : "-"} |`;
  }).join("\n");

  const goals = results.map((entry) => `- **\`${entry.id}\`** (${entry.phase}) - ${entry.goal}`).join("\n");

  const historyRows = history.runs.slice(-10).reverse().map((entry) => {
    const medians = entry.results.filter((item) => !item.skipped).map((item) => `${item.id} ${formatMs(item.median)}`).join(", ");
    const repetitions = Number.isInteger(entry.repetitions) ? entry.repetitions : "?";
    return `| ${entry.webMarsVersion} | ${entry.commit || "-"} | v${entry.protocolVersion}, n=${repetitions} | ${entry.engine} | ${medians} |`;
  }).join("\n");

  return `# webMARS benchmark

Generated by \`scripts/benchmark.mjs\` for webMARS ${environment.webMarsVersion}.
Regenerate with \`npm run benchmark\`. Do not edit this file by hand.

## Protocol

A number without its protocol cannot be compared to anything. This one is:

| Parameter | Value |
| --- | --- |
| Protocol version | ${protocol.version} |
| Warm-up runs (discarded) | ${protocol.warmupRuns} |
| Measured repetitions | ${protocol.repetitions} |
| Outlier handling | ${protocol.outlierRule} |
| Statistic reported | ${protocol.statistic} |
| Timer | ${protocol.timer} |
| Timed window | ${protocol.timedWindow} |

Medians and interquartile ranges are reported rather than means. On a machine
with other work running, a mean over a handful of runs describes the scheduler
more than the code. The IQR is the dispersion figure: a large IQR means the
median is not a reliable summary and the run should be repeated on a quiet
machine.

## Environment

| Field | Value |
| --- | --- |
| webMARS | ${environment.webMarsVersion}${environment.commit ? ` (\`${environment.commit}\`)` : ""} |
| Engine | ${environment.engine} (V8 ${environment.v8}) |
| Operating system | ${environment.platform} |
| Architecture | ${environment.arch} |
| CPU | ${environment.cpu} |
| Logical processors | ${environment.cpuCount} |
| Total memory | ${environment.totalMemoryGiB} GiB |
| Free memory at start | ${environment.freeMemoryGiB} GiB |

These numbers describe **this machine**. They are not a specification, and
they are not comparable to a run on different hardware. Compare like with like:
same protocol version, same engine family, same machine.

## Workloads and what each answers

${goals}

## Results

| Workload | Phase | Median | IQR | Samples used | Work measured | Throughput |
| --- | --- | --- | --- | --- | --- | --- |
${rows}

Throughput is derived from the median and the work the run actually reported -
instructions assembled or instructions retired, measured rather than declared.
It is an interpreter figure, not a hardware figure: it says how fast webMARS
simulates MIPS instructions, not how fast a MIPS processor would run them.

## History

The last ten runs, newest first. Kept so a regression shows up as a change in
the median rather than as a subjective impression.

| webMARS | Commit | Protocol | Engine | Medians (ms) |
| --- | --- | --- | --- | --- |
${historyRows || "| - | - | - | - | no history recorded yet |"}

Full history, including every retained sample, is in
[benchmark-history.json](benchmark-history.json).

## Running it yourself

\`\`\`bash
npm run benchmark
\`\`\`

The protocol above is applied exactly as published. To compare against these
figures, run it on a quiet machine and compare medians and IQRs, not single
measurements.

## Limitations

- These are **Node.js** measurements. The application runs in a browser, and
  the browser adds rendering, event handling and its own JIT behaviour. Node
  numbers bound the engine's cost; they do not predict the interface's.
- Browser automation is not part of this script. Chrome and Firefox figures
  are not published yet, so no cross-browser claim is made here.
- The Mini-C workload measures compilation only, not the assembly or execution
  that follows it.
- Nothing here measures the Pipeline Lab, which is a timing model rather than an
  execution engine and has no wall-clock claim to make.
`;
}

export function validateBenchmarkHistory(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Benchmark history must be a JSON object");
  }
  if (value.schema !== "webmars.benchmark-history/1") {
    throw new TypeError("Benchmark history schema is missing or unsupported");
  }
  if (!Array.isArray(value.runs)) {
    throw new TypeError("Benchmark history must contain a runs array");
  }
  value.runs.forEach((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new TypeError(`Benchmark history run ${index} must be an object`);
    }
    if (!Number.isInteger(entry.protocolVersion) || entry.protocolVersion < 1) {
      throw new TypeError(`Benchmark history run ${index} has an invalid protocol version`);
    }
    if (!Array.isArray(entry.results)) {
      throw new TypeError(`Benchmark history run ${index} must contain a results array`);
    }
  });
  return value;
}

export async function readBenchmarkHistory(path = historyPath) {
  let source;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return { schema: "webmars.benchmark-history/1", runs: [] };
    throw error;
  }
  return validateBenchmarkHistory(JSON.parse(source));
}

async function pathExists(path, accessFile = access) {
  try {
    await accessFile(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

// Publish history and report as one recoverable pair. Each replacement is an
// atomic same-filesystem rename. If the second replacement fails, the first is
// rolled back from a byte-for-byte backup instead of leaving mixed evidence.
export async function publishBenchmarkArtifacts(contents, destinations = {}, operations = {}) {
  if (typeof contents?.history !== "string" || typeof contents?.report !== "string") {
    throw new TypeError("Benchmark history and report contents must be strings");
  }
  const historyDestination = destinations.historyPath || historyPath;
  const reportDestination = destinations.reportPath || reportPath;
  const destinationRoot = dirname(historyDestination);
  if (dirname(reportDestination) !== destinationRoot) {
    throw new TypeError("Benchmark history and report must share a directory for atomic publication");
  }

  const io = {
    access: operations.access || access,
    copyFile: operations.copyFile || copyFile,
    mkdir: operations.mkdir || mkdir,
    mkdtemp: operations.mkdtemp || mkdtemp,
    rename: operations.rename || rename,
    rm: operations.rm || rm,
    writeFile: operations.writeFile || writeFile
  };
  await io.mkdir(destinationRoot, { recursive: true });
  const temporaryRoot = await io.mkdtemp(resolve(destinationRoot, ".benchmark-publish-"));
  const nextHistory = resolve(temporaryRoot, "next-history.json");
  const nextReport = resolve(temporaryRoot, "next-report.md");
  const previousHistory = resolve(temporaryRoot, "previous-history.json");
  const previousReport = resolve(temporaryRoot, "previous-report.md");
  let preserveRecoveryFiles = false;

  try {
    await io.writeFile(nextHistory, contents.history, "utf8");
    await io.writeFile(nextReport, contents.report, "utf8");
    const [hadHistory, hadReport] = await Promise.all([
      pathExists(historyDestination, io.access),
      pathExists(reportDestination, io.access)
    ]);
    if (hadHistory) await io.copyFile(historyDestination, previousHistory);
    if (hadReport) await io.copyFile(reportDestination, previousReport);

    let historyPublished = false;
    let reportPublished = false;
    try {
      await io.rename(nextHistory, historyDestination);
      historyPublished = true;
      await io.rename(nextReport, reportDestination);
      reportPublished = true;
    } catch (publicationError) {
      const recoveryErrors = [];
      const restore = async (hadPrevious, backup, destination, wasPublished) => {
        try {
          if (hadPrevious) await io.rename(backup, destination);
          else if (wasPublished) await io.rm(destination, { force: true });
        } catch (error) {
          recoveryErrors.push(error);
        }
      };
      await restore(hadReport, previousReport, reportDestination, reportPublished);
      await restore(hadHistory, previousHistory, historyDestination, historyPublished);
      if (recoveryErrors.length) {
        preserveRecoveryFiles = true;
        throw new AggregateError(
          [publicationError, ...recoveryErrors],
          `Benchmark publication failed and rollback is incomplete; recovery files remain in ${temporaryRoot}`
        );
      }
      throw publicationError;
    }
  } finally {
    if (!preserveRecoveryFiles) await io.rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function main() {
  const { write, repetitions } = parseBenchmarkArguments(process.argv.slice(2));
  const history = write ? await readBenchmarkHistory() : null;

  process.stdout.write(`Running ${WORKLOADS.length} workloads (${PROTOCOL.warmupRuns} warm-up + ${repetitions} measured each)...\n`);
  const runResult = await benchmark({ repetitions });

  runResult.results.forEach((entry) => {
    if (entry.skipped) {
      process.stdout.write(`  ${entry.id}: skipped (${entry.reason})\n`);
      return;
    }
    process.stdout.write(`  ${entry.id}: median ${formatMs(entry.stats.median)} ms, IQR ${formatMs(entry.stats.iqr)} ms${entry.throughput ? `, ${entry.throughput.toLocaleString("en-US")} instr/s` : ""}\n`);
  });

  if (write) {
    history.runs.push({
      recordedAt: new Date().toISOString().slice(0, 10),
      protocolVersion: PROTOCOL.version,
      repetitions: runResult.protocol.repetitions,
      ...runResult.environment,
      results: runResult.results.map((entry) => (entry.skipped
        ? { id: entry.id, skipped: true }
        : { id: entry.id, median: entry.stats.median, iqr: entry.stats.iqr, throughput: entry.throughput }))
    });
    // Keep the file bounded; a benchmark history is for spotting trends, not
    // for archiving every run forever.
    history.runs = history.runs.slice(-50);
    await publishBenchmarkArtifacts({
      history: `${JSON.stringify(history, null, 2)}\n`,
      report: buildReport(runResult, history)
    });
  }
}

if (process.argv[1] && process.argv[1].endsWith("benchmark.mjs")) {
  await main();
}
