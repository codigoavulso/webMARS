import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import {
  createJavaScriptEngine,
  loadMiniCCompiler,
  projectRoot
} from "./helpers/engines.mjs";

const examplesRoot = resolve(projectRoot, "examples");
const manifest = JSON.parse((await readFile(resolve(examplesRoot, "examples.json"), "utf8")).replace(/^\uFEFF/, ""));
const languages = Array.isArray(manifest.languages) ? manifest.languages : [manifest.defaultLanguage || "en"];
const entries = Array.isArray(manifest.examples) ? manifest.examples : [];
const miniCSubsets = ["C0-S0", "C0-S1", "C0-S2", "C0-S3", "C0-S4", "C1-NATIVE"];

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveExampleFile(language, logicalPath) {
  const localized = resolve(examplesRoot, language, logicalPath);
  if (await pathExists(localized)) return localized;
  const fallback = resolve(examplesRoot, logicalPath);
  if (await pathExists(fallback)) return fallback;
  throw new Error(`Missing example '${logicalPath}' for language '${language}'.`);
}

function sourceSpecs(entry) {
  if (Array.isArray(entry.files) && entry.files.length) return entry.files;
  return [{ path: entry.path, main: true }];
}

function teachingComments(source, logicalPath) {
  const isAssembly = [".asm", ".s"].includes(extname(logicalPath).toLowerCase());
  return String(source).split(/\r?\n/).flatMap((line) => {
    const marker = isAssembly ? line.indexOf("#") : line.indexOf("//");
    if (marker < 0) return [];
    const comment = line.slice(marker + (isAssembly ? 1 : 2)).trim();
    if (!comment || (!isAssembly && comment.startsWith("#use"))) return [];
    return [comment];
  });
}

function formatDiagnostics(result) {
  return JSON.stringify(result?.errors || result?.diagnostics || [], null, 2);
}

async function loadMiniCLibraries() {
  const libraryManifest = JSON.parse(
    (await readFile(resolve(projectRoot, "libs/manifest.json"), "utf8")).replace(/^\uFEFF/, "")
  );
  const sources = {};
  for (const entry of libraryManifest.libraries || []) {
    const source = await readFile(resolve(projectRoot, "libs", entry.path), "utf8");
    sources[entry.name] = source;
  }
  return sources;
}

let cachedCompiler = null;
let cachedLibrarySources = null;

function normalizeLogicalPath(value) {
  const parts = [];
  String(value || "").replaceAll("\\", "/").split("/").forEach((part) => {
    if (!part || part === ".") return;
    if (part === "..") {
      parts.pop();
      return;
    }
    parts.push(part);
  });
  return parts.join("/");
}

function createIncludeResolver(includeSources = {}) {
  const normalizedSources = new Map(
    Object.entries(includeSources).map(([name, source]) => [normalizeLogicalPath(name), String(source)])
  );
  return ({ target, fromSourceName }) => {
    const normalizedTarget = normalizeLogicalPath(target);
    const normalizedFrom = normalizeLogicalPath(fromSourceName);
    const fromParts = normalizedFrom.split("/");
    fromParts.pop();
    const fromDirectory = fromParts.join("/");
    const candidates = [
      normalizeLogicalPath(`${fromDirectory}/${normalizedTarget}`),
      normalizedTarget
    ];
    for (const candidate of candidates) {
      if (!normalizedSources.has(candidate)) continue;
      return { sourceName: candidate, source: normalizedSources.get(candidate) };
    }
    return null;
  };
}

async function rawCompileCSource(source, sourceName, options = {}) {
  cachedCompiler ||= await loadMiniCCompiler();
  cachedLibrarySources ||= await loadMiniCLibraries();
  const subset = options.subset || "C1-NATIVE";
  const librarySources = { ...cachedLibrarySources };
  if (subset === "C1-NATIVE" && librarySources.string_native) {
    librarySources.string = librarySources.string_native;
  }
  return cachedCompiler.compile(source, {
    sourceName,
    subset,
    targetAbi: "o32",
    emitComments: false,
    useLibrarySources: librarySources,
    includeResolver: createIncludeResolver(options.includeSources)
  });
}

async function compileCSource(source, sourceName, options = {}) {
  const compiled = await rawCompileCSource(source, sourceName, options);
  assert.equal(compiled.ok, true, `${sourceName} did not compile:\n${formatDiagnostics(compiled)}`);
  return compiled;
}

async function assembleSource(source, sourceName, settings = {}, assemblyOptions = {}) {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff, ...settings }
  });
  const assembled = engine.assemble(source, { sourceName, ...assemblyOptions });
  assert.equal(assembled.ok, true, `${sourceName} did not assemble:\n${formatDiagnostics(assembled)}`);
  return engine;
}

async function assembleMarsOs(language = "en") {
  const entry = entries.find((candidate) => candidate.path === "mips.asm");
  assert.ok(entry, "MARS-OS catalog entry is missing.");
  const files = [];
  for (const spec of sourceSpecs(entry)) {
    const physicalPath = await resolveExampleFile(language, spec.path);
    files.push({
      name: spec.path.replaceAll("\\", "/"),
      source: await readFile(physicalPath, "utf8"),
      main: spec.main === true
    });
  }
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff, maxBacksteps: 0 }
  });
  engine.setSourceFiles(files);
  const main = files.find((file) => file.main);
  const assembled = engine.assemble(main.source, { sourceName: main.name });
  assert.equal(assembled.ok, true, formatDiagnostics(assembled));
  return engine;
}

function attachTtyHarness(engine, inputText = "") {
  const input = Array.from(Buffer.from(String(inputText), "ascii"));
  const output = [];
  const receiverControl = 0xffff0000;
  const receiverData = 0xffff0004;
  const transmitterControl = 0xffff0008;
  const transmitterData = 0xffff000c;

  const feedReceiver = () => {
    if (!input.length || (engine.getByte(receiverControl) & 1) !== 0) return;
    engine.writeByte(receiverData, input.shift());
    engine.writeByte(receiverControl, 1);
  };

  engine.writeByte(transmitterControl, 1);
  const detach = engine.registerMemoryObserver({
    start: receiverData,
    end: transmitterData,
    onRead(detail) {
      if ((detail.address >>> 0) !== receiverData) return;
      engine.writeByte(receiverControl, 0);
      engine.writeByte(receiverData, 0);
      feedReceiver();
    },
    onWrite(detail) {
      if ((detail.address >>> 0) !== transmitterData) return;
      if ((engine.getByte(transmitterControl) & 1) === 0) return;
      engine.writeByte(transmitterControl, 0);
      output.push(detail.value & 0xff);
      engine.writeByte(transmitterData, 0);
      engine.writeByte(transmitterControl, 1);
    }
  });
  feedReceiver();

  return {
    detach,
    get output() {
      return Buffer.from(output).toString("utf8");
    },
    get remainingInput() {
      return input.length;
    }
  };
}

function runToHalt(engine, maxSteps = 200000) {
  let output = "";
  for (let step = 0; step < maxSteps && !engine.getSnapshot().halted; step += 1) {
    const result = engine.step({ includeSnapshot: false });
    assert.equal(result.ok, true, result.message || "Execution failed.");
    assert.notEqual(result.waitingForInput, true, "Unexpected interactive input request.");
    if (result.runIo) output += result.message;
  }
  assert.equal(engine.getSnapshot().halted, true, `Program exceeded ${maxSteps} instructions.`);
  return output;
}

test("example catalog has unique, resolvable entries", async () => {
  assert.ok(entries.length > 0, "The example catalog must not be empty.");
  assert.ok(languages.length > 0, "The example catalog must declare at least one language.");

  const labels = new Set();
  const paths = new Set();
  for (const entry of entries) {
    assert.equal(typeof entry.label, "string");
    assert.ok(entry.label.trim(), "Every example needs a non-empty label.");
    assert.equal(typeof entry.path, "string");
    assert.ok(entry.path.trim(), `Example '${entry.label}' needs a path.`);
    assert.equal(typeof entry.category, "string");
    assert.ok(entry.category.trim(), `Example '${entry.label}' needs a category.`);
    if ([".c", ".c0"].includes(extname(entry.path).toLowerCase())) {
      assert.ok(
        miniCSubsets.includes(entry.minSubset),
        `C example '${entry.label}' needs a valid minSubset.`
      );
    }
    assert.equal(labels.has(entry.label), false, `Duplicate example label '${entry.label}'.`);
    assert.equal(paths.has(entry.path), false, `Duplicate example path '${entry.path}'.`);
    labels.add(entry.label);
    paths.add(entry.path);

    const specs = sourceSpecs(entry);
    assert.equal(
      specs.filter((file) => file.main === true).length,
      1,
      `Example '${entry.label}' must identify exactly one main file.`
    );
    for (const language of languages) {
      for (const file of specs) {
        await resolveExampleFile(language, file.path);
      }
    }
  }
});

test("Learn and Lessons examples keep explanatory comments localized in every language", async () => {
  const teachingEntries = entries.filter((entry) => ["Learn", "Lessons"].includes(entry.category));
  assert.ok(teachingEntries.length > 0, "The teaching categories must not be empty.");

  const untranslatedEnglish = /\b(?:Concepts|Register plan|After pass|A word occupies|The compiler lowers|One-element arrays|This module owns|By definition|Both routines walk|Execution resumes here|Skip the known|immediate -> register|the adder does|invert all bits|sign preserved|zeros shifted|the count register|the limit|base address|first word|next word|least significant|byte offset|unsigned byte|length|accumulator|scaled index|reserve two words|clobber|first argument|second argument|return address|result came back|this call's|base case|our n again|same shape|different registers|constant is in the word|shift amount|into the FPU|the FPU adder|print float)\b/i;
  for (const entry of teachingEntries) {
    for (const spec of sourceSpecs(entry)) {
      const englishPath = await resolveExampleFile("en", spec.path);
      const englishComments = teachingComments(await readFile(englishPath, "utf8"), spec.path);
      assert.ok(
        englishComments.length >= 4,
        `${spec.path} needs enough inline explanation to be useful as a lesson.`
      );

      for (const language of languages.filter((value) => value !== "en")) {
        const localizedPath = await resolveExampleFile(language, spec.path);
        const localizedComments = teachingComments(await readFile(localizedPath, "utf8"), spec.path);
        const allowedLineDifference = entry.category === "Lessons" ? 1 : 0;
        assert.ok(
          localizedComments.length >= englishComments.length - allowedLineDifference,
          `${spec.path} (${language}) lost explanatory comments from the English lesson.`
        );
        assert.doesNotMatch(
          localizedComments.join("\n"),
          untranslatedEnglish,
          `${spec.path} (${language}) still contains an English teaching comment.`
        );
      }
    }
  }
});

test("every Assembly example variant assembles", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff }
  });
  let assembledVariants = 0;

  for (const entry of entries) {
    if (![".asm", ".s"].includes(extname(entry.path).toLowerCase())) continue;
    const seenPhysicalVariants = new Set();
    for (const language of languages) {
      const specs = sourceSpecs(entry);
      const files = [];
      for (const spec of specs) {
        const physicalPath = await resolveExampleFile(language, spec.path);
        files.push({
          name: spec.path.replaceAll("\\", "/"),
          source: await readFile(physicalPath, "utf8"),
          main: spec.main === true,
          physicalPath
        });
      }
      const variantKey = files.map((file) => file.physicalPath).join("|");
      if (seenPhysicalVariants.has(variantKey)) continue;
      seenPhysicalVariants.add(variantKey);

      engine.setSourceFiles(files);
      const main = files.find((file) => file.main);
      const result = engine.assemble(main.source, { sourceName: main.name });
      assert.equal(
        result.ok,
        true,
        `${entry.label} (${language}) did not assemble:\n${formatDiagnostics(result)}`
      );
      assembledVariants += 1;
    }
  }

  const canonicalCount = entries.filter((entry) => (
    [".asm", ".s"].includes(extname(entry.path).toLowerCase())
  )).length;
  assert.ok(assembledVariants >= canonicalCount, "Expected all canonical Assembly examples to be assembled.");
});

test("MARS-OS TTY shell executes commands, history, ANSI state and clean shutdown", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    "calc 0x20 + 22\rcat motd\rcolor yellow\rclock\rsysinfo\rhistory\rshutdown\r"
  );
  const result = engine.go(100000);
  tty.detach();

  assert.equal(result.ok, true);
  assert.equal(result.haltReason, "exit");
  assert.equal(engine.getSnapshot().halted, true);
  assert.equal(tty.remainingInput, 0);
  assert.match(tty.output, /MARS-OS 0\.2/);
  assert.match(tty.output, /result: 54 \(0x00000036\)/);
  assert.match(tty.output, /Learn the machine by building the machine\./);
  assert.match(tty.output, /\x1b\[93mguest@webmars:\/\$ /);
  const clockMatch = tty.output.match(/clock epoch: (0x[0-9a-f]{8}) \/ (0x[0-9a-f]{8})/i);
  assert.ok(clockMatch, "The clock command must print the native 64-bit epoch.");
  assert.notEqual(BigInt(`${clockMatch[1]}${clockMatch[2].slice(2)}`), 0n);
  assert.match(tty.output, /timer device: inactive/);
  assert.match(tty.output, /uptime: \d+ ms/);
  assert.match(tty.output, /commands executed: 5/);
  assert.match(tty.output, /1  calc 0x20 \+ 22/);
  assert.match(tty.output, /6  history/);
  assert.match(tty.output, /System halted/);
  assert.ok(engine.steps < 30000, "The shell session used unexpectedly many instructions.");

  const kernelSource = await readFile(resolve(examplesRoot, "mips_os_kernel.asm"), "utf8");
  assert.match(kernelSource, /tty_getc_wait:[\s\S]*?li\s+\$a0,\s*4[\s\S]*?syscall/);
  for (const language of languages) {
    const mainSource = await readFile(await resolveExampleFile(language, "mips.asm"), "utf8");
    assert.match(mainSource, /\.include "mips_os_kernel\.asm"/);
    assert.match(mainSource, /cmd_clock:\s*\.asciiz "clock"/);
    assert.match(mainSource, /cmd_bench:\s*\.asciiz "bench"/);
    assert.doesNotMatch(mainSource, /Bitmap Display|framebuffer/i);
  }
});

test("MARS-OS bench measures real instruction throughput over a timed sample", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(engine, "bench\rshutdown\r");
  const result = engine.go(20_000_000);
  tty.detach();

  assert.equal(result.ok, true);
  assert.equal(result.haltReason, "exit");
  const resultMatch = tty.output.match(/benchmark: (\d+) instructions\/s/);
  const sampleMatch = tty.output.match(/sample: (\d+) ms, (\d+) instructions/);
  assert.ok(resultMatch, "The bench command must report instructions per second.");
  assert.ok(sampleMatch, "The bench command must report its measurement sample.");
  assert.ok(Number(resultMatch[1]) > 0);
  assert.ok(Number(sampleMatch[1]) >= 250);
  assert.ok(Number(sampleMatch[2]) > 0);
});

test("every C example variant compiles and its generated Assembly assembles", async () => {
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff }
  });
  let compiledVariants = 0;

  for (const entry of entries) {
    if (![".c", ".c0"].includes(extname(entry.path).toLowerCase())) continue;
    const seenPhysicalVariants = new Set();
    for (const language of languages) {
      const files = [];
      for (const spec of sourceSpecs(entry)) {
        const physicalPath = await resolveExampleFile(language, spec.path);
        files.push({
          name: spec.path.replaceAll("\\", "/"),
          source: await readFile(physicalPath, "utf8"),
          main: spec.main === true,
          physicalPath
        });
      }
      const variantKey = files.map((file) => file.physicalPath).join("|");
      if (seenPhysicalVariants.has(variantKey)) continue;
      seenPhysicalVariants.add(variantKey);

      const main = files.find((file) => file.main);
      const includeSources = Object.fromEntries(files.map((file) => [file.name, file.source]));
      const compiled = await compileCSource(main.source, main.name, {
        includeSources,
        subset: entry.minSubset
      });

      const assembled = engine.assemble(compiled.asm, { sourceName: compiled.generatedAsmName });
      assert.equal(
        assembled.ok,
        true,
        `${entry.label} (${language}) generated invalid Assembly:\n${formatDiagnostics(assembled)}`
      );
      compiledVariants += 1;
    }
  }

  const canonicalCount = entries.filter((entry) => (
    [".c", ".c0"].includes(extname(entry.path).toLowerCase())
  )).length;
  assert.ok(compiledVariants >= canonicalCount, "Expected all canonical C examples to be compiled.");
});

test("C catalog minimum profiles match compiler gates", async () => {
  for (const entry of entries) {
    if (![".c", ".c0"].includes(extname(entry.path).toLowerCase())) continue;
    const files = [];
    for (const spec of sourceSpecs(entry)) {
      const physicalPath = await resolveExampleFile("en", spec.path);
      files.push({
        name: spec.path.replaceAll("\\", "/"),
        source: await readFile(physicalPath, "utf8"),
        main: spec.main === true
      });
    }
    const main = files.find((file) => file.main);
    const includeSources = Object.fromEntries(files.map((file) => [file.name, file.source]));
    const atMinimum = await rawCompileCSource(main.source, main.name, {
      subset: entry.minSubset,
      includeSources
    });
    assert.equal(
      atMinimum.ok,
      true,
      `${entry.label} did not compile at declared minimum ${entry.minSubset}:\n${formatDiagnostics(atMinimum)}`
    );

    const subsetIndex = miniCSubsets.indexOf(entry.minSubset);
    if (subsetIndex <= 0) continue;
    const previousSubset = miniCSubsets[subsetIndex - 1];
    const belowMinimum = await rawCompileCSource(main.source, main.name, {
      subset: previousSubset,
      includeSources
    });
    assert.equal(
      belowMinimum.ok,
      false,
      `${entry.label} also compiles at ${previousSubset}; declared minimum ${entry.minSubset} is too high.`
    );
  }
});

test("corrected C examples have observable results and honor the bitmap base", async () => {
  for (const [path, expectedOutput] of [
    ["hello_world.c", "Hello from C on webMARS!\n"],
    ["abi_stack_heap_demo.c", "52\n"],
    ["compiler_subset_s2_loops.c", "16 2 4\n"]
  ]) {
    const physicalPath = await resolveExampleFile("en", path);
    const compiled = await compileCSource(await readFile(physicalPath, "utf8"), path);
    const engine = await assembleSource(compiled.asm, compiled.generatedAsmName);
    assert.equal(runToHalt(engine), expectedOutput, `${path} produced unexpected output.`);
  }

  const bitmapProbe = await compileCSource(`
#use <bitmap_rect>
int main(void) {
  bitmap_configure_display(1, 1, 1, 1, 0x10040000);
  bitmap_put_pixel(0, 0, 1, 1, 0x12345678);
  return 0;
}
`, "bitmap-base-probe.c");
  const bitmapEngine = await assembleSource(bitmapProbe.asm, bitmapProbe.generatedAsmName);
  runToHalt(bitmapEngine);
  assert.equal(bitmapEngine.readWord(0x10040000) >>> 0, 0x12345678);
  assert.deepEqual({ ...bitmapEngine.getBitmapMmioConfig() }, {
    protocolVersion: 1,
    target: 1,
    displayWidth: 1,
    displayHeight: 1,
    unitWidth: 1,
    unitHeight: 1,
    baseAddress: 0x10040000,
    controlAddress: 0xffff0020
  });

  const appRuntimeSource = await readFile(
    resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"),
    "utf8"
  );
  assert.match(appRuntimeSource, /int _bitmap_base_address = \$\{MINI_C_BITMAP_DEFAULT_BASE\};/);
  assert.match(appRuntimeSource, /_bitmap_base_address = baseAddress;/);
  assert.match(appRuntimeSource, /void bitmap_configure_display\(/);
  assert.match(appRuntimeSource, /control\[8\] = 1;/);
  assert.match(appRuntimeSource, /return \(int\*\)_bitmap_base_address;/);
});

test("C examples cover native argv, the args library and project includes", async () => {
  const c1Path = await resolveExampleFile("en", "compiler_c1_native.c");
  const c1Source = await readFile(c1Path, "utf8");
  const rejectedC1 = await rawCompileCSource(c1Source, "compiler_c1_native.c", {
    subset: "C0-S4"
  });
  assert.equal(rejectedC1.ok, false, "The native example must not silently compile as C0-S4.");
  assert.match(formatDiagnostics(rejectedC1), /C1\/native|C1-NATIVE/i);
  assert.equal(rejectedC1.errors.length, 1, "A profile mismatch should be reported once without cascading errors.");
  assert.equal(rejectedC1.errors[0].code, "MC_SUBSET_MISMATCH");
  assert.equal(rejectedC1.errors[0].requiredSubset, "C1-NATIVE");
  assert.equal(rejectedC1.errors[0].currentSubset, "C0-S4");

  const rejectedC1AtS2 = await rawCompileCSource(c1Source, "compiler_c1_native.c", {
    subset: "C0-S2"
  });
  assert.equal(rejectedC1AtS2.ok, false, "The native example must not silently compile as C0-S2.");
  assert.equal(rejectedC1AtS2.errors.length, 1, "Lower profiles must not produce library diagnostic floods.");
  assert.equal(rejectedC1AtS2.errors[0].code, "MC_SUBSET_MISMATCH");
  assert.equal(rejectedC1AtS2.errors[0].requiredSubset, "C1-NATIVE");
  assert.equal(rejectedC1AtS2.errors[0].currentSubset, "C0-S2");

  const mixedDiagnostics = await rawCompileCSource(`
int main(void) {
  while (1) {
    break;
  }
  return missing_value;
}
`, "mixed-diagnostics.c", {
    subset: "C0-S0"
  });
  assert.equal(mixedDiagnostics.ok, false);
  assert.equal(mixedDiagnostics.errors[0].code, "MC_SUBSET_MISMATCH");
  assert.ok(
    mixedDiagnostics.errors.some((diagnostic) => /missing_value|unknown identifier/i.test(diagnostic.message)),
    "subset compaction must preserve independent semantic errors"
  );

  const compiledC1 = await compileCSource(c1Source, "compiler_c1_native.c", {
    subset: "C1-NATIVE"
  });
  const c1Engine = await assembleSource(
    compiledC1.asm,
    compiledC1.generatedAsmName,
    {},
    {
      programArgumentsEnabled: true,
      programArguments: "mul"
    }
  );
  const c1Output = runToHalt(c1Engine);
  assert.match(c1Output, /argc=1/);
  assert.match(c1Output, /argv\[0\]=mul/);
  assert.match(c1Output, /operation=multiply/);
  assert.match(c1Output, /result=42/);
  assert.match(c1Output, /buffer=byte-addressed length=14/);
  assert.match(c1Output, /void pointer value=42/);

  const argsPath = await resolveExampleFile("en", "args_library_demo.c");
  const argsSource = await readFile(argsPath, "utf8");
  const rejectedArgs = await rawCompileCSource(argsSource, "args_library_demo.c", {
    subset: "C0-S3"
  });
  assert.equal(rejectedArgs.ok, false, "The args example must retain its C0-S4 boundary.");

  const compiledArgs = await compileCSource(argsSource, "args_library_demo.c", {
    subset: "C0-S4"
  });
  const argsEngine = await assembleSource(
    compiledArgs.asm,
    compiledArgs.generatedAsmName,
    {},
    {
      programArgumentsEnabled: true,
      programArguments: "-verbose -repeat 3 -name Ada alpha beta"
    }
  );
  const argsOutput = runToHalt(argsEngine);
  assert.match(argsOutput, /name=Ada/);
  assert.match(argsOutput, /repeat=3/);
  assert.match(argsOutput, /verbose=true/);
  assert.match(argsOutput, /positional arguments=2\nalpha\nbeta/);

  const projectEntry = entries.find((entry) => entry.label === "c_multi_file_stats");
  assert.ok(projectEntry, "The multi-file C example must be present in the catalog.");
  const projectFiles = [];
  for (const spec of sourceSpecs(projectEntry)) {
    const physicalPath = await resolveExampleFile("en", spec.path);
    projectFiles.push({
      name: spec.path.replaceAll("\\", "/"),
      source: await readFile(physicalPath, "utf8"),
      main: spec.main === true
    });
  }
  const projectMain = projectFiles.find((file) => file.main);
  const projectSources = Object.fromEntries(projectFiles.map((file) => [file.name, file.source]));
  const rejectedProject = await rawCompileCSource(projectMain.source, projectMain.name, {
    subset: "C0-S1",
    includeSources: projectSources
  });
  assert.equal(rejectedProject.ok, false, "The multi-file arrays example must retain its C0-S2 boundary.");

  const compiledProject = await compileCSource(projectMain.source, projectMain.name, {
    subset: "C0-S2",
    includeSources: projectSources
  });
  const projectEngine = await assembleSource(compiledProject.asm, compiledProject.generatedAsmName);
  assert.equal(runToHalt(projectEngine), "sum=42\nmax=13\n");
});

test("new Assembly examples execute their defining behavior", async () => {
  const cop1Path = await resolveExampleFile("en", "cop1_arithmetic_demo.asm");
  const cop1 = await assembleSource(await readFile(cop1Path, "utf8"), "cop1_arithmetic_demo.asm");
  const cop1Output = runToHalt(cop1);
  assert.match(cop1Output, /1\.5 \+ 2\.25 = 3\.75/);
  assert.match(cop1Output, /1\.5 is less than 2\.25/);
  assert.match(cop1Output, /default FCSR mode = 2/);

  const exceptionPath = await resolveExampleFile("en", "exception_handler_recovery.asm");
  const exception = await assembleSource(
    await readFile(exceptionPath, "utf8"),
    "exception_handler_recovery.asm"
  );
  const exceptionOutput = runToHalt(exception);
  assert.match(exceptionOutput, /Recovered from the exception/);
  assert.match(exceptionOutput, /BadVAddr: 0x00000001/);

  const scavengerPath = await resolveExampleFile("en", "scavenger_hunt_player.asm");
  const scavenger = await assembleSource(
    await readFile(scavengerPath, "utf8"),
    "scavenger_hunt_player.asm"
  );
  for (let step = 0; step < 30; step += 1) {
    const result = scavenger.step({ includeSnapshot: false });
    assert.equal(result.ok, true);
  }
  assert.equal(scavenger.readWord(0xffffe008), 1);
  assert.equal(scavenger.readWord(0xffff8004), 200);
  assert.equal(scavenger.readWord(0xffff8014), 20);
  assert.equal(scavenger.readWord(0xffff801c) >>> 0, 0x00ff5a36);
});

test("Monty Hall video lab completes 1,000 games before entering a cooperative TTY wait", async () => {
  const source = await readFile(resolve(projectRoot, "videos/monty_hall_lab.asm"), "utf8");
  const engine = await assembleSource(source, "monty_hall_lab.asm", {
    maxBacksteps: 100
  });
  const receiverControl = 0xffff0000;
  const receiverData = 0xffff0004;
  const transmitterControl = 0xffff0008;

  engine.writeByte(transmitterControl, 1);
  engine.writeByte(receiverData, "2".charCodeAt(0));
  engine.writeByte(receiverControl, 1);
  const detachReceiver = engine.registerMemoryObserver({
    start: receiverData,
    end: receiverData,
    onRead() {
      engine.writeByte(receiverControl, 0);
      engine.writeByte(receiverData, 0);
    }
  });

  let waitResult = null;
  for (let step = 0; step < 40000; step += 1) {
    const result = engine.step({ includeSnapshot: false, includeMessage: false });
    assert.equal(result.ok, true, result.message || "Monty Hall execution failed.");
    if (result.sleepMs > 0) {
      waitResult = result;
      break;
    }
  }
  detachReceiver();

  assert.ok(waitResult, "The simulation must reach its cooperative terminal wait.");
  assert.equal(waitResult.sleepMs, 16);
  assert.ok(engine.steps < 40000, "The 1,000-game simulation must finish without an instruction runaway.");
  assert.equal(engine.registers[16] | 0, 1000);
  assert.equal((engine.registers[17] | 0) + (engine.registers[18] | 0), 1000);
  assert.equal(engine.registers[19] | 0, 1000);

  const snapshot = engine.getSnapshot({
    includeTextRows: false,
    includeLabels: false,
    includeDataRows: false,
    includeRegisters: false,
    includeMemoryWords: false
  });
  assert.equal(snapshot.backstepDepth, 100);
  const stepsBeforeBackstep = engine.steps;
  const backstep = engine.backstep();
  assert.equal(backstep.ok, true);
  assert.equal(engine.steps, stepsBeforeBackstep - 1);
});

test("cache benchmark executes one uncontaminated 1024-load pattern per run", async () => {
  const cachePath = await resolveExampleFile("en", "cache_stride_benchmark.asm");
  const sequentialSource = await readFile(cachePath, "utf8");
  const stridedSource = sequentialSource.replace(
    ".eqv ACCESS_PATTERN 1",
    ".eqv ACCESS_PATTERN 2"
  );

  const observations = [];
  for (const [name, source] of [
    ["sequential", sequentialSource],
    ["strided", stridedSource]
  ]) {
    const engine = await assembleSource(source, `cache-${name}.asm`);
    const addresses = [];
    engine.registerMemoryObserver({
      start: 0x10010000,
      end: 0x10010fff,
      onRead(event) {
        addresses.push(event.address >>> 0);
      }
    });
    runToHalt(engine, 20000);
    assert.equal(addresses.length, 1024, `${name} pattern must perform exactly 1024 data loads.`);
    observations.push(addresses);
  }

  assert.deepEqual(observations[0].slice(0, 3), [0x10010000, 0x10010004, 0x10010008]);
  assert.deepEqual(observations[1].slice(0, 3), [0x10010000, 0x10010040, 0x10010080]);
});

test("interactive MMIO examples yield cooperatively in every language", async () => {
  const interactiveExamples = [
    "tty_mmio_direct_debug.asm",
    "keyboard_display_mmio_echo.asm",
    "digital_lab_sim_demo.asm"
  ];

  for (const language of languages) {
    for (const logicalPath of interactiveExamples) {
      const path = await resolveExampleFile(language, logicalPath);
      const source = await readFile(path, "utf8");
      const engine = await assembleSource(source, `${language}/${logicalPath}`);
      let sleepResult = null;

      for (let step = 0; step < 2000; step += 1) {
        const result = engine.step({ includeSnapshot: false, includeMessage: false });
        assert.equal(result.ok, true, result.message || `${language}/${logicalPath} failed.`);
        if (result.sleepMs > 0) {
          sleepResult = result;
          break;
        }
      }

      assert.ok(sleepResult, `${language}/${logicalPath} must yield instead of busy-polling.`);
      assert.equal(sleepResult.sleepMs, 4);
      assert.ok(engine.steps < 2000, `${language}/${logicalPath} took too long to reach its wait.`);
    }
  }
});

test("Digital Lab examples debounce a held key without returning to busy polling", async () => {
  for (const language of languages) {
    const path = await resolveExampleFile(language, "digital_lab_sim_demo.asm");
    const source = await readFile(path, "utf8");
    const engine = await assembleSource(source, `${language}/digital_lab_debounce.asm`);

    let initialWait = null;
    for (let step = 0; step < 200; step += 1) {
      const result = engine.step({ includeSnapshot: false, includeMessage: false });
      assert.equal(result.ok, true);
      if (result.sleepMs > 0) {
        initialWait = result;
        break;
      }
    }
    assert.equal(initialWait?.sleepMs, 4);

    engine.writeByte(0xffff0014, 0x22);
    const startStep = engine.steps;
    let heldKeyWait = null;
    for (let step = 0; step < 200; step += 1) {
      const result = engine.step({ includeSnapshot: false, includeMessage: false });
      assert.equal(result.ok, true);
      if (result.sleepMs > 0) {
        heldKeyWait = result;
        break;
      }
    }

    assert.equal(engine.readByte(0xffff0010, false), 0x6d);
    assert.equal(heldKeyWait?.sleepMs, 4);
    assert.ok(engine.steps - startStep < 200, `${language} did not debounce the held key.`);
  }
});

test("cache benchmark instructions enable collection in every language", async () => {
  for (const language of languages) {
    const path = await resolveExampleFile(language, "cache_stride_benchmark.asm");
    const source = await readFile(path, "utf8");
    assert.match(source, /connect|ligue|conectela/i);
    assert.match(source, /\bEnabled\b/);
  }
});
