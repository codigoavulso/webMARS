import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

test("public and owned publications expand with numeric revisions and recover from errors", async () => {
  const source = await readFile(new URL("../assets/js/app-modules/21-project-manager.js", import.meta.url), "utf8");
  const escape = source.match(/  function esc\(value\) \{[\s\S]*?\n  \}/)[0];
  const browse = source.match(/    async function browseFiles\(node\) \{[\s\S]*?\n    \}/)[0];
  for (const location of ["public", "mine"]) {
    const inspector = {};
    const context = vm.createContext({
      root: { escapeHtml: value => value.replaceAll("<", "&lt;") },
      qs: () => inspector, t: String, expanded: new Set(), documents: new Map(),
      state: { error: "previous failure" }, remoteView: { render() {} },
      requestJson: async () => ({ publication: { title: "Example", revision: 2, project: { files: [{ path: "main.s", source: "nop" }] } } }),
      describeError: error => { throw error; },
      node: { key: location, type: "project", name: "Example", item: { location, path: "example", source: {} } }
    });
    await vm.runInContext(`${escape}\n${browse}\nbrowseFiles(node)`, context);
    assert.equal(context.expanded.has(location), true);
    assert.equal(context.documents.get(location).files[0].path, "main.s");
    assert.match(inspector.innerHTML, /r2/);
    assert.equal(context.state.error, "");
  }
});

test("status refreshes preserve mounted project controls and their listeners", async () => {
  const source = await readFile(new URL("../assets/js/app-modules/11-ui-file-manager.js", import.meta.url), "utf8");
  const renderStatus = source.match(/    function renderStatus\(\) \{[\s\S]*?\n    \}/)?.[0];
  assert.ok(renderStatus);
  const controls = { connected: true, clicks: 0, click() { this.clicks++; } };
  const cells = { innerHTML: "" };
  const status = {
    children: [cells, controls],
    set innerHTML(value) { this.children = []; controls.connected = false; }
  };
  let count = 1;
  const context = vm.createContext({
    features: { status: true }, statusNode: status, statusCellsNode: cells,
    callback: () => [`Projects: ${count}`], esc: String
  });
  vm.runInContext(`${renderStatus}; renderStatus();`, context);
  count = 2;
  vm.runInContext("renderStatus();", context);
  assert.match(cells.innerHTML, /Projects: 2/);
  assert.equal(controls.connected, true);
  assert.equal(status.children[1], controls);
  controls.click();
  assert.equal(controls.clicks, 1);
});
