// Guards the benchmark *protocol*, not the numbers.
//
// Running the full benchmark takes minutes and its results depend on the
// machine, so it does not belong in the suite. What does belong is everything
// that decides whether a published number can be trusted: that the statistics
// are computed correctly, that the protocol is declared, that the environment
// is recorded, and that the report says what it cannot tell you.

import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";
import {
  PROTOCOL,
  WORKLOADS,
  buildBenchmarkRunners,
  buildReport,
  collectWorkloadSamples,
  formatCommitRevision,
  normalizeRepetitions,
  parseBenchmarkArguments,
  publishBenchmarkArtifacts,
  readBenchmarkHistory,
  summarize
} from "../scripts/benchmark.mjs";

const reportPath = resolve(projectRoot, "docs/benchmark.md");
const historyPath = resolve(projectRoot, "docs/benchmark-history.json");

test("the protocol declares warm-up, repetitions and outlier handling", () => {
  assert.ok(PROTOCOL.version >= 1);
  assert.ok(PROTOCOL.warmupRuns >= 1, "warm-up runs must be discarded, or the first measurement is JIT compilation");
  assert.ok(PROTOCOL.repetitions >= 5, "fewer than five repetitions cannot support a median with an IQR");
  assert.match(PROTOCOL.outlierRule, /discard/);
  assert.match(PROTOCOL.statistic, /median/i);
  assert.match(PROTOCOL.statistic, /IQR|interquartile/i);
  assert.match(PROTOCOL.timedWindow, /engine creation/);
  assert.match(PROTOCOL.timedWindow, /excluded/);
});

test("every workload states what it is for", () => {
  assert.ok(WORKLOADS.length >= 5);
  const phases = new Set(WORKLOADS.map((entry) => entry.phase));
  // The roadmap asks for compilation, assembly, execution and connected tools.
  ["compilation", "assembly", "execution", "tools"].forEach((phase) => {
    assert.ok(phases.has(phase), `no workload covers the ${phase} phase`);
  });
  WORKLOADS.forEach((entry) => {
    assert.ok(entry.goal.length > 40, `${entry.id} needs a stated goal, not a label`);
    assert.ok(/[a-z]/.test(entry.id) && !entry.id.includes(" "), `${entry.id} should be a stable identifier`);
  });
});

test("the summary trims outliers and reports a median, not a mean", () => {
  // One wild outlier at each end must not move the reported median.
  const samples = [1000, 10, 10.5, 11, 10.2, 10.8, 0.001];
  const stats = summarize(samples);

  assert.equal(stats.samples, 7);
  assert.equal(stats.used, 5, "the fastest and slowest measurements are discarded");
  assert.ok(stats.median > 10 && stats.median < 11, `median ${stats.median} should sit among the clustered samples`);
  assert.ok(stats.max < 1000, "the slow outlier must not survive trimming");
  assert.ok(stats.min > 0.001, "the fast outlier must not survive trimming");
  assert.ok(stats.iqr >= 0);
  // A mean would be dragged to ~150 by the outlier; the median must not be.
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  assert.ok(Math.abs(stats.median - mean) > 100, "the statistic must not behave like a mean");
});

test("a short sample set is summarised without pretending to trim", () => {
  const stats = summarize([5, 6, 7]);
  assert.equal(stats.used, 3, "too few samples to trim, so none are discarded");
  assert.equal(stats.median, 6);
});

test("benchmark provenance marks measurements from a modified worktree", () => {
  assert.equal(formatCommitRevision("1410dca", false), "1410dca");
  assert.equal(formatCommitRevision("1410dca\n", true), "1410dca-dirty");
  assert.equal(formatCommitRevision(null, true), null);
});

test("benchmark repetitions are finite integers with enough samples for the protocol", () => {
  assert.equal(normalizeRepetitions(undefined), PROTOCOL.repetitions);
  assert.equal(normalizeRepetitions("9"), 9);
  for (const invalid of [-1, 0, 4, 5.5, Infinity, "Infinity", "nope"]) {
    assert.throws(() => normalizeRepetitions(invalid), /integer greater than or equal to 5/);
  }
  assert.deepEqual(parseBenchmarkArguments(["--no-write", "--repetitions", "11"]), {
    write: false,
    repetitions: 11
  });
  assert.throws(() => parseBenchmarkArguments(["--repetitions"]), /requires a value/);
  assert.throws(() => parseBenchmarkArguments(["--unknown"]), /Unknown benchmark argument/);
});

test("workload preparation and cleanup stay outside every measured interval", async () => {
  const trace = [];
  let prepared = 0;
  const prepareWorkload = async () => {
    const id = prepared += 1;
    trace.push(`prepare:${id}`);
    return {
      measure() {
        trace.push(`measure:${id}`);
        return 42;
      },
      cleanup() {
        trace.push(`cleanup:${id}`);
      }
    };
  };
  const measureTime = async (measure) => {
    trace.push("timer:start");
    const result = await measure();
    trace.push("timer:end");
    return { ms: 1, result };
  };

  const collected = await collectWorkloadSamples(prepareWorkload, {
    warmupRuns: 1,
    repetitions: 5,
    measureTime
  });

  assert.deepEqual(collected, { samples: [1, 1, 1, 1, 1], units: 42 });
  assert.deepEqual(trace.slice(0, 3), ["prepare:1", "measure:1", "cleanup:1"],
    "warm-up preparation and cleanup must not be timed");
  for (let id = 2; id <= 6; id += 1) {
    const start = 3 + ((id - 2) * 5);
    assert.deepEqual(trace.slice(start, start + 5), [
      `prepare:${id}`,
      "timer:start",
      `measure:${id}`,
      "timer:end",
      `cleanup:${id}`
    ]);
  }
});

test("tool workload uses the baseline program through the real instruction observer hook", async () => {
  const engines = [];
  const createEngine = async () => {
    const record = {
      source: null,
      goLimit: null,
      observer: null,
      observerRegistrations: 0,
      observerDetaches: 0,
      snapshotReads: 0,
      steps: 0
    };
    const engine = {
      assemble(source) {
        record.source = source;
        return { ok: true };
      },
      go(limit) {
        record.goLimit = limit;
        for (let index = 0; index < 130; index += 1) record.observer?.({});
        record.steps = 130;
      },
      getSnapshot() {
        record.snapshotReads += 1;
        return { steps: record.steps, textRows: [] };
      },
      registerInstructionObserver(observer) {
        record.observerRegistrations += 1;
        record.observer = observer;
        return () => {
          record.observerDetaches += 1;
          record.observer = null;
        };
      }
    };
    record.engine = engine;
    engines.push(record);
    return engine;
  };
  const runners = await buildBenchmarkRunners({ createEngine, compileMiniC: null });
  const baseline = await runners["execute-tight-loop"]();
  const withTool = await runners["execute-with-tool"]();
  await runners["execute-tight-loop"]();

  assert.equal(engines.length, 2, "repetitions must reset a warmed engine, not create a cold VM context per sample");
  assert.equal(engines[0].source, engines[1].source, "baseline and tool workload must execute identical assembly");
  assert.match(engines[0].source, /li\s+\$t0, 20000/);
  assert.equal(engines[0].observerRegistrations, 0);
  assert.equal(engines[1].observerRegistrations, 1, "tool workload must use the engine integration tools use");
  assert.equal(await baseline.measure(), 130);
  assert.equal(await withTool.measure(), 130);
  await withTool.cleanup();
  assert.equal(engines[0].goLimit, engines[1].goLimit);
  assert.equal(engines[1].snapshotReads, 3, "two periodic reads plus the final step count");
  assert.equal(engines[1].observerDetaches, 1);
});

test("the rendered report records the effective repetition override", () => {
  const report = buildReport({
    protocol: { ...PROTOCOL, repetitions: 11 },
    environment: {
      webMarsVersion: "test",
      commit: "abcdef0",
      engine: "Node.js test",
      v8: "test",
      platform: "test",
      arch: "test",
      cpu: "test",
      cpuCount: 1,
      totalMemoryGiB: 1,
      freeMemoryGiB: 1
    },
    results: []
  }, { schema: "webmars.benchmark-history/1", runs: [] });
  assert.match(report, /\| Measured repetitions \| 11 \|/);
});

test("invalid history fails closed and pair publication rolls back", async () => {
  const sandbox = await mkdtemp(resolve(tmpdir(), "webmars-benchmark-publish-"));
  const sandboxHistory = resolve(sandbox, "benchmark-history.json");
  const sandboxReport = resolve(sandbox, "benchmark.md");
  try {
    await writeFile(sandboxHistory, "{ not valid JSON\n", "utf8");
    await assert.rejects(() => readBenchmarkHistory(sandboxHistory), SyntaxError);
    assert.equal(await readFile(sandboxHistory, "utf8"), "{ not valid JSON\n",
      "a malformed history must never be replaced with an empty one");

    await writeFile(sandboxHistory, '{"schema":"unknown","runs":[]}\n', "utf8");
    await assert.rejects(() => readBenchmarkHistory(sandboxHistory), /schema is missing or unsupported/);

    await writeFile(sandboxHistory, "old history\n", "utf8");
    await writeFile(sandboxReport, "old report\n", "utf8");
    let failNextReportPublication = true;
    await assert.rejects(
      () => publishBenchmarkArtifacts({ history: "new history\n", report: "new report\n" }, {
        historyPath: sandboxHistory,
        reportPath: sandboxReport
      }, {
        rename: async (from, to) => {
          if (failNextReportPublication && to === sandboxReport && String(from).endsWith("next-report.md")) {
            failNextReportPublication = false;
            throw new Error("simulated report publication failure");
          }
          await rename(from, to);
        }
      }),
      /simulated report publication failure/
    );
    assert.equal(await readFile(sandboxHistory, "utf8"), "old history\n");
    assert.equal(await readFile(sandboxReport, "utf8"), "old report\n");
    assert.deepEqual((await readdir(sandbox)).filter((name) => name.startsWith(".benchmark-publish-")), []);

    await publishBenchmarkArtifacts({ history: "new history\n", report: "new report\n" }, {
      historyPath: sandboxHistory,
      reportPath: sandboxReport
    });
    assert.equal(await readFile(sandboxHistory, "utf8"), "new history\n");
    assert.equal(await readFile(sandboxReport, "utf8"), "new report\n");
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

test("the published report records the environment it was produced on", async () => {
  const report = await readFile(reportPath, "utf8");
  ["Engine", "Operating system", "CPU", "Logical processors", "Total memory"].forEach((field) => {
    assert.ok(report.includes(field), `the report must record ${field}`);
  });
  assert.match(report, /## Protocol/);
  assert.match(report, /Warm-up runs \(discarded\)/);
  assert.match(report, /Measured repetitions/);
  assert.match(report, /Outlier handling/);
  assert.match(report, /## Running it yourself/);
  assert.match(report, /npm run benchmark/);
});

test("the report refuses the comparisons its numbers cannot support", async () => {
  const report = await readFile(reportPath, "utf8");
  // A benchmark that does not state its limits invites exactly the comparison
  // it cannot support.
  assert.match(report, /not comparable to a run on different hardware/);
  assert.match(report, /## Limitations/);
  assert.match(report, /These are \*\*Node\.js\*\* measurements/);
  assert.match(report, /not a hardware figure/);
  assert.match(report, /no cross-browser claim is made/);
});

test("history is kept, bounded, and stamped with the protocol version", async () => {
  const history = JSON.parse(await readFile(historyPath, "utf8"));
  assert.equal(history.schema, "webmars.benchmark-history/1");
  assert.ok(Array.isArray(history.runs) && history.runs.length >= 1);
  assert.ok(history.runs.length <= 50, "history must stay bounded");

  history.runs.forEach((entry) => {
    assert.ok(Number.isInteger(entry.protocolVersion) && entry.protocolVersion >= 1,
      "every retained run must identify the protocol that produced it");
    assert.ok(entry.protocolVersion <= PROTOCOL.version,
      "history cannot contain results from a protocol newer than this script understands");
    assert.match(entry.recordedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(entry.cpu && entry.engine && entry.platform, "each run must carry the machine it ran on");
    assert.ok(entry.results.length >= 5);
    entry.results.filter((item) => !item.skipped).forEach((item) => {
      assert.ok(Number.isFinite(item.median) && item.median > 0, `${item.id} has no usable median`);
      assert.ok(Number.isFinite(item.iqr) && item.iqr >= 0, `${item.id} has no dispersion figure`);
    });
  });
});

test("the workload identifiers in history match the declared workloads", async () => {
  const history = JSON.parse(await readFile(historyPath, "utf8"));
  const declared = new Set(WORKLOADS.map((entry) => entry.id));
  history.runs.forEach((entry) => {
    entry.results.forEach((item) => {
      assert.ok(declared.has(item.id), `history contains '${item.id}', which is no longer a declared workload`);
    });
  });
});
