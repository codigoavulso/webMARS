// Differential conformance against MARS 4.5.
//
// The behavioural comparison needs the reference jar and a JVM, neither of
// which is present in a plain clone or in CI. Those tests skip rather than
// fail - but skipping silently would let conformance rot unnoticed, so the
// checks that need no jar always run: the exception list must stay coherent,
// every declared difference must have a minimal case, and the published report
// must describe the pinned reference build.
//
// Enable the full comparison with:
//   npm run fetch:mars     (downloads and verifies MARS 4.5)
//   plus any JDK on PATH or in the usual install locations

import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";
import {
  INTENTIONAL_DIFFERENCES,
  classifyDifferences,
  compareData,
  compareRegisters,
  compareText,
  runDifferential,
  sourceDeclaresData
} from "../scripts/differential-mars.mjs";
import {
  MARS_REFERENCE,
  atomicReplaceFile,
  buildSourceManifest,
  referenceStatus,
  sourceManifestsMatch
} from "../scripts/fetch-mars-reference.mjs";

const differentialRoot = resolve(projectRoot, "tests/differential");
const reportPath = resolve(projectRoot, "docs/mars-conformance.md");

const expectations = JSON.parse(await readFile(resolve(differentialRoot, "expectations.json"), "utf8"));
const status = await referenceStatus();

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test("the reference simulator is pinned by checksum, not by name", () => {
  assert.equal(MARS_REFERENCE.version, "4.5");
  assert.match(MARS_REFERENCE.sha256, /^[0-9a-f]{64}$/);
  assert.equal(MARS_REFERENCE.licence, "MIT");
  assert.match(MARS_REFERENCE.url, /^https:\/\//);
});

test("the extracted reference manifest detects changed, missing and added sources", async () => {
  const sandbox = await mkdtemp(resolve(tmpdir(), "webmars-reference-"));
  try {
    await mkdir(resolve(sandbox, "mars"), { recursive: true });
    await writeFile(resolve(sandbox, "mars", "MarsLaunch.java"), "class MarsLaunch {}\n", "utf8");
    const original = await buildSourceManifest(sandbox);
    assert.equal(sourceManifestsMatch(original, await buildSourceManifest(sandbox)), true);

    await writeFile(resolve(sandbox, "mars", "MarsLaunch.java"), "class MarsLaunch { int changed; }\n", "utf8");
    assert.equal(sourceManifestsMatch(original, await buildSourceManifest(sandbox)), false);

    await writeFile(resolve(sandbox, "mars", "Unexpected.java"), "class Unexpected {}\n", "utf8");
    assert.equal(sourceManifestsMatch(original, await buildSourceManifest(sandbox)), false);
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

test("reference downloads replace an existing file atomically", async () => {
  const sandbox = await mkdtemp(resolve(tmpdir(), "webmars-reference-write-"));
  const target = resolve(sandbox, "Mars4_5.jar");
  try {
    await writeFile(target, "old", "utf8");
    await atomicReplaceFile(target, Buffer.from("verified-new"));
    assert.equal(await readFile(target, "utf8"), "verified-new");
    const leftovers = (await readdir(sandbox)).filter((name) => name.includes(".tmp-") || name.includes(".bak-"));
    assert.deepEqual(leftovers, []);
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

test("every declared intentional difference is complete and justified", () => {
  const ids = new Set();
  INTENTIONAL_DIFFERENCES.forEach((entry) => {
    assert.ok(entry.id, "an intentional difference needs an id");
    assert.equal(ids.has(entry.id), false, `duplicate intentional difference id: ${entry.id}`);
    ids.add(entry.id);
    assert.ok(["encoding", "registers", "diagnostics", "output"].includes(entry.scope), `unknown scope for ${entry.id}`);
    assert.ok(entry.summary.length > 20, `${entry.id} needs a real summary`);
    // A reason short enough to be a slogan is not a reason.
    assert.ok(entry.reason.length > 120, `${entry.id} needs a reason a reader could evaluate`);
  });
});

test("every difference an encoding exception excuses has a minimal case on disk", async () => {
  for (const entry of INTENTIONAL_DIFFERENCES) {
    if (entry.scope !== "encoding") continue;
    assert.ok(entry.minimalCase, `${entry.id} excuses an encoding difference and must name a minimal case`);
    assert.ok(await exists(resolve(projectRoot, entry.minimalCase)), `${entry.minimalCase} does not exist`);
    const source = await readFile(resolve(projectRoot, entry.minimalCase), "utf8");
    assert.match(source, /^#/, "a minimal case must open with a comment explaining what it isolates");
    assert.ok(source.includes("MARS"), "a minimal case must say what MARS does differently");
  }
});

test("the expectations manifest only claims differences that are declared", () => {
  assert.equal(expectations.schema, "webmars.differential-expectations/2");
  const declared = new Set(INTENTIONAL_DIFFERENCES.map((entry) => entry.id));
  Object.entries(expectations.programs).forEach(([program, declarations]) => {
    assert.ok(Array.isArray(declarations) && declarations.length, `${program} declares an empty exception list`);
    declarations.forEach((declaration) => {
      assert.ok(declared.has(declaration.id), `${program} claims undeclared difference '${declaration.id}'`);
      assert.ok(Array.isArray(declaration.textWords) && declaration.textWords.length,
        `${program}/${declaration.id} must name exact text words`);
      declaration.textWords.forEach((word) => {
        assert.ok(Number.isInteger(word.offset) && word.offset >= 0 && word.offset % 4 === 0,
          `${program}/${declaration.id} has an invalid offset`);
        assert.match(word.mars, /^[0-9a-f]{8}$/i);
        assert.match(word.web, /^[0-9a-f]{8}$/i);
      });
    });
  });
});

test("data directives are detected with a word boundary and memory mismatches fail", async () => {
  const runnerSource = await readFile(resolve(projectRoot, "scripts/differential-mars.mjs"), "utf8");
  assert.equal(runnerSource.includes("\u0008"), false, "the runner must not contain a backspace in place of regex \\b");
  assert.equal(sourceDeclaresData("  .data\nvalue: .word 1"), true);
  assert.equal(sourceDeclaresData("  .database\n"), false, "the boundary must not accept longer directive names");

  const differences = compareData(["00000001"], { readWord: () => 2 }, 0x10010000);
  assert.equal(differences.length, 1, "a different webMARS memory word must fail comparison");
  assert.equal(differences[0].kind, "data-word");
  assert.equal(differences[0].address, 0x10010000);
  assert.equal(differences[0].mars, "00000001");
  assert.equal(differences[0].web, "00000002");
});

test("pointer registers are compared by their real movement from each simulator's baseline", () => {
  const names = [
    "$zero", "$at", "$v0", "$v1", "$a0", "$a1", "$a2", "$a3",
    "$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7",
    "$s0", "$s1", "$s2", "$s3", "$s4", "$s5", "$s6", "$s7",
    "$t8", "$t9", "$k0", "$k1", "$gp", "$sp", "$fp", "$ra"
  ];
  const registers = (overrides = {}) => Object.assign(Object.fromEntries(names.map((name) => [name, 0])), overrides);
  const marsInitial = registers({ $gp: 3000, $sp: 1000, $fp: 2000 });
  const webInitial = registers({ $gp: 7000, $sp: 5000, $fp: 6000 });
  const marsFinal = registers({ $gp: 3000, $sp: 900, $fp: 2016 });
  const webFinal = registers({ $gp: 7000, $sp: 4900, $fp: 6016 });

  assert.deepEqual(compareRegisters(marsFinal, webFinal, marsInitial, webInitial), [],
    "different absolute bases with equal deltas must agree");
  webFinal.$sp = 4896;
  const differences = compareRegisters(marsFinal, webFinal, marsInitial, webInitial);
  assert.equal(differences.filter((entry) => entry.kind === "register-delta").length, 1);
  assert.match(differences.find((entry) => entry.kind === "register-delta").detail, /^\$sp:/);
});

test("an encoding declaration excuses only its exact offset and exact pair of words", () => {
  const exact = compareText(["aaaaaaaa"], ["bbbbbbbb"]);
  const declaration = [{
    id: "example",
    textWords: [{ offset: 0, mars: "aaaaaaaa", web: "bbbbbbbb" }]
  }];
  assert.equal(classifyDifferences(exact, declaration).explained.length, 1);
  assert.equal(classifyDifferences(exact, declaration).unexplained.length, 0);

  const unexpectedWord = [{ id: "example", textWords: [{ offset: 0, mars: "aaaaaaaa", web: "cccccccc" }] }];
  assert.equal(classifyDifferences(exact, unexpectedWord).unexplained.length, 1,
    "a new word at a declared offset must still fail");
  const unexpectedOffset = compareText(["00000000", "aaaaaaaa"], ["00000000", "bbbbbbbb"]);
  assert.equal(classifyDifferences(unexpectedOffset, declaration).unexplained.length, 1,
    "the same word pair at an undeclared offset must still fail");
  const changedLength = compareText(["aaaaaaaa"], ["bbbbbbbb", "cccccccc"]);
  const classifiedLength = classifyDifferences(changedLength, declaration);
  assert.ok(classifiedLength.explained.some((difference) => difference.kind === "text-word"));
  assert.ok(classifiedLength.unexplained.some((difference) => difference.kind === "text-length"),
    "an exact word exception must never excuse a changed text-segment length");
});

test("every program named in the manifest exists in the corpus", async () => {
  const programs = await readdir(resolve(differentialRoot, "programs"));
  Object.keys(expectations.programs).forEach((name) => {
    assert.ok(programs.includes(name), `expectations name ${name}, which is not in the corpus`);
  });
  assert.ok(programs.filter((name) => name.endsWith(".asm")).length >= 10,
    "the corpus should cover more than a handful of programs");
});

test("the published conformance report describes the pinned reference", async () => {
  assert.ok(await exists(reportPath), "docs/mars-conformance.md must be committed");
  const report = await readFile(reportPath, "utf8");
  const version = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version;

  assert.ok(report.includes(MARS_REFERENCE.sha256), "the report must name the checksum it was produced against");
  assert.ok(report.includes(`for webMARS ${version}`), "the report must name the webMARS version");
  assert.match(report, /## What is compared/);
  assert.match(report, /## Rules for intentional differences/);
  assert.match(report, /## Limitations/);
  // Every declared exception must appear, so the report cannot understate them.
  INTENTIONAL_DIFFERENCES.forEach((entry) => {
    assert.ok(report.includes(entry.id), `the report omits the declared difference ${entry.id}`);
  });
});

test("webMARS matches MARS 4.5 on every program in the corpus", { skip: status.canRun ? false : `MARS reference unavailable (${status.jarPresent ? "no Java runtime" : "jar not fetched"}); run npm run fetch:mars` }, async () => {
  const result = await runDifferential();
  assert.equal(result.skipped, false);

  const unexplained = result.cases.filter((entry) => !entry.conformant);
  const detail = unexplained
    .map((entry) => `${entry.name}: ${entry.differences.map((d) => `${d.kind} ${d.detail}`).join("; ")}`)
    .join("\n");
  assert.equal(unexplained.length, 0, `unexplained differences from MARS 4.5:\n${detail}`);

  // Every program that differs must have said so in advance.
  result.cases.filter((entry) => !entry.agreed).forEach((entry) => {
    assert.ok(entry.declared.length > 0, `${entry.name} differs but declares no intentional difference`);
  });

  // And a declaration that no longer applies is dead weight that hides the next
  // real regression, so it fails too.
  Object.entries(expectations.programs).forEach(([name, declarations]) => {
    const entry = result.cases.find((candidate) => candidate.name === name);
    assert.ok(entry, `${name} is declared but was not run`);
    declarations.forEach((declaration) => {
      assert.ok(entry.explained.some((difference) => difference.intentionalDifference === declaration.id),
        `${name} declares ${declaration.id}, but none of its exact words differ; remove it`);
    });
  });
});
