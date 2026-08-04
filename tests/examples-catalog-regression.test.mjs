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
    // Contract annotations are compiler input, not prose to translate.
    if (!comment || comment.startsWith("@")) return [];
    if (!isAssembly && comment.startsWith("#use")) return [];
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

async function assembleMarsOs(language = "en", settings = {}) {
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
    settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff, maxBacksteps: 0, ...settings }
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

function runMarsOs(engine, maxSteps = 1_000_000, options = {}) {
  // engine.go() rebuilds a full snapshot on every instruction, which turns the
  // longer MARS-OS sessions into minutes of work. Stepping without snapshots
  // keeps these tests to a couple of seconds each.
  let steps = 0;
  for (; steps < maxSteps; steps += 1) {
    const result = engine.step({ includeSnapshot: false });
    assert.equal(result.ok, true, result.message || "MARS-OS execution failed.");
    assert.notEqual(result.waitingForInput, true, "Unexpected console input request.");
    if (result.done === true || result.haltReason) break;
  }
  const snapshot = engine.getSnapshot({ includeProgram: false, includeBreakpoints: false });
  // The desktop never halts on its own: it idles in the cooperative TTY wait.
  if (options.allowIdle !== true) {
    assert.equal(snapshot.halted, true, `MARS-OS did not halt within ${maxSteps} instructions.`);
  }
  return steps;
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

test("every teaching example keeps its explanatory comments localized in every language", async () => {
    // The whole catalogue is teaching material now, so every category is checked.
  const teachingEntries = entries.filter((entry) => [
    "Lessons", "Fundamentals", "Algorithms", "C and compilation", "Devices and system"
  ].includes(entry.category));
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

      // A shared file ships as a single copy for every language, so there is
      // nothing to compare against; only its English explanation is required.
      const localized = Array.isArray(entry.languages) && entry.languages.length > 1 && spec.shared !== true;
      for (const language of (localized ? languages.filter((value) => value !== "en") : [])) {
        const localizedPath = await resolveExampleFile(language, spec.path);
        const localizedComments = teachingComments(await readFile(localizedPath, "utf8"), spec.path);
        const allowedLineDifference = 1;
        assert.ok(
          localizedComments.length >= englishComments.length - allowedLineDifference,
          `${spec.path} (${language}) lost explanatory comments from the English lesson.`
        );
        const localizedText = localizedComments.join("\n");
        assert.notEqual(localizedText, englishComments.join("\n"), `${spec.path} (${language}) was not localized.`);
        if (["es", "pt"].includes(language)) {
          assert.doesNotMatch(
            localizedText,
            untranslatedEnglish,
            `${spec.path} (${language}) still contains an English teaching comment.`
          );
        }
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
    "tcalc 0x20 + 22\r\ncat motd\r\ncolor yellow\r\nclock\r\nsysinfo\r\nhistory\r\nshutdown\r\n"
  );
  // Booting paints one desktop frame before the shortcut opens Terminal.
  const steps = runMarsOs(engine, 900_000);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  assert.ok(steps < 700_000, "The shell session used unexpectedly many instructions.");
  assert.match(tty.output, /MARS-OS 1\.0/);
  assert.match(tty.output, /RAM disk mounted: 5 files, \d+ bytes/);
  assert.match(tty.output, /result: 54 \(0x00000036\)/);
  assert.match(tty.output, /Learn the machine by building the machine\./);
  assert.match(tty.output, /\x1b\[93mguest@webmars:\/\$ /);
  const clockMatch = tty.output.match(/clock epoch: (0x[0-9a-f]{8}) \/ (0x[0-9a-f]{8})/i);
  assert.ok(clockMatch, "The clock command must print the native 64-bit epoch.");
  assert.notEqual(BigInt(`${clockMatch[1]}${clockMatch[2].slice(2)}`), 0n);
  assert.match(tty.output, /timer device: inactive/);
  assert.match(tty.output, /uptime: \d+ ms/);
  assert.match(tty.output, /commands executed: 5/);
  assert.match(tty.output, /commands installed: 46/);
  assert.match(tty.output, /1  calc 0x20 \+ 22/);
  assert.match(tty.output, /6  history/);
  assert.match(tty.output, /System halted/);
  assert.equal(
    (tty.output.match(/guest@webmars:\/\$ /g) || []).length,
    7,
    "CR LF must be consumed as one logical Enter, without duplicate prompts."
  );

  const libSource = await readFile(resolve(examplesRoot, "mips_os_lib.asm"), "utf8");
  assert.match(libSource, /tty_getc_wait:[\s\S]*?li\s+\$a0,\s*4[\s\S]*?syscall/);
  for (const language of languages) {
    const mainSource = await readFile(await resolveExampleFile(language, "mips.asm"), "utf8");
    for (const module of ["lib", "fs", "apps", "edit", "sheet", "basic", "desktop", "kernel"]) {
      assert.match(mainSource, new RegExp(`\.include "mips_os_${module}\.asm"`));
    }
    assert.match(mainSource, /cmd_clock:\s*\.asciiz "clock"/);
    assert.match(mainSource, /cmd_bench:\s*\.asciiz "bench"/);
    assert.match(mainSource, /cmd_edit:\s*\.asciiz "edit"/);
    assert.match(mainSource, /cmd_sheet:\s*\.asciiz "sheet"/);
    assert.match(mainSource, /cmd_basic:\s*\.asciiz "basic"/);
    assert.match(mainSource, /cmd_exit:\s*\.asciiz "exit"/);
    assert.doesNotMatch(mainSource, /Bitmap Display|framebuffer/i);
  }
});

// The desktop composes into a cell buffer before it writes anything, so the
// assertions read that buffer rather than trying to unpick the ANSI stream.
function readScreen(engine) {
  const snapshot = engine.getSnapshot({ includeTextRows: false });
  const at = (name) => (snapshot.labels.find((label) => label.label === name) || {}).address >>> 0;
  const chars = at("scr_char");
  const rows = [];
  for (let row = 0; row < 25; row += 1) {
    let line = "";
    for (let column = 0; column < 80; column += 1) {
      const byte = engine.getByte(chars + row * 80 + column) & 0xff;
      line += byte >= 32 && byte < 127 ? String.fromCharCode(byte) : " ";
    }
    rows.push(line);
  }
  return rows;
}

function windowTable(engine) {
  const snapshot = engine.getSnapshot({ includeTextRows: false });
  const at = (name) => (snapshot.labels.find((label) => label.label === name) || {}).address >>> 0;
  const word = (name, index) => engine.readWord((at(name) + index * 4) >>> 0) | 0;
  return Array.from({ length: 6 }, (_, index) => ({
    kind: word("win_kind", index),
    row: word("win_row", index),
    column: word("win_col", index),
    width: word("win_w", index),
    height: word("win_h", index)
  }));
}

// SGR reports: press, release, and drag motion while the button is held.
const press = (column, row) => `\x1b[<0;${column};${row}M`;
const release = (column, row) => `\x1b[<0;${column};${row}m`;
const dragTo = (column, row) => `\x1b[<32;${column};${row}M`;
const clickAt = (column, row) => press(column, row) + release(column, row);

test("MARS-OS desktop composites overlapping windows without corrupting them", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(engine, "");
  runMarsOs(engine, 1_500_000, { allowIdle: true });
  const screen = readScreen(engine);
  tty.detach();

  assert.match(screen[0], /System\s+Programs\s+Windows\s+Help/);
  // Program Manager sits behind About; both frames stay intact.
  assert.match(screen[2], /\+ Program Manager\s+\[X\]\+/);
  assert.match(screen[8], /\+ About\s+\[X\]\+/);
  assert.match(screen.join("\n"), /MARS-OS windowed desktop/);
  // The launcher icons and their labels line up under the frame.
  assert.match(screen[5], /Terminal\s+Text editor\s+Spreadsheet/);
  assert.match(screen[24], /^\[ Start \]\s+Program\s+About/);
});

test("MARS-OS desktop opens pull down menus and one level of submenus", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    clickAt(12, 1)      // Programs
      + clickAt(14, 7)  // Utilities, which owns a submenu
  );
  runMarsOs(engine, 2_500_000, { allowIdle: true });
  const screen = readScreen(engine);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  assert.match(screen[2], /\| Terminal/);
  // Entries that open a submenu are marked, and the submenu sits beside them.
  assert.match(screen[6], /\| Utilities\s+> \+-+\+/);
  assert.match(screen[7], /\| ASCII table/);
  assert.match(screen[8], /\| Game of Life/);
});

test("MARS-OS Start menu opens above the taskbar and reaches every application group", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    clickAt(5, 25)       // Start
      + clickAt(5, 21)   // Utilities, which owns the longest submenu
  );
  runMarsOs(engine, 2_500_000, { allowIdle: true });
  const screen = readScreen(engine);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  assert.match(screen[24], /^\[ Start \]/);
  assert.match(screen.join("\n"), /\| Terminal/);
  assert.match(screen.join("\n"), /\| Text editor/);
  assert.match(screen.join("\n"), /\| Spreadsheet/);
  assert.match(screen.join("\n"), /\| BASIC/);
  assert.match(screen.join("\n"), /\| ASCII table/);
  assert.match(screen.join("\n"), /\| Fibonacci/);
});

test("MARS-OS desktop windows can be dragged and resized with the mouse", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    // Grab the About title bar and drop it lower and further left.
    press(30, 9) + dragTo(22, 14) + release(22, 14)
      // Then pull the bottom right grip inwards.
      + press(67, 23) + dragTo(40, 20) + release(40, 20)
      // Finally try to throw the resized window beyond the lower-right edge.
      + press(20, 14) + dragTo(80, 24) + release(80, 24)
  );
  runMarsOs(engine, 3_000_000, { allowIdle: true });
  const windows = windowTable(engine);
  const screen = readScreen(engine);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  const about = windows.find((entry) => entry.kind === 2);
  assert.ok(about, "The About window must still be open.");
  assert.deepEqual(
    { row: about.row, column: about.column },
    { row: 18, column: 54 },
    "Dragging keeps the grab offset but clamps the complete window to the desktop."
  );
  assert.deepEqual(
    { width: about.width, height: about.height },
    { width: 27, height: 7 },
    "The corner grip resizes the window."
  );
  // The frame reaches, but never crosses, the final usable row and column.
  assert.match(screen[17], /\+ About\s+\[X\]\+$/);
  assert.equal(screen[23].at(-1), "#");
});

test("MARS-OS desktop closes windows and tiles what is left", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    clickAt(73, 9)       // the [X] of About
      + "c"             // open the command browser
      + clickAt(24, 1)  // Windows menu
      + clickAt(26, 7)  // Tile
  );
  runMarsOs(engine, 3_000_000, { allowIdle: true });
  const windows = windowTable(engine).filter((entry) => entry.kind !== 0);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  assert.equal(windows.some((entry) => entry.kind === 2), false, "About was closed.");
  assert.equal(windows.length, 2);
  for (const entry of windows) assert.equal(entry.row, 2, "Tiling aligns the tops.");
  assert.notEqual(windows[0].column, windows[1].column, "Tiling spreads the columns.");
});

test("MARS-OS tiles six windows into a bounded 3 by 2 grid", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    "fcih"               // open Files, Commands, System, and Help
      + clickAt(24, 1)   // Windows menu
      + clickAt(26, 7)   // Tile
  );
  runMarsOs(engine, 4_500_000, { allowIdle: true });
  const windows = windowTable(engine).filter((entry) => entry.kind !== 0);
  const screen = readScreen(engine);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  assert.equal(windows.length, 6);
  for (const entry of windows) {
    assert.ok(entry.row >= 2 && entry.column >= 1, "Every tiled window starts inside the desktop.");
    assert.ok(entry.row + entry.height - 1 <= 24, "Every tiled window ends above the taskbar.");
    assert.ok(entry.column + entry.width - 1 <= 80, "Every tiled window ends inside column 80.");
  }
  const geometry = windows
    .map(({ row, column, width, height }) => `${row},${column},${width},${height}`)
    .sort();
  assert.deepEqual(geometry, [
    "13,1,26,12",
    "13,27,26,12",
    "13,53,28,12",
    "2,1,26,11",
    "2,27,26,11",
    "2,53,28,11"
  ]);
  assert.match(screen[24], /^\[ Start \]\s+Program\s+About\s+File Man\s+Commands\s+System\s+Help/);
});

test("MARS-OS desktop launches applications and repaints on return", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    clickAt(12, 1)        // Programs
      + clickAt(14, 8)    // File manager
      + clickAt(20, 10)   // demo.bas, which belongs to BASIC
      + "RUN\rBYE\r"      // run the program, then leave the interpreter
      + clickAt(12, 1)
      + clickAt(14, 3)    // Terminal
      + "shutdown\r"
  );
  runMarsOs(engine, 6_000_000);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  // All-motion reporting powers menu hover; full-screen apps fall back to click tracking.
  assert.match(tty.output, /\x1b\[\?1003h\x1b\[\?1006h/);
  // The file manager lists the real RAM disk.
  assert.match(tty.output, /demo\.bas/);
  // Clicking a .bas row opens it in BASIC rather than the text editor.
  assert.match(tty.output, /loaded 10 lines/);
  assert.match(tty.output, /N {7}N\*N {5}TOTAL\r\n1 {7}1 {7}1/);
  assert.match(tty.output, /TOTAL IS LARGE/);
  assert.match(tty.output, /\x1b\[\?1003l\x1b\[\?1000h\x1b\[\?1006h/);
  assert.match(tty.output, /System halted/);
});

test("MARS-OS boots from the lowest text address without the start-at-main shortcut", async () => {
  // The app does not force execution to begin at main, so the reset vector has
  // to be the first instruction the assembler emits.
  const engine = await assembleMarsOs("en", { startAtMain: false });
  const snapshot = engine.getSnapshot({ includeTextRows: false });
  const entry = snapshot.labels.find((label) => label.label === "main");
  assert.ok(entry, "MARS-OS must export a main label.");
  assert.equal(entry.address >>> 0, snapshot.pc >>> 0, "main must sit at the reset address.");

  const tty = attachTtyHarness(engine, "tls\rshutdown\r");
  runMarsOs(engine, 200_000);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  assert.match(tty.output, /RAM disk mounted: 5 files/);
  assert.match(tty.output, /readme\.txt\s+188\s+4/);
});

test("MARS-OS RAM disk supports the full create, inspect and remove cycle", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    "t" + [
      "write list.txt zebra",
      "append list.txt alpha",
      "wc list.txt",
      "sort list.txt",
      "grep alpha list.txt",
      "cp motd copy.txt",
      "mv copy.txt greeting.txt",
      "ls",
      "df",
      "rm greeting.txt",
      "ls",
      "shutdown"
    ].join("\r") + "\r"
  );
  runMarsOs(engine, 1_000_000);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  assert.match(tty.output, /lines: 2  words: 2  bytes: 12/);
  // sort never rewrites the file, it only prints the ordered lines.
  assert.match(tty.output, /alpha\r\nzebra/);
  assert.match(tty.output, /2: alpha/);
  assert.match(tty.output, /greeting\.txt\s+43\s+1/);
  assert.match(tty.output, /files: 7 of 16/);
  const afterRemoval = tty.output.slice(tty.output.lastIndexOf("rm greeting.txt"));
  assert.doesNotMatch(afterRemoval, /greeting\.txt\s+43/);
});

test("MARS-OS editor writes a new file back to the RAM disk", async () => {
  const engine = await assembleMarsOs("en");
  // ESC followed by x is the save-and-exit entry of the editor menu.
  const tty = attachTtyHarness(
    engine,
    "tedit demo.txt\rline one\rline two\x1bxwc demo.txt\rcat demo.txt\rshutdown\r"
  );
  runMarsOs(engine, 3_000_000);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  assert.match(tty.output, /\x1b\[7m MARS-OS edit   demo\.txt/);
  assert.match(tty.output, /line 2   column 9   bytes 17\/1023/);
  assert.match(tty.output, /edit: closed demo\.txt, 17 bytes/);
  assert.match(tty.output, /lines: 2  words: 4  bytes: 17/);
  assert.match(tty.output, /line one\r\nline two/);
});

test("MARS-OS spreadsheet evaluates formulas and round-trips through a text file", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    // Read the seeded sheet, then build a new one cell by cell and save it.
    "tsheet budget.sht\r\x1bq"
      + "sheet totals.sht\r10\r\x1b[B32\r\x1b[B=A1+A2\r\x1bx"
      + "cat totals.sht\rshutdown\r"
  );
  runMarsOs(engine, 6_000_000);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  // The seeded sheet totals 3*12 plus 2*45 through =SUM(D2:D3).
  assert.match(tty.output, /5TOTAL {27}126/);
  // A3 stays selected after the last entry, so its value is drawn inverted.
  assert.match(tty.output, /\x1b\[7m {6}42\x1b\[0m/);
  assert.match(tty.output, /cell A3   content: =A1\+A2/);
  assert.match(tty.output, /A1:10\r\nA2:32\r\nA3:=A1\+A2/);
});

test("MARS-OS BASIC edits, runs and saves a line numbered program", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    "t" + [
      "basic",
      // Immediate mode evaluates a statement without storing it.
      "PRINT 2 + 3 * 4, ABS(-9), 17 MOD 5",
      // A leading number edits the program instead of running anything.
      "10 LET T = 0",
      "20 FOR I = 1 TO 4",
      "30 GOSUB 100",
      "40 NEXT I",
      "50 IF T > 20 THEN PRINT \"BIG\"",
      "60 END",
      "100 LET T = T + I * I",
      "110 PRINT I; \" -> \"; T",
      "120 RETURN",
      "RUN",
      "SAVE squares.bas",
      "NEW",
      "LIST",
      "LOAD squares.bas",
      "RUN",
      "BYE",
      "cat squares.bas",
      "shutdown"
    ].join("\r") + "\r"
  );
  runMarsOs(engine, 2_000_000);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  // Precedence, the built-in functions and the comma print zones.
  assert.match(tty.output, /14 {6}9 {7}2/);
  // GOSUB, FOR/NEXT and IF/THEN over the stored program.
  assert.match(tty.output, /1 -> 1\r\n2 -> 5\r\n3 -> 14\r\n4 -> 30\r\nBIG/);
  // NEW empties the program, and LOAD brings the saved listing back.
  const afterNew = tty.output.slice(tty.output.indexOf("NEW"));
  assert.match(afterNew, /loaded 9 lines/);
  assert.match(afterNew, /1 -> 1\r\n2 -> 5\r\n3 -> 14\r\n4 -> 30\r\nBIG/);
  // The saved file is the listing itself, readable by cat and edit.
  assert.match(tty.output, /10 LET T = 0\r\n20 FOR I = 1 TO 4\r\n30 GOSUB 100/);
});

test("MARS-OS BASIC reports errors and can be interrupted with Ctrl-C", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(
    engine,
    "tbasic\rPRINT 1/0\rGOTO 999\r10 PRINT \"X\"\r20 GOTO 10\rRUN\r\x03LIST\rBYE\rshutdown\r"
  );
  runMarsOs(engine, 2_000_000);
  tty.detach();

  assert.equal(tty.remainingInput, 0);
  assert.match(tty.output, /\?DIVISION BY ZERO ERROR/);
  assert.match(tty.output, /\?UNDEFINED LINE ERROR/);
  // Ctrl-C leaves the run loop without losing the program.
  assert.match(tty.output, /BREAK/);
  assert.match(tty.output, /10 PRINT "X"\r\n {3}20 GOTO 10/);
  assert.match(tty.output, /basic: back to the shell/);
});

test("MARS-OS bench measures real instruction throughput over a timed sample", async () => {
  const engine = await assembleMarsOs("en");
  const tty = attachTtyHarness(engine, "tbench\rshutdown\r");
  runMarsOs(engine, 20_000_000);
  tty.detach();

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

test("a comment after a #use or #include directive does not drop the directive", async () => {
  // A trailing comment used to make the directive fall through to "unsupported
  // preprocessor directive", which silently removed the include from the program.
  const withComments = `#use <conio>   // the console library
#include "helper.h"   // declarations for the helper below
#use "helper.c"   /* and its implementation */

int main(void) {
  print_int(helper_double(21));
  print_char(10);
  return 0;
}
`;
  const compiled = await rawCompileCSource(withComments, "directive_comments.c", {
    includeSources: {
      "helper.h": "int helper_double(int value);\n",
      "helper.c": "#include \"helper.h\"\n\nint helper_double(int value) {\n  return value * 2;\n}\n"
    }
  });

  assert.equal(compiled.ok, true, `directives with comments failed:\n${formatDiagnostics(compiled)}`);
  const preprocessorWarnings = (compiled.warnings ?? [])
    .filter((entry) => /preprocessor directive/i.test(String(entry?.message ?? entry)));
  // The compiler runs inside a vm realm, so compare the count instead of the array.
  assert.equal(
    preprocessorWarnings.length,
    0,
    `a commented directive must not be reported as unsupported: ${JSON.stringify(compiled.warnings)}`
  );

  const engine = await assembleSource(compiled.asm, "directive_comments.s");
  const output = runToHalt(engine);
  assert.match(output, /42/, "the included helper has to be part of the program");
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

  const projectEntry = entries.find((entry) => entry.label === "A C project with several files");
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
  const englishPath = await resolveExampleFile("en", "cache_stride_benchmark.asm");
  const englishSource = await readFile(englishPath, "utf8");
  assert.match(englishSource, /connect it to MIPS.*Enabled/i);
  for (const language of languages) {
    const path = await resolveExampleFile(language, "cache_stride_benchmark.asm");
    const source = await readFile(path, "utf8");
    assert.match(source, /ACCESS_PATTERN/);
    if (language !== "en") {
      assert.notEqual(source, englishSource);
      assert.doesNotMatch(source, /connect it to MIPS.*Enabled/i);
    }
  }
});
