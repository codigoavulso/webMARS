// Keeps the developer documentation honest.
//
// A guide that names a function, a file or a command that no longer exists is
// worse than no guide: it sends a contributor down a path the codebase
// abandoned. These tests check that every concrete claim in the developer docs
// still resolves against the repository in the same commit.

import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";

const docsRoot = resolve(projectRoot, "docs");

const DEVELOPER_DOCS = [
  "code-architecture.md",
  "contributing-first-change.md",
  "adding-instructions.md",
  "adding-syscalls-and-devices.md",
  "runtime-invariants.md",
  "release-process.md",
  "tool-api.md"
];

async function readDoc(name) {
  return readFile(resolve(docsRoot, name), "utf8");
}

async function exists(relativePath) {
  try {
    await access(resolve(projectRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

test("every developer guide exists and is more than a stub", async () => {
  for (const name of DEVELOPER_DOCS) {
    const text = await readDoc(name);
    assert.ok(text.length > 1500, `${name} is too short to be a guide`);
    assert.match(text, /^# /m, `${name} needs a title`);
  }
});

test("the architecture map names every module that ships", async () => {
  const doc = await readDoc("code-architecture.md");
  const modules = (await readdir(resolve(projectRoot, "assets/js/app-modules")))
    .filter((name) => name.endsWith(".js"));

  assert.ok(modules.length > 10, "the module directory should not be nearly empty");
  modules.forEach((name) => {
    assert.ok(doc.includes(name), `code-architecture.md does not mention ${name}`);
  });
});

test("the architecture document states the boundaries and the dependency direction", async () => {
  const doc = await readDoc("code-architecture.md");
  assert.match(doc, /## Boundaries/);
  assert.match(doc, /```mermaid/, "the layer map must be a real diagram, not prose");
  assert.match(doc, /Dependencies point downwards only/);
  // Each boundary the roadmap asks about must be named.
  ["Assembler and runtime engine", "Mini-C compiler", "Interface", "Storage", "Tools", "Composition root"]
    .forEach((heading) => {
      assert.ok(doc.includes(heading), `code-architecture.md must describe the ${heading} boundary`);
    });
});

test("every repository path quoted in a developer guide resolves", async () => {
  // Backtick-quoted paths that look like files in this repository.
  const pattern = /`((?:assets|tools|tests|scripts|docs|help|examples|libs)\/[A-Za-z0-9_./-]+)`/g;
  for (const name of DEVELOPER_DOCS) {
    const text = await readDoc(name);
    const paths = new Set([...text.matchAll(pattern)].map((match) => match[1]));
    for (const path of paths) {
      // Wildcards describe a family rather than a file.
      if (path.includes("*") || path.endsWith("/")) continue;
      assert.ok(await exists(path), `${name} references ${path}, which does not exist`);
    }
  }
});

test("every relative link between developer guides resolves", async () => {
  const pattern = /\]\(([A-Za-z0-9_.-]+\.md)(?:#[^)]*)?\)/g;
  for (const name of DEVELOPER_DOCS) {
    const text = await readDoc(name);
    for (const match of text.matchAll(pattern)) {
      assert.ok(
        await exists(`docs/${match[1]}`),
        `${name} links to docs/${match[1]}, which does not exist`
      );
    }
  }
});

test("every npm script a guide tells a contributor to run is defined", async () => {
  const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
  const defined = new Set(Object.keys(packageJson.scripts));
  const pattern = /`npm run ([a-z:]+)`|`npm (test|start)`/g;

  for (const name of DEVELOPER_DOCS) {
    const text = await readDoc(name);
    for (const match of text.matchAll(pattern)) {
      const script = match[1] || match[2];
      assert.ok(defined.has(script), `${name} tells the reader to run "${script}", which package.json does not define`);
    }
  }
});

test("the instruction guide names the real extension points", async () => {
  const doc = await readDoc("adding-instructions.md");
  const core = await readFile(resolve(projectRoot, "assets/js/app-modules/00-core.js"), "utf8");

  ["expandPseudo", "expandPseudoFromReference", "encodeInstructionWordFromPlanRow",
    "executeInstruction", "MANUAL_PSEUDO_EXPANSION_OPS", "signExtend16"]
    .forEach((symbol) => {
      assert.ok(doc.includes(symbol), `adding-instructions.md must name ${symbol}`);
      assert.ok(core.includes(symbol), `00-core.js no longer defines ${symbol}`);
    });
});

test("the syscall guide names the real dispatch and safety helpers", async () => {
  const doc = await readDoc("adding-syscalls-and-devices.md");
  const core = await readFile(resolve(projectRoot, "assets/js/app-modules/00-core.js"), "utf8");

  ["executeSyscall", "runtimeHooks", "assertBoundedSyscallAddressRange", "writeBytesAtomic",
    "notifyMemoryObservers", "registerMemoryObserver", "parseStrictInteger", "mmioBase"]
    .forEach((symbol) => {
      assert.ok(doc.includes(symbol), `adding-syscalls-and-devices.md must name ${symbol}`);
      assert.ok(core.includes(symbol), `00-core.js no longer defines ${symbol}`);
    });
  assert.ok(doc.includes("WebMarsBitmapMmio"), "the device guide must point at the published protocol");
});

test("the invariants document names the machinery it constrains", async () => {
  const doc = await readDoc("runtime-invariants.md");
  const core = await readFile(resolve(projectRoot, "assets/js/app-modules/00-core.js"), "utf8");

  ["maxBacksteps", "maxBackstepHistoryBytes", "runtimeRevision", "MarsMemoryAccessError",
    "exportRuntimeState", "importRuntimeState", "getSnapshot"]
    .forEach((symbol) => {
      assert.ok(doc.includes(symbol), `runtime-invariants.md must name ${symbol}`);
      assert.ok(core.includes(symbol), `00-core.js no longer defines ${symbol}`);
    });
  // The document promises a symptom for each rule, which is what makes it usable.
  assert.match(doc, /## Quick reference/);
  assert.match(doc, /User-visible symptom/);
});

test("the release process lists every file that carries the version", async () => {
  const doc = await readDoc("release-process.md");
  const version = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8")).version;

  ["package.json", "package-lock.json", "assets/js/app-version.js", "README.md", "CITATION.cff", "index.html"]
    .forEach((path) => {
      assert.ok(doc.includes(path), `release-process.md must list ${path} as version-bearing`);
    });

  // And those files really do carry the current version.
  for (const path of ["package.json", "assets/js/app-version.js", "README.md", "CITATION.cff"]) {
    const text = await readFile(resolve(projectRoot, path), "utf8");
    assert.ok(text.includes(version), `${path} does not carry version ${version}`);
  }
});

test("the release process names every independently versioned artefact", async () => {
  const doc = await readDoc("release-process.md");
  const pipeline = await readFile(resolve(projectRoot, "tools/pipeline-lab.js"), "utf8");
  const manifest = JSON.parse((await readFile(resolve(projectRoot, "tools/tools.json"), "utf8")).replace(/^﻿/, ""));
  const labs = JSON.parse(await readFile(resolve(projectRoot, "docs/labs/labs.json"), "utf8"));

  assert.ok(doc.includes("apiVersion"), "the tool API version must be listed");
  assert.equal(manifest.apiVersion, 1);
  assert.ok(doc.includes("MODEL_VERSION"), "the Pipeline Lab model version must be listed");
  assert.match(pipeline, /const MODEL_VERSION = \d+;/);
  assert.ok(doc.includes("webmars.pipeline-report/1"), "the report schema must be listed");
  assert.ok(pipeline.includes("webmars.pipeline-report/1"));
  assert.ok(doc.includes("docs/labs/labs.json"), "the lab set version must be listed");
  assert.match(labs.version, /^\d+\.\d+\.\d+$/);
});

test("the first-contribution guide routes each area to a file that exists", async () => {
  const doc = await readDoc("contributing-first-change.md");
  // The routing table is the part a newcomer actually uses.
  ["00-core.js", "10-ui.js", "13-ui-menu-system.js", "17-mini-c-compiler.js",
    "18-runtime-browser-storage.js", "20-app-runtime.js"]
    .forEach((module) => {
      assert.ok(doc.includes(module), `the routing table must mention ${module}`);
    });
  assert.match(doc, /Write the test first/);
  assert.match(doc, /npm run coverage/);
  assert.match(doc, /npm run mutation/);

  // The suites it recommends must all exist and be wired into `npm test`.
  const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
  const suites = [...doc.matchAll(/`([a-z-]+\.test\.mjs)`/g)].map((match) => match[1]);
  assert.ok(suites.length >= 5, "the guide should point at several suites");
  for (const suite of suites) {
    assert.ok(await exists(`tests/${suite}`), `the guide names tests/${suite}, which does not exist`);
    assert.ok(packageJson.scripts.test.includes(suite), `tests/${suite} is not wired into npm test`);
  }
});
