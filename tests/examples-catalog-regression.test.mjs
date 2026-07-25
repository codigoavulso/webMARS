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
  bitmap_set_base_address(0x10040000);
  bitmap_put_pixel(0, 0, 1, 1, 0x12345678);
  return 0;
}
`, "bitmap-base-probe.c");
  const bitmapEngine = await assembleSource(bitmapProbe.asm, bitmapProbe.generatedAsmName);
  runToHalt(bitmapEngine);
  assert.equal(bitmapEngine.readWord(0x10040000) >>> 0, 0x12345678);

  const appRuntimeSource = await readFile(
    resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js"),
    "utf8"
  );
  assert.match(appRuntimeSource, /int _bitmap_base_address = \$\{MINI_C_BITMAP_DEFAULT_BASE\};/);
  assert.match(appRuntimeSource, /_bitmap_base_address = baseAddress;/);
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
