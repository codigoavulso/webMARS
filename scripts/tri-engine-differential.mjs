import { existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  EDGE_PATH,
  cleanupBrowserHarness,
  comparePrimitive,
  formatHex,
  launchBrowserHarness,
  mapBy,
  normalizeBackendMode,
  normalizeDiagnosticMessage,
  normalizeText
} from "./browser-parity-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const webRoot = resolve(repoRoot, "web");
const resultDir = resolve(repoRoot, "test-results");
const resultPath = resolve(resultDir, "tri-engine-differential.json");
const javaRunnerSource = resolve(webRoot, "scripts", "java", "MarsDifferentialRunner.java");
const javaBuildDir = resolve(webRoot, "test-results", ".java-diff-build");
const JAVA_CLASSPATH_SEPARATOR = process.platform === "win32" ? ";" : ":";

function detectJavaTool(executableName) {
  const candidate = resolve(repoRoot, "jdk-27", "bin", process.platform === "win32" ? `${executableName}.exe` : executableName);
  return existsSync(candidate) ? candidate : executableName;
}

const JAVA_CMD = process.env.JAVA_CMD || detectJavaTool("java");
const JAVAC_CMD = process.env.JAVAC_CMD || detectJavaTool("javac");
const JAVA_SOURCE_ENCODING = process.env.JAVA_SOURCE_ENCODING || (process.platform === "win32" ? "windows-1252" : "UTF-8");
const DEBUG_PORT = Number(process.env.TRI_ENGINE_DEBUG_PORT || 9229);
const APP_PORT = Number(process.env.TRI_ENGINE_APP_PORT || 8086);
const TARGET_URL = process.env.TRI_ENGINE_TARGET_URL || `http://localhost:${APP_PORT}/`;
const SIM_ASSEMBLER_MODE = normalizeBackendMode(process.env.TRI_ENGINE_SIM_ASSEMBLER_MODE || "js", "js");

function parseArgs(argv) {
  const options = {
    targetUrl: TARGET_URL,
    appPort: APP_PORT,
    debugPort: DEBUG_PORT,
    simulationAssemblerMode: SIM_ASSEMBLER_MODE
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--target-url" && i + 1 < argv.length) options.targetUrl = String(argv[++i]);
    else if (arg === "--app-port" && i + 1 < argv.length) options.appPort = Number(argv[++i]);
    else if (arg === "--debug-port" && i + 1 < argv.length) options.debugPort = Number(argv[++i]);
    else if (arg === "--sim-assembler" && i + 1 < argv.length) {
      options.simulationAssemblerMode = normalizeBackendMode(argv[++i], options.simulationAssemblerMode);
    }
  }
  return options;
}

function buildAssemblyCases() {
  return [
    {
      id: "asm_basic_text_and_data",
      kind: "assembler",
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
      id: "asm_include_macro_eqv",
      kind: "assembler",
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
      id: "asm_chained_include_local_labels",
      kind: "assembler",
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
      id: "asm_pseudo_instruction_mix",
      kind: "assembler",
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
      id: "asm_invalid_opcode",
      kind: "assembler",
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
      id: "asm_invalid_operand_syntax",
      kind: "assembler",
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
      id: "asm_macro_arity_mismatch",
      kind: "assembler",
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
      id: "asm_missing_include",
      kind: "assembler",
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
      id: "asm_missing_nested_include",
      kind: "assembler",
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
      id: "asm_set_noat_pseudo_rejection",
      kind: "assembler",
      description: `".set noat" should reject pseudo-expansion that needs $at in the same way.`,
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

function buildSimulationCases() {
  return [
    {
      id: "sim_arith_output",
      kind: "simulator",
      description: "Arithmetic plus console output should behave identically.",
      maxSteps: 20,
      sourceName: "arith_output.s",
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
      id: "sim_memory_roundtrip",
      kind: "simulator",
      description: "Load/store path should match between simulators and Java.",
      maxSteps: 24,
      sourceName: "memory_roundtrip.s",
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
      id: "sim_delay_branch_off",
      kind: "simulator",
      description: "Delayed branching disabled path should match.",
      maxSteps: 16,
      sourceName: "delay_branch_off.s",
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
      id: "sim_delay_branch_on",
      kind: "simulator",
      description: "Delayed branching enabled path should match.",
      maxSteps: 16,
      sourceName: "delay_branch_on.s",
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
      id: "sim_unaligned_exception",
      kind: "simulator",
      description: "Unaligned LW should surface the same runtime error.",
      maxSteps: 12,
      sourceName: "unaligned_exception.s",
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
      id: "sim_trap_teq",
      kind: "simulator",
      description: "Trap behavior should match including COP0 state.",
      maxSteps: 12,
      sourceName: "trap_teq.s",
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
      id: "sim_syscall_read_int_echo",
      kind: "simulator",
      description: "Read-int syscall should consume the same input and produce the same output.",
      maxSteps: 16,
      sourceName: "syscall_read_int_echo.s",
      inputSequence: ["37"],
      stdinText: "37\n",
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
      id: "sim_syscall_read_char_echo",
      kind: "simulator",
      description: "Read-char syscall should consume the same byte and echo it identically.",
      maxSteps: 16,
      sourceName: "syscall_read_char_echo.s",
      inputSequence: ["Z"],
      stdinText: "Z",
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
      id: "sim_syscall_read_string_echo",
      kind: "simulator",
      description: "Read-string syscall should write the same buffer contents and echo identically.",
      maxSteps: 20,
      sourceName: "syscall_read_string_echo.s",
      inputSequence: ["mars"],
      stdinText: "mars\n",
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
      id: "sim_syscall_sbrk_heap_roundtrip",
      kind: "simulator",
      description: "sbrk plus heap word/byte accesses should match exactly.",
      maxSteps: 24,
      sourceName: "syscall_sbrk_heap_roundtrip.s",
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
      id: "sim_syscall_print_formats",
      kind: "simulator",
      description: "Hex, binary, and unsigned print syscalls should match Java MARS formatting.",
      maxSteps: 20,
      sourceName: "syscall_print_formats.s",
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
      id: "sim_syscall_file_roundtrip",
      kind: "simulator",
      description: "File syscalls open/write/read/close should behave identically.",
      maxSteps: 64,
      sourceName: "syscall_file_roundtrip.s",
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
      id: "sim_syscall_fd0_read",
      kind: "simulator",
      description: "Read syscall on fd 0 should consume the same input and populate the same bytes.",
      maxSteps: 32,
      sourceName: "syscall_fd0_read.s",
      inputSequence: ["abcde"],
      stdinText: "abcde",
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
      id: "sim_mmio_word_roundtrip",
      kind: "simulator",
      description: "Raw MMIO-segment reads and writes should match exactly.",
      maxSteps: 20,
      sourceName: "mmio_word_roundtrip.s",
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
      id: "sim_mmio_byte_halfword_roundtrip",
      kind: "simulator",
      description: "MMIO byte and halfword accesses should preserve little-endian values identically.",
      maxSteps: 20,
      sourceName: "mmio_byte_halfword_roundtrip.s",
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
      id: "sim_mmio_mixed_width_merge",
      kind: "simulator",
      description: "MMIO mixed-width stores should merge bytes exactly the same across engines.",
      maxSteps: 20,
      sourceName: "mmio_mixed_width_merge.s",
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
      id: "sim_backstep_parity",
      kind: "simulator",
      description: "Backstep history should stay aligned; Java compares against the equivalent forward-only state.",
      maxSteps: 8,
      backsteps: 3,
      javaCompareSteps: 5,
      sourceName: "backstep_parity.s",
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
      id: "sim_backstep_delayed_memory",
      kind: "simulator",
      description: "Backstep with delayed branching and memory writes should restore the same state.",
      maxSteps: 8,
      backsteps: 3,
      javaCompareSteps: 5,
      sourceName: "backstep_delayed_memory.s",
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
      normalized: String(entry?.message ?? "").replace(/\\r\\n/g, "\\n").replace(/\\s+/g, " ").trim().toLowerCase().replace(/\\\\/g, "/"),
      exceptionPc: Number.isFinite(Number(entry?.exceptionPc)) ? (Number(entry.exceptionPc) >>> 0) : null
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

    const sampleMemoryBytes = (engine, memoryWords, extraAddresses = []) => {
      const addresses = new Set();
      (Array.isArray(memoryWords) ? memoryWords : []).forEach((entry) => {
        const base = Number(entry?.address ?? 0) >>> 0;
        for (let i = 0; i < 4; i += 1) addresses.add((base + i) >>> 0);
      });
      (Array.isArray(extraAddresses) ? extraAddresses : []).forEach((address) => {
        if (!Number.isFinite(address)) return;
        const base = Number(address) >>> 0;
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

    const mergeWordSamples = (engine, memoryWords, extraAddresses = []) => {
      const map = new Map((Array.isArray(memoryWords) ? memoryWords : []).map((entry) => [Number(entry.address) >>> 0, entry]));
      (Array.isArray(extraAddresses) ? extraAddresses : []).forEach((address) => {
        const addr = Number(address) >>> 0;
        if (map.has(addr)) return;
        try {
          const value = Number(engine.readWord(addr)) | 0;
          map.set(addr, {
            address: addr,
            value,
            valueHex: "0x" + ((Number(value) >>> 0).toString(16).padStart(8, "0"))
          });
        } catch {
          // Ignore unreadable addresses.
        }
      });
      return Array.from(map.values()).sort((a, b) => a.address - b.address);
    };

    const compactSnapshot = (engine, options = {}) => {
      const includeTransientByteSamples = options?.includeTransientByteSamples !== false;
      const snapshot = engine.getSnapshot({
        includeTextRows: false,
        includeLabels: false,
        includeDataRows: false,
        includeRegisters: true,
        includeMemoryWords: true
      });
      const memoryWords = mergeWordSamples(
        engine,
        mapMemoryWords(snapshot),
        (Array.isArray(snapshot?.textRows) ? snapshot.textRows : []).map((row) => Number(row?.address ?? 0) >>> 0)
      );
      const extraAddresses = [];
      if (includeTransientByteSamples && snapshot?.lastMemoryWriteAddress != null) extraAddresses.push(snapshot.lastMemoryWriteAddress);
      const memoryBytes = sampleMemoryBytes(engine, memoryWords, extraAddresses);
      return {
        halted: snapshot?.halted === true,
        assembled: snapshot?.assembled === true,
        pc: Number(snapshot?.pc ?? 0) >>> 0,
        registers: (Array.isArray(snapshot?.registers) ? snapshot.registers : []).map((entry) => ({
          name: String(entry?.name ?? ""),
          value: Number(entry?.value ?? 0) | 0,
          valueHex: String(entry?.valueHex ?? "")
        })),
        cop0: Array.isArray(snapshot?.cop0) ? snapshot.cop0.map((value) => Number(value) | 0) : [],
        cop1: Array.isArray(snapshot?.cop1) ? snapshot.cop1.map((value) => Number(value) | 0) : [],
        fpuFlags: Array.isArray(snapshot?.fpuFlags) ? snapshot.fpuFlags.map((value) => Number(value) | 0) : [],
        memoryWords,
        memoryBytes,
        lastMemoryWriteAddress: snapshot?.lastMemoryWriteAddress == null ? null : (Number(snapshot.lastMemoryWriteAddress) >>> 0)
      };
    };

    const compactStepResult = (result) => ({
      ok: result?.ok === true,
      done: result?.done === true,
      halted: result?.halted === true,
      exception: result?.exception === true,
      waitingForInput: result?.waitingForInput === true,
      stoppedOnBreakpoint: result?.stoppedOnBreakpoint === true,
      runIo: result?.runIo === true,
      message: String(result?.message ?? ""),
      messageNormalized: String(result?.message ?? "").replace(/\\r\\n/g, "\\n").replace(/\\s+/g, " ").trim().toLowerCase().replace(/\\\\/g, "/")
    });

    const compactTraceSnapshot = (engine) => {
      const snapshot = compactSnapshot(engine, { includeTransientByteSamples: false });
      if (snapshot && typeof snapshot === "object") delete snapshot.lastMemoryWriteAddress;
      return snapshot;
    };

    const readCurrentPc = (engine) => {
      const snapshot = engine.getSnapshot({
        includeTextRows: false,
        includeLabels: false,
        includeDataRows: false,
        includeRegisters: false,
        includeMemoryWords: false
      });
      return Number(snapshot?.pc ?? 0) >>> 0;
    };

    const createEngine = async (assemblerMode, simulatorMode, extraSettings = null) => {
      const settings = {
        ...DEFAULT_SETTINGS,
        ...(extraSettings && typeof extraSettings === "object" ? extraSettings : {}),
        assemblerBackendMode: assemblerMode,
        simulatorBackendMode: simulatorMode,
        coreBackend: (assemblerMode === "hybrid" || simulatorMode === "hybrid") ? "wasm" : "js"
      };
      const engine = createMarsEngine({
        settings,
        memoryMap: { ...DEFAULT_MEMORY_MAP }
      });
      if (typeof engine.whenReady === "function") {
        await engine.whenReady();
      }
      return engine;
    };

    const captureAssembly = async (backendMode, testCase) => {
      const engine = await createEngine(backendMode, "js");
      const assembled = engine.assemble(testCase.source, {
        sourceName: testCase.sourceName,
        includeMap: new Map(Object.entries(testCase.files || {}).map(([name, text]) => [String(name), String(text ?? "")])),
        nativeAssemblerFallback: backendMode !== "hybrid"
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

    const runSimulation = async (simulatorMode, testCase) => {
      const outputs = [];
      const runtimeErrors = [];
      const inputSequence = Array.isArray(testCase.inputSequence) ? [...testCase.inputSequence] : [];
      const engine = await createEngine(
        suite.simulationAssemblerMode,
        simulatorMode,
        testCase.settings && typeof testCase.settings === "object" ? testCase.settings : null
      );
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
      const assembled = engine.assemble(testCase.source, {
        sourceName: testCase.sourceName,
        nativeAssemblerFallback: suite.simulationAssemblerMode !== "hybrid"
      });
      const trace = [];
      const backtrace = [];
      if (assembled?.ok === true) {
        for (let index = 0; index < Number(testCase.maxSteps || 1); index += 1) {
          const beforePc = readCurrentPc(engine);
          const result = engine.step({ includeSnapshot: false });
          if (result?.runIo) outputs.push(String(result?.message ?? ""));
          if (!result?.ok || result?.exception) {
            runtimeErrors.push(normalizeMessage({
              line: 0,
              message: String(result?.message ?? ""),
              exceptionPc: beforePc
            }));
          }
          trace.push({ index, result: compactStepResult(result), after: compactTraceSnapshot(engine) });
          if (!result?.ok || result?.done || result?.waitingForInput || result?.stoppedOnBreakpoint) break;
        }
        for (let index = 0; index < Number(testCase.backsteps || 0); index += 1) {
          const result = engine.backstep();
          backtrace.push({ index, result: compactStepResult(result), after: compactTraceSnapshot(engine) });
          if (!result?.ok) break;
        }
      }
      return {
        simulatorMode,
        assemblerMode: suite.simulationAssemblerMode,
        backendInfo: typeof engine.getBackendInfo === "function" ? engine.getBackendInfo() : null,
        assembledOk: assembled?.ok === true,
        warnings: (Array.isArray(assembled?.warnings) ? assembled.warnings : []).map(normalizeMessage),
        errors: (Array.isArray(assembled?.errors) ? assembled.errors : []).map(normalizeMessage),
        runtimeErrors,
        outputs: outputs.map((text) => String(text)),
        trace,
        backtrace,
        final: compactSnapshot(engine)
      };
    };

    const report = {
      generatedAt: new Date().toISOString(),
      setup: {
        wasmStatus: window.WebMarsWasmCore?.status || null,
        simulationAssemblerMode: suite.simulationAssemblerMode
      },
      assemblyCases: [],
      simulationCases: []
    };

    for (const testCase of suite.assemblyCases || []) {
      try {
        const js = await captureAssembly("js", testCase);
        const hybrid = await captureAssembly("hybrid", testCase);
        report.assemblyCases.push({ testCase, js, hybrid });
      } catch (error) {
        report.assemblyCases.push({
          testCase,
          setupError: error instanceof Error ? (error.stack || error.message) : String(error)
        });
      }
    }

    for (const testCase of suite.simulationCases || []) {
      try {
        const js = await runSimulation("js", testCase);
        const hybrid = await runSimulation("hybrid", testCase);
        report.simulationCases.push({ testCase, js, hybrid });
      } catch (error) {
        report.simulationCases.push({
          testCase,
          setupError: error instanceof Error ? (error.stack || error.message) : String(error)
        });
      }
    }

    return report;
  })()`;
}

function collectJavaSources(root) {
  const results = [];
  const marsDir = resolve(root, "mars");
  const marsEntry = resolve(root, "Mars.java");
  const walk = (dir) => {
    const entries = readdirSync(dir, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "web") return;
        walk(fullPath);
        return;
      }
      if (!entry.isFile() || !fullPath.endsWith(".java")) return;
      if (fullPath.startsWith(marsDir) || fullPath === marsEntry) results.push(fullPath);
    });
  };
  walk(root);
  results.push(javaRunnerSource);
  return Array.from(new Set(results));
}

function ensureJavaTools() {
  const javaVersion = spawnSync(JAVA_CMD, ["-version"], { encoding: "utf8", cwd: repoRoot });
  if (javaVersion.status !== 0) throw new Error(`Java runtime not found (${JAVA_CMD}).`);
  const javacVersion = spawnSync(JAVAC_CMD, ["-version"], { encoding: "utf8", cwd: repoRoot });
  if (javacVersion.status !== 0) throw new Error(`Java compiler not found (${JAVAC_CMD}).`);
}

function ensureJavaRunnerCompiled() {
  ensureJavaTools();
  mkdirSync(javaBuildDir, { recursive: true });
  const marker = resolve(javaBuildDir, ".compiled.marker");
  const runnerClass = resolve(javaBuildDir, "MarsDifferentialRunner.class");
  const javaSources = collectJavaSources(repoRoot);
  let needCompile = !existsSync(runnerClass) || !existsSync(marker);
  if (!needCompile) {
    const markerMtime = statSync(marker).mtimeMs;
    needCompile = javaSources.some((sourcePath) => {
      try {
        return statSync(sourcePath).mtimeMs > markerMtime;
      } catch {
        return true;
      }
    });
  }
  if (!needCompile) return;
  const argFile = resolve(javaBuildDir, "javac-files.txt");
  writeFileSync(argFile, javaSources.map((file) => `"${file.replace(/\\/g, "/")}"`).join("\n"), "utf8");
  const compile = spawnSync(JAVAC_CMD, ["-encoding", JAVA_SOURCE_ENCODING, "-d", javaBuildDir, `@${argFile}`], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });
  if (compile.status !== 0) {
    throw new Error(`Failed to compile Java differential runner.\nstdout:\n${compile.stdout}\nstderr:\n${compile.stderr}`);
  }
  writeFileSync(marker, new Date().toISOString(), "utf8");
}

function normalizeMessages(messages = []) {
  return (Array.isArray(messages) ? messages : []).map((entry) => ({
    line: Number(entry?.line ?? 0) | 0,
    message: String(entry?.message ?? ""),
    normalized: (() => {
      const normalized = normalizeDiagnosticMessage(entry?.message ?? "");
      const match = /^error reading include file (.+)$/.exec(normalized);
      if (!match) return normalized;
      const rawPath = String(match[1] || "").trim();
      const basename = rawPath.split("/").filter(Boolean).pop() || rawPath;
      return `error reading include file ${basename}`;
    })()
  }));
}

function compareMessageArrays(label, left, right, mismatches) {
  const leftNormalized = normalizeMessages(left).map((entry) => `${entry.line}|${entry.normalized}`);
  const rightNormalized = normalizeMessages(right).map((entry) => `${entry.line}|${entry.normalized}`);
  comparePrimitive(`${label}.normalized`, leftNormalized, rightNormalized, mismatches);
}

function formatRuntimeExceptionMessage(pc, detail) {
  return `runtime exception at ${formatHex(pc).toLowerCase()}: ${String(detail || "").trim().toLowerCase()}`;
}

function canonicalizeRuntimeError(entry) {
  const message = normalizeDiagnosticMessage(entry?.message ?? "");
  const exceptionPc = Number.isFinite(Number(entry?.exceptionPc)) ? (Number(entry.exceptionPc) >>> 0) : null;

  const wrapperMatch = /^error in .+ line \d+: (runtime exception at 0x[0-9a-f]+: .+)$/.exec(message);
  if (wrapperMatch) return wrapperMatch[1];

  if (/^runtime exception at 0x[0-9a-f]+: .+$/.test(message)) return message;

  const unalignedMatch = /^address not aligned on word boundary: (0x[0-9a-f]+)$/.exec(message);
  if (unalignedMatch && exceptionPc != null) {
    return formatRuntimeExceptionMessage(exceptionPc, `fetch address not aligned on word boundary ${unalignedMatch[1]}`);
  }

  if (message === "trap" && exceptionPc != null) {
    return formatRuntimeExceptionMessage(exceptionPc, "trap");
  }

  if (exceptionPc != null && message.length > 0) {
    return formatRuntimeExceptionMessage(exceptionPc, message);
  }

  return message;
}

function normalizeRuntimeMessages(messages = []) {
  const seen = new Set();
  const normalized = [];
  (Array.isArray(messages) ? messages : []).forEach((entry) => {
    const canonical = canonicalizeRuntimeError(entry);
    if (!canonical || seen.has(canonical)) return;
    seen.add(canonical);
    normalized.push(canonical);
  });
  return normalized;
}

function compareRuntimeErrorArrays(label, left, right, mismatches) {
  comparePrimitive(`${label}.normalized`, normalizeRuntimeMessages(left), normalizeRuntimeMessages(right), mismatches);
}

function toNumberValueMap(values) {
  const map = new Map();
  if (!Array.isArray(values)) return map;
  values.forEach((entry, index) => {
    if (entry && typeof entry === "object" && Number.isFinite(entry.number)) {
      map.set(Number(entry.number) | 0, Number(entry.value) | 0);
      return;
    }
    if (Number.isFinite(entry)) map.set(index | 0, Number(entry) | 0);
  });
  return map;
}

function mapMemoryBytes(entries = []) {
  const map = new Map();
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const address = Number(entry?.address ?? 0) >>> 0;
    map.set(address, {
      present: entry?.present === true || Number.isFinite(entry?.value),
      value: Number(entry?.value ?? 0) & 0xff
    });
  });
  return map;
}

function equalWordBytesAt(address, leftBytes, rightBytes) {
  for (let i = 0; i < 4; i += 1) {
    const addr = (address + i) >>> 0;
    const left = leftBytes.get(addr);
    const right = rightBytes.get(addr);
    const leftPresent = left?.present === true;
    const rightPresent = right?.present === true;
    if (leftPresent !== rightPresent) return false;
    if (leftPresent && ((left.value & 0xff) !== (right.value & 0xff))) return false;
  }
  return true;
}

function normalizeRegisterName(name) {
  const raw = String(name ?? "").trim().toLowerCase();
  return raw.startsWith("$") ? raw.slice(1) : raw;
}

function compareLabelMaps(label, left, right, mismatches) {
  const leftMap = mapBy(left, (entry) => String(entry.label || ""));
  const rightMap = mapBy(right, (entry) => String(entry.label || ""));
  const names = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const name of names) {
    const lhs = leftMap.get(name);
    const rhs = rightMap.get(name);
    if (!lhs || !rhs) {
      mismatches.push({ area: label, detail: `Missing label '${name}' in ${!lhs ? "left" : "right"}` });
      continue;
    }
    if ((Number(lhs.address) >>> 0) !== (Number(rhs.address) >>> 0)) {
      mismatches.push({ area: label, detail: `Label '${name}' address differs (${formatHex(lhs.address)} vs ${formatHex(rhs.address)})` });
    }
  }
}

function compareMemoryWords(label, left, right, mismatches, leftByteEntries = left, rightByteEntries = right) {
  const leftMap = mapBy(left, (entry) => Number(entry.address) >>> 0);
  const rightMap = mapBy(right, (entry) => Number(entry.address) >>> 0);
  const leftBytes = mapMemoryBytes(leftByteEntries);
  const rightBytes = mapMemoryBytes(rightByteEntries);
  const addresses = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const address of addresses) {
    const lhs = leftMap.get(address);
    const rhs = rightMap.get(address);
    if (!lhs || !rhs) {
      mismatches.push({ area: label, detail: `Missing memory word @ ${formatHex(address)} in ${!lhs ? "left" : "right"}` });
      continue;
    }
    const lhsPresent = lhs.present !== false && lhs.value !== null && lhs.value !== undefined;
    const rhsPresent = rhs.present !== false && rhs.value !== null && rhs.value !== undefined;
    if (lhsPresent !== rhsPresent) {
      mismatches.push({ area: label, detail: `Memory presence mismatch @ ${formatHex(address)} (${lhsPresent} vs ${rhsPresent})` });
      continue;
    }
    if (lhsPresent && ((Number(lhs.value) | 0) !== (Number(rhs.value) | 0))) {
      if (equalWordBytesAt(address, leftBytes, rightBytes)) continue;
      mismatches.push({ area: label, detail: `Memory word mismatch @ ${formatHex(address)} (${lhs.valueHex || formatHex(lhs.value)} vs ${rhs.valueHex || formatHex(rhs.value)})` });
    }
  }
}

function compareRegisterSets(label, left, right, mismatches) {
  const leftMap = new Map((Array.isArray(left) ? left : []).map((entry) => [normalizeRegisterName(entry.name), entry]));
  const rightMap = new Map((Array.isArray(right) ? right : []).map((entry) => [normalizeRegisterName(entry.name), entry]));
  const names = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const name of names) {
    const lhs = leftMap.get(name);
    const rhs = rightMap.get(name);
    if (!lhs || !rhs) continue;
    if ((Number(lhs.value) | 0) !== (Number(rhs.value) | 0)) {
      mismatches.push({ area: label, detail: `Register ${name} mismatch (${lhs.valueHex || formatHex(lhs.value)} vs ${rhs.valueHex || formatHex(rhs.value)})` });
    }
  }
}

function compareNumberedRegisterMaps(label, leftValues, rightValues, mismatches) {
  const leftMap = toNumberValueMap(leftValues);
  const rightMap = toNumberValueMap(rightValues);
  const keys = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const key of keys) {
    if (!leftMap.has(key) || !rightMap.has(key)) continue;
    const leftValue = leftMap.get(key);
    const rightValue = rightMap.get(key);
    if ((leftValue | 0) !== (rightValue | 0)) {
      mismatches.push({
        area: label,
        detail: `Register[${key}] mismatch (${formatHex(leftValue)} vs ${formatHex(rightValue)})`
      });
    }
  }
}

function compareAssemblyBinaryAgainstJava(webResult, javaResult, mismatches) {
  const webRows = mapBy(webResult.textRows || [], (entry) => Number(entry.address) >>> 0);
  const javaRows = mapBy(javaResult.machineCode || [], (entry) => Number(entry.address) >>> 0);
  const addresses = new Set([...webRows.keys(), ...javaRows.keys()]);
  for (const address of addresses) {
    const webRow = webRows.get(address);
    const javaRow = javaRows.get(address);
    if (!webRow || !javaRow) {
      mismatches.push({ area: "binary.rows", detail: `Missing text row @ ${formatHex(address)} in ${!webRow ? "web" : "java"}` });
      continue;
    }
    comparePrimitive(`binary.row.${formatHex(address)}.line`, Number(webRow.line ?? 0) | 0, Number(javaRow.line ?? 0) | 0, mismatches);
    comparePrimitive(
      `binary.row.${formatHex(address)}.machineCodeHex`,
      String(webRow.machineCodeHex || "").trim().toLowerCase(),
      String(javaRow.machineCodeHex || "").trim().toLowerCase(),
      mismatches
    );
  }
}

function compareDataBytes(label, left, right, mismatches) {
  const leftMap = mapBy(left || [], (entry) => Number(entry.address) >>> 0);
  const rightMap = mapBy(right || [], (entry) => Number(entry.address) >>> 0);
  const addresses = new Set([...leftMap.keys(), ...rightMap.keys()]);
  for (const address of addresses) {
    const lhs = leftMap.get(address);
    const rhs = rightMap.get(address);
    if (!lhs || !rhs) {
      mismatches.push({ area: label, detail: `Missing data byte @ ${formatHex(address)} in ${!lhs ? "left" : "right"}` });
      continue;
    }
    comparePrimitive(
      `${label}.${formatHex(address)}.valueHex`,
      String(lhs.valueHex || "").trim().toLowerCase(),
      String(rhs.valueHex || "").trim().toLowerCase(),
      mismatches
    );
  }
}

function toJavaDataBytes(javaResult, templateBytes = []) {
  const byteMap = mapBy(javaResult?.finalState?.memoryBytes || [], (entry) => Number(entry.address) >>> 0);
  return (templateBytes || []).map((row) => {
    const address = Number(row?.address ?? 0) >>> 0;
    const entry = byteMap.get(address);
    const value = Number(entry?.value ?? 0) | 0;
    return {
      address,
      value,
      valueHex: String(entry?.valueHex || formatHex(value)).trim().toLowerCase()
    };
  });
}

function filterNonTextMemory(words, textRows = []) {
  const textAddresses = new Set((Array.isArray(textRows) ? textRows : []).map((entry) => Number(entry?.address ?? 0) >>> 0));
  return (Array.isArray(words) ? words : []).filter((entry) => !textAddresses.has(Number(entry?.address ?? 0) >>> 0));
}

function filterNonTextBytes(bytes, textRows = []) {
  const textAddresses = new Set();
  (Array.isArray(textRows) ? textRows : []).forEach((entry) => {
    const base = Number(entry?.address ?? 0) >>> 0;
    for (let i = 0; i < 4; i += 1) textAddresses.add((base + i) >>> 0);
  });
  return (Array.isArray(bytes) ? bytes : []).filter((entry) => !textAddresses.has(Number(entry?.address ?? 0) >>> 0));
}

function isMmioAddress(address) {
  return (Number(address) >>> 0) >= 0xffff0000;
}

function filterComparableMemoryEntries(entries = []) {
  return (Array.isArray(entries) ? entries : []).filter((entry) => !isMmioAddress(entry?.address));
}

function compareJavaFinalToWebFinal(webFinal, javaFinal, javaStopped, mismatches) {
  comparePrimitive("final.pc", Number(webFinal?.pc ?? 0) >>> 0, Number(javaFinal?.pc ?? 0) >>> 0, mismatches);
  comparePrimitive("final.runDoneVsHalted", Boolean(javaStopped), Boolean(webFinal?.halted), mismatches);
  compareRegisterSets("final.registers", webFinal?.registers || [], javaFinal?.registers || [], mismatches);
  compareNumberedRegisterMaps("final.cop0", webFinal?.cop0 || [], javaFinal?.cop0 || [], mismatches);
  compareNumberedRegisterMaps("final.cop1", webFinal?.cop1 || [], javaFinal?.cop1 || [], mismatches);
  comparePrimitive("final.fpuFlags", webFinal?.fpuFlags || [], javaFinal?.fpuFlags || [], mismatches);
  compareMemoryWords(
    "final.memoryWords",
    filterComparableMemoryEntries(webFinal?.memoryWords || []),
    filterComparableMemoryEntries(javaFinal?.memoryWords || []),
    mismatches,
    filterComparableMemoryEntries(webFinal?.memoryBytes || []),
    filterComparableMemoryEntries(javaFinal?.memoryBytes || [])
  );
}

function compareAssemblyWebPair(left, right, mismatches) {
  const leftOk = Boolean(left?.assembledOk);
  const rightOk = Boolean(right?.assembledOk);
  comparePrimitive("assembledOk", leftOk, rightOk, mismatches);
  compareMessageArrays("warnings", left?.warnings, right?.warnings, mismatches);
  compareMessageArrays("errors", left?.errors, right?.errors, mismatches);
  if (String(right?.backendMode || "").toLowerCase() === "hybrid" && rightOk && right?.native !== true) {
    mismatches.push({
      area: "assembler.native",
      detail: right?.fallback === true
        ? "Hybrid assembler fell back to JS."
        : "Hybrid assembler did not report native assembly."
    });
  }
  if (!leftOk || !rightOk) return;
  compareLabelMaps("labels", left?.labels || [], right?.labels || [], mismatches);
  const leftRows = mapBy(left?.textRows || [], (entry) => Number(entry.address) >>> 0);
  const rightRows = mapBy(right?.textRows || [], (entry) => Number(entry.address) >>> 0);
  const addresses = new Set([...leftRows.keys(), ...rightRows.keys()]);
  for (const address of addresses) {
    const lhs = leftRows.get(address);
    const rhs = rightRows.get(address);
    if (!lhs || !rhs) {
      mismatches.push({ area: "textRows", detail: `Missing text row @ ${formatHex(address)} in ${!lhs ? "left" : "right"}` });
      continue;
    }
    comparePrimitive(`textRows.row.${formatHex(address)}.line`, Number(lhs.line ?? 0) | 0, Number(rhs.line ?? 0) | 0, mismatches);
    comparePrimitive(
      `textRows.row.${formatHex(address)}.machineCodeHex`,
      String(lhs.machineCodeHex || "").trim().toLowerCase(),
      String(rhs.machineCodeHex || "").trim().toLowerCase(),
      mismatches
    );
  }
  compareDataBytes("dataBytes", left?.dataBytes || [], right?.dataBytes || [], mismatches);
}

function compareSimulationWebPair(left, right, mismatches) {
  comparePrimitive("assembledOk", Boolean(left?.assembledOk), Boolean(right?.assembledOk), mismatches);
  compareMessageArrays("warnings", left?.warnings, right?.warnings, mismatches);
  compareMessageArrays("errors", left?.errors, right?.errors, mismatches);
  compareRuntimeErrorArrays("runtimeErrors", left?.runtimeErrors, right?.runtimeErrors, mismatches);
  comparePrimitive("outputs.raw", left?.outputs || [], right?.outputs || [], mismatches);
  comparePrimitive("outputs.normalized", (left?.outputs || []).map(normalizeText), (right?.outputs || []).map(normalizeText), mismatches);
  comparePrimitive("trace", left?.trace || [], right?.trace || [], mismatches);
  comparePrimitive("backtrace", left?.backtrace || [], right?.backtrace || [], mismatches);
  compareJavaFinalToWebFinal(left?.final || {}, { ...right?.final, registers: right?.final?.registers, cop0: right?.final?.cop0, cop1: right?.final?.cop1, fpuFlags: right?.final?.fpuFlags, memoryWords: right?.final?.memoryWords }, right?.final?.halted, mismatches);
}

function compareAssemblyJavaPair(webResult, javaResult, mismatches) {
  const webOk = Boolean(webResult?.assembledOk);
  const javaOk = Boolean(javaResult?.assembledOk);
  comparePrimitive("assembledOk", webOk, javaOk, mismatches);
  compareMessageArrays("warnings", webResult?.warnings, javaResult?.warnings, mismatches);
  compareMessageArrays("errors", webResult?.errors, javaResult?.errors, mismatches);
  if (!webOk || !javaOk) return;
  compareLabelMaps("labels", webResult?.labels || [], javaResult?.labels || [], mismatches);
  compareAssemblyBinaryAgainstJava(webResult, javaResult, mismatches);
  compareDataBytes("dataBytes", webResult?.dataBytes || [], toJavaDataBytes(javaResult, webResult?.dataBytes || []), mismatches);
}

function compareSimulationJavaPair(webResult, javaResult, mismatches) {
  comparePrimitive("assembledOk", Boolean(webResult?.assembledOk), Boolean(javaResult?.assembledOk), mismatches);
  compareMessageArrays("warnings", webResult?.warnings, javaResult?.warnings, mismatches);
  compareMessageArrays("errors", webResult?.errors, javaResult?.errors, mismatches);
  const javaRuntime = [
    ...(Array.isArray(javaResult?.runtimeErrors) ? javaResult.runtimeErrors : []),
    ...(javaResult?.runtimeExceptionMessage ? [{ line: 0, message: String(javaResult.runtimeExceptionMessage) }] : [])
  ];
  const javaStopped = javaResult?.runDone === true || javaRuntime.length > 0;
  compareRuntimeErrorArrays("runtimeErrors", webResult?.runtimeErrors, javaRuntime, mismatches);
  comparePrimitive("outputs.raw", String((webResult?.outputs || []).join("")), String(javaResult?.consoleOutput || ""), mismatches);
  comparePrimitive("outputs.normalized", normalizeText((webResult?.outputs || []).join("")), normalizeText(javaResult?.consoleOutput || ""), mismatches);
  compareJavaFinalToWebFinal(webResult?.final || {}, javaResult?.finalState || {}, javaStopped, mismatches);
}

function writeCaseFiles(baseDir, testCase) {
  const sourcePath = resolve(baseDir, testCase.sourceName || `${testCase.id}.s`);
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(sourcePath, String(testCase.source ?? ""), "utf8");
  const files = testCase.files && typeof testCase.files === "object" ? testCase.files : {};
  Object.entries(files).forEach(([name, text]) => {
    const fullPath = resolve(baseDir, name);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, String(text ?? ""), "utf8");
  });
  return sourcePath;
}

function collectSampledAddresses(...resultSets) {
  const addresses = new Set();
  resultSets.forEach((result) => {
    if (!result || typeof result !== "object") return;
    const addEntries = (entries) => {
      (Array.isArray(entries) ? entries : []).forEach((entry) => {
        if (entry?.address == null) return;
        addresses.add(Number(entry.address) >>> 0);
      });
    };
    addEntries(result.dataRows);
    addEntries(result.dataBytes);
    addEntries(result.final?.memoryWords);
    addEntries(result.textRows);
    (Array.isArray(result.trace) ? result.trace : []).forEach((step) => addEntries(step?.after?.memoryWords));
    (Array.isArray(result.backtrace) ? result.backtrace : []).forEach((step) => addEntries(step?.after?.memoryWords));
    if (Number.isFinite(result.final?.lastMemoryWriteAddress)) addresses.add(Number(result.final.lastMemoryWriteAddress) >>> 0);
  });
  return Array.from(addresses).sort((a, b) => a - b);
}

function runJavaCase(sourcePath, testCase, sampledAddresses) {
  const classpath = `${javaBuildDir}${JAVA_CLASSPATH_SEPARATOR}${repoRoot}`;
  const args = [
    "-cp",
    classpath,
    "MarsDifferentialRunner",
    "--source",
    sourcePath,
    "--memory-configuration",
    String(testCase.memoryConfiguration || "Default"),
    "--extended-assembler",
    String(testCase.settings?.extendedAssembler !== false),
    "--warnings-are-errors",
    String(testCase.settings?.warningsAreErrors === true),
    "--delayed-branching",
    String(testCase.settings?.delayedBranching === true),
    "--start-at-main",
    String(testCase.settings?.startAtMain === true),
    "--self-modifying-code",
    String(testCase.settings?.selfModifyingCode === true),
    "--program-arguments-enabled",
    String(testCase.settings?.programArguments === true),
    "--program-arguments",
    String(testCase.settings?.programArgumentsLine || ""),
    "--max-steps",
    String(Number(testCase.javaCompareSteps ?? testCase.maxSteps ?? 100000) | 0),
    "--memory-addresses",
    sampledAddresses.map((address) => formatHex(address)).join(",")
  ];
  if (testCase.stdinText != null && String(testCase.stdinText).length > 0) {
    args.push("--stdin-text", String(testCase.stdinText));
  }
  const run = spawnSync(JAVA_CMD, args, {
    cwd: dirname(sourcePath),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });
  if (run.status !== 0) {
    throw new Error(`Java runner failed for case "${testCase.id}".\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
  }
  return JSON.parse(run.stdout || "{}");
}

function summarizePair(cases, key) {
  const total = cases.length;
  const passed = cases.filter((entry) => entry?.[key]?.pass === true).length;
  return { total, passed, failed: total - passed };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  mkdirSync(resultDir, { recursive: true });
  ensureJavaRunnerCompiled();

  const payload = {
    simulationAssemblerMode: options.simulationAssemblerMode,
    assemblyCases: buildAssemblyCases(),
    simulationCases: buildSimulationCases()
  };

  let harness = null;
  const sourceTmpDir = mkdtempSync(join(tmpdir(), "webmars-tri-engine-"));

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
    if (!rawReport || typeof rawReport !== "object") throw new Error("Tri-engine differential suite did not return a valid report.");

    const report = {
      generatedAt: rawReport.generatedAt || new Date().toISOString(),
      host: {
        edgePath: EDGE_PATH,
        javaCmd: JAVA_CMD,
        javacCmd: JAVAC_CMD,
        targetUrl: options.targetUrl,
        appPort: options.appPort,
        debugPort: options.debugPort,
        simulationAssemblerMode: options.simulationAssemblerMode
      },
      setup: rawReport.setup || {},
      limitations: [
        "Java is the source of truth for assembly diagnostics, emitted machine code, runtime output, and final machine state.",
        "Backstep parity is compared directly between JS and experimental JS + C++; Java is compared against the equivalent forward-only state via javaCompareSteps."
      ],
      assemblyCases: [],
      simulationCases: []
    };

    for (const entry of rawReport.assemblyCases || []) {
      if (entry.setupError) {
        report.assemblyCases.push({
          id: entry.testCase?.id || "unknown",
          description: entry.testCase?.description || "",
          pass: false,
          setupError: entry.setupError,
          javaVsJs: { pass: false, mismatchCount: 1, mismatches: [{ area: "setup", detail: entry.setupError }] },
          javaVsHybrid: { pass: false, mismatchCount: 1, mismatches: [{ area: "setup", detail: entry.setupError }] },
          jsVsHybrid: { pass: false, mismatchCount: 1, mismatches: [{ area: "setup", detail: entry.setupError }] }
        });
        continue;
      }

      const sourcePath = writeCaseFiles(sourceTmpDir, entry.testCase);
      const sampledAddresses = collectSampledAddresses(entry.js, entry.hybrid);
      const javaResult = runJavaCase(sourcePath, entry.testCase, sampledAddresses);
      const javaVsJsMismatches = [];
      const javaVsHybridMismatches = [];
      const jsVsHybridMismatches = [];
      compareAssemblyJavaPair(entry.js, javaResult, javaVsJsMismatches);
      compareAssemblyJavaPair(entry.hybrid, javaResult, javaVsHybridMismatches);
      compareAssemblyWebPair(entry.js, entry.hybrid, jsVsHybridMismatches);

      report.assemblyCases.push({
        id: entry.testCase.id,
        description: entry.testCase.description,
        jsBackend: entry.js?.backendInfo || null,
        hybridBackend: entry.hybrid?.backendInfo || null,
        jsAssembly: {
          native: entry.js?.native === true,
          fallback: entry.js?.fallback === true
        },
        hybridAssembly: {
          native: entry.hybrid?.native === true,
          fallback: entry.hybrid?.fallback === true
        },
        javaVsJs: { pass: javaVsJsMismatches.length === 0, mismatchCount: javaVsJsMismatches.length, mismatches: javaVsJsMismatches },
        javaVsHybrid: { pass: javaVsHybridMismatches.length === 0, mismatchCount: javaVsHybridMismatches.length, mismatches: javaVsHybridMismatches },
        jsVsHybrid: { pass: jsVsHybridMismatches.length === 0, mismatchCount: jsVsHybridMismatches.length, mismatches: jsVsHybridMismatches }
      });
    }

    for (const entry of rawReport.simulationCases || []) {
      if (entry.setupError) {
        report.simulationCases.push({
          id: entry.testCase?.id || "unknown",
          description: entry.testCase?.description || "",
          pass: false,
          setupError: entry.setupError,
          javaVsJs: { pass: false, mismatchCount: 1, mismatches: [{ area: "setup", detail: entry.setupError }] },
          javaVsHybrid: { pass: false, mismatchCount: 1, mismatches: [{ area: "setup", detail: entry.setupError }] },
          jsVsHybrid: { pass: false, mismatchCount: 1, mismatches: [{ area: "setup", detail: entry.setupError }] }
        });
        continue;
      }

      const sourcePath = writeCaseFiles(sourceTmpDir, entry.testCase);
      const sampledAddresses = collectSampledAddresses(entry.js, entry.hybrid);
      const javaResult = runJavaCase(sourcePath, entry.testCase, sampledAddresses);
      const javaVsJsMismatches = [];
      const javaVsHybridMismatches = [];
      const jsVsHybridMismatches = [];
      compareSimulationJavaPair(entry.js, javaResult, javaVsJsMismatches);
      compareSimulationJavaPair(entry.hybrid, javaResult, javaVsHybridMismatches);
      compareSimulationWebPair(entry.js, entry.hybrid, jsVsHybridMismatches);

      report.simulationCases.push({
        id: entry.testCase.id,
        description: entry.testCase.description,
        jsBackend: entry.js?.backendInfo || null,
        hybridBackend: entry.hybrid?.backendInfo || null,
        javaVsJs: { pass: javaVsJsMismatches.length === 0, mismatchCount: javaVsJsMismatches.length, mismatches: javaVsJsMismatches },
        javaVsHybrid: { pass: javaVsHybridMismatches.length === 0, mismatchCount: javaVsHybridMismatches.length, mismatches: javaVsHybridMismatches },
        jsVsHybrid: { pass: jsVsHybridMismatches.length === 0, mismatchCount: jsVsHybridMismatches.length, mismatches: jsVsHybridMismatches }
      });
    }

    const allCases = [...report.assemblyCases, ...report.simulationCases];
    report.summary = {
      totalCases: allCases.length,
      assemblerCases: report.assemblyCases.length,
      simulatorCases: report.simulationCases.length,
      javaVsJs: summarizePair(allCases, "javaVsJs"),
      javaVsHybrid: summarizePair(allCases, "javaVsHybrid"),
      jsVsHybrid: summarizePair(allCases, "jsVsHybrid")
    };

    writeFileSync(resultPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(`Tri-engine differential: ${report.summary.totalCases} cases`);
    console.log(`  Java vs JS: ${report.summary.javaVsJs.passed}/${report.summary.javaVsJs.total} passed`);
    console.log(`  Java vs Hybrid: ${report.summary.javaVsHybrid.passed}/${report.summary.javaVsHybrid.total} passed`);
    console.log(`  JS vs Hybrid: ${report.summary.jsVsHybrid.passed}/${report.summary.jsVsHybrid.total} passed`);

    if (report.summary.javaVsJs.failed > 0 || report.summary.javaVsHybrid.failed > 0 || report.summary.jsVsHybrid.failed > 0) {
      const failing = allCases.filter((entry) => !(entry.javaVsJs?.pass && entry.javaVsHybrid?.pass && entry.jsVsHybrid?.pass));
      failing.slice(0, 10).forEach((entry) => {
        console.log(`FAIL ${entry.id}`);
        [["javaVsJs", entry.javaVsJs], ["javaVsHybrid", entry.javaVsHybrid], ["jsVsHybrid", entry.jsVsHybrid]].forEach(([name, result]) => {
          if (result?.pass) return;
          console.log(`  ${name}: ${result?.mismatchCount || 0} mismatches`);
          (result?.mismatches || []).slice(0, 4).forEach((mismatch) => {
            console.log(`    - ${mismatch.area}: ${typeof mismatch.detail === "string" ? mismatch.detail : JSON.stringify(mismatch.detail)}`);
          });
        });
      });
      process.exitCode = 1;
    }
  } finally {
    cleanupBrowserHarness(harness);
    try { rmSync(sourceTmpDir, { recursive: true, force: true }); } catch {}
  }
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
