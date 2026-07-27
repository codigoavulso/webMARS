import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedReleaseVersion = "0.4.12";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (
      entry.name === ".git"
      || entry.name === "dist"
      || entry.name === "node_modules"
      || entry.name === "test-results"
    ) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

async function loadCatalog(language, englishCatalog = {}) {
  const source = await readFile(resolve(projectRoot, "assets", "js", "i18n", `${language}.js`), "utf8");
  let registered = null;
  const i18n = {
    getCatalog(requestedLanguage) {
      return requestedLanguage === "en" ? { ...englishCatalog } : null;
    },
    registerLanguage(registeredLanguage, catalog) {
      assert.equal(registeredLanguage, language);
      registered = { ...catalog };
    }
  };
  const context = {
    window: { WebMarsI18n: i18n },
    globalThis: { WebMarsI18n: i18n }
  };
  vm.runInNewContext(source, context, { filename: `${language}.js` });
  assert.ok(registered, `${language} did not register an i18n catalog`);
  return registered;
}

function placeholders(value) {
  return [...String(value).matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

test("0.4.12 version is coherent across runtime and release metadata", async () => {
  const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
  const packageLock = JSON.parse(await readFile(resolve(projectRoot, "package-lock.json"), "utf8"));
  const appVersion = await readFile(resolve(projectRoot, "assets", "js", "app-version.js"), "utf8");
  const readme = await readFile(resolve(projectRoot, "README.md"), "utf8");

  assert.equal(packageJson.version, expectedReleaseVersion);
  assert.equal(packageLock.version, expectedReleaseVersion);
  assert.equal(packageLock.packages?.[""]?.version, expectedReleaseVersion);
  assert.match(appVersion, new RegExp(`APP_VERSION\\s*=\\s*"${expectedReleaseVersion.replaceAll(".", "\\.")}"`));
  assert.match(readme, new RegExp(`^# webMARS v${expectedReleaseVersion.replaceAll(".", "\\.")}$`, "m"));
  assert.match(readme, new RegExp(`^## Highlights in v${expectedReleaseVersion.replaceAll(".", "\\.")}$`, "m"));
  assert.match(readme, new RegExp(`^- \`v${expectedReleaseVersion.replaceAll(".", "\\.")}\``, "m"));

  for (const language of ["en", "es", "pt"]) {
    const changelog = await readFile(resolve(projectRoot, "help", language, "changelog.html"), "utf8");
    const firstHeading = changelog.match(/<h2>([\s\S]*?)<\/h2>/i)?.[1] || "";
    assert.match(firstHeading, new RegExp(`^${expectedReleaseVersion.replaceAll(".", "\\.")}\\b`), `${language} changelog`);
  }
});

test("release tree has no obsolete runtime or transient generated artifacts", async () => {
  const files = (await walk(projectRoot))
    .map((path) => relative(projectRoot, path).replaceAll("\\", "/"));

  const forbidden = files.filter((path) => (
    path.startsWith("wasm/")
    || /^assets\/js\/app-modules\/00-core-wasm-/i.test(path)
    || /^tmp[_-].*\.generated\.[a-z0-9]+$/i.test(path)
    || /\.(?:bak|orig|rej|tmp)$/i.test(path)
  ));
  assert.deepEqual(forbidden, []);
});

test("release shell and localized toolbar labels are complete", async () => {
  const index = await readFile(resolve(projectRoot, "index.html"), "utf8");
  assert.equal((index.match(/<meta\s+name="viewport"/gi) || []).length, 1);
  assert.ok(
    index.indexOf("./assets/js/app-version.js") < index.indexOf("./assets/js/app.bundle.js"),
    "version runtime must load before the application bundle"
  );
  assert.match(index, new RegExp(`styles\\.css\\?v=${expectedReleaseVersion.replaceAll(".", "\\.")}`));
  assert.match(index, new RegExp(`app-version\\.js\\?v=${expectedReleaseVersion.replaceAll(".", "\\.")}`));

  const english = await loadCatalog("en");
  const menuSource = await readFile(
    resolve(projectRoot, "assets", "js", "app-modules", "13-ui-menu-system.js"),
    "utf8"
  );
  const staticMenuLabels = [...menuSource.matchAll(/\blabel:\s*"([^"]+)"/g)]
    .map((match) => match[1]);
  const catalogs = {
    es: await loadCatalog("es", english),
    pt: await loadCatalog("pt", english)
  };
  const required = {
    es: {
      Compile: "Compilar",
      Number: "Número",
      Math: "Matemáticas",
      "Delayed branching": "Saltos retardados",
      "Self-modifying code": "Código automodificable",
      "Clear localStorage and loaded states...": "Borrar almacenamiento local y estados cargados..."
    },
    pt: {
      Compile: "Compilar",
      Number: "Número",
      Math: "Matemática",
      "Delayed branching": "Desvios retardados",
      "Self-modifying code": "Código automodificável",
      "Clear localStorage and loaded states...": "Limpar armazenamento local e estados carregados..."
    }
  };

  for (const label of staticMenuLabels) {
    assert.ok(Object.hasOwn(english, label), `English catalog is missing the menu label '${label}'`);
  }
  for (const [language, catalog] of Object.entries(catalogs)) {
    for (const key of Object.keys(english)) {
      assert.ok(Object.hasOwn(catalog, key), `${language} is missing the '${key}' key`);
      assert.deepEqual(
        placeholders(catalog[key]),
        placeholders(english[key]),
        `${language} changed placeholders for '${key}'`
      );
    }
    for (const [key, value] of Object.entries(required[language])) {
      assert.equal(catalog[key], value, `${language} must translate '${key}'`);
    }
  }
});

test("localized MIPS reference catalogs do not fall back to English", async () => {
  const english = JSON.parse(
    await readFile(resolve(projectRoot, "help", "en", "help-reference.json"), "utf8")
  );
  const sections = ["basicInstructions", "extendedInstructions", "directives"];

  for (const language of ["es", "pt"]) {
    const localized = JSON.parse(
      await readFile(resolve(projectRoot, "help", language, "help-reference.json"), "utf8")
    );
    for (const section of sections) {
      assert.equal(
        localized[section]?.length,
        english[section]?.length,
        `${language}/${section} entry count`
      );
      english[section].forEach((entry, index) => {
        const translated = localized[section][index];
        assert.equal(translated?.example, entry.example, `${language}/${section}/${index} example`);
        assert.ok(translated?.description?.trim(), `${language}/${section}/${index} description`);
        assert.notEqual(
          translated.description.trim(),
          entry.description.trim(),
          `${language}/${section}/${index} still uses the English description`
        );
      });
    }
  }
});

test("the document language follows the selected interface language", async () => {
  const source = await readFile(resolve(projectRoot, "assets", "js", "app-modules", "00-i18n.js"), "utf8");
  const values = new Map([["webmars-language-v1", "pt"]]);
  const sandbox = {
    document: { documentElement: { lang: "en" } },
    localStorage: {
      getItem(key) {
        return values.get(String(key)) ?? null;
      },
      setItem(key, value) {
        values.set(String(key), String(value));
      }
    },
    CustomEvent: class CustomEvent {},
    dispatchEvent() {}
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "00-i18n.js" });

  assert.equal(sandbox.document.documentElement.lang, "pt");
  assert.equal(sandbox.WebMarsI18n.setLanguage("es"), true);
  assert.equal(sandbox.document.documentElement.lang, "es");
});

test("cloud authentication is restored automatically after a page reload", async () => {
  const source = await readFile(
    resolve(projectRoot, "assets", "js", "app-modules", "20-app-runtime.js"),
    "utf8"
  );

  assert.match(source, /credentials:\s*"include"/);
  assert.match(
    source,
    /showAboutOnFirstVisit\(\);\s*void refreshCloudSession\(\{\s*silent:\s*true,\s*syncProjects:\s*true,\s*postSyncStatus:\s*false,\s*syncReason:\s*"startup"\s*\}\);/
  );
});

test("tool, library and language manifests are unique and resolvable", async () => {
  const tools = JSON.parse(await readFile(resolve(projectRoot, "tools", "tools.json"), "utf8")).tools;
  const libraries = JSON.parse(await readFile(resolve(projectRoot, "libs", "manifest.json"), "utf8")).libraries;
  const languageModules = JSON.parse(
    await readFile(resolve(projectRoot, "assets", "js", "i18n", "languages.json"), "utf8")
  ).languages;

  assert.equal(new Set(tools.map((tool) => tool.id)).size, tools.length, "duplicate tool ids");
  assert.equal(new Set(tools.map((tool) => tool.script)).size, tools.length, "duplicate tool scripts");
  for (const tool of tools) {
    assert.equal(await exists(resolve(projectRoot, tool.script.replace(/^\.\//, ""))), true, `missing ${tool.script}`);
  }

  assert.equal(new Set(libraries.map((library) => library.name)).size, libraries.length, "duplicate library names");
  assert.equal(new Set(libraries.map((library) => library.path)).size, libraries.length, "duplicate library paths");
  for (const library of libraries) {
    assert.equal(await exists(resolve(projectRoot, "libs", library.path)), true, `missing libs/${library.path}`);
  }

  assert.equal(new Set(languageModules).size, languageModules.length, "duplicate language modules");
  for (const languageModule of languageModules) {
    assert.equal(
      await exists(resolve(projectRoot, "assets", "js", "i18n", languageModule)),
      true,
      `missing assets/js/i18n/${languageModule}`
    );
  }
});

test("release packaging and CI use the supported public commands", async () => {
  const packageJson = JSON.parse(await readFile(resolve(projectRoot, "package.json"), "utf8"));
  const workflow = await readFile(
    resolve(projectRoot, ".github", "workflows", "validate.yml"),
    "utf8"
  );
  const packageScript = await readFile(resolve(projectRoot, "scripts", "package-release.mjs"), "utf8");

  assert.equal(packageJson.scripts?.["package:release"], "node scripts/package-release.mjs");
  assert.match(workflow, /\brun:\s*npm ci\b/);
  assert.match(workflow, /\brun:\s*npm run validate\b/);
  assert.match(workflow, /\brun:\s*npm run package:release\b/);
  assert.match(workflow, /\buses:\s*actions\/upload-artifact@v4\b/);
  assert.match(packageScript, /\bEXCLUDED_PUBLIC_FILES\b/);
  assert.match(packageScript, /\bvalidateZipArchive\b/);
});

test("the dark theme is an opt-in preference resolved through shared tokens", async () => {
  const [styles, index, ui, runtimeSettingsSource, appRuntime, helpCss] = await Promise.all([
    readFile(resolve(projectRoot, "assets", "css", "styles.css"), "utf8"),
    readFile(resolve(projectRoot, "index.html"), "utf8"),
    readFile(resolve(projectRoot, "assets", "js", "app-modules", "10-ui.js"), "utf8"),
    readFile(resolve(projectRoot, "assets", "js", "app-modules", "19-runtime-settings.js"), "utf8"),
    readFile(resolve(projectRoot, "assets", "js", "app-modules", "20-app-runtime.js"), "utf8"),
    readFile(resolve(projectRoot, "help", "en", "webmars-help.css"), "utf8")
  ]);

  // The light theme stays the default and keeps its own token block.
  assert.match(styles, /^:root \{\n\s+color-scheme: light;/m);
  assert.match(styles, /:root\[data-theme="dark"\] \{\n\s+color-scheme: dark;/);
  assert.match(ui, /^\s+theme: "light",$/m);
  assert.match(helpCss, /:root\[data-theme="dark"\]/);

  // Every token declared for the light theme must have a dark counterpart.
  const lightBlock = styles.slice(styles.indexOf(":root {"), styles.indexOf(':root[data-theme="dark"]'));
  const darkBlock = styles.slice(styles.indexOf(':root[data-theme="dark"]'), styles.indexOf("\n}", styles.indexOf(':root[data-theme="dark"]')));
  const tokensIn = (block) => new Set([...block.matchAll(/^\s+(--[a-z0-9-]+):/gm)].map((match) => match[1]));
  const lightTokens = tokensIn(lightBlock);
  const darkTokens = tokensIn(darkBlock);
  assert.ok(lightTokens.size > 60, "expected the full token palette in the light theme");
  for (const token of lightTokens) {
    assert.ok(darkTokens.has(token), `the dark theme is missing ${token}`);
  }

  // The theme is chosen before first paint and re-applied from the preference.
  assert.ok(
    index.indexOf("bootstrapWebMarsTheme") < index.indexOf("webmars-loader"),
    "the theme bootstrap must run before the splash markup"
  );
  assert.match(index, /localStorage\.getItem\("mars45-web-preferences"\)/);
  assert.match(runtimeSettingsSource, /function applyThemePreference\(theme\)/);
  assert.match(runtimeSettingsSource, /webmars:theme-changed/);
  assert.match(appRuntime, /function applyUiPreferences\(nextPreferences\) \{\n\s+applyThemePreference\(nextPreferences\.theme\);/);
  assert.match(appRuntime, /theme: sanitizeTheme\(values\.theme, current\.theme\),/);
});

test("interface colors resolve through theme tokens instead of literals", async () => {
  const themedSources = [
    "assets/js/app-modules/10-ui.js",
    "assets/js/app-modules/15-help-system.js",
    "assets/js/app-modules/18-runtime-browser-storage.js"
  ];
  // Colors that stay literal describe simulated device output, not interface
  // chrome: the bitmap screen and the near-black bezel that frames it.
  const allowedLiterals = new Set(["#000", "#20242b"]);

  for (const relativePath of themedSources) {
    const source = await readFile(resolve(projectRoot, relativePath), "utf8");
    const styleBlocks = [...source.matchAll(/style\.textContent = `(?<css>[\s\S]*?)`;/g)]
      .map((match) => match.groups.css);
    assert.ok(styleBlocks.length > 0, `${relativePath} declares no injected stylesheet`);

    for (const css of styleBlocks) {
      const literals = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)]
        .map((match) => match[0])
        .filter((color) => !allowedLiterals.has(color.toLowerCase()));
      assert.deepEqual(literals, [], `${relativePath} still hard-codes ${literals.join(", ")}`);
    }
  }
});

test("every translatable runtime message has a catalog entry in all languages", async () => {
  // Message keys reach the catalogs as decoded strings, so catalog keys are
  // decoded too: comparing raw source text would never match a key holding an
  // escape such as \n.
  function catalogKeys(source) {
    const keys = new Set();
    for (const match of source.matchAll(/^\s+"((?:[^"\\]|\\.)*)"\s*:/gm)) {
      try {
        keys.add(JSON.parse(`"${match[1]}"`));
      } catch {
        keys.add(match[1]);
      }
    }
    return keys;
  }

  const catalogs = {};
  for (const language of ["en", "pt", "es"]) {
    catalogs[language] = catalogKeys(
      await readFile(resolve(projectRoot, `assets/js/i18n/${language}.js`), "utf8")
    );
  }

  async function collectSources(directory, found = []) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const full = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        if (["dist", "node_modules", ".git", "i18n", "tests", "scripts", "docs"].includes(entry.name)) continue;
        await collectSources(full, found);
      } else if (entry.name.endsWith(".js")) {
        found.push(full);
      }
    }
    return found;
  }

  const translatingCalls = [
    "translateText", "postMarsMessage", "postRunSystemLine", "postRunRaw",
    "postRun", "setMessage", "setStatus", "confirmDialog", "requestTextDialog"
  ];
  const callPattern = new RegExp(
    `\\b(?:${translatingCalls.join("|")})\\s*\\(\\s*("(?:[^"\\\\]|\\\\.)*")`, "g"
  );

  const missing = [];
  for (const file of await collectSources(projectRoot)) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(callPattern)) {
      let key;
      try {
        key = JSON.parse(match[1]);
      } catch {
        continue;
      }
      if (!key.trim()) continue;
      for (const language of ["en", "pt", "es"]) {
        if (!catalogs[language].has(key)) {
          missing.push(`${language}: ${relative(projectRoot, file)} -> ${JSON.stringify(key)}`);
        }
      }
    }
  }

  assert.deepEqual(missing, [], `Untranslated runtime messages:\n${missing.join("\n")}`);
});
