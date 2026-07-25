import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

const runtimePath = resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js");

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return source.slice(start, end);
}

test("user Stop cancels a pending sleep and terminates the engine exactly once", async () => {
  const source = await readFile(runtimePath, "utf8");
  const clearTimerSource = sourceBetween(
    source,
    "function clearRunTimer()",
    "\nfunction shouldPostRunLoopMessage"
  );
  const terminateSource = sourceBetween(
    source,
    "function terminateRunByUser()",
    "\nfunction startRunBenchmark"
  );
  const calls = [];
  const context = vm.createContext({ calls });

  vm.runInContext(`
    let runTimer = "long-sleep-timer";
    let runActive = true;
    let runStopRequested = true;
    let runLastTickAt = 123;
    let runStepCarry = 7;
    let runLastUiSyncAt = 456;
    let runPausedForInput = true;
    let resumeRunAfterInput = true;
    let synchronizedSnapshot = null;
    let synchronizedOptions = null;
    let benchmarkOutcome = null;
    let benchmarkMetadata = null;
    let engineHalted = false;

    const window = {
      clearTimeout(timer) {
        calls.push(["clearTimeout", timer]);
      }
    };
    const messagesPane = {
      clearInputRequest() {
        calls.push(["clearInputRequest"]);
      },
      selectMarsTab() {
        calls.push(["selectMarsTab"]);
      }
    };
    const engine = {
      stop() {
        calls.push(["engine.stop"]);
        engineHalted = true;
        return {
          ok: true,
          done: true,
          haltReason: "user",
          snapshot: { assembled: true, halted: true, steps: 9 }
        };
      }
    };

    function clearInputPauseState() {
      calls.push(["clearInputPauseState"]);
      runPausedForInput = false;
      resumeRunAfterInput = false;
    }
    function resolveStableRuntimeSnapshot(snapshot) {
      calls.push(["resolveStableRuntimeSnapshot"]);
      return snapshot;
    }
    function syncSnapshot(snapshot, options) {
      calls.push(["syncSnapshot"]);
      synchronizedSnapshot = snapshot;
      synchronizedOptions = options;
    }
    function postMarsSystemLine() {
      calls.push(["postMarsSystemLine"]);
    }
    function translateText(value) {
      return value;
    }
    function finishRunBenchmark(outcome, metadata) {
      calls.push(["finishRunBenchmark"]);
      benchmarkOutcome = outcome;
      benchmarkMetadata = metadata;
    }

    ${clearTimerSource}
    ${terminateSource}

    const returned = terminateRunByUser();
    globalThis.observed = {
      returned,
      runTimer,
      runActive,
      runStopRequested,
      runLastTickAt,
      runStepCarry,
      runLastUiSyncAt,
      runPausedForInput,
      resumeRunAfterInput,
      synchronizedSnapshot,
      synchronizedOptions,
      benchmarkOutcome,
      benchmarkMetadata,
      engineHalted
    };
  `, context);

  const observed = context.observed;
  assert.equal(observed.returned.ok, true);
  assert.equal(observed.runTimer, null);
  assert.equal(observed.runActive, false);
  assert.equal(observed.runStopRequested, false);
  assert.equal(observed.runLastTickAt, 0);
  assert.equal(observed.runStepCarry, 0);
  assert.equal(observed.runLastUiSyncAt, 0);
  assert.equal(observed.runPausedForInput, false);
  assert.equal(observed.resumeRunAfterInput, false);
  assert.equal(observed.engineHalted, true);
  assert.equal(observed.synchronizedSnapshot.halted, true);
  assert.equal(observed.synchronizedOptions.force, true);
  assert.equal(observed.benchmarkOutcome, "user");
  assert.equal(observed.benchmarkMetadata.haltReason, "user");

  const callNames = calls.map(([name]) => name);
  assert.equal(callNames[0], "clearTimeout");
  assert.equal(calls[0][1], "long-sleep-timer");
  assert.equal(callNames.filter((name) => name === "engine.stop").length, 1);
  assert.equal(callNames.filter((name) => name === "syncSnapshot").length, 1);
  assert.equal(callNames.filter((name) => name === "postMarsSystemLine").length, 1);
  assert.equal(callNames.filter((name) => name === "finishRunBenchmark").length, 1);
});

test("Pause and internal stopRunLoop do not terminate the engine", async () => {
  const source = await readFile(runtimePath, "utf8");
  const pauseSource = sourceBetween(source, "  pause() {", "\n  stop() {");
  const stopCommandSource = sourceBetween(source, "  stop() {", "\n  backstep() {");
  const internalStopSource = sourceBetween(
    source,
    "function stopRunLoop()",
    "\nfunction terminateRunByUser"
  );

  assert.doesNotMatch(pauseSource, /engine\.stop|terminateRunByUser/);
  assert.doesNotMatch(internalStopSource, /engine\.stop|terminateRunByUser/);
  assert.match(stopCommandSource, /terminateRunByUser\(\)/);
  assert.doesNotMatch(stopCommandSource, /runStopRequested\s*=\s*true/);

  const calls = [];
  const context = vm.createContext({ calls });
  vm.runInContext(`
    let runActive = true;
    let runPausedForInput = false;
    const engine = {
      getSnapshot() {
        calls.push("engine.getSnapshot");
        return { assembled: true };
      }
    };
    function postMarsMessage() {
      calls.push("postMarsMessage");
    }
    function terminateRunByUser() {
      calls.push("terminateRunByUser");
    }
    const commands = {
      ${stopCommandSource}
    };
    commands.stop();
  `, context);

  assert.deepEqual(calls, ["terminateRunByUser"]);
});
