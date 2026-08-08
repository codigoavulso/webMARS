(() => {
  const CORE_MODULE_SCRIPTS = [
    "./assets/js/app-modules/00-i18n.js",
    "./assets/js/reference/pseudo-ops.generated.js",
    "./assets/js/reference/instructions.generated.js",
    "./assets/js/reference/syscalls.generated.js",
  ];

  const DEFAULT_LANGUAGE_MODULE_SCRIPTS = [
    "./assets/js/i18n/en.js"
  ];
  const LANGUAGE_MODULE_BASE = "./assets/js/i18n/";

  const APP_MODULE_SCRIPTS = [
    "./assets/js/app-modules/00-core-store.js",
    "./assets/js/app-modules/00-core.js",
    "./assets/js/app-modules/05-layout-config.js",
    "./assets/js/app-modules/09-ui-translation.js",
    "./assets/js/app-modules/10-ui.js",
    "./assets/js/app-modules/11-ui-file-manager.js",
    "./assets/js/app-modules/12-ui-tool-manager.js",
    "./assets/js/app-modules/13-ui-menu-system.js",
    "./assets/js/app-modules/15-help-system.js",
    "./assets/js/app-modules/17-mini-c-compiler.js",
    "./assets/js/app-modules/18-runtime-browser-storage.js",
    "./assets/js/app-modules/19-runtime-settings.js",
    "./assets/js/app-modules/19-runtime-benchmarks.js",
    "./assets/js/app-modules/20-app-runtime.js"
  ];
  const LANGUAGE_MANIFEST_PATH = "./assets/js/i18n/languages.json";

  if (window.__marsWebAppBootstrapped) return;

  function withAppVersion(path) {
    return window.WebMarsAppVersion?.withVersion?.(path) || path;
  }

  function dispatchLoaderEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {
      window.dispatchEvent(new Event(name));
    }
  }

  function reportModuleFailure(src) {
    console.error(`[mars-web] Failed to load module: ${src}`);
    const root = document.querySelector("#app") || document.body;
    const msg = document.createElement("pre");
    msg.textContent = `MARS web loader error: failed to load ${src}`;
    msg.style.color = "#8b0000";
    msg.style.padding = "8px";
    root.appendChild(msg);
    dispatchLoaderEvent("webmars:scripts-loaded", { ok: false, failedModule: src });
  }

  function loadScript(src) {
    return new Promise((settle) => {
      const script = document.createElement("script");
      script.src = withAppVersion(src);
      script.async = false;
      script.onload = () => settle(true);
      script.onerror = () => settle(false);
      document.head.appendChild(script);
    });
  }

  async function loadSequential(moduleScripts) {
    for (const src of moduleScripts) {
      if (!await loadScript(src)) {
        reportModuleFailure(src);
        return false;
      }
    }
    return true;
  }

  async function readLanguageManifest() {
    try {
      const response = await fetch(LANGUAGE_MANIFEST_PATH, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      const entries = Array.isArray(manifest) ? manifest : manifest?.languages;
      if (!Array.isArray(entries)) return [];
      return entries.map((entry) => String(entry || "").trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  // Only the fallback and the language actually being read are fetched up front.
  // Loading all twenty catalogs cost ~2.7 MB before the first frame; the rest
  // now arrive through WebMarsI18n.ensureLanguage when the reader switches.
  function bootLanguageModules(manifestEntries) {
    const available = new Set(manifestEntries.map((entry) => (
      entry.replace(/^.*\//, "").replace(/\.js$/i, "")
    )));
    const active = window.WebMarsI18n?.getLanguage?.() || "en";
    const wanted = ["en", active].filter((language, index, all) => (
      all.indexOf(language) === index && (available.size === 0 ? language === "en" : available.has(language))
    ));
    const modules = wanted.map((language) => `${LANGUAGE_MODULE_BASE + language}.js`);
    return modules.length ? modules : DEFAULT_LANGUAGE_MODULE_SCRIPTS;
  }

  async function bootstrap() {
    const manifestEntries = await readLanguageManifest();
    if (!await loadSequential(CORE_MODULE_SCRIPTS)) return;
    if (!await loadSequential(bootLanguageModules(manifestEntries))) return;
    if (!await loadSequential(APP_MODULE_SCRIPTS)) return;
    window.__marsWebAppBootstrapped = true;
    dispatchLoaderEvent("webmars:scripts-loaded", { ok: true });
  }

  void bootstrap();
})();
