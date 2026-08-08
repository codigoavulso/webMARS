(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  const STORAGE_KEY = "webmars-language-v1";
  const SUPPORTED_LANGUAGES = new Set([
    "en", "es", "pt", "zh", "hi", "ar", "fr", "bn", "ru", "id",
    "de", "ja", "ko", "tr", "vi", "ur", "it", "pl", "fa", "th"
  ]);
  const RIGHT_TO_LEFT_LANGUAGES = new Set(["ar", "ur", "fa"]);
  const listeners = new Set();

  function normalizeLanguage(language) {
    return String(language || "").trim();
  }

  function matchSupportedLanguage(language) {
    const normalized = normalizeLanguage(language).toLowerCase().replaceAll("_", "-");
    if (!normalized) return "";
    const exact = normalized === "in" ? "id" : normalized;
    if (SUPPORTED_LANGUAGES.has(exact)) return exact;
    const base = exact.split("-")[0];
    const aliasedBase = base === "in" ? "id" : base;
    return SUPPORTED_LANGUAGES.has(aliasedBase) ? aliasedBase : "";
  }

  function detectBrowserLanguage() {
    const browserLanguages = Array.isArray(globalScope.navigator?.languages)
      ? globalScope.navigator.languages
      : [];
    const candidates = [...browserLanguages, globalScope.navigator?.language];
    for (const candidate of candidates) {
      const supported = matchSupportedLanguage(candidate);
      if (supported) return supported;
    }
    return "en";
  }

  function formatMessage(template, variables = {}) {
    const source = String(template ?? "");
    return source.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(variables, key)
        ? String(variables[key])
        : match
    ));
  }

  const state = {
    fallbackLanguage: "en",
    currentLanguage: "en",
    catalogs: new Map()
  };

  function applyDocumentLanguage() {
    const documentElement = globalScope.document?.documentElement;
    if (!documentElement) return;
    const language = state.currentLanguage || state.fallbackLanguage || "en";
    documentElement.lang = language;
    documentElement.dir = RIGHT_TO_LEFT_LANGUAGES.has(language.toLowerCase().split("-")[0]) ? "rtl" : "ltr";
  }

  try {
    const storedLanguage = matchSupportedLanguage(globalScope.localStorage?.getItem(STORAGE_KEY));
    state.currentLanguage = storedLanguage || detectBrowserLanguage();
  } catch {
    state.currentLanguage = detectBrowserLanguage();
  }

  function emitChange() {
    const detail = {
      language: state.currentLanguage,
      fallbackLanguage: state.fallbackLanguage,
      languages: [...state.catalogs.keys()]
    };
    listeners.forEach((listener) => {
      try {
        listener(detail);
      } catch {
        // Ignore listener failures.
      }
    });
    if (typeof globalScope.dispatchEvent === "function" && typeof globalScope.CustomEvent === "function") {
      try {
        globalScope.dispatchEvent(new globalScope.CustomEvent("webmars:languagechange", { detail }));
      } catch {
        // Ignore event dispatch failures.
      }
    }
  }

  function getCatalog(language) {
    return state.catalogs.get(normalizeLanguage(language)) || null;
  }

  // Catalogs are ~130 KB each, so loading all twenty at boot costs more than
  // the rest of the application put together. Only English and the active
  // language are resident; the rest arrive when the reader asks for them.
  const pendingLanguageLoads = new Map();

  // Assembled from a base rather than written as one literal: the release
  // packagers resolve every "./....js" string in the sources against the
  // shipped file list, and a path holding a placeholder resolves to nothing.
  const LANGUAGE_MODULE_BASE = "./assets/js/i18n/";

  function languageModuleUrl(language) {
    const path = `${LANGUAGE_MODULE_BASE + language}.js`;
    const withVersion = globalScope.WebMarsAppVersion?.withVersion;
    return typeof withVersion === "function" ? withVersion(path) : path;
  }

  function ensureLanguage(language) {
    const key = normalizeLanguage(language);
    if (!key || state.catalogs.has(key)) return Promise.resolve(state.catalogs.has(key));
    if (pendingLanguageLoads.has(key)) return pendingLanguageLoads.get(key);
    if (!SUPPORTED_LANGUAGES.has(key)) return Promise.resolve(false);

    const documentRef = globalScope.document;
    const host = documentRef?.head || documentRef?.body;
    // Outside a browser (tests, tooling) there is nothing to inject into.
    if (!host || typeof documentRef.createElement !== "function") return Promise.resolve(false);

    const pending = new Promise((settle) => {
      const script = documentRef.createElement("script");
      script.src = languageModuleUrl(key);
      script.async = false;
      script.onload = () => settle(state.catalogs.has(key));
      script.onerror = () => settle(false);
      host.appendChild(script);
    }).then((loaded) => {
      pendingLanguageLoads.delete(key);
      return loaded;
    });
    pendingLanguageLoads.set(key, pending);
    return pending;
  }

  function registerLanguage(language, catalog = {}) {
    const key = normalizeLanguage(language);
    if (!key) return false;
    const existing = getCatalog(key) || {};
    state.catalogs.set(key, { ...existing, ...catalog });
    applyDocumentLanguage();
    emitChange();
    return true;
  }

  function setLanguage(language) {
    const key = normalizeLanguage(language);
    if (!key) return false;
    const changed = state.currentLanguage !== key;
    state.currentLanguage = key;
    try {
      globalScope.localStorage?.setItem(STORAGE_KEY, key);
    } catch {
      // Ignore storage failures.
    }
    applyDocumentLanguage();
    if (changed) emitChange();
    // A catalog that is not resident yet renders as English until it lands;
    // registerLanguage emits again on arrival, so the interface repaints itself.
    if (!state.catalogs.has(key)) void ensureLanguage(key);
    return true;
  }

  function translate(message, variables = {}) {
    const key = String(message ?? "");
    const primary = getCatalog(state.currentLanguage) || {};
    const fallback = getCatalog(state.fallbackLanguage) || {};
    const template = primary[key] ?? fallback[key] ?? key;
    return formatMessage(template, variables);
  }

  const api = {
    format: formatMessage,
    registerLanguage,
    getCatalog(language) {
      const catalog = getCatalog(language);
      return catalog ? { ...catalog } : null;
    },
    setLanguage,
    hasLanguage(language) {
      return state.catalogs.has(normalizeLanguage(language));
    },
    ensureLanguage,
    getLanguages() {
      // Every supported language is offered, not just the resident ones, so
      // lazy loading never shrinks the picker.
      return [...new Set([...SUPPORTED_LANGUAGES, ...state.catalogs.keys()])]
        .sort((a, b) => a.localeCompare(b));
    },
    getLanguage() {
      return state.currentLanguage;
    },
    getFallbackLanguage() {
      return state.fallbackLanguage;
    },
    setFallbackLanguage(language) {
      const key = normalizeLanguage(language);
      if (!key) return false;
      const changed = state.fallbackLanguage !== key;
      state.fallbackLanguage = key;
      if (changed) emitChange();
      return true;
    },
    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    t(message, variables = {}) {
      return translate(message, variables);
    }
  };

  globalScope.WebMarsI18n = api;
  applyDocumentLanguage();
})();
