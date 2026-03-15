import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import {
  EDGE_PATH,
  cleanupBrowserHarness,
  launchBrowserHarness
} from "./browser-parity-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const resultDir = resolve(repoRoot, "test-results");
const resultPath = resolve(resultDir, "tool-backstep-parity-smoke.json");

const APP_PORT = Number(process.env.TOOL_BACKSTEP_SMOKE_APP_PORT || 8089);
const DEBUG_PORT = Number(process.env.TOOL_BACKSTEP_SMOKE_DEBUG_PORT || 9232);
const TARGET_URL = process.env.TOOL_BACKSTEP_SMOKE_TARGET_URL || `http://localhost:${APP_PORT}/`;

function buildBrowserExpression() {
  return String.raw`(async () => {
    const wait = (ms) => new Promise((resolveWait) => window.setTimeout(resolveWait, ms));
    const waitFor = async (predicate, timeoutMs, label) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const value = await predicate();
        if (value) return value;
        await wait(50);
      }
      throw new Error("Timed out waiting for " + label);
    };
    const assert = (condition, message) => {
      if (!condition) throw new Error(message);
    };
    const byId = (id) => {
      const element = document.getElementById(id);
      assert(element, "Missing element #" + id);
      return element;
    };
    const clickElement = async (element) => {
      assert(element instanceof HTMLElement, "Element not clickable");
      element.click();
      await wait(90);
    };
    const clickById = async (id) => {
      await clickElement(byId(id));
    };

    const activateAssemblyFile = async () => {
      const tabs = [...document.querySelectorAll(".editor-file-tab")];
      const assemblyTab = tabs.find((tab) => {
        const text = String(tab.textContent || "").trim().toLowerCase();
        return text.endsWith(".s") || text.endsWith(".asm");
      });
      assert(assemblyTab, "Missing assembly editor tab.");
      assemblyTab.click();
      await wait(120);
      const activeText = String(document.querySelector(".editor-file-tab.active")?.textContent || "").trim().toLowerCase();
      assert(activeText.endsWith(".s") || activeText.endsWith(".asm"), "Failed to activate assembly editor tab.");
    };

    const setEditorSource = async (source) => {
      await activateAssemblyFile();
      const editor = byId("source-editor");
      editor.focus();
      editor.value = source;
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
      await wait(140);
    };

    const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
    const rgbaHex = (canvas, x = 0, y = 0) => {
      const ctx2d = canvas.getContext("2d");
      const data = ctx2d.getImageData(x, y, 1, 1).data;
      return [data[0], data[1], data[2], data[3]].map((part) => part.toString(16).padStart(2, "0")).join("");
    };

    const debug = await waitFor(() => window.WebMarsRuntimeDebug, 5000, "WebMarsRuntimeDebug");

    const ensureToolWindow = async (toolId) => {
      debug.openTool(toolId);
      return waitFor(() => document.getElementById("window-tool-" + toolId), 3000, "window-tool-" + toolId);
    };

    const ensureConnected = async (toolWindow, selector) => {
      const button = toolWindow.querySelector(selector);
      assert(button instanceof HTMLElement, "Missing connect button " + selector);
      const label = normalizeText(button.textContent).toLowerCase();
      if (!label.includes("disconnect")) {
        await clickElement(button);
      }
      return button;
    };

    const assembleProgram = async (source, backendMode) => {
      debug.setBackendSelection({
        assemblerBackendMode: backendMode,
        simulatorBackendMode: backendMode
      });
      await setEditorSource(source);
      await clickById("btn-assemble");
      await waitFor(() => byId("btn-step").disabled === false, 5000, "step enabled after assemble");
      const snapshot = debug.getSnapshot({
        includeDataRows: false,
        includeLabels: false,
        includeMemoryWords: false
      });
      assert(snapshot?.assembled === true, "Program did not assemble.");
      return snapshot;
    };

    const stepTimes = async (count) => {
      for (let index = 0; index < count; index += 1) {
        await clickById("btn-step");
        await wait(120);
      }
    };

    const backstepOnce = async () => {
      await waitFor(() => byId("btn-backstep").disabled === false, 3000, "backstep enabled");
      await clickById("btn-backstep");
      await wait(140);
    };

    const cases = [];
    const runCase = async (name, fn) => {
      const started = performance.now();
      try {
        const detail = await fn();
        cases.push({
          name,
          ok: true,
          durationMs: Math.round((performance.now() - started) * 1000) / 1000,
          detail
        });
      } catch (error) {
        cases.push({
          name,
          ok: false,
          durationMs: Math.round((performance.now() - started) * 1000) / 1000,
          error: error instanceof Error ? (error.stack || error.message) : String(error)
        });
      }
    };

    const keyboardSource = [
      ".text",
      "main:",
      "  lui $s0, 0xffff",
      "  ori $t0, $zero, 65",
      "  sb $t0, 12($s0)",
      "  ori $t0, $zero, 66",
      "  sb $t0, 12($s0)",
      "  li $v0, 10",
      "  syscall",
      ""
    ].join("\n");

    const cacheSource = [
      ".data",
      "values: .word 1, 2, 3, 4",
      ".text",
      "main:",
      "  la $t0, values",
      "  lw $t1, 0($t0)",
      "  lw $t2, 4($t0)",
      "  li $v0, 10",
      "  syscall",
      ""
    ].join("\n");

    const bitmapSource = [
      ".text",
      "main:",
      "  lui $t0, 0x1001",
      "  ori $t0, $t0, 0x0000",
      "  li $t1, 0x00ff0000",
      "  sw $t1, 0($t0)",
      "  li $t1, 0x0000ff00",
      "  sw $t1, 0($t0)",
      "  li $v0, 10",
      "  syscall",
      ""
    ].join("\n");

    const digitalLabSource = [
      ".text",
      "main:",
      "  lui $s0, 0xffff",
      "  ori $t0, $zero, 63",
      "  sb $t0, 16($s0)",
      "  ori $t0, $zero, 6",
      "  sb $t0, 16($s0)",
      "  li $v0, 10",
      "  syscall",
      ""
    ].join("\n");

    const marsBotSource = [
      ".text",
      "main:",
      "  lui $s0, 0xffff",
      "  ori $s0, $s0, 0x8010",
      "  ori $t0, $zero, 90",
      "  sw $t0, 0($s0)",
      "  ori $t0, $zero, 180",
      "  sw $t0, 0($s0)",
      "  li $v0, 10",
      "  syscall",
      ""
    ].join("\n");

    const ttySource = [
      ".text",
      "main:",
      "  lui $s0, 0xffff",
      "  ori $t0, $zero, 65",
      "  sb $t0, 12($s0)",
      "  ori $t0, $zero, 66",
      "  sb $t0, 12($s0)",
      "  li $v0, 10",
      "  syscall",
      ""
    ].join("\n");

    for (const backendMode of ["js", "hybrid"]) {
      await runCase("bitmap_display_backstep_" + backendMode, async () => {
        const toolWindow = await ensureToolWindow("bitmap-display");
        await ensureConnected(toolWindow, "[data-bitmap='connect']");
        await clickElement(toolWindow.querySelector("[data-bitmap='reset']"));
        await assembleProgram(bitmapSource, backendMode);
        await stepTimes(4);
        const canvas = toolWindow.querySelector("[data-bitmap='canvas']");
        const afterFirst = rgbaHex(canvas, 0, 0);
        await stepTimes(2);
        const afterSecond = rgbaHex(canvas, 0, 0);
        await backstepOnce();
        const afterBackstep = rgbaHex(canvas, 0, 0);
        assert(afterFirst === "ff0000ff", "Expected first bitmap pixel to be red.");
        assert(afterSecond === "00ff00ff", "Expected second bitmap pixel to be green.");
        assert(afterBackstep === afterFirst, "Bitmap display did not restore first pixel after backstep.");
        return { backendMode, afterFirst, afterSecond, afterBackstep };
      });

      await runCase("digital_lab_backstep_" + backendMode, async () => {
        const toolWindow = await ensureToolWindow("digital-lab-sim");
        await ensureConnected(toolWindow, "[data-dl='connect']");
        await clickElement(toolWindow.querySelector("[data-dl='reset']"));
        await assembleProgram(digitalLabSource, backendMode);
        await stepTimes(3);
        const digit = toolWindow.querySelector("[data-dl='digit-right']");
        const afterFirst = digit.toDataURL();
        await stepTimes(2);
        const afterSecond = digit.toDataURL();
        await backstepOnce();
        const afterBackstep = digit.toDataURL();
        assert(afterFirst !== afterSecond, "Digital Lab display should change after second write.");
        assert(afterBackstep === afterFirst, "Digital Lab display did not restore after backstep.");
        return {
          backendMode,
          afterFirstHash: afterFirst.length,
          afterSecondHash: afterSecond.length,
          restored: afterBackstep === afterFirst
        };
      });

      await runCase("keyboard_display_backstep_" + backendMode, async () => {
        const toolWindow = await ensureToolWindow("keyboard-display-mmio");
        await ensureConnected(toolWindow, "[data-kd='connect']");
        const dad = toolWindow.querySelector("[data-kd='dad']");
        if (dad instanceof HTMLInputElement && dad.checked) {
          dad.click();
          await wait(60);
        }
        await clickElement(toolWindow.querySelector("[data-kd='reset']"));
        await assembleProgram(keyboardSource, backendMode);
        await stepTimes(3);
        const display = toolWindow.querySelector("[data-kd='display']");
        const afterFirst = String(display.value || "");
        await stepTimes(2);
        const afterSecond = String(display.value || "");
        await backstepOnce();
        const afterBackstep = String(display.value || "");
        assert(afterFirst === "A", "Expected first keyboard/display output to be A.");
        assert(afterSecond === "AB", "Expected second keyboard/display output to be AB.");
        assert(afterBackstep === "A", "Keyboard/display MMIO did not restore output after backstep.");
        return { backendMode, afterFirst, afterSecond, afterBackstep };
      });

      await runCase("cache_simulator_backstep_" + backendMode, async () => {
        const toolWindow = await ensureToolWindow("cache-simulator");
        await ensureConnected(toolWindow, "[data-cache='connect']");
        const enabled = toolWindow.querySelector("[data-cache='enabled']");
        if (enabled instanceof HTMLInputElement && !enabled.checked) {
          enabled.click();
          await wait(60);
        }
        await clickElement(toolWindow.querySelector("[data-cache='reset']"));
        await assembleProgram(cacheSource, backendMode);
        await stepTimes(2);
        const accessInput = toolWindow.querySelector("[data-cache='access']");
        const afterFirst = Number.parseInt(accessInput.value || "0", 10) || 0;
        await stepTimes(1);
        const afterSecond = Number.parseInt(accessInput.value || "0", 10) || 0;
        await backstepOnce();
        const afterBackstep = Number.parseInt(accessInput.value || "0", 10) || 0;
        assert(afterFirst === 1, "Cache simulator should record first memory access.");
        assert(afterSecond === 2, "Cache simulator should record second memory access.");
        assert(afterBackstep === 1, "Cache simulator did not restore access count after backstep.");
        return { backendMode, afterFirst, afterSecond, afterBackstep };
      });

      await runCase("mars_bot_backstep_" + backendMode, async () => {
        const toolWindow = await ensureToolWindow("mars-bot");
        await ensureConnected(toolWindow, "[data-mb='connect']");
        await clickElement(toolWindow.querySelector("[data-mb='clear']"));
        await assembleProgram(marsBotSource, backendMode);
        await stepTimes(4);
        const info = toolWindow.querySelector("[data-mb='info']");
        const afterFirst = String(info.textContent || "");
        await stepTimes(2);
        const afterSecond = String(info.textContent || "");
        await backstepOnce();
        const afterBackstep = String(info.textContent || "");
        assert(afterFirst.includes("Heading: 90"), "Mars Bot should show first heading after first write.");
        assert(afterSecond.includes("Heading: 180"), "Mars Bot should show second heading after second write.");
        assert(afterBackstep.includes("Heading: 90"), "Mars Bot did not restore heading after backstep.");
        return { backendMode, afterFirst, afterSecond, afterBackstep };
      });

      await runCase("tty_backstep_" + backendMode, async () => {
        const toolWindow = await ensureToolWindow("tty-ansi-terminal");
        await ensureConnected(toolWindow, "[data-tty='connect']");
        await clickElement(toolWindow.querySelector("[data-tty='reset']"));
        await assembleProgram(ttySource, backendMode);
        await stepTimes(3);
        const canvas = toolWindow.querySelector("[data-tty='canvas']");
        assert(canvas instanceof HTMLCanvasElement, "Missing TTY canvas.");
        const afterFirst = canvas.toDataURL();
        await stepTimes(2);
        const afterSecond = canvas.toDataURL();
        await backstepOnce();
        const afterBackstep = canvas.toDataURL();
        assert(afterFirst !== afterSecond, "TTY output should change after the second write.");
        assert(afterBackstep === afterFirst, "TTY display did not restore after backstep.");
        return {
          backendMode,
          afterFirstHash: afterFirst.length,
          afterSecondHash: afterSecond.length,
          restored: afterBackstep === afterFirst
        };
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      cases,
      summary: {
        total: cases.length,
        passed: cases.filter((entry) => entry.ok === true).length,
        failed: cases.filter((entry) => entry.ok !== true).length
      }
    };
  })();`;
}

async function main() {
  mkdirSync(resultDir, { recursive: true });
  let harness = null;
  try {
    harness = await launchBrowserHarness({
      repoRoot,
      appPort: APP_PORT,
      targetUrl: TARGET_URL,
      debugPort: DEBUG_PORT,
      edgePath: EDGE_PATH
    });

    const evaluation = await harness.send("Runtime.evaluate", {
      expression: buildBrowserExpression(),
      awaitPromise: true,
      returnByValue: true
    });
    const report = evaluation?.result?.value;
    if (!report || typeof report !== "object") {
      throw new Error("Tool backstep parity smoke did not return a valid report.");
    }

    writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Tool backstep parity: ${report.summary?.passed || 0}/${report.summary?.total || 0} passed`);
    if ((report.summary?.failed || 0) > 0) {
      for (const entry of report.cases || []) {
        if (entry.ok === true) continue;
        console.log(`FAIL ${entry.name}: ${String(entry.error || "").trim()}`);
      }
      process.exitCode = 1;
    }
  } finally {
    cleanupBrowserHarness(harness);
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
