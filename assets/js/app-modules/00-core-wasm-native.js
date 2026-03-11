(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  const NATIVE_SCRIPT_URL = "./wasm/core_engine.js";
  const NATIVE_WASM_URL = "./wasm/core_engine.wasm";

  const loaderState = {
    scriptPromise: null,
    modulePromise: null,
    module: null,
    error: ""
  };

  function loadNativeScript() {
    if (loaderState.scriptPromise) return loaderState.scriptPromise;
    loaderState.scriptPromise = new Promise((resolve, reject) => {
      if (typeof globalScope.WebMarsNativeModuleFactory === "function") {
        resolve(globalScope.WebMarsNativeModuleFactory);
        return;
      }
      const script = document.createElement("script");
      script.src = NATIVE_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        if (typeof globalScope.WebMarsNativeModuleFactory === "function") {
          resolve(globalScope.WebMarsNativeModuleFactory);
          return;
        }
        reject(new Error("Native WASM loader script did not register WebMarsNativeModuleFactory."));
      };
      script.onerror = () => reject(new Error(`Failed to load ${NATIVE_SCRIPT_URL}.`));
      document.head.appendChild(script);
    }).catch((error) => {
      loaderState.error = error instanceof Error ? error.message : String(error);
      return null;
    });
    return loaderState.scriptPromise;
  }

  async function loadNativeModule() {
    if (loaderState.module) return loaderState.module;
    if (loaderState.modulePromise) return loaderState.modulePromise;
    loaderState.modulePromise = (async () => {
      const factory = await loadNativeScript();
      if (typeof factory !== "function") return null;
      const module = await factory({
        locateFile(path) {
          if (String(path || "").endsWith(".wasm")) return NATIVE_WASM_URL;
          return path;
        },
        instantiateWasm(imports, successCallback) {
          fetch(NATIVE_WASM_URL, { credentials: "same-origin" })
            .then((response) => {
              if (!response.ok) throw new Error(`Failed to fetch ${NATIVE_WASM_URL}: HTTP ${response.status}`);
              return response.arrayBuffer();
            })
            .then((buffer) => WebAssembly.instantiate(buffer, imports))
            .then((result) => {
              successCallback(result.instance, result.module);
            })
            .catch((error) => {
              loaderState.error = error instanceof Error ? error.message : String(error);
              throw error;
            });
          return {};
        }
      });
      loaderState.module = module || null;
      return loaderState.module;
    })().catch((error) => {
      loaderState.error = error instanceof Error ? error.message : String(error);
      return null;
    });
    return loaderState.modulePromise;
  }

  function patchSnapshotWithNativeMeta(snapshot, rawState) {
    if (!snapshot || !rawState || typeof rawState !== "object") return snapshot;
    if (Number.isFinite(rawState.backstepDepth)) snapshot.backstepDepth = rawState.backstepDepth | 0;
    if (Number.isFinite(rawState.backstepHistoryBytes)) snapshot.backstepHistoryBytes = rawState.backstepHistoryBytes >>> 0;
    if (Number.isFinite(rawState.backstepHistoryBudgetBytes)) snapshot.backstepHistoryBudgetBytes = rawState.backstepHistoryBudgetBytes >>> 0;
    if (Number.isFinite(rawState.memoryUsageBytes)) snapshot.memoryUsageBytes = rawState.memoryUsageBytes >>> 0;
    if (Number.isFinite(rawState.maxMemoryBytes)) snapshot.maxMemoryBytes = rawState.maxMemoryBytes >>> 0;
    return snapshot;
  }

  function normalizeNativeResult(result) {
    if (!result || typeof result !== "object") return result;
    const normalized = { ...result };
    if (!normalized.message && normalized.messageKey) {
      const args = normalized.messageArgs && typeof normalized.messageArgs === "object"
        ? { ...normalized.messageArgs }
        : {};
      if (args.address != null) args.address = toHex(args.address >>> 0);
      normalized.message = translateText(normalized.messageKey, args);
    }
    return normalized;
  }

  class HybridNativeMarsEngine {
    constructor(options = {}) {
      this.options = options;
      this.settings = options?.settings || {};
      this.memoryMap = { ...(options?.memoryMap || {}) };
      this.helper = new MarsEngine(options);
      this.nativeModule = null;
      this.nativeEngine = null;
      this.nativeAvailable = false;
      this.nativeSynchronized = false;
      this.nativeProgramLoaded = false;
      this.helperDirtyFromNative = false;
      this.cachedRawState = null;

      this.initPromise = loadNativeModule().then((module) => {
        if (!module || typeof module.NativeMarsEngine !== "function") return null;
        this.nativeModule = module;
        this.nativeEngine = new module.NativeMarsEngine();
        this.nativeEngine.configure(this.settings, this.memoryMap);
        this.nativeAvailable = true;
        const snapshot = this.helper.getSnapshot({
          includeTextRows: false,
          includeLabels: false,
          includeDataRows: false,
          includeRegisters: false,
          includeMemoryWords: false
        });
        if (snapshot?.assembled) this.syncNativeFromHelper(true);
        return this.nativeEngine;
      }).catch(() => null);
    }

    getBackendInfo() {
      return {
        backend: "wasm",
        backendName: this.nativeSynchronized ? "wasm-cpp-native" : "wasm-cpp-hybrid",
        native: this.nativeSynchronized
      };
    }

    whenReady() {
      return this.initPromise;
    }

    markNativeStale(clearProgram = false) {
      this.nativeSynchronized = false;
      this.helperDirtyFromNative = false;
      this.cachedRawState = null;
      if (clearProgram) this.nativeProgramLoaded = false;
      if (clearProgram && this.nativeEngine && typeof this.nativeEngine.clear === "function") {
        this.nativeEngine.clear();
      }
    }

    syncNativeFromHelper(includeProgram = false) {
      if (!this.nativeEngine) return false;
      const snapshot = this.helper.exportNativeState({
        includeProgram: includeProgram || !this.nativeProgramLoaded,
        includeBreakpoints: true,
        includeExecutionPlan: includeProgram || !this.nativeProgramLoaded
      });
      snapshot.settings = { ...this.settings };
      snapshot.memoryMap = { ...this.memoryMap };
      this.nativeEngine.loadState(snapshot);
      this.nativeProgramLoaded = snapshot.executionPlan?.length > 0 || this.nativeProgramLoaded;
      this.nativeSynchronized = Boolean(snapshot.assembled);
      this.helperDirtyFromNative = false;
      this.cachedRawState = null;
      return this.nativeSynchronized;
    }

    ensureNativeSync() {
      if (!this.nativeEngine) return false;
      if (this.nativeSynchronized) return true;
      const snapshot = this.helper.getSnapshot({
        includeTextRows: false,
        includeLabels: false,
        includeDataRows: false,
        includeRegisters: false,
        includeMemoryWords: false
      });
      if (!snapshot?.assembled) return false;
      return this.syncNativeFromHelper(!this.nativeProgramLoaded);
    }

    exportRawNativeState(includeProgram = false) {
      if (!this.nativeEngine || !this.nativeSynchronized) return null;
      if (!includeProgram && !this.helperDirtyFromNative && this.cachedRawState) return this.cachedRawState;
      const raw = this.nativeEngine.exportState(includeProgram, true);
      if (!includeProgram) this.cachedRawState = raw;
      return raw;
    }

    syncHelperFromNative(snapshotOptions = {}) {
      if (!this.nativeEngine || !this.nativeSynchronized) return this.helper.getSnapshot(snapshotOptions);
      const raw = this.exportRawNativeState(false);
      if (raw) {
        this.helper.importNativeState(raw, {
          preserveProgram: true,
          preserveBreakpoints: false
        });
        this.helperDirtyFromNative = false;
      }
      const snapshot = this.helper.getSnapshot(snapshotOptions);
      return patchSnapshotWithNativeMeta(snapshot, raw);
    }

    replaceNativeStateFromHelper(previousState) {
      if (!this.nativeEngine) return;
      const afterState = this.helper.exportNativeState({
        includeProgram: false,
        includeBreakpoints: true,
        includeExecutionPlan: false
      });
      afterState.settings = { ...this.settings };
      afterState.memoryMap = { ...this.memoryMap };
      const before = previousState && typeof previousState === "object"
        ? { ...previousState, settings: { ...this.settings }, memoryMap: { ...this.memoryMap } }
        : afterState;
      this.nativeEngine.replaceStateFromHost(afterState, before);
      this.nativeSynchronized = Boolean(afterState.assembled);
      this.nativeProgramLoaded = this.nativeProgramLoaded || Boolean(afterState.assembled);
      this.helperDirtyFromNative = true;
      this.cachedRawState = null;
    }

    performDelegatedStep(options = {}, nativeCurrentState = null) {
      const previous = nativeCurrentState && typeof nativeCurrentState === "object"
        ? nativeCurrentState
        : this.exportRawNativeState(false);
      if (previous) {
        this.helper.importNativeState(previous, {
          preserveProgram: true,
          preserveBreakpoints: false
        });
      }
      const result = this.helper.step({ ...options, includeSnapshot: false });
      if (this.nativeEngine) this.replaceNativeStateFromHelper(previous);
      if (options.includeSnapshot !== false) {
        result.snapshot = this.getSnapshot(options.snapshotOptions || {});
      }
      return result;
    }

    assemble(source, options = {}) {
      const includeFiles = [];
      if (this.helper?.sourceFiles instanceof Map) {
        this.helper.sourceFiles.forEach((value, key) => {
          includeFiles.push([String(key), String(value ?? "")]);
        });
      }
      if (options.includeMap instanceof Map) {
        options.includeMap.forEach((value, key) => {
          includeFiles.push([String(key), String(value ?? "")]);
        });
      }

      if (this.nativeEngine && typeof this.nativeEngine.assemble === "function") {
        const nativeResult = this.nativeEngine.assemble(String(source ?? ""), {
          sourceName: options.sourceName || this.helper?.activeSourceName || this.helper?.defaultSourceName || "main.s",
          includeFiles,
          referencePseudoOps: Array.isArray(globalScope.WebMarsReferenceData?.pseudoOps) ? globalScope.WebMarsReferenceData.pseudoOps : [],
          programArgumentsEnabled: options.programArgumentsEnabled ?? this.settings.programArguments,
          programArguments: options.programArguments ?? this.settings.programArgumentsLine ?? ""
        });
        if (!nativeResult?.fallback) {
          const snapshot = nativeResult?.snapshot && typeof nativeResult.snapshot === "object"
            ? nativeResult.snapshot
            : this.nativeEngine.exportState(false, true);
          this.helper.importNativeState(snapshot, {
            preserveProgram: false,
            preserveBreakpoints: false
          });
          this.cachedRawState = this.nativeEngine.exportState(false, true);
          this.helperDirtyFromNative = false;
          this.nativeSynchronized = Boolean(snapshot?.assembled);
          this.nativeProgramLoaded = Array.isArray(snapshot?.textRows) && snapshot.textRows.length > 0;
          return {
            ok: Boolean(nativeResult?.ok),
            native: true,
            warnings: Array.isArray(snapshot?.warnings) ? snapshot.warnings : [],
            errors: Array.isArray(snapshot?.errors) ? snapshot.errors : []
          };
        }
      }

      const result = this.helper.assemble(source, options);
      this.cachedRawState = null;
      this.helperDirtyFromNative = false;
      if (!result?.ok) {
        this.markNativeStale(true);
        return result;
      }
      if (this.nativeEngine) {
        this.syncNativeFromHelper(true);
      } else {
        void this.whenReady().then(() => this.syncNativeFromHelper(true));
      }
      return {
        ...result,
        native: false
      };
    }

    step(options = {}) {
      if (!this.ensureNativeSync()) return this.helper.step(options);
      const nativeResult = normalizeNativeResult(this.nativeEngine.step());
      if (nativeResult?.delegate) {
        const currentRaw = this.nativeEngine.exportState(false, true);
        this.cachedRawState = currentRaw;
        return this.performDelegatedStep(options, currentRaw);
      }
      this.helperDirtyFromNative = true;
      this.cachedRawState = null;
      if (options.includeSnapshot !== false) {
        nativeResult.snapshot = this.getSnapshot(options.snapshotOptions || {});
      }
      return nativeResult;
    }

    stepMany(maxSteps = 1, options = {}) {
      const limit = Math.max(1, Number(maxSteps) | 0);
      if (!this.ensureNativeSync()) {
        let executed = 0;
        let lastResult = null;
        while (executed < limit) {
          lastResult = this.helper.step({ includeSnapshot: false });
          executed += 1;
          if (!lastResult?.ok || lastResult?.done || lastResult?.stoppedOnBreakpoint || lastResult?.waitingForInput || lastResult?.runIo) break;
        }
        return {
          ...(lastResult || { ok: true, done: false, message: translateText("Execution stopped.") }),
          stepsExecuted: executed,
          snapshot: options.includeSnapshot === false ? undefined : this.getSnapshot(options.snapshotOptions || {})
        };
      }

      const beforeRaw = this.exportRawNativeState(false);
      const stepsBefore = Number.isFinite(beforeRaw?.steps) ? (beforeRaw.steps | 0) : 0;
      const nativeResult = normalizeNativeResult(this.nativeEngine.go(limit));
      const afterRaw = this.nativeEngine.exportState(false, true);
      const nativeExecuted = Math.max(0, (Number.isFinite(afterRaw?.steps) ? (afterRaw.steps | 0) : stepsBefore) - stepsBefore);
      if (nativeResult?.delegate) {
        this.cachedRawState = afterRaw;
        const delegated = this.performDelegatedStep({ includeSnapshot: false }, afterRaw);
        return {
          ...delegated,
          stepsExecuted: nativeExecuted + 1,
          snapshot: options.includeSnapshot === false ? undefined : this.getSnapshot(options.snapshotOptions || {})
        };
      }

      this.helperDirtyFromNative = true;
      this.cachedRawState = afterRaw;
      nativeResult.stepsExecuted = nativeExecuted;
      if (options.includeSnapshot !== false) {
        nativeResult.snapshot = this.getSnapshot(options.snapshotOptions || {});
      }
      return nativeResult;
    }

    go(maxSteps = 500) {
      const result = this.stepMany(maxSteps, { includeSnapshot: false });
      return {
        ...(result || { ok: true, done: false, message: translateText("Execution stopped.") }),
        stepsExecuted: Number.isFinite(result?.stepsExecuted) ? (result.stepsExecuted | 0) : 0,
        snapshot: this.getSnapshot()
      };
    }

    backstep() {
      if (!this.ensureNativeSync()) return this.helper.backstep();
      const result = normalizeNativeResult(this.nativeEngine.backstep());
      if (result?.ok) {
        this.helperDirtyFromNative = true;
        this.cachedRawState = null;
        result.snapshot = this.getSnapshot();
      }
      return result;
    }

    reset() {
      const result = this.helper.reset();
      this.markNativeStale(true);
      return result;
    }

    stop() {
      if (!this.ensureNativeSync()) return this.helper.stop();
      const result = normalizeNativeResult(this.nativeEngine.stop());
      if (result?.ok) {
        this.helperDirtyFromNative = true;
        this.cachedRawState = null;
        result.snapshot = this.getSnapshot();
      }
      return result;
    }

    getSnapshot(options = {}) {
      if (this.nativeSynchronized && this.helperDirtyFromNative) {
        return this.syncHelperFromNative(options);
      }
      const snapshot = this.helper.getSnapshot(options);
      return patchSnapshotWithNativeMeta(snapshot, this.cachedRawState);
    }

    toggleBreakpoint(address) {
      const value = this.helper.toggleBreakpoint(address);
      if (this.nativeEngine) this.nativeEngine.toggleBreakpoint(address >>> 0);
      this.cachedRawState = null;
      return value;
    }

    setRuntimeHooks(hooks = {}) {
      return this.helper.setRuntimeHooks(hooks);
    }

    setMemoryMap(memoryMap = {}) {
      this.memoryMap = { ...this.memoryMap, ...memoryMap };
      const result = this.helper.setMemoryMap(memoryMap);
      if (this.nativeEngine) this.nativeEngine.configure(this.settings, this.memoryMap);
      this.markNativeStale(true);
      return result;
    }

    setSourceFiles(files = new Map()) {
      const result = this.helper.setSourceFiles(files);
      this.markNativeStale(true);
      return result;
    }

    trimExecutionHistory() {
      if (!this.ensureNativeSync()) return this.helper.trimExecutionHistory();
      this.nativeEngine.trimExecutionHistory();
      this.helperDirtyFromNative = true;
      this.cachedRawState = null;
      return undefined;
    }

    getMemoryUsageBytes() {
      if (!this.ensureNativeSync()) return this.helper.getMemoryUsageBytes();
      return this.nativeEngine.getMemoryUsageBytes();
    }

    readByte(address, signed = true) {
      const addr = address >>> 0;
      if (this.ensureNativeSync() && this.nativeEngine && typeof this.nativeEngine.readByte === "function") {
        return this.nativeEngine.readByte(addr, signed !== false) | 0;
      }
      return this.helper.readByte(addr, signed !== false);
    }

    writeByte(address, value) {
      const addr = address >>> 0;
      const numeric = value | 0;
      if (this.ensureNativeSync() && this.nativeEngine && typeof this.nativeEngine.writeByte === "function") {
        this.nativeEngine.writeByte(addr, numeric);
        this.helperDirtyFromNative = true;
        this.cachedRawState = null;
        return undefined;
      }
      return this.helper.writeByte(addr, numeric);
    }

    readWord(address) {
      const addr = address >>> 0;
      if (this.ensureNativeSync() && this.nativeEngine && typeof this.nativeEngine.readWord === "function") {
        return this.nativeEngine.readWord(addr) | 0;
      }
      return this.helper.readWord(addr);
    }

    writeWord(address, value) {
      const addr = address >>> 0;
      const numeric = value | 0;
      if (this.ensureNativeSync() && this.nativeEngine && typeof this.nativeEngine.writeWord === "function") {
        this.nativeEngine.writeWord(addr, numeric);
        this.helperDirtyFromNative = true;
        this.cachedRawState = null;
        return undefined;
      }
      return this.helper.writeWord(addr, numeric);
    }

    getSyscallMatrix() {
      return this.helper.getSyscallMatrix();
    }

    auditSyscallMatrix() {
      return this.helper.auditSyscallMatrix();
    }
  }

  globalScope.WebMarsNativeFactory = {
    async createEngine(options = {}) {
      const engine = new HybridNativeMarsEngine(options);
      await engine.whenReady();
      return engine;
    },
    createEngineSync(options = {}) {
      return new HybridNativeMarsEngine(options);
    },
    getStatus() {
      return {
        ready: Boolean(loaderState.module),
        error: loaderState.error
      };
    }
  };

  void loadNativeModule();
})();
