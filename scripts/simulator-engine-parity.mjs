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
  normalizeBackendMode,
  normalizeText
} from "./browser-parity-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const resultDir = join(repoRoot, "test-results");
const resultPath = join(resultDir, "simulator-engine-parity.json");

const DEBUG_PORT = Number(process.env.SIMULATOR_PARITY_DEBUG_PORT || 9228);
const APP_PORT = Number(process.env.SIMULATOR_PARITY_APP_PORT || 8085);
const TARGET_URL = process.env.SIMULATOR_PARITY_TARGET_URL || `http://localhost:${APP_PORT}/`;
const ASSEMBLER_MODE = normalizeBackendMode(process.env.SIMULATOR_PARITY_ASSEMBLER_MODE || "js", "js");
const BASELINE_MODE = normalizeBackendMode(process.env.SIMULATOR_PARITY_BASELINE_MODE || "js", "js");
const CANDIDATE_MODE = normalizeBackendMode(process.env.SIMULATOR_PARITY_CANDIDATE_MODE || "hybrid", "hybrid");

function parseArgs(argv) {
  const options = {
    assemblerMode: ASSEMBLER_MODE,
    baselineMode: BASELINE_MODE,
    candidateMode: CANDIDATE_MODE,
    targetUrl: TARGET_URL,
    appPort: APP_PORT,
    debugPort: DEBUG_PORT
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--assembler" && i + 1 < argv.length) options.assemblerMode = normalizeBackendMode(argv[++i], options.assemblerMode);
    else if (arg === "--baseline" && i + 1 < argv.length) options.baselineMode = normalizeBackendMode(argv[++i], options.baselineMode);
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
      id: "arith_output",
      description: "Arithmetic plus console output should behave identically.",
      maxSteps: 20,
      source: `.text
main:
  addiu $t0, $zero, 3
  addiu $t1, $zero, 4
  addu $a0, $t0, $t1
  li $v0, 1
  syscall
  li $a0, 10
  li $v0, 11
  syscall
  li $v0, 10
  syscall
`
    },
    {
      id: "memory_roundtrip",
      description: "Load/store path should match between simulators.",
      maxSteps: 24,
      source: `.data
value: .word 7
.text
main:
  lw $t0, value
  addiu $t0, $t0, 5
  sw $t0, value
  lw $a0, value
  li $v0, 1
  syscall
  li $v0, 10
  syscall
`
    },
    {
      id: "delay_branch_off",
      description: "Delayed branching disabled path should match step-by-step.",
      maxSteps: 16,
      settings: { delayedBranching: false },
      source: `.text
main:
  addiu $t0, $zero, 1
  addiu $t1, $zero, 0
  beq $t0, $t0, done
  addiu $t1, $t1, 5
done:
  li $v0, 10
  syscall
`
    },
    {
      id: "delay_branch_on",
      description: "Delayed branching enabled path should match step-by-step.",
      maxSteps: 16,
      settings: { delayedBranching: true },
      source: `.text
main:
  addiu $t0, $zero, 1
  addiu $t1, $zero, 0
  beq $t0, $t0, done
  addiu $t1, $t1, 5
done:
  li $v0, 10
  syscall
`
    },
    {
      id: "unaligned_exception",
      description: "Unaligned LW should surface the same runtime error.",
      maxSteps: 12,
      source: `.data
buf: .space 8
.text
main:
  la $t0, buf
  addiu $t0, $t0, 1
  lw $t1, 0($t0)
  li $v0, 10
  syscall
`
    },
    {
      id: "trap_teq",
      description: "Trap behavior should match including COP0 state.",
      maxSteps: 12,
      source: `.text
main:
  li $t0, 1
  li $t1, 1
  teq $t0, $t1
  li $v0, 10
  syscall
`
    },
    {
      id: "syscall_read_int_echo",
      description: "Read-int syscall should consume the same input and produce the same output.",
      maxSteps: 16,
      inputSequence: ["37"],
      source: `.text
main:
  li $v0, 5
  syscall
  addu $a0, $v0, $zero
  li $v0, 1
  syscall
  li $a0, 10
  li $v0, 11
  syscall
  li $v0, 10
  syscall
`
    },
    {
      id: "syscall_read_char_echo",
      description: "Read-char syscall should consume the same byte and echo it identically.",
      maxSteps: 16,
      inputSequence: ["Z"],
      source: `.text
main:
  li $v0, 12
  syscall
  addu $a0, $v0, $zero
  li $v0, 11
  syscall
  li $a0, 10
  li $v0, 11
  syscall
  li $v0, 10
  syscall
`
    },
    {
      id: "syscall_read_string_echo",
      description: "Read-string syscall should write the same buffer contents and echo identically.",
      maxSteps: 20,
      inputSequence: ["mars"],
      source: `.data
buf: .space 16
.text
main:
  la $a0, buf
  li $a1, 8
  li $v0, 8
  syscall
  la $a0, buf
  li $v0, 4
  syscall
  li $v0, 10
  syscall
`
    },
    {
      id: "syscall_sbrk_heap_roundtrip",
      description: "sbrk plus heap word/byte accesses should match exactly.",
      maxSteps: 24,
      source: `.text
main:
  li $a0, 12
  li $v0, 9
  syscall
  addu $s0, $v0, $zero
  lui $t0, 0x1234
  ori $t0, $t0, 0x5678
  sw $t0, 0($s0)
  li $t1, 65
  sb $t1, 4($s0)
  lw $a0, 0($s0)
  li $v0, 1
  syscall
  li $a0, 10
  li $v0, 11
  syscall
  lbu $a0, 4($s0)
  li $v0, 11
  syscall
  li $a0, 10
  li $v0, 11
  syscall
  li $v0, 10
  syscall
`
    },
    {
      id: "syscall_print_formats",
      description: "Hex, binary, and unsigned print syscalls should stay aligned between JS and hybrid.",
      maxSteps: 20,
      source: `.text
main:
  li $a0, -1
  li $v0, 34
  syscall
  li $a0, 10
  li $v0, 11
  syscall
  li $a0, -1
  li $v0, 35
  syscall
  li $a0, 10
  li $v0, 11
  syscall
  li $a0, -1
  li $v0, 36
  syscall
  li $a0, 10
  li $v0, 11
  syscall
  li $v0, 10
  syscall
`
    },
    {
      id: "syscall_file_roundtrip",
      description: "File syscalls open/write/read/close should behave identically.",
      maxSteps: 64,
      source: `.data
name: .asciiz "calc.txt"
text: .asciiz "HELLO"
buf: .space 16
.text
main:
  la $a0, name
  li $a1, 1
  li $a2, 0
  li $v0, 13
  syscall
  addu $s0, $v0, $zero
  addu $a0, $s0, $zero
  la $a1, text
  li $a2, 5
  li $v0, 15
  syscall
  addu $a0, $s0, $zero
  li $v0, 16
  syscall

  la $a0, name
  li $a1, 0
  li $a2, 0
  li $v0, 13
  syscall
  addu $s1, $v0, $zero
  addu $a0, $s1, $zero
  la $a1, buf
  li $a2, 5
  li $v0, 14
  syscall
  sb $zero, 5($a1)
  addu $a0, $s1, $zero
  li $v0, 16
  syscall

  la $a0, buf
  li $v0, 4
  syscall
  li $v0, 10
  syscall
`
    },
    {
      id: "syscall_fd0_read",
      description: "Read syscall on fd 0 should consume the same input and populate the same bytes.",
      maxSteps: 32,
      inputSequence: ["abcde"],
      source: `.data
buf: .space 16
.text
main:
  li $a0, 0
  la $a1, buf
  li $a2, 5
  li $v0, 14
  syscall
  sb $zero, 5($a1)
  la $a0, buf
  li $v0, 4
  syscall
  li $v0, 10
  syscall
`
    },
    {
      id: "mmio_word_roundtrip",
      description: "Raw MMIO-segment reads and writes should match exactly.",
      maxSteps: 20,
      source: `.data
out: .word 0
.text
main:
  lui $t0, 0xffff
  lui $t1, 0x1234
  ori $t1, $t1, 0x5678
  sw $t1, 0x20($t0)
  lw $t2, 0x20($t0)
  sw $t2, out
  li $v0, 10
  syscall
`
    },
    {
      id: "mmio_byte_halfword_roundtrip",
      description: "MMIO byte and halfword accesses should preserve little-endian values identically.",
      maxSteps: 20,
      source: `.data
out_byte: .word 0
out_half: .word 0
.text
main:
  lui $t0, 0xffff
  li $t1, 0x5a
  sb $t1, 0x20($t0)
  li $t1, 0x1234
  sh $t1, 0x24($t0)
  lbu $t2, 0x20($t0)
  lhu $t3, 0x24($t0)
  sw $t2, out_byte
  sw $t3, out_half
  li $v0, 10
  syscall
`
    },
    {
      id: "mmio_mixed_width_merge",
      description: "MMIO mixed-width stores should merge bytes exactly the same between JS and hybrid.",
      maxSteps: 20,
      source: `.data
out_word: .word 0
out_half: .word 0
.text
main:
  lui $t0, 0xffff
  lui $t1, 0x1122
  ori $t1, $t1, 0x3344
  sw $t1, 0x20($t0)
  li $t2, 0xaa
  sb $t2, 0x21($t0)
  lw $t3, 0x20($t0)
  lhu $t4, 0x20($t0)
  sw $t3, out_word
  sw $t4, out_half
  li $v0, 10
  syscall
`
    },
    {
      id: "backstep_parity",
      description: "Backstep history and restored state should match after the same sequence.",
      maxSteps: 8,
      backsteps: 3,
      source: `.data
value: .word 1
.text
main:
  lw $t0, value
  addiu $t0, $t0, 4
  sw $t0, value
  addiu $t1, $t0, 2
  addu $t2, $t1, $t0
  li $v0, 10
  syscall
`
    },
    {
      id: "backstep_delayed_memory",
      description: "Backstep with delayed branching and memory writes should restore the same state.",
      maxSteps: 8,
      backsteps: 3,
      settings: { delayedBranching: true },
      source: `.data
x: .word 1
y: .word 10
.text
main:
  lw $t0, x
  lw $t1, y
  addiu $t0, $t0, 1
  sw $t0, x
  beq $t0, $t0, branch
  addiu $t1, $t1, 5
branch:
  sw $t1, y
  addiu $t2, $t1, 9
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

    const toValueList = (values) => Array.isArray(values) ? values.map((value) => Number(value) | 0) : [];

    const compactSnapshot = (engine, options = {}) => {
      const includeTransientState = options?.includeTransientState !== false;
      const snapshot = engine.getSnapshot({
        includeTextRows: false,
        includeLabels: false,
        includeDataRows: false,
        includeRegisters: true,
        includeMemoryWords: true
      });
      const memoryWords = [];
      if (snapshot?.memoryWords instanceof Map) {
        snapshot.memoryWords.forEach((value, address) => {
          memoryWords.push({
            address: Number(address) >>> 0,
            value: Number(value) | 0,
            valueHex: "0x" + ((Number(value) >>> 0).toString(16).padStart(8, "0"))
          });
        });
      }
      memoryWords.sort((a, b) => a.address - b.address);
      return {
        halted: snapshot?.halted === true,
        assembled: snapshot?.assembled === true,
        pc: Number(snapshot?.pc ?? 0) >>> 0,
        registers: (Array.isArray(snapshot?.registers) ? snapshot.registers : []).map((entry) => ({
          name: String(entry?.name ?? ""),
          value: Number(entry?.value ?? 0) | 0,
          valueHex: String(entry?.valueHex ?? "")
        })),
        cop0: toValueList(snapshot?.cop0),
        cop1: toValueList(snapshot?.cop1),
        fpuFlags: toValueList(snapshot?.fpuFlags),
        memoryWords,
        lastMemoryWriteAddress: includeTransientState && snapshot?.lastMemoryWriteAddress != null
          ? (Number(snapshot.lastMemoryWriteAddress) >>> 0)
          : null
      };
    };

    const compactTraceSnapshot = (engine) => compactSnapshot(engine, { includeTransientState: false });

    const compactStepResult = (result) => ({
      ok: result?.ok === true,
      done: result?.done === true,
      halted: result?.halted === true,
      waitingForInput: result?.waitingForInput === true,
      stoppedOnBreakpoint: result?.stoppedOnBreakpoint === true,
      runIo: result?.runIo === true,
      message: String(result?.message ?? ""),
      messageNormalized: String(result?.message ?? "").replace(/\\r\\n/g, "\\n").replace(/\\s+/g, " ").trim().toLowerCase().replace(/\\\\/g, "/")
    });

    const runSimulation = async (simulatorMode, testCase) => {
      const settings = {
        ...DEFAULT_SETTINGS,
        ...testCase.settings,
        assemblerBackendMode: suite.assemblerMode,
        simulatorBackendMode: simulatorMode,
        coreBackend: (suite.assemblerMode === "hybrid" || simulatorMode === "hybrid") ? "wasm" : "js"
      };
      const outputs = [];
      const inputSequence = Array.isArray(testCase.inputSequence) ? [...testCase.inputSequence] : [];
      const engine = createMarsEngine({
        settings,
        memoryMap: { ...DEFAULT_MEMORY_MAP }
      });
      engine.setRuntimeHooks({
        writeOutput(payload) {
          outputs.push(String(payload?.text ?? payload ?? ""));
          return true;
        },
        readInput() {
          const next = inputSequence.length ? String(inputSequence.shift()) : "";
          return { value: next };
        }
      });
      if (typeof engine.whenReady === "function") {
        await engine.whenReady();
      }
      const assembled = engine.assemble(testCase.source, {
        sourceName: testCase.id + ".s"
      });
      const trace = [];
      const backtrace = [];
      if (assembled?.ok === true) {
        for (let index = 0; index < Number(testCase.maxSteps || 1); index += 1) {
          const result = engine.step({ includeSnapshot: false });
          const after = compactTraceSnapshot(engine);
          trace.push({ index, result: compactStepResult(result), after });
          if (!result?.ok || result?.done || result?.waitingForInput || result?.stoppedOnBreakpoint) break;
        }
        for (let index = 0; index < Number(testCase.backsteps || 0); index += 1) {
          const result = engine.backstep();
          const after = compactTraceSnapshot(engine);
          backtrace.push({ index, result: compactStepResult(result), after });
          if (!result?.ok) break;
        }
      }
      return {
        simulatorMode,
        assemblerMode: suite.assemblerMode,
        backendInfo: typeof engine.getBackendInfo === "function" ? engine.getBackendInfo() : null,
        assembledOk: assembled?.ok === true,
        warnings: (Array.isArray(assembled?.warnings) ? assembled.warnings : []).map(normalizeMessage),
        errors: (Array.isArray(assembled?.errors) ? assembled.errors : []).map(normalizeMessage),
        outputs: outputs.map((text) => String(text)),
        trace,
        backtrace,
        final: compactSnapshot(engine)
      };
    };

    const report = {
      generatedAt: new Date().toISOString(),
      setup: {
        assemblerMode: suite.assemblerMode,
        baselineMode: suite.baselineMode,
        candidateMode: suite.candidateMode,
        wasmStatus: window.WebMarsWasmCore?.status || null
      },
      cases: []
    };

    for (const testCase of suite.cases) {
      try {
        const baseline = await runSimulation(suite.baselineMode, testCase);
        const candidate = await runSimulation(suite.candidateMode, testCase);
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

function compareMemoryWords(label, left, right, mismatches) {
  const leftMap = mapBy(left, (entry) => Number(entry.address) >>> 0);
  const rightMap = mapBy(right, (entry) => Number(entry.address) >>> 0);
  const addresses = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const address of addresses) {
    const lhs = leftMap.get(address);
    const rhs = rightMap.get(address);
    if (!lhs || !rhs) {
      mismatches.push({ area: label, detail: `Missing word @ ${formatHex(address)} in ${!lhs ? "baseline" : "candidate"}` });
      continue;
    }
    if ((lhs.value | 0) !== (rhs.value | 0)) {
      mismatches.push({ area: label, detail: `Word mismatch @ ${formatHex(address)} (${lhs.valueHex} vs ${rhs.valueHex})` });
    }
  }
}

function compareRegisters(label, left, right, mismatches) {
  const leftMap = mapBy(left, (entry) => String(entry.name));
  const rightMap = mapBy(right, (entry) => String(entry.name));
  const names = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const name of names) {
    const lhs = leftMap.get(name);
    const rhs = rightMap.get(name);
    if (!lhs || !rhs) {
      mismatches.push({ area: label, detail: `Missing register ${name} in ${!lhs ? "baseline" : "candidate"}` });
      continue;
    }
    if ((lhs.value | 0) !== (rhs.value | 0)) {
      mismatches.push({ area: label, detail: `Register ${name} mismatch (${lhs.valueHex} vs ${rhs.valueHex})` });
    }
  }
}

function compareSnapshot(label, left, right, mismatches) {
  comparePrimitive(`${label}.halted`, Boolean(left?.halted), Boolean(right?.halted), mismatches);
  comparePrimitive(`${label}.assembled`, Boolean(left?.assembled), Boolean(right?.assembled), mismatches);
  comparePrimitive(`${label}.pc`, Number(left?.pc ?? 0) >>> 0, Number(right?.pc ?? 0) >>> 0, mismatches);
  comparePrimitive(`${label}.lastMemoryWriteAddress`, left?.lastMemoryWriteAddress ?? null, right?.lastMemoryWriteAddress ?? null, mismatches);
  compareRegisters(`${label}.registers`, left?.registers || [], right?.registers || [], mismatches);
  comparePrimitive(`${label}.cop0`, left?.cop0 || [], right?.cop0 || [], mismatches);
  comparePrimitive(`${label}.cop1`, left?.cop1 || [], right?.cop1 || [], mismatches);
  comparePrimitive(`${label}.fpuFlags`, left?.fpuFlags || [], right?.fpuFlags || [], mismatches);
  compareMemoryWords(`${label}.memoryWords`, left?.memoryWords || [], right?.memoryWords || [], mismatches);
}

function compareTrace(left, right, mismatches) {
  comparePrimitive("trace.length", (left || []).length, (right || []).length, mismatches);
  const max = Math.min((left || []).length, (right || []).length);
  for (let i = 0; i < max; i += 1) {
    const lhs = left[i];
    const rhs = right[i];
    comparePrimitive(`trace[${i}].result`, lhs?.result || null, rhs?.result || null, mismatches);
    compareSnapshot(`trace[${i}].after`, lhs?.after || {}, rhs?.after || {}, mismatches);
  }
}

function compareBacktrace(left, right, mismatches) {
  comparePrimitive("backtrace.length", (left || []).length, (right || []).length, mismatches);
  const max = Math.min((left || []).length, (right || []).length);
  for (let i = 0; i < max; i += 1) {
    const lhs = left[i];
    const rhs = right[i];
    comparePrimitive(`backtrace[${i}].result`, lhs?.result || null, rhs?.result || null, mismatches);
    compareSnapshot(`backtrace[${i}].after`, lhs?.after || {}, rhs?.after || {}, mismatches);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(resultDir, { recursive: true });
  const payload = {
    assemblerMode: options.assemblerMode,
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
      throw new Error("Simulator parity suite did not return a valid report.");
    }

    const report = {
      generatedAt: rawReport.generatedAt,
      host: {
        edgePath: EDGE_PATH,
        targetUrl: options.targetUrl,
        appPort: options.appPort,
        debugPort: options.debugPort,
        assemblerMode: options.assemblerMode,
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
          mismatchCount: 1,
          mismatches: [{ area: "setup", detail: entry.setupError }],
          setupError: entry.setupError
        });
        continue;
      }

      const mismatches = [];
      comparePrimitive("assembledOk", Boolean(entry.baseline?.assembledOk), Boolean(entry.candidate?.assembledOk), mismatches);
      compareMessages("warnings", entry.baseline?.warnings, entry.candidate?.warnings, mismatches);
      compareMessages("errors", entry.baseline?.errors, entry.candidate?.errors, mismatches);
      comparePrimitive("outputs.raw", entry.baseline?.outputs || [], entry.candidate?.outputs || [], mismatches);
      comparePrimitive("outputs.normalized", (entry.baseline?.outputs || []).map(normalizeText), (entry.candidate?.outputs || []).map(normalizeText), mismatches);
      compareTrace(entry.baseline?.trace || [], entry.candidate?.trace || [], mismatches);
      compareBacktrace(entry.baseline?.backtrace || [], entry.candidate?.backtrace || [], mismatches);
      compareSnapshot("final", entry.baseline?.final || {}, entry.candidate?.final || {}, mismatches);

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

    console.log(`Simulator parity: ${report.summary.passed}/${report.summary.total} passed`);
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
