import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../assets/js/app-modules/13-ui-menu-system.js", import.meta.url), "utf8");
const definitions = source.slice(source.indexOf("  const definitions ="), source.indexOf("  let activeMenu"));
function menu(authenticated, isOpen = true, emailVerified = false) {
  const context = vm.createContext({ handlers: {}, refs: {}, toolManager: { getTools: () => [] }, translateText: s => s,
    getState: () => ({ cloud: { authenticated, user: { username: "sample", emailVerified } }, project: { isOpen }, files: [] }) });
  return vm.runInContext(`${definitions}; definitions();`, context);
}
function commands(items) {
  return items.flatMap(item => item === "-" ? [] : item.submenu ? commands(item.submenu) : item.command ? [item] : []);
}

test("Online consolidates all previous Cloud and Library commands", () => {
  const anon = menu(false), signed = menu(true);
  assert(!anon.Cloud && !anon.Library && anon.Online);
  const names = new Set([...commands(anon.Online), ...commands(signed.Online)].map(i => i.command));
  for (const name of ["cloudLogin", "cloudLogout", "cloudRegister", "cloudPasswordReset", "cloudLinkProvider", "cloudVerifyEmail", "cloudRefreshSession", "cloudOpenProject", "cloudSaveProject", "cloudSyncProject", "cloudSyncAllProjects", "publicBrowse", "publicOpenLink", "publicCopyExampleLink", "publicPublish", "publicManage"]) {
    assert(names.has(name), `Online must retain ${name}`);
  }
  assert(!commands(anon.Online).some(i => i.command === "cloudLogout"));
  assert(!commands(signed.Online).some(i => i.command === "cloudRegister"));
  assert(!commands(menu(true, true, true).Online).some(i => i.command === "cloudVerifyEmail"));
});

test("Online leaves browsing public and restricts mutations to their context", () => {
  for (const [authenticated, isOpen] of [[false, false], [false, true], [true, false], [true, true]]) {
    const items = commands(menu(authenticated, isOpen).Online);
    const enabled = name => { const item = items.find(i => i.command === name); return item.enabled?.() !== false; };
    assert(enabled("publicBrowse"));
    assert(enabled("cloudOpenProject"));
    assert.equal(enabled("cloudSaveProject"), authenticated && isOpen);
    assert.equal(enabled("cloudSyncProject"), authenticated && isOpen);
    assert.equal(enabled("cloudSyncAllProjects"), authenticated);
    assert.equal(enabled("publicManage"), authenticated);
    assert.equal(enabled("publicPublish"), isOpen);
  }
});
