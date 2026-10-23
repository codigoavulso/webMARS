import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const read = file => readFile(new URL(`../assets/js/app-modules/${file}`, import.meta.url), "utf8");
const metadataSource = await read("17-mini-c-interface.js");
const compilerSource = await read("17-mini-c-compiler.js");
const bootstrapSource = await read("20-project-bootstrap.js");
const runtime = await read("20-app-runtime.js");

function lazyCompiler() {
  const scripts = [], timers = new Map();
  const sandbox = { URL, console, setTimeout(callback) { timers.set(1, callback); return 1; }, clearTimeout(id) { timers.delete(id); },
    WebMarsAppVersion: { withVersion: path => `${path}?v=0.6.5` },
    document: { currentScript: { src: "https://example.test/mips/assets/js/app-modules/17-mini-c-interface.js?v=0.6.5" },
      createElement: () => ({ remove() { this.removed = true; } }), head: { appendChild(script) { scripts.push(script); } } }
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  vm.runInContext(metadataSource, context);
  return { context, sandbox, scripts, timers, metadata: sandbox.WebMarsModules.miniCInterface };
}

test("editor metadata loads without fetching the compiler; concurrent requests share one load", async () => {
  const h = lazyCompiler();
  assert.equal(h.scripts.length, 0);
  assert.equal(h.metadata.isSourceFile("main.C0"), true);
  assert.equal(h.metadata.deriveGeneratedAsmName("src/main.c"), "main.generated.s");
  const first = h.metadata.load(), second = h.metadata.load();
  assert.equal(first, second);
  assert.equal(h.scripts.length, 1);
  assert.equal(h.scripts[0].src, "https://example.test/mips/assets/js/app-modules/17-mini-c-compiler.js?v=0.6.5");
  vm.runInContext(compilerSource, h.context);
  h.scripts[0].onload();
  const compiler = await first;
  const result = compiler.compile("int main(void) { return 0; }", { sourceName: "main.c" });
  assert.equal(result.ok, true);
  assert.equal(await h.metadata.load(), compiler);
  assert.equal(h.scripts.length, 1);
});

test("failed or timed out compiler loads can be retried without restarting the app", async () => {
  for (const reason of ["network", "timeout", "missing-registration"]) {
    const h = lazyCompiler();
    const failed = h.metadata.load();
    if (reason === "network") h.scripts[0].onerror();
    else if (reason === "timeout") h.timers.get(1)();
    else h.scripts[0].onload();
    await assert.rejects(failed, /Failed to load file/);
    assert.equal(h.scripts[0].removed, true);
    const retried = h.metadata.load();
    vm.runInContext(compilerSource, h.context);
    h.scripts[1].onload();
    assert.equal((await retried).defaultTemplate, h.metadata.defaultTemplate);
  }
});

function resolveBootstrap(options) {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.runInNewContext(bootstrapSource, sandbox);
  return sandbox.WebMarsModules.projectBootstrap.resolve({
    rootKey: value => String(value || "").toLowerCase(),
    createDefault: () => ({ rootPath: "project.p", isOpen: true, files: [{ path: "main.s", source: "default" }] }),
    normalizeLibrary: value => value,
    ...options
  });
}

test("a valid empty catalogue does not resurrect deleted projects from active or session snapshots", () => {
  const result = resolveBootstrap({ library: { projects: [], activeRootPath: "" },
    project: { rootPath: "deleted.p", files: [{ source: "deleted code" }] },
    session: { activeFileId: "old", files: [{ id: "old", name: "old.s", source: "deleted code", projectOwned: true }] }
  });
  assert.equal(result.library.projects.length, 0);
  assert.equal(result.project.isOpen, false);
  assert.equal(result.project.files.length, 0);
  assert.equal(result.session.files.length, 0);
  const context = vm.createContext({ ...result, bootstrapProject: result.project, bootstrapProjectLibrary: result.library,
    restoredSession: result.session, INITIAL_SOURCE: "must not resurrect" });
  for (const name of ["buildStartupEditorFiles", "resolveStartupActiveFileId"]) {
    vm.runInContext(runtime.match(new RegExp(`^function ${name}\\([\\s\\S]*?^\\}`, "m"))[0], context);
  }
  const start = runtime.indexOf("const fallbackInitialFileId"), end = runtime.indexOf("\nconst store =", start);
  vm.runInContext(runtime.slice(start, end), context);
  assert.equal(vm.runInContext("initialActiveFile.source", context), "");
  assert.equal(vm.runInContext("initialActiveFile.projectOwned", context), false);
});

test("empty project catalogue retains independent editor files and their active selection", () => {
  const external = { id: "external", source: "independent", projectOwned: false };
  const result = resolveBootstrap({ library: { projects: [] }, session: { activeFileId: "old", files: [{ id: "old" }, external] } });
  assert.equal(result.session.files[0], external);
  assert.equal(result.session.activeFileId, "external");
});

test("committed catalogue takes precedence over an older active project; legacy sessions still migrate", () => {
  const project = { rootPath: "current.p", files: [{ source: "current" }] };
  const result = resolveBootstrap({ library: { activeRootPath: "current.p", projects: [project] }, project: { rootPath: "deleted.p" } });
  assert.equal(result.project, project);
  assert.equal(result.library.projects.length, 1);
  const legacy = { rootPath: "legacy.p" };
  assert.equal(resolveBootstrap({ project: legacy }).library.projects[0], legacy);
  let migrated;
  resolveBootstrap({ session: { files: [{ id: "local", name: "display.c", sourceProjectPath: "src/main.c", source: "unsaved", savedSource: "saved" },
    { id: "external", name: "external.s", source: "external", projectOwned: false }, null] },
    createDefault: options => { migrated = options; return { rootPath: "project.p", ...options }; }
  });
  assert.equal(migrated.files.length, 1);
  assert.equal(migrated.files[0].path, "src/main.c");
  assert.equal(migrated.files[0].savedSource, "saved");
});
