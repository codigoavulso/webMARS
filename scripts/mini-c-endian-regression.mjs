import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

import { loadMiniCCompiler, writeJsonReport } from "./mini-c-suite-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const corePath = join(repoRoot, "web", "assets", "js", "app-modules", "00-core.js");
const instructionsReferencePath = join(repoRoot, "web", "assets", "js", "reference", "instructions.generated.js");
const pseudoOpsReferencePath = join(repoRoot, "web", "assets", "js", "reference", "pseudo-ops.generated.js");
const syscallsReferencePath = join(repoRoot, "web", "assets", "js", "reference", "syscalls.generated.js");
const libsManifestPath = join(repoRoot, "web", "libs", "manifest.json");

function loadMiniCRuntime() {
  const source = [
    readFileSync(pseudoOpsReferencePath, "utf8"),
    readFileSync(instructionsReferencePath, "utf8"),
    readFileSync(syscallsReferencePath, "utf8"),
    readFileSync(corePath, "utf8"),
    ";globalThis.__coreExports = { MarsEngine, DEFAULT_SETTINGS, DEFAULT_MEMORY_MAP };"
  ].join("\n");
  const sandbox = {
    globalThis: {},
    console,
    window: undefined,
    document: undefined,
    navigator: { userAgent: "node" },
    performance: { now: () => Date.now() },
    crypto: {
      getRandomValues(array) {
        for (let i = 0; i < array.length; i += 1) array[i] = (Math.random() * 256) | 0;
        return array;
      }
    },
    TextEncoder,
    TextDecoder,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Map,
    WeakMap,
    Set,
    Uint8Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    ArrayBuffer,
    DataView,
    Math,
    Date,
    JSON,
    Number,
    String,
    Boolean,
    Object,
    RegExp,
    URL,
    URLSearchParams,
    atob: (value) => Buffer.from(value, "base64").toString("binary"),
    btoa: (value) => Buffer.from(value, "binary").toString("base64")
  };
  sandbox.global = sandbox.globalThis;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "00-core.js" });
  return sandbox.globalThis.__coreExports;
}

function loadGlobalLibrarySources() {
  const manifest = JSON.parse(readFileSync(libsManifestPath, "utf8"));
  const libraries = Array.isArray(manifest?.libraries) ? manifest.libraries : [];
  return Object.fromEntries(
    libraries.map((entry) => [entry.name, readFileSync(join(repoRoot, "web", "libs", entry.path), "utf8")])
  );
}

function createInputHook(inputs = []) {
  const queue = Array.isArray(inputs) ? [...inputs] : [];
  return () => (queue.length ? { value: queue.shift() } : null);
}

function normalizeErrorMessage(error) {
  if (error instanceof Error) return error.stack || error.message;
  return String(error);
}

function joinOutputs(outputs = []) {
  return outputs.map((entry) => String(entry ?? "")).join("");
}

function runSuite() {
  const startedAt = Date.now();
  const { compiler, compilerPath } = loadMiniCCompiler();
  const { MarsEngine, DEFAULT_SETTINGS, DEFAULT_MEMORY_MAP } = loadMiniCRuntime();
  const useLibrarySources = loadGlobalLibrarySources();

  const compileProgram = (source, sourceName) => {
    const result = compiler.compile(source, {
      sourceName,
      subset: "C0-S4-",
      useLibrarySources
    });
    if (result.ok !== true || (result.errors || []).length) {
      throw new Error(`compile failed: ${JSON.stringify(result.errors?.[0] || result)}`);
    }
    return result.asm;
  };

  const runProgram = ({ source, sourceName, inputs = [], setupEngine = null }) => {
    const asm = compileProgram(source, sourceName);
    const engine = new MarsEngine({
      settings: { ...DEFAULT_SETTINGS, delayedBranching: false, pseudoInstructions: true },
      memoryMap: { ...DEFAULT_MEMORY_MAP }
    });
    engine.setRuntimeHooks({ readInput: createInputHook(inputs) });
    const assembled = engine.assemble(asm, { sourceName: `${sourceName}.s` });
    if ((assembled?.errors || []).length) {
      throw new Error(`assemble failed: ${JSON.stringify(assembled.errors[0])}`);
    }
    if (typeof setupEngine === "function") setupEngine(engine, assembled);
    const outputs = [];
    for (let steps = 0; steps < 250000; steps += 1) {
      const result = engine.step({ includeSnapshot: false });
      if (result?.runIo) outputs.push(String(result.message || ""));
      if (result?.waitingForInput) throw new Error(`unexpected waitForInput while running ${sourceName}`);
      if (!result?.ok || result?.done || result?.stoppedOnBreakpoint) {
        return { asm, engine, assembled, result, outputs, joinedOutput: joinOutputs(outputs) };
      }
    }
    throw new Error(`execution guard exceeded for ${sourceName}`);
  };

  const tests = [
    {
      id: "pointer-int-roundtrip",
      description: "int/pointer casts keep pointer identity and dereference semantics.",
      source: `#use <conio>\nint main(void) {\n  int* p = alloc(int);\n  *p = 1234;\n  int raw = (int)p;\n  int* q = (int*)raw;\n  printint(*q);\n  printchar('\\n');\n  return 0;\n}`,
      expectOutput: "1234\n"
    },
    {
      id: "chararray-word-stride-model",
      description: "char* remains word-strided in the webMARS mini-C runtime model.",
      source: `#use <conio>\n#use <string>\nint main(void) {\n  char* a = string_to_chararray(\"Hi\");\n  printint((int)a[0]);\n  print(\"|\");\n  printint((int)a[1]);\n  print(\"|\");\n  printint((int)a[2]);\n  print(\"|\");\n  printbool(string_terminated(a, 3));\n  print(\"|\");\n  println(string_from_chararray(a));\n  return 0;\n}`,
      expectOutput: "72|105|0|true|Hi\n"
    },
    {
      id: "raw-word-little-endian",
      description: "An int stored through int* lands in memory as little-endian bytes.",
      source: `#use <conio>\nint main(void) {\n  int* p = alloc(int);\n  *p = 287454020;\n  printint((int)p);\n  printchar('\\n');\n  return 0;\n}`,
      expectOutputPattern: /^\d+\n$/,
      validate(engine, execution) {
        const address = Number.parseInt(String(execution.joinedOutput || "").trim(), 10);
        if (!Number.isFinite(address)) {
          return { ok: false, message: `invalid address output: ${execution.joinedOutput}` };
        }
        const bytes = [0, 1, 2, 3].map((offset) => engine.readByte((address + offset) >>> 0, false));
        const ok = bytes.join(",") === "68,51,34,17";
        return { ok, message: `address=${address} bytes=${bytes.join(',')}` };
      }
    },
    {
      id: "tty-mmio-little-endian",
      description: "TTY library MMIO helpers talk to the low byte lane in little-endian mode.",
      source: `#use <conio>\n#use <tty>\nint main(void) {\n  printint(tty_get_byte());\n  print(\"|\");\n  tty_put_byte(67);\n  printbool(tty_tx_ready());\n  printchar('\\n');\n  return 0;\n}`,
      setupEngine(engine) {
        engine.writeWord(0xffff0000 >>> 0, 1);
        engine.writeWord(0xffff0004 >>> 0, 66);
        engine.writeWord(0xffff0008 >>> 0, 1);
      },
      expectOutput: "66|true\n",
      validate(engine) {
        const txWord = engine.readWord(0xffff000c >>> 0) | 0;
        return { ok: txWord === 67, message: `txWord=${txWord}` };
      }
    }
  ];

  const rows = tests.map((test) => {
    try {
      const execution = runProgram(test);
      const outputOk = test.expectOutputPattern
        ? test.expectOutputPattern.test(execution.joinedOutput)
        : execution.joinedOutput === String(test.expectOutput || "");
      const haltedOk = execution.result?.done === true && execution.result?.exception !== true;
      const customValidation = typeof test.validate === "function"
        ? (test.validate(execution.engine, execution) || { ok: true, message: "" })
        : { ok: true, message: "" };
      return {
        id: test.id,
        description: test.description,
        ok: outputOk && haltedOk && customValidation.ok === true,
        checks: {
          outputOk,
          haltedOk,
          customOk: customValidation.ok === true
        },
        expected: {
          output: test.expectOutput || null,
          outputPattern: test.expectOutputPattern ? String(test.expectOutputPattern) : null
        },
        observed: {
          output: execution.joinedOutput,
          haltReason: execution.result?.haltReason || null,
          exception: execution.result?.exception === true,
          message: execution.result?.message || "",
          customMessage: customValidation.message || ""
        }
      };
    } catch (error) {
      return {
        id: test.id,
        description: test.description,
        ok: false,
        checks: { outputOk: false, haltedOk: false, customOk: false },
        expected: {
          output: test.expectOutput || null,
          outputPattern: test.expectOutputPattern ? String(test.expectOutputPattern) : null
        },
        observed: {
          output: "",
          haltReason: null,
          exception: true,
          message: normalizeErrorMessage(error),
          customMessage: ""
        }
      };
    }
  });

  const passed = rows.filter((row) => row.ok).length;
  const report = {
    suite: "mini-c-endian-regression",
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    compilerPath,
    corePath,
    summary: {
      total: rows.length,
      passed,
      failed: rows.length - passed
    },
    tests: rows
  };

  const outputPath = writeJsonReport("mini-c-endian-regression.json", report);
  console.log(`[mini-c-endian] tests: ${passed}/${rows.length}`);
  console.log(`[mini-c-endian] report: ${outputPath}`);

  if (passed !== rows.length) process.exitCode = 1;
}

runSuite();

