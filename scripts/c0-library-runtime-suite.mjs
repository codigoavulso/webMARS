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
  const exported = sandbox.globalThis?.__coreExports;
  if (!exported?.MarsEngine) {
    throw new Error("Unable to load MarsEngine from 00-core.js.");
  }
  return exported;
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
  return () => {
    if (!queue.length) return null;
    return { value: queue.shift() };
  };
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

  const runProgram = ({ source, sourceName, files = {}, args = [], inputs = [], setupEngine = null }) => {
    const asm = compileProgram(source, sourceName);
    const engine = new MarsEngine({
      settings: { ...DEFAULT_SETTINGS, delayedBranching: false, pseudoInstructions: true },
      memoryMap: { ...DEFAULT_MEMORY_MAP }
    });
    engine.setRuntimeHooks({
      readInput: createInputHook(inputs)
    });
    if (Array.isArray(args) && args.length) {
      if (typeof engine.setProgramArguments === "function") {
        engine.setProgramArguments(args);
      } else if (typeof engine.applyProgramArguments === "function") {
        const escaped = args.map((entry) => (
          /\s/.test(String(entry ?? "")) ? `"${String(entry ?? "").replace(/"/g, "\\\"")}"` : String(entry ?? "")
        ));
        engine.applyProgramArguments(escaped.join(" "));
      }
    }
    Object.entries(files || {}).forEach(([name, text]) => {
      if (typeof engine.setVirtualFileBytes === "function") {
        engine.setVirtualFileBytes(name, new TextEncoder().encode(String(text ?? "")));
      }
    });
    const assembled = engine.assemble(asm, { sourceName: `${sourceName}.s` });
    if ((assembled?.errors || []).length) {
      throw new Error(`assemble failed: ${JSON.stringify(assembled.errors[0])}`);
    }
    if (typeof setupEngine === "function") {
      setupEngine(engine, assembled);
    }
    const outputs = [];
    for (let steps = 0; steps < 250000; steps += 1) {
      const result = engine.step({ includeSnapshot: false });
      if (result?.runIo) outputs.push(String(result.message || ""));
      if (result?.waitingForInput) {
        throw new Error(`unexpected waitForInput while running ${sourceName}`);
      }
      if (!result?.ok || result?.done || result?.stoppedOnBreakpoint) {
        return {
          asm,
          outputs,
          joinedOutput: joinOutputs(outputs),
          result,
          engine,
          assembled
        };
      }
    }
    throw new Error(`execution guard exceeded for ${sourceName}`);
  };

  const tests = [
    {
      id: "conio-format",
      description: "Basic conio output plus printf/format integration.",
      source: `#use <conio>
#use <string>
int main(void) {
  print("start|");
  printint(42);
  print("|");
  printbool(true);
  print("|");
  printchar('Q');
  printchar('\\n');
  printf("%s:%d%c!\\n", "mix", 9, 'Z');
  println(format("%s", "end"));
  flush();
  return 0;
}`,
      expectOutput: "start|42|true|Q\nmix:9Z!\nend\n"
    },
    {
      id: "conio-readline",
      description: "Console input via readline and eof baseline.",
      source: `#use <conio>
int main(void) {
  printbool(eof());
  print("|");
  string a = readline();
  print(a);
  print("|");
  printbool(eof());
  print("|");
  string b = readline();
  println(b);
  return 0;
}`,
      inputs: ["alpha", "beta"],
      expectOutput: "false|alpha|false|beta\n"
    },
    {
      id: "file",
      description: "file library open/read/eof/close lifecycle.",
      source: `#use <conio>
#use <file>
int main(void) {
  file_t f = file_read("demo.txt");
  if (f == NULL) {
    println("NULL");
    return 0;
  }
  printbool(file_closed(f));
  print("|");
  printbool(file_eof(f));
  print("|");
  print(file_readline(f));
  print("|");
  printbool(file_eof(f));
  print("|");
  print(file_readline(f));
  print("|");
  printbool(file_eof(f));
  print("|");
  file_close(f);
  printbool(file_closed(f));
  printchar('\\n');
  return 0;
}`,
      files: { "demo.txt": "one\ntwo\n" },
      expectOutput: "false|false|one|false|two|true|true\n"
    },
    {
      id: "args",
      description: "Argument registration and parse result structure.",
      source: `#use <conio>
#use <args>
int main(void) {
  bool verbose = false;
  int count = 0;
  string name = "";
  args_flag("verbose", &verbose);
  args_int("count", &count);
  args_string("name", &name);
  args_t parsed = args_parse();
  if (parsed == NULL) {
    println("NULL");
    return 0;
  }
  printbool(verbose);
  print("|");
  printint(count);
  print("|");
  print(name);
  print("|");
  printint(parsed->argc);
  print("|");
  print(parsed->argv[0]);
  print("|");
  println(parsed->argv[1]);
  return 0;
}`,
      args: ["-verbose", "-count", "7", "-name", "neo", "rest1", "rest2"],
      expectOutput: "true|7|neo|2|rest1|rest2\n"
    },
    {
      id: "string",
      description: "Core string, char, and conversion helpers.",
      source: `#use <conio>
#use <string>
int main(void) {
  string s = string_join("Ab", "Cd");
  printint(string_length(s));
  print("|");
  printchar(string_charat(s, 1));
  print("|");
  print(string_sub(s, 1, 3));
  print("|");
  printbool(string_equal("aa", "aa"));
  print("|");
  printint(string_compare("aa", "ab"));
  print("|");
  print(string_fromint(12));
  print("|");
  print(string_frombool(false));
  print("|");
  print(string_fromchar('Z'));
  print("|");
  print(string_tolower("AbC"));
  print("|");
  char* a = string_to_chararray("Hi");
  printbool(string_terminated(a, 3));
  print("|");
  print(string_from_chararray(a));
  print("|");
  printint(char_ord('A'));
  print("|");
  printchar(char_chr(66));
  printchar('\\n');
  return 0;
}`,
      expectOutput: "4|b|bC|true|-1|12|false|Z|abc|true|Hi|65|B\n"
    },
    {
      id: "parse",
      description: "parse library booleans, ints, tokens, and token arrays.",
      source: `#use <conio>
#use <parse>
int main(void) {
  bool* pb = parse_bool("true");
  int* pi = parse_int("1f", 16);
  printbool(pb != NULL && *pb);
  print("|");
  printbool(pi != NULL);
  print("|");
  printint(*pi);
  print("|");
  printint(num_tokens(" 10 20 bb "));
  print("|");
  printbool(int_tokens("10 20", 10));
  print("|");
  string* toks = parse_tokens("aa bb");
  print(toks[0]);
  print("|");
  print(toks[1]);
  print("|");
  int* vals = parse_ints("7 8 9", 10);
  printint(vals[0]);
  print("|");
  printint(vals[1]);
  print("|");
  printint(vals[2]);
  printchar('\\n');
  return 0;
}`,
      expectOutput: "true|true|31|3|true|aa|bb|7|8|9\n"
    },
    {
      id: "img",
      description: "Image create/data/subimage/clone/save/load workflow.",
      source: `#use <conio>
#use <img>
int main(void) {
  image_t img = image_create(3, 2);
  int* px = image_data(img);
  px[0] = 1;
  px[1] = 2;
  px[3] = 3;
  image_t sub = image_subimage(img, 1, 0, 2, 2);
  image_t clone = image_clone(sub);
  image_save(clone, "shape.img");
  image_t loaded = image_load("shape.img");
  printint(image_width(loaded));
  print("|");
  printint(image_height(loaded));
  print("|");
  int* q = image_data(loaded);
  printint(q[0]);
  print("|");
  printint(q[1]);
  print("|");
  printint(q[2]);
  print("|");
  printint(q[3]);
  printchar('\\n');
  return 0;
}`,
      expectOutput: "2|2|2|0|0|0\n",
      expectVirtualFile: { name: "shape.img", minBytes: 32 }
    },
    {
      id: "util-rand",
      description: "util helpers plus deterministic rand streams for same seed.",
      source: `#use <conio>
#use <util>
#use <rand>
int main(void) {
  printint(int_size());
  print("|");
  printint(int_max());
  print("|");
  printint(int_min());
  print("|");
  printint(abs(-5));
  print("|");
  printint(max(3, 9));
  print("|");
  printint(min(3, 9));
  print("|");
  print(int2hex(255));
  print("|");
  rand_t a = init_rand(17);
  rand_t b = init_rand(17);
  printbool(rand(a) == rand(b));
  printchar('\\n');
  return 0;
}`,
      expectOutput: "4|2147483647|-2147483648|5|9|3|000000ff|true\n"
    },
    {
      id: "compat-include-string",
      description: "#include resolves string.h aliases and nested stddef.h typedefs.",
      source: `#include <stdio.h>
#include <string.h>
int main(void) {
  size_t len = strlen("Mars");
  printf("%d|%d|%d|%d\\n", len, strcmp("ab", "ac"), strncmp("abcd", "abxy", 2), strncmp("abcd", "abxy", 3));
  return 0;
}`,
      expectOutput: "4|-1|0|-1\n"
    },
    {
      id: "compat-include-stdlib-ctype",
      description: "#include resolves stdlib.h, ctype.h, and stdbool.h compatibility helpers.",
      source: `#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>
#include <stdbool.h>
int main(void) {
  bool ok = true;
  printf("%d|%d|%d|%d|%d|%d\\n", atoi("  -42xyz"), isdigit('7'), isspace(' '), tolower('Q'), toupper('m'), ok ? 1 : 0);
  return 0;
}`,
      expectOutput: "-42|1|1|113|77|1\n"
    },
    {
      id: "compat-include-stdio-file",
      description: "#include resolves stdio.h file modes and file-backed fputs/fputc flows.",
      source: `#include <stdio.h>
int main(void) {
  int writer = fopen("compat.txt", "w");
  fputs("XY", writer);
  fclose(writer);

  int append = fopen("compat.txt", "a");
  fputc('Z', append);
  fclose(append);

  int reader = fopen("compat.txt", "r");
  int a = fgetc(reader);
  int b = fgetc(reader);
  int c = fgetc(reader);
  int tail = fgetc(reader);
  printf("%d|%d|%d|%d|%d\\n", a, b, c, tail, feof(reader));
  fclose(reader);
  return 0;
}`,
      expectOutput: "88|89|90|-1|1\n",
      expectVirtualFile: { name: "compat.txt", minBytes: 3 }
    },
    {
      id: "compat-include-stdio-snprintf",
      description: "stdio snprintf copies direct strings into Mini-C int buffers with truncation.",
      source: `#include <stdio.h>
int main(void) {
  int buffer[4];
  int total = snprintf(buffer, 4, "hello");
  printf("%d|%d|%d|%d|%d\\n", total, buffer[0], buffer[1], buffer[2], buffer[3]);
  return 0;
}`,
      expectOutput: "5|104|101|108|0\n"
    },
    {
      id: "tty-put-byte-little-endian",
      description: "TTY transmitter MMIO stores the character in the low byte word lane.",
      source: `#use <tty>
int main(void) {
  tty_put_byte(65);
  return 0;
}`,
      setupEngine(engine) {
        engine.writeWord(0xffff0008 >>> 0, 1);
      },
      expectOutput: "",
      validate(engine) {
        const txWord = engine.readWord(0xffff000c >>> 0) | 0;
        return {
          ok: txWord === 65,
          message: `txWord=${txWord}`
        };
      }
    },
    {
      id: "tty-get-byte-little-endian",
      description: "TTY receiver MMIO reads the character from the low byte word lane.",
      source: `#use <conio>
#use <tty>
int main(void) {
  printint(tty_get_byte());
  printchar('\\n');
  return 0;
}`,
      setupEngine(engine) {
        engine.writeWord(0xffff0000 >>> 0, 1);
        engine.writeWord(0xffff0004 >>> 0, 66);
      },
      expectOutput: "66\n"
    }
  ];

  const rows = tests.map((test) => {
    try {
      const execution = runProgram(test);
      const fileExpectation = test.expectVirtualFile || null;
      const fileBytes = fileExpectation && typeof execution.engine.getVirtualFileBytes === "function"
        ? execution.engine.getVirtualFileBytes(fileExpectation.name)
        : null;
      const fileOk = !fileExpectation || ((fileBytes?.length || 0) >= (fileExpectation.minBytes || 1));
      const outputOk = execution.joinedOutput === String(test.expectOutput || "");
      const haltedOk = execution.result?.done === true && execution.result?.exception !== true;
      const customValidation = typeof test.validate === "function"
        ? (test.validate(execution.engine, execution) || { ok: true, message: "" })
        : { ok: true, message: "" };
      return {
        id: test.id,
        description: test.description,
        ok: outputOk && haltedOk && fileOk && customValidation.ok === true,
        checks: {
          outputOk,
          haltedOk,
          fileOk,
          customOk: customValidation.ok === true
        },
        expected: {
          output: String(test.expectOutput || ""),
          virtualFile: fileExpectation
        },
        observed: {
          output: execution.joinedOutput,
          runIoChunks: execution.outputs,
          haltReason: execution.result?.haltReason || null,
          exception: execution.result?.exception === true,
          message: execution.result?.message || "",
          virtualFileBytes: fileBytes?.length || 0,
          customMessage: customValidation.message || ""
        }
      };
    } catch (error) {
      return {
        id: test.id,
        description: test.description,
        ok: false,
        checks: {
          outputOk: false,
          haltedOk: false,
          fileOk: false,
          customOk: false
        },
        expected: {
          output: String(test.expectOutput || ""),
          virtualFile: test.expectVirtualFile || null
        },
        observed: {
          output: "",
          runIoChunks: [],
          haltReason: null,
          exception: true,
          message: normalizeErrorMessage(error),
          virtualFileBytes: 0,
          customMessage: ""
        }
      };
    }
  });

  const passed = rows.filter((row) => row.ok).length;
  const report = {
    suite: "c0-library-runtime-suite",
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

  const outputPath = writeJsonReport("c0-library-runtime-suite.json", report);
  console.log(`[c0-libs] tests: ${passed}/${rows.length}`);
  console.log(`[c0-libs] report: ${outputPath}`);

  if (passed !== rows.length) process.exitCode = 1;
}

runSuite();
