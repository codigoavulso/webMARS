(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  const existing = globalScope.WebMarsWasmCore;

  const bridgeState = {
    ready: false,
    backendName: "js-fallback",
    reason: "No WASM core registered.",
    createEngineSync: null,
    createEngineAsync: null
  };

  function markUnavailable(reason) {
    bridgeState.ready = false;
    bridgeState.backendName = "js-fallback";
    bridgeState.reason = reason || "No WASM core registered.";
    bridgeState.createEngineSync = null;
    bridgeState.createEngineAsync = null;
  }

  function registerFactory(factory, backendName = "wasm-cpp") {
    if (!factory || typeof factory !== "object") {
      markUnavailable("Invalid WASM factory object.");
      return false;
    }

    const createSync = typeof factory.createEngineSync === "function"
      ? factory.createEngineSync.bind(factory)
      : null;
    const createAsync = typeof factory.createEngine === "function"
      ? factory.createEngine.bind(factory)
      : null;

    if (!createSync && !createAsync) {
      markUnavailable("Factory missing createEngineSync/createEngine methods.");
      return false;
    }

    bridgeState.ready = true;
    bridgeState.backendName = backendName || "wasm-cpp";
    bridgeState.reason = "";
    bridgeState.createEngineSync = createSync;
    bridgeState.createEngineAsync = createAsync;
    return true;
  }

  async function init(options = {}) {
    if (bridgeState.ready) return true;

    const loader = options && typeof options.loader === "function" ? options.loader : null;
    if (loader) {
      try {
        await loader();
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        markUnavailable(`WASM loader failed: ${reason}`);
        return false;
      }
    }

    if (options && options.factory) {
      return registerFactory(options.factory, options.backendName || "wasm-cpp");
    }

    if (globalScope.WebMarsNativeFactory) {
      return registerFactory(globalScope.WebMarsNativeFactory, "wasm-cpp");
    }

    markUnavailable("No WebMarsNativeFactory found (JS engine will be used).");
    return false;
  }

  const bridgeApi = {
    version: "0.1.0",
    get status() {
      return {
        ready: bridgeState.ready,
        backendName: bridgeState.backendName,
        reason: bridgeState.reason
      };
    },
    isReady() {
      return bridgeState.ready;
    },
    async init(options = {}) {
      return init(options);
    },
    registerFactory(factory, backendName = "wasm-cpp") {
      return registerFactory(factory, backendName);
    },
    createEngineSync(options = {}) {
      if (!bridgeState.ready || !bridgeState.createEngineSync) return null;
      return bridgeState.createEngineSync(options);
    },
    async createEngine(options = {}) {
      if (bridgeState.ready && bridgeState.createEngineAsync) {
        return bridgeState.createEngineAsync(options);
      }
      if (bridgeState.ready && bridgeState.createEngineSync) {
        return bridgeState.createEngineSync(options);
      }
      return null;
    }
  };

  if (existing && typeof existing.createEngineSync === "function") {
    registerFactory(existing, "wasm-cpp");
  } else {
    markUnavailable("No WASM backend loaded (using JS core).");
  }

  globalScope.WebMarsWasmCore = bridgeApi;
})();
