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
const resultPath = resolve(resultDir, "tools-mmio-endianness-smoke.json");

const APP_PORT = Number(process.env.TOOLS_MMIO_SMOKE_APP_PORT || 8087);
const DEBUG_PORT = Number(process.env.TOOLS_MMIO_SMOKE_DEBUG_PORT || 9230);
const TARGET_URL = process.env.TOOLS_MMIO_SMOKE_TARGET_URL || `http://localhost:${APP_PORT}/`;

function buildBrowserExpression() {
  return `(async () => {
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

    const click = (element) => {
      if (!(element instanceof HTMLElement)) throw new Error("Element not clickable");
      element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    };

    const keydown = (element, key) => {
      if (!(element instanceof HTMLElement)) throw new Error("Element not keyboard-capable");
      element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    };

    const debug = await waitFor(() => window.WebMarsRuntimeDebug, 5000, "WebMarsRuntimeDebug");
    const mmioBase = 0xffff0000 >>> 0;
    const toolCases = [
      {
        id: "keyboard-display-mmio",
        windowId: "window-tool-keyboard-display-mmio",
        connectSelector: "[data-kd='connect']",
        resetSelector: "[data-kd='reset']",
        inputSelector: "[data-kd='keyboard']",
        key: "A",
        expectedByte: 65,
        verify(debug, mmioBase) {
          const receiverControl = debug.readByte(mmioBase);
          const receiverData = debug.readByte(mmioBase + 4);
          return {
            receiverControl,
            receiverData,
            expectedByte: 65,
            pass: receiverControl === 1 && receiverData === 65
          };
        }
      },
      {
        id: "bitmap-terminal-tool",
        windowId: "window-tool-bitmap-terminal-tool",
        connectSelector: "[data-bt='connect']",
        resetSelector: "[data-bt='reset']",
        inputSelector: "[data-bt='kb-input']",
        key: "B",
        extraKeys: ["C"],
        verify: async (debug, mmioBase) => {
          const initialControl = debug.readByte(mmioBase);
          const firstRead = debug.readByte(mmioBase + 4);
          await wait(60);
          const afterFirstControl = debug.readByte(mmioBase);
          const secondRead = debug.readByte(mmioBase + 4);
          await wait(60);
          const afterSecondControl = debug.readByte(mmioBase);
          const afterSecondData = debug.readByte(mmioBase + 4);
          const pass =
            initialControl === 1
            && firstRead === 66
            && afterFirstControl === 1
            && secondRead === 67
            && afterSecondControl === 0
            && afterSecondData === 0;
          return {
            initialControl,
            firstRead,
            afterFirstControl,
            secondRead,
            afterSecondControl,
            afterSecondData,
            expectedBytes: [66, 67],
            pass
          };
        }
      }
    ];

    const cases = [];
    for (const testCase of toolCases) {
      debug.openTool(testCase.id);
      const toolWindow = await waitFor(() => document.getElementById(testCase.windowId), 3000, testCase.windowId);
      const connectButton = toolWindow.querySelector(testCase.connectSelector);
      const resetButton = toolWindow.querySelector(testCase.resetSelector);
      const input = toolWindow.querySelector(testCase.inputSelector);
      click(connectButton);
      await wait(80);
      input.focus();
      keydown(input, testCase.key);
      for (const extraKey of (testCase.extraKeys || [])) {
        keydown(input, extraKey);
      }
      await wait(80);
      const verification = typeof testCase.verify === "function"
        ? await testCase.verify(debug, mmioBase)
        : {
            pass: false,
            detail: "missing verifier"
          };

      cases.push({
        id: testCase.id,
        ...verification
      });

      click(resetButton);
      await wait(40);
    }

    return {
      generatedAt: new Date().toISOString(),
      cases,
      summary: {
        total: cases.length,
        passed: cases.filter((entry) => entry.pass === true).length,
        failed: cases.filter((entry) => entry.pass !== true).length
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
    if (!report || typeof report !== "object") throw new Error("Tool MMIO smoke suite did not return a valid report.");

    writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Tool MMIO smoke: ${report.summary?.passed || 0}/${report.summary?.total || 0} passed`);
    if ((report.summary?.failed || 0) > 0) {
      for (const entry of report.cases || []) {
        if (entry.pass === true) continue;
        console.log(`FAIL ${entry.id}: expected byte ${entry.expectedByte}, got ctrl=${entry.receiverControl} data=${entry.receiverData}`);
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
