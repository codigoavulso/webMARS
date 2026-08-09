// Contract tests for the public tool API.
//
// docs/tool-api.md promises third parties a stable surface. These tests hold
// the promise: they check the version declaration, the pieces of the context
// and shell the document tells authors to rely on, the failure isolation it
// claims, and that the worked example actually demonstrates what it documents.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

const managerPath = resolve(projectRoot, "assets/js/app-modules/12-ui-tool-manager.js");
const examplePath = resolve(projectRoot, "tools/example-register-watch.js");
const docPath = resolve(projectRoot, "docs/tool-api.md");

const [manifest, managerSource, exampleSource, doc] = await Promise.all([
  readFile(resolve(projectRoot, "tools/tools.json"), "utf8").then((text) => JSON.parse(text.replace(/^﻿/, ""))),
  readFile(managerPath, "utf8"),
  readFile(examplePath, "utf8"),
  readFile(docPath, "utf8")
]);

function loadExampleCore() {
  const context = vm.createContext({});
  vm.runInContext(exampleSource, context, { filename: "tools/example-register-watch.js" });
  assert.ok(context.MarsRegisterWatchCore, "the example must expose a DOM-free core");
  return context.MarsRegisterWatchCore;
}

test("the tool manifest declares the API version the documentation describes", () => {
  assert.equal(manifest.apiVersion, 1);
  assert.match(doc, /\*\*API version 1\*\* \(`webmars\.tool-api\/1`\)/);
});

test("every context field the documentation tells authors to use is passed to tools", () => {
  const documented = [
    "engine", "messagesPane", "windowManager", "desktop", "escapeHtml",
    "defaultMemoryMap", "createToolWindowShell", "createPlaceholderTool",
    "createToolDeltaHistory", "createDisplayFitController", "runtimeControls",
    "openHelpDocument", "nextPlacement"
  ];
  documented.forEach((field) => {
    assert.ok(doc.includes(`\`${field}\``), `docs/tool-api.md must document ${field}`);
    assert.match(managerSource, new RegExp(`\\b${field}\\b`), `the context must still pass ${field}`);
  });
});

test("the window shell still returns what the documentation promises", () => {
  ["root", "content", "close()", "open()", "refreshTranslations()", "onResize(listener)"].forEach((field) => {
    assert.ok(doc.includes(`\`${field}\``), `docs/tool-api.md must document shell.${field}`);
  });
  assert.match(managerSource, /return \{\s*\n\s*root: win,\s*\n\s*content,\s*\n\s*close,\s*\n\s*open,\s*\n\s*refreshTranslations/);
});

test("the execution bridge exposes exactly the documented controls", () => {
  const controls = ["isAvailable", "isRunning", "go", "step", "backstep", "pause", "stop", "reset"];
  const bridge = managerSource.slice(managerSource.indexOf("const runtimeControlBridge"));
  controls.forEach((name) => {
    assert.match(bridge.slice(0, 600), new RegExp(`${name}:`), `runtimeControls must keep ${name}`);
    assert.ok(doc.includes(`runtimeControls.${name}()`), `docs/tool-api.md must document ${name}`);
  });
});

test("the delta history keeps the operations the documentation names", () => {
  ["clear", "ensure", "record", "rewind", "sync", "pruneFuture", "pruneBefore", "getCurrentStep", "getEntryCount"]
    .forEach((name) => {
      assert.ok(doc.includes(`\`${name}\``), `docs/tool-api.md must document ${name}`);
      assert.match(managerSource, new RegExp(`\\b${name}\\b`), `createToolDeltaHistory must keep ${name}`);
    });
});

test("a throwing tool is isolated and reported, never allowed to stop delivery", () => {
  const start = managerSource.indexOf("function deliverToolSnapshotBatch");
  const helper = managerSource.slice(start, managerSource.indexOf("\nfunction deliverToolRuntimeEventBatch"));
  const context = vm.createContext({});
  vm.runInContext(`
    ${helper}
    const seen = [];
    const failures = [];
    const instances = new Map([
      ["broken", { onSnapshot() { throw new Error("boom"); } }],
      ["healthy", { onSnapshot(snapshot) { seen.push(snapshot.steps); } }]
    ]);
    deliverToolSnapshotBatch(instances, [{ steps: 1 }, { steps: 2 }], (id, error) => failures.push(id + ":" + error.message));
    globalThis.observed = { seen: [...seen], failures: [...failures] };
  `, context);

  assert.deepEqual([...context.observed.seen], [1, 2], "a broken tool must not block a healthy one");
  assert.deepEqual([...context.observed.failures], ["broken:boom", "broken:boom"]);
  assert.match(managerSource, /reportedSnapshotFailures\.has\(key\)/, "repeat failures are reported once");
});

test("the example tool is registered in both catalogs", () => {
  assert.deepEqual(
    manifest.tools.find((tool) => tool.id === "example-register-watch"),
    { label: "Register Watch (example)", script: "./tools/example-register-watch.js", id: "example-register-watch" }
  );
  assert.match(
    managerSource,
    /\{ id: "example-register-watch", label: "Register Watch \(example\)", script: "\.\/tools\/example-register-watch\.js" \}/
  );
});

test("the example tool demonstrates the rules the documentation states", () => {
  // A tool with no connect control must stay subscribed.
  assert.match(exampleSource, /isConnected: \(\) => true/);
  // Styles injected once, through theme tokens, with a mobile scope.
  assert.match(exampleSource, /document\.getElementById\(STYLE_ID\)/);
  assert.match(exampleSource, /var\(--surface-raised\)/);
  assert.match(exampleSource, /var\(--surface\)/);
  assert.match(exampleSource, /var\(--text-muted\)/);
  assert.doesNotMatch(exampleSource, /var\(--(?:field|muted)\)/, "only defined theme tokens are used");
  assert.match(exampleSource, /\.desktop-stacked \.register-watch-toolbar/);
  assert.doesNotMatch(exampleSource, /#[0-9a-fA-F]{6}/, "no literal colours");
  // Language changes re-render.
  assert.match(exampleSource, /subscribeLanguageChange\(\(\) => \{/);
  // Batched delivery renders once.
  assert.match(exampleSource, /delivery\.batched === true && delivery\.isLast !== true/);
  assert.ok(doc.includes("tools/example-register-watch.js"), "the documentation must point at the example");
});

test("the example core observes register changes without a DOM", () => {
  const core = loadExampleCore();
  const snapshot = (steps, value, revision = 1) => ({
    assembled: true, steps, runtimeRevision: revision, pcHex: "0x00400000",
    registers: [{ name: "$t0", value }]
  });

  const first = core.nextObservation(null, snapshot(1, 5), "$t0");
  assert.equal(first.value, 5);
  assert.equal(first.previousValue, null);

  // An unchanged register in the same runtime revision records nothing.
  assert.equal(core.nextObservation(first, snapshot(2, 5), "$t0"), null);

  const second = core.nextObservation(first, snapshot(3, 9), "$t0");
  assert.equal(second.value, 9);
  assert.equal(second.previousValue, 5);

  // A runtime reset re-reads even when the value is unchanged.
  assert.ok(core.nextObservation(second, snapshot(1, 9, 2), "$t0"));

  // Both snapshot register shapes are accepted.
  assert.equal(core.readRegister({ registers: { $t0: 7 } }, "$t0"), 7);
  assert.equal(core.readRegister({ registers: [{ name: "$t0", value: 7 }] }, "$t0"), 7);
  assert.equal(core.readRegister({}, "$t0"), null);
});

test("the example core bounds its history instead of growing without limit", () => {
  const core = loadExampleCore();
  let history = [];
  for (let step = 0; step < core.MAX_HISTORY + 50; step += 1) {
    history = core.appendObservation(history, { value: step, previousValue: step - 1, step, pcHex: "", revision: 1 });
  }
  assert.equal(history.length, core.MAX_HISTORY);
  assert.equal(history[history.length - 1].value, core.MAX_HISTORY + 49);
});

test("the documentation states the versioning rule it is held to", () => {
  assert.match(doc, /## Versioning/);
  assert.match(doc, /fields may be \*\*added\*\*/);
  assert.match(doc, /raises the API version/);
  assert.match(doc, /treated as version 1/);
});
