// Sets the application version everywhere it is declared, from one argument.
//
//   node scripts/set-version.mjs 0.5.6
//   node scripts/set-version.mjs 0.5.6 --check
//
// The version lives in eleven declarations. `tests/release-readiness.test.mjs` already
// fails when they disagree, but detecting a mismatch after the fact is not the
// same as not being able to create one: cutting a release meant eleven manual
// edits, and the test only said which one had been forgotten.
//
// A browser cannot read package.json, so `assets/js/app-version.js` cannot
// import it and the duplication cannot be removed outright. It can be reduced
// to one command with one argument, which is what this script is. Everything
// downstream already derives from these:
//
//   - the evidence generators read package.json;
//   - the help pages that state the current version use the
//     __WEBMARS_APP_VERSION__ token, substituted at runtime by app-version.js;
//   - the release-readiness suite reads the version rather than declaring it.
//
// Changelog headings are deliberately not touched. "0.5.4 - MARS-OS desktop"
// is a historical fact, not a statement about the current build, and rewriting
// it on every bump would falsify the record.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const [rawVersion, ...flags] = process.argv.slice(2);
const checkOnly = flags.includes("--check");

if (!rawVersion || !/^\d+\.\d+\.\d+$/.test(rawVersion)) {
  console.error("usage: node scripts/set-version.mjs <major.minor.patch> [--check]");
  process.exit(1);
}
const version = rawVersion;
const escaped = version.replaceAll(".", "\\.");

// Every declaration, as a pattern that matches any version and a replacement
// that writes this one. A file whose pattern stops matching is reported rather
// than silently skipped, because a silent skip is exactly the failure this
// script exists to prevent.
const declarations = [
  {
    file: "package.json",
    pattern: /("version":\s*)"\d+\.\d+\.\d+"/,
    replace: `$1"${version}"`
  },
  {
    file: "package-lock.json",
    pattern: /("version":\s*)"\d+\.\d+\.\d+"/g,
    replace: `$1"${version}"`,
    // The root object and the "" package entry both carry it.
    expect: 2
  },
  {
    file: "assets/js/app-version.js",
    pattern: /(const APP_VERSION = )"\d+\.\d+\.\d+"/,
    replace: `$1"${version}"`
  },
  {
    file: "index.html",
    pattern: /(\?v=)\d+\.\d+\.\d+/g,
    replace: `$1${version}`,
    expect: 2
  },
  {
    file: "README.md",
    pattern: /^# webMARS v\d+\.\d+\.\d+$/m,
    replace: `# webMARS v${version}`
  },
  {
    // The heading only; its bullets describe the release and are written by
    // hand. The "Release Line" list below it is history and is never rewritten.
    file: "README.md",
    pattern: /^## Highlights in v\d+\.\d+\.\d+$/m,
    replace: `## Highlights in v${version}`
  },
  {
    file: "CITATION.cff",
    pattern: /^(version:\s*)"\d+\.\d+\.\d+"$/m,
    replace: `$1"${version}"`
  },
  {
    file: "tests/release-readiness.test.mjs",
    pattern: /(const expectedReleaseVersion = )"\d+\.\d+\.\d+"/,
    replace: `$1"${version}"`
  },
  // Hand-written documents that state which build they describe. The generated
  // reports are not listed: their generators already stamp them from
  // package.json, so they follow this on the next regeneration.
  {
    file: "docs/code-architecture.md",
    pattern: /v\d+\.\d+\.\d+/g,
    replace: `v${version}`,
    expect: 2
  },
  {
    file: "docs/portability.md",
    pattern: /\*\*webMARS \d+\.\d+\.\d+\.\*\*/,
    replace: `**webMARS ${version}.**`
  },
  {
    file: "docs/technical-summary.md",
    pattern: /webMARS \d+\.\d+\.\d+/g,
    replace: `webMARS ${version}`,
    expect: 2
  }
];

let changed = 0;
let alreadyCorrect = 0;
const problems = [];

for (const declaration of declarations) {
  const path = resolve(projectRoot, declaration.file);
  const source = await readFile(path, "utf8");
  const matches = source.match(declaration.pattern);
  const found = matches ? (declaration.pattern.global ? matches.length : 1) : 0;

  if (found === 0) {
    problems.push(`${declaration.file}: no version declaration matched`);
    continue;
  }
  if (declaration.expect && found !== declaration.expect) {
    problems.push(`${declaration.file}: expected ${declaration.expect} declarations, found ${found}`);
    continue;
  }

  const next = source.replace(declaration.pattern, declaration.replace);
  if (next === source) {
    alreadyCorrect += 1;
    continue;
  }
  if (!checkOnly) await writeFile(path, next, "utf8");
  changed += 1;
  console.log(`${checkOnly ? "would set" : "set"} ${declaration.file}`);
}

if (problems.length) {
  console.error("\nProblems:");
  problems.forEach((line) => console.error(`  ${line}`));
  process.exit(1);
}

if (checkOnly) {
  if (changed > 0) {
    console.error(`\n${changed} file(s) do not declare ${version}.`);
    process.exit(1);
  }
  console.log(`All ${declarations.length} declarations already say ${version}.`);
} else {
  console.log(`\n${changed} updated, ${alreadyCorrect} already correct. Version is now ${version}.`);
  console.log("Remaining by hand: the changelog entry in help/<lang>/changelog.html and the release notes in README.md.");
}
