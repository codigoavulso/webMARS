(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  const STORAGE_KEY = "webmars-language-v1";
  const listeners = new Set();

  function normalizeLanguage(language) {
    return String(language || "").trim();
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

  try {
    const storedLanguage = globalScope.localStorage?.getItem(STORAGE_KEY);
    if (storedLanguage) state.currentLanguage = storedLanguage;
  } catch {
    // Ignore storage access issues and keep the default language.
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

  function registerLanguage(language, catalog = {}) {
    const key = normalizeLanguage(language);
    if (!key) return false;
    const existing = getCatalog(key) || {};
    state.catalogs.set(key, { ...existing, ...catalog });
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
    if (changed) emitChange();
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
    getLanguages() {
      return [...state.catalogs.keys()].sort((a, b) => a.localeCompare(b));
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
})();
