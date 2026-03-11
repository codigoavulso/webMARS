(function initRuntimeSettingsModule(rootScope) {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);
  const registry = root.WebMarsModules || (root.WebMarsModules = {});
  if (registry.runtimeSettings) return;

  const MIN_MEMORY_GB = 0.25;
  const MAX_MEMORY_GB = 16;
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

  function memoryGbToBytes(gbValue) {
    return Math.floor(sanitizeMemoryGb(gbValue) * 1024 * 1024 * 1024);
  }

  function getI18nApi() {
    return typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
  }

  function applyLanguagePreference(language) {
    const i18n = getI18nApi();
    if (!i18n || typeof i18n.setLanguage !== "function") return;
    i18n.setLanguage(language || "en");
  }

  function getAvailableLanguages() {
    const i18n = getI18nApi();
    if (!i18n || typeof i18n.getLanguages !== "function") return ["en"];
    const languages = i18n.getLanguages();
    return languages.length ? languages : ["en"];
  }

  registry.runtimeSettings = Object.freeze({
    MIN_MEMORY_GB,
    MAX_MEMORY_GB,
    DEFAULT_MEMORY_GB,
    DEFAULT_MAX_BACKSTEPS,
    MIN_MAX_BACKSTEPS,
    MAX_MAX_BACKSTEPS,
    sanitizeMemoryGb,
    sanitizeMaxBacksteps,
    memoryGbToBytes,
    getI18nApi,
    applyLanguagePreference,
    getAvailableLanguages
  });
})(typeof window !== "undefined" ? window : globalThis);
