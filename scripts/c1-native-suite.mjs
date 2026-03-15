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

function loadNativeLibrarySources() {
  const manifest = JSON.parse(readFileSync(libsManifestPath, "utf8"));
  const libraries = Array.isArray(manifest?.libraries) ? manifest.libraries : [];
  const sources = Object.fromEntries(
    libraries.map((entry) => [entry.name, readFileSync(join(repoRoot, "web", "libs", entry.path), "utf8")])
  );
  if (typeof sources.string_native === "string") {
    sources.string = sources.string_native;
  }
  return sources;
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
  const useLibrarySources = loadNativeLibrarySources();

  const compileProgram = (source, sourceName) => {
    const result = compiler.compile(source, {
      sourceName,
      subset: "C1-NATIVE",
      useLibrarySources
    });
    if (result.ok !== true || (result.errors || []).length) {
      throw new Error(`compile failed: ${JSON.stringify(result.errors?.[0] || result)}`);
    }
    return result.asm;
  };

  const runProgram = ({ source, sourceName, args = [], inputs = [], setupEngine = null }) => {
    const asm = compileProgram(source, sourceName);
    const engine = new MarsEngine({
      settings: { ...DEFAULT_SETTINGS, delayedBranching: false, pseudoInstructions: true },
      memoryMap: { ...DEFAULT_MEMORY_MAP }
    });
    engine.setRuntimeHooks({ readInput: createInputHook(inputs) });
    let argumentLine = "";
    if (Array.isArray(args) && args.length) {
      const escaped = args.map((entry) => (
        /\s/.test(String(entry ?? "")) ? `"${String(entry ?? "").replace(/"/g, "\\\"")}"` : String(entry ?? "")
      ));
      argumentLine = escaped.join(" ");
      engine.settings.programArguments = true;
      engine.settings.programArgumentsLine = argumentLine;
    }
    const assembled = engine.assemble(asm, { sourceName: `${sourceName}.s` });
    if ((assembled?.errors || []).length) {
      throw new Error(`assemble failed: ${JSON.stringify(assembled.errors[0])}`);
    }
    if (argumentLine && typeof engine.applyProgramArguments === "function") {
      engine.applyProgramArguments(argumentLine);
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
      id: "byte-addressed-char-pointer",
      description: "alloc_array(char, n) produces contiguous byte-addressed storage in C1/native.",
      source: `#use <conio>
int main(void) {
  char* buf = alloc_array(char, 4);
  buf[0] = 'A';
  buf[1] = 'B';
  buf[2] = 'C';
  buf[3] = '\\0';
  printint((int)buf);
  printchar('\\n');
  println(buf);
  return 0;
}`,
      expectOutputPattern: /^\d+\nABC\n$/,
      validate(engine, execution) {
        const [addressText] = String(execution.joinedOutput || "").split("\n");
        const address = Number.parseInt(addressText, 10);
        if (!Number.isFinite(address)) return { ok: false, message: `invalid address output: ${execution.joinedOutput}` };
        const bytes = [0, 1, 2, 3].map((offset) => engine.readByte((address + offset) >>> 0, false));
        return { ok: bytes.join(",") === "65,66,67,0", message: `bytes=${bytes.join(",")}` };
      }
    },
    {
      id: "native-main-argc-argv",
      description: "C1/native accepts int main(int argc, char** argv) and exposes runtime arguments.",
      source: `#include <stdio.h>
int main(int argc, char** argv) {
  printf("%d|%s|%s|%c\\n", argc, argv[0], argv[1], argv[1][1]);
  return 0;
}`,
      args: ["alpha", "beta"],
      expectOutput: "2|alpha|beta|e\n"
    },
    {
      id: "native-string-helpers",
      description: "C1/native string helpers cover strcpy/strcat/strlen/strcmp/memset.",
      source: `#include <stdio.h>
#include <string.h>
int main(void) {
  char* dst = alloc_array(char, 16);
  memset(dst, 0, 16);
  strcpy(dst, "Hi");
  strcat(dst, "!");
  printf("%s|%d|%d\\n", dst, (int)strlen(dst), strcmp(dst, "Hi!"));
  return 0;
}`,
      expectOutput: "Hi!|3|0\n"
    },
    {
      id: "native-pointer-increment",
      description: "Pointer ++ uses element-size scaling for byte-addressed char*.",
      source: `#include <stdio.h>
#include <string.h>
int main(void) {
  char* text = string_to_chararray("web");
  char* cursor = text;
  cursor++;
  printf("%c|%s\\n", *cursor, cursor);
  return 0;
}`,
      expectOutput: "e|eb\n"
    },
    {
      id: "native-memmove-overlap",
      description: "memmove handles overlapping byte ranges with pointer arithmetic.",
      source: `#include <stdio.h>
#include <string.h>
int main(void) {
  char* buf = alloc_array(char, 8);
  strcpy(buf, "abc");
  memmove(buf + 1, buf, 4);
  printf("%s\\n", buf);
  return 0;
}`,
      expectOutput: "aabc\n"
    },
    {
      id: "native-string-to-chararray-copy",
      description: "string_to_chararray in C1/native returns a writable byte-addressed copy.",
      source: `#use <conio>
#use <string>
int main(void) {
  char* text = string_to_chararray("Hi");
  printint((int)text);
  printchar('\\n');
  text[0] = 'B';
  println(text);
  return 0;
}`,
      expectOutputPattern: /^\d+\nBi\n$/,
      validate(engine, execution) {
        const [addressText] = String(execution.joinedOutput || "").split("\n");
        const address = Number.parseInt(addressText, 10);
        if (!Number.isFinite(address)) return { ok: false, message: `invalid address output: ${execution.joinedOutput}` };
        const bytes = [0, 1, 2].map((offset) => engine.readByte((address + offset) >>> 0, false));
        return { ok: bytes.join(",") === "66,105,0", message: `bytes=${bytes.join(",")}` };
      }
    },
    {
      id: "source-local-char-array-byte-layout",
      description: "Source-declared local char[] decays to char* and stores contiguous bytes.",
      source: `#include <stdio.h>
int main(void) {
  char buf[] = "ABC";
  printf("%d|%s|%c\\n", (int)buf, buf, buf[1]);
  return 0;
}`,
      expectOutputPattern: /^(\d+)\|ABC\|B\n$/,
      validate(engine, execution) {
        const match = String(execution.joinedOutput || "").match(/^(\d+)\|ABC\|B\n$/);
        if (!match) return { ok: false, message: `unexpected output: ${execution.joinedOutput}` };
        const address = Number.parseInt(match[1], 10);
        if (!Number.isFinite(address)) return { ok: false, message: `invalid address: ${match[1]}` };
        const bytes = [0, 1, 2, 3].map((offset) => engine.readByte((address + offset) >>> 0, false));
        return { ok: bytes.join(",") === "65,66,67,0", message: `bytes=${bytes.join(",")}` };
      }
    },
    {
      id: "source-global-char-array-byte-layout",
      description: "Source-declared global char[] keeps byte-addressed native layout.",
      source: `#include <stdio.h>
char banner[] = "OK";
int main(void) {
  printf("%d|%s|%c\\n", (int)banner, banner, banner[1]);
  return 0;
}`,
      expectOutputPattern: /^(\d+)\|OK\|K\n$/,
      validate(engine, execution) {
        const match = String(execution.joinedOutput || "").match(/^(\d+)\|OK\|K\n$/);
        if (!match) return { ok: false, message: `unexpected output: ${execution.joinedOutput}` };
        const address = Number.parseInt(match[1], 10);
        if (!Number.isFinite(address)) return { ok: false, message: `invalid address: ${match[1]}` };
        const bytes = [0, 1, 2].map((offset) => engine.readByte((address + offset) >>> 0, false));
        return { ok: bytes.join(",") === "79,75,0", message: `bytes=${bytes.join(",")}` };
      }
    },
    {
      id: "malloc-calloc-realloc-free",
      description: "The malloc family works end-to-end with byte copies and zeroed calloc memory.",
      source: `#include <stdio.h>
#include <stdlib.h>
int main(void) {
  char* buf = (char*)calloc(4, 1);
  buf[0] = 'O';
  buf[1] = 'K';
  buf = (char*)realloc((void*)buf, 8);
  buf[2] = '!';
  buf[3] = '\\0';
  printf("%s|%d|%d\\n", buf, (int)buf[4], (int)buf[7]);
  free((void*)buf);
  return 0;
}`,
      expectOutput: "OK!|0|0\n"
    },
    {
      id: "malloc-free-reuse",
      description: "free makes released blocks available for reuse by later malloc calls.",
      source: `#include <stdio.h>
#include <stdlib.h>
int main(void) {
  char* first = (char*)malloc(4);
  int a = (int)first;
  free((void*)first);
  char* second = (char*)malloc(4);
  printf("%d|%d\\n", a, (int)second);
  free((void*)second);
  return 0;
}`,
      expectOutputPattern: /^(\d+)\|(\d+)\n$/,
      validate(_engine, execution) {
        const match = String(execution.joinedOutput || "").match(/^(\d+)\|(\d+)\n$/);
        if (!match) return { ok: false, message: `unexpected output: ${execution.joinedOutput}` };
        return { ok: match[1] === match[2], message: `first=${match[1]} second=${match[2]}` };
      }
    },
    {
      id: "void-pointer-casts-and-arrays",
      description: "void* works with casts back to typed pointers and local arrays of generic pointers.",
      source: `#include <stdio.h>
int main(void) {
  void* items[2];
  int x = 37;
  items[0] = (void*)&x;
  printf("%d\\n", *(int*)items[0]);
  return 0;
}`,
      expectOutput: "37\n"
    },
    {
      id: "function-pointer-reference-typedef",
      description: "Reference-style typedef function pointers support '&fn', '(*fn)(...)', and passing through parameters.",
      source: `#include <stdio.h>
typedef int op(int a, int b);
int add(int a, int b) {
  return a + b;
}
int apply(op* fn, int a, int b) {
  return (*fn)(a, b);
}
int main(void) {
  op* fn = &add;
  printf("%d|%d\\n", (*fn)(2, 3), apply(fn, 4, 5));
  return 0;
}`,
      expectOutput: "5|9\n"
    },
    {
      id: "void-pointer-hastag",
      description: "\\hastag checks runtime pointer tags and treats NULL as compatible.",
      source: `#include <stdio.h>
int main(void) {
  int value = 12;
  void* boxed = (void*)&value;
  printf("%d|%d\\n", (int)\\hastag(int*, boxed), (int)\\hastag(char*, NULL));
  return 0;
}`,
      expectOutput: "1|1\n"
    },
    {
      id: "void-pointer-tag-mismatch-aborts",
      description: "Casting a tagged void* to the wrong pointer type aborts before later output.",
      source: `#include <stdio.h>
int main(void) {
  int value = 12;
  void* boxed = (void*)&value;
  printf("before\\n");
  char* wrong = (char*)boxed;
  printf("after|%d\\n", (int)wrong[0]);
  return 0;
}`,
      expectOutput: "before\n"
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
    suite: "c1-native-suite",
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    compilerPath,
    corePath,
    summary: {
      total: rows.length,
      passed,
      failed: rows.length - passed
    },
    rows
  };

  const outputPath = writeJsonReport("c1-native-suite.json", report);
  console.log(`[c1-native] passed ${passed}/${rows.length}`);
  console.log(`[c1-native] report: ${outputPath}`);
  if (passed !== rows.length) process.exitCode = 1;
}

runSuite();
