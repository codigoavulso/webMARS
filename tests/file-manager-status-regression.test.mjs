import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

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
