(function initRuntimeSettingsModule(rootScope) {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);
  const registry = root.WebMarsModules || (root.WebMarsModules = {});
  if (registry.runtimeSettings) return;

  const THEMES = ["system", "light", "dark"];
  const DEFAULT_THEME = "system";
  let activeThemePreference = DEFAULT_THEME;
  let systemThemeMedia = null;

  const MIN_MEMORY_GB = 0.25;
  const MAX_MEMORY_GB = 2;
  const MAX_MEMORY_BYTES = 0x7fffffff;
  const DEFAULT_MEMORY_GB = 2;
  const DEFAULT_MAX_BACKSTEPS = 100;
  const MIN_MAX_BACKSTEPS = 0;
  const MAX_MAX_BACKSTEPS = 1000000;

  function sanitizeMemoryGb(value, fallback = DEFAULT_MEMORY_GB) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(MIN_MEMORY_GB, Math.min(MAX_MEMORY_GB, parsed));
  }

  function sanitizeMaxBacksteps(value, fallback = DEFAULT_MAX_BACKSTEPS) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(MIN_MAX_BACKSTEPS, Math.min(MAX_MAX_BACKSTEPS, parsed));
  }

  function parseStrictAddress(value) {
    if (typeof value === "number") {
      return Number.isInteger(value) && value >= 0 && value <= 0xffffffff
        ? value >>> 0
        : null;
    }

    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!/^(?:0x[0-9a-f]+|\+?[0-9]+)$/i.test(trimmed)) return null;

    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 0xffffffff) return null;
    return parsed >>> 0;
  }

  function isValidAddressPreference(value) {
    return parseStrictAddress(value) !== null;
  }

  function parseAddressPreference(value, fallback = 0) {
    return parseStrictAddress(value) ?? parseStrictAddress(fallback) ?? 0;
  }

  function memoryGbToBytes(gbValue) {
    return Math.min(MAX_MEMORY_BYTES, Math.floor(sanitizeMemoryGb(gbValue) * 1024 * 1024 * 1024));
  }

  function getI18nApi() {
    return typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
  }

  function applyLanguagePreference(language) {
    const i18n = getI18nApi();
    if (!i18n || typeof i18n.setLanguage !== "function") return;
    const currentLanguage = typeof i18n.getLanguage === "function" ? i18n.getLanguage() : "";
    i18n.setLanguage(language || currentLanguage || "en");
  }

  function getAvailableLanguages() {
    const i18n = getI18nApi();
    if (!i18n || typeof i18n.getLanguages !== "function") return ["en"];
    const languages = i18n.getLanguages();
    return languages.length ? languages : ["en"];
  }

  function getAvailableThemes() {
    return THEMES.slice();
  }

  function sanitizeTheme(value, fallback = DEFAULT_THEME) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (THEMES.includes(normalized)) return normalized;
    const normalizedFallback = String(fallback ?? "").trim().toLowerCase();
    return THEMES.includes(normalizedFallback) ? normalizedFallback : DEFAULT_THEME;
  }

  function resolveThemePreference(theme) {
    const preference = sanitizeTheme(theme);
    if (preference !== "system") return preference;
    return typeof root.matchMedia === "function" && root.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function watchSystemTheme() {
    if (systemThemeMedia || typeof root.matchMedia !== "function") return;
    systemThemeMedia = root.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (activeThemePreference === "system") applyThemePreference("system");
    };
    if (typeof systemThemeMedia.addEventListener === "function") {
      systemThemeMedia.addEventListener("change", handleChange);
    } else if (typeof systemThemeMedia.addListener === "function") {
      systemThemeMedia.addListener(handleChange);
    }
  }

  // Light remains the attribute-free token palette. The system preference is
  // resolved against the browser color scheme here and before first paint in
  // index.html, while explicit light/dark choices keep overriding the browser.
  function applyThemePreference(theme) {
    const preference = sanitizeTheme(theme);
    activeThemePreference = preference;
    watchSystemTheme();
    const resolved = resolveThemePreference(preference);
    const documentRef = typeof document !== "undefined" ? document : null;
    const rootElement = documentRef ? documentRef.documentElement : null;
    if (!rootElement) return resolved;

    const previous = rootElement.getAttribute("data-theme");
    if (resolved === "light") {
      rootElement.removeAttribute("data-theme");
    } else {
      rootElement.setAttribute("data-theme", resolved);
    }

    // Documents hosted in help frames cannot inherit the tokens, so they
    // follow this event instead.
    if (previous !== rootElement.getAttribute("data-theme") && typeof root.dispatchEvent === "function") {
      root.dispatchEvent(new CustomEvent("webmars:theme-changed", {
        detail: { theme: resolved, preference }
      }));
    }
    return resolved;
  }

  registry.runtimeSettings = Object.freeze({
    MIN_MEMORY_GB,
    MAX_MEMORY_GB,
    MAX_MEMORY_BYTES,
    DEFAULT_MEMORY_GB,
    DEFAULT_MAX_BACKSTEPS,
    MIN_MAX_BACKSTEPS,
    MAX_MAX_BACKSTEPS,
    sanitizeMemoryGb,
    sanitizeMaxBacksteps,
    isValidAddressPreference,
    parseAddressPreference,
    memoryGbToBytes,
    getI18nApi,
    applyLanguagePreference,
    getAvailableLanguages,
    getAvailableThemes,
    sanitizeTheme,
    resolveThemePreference,
    applyThemePreference
  });
})(typeof window !== "undefined" ? window : globalThis);
