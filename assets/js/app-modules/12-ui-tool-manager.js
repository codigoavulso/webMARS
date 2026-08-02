function deliverToolSnapshotBatch(instances, snapshots, onError = () => {}) {
  const queue = Array.isArray(snapshots) ? snapshots.filter(Boolean) : (snapshots ? [snapshots] : []);
  if (!queue.length || !(instances instanceof Map) || instances.size === 0) return;

  queue.forEach((snapshot, snapshotIndex) => {
    instances.forEach((tool, toolId) => {
      if (!tool || typeof tool.onSnapshot !== "function") return;
      try {
        tool.onSnapshot(snapshot, {
          batched: queue.length > 1,
          batchSize: queue.length,
          batchIndex: snapshotIndex,
          isLast: snapshotIndex === queue.length - 1
        });
      } catch (error) {
        try {
          onError(toolId, error);
        } catch {
          // Error reporting must never interrupt delivery to the remaining tools.
        }
      }
    });
  });
}

function deliverToolRuntimeEventBatch(instances, events, onError = () => {}) {
  const queue = Array.isArray(events) ? events.filter(Boolean) : (events ? [events] : []);
  if (!queue.length || !(instances instanceof Map) || instances.size === 0) return;
  const finalHistoryStart = Number(queue[queue.length - 1]?.historyStartStep);
  const hasFinalHistoryStart = Number.isFinite(finalHistoryStart);
  const finalHistoryStartStep = hasFinalHistoryStart ? Math.max(0, Math.trunc(finalHistoryStart)) : null;
  const createDelivery = (event, eventIndex) => ({
    batched: queue.length > 1,
    batchSize: queue.length,
    batchIndex: eventIndex,
    isLast: eventIndex === queue.length - 1,
    finalHistoryStartStep,
    retainHistory: finalHistoryStartStep == null
      || !Number.isFinite(Number(event?.stepAfter))
      || Math.trunc(Number(event.stepAfter)) > finalHistoryStartStep
  });
  instances.forEach((tool, toolId) => {
    if (!tool || tool.runtimeEventConsumer !== true) return;
    try {
      if (typeof tool.onRuntimeEventBatch === "function") {
        tool.onRuntimeEventBatch(queue, {
          batchSize: queue.length,
          firstEvent: queue[0],
          lastEvent: queue[queue.length - 1],
          finalHistoryStartStep
        });
      } else if (typeof tool.onRuntimeEvent === "function") {
        const delivery = createDelivery(queue[0], 0);
        queue.forEach((event, eventIndex) => {
          delivery.batchIndex = eventIndex;
          delivery.isLast = eventIndex === queue.length - 1;
          delivery.retainHistory = finalHistoryStartStep == null
            || !Number.isFinite(Number(event?.stepAfter))
            || Math.trunc(Number(event.stepAfter)) > finalHistoryStartStep;
          tool.onRuntimeEvent(event, delivery);
        });
      }
      if (typeof tool.onRuntimeBatchEnd === "function") {
        tool.onRuntimeBatchEnd({
          batchSize: queue.length,
          firstEvent: queue[0],
          lastEvent: queue[queue.length - 1],
          finalHistoryStartStep
        });
      }
    } catch (error) {
      try {
        onError(toolId, error);
      } catch {
        // Error reporting must never interrupt delivery to the remaining tools.
      }
    }
  });
}

function createToolDeltaHistory(options = {}) {
  const applyInverse = typeof options.applyInverse === "function" ? options.applyInverse : () => {};
  let entries = new Map();
  let orderedSteps = [];
  let orderedHead = 0;
  let currentStep = Number.isFinite(options.initialStep) ? (options.initialStep | 0) : 0;

  function normalizeStep(step) {
    return Math.max(0, Number(step) | 0);
  }

  function compactOrder() {
    if (orderedHead === 0) return;
    if (orderedHead >= orderedSteps.length) {
      orderedSteps = [];
      orderedHead = 0;
      return;
    }
    if (orderedHead >= 4096 && orderedHead * 2 >= orderedSteps.length) {
      orderedSteps = orderedSteps.slice(orderedHead);
      orderedHead = 0;
    }
  }

  function appendOrderedStep(step) {
    if (entries.has(step)) return;
    const last = orderedSteps.length > orderedHead ? orderedSteps[orderedSteps.length - 1] : null;
    if (last == null || step > last) {
      orderedSteps.push(step);
      return;
    }
    let insertAt = orderedSteps.length;
    while (insertAt > orderedHead && orderedSteps[insertAt - 1] > step) insertAt -= 1;
    orderedSteps.splice(insertAt, 0, step);
  }

  function pruneFuture(step) {
    const target = normalizeStep(step);
    while (orderedSteps.length > orderedHead) {
      const historyStep = orderedSteps[orderedSteps.length - 1] | 0;
      if (historyStep <= target) break;
      orderedSteps.pop();
      entries.delete(historyStep);
    }
    compactOrder();
    currentStep = Math.min(currentStep, target);
  }

  function pruneBefore(step) {
    const oldestStep = normalizeStep(step);
    while (orderedHead < orderedSteps.length) {
      const historyStep = orderedSteps[orderedHead] | 0;
      if (historyStep > oldestStep) break;
      entries.delete(historyStep);
      orderedHead += 1;
    }
    compactOrder();
  }

  function ensure(step, createDelta = () => ({})) {
    const target = normalizeStep(step);
    if (target < currentStep) pruneFuture(target);
    if (!entries.has(target)) {
      const delta = createDelta();
      if (delta != null) {
        appendOrderedStep(target);
        entries.set(target, delta);
      }
    }
    currentStep = Math.max(currentStep, target);
    return entries.get(target) ?? null;
  }

  function record(step, delta) {
    if (delta == null) {
      currentStep = Math.max(currentStep, normalizeStep(step));
      return null;
    }
    const target = normalizeStep(step);
    if (target < currentStep) pruneFuture(target);
    appendOrderedStep(target);
    entries.set(target, delta);
    currentStep = Math.max(currentStep, target);
    return delta;
  }

  function rewind(step) {
    const target = normalizeStep(step);
    let applied = 0;
    while (orderedSteps.length > orderedHead) {
      const historyStep = orderedSteps[orderedSteps.length - 1] | 0;
      if (historyStep <= target) break;
      orderedSteps.pop();
      const delta = entries.get(historyStep);
      if (historyStep <= currentStep && delta != null) {
        applyInverse(delta, historyStep, target);
        applied += 1;
      }
      entries.delete(historyStep);
    }
    compactOrder();
    currentStep = target;
    return applied;
  }

  function sync(snapshot) {
    const step = normalizeStep(snapshot?.steps);
    const explicitStart = Number(snapshot?.backstepHistoryStartStep);
    const derivedStart = Math.max(0, step - Math.max(0, Number(snapshot?.backstepDepth) | 0));
    pruneBefore(Number.isFinite(explicitStart) ? explicitStart : derivedStart);
    if (step < currentStep) rewind(step);
    else currentStep = step;
    return currentStep;
  }

  return {
    clear(step = 0) {
      entries = new Map();
      orderedSteps = [];
      orderedHead = 0;
      currentStep = normalizeStep(step);
    },
    ensure,
    record,
    rewind,
    sync,
    pruneFuture,
    pruneBefore,
    getCurrentStep: () => currentStep,
    getEntryCount: () => entries.size
  };
}

function createToolManager(engine, messagesPane, windowManager, desktop) {
  function dispatchToolLoaderEvent(name, detail) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {
      window.dispatchEvent(new Event(name));
    }
  }

  const FALLBACK_TOOLS = [
    // Keep a built-in manifest so transient fetch failures do not collapse the tools menu.
    { id: "bht-simulator", label: "BHT Simulator", script: "./tools/bht-simulator.js" },
    { id: "bitmap-display", label: "Bitmap Display", script: "./tools/bitmap-display.js" },
    { id: "bitmap-terminal-tool", label: "Bitmap Terminal Tool", script: "./tools/bitmap-terminal-tool.js" },
    { id: "cache-simulator", label: "Data Cache Simulator", script: "./tools/cache-simulator.js" },
    { id: "digital-lab-sim", label: "Digital Lab Sim", script: "./tools/digital-lab-sim.js" },
    { id: "float-representation", label: "Floating Point Representation", script: "./tools/float-representation.js" },
    { id: "instruction-counter", label: "Instruction Counter", script: "./tools/instruction-counter.js" },
    { id: "instruction-statistics", label: "Instruction Statistics", script: "./tools/instruction-statistics.js" },
    { id: "intro-to-tools", label: "Introduction to Tools", script: "./tools/intro-to-tools.js" },
    { id: "keyboard-display-mmio", label: "Keyboard and Display MMIO Simulator", script: "./tools/keyboard-display-mmio.js" },
    { id: "mars-bot", label: "Mars Bot", script: "./tools/mars-bot.js" },
    { id: "memory-reference-visualization", label: "Memory Reference Visualization", script: "./tools/memory-reference-visualization.js" },
    { id: "mips-xray", label: "MIPS X-Ray", script: "./tools/mips-xray.js" },
    { id: "scavenger-hunt", label: "ScavengerHunt", script: "./tools/scavenger-hunt.js" },
    { id: "screen-magnifier", label: "Screen Magnifier", script: "./tools/screen-magnifier.js" },
    { id: "system-clock", label: "System Clock and Timer", script: "./tools/system-clock.js" },
    { id: "stack-visualizer", label: "Stack Visualizer", script: "./tools/stack-visualizer.js" },
    { id: "tty-ansi-terminal", label: "TTY Device + ANSI Terminal", script: "./tools/tty-ansi-terminal.js" }
  ];

  const registry = (() => {
    const host = window.MarsWebTools || (window.MarsWebTools = {});
    if (!(host.definitions instanceof Map)) host.definitions = new Map();
    if (typeof host.register !== "function") {
      host.register = (definition) => {
        if (!definition || typeof definition !== "object") return;
        const id = String(definition.id || "").trim();
        if (!id) return;
        host.definitions.set(id, {
          id,
          label: definition.label ? String(definition.label) : id,
          create: typeof definition.create === "function" ? definition.create : null
        });
      };
    }
    return host;
  })();

  const instances = new Map();
  const reportedSnapshotFailures = new Set();
  // Tools that drive execution (rather than only observing it) go through this
  // bridge, so they never reach into the runtime command implementations.
  let runtimeControls = null;
  const runtimeControlBridge = Object.freeze({
    isAvailable: () => runtimeControls != null,
    isRunning: () => runtimeControls?.isRunning?.() === true,
    go: () => runtimeControls?.go?.(),
    step: () => runtimeControls?.step?.(),
    backstep: () => runtimeControls?.backstep?.(),
    pause: () => runtimeControls?.pause?.(),
    stop: () => runtimeControls?.stop?.(),
    reset: () => runtimeControls?.reset?.()
  });
  let placementIndex = 0;

  // Tool windows used to re-translate only when reopened, so switching language
  // left every open tool stranded in the previous one. One subscription here
  // covers each shell the manager hands out.
  const toolTranslationRefreshers = new Set();

  function registerToolTranslationRefresher(refresh) {
    if (typeof refresh !== "function") return;
    toolTranslationRefreshers.add(refresh);
  }

  (typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n)?.subscribe?.(() => {
    toolTranslationRefreshers.forEach((refresh) => {
      try {
        refresh();
      } catch {
        // A single tool must never block the others from re-translating.
      }
    });
  });
  let loadPromise = null;
  let latestSnapshot = null;
  let toolEntries = [...FALLBACK_TOOLS].sort((a, b) => a.label.localeCompare(b.label));

  function sortTools(entries) {
    return [...entries].sort((a, b) => a.label.localeCompare(b.label));
  }

  function upsertEntries(entries) {
    const map = new Map(toolEntries.map((entry) => [entry.id, entry]));
    entries.forEach((entry) => {
      if (!entry?.id || !entry?.label) return;
      const previous = map.get(entry.id) || {};
      map.set(entry.id, { ...previous, ...entry });
    });
    toolEntries = sortTools([...map.values()]);
  }

  function nextPlacement() {
    const step = 28;
    const offset = placementIndex * step;
    placementIndex = (placementIndex + 1) % 9;
    return {
      left: 70 + offset,
      top: 54 + offset
    };
  }

  function createToolWindowShell(id, title, width, height, html) {
    const pos = nextPlacement();
    const win = document.createElement("section");
    win.className = "desktop-window window-hidden tool-window";
    win.id = `window-tool-${id}`;
    win.dataset.toolId = id;
    win.style.left = `${pos.left}px`;
    win.style.top = `${pos.top}px`;
    win.style.width = `${width}px`;
    win.style.height = `${height}px`;
    win.style.minWidth = `${Math.max(320, Math.min(width, 520))}px`;
    win.style.minHeight = `${Math.max(220, Math.min(height, 320))}px`;
    win.innerHTML = `
      <div class="window-titlebar">
        <span class="window-title">${escapeHtml(title)}</span>
        <div class="window-controls">
          <button class="win-btn" data-win-action="min" type="button">_</button>
          <button class="win-btn" data-win-action="max" type="button">[]</button>
          <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
        </div>
      </div>
      <div class="window-content">${html}</div>
    `;

    desktop.appendChild(win);
    windowManager.registerWindow(win);
    const refreshWindowTranslations = translateStaticTree(win);
    registerToolTranslationRefresher(refreshWindowTranslations);
    const content = win.querySelector(".window-content");
    const resizeListeners = new Set();
    let resizeFrame = null;

    const emitResize = () => {
      resizeFrame = null;
      const detail = {
        width: content instanceof HTMLElement ? content.clientWidth : win.clientWidth,
        height: content instanceof HTMLElement ? content.clientHeight : win.clientHeight,
        windowWidth: win.clientWidth,
        windowHeight: win.clientHeight
      };
      resizeListeners.forEach((listener) => {
        try {
          listener(detail);
        } catch {
          // ignore tool resize listener errors
        }
      });
    };

    const scheduleResize = () => {
      if (resizeFrame !== null) return;
      resizeFrame = window.requestAnimationFrame(emitResize);
    };

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => scheduleResize());
      observer.observe(win);
      if (content instanceof HTMLElement) observer.observe(content);
    }

    const close = () => windowManager.hide(win.id);
    const open = () => {
      refreshWindowTranslations();
      windowManager.show(win.id);
      scheduleResize();
    };
    open.windowRoot = win;
    close.windowRoot = win;
    return {
      root: win,
      content,
      close,
      open,
      refreshTranslations: refreshWindowTranslations,
      onResize(listener) {
        if (typeof listener !== "function") return () => {};
        resizeListeners.add(listener);
        scheduleResize();
        return () => resizeListeners.delete(listener);
      }
    };
  }

  function createPlaceholderTool(label, id) {
    const shell = createToolWindowShell(id, label, 620, 330, `
      <div class="tool-placeholder">
        <h3>${escapeHtml(label)}</h3>
        <p>This tool is detected from Java MARS sources and already wired in the web menu.</p>
        <p>Its full behavior and rendering are pending implementation in the JS runtime migration.</p>
      </div>
    `);

    return {
      open: shell.open,
      close: shell.close,
      onSnapshot() {},
      isConnected: () => false
    };
  }

  async function loadText(path) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (fetchError) {
      return await new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open("GET", path, true);
        req.onload = () => {
          if (req.status === 0 || (req.status >= 200 && req.status < 300)) {
            resolve(req.responseText);
            return;
          }
          reject(new Error(`HTTP ${req.status}`));
        };
        req.onerror = () => reject(fetchError instanceof Error ? fetchError : new Error(translateText("Failed to load file.")));
        req.send();
      });
    }
  }

  function loadScript(path) {
    return new Promise((resolve) => {
      if (!path) {
        resolve(false);
        return;
      }
      const escapedPath = window.CSS && typeof window.CSS.escape === "function"
        ? window.CSS.escape(path)
        : String(path).replace(/["\\]/g, "\\$&");
      const selector = `script[data-mars-tool-script="${escapedPath}"]`;
      if (document.querySelector(selector)) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = window.WebMarsAppVersion?.withVersion?.(path) || path;
      script.async = true;
      script.dataset.marsToolScript = path;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  function normalizeManifestTool(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = String(raw.id || "").trim();
    const label = String(raw.label || "").trim();
    const script = raw.script ? String(raw.script).trim() : "";
    if (!id || !label) return null;
    return { id, label, script };
  }

  async function loadManifestAndScripts() {
    let manifestTools = FALLBACK_TOOLS;
    let manifestLoadedFromDisk = false;
    try {
      dispatchToolLoaderEvent("webmars:tools-manifest-load-start", {
        path: "./tools/tools.json"
      });
      const text = await loadText("./tools/tools.json");
      const parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tools) ? parsed.tools : [];
      const normalized = list.map(normalizeManifestTool).filter(Boolean);
      if (normalized.length) {
        manifestTools = normalized;
        manifestLoadedFromDisk = true;
      }
      dispatchToolLoaderEvent("webmars:tools-manifest-loaded", {
        path: "./tools/tools.json",
        ok: manifestLoadedFromDisk,
        count: manifestTools.length
      });
    } catch {
      dispatchToolLoaderEvent("webmars:tools-manifest-loaded", {
        path: "./tools/tools.json",
        ok: false,
        count: FALLBACK_TOOLS.length
      });
      // Fall back to built-in definitions.
    }

    upsertEntries(manifestTools);

    let scriptsLoaded = 0;
    let scriptsFailed = 0;
    for (const tool of manifestTools) {
      if (!tool.script) continue;
      const loaded = await loadScript(tool.script);
      if (loaded) scriptsLoaded += 1;
      else scriptsFailed += 1;
      const plugin = registry.definitions.get(tool.id);
      if (plugin) {
        upsertEntries([{ ...tool, label: plugin.label || tool.label, factory: plugin.create }]);
      }
    }

    registry.definitions.forEach((plugin, id) => {
      if (!toolEntries.some((entry) => entry.id === id)) {
        upsertEntries([{ id, label: plugin.label || id, factory: plugin.create, script: "" }]);
      }
    });

    dispatchToolLoaderEvent("webmars:tools-ready", {
      ok: scriptsFailed === 0,
      manifestLoadedFromDisk,
      count: toolEntries.length,
      scriptsLoaded,
      scriptsFailed
    });
  }

  function ensureLoaded() {
    if (!loadPromise) {
      loadPromise = loadManifestAndScripts();
    }
    return loadPromise;
  }

  ensureLoaded();

  function createToolInstance(definition) {
    if (typeof definition.factory === "function") {
      try {
        const instance = definition.factory({
          id: definition.id,
          label: definition.label,
          engine,
          messagesPane,
          windowManager,
          desktop,
          escapeHtml,
          defaultMemoryMap: DEFAULT_MEMORY_MAP,
          createToolWindowShell,
          createPlaceholderTool,
          createToolDeltaHistory,
          runtimeControls: runtimeControlBridge,
          nextPlacement
        });

        if (instance && typeof instance.open === "function") {
          const windowRoot = instance.root instanceof HTMLElement
            ? instance.root
            : (instance.open?.windowRoot instanceof HTMLElement
              ? instance.open.windowRoot
              : (instance.close?.windowRoot instanceof HTMLElement ? instance.close.windowRoot : null));
          return {
            open: instance.open,
            close: typeof instance.close === "function" ? instance.close : () => {},
            onSnapshot: typeof instance.onSnapshot === "function" ? instance.onSnapshot : () => {},
            snapshotConsumer: typeof instance.onSnapshot === "function",
            onRuntimeEvent: typeof instance.onRuntimeEvent === "function" ? instance.onRuntimeEvent : () => {},
            onRuntimeEventBatch: typeof instance.onRuntimeEventBatch === "function" ? instance.onRuntimeEventBatch : null,
            onRuntimeBatchEnd: typeof instance.onRuntimeBatchEnd === "function" ? instance.onRuntimeBatchEnd : null,
            onBackstep: typeof instance.onBackstep === "function" ? instance.onBackstep : null,
            runtimeEventConsumer: typeof instance.onRuntimeEvent === "function"
              || typeof instance.onRuntimeEventBatch === "function",
            isRuntimeActive: typeof instance.isConnected === "function"
              ? () => instance.isConnected() === true
                && windowRoot?.classList?.contains("window-hidden") !== true
              : () => windowRoot?.classList?.contains("window-hidden") !== true,
            windowRoot
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        messagesPane.postMars(`${translateText("[error] Tool '{label}' failed to initialize: {message}", {
          label: definition.label,
          message
        })}\n`);
      }
    }

    return createPlaceholderTool(definition.label, definition.id);
  }

  function ensureToolInstance(toolId) {
    if (instances.has(toolId)) return instances.get(toolId);
    const definition = toolEntries.find((tool) => tool.id === toolId);
    if (!definition) return null;
    const instance = createToolInstance(definition);
    instances.set(toolId, instance);
    return instance;
  }

  function reportSnapshotFailure(toolId, error) {
    const key = String(toolId || "unknown");
    const message = error instanceof Error ? error.message : String(error);
    if (typeof console !== "undefined" && typeof console.error === "function") {
      console.error(`[mars-web] Tool '${key}' failed to process a runtime update.`, error);
    }
    if (reportedSnapshotFailures.has(key)) return;
    reportedSnapshotFailures.add(key);
    const definition = toolEntries.find((tool) => tool.id === key);
    messagesPane.postMars(`${translateText("[error] Tool '{label}' failed to process a runtime update: {message}", {
      label: definition?.label || key,
      message
    })}\n`);
  }

  function deliverSnapshots(snapshots, targetInstances = instances) {
    deliverToolSnapshotBatch(targetInstances, snapshots, reportSnapshotFailure);
  }

  function activeInstances(consumerKind = "any") {
    const active = new Map();
    instances.forEach((tool, toolId) => {
      if (!tool) return;
      let enabled = true;
      try {
        enabled = typeof tool.isRuntimeActive === "function" ? tool.isRuntimeActive() === true : true;
      } catch {
        enabled = false;
      }
      if (!enabled) return;
      if (consumerKind === "event" && tool.runtimeEventConsumer !== true) return;
      if (consumerKind === "snapshot" && (tool.snapshotConsumer !== true || tool.runtimeEventConsumer === true)) return;
      active.set(toolId, tool);
    });
    return active;
  }

  function captureSeedSnapshot() {
    if (!engine || typeof engine.getSnapshot !== "function") return latestSnapshot;
    try {
      return engine.getSnapshot({
        includeDataRows: false,
        shareMemoryWords: true
      });
    } catch {
      return latestSnapshot;
    }
  }

  return {
    setRuntimeControls(controls) {
      runtimeControls = controls && typeof controls === "object" ? controls : null;
    },
    getTools() {
      return toolEntries.map(({ id, label }) => ({ id, label }));
    },
    open(toolId) {
      void ensureLoaded().finally(() => {
        const alreadyCreated = instances.has(toolId);
        const tool = ensureToolInstance(toolId);
        if (!tool) {
          messagesPane.postMars(`${translateText("[warn] Tool '{toolId}' not found.", { toolId })}\n`);
          return;
        }
        if (!alreadyCreated) {
          const seedSnapshot = captureSeedSnapshot();
          if (seedSnapshot) {
            latestSnapshot = seedSnapshot;
            deliverSnapshots([seedSnapshot], new Map([[toolId, tool]]));
          }
        }
        tool.open();
      });
    },
    onSnapshot(snapshot, options = {}) {
      if (!snapshot) return;
      latestSnapshot = snapshot;
      deliverSnapshots(
        [snapshot],
        options.snapshotOnly === true ? activeInstances("snapshot") : activeInstances("any")
      );
    },
    onRuntimeEventBatch(events) {
      const queue = Array.isArray(events) ? events.filter(Boolean) : [];
      if (!queue.length) return;
      deliverToolRuntimeEventBatch(activeInstances("event"), queue, reportSnapshotFailure);
    },
    hasRuntimeEventConsumers() {
      return activeInstances("event").size > 0;
    },
    hasSnapshotConsumers() {
      return activeInstances("any").size > 0;
    },
    onBackstep(event) {
      if (!event) return;
      activeInstances("any").forEach((tool, toolId) => {
        if (typeof tool.onBackstep !== "function") return;
        try {
          tool.onBackstep(event);
        } catch (error) {
          reportSnapshotFailure(toolId, error);
        }
      });
    },
    closeAll() {
      instances.forEach((tool) => {
        if (typeof tool.close === "function") tool.close();
      });
    }
  };
}
