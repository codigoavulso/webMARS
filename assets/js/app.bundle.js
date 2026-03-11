(() => {
  const CORE_MODULE_SCRIPTS = [
    "./assets/js/app-modules/00-core-wasm-hotpath.js",
    "./assets/js/app-modules/00-i18n.js",
    "./assets/js/reference/pseudo-ops.generated.js",
    "./assets/js/reference/syscalls.generated.js",
  ];

  const DEFAULT_LANGUAGE_MODULE_SCRIPTS = [
    "./assets/js/i18n/en.js"
  ];

  const APP_MODULE_SCRIPTS = [
    "./assets/js/app-modules/00-core-store.js",
    "./assets/js/app-modules/00-core.js",
    "./assets/js/app-modules/00-core-wasm-native.js",
    "./assets/js/app-modules/00-core-wasm-bridge.js",
    "./assets/js/app-modules/05-layout-config.js",
    "./assets/js/app-modules/09-ui-translation.js",
    "./assets/js/app-modules/10-ui.js",
    "./assets/js/app-modules/11-ui-help-system-bridge.js",
    "./assets/js/app-modules/12-ui-tool-manager.js",
    "./assets/js/app-modules/13-ui-menu-system.js",
    "./assets/js/app-modules/15-help-system.js",
    "./assets/js/app-modules/18-runtime-browser-storage.js",
    "./assets/js/app-modules/19-runtime-settings.js",
    "./assets/js/app-modules/20-app-runtime.js"
  ];
  const LANGUAGE_MANIFEST_PATH = "./assets/js/i18n/languages.json";

  if (window.__marsWebAppBootstrapped) return;

  function loadSequential(moduleScripts, index) {
    if (index >= moduleScripts.length) {
      window.__marsWebAppBootstrapped = true;
      return;
    }

    const src = moduleScripts[index];
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => loadSequential(moduleScripts, index + 1);
    script.onerror = () => {
      console.error(`[mars-web] Failed to load module: ${src}`);
      const root = document.querySelector("#app") || document.body;
      const msg = document.createElement("pre");
      msg.textContent = `MARS web loader error: failed to load ${src}`;
      msg.style.color = "#8b0000";
      msg.style.padding = "8px";
      root.appendChild(msg);
    };
    document.head.appendChild(script);
  }

  async function loadLanguageModules() {
    try {
      const response = await fetch(LANGUAGE_MANIFEST_PATH, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const manifest = await response.json();
      const entries = Array.isArray(manifest)
        ? manifest
        : Array.isArray(manifest?.languages)
          ? manifest.languages
          : [];
      const modules = entries
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
        .map((entry) => (
          entry.startsWith("./") || entry.startsWith("/")
            ? entry
            : `./assets/js/i18n/${entry}`
        ));
      return modules.length ? modules : DEFAULT_LANGUAGE_MODULE_SCRIPTS;
    } catch {
      return DEFAULT_LANGUAGE_MODULE_SCRIPTS;
    }
  }

  async function bootstrap() {
    const languageModuleScripts = await loadLanguageModules();
    loadSequential(
      [...CORE_MODULE_SCRIPTS, ...languageModuleScripts, ...APP_MODULE_SCRIPTS],
      0
    );
  }

  void bootstrap();
})();
