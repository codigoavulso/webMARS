(function initRuntimeSettingsModule(rootScope) {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);
  const registry = root.WebMarsModules || (root.WebMarsModules = {});
  if (registry.runtimeSettings) return;

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
    getAvailableLanguages
  });
})(typeof window !== "undefined" ? window : globalThis);
