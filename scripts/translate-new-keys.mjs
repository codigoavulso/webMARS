// Translates only the catalog entries that are still English.
//
// `generate-locales.mjs` rewrites every catalog, every help page and every
// example from scratch. That is the right tool for adding a language and the
// wrong one for adding a string: a full run also re-translates entries that
// have since been corrected by hand, so a feature that adds ten keys can
// silently degrade thousands.
//
// This script does the narrow job instead. It finds the keys a generated
// catalog still answers in English, translates those, and splices them back
// into the existing file without touching a single other line. Hand-maintained
// catalogs (es, pt) are never touched at all.
//
//   node scripts/translate-new-keys.mjs              # report only
//   node scripts/translate-new-keys.mjs --apply      # translate and write
//   node scripts/translate-new-keys.mjs --apply --language de
//
// The translation endpoint is the same one `generate-locales.mjs` uses, and
// the same masking protects placeholders, register names and product names
// from being translated into something the runtime cannot substitute.

import { randomUUID } from "node:crypto";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceLanguage = "en";

// Catalogs written by hand. A missing translation here is a decision for a
// person, not for a machine.
const handMaintained = new Set(["en", "es", "pt"]);

const generatedLocales = [
  { id: "zh", translate: "zh-CN" },
  { id: "hi", translate: "hi" },
  { id: "ar", translate: "ar" },
  { id: "fr", translate: "fr" },
  { id: "bn", translate: "bn" },
  { id: "ru", translate: "ru" },
  { id: "id", translate: "id" },
  { id: "de", translate: "de" },
  { id: "ja", translate: "ja" },
  { id: "ko", translate: "ko" },
  { id: "tr", translate: "tr" },
  { id: "vi", translate: "vi" },
  { id: "ur", translate: "ur" },
  { id: "it", translate: "it" },
  { id: "pl", translate: "pl" },
  { id: "fa", translate: "fa" },
  { id: "th", translate: "th" }
];

// Kept identical to generate-locales.mjs on purpose: the two must agree about
// what counts as a technical token, or the same string would be masked
// differently depending on which script last touched it.
const technicalTokenSource = /\b(?:webMARS|MARS|MIPS32?|Mini-C|JavaScript|WASM|COP1|TTY|MMIO|ANSI|C0-S[0-4]|C1-NATIVE|[A-Z][A-Z0-9_]{2,})\b|\{[A-Za-z0-9_]+\}|\$[A-Za-z0-9]+|0x[0-9A-Fa-f]+|https?:\/\/[^\s<]+|mailto:[^\s<]+|&(?:[A-Za-z]+|#\d+|#x[0-9A-Fa-f]+);|`[^`\r\n]+`/.source;

const delay = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

function parseArguments(argv) {
  const options = { apply: false, languages: null, limit: Infinity };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") {
      options.apply = true;
      continue;
    }
    if (argument === "--language") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new TypeError("--language requires a value");
      options.languages = value.split(",").map((entry) => entry.trim()).filter(Boolean);
      if (!options.languages.length) throw new TypeError("--language requires at least one language id");
      index += 1;
      continue;
    }
    if (argument === "--limit") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new TypeError("--limit requires a value");
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new TypeError("--limit must be a positive integer");
      }
      options.limit = parsed;
      index += 1;
      continue;
    }
    throw new TypeError(`Unknown argument: ${argument}`);
  }
  return options;
}

// Catalogs are executable modules, so they are read by running them against a
// stub rather than by parsing them.
async function loadCatalog(language, englishCatalog = null) {
  const source = await readFile(resolve(projectRoot, "assets", "js", "i18n", `${language}.js`), "utf8");
  let registered = null;
  const i18n = {
    getCatalog: (requested) => (requested === "en" && englishCatalog ? { ...englishCatalog } : {}),
    registerLanguage: (_id, catalog) => { registered = catalog; }
  };
  vm.runInNewContext(source, { window: { WebMarsI18n: i18n }, globalThis: { WebMarsI18n: i18n } });
  if (!registered) throw new Error(`${language}.js did not register a catalog`);
  return registered;
}

function shouldTranslate(text) {
  const value = String(text || "").trim();
  if (!value || !/[A-Za-z]/.test(value)) return false;
  if (/^(?:https?:\/\/|mailto:|\.\.?\/)/i.test(value)) return false;
  if (/^[A-Z0-9_$./:+*<>=|&^%!?-]{1,20}$/.test(value)) return false;
  return true;
}

// A value identical to the English one is either an untranslated entry or a
// string that reads the same in both languages. Translating the second kind
// again is harmless; leaving the first kind is what this script exists to fix.
function untranslatedKeys(catalog, english) {
  return Object.keys(english).filter((key) => {
    const value = catalog[key];
    if (typeof value !== "string") return true;
    if (value !== english[key]) return false;
    return shouldTranslate(english[key]);
  });
}

function maskTechnicalText(text) {
  const tokens = [];
  const pattern = new RegExp(technicalTokenSource, "g");
  const masked = String(text).replace(pattern, (token) => {
    const index = tokens.push(token) - 1;
    return `[[[WMTOKEN${String(index).padStart(4, "0")}]]]`;
  });
  return { masked, tokens };
}

function unmaskTechnicalText(text, tokens) {
  return String(text).replace(/\[{1,4}\s*WMTOKEN(\d{4})\s*\]{1,4}/g, (match, rawIndex) => (
    tokens[Number(rawIndex)] ?? match
  ));
}

function translatedPayload(response) {
  if (!Array.isArray(response?.[0])) return "";
  return response[0].map((entry) => String(entry?.[0] ?? "")).join("");
}

async function requestTranslation(text, target, attempt = 0) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", sourceLanguage);
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);
  try {
    const response = await fetch(url, { headers: { "User-Agent": "webMARS locale generator" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const translated = translatedPayload(await response.json());
    if (!translated) throw new Error("empty translation response");
    await delay(70);
    return translated;
  } catch (error) {
    if (attempt >= 5) throw error;
    await delay(500 * (2 ** attempt));
    return requestTranslation(text, target, attempt + 1);
  }
}

function markerIndexes(value, prefix) {
  const pattern = new RegExp(`${prefix}\\s*(\\d{4})`, "g");
  return [...String(value).matchAll(pattern)].map((match) => Number(match[1]));
}

export function validateTranslatedBatch(translated, prepared) {
  const expectedSeparators = prepared.slice(0, -1).map((_item, index) => index);
  const actualSeparators = markerIndexes(translated, "WMSEP");
  if (actualSeparators.length !== expectedSeparators.length
    || actualSeparators.some((value, index) => value !== expectedSeparators[index])) {
    return null;
  }

  const parts = String(translated).split(/\s*\[\[\[\s*WMSEP\d{4}\s*\]\]\]\s*/g);
  if (parts.length !== prepared.length) return null;
  const tokensPreserved = parts.every((part, index) => {
    const actual = markerIndexes(part, "WMTOKEN").sort((left, right) => left - right);
    const expected = prepared[index].tokens.map((_token, tokenIndex) => tokenIndex);
    return actual.length === expected.length
      && actual.every((value, tokenIndex) => value === expected[tokenIndex]);
  });
  return tokensPreserved ? parts : null;
}

async function translateBatch(items, target) {
  const prepared = items.map((text) => maskTechnicalText(text));
  const separators = prepared.slice(0, -1).map((_item, index) => (
    `[[[WMSEP${String(index).padStart(4, "0")}]]]`
  ));
  const payload = prepared.map((item, index) => (
    index < separators.length ? `${item.masked}\n${separators[index]}\n` : item.masked
  )).join("");
  const translated = await requestTranslation(payload, target);
  const parts = validateTranslatedBatch(translated, prepared);
  // A batch the endpoint split differently is retried one string at a time
  // rather than guessed at: a misaligned batch would assign each translation to
  // the wrong key, which is worse than leaving them all in English.
  if (!parts) {
    if (items.length === 1) {
      throw new Error("Translation endpoint changed or dropped a protected token");
    }
    const output = [];
    for (const item of items) output.push(...await translateBatch([item], target));
    return output;
  }
  return parts.map((part, index) => unmaskTechnicalText(part, prepared[index].tokens).trim());
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]).sort();
}

export function escapeForSource(value) {
  // JSON string escaping covers quotes, backslashes, newlines and every other
  // control character that cannot safely appear in a JavaScript string literal.
  return JSON.stringify(String(value)).slice(1, -1);
}

// Rewrites the value of one key in place. Anchoring on the exact source line
// keeps every other entry, comment and blank line byte-identical.
export function replaceEntry(source, key, value) {
  const escapedKey = escapeForSource(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^(\\s*)"${escapedKey}"\\s*:\\s*"(?:[^"\\\\]|\\\\.)*"(,?)$`, "m");
  if (!pattern.test(source)) return null;
  return source.replace(pattern, (_match, indentation, comma) => (
    `${indentation}"${escapeForSource(key)}": "${escapeForSource(value)}"${comma}`
  ));
}

export async function atomicWriteCatalog(path, source) {
  const temporaryPath = `${path}.tmp-${randomUUID()}`;
  const backupPath = `${path}.bak-${randomUUID()}`;
  let originalMoved = false;
  await writeFile(temporaryPath, source, { encoding: "utf8", flag: "wx" });
  try {
    await rename(path, backupPath);
    originalMoved = true;
    await rename(temporaryPath, path);
    await rm(backupPath, { force: true });
  } catch (error) {
    await rm(temporaryPath, { force: true });
    if (originalMoved) {
      await rm(path, { force: true });
      await rename(backupPath, path);
    }
    throw error;
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const english = await loadCatalog("en");
  const targets = generatedLocales.filter((locale) => (
    !handMaintained.has(locale.id)
    && (!options.languages || options.languages.includes(locale.id))
  ));

// A misspelled --language used to select nothing and report success, so a run
// meant for one catalog quietly did no work at all.
  if (options.languages) {
    const known = new Set(generatedLocales.map((locale) => locale.id));
    const unknown = options.languages.filter((id) => !known.has(id));
    if (unknown.length) {
      const reviewed = unknown.filter((id) => handMaintained.has(id));
      console.error(`Unknown language(s): ${unknown.join(", ")}`);
      if (reviewed.length) {
        console.error(`${reviewed.join(", ")} are maintained by hand and are never translated by this script.`);
      }
      console.error(`Available: ${generatedLocales.map((locale) => locale.id).join(", ")}`);
      throw new TypeError(`Unknown language(s): ${unknown.join(", ")}`);
    }
  }

  let totalPending = 0;
  let totalWritten = 0;
  const skipped = [];

  for (const locale of targets) {
    const catalog = await loadCatalog(locale.id, english);
    const pending = untranslatedKeys(catalog, english).slice(0, options.limit);
    totalPending += pending.length;
    if (!pending.length) {
      console.log(`${locale.id}: up to date`);
      continue;
    }
    if (!options.apply) {
      console.log(`${locale.id}: ${pending.length} untranslated`);
      continue;
    }

  // Batched by character count, the same way the generator batches, so one
  // request carries many strings without exceeding what the endpoint accepts.
    const translations = new Map();
    let cursor = 0;
    while (cursor < pending.length) {
      const batch = [];
      let characters = 0;
      while (cursor < pending.length) {
        const candidate = english[pending[cursor]];
        const added = candidate.length + 32;
        if (batch.length && characters + added > 3200) break;
        batch.push(pending[cursor]);
        characters += added;
        cursor += 1;
      }
      const values = await translateBatch(batch.map((key) => english[key]), locale.translate);
      batch.forEach((key, index) => translations.set(key, values[index] || english[key]));
    }

    const catalogPath = resolve(projectRoot, "assets", "js", "i18n", `${locale.id}.js`);
    let source = await readFile(catalogPath, "utf8");
    let written = 0;
    for (const key of pending) {
      const value = translations.get(key);
      if (!value || value === english[key]) continue;
    // A translation that dropped or invented a placeholder would break string
    // substitution at runtime, so it is refused rather than written.
      if (placeholders(value).join("|") !== placeholders(english[key]).join("|")) {
        skipped.push(`${locale.id}: placeholders changed for ${JSON.stringify(key)}`);
        continue;
      }
      const next = replaceEntry(source, key, value);
      if (next === null) {
        skipped.push(`${locale.id}: no entry line found for ${JSON.stringify(key)}`);
        continue;
      }
      source = next;
      written += 1;
    }
    await atomicWriteCatalog(catalogPath, source);
    totalWritten += written;
    console.log(`${locale.id}: translated ${written} of ${pending.length}`);
  }

  if (skipped.length) {
    console.log("\nLeft in English:");
    skipped.forEach((line) => console.log(`  ${line}`));
  }
  console.log(options.apply
    ? `\nTranslated ${totalWritten} entries across ${targets.length} catalog(s).`
    : `\n${totalPending} untranslated entries across ${targets.length} catalog(s). Re-run with --apply.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
