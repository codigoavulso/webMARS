import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EDGE_PATH,
  cleanupBrowserHarness,
  comparePrimitive,
  formatHex,
  launchBrowserHarness,
  mapBy,
  normalizeBackendMode
} from "./browser-parity-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const resultDir = join(repoRoot, "test-results");
const resultPath = join(resultDir, "assembler-engine-parity.json");

const DEBUG_PORT = Number(process.env.ASSEMBLER_PARITY_DEBUG_PORT || 9227);
const APP_PORT = Number(process.env.ASSEMBLER_PARITY_APP_PORT || 8084);
const TARGET_URL = process.env.ASSEMBLER_PARITY_TARGET_URL || `http://localhost:${APP_PORT}/`;
const BASELINE_MODE = normalizeBackendMode(process.env.ASSEMBLER_PARITY_BASELINE_MODE || "js", "js");
const CANDIDATE_MODE = normalizeBackendMode(process.env.ASSEMBLER_PARITY_CANDIDATE_MODE || "hybrid", "hybrid");

function parseArgs(argv) {
  const options = {
    baselineMode: BASELINE_MODE,
    candidateMode: CANDIDATE_MODE,
    targetUrl: TARGET_URL,
    appPort: APP_PORT,
    debugPort: DEBUG_PORT
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--baseline" && i + 1 < argv.length) options.baselineMode = normalizeBackendMode(argv[++i], options.baselineMode);
    else if (arg === "--candidate" && i + 1 < argv.length) options.candidateMode = normalizeBackendMode(argv[++i], options.candidateMode);
    else if (arg === "--target-url" && i + 1 < argv.length) options.targetUrl = String(argv[++i]);
    else if (arg === "--app-port" && i + 1 < argv.length) options.appPort = Number(argv[++i]);
    else if (arg === "--debug-port" && i + 1 < argv.length) options.debugPort = Number(argv[++i]);
  }
  return options;
}

function buildCases() {
  return [
    {
      id: "basic_text_and_data",
      description: "Basic assembly with labels, data directives, and pseudo-instructions.",
      sourceName: "basic_text_and_data.s",
      source: `.data
msg: .asciiz "OK"
value: .word 7
.text
main:
  li $t0, 5
  la $a0, msg
  lw $t1, value
  addu $t2, $t0, $t1
  li $v0, 10
  syscall
`
    },
    {
      id: "include_macro_eqv",
      description: "Include map, macro expansion, and .eqv should assemble identically.",
      sourceName: "include_macro_eqv.s",
      source: `.include "defs.inc"
.data
glyph: .asciiz "A"
number: .word CONST
.text
main:
  twice($t0)
  li $v0, 10
  syscall
`,
      files: {
        "defs.inc": `.eqv CONST 66
.macro twice (%r)
  addiu %r, %r, CONST
.end_macro
`
      }
    },
    {
      id: "chained_include_local_labels",
      description: "Chained includes with nested macros and local labels should expand identically.",
      sourceName: "chained_include_local_labels.s",
      source: `.include "level1.inc"
.text
main:
  li $t0, 2
  li $t1, 1
  countdown($t0)
  countdown($t1)
  li $v0, 10
  syscall
`,
      files: {
        "level1.inc": `.include "level2.inc"
.macro countdown (%r)
loop:
  inner_step(%r)
  addiu %r, %r, -1
  bgtz %r, loop
  nop
.end_macro
`,
        "level2.inc": `.eqv STEP 3
.macro inner_step (%r)
  addiu %r, %r, STEP
.end_macro
`
      }
    },
    {
      id: "pseudo_instruction_mix",
      description: "Less common pseudo-instructions should produce the same expansion.",
      sourceName: "pseudo_instruction_mix.s",
      source: `.data
slot: .word 0
.text
main:
  clear $t0
  li $t1, -5
  abs $t2, $t1
  not $t3, $t2
  negu $t4, $t2
  move $t5, $t4
  beqz $t0, done
  nop
done:
  sw $t5, slot
  li $v0, 10
  syscall
`
    },
    {
      id: "invalid_opcode",
      description: "Unknown opcode should produce the same assembly failure diagnostics.",
      sourceName: "invalid_opcode.s",
      source: `.text
main:
  foobar $t0, $t1, $t2
  li $v0, 10
  syscall
`
    },
    {
      id: "invalid_operand_syntax",
      description: "Malformed memory operand should fail the same way.",
      sourceName: "invalid_operand_syntax.s",
      source: `.text
main:
  lw $t0, bad(
  li $v0, 10
  syscall
`
    },
    {
      id: "macro_arity_mismatch",
      description: "Macro arity mismatch should generate the same error diagnostics.",
      sourceName: "macro_arity_mismatch.s",
      source: `.macro pair (%a, %b)
  addu %a, %a, %b
.end_macro
.text
main:
  pair($t0)
  li $v0, 10
  syscall
`
    },
    {
      id: "missing_include",
      description: "Missing include file should produce the same diagnostics.",
      sourceName: "missing_include.s",
      source: `.include "missing.inc"
.text
main:
  li $v0, 10
  syscall
`
    },
    {
      id: "missing_nested_include",
      description: "Missing nested include file should produce the same diagnostics.",
      sourceName: "missing_nested_include.s",
      source: `.include "outer.inc"
.text
main:
  li $v0, 10
  syscall
`,
      files: {
        "outer.inc": `.include "missing_inner.inc"
`
      }
    },
    {
      id: "set_noat_pseudo_rejection",
      description: "\".set noat\" should reject pseudo-expansion that needs $at in the same way.",
      sourceName: "set_noat_pseudo_rejection.s",
      source: `.set noat
.text
main:
  blt $t0, $t1, done
  nop
done:
  li $v0, 10
  syscall
`
    }
  ];
}

function buildBrowserExpression(payload) {
  return `(async () => {
    const suite = ${JSON.stringify(payload)};

    const normalizeMessage = (entry) => ({
      line: Number(entry?.line ?? 0) | 0,
      message: String(entry?.message ?? ""),
      normalized: String(entry?.message ?? "").replace(/\\r\\n/g, "\\n").replace(/\\s+/g, " ").trim().toLowerCase().replace(/\\\\/g, "/")
    });

    const mapMemoryWords = (snapshot) => {
      const rows = [];
      if (snapshot?.memoryWords instanceof Map) {
        snapshot.memoryWords.forEach((value, address) => {
          rows.push({
            address: Number(address) >>> 0,
            value: Number(value) | 0,
            valueHex: "0x" + ((Number(value) >>> 0).toString(16).padStart(8, "0"))
          });
        });
      } else if (Array.isArray(snapshot?.memoryWords)) {
        snapshot.memoryWords.forEach((entry) => {
          rows.push({
            address: Number(entry?.address ?? 0) >>> 0,
            value: Number(entry?.value ?? 0) | 0,
            valueHex: "0x" + ((Number(entry?.value ?? 0) >>> 0).toString(16).padStart(8, "0"))
          });
        });
      }
      return rows.sort((a, b) => a.address - b.address);
    };

    const sampleMemoryBytes = (engine, memoryWords) => {
      const addresses = new Set();
      memoryWords.forEach((entry) => {
        const base = Number(entry?.address ?? 0) >>> 0;
        for (let i = 0; i < 4; i += 1) addresses.add((base + i) >>> 0);
      });
      return Array.from(addresses)
        .sort((a, b) => a - b)
        .map((address) => {
          try {
            const value = Number(engine.readByte(address, false)) & 0xff;
            return { address, value, valueHex: "0x" + value.toString(16).padStart(2, "0"), present: true };
          } catch {
            return { address, value: null, valueHex: null, present: false };
          }
        });
    };

    const captureAssembly = async (backendMode, testCase) => {
      const settings = {
        ...DEFAULT_SETTINGS,
        assemblerBackendMode: backendMode,
        simulatorBackendMode: "js",
        coreBackend: backendMode === "hybrid" ? "wasm" : "js"
      };
      const engine = createMarsEngine({
        settings,
        memoryMap: { ...DEFAULT_MEMORY_MAP }
      });
      if (typeof engine.whenReady === "function") {
        await engine.whenReady();
      }
      const assembled = engine.assemble(testCase.source, {
        sourceName: testCase.sourceName,
        includeMap: new Map(Object.entries(testCase.files || {}).map(([name, text]) => [String(name), String(text ?? "")]))
      });
      const snapshot = assembled?.snapshot && typeof assembled.snapshot === "object"
        ? assembled.snapshot
        : engine.getSnapshot({
            includeTextRows: true,
            includeLabels: true,
            includeDataRows: true,
            includeRegisters: false,
            includeMemoryWords: false
          });
      const dataRows = (Array.isArray(snapshot?.dataRows) ? snapshot.dataRows : []).map((row) => ({
        address: Number(row?.address ?? 0) >>> 0,
        value: Number(row?.value ?? 0) | 0,
        valueHex: String(row?.valueHex ?? "")
      }));
      const dataBytes = sampleMemoryBytes(engine, dataRows);
      return {
        backendMode,
        backendInfo: typeof engine.getBackendInfo === "function" ? engine.getBackendInfo() : null,
        assembledOk: assembled?.ok === true,
        native: assembled?.native === true,
        fallback: assembled?.fallback === true,
        warnings: (Array.isArray(assembled?.warnings) ? assembled.warnings : []).map(normalizeMessage),
        errors: (Array.isArray(assembled?.errors) ? assembled.errors : []).map(normalizeMessage),
        textRows: (Array.isArray(snapshot?.textRows) ? snapshot.textRows : []).map((row) => ({
          address: Number(row?.address ?? 0) >>> 0,
          line: Number(row?.line ?? 0) | 0,
          source: String(row?.source ?? ""),
          basic: String(row?.basic ?? ""),
          code: row?.code == null ? null : String(row.code),
          machineCodeHex: row?.machineCodeHex == null ? "" : String(row.machineCodeHex)
        })),
        labels: (Array.isArray(snapshot?.labels) ? snapshot.labels : []).map((entry) => ({
          label: String(entry?.label ?? ""),
          address: Number(entry?.address ?? 0) >>> 0
        })),
        dataRows,
        dataBytes
      };
    };

    const report = {
      generatedAt: new Date().toISOString(),
      setup: {
        baselineMode: suite.baselineMode,
        candidateMode: suite.candidateMode,
        wasmStatus: window.WebMarsWasmCore?.status || null
      },
      cases: []
    };

    for (const testCase of suite.cases) {
      try {
        const baseline = await captureAssembly(suite.baselineMode, testCase);
        const candidate = await captureAssembly(suite.candidateMode, testCase);
        report.cases.push({ testCase, baseline, candidate });
      } catch (error) {
        report.cases.push({
          testCase,
          setupError: error instanceof Error ? (error.stack || error.message) : String(error)
        });
      }
    }

    return report;
  })()`;
}

function compareMessages(label, left, right, mismatches) {
  const leftRaw = (Array.isArray(left) ? left : []).map((entry) => `${entry.line}|${entry.message}`);
  const rightRaw = (Array.isArray(right) ? right : []).map((entry) => `${entry.line}|${entry.message}`);
  const leftNormalized = (Array.isArray(left) ? left : []).map((entry) => `${entry.line}|${entry.normalized}`);
  const rightNormalized = (Array.isArray(right) ? right : []).map((entry) => `${entry.line}|${entry.normalized}`);
  comparePrimitive(`${label}.raw`, leftRaw, rightRaw, mismatches);
  comparePrimitive(`${label}.normalized`, leftNormalized, rightNormalized, mismatches);
}

function compareLabels(left, right, mismatches) {
  const leftMap = mapBy(left, (entry) => String(entry.label));
  const rightMap = mapBy(right, (entry) => String(entry.label));
  const names = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const label of names) {
    const lhs = leftMap.get(label);
    const rhs = rightMap.get(label);
    if (!lhs || !rhs) {
      mismatches.push({ area: "labels", detail: `Missing label '${label}' in ${!lhs ? "baseline" : "candidate"}` });
      continue;
    }
    if ((lhs.address >>> 0) !== (rhs.address >>> 0)) {
      mismatches.push({ area: "labels", detail: `Label '${label}' address mismatch (${formatHex(lhs.address)} vs ${formatHex(rhs.address)})` });
    }
  }
}

function compareTextRows(left, right, mismatches) {
  const leftMap = mapBy(left, (entry) => Number(entry.address) >>> 0);
  const rightMap = mapBy(right, (entry) => Number(entry.address) >>> 0);
  const addresses = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const address of addresses) {
    const lhs = leftMap.get(address);
    const rhs = rightMap.get(address);
    if (!lhs || !rhs) {
      mismatches.push({ area: "textRows", detail: `Missing text row @ ${formatHex(address)} in ${!lhs ? "baseline" : "candidate"}` });
      continue;
    }
    ["line", "machineCodeHex"].forEach((field) => {
      if (JSON.stringify(lhs[field] ?? null) !== JSON.stringify(rhs[field] ?? null)) {
        mismatches.push({
          area: "textRows",
          detail: `Row ${formatHex(address)} field '${field}' differs`,
          left: lhs[field] ?? null,
          right: rhs[field] ?? null
        });
      }
    });
  }
}

function compareDataBytes(left, right, mismatches) {
  const leftMap = mapBy(left, (entry) => Number(entry.address) >>> 0);
  const rightMap = mapBy(right, (entry) => Number(entry.address) >>> 0);
  const addresses = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const address of addresses) {
    const lhs = leftMap.get(address);
    const rhs = rightMap.get(address);
    if (!lhs || !rhs) {
      mismatches.push({ area: "dataBytes", detail: `Missing data byte @ ${formatHex(address)} in ${!lhs ? "baseline" : "candidate"}` });
      continue;
    }
    if (JSON.stringify(String(lhs.valueHex || "").trim().toLowerCase()) !== JSON.stringify(String(rhs.valueHex || "").trim().toLowerCase())) {
      mismatches.push({
        area: "dataBytes",
        detail: `Data byte mismatch @ ${formatHex(address)}`,
        left: lhs.valueHex ?? formatHex(lhs.value),
        right: rhs.valueHex ?? formatHex(rhs.value)
      });
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(resultDir, { recursive: true });
  const payload = {
    baselineMode: options.baselineMode,
    candidateMode: options.candidateMode,
    cases: buildCases()
  };

  let harness = null;
  try {
    harness = await launchBrowserHarness({
      repoRoot,
      appPort: options.appPort,
      targetUrl: options.targetUrl,
      debugPort: options.debugPort,
      edgePath: EDGE_PATH
    });

    const evaluation = await harness.send("Runtime.evaluate", {
      expression: buildBrowserExpression(payload),
      awaitPromise: true,
      returnByValue: true
    });

    const rawReport = evaluation?.result?.value;
    if (!rawReport || typeof rawReport !== "object") {
      throw new Error("Assembler parity suite did not return a valid report.");
    }

    const report = {
      generatedAt: rawReport.generatedAt,
      host: {
        edgePath: EDGE_PATH,
        targetUrl: options.targetUrl,
        appPort: options.appPort,
        debugPort: options.debugPort,
        baselineMode: options.baselineMode,
        candidateMode: options.candidateMode
      },
      setup: rawReport.setup,
      cases: []
    };

    for (const entry of rawReport.cases || []) {
      if (entry.setupError) {
        report.cases.push({
          id: entry.testCase?.id || "unknown",
          description: entry.testCase?.description || "",
          pass: false,
          setupError: entry.setupError,
          mismatchCount: 1,
          mismatches: [{ area: "setup", detail: entry.setupError }]
        });
        continue;
      }

      const mismatches = [];
      comparePrimitive("assembledOk", Boolean(entry.baseline?.assembledOk), Boolean(entry.candidate?.assembledOk), mismatches);
      compareMessages("warnings", entry.baseline?.warnings, entry.candidate?.warnings, mismatches);
      compareMessages("errors", entry.baseline?.errors, entry.candidate?.errors, mismatches);
      if (Boolean(entry.baseline?.assembledOk) && Boolean(entry.candidate?.assembledOk)) {
        compareLabels(entry.baseline?.labels || [], entry.candidate?.labels || [], mismatches);
        compareTextRows(entry.baseline?.textRows || [], entry.candidate?.textRows || [], mismatches);
        compareDataBytes(entry.baseline?.dataBytes || [], entry.candidate?.dataBytes || [], mismatches);
      }

      report.cases.push({
        id: entry.testCase.id,
        description: entry.testCase.description,
        pass: mismatches.length === 0,
        mismatchCount: mismatches.length,
        mismatches,
        baselineBackend: entry.baseline?.backendInfo || null,
        candidateBackend: entry.candidate?.backendInfo || null
      });
    }

    report.summary = {
      total: report.cases.length,
      passed: report.cases.filter((entry) => entry.pass).length,
      failed: report.cases.filter((entry) => !entry.pass).length
    };

    writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(`Assembler parity: ${report.summary.passed}/${report.summary.total} passed`);
    for (const entry of report.cases) {
      const prefix = entry.pass ? "PASS" : "FAIL";
      console.log(`${prefix} ${entry.id} (${entry.mismatchCount} mismatches)`);
      if (!entry.pass) {
        entry.mismatches.slice(0, 5).forEach((mismatch) => {
          console.log(`  - ${mismatch.area}: ${typeof mismatch.detail === "string" ? mismatch.detail : JSON.stringify(mismatch.detail)}`);
        });
      }
    }

    if (report.summary.failed > 0) process.exitCode = 1;
  } finally {
    cleanupBrowserHarness(harness);
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
