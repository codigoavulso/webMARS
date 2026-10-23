import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile, mkdtemp, writeFile, symlink, unlink, rm } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { IDBFactory } from "fake-indexeddb";
import { resolvePublicFile, resolveRequestPath } from "../scripts/serve.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const runtime = await readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8");
const manager = await readFile(resolve(projectRoot, "assets/js/app-modules/21-project-manager.js"), "utf8");
const repository = await readFile(resolve(projectRoot, "assets/js/app-modules/20-project-repository.js"), "utf8");
const LIBRARY = "mars45-web-project-library-v1", ACTIVE = "mars45-web-project-v1", TRASH = "webmars-project-trash-v1";
const sample = (name = "test") => ({ id: name, rootPath: `${name}.p`, name, files: [{ path: "main.s", source: "nop" }] });
const fn = (source, name, indent = "") => {
  const match = source.match(new RegExp(`^${indent}(?:async )?function ${name}\\([\\s\\S]*?^${indent}\\}`, "m"));
  assert.ok(match, name);
  return match[0];
};

class Storage {
  values = new Map();
  failKey = "";
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { if (this.failKey === key) throw new Error("QuotaExceededError"); this.values.set(key, String(value)); }
  removeItem(key) { if (this.failKey === key) throw new Error("QuotaExceededError"); this.values.delete(key); }
}

async function setup(indexedDB = new IDBFactory()) {
  const localStorage = new Storage();
  const project = sample();
  const library = { version: 1, activeRootPath: project.rootPath, projects: [project] };
  localStorage.setItem(LIBRARY, JSON.stringify(library));
  localStorage.setItem(ACTIVE, JSON.stringify(project));
  const window = { localStorage, indexedDB: indexedDB ?? undefined };
  vm.runInNewContext(repository, { window, console });
  const repo = window.WebMarsProjectRepository;
  const db = await repo.ready;
  const context = vm.createContext({
    window, console, projectLibraryState: library, PROJECT_LIBRARY_STORAGE_KEY: LIBRARY, PROJECT_STORAGE_KEY: ACTIVE,
    normalizeProjectLibraryData: value => value, normalizeProjectRootPath: value => value,
    setCloudProjectSyncDocument() {}, deleteCloudProjectsByName() { throw new Error("Remote deletion must never happen"); }
  });
  for (const name of ["saveProjectLibraryData", "saveProjectData", "readProjectStorageSnapshot", "restoreProjectStorageValue", "saveProjectAndLibraryData", "normalizeProjectRootKey", "removeProjectFromLibrary"]) {
    vm.runInContext(fn(runtime, name), context);
  }
  return { localStorage, project, library, window, repo, db, context };
}

async function readStore(db, name) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, "readonly"), req = tx.objectStore(name).getAll();
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}

test("failed active-project write rolls back the catalogue without mirroring rejected data", async () => {
  const h = await setup();
  h.localStorage.failKey = ACTIVE;
  h.context.next = sample("new");
  h.context.nextLibrary = { projects: [h.context.next], activeRootPath: "new.p" };
  assert.equal(vm.runInContext("saveProjectAndLibraryData(next, nextLibrary)", h.context), false);
  await h.repo.mirrorLibrary();
  assert.equal(JSON.parse(h.localStorage.getItem(LIBRARY)).projects[0].id, "test");
  assert.equal((await readStore(h.db, "projects"))[0].id, "test");
});

test("normal local deletion creates recoverable data and never deletes the cloud copy", async () => {
  const h = await setup();
  assert.equal(vm.runInContext('removeProjectFromLibrary("test.p", { deleteFromCloud: true })', h.context), true);
  await h.repo.mirrorLibrary();
  assert.equal((await h.repo.listProjects()).length, 0);
  assert.equal((await readStore(h.db, "projects")).length, 0);
  const trash = await h.repo.listProjects({ trash: true });
  assert.equal(trash.length, 1);
  assert.equal(trash[0].project.files[0].source, "nop");
  assert.equal((await readStore(h.db, "trash"))[0].project.files[0].source, "nop");
});

test("delete and restore round trip preserves code, handles a reused name and rolls back failed restore", async () => {
  const h = await setup();
  vm.runInContext('removeProjectFromLibrary("test.p")', h.context);
  const managerContext = vm.createContext({ root: h.window, TRASH_KEY: TRASH });
  for (const name of ["stableId", "localProject", "readTrash", "localRootPath", "prepareLocalCopy"]) {
    vm.runInContext(fn(manager, name, "  "), managerContext);
  }
  const removed = vm.runInContext("readTrash()[0]", managerContext);
  assert.equal(removed.source.files[0].source, "nop");
  h.context.normalizeProjectData = value => value;
  h.context.ensureProjectLibraryQuota = () => ({ ok: true });
  h.context.renderProjectTree = () => {};
  h.context.PROJECT_LIBRARY_SCHEMA_VERSION = 1;
  for (const name of ["buildProjectLibraryCandidate", "upsertProjectInLibrary", "findProjectInLibrary"]) {
    vm.runInContext(fn(runtime, name), h.context);
  }
  const restore = runtime.match(/  restoreLocal\(project, trashId\) \{[\s\S]*?\n  \},/)[0]
    .replace("  restoreLocal(", "function restoreLocal(").slice(0, -1);
  vm.runInContext(restore, h.context);
  h.context.newProject = { ...sample(), files: [{ path: "main.s", source: "new code" }] };
  vm.runInContext("upsertProjectInLibrary(newProject)", h.context);
  managerContext.source = removed.source;
  managerContext.library = h.context.projectLibraryState.projects;
  h.context.recovered = vm.runInContext("prepareLocalCopy(source, library)", managerContext);
  h.context.trashId = removed.id;
  h.localStorage.failKey = LIBRARY;
  assert.equal(vm.runInContext("restoreLocal(recovered, trashId)", h.context), false);
  assert.equal((await h.repo.listProjects({ trash: true })).length, 1);
  h.localStorage.failKey = "";
  assert.equal(vm.runInContext("restoreLocal(recovered, trashId)", h.context), true);
  await h.repo.mirrorLibrary();
  const projects = await readStore(h.db, "projects");
  assert.equal(projects.length, 2);
  assert.equal(projects.find(p => p.rootKey === "test.p").project.files[0].source, "new code");
  assert.equal(projects.find(p => p.rootKey === "test (2).p").project.files[0].source, "nop");
  assert.equal((await h.repo.listProjects({ trash: true })).length, 0);
});

test("trash quota and active-write failures leave the live project available", async () => {
  for (const failingKey of [TRASH, ACTIVE]) {
    const h = await setup();
    h.localStorage.failKey = failingKey;
    assert.equal(vm.runInContext('removeProjectFromLibrary("test.p")', h.context), false);
    assert.equal((await h.repo.listProjects()).length, 1);
    assert.equal((await h.repo.listProjects({ trash: true })).length, 0);
  }
});

test("without IndexedDB the trash and active catalogues stay distinct, including empty lists", async () => {
  const h = await setup(null);
  assert.equal(h.db, null);
  h.localStorage.setItem(TRASH, JSON.stringify([{ ...sample("deleted"), deletedAt: 1 }]));
  assert.equal((await h.repo.listProjects({ trash: true }))[0].project.rootPath, "deleted.p");
  h.localStorage.setItem(LIBRARY, JSON.stringify({ projects: [] }));
  assert.equal((await h.repo.listProjects()).length, 0);
});

test("request success followed by transaction abort rejects project and session writes", async () => {
  for (const operation of ["project", "session"]) {
    const h = await setup();
    const transact = h.db.transaction.bind(h.db);
    h.db.transaction = (...args) => {
      const tx = transact(...args);
      const objectStore = tx.objectStore.bind(tx);
      tx.objectStore = name => {
        const store = objectStore(name), put = store.put.bind(store);
        store.put = value => { const req = put(value); req.addEventListener("success", () => tx.abort()); return req; };
        return store;
      };
      return tx;
    };
    await assert.rejects(operation === "project" ? h.repo.saveProject(sample("aborted")) : h.repo.saveSession({ files: [] }));
  }
});

test("queued mirrors read only the latest committed catalogue and replace old root IDs atomically", async () => {
  const h = await setup();
  const stale = h.repo.mirrorLibrary({ projects: [sample("stale")] });
  const replacement = { ...sample(), id: "replacement-id" };
  h.localStorage.setItem(LIBRARY, JSON.stringify({ projects: [replacement] }));
  await stale;
  assert.equal((await readStore(h.db, "projects"))[0].id, "replacement-id");
  h.localStorage.setItem(LIBRARY, JSON.stringify({ projects: [] }));
  await h.repo.mirrorLibrary();
  assert.equal((await readStore(h.db, "projects")).length, 0);
});

test("import and restore allocate normalized free roots and unused identities", () => {
  const context = vm.createContext({ root: { crypto: { randomUUID: () => "occupied-id" } } });
  vm.runInContext(["stableId", "localRootPath", "prepareLocalCopy"].map(name => fn(manager, name, "  ")).join("\n"), context);
  context.library = [{ ...sample("TEST"), id: "occupied-id" }, sample("test (2)")];
  for (const name of ["test", "test.p", "TEST.P"]) {
    context.source = { name, rootPath: name, files: sample().files, deletedAt: 1 };
    const copy = vm.runInContext("prepareLocalCopy(source, library)", context);
    assert.equal(copy.rootPath.toLowerCase(), "test (3).p");
    assert.notEqual(copy.id, "occupied-id");
    assert.equal(copy.deletedAt, undefined);
  }
});

test("import rejects oversized files before reading and malformed paths before persisting", async () => {
  const context = vm.createContext({ MAX_IMPORT_BYTES: 8 * 1024 * 1024, TextEncoder, t: value => value,
    state: {}, renderList() {}, file: { size: 9 * 1024 * 1024, text() { throw new Error("must not read"); } } });
  vm.runInContext(fn(manager, "validateImportedProject", "  "), context);
  vm.runInContext(fn(manager, "importFile", "    "), context);
  await vm.runInContext("importFile(file)", context);
  assert.doesNotMatch(context.state.error, /must not read/);
  assert.ok(context.state.error);
  for (const path of ["../secret.s", "/absolute.s", "C:/secret.s"]) {
    context.source = { files: [{ path, source: "nop" }] };
    assert.throws(() => vm.runInContext("validateImportedProject(source)", context));
  }
});

test("archived publications use the same pinned loader for browsing, opening and exporting", async () => {
  const calls = [];
  const context = vm.createContext({ requestJson: async path => { calls.push(path); return { publication: { project: sample() } }; } });
  vm.runInContext(fn(manager, "loadPublication", "  "), context);
  context.item = { location: "mine", path: "example", source: { status: "archived", latestRevision: 3 } };
  await vm.runInContext("loadPublication(item)", context);
  assert.equal(calls[0], "/publications/example/revisions/3");
  for (const name of ["browseFiles", "openSelected", "exportSelected"]) assert.match(fn(manager, name, "    "), /loadPublication\(item\)/);
});

test("development server serves public modules and refuses internal or external symlink files", async () => {
  assert.equal(resolveRequestPath("/.git/config"), null);
  assert.equal(await resolvePublicFile(resolve(projectRoot, "package.json")), null);
  assert.ok(await resolvePublicFile(resolve(projectRoot, "manual/content/index.mjs")));
  const scratch = await mkdtemp(join(tmpdir(), "webmars-server-security-"));
  const link = resolve(projectRoot, "assets", `security-test-${process.pid}`);
  try {
    await writeFile(join(scratch, "secret.js"), "private");
    // Windows directory junctions do not require symlink privileges.
    await symlink(scratch, link, "junction");
    assert.equal(await resolvePublicFile(join(link, "secret.js")), null);
  } finally {
    await unlink(link).catch(() => {});
    assert.ok(resolve(scratch).startsWith(`${resolve(tmpdir())}${sep}webmars-server-security-`));
    await rm(scratch, { recursive: true, force: true });
  }
});

test("fatal module failures remain visible with a working reload button", async () => {
  const html = await readFile(resolve(projectRoot, "index.html"), "utf8");
  const bundle = await readFile(resolve(projectRoot, "assets/js/app.bundle.js"), "utf8");
  const bootstrap = html.match(/\(function bootstrapWebMars\(\) \{[\s\S]*?\}\)\(\);/)[0];
  class Element {
    children = []; textContent = ""; style = {}; classList = { add() { throw new Error("Fatal loader must not be hidden"); } };
    appendChild(child) { this.children.push(child); }
    addEventListener(name, callback) { this[name] = callback; }
  }
  const elements = new Map(["webmars-loader", "webmars-loader-title", "webmars-loader-text"].map(id => [id, new Element()]));
  const listeners = new Map(), timers = new Map();
  let reloads = 0;
  const window = {
    addEventListener(name, callback) { listeners.set(name, callback); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
    setTimeout(callback) { timers.set(1, callback); return 1; }, clearTimeout(id) { timers.delete(id); },
    location: { reload() { reloads++; } }
  };
  const document = {
    getElementById(id) { return elements.get(id) || elements.get("webmars-loader").children.find(child => child.id === id); },
    createElement: () => new Element(), body: new Element(), querySelector: () => new Element()
  };
  const context = vm.createContext({ window, document, HTMLElement: Element, console: { error() {} },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } } });
  vm.runInContext(bootstrap, context);
  vm.runInContext(fn(bundle, "dispatchLoaderEvent", "  ") + fn(bundle, "reportModuleFailure", "  ") + '; reportModuleFailure("broken.js")', context);
  assert.match(elements.get("webmars-loader-text").textContent, /broken.js/);
  assert.equal(timers.size, 0);
  window.dispatchEvent({ type: "webmars:tools-ready" });
  const retry = document.getElementById("webmars-loader-retry");
  assert.ok(retry);
  retry.click();
  assert.equal(reloads, 1);
});
