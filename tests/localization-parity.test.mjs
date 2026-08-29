// How much of the interface each language actually answers in its own words.
//
// `release-readiness.test.mjs` already proves every catalog has every key and
// keeps every placeholder. That is necessary and not sufficient: a catalog can
// hold all 1614 keys and answer half of them in English, which is exactly the
// state a feature leaves behind when it adds strings and the generated
// catalogs are back-filled with the English value so nothing crashes.
//
// This suite measures the leftover instead. The ceilings below are regression
// floors, not targets: they sit at the current count, so translating more
// makes them fall and leaving a new string untranslated makes the suite fail.
// The rule is the one the coverage thresholds follow -- a number here goes
// down when the work is done, never up to make a run pass.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";
import vm from "node:vm";
import { resolve } from "node:path";
import { projectRoot } from "./helpers/engines.mjs";
import { appendEntry, replaceEntry, validateTranslatedBatch } from "../scripts/translate-new-keys.mjs";

const run = promisify(execFile);

// Measured on 2026-08-08 after `npm run i18n:new-keys -- --apply`. A string
// that reads identically in both languages counts here too, which is why none
// of these is zero and why they are ceilings rather than assertions of
// completeness: "Layout", "Menu" and every tool name are already Portuguese.
const UNTRANSLATED_CEILING = {
  zh: 19, hi: 11, ar: 17, fr: 44, bn: 26, ru: 18, id: 27, de: 67, ja: 22,
  ko: 23, tr: 27, vi: 32, ur: 38, it: 32, pl: 34, fa: 26, th: 18,
  // Hand-maintained: the leftovers here are deliberate technical terms
  // ("forwarding", "delay slot", "heap") that this project keeps in English.
  es: 63, pt: 71
};

async function loadCatalog(language, englishCatalog = null) {
  const source = await readFile(resolve(projectRoot, "assets", "js", "i18n", `${language}.js`), "utf8");
  let registered = null;
  const i18n = {
    getCatalog: (requested) => (requested === "en" && englishCatalog ? { ...englishCatalog } : {}),
    registerLanguage: (_id, catalog) => { registered = catalog; }
  };
  vm.runInNewContext(source, { window: { WebMarsI18n: i18n }, globalThis: { WebMarsI18n: i18n } });
  assert.ok(registered, `${language} did not register a catalog`);
  return registered;
}

// The same predicate scripts/translate-new-keys.mjs uses to decide what is
// worth sending to a translator. Keeping them in step is what makes the
// measurement below mean the same thing as the script's report.
function isTranslatable(text) {
  const value = String(text || "").trim();
  if (!value || !/[A-Za-z]/.test(value)) return false;
  if (/^(?:https?:\/\/|mailto:|\.\.?\/)/i.test(value)) return false;
  if (/^[A-Z0-9_$./:+*<>=|&^%!?-]{1,20}$/.test(value)) return false;
  return true;
}

function untranslated(catalog, english) {
  return Object.keys(english).filter((key) => catalog[key] === english[key] && isTranslatable(english[key]));
}

test("no language answers more of the interface in English than it did", async () => {
  const english = await loadCatalog("en");
  const report = [];

  for (const [language, ceiling] of Object.entries(UNTRANSLATED_CEILING)) {
    const catalog = await loadCatalog(language, english);
    const leftover = untranslated(catalog, english);
    report.push(`${language}: ${leftover.length}/${ceiling}`);
    assert.ok(
      leftover.length <= ceiling,
      `${language} now answers ${leftover.length} strings in English, up from ${ceiling}. `
      + `Run 'npm run i18n:new-keys -- --apply' (or translate by hand for es/pt), then lower the ceiling. `
      + `First few: ${leftover.slice(0, 5).map((key) => JSON.stringify(key)).join(", ")}`
    );
  }

  // A ceiling that has drifted far above reality stops being a regression
  // floor, so the suite asks for it to be lowered rather than quietly passing.
  const stale = Object.entries(UNTRANSLATED_CEILING).filter(([language, ceiling]) => {
    const entry = report.find((line) => line.startsWith(`${language}:`));
    return Number(entry.split(":")[1].split("/")[0]) + 10 < ceiling;
  });
  assert.deepEqual(stale.map(([language]) => language), [],
    "these ceilings are more than 10 above the real count and should be lowered");
});

test("the Pipeline Lab speaks every supported language", async () => {
  // The newest feature is the one most likely to have been left in English, so
  // a representative slice of its interface is pinned by name rather than
  // trusted to the aggregate count above.
  const sample = [
    "Pipeline right now",
    "Instruction stream",
    "Recorded execution (real branches and values)",
    "Follow the running program",
    "Registers view",
    "webMARS steps replayed",
    "Next step",
    "Previous step",
    "Not yet written back",
    "Register values along cycles {first}-{last}."
  ];
  const english = await loadCatalog("en");
  sample.forEach((key) => assert.ok(Object.hasOwn(english, key), `en is missing '${key}'`));

  for (const language of Object.keys(UNTRANSLATED_CEILING)) {
    const catalog = await loadCatalog(language, english);
    const missing = sample.filter((key) => catalog[key] === english[key]);
    assert.deepEqual(missing, [], `${language} still shows these Pipeline Lab strings in English`);
  }
});

test("the targeted translator refuses to touch hand-maintained catalogs", async () => {
  // es and pt are reviewed by a person. A script that rewrote them would
  // undo that review silently, so the exclusion is pinned here rather than
  // left as a comment in the script.
  const source = await readFile(resolve(projectRoot, "scripts", "translate-new-keys.mjs"), "utf8");
  assert.match(source, /const handMaintained = new Set\(\["en", "es", "pt"\]\);/);
  assert.match(source, /placeholders\(value\)\.join\("\|"\) !== placeholders\(english\[key\]\)\.join\("\|"\)/,
    "a translation that changes placeholders must be refused, not written");
});

test("the targeted translator rejects incomplete, invalid and unknown arguments", async () => {
  const script = resolve(projectRoot, "scripts", "translate-new-keys.mjs");
  for (const args of [
    ["--apply", "--language"],
    ["--apply", "--limit"],
    ["--limit", "0"],
    ["--limit", "1.5"],
    ["--unknown"]
  ]) {
    await assert.rejects(
      run(process.execPath, [script, ...args], { cwd: projectRoot, timeout: 30_000 }),
      `expected ${args.join(" ")} to fail closed`
    );
  }

  const source = await readFile(script, "utf8");
  assert.match(source, /JSON\.stringify\(String\(value\)\)\.slice\(1, -1\)/,
    "generated source values must escape newlines and control characters, not only quotes");
});

test("catalog replacement treats translation dollar signs and controls as data", () => {
  const source = '  "Example": "old",\n';
  const value = "costs $& $1 $` $' and register \"x\"\nnext\u0001";
  const replaced = replaceEntry(source, "Example", value);
  assert.ok(replaced);
  let catalog = null;
  vm.runInNewContext(`catalog = ({\n${replaced}});`, { set catalog(value) { catalog = value; } });
  assert.equal(catalog.Example, value);
});

test("targeted translator appends new keys without rewriting reviewed entries", () => {
  const source = '(function () {\n  window.WebMarsI18n.registerLanguage("fr", {\n    "Existing": "Révisé"\n  });\n})();\n';
  const appended = appendEntry(source, "New key", "Nouvelle valeur");
  assert.ok(appended);
  assert.match(appended, /"Existing": "Révisé",\n    "New key": "Nouvelle valeur"/);

  let catalog = null;
  const i18n = { registerLanguage: (_id, value) => { catalog = value; } };
  vm.runInNewContext(appended, { window: { WebMarsI18n: i18n } });
  assert.equal(catalog.Existing, "Révisé");
  assert.equal(catalog["New key"], "Nouvelle valeur");
});

test("translated batches preserve separator identity and every protected token", () => {
  const prepared = [
    { masked: "Use [[[WMTOKEN0000]]]", tokens: ["$t0"] },
    { masked: "Open [[[WMTOKEN0000]]] and [[[WMTOKEN0001]]]", tokens: ["webMARS", "$v0"] }
  ];
  assert.deepEqual(
    validateTranslatedBatch(
      "Utiliser [[[WMTOKEN0000]]]\n[[[WMSEP0000]]]\nOuvrir [[[WMTOKEN0001]]] et [[[WMTOKEN0000]]]",
      prepared
    )?.length,
    2
  );
  assert.equal(validateTranslatedBatch(
    "Utiliser [[[WMTOKEN0000]]]\n[[[WMSEP0001]]]\nOuvrir [[[WMTOKEN0000]]]",
    prepared
  ), null, "renumbered separators or dropped tokens must be refused");
  assert.equal(validateTranslatedBatch(
    "Utiliser [[[WMTOKEN0000]]] [[[WMTOKEN0000]]]\n[[[WMSEP0000]]]\nOuvrir [[[WMTOKEN0000]]] [[[WMTOKEN0001]]]",
    prepared
  ), null, "duplicated protected tokens must be refused");
});
