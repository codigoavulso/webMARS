// Tests the tool scaffold generator.
//
// A template that has drifted out of date is worse than no template: it teaches
// a contributor the wrong contracts on their first day. These tests generate a
// tool into a temporary directory, run the generated test file against it, and
// check that what comes out still obeys everything docs/tool-api.md requires.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import { promisify } from "node:util";
import { resolve } from "node:path";
import vm from "node:vm";
import { projectRoot } from "./helpers/engines.mjs";

const run = promisify(execFile);
const scaffoldPath = resolve(projectRoot, "scripts/new-tool.mjs");

// Generating into the repository would leave files behind on a failure, so the
// generator runs against a throwaway copy of the two catalogs it edits.
async function generateIntoSandbox(id, label) {
  const sandbox = await mkdtemp(resolve(tmpdir(), "webmars-scaffold-"));
  const source = await readFile(scaffoldPath, "utf8");
  // Point the generator at the sandbox by overriding its project root.
  const patched = source.replace(
    'const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");',
    `const projectRoot = ${JSON.stringify(sandbox)};`
  );
  assert.notEqual(patched, source, "the generator must resolve its own project root");

  await writeFile(resolve(sandbox, "new-tool.mjs"), patched, "utf8");
  await run("node", ["-e", `require("fs").mkdirSync(${JSON.stringify(resolve(sandbox, "tools"))},{recursive:true});require("fs").mkdirSync(${JSON.stringify(resolve(sandbox, "tests"))},{recursive:true});require("fs").mkdirSync(${JSON.stringify(resolve(sandbox, "assets/js/app-modules"))},{recursive:true})`]);
  await writeFile(resolve(sandbox, "tools/tools.json"),
    await readFile(resolve(projectRoot, "tools/tools.json"), "utf8"), "utf8");
  await writeFile(resolve(sandbox, "assets/js/app-modules/12-ui-tool-manager.js"),
    await readFile(resolve(projectRoot, "assets/js/app-modules/12-ui-tool-manager.js"), "utf8"), "utf8");

  await run("node", [resolve(sandbox, "new-tool.mjs"), "--id", id, "--label", label], { timeout: 60000 });
  return sandbox;
}

test("the generator refuses an invalid identifier", async () => {
  await assert.rejects(
    () => run("node", [scaffoldPath, "--id", "Bad Id", "--label", "Bad"], { timeout: 30000 }),
    "an id with spaces or capitals must be refused"
  );
  await assert.rejects(
    () => run("node", [scaffoldPath, "--label", "No id"], { timeout: 30000 }),
    "a missing id must be refused"
  );
});

test("the generator refuses to overwrite an existing tool", async () => {
  await assert.rejects(
    () => run("node", [scaffoldPath, "--id", "pipeline-lab", "--label", "Clash"], { timeout: 30000 }),
    "an existing tool file must not be overwritten"
  );

  const existingTest = resolve(projectRoot, "tests/tool-scaffold.test.mjs");
  const before = await readFile(existingTest, "utf8");
  await assert.rejects(
    () => run("node", [scaffoldPath, "--id", "scaffold", "--label", "Clash"], { timeout: 30000 }),
    "an existing generated-test destination must not be overwritten"
  );
  assert.equal(await readFile(existingTest, "utf8"), before);
});

test("a dry run touches nothing", async () => {
  const before = await readFile(resolve(projectRoot, "tools/tools.json"), "utf8");
  const { stdout } = await run("node", [scaffoldPath, "--id", "dry-probe", "--label", "Dry Probe", "--dry-run"], { timeout: 30000 });
  assert.match(stdout, /Would create/);
  assert.equal(await readFile(resolve(projectRoot, "tools/tools.json"), "utf8"), before);
});

test("the generated tool is complete, registered and honours the API contracts", async () => {
  const sandbox = await generateIntoSandbox("sample-widget", "Sample Widget");
  try {
    const source = await readFile(resolve(sandbox, "tools/sample-widget.js"), "utf8");

    // It must be a working tool, not a stub.
    assert.match(source, /host\.register\(\{/);
    assert.match(source, /id: "sample-widget"/);
    assert.match(source, /label: "Sample Widget"/);
    assert.match(source, /createToolWindowShell\("sample-widget"/);
    assert.match(source, /onSnapshot\(snapshot, delivery = \{\}\)/);

    // And it must obey the contracts the documentation states.
    assert.match(source, /isConnected: \(\) => true/, "a tool with no connect control must stay subscribed");
    assert.match(source, /document\.getElementById\(STYLE_ID\)/, "styles must be injected once");
    assert.match(source, /var\(--surface\)/, "colours must come from theme tokens");
    assert.doesNotMatch(source, /#[0-9a-fA-F]{6}/, "no literal colours");
    assert.match(source, /\.desktop-stacked \.sample-widget-toolbar/, "mobile rules must be scoped");
    assert.match(source, /subscribeLanguageChange\(/, "it must re-render on a language change");
    assert.match(source, /delivery\.batched === true && delivery\.isLast !== true/, "batches must render once");
    assert.match(source, /root\.MarsSampleWidgetCore = coreApi;/, "the pure core must be exported for testing");

    // The generated test file must exist and reference the generated tool.
    const testFile = await readFile(resolve(sandbox, "tests/tool-sample-widget.test.mjs"), "utf8");
    assert.match(testFile, /MarsSampleWidgetCore/);
    assert.match(testFile, /filename: "tools\/sample-widget\.js"/, "vm scripts must be named for coverage");

    // Both catalogs must have been updated.
    const manifest = JSON.parse((await readFile(resolve(sandbox, "tools/tools.json"), "utf8")).replace(/^﻿/, ""));
    assert.deepEqual(
      manifest.tools.find((tool) => tool.id === "sample-widget"),
      { label: "Sample Widget", script: "./tools/sample-widget.js", id: "sample-widget" }
    );
    const manager = await readFile(resolve(sandbox, "assets/js/app-modules/12-ui-tool-manager.js"), "utf8");
    assert.match(manager, /\{ id: "sample-widget", label: "Sample Widget", script: "\.\/tools\/sample-widget\.js" \},/);
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

test("the generated core runs and behaves without a DOM", async () => {
  const sandbox = await generateIntoSandbox("probe-widget", "Probe Widget");
  try {
    const source = await readFile(resolve(sandbox, "tools/probe-widget.js"), "utf8");
    const context = vm.createContext({});
    // No `document`, no `MarsWebTools`: the tool must load anyway and expose
    // its core, which is what makes it testable in Node.
    vm.runInContext(source, context, { filename: "tools/probe-widget.js" });
    const core = context.MarsProbeWidgetCore;
    assert.ok(core, "the generated tool must expose its core with no DOM present");

    const summary = core.summarize({ assembled: true, steps: 4, pcHex: "0x00400008", textRows: [{}, {}] });
    assert.equal(summary.instructions, 2);
    assert.equal(summary.steps, 4);
    assert.equal(core.summarize(null).assembled, false);
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

test("labels with quotes remain valid data in the tool and both catalogs", async () => {
  const label = 'Quoted "Widget" <safe> & sound';
  const sandbox = await generateIntoSandbox("quoted-widget", label);
  try {
    const source = await readFile(resolve(sandbox, "tools/quoted-widget.js"), "utf8");
    assert.doesNotThrow(() => new vm.Script(source));

    const manifest = JSON.parse(await readFile(resolve(sandbox, "tools/tools.json"), "utf8"));
    assert.equal(manifest.tools.find((tool) => tool.id === "quoted-widget")?.label, label);

    const manager = await readFile(resolve(sandbox, "assets/js/app-modules/12-ui-tool-manager.js"), "utf8");
    assert.ok(
      manager.includes(`{ id: "quoted-widget", label: ${JSON.stringify(label)}, script: "./tools/quoted-widget.js" },`),
      "the fallback catalog must contain an escaped JavaScript string literal"
    );
    assert.match(source, new RegExp(`label: ${JSON.stringify(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

test("the generator is documented where a contributor will look for it", async () => {
  const toolApi = await readFile(resolve(projectRoot, "docs/tool-api.md"), "utf8");
  assert.ok(toolApi.includes("scripts/new-tool.mjs"), "docs/tool-api.md must point at the generator");
});
