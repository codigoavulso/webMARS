import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const resultDir = join(repoRoot, "test-results");
const resultPath = join(resultDir, "ui-controls-suite.json");

const EDGE_PATH = process.env.EDGE_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const DEBUG_PORT = Number(process.env.UI_CONTROLS_DEBUG_PORT || 9225);
const APP_PORT = Number(process.env.UI_CONTROLS_APP_PORT || 8083);
const TARGET_URL = process.env.UI_CONTROLS_TARGET_URL || `http://localhost:${APP_PORT}/`;

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

async function waitForHttpReady(url) {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Keep polling until the local server is up.
    }
    await wait(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function getTarget() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const targets = await response.json();
      const page = targets.find((entry) => String(entry?.url || "").startsWith(TARGET_URL));
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      // Keep waiting for the browser endpoint.
    }
    await wait(250);
  }
  throw new Error(`No DevTools target found for ${TARGET_URL}`);
}

async function createCdpClient(page) {
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  let nextId = 1;

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolvePending, rejectPending } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectPending(new Error(message.error.message || "CDP error"));
    else resolvePending(message.result);
  };

  await new Promise((resolveOpen, rejectOpen) => {
    socket.onopen = resolveOpen;
    socket.onerror = rejectOpen;
  });

  const send = (method, params = {}) => new Promise((resolvePending, rejectPending) => {
    const id = nextId++;
    pending.set(id, { resolvePending, rejectPending });
    socket.send(JSON.stringify({ id, method, params }));
  });

  return { socket, send };
}

function buildBrowserTestSource() {
  return String.raw`(() => {
    const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));
    const assert = (condition, message) => {
      if (!condition) throw new Error(message);
    };

    const byId = (id) => {
      const element = document.getElementById(id);
      assert(element, "Missing element #" + id);
      return element;
    };

    const click = async (id) => {
      byId(id).click();
      await wait(100);
    };

    const setEditorSource = async (source) => {
      const editor = byId("source-editor");
      editor.focus();
      editor.value = source;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(150);
    };

    const setRunSpeed = async (value) => {
      const slider = byId("run-speed-slider");
      slider.value = String(value);
      slider.dispatchEvent(new Event("input", { bubbles: true }));
      slider.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(100);
    };

    const submitRunInput = async (value) => {
      const input = byId("run-input-field");
      input.focus();
      input.value = String(value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await click("run-input-send");
      await wait(120);
    };

    const waitFor = async (predicate, timeoutMs, label) => {
      const started = performance.now();
      while ((performance.now() - started) < timeoutMs) {
        if (predicate()) return;
        await wait(50);
      }
      throw new Error("Timed out waiting for " + label);
    };

    const buttons = () => ({
      compileDisabled: byId("btn-compile-c0").disabled,
      assembleDisabled: byId("btn-assemble").disabled,
      goDisabled: byId("btn-go").disabled,
      stepDisabled: byId("btn-step").disabled,
      backstepDisabled: byId("btn-backstep").disabled,
      resetDisabled: byId("btn-reset").disabled,
      pauseDisabled: byId("btn-pause").disabled,
      stopDisabled: byId("btn-stop").disabled
    });

    const debugState = () => ({
      buttons: window.WebMarsRuntimeDebug?.getButtonState?.() || null,
      run: window.WebMarsRuntimeDebug?.getRunFlags?.() || null,
      inputs: window.WebMarsRuntimeDebug?.getControlInputs?.() || null,
      snapshot: window.WebMarsRuntimeDebug?.getSnapshot?.({
        includeDataRows: false,
        includeLabels: false,
        includeMemoryWords: false
      }) || null,
      error: window.WebMarsRuntimeDebug?.getLastControlSyncError?.() || null
    });
    const getPreferences = () => window.WebMarsRuntimeDebug?.getPreferences?.() || {};
    const setPreferences = (patch) => {
      const applyPatch = window.WebMarsRuntimeDebug?.setPreferences;
      assert(typeof applyPatch === "function", "Missing runtime debug preference setter.");
      return applyPatch(patch || {});
    };
    const getWindowState = (windowId) => window.WebMarsRuntimeDebug?.getWindowState?.(windowId) || null;
    const editorFiles = () => window.WebMarsRuntimeDebug?.getEditorFiles?.() || [];
    const getProjectTreeDebug = () => window.WebMarsRuntimeDebug?.getProjectTreeDebug?.() || null;
    const setProjectLibrary = (payload) => {
      const applyLibrary = window.WebMarsRuntimeDebug?.setProjectLibrary;
      assert(typeof applyLibrary === "function", "Missing runtime debug project library setter.");
      return applyLibrary.call(window.WebMarsRuntimeDebug, payload || {});
    };
    const persistWorkspaceSession = () => {
      const persist = window.WebMarsRuntimeDebug?.persistWorkspaceSession;
      assert(typeof persist === "function", "Missing runtime debug workspace session persister.");
      return persist.call(window.WebMarsRuntimeDebug);
    };
    const getStoredWorkspaceSession = () => window.WebMarsRuntimeDebug?.getStoredWorkspaceSession?.() || null;
    const getStartupEditorFiles = () => window.WebMarsRuntimeDebug?.getStartupEditorFiles?.() || null;
    const setCloudProjectSyncDocuments = (payload) => {
      const applySyncDocuments = window.WebMarsRuntimeDebug?.setCloudProjectSyncDocuments;
      assert(typeof applySyncDocuments === "function", "Missing runtime debug cloud sync setter.");
      return applySyncDocuments.call(window.WebMarsRuntimeDebug, payload || {});
    };
    const activeTab = () => String(document.querySelector(".editor-file-tab.active")?.textContent || "").trim().replace(/^\*/, "");
    const query = (selector) => {
      const element = document.querySelector(selector);
      assert(element, "Missing element " + selector);
      return element;
    };
    const doubleClickElement = async (element) => {
      assert(element instanceof HTMLElement, "Missing element for double click.");
      element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      await wait(120);
    };
    const rightClickElement = async (element, clientX = 160, clientY = 120) => {
      assert(element instanceof HTMLElement, "Missing element for right click.");
      element.dispatchEvent(new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        button: 2,
        buttons: 2,
        clientX,
        clientY
      }));
      await wait(120);
    };
    const editorTabContextRows = () => Array.from(document.querySelectorAll(".editor-tab-context-menu:not(.hidden) .menu-row"));

    const runOutput = () => String(byId("run-messages").value || byId("run-messages").textContent || "");
    const textRowCount = () => document.querySelectorAll("#text-segment-body tr[data-text-address]").length;

    const assertButtons = (expected, label) => {
      const current = buttons();
      Object.entries(expected).forEach(([key, value]) => {
        assert(current[key] === value, label + " :: expected " + key + "=" + value + ", got " + current[key]);
      });
      return current;
    };

    const waitForButtons = async (expected, timeoutMs, label) => {
      await waitFor(() => {
        const current = buttons();
        return Object.entries(expected).every(([key, value]) => current[key] === value);
      }, timeoutMs, label);
      return buttons();
    };

    const seedAssemblyFile = async (source = "", name = "src/main.s") => {
      const setEditorFiles = window.WebMarsRuntimeDebug?.setEditorFiles;
      assert(typeof setEditorFiles === "function", "Missing runtime debug file setter.");
      setEditorFiles([{ name, source }], name);
      await wait(150);
    };

    const assembleProgram = async (source) => {
      await seedAssemblyFile(source);
      await click("btn-assemble");
      await waitFor(() => !byId("btn-go").disabled, 4000, "go enabled after assemble");
      assert(textRowCount() > 0, "Text segment should be loaded after assemble.");
    };

    const factorialProgram = [
      "# Recursive factorial (faculty classic)",
      "# Reads n and prints n! (for small n).",
      "",
      ".data",
      "ask: .asciiz \"n (0..12)? \"",
      "out: .asciiz \"factorial = \"",
      "",
      ".text",
      "main:",
      "  li $v0, 4",
      "  la $a0, ask",
      "  syscall",
      "",
      "  li $v0, 5",
      "  syscall",
      "  move $a0, $v0",
      "",
      "  jal fact",
      "  move $s0, $v0",
      "",
      "  li $v0, 4",
      "  la $a0, out",
      "  syscall",
      "",
      "  li $v0, 1",
      "  move $a0, $s0",
      "  syscall",
      "",
      "  li $v0, 11",
      "  li $a0, '\\n'",
      "  syscall",
      "",
      "  li $v0, 10",
      "  syscall",
      "",
      "# int fact(int n)",
      "fact:",
      "  addiu $sp, $sp, -8",
      "  sw    $ra, 4($sp)",
      "  sw    $a0, 0($sp)",
      "",
      "  blez  $a0, fact_base",
      "  li    $t0, 1",
      "  beq   $a0, $t0, fact_base",
      "",
      "  addiu $a0, $a0, -1",
      "  jal   fact",
      "",
      "  lw    $t1, 0($sp)",
      "  mul   $v0, $v0, $t1",
      "  j     fact_end",
      "",
      "fact_base:",
      "  li    $v0, 1",
      "",
      "fact_end:",
      "  lw    $ra, 4($sp)",
      "  addiu $sp, $sp, 8",
      "  jr    $ra",
      ""
    ].join("\n");

    return (async () => {
      const report = {
        generatedAt: new Date().toISOString(),
        cases: []
      };

      const runCase = async (name, fn) => {
        const started = performance.now();
        try {
          const detail = await fn();
          report.cases.push({
            name,
            ok: true,
            durationMs: Math.round((performance.now() - started) * 1000) / 1000,
            detail
          });
        } catch (error) {
          report.cases.push({
            name,
            ok: false,
            durationMs: Math.round((performance.now() - started) * 1000) / 1000,
            error: error instanceof Error ? (error.stack || error.message) : String(error),
            debug: debugState()
          });
        }
      };

      await runCase("idle_and_assemble_controls", async () => {
        await seedAssemblyFile("");
        assertButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: true,
          stepDisabled: true,
          backstepDisabled: true,
          resetDisabled: true,
          pauseDisabled: true,
          stopDisabled: true
        }, "initial controls");

        await assembleProgram(factorialProgram);
        assertButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: false,
          stepDisabled: false,
          backstepDisabled: true,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, "controls after assemble");

        return {
          buttons: buttons(),
          debug: debugState()
        };
      });

      await runCase("step_and_backstep_controls", async () => {
        await assembleProgram(factorialProgram);

        await click("btn-step");
        await waitFor(() => byId("btn-backstep").disabled === false, 2500, "backstep enabled after step");
        assertButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: false,
          stepDisabled: false,
          backstepDisabled: false,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, "controls after one step");

        await click("btn-backstep");
        await waitFor(() => byId("btn-backstep").disabled === true, 2000, "backstep disabled after returning to start");
        assertButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: false,
          stepDisabled: false,
          backstepDisabled: true,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, "controls after backstep to start");

        return {
          buttons: buttons(),
          debug: debugState()
        };
      });

      await runCase("go_waiting_for_input_and_stop", async () => {
        await assembleProgram(factorialProgram);
        await setRunSpeed(25);

        await click("btn-go");
        await waitFor(() => debugState().run?.runPausedForInput === true, 5000, "runtime waiting for input");
        assertButtons({
          compileDisabled: true,
          assembleDisabled: true,
          goDisabled: true,
          stepDisabled: true,
          backstepDisabled: true,
          resetDisabled: true,
          pauseDisabled: true,
          stopDisabled: false
        }, "controls while waiting for input");

        await click("btn-stop");
        await waitFor(() => debugState().run?.runPausedForInput === false, 3000, "input wait cleared after stop");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: true,
          stepDisabled: true,
          backstepDisabled: false,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, 3000, "controls after stop from input wait");
        assert(debugState().snapshot?.halted === true, "Program should be halted after stop.");

        return {
          buttons: buttons(),
          debug: debugState()
        };
      });

      await runCase("pause_resume_and_reset_with_factorial_input", async () => {
        await assembleProgram(factorialProgram);
        await setRunSpeed(25);

        await click("btn-go");
        await waitFor(() => debugState().run?.runPausedForInput === true, 5000, "runtime waiting for input before resume");
        await submitRunInput("10");
        await waitFor(() => debugState().run?.runActive === true && byId("btn-pause").disabled === false, 4000, "runtime resumed after input");
        await wait(150);

        await click("btn-pause");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: false,
          stepDisabled: false,
          backstepDisabled: false,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, 3000, "controls after pause during factorial run");

        await click("btn-go");
        await waitFor(() => debugState().snapshot?.halted === true, 12000, "factorial run halted after resume");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: true,
          stepDisabled: true,
          backstepDisabled: false,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, 3000, "controls after halted factorial run");
        await click("btn-reset");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: false,
          goDisabled: false,
          stepDisabled: false,
          backstepDisabled: true,
          resetDisabled: false,
          pauseDisabled: true,
          stopDisabled: true
        }, 4000, "controls after reset");
        assert(debugState().snapshot?.halted === false, "Reset should restore a non-halted assembled state.");

        return {
          buttons: buttons(),
          debug: debugState(),
          output: runOutput()
        };
      });

      await runCase("file_type_aliases_drive_mode_and_actions", async () => {
        const setEditorFiles = window.WebMarsRuntimeDebug?.setEditorFiles;
        assert(typeof setEditorFiles === "function", "Missing runtime debug file setter.");

        setEditorFiles([
          { name: "src/main.c", source: "int main(void) { return 0; }\n" }
        ], "src/main.c");
        await waitForButtons({
          compileDisabled: false,
          assembleDisabled: true
        }, 2000, "controls for active .c source");
        assert(byId("mode-editor").classList.contains("active"), ".c source should keep Editor active.");

        setEditorFiles([
          { name: "include/runtime.h0", source: "int puts(char* text);\n" }
        ], "include/runtime.h0");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: true
        }, 2000, "controls for active .h0 header");
        assert(byId("mode-editor").classList.contains("active"), ".h0 header should stay in Editor mode.");

        setEditorFiles([
          { name: "src/main.mips", source: factorialProgram }
        ], "src/main.mips");
        await waitForButtons({
          compileDisabled: true,
          assembleDisabled: false
        }, 2000, "controls for active .mips source");
        assert(byId("mode-editor").classList.contains("active"), ".mips source should stay in Editor mode.");

        return {
          buttons: buttons(),
          debug: debugState()
        };
      });

      await runCase("reset_uses_last_successful_assembly_after_switching_to_c", async () => {
        const setEditorFiles = window.WebMarsRuntimeDebug?.setEditorFiles;
        assert(typeof setEditorFiles === "function", "Missing runtime debug file setter.");
        const mixedFiles = [
          { name: "src/main.s", source: factorialProgram },
          { name: "src/helper.c", source: "int main(void) { return 0; }\n" }
        ];

        setEditorFiles(mixedFiles, "src/main.s");
        await wait(150);
        await click("btn-assemble");
        await waitFor(() => !byId("btn-go").disabled, 4000, "assembled ASM before switching tabs");

        setEditorFiles(mixedFiles, "src/helper.c");
        await waitForButtons({
          compileDisabled: false,
          assembleDisabled: true,
          resetDisabled: false
        }, 2000, "controls after switching to active C source");

        await click("btn-reset");
        await waitForButtons({
          compileDisabled: false,
          assembleDisabled: true,
          goDisabled: false,
          stepDisabled: false,
          resetDisabled: false
        }, 4000, "controls after reset from active C tab");
        assert(textRowCount() > 0, "Reset should preserve the previously assembled ASM program.");

        return {
          buttons: buttons(),
          debug: debugState()
        };
      });

      await runCase("compile_c0_auto_opens_asm_when_output_window_disabled", async () => {
        setPreferences({ miniCOpenOutputWindow: false });
        const setEditorFiles = window.WebMarsRuntimeDebug?.setEditorFiles;
        assert(typeof setEditorFiles === "function", "Missing runtime debug file setter.");

        setEditorFiles([
          { name: "src/main.c", source: "int main(void) { return 0; }\n" }
        ], "src/main.c");
        await waitForButtons({
          compileDisabled: false,
          assembleDisabled: true
        }, 2000, "controls before compile with output window disabled");

        await click("btn-compile-c0");
        await waitFor(() => editorFiles().some((file) => String(file?.name || "").endsWith(".generated.s")), 4000, "generated ASM file opened");
        await waitFor(() => activeTab().endsWith(".generated.s"), 4000, "generated ASM tab active");

        const miniCWindow = getWindowState("window-mini-c");
        assert(miniCWindow?.hidden === true, "Mini-C output window should remain hidden when auto-open is disabled.");
        assert(getPreferences().miniCOpenOutputWindow === false, "Output window preference should remain disabled.");

        return {
          activeTab: activeTab(),
          files: editorFiles().map((file) => file.name),
          miniCWindow,
          preferences: getPreferences()
        };
      });

      await runCase("mini_c_open_asm_closes_window_and_can_disable_future_auto_open", async () => {
        setPreferences({ miniCOpenOutputWindow: true });
        const setEditorFiles = window.WebMarsRuntimeDebug?.setEditorFiles;
        assert(typeof setEditorFiles === "function", "Missing runtime debug file setter.");

        setEditorFiles([
          { name: "src/demo.c", source: "int main(void) { return 0; }\n" }
        ], "src/demo.c");
        await click("btn-compile-c0");
        await waitFor(() => getWindowState("window-mini-c")?.hidden === false, 4000, "Mini-C window visible after compile");

        const dontShowAgain = byId("mini-c-dont-show-again");
        dontShowAgain.checked = true;
        dontShowAgain.dispatchEvent(new Event("change", { bubbles: true }));
        await click("mini-c-open-asm");
        await waitFor(() => getWindowState("window-mini-c")?.hidden === true, 4000, "Mini-C window hidden after opening ASM");
        await waitFor(() => getPreferences().miniCOpenOutputWindow === false, 2000, "Mini-C auto-open disabled by don't show again");
        await waitFor(() => activeTab().endsWith(".generated.s"), 4000, "generated ASM tab active after open button");

        return {
          activeTab: activeTab(),
          files: editorFiles().map((file) => file.name),
          miniCWindow: getWindowState("window-mini-c"),
          preferences: getPreferences()
        };
      });

      await runCase("project_tree_defaults_and_readonly_open_from_other_project", async () => {
        const projectLibrary = {
          activeRootPath: "alpha.p",
          projects: [
            {
              name: "alpha",
              rootPath: "alpha.p",
              files: [
                { id: "alpha-main", path: "src/main.s", source: "main:\n  jr $ra\n", savedSource: "main:\n  jr $ra\n", updatedAt: 1710000000000 },
                { id: "alpha-extra", path: "src/extra.s", source: "extra:\n  jr $ra\n", savedSource: "extra:\n  jr $ra\n", updatedAt: 1710000001000 },
                { id: "alpha-c", path: "src/demo.c", source: "int main(void) { return 0; }\n", savedSource: "int main(void) { return 0; }\n", updatedAt: 1710000002000 }
              ],
              folderPaths: ["src"],
              activeFileId: "alpha-main",
              updatedAt: 1710000003000
            },
            {
              name: "beta",
              rootPath: "beta.p",
              files: [
                { id: "beta-main", path: "src/other.s", source: "other:\n  jr $ra\n", savedSource: "other:\n  jr $ra\n", updatedAt: 1710000004000 }
              ],
              folderPaths: ["src"],
              activeFileId: "beta-main",
              updatedAt: 1710000005000
            }
          ]
        };

        setProjectLibrary({ library: projectLibrary, openRootPath: "alpha.p" });
        await wait(250);

        assert(document.querySelector('button[data-tree-node-type="file"][data-project-root="alpha.p"][data-project-path="src/main.s"]'), "Active project file should be visible by default.");
        assert(!document.querySelector('button[data-tree-node-type="file"][data-project-root="beta.p"][data-project-path="src/other.s"]'), "Inactive project should be collapsed by default.");
        assert(!document.querySelector('button[data-tree-node-type="libs-file"]'), "libs/ should be collapsed by default.");

        const betaProjectButton = query('button[data-tree-node-type="project"][data-project-root="beta.p"]');
        const betaToggle = betaProjectButton.closest(".project-tree-row")?.querySelector("[data-tree-toggle]");
        assert(betaToggle instanceof HTMLElement, "Missing beta project toggle.");
        betaToggle.click();
        await wait(120);

        const betaFileButton = query('button[data-tree-node-type="file"][data-project-root="beta.p"][data-project-path="src/other.s"]');
        await doubleClickElement(betaFileButton);
        await waitFor(() => byId("source-editor").readOnly === true, 2500, "external project file opened read-only");

        const debug = getProjectTreeDebug();
        assert(debug?.activeRootPath === "alpha.p", "Opening another project's file should not change the active project.");
        assert(debug?.openFiles?.some((file) => file.readOnly === true && String(file.originKey || "").includes("project:beta.p:src/other.s")), "Readonly external project tab should be registered.");

        return {
          tree: debug,
          activeTab: activeTab(),
          editorReadOnly: byId("source-editor").readOnly
        };
      });

      await runCase("project_tree_multi_select_updates_actions_and_status", async () => {
        const projectLibrary = {
          activeRootPath: "alpha.p",
          projects: [
            {
              name: "alpha",
              rootPath: "alpha.p",
              files: [
                { id: "alpha-main", path: "src/main.s", source: "main:\n  jr $ra\n", savedSource: "main:\n  jr $ra\n", updatedAt: 1710000010000 },
                { id: "alpha-extra", path: "src/extra.s", source: "extra:\n  jr $ra\n", savedSource: "extra:\n  jr $ra\n", updatedAt: 1710000011000 },
                { id: "alpha-util", path: "src/util.s", source: "util:\n  jr $ra\n", savedSource: "util:\n  jr $ra\n", updatedAt: 1710000012000 }
              ],
              folderPaths: ["src"],
              activeFileId: "alpha-main",
              updatedAt: 1710000013000
            }
          ]
        };

        setProjectLibrary({ library: projectLibrary, openRootPath: "alpha.p" });
        await wait(250);

        const mainCheckbox = query('input[data-tree-checkbox][data-project-root="alpha.p"][data-project-path="src/main.s"]');
        mainCheckbox.click();
        await wait(100);
        const extraCheckbox = query('input[data-tree-checkbox][data-project-root="alpha.p"][data-project-path="src/extra.s"]');
        extraCheckbox.click();
        await wait(150);

        assert(byId("project-main-new-folder").disabled === true, "New Folder should be disabled when multi-selection exists.");
        assert(byId("project-main-rename").disabled === true, "Rename should be disabled when multi-selection exists.");
        assert(byId("project-main-delete").disabled === false, "Delete should remain enabled when multi-selection exists.");
        assert(String(byId("project-tree-main-status-selected").textContent || "").includes("2"), "Status bar should show two selected files.");
        assert(!String(byId("project-tree-main-status-size").textContent || "").includes("0 B"), "Status bar should show the selected size.");
        assert(String(byId("project-tree-main-status-usage").textContent || "").includes("/"), "Status bar should show usage versus limit.");

        return {
          tree: getProjectTreeDebug(),
          buttons: {
            newFolderDisabled: byId("project-main-new-folder").disabled,
            renameDisabled: byId("project-main-rename").disabled,
            deleteDisabled: byId("project-main-delete").disabled
          },
          status: {
            selected: byId("project-tree-main-status-selected").textContent,
            size: byId("project-tree-main-status-size").textContent,
            usage: byId("project-tree-main-status-usage").textContent
          }
        };
      });

      await runCase("editor_tab_context_menu_supports_readonly_close", async () => {
        const projectLibrary = {
          activeRootPath: "alpha.p",
          projects: [
            {
              name: "alpha",
              rootPath: "alpha.p",
              files: [
                { id: "alpha-main", path: "src/main.s", source: "main:\n  jr $ra\n", savedSource: "main:\n  jr $ra\n", updatedAt: 1710000020000 }
              ],
              folderPaths: ["src"],
              activeFileId: "alpha-main",
              updatedAt: 1710000021000
            },
            {
              name: "beta",
              rootPath: "beta.p",
              files: [
                { id: "beta-main", path: "src/other.s", source: "other:\n  jr $ra\n", savedSource: "other:\n  jr $ra\n", updatedAt: 1710000022000 }
              ],
              folderPaths: ["src"],
              activeFileId: "beta-main",
              updatedAt: 1710000023000
            }
          ]
        };

        setProjectLibrary({ library: projectLibrary, openRootPath: "alpha.p" });
        await wait(250);

        const betaProjectButton = query('button[data-tree-node-type="project"][data-project-root="beta.p"]');
        const betaToggle = betaProjectButton.closest(".project-tree-row")?.querySelector("[data-tree-toggle]");
        assert(betaToggle instanceof HTMLElement, "Missing beta project toggle.");
        betaToggle.click();
        await wait(120);

        const betaFileButton = query('button[data-tree-node-type="file"][data-project-root="beta.p"][data-project-path="src/other.s"]');
        await doubleClickElement(betaFileButton);
        await waitFor(() => byId("source-editor").readOnly === true, 2500, "readonly beta file opened");

        const readonlyTab = query('.editor-file-tab.active[data-file-id]');
        await rightClickElement(readonlyTab);
        await waitFor(() => editorTabContextRows().length === 3, 2500, "editor tab context menu visible");

        const rows = editorTabContextRows();
        const labels = rows.map((row) => String(row.textContent || "").trim().replace(/\s+/g, " "));
        assert(labels.some((label) => label.includes("Close")), "Context menu should show Close.");
        assert(labels.some((label) => label.includes("Save")), "Context menu should show Save.");
        assert(rows[0].disabled === false, "Close should stay enabled for readonly tabs.");
        assert(rows[1].disabled === true, "Save should be disabled for readonly tabs.");
        assert(rows[2].disabled === true, "Save and Close should be disabled for readonly tabs.");

        rows[0].click();
        await waitFor(() => !editorFiles().some((file) => String(file?.originKey || "").includes("project:beta.p:src/other.s")), 2500, "readonly tab closed");
        await waitFor(() => byId("source-editor").readOnly === false, 2500, "editor returned to editable project file");

        return {
          labels,
          files: editorFiles().map((file) => ({
            name: file.name,
            readOnly: file.readOnly === true,
            originKey: String(file.originKey || "")
          })),
          activeTab: activeTab(),
          editorReadOnly: byId("source-editor").readOnly
        };
      });

      await runCase("workspace_refresh_keeps_external_tabs_readonly", async () => {
        const projectLibrary = {
          activeRootPath: "alpha.p",
          projects: [
            {
              name: "alpha",
              rootPath: "alpha.p",
              files: [
                { id: "alpha-main", path: "src/main.s", source: "main:\n  jr $ra\n", savedSource: "main:\n  jr $ra\n", updatedAt: 1710000030000 }
              ],
              folderPaths: ["src"],
              activeFileId: "alpha-main",
              updatedAt: 1710000031000
            },
            {
              name: "beta",
              rootPath: "beta.p",
              files: [
                { id: "beta-main", path: "src/other.s", source: "other:\n  jr $ra\n", savedSource: "other:\n  jr $ra\n", updatedAt: 1710000032000 }
              ],
              folderPaths: ["src"],
              activeFileId: "beta-main",
              updatedAt: 1710000033000
            }
          ]
        };

        setProjectLibrary({ library: projectLibrary, openRootPath: "alpha.p" });
        await wait(250);

        const betaProjectButton = query('button[data-tree-node-type="project"][data-project-root="beta.p"]');
        const betaToggle = betaProjectButton.closest(".project-tree-row")?.querySelector("[data-tree-toggle]");
        assert(betaToggle instanceof HTMLElement, "Missing beta project toggle.");
        betaToggle.click();
        await wait(120);

        const betaFileButton = query('button[data-tree-node-type="file"][data-project-root="beta.p"][data-project-path="src/other.s"]');
        await doubleClickElement(betaFileButton);
        await waitFor(() => byId("source-editor").readOnly === true, 2500, "readonly beta file opened");

        persistWorkspaceSession();
        const stored = getStoredWorkspaceSession();
        assert(stored && Array.isArray(stored.files), "Stored workspace session should be available.");
        const storedReadonly = stored.files.find((file) => String(file?.originKey || "").includes("project:beta.p:src/other.s"));
        assert(storedReadonly?.readOnly === true, "Stored readonly tab should keep readOnly metadata.");
        assert(storedReadonly?.projectOwned === false, "Stored readonly tab should keep projectOwned=false.");

        const startup = getStartupEditorFiles();
        assert(startup && Array.isArray(startup.files), "Startup editor preview should be available.");
        const startupReadonly = startup.files.find((file) => String(file?.originKey || "").includes("project:beta.p:src/other.s"));
        assert(startupReadonly?.readOnly === true, "Startup reload should keep readonly external tab readonly.");
        assert(startupReadonly?.projectOwned === false, "Startup reload should keep readonly external tab outside the active project.");

        return {
          storedFiles: stored.files.map((file) => ({
            name: file.name,
            readOnly: file.readOnly === true,
            projectOwned: file.projectOwned !== false,
            originKey: String(file.originKey || "")
          })),
          startupFiles: startup.files.map((file) => ({
            name: file.name,
            readOnly: file.readOnly === true,
            projectOwned: file.projectOwned !== false,
            originKey: String(file.originKey || "")
          })),
          startupActiveFileId: startup.activeFileId
        };
      });

      await runCase("project_tree_sync_markers_show_green_orange_red", async () => {
        const projectLibrary = {
          activeRootPath: "alpha.p",
          projects: [
            {
              name: "alpha",
              rootPath: "alpha.p",
              files: [
                { id: "alpha-main", path: "src/main.s", source: "main:\n  jr $ra\n", savedSource: "main:\n  jr $ra\n", updatedAt: 1710000040000 },
                { id: "alpha-extra", path: "src/extra.s", source: "extra:\n  jr $ra\n", savedSource: "extra:\n  jr $ra\n", updatedAt: 1710000041000 }
              ],
              folderPaths: ["src"],
              activeFileId: "alpha-main",
              updatedAt: 1710000042000
            },
            {
              name: "beta",
              rootPath: "beta.p",
              files: [
                { id: "beta-main", path: "src/other.s", source: "other:\n  jr $ra\n", savedSource: "other:\n  jr $ra\n", updatedAt: 1710000043000 }
              ],
              folderPaths: ["src"],
              activeFileId: "beta-main",
              updatedAt: 1710000044000
            }
          ]
        };

        setProjectLibrary({ library: projectLibrary, openRootPath: "alpha.p" });
        setCloudProjectSyncDocuments({
          "alpha.p": {
            rootPath: "alpha.p",
            files: [
              { id: "alpha-main", path: "src/main.s", source: "main:\n  jr $ra\n", savedSource: "main:\n  jr $ra\n" },
              { id: "alpha-extra", path: "src/extra.s", source: "extra:\n  nop\n", savedSource: "extra:\n  nop\n" }
            ],
            folderPaths: ["src"],
            activeFileId: "alpha-main"
          }
        });
        await wait(150);

        if (!document.querySelector('button.project-tree-file[data-project-root="alpha.p"][data-project-path="src/main.s"]')) {
          const alphaProject = query('button.project-tree-project[data-project-root="alpha.p"]');
          const alphaToggle = alphaProject.closest(".project-tree-row")?.querySelector("[data-tree-toggle]");
          assert(alphaToggle instanceof HTMLElement, "Missing alpha project toggle.");
          alphaToggle.click();
          await wait(120);
        }

        assert(document.querySelector('button.project-tree-project[data-project-root="alpha.p"] .project-tree-sync-orange'), "Alpha project should be partially synced.");
        assert(document.querySelector('button.project-tree-folder[data-project-root="alpha.p"][data-project-path="src"] .project-tree-sync-orange'), "Alpha folder should be partially synced.");
        assert(document.querySelector('button.project-tree-file[data-project-root="alpha.p"][data-project-path="src/main.s"] .project-tree-sync-green'), "Main file should be synced.");
        assert(document.querySelector('button.project-tree-file[data-project-root="alpha.p"][data-project-path="src/extra.s"] .project-tree-sync-red'), "Extra file should be unsynced.");
        assert(document.querySelector('button.project-tree-project[data-project-root="beta.p"] .project-tree-sync-red'), "Beta project should be unsynced.");

        return {
          alphaProjectClass: document.querySelector('button.project-tree-project[data-project-root="alpha.p"] .project-tree-sync')?.className || "",
          betaProjectClass: document.querySelector('button.project-tree-project[data-project-root="beta.p"] .project-tree-sync')?.className || ""
        };
      });

      await runCase("project_quota_blocks_editor_growth_past_1mb", async () => {
        const nearLimitSource = "a".repeat((1024 * 1024) - 4);
        const projectLibrary = {
          activeRootPath: "alpha.p",
          projects: [
            {
              name: "alpha",
              rootPath: "alpha.p",
              files: [
                { id: "alpha-main", path: "src/main.s", source: nearLimitSource, savedSource: nearLimitSource, updatedAt: 1710000050000 }
              ],
              folderPaths: ["src"],
              activeFileId: "alpha-main",
              updatedAt: 1710000051000
            }
          ]
        };

        setProjectLibrary({ library: projectLibrary, openRootPath: "alpha.p" });
        await wait(250);
        assert(editorFiles()[0].source.length === nearLimitSource.length, "Initial near-limit source should load.");

        await setEditorSource(nearLimitSource + "OVERFLOW-BLOCK");
        await wait(150);

        assert(editorFiles()[0].source.length === nearLimitSource.length, "Editor source should be reverted when quota is exceeded.");
        assert(String(byId("project-tree-main-status-usage").textContent || "").includes("1.0 MB") || String(byId("project-tree-main-status-usage").textContent || "").includes("1024.0 kB"), "Usage bar should reflect the 1 MB quota.");

        return {
          sourceLength: editorFiles()[0].source.length,
          usage: byId("project-tree-main-status-usage").textContent
        };
      });

      report.summary = {
        total: report.cases.length,
        passed: report.cases.filter((entry) => entry.ok).length,
        failed: report.cases.filter((entry) => !entry.ok).length
      };
      return report;
    })();
  })()`;
}

async function main() {
  mkdirSync(resultDir, { recursive: true });

  const server = spawn(process.execPath, ["scripts/serve-web.mjs"], {
    cwd: repoRoot,
    env: { ...process.env, PORT: String(APP_PORT) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let serverLog = "";
  server.stdout.on("data", (chunk) => {
    serverLog += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    serverLog += String(chunk);
  });

  const userDataDir = mkdtempSync(join(tmpdir(), "webmars-ui-controls-"));
  const browser = spawn(EDGE_PATH, [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    TARGET_URL
  ], {
    stdio: "ignore",
    detached: false
  });

  try {
    await waitForHttpReady(TARGET_URL);
    const page = await getTarget();
    const { socket, send } = await createCdpClient(page);
    try {
      await send("Page.enable");
      await send("Runtime.enable");
      await send("Page.bringToFront");
      await wait(1800);

      const evaluation = await send("Runtime.evaluate", {
        expression: buildBrowserTestSource(),
        awaitPromise: true,
        returnByValue: true
      });

      const report = evaluation?.result?.value;
      if (!report || typeof report !== "object") {
        throw new Error("UI controls suite did not return a valid report.");
      }

      report.host = {
        targetUrl: TARGET_URL,
        edgePath: EDGE_PATH,
        appPort: APP_PORT,
        debugPort: DEBUG_PORT
      };

      writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

      console.log(`UI controls suite: ${report.summary.passed}/${report.summary.total} passed`);
      for (const entry of report.cases) {
        const prefix = entry.ok ? "PASS" : "FAIL";
        console.log(`${prefix} ${entry.name} (${entry.durationMs} ms)`);
        if (!entry.ok) console.log(String(entry.error || "").trim());
      }

      if (report.summary.failed > 0) {
        if (serverLog.trim().length) {
          console.log("Server log:");
          console.log(serverLog.trim());
        }
        process.exitCode = 1;
      }
    } finally {
      socket.close();
    }
  } finally {
    if (!browser.killed) browser.kill("SIGKILL");
    if (!server.killed) server.kill("SIGKILL");
    await wait(250);
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup failures on Windows.
    }
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  const fallbackReport = {
    generatedAt: new Date().toISOString(),
    fatal: true,
    error: message
  };
  try {
    mkdirSync(resultDir, { recursive: true });
    writeFileSync(resultPath, `${JSON.stringify(fallbackReport, null, 2)}\n`, "utf8");
  } catch {
    // Ignore fallback persistence failure.
  }
  console.error(message);
  process.exit(1);
});
