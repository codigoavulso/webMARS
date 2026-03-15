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
const resultPath = resolve(resultDir, "observer-engine-parity.json");

const APP_PORT = Number(process.env.OBSERVER_ENGINE_APP_PORT || 8088);
const DEBUG_PORT = Number(process.env.OBSERVER_ENGINE_DEBUG_PORT || 9231);
const TARGET_URL = process.env.OBSERVER_ENGINE_TARGET_URL || `http://localhost:${APP_PORT}/`;

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

    const mmioBase = 0xffff0000 >>> 0;
    const source = [
      ".text",
      "main:",
      "  lui $s0, 0xffff",
      "  lbu $t0, 4($s0)",
      "  li $t1, 65",
      "  sb $t1, 12($s0)",
      "  li $v0, 10",
      "  syscall"
    ].join("\\n");

    const expectedKinds = ["read", "write"];
    const debug = await waitFor(() => window.WebMarsRuntimeDebug, 5000, "WebMarsRuntimeDebug");

    const runCase = async (backendMode) => {
      const engine = createMarsEngine({
        settings: {
          ...DEFAULT_SETTINGS,
          assemblerBackendMode: backendMode,
          simulatorBackendMode: backendMode
        },
        memoryMap: { ...DEFAULT_MEMORY_MAP }
      });
      if (typeof engine.whenReady === "function") {
        await engine.whenReady();
      }

      const hostEvents = [];
      const detachHost = engine.registerMemoryObserver({
        start: mmioBase,
        end: (mmioBase + 0x0c) >>> 0,
        onRead(detail) {
          hostEvents.push({
            phase: "host",
            kind: "read",
            address: detail.address >>> 0,
            size: detail.size | 0,
            value: detail.value | 0
          });
        },
        onWrite(detail) {
          hostEvents.push({
            phase: "host",
            kind: "write",
            address: detail.address >>> 0,
            size: detail.size | 0,
            value: detail.value | 0
          });
        }
      });

      const assembled = engine.assemble(source, { sourceName: backendMode + "-observer.s" });
      if (backendMode === "hybrid") {
        await wait(1200);
      }
      hostEvents.length = 0;
      engine.writeByte((mmioBase + 4) >>> 0, 0x41);
      const hostReadValue = engine.readByte((mmioBase + 4) >>> 0, false) & 0xff;
      const backendAfterHost = engine.getBackendInfo?.() || null;
      detachHost();

      const stepEvents = [];
      const detachStep = engine.registerMemoryObserver({
        start: mmioBase,
        end: (mmioBase + 0x0c) >>> 0,
        onRead(detail) {
          stepEvents.push({
            phase: "step",
            kind: "read",
            address: detail.address >>> 0,
            size: detail.size | 0,
            value: detail.value | 0
          });
        },
        onWrite(detail) {
          stepEvents.push({
            phase: "step",
            kind: "write",
            address: detail.address >>> 0,
            size: detail.size | 0,
            value: detail.value | 0
          });
        }
      });

      engine.writeByte(mmioBase >>> 0, 1);
      engine.writeByte((mmioBase + 4) >>> 0, 0x5a);
      engine.writeByte((mmioBase + 8) >>> 0, 1);
      stepEvents.length = 0;
      const runResult = engine.go(20);
      const snapshot = engine.getSnapshot({
        includeTextRows: false,
        includeLabels: false,
        includeDataRows: false,
        includeMemoryWords: false
      });
      const backendAfterRun = engine.getBackendInfo?.() || null;
      detachStep();

      const hostPass =
        hostReadValue === 0x41
        && hostEvents.length === 2
        && hostEvents[0]?.kind === "write"
        && hostEvents[0]?.address === ((mmioBase + 4) >>> 0)
        && hostEvents[1]?.kind === "read"
        && hostEvents[1]?.address === ((mmioBase + 4) >>> 0);

      const stepKinds = Array.from(new Set(stepEvents.map((entry) => entry.kind)));
      const sawReceiverRead = stepEvents.some((entry) => entry.kind === "read" && entry.address === ((mmioBase + 4) >>> 0) && entry.size === 1);
      const sawTransmitterWrite = stepEvents.some((entry) => entry.kind === "write" && entry.address === ((mmioBase + 12) >>> 0) && entry.size === 1 && ((entry.value & 0xff) === 65));
      const stepPass =
        expectedKinds.every((kind) => stepKinds.includes(kind))
        && sawReceiverRead
        && sawTransmitterWrite
        && runResult?.ok === true
        && snapshot?.halted === true;

      return {
        backendMode,
        assembledOk: assembled?.ok === true,
        backendAfterHost,
        backendAfterRun,
        hostReadValue,
        hostEvents,
        stepEvents,
        hostPass,
        stepPass
      };
    };

    const cases = [];
    for (const backendMode of ["js", "hybrid"]) {
      cases.push(await runCase(backendMode));
    }

    return {
      generatedAt: new Date().toISOString(),
      cases,
      summary: {
        total: cases.length,
        passed: cases.filter((entry) => entry.assembledOk && entry.hostPass && entry.stepPass).length,
        failed: cases.filter((entry) => !(entry.assembledOk && entry.hostPass && entry.stepPass)).length
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
      throw new Error("Observer engine parity did not return a valid report.");
    }

    writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Observer engine parity: ${report.summary?.passed || 0}/${report.summary?.total || 0} passed`);
    if ((report.summary?.failed || 0) > 0) {
      for (const entry of report.cases || []) {
        const pass = entry.assembledOk && entry.hostPass && entry.stepPass;
        if (pass) continue;
        console.log(`FAIL ${entry.backendMode}: assembled=${entry.assembledOk} host=${entry.hostPass} step=${entry.stepPass}`);
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
