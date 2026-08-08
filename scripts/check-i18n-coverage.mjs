// Finds user-facing text that never reaches a translated catalog entry.
//
// Two failure modes produce the same symptom -- English leaking into a
// localized interface -- and neither is caught by a missing-key check alone:
//
//   1. A string is handed to a translating helper but has no en.js entry, so
//      translateText falls through to the raw key ("Delete and Restart").
//   2. A string sits in a user-facing position and never reaches a translating
//      helper at all, so the catalog is irrelevant.
//
// Run standalone for a report, or import collectFindings from the test suite.

import { readFile, readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import vm from "node:vm";

const projectRoot = resolve(import.meta.dirname, "..");
const skippedDirectories = new Set(["dist", "node_modules", ".git", "i18n", "tests", "scripts", "docs", "libs", "examples", "help", "videos"]);

// Helpers that translate the arguments they are given. "all" covers helpers
// whose every string argument is prose; a list pins the prose positions for
// helpers that also take non-prose arguments, such as a dialog's prefill value.
const translatingCalls = {
  translateText: "all",
  postMarsMessage: "all",
  postRunSystemLine: "all",
  postRunRaw: "all",
  postRun: "all",
  setMessage: "all",
  setStatus: "all",
  confirmDialog: "all",
  requestConfirmDialog: [0, 1],
  requestTextDialog: [0, 1]
};

// Object properties rendered to the user, whether the caller translates them or
// a helper does it downstream. Either way the text needs a catalog entry, so
// membership in en.js is the check -- not how the string reaches the screen.
const userFacingProperties = [
  "title", "message", "confirmLabel", "cancelLabel", "placeholder", "hint",
  "heading", "tooltip", "ariaLabel", "emptyMessage", "okLabel", "submitLabel",
  "action", "label", "summary", "caption", "legend", "emptyLabel"
];

// Direct DOM writes, which no helper can translate on the caller's behalf.
const domTextWrites = [
  String.raw`\.(?:textContent|innerText|title|placeholder)\s*=\s*(STRING)`,
  String.raw`setAttribute\(\s*["'](?:title|aria-label|placeholder|alt)["']\s*,\s*(STRING)`
];

const stringLiteral = String.raw`"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'`;

// Endonyms name a language to someone who cannot read the current one, so they
// stay in their own script in every locale and must never gain a catalog entry.
const intentionallyUntranslated = new Set(["English"]);

// Text that is an identifier, a path, markup or a lone symbol is not prose and
// is never worth a catalog entry.
function isUserFacingText(value) {
  const text = String(value).trim();
  if (text.length < 2) return false;
  if (!/[A-Za-z]{2}/.test(text)) return false;
  if (!/[A-Za-z]\s|[a-z][A-Z]|\s[A-Za-z]|^[A-Z][a-z]+$/.test(text)) return false;
  if (/^(?:https?:|mailto:|data:|\.{0,2}\/|#|[a-z]+-[a-z-]+$)/i.test(text)) return false;
  if (/^[a-z][a-zA-Z0-9]*$/.test(text)) return false;            // camelCase identifiers
  if (/^[A-Z][A-Z0-9_]*$/.test(text)) return false;              // CONSTANT_NAMES
  if (/^[\w.-]+\.[a-z0-9]{1,5}$/i.test(text)) return false;      // file names
  if (/^</.test(text)) return false;                             // markup
  return true;
}

function decodeLiteral(raw) {
  try {
    return JSON.parse(raw.startsWith("'") ? `"${raw.slice(1, -1).replaceAll('"', '\\"')}"` : raw);
  } catch {
    return null;
  }
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

// Collects the string literals inside a call, starting at its opening paren.
// A regex cannot do this: "C0-S0 (phase 2 baseline)" closes the call early and
// silently drops every message that contains a parenthesis.
function callStringLiterals(source, openIndex, maxSpan = 4000) {
  const literals = [];
  const limit = Math.min(source.length, openIndex + maxSpan);
  let depth = 0;
  let argument = 0;
  let quote = "";
  let current = "";
  for (let index = openIndex; index < limit; index += 1) {
    const character = source[index];
    if (quote) {
      current += character;
      if (character === "\\") {
        current += source[index + 1] ?? "";
        index += 1;
      } else if (character === quote) {
        literals.push({ raw: current, argument });
        quote = "";
        current = "";
      }
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      current = character;
    } else if (character === "(" || character === "[" || character === "{") {
      depth += 1;
    } else if (character === ")" || character === "]" || character === "}") {
      depth -= 1;
      if (depth === 0) break;
    } else if (character === "," && depth === 1) {
      argument += 1;
    }
  }
  return literals;
}

export async function readCatalogKeys(language = "en") {
  let catalog = null;
  const sandbox = { globalThis: { WebMarsI18n: { registerLanguage(_id, entries) { catalog = entries; } } } };
  sandbox.window = sandbox.globalThis;
  vm.runInNewContext(await readFile(resolve(projectRoot, `assets/js/i18n/${language}.js`), "utf8"), sandbox);
  if (!catalog) throw new Error(`Could not read the ${language} catalog.`);
  return new Set(Object.keys(catalog));
}

async function collectSources(directory, found = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (skippedDirectories.has(entry.name) || entry.name.startsWith(".")) continue;
      await collectSources(resolve(directory, entry.name), found);
    } else if (entry.name.endsWith(".js")) {
      found.push(resolve(directory, entry.name));
    }
  }
  return found;
}

export async function collectFindings() {
  const catalog = await readCatalogKeys("en");
  const missingEntries = [];

  const callPattern = new RegExp(`\\b(${Object.keys(translatingCalls).join("|")})\\s*\\(`, "g");
  const propertyPattern = new RegExp(
    `\\b(${userFacingProperties.join("|")})\\s*:\\s*(${stringLiteral})`, "g"
  );
  const domPatterns = domTextWrites.map((pattern) => (
    new RegExp(pattern.replace("STRING", stringLiteral), "g")
  ));

  const record = (location, source, index, text, origin) => {
    if (text === null || !isUserFacingText(text)) return;
    if (catalog.has(text) || intentionallyUntranslated.has(text)) return;
    missingEntries.push({ file: location, line: lineOf(source, index), text, origin });
  };

  for (const file of await collectSources(projectRoot)) {
    const source = await readFile(file, "utf8");
    const location = relative(projectRoot, file).replaceAll("\\", "/");

    for (const call of source.matchAll(callPattern)) {
      const positions = translatingCalls[call[1]];
      const openIndex = call.index + call[0].length - 1;
      for (const literal of callStringLiterals(source, openIndex)) {
        if (positions !== "all" && !positions.includes(literal.argument)) continue;
        record(location, source, openIndex, decodeLiteral(literal.raw), "call");
      }
    }
    for (const property of source.matchAll(propertyPattern)) {
      record(location, source, property.index, decodeLiteral(property[2]), property[1]);
    }
    for (const pattern of domPatterns) {
      for (const write of source.matchAll(pattern)) {
        record(location, source, write.index, decodeLiteral(write[1]), "dom");
      }
    }
  }

  const seen = new Map();
  for (const item of missingEntries) seen.set(`${item.file}:${item.text}`, item);
  return { missingEntries: [...seen.values()] };
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll("\\", "/").split("/").pop())) {
  const { missingEntries } = await collectFindings();
  console.log(`\n== User-facing text with no en.js entry (${missingEntries.length}) ==`);
  for (const item of missingEntries) {
    console.log(`  ${item.file}:${item.line}  [${item.origin}] ${JSON.stringify(item.text)}`);
  }
  console.log();
  process.exitCode = missingEntries.length ? 1 : 0;
}
