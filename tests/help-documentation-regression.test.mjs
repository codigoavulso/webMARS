import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const helpBase = resolve(projectRoot, "help");
const helpSystemPath = resolve(projectRoot, "assets", "js", "app-modules", "15-help-system.js");
const locales = ["en", "es", "pt", "zh", "hi", "ar", "fr", "bn", "ru", "id"];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function currentHelpHtmlFiles(helpSystem) {
  return [...new Set([
    ...[...helpSystem.matchAll(/file:\s*"([^"]+\.html)"/g)].map((match) => match[1]),
    "about-card.html"
  ])];
}

test("every localized in-app help page exists and uses current branding", async () => {
  const helpSystem = await readFile(helpSystemPath, "utf8");
  const htmlFiles = currentHelpHtmlFiles(helpSystem);
  const functionalFiles = htmlFiles.filter((file) => file !== "MIPSInstructionSetSong.html");

  assert.ok(htmlFiles.length >= 16, "expected the complete localized help page catalogue");
  assert.match(helpSystem, /const MARS_HELP_TITLE = "webMARS Help"/);
  assert.match(helpSystem, /label: "Mini-C"/);
  assert.match(helpSystem, /label: "Workspace"/);

  for (const locale of locales) {
    const helpRoot = resolve(helpBase, locale);
    for (const file of functionalFiles) {
      const path = resolve(helpRoot, file);
      assert.equal(await exists(path), true, `missing ${locale} help page: ${file}`);
      const html = await readFile(path, "utf8");
      assert.match(html, new RegExp(`<html\\b[^>]*lang="${locale}"`, "i"), `${locale}/${file} must declare ${locale}`);
      if (locale === "ar") {
        assert.match(html, /<html\b[^>]*dir="rtl"/i, `ar/${file} must use right-to-left layout`);
      }
      assert.doesNotMatch(
        html,
        /java\s+-jar\s+mars\.jar|J2SE Java Runtime Environment|Java Swing/i,
        `${locale}/${file} contains obsolete Java desktop instructions`
      );
    }
  }
});

test("all local links and assets in localized help resolve", async () => {
  const helpSystem = await readFile(helpSystemPath, "utf8");
  const htmlFiles = currentHelpHtmlFiles(helpSystem);

  for (const locale of locales) {
    for (const file of htmlFiles) {
      const path = resolve(helpBase, locale, file);
      const html = await readFile(path, "utf8");
      const refs = [...html.matchAll(/\b(?:href|src)="([^"]+)"/gi)].map((match) => match[1]);
      for (const ref of refs) {
        if (/^(?:https?:|mailto:|tel:|#|data:|javascript:)/i.test(ref)) continue;
        const cleanRef = ref.split(/[?#]/, 1)[0];
        assert.equal(
          await exists(resolve(dirname(path), cleanRef)),
          true,
          `${locale}/${file} references missing local resource: ${ref}`
        );
      }
    }
  }
});

test("localized pages preserve the English document structure", async () => {
  const helpSystem = await readFile(helpSystemPath, "utf8");
  const files = currentHelpHtmlFiles(helpSystem).filter((file) => file !== "MIPSInstructionSetSong.html");
  const structuralTags = ["h1", "h2", "h3", "table", "pre"];

  for (const file of files) {
    const english = await readFile(resolve(helpBase, "en", file), "utf8");
    const englishCounts = structuralTags.map((tag) => (
      english.match(new RegExp(`<${tag}\\b`, "gi")) || []
    ).length);

    for (const locale of locales.filter((language) => language !== "en")) {
      const localized = await readFile(resolve(helpBase, locale, file), "utf8");
      const localizedCounts = structuralTags.map((tag) => (
        localized.match(new RegExp(`<${tag}\\b`, "gi")) || []
      ).length);
      assert.deepEqual(localizedCounts, englishCounts, `${locale}/${file} structure differs from English`);
    }
  }
});

test("localized reference metadata has parity and points at active JavaScript sources", async () => {
  const references = new Map();
  for (const locale of locales) {
    const reference = JSON.parse(await readFile(resolve(helpBase, locale, "help-reference.json"), "utf8"));
    references.set(locale, reference);
    assert.equal(reference.source.basicInstructions, "../../assets/js/reference/instructions.generated.js");
    assert.equal(reference.source.extendedInstructions, "../../assets/js/reference/pseudo-ops.generated.js");
    assert.equal(reference.source.directives, "../../assets/js/app-modules/00-core.js");
  }

  const english = references.get("en");
  for (const locale of locales) {
    const reference = references.get(locale);
    assert.equal(reference.basicInstructions.length, english.basicInstructions.length, `${locale} basic instruction count`);
    assert.equal(reference.extendedInstructions.length, english.extendedInstructions.length, `${locale} pseudo instruction count`);
    assert.equal(reference.directives.length, english.directives.length, `${locale} directive count`);
  }
});

test("localized syscall help covers standard and webMARS library services", async () => {
  for (const locale of locales) {
    const html = await readFile(resolve(helpBase, locale, "SyscallHelp.html"), "utf8");
    for (const service of [1, 9, 17, 30, 44, 50, 59, 60, 64, 69, 73, 84, 92, 100, 103]) {
      assert.match(
        html,
        new RegExp(`(?:>|–|-)${service}(?:<|–|-)`),
        `${locale} missing syscall service or range containing ${service}`
      );
    }
  }
});

test("localized help labels are integrated into every UI catalog", async () => {
  const expected = {
    es: ["Ayuda de webMARS", "Espacio de trabajo", "Primeros pasos", "Ejecutar y depurar", "Límites y compatibilidad", "Soporte"],
    pt: ["Ajuda do webMARS", "Área de trabalho", "Começar", "Executar e depurar", "Limites e compatibilidade", "Suporte"]
  };

  for (const [locale, translations] of Object.entries(expected)) {
    const catalog = await readFile(resolve(projectRoot, "assets", "js", "i18n", `${locale}.js`), "utf8");
    for (const translation of translations) {
      assert.ok(catalog.includes(`"${translation}"`), `${locale} catalog is missing '${translation}'`);
    }
  }

  const helpLabels = [
    "webMARS Help",
    "Workspace",
    "Getting Started",
    "Run & Debug",
    "Limits & Compatibility",
    "Support"
  ];
  for (const locale of locales.filter((language) => !["en", "es", "pt"].includes(language))) {
    let catalog = null;
    const i18n = { registerLanguage(_language, registered) { catalog = registered; } };
    const source = await readFile(resolve(projectRoot, "assets", "js", "i18n", `${locale}.js`), "utf8");
    vm.runInNewContext(source, { window: { WebMarsI18n: i18n }, globalThis: { WebMarsI18n: i18n } });
    for (const label of helpLabels) {
      assert.ok(catalog?.[label]?.trim(), `${locale} catalog is missing '${label}'`);
      assert.notEqual(catalog[label], label, `${locale} catalog still uses English for '${label}'`);
    }
    assert.match(catalog["webMARS Help"], /webMARS/, `${locale} must preserve the webMARS brand`);
  }

  const manifest = JSON.parse(await readFile(resolve(helpBase, "languages.json"), "utf8"));
  assert.deepEqual(
    manifest.languages.map(({ id, label, dir }) => ({ id, label, dir })),
    [
      { id: "en", label: "English", dir: "en" },
      { id: "es", label: "Español", dir: "es" },
      { id: "pt", label: "Português", dir: "pt" },
      { id: "zh", label: "简体中文", dir: "zh" },
      { id: "hi", label: "हिन्दी", dir: "hi" },
      { id: "ar", label: "العربية", dir: "ar" },
      { id: "fr", label: "Français", dir: "fr" },
      { id: "bn", label: "বাংলা", dir: "bn" },
      { id: "ru", label: "Русский", dir: "ru" },
      { id: "id", label: "Bahasa Indonesia", dir: "id" }
    ]
  );
});
