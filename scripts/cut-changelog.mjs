// Turns the "unreleased" changelog section into a numbered release, in every
// language.
//
//   node scripts/cut-changelog.mjs 0.5.6
//   node scripts/cut-changelog.mjs 0.5.6 --check
//
// The changelog lives in twenty separate HTML files. Cutting a release means
// the same three edits in each: rewrite the lead sentence, replace the
// `data-unreleased` heading with the version, and drop the paragraph that says
// the version has not been decided. Doing that by hand nineteen times is how a
// language ends up a release behind.
//
// English is the source. The seventeen generated languages have their new
// bullets translated the same way `translate-new-keys.mjs` translates catalog
// entries, with the same protection for technical tokens. Spanish and
// Portuguese are reviewed by a person: this script restructures them and
// reports the new text as needing translation, rather than writing machine
// output into a catalog someone has been correcting by hand.
//
// Historical entries are never touched: "0.5.4 - MARS-OS desktop" is a record
// of what shipped, and this script has no business rewriting it.

import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const languages = [
  { id: "en", translate: null },
  { id: "es", translate: "es", handMaintained: true },
  { id: "pt", translate: "pt", handMaintained: true },
  { id: "zh", translate: "zh-CN" }, { id: "hi", translate: "hi" },
  { id: "ar", translate: "ar" }, { id: "fr", translate: "fr" },
  { id: "bn", translate: "bn" }, { id: "ru", translate: "ru" },
  { id: "id", translate: "id" }, { id: "de", translate: "de" },
  { id: "ja", translate: "ja" }, { id: "ko", translate: "ko" },
  { id: "tr", translate: "tr" }, { id: "vi", translate: "vi" },
  { id: "ur", translate: "ur" }, { id: "it", translate: "it" },
  { id: "pl", translate: "pl" }, { id: "fa", translate: "fa" },
  { id: "th", translate: "th" }
];

const technicalTokenSource = /\b(?:webMARS|MARS|MIPS32?|Mini-C|JavaScript|WASM|COP1|TTY|MMIO|ANSI|C0-S[0-4]|C1-NATIVE|[A-Z][A-Z0-9_]{2,})\b|\{[A-Za-z0-9_]+\}|\$[A-Za-z0-9]+|0x[0-9A-Fa-f]+|https?:\/\/[^\s<]+|mailto:[^\s<]+|&(?:[A-Za-z]+|#\d+|#x[0-9A-Fa-f]+);|`[^`\r\n]+`|<\/?[a-z]+>/.source;

const delay = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

const [version, ...flags] = process.argv.slice(2);
const checkOnly = flags.includes("--check");
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("usage: node scripts/cut-changelog.mjs <major.minor.patch> [--check]");
  process.exit(1);
}

function pathFor(language) {
  return resolve(projectRoot, "help", language, "changelog.html");
}

function maskTechnicalText(text) {
  const tokens = [];
  const masked = String(text).replace(new RegExp(technicalTokenSource, "g"), (token) => {
    const index = tokens.push(token) - 1;
    return `[[[WMTOKEN${String(index).padStart(4, "0")}]]]`;
  });
  return { masked, tokens };
}

function unmaskTechnicalText(text, tokens) {
  return String(text).replace(/\[{1,4}\s*WMTOKEN(\d{4})\s*\]{1,4}/g, (match, index) => tokens[Number(index)] ?? match);
}

async function requestTranslation(text, target, attempt = 0) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", target);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);
  try {
    const response = await fetch(url, { headers: { "User-Agent": "webMARS locale generator" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const translated = Array.isArray(payload?.[0])
      ? payload[0].map((entry) => String(entry?.[0] ?? "")).join("")
      : "";
    if (!translated) throw new Error("empty translation response");
    await delay(70);
    return translated;
  } catch (error) {
    if (attempt >= 5) throw error;
    await delay(500 * (2 ** attempt));
    return requestTranslation(text, target, attempt + 1);
  }
}

// One request per line keeps every bullet aligned with its translation. A
// changelog is cut once per release, so the extra round trips cost nothing and
// remove the batch-misalignment failure mode entirely.
async function translateLines(lines, target) {
  const output = [];
  for (const line of lines) {
    const { masked, tokens } = maskTechnicalText(line);
    output.push(unmaskTechnicalText(await requestTranslation(masked, target), tokens).trim());
  }
  return output;
}

// The English file is the source of both the structure and the text.
const englishSource = await readFile(pathFor("en"), "utf8");
const englishLead = englishSource.match(/<p class="lead">([\s\S]*?)<\/p>/);
const englishHeading = englishSource.match(new RegExp(`<h2>${version.replaceAll(".", "\\.")} &mdash; ([^<]*)</h2>`));
if (!englishLead || !englishHeading) {
  console.error(`en/changelog.html has no released ${version} section yet. Write that first; this script propagates it.`);
  process.exit(1);
}

const englishSection = englishSource.slice(englishSource.indexOf(englishHeading[0]));
const englishList = englishSection.slice(englishSection.indexOf("<ul>"), englishSection.indexOf("</ul>") + 5);
const englishBullets = [...englishList.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) => match[1].trim());

let updated = 0;
let needsCut = 0;
const pending = [];
const handTranslation = [];

for (const language of languages) {
  if (language.id === "en") continue;
  const path = pathFor(language.id);
  const source = await readFile(path, "utf8");

  if (source.includes(`<h2>${version} &mdash;`)) {
    console.log(`${language.id}: already cut`);
    continue;
  }
  const unreleased = source.match(/<h2 data-unreleased="true">([\s\S]*?)<\/h2>\s*<p>[\s\S]*?<\/p>\s*<ul>([\s\S]*?)<\/ul>/);
  if (!unreleased) {
    pending.push(`${language.id}: no unreleased section found`);
    continue;
  }
  if (checkOnly) {
    console.log(`${language.id}: would cut`);
    needsCut += 1;
    continue;
  }

  const existingBullets = [...unreleased[2].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) => match[1].trim());
  // The bullets already carried over from the unreleased section keep their
  // existing translation; only the ones English gained need translating.
  const carried = existingBullets.length;
  const added = englishBullets.slice(0, englishBullets.length - carried);

  let headingText = englishHeading[1];
  let leadText = englishLead[1];
  let newBullets = added;
  // Spanish and Portuguese are reviewed by a person. Restructuring them here is
  // safe and saves the fiddly part; writing their prose is not, so the new text
  // is left in English and reported rather than machine-translated into a
  // catalog someone has been correcting by hand.
  if (language.translate && !language.handMaintained) {
    [headingText, leadText] = await translateLines([englishHeading[1], englishLead[1]], language.translate);
    newBullets = added.length ? await translateLines(added, language.translate) : [];
  } else if (language.handMaintained) {
    handTranslation.push(`${language.id}: ${added.length + 2} strings left in English`);
  }

  const bulletMarkup = [...newBullets, ...existingBullets]
    .map((text) => `    <li>${text}</li>`)
    .join("\n");

  let next = source.replace(/<p class="lead">[\s\S]*?<\/p>/, `<p class="lead">${leadText}</p>`);
  next = next.replace(
    unreleased[0],
    `<h2>${version} &mdash; ${headingText}</h2>\n  <ul>\n${bulletMarkup}\n  </ul>`
  );
  await writeFile(path, next, "utf8");
  updated += 1;
  console.log(`${language.id}: cut ${version} (${newBullets.length} new, ${carried} carried)`);
}

if (handTranslation.length) {
  console.log("\nHand-maintained catalogs need their new text written by a person:");
  handTranslation.forEach((line) => console.log(`  ${line}`));
}
if (pending.length) {
  console.error("\nNot cut:");
  pending.forEach((line) => console.error(`  ${line}`));
  process.exit(1);
}
if (checkOnly && needsCut > 0) {
  console.error(`\n${needsCut} changelog(s) still need to be cut to ${version}.`);
  process.exit(1);
}
console.log(checkOnly ? "\nAll changelogs are already cut." : `\n${updated} changelog(s) cut to ${version}.`);
