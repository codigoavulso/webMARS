import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js");

test("different cloud copies require confirmation and batch saves never overwrite them", async () => {
  const source = await readFile(runtimePath, "utf8");
  const save = source.match(/async function saveProjectToCloud\([\s\S]*?\n\}/)[0];
  for (const interactive of [true, false]) {
    let writes = 0;
    let prompts = 0;
    const remote = { id: 1, etag: "version-read-before-confirmation", project: { files: ["remote"] } };
    const context = vm.createContext({
      Map, normalizeProjectData: value => value, serializeProjectForCloud: value => value,
      normalizeProjectRootKey: value => value, loadCloudProject: async () => remote,
      deserializeProjectFromCloudDocument: value => value,
      buildProjectCloudSyncSummary: () => ({ projectTone: "amber" }),
      translateText: value => value, resolveCloudProjectConflict: async () => { prompts++; return null; },
      cloudRequestJson: async () => { writes++; }, setCloudProjectSyncDocument() {},
      project: { rootPath: "example" }, remotes: new Map([["example", remote]]), interactive
    });
    await assert.rejects(vm.runInContext(`${save}; saveProjectToCloud(project, remotes, { interactive })`, context), error => error.status === 412);
    assert.equal(writes, 0);
    assert.equal(prompts, interactive ? 1 : 0);
  }
});

test("cloud mutations always carry an optimistic-locking token", async () => {
  const source = await readFile(runtimePath, "utf8");

  assert.match(
    source,
    /method: "PUT",[\s\S]*?headers: \{ "If-Match": versionToken \}/,
    "project saves must send the version they read"
  );
  assert.match(
    source,
    /cloudRequestJson\(`\/v2\/projects\/\$\{id\}\/trash`, \{ method: "POST", headers: \{ "If-Match": item\.source\.etag \} \}\)/,
    "explicit Cloud recycling must not remove a concurrently changed remote copy"
  );
  assert.doesNotMatch(source, /function deleteCloudProjectsByName\(/, "there must be no implicit permanent Cloud deletion by name");
  assert.match(
    source,
    /if \(!versionToken\) throw new Error\(translateText\("The cloud service did not provide a project version token\."\)\);/,
    "the client must fail closed when the server omits a token"
  );
});

test("conflict choices preserve both copies or replace only the selected version", async () => {
  const source = await readFile(runtimePath, "utf8");
  const ui = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");
  const formResult = ui.match(/resolveActive\((\{ ok: true, value: collectFormValues\(\) \})\)/)?.[1];
  assert.ok(formResult, "use the real dialog form result contract");
  const save = source.match(/async function saveProjectToCloud\([\s\S]*?\n\}/)[0];
  for (const choice of ["both", "local", "cloud"]) {
    const writes = [], copies = [], imports = [];
    const remote = { id: 1, etag: "reviewed-version", project: { rootPath: "example", files: [] } };
    const context = vm.createContext({
      Map, normalizeProjectData: value => value, serializeProjectForCloud: value => value,
      normalizeProjectRootKey: value => value, loadCloudProject: async () => remote,
      deserializeProjectFromCloudDocument: value => value,
      buildProjectCloudSyncSummary: () => ({ projectTone: "amber" }),
      translateText: value => value,
      resolveCloudProjectConflict: async () => vm.runInNewContext(`(${formResult})`, {
        collectFormValues: () => ({ choice, newName: "separate-copy" })
      }),
      upsertProjectInLibrary: value => { copies.push(value); return value; },
      importCloudProjectRecord: value => { imports.push(value); return value.project; },
      cloudRequestJson: async (url, options) => { writes.push({ url, ...options }); return { project: remote }; },
      setCloudProjectSyncDocument() {},
      project: { rootPath: "example", files: [] }, remotes: new Map([["example", remote]])
    });
    await vm.runInContext(`${save}; saveProjectToCloud(project, remotes)`, context);
    if (choice === "both") {
      assert.equal(copies[0].rootPath, "separate-copy");
      assert.equal(writes[0].method, "POST");
      assert.equal(writes[0].body.name, "separate-copy");
    } else if (choice === "local") {
      assert.equal(writes[0].method, "PUT");
      assert.equal(writes[0].headers["If-Match"], "reviewed-version");
    } else {
      assert.equal(writes.length, 0);
      assert.equal(imports[0], remote);
    }
  }
});

test("conflict dialog defaults to keeping both and rejects duplicate names", async () => {
  const source = await readFile(runtimePath, "utf8");
  const resolver = source.match(/async function resolveCloudProjectConflict\([\s\S]*?\n\}/)[0];
  let form;
  const context = vm.createContext({
    translateText: value => value, runDialogForm: async options => { form = options; return null; },
    listCloudProjects: async () => [{ name: "Taken" }],
    normalizeProjectRootKey: value => value.toLowerCase(), findProjectInLibrary: name => name === "local",
    local: { rootPath: "example", files: [{ path: "main.s", source: "local code" }] },
    remote: { rootPath: "example", files: [{ path: "main.s", source: "remote code" }] }
  });
  await vm.runInContext(`${resolver}; resolveCloudProjectConflict(local, remote)`, context);
  assert.equal(form.sections[0].fields[0].readOnly, true);
  assert.match(form.sections[0].fields[0].value, /local code/);
  assert.match(form.sections[1].fields[0].value, /remote code/);
  assert.equal(form.sections[2].fields[0].value, "both");
  for (const newName of ["", "TAKEN", "local", "folder/name"]) {
    const result = await form.beforeResolve({ choice: "both", newName }, { setMessage() {} });
    assert.equal(result.close, false);
  }
  assert.equal((await form.beforeResolve({ choice: "both", newName: "fresh" }, {})).close, true);
});

test("cloud status refresh batches documents and compensates clock skew at the request midpoint", async () => {
  const source = await readFile(runtimePath, "utf8");

  assert.match(source, /listCloudProjects\(\{ includeDocuments: true \}\)/);
  assert.match(source, /"\/projects\?include=documents"/);
  assert.match(
    source,
    /serverTime - Math\.floor\(\(startedAt \+ receivedAt\) \/ 2\)/,
    "network latency must be split across the clock-offset estimate"
  );
  assert.match(
    source,
    /const projectRecord = remoteMeta\.project\s*\? remoteMeta\s*: await loadCloudProject\(remoteMeta\.id\);/,
    "batched documents must avoid one GET per project"
  );
});

test("project rename uses the same versioned remote record instead of duplicating it", async () => {
  const source = await readFile(runtimePath, "utf8");

  assert.match(source, /async function renameCloudProjectByName\(/);
  assert.match(
    source,
    /cloudRequestJson\(`\/projects\/\$\{remote\.id\}`,[\s\S]*?method: "PUT",[\s\S]*?headers: \{ "If-Match": versionToken \},[\s\S]*?body: \{ name: nextName \}/
  );
  assert.match(source, /await renameCloudProjectByName\(rootPath, nextRootPath\);/);
});

test("cloud project identity follows the client's case-insensitive project keys", async () => {
  const source = await readFile(runtimePath, "utf8");

  assert.match(source, /const key = normalizeProjectRootKey\(project\?\.name \|\| ""\);/);
  assert.doesNotMatch(source, /remoteByName\.get\(localProject\.rootPath\)/);
  assert.match(source, /remoteProjectsByName\.get\(normalizeProjectRootKey\(projectName\)\)/);
});

test("the Cloud Save command uploads the active project", async () => {
  const source = await readFile(runtimePath, "utf8");
  assert.match(
    source,
    /async cloudSaveProject\(\) \{\s*return saveActiveProjectToCloud\(\);\s*\}/,
    "Cloud > Save Project must not call the local-only workspace save command"
  );
});
