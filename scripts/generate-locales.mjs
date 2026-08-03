import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import vm from "node:vm";

const projectRoot = resolve(import.meta.dirname, "..");
const sourceLanguage = "en";
const locales = [
  { id: "zh", translate: "zh-CN", label: "简体中文", rtl: false },
  { id: "hi", translate: "hi", label: "हिन्दी", rtl: false },
  { id: "ar", translate: "ar", label: "العربية", rtl: true },
  { id: "fr", translate: "fr", label: "Français", rtl: false },
  { id: "bn", translate: "bn", label: "বাংলা", rtl: false },
  { id: "ru", translate: "ru", label: "Русский", rtl: false },
  { id: "id", translate: "id", label: "Bahasa Indonesia", rtl: false }
];

const uiOverrides = {
  zh: { Bench: "性能测试", Assemble: "汇编", Go: "继续运行", Step: "单步执行", Backstep: "撤销单步" },
  hi: { Run: "चलाएँ", Bench: "प्रदर्शन परीक्षण", Assemble: "असेंबल करें", Go: "चलाएँ", Step: "एक चरण", Backstep: "पिछला चरण" },
  ar: { Bench: "اختبار الأداء", Compile: "ترجمة", Assemble: "تجميع", Go: "تشغيل", Step: "خطوة واحدة", Backstep: "خطوة للخلف" },
  fr: { View: "Affichage", Run: "Exécuter", Bench: "Performances", Go: "Continuer", Step: "Pas à pas", Backstep: "Revenir d’un pas" },
  bn: { Bench: "কর্মক্ষমতা পরীক্ষা", Assemble: "অ্যাসেম্বল", Go: "চালান", Step: "এক ধাপ", Backstep: "এক ধাপ পিছনে" },
  ru: { View: "Вид", Run: "Выполнение", Bench: "Тесты производительности", Go: "Продолжить", Backstep: "Шаг назад" },
  id: { File: "Berkas", Bench: "Uji kinerja", Assemble: "Rakit", Go: "Jalankan", Backstep: "Langkah mundur" }
};

const technicalTokenSource = /\b(?:webMARS|MARS|MIPS32?|Mini-C|JavaScript|WASM|COP1|TTY|MMIO|ANSI|C0-S[0-4]|C1-NATIVE|[A-Z][A-Z0-9_]{2,})\b|\{[A-Za-z0-9_]+\}|\$[A-Za-z0-9]+|0x[0-9A-Fa-f]+|https?:\/\/[^\s<]+|mailto:[^\s<]+|&(?:[A-Za-z]+|#\d+|#x[0-9A-Fa-f]+);|`[^`\r\n]+`/.source;
const protectedTechnicalText = new RegExp(technicalTokenSource);

const cachePath = join(tmpdir(), "webmars-generated-locales-cache.json");
let cache = {};
try {
  cache = JSON.parse(await readFile(cachePath, "utf8"));
} catch {
  cache = {};
}

const delay = (milliseconds) => new Promise((done) => setTimeout(done, milliseconds));

function shouldTranslate(text) {
  const value = String(text || "").trim();
  if (!value || !/[A-Za-z]/.test(value)) return false;
  if (/^(?:https?:\/\/|mailto:|\.\.?\/)/i.test(value)) return false;
  if (/^[A-Z0-9_$./:+*<>=|&^%!?-]{1,20}$/.test(value)) return false;
  return true;
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
  return String(text).replace(/\[{1,4}\s*WMTOKEN(\d{4})\s*\]{1,4}/g, (_match, rawIndex) => (
    tokens[Number(rawIndex)] ?? _match
  ));
}

function technicalTokens(text) {
  return String(text).match(new RegExp(technicalTokenSource, "g")) || [];
}

async function translateWithLiteralTechnicalTokens(source, target) {
  const parts = String(source).split(new RegExp(`(${technicalTokenSource})`, "g"));
  const prose = [];
  const locations = [];
  parts.forEach((part, index) => {
    if (!part || technicalTokens(part).length === 1 && technicalTokens(part)[0] === part) return;
    const match = part.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const body = match?.[2] || "";
    if (!shouldTranslate(body)) return;
    prose.push(body);
    locations.push({ index, prefix: match[1], suffix: match[3] });
  });
  const localized = prose.length ? await translateBatch(prose, target) : [];
  locations.forEach((location, index) => {
    parts[location.index] = `${location.prefix}${localized[index]}${location.suffix}`;
  });
  return parts.join("");
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
    const response = await fetch(url, {
      headers: { "User-Agent": "webMARS locale generator" }
    });
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

async function translateBatch(items, target) {
  const prepared = items.map((text) => maskTechnicalText(text));
  const separators = prepared.slice(0, -1).map((_item, index) => (
    `[[[WMSEP${String(index).padStart(4, "0")}]]]`
  ));
  const payload = prepared.map((item, index) => (
    index < separators.length ? `${item.masked}\n${separators[index]}\n` : item.masked
  )).join("");
  const translated = await requestTranslation(payload, target);
  const parts = translated.split(/\s*\[\[\[\s*WMSEP\d{4}\s*\]\]\]\s*/g);
  if (parts.length !== items.length) {
    const output = [];
    for (const item of items) output.push(await translateBatch([item], target));
    return output.flat();
  }
  return parts.map((part, index) => unmaskTechnicalText(part, prepared[index].tokens).trim());
}

async function translateMany(values, target) {
  const output = new Array(values.length);
  const pending = [];
  values.forEach((rawValue, index) => {
    const value = String(rawValue ?? "");
    const key = protectedTechnicalText.test(value)
      ? `technical-v2\u0000${target}\u0000${value}`
      : `${target}\u0000${value}`;
    if (!shouldTranslate(value)) output[index] = value;
    else if (Object.hasOwn(cache, key)) output[index] = cache[key];
    else pending.push({ index, key, value });
  });

  let cursor = 0;
  while (cursor < pending.length) {
    const batch = [];
    let characters = 0;
    while (cursor < pending.length) {
      const candidate = pending[cursor];
      const added = candidate.value.length + 32;
      if (batch.length && characters + added > 3200) break;
      batch.push(candidate);
      characters += added;
      cursor += 1;
    }
    const translated = await translateBatch(batch.map((item) => item.value), target);
    batch.forEach((item, index) => {
      const value = translated[index] || item.value;
      output[item.index] = value;
      cache[item.key] = value;
    });
    await writeFile(cachePath, `${JSON.stringify(cache)}\n`, "utf8");
    process.stdout.write(`  ${target}: ${cursor}/${pending.length}\r`);
  }
  if (pending.length) process.stdout.write("\n");
  let repairedCache = false;
  for (let index = 0; index < values.length; index += 1) {
    const sourceTokens = technicalTokens(values[index]);
    if (!sourceTokens.length) continue;
    const translatedTokens = technicalTokens(output[index]);
    if (/WM(?:TOKEN|SEP)\d*/i.test(output[index]) || JSON.stringify(translatedTokens) !== JSON.stringify(sourceTokens)) {
      output[index] = await translateWithLiteralTechnicalTokens(values[index], target);
      cache[`technical-v2\u0000${target}\u0000${String(values[index])}`] = output[index];
      repairedCache = true;
    }
  }
  if (repairedCache) await writeFile(cachePath, `${JSON.stringify(cache)}\n`, "utf8");
  return output;
}

function messagePlaceholders(value) {
  return [...String(value).matchAll(/\{[A-Za-z0-9_]+\}/g)].map((match) => match[0]).sort();
}

async function repairMessagePlaceholders(source, translated, target) {
  if (JSON.stringify(messagePlaceholders(source)) === JSON.stringify(messagePlaceholders(translated))) {
    return translated;
  }
  const parts = String(source).split(/(\{[A-Za-z0-9_]+\})/g);
  const prose = parts.filter((part) => part && !/^\{[A-Za-z0-9_]+\}$/.test(part));
  const localizedProse = await translateMany(prose, target);
  let proseIndex = 0;
  return parts.map((part) => (
    /^\{[A-Za-z0-9_]+\}$/.test(part) ? part : (part ? localizedProse[proseIndex++] : part)
  )).join("");
}

async function readEnglishCatalog() {
  const source = await readFile(resolve(projectRoot, "assets/js/i18n/en.js"), "utf8");
  let catalog = null;
  const sandbox = {
    globalThis: {
      WebMarsI18n: {
        registerLanguage(_language, entries) {
          catalog = entries;
        }
      }
    }
  };
  sandbox.window = sandbox.globalThis;
  vm.runInNewContext(source, sandbox, { filename: "en.js" });
  if (!catalog) throw new Error("Could not read the English UI catalog.");
  return catalog;
}

async function generateUiCatalog(locale, englishCatalog) {
  const entries = Object.entries(englishCatalog);
  const translated = await translateMany(entries.map(([, value]) => value), locale.translate);
  for (let index = 0; index < entries.length; index += 1) {
    translated[index] = await repairMessagePlaceholders(entries[index][1], translated[index], locale.translate);
  }
  const localized = Object.fromEntries(entries.map(([key], index) => [key, translated[index]]));
  Object.assign(localized, uiOverrides[locale.id] || {});
  const json = JSON.stringify(localized, null, 2).replace(/^\{/u, "  {").replace(/\n\}$/u, "\n  }");
  const source = `(() => {\n  const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;\n  if (!i18n || typeof i18n.registerLanguage !== "function") return;\n\n  i18n.registerLanguage(${JSON.stringify(locale.id)},${json.slice(2)});\n})();\n`;
  await writeFile(resolve(projectRoot, `assets/js/i18n/${locale.id}.js`), source, "utf8");
}

function tokenizeHtml(html) {
  return html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [];
}

async function translateHtml(html, locale) {
  const tokens = tokenizeHtml(html);
  const translatable = [];
  const locations = [];
  const skipped = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.startsWith("<")) {
      const closing = token.match(/^<\/\s*([A-Za-z0-9-]+)/)?.[1]?.toLowerCase();
      const opening = token.match(/^<\s*([A-Za-z0-9-]+)/)?.[1]?.toLowerCase();
      if (closing && skipped.at(-1) === closing) skipped.pop();
      if (opening && ["code", "pre", "script", "style"].includes(opening) && !/^<\s*\//.test(token)) skipped.push(opening);
      continue;
    }
    if (skipped.length) continue;
    const match = token.match(/^(\s*)([\s\S]*?)(\s*)$/);
    const body = match?.[2] || "";
    if (!shouldTranslate(body)) continue;
    translatable.push(body);
    locations.push({ index, prefix: match[1], suffix: match[3] });
  }
  const translated = await translateMany(translatable, locale.translate);
  locations.forEach((location, index) => {
    tokens[location.index] = `${location.prefix}${translated[index]}${location.suffix}`;
  });
  let output = tokens.join("");
  output = output.replace(/<html\b([^>]*)\blang="en"([^>]*)>/i, (_match, before, after) => (
    `<html${before}lang="${locale.id}"${locale.rtl ? ' dir="rtl"' : ""}${after}>`
  ));
  return output;
}

async function generateHelp(locale) {
  const englishRoot = resolve(projectRoot, "help/en");
  const targetRoot = resolve(projectRoot, `help/${locale.id}`);
  await mkdir(targetRoot, { recursive: true });
  for (const entry of await readdir(englishRoot, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const sourcePath = resolve(englishRoot, entry.name);
    const targetPath = resolve(targetRoot, entry.name);
    if (entry.name === "help-reference.json") continue;
    if (extname(entry.name).toLowerCase() !== ".html" || entry.name === "MIPSInstructionSetSong.html") {
      await writeFile(targetPath, await readFile(sourcePath));
      continue;
    }
    const html = await readFile(sourcePath, "utf8");
    await writeFile(targetPath, await translateHtml(html, locale), "utf8");
  }

  const referencePath = resolve(englishRoot, "help-reference.json");
  const reference = JSON.parse(await readFile(referencePath, "utf8"));
  const entries = [
    ...(reference.basicInstructions || []),
    ...(reference.extendedInstructions || []),
    ...(reference.directives || [])
  ];
  const translated = await translateMany(entries.map((entry) => entry.description), locale.translate);
  entries.forEach((entry, index) => {
    entry.description = translated[index];
  });
  await writeFile(resolve(targetRoot, "help-reference.json"), `${JSON.stringify(reference, null, 2)}\n`, "utf8");
}

function commentSegments(source, extension) {
  const segments = [];
  if ([".asm", ".s"].includes(extension)) {
    let offset = 0;
    for (const line of source.split(/(?<=\n)/)) {
      const marker = line.indexOf("#");
      if (marker >= 0) {
        const raw = line.slice(marker + 1).replace(/[\r\n]+$/, "");
        if (shouldTranslate(raw)) segments.push({ start: offset + marker + 1, end: offset + marker + 1 + raw.length, text: raw });
      }
      offset += line.length;
    }
    return segments;
  }

  const pattern = /\/\/([^\r\n]*)|\/\*([\s\S]*?)\*\//g;
  for (const match of source.matchAll(pattern)) {
    if (match[1] !== undefined) {
      if (!/^\s*@/.test(match[1]) && shouldTranslate(match[1])) {
        segments.push({ start: match.index + 2, end: match.index + 2 + match[1].length, text: match[1] });
      }
      continue;
    }
    const body = match[2];
    let localOffset = 0;
    for (const line of body.split(/(?<=\n)/)) {
      const content = line.replace(/[\r\n]+$/, "");
      const prefix = content.match(/^\s*\*?\s*/)?.[0] || "";
      const text = content.slice(prefix.length);
      if (shouldTranslate(text)) {
        const start = match.index + 2 + localOffset + prefix.length;
        segments.push({ start, end: start + text.length, text });
      }
      localOffset += line.length;
    }
  }
  return segments;
}

async function translateExampleSource(source, extension, locale) {
  const segments = commentSegments(source, extension);
  if (!segments.length) return source;
  const translated = await translateMany(segments.map((segment) => segment.text), locale.translate);
  let output = source;
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    output = `${output.slice(0, segment.start)}${translated[index]}${output.slice(segment.end)}`;
  }
  return output;
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

async function generateExamples(locale) {
  const englishRoot = resolve(projectRoot, "examples/en");
  const targetRoot = resolve(projectRoot, `examples/${locale.id}`);
  for (const sourcePath of await walk(englishRoot)) {
    const relativePath = relative(englishRoot, sourcePath);
    const targetPath = resolve(targetRoot, relativePath);
    const extension = extname(sourcePath).toLowerCase();
    await mkdir(dirname(targetPath), { recursive: true });
    const source = await readFile(sourcePath, "utf8");
    await writeFile(targetPath, await translateExampleSource(source, extension, locale), "utf8");
  }
}

async function updateLanguageManifests() {
  const allLocales = [
    { id: "en", label: "English", dir: "en" },
    { id: "es", label: "Español", dir: "es" },
    { id: "pt", label: "Português", dir: "pt" },
    ...locales.map(({ id, label }) => ({ id, label, dir: id }))
  ];
  await writeFile(
    resolve(projectRoot, "assets/js/i18n/languages.json"),
    `${JSON.stringify({ languages: allLocales.map(({ id }) => `${id}.js`) }, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    resolve(projectRoot, "help/languages.json"),
    `${JSON.stringify({ defaultLanguage: "en", languages: allLocales }, null, 2)}\n`,
    "utf8"
  );
  const examplesPath = resolve(projectRoot, "examples/examples.json");
  const manifest = JSON.parse((await readFile(examplesPath, "utf8")).replace(/^\uFEFF/, ""));
  manifest.languages = allLocales.map(({ id }) => id);
  for (const example of manifest.examples || []) {
    if (Array.isArray(example.languages)) example.languages = [...manifest.languages];
  }
  await writeFile(examplesPath, `${JSON.stringify(manifest, null, 4)}\n`, "utf8");
}

const englishCatalog = await readEnglishCatalog();
for (const locale of locales) {
  console.log(`Generating ${locale.id} (${locale.label})...`);
  await generateUiCatalog(locale, englishCatalog);
  await generateHelp(locale);
  await generateExamples(locale);
}
await updateLanguageManifests();
console.log("Locale generation complete.");
