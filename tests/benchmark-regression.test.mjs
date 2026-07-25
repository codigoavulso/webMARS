import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadRuntimeBenchmarks, projectRoot } from "./helpers/engines.mjs";

test("benchmark collector measures elapsed time, JS utilization, and throughput", async () => {
  const benchmarks = await loadRuntimeBenchmarks();
  let now = 0;
  let wallNow = 1000;
  const collector = benchmarks.createBenchmarkCollector({
    now: () => now,
    dateNow: () => wallNow,
    refreshIntervalMs: 0
  });

  const run = collector.start("run", { programName: "bench.s" });
  now = 50;
  collector.addCpu(run, 20, 100);
  const active = collector.snapshot().active;
  assert.equal(active.name, "run");
  assert.equal(active.durationMs, 50);
  assert.equal(active.cpuMs, 20);
  assert.equal(active.cpuPercent, 40);
  assert.equal(active.unitsPerSecond, 2000);

  now = 100;
  wallNow = 1100;
  const completed = collector.finish(run, { outcome: "normal" });
  assert.equal(completed.durationMs, 100);
  assert.equal(completed.cpuMs, 20);
  assert.equal(completed.cpuPercent, 20);
  assert.equal(completed.unitsPerSecond, 1000);
  assert.equal(completed.outcome, "normal");
  assert.equal(completed.metadata.programName, "bench.s");

  const snapshot = collector.snapshot();
  assert.equal(snapshot.active, null);
  assert.equal(snapshot.metrics.run.count, 1);
  assert.equal(snapshot.metrics.run.averageDurationMs, 100);
  assert.equal(snapshot.metrics.run.averageCpuPercent, 20);
});

test("benchmark collector aggregates synchronous measurements and remains observable", async () => {
  const benchmarks = await loadRuntimeBenchmarks();
  let now = 10;
  let notifications = 0;
  const collector = benchmarks.createBenchmarkCollector({
    now: () => now,
    dateNow: () => 2000,
    historyLimit: 2
  });
  collector.subscribe(() => {
    notifications += 1;
  });

  const result = collector.measure("compile", () => {
    now += 8;
    return { ok: true, asm: "nop" };
  }, { sourceCharacters: 12 });
  assert.equal(result.ok, true);
  assert.equal(collector.snapshot().metrics.compile.last.durationMs, 8);
  assert.equal(collector.snapshot().metrics.compile.last.cpuPercent, 100);

  collector.record("assemble", { durationMs: 4, cpuMs: 3 });
  collector.record("step", { durationMs: 2, cpuMs: 2 });
  assert.equal(collector.snapshot().history.length, 2);
  assert.ok(notifications >= 4);

  collector.clear();
  assert.deepEqual(Object.keys(collector.snapshot().metrics), []);
  assert.equal(collector.snapshot().latest, null);
});

test("browser bundle and interface include benchmark instrumentation", async () => {
  const [bundle, ui, runtime] = await Promise.all([
    readFile(resolve(projectRoot, "assets/js/app.bundle.js"), "utf8"),
    readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8"),
    readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8")
  ]);

  const benchmarkModuleIndex = bundle.indexOf("19-runtime-benchmarks.js");
  const appRuntimeIndex = bundle.indexOf("20-app-runtime.js");
  assert.ok(benchmarkModuleIndex >= 0);
  assert.ok(benchmarkModuleIndex < appRuntimeIndex);
  assert.match(ui, /id="benchmark-status"/);
  assert.match(ui, /id="benchmark-cpu"/);
  assert.match(ui, /showBenchmarkPanel:\s*false/);
  assert.match(ui, /toolbar-benchmark-group benchmark-panel-hidden/);
  assert.match(runtime, /nextPreferences\.showBenchmarkPanel !== true/);
  assert.match(runtime, /name:\s*"showBenchmarkPanel"/);
  assert.match(runtime, /benchmarkCollector\.measure\("compile"/);
  assert.match(runtime, /benchmarkCollector\.measure\("assemble"/);
  assert.match(runtime, /benchmarkCollector\.start\("run"/);
});
