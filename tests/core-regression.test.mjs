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

test("Bitmap MMIO configuration commits atomically and participates in backstep and state roundtrip", async () => {
  const engine = await createJavaScriptEngine({ settings: { maxBacksteps: 100 } });
  const assembled = engine.assemble(`
.text
main:
  li $t0, 0xffff0020
  li $t1, 0x57424d50
  sw $t1, 0($t0)
  li $t1, 1
  sw $t1, 4($t0)
  li $t1, 3
  sw $t1, 8($t0)
  li $t1, 128
  sw $t1, 12($t0)
  li $t1, 64
  sw $t1, 16($t0)
  li $t1, 2
  sw $t1, 20($t0)
  sw $t1, 24($t0)
  li $t1, 0x10020000
  sw $t1, 28($t0)
  li $t1, 1
  sw $t1, 32($t0)
  nop
`, { sourceName: "bitmap-mmio.asm" });
  assert.equal(assembled.ok, true, JSON.stringify(assembled.errors || []));

  for (let index = 0; index < 40 && !engine.getBitmapMmioConfig(); index += 1) {
    assert.equal(engine.step().ok, true);
  }
  assert.deepEqual({ ...engine.getBitmapMmioConfig() }, {
    protocolVersion: 1,
    target: 3,
    displayWidth: 128,
    displayHeight: 64,
    unitWidth: 2,
    unitHeight: 2,
    baseAddress: 0x10020000,
    controlAddress: 0xffff0020
  });
  assert.deepEqual(
    { ...engine.getSnapshot().bitmapMmioConfig },
    { ...engine.getBitmapMmioConfig() }
  );

  assert.equal(engine.backstep().ok, true);
  assert.equal(engine.getBitmapMmioConfig(), null);
  assert.equal(engine.step().ok, true);
  assert.equal(engine.getBitmapMmioConfig()?.displayWidth, 128);

  const exported = engine.exportRuntimeState();
  const restored = await createJavaScriptEngine();
  restored.importRuntimeState(exported);
  assert.deepEqual(
    { ...restored.getBitmapMmioConfig() },
    { ...engine.getBitmapMmioConfig() }
  );
});

test("Bitmap MMIO ignores incomplete or unsafe configurations and supports explicit clear", async () => {
  const engine = await createJavaScriptEngine();
  const addresses = engine.getBitmapMmioAddresses();

  engine.writeWord(addresses.version, 1);
  engine.writeWord(addresses.target, 1);
  engine.writeWord(addresses.displayWidth, 64);
  engine.writeWord(addresses.displayHeight, 64);
  engine.writeWord(addresses.unitWidth, 1);
  engine.writeWord(addresses.unitHeight, 1);
  engine.writeWord(addresses.framebuffer, 0x10010000);
  engine.writeWord(addresses.command, 1);
  assert.equal(engine.getBitmapMmioConfig(), null, "missing signature must not commit");

  engine.writeWord(addresses.signature, 0x57424d50);
  engine.writeWord(addresses.framebuffer, addresses.signature);
  engine.writeWord(addresses.command, 1);
  assert.equal(engine.getBitmapMmioConfig(), null, "framebuffer must not overlap the control block");

  engine.writeWord(addresses.framebuffer, 0x10010000);
  engine.writeWord(addresses.command, 1);
  assert.equal(engine.getBitmapMmioConfig()?.baseAddress, 0x10010000);
  engine.writeWord(addresses.command, 2);
  assert.equal(engine.getBitmapMmioConfig(), null);
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

test("window titlebar separators render inside the grid edge for Firefox", async () => {
  const ui = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");
  const titlebarRule = ui.match(/\.window-titlebar\s*\{(?<body>[^}]+)\}/)?.groups?.body || "";
  const separatorRule = ui.match(/\.window-titlebar::after\s*\{(?<body>[^}]+)\}/)?.groups?.body || "";
  const toolTitlebarRule = ui.match(/\.tool-window \.window-titlebar\s*\{(?<body>[^}]+)\}/)?.groups?.body || "";

  assert.match(titlebarRule, /--window-titlebar-separator:\s*var\(--titlebar-line\);/);
  assert.match(titlebarRule, /position:\s*relative;/);
  assert.match(titlebarRule, /border-bottom:\s*1px solid transparent;/);
  assert.match(separatorRule, /bottom:\s*0;/);
  assert.match(separatorRule, /height:\s*1px;/);
  assert.match(separatorRule, /background:\s*var\(--window-titlebar-separator\);/);
  assert.match(toolTitlebarRule, /--window-titlebar-separator:\s*var\(--flat-line\);/);
});

test("opening a window makes it the active mobile panel", async () => {
  const ui = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");
  const activateMobilePanel = extractNamedFunction(ui, "activateMobilePanelForEntry");
  const showWindow = extractNamedFunction(ui, "show");

  assert.match(activateMobilePanel, /if \(!isStackedMode\(\) \|\| !entry \|\| isHiddenEntry\(entry\)\) return false;/);
  assert.match(activateMobilePanel, /if \(entry\.kind !== "native" && !isStackedToolEntry\(entry\)\) return false;/);
  assert.match(activateMobilePanel, /mobileActivePanelId = entry\.id;/);
  assert.ok(
    showWindow.indexOf("activateMobilePanelForEntry(entry);") < showWindow.indexOf("scheduleSharedSplitterRefresh();"),
    "show must select the newly opened mobile panel before refreshing the layout"
  );
});

test("Cloud, Settings and other shared dialogs participate in the mobile window system", async () => {
  const ui = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");
  const applyDialog = extractNamedFunction(ui, "applyActiveDialog");

  assert.match(
    ui,
    /desktop-window window-hidden tool-window dialog-window mobile-panel-window/,
    "shared dialogs must opt into mobile panel selection and tabs"
  );
  assert.match(applyDialog, /win\.classList\.toggle\("dialog-form-active", active\.kind === "form"\);/);
  assert.match(
    ui,
    /\.desktop\.desktop-stacked \.desktop-window\.mobile-panel-window\.dialog-form-active \.dialog-window-content \{\s+grid-template-rows: minmax\(48px, 96px\) minmax\(0, 1fr\) auto;/,
    "mobile forms must reserve a scrollable row for long Cloud and Settings content"
  );
  assert.match(
    ui,
    /\.desktop\.desktop-stacked \.desktop-window\.mobile-panel-window \.dialog-form \{\s+align-content: start;/,
    "short mobile forms must stay packed at the top instead of stretching vertically"
  );
});

test("right-click closes only closable mobile window tabs", async () => {
  const ui = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");
  const getCloseControl = extractNamedFunction(ui, "getWindowCloseControl");
  const closeMobilePanel = extractNamedFunction(ui, "closeMobilePanelEntry");
  const renderTabs = extractNamedFunction(ui, "renderMobilePanelTabs");

  assert.match(getCloseControl, /querySelector\('\[data-win-action="close"\]'\)/);
  assert.match(getCloseControl, /control\.disabled \|\| control\.hidden \|\| control\.getAttribute\("aria-disabled"\) === "true"/);
  assert.match(closeMobilePanel, /if \(!closeControl\) return false;/);
  assert.match(closeMobilePanel, /closeControl\.click\(\);/);
  assert.match(renderTabs, /tab\.dataset\.closable = isClosable \? "true" : "false";/);
  assert.match(renderTabs, /tab\.addEventListener\("contextmenu", \(event\) => \{/);
  assert.match(renderTabs, /event\.preventDefault\(\);/);
  assert.match(renderTabs, /closeMobilePanelEntry\(entry\);/);
});

test("mobile titlebars show only close for closable windows", async () => {
  const ui = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");
  const registerWindow = extractNamedFunction(ui, "registerWindow");

  assert.match(registerWindow, /const closable = Boolean\(win\.querySelector\('\[data-win-action="close"\]'\)\);/);
  assert.match(registerWindow, /win\.classList\.toggle\("window-closable", closable\);/);
  assert.match(registerWindow, /\bclosable,\s+element: win,/);
  assert.match(ui, /\.desktop\.desktop-stacked \.desktop-window \.window-controls \{\s+display: none !important;/);
  assert.match(ui, /\.desktop\.desktop-stacked \.desktop-window\.window-closable \.window-controls \{\s+display: flex !important;/);
  assert.match(ui, /\.window-closable \.window-controls \[data-win-action="min"\],[\s\S]*?\[data-win-action="max"\] \{\s+display: none !important;/);
  assert.match(ui, /\.window-closable \.window-controls \[data-win-action="close"\] \{[\s\S]*?display: inline-flex !important;/);
});

test("mobile bars stay one row high and scroll horizontally", async () => {
  const ui = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");

  assert.match(ui, /\.mobile-modes \{\s+display: flex;\s+flex-wrap: nowrap;[\s\S]*?height: 42px;[\s\S]*?overflow-x: auto;/);
  assert.match(ui, /\[data-mobile-mode\] \.menu-bar,[\s\S]*?height: 42px;[\s\S]*?max-height: 42px;[\s\S]*?flex-wrap: nowrap;[\s\S]*?overflow-x: auto;/);
  assert.match(ui, /\.menu-bar \{\s+display: flex;\s+flex-wrap: nowrap;[\s\S]*?overflow-x: auto;\s+overflow-y: hidden;/);
  assert.match(ui, /\.toolbar \{\s+display: flex;\s+flex-wrap: nowrap;[\s\S]*?overflow-x: auto;\s+overflow-y: hidden;/);
  assert.match(ui, /\.menu-bar \.menu-item \{[\s\S]*?flex: 0 0 auto;[\s\S]*?white-space: nowrap;/);
  assert.match(ui, /\.mobile-modes::-webkit-scrollbar,[\s\S]*?\.panel-tabs::-webkit-scrollbar \{\s+display: none;/);
});

test("mobile layout follows the visual viewport while the Android keyboard is open", async () => {
  const ui = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");
  const html = await readFile(resolve(projectRoot, "index.html"), "utf8");
  const syncViewport = extractNamedFunction(ui, "syncVisualViewport");
  const scheduleViewport = extractNamedFunction(ui, "scheduleVisualViewportSync");

  assert.match(html, /interactive-widget=resizes-content/);
  assert.match(syncViewport, /window\.visualViewport/);
  assert.match(syncViewport, /--visual-viewport-height/);
  assert.match(syncViewport, /keyboardInset >= 96/);
  assert.match(syncViewport, /mobile-keyboard-visible/);
  assert.match(syncViewport, /scrollIntoView\(\{ block: "nearest", inline: "nearest" \}\)/);
  assert.match(scheduleViewport, /requestAnimationFrame\(\(\) => syncVisualViewport\(true\)\)/);
  assert.match(ui, /window\.visualViewport\?\.addEventListener\("resize", scheduleVisualViewportSync\)/);
  assert.match(ui, /window\.visualViewport\?\.addEventListener\("scroll", scheduleVisualViewportSync\)/);
  assert.match(ui, /\.shell \{\s+height: var\(--visual-viewport-height, 100dvh\);/);
  assert.match(
    ui,
    /html\.mobile-keyboard-visible \.mobile-modes,[\s\S]*?html\.mobile-keyboard-visible \.panel-tabs \{\s+display: none !important;/,
    "non-essential mobile chrome should collapse while typing"
  );
});

test("desktop toolbar stays on one row and sheds file actions when constrained", async () => {
  const ui = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");

  assert.match(ui, /\.toolbar \{\s+padding: 4px 5px;[\s\S]*?flex-wrap: nowrap;[\s\S]*?overflow-x: hidden;[\s\S]*?overflow-y: hidden;/);
  assert.match(ui, /@media \(min-width: \$\{stackedMaxWidthPx \+ 1\}px\) and \(max-width: 1400px\) \{\s+\.toolbar-file-group \{ display: none; \}/);
  assert.match(ui, /@media \(max-width: 1250px\) \{\s+\.toolbar-speed-group \{[\s\S]*?flex: 1 1 190px;[\s\S]*?grid-template-columns: minmax\(150px, 1fr\);[\s\S]*?min-width: 150px;/);
  assert.doesNotMatch(ui, /\.toolbar-speed-group \{ min-width: 100%;/);
  assert.doesNotMatch(ui, /\.toolbar-benchmark-group \{ min-width: 100%; width: 100%; \}/);
});

test("large visual tools use vertical, full-width layouts in mobile mode", async () => {
  const [bht, bitmapTerminal, floatRepresentation, memoryReference, mipsXray] = await Promise.all([
    readFile(resolve(projectRoot, "tools/bht-simulator.js"), "utf8"),
    readFile(resolve(projectRoot, "tools/bitmap-terminal-tool.js"), "utf8"),
    readFile(resolve(projectRoot, "tools/float-representation.js"), "utf8"),
    readFile(resolve(projectRoot, "tools/memory-reference-visualization.js"), "utf8"),
    readFile(resolve(projectRoot, "tools/mips-xray.js"), "utf8")
  ]);

  assert.match(bht, /\.desktop-stacked \.bht-main \{[\s\S]*?grid-template-columns:minmax\(0, 1fr\);[\s\S]*?grid-template-rows:auto minmax\(150px, 1fr\);/);
  assert.match(bht, /\.desktop-stacked \.bht-table-wrap \{ width:100%; \}/);

  assert.match(bitmapTerminal, /\.desktop-stacked \.bt-main \{[\s\S]*?grid-template-columns:minmax\(0, 1fr\);[\s\S]*?grid-template-rows:auto minmax\(150px, 1fr\);/);
  assert.match(bitmapTerminal, /\.desktop-stacked \.bt-controls \{[\s\S]*?grid-template-columns:repeat\(2, minmax\(0, 1fr\)\);/);

  assert.match(floatRepresentation, /\.desktop-stacked \.float-tool h2 \{ font-size:21px;/);
  assert.match(floatRepresentation, /\.desktop-stacked \.float-bin-row \{[\s\S]*?grid-template-columns:36px 82px minmax\(0, 1fr\);/);
  assert.match(floatRepresentation, /\.desktop-stacked \.float-dec-row \{[\s\S]*?grid-template-columns:minmax\(0, 1fr\);/);

  assert.match(memoryReference, /\.desktop-stacked \.mv-main \{[\s\S]*?grid-template-columns:minmax\(0, 1fr\);[\s\S]*?grid-template-rows:auto minmax\(150px, 1fr\);/);
  assert.match(memoryReference, /\.desktop-stacked \.mv-canvas-wrap \{[\s\S]*?width:100%;/);

  assert.match(mipsXray, /\.desktop-stacked \.xray-main \{[\s\S]*?grid-template-columns:minmax\(0, 1fr\);[\s\S]*?grid-template-rows:auto minmax\(160px, 1fr\);/);
  assert.match(mipsXray, /\.desktop-stacked \.xray-side \{[\s\S]*?order:1;/);
  assert.match(mipsXray, /\.desktop-stacked \.xray-image-wrap \{[\s\S]*?order:2;[\s\S]*?width:100%;/);
});

test("assembly state belongs to the Control toolbar instead of Run speed", async () => {
  const ui = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");
  const runGroupStart = ui.indexOf('<div class="toolbar-group toolbar-run-group">');
  const speedGroupStart = ui.indexOf('<div class="toolbar-group toolbar-speed-group">');
  const benchmarkGroupStart = ui.indexOf('<div class="toolbar-group toolbar-benchmark-group');
  const runGroup = ui.slice(runGroupStart, speedGroupStart);
  const speedGroup = ui.slice(speedGroupStart, benchmarkGroupStart);

  assert.ok(runGroupStart >= 0 && speedGroupStart > runGroupStart && benchmarkGroupStart > speedGroupStart);
  assert.match(runGroup, /id="assembly-status"/);
  assert.doesNotMatch(speedGroup, /id="assembly-status"/);
  assert.match(speedGroup, /id="run-speed-label"/);
  assert.match(speedGroup, /id="run-speed-slider"/);
  assert.match(speedGroup, /id="run-speed-select-mobile"/);
  assert.match(ui, /\.toolbar-speed-group \{\s+display: inline-grid;\s+grid-template-columns: auto minmax\(188px, 210px\);/);
});

test("editor font preferences reach the visible overlay without a reload", async () => {
  const [ui, runtimeSource] = await Promise.all([
    readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8"),
    readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8")
  ]);

  // The text area is transparent, so the overlay and gutter own the visible
  // metrics. Applying the preference must refresh them in the same turn.
  assert.match(ui, /#source-editor \{[^}]*color: transparent;/);
  const applyUiPreferences = runtimeSource.match(
    /function applyUiPreferences\(nextPreferences\) \{(?<body>[\s\S]*?)\n\}/
  )?.groups?.body || "";
  assert.match(applyUiPreferences, /refs\.editor\.style\.fontSize = `\$\{editorFontSize\}px`;/);
  assert.match(applyUiPreferences, /refs\.editor\.style\.lineHeight = `\$\{editorLineHeight\}`;/);
  assert.ok(
    applyUiPreferences.indexOf("editor.refreshStatus();")
      > applyUiPreferences.indexOf("refs.editor.style.lineHeight"),
    "applyUiPreferences must refresh the editor after applying the new metrics"
  );

  // refreshStatus has to be the public entry point that redraws decorations.
  const refreshStatus = ui.match(/refreshStatus\(\) \{(?<body>[^}]*)\}/)?.groups?.body || "";
  assert.match(refreshStatus, /updateStatus\(\);/);
  assert.match(ui, /function updateStatus\(\) \{[\s\S]*?updateEditorDecorations\(text, lineCount\);/);

  // The gutter has to be measured with the editor font, not fixed-width digits.
  const decorations = ui.match(
    /function updateEditorDecorations\(text, lineCount\) \{(?<body>[\s\S]*?)\n  \}/
  )?.groups?.body || "";
  assert.match(decorations, /measureEditorTextWidth\(lastLineLabel\)/);
  assert.doesNotMatch(decorations, /12 \+ digits \* 8/);
  assert.match(ui, /function measureEditorTextWidth\(sample\) \{[\s\S]*?measureText\(String\(sample \?\? ""\)\)\.width;/);
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
  const saveCommandsEnd = runtimeSource.indexOf("\n  saveFileAs()", saveProjectStart);

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

test("Mini-C compilation reuses loaded libraries and ignores stale requests", async () => {
  const runtimeSource = await readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8");
  const buildStart = runtimeSource.indexOf("async function buildMiniCOutput(");
  const buildEnd = runtimeSource.indexOf("\nfunction writeMiniCCompilerOutput(", buildStart);
  assert.ok(buildStart >= 0 && buildEnd > buildStart);
  const buildSource = runtimeSource.slice(buildStart, buildEnd);

  assert.match(buildSource, /await ensureMiniCGlobalLibrariesLoaded\(\);/);
  assert.doesNotMatch(buildSource, /ensureMiniCGlobalLibrariesLoaded\(true\)/);
  assert.match(buildSource, /typeof options\.isCurrent === "function" && !options\.isCurrent\(\)/);
  assert.match(runtimeSource, /let miniCCompileRequestId = 0;/);
  assert.match(runtimeSource, /const compileRequestId = \+\+miniCCompileRequestId;/);
  assert.match(
    runtimeSource,
    /isCurrent: \(\) => compileRequestId === miniCCompileRequestId[\s\S]*?if \(compileRequestId !== miniCCompileRequestId\) return;[\s\S]*?miniCCompilerState\.lastSourceName = output\.sourceName;/
  );
  assert.match(
    runtimeSource,
    /catch \(error\) \{\s*if \(compileRequestId !== miniCCompileRequestId\) return;/
  );
});

test("mobile inputs expose semantic keyboards across the app and tools", async () => {
  const uiSource = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");
  const runtimeSource = await readFile(resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"), "utf8");
  const bitmapTerminalSource = await readFile(resolve(projectRoot, "tools/bitmap-terminal-tool.js"), "utf8");
  const floatRepresentationSource = await readFile(resolve(projectRoot, "tools/float-representation.js"), "utf8");
  const keyboardDisplaySource = await readFile(resolve(projectRoot, "tools/keyboard-display-mmio.js"), "utf8");

  assert.match(uiSource, /id="source-editor"[^>]*inputmode="text"[^>]*enterkeyhint="enter"/);
  assert.match(uiSource, /id="run-input-field"[^>]*inputmode="text"[^>]*enterkeyhint="send"/);
  assert.match(uiSource, /inputmode="\$\{escapeHtml\(inputMode\)\}"/);
  assert.match(uiSource, /enterkeyhint="\$\{escapeHtml\(enterKeyHint\)\}"/);
  assert.match(uiSource, /inputNode\.inputMode = active\.inputMode \|\| "text";/);
  assert.match(runtimeSource, /function getRuntimeInputKeyboard\(kind = ""\)/);
  assert.match(runtimeSource, /normalizedKind === "read-int"[\s\S]*?inputMode: "numeric"/);
  assert.match(runtimeSource, /normalizedKind === "read-float"[\s\S]*?inputMode: "decimal"/);
  assert.match(runtimeSource, /name: "email"[\s\S]*?inputMode: "email"[\s\S]*?autocomplete: "email"/);
  assert.match(runtimeSource, /name: "cloudApiBase"[\s\S]*?inputMode: "url"/);
  assert.match(bitmapTerminalSource, /data-bt="kb-input"[^>]*inputmode="text"[^>]*enterkeyhint="send"/);
  assert.match(floatRepresentationSource, /data-fr="sign"[^>]*inputmode="numeric"/);
  assert.match(floatRepresentationSource, /data-fr="dec"[^>]*inputmode="decimal"/);
  assert.match(keyboardDisplaySource, /data-kd="keyboard"[^>]*inputmode="text"[^>]*enterkeyhint="send"/);
});

test("mobile scrolling is contained and disables document pull-to-refresh", async () => {
  const uiSource = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");

  assert.match(uiSource, /html, body \{\s*overflow: hidden;\s*overscroll-behavior: none;/);
  assert.match(uiSource, /\.window-content,[\s\S]*?textarea \{\s*overscroll-behavior: contain;/);
  assert.doesNotMatch(uiSource, /overscroll-behavior: auto;/);
});

test("Registers owns its scroll area when the mobile viewport becomes short", async () => {
  const uiSource = await readFile(resolve(projectRoot, "assets/js/app-modules/10-ui.js"), "utf8");

  assert.match(
    uiSource,
    /#window-registers \.subtab-panel\.active \{\s*display: grid;\s*grid-template-rows: minmax\(0, 1fr\);\s*min-height: 0;\s*overflow: hidden;/
  );
  assert.match(
    uiSource,
    /#window-registers \.register-body \{[\s\S]*?overflow: auto;[\s\S]*?overscroll-behavior: contain;[\s\S]*?touch-action: pan-x pan-y;/
  );
  assert.match(
    uiSource,
    /\.desktop\.desktop-stacked #window-registers \.window-content \{\s*touch-action: pan-x pan-y;/
  );
});
