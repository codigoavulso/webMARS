import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import { createJavaScriptEngine, projectRoot } from "./helpers/engines.mjs";

const examplesRoot = resolve(projectRoot, "examples");
const manifest = JSON.parse((await readFile(resolve(examplesRoot, "examples.json"), "utf8")).replace(/^﻿/, ""));
const lessons = manifest.examples.filter((entry) => entry.category === "Lessons");

function runToHalt(engine, maxSteps = 200000) {
  let output = "";
  for (let step = 0; step < maxSteps && !engine.getSnapshot().halted; step += 1) {
    const result = engine.step({ includeSnapshot: false });
    assert.equal(result.ok, true, result.message || "Execution failed.");
    assert.notEqual(result.waitingForInput, true, "A lesson must not wait for input.");
    if (result.runIo) output += result.message;
  }
  assert.equal(engine.getSnapshot().halted, true, `Program exceeded ${maxSteps} instructions.`);
  return output;
}

// Lessons live under a per-language folder; only their commentary is
// translated, so every localized copy has to print the same result.
async function resolveLesson(language, fileName) {
  const localized = resolve(examplesRoot, language, fileName);
  try {
    await access(localized);
    return localized;
  } catch {
    throw new Error(`Missing lesson '${fileName}' for language '${language}'.`);
  }
}

async function runLesson(language, fileName) {
  const source = await readFile(await resolveLesson(language, fileName), "utf8");
  const engine = await createJavaScriptEngine({
    settings: { startAtMain: true, maxMemoryBytes: 0x7fffffff }
  });
  const assembled = engine.assemble(source, { sourceName: fileName });
  assert.equal(assembled.ok, true, `${language}/${fileName} did not assemble.`);
  return runToHalt(engine);
}

test("the lesson series is numbered, ordered and complete", () => {
  assert.equal(lessons.length, 15, "There should be fifteen lessons.");
  lessons.forEach((entry, index) => {
    const expected = String(index + 1).padStart(2, "0");
    assert.ok(
      entry.label.startsWith(`${expected} - `),
      `Lesson ${index + 1} is labelled '${entry.label}'.`
    );
    assert.match(entry.path, /^lesson\d\d_[a-z0-9_]+\.asm$/);
  });
});

test("the manifest declares exactly the localizations that exist on disk", async () => {
  // The loader probes a language folder only when the entry claims one, and
  // skips it entirely for a file marked shared. A manifest that disagrees with
  // the tree therefore either fires 404s or silently loses a translation.
  const languages = manifest.languages;

  // Nested examples live in subdirectories, so this has to recurse: a flat
  // listing reports every nested file as missing, which is exactly the mistake
  // that let a wrong manifest through.
  async function walk(directory, prefix = "") {
    const found = new Set();
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        for (const nested of await walk(resolve(directory, entry.name), relative)) found.add(nested);
      } else {
        found.add(relative);
      }
    }
    return found;
  }

  const present = {};
  for (const language of languages) {
    present[language] = await walk(resolve(examplesRoot, language));
  }

  for (const entry of manifest.examples) {
    const specs = Array.isArray(entry.files) ? entry.files : [{ path: entry.path, main: true }];
    const main = specs.find((file) => file.main === true) || specs[0];
    const actual = languages.filter((language) => present[language].has(main.path));
    const declared = Array.isArray(entry.languages) ? entry.languages : [];

    assert.deepEqual(
      declared,
      actual,
      `'${entry.label}' declares ${JSON.stringify(declared)} but the tree holds ${JSON.stringify(actual)}.`
    );

    for (const spec of specs) {
      if (spec.main === true) continue;
      const localized = declared.some((language) => present[language].has(spec.path));
      assert.equal(
        spec.shared === true,
        !localized,
        `'${entry.label}' file '${spec.path}' is ${localized ? "localized but marked shared" : "language-neutral but not marked shared"}.`
      );
    }
  }
});

test("every lesson halts on its own and prints its result", async () => {
  // A lesson that needs a tool still has to run without one, otherwise the
  // reader cannot see the point being made.
  const expected = {
    "lesson01_registers.asm": /12 \+ 30 = 42/,
    "lesson02_twos_complement.asm": /zero minus 5 = -5[\s\S]*add 1 = -5/,
    "lesson03_logic_gates.asm": /AND keeps the low nibble: 12[\s\S]*OR sets the low nibble:   207[\s\S]*XOR flips the low nibble: 195/,
    "lesson04_shifts.asm": /5 << 3 = 40[\s\S]*arithmetic = -4[\s\S]*logical    = 1073741820/,
    "lesson05_comparator.asm": /a is smaller/,
    "lesson06_loop_counter.asm": /1 2 3 4 5 6 7 8 9 10/,
    "lesson07_memory_words.asm": /read back: 111 222 333/,
    "lesson08_bytes_endianness.asm": /bytes from low address: 1 2 3 4/,
    "lesson09_array_indexing.asm": /sum = 150/,
    "lesson10_stack.asm": /restored: 7 9/,
    "lesson11_function_call.asm": /max\(17, 42\) = 42/,
    "lesson12_recursion.asm": /5! = 120/,
    "lesson13_instruction_encoding.asm": /^$/,
    "lesson14_ieee754.asm": /3\.5 \+ 1\.25 = 4\.75/,
    "lesson15_memory_hierarchy.asm": /stride 1 sum = 0[\s\S]*stride 16 sum = 0/
  };

  for (const entry of lessons) {
    for (const language of entry.languages) {
      const output = await runLesson(language, entry.path);
      assert.match(output, expected[entry.path], `${language}/${entry.path} printed:\n${output}`);
    }
  }
});
