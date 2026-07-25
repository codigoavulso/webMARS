import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";
import {
  createJavaScriptEngine,
  loadInitialSource,
  loadRuntimeSettings,
  projectRoot
} from "./helpers/engines.mjs";

const arithmeticProgram = `
.text
main:
  addi $t0, $zero, 5
  addi $t1, $zero, 7
  add  $t2, $t0, $t1
  sll  $t3, $t2, 1
  sw   $t3, 0($sp)
  lw   $s0, 0($sp)
  ori  $v1, $zero, 42
`;

function extractNamedFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const openBrace = source.indexOf("{", start);
  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

test("runtime memory settings expose the JavaScript engine limit", async () => {
  const settings = await loadRuntimeSettings();
  assert.equal(settings.MAX_MEMORY_GB, 2);
  assert.equal(settings.MAX_MEMORY_BYTES, 0x7fffffff);
  assert.equal(settings.memoryGbToBytes(1), 1024 ** 3);
  assert.equal(settings.memoryGbToBytes(2), 0x7fffffff);
  assert.equal(settings.memoryGbToBytes(16), 0x7fffffff);

  const engine = await createJavaScriptEngine({ settings: { maxMemoryBytes: 16 * 1024 ** 3 } });
  assert.equal(engine.getSnapshot().maxMemoryBytes, 0x7fffffff);
});

test("runtime address settings reject partial and out-of-range values", async () => {
  const settings = await loadRuntimeSettings();
  const fallback = 0x80000180;

  assert.equal(settings.parseAddressPreference("0x00400000", fallback), 0x00400000);
  assert.equal(settings.parseAddressPreference("4194304", fallback), 0x00400000);
  assert.equal(settings.parseAddressPreference("123abc", fallback), fallback);
  assert.equal(settings.parseAddressPreference("0x123xyz", fallback), fallback);
  assert.equal(settings.parseAddressPreference("4294967296", fallback), fallback);
  assert.equal(settings.parseAddressPreference("-1", fallback), fallback);
  assert.equal(settings.isValidAddressPreference("0xffffffff"), true);
  assert.equal(settings.isValidAddressPreference("123abc"), false);
});

test("JavaScript engine assembles and executes a representative program", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff } });
  const assembled = engine.assemble(arithmeticProgram, { sourceName: "arithmetic.asm" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));

  const result = engine.go(100);
  const snapshot = engine.getSnapshot();
  const registers = engine.exportRuntimeState({ includeProgram: false }).registers;
  assert.equal(result.ok, true);
  assert.equal(result.done, true);
  assert.equal(registers[10], 12);
  assert.equal(registers[11], 24);
  assert.equal(registers[16], 24);
  assert.equal(registers[3], 42);
  assert.equal(engine.readWord(registers[29] >>> 0), 24);
});

test("JavaScript assembler reports invalid instructions without crashing", async () => {
  const engine = await createJavaScriptEngine();
  const result = engine.assemble(".text\nmain:\n  definitely_not_mips $t0, $t1", { sourceName: "invalid.asm" });
  assert.equal(result.ok, false);
  assert.ok(Array.isArray(result.errors));
  assert.ok(result.errors.length > 0);
});

test("the shipped starter program executes successfully", async () => {
  const engine = await createJavaScriptEngine({ settings: { startAtMain: true } });
  const source = await loadInitialSource();
  const assembled = engine.assemble(source, { sourceName: "starter.s" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));

  const result = engine.go(100);
  assert.equal(result.ok, true);
  assert.equal(result.done, true);
  assert.notEqual(result.exception, true);
});

test("runtime settings update without resetting an assembled program", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxBacksteps: 100, maxMemoryBytes: 0x7fffffff }
  });
  const assembled = engine.assemble(arithmeticProgram, { sourceName: "settings.s" });
  assert.equal(assembled.ok, true);
  const stepped = engine.step();
  assert.equal(stepped.ok, true);
  const before = engine.getSnapshot();

  engine.setSettings({ maxBacksteps: 0, maxMemoryBytes: 512 * 1024 * 1024 });
  const after = engine.getSnapshot();
  assert.equal(after.assembled, true);
  assert.equal(after.steps, before.steps);
  assert.equal(after.pc, before.pc);
  assert.equal(after.backstepDepth, 0);
  assert.equal(after.maxMemoryBytes, 512 * 1024 * 1024);
});

test("browser bootstrap and preferences expose no WASM backend", async () => {
  const [bundle, ui, runtimeSettingsSource] = await Promise.all([
    readFile(resolve(projectRoot, "assets/js/app.bundle.js"), "utf8"),
    readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8"),
    readFile(resolve(projectRoot, "assets/js/app-modules/19-runtime-settings.js"), "utf8")
  ]);
  assert.doesNotMatch(bundle, /wasm|hybrid/i);
  assert.doesNotMatch(ui, /experimental JS \+ C\+\+|Runtime Engines/);
  assert.doesNotMatch(runtimeSettingsSource, /BACKEND_MODE|sanitizeBackendMode/);
});

test("workspace persistence keeps real fallbacks and one unload handler", async () => {
  const runtimeSource = await readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8");

  assert.match(runtimeSource, /function buildWorkspaceSessionPersistenceCandidates\(basePayload\)/);
  assert.match(
    runtimeSource,
    /return \[basePayload, withoutWindowState, withoutRedundantSavedSources, minimalRecoveryPayload\];/
  );
  assert.match(runtimeSource, /const attemptedPayloads = new Set\(\);/);
  assert.equal(
    (runtimeSource.match(/window\.addEventListener\("beforeunload", handleBeforeUnload\);/g) || []).length,
    1
  );
  assert.doesNotMatch(runtimeSource, /window\.onbeforeunload\s*=/);
});

test("local saves stay local and reload persistence flushes the active project", async () => {
  const runtimeSource = await readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8");
  const saveFileStart = runtimeSource.indexOf("\n  saveFile() {");
  const saveProjectStart = runtimeSource.indexOf("\n  async saveProjectWorkspace()", saveFileStart);
  const saveCommandsEnd = runtimeSource.indexOf("\n  saveFileToBrowserStorage()", saveProjectStart);

  assert.ok(saveFileStart >= 0 && saveProjectStart > saveFileStart && saveCommandsEnd > saveProjectStart);
  assert.doesNotMatch(runtimeSource.slice(saveFileStart, saveCommandsEnd), /saveActiveProjectToCloud|ensureCloudAuthenticated/);
  assert.doesNotMatch(runtimeSource, /\nvoid refreshCloudSession\(\{ silent: true \}\);/);
  assert.doesNotMatch(runtimeSource, /promptStartupRecoveryChoiceIfNeeded|STARTUP_RECOVERY_SKIP_SESSION_KEY/);
  assert.match(runtimeSource, /function flushPendingLocalPersistence\(\)/);
  assert.match(runtimeSource, /persistProjectNow\(\{ syncFromEditor: true \}\);/);
  assert.match(runtimeSource, /preferFallbackSource: sessionUpdatedAt >= projectUpdatedAt/);
  assert.match(runtimeSource, /updatedAt: Number\(parsed\.updatedAt\) \|\| 0/);
});

test("project persistence rolls back when localStorage rejects either transactional write", async () => {
  const runtimeSource = await readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8");
  const functionNames = [
    "saveProjectLibraryData",
    "saveProjectData",
    "readProjectStorageSnapshot",
    "restoreProjectStorageValue",
    "saveProjectAndLibraryData"
  ];
  const persistenceSource = functionNames
    .map((name) => extractNamedFunction(runtimeSource, name))
    .join("\n");

  function runFailure(failingKey) {
    const values = new Map([
      ["project", JSON.stringify({ name: "old-project" })],
      ["library", JSON.stringify({ projects: [{ name: "old-project" }] })]
    ]);
    const localStorage = {
      getItem(key) {
        return values.get(String(key)) ?? null;
      },
      setItem(key, value) {
        if (String(key) === failingKey) {
          throw new DOMException("quota", "QuotaExceededError");
        }
        values.set(String(key), String(value));
      },
      removeItem(key) {
        values.delete(String(key));
      }
    };
    const sandbox = {
      window: { localStorage },
      PROJECT_STORAGE_KEY: "project",
      PROJECT_LIBRARY_STORAGE_KEY: "library"
    };
    vm.runInNewContext(
      `${persistenceSource}\nglobalThis.result = saveProjectAndLibraryData({ name: "new-project" }, { projects: [{ name: "new-project" }] });`,
      sandbox
    );
    return { result: sandbox.result, values };
  }

  const firstWriteFailure = runFailure("library");
  assert.equal(firstWriteFailure.result, false);
  assert.deepEqual(JSON.parse(firstWriteFailure.values.get("project")), { name: "old-project" });
  assert.deepEqual(JSON.parse(firstWriteFailure.values.get("library")), { projects: [{ name: "old-project" }] });

  const secondWriteFailure = runFailure("project");
  assert.equal(secondWriteFailure.result, false);
  assert.deepEqual(JSON.parse(secondWriteFailure.values.get("project")), { name: "old-project" });
  assert.deepEqual(JSON.parse(secondWriteFailure.values.get("library")), { projects: [{ name: "old-project" }] });
});

test("project mutations and state slots only report success after persistence succeeds", async () => {
  const runtimeSource = await readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8");

  assert.match(runtimeSource, /if \(!saveProjectLibraryData\(candidateLibrary\)\) return null;/);
  assert.match(runtimeSource, /if \(!saveProjectAndLibraryData\(normalizedProject, candidateLibrary\)\) return null;/);
  assert.match(runtimeSource, /if \(!saveProjectAndLibraryData\(candidateActiveProject, candidateLibrary\)\) return false;/);
  assert.match(runtimeSource, /if \(!saveProjectAndLibraryData\(nextProjectState, candidateLibrary\)\) return false;/);
  assert.match(runtimeSource, /if \(!persistProjectNow\(\{ syncFromEditor: false \}\)\) \{\s*projectState = previousProjectState;\s*return null;/);
  assert.match(runtimeSource, /if \(!persistProjectNow\(\{ syncFromEditor: true \}\)\) \{\s*projectState = previousProjectState;\s*postMarsMessage\("\[error\] Failed to save to browser storage\."\);\s*return;\s*\}\s*postMarsMessage\("State stored in slot \{slot\}\."/);
});

test("rename, delete, close and editor sync commit storage before publishing state", async () => {
  const runtimeSource = await readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8");
  const renameStart = runtimeSource.indexOf("async function handleProjectTreeRenameAction()");
  const renameEnd = runtimeSource.indexOf("async function handleProjectTreeDeleteAction()", renameStart);
  const renameSource = runtimeSource.slice(renameStart, renameEnd);
  const closeSource = extractNamedFunction(runtimeSource, "closeProjectWorkspace");
  const syncSource = extractNamedFunction(runtimeSource, "syncProjectFromEditor");

  assert.match(renameSource, /const replaced = replaceProjectInLibrary\(/);
  assert.doesNotMatch(renameSource, /saveProjectData\(projectState\)|persistProjectStorageFromLibrary\(nextRootPath\)/);
  assert.ok(
    closeSource.indexOf("saveProjectAndLibraryData(nextProjectState, candidateLibrary)")
      < closeSource.indexOf("projectState = nextProjectState"),
    "close must persist before replacing projectState"
  );
  assert.match(syncSource, /const upserted = upsertProjectInLibrary\(nextProjectState, \{ makeActive: true \}\);/);
  assert.match(syncSource, /if \(!upserted\) return false;\s*projectState = nextProjectState;/);
  assert.match(
    runtimeSource,
    /if \(!persistProjectStorageFromLibrary\(projectLibraryState\?\.activeRootPath \|\| ""\)\) \{\s*postMarsMessage\("\[error\] Failed to save to browser storage\."\);\s*return;\s*\}/
  );
});

test("editor synchronization keeps the previous project state when library persistence fails", async () => {
  const runtimeSource = await readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8");
  const syncSource = extractNamedFunction(runtimeSource, "syncProjectFromEditor");
  const sandbox = {
    projectIsOpen: () => true,
    renderProjectTree: () => {},
    collectProjectFilesFromEditor: () => [{ id: "new", path: "src/new.s", source: "new" }],
    getProjectTreePathSignature: () => "changed",
    resolveProjectOwnedEditorActiveFile: (files) => files[0],
    normalizeProjectRootKey: (value) => String(value || ""),
    normalizeProjectData: (value) => ({ ...value }),
    upsertProjectInLibrary: () => null,
    editor: {
      getActiveFile: () => ({ id: "new", name: "src/new.s" })
    },
    lastProjectTreeActivePath: "",
    lastProjectTreePathSignature: ""
  };
  vm.runInNewContext(
    `let projectState = { rootPath: "demo.p", files: [{ id: "old", path: "src/old.s", source: "old" }], activeFileId: "old", updatedAt: 1 };
${syncSource}
globalThis.before = JSON.stringify(projectState);
globalThis.result = syncProjectFromEditor(true);
globalThis.after = JSON.stringify(projectState);`,
    sandbox
  );

  assert.equal(sandbox.result, false);
  assert.equal(sandbox.after, sandbox.before);
});

test("machine-state import validates before changing the active memory map", async () => {
  const runtimeSource = await readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8");
  const importStart = runtimeSource.indexOf("function importMachineState(");
  const importEnd = runtimeSource.indexOf("function computeMachineStateSignature(", importStart);
  assert.ok(importStart >= 0 && importEnd > importStart);
  const importSource = runtimeSource.slice(importStart, importEnd);

  assert.match(importSource, /engine\.importRuntimeState\(state, options\);/);
  assert.doesNotMatch(importSource, /engine\.setMemoryMap\(/);
});
