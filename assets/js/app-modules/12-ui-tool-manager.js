function createToolManager(engine, messagesPane, windowManager, desktop) {
  const FALLBACK_TOOLS = [
    // Only used if tools.json cannot be loaded.
    { id: "bitmap-display", label: "Bitmap Display", script: "./tools/bitmap-display.js" }
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
  let placementIndex = 0;
  let loadPromise = null;
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
      onSnapshot() {}
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
      script.src = path;
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
    try {
      const text = await loadText("./tools/tools.json");
      const parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.tools) ? parsed.tools : [];
      const normalized = list.map(normalizeManifestTool).filter(Boolean);
      if (normalized.length) manifestTools = normalized;
    } catch {
      // Fall back to built-in definitions.
    }

    upsertEntries(manifestTools);

    for (const tool of manifestTools) {
      if (!tool.script) continue;
      await loadScript(tool.script);
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

  return {
    getTools() {
      return toolEntries.map(({ id, label }) => ({ id, label }));
    },
    open(toolId) {
      void ensureLoaded().finally(() => {
        const tool = ensureToolInstance(toolId);
        if (!tool) {
          messagesPane.postMars(`${translateText("[warn] Tool '{toolId}' not found.", { toolId })}\n`);
          return;
        }
        tool.open();
      });
    },
    onSnapshot(snapshot) {
      instances.forEach((tool) => {
        if (tool.windowRoot instanceof HTMLElement && tool.windowRoot.classList.contains("window-hidden")) return;
        if (typeof tool.onSnapshot === "function") tool.onSnapshot(snapshot);
      });
    },
    closeAll() {
      instances.forEach((tool) => {
        if (typeof tool.close === "function") tool.close();
      });
    }
  };
}
