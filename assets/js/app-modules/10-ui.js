function tabController(root, buttonSelector, panelSelector) {
  const buttons = [...root.querySelectorAll(buttonSelector)];
  const panels = [...root.querySelectorAll(panelSelector)];
  const activate = (panelId) => {
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.panel === panelId));
    panels.forEach((panel) => panel.classList.toggle("active", panel.id === panelId));
  };
  buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.panel)));
  return { activate };
}

function renderLayout(root) {
  root.innerHTML = `
    <div class="shell">
      <nav class="menu-bar panel">
        <span class="menu-logo" aria-hidden="true">🚀</span>
        <button class="menu-item" type="button" data-menu="File">File</button>
        <button class="menu-item" type="button" data-menu="Edit">Edit</button>
        <button class="menu-item" type="button" data-menu="Run">Run</button>
        <button class="menu-item" type="button" data-menu="Settings">Settings</button>
        <button class="menu-item" type="button" data-menu="Tools">Tools</button>
        <button class="menu-item" type="button" data-menu="Help">Help</button>
      </nav>

      <section class="toolbar panel">
        <div class="toolbar-group">
          <button class="tool-btn" id="btn-new" type="button">New</button>
          <button class="tool-btn" id="btn-open" type="button">Open</button>
          <button class="tool-btn" id="btn-save" type="button">Save</button>
          <button class="tool-btn" id="btn-undo" type="button">Undo</button>
          <button class="tool-btn" id="btn-redo" type="button">Redo</button>
        </div>

        <div class="toolbar-group">
          <button class="tool-btn" id="btn-assemble" type="button">Assemble</button>
          <button class="tool-btn primary" id="btn-go" type="button">Go</button>
          <button class="tool-btn" id="btn-step" type="button">Step</button>
          <button class="tool-btn" id="btn-backstep" type="button">Backstep</button>
          <button class="tool-btn" id="btn-reset" type="button">Reset</button>
          <button class="tool-btn" id="btn-pause" type="button">Pause</button>
          <button class="tool-btn" id="btn-stop" type="button">Stop</button>
        </div>

        <div class="toolbar-group">
          <span id="assembly-status" class="tag warn">not assembled</span>
        </div>

        <div class="toolbar-group toolbar-speed-group">
          <label id="run-speed-label" class="run-speed-label" for="run-speed-slider">Run speed at max (no interaction)</label>
          <div class="run-speed-slider-wrap">
            <input id="run-speed-slider" type="range" min="0" max="40" step="1" value="40" />
            <div class="run-speed-ruler" aria-hidden="true"></div>
          </div>
        </div>
      </section>

      <section id="mars-desktop" class="desktop panel">
        <section class="desktop-window" id="window-main" style="left:0px; top:0px; width:75%; height:75%;">
          <div class="window-titlebar"><span class="window-title">Main</span><div class="window-controls"><button class="win-btn" data-win-action="min" type="button">_</button><button class="win-btn" data-win-action="max" type="button">[]</button></div></div>
          <div class="window-content main-window-content">
            <div class="mode-tabs">
              <button class="mode-tab-btn active" id="mode-edit" type="button">Edit</button>
              <button class="mode-tab-btn" id="mode-execute" type="button">Execute</button>
            </div>

            <section id="main-panel-edit" class="main-tab-panel active">
              <div class="subtabs editor-file-tabs" id="editor-file-tabs"></div>
              <div class="editor-wrap">
                <div class="editor-surface" id="editor-surface">
                  <div class="editor-gutter" id="editor-gutter" aria-hidden="true"><pre id="editor-gutter-lines"></pre></div>
                  <div class="editor-code-wrap">
                    <pre id="editor-highlight" class="editor-highlight" aria-hidden="true"></pre>
                    <textarea id="source-editor" spellcheck="false"></textarea>
                  </div>
                </div>
              </div>
              <div class="status-bar">
                <span id="editor-lines">lines: 0</span>
                <span id="editor-caret">Ln 1, Col 1</span>
                <span id="runtime-pc">PC: 0x00400000</span>
                <span id="runtime-steps">steps: 0</span>
              </div>
            </section>

            <section id="main-panel-execute" class="main-tab-panel">
              <div class="execute-wrap">
                <section class="execute-subwindow execute-text-window">
                  <div class="execute-subwindow-title">Text Segment</div>
                  <div class="execute-subwindow-body">
                    <div class="execute-top">
                      <section class="segment-panel">
                        <div class="table-wrap text-table-wrap">
                          <table>
                            <thead><tr><th>BP</th><th>Address</th><th>Code</th><th>Basic</th><th>Source</th></tr></thead>
                            <tbody id="text-segment-body"></tbody>
                          </table>
                        </div>
                      </section>
                      <section class="labels-panel">
                        <div class="panel-title">Labels</div>
                        <ul id="labels-list" class="labels-list"></ul>
                      </section>
                    </div>
                  </div>
                </section>


                <div class="execute-splitter" id="execute-splitter" title="Drag to resize Text/Data" aria-label="Resize text and data segments"></div>
                <section class="execute-subwindow execute-data-window">
                  <div class="execute-subwindow-title">Data Segment</div>
                  <div class="execute-subwindow-body data-subwindow-body">
                    <div class="table-wrap data-table-wrap">
                      <table class="data-segment-table">
                        <thead>
                          <tr>
                            <th>Address</th>
                            <th>Value (+0)</th>
                            <th>Value (+4)</th>
                            <th>Value (+8)</th>
                            <th>Value (+c)</th>
                            <th>Value (+10)</th>
                            <th>Value (+14)</th>
                            <th>Value (+18)</th>
                            <th>Value (+1c)</th>
                          </tr>
                        </thead>
                        <tbody id="data-segment-body"></tbody>
                      </table>
                    </div>
                    <div class="data-nav">
                      <button class="tool-btn" id="data-nav-prev" type="button">&lt;</button>
                      <button class="tool-btn" id="data-nav-next" type="button">&gt;</button>
                      <select id="data-base-select">
                        <option value="data">0x10010000 (.data)</option>
                        <option value="extern">0x10000000 (.extern)</option>
                        <option value="heap">0x10040000 (heap)</option>
                        <option value="gp">current $gp</option>
                        <option value="sp">current $sp</option>
                        <option value="text">0x00400000 (.text)</option>
                        <option value="kdata">0x90000000 (.kdata)</option>
                        <option value="mmio">0xffff0000 (MMIO)</option>
                      </select>
                      <label><input id="data-hex-addresses" type="checkbox" checked> Hexadecimal Addresses</label>
                      <label><input id="data-hex-values" type="checkbox" checked> Hexadecimal Values</label>
                      <label><input id="data-ascii" type="checkbox"> ASCII</label>
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </div>
        </section>

        <section class="desktop-window" id="window-messages" style="left:0px; top:75%; width:75%; height:25%;">
          <div class="window-titlebar"><span class="window-title">Messages / Run I/O</span><div class="window-controls"><button class="win-btn" data-win-action="min" type="button">_</button><button class="win-btn" data-win-action="max" type="button">[]</button></div></div>
          <div class="window-content messages-pane">
            <div class="subtabs">
              <button class="subtab-btn active" type="button" data-panel="panel-mars-messages">Mars Messages</button>
              <button class="subtab-btn" type="button" data-panel="panel-run-io">Run I/O</button>
            </div>
            <div id="panel-mars-messages" class="subtab-panel active"><pre id="mars-messages" class="message-body mars"></pre></div>
            <div id="panel-run-io" class="subtab-panel"><pre id="run-messages" class="message-body run"></pre><div class="run-io-input-bar"><input id="run-input-field" class="run-io-input" type="text" autocomplete="off" placeholder="Type input for syscall and press Enter"><button id="run-input-send" class="tool-btn" type="button">Send</button></div></div>
            <div class="status-bar"><button class="tool-btn" id="messages-clear" type="button">Clear</button></div>
          </div>
        </section>

        <section class="desktop-window" id="window-registers" style="left:75%; top:0px; width:25%; height:100%;">
          <div class="window-titlebar"><span class="window-title">Registers</span><div class="window-controls"><button class="win-btn" data-win-action="min" type="button">_</button><button class="win-btn" data-win-action="max" type="button">[]</button></div></div>
          <div class="window-content registers-pane">
            <div class="subtabs">
              <button class="subtab-btn active" type="button" data-panel="panel-registers">Registers</button>
              <button class="subtab-btn" type="button" data-panel="panel-coprocessor1">Coproc 1</button>
              <button class="subtab-btn" type="button" data-panel="panel-coprocessor0">Coproc 0</button>
            </div>
            <div id="panel-registers" class="subtab-panel active">
              <div class="register-body">
                <table>
                  <thead><tr><th>Name</th><th>Number</th><th>Hex</th><th>Dec</th></tr></thead>
                  <tbody id="registers-body"></tbody>
                </table>
              </div>
            </div>
            <div id="panel-coprocessor1" class="subtab-panel"><div class="register-body"><table><thead><tr><th>Name</th><th>Float</th><th>Double</th></tr></thead><tbody id="cop1-body"></tbody></table></div></div>
            <div id="panel-coprocessor0" class="subtab-panel"><div class="register-body"><table><thead><tr><th>Name</th><th>Number</th><th>Value</th></tr></thead><tbody id="cop0-body"></tbody></table><div class="cop0-flags" id="cop0-flags"></div></div></div>
          </div>
        </section>
      </section>
    </div>`;

  const refs = {
    root,
    tabs: {
      messages: tabController(root, "#window-messages .subtab-btn", "#window-messages .subtab-panel"),
      registers: tabController(root, "#window-registers .subtab-btn", "#window-registers .subtab-panel")
    },
    mode: {
      edit: root.querySelector("#mode-edit"),
      execute: root.querySelector("#mode-execute"),
      panelEdit: root.querySelector("#main-panel-edit"),
      panelExecute: root.querySelector("#main-panel-execute")
    },
    windows: {
      desktop: root.querySelector("#mars-desktop"),
      main: root.querySelector("#window-main"),
      editor: root.querySelector("#window-main"),
      text: root.querySelector("#window-main"),
      data: root.querySelector("#window-main"),
      messages: root.querySelector("#window-messages"),
      registers: root.querySelector("#window-registers")
    },
    buttons: {
      newFile: root.querySelector("#btn-new"),
      open: root.querySelector("#btn-open"),
      save: root.querySelector("#btn-save"),
      undo: root.querySelector("#btn-undo"),
      redo: root.querySelector("#btn-redo"),
      assemble: root.querySelector("#btn-assemble"),
      go: root.querySelector("#btn-go"),
      step: root.querySelector("#btn-step"),
      backstep: root.querySelector("#btn-backstep"),
      reset: root.querySelector("#btn-reset"),
      pause: root.querySelector("#btn-pause"),
      stop: root.querySelector("#btn-stop")
    },
    editor: root.querySelector("#source-editor"),
    editorHighlight: root.querySelector("#editor-highlight"),
    editorGutter: root.querySelector("#editor-gutter"),
    editorGutterLines: root.querySelector("#editor-gutter-lines"),
    editorTabs: root.querySelector("#editor-file-tabs"),
    status: {
      assemblyTag: root.querySelector("#assembly-status"),
      lines: root.querySelector("#editor-lines"),
      caret: root.querySelector("#editor-caret"),
      runtimePc: root.querySelector("#runtime-pc"),
      runtimeSteps: root.querySelector("#runtime-steps")
    },
    controls: {
      runSpeedLabel: root.querySelector("#run-speed-label"),
      runSpeedSlider: root.querySelector("#run-speed-slider")
    },
    execute: {
      textBody: root.querySelector("#text-segment-body"),
      labelsList: root.querySelector("#labels-list"),
      dataBody: root.querySelector("#data-segment-body"),
      splitter: root.querySelector("#execute-splitter"),
      dataNavPrev: root.querySelector("#data-nav-prev"),
      dataNavNext: root.querySelector("#data-nav-next"),
      dataBaseSelect: root.querySelector("#data-base-select"),
      dataHexAddresses: root.querySelector("#data-hex-addresses"),
      dataHexValues: root.querySelector("#data-hex-values"),
      dataAscii: root.querySelector("#data-ascii")
    },
    messages: {
      mars: root.querySelector("#mars-messages"),
      run: root.querySelector("#run-messages"),
      runInput: root.querySelector("#run-input-field"),
      runSend: root.querySelector("#run-input-send"),
      clear: root.querySelector("#messages-clear")
    },
    registers: {
      body: root.querySelector("#registers-body"),
      cop1Body: root.querySelector("#cop1-body"),
      cop0Body: root.querySelector("#cop0-body"),
      cop0Flags: root.querySelector("#cop0-flags")
    }
  };

  return refs;
}

function createWindowManager(refs) {
  const desktop = refs.windows.desktop;
  const windows = new Map();
  const NATIVE_Z_BASE = 80;
  const TOOL_Z_BASE = 920;
  const NATIVE_Z_MAX = TOOL_Z_BASE - 12;
  const TOOL_Z_MAX = 1150;
  let nativeZCounter = NATIVE_Z_BASE;
  let toolZCounter = TOOL_Z_BASE;
  let dragging = null;

  const getKind = (win) => (win.classList.contains("tool-window") ? "tool" : "native");
  const WINDOW_ALIASES = {
    "window-editor": "window-main",
    "window-text": "window-main",
    "window-data": "window-main"
  };
  const resolveWindowId = (windowId) => WINDOW_ALIASES[windowId] ?? windowId;
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const px = (value) => `${Number.isFinite(value) ? value.toFixed(3) : "0"}px`;

  function readWindowMetrics(entry) {
    const win = entry.element;
    let left = parseFloat(win.style.left || "0");
    let top = parseFloat(win.style.top || "0");
    let width = parseFloat(win.style.width || "0");
    let height = parseFloat(win.style.height || "0");
    if (!(width > 0) || !(height > 0)) {
      const desktopRect = desktop.getBoundingClientRect();
      const rect = win.getBoundingClientRect();
      left = rect.left - desktopRect.left;
      top = rect.top - desktopRect.top;
      width = rect.width;
      height = rect.height;
    }
    return { left, top, width, height };
  }

  function updateNormalizedBounds(entry) {
    if (!entry || entry.maximized) return;
    const desktopRect = desktop.getBoundingClientRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return;
    const metrics = readWindowMetrics(entry);
    entry.normalizedBounds = {
      left: clamp01(metrics.left / desktopRect.width),
      top: clamp01(metrics.top / desktopRect.height),
      width: clamp01(metrics.width / desktopRect.width),
      height: clamp01(metrics.height / desktopRect.height)
    };
  }

  function applyNormalizedBounds(entry) {
    if (!entry || entry.maximized || !entry.normalizedBounds) return;
    const desktopRect = desktop.getBoundingClientRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return;
    const bounds = entry.normalizedBounds;
    entry.element.style.left = px(bounds.left * desktopRect.width);
    entry.element.style.top = px(bounds.top * desktopRect.height);
    entry.element.style.width = px(bounds.width * desktopRect.width);
    entry.element.style.height = px(bounds.height * desktopRect.height);
  }

  function rebalance(kind) {
    const ordered = [...windows.values()]
      .filter((entry) => entry.kind === kind)
      .sort((a, b) => (Number.parseInt(a.element.style.zIndex || "0", 10) - Number.parseInt(b.element.style.zIndex || "0", 10)));

    if (kind === "tool") {
      let z = TOOL_Z_BASE;
      ordered.forEach((entry) => {
        entry.element.style.zIndex = `${z}`;
        z += 1;
      });
      toolZCounter = z;
      return;
    }

    let z = NATIVE_Z_BASE;
    ordered.forEach((entry) => {
      entry.element.style.zIndex = `${z}`;
      z += 1;
    });
    nativeZCounter = z;
  }

  function nextZ(kind) {
    if (kind === "tool") {
      toolZCounter += 1;
      if (toolZCounter >= TOOL_Z_MAX) rebalance("tool");
      return toolZCounter;
    }
    nativeZCounter += 1;
    if (nativeZCounter >= NATIVE_Z_MAX) rebalance("native");
    return nativeZCounter;
  }

  function focus(windowId, options = {}) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;
    if (entry.minimized && !options.skipRestore) {
      entry.minimized = false;
      entry.element.classList.remove("window-minimized");
    }
    entry.element.style.zIndex = `${nextZ(entry.kind)}`;
    entry.element.classList.add("window-focus");
    window.setTimeout(() => entry.element.classList.remove("window-focus"), 180);
  }

  function pulse(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;
    entry.element.classList.remove("window-activity");
    void entry.element.offsetWidth;
    entry.element.classList.add("window-activity");
    window.setTimeout(() => entry.element.classList.remove("window-activity"), 550);
  }

  function clampWindow(entry, clampSize = false, persistNormalized = true) {
    if (!entry || entry.maximized) return;

    const win = entry.element;
    const desktopRect = desktop.getBoundingClientRect();
    const computed = window.getComputedStyle(win);
    const minWidth = parseFloat(computed.minWidth) || 180;
    const minHeight = parseFloat(computed.minHeight) || 120;

    let width = parseFloat(win.style.width || "0");
    let height = parseFloat(win.style.height || "0");
    if (!(width > 0) || !(height > 0)) {
      const rect = win.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }

    if (clampSize) {
      width = Math.max(minWidth, Math.min(desktopRect.width, width));
      height = Math.max(minHeight, Math.min(desktopRect.height, height));
      win.style.width = px(width);
      win.style.height = px(height);
    }

    let left = parseFloat(win.style.left || "0");
    let top = parseFloat(win.style.top || "0");
    if (!Number.isFinite(left)) left = 0;
    if (!Number.isFinite(top)) top = 0;

    const maxLeft = Math.max(0, desktopRect.width - width);
    const maxTop = Math.max(0, desktopRect.height - height);
    left = Math.max(0, Math.min(maxLeft, left));
    top = Math.max(0, Math.min(maxTop, top));

    win.style.left = px(left);
    win.style.top = px(top);
    if (persistNormalized) updateNormalizedBounds(entry);
  }

  function onPointerMove(event) {
    if (!dragging || dragging.maximized) return;

    const desktopRect = desktop.getBoundingClientRect();
    const rect = dragging.element.getBoundingClientRect();
    const maxLeft = Math.max(0, desktopRect.width - rect.width);
    const maxTop = Math.max(0, desktopRect.height - rect.height);

    let nextLeft = event.clientX - desktopRect.left - dragging.offsetX;
    let nextTop = event.clientY - desktopRect.top - dragging.offsetY;
    nextLeft = Math.max(0, Math.min(maxLeft, nextLeft));
    nextTop = Math.max(0, Math.min(maxTop, nextTop));

    dragging.element.style.left = px(nextLeft);
    dragging.element.style.top = px(nextTop);
  }

  function stopDragging() {
    if (!dragging) return;
    dragging.element.classList.remove("window-dragging");
    dragging = null;
    document.removeEventListener("pointermove", onPointerMove);
  }

  function toggleMinimize(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;

    if (entry.minimized) {
      entry.minimized = false;
      entry.element.classList.remove("window-minimized");
      clampWindow(entry, true, true);
      focus(windowId, { skipRestore: true });
      return;
    }

    if (entry.maximized) {
      toggleMaximize(windowId);
    }

    entry.minimized = true;
    entry.element.classList.add("window-minimized");
    entry.element.classList.remove("window-maximized");
  }

  function toggleMaximize(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;

    if (entry.maximized) {
      const bounds = entry.restoreBounds;
      entry.maximized = false;
      entry.element.classList.remove("window-maximized");
      if (bounds) {
        entry.element.style.left = `${bounds.left}px`;
        entry.element.style.top = `${bounds.top}px`;
        entry.element.style.width = `${bounds.width}px`;
        entry.element.style.height = `${bounds.height}px`;
      }
      clampWindow(entry, true, true);
      focus(windowId, { skipRestore: true });
      return;
    }

    if (entry.minimized) {
      entry.minimized = false;
      entry.element.classList.remove("window-minimized");
    }

    const desktopRect = desktop.getBoundingClientRect();
    const rect = entry.element.getBoundingClientRect();
    const left = parseFloat(entry.element.style.left || `${rect.left - desktopRect.left}`);
    const top = parseFloat(entry.element.style.top || `${rect.top - desktopRect.top}`);
    const width = parseFloat(entry.element.style.width || `${rect.width}`);
    const height = parseFloat(entry.element.style.height || `${rect.height}`);

    entry.restoreBounds = { left, top, width, height };
    entry.maximized = true;
    entry.element.classList.add("window-maximized");
    entry.element.style.left = "0px";
    entry.element.style.top = "0px";
    entry.element.style.width = `${Math.round(desktopRect.width)}px`;
    entry.element.style.height = `${Math.round(desktopRect.height)}px`;
    focus(windowId, { skipRestore: true });
  }

  function bindDragging(entry) {
    const bar = entry.element.querySelector(".window-titlebar");
    if (!bar) return;
    bar.style.touchAction = "none";

    bar.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof HTMLElement && event.target.closest("button")) return;
      if (entry.maximized) return;
      event.preventDefault();

      const rect = entry.element.getBoundingClientRect();
      dragging = {
        ...entry,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };

      entry.element.classList.add("window-dragging");
      focus(entry.id, { skipRestore: true });
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", stopDragging, { once: true });
    });
  }

  function bindControls(entry) {
    entry.element.querySelectorAll("[data-win-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const action = button.dataset.winAction;
        if (action === "min") toggleMinimize(entry.id);
        if (action === "max") toggleMaximize(entry.id);
        if (action === "close") hide(entry.id);
      });
    });
  }

  function registerWindow(win) {
    if (!(win instanceof HTMLElement) || !win.id || windows.has(win.id)) return;

    const kind = getKind(win);
    const entry = {
      id: win.id,
      kind,
      element: win,
      minimized: false,
      maximized: false,
      restoreBounds: null,
      normalizedBounds: null,
      resizeFrame: null
    };
    windows.set(win.id, entry);

    const desktopRect = desktop.getBoundingClientRect();
    const rect = win.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      win.style.left = px(Math.max(0, rect.left - desktopRect.left));
      win.style.top = px(Math.max(0, rect.top - desktopRect.top));
      win.style.width = px(rect.width);
      win.style.height = px(rect.height);
    }

    win.style.zIndex = `${nextZ(kind)}`;
    bindDragging(entry);
    bindControls(entry);

    win.addEventListener("pointerdown", () => focus(win.id, { skipRestore: true }));
    win.addEventListener("pointerup", () => clampWindow(entry, true, true));

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => {
        if (entry.maximized) return;
        if (entry.resizeFrame !== null) window.cancelAnimationFrame(entry.resizeFrame);
        entry.resizeFrame = window.requestAnimationFrame(() => {
          entry.resizeFrame = null;
          clampWindow(entry, true, false);
        });
      });
      observer.observe(win);
    }

    clampWindow(entry, true, true);
  }

  function show(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;
    entry.element.classList.remove("window-hidden");
    if (entry.minimized) {
      entry.minimized = false;
      entry.element.classList.remove("window-minimized");
    }
    focus(windowId);
  }

  function hide(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;
    entry.element.classList.add("window-hidden");
  }

  desktop.querySelectorAll(".desktop-window").forEach((win) => registerWindow(win));

  window.addEventListener("resize", () => {
    windows.forEach((entry) => {
      if (entry.maximized) {
        const desktopRect = desktop.getBoundingClientRect();
        entry.element.style.width = `${Math.round(desktopRect.width)}px`;
        entry.element.style.height = `${Math.round(desktopRect.height)}px`;
        entry.element.style.left = "0px";
        entry.element.style.top = "0px";
        return;
      }
      applyNormalizedBounds(entry);
      clampWindow(entry, true, false);
    });
  });

  return {
    focus,
    pulse,
    registerWindow,
    show,
    hide,
    toggleMinimize,
    toggleMaximize
  };
}

function setupEditor(refs, store) {
  const { editor, editorHighlight, editorGutter, editorGutterLines, editorTabs, status } = refs;
  const HISTORY_LIMIT = 500;
  let fileCounter = 0;
  let suppressInput = false;

  function createFileId() {
    fileCounter += 1;
    return `file-${Date.now().toString(36)}-${fileCounter.toString(36)}`;
  }

  function ensureUniqueName(name, files, skipId = "") {
    const baseName = normalizeFilename(name);
    if (!files.some((file) => file.id !== skipId && file.name === baseName)) return baseName;

    const dot = baseName.lastIndexOf(".");
    const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
    const ext = dot > 0 ? baseName.slice(dot) : "";
    let suffix = 1;
    let candidate = `${stem}_${suffix}${ext}`;
    while (files.some((file) => file.id !== skipId && file.name === candidate)) {
      suffix += 1;
      candidate = `${stem}_${suffix}${ext}`;
    }
    return candidate;
  }

  function normalizeFile(file, existing = []) {
    const source = String(file?.source ?? "");
    const savedSource = typeof file?.savedSource === "string" ? String(file.savedSource) : source;
    const undoSeed = Array.isArray(file?.undoStack) && file.undoStack.length ? file.undoStack.map((entry) => String(entry)) : [source];
    const undoStack = undoSeed[undoSeed.length - 1] === source ? undoSeed : [...undoSeed, source];
    const redoStack = Array.isArray(file?.redoStack) ? file.redoStack.map((entry) => String(entry)) : [];
    return {
      id: String(file?.id ?? createFileId()),
      name: ensureUniqueName(file?.name ?? "untitled.s", existing),
      source,
      savedSource,
      undoStack: undoStack.slice(-HISTORY_LIMIT),
      redoStack: redoStack.slice(0, HISTORY_LIMIT)
    };
  }

  function ensureState() {
    const state = store.getState();
    let files = Array.isArray(state.files) ? state.files : [];

    if (!files.length) {
      const fallback = normalizeFile({
        id: state.activeFileId || createFileId(),
        name: state.fileName || "untitled.s",
        source: state.sourceCode || ""
      });
      files = [fallback];
    }

    let needsMigration = false;
    const seen = [];
    const migrated = files.map((file) => {
      const normalized = normalizeFile(file, seen);
      seen.push(normalized);
      if (
        normalized.id !== file.id
        || normalized.name !== file.name
        || normalized.source !== file.source
        || normalized.savedSource !== file.savedSource
        || !Array.isArray(file.undoStack)
        || !Array.isArray(file.redoStack)
      ) {
        needsMigration = true;
      }
      return normalized;
    });
    files = needsMigration ? migrated : files;

    let activeFileId = state.activeFileId;
    let active = files.find((file) => file.id === activeFileId);
    if (!active) {
      active = files[0];
      activeFileId = active.id;
    }

    const patch = {};
    if (needsMigration || !Array.isArray(state.files) || state.files.length !== files.length || state.activeFileId !== activeFileId || state.sourceCode !== active.source || state.fileName !== active.name) {
      patch.files = files;
      patch.activeFileId = activeFileId;
      patch.sourceCode = active.source;
      patch.fileName = active.name;
      store.setState(patch);
    }

    return { files, activeFileId, active };
  }

  function highlightCodeFragment(fragment) {
    if (!fragment) return "";

    const stringLiterals = [];
    const withStringTokens = fragment.replace(/"(?:\\.|[^"\\])*"?/g, (match) => {
      const token = `\u0000${stringLiterals.length}\u0000`;
      stringLiterals.push(match);
      return token;
    });

    let html = escapeHtml(withStringTokens);
    html = html.replace(/(^|[\s,(])(\.[A-Za-z_][A-Za-z0-9_]*)/g, "$1<span class=\"editor-token-directive\">$2</span>");
    html = html.replace(/(\$[A-Za-z0-9_.$]+)/g, "<span class=\"editor-token-register\">$1</span>");
    html = html.replace(/(^|[\s,(])(-?(?:0x[0-9a-fA-F]+|\d+))/g, "$1<span class=\"editor-token-number\">$2</span>");
    html = html.replace(/^([\s]*)([A-Za-z_][A-Za-z0-9_.]*)/, "$1<span class=\"editor-token-opcode\">$2</span>");
    html = html.replace(/\u0000(\d+)\u0000/g, (_full, index) => {
      const original = stringLiterals[Number(index)] || "";
      return `<span class=\"editor-token-string\">${escapeHtml(original)}</span>`;
    });

    return html;
  }

  function highlightLine(line) {
    const commentIndex = line.indexOf("#");
    const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : "";

    let html = "";
    const labelMatch = codePart.match(/^(\s*)([A-Za-z_.$][A-Za-z0-9_.$]*:)(.*)$/);
    if (labelMatch) {
      html += escapeHtml(labelMatch[1]);
      html += `<span class=\"editor-token-label\">${escapeHtml(labelMatch[2])}</span>`;
      html += highlightCodeFragment(labelMatch[3]);
    } else {
      html += highlightCodeFragment(codePart);
    }

    if (commentPart) {
      html += `<span class=\"editor-token-comment\">${escapeHtml(commentPart)}</span>`;
    }

    return html.length ? html : " ";
  }

  function renderHighlightedSource(source) {
    return source.split("\n").map((line) => highlightLine(line)).join("\n");
  }

  function syncEditorScroll() {
    const scrollTop = editor.scrollTop || 0;
    const scrollLeft = editor.scrollLeft || 0;
    if (editorHighlight) editorHighlight.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    if (editorGutterLines) editorGutterLines.style.transform = `translateY(${-scrollTop}px)`;
  }

  function updateEditorDecorations(text, lineCount) {
    const safeText = String(text ?? "");
    const totalLines = Number.isFinite(lineCount) ? lineCount : (safeText.length ? safeText.split("\n").length : 1);

    if (editorGutterLines) {
      editorGutterLines.textContent = Array.from({ length: Math.max(1, totalLines) }, (_entry, index) => String(index + 1)).join("\n");
    }

    if (editorGutter) {
      const digits = String(Math.max(1, totalLines)).length;
      const width = Math.max(28, 12 + digits * 8);
      editorGutter.style.width = `${width}px`;
    }

    if (editorHighlight) {
      const computed = window.getComputedStyle(editor);
      editorHighlight.style.fontFamily = computed.fontFamily;
      editorHighlight.style.fontSize = computed.fontSize;
      editorHighlight.style.lineHeight = computed.lineHeight;
      editorHighlight.innerHTML = renderHighlightedSource(safeText);
      editorHighlight.style.width = `${Math.max(editor.clientWidth, editor.scrollWidth)}px`;
      editorHighlight.style.height = `${Math.max(editor.clientHeight, editor.scrollHeight)}px`;
    }

    if (editorGutterLines) {
      const computed = window.getComputedStyle(editor);
      editorGutterLines.style.fontFamily = computed.fontFamily;
      editorGutterLines.style.fontSize = computed.fontSize;
      editorGutterLines.style.lineHeight = computed.lineHeight;
      editorGutterLines.style.height = `${Math.max(editor.clientHeight, editor.scrollHeight)}px`;
    }

    syncEditorScroll();
  }

  function updateStatus() {
    const text = editor.value;
    const lineCount = text.length === 0 ? 1 : text.split("\n").length;
    const upToCursor = text.slice(0, editor.selectionStart ?? 0);
    const lines = upToCursor.split("\n");
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    status.lines.textContent = `lines: ${lineCount}`;
    status.caret.textContent = `Ln ${line}, Col ${column}`;
    updateEditorDecorations(text, lineCount);
  }

  function renderTabs() {
    if (!editorTabs) return;
    const { files, activeFileId } = ensureState();
    editorTabs.innerHTML = "";
    files.forEach((file) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `subtab-btn editor-file-tab${file.id === activeFileId ? " active" : ""}`;
      button.dataset.fileId = file.id;
      button.title = file.name;
      const dirty = file.source !== file.savedSource;
      button.textContent = dirty ? `*${file.name}` : file.name;
      editorTabs.appendChild(button);
    });
  }

  function syncEditorFromActive() {
    const { active } = ensureState();
    const cursor = editor.selectionStart ?? active.source.length;
    suppressInput = true;
    editor.value = active.source;
    const clampedCursor = Math.min(cursor, active.source.length);
    editor.setSelectionRange(clampedCursor, clampedCursor);
    suppressInput = false;
    updateStatus();
  }

  function applyFiles(files, activeFileId, syncEditor = true) {
    const active = files.find((file) => file.id === activeFileId) || files[0];
    const normalizedFiles = files.map((file) => ({
      ...file,
      savedSource: typeof file.savedSource === "string" ? file.savedSource : String(file.source ?? ""),
      undoStack: (Array.isArray(file.undoStack) ? file.undoStack : [String(file.source ?? "")]).slice(-HISTORY_LIMIT),
      redoStack: (Array.isArray(file.redoStack) ? file.redoStack : []).slice(0, HISTORY_LIMIT)
    }));
    const safeActive = normalizedFiles.find((file) => file.id === active.id) || normalizedFiles[0];
    store.setState({
      files: normalizedFiles,
      activeFileId: safeActive.id,
      sourceCode: safeActive.source,
      fileName: safeActive.name
    });
    renderTabs();
    if (syncEditor) syncEditorFromActive();
    else updateStatus();
    return safeActive;
  }

  function activateFile(fileId) {
    const { files, activeFileId } = ensureState();
    if (!fileId || fileId === activeFileId) return;
    if (!files.some((file) => file.id === fileId)) return;
    applyFiles(files, fileId, true);
    editor.focus();
  }

  function updateActiveSource(nextSource, options = {}) {
    const { pushHistory = true } = options;
    const { files, activeFileId } = ensureState();
    const idx = files.findIndex((file) => file.id === activeFileId);
    if (idx < 0) return;

    const current = files[idx];
    const source = String(nextSource);
    if (current.source === source) {
      updateStatus();
      return;
    }

    const undoStack = Array.isArray(current.undoStack) ? [...current.undoStack] : [current.source];
    let redoStack = [];
    if (pushHistory) {
      if (undoStack[undoStack.length - 1] !== source) undoStack.push(source);
    } else if (undoStack.length) {
      undoStack[undoStack.length - 1] = source;
    } else {
      undoStack.push(source);
    }

    files[idx] = {
      ...current,
      source,
      undoStack: undoStack.slice(-HISTORY_LIMIT),
      redoStack
    };

    applyFiles(files, activeFileId, false);
  }

  editor.addEventListener("input", () => {
    if (suppressInput) return;
    updateActiveSource(editor.value, { pushHistory: true });
    updateStatus();
  });
  editor.addEventListener("click", updateStatus);
  editor.addEventListener("keyup", updateStatus);
  editor.addEventListener("select", updateStatus);
  editor.addEventListener("scroll", syncEditorScroll);

  editorTabs?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tab = target.closest("[data-file-id]");
    if (!(tab instanceof HTMLElement)) return;
    activateFile(tab.dataset.fileId || "");
  });

  ensureState();
  renderTabs();
  syncEditorFromActive();

  return {
    setSource(source) {
      updateActiveSource(source, { pushHistory: true });
      syncEditorFromActive();
    },
    createFile({ name = "untitled.s", source = "" } = {}) {
      const state = ensureState();
      const safeName = ensureUniqueName(name, state.files);
      const file = normalizeFile({ id: createFileId(), name: safeName, source }, state.files);
      applyFiles([...state.files, file], file.id, true);
      return file;
    },
    openFile(name, source, activate = true) {
      const state = ensureState();
      const safeName = ensureUniqueName(name, state.files);
      const file = normalizeFile({ id: createFileId(), name: safeName, source }, state.files);
      const files = [...state.files, file];
      applyFiles(files, activate ? file.id : state.activeFileId, activate);
      return file;
    },
    renameActive(name) {
      const { files, activeFileId } = ensureState();
      const idx = files.findIndex((file) => file.id === activeFileId);
      if (idx < 0) return null;
      const updated = [...files];
      const safeName = ensureUniqueName(name, files, activeFileId);
      updated[idx] = { ...updated[idx], name: safeName };
      applyFiles(updated, activeFileId, false);
      renderTabs();
      return updated[idx];
    },
    closeActive() {
      const { files, activeFileId } = ensureState();
      const idx = files.findIndex((file) => file.id === activeFileId);
      if (idx < 0) return null;

      if (files.length <= 1) {
        const replacement = normalizeFile({ id: createFileId(), name: "untitled.s", source: "" }, []);
        applyFiles([replacement], replacement.id, true);
        return { closed: files[idx], fallbackCreated: true, remaining: 1 };
      }

      const updated = files.filter((file) => file.id !== activeFileId);
      const nextIndex = Math.max(0, Math.min(idx, updated.length - 1));
      const nextActive = updated[nextIndex];
      applyFiles(updated, nextActive.id, true);
      return { closed: files[idx], fallbackCreated: false, remaining: updated.length };
    },
    closeAll() {
      const { files } = ensureState();
      const closedCount = files.length;
      const replacement = normalizeFile({ id: createFileId(), name: "untitled.s", source: "" }, []);
      applyFiles([replacement], replacement.id, true);
      return { closedCount, replacement };
    },
    markActiveSaved() {
      const { files, activeFileId } = ensureState();
      const idx = files.findIndex((file) => file.id === activeFileId);
      if (idx < 0) return null;
      const updated = [...files];
      const active = updated[idx];
      updated[idx] = { ...active, savedSource: active.source };
      applyFiles(updated, activeFileId, false);
      return updated[idx];
    },
    getDirtyFiles() {
      const { files } = ensureState();
      return files
        .filter((file) => file.source !== file.savedSource)
        .map((file) => ({ ...file }));
    },
    hasDirtyFiles() {
      const { files } = ensureState();
      return files.some((file) => file.source !== file.savedSource);
    },
    isActiveDirty() {
      const { active } = ensureState();
      return active.source !== active.savedSource;
    },
    undo() {
      const { files, activeFileId } = ensureState();
      const idx = files.findIndex((file) => file.id === activeFileId);
      if (idx < 0) return false;
      const current = files[idx];
      const undoStack = Array.isArray(current.undoStack) ? [...current.undoStack] : [current.source];
      if (undoStack.length <= 1) return false;
      const currentSource = undoStack.pop();
      const previous = undoStack[undoStack.length - 1] ?? "";
      const redoStack = [currentSource, ...(Array.isArray(current.redoStack) ? current.redoStack : [])].slice(0, HISTORY_LIMIT);
      files[idx] = { ...current, source: previous, undoStack, redoStack };
      applyFiles(files, activeFileId, true);
      return true;
    },
    redo() {
      const { files, activeFileId } = ensureState();
      const idx = files.findIndex((file) => file.id === activeFileId);
      if (idx < 0) return false;
      const current = files[idx];
      const redoStack = Array.isArray(current.redoStack) ? [...current.redoStack] : [];
      if (!redoStack.length) return false;
      const source = redoStack.shift();
      const undoStack = [...(Array.isArray(current.undoStack) ? current.undoStack : [current.source]), source].slice(-HISTORY_LIMIT);
      files[idx] = { ...current, source, undoStack, redoStack };
      applyFiles(files, activeFileId, true);
      return true;
    },
    getActiveFile() {
      return ensureState().active;
    },
    getFiles() {
      const state = ensureState();
      return state.files.map((file) => ({ ...file }));
    },
    getFileMap() {
      const map = new Map();
      const state = ensureState();
      state.files.forEach((file) => map.set(file.name, file.source));
      return map;
    },
    focus() {
      editor.focus();
    }
  };
}

function createDialogSystem(windowManager, desktop) {
  const win = document.createElement("section");
  win.className = "desktop-window window-hidden tool-window dialog-window";
  win.id = "window-dialog-system";
  win.style.left = "220px";
  win.style.top = "150px";
  win.style.width = "460px";
  win.style.height = "200px";
  win.innerHTML = `
    <div class="window-titlebar">
      <span class="window-title" id="dialog-title">Dialog</span>
      <div class="window-controls">
        <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
      </div>
    </div>
    <div class="window-content dialog-window-content">
      <div class="dialog-message" id="dialog-message"></div>
      <input id="dialog-input" class="run-io-input dialog-input" type="text" autocomplete="off">
      <div class="dialog-actions">
        <button class="tool-btn" id="dialog-cancel" type="button">Cancel</button>
        <button class="tool-btn primary" id="dialog-confirm" type="button">OK</button>
      </div>
    </div>
  `;

  desktop.appendChild(win);
  windowManager.registerWindow(win);

  const titleNode = win.querySelector("#dialog-title");
  const messageNode = win.querySelector("#dialog-message");
  const inputNode = win.querySelector("#dialog-input");
  const confirmButton = win.querySelector("#dialog-confirm");
  const cancelButton = win.querySelector("#dialog-cancel");
  const titleCloseButton = win.querySelector('[data-win-action="close"]');

  const queue = [];
  let active = null;

  function applyActiveDialog() {
    if (!active) {
      windowManager.hide(win.id);
      return;
    }

    titleNode.textContent = active.title || "Dialog";
    messageNode.textContent = active.message || "";
    confirmButton.textContent = active.confirmLabel || "OK";
    cancelButton.textContent = active.cancelLabel || "Cancel";

    if (active.kind === "prompt") {
      inputNode.hidden = false;
      inputNode.value = active.defaultValue || "";
      inputNode.placeholder = active.placeholder || "";
    } else {
      inputNode.hidden = true;
      inputNode.value = "";
      inputNode.placeholder = "";
    }

    windowManager.show(win.id);
    if (active.kind === "prompt") {
      inputNode.focus();
      inputNode.select();
    } else {
      confirmButton.focus();
    }
  }

  function dequeueNext() {
    if (active || !queue.length) return;
    active = queue.shift();
    applyActiveDialog();
  }

  function resolveActive(result) {
    if (!active) return;
    const current = active;
    active = null;
    windowManager.hide(win.id);
    try {
      current.resolve(result);
    } finally {
      dequeueNext();
    }
  }

  function closeAsCancel() {
    if (!active) return;
    resolveActive({ ok: false, value: null });
  }

  confirmButton?.addEventListener("click", () => {
    if (!active) return;
    if (active.kind === "prompt") {
      resolveActive({ ok: true, value: inputNode.value });
      return;
    }
    resolveActive({ ok: true, value: true });
  });

  cancelButton?.addEventListener("click", closeAsCancel);
  titleCloseButton?.addEventListener("click", closeAsCancel);

  inputNode?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmButton?.click();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeAsCancel();
    }
  });

  return {
    prompt(options = {}) {
      return new Promise((resolve) => {
        queue.push({
          kind: "prompt",
          title: String(options.title || "Input"),
          message: String(options.message || ""),
          defaultValue: String(options.defaultValue || ""),
          placeholder: String(options.placeholder || ""),
          confirmLabel: String(options.confirmLabel || "OK"),
          cancelLabel: String(options.cancelLabel || "Cancel"),
          resolve
        });
        dequeueNext();
      });
    },
    confirm(options = {}) {
      return new Promise((resolve) => {
        queue.push({
          kind: "confirm",
          title: String(options.title || "Confirm"),
          message: String(options.message || ""),
          confirmLabel: String(options.confirmLabel || "OK"),
          cancelLabel: String(options.cancelLabel || "Cancel"),
          resolve
        });
        dequeueNext();
      }).then((result) => Boolean(result?.ok));
    },
    close() {
      closeAsCancel();
      queue.length = 0;
      windowManager.hide(win.id);
    }
  };
}
function createModeController(refs, windowManager) {
  const editButton = refs.mode.edit;
  const executeButton = refs.mode.execute;
  const editPanel = refs.mode.panelEdit;
  const executePanel = refs.mode.panelExecute;
  let mode = "edit";

  function apply(nextMode) {
    mode = nextMode === "execute" ? "execute" : "edit";
    const editMode = mode === "edit";

    editButton?.classList.toggle("active", editMode);
    executeButton?.classList.toggle("active", !editMode);
    editPanel?.classList.toggle("active", editMode);
    executePanel?.classList.toggle("active", !editMode);

    windowManager.focus("window-main");
  }

  editButton?.addEventListener("click", () => apply("edit"));
  executeButton?.addEventListener("click", () => apply("execute"));

  return {
    setMode: apply,
    getMode: () => mode
  };
}
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

  function createExecutePane(refs, engine) {
  const { execute } = refs;
  const DATA_COLUMNS = 8;
  const DATA_ROWS_PER_PAGE = 16;
  const WORD_SIZE_BYTES = 4;
  const DATA_PAGE_BYTES = DATA_COLUMNS * DATA_ROWS_PER_PAGE * WORD_SIZE_BYTES;
  const DATA_VIEW_MAX_RANGE = 0x01000000;

  const DATA_BASE_PRESETS = [
    { key: "data", label: "0x10010000 (.data)", resolve: () => DEFAULT_MEMORY_MAP.dataBase >>> 0 },
    { key: "extern", label: "0x10000000 (.extern)", resolve: () => 0x10000000 },
    { key: "heap", label: "0x10040000 (heap)", resolve: () => DEFAULT_MEMORY_MAP.heapBase >>> 0 },
    { key: "gp", label: "current $gp", resolve: (snapshot) => getRegisterUnsigned(snapshot, "$gp", 0x10008000) },
    { key: "sp", label: "current $sp", resolve: (snapshot) => getRegisterUnsigned(snapshot, "$sp", DEFAULT_MEMORY_MAP.stackBase >>> 0) },
    { key: "text", label: "0x00400000 (.text)", resolve: () => DEFAULT_MEMORY_MAP.textBase >>> 0 },
    { key: "kdata", label: "0x90000000 (.kdata)", resolve: () => 0x90000000 },
    { key: "mmio", label: "0xffff0000 (MMIO)", resolve: () => DEFAULT_MEMORY_MAP.mmioBase >>> 0 }
  ];

  const PRESET_KEYS = new Set(DATA_BASE_PRESETS.map((preset) => preset.key));

  function getRegisterUnsigned(snapshot, name, fallback) {
    if (snapshot?.registers?.length) {
      const register = snapshot.registers.find((entry) => entry.name === name);
      if (register && Number.isFinite(register.valueUnsigned)) return register.valueUnsigned >>> 0;
      if (register && Number.isFinite(register.value)) return register.value >>> 0;
    }
    return fallback >>> 0;
  }

  function normalizeBaseSelection(value) {
    const key = String(value ?? "").trim();
    return PRESET_KEYS.has(key) ? key : "data";
  }

  function resolveBaseAddress(selection, snapshot) {
    const preset = DATA_BASE_PRESETS.find((entry) => entry.key === selection);
    if (!preset) return DEFAULT_MEMORY_MAP.dataBase >>> 0;
    const resolved = preset.resolve(snapshot);
    return Number.isFinite(resolved) ? (resolved >>> 0) : (DEFAULT_MEMORY_MAP.dataBase >>> 0);
  }

  const dataState = {
    baseSelection: normalizeBaseSelection(execute.dataBaseSelect?.value ?? "data"),
    pageOffset: 0,
    hexAddresses: execute.dataHexAddresses?.checked !== false,
    hexValues: execute.dataHexValues?.checked !== false,
    ascii: execute.dataAscii?.checked === true
  };

  if (execute.dataBaseSelect) {
    execute.dataBaseSelect.value = dataState.baseSelection;
  }

  let lastSnapshot = null;
  let lastRenderOptions = {};

  const executeSplitState = {
    ratio: 0.56,
    minPaneHeight: 120,
    splitterHeight: 6
  };

  function applyExecuteSplit() {
    const executeWrap = refs.root.querySelector("#main-panel-execute .execute-wrap");
    if (!executeWrap || !execute.splitter) return;
    const total = executeWrap.clientHeight;
    if (total <= (executeSplitState.minPaneHeight * 2 + executeSplitState.splitterHeight)) {
      executeWrap.style.gridTemplateRows = `minmax(${executeSplitState.minPaneHeight}px, 1fr) ${executeSplitState.splitterHeight}px minmax(${executeSplitState.minPaneHeight}px, 1fr)`;
      return;
    }

    const available = total - executeSplitState.splitterHeight;
    const top = Math.round(Math.max(
      executeSplitState.minPaneHeight,
      Math.min(available - executeSplitState.minPaneHeight, available * executeSplitState.ratio)
    ));

    executeWrap.style.gridTemplateRows = `${top}px ${executeSplitState.splitterHeight}px minmax(${executeSplitState.minPaneHeight}px, 1fr)`;
  }

  (function setupExecuteSplitter() {
    const executeWrap = refs.root.querySelector("#main-panel-execute .execute-wrap");
    const splitter = execute.splitter;
    if (!executeWrap || !splitter) return;

    let dragState = null;

    const onPointerMove = (event) => {
      if (!dragState) return;
      event.preventDefault();
      const delta = event.clientY - dragState.startY;
      const available = dragState.wrapHeight - executeSplitState.splitterHeight;
      const nextTop = Math.max(
        executeSplitState.minPaneHeight,
        Math.min(available - executeSplitState.minPaneHeight, dragState.startTop + delta)
      );
      executeSplitState.ratio = nextTop / available;
      applyExecuteSplit();
    };

    const stopDrag = () => {
      if (!dragState) return;
      dragState = null;
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrag);
    };

    splitter.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const rows = getComputedStyle(executeWrap).gridTemplateRows.split(" ");
      const currentTop = Number.parseFloat(rows[0]) || (executeWrap.clientHeight * executeSplitState.ratio);
      dragState = {
        startY: event.clientY,
        startTop: currentTop,
        wrapHeight: executeWrap.clientHeight
      };
      document.body.style.cursor = "row-resize";
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", stopDrag);
      splitter.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => applyExecuteSplit());
      observer.observe(executeWrap);
    } else {
      window.addEventListener("resize", applyExecuteSplit);
    }

    applyExecuteSplit();
  })();

  const signed32 = (value) => value | 0;

  function asciiFromWord(value) {
    let text = "";
    for (let i = 3; i >= 0; i -= 1) {
      const code = (value >>> (i * 8)) & 0xff;
      text += code >= 32 && code <= 126 ? String.fromCharCode(code) : DEFAULT_SETTINGS.asciiNonPrint;
    }
    return text;
  }

  function formatAddress(address) {
    return dataState.hexAddresses ? toHex(address >>> 0) : `${address >>> 0}`;
  }

  function formatValue(value) {
    if (dataState.ascii) return asciiFromWord(value >>> 0);
    return dataState.hexValues ? toHex(value >>> 0) : `${signed32(value)}`;
  }

  function getPageStart(snapshot) {
    const baseAddress = resolveBaseAddress(dataState.baseSelection, snapshot);
    return (baseAddress + dataState.pageOffset) >>> 0;
  }

  function updateDataNavButtons() {
    if (execute.dataNavPrev) execute.dataNavPrev.disabled = dataState.pageOffset === 0;
    if (execute.dataNavNext) execute.dataNavNext.disabled = dataState.pageOffset >= (DATA_VIEW_MAX_RANGE - DATA_PAGE_BYTES);
  }

  function rerender() {
    if (!lastSnapshot) return;
    api.render(lastSnapshot, lastRenderOptions);
  }

  function refreshBaseOptions(snapshot) {
    if (!execute.dataBaseSelect) return;
    DATA_BASE_PRESETS.forEach((preset) => {
      const option = execute.dataBaseSelect.querySelector(`option[value="${preset.key}"]`);
      if (!option) return;
      if (preset.key === "gp" || preset.key === "sp") {
        const current = resolveBaseAddress(preset.key, snapshot);
        option.textContent = `${preset.label} (${toHex(current)})`;
        return;
      }
      option.textContent = preset.label;
    });
    execute.dataBaseSelect.value = dataState.baseSelection;
  }

  function addressInSelectedRange(address, selection, snapshot) {
    const base = resolveBaseAddress(selection, snapshot);
    if (address < base) return false;
    return (address - base) < DATA_VIEW_MAX_RANGE;
  }

  function pickSelectionForAddress(address, snapshot) {
    if (addressInSelectedRange(address, dataState.baseSelection, snapshot)) return dataState.baseSelection;
    for (const preset of DATA_BASE_PRESETS) {
      if (addressInSelectedRange(address, preset.key, snapshot)) return preset.key;
    }
    return dataState.baseSelection;
  }

  function getLatestChangedAddress(changedDataAddresses) {
    let latest = null;
    changedDataAddresses.forEach((address) => {
      latest = address >>> 0;
    });
    return latest;
  }

  execute.dataNavPrev?.addEventListener("click", () => {
    dataState.pageOffset = Math.max(0, dataState.pageOffset - DATA_PAGE_BYTES);
    rerender();
  });

  execute.dataNavNext?.addEventListener("click", () => {
    dataState.pageOffset = Math.min(DATA_VIEW_MAX_RANGE - DATA_PAGE_BYTES, dataState.pageOffset + DATA_PAGE_BYTES);
    rerender();
  });

  execute.dataBaseSelect?.addEventListener("change", () => {
    dataState.baseSelection = normalizeBaseSelection(execute.dataBaseSelect.value);
    dataState.pageOffset = 0;
    rerender();
  });

  execute.dataHexAddresses?.addEventListener("change", () => {
    dataState.hexAddresses = execute.dataHexAddresses.checked;
    rerender();
  });

  execute.dataHexValues?.addEventListener("change", () => {
    dataState.hexValues = execute.dataHexValues.checked;
    rerender();
  });

  execute.dataAscii?.addEventListener("change", () => {
    dataState.ascii = execute.dataAscii.checked;
    rerender();
  });

  const api = {
    render(snapshot, options = {}) {
      const changedDataAddresses = options.changedDataAddresses ?? new Set();
      const focusDataAddress = Number.isFinite(options.focusDataAddress) ? (options.focusDataAddress >>> 0) : null;
      lastSnapshot = snapshot;
      lastRenderOptions = {
        ...options,
        changedDataAddresses: new Set(changedDataAddresses),
        focusDataAddress
      };

      execute.textBody.innerHTML = snapshot.textRows.length
        ? snapshot.textRows.map((row) => {
            const checked = row.breakpoint ? "checked" : "";
            const classes = [];
            if (row.isCurrent) classes.push("current-row", "updated-row");
            const cls = classes.join(" ");
            return `<tr class="${cls}" data-text-address="${row.address}"><td><input type="checkbox" data-breakpoint-address="${row.address}" ${checked}></td><td>${row.addressHex}</td><td>${row.code}</td><td>${escapeHtml(row.basic)}</td><td>${escapeHtml(row.source)}</td></tr>`;
          }).join("")
        : `<tr><td colspan="5" class="muted">No text segment loaded.</td></tr>`;

      execute.labelsList.innerHTML = snapshot.labels.length
        ? snapshot.labels.map((entry) => `<li>${escapeHtml(entry.label)} = ${entry.addressHex}</li>`).join("")
        : `<li class="muted">No labels</li>`;

      refreshBaseOptions(snapshot);

      const targetAddress = focusDataAddress ?? getLatestChangedAddress(changedDataAddresses);
      if (targetAddress != null) {
        const nextSelection = pickSelectionForAddress(targetAddress, snapshot);
        if (nextSelection !== dataState.baseSelection) {
          dataState.baseSelection = nextSelection;
          if (execute.dataBaseSelect) execute.dataBaseSelect.value = nextSelection;
        }

        const baseAddress = resolveBaseAddress(dataState.baseSelection, snapshot);
        if (targetAddress >= baseAddress && (targetAddress - baseAddress) < DATA_VIEW_MAX_RANGE) {
          const relative = targetAddress - baseAddress;
          dataState.pageOffset = Math.floor(relative / DATA_PAGE_BYTES) * DATA_PAGE_BYTES;
        }
      }

      const pageStart = getPageStart(snapshot);
      const memoryWords = snapshot.memoryWords instanceof Map ? snapshot.memoryWords : new Map(snapshot.memoryWords ?? []);
      const rows = [];
      for (let rowIndex = 0; rowIndex < DATA_ROWS_PER_PAGE; rowIndex += 1) {
        const rowAddress = (pageStart + rowIndex * DATA_COLUMNS * WORD_SIZE_BYTES) >>> 0;
        let rowChanged = false;
        const valueCells = [];

        for (let col = 0; col < DATA_COLUMNS; col += 1) {
          const cellAddress = (rowAddress + col * WORD_SIZE_BYTES) >>> 0;
          const rawValue = memoryWords.get(cellAddress) ?? 0;
          const cellUpdated = changedDataAddresses.has(cellAddress);
          if (cellUpdated) rowChanged = true;

          const cellClasses = [];
          if (cellUpdated) cellClasses.push("updated-row", "updated-cell");
          if (targetAddress != null && cellAddress === targetAddress) cellClasses.push("updated-row", "updated-cell");
          const cellClass = cellClasses.join(" ");

          valueCells.push(`<td class="${cellClass}" data-data-address="${cellAddress}">${escapeHtml(formatValue(rawValue))}</td>`);
        }

        const rowClass = rowChanged ? "updated-row" : "";
        rows.push(`<tr class="${rowClass}" data-row-address="${rowAddress}"><td>${formatAddress(rowAddress)}</td>${valueCells.join("")}</tr>`);
      }

      execute.dataBody.innerHTML = rows.join("");

      const currentRow = execute.textBody.querySelector("tr.current-row");
      if (currentRow) currentRow.scrollIntoView({ block: "nearest" });

      const focusCell = targetAddress == null ? null : execute.dataBody.querySelector(`td[data-data-address="${targetAddress}"]`);
      if (focusCell) {
        focusCell.scrollIntoView({ block: "nearest" });
      } else {
        const changedDataRow = execute.dataBody.querySelector("td.updated-cell, tr.updated-row");
        if (changedDataRow) changedDataRow.scrollIntoView({ block: "nearest" });
      }

      updateDataNavButtons();
    },

    onToggleBreakpoint(handler) {
      execute.textBody.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        const addr = target.dataset.breakpointAddress;
        if (!addr) return;
        handler(Number(addr));
      });
    }
  };

  return api;
}

function formatNumericDisplay(value) {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if ((abs >= 1e6 || (abs > 0 && abs < 1e-4)) && abs !== 0) return value.toExponential(5);
  return String(value);
}

function formatCop1Float(rawValue) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, rawValue | 0, false);
  return formatNumericDisplay(view.getFloat32(0, false));
}

function formatCop1Double(lowWord, highWord) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setInt32(0, highWord | 0, false);
  view.setInt32(4, lowWord | 0, false);
  return formatNumericDisplay(view.getFloat64(0, false));
}

function createRegistersPane(refs) {
  const cop0Names = {
    8: "vaddr",
    12: "status",
    13: "cause",
    14: "epc"
  };

  let previousCop0 = null;
  let previousCop1 = null;
  let previousFlags = null;

  return {
    render(snapshotOrRows, changedRegisters = new Set()) {
      const snapshot = Array.isArray(snapshotOrRows)
        ? { registers: snapshotOrRows }
        : (snapshotOrRows && typeof snapshotOrRows === "object" ? snapshotOrRows : { registers: [] });

      const registerRows = Array.isArray(snapshot.registers) ? snapshot.registers : [];
      refs.registers.body.innerHTML = registerRows
        .map((register) => {
          const key = register.name === "$pc" ? "pc" : String(register.index);
          const changed = changedRegisters.has(key) || changedRegisters.has(register.name);
          const cls = changed ? "updated-row" : "";
          const numberCell = register.name === "$pc" ? "" : register.index;
          return `<tr class="${cls}" data-register-key="${escapeHtml(key)}"><td>${register.name}</td><td>${numberCell}</td><td>${register.valueHex}</td><td>${register.value}</td></tr>`;
        })
        .join("");

      const changedRow = refs.registers.body.querySelector("tr.updated-row");
      if (changedRow) changedRow.scrollIntoView({ block: "nearest" });

      const cop1Values = Array.isArray(snapshot.cop1) ? snapshot.cop1 : [];
      if (refs.registers.cop1Body) {
        const cop1Rows = [];
        for (let i = 0; i < 32; i += 1) {
          const raw = cop1Values[i] | 0;
          const changed = previousCop1 && previousCop1[i] !== raw;
          const cls = changed ? "updated-row" : "";
          const floatText = formatCop1Float(raw);
          const doubleText = (i % 2 === 0 && (i + 1) < cop1Values.length)
            ? formatCop1Double(cop1Values[i] | 0, cop1Values[i + 1] | 0)
            : "";
          cop1Rows.push(`<tr class="${cls}" data-cop1-index="${i}"><td>$f${i}</td><td>${escapeHtml(floatText)}</td><td>${escapeHtml(doubleText)}</td></tr>`);
        }
        refs.registers.cop1Body.innerHTML = cop1Rows.join("");
      }
      previousCop1 = cop1Values.slice(0, 32);

      const cop0Values = Array.isArray(snapshot.cop0) ? snapshot.cop0 : [];
      if (refs.registers.cop0Body) {
        const cop0Rows = [];
        for (let i = 0; i < 32; i += 1) {
          const raw = cop0Values[i] | 0;
          const changed = previousCop0 && previousCop0[i] !== raw;
          const cls = changed ? "updated-row" : "";
          const name = cop0Names[i] ? `$${cop0Names[i]}` : `$c${i}`;
          cop0Rows.push(`<tr class="${cls}" data-cop0-index="${i}"><td>${name}</td><td>${i}</td><td>${toHex(raw >>> 0)}</td></tr>`);
        }
        refs.registers.cop0Body.innerHTML = cop0Rows.join("");
      }
      previousCop0 = cop0Values.slice(0, 32);

      const flags = Array.isArray(snapshot.fpuFlags) ? snapshot.fpuFlags : [];
      if (refs.registers.cop0Flags) {
        refs.registers.cop0Flags.innerHTML = `<span>Condition Flags:</span>${[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
          const on = flags[index] ? "cop0-flag on" : "cop0-flag";
          return `<span class="${on}">${index}</span>`;
        }).join("")}`;

        if (previousFlags && flags.some((value, index) => value !== previousFlags[index])) {
          refs.registers.cop0Flags.classList.add("updated-row");
          window.setTimeout(() => refs.registers.cop0Flags.classList.remove("updated-row"), 160);
        }
      }
      previousFlags = flags.slice(0, 8);
    }
  };
}
function createMessagesPane(refs, limit) {
  const trim = (text) => (text.length <= limit ? text : text.slice(text.length - limit));
  const queuedInputs = [];
  let pendingPrompt = "";
  let onInputSubmitted = null;
  const buffers = new Map();
  let flushPending = false;

  function getBuffer(node) {
    if (!node) return "";
    if (!buffers.has(node)) buffers.set(node, node.textContent || "");
    return buffers.get(node) || "";
  }

  function setBuffer(node, value) {
    if (!node) return;
    buffers.set(node, trim(value));
  }

  function flush() {
    flushPending = false;
    buffers.forEach((value, node) => {
      if (!node) return;
      if (node.textContent !== value) node.textContent = value;
      node.scrollTop = node.scrollHeight;
    });
  }

  function scheduleFlush() {
    if (flushPending) return;
    flushPending = true;
    window.requestAnimationFrame(flush);
  }

  const append = (node, msg) => {
    if (!node) return;
    const current = getBuffer(node);
    setBuffer(node, `${current}${msg}\n`);
    scheduleFlush();
  };

  const refreshInputPlaceholder = () => {
    if (!refs.messages.runInput) return;
    const suffix = pendingPrompt ? ` (${pendingPrompt})` : "";
    refs.messages.runInput.placeholder = `Type input for syscall and press Enter${suffix}`;
  };

  const queueInput = () => {
    const field = refs.messages.runInput;
    if (!(field instanceof HTMLInputElement)) return;
    const value = field.value;
    queuedInputs.push(value);
    field.value = "";
    pendingPrompt = "";
    refreshInputPlaceholder();
    append(refs.messages.run, `[input] ${value}`);
    if (typeof onInputSubmitted === "function") {
      try { onInputSubmitted(value); } catch {}
    }
  };

  refs.messages.runSend?.addEventListener("click", queueInput);
  refs.messages.runInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    queueInput();
  });

  refreshInputPlaceholder();

  return {
    postMars: (msg) => append(refs.messages.mars, msg),
    postRun: (msg) => append(refs.messages.run, msg),
    clear() {
      setBuffer(refs.messages.mars, "");
      setBuffer(refs.messages.run, "");
      scheduleFlush();
    },
    requestInput(promptText = "") {
      pendingPrompt = String(promptText || "");
      refreshInputPlaceholder();
      refs.tabs.messages.activate("panel-run-io");
      refs.messages.runInput?.focus();
    },
    consumeInput() {
      if (!queuedInputs.length) return null;
      return queuedInputs.shift();
    },
    clearInputRequest() {
      pendingPrompt = "";
      refreshInputPlaceholder();
    },
    focusRunInput() {
      refs.tabs.messages.activate("panel-run-io");
      refs.messages.runInput?.focus();
    },
    setInputSubmittedHandler(handler) {
      onInputSubmitted = typeof handler === "function" ? handler : null;
    }
  };
}
const STORAGE_KEY = "mars45-web-preferences";
const DEFAULT_PREFERENCES = {
  showLabelsWindow: true,
  programArguments: false,
  popupSyscallInput: false,
  displayAddressesHex: true,
  displayValuesHex: true,
  assembleOnOpen: false,
  assembleAll: false,
  warningsAreErrors: false,
  startAtMain: false,
  extendedAssembler: true,
  delayedBranching: false,
  selfModifyingCode: false,
  programArgumentsText: "",
  editorFontSize: 12,
  editorLineHeight: 1.25,
  highlightTextUpdates: true,
  highlightDataUpdates: true,
  highlightRegisterUpdates: true,
  exceptionHandlerAddress: "0x80000180",
  memoryConfiguration: "Default"
};

function loadPreferences() {
  try {
    const rawPrefs = localStorage.getItem(STORAGE_KEY);
    if (!rawPrefs) return { ...DEFAULT_PREFERENCES };
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(rawPrefs) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function normalizeFilename(name) {
  const value = (name || "").trim();
  if (!value) return "untitled.s";
  if (/\.(asm|s)$/i.test(value)) return value;
  return `${value}.s`;
}

function injectRuntimeStyles() {
  if (document.getElementById("mars-runtime-style")) return;

  const style = document.createElement("style");
  style.id = "mars-runtime-style";
  style.textContent = `
    .menu-item.active { border-color: #7f8da0; background: linear-gradient(180deg, #f9fbfe, #e7edf5); }
    .menu-logo { width: 16px; height: 16px; margin: 0 4px 0 1px; align-self: center; flex: 0 0 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; }
    .menu-bar { padding: 3px 5px; gap: 3px; }
    .menu-item { padding: 2px 7px; font-size: 12px; line-height: 1.1; }
    .toolbar { padding: 4px 5px; gap: 4px; }
    .toolbar-group { gap: 3px; padding-right: 6px; }
    .tool-btn { padding: 2px 7px; font-size: 11px; min-height: 20px; border-radius: 1px; }
    .toolbar .tool-btn { min-height: 18px; padding: 2px 6px; }
    .data-nav .tool-btn { min-height: 18px; padding: 1px 6px; }
    .window-controls .win-btn { min-height: 14px; padding: 0 2px; }
    .subtabs { padding: 3px 4px; gap: 3px; }
    .editor-file-tabs { overflow-x: auto; overflow-y: hidden; flex-wrap: nowrap; }
    .editor-file-tab { flex: 0 0 auto; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .subtab-btn { padding: 2px 8px; font-size: 11px; }
    .status-bar { padding: 3px 7px; font-size: 11px; }
    .tag { padding: 2px 6px; font-size: 10px; }
    .editor-surface {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      height: 100%;
      min-height: 0;
      border: 1px solid #a3b2c4;
      background: #f2f5f9;
      font-family: "Cascadia Code", "Consolas", "Lucida Console", monospace;
      font-size: 12px;
      line-height: 1.25;
    }

    .editor-gutter {
      border-right: 1px solid #bdc8d7;
      background: #edf2f8;
      color: #607185;
      text-align: right;
      min-width: 28px;
      user-select: none;
      overflow: hidden;
    }

    .editor-gutter pre {
      margin: 0;
      padding: 8px 4px 8px 2px;
      white-space: pre;
      transform: translateY(0);
    }

    .editor-code-wrap {
      position: relative;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: #f2f5f9;
    }
    .editor-highlight {
      position: absolute;
      top: 0;
      left: 0;
      margin: 0;
      padding: 8px;
      white-space: pre;
      transform: translate(0, 0);
      pointer-events: none;
      color: #1f2d3f;
      min-width: 100%;
      overflow: visible;
    }


    #source-editor {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      resize: none;
      border: none;
      border-radius: 0;
      padding: 8px;
      background: transparent;
      color: transparent;
      caret-color: #1f2d3f;
      font-size: 12px;
      line-height: 1.25;
      font-family: "Cascadia Code", "Consolas", "Lucida Console", monospace;
      z-index: 2;
      overflow: auto;
    }

    #source-editor::selection {
      background: rgba(100, 149, 237, 0.34);
    }

    .editor-token-comment { color: #37b24d; font-style: italic; }
    .editor-token-directive { color: #8b5cf6; }
    .editor-token-label { color: #2f3f52; font-weight: 600; }
    .editor-token-opcode { color: #145799; font-weight: 600; }
    .editor-token-register { color: #9b4b18; }
    .editor-token-number { color: #2563eb; }
    .editor-token-string { color: #b42318; }

    html, body { overflow: hidden; }

    .shell {
      height: 100vh;
      overflow: hidden;
      grid-template-rows: auto auto 1fr;
    }

    .mode-tabs {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 1px 4px 0;
    }

    .mode-tab-btn {
      border: 1px solid #8f9cad;
      border-bottom: none;
      background: #f7f9fc;
      border-radius: 2px 2px 0 0;
      padding: 2px 9px;
      font-size: 10px;
      cursor: pointer;
    }

    .mode-tab-btn.active {
      background: #d5e4f6;
      border-color: #6f86a3;
      font-weight: 600;
    }

    .desktop {
      position: relative;
      min-height: 0;
      overflow: hidden;
      background: linear-gradient(180deg, #d8dee6 0%, #cfd7e2 100%);
    }

    .desktop-window {
      position: absolute;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-width: 200px;
      min-height: 120px;
      border: 1px solid #8e9cad;
      border-radius: 2px;
      background: #eef3f8;
      box-shadow: 0 2px 5px rgba(22, 31, 44, 0.2);
      overflow: hidden;
      resize: both;
    }

    .tool-window {
      box-shadow: 0 6px 16px rgba(22, 31, 44, 0.35);
    }

    .desktop-window .status-bar {
      border-top: 1px solid #a9b3bf;
      background: #edf2f8;
    }

    .window-hidden {
      display: none;
    }

    .window-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 20px;
      padding: 0 5px 0 6px;
      background: linear-gradient(180deg, #f7fbff 0%, #d7e3f2 100%);
      border-bottom: 1px solid #97a8bd;
      font-size: 10px;
      color: #223347;
      user-select: none;
      cursor: move;
    }

    .window-title {
      font-weight: 600;
    }

    .window-controls {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .win-btn {
      min-width: 14px;
      height: 14px;
      border: 1px solid #8596aa;
      background: linear-gradient(180deg, #ffffff 0%, #d9e3ee 100%);
      color: #223347;
      font-size: 10px;
      line-height: 1;
      padding: 0 3px;
      cursor: pointer;
    }

    .win-btn:hover {
      border-color: #57779a;
      background: linear-gradient(180deg, #ffffff 0%, #c5d9ee 100%);
    }

    .win-btn-close {
      color: #5d1820;
    }

    .window-content {
      min-height: 0;
      overflow: auto;
      background: #f7f9fc;
    }

    .window-focus .window-titlebar {
      filter: brightness(1.03);
    }

    .window-dragging {
      opacity: 0.94;
    }

    .window-activity .window-titlebar {
      animation: windowPulse 0.55s ease;
    }

    .window-minimized {
      height: 20px !important;
      min-height: 20px !important;
      resize: none;
    }

    .window-minimized .window-content,
    .window-minimized .status-bar {
      display: none !important;
    }

    .window-maximized {
      border-radius: 0;
      resize: none;
    }

    .updated-row {
      animation: rowFlash 0.85s ease;
      background: #d1e8ff;
    }

    .updated-cell {
      background: #c1e3ff;
    }

    .disable-text-highlight #text-segment-body tr.updated-row,
    .disable-text-highlight #text-segment-body tr.current-row,
    .disable-data-highlight #data-segment-body tr.updated-row,
    .disable-data-highlight #data-segment-body td.updated-cell,
    .disable-register-highlight #registers-body tr.updated-row {
      animation: none;
      background: inherit;
    }

    @keyframes rowFlash {
      0% { background: #ffe88f; }
      100% { background: #d1e8ff; }
    }

    @keyframes windowPulse {
      0% { background: linear-gradient(180deg, #fff4a6 0%, #f2dd85 100%); }
      100% { background: linear-gradient(180deg, #f7fbff 0%, #d7e3f2 100%); }
    }

    #window-main .window-content,
    #window-registers .window-content,
    #window-messages .window-content {
      display: grid;
    }

    .main-window-content {
      grid-template-rows: auto minmax(0, 1fr);
      padding: 0;
      min-height: 0;
    }

    .mode-tabs {
      border-bottom: 1px solid #9aa8b8;
      background: #e4ebf4;
    }

    .main-tab-panel {
      display: none;
      min-height: 0;
    }

    .main-tab-panel.active {
      display: grid;
    }

    #main-panel-edit {
      grid-template-rows: auto minmax(0, 1fr) auto;
    }

    #main-panel-execute {
      padding: 4px;
      min-height: 0;
      overflow: hidden;
    }

    #main-panel-execute .execute-wrap {
      display: grid;
      grid-template-rows: minmax(0, 56%) minmax(0, 44%);
      gap: 4px;
      min-height: 0;
      height: 100%;
      padding: 0;
    }

    .execute-subwindow {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      border: 1px solid #9aa9ba;
      background: #f5f8fc;
      min-height: 0;
      overflow: hidden;
    }


    .execute-splitter {
      height: 6px;
      cursor: row-resize;
      background: linear-gradient(180deg, #d9e2ee 0%, #b8c5d6 50%, #d9e2ee 100%);
      border-top: 1px solid #8fa0b6;
      border-bottom: 1px solid #8fa0b6;
      user-select: none;
    }

    .execute-splitter:hover {
      background: linear-gradient(180deg, #e5edf7 0%, #c6d4e6 50%, #e5edf7 100%);
    }
    .execute-subwindow-title {
      height: 18px;
      display: flex;
      align-items: center;
      padding: 0 6px;
      font-size: 10px;
      font-weight: 600;
      border-bottom: 1px solid #9aa9ba;
      background: linear-gradient(180deg, #f7fbff 0%, #dbe7f3 100%);
    }

    .execute-subwindow-body {
      min-height: 0;
      overflow: hidden;
    }

    .execute-text-window .execute-subwindow-body {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
    }

    .execute-top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(150px, 0.23fr);
      gap: 4px;
      min-height: 0;
      height: 100%;
    }

    .segment-panel,
    .labels-panel {
      min-height: 0;
      border: none;
      background: transparent;
      overflow: hidden;
    }

    .segment-panel {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
    }

    .text-table-wrap {
      min-height: 0;
      overflow: auto;
      padding: 0;
    }

    .labels-panel {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      border-left: 1px solid #bcc7d3;
    }

    .labels-panel .panel-title {
      margin: 0;
      padding: 2px 6px;
      font-size: 10px;
      border-bottom: 1px solid #c6ced8;
    }

    .labels-list {
      margin: 0;
      padding: 4px;
      overflow: auto;
    }

    .labels-list li {
      padding: 3px 2px;
      font-size: 10px;
    }

    .execute-data-window .data-subwindow-body {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      min-height: 0;
    }

    .data-table-wrap {
      min-height: 0;
      overflow: auto;
      padding: 0;
    }

    .data-segment-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    .data-segment-table th,
    .data-segment-table td {
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .data-segment-table th:first-child,
    .data-segment-table td:first-child {
      text-align: right;
      width: 12%;
    }

    .data-segment-table th:not(:first-child),
    .data-segment-table td:not(:first-child) {
      width: 11%;
      font-family: "Cascadia Code", "Consolas", monospace;
    }

    .data-nav {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      padding: 3px 5px;
      border-top: 1px solid #aab4c0;
      background: #edf2f8;
    }

    .data-nav > label {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
    }

    #data-base-select {
      min-width: 150px;
      border: 1px solid #8c9aad;
      background: #fff;
      border-radius: 2px;
      padding: 2px 5px;
      font-size: 10px;
    }

    #data-nav-prev,
    #data-nav-next {
      min-width: 24px;
      padding: 1px 6px;
      line-height: 1;
    }
    #window-messages .messages-pane {
      margin: 0;
      grid-template-rows: auto 1fr auto;
    }

    #window-registers .registers-pane {
      margin: 0;
      grid-template-rows: auto 1fr;
    }

    #window-messages .message-body,
    #window-registers .register-body {
      margin: 4px;
    }

    .subtab-panel {
      display: none;
      min-height: 0;
      overflow: hidden;
    }

    .subtab-panel.active {
      display: block;
    }

    #panel-run-io.subtab-panel.active {
      display: grid;
      grid-template-rows: 1fr auto;
      min-height: 0;
    }

    #panel-run-io .message-body {
      margin-bottom: 0;
    }

    .run-io-input-bar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6px;
      align-items: center;
      padding: 4px;
      border-top: 1px solid #b6c1cf;
      background: #eef3f9;
    }

    .run-io-input {
      width: 100%;
      min-width: 0;
      border: 1px solid #93a3b7;
      background: #fff;
      border-radius: 2px;
      padding: 2px 5px;
      font-size: 11px;
      line-height: 1.2;
    }
    .dialog-window {
      min-width: 340px;
      min-height: 160px;
      resize: none;
    }

    .dialog-window-content {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto auto;
      gap: 8px;
      padding: 10px;
      background: #eef3f9;
      min-height: 0;
    }

    .dialog-message {
      white-space: pre-wrap;
      overflow: auto;
      border: 1px solid #b1becd;
      background: #fff;
      padding: 8px;
      line-height: 1.25;
      font-size: 11px;
      min-height: 56px;
    }

    .dialog-input {
      width: 100%;
      margin: 0;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }

    #window-registers table th,
    #window-registers table td,
    #window-main table th,
    #window-main table td {
      font-size: 10px;
      padding: 2px 4px;
    }

    .cop0-flags {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
      font-size: 10px;
      color: #324258;
    }

    .cop0-flag {
      min-width: 14px;
      padding: 1px 3px;
      border: 1px solid #a5b2c2;
      border-radius: 2px;
      background: #f3f6fa;
      text-align: center;
    }

    .cop0-flag.on {
      background: #9cd13f;
      border-color: #7faa32;
      color: #21340a;
      font-weight: 700;
    }
    .toolbar-speed-group {
      display: inline-grid;
      grid-template-columns: auto minmax(188px, 210px);
      align-items: center;
      gap: 6px;
      min-width: 300px;
    }

    .run-speed-label {
      font-size: 10px;
      color: #364454;
      white-space: nowrap;
      display: inline-block;
      width: 190px;
      min-width: 190px;
      max-width: 190px;
      overflow: hidden;
    }

    .run-speed-slider-wrap {
      display: grid;
      grid-template-rows: 14px 5px;
      align-items: center;
      gap: 1px;
    }

    #run-speed-slider {
      width: 188px;
      margin: 0;
      height: 14px;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
    }

    #run-speed-slider::-webkit-slider-runnable-track {
      height: 4px;
      background: linear-gradient(180deg, #bcc7d5, #a5b2c3);
      border: 1px solid #7f8fa4;
      border-radius: 1px;
    }

    #run-speed-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 10px;
      height: 14px;
      margin-top: -6px;
      border: 1px solid #6b7d93;
      border-radius: 2px;
      background: linear-gradient(180deg, #fefefe, #cfdceb);
    }

    #run-speed-slider::-moz-range-track {
      height: 4px;
      background: linear-gradient(180deg, #bcc7d5, #a5b2c3);
      border: 1px solid #7f8fa4;
      border-radius: 1px;
    }

    #run-speed-slider::-moz-range-thumb {
      width: 10px;
      height: 14px;
      border: 1px solid #6b7d93;
      border-radius: 2px;
      background: linear-gradient(180deg, #fefefe, #cfdceb);
    }

    .run-speed-ruler {
      width: 188px;
      height: 5px;
      border-left: 1px solid #92a0b1;
      border-right: 1px solid #92a0b1;
      background: repeating-linear-gradient(90deg, #8596ab 0, #8596ab 1px, transparent 1px, transparent 19px);
    }
    #btn-new,
    #btn-open,
    #btn-save,
    #btn-undo,
    #btn-redo,
    #btn-assemble,
    #btn-go,
    #btn-step,
    #btn-backstep,
    #btn-reset,
    #btn-pause,
    #btn-stop {
      padding-left: 22px;
      background-repeat: no-repeat;
      background-position: 4px center;
      background-size: 13px 13px;
    }

    #btn-new { background-image: url("./assets/images/New16.png"); }
    #btn-open { background-image: url("./assets/images/Open16.png"); }
    #btn-save { background-image: url("./assets/images/Save16.png"); }
    #btn-undo { background-image: url("./assets/images/Undo16.png"); }
    #btn-redo { background-image: url("./assets/images/Redo16.png"); }
    #btn-assemble { background-image: url("./assets/images/Assemble16.png"); }
    #btn-go { background-image: url("./assets/images/Play16.png"); }
    #btn-step { background-image: url("./assets/images/StepForward16.png"); }
    #btn-backstep { background-image: url("./assets/images/StepBack16.png"); }
    #btn-reset { background-image: url("./assets/images/Reset16.png"); }
    #btn-pause { background-image: url("./assets/images/Pause16.png"); }
    #btn-stop { background-image: url("./assets/images/Stop16.png"); }

    .menu-popup {
      position: fixed;
      z-index: 1200;
      min-width: 300px;
      background: #f0f4f9;
      border: 1px solid #8f9cac;
      border-radius: 2px;
      box-shadow: 0 8px 18px rgba(20, 28, 40, 0.28);
      padding: 4px;
    }

    .menu-popup.hidden { display: none; }
    .menu-sub-popup { min-width: 220px; }

    .menu-row {
      width: 100%;
      border: 1px solid transparent;
      background: transparent;
      display: grid;
      grid-template-columns: 18px 1fr auto 10px;
      gap: 8px;
      align-items: center;
      padding: 4px 8px;
      text-align: left;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
    }

    .menu-row:hover { border-color: #8fa1b6; background: #d9e7f8; }
    .menu-row.disabled { color: #7c8794; cursor: not-allowed; }
    .menu-row.disabled:hover { border-color: transparent; background: transparent; }
    .menu-row.has-submenu .menu-shortcut { color: #7d8897; }
    .menu-check { color: #20558f; font-weight: 700; }
    .menu-shortcut { color: #59687b; font-size: 11px; }
    .menu-arrow { color: #47586e; font-size: 10px; text-align: right; }
    .menu-separator { height: 1px; background: #c0cad7; margin: 4px 4px; }

    .help-window {
      min-width: 760px;
      min-height: 520px;
      max-width: calc(100% - 12px);
      max-height: calc(100% - 12px);
    }

    .help-window .window-content {
      padding: 0;
      overflow: hidden;
    }

    .help-window-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: #eef2f7;
      overflow: hidden;
    }

    .help-tab-row {
      display: flex;
      flex: 0 0 auto;
      flex-wrap: nowrap;
      align-items: flex-end;
      gap: 1px;
      padding: 2px 3px 0;
      border-bottom: 1px solid #9caab9;
      background: #dde5ef;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .help-subtab-row {
      background: #e7edf5;
    }

    .help-subtab-row.hidden {
      display: none;
    }

    .help-tab-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #9caab9;
      border-bottom: none;
      background: #f4f7fb;
      border-radius: 2px 2px 0 0;
      padding: 3px 9px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      line-height: 1.1;
      flex: 0 0 auto;
    }

    .help-tab-btn.active {
      background: #d8e8fb;
      border-color: #6f89a8;
      font-weight: 600;
    }

    .help-body-wrap {
      position: relative;
      flex: 1 1 auto;
      display: block;
      min-height: 0;
      overflow: hidden;
      background: #fff;
      border-top: 1px solid #bbc5d1;
    }

    .help-frame,
    .help-inline {
      display: block;
      width: 100%;
      height: 100%;
      border: none;
    }

    .help-inline {
      padding: 10px;
      overflow: auto;
      font-family: "Segoe UI", sans-serif;
      font-size: 12px;
    }

    .help-inline.hidden,
    .help-frame.hidden {
      display: none;
    }

    .help-inline h2 {
      margin-top: 0;
    }

    .help-article {
      max-width: 960px;
      line-height: 1.35;
    }

    .help-article ul {
      margin-top: 0.35rem;
    }

    .help-plain {
      margin: 0;
      white-space: pre-wrap;
      font-family: "Courier New", monospace;
      font-size: 12px;
      line-height: 1.35;
      color: #1f2835;
    }

    .help-footer {
      display: flex;
      flex: 0 0 auto;
      justify-content: center;
      align-items: center;
      padding: 5px;
      border-top: 1px solid #a9b3bf;
      background: #edf2f8;
    }

    .about-window {
      min-width: 360px;
      min-height: 220px;
    }

    .about-window-content {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 12px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.3;
      background: #f4f7fb;
    }

    .about-brand {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .about-brand img {
      width: 32px;
      height: 32px;
      flex: 0 0 32px;
    }

    .about-copy {
      color: #1f2f43;
    }

    .about-actions {
      display: flex;
      justify-content: center;
    }

    .tool-modal {
      position: fixed;
      inset: 0;
      z-index: 1320;
      background: rgba(9, 13, 20, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .tool-modal.hidden { display: none; }

    .tool-card {
      width: min(1180px, 96vw);
      height: min(88vh, 760px);
      display: grid;
      grid-template-rows: auto 1fr;
      overflow: hidden;
    }

    .tool-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid #9caab9;
      padding: 8px 10px;
      background: linear-gradient(180deg, #f6f8fb, #e7edf5);
    }

    .tool-content {
      min-height: 0;
      overflow: auto;
      background: #f4f7fb;
    }

    .tool-placeholder {
      max-width: 760px;
      padding: 20px;
      line-height: 1.45;
    }

    .bitmap-tool {
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 10px;
      padding: 10px;
      height: 100%;
    }

    .bitmap-tool-title {
      margin: 0;
      text-align: center;
      font-size: 42px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #1c2a3c;
    }

    .bitmap-main {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 12px;
      min-height: 0;
    }

    .bitmap-controls {
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .bitmap-control {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
      font-size: 18px;
      font-weight: 600;
    }

    .bitmap-control select {
      min-width: 175px;
      border: 1px solid #8497ad;
      background: #fff;
      border-radius: 2px;
      padding: 4px 6px;
      font-size: 18px;
      font-weight: 600;
    }

    .bitmap-canvas-wrap {
      border: 1px solid #20242b;
      background: #000;
      overflow: auto;
    }

    .bitmap-canvas {
      display: block;
      background: #000;
    }

    .bitmap-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #a9b5c4;
      padding-top: 10px;
    }

    .bitmap-footer .tool-btn { min-width: 116px; }

    .hide-labels-window .labels-panel { display: none; }
    .hide-labels-window .execute-top { grid-template-columns: 1fr; }

    @media (max-width: 1250px) {
      .toolbar-speed-group { min-width: 100%; grid-template-columns: 1fr; }
      #run-speed-slider, .run-speed-ruler { width: 100%; }
      .bitmap-main { grid-template-columns: 1fr; }
      .bitmap-control { font-size: 17px; }
      .bitmap-control select { font-size: 16px; }
      .bitmap-tool-title { font-size: 26px; }
    }
  `;
  document.head.appendChild(style);
}

function createHelpSystem(refs, messagesPane, windowManager) {
  const desktop = refs.windows.desktop;
  const groups = [
    {
      id: "webmars",
      label: "webMARS",
      pages: [
        { id: "info", label: "Info", path: "./help/info.html" },
        { id: "changelog", label: "Changelog", path: "./help/changelog.html" }
      ]
    },
    {
      id: "mips",
      label: "MIPS",
      pages: [
        {
          id: "basic",
          label: "Basic Instructions",
          html: `
            <article class="help-article">
              <h2>Basic Instructions</h2>
              <p>The web runtime follows the Java MARS 4.5 core for basic MIPS instruction execution.</p>
              <p>Use the official references below for canonical syntax and behavior details.</p>
              <ul>
                <li><a href="./help/mipsref.pdf" target="_blank" rel="noopener noreferrer">Open mipsref.pdf</a></li>
                <li>Source of truth in this workspace: <code>mars/mips/instructions/</code>.</li>
              </ul>
            </article>`
        },
        {
          id: "extended",
          label: "Extended (pseudo) Instructions",
          html: `
            <article class="help-article">
              <h2>Extended (Pseudo) Instructions</h2>
              <p>Pseudo-instruction expansion follows <code>PseudoOps.txt</code> from Java MARS 4.5.</p>
              <p>Macro expansion and pseudo-op lowering are applied before assembly, matching the Java workflow.</p>
            </article>`
        },
        {
          id: "directives",
          label: "Directives",
          html: `
            <article class="help-article">
              <h2>Directives</h2>
              <p>The assembler supports the MARS directive set used in normal workflows, including data directives, macros and includes.</p>
              <p>See <code>mars/assembler</code> and bundled help pages for directive-specific semantics.</p>
            </article>`
        },
        { id: "syscalls", label: "Syscalls", path: "./help/SyscallHelp.html" },
        { id: "exceptions", label: "Exceptions", path: "./help/ExceptionsHelp.html" },
        { id: "macros", label: "Macros", path: "./help/MacrosHelp.html" }
      ]
    },
    {
      id: "mars",
      label: "MARS",
      pages: [
        { id: "intro", label: "Intro", path: "./help/MarsHelpIntro.html" },
        { id: "ide", label: "IDE", path: "./help/MarsHelpIDE.html" },
        { id: "debugging", label: "Debugging", path: "./help/MarsHelpDebugging.html" },
        { id: "settings", label: "Settings", path: "./help/MarsHelpSettings.html" },
        { id: "tools", label: "Tools", path: "./help/MarsHelpTools.html" },
        { id: "command", label: "Command", path: "./help/MarsHelpCommand.html" },
        { id: "limits", label: "Limits", path: "./help/MarsHelpLimits.html" },
        { id: "history", label: "History", path: "./help/MarsHelpHistory.html" }
      ]
    },
    {
      id: "license",
      label: "License",
      pages: [{ id: "main", label: "License", path: "./help/MARSlicense.txt" }]
    },
    {
      id: "bugs",
      label: "Bugs/Comments",
      pages: [{ id: "main", label: "Bugs/Comments", path: "./help/BugReportingHelp.html" }]
    },
    {
      id: "ack",
      label: "Acknowledgements",
      pages: [{ id: "main", label: "Acknowledgements", path: "./help/Acknowledgements.html" }]
    },
    {
      id: "song",
      label: "Instruction Set Song",
      pages: [{ id: "main", label: "Instruction Set Song", path: "./help/MIPSInstructionSetSong.html" }]
    }
  ];

  const win = document.createElement("section");
  win.className = "desktop-window window-hidden tool-window help-window";
  win.id = "window-help";
  win.style.left = "110px";
  win.style.top = "60px";
  win.style.width = "992px";
  win.style.height = "732px";
  win.innerHTML = `
    <div class="window-titlebar">
      <span class="window-title" id="help-title">webMARS 0.3 Help</span>
      <div class="window-controls">
        <button class="win-btn" data-win-action="min" type="button">_</button>
        <button class="win-btn" data-win-action="max" type="button">[]</button>
        <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
      </div>
    </div>
    <div class="window-content help-window-content">
      <div class="help-tab-row" id="help-top-tabs"></div>
      <div class="help-tab-row help-subtab-row" id="help-sub-tabs"></div>
      <div class="help-body-wrap">
        <iframe id="help-frame" class="help-frame" title="MARS Help"></iframe>
        <div id="help-inline" class="help-inline hidden"></div>
      </div>
      <div class="help-footer">
        <button id="help-close" class="tool-btn" type="button">Close</button>
      </div>
    </div>
  `;

  desktop.appendChild(win);
  windowManager.registerWindow(win);

  const aboutWin = document.createElement("section");
  aboutWin.className = "desktop-window window-hidden tool-window about-window";
  aboutWin.id = "window-help-about";
  aboutWin.style.left = "180px";
  aboutWin.style.top = "120px";
  aboutWin.style.width = "760px";
  aboutWin.style.height = "420px";
  aboutWin.innerHTML = `
    <div class="window-titlebar">
      <span class="window-title">About webMARS</span>
      <div class="window-controls">
        <button class="win-btn" data-win-action="min" type="button">_</button>
        <button class="win-btn" data-win-action="max" type="button">[]</button>
        <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
      </div>
    </div>
    <div class="window-content about-window-content">
      <div class="about-brand">
                <div class="about-copy">
          <strong>webMARS 0.3</strong><br><br>
          webMARS is a JavaScript port of the original MARS MIPS 4.5 simulator.<br><br>
          Credits:<br><br>
          &nbsp;&nbsp;&nbsp;&nbsp;Original Java Version: Developed by Pete Sanderson, Kenneth Vollmar, and contributors (2003-2013).<br><br>
          &nbsp;&nbsp;&nbsp;&nbsp;JavaScript Port: Developed and maintained by Nelson Ferreira (2020-2026).<br><br>
          Privacy &amp; Ethics:<br>
          This is a completely free, open-source web application. It features no advertising, no cookies, and no user data collection.<br><br>
          Status:<br>
          Distributed under the MIT License. Please note this is an ongoing project; some features may still be under development or behave differently from the original version.<br><br>
          Contact:<br>
          Nelson Ferreira - nels.ferreira@sapo.pt
          <a href="https://github.com/codigoavulso/webMARS/" target="_blank" rel="noopener noreferrer">https://github.com/codigoavulso/webMARS/</a>
        </div>
      </div>
      <div class="about-actions">
        <button id="help-about-close" class="tool-btn" type="button">Close</button>
      </div>
    </div>
  `;
  desktop.appendChild(aboutWin);
  windowManager.registerWindow(aboutWin);
  const docWin = document.createElement("section");
  docWin.className = "desktop-window window-hidden tool-window help-window";
  docWin.id = "window-help-doc";
  docWin.style.left = "140px";
  docWin.style.top = "90px";
  docWin.style.width = "980px";
  docWin.style.height = "700px";
  docWin.innerHTML = `
    <div class="window-titlebar">
      <span class="window-title" id="help-doc-title">Help Document</span>
      <div class="window-controls">
        <button class="win-btn" data-win-action="min" type="button">_</button>
        <button class="win-btn" data-win-action="max" type="button">[]</button>
        <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
      </div>
    </div>
    <div class="window-content help-window-content">
      <div class="help-body-wrap">
        <iframe id="help-doc-frame" class="help-frame" title="Help Document"></iframe>
      </div>
      <div class="help-footer">
        <button id="help-doc-close" class="tool-btn" type="button">Close</button>
      </div>
    </div>
  `;
  desktop.appendChild(docWin);
  windowManager.registerWindow(docWin);

  const titleNode = win.querySelector("#help-title");
  const closeButton = win.querySelector("#help-close");
  const topTabsNode = win.querySelector("#help-top-tabs");
  const subTabsNode = win.querySelector("#help-sub-tabs");
  const frame = win.querySelector("#help-frame");
  const inlineNode = win.querySelector("#help-inline");
  const titleCloseButton = win.querySelector('[data-win-action="close"]');
  const aboutCloseButton = aboutWin.querySelector("#help-about-close");
  const docTitleNode = docWin.querySelector("#help-doc-title");
  const docFrame = docWin.querySelector("#help-doc-frame");
  const docCloseButton = docWin.querySelector("#help-doc-close");
  const docTitleCloseButton = docWin.querySelector('[data-win-action="close"]');

  let activeGroupId = "webmars";
  let activePageId = "info";
  let currentLoadToken = 0;

  const getGroup = (groupId) => groups.find((group) => group.id === groupId) || groups[0];
  const getPage = (group, pageId) => group.pages.find((page) => page.id === pageId) || group.pages[0];

  function cleanupView() {
    frame.src = "about:blank";
    inlineNode.innerHTML = "";
    inlineNode.classList.add("hidden");
    frame.classList.remove("hidden");
  }

  function closeWindow() {
    cleanupView();
    windowManager.hide(win.id);
  }

  function closeDocWindow() {
    docFrame.src = "about:blank";
    windowManager.hide(docWin.id);
  }
  function renderTopTabs() {
    topTabsNode.innerHTML = groups.map((group) => {
      const active = group.id === activeGroupId ? "active" : "";
      return `<button type="button" class="help-tab-btn ${active}" data-help-group="${group.id}">${escapeHtml(group.label)}</button>`;
    }).join("");

    topTabsNode.querySelectorAll("[data-help-group]").forEach((button) => {
      button.addEventListener("click", () => {
        activeGroupId = button.dataset.helpGroup;
        const group = getGroup(activeGroupId);
        activePageId = group.pages[0].id;
        render();
      });
    });
  }

  function renderSubTabs(group) {
    if (group.pages.length <= 1) {
      subTabsNode.classList.add("hidden");
      subTabsNode.innerHTML = "";
      return;
    }

    subTabsNode.classList.remove("hidden");
    subTabsNode.innerHTML = group.pages.map((page) => {
      const active = page.id === activePageId ? "active" : "";
      return `<button type="button" class="help-tab-btn ${active}" data-help-page="${page.id}">${escapeHtml(page.label)}</button>`;
    }).join("");

    subTabsNode.querySelectorAll("[data-help-page]").forEach((button) => {
      button.addEventListener("click", () => {
        activePageId = button.dataset.helpPage;
        render();
      });
    });
  }

  function loadPage(page, groupLabel) {
    const loadToken = ++currentLoadToken;
    titleNode.textContent = `webMARS 0.3 [${groupLabel} / ${page.label}]`;
    if (page.html) {
      frame.classList.add("hidden");
      inlineNode.classList.remove("hidden");
      inlineNode.innerHTML = page.html;
      return;
    }

    if (typeof page.path === "string" && /\.txt$/i.test(page.path)) {
      frame.classList.add("hidden");
      inlineNode.classList.remove("hidden");
      inlineNode.innerHTML = '<pre class="help-plain">Loading...</pre>';
      const loadPlainText = () => fetch(page.path, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.text();
        })
        .catch(() => new Promise((resolve, reject) => {
          const req = new XMLHttpRequest();
          req.open("GET", page.path, true);
          req.onload = () => {
            if (req.status === 0 || (req.status >= 200 && req.status < 300)) {
              resolve(req.responseText);
              return;
            }
            reject(new Error("HTTP " + req.status));
          };
          req.onerror = () => reject(new Error("Failed to load text resource."));
          req.send();
        }));

      loadPlainText()
        .then((body) => {
          if (loadToken !== currentLoadToken) return;
          inlineNode.innerHTML = `<pre class="help-plain">${escapeHtml(body)}</pre>`;
        })
        .catch(() => {
          if (loadToken !== currentLoadToken) return;
          inlineNode.innerHTML = '<pre class="help-plain">Failed to load this help page.</pre>';
          messagesPane.postMars("[error] Failed to load selected help file.");
        });
      return;
    }

    inlineNode.classList.add("hidden");
    inlineNode.innerHTML = "";
    frame.classList.remove("hidden");
    frame.src = page.path;
  }
  function render() {
    const group = getGroup(activeGroupId);
    const page = getPage(group, activePageId);
    renderTopTabs();
    renderSubTabs(group);
    loadPage(page, group.label);
  }

  closeButton.addEventListener("click", closeWindow);
  titleCloseButton?.addEventListener("click", closeWindow);
  aboutCloseButton?.addEventListener("click", () => windowManager.hide(aboutWin.id));
  docCloseButton?.addEventListener("click", closeDocWindow);
  docTitleCloseButton?.addEventListener("click", closeDocWindow);
  docFrame?.addEventListener("error", () => {
    messagesPane.postMars("[error] Failed to load selected help document.");
  });

  frame.addEventListener("error", () => {
    messagesPane.postMars("[error] Failed to load selected help file.");
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !win.classList.contains("window-hidden")) closeWindow();
    if (event.key === "Escape" && !aboutWin.classList.contains("window-hidden")) windowManager.hide(aboutWin.id);
    if (event.key === "Escape" && !docWin.classList.contains("window-hidden")) closeDocWindow();
  });

  return {
    open(groupId = "webmars", pageId = "info") {
      const group = getGroup(groupId);
      const page = getPage(group, pageId);
      activeGroupId = group.id;
      activePageId = page.id;
      render();
      windowManager.show(win.id);
    },
    openAbout() {
      windowManager.show(aboutWin.id);
    },
    openDocument(path, title = "Help Document") {
      const safePath = String(path || "").trim();
      if (!safePath) return;
      docTitleNode.textContent = title;
      docFrame.src = safePath;
      windowManager.show(docWin.id);
    },
    close: closeWindow
  };
}

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
    win.style.left = `${pos.left}px`;
    win.style.top = `${pos.top}px`;
    win.style.width = `${width}px`;
    win.style.height = `${height}px`;
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

    const close = () => windowManager.hide(win.id);
    return {
      root: win,
      close,
      open() {
        windowManager.show(win.id);
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
        req.onerror = () => reject(fetchError instanceof Error ? fetchError : new Error("Failed to load file."));
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
          return {
            open: instance.open,
            close: typeof instance.close === "function" ? instance.close : () => {},
            onSnapshot: typeof instance.onSnapshot === "function" ? instance.onSnapshot : () => {}
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        messagesPane.postMars(`[error] Tool '${definition.label}' failed to initialize: ${message}`);
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
          messagesPane.postMars(`[warn] Tool '${toolId}' not found.`);
          return;
        }
        tool.open();
      });
    },
    onSnapshot(snapshot) {
      instances.forEach((tool) => {
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
function createMenuSystem(refs, handlers, getState, toolManager) {
  const popup = document.createElement("div");
  popup.className = "menu-popup hidden";
  document.body.appendChild(popup);

  const submenuPopup = document.createElement("div");
  submenuPopup.className = "menu-popup menu-sub-popup hidden";
  document.body.appendChild(submenuPopup);

  const definitions = () => {
    const examples = typeof handlers.getExampleMenuItems === "function" ? handlers.getExampleMenuItems() : [];
    const exampleItems = examples.length ? examples : [{ label: "(no examples)", enabled: () => false }];
    return {
      File: [
        { label: "New", command: "newFile", shortcut: "Ctrl+N" },
        { label: "Open...", command: "openFile", shortcut: "Ctrl+O" },
        "-",
        { label: "Close", command: "closeFile", shortcut: "Ctrl+W" },
        { label: "Close All", command: "closeAllFiles" },
        "-",
        { label: "Save", command: "saveFile", shortcut: "Ctrl+S" },
        { label: "Save As...", command: "saveFileAs", shortcut: "Ctrl+Shift+S" },
        "-",
        { label: "Examples", submenu: exampleItems },
        "-",
        { label: "Dump Run I/O", command: "dumpRunIo" }
      ],
      Edit: [
        { label: "Undo", command: "undo", shortcut: "Ctrl+Z" },
        { label: "Redo", command: "redo", shortcut: "Ctrl+Y" },
        "-",
        { label: "Cut", command: "cut", shortcut: "Ctrl+X" },
        { label: "Copy", command: "copy", shortcut: "Ctrl+C" },
        { label: "Paste", command: "paste", shortcut: "Ctrl+V" },
        { label: "Find", command: "find", shortcut: "Ctrl+F" },
        { label: "Select All", command: "selectAll", shortcut: "Ctrl+A" }
      ],
      Run: [
        { label: "Assemble", command: "assemble", shortcut: "F3" },
        { label: "Go", command: "go", shortcut: "F5" },
        { label: "Pause", command: "pause" },
        { label: "Stop", command: "stop" },
        { label: "Step", command: "step", shortcut: "F7" },
        { label: "Backstep", command: "backstep" },
        { label: "Reset", command: "reset" }
      ],
      Settings: [
        { label: "Show Labels Window (symbol table)", command: "toggleShowLabelsWindow", check: (st) => st.preferences.showLabelsWindow },
        { label: "Program arguments provided to MIPS program", command: "toggleProgramArguments", check: (st) => st.preferences.programArguments },
        { label: "Popup dialog for input syscalls", command: "togglePopupSyscallInput", check: (st) => st.preferences.popupSyscallInput },
        { label: "Addresses displayed in hexadecimal", command: "toggleAddressDisplayBase", check: (st) => st.preferences.displayAddressesHex },
        { label: "Values displayed in hexadecimal", command: "toggleValueDisplayBase", check: (st) => st.preferences.displayValuesHex },
        "-",
        { label: "Assemble file upon opening", command: "toggleAssembleOnOpen", check: (st) => st.preferences.assembleOnOpen },
        { label: "Assemble all files in directory", command: "toggleAssembleAll", check: (st) => st.preferences.assembleAll },
        { label: "Assembler warnings are considered errors", command: "toggleWarningsAreErrors", check: (st) => st.preferences.warningsAreErrors },
        { label: "Initialize Program Counter to global 'main' if defined", command: "toggleStartAtMain", check: (st) => st.preferences.startAtMain },
        { label: "Permit extended (pseudo) instructions and formats", command: "toggleExtendedAssembler", check: (st) => st.preferences.extendedAssembler },
        { label: "Delayed branching", command: "toggleDelayedBranching", check: (st) => st.preferences.delayedBranching },
        { label: "Self-modifying code", command: "toggleSelfModifyingCode", check: (st) => st.preferences.selfModifyingCode },
        "-",
        { label: "Editor...", command: "showEditorPreferences" },
        { label: "Highlighting...", command: "showHighlightingPreferences" },
        { label: "Exception Handler...", command: "showExceptionHandlerPreferences" },
        { label: "Memory Configuration...", command: "showMemoryConfigurationPreferences" }
      ],
      Tools: toolManager.getTools().map((tool) => ({
        label: tool.label,
        command: () => handlers.openTool(tool.id)
      })),
      Help: [
        { label: "Help", command: "helpHub", shortcut: "F1" },
        "-",
        { label: "MARS Intro", command: "helpIntro" },
        { label: "MARS IDE", command: "helpIde" },
        { label: "MIPS Syscalls", command: "helpSyscalls" },
        { label: "License", command: "helpLicense" },
        { label: "Bugs/Comments", command: "helpBugs" },
        { label: "Acknowledgements", command: "helpAcknowledgements" },
        { label: "Instruction Set Song", command: "helpSong" },
        { label: "MIPS Reference PDF", command: "helpMipsPdf" },
        "-",
        { label: "About...", command: "helpAbout" }
      ]
    };
  };

  let activeMenu = null;

  function hideSubmenu() {
    submenuPopup.classList.add("hidden");
    submenuPopup.innerHTML = "";
  }

  function hide() {
    hideSubmenu();
    popup.classList.add("hidden");
    popup.innerHTML = "";
    refs.root.querySelectorAll(".menu-item").forEach((button) => button.classList.remove("active"));
    activeMenu = null;
  }

  function run(command) {
    if (typeof command === "function") command();
    else if (typeof handlers[command] === "function") handlers[command]();
    hide();
  }

  function renderRows(target, items, state) {
    const inSubmenu = target === submenuPopup;
    target.innerHTML = "";
    items.forEach((item) => {
      if (item === "-") {
        const sep = document.createElement("div");
        sep.className = "menu-separator";
        target.appendChild(sep);
        return;
      }

      const row = document.createElement("button");
      row.type = "button";
      const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
      row.className = `menu-row${hasSubmenu ? " has-submenu" : ""}`;

      const checked = typeof item.check === "function" ? item.check(state) : false;
      const enabled = typeof item.enabled === "function" ? item.enabled(state) : true;
      row.innerHTML = `<span class="menu-check">${checked ? "&#10003;" : ""}</span><span>${escapeHtml(item.label)}</span><span class="menu-shortcut">${escapeHtml(item.shortcut ?? "")}</span><span class="menu-arrow">${hasSubmenu ? "&#9654;" : ""}</span>`;

      if (!enabled) {
        row.classList.add("disabled");
        row.disabled = true;
        target.appendChild(row);
        return;
      }

      if (hasSubmenu) {
        const submenuItems = item.submenu;
        const openSubmenu = () => {
          renderRows(submenuPopup, submenuItems, state);
          const rowRect = row.getBoundingClientRect();
          submenuPopup.style.left = `${Math.round(rowRect.right - 2)}px`;
          submenuPopup.style.top = `${Math.round(rowRect.top)}px`;
          submenuPopup.classList.remove("hidden");

          const subRect = submenuPopup.getBoundingClientRect();
          if (subRect.right > window.innerWidth - 4) {
            submenuPopup.style.left = `${Math.max(4, Math.round(rowRect.left - subRect.width + 2))}px`;
          }
          if (subRect.bottom > window.innerHeight - 4) {
            submenuPopup.style.top = `${Math.max(4, Math.round(window.innerHeight - subRect.height - 4))}px`;
          }
        };

        row.addEventListener("mouseenter", openSubmenu);
        row.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openSubmenu();
        });
      } else {
        if (!inSubmenu) row.addEventListener("mouseenter", hideSubmenu);
        row.addEventListener("click", () => run(item.command));
      }

      target.appendChild(row);
    });
  }

  function open(menuName, anchor) {
    const menuMap = definitions();
    const items = menuMap[menuName];
    if (!items) return;

    hideSubmenu();
    const state = getState();
    renderRows(popup, items, state);

    const rect = anchor.getBoundingClientRect();
    popup.style.left = `${Math.round(rect.left)}px`;
    popup.style.top = `${Math.round(rect.bottom + 2)}px`;
    popup.classList.remove("hidden");

    const popupRect = popup.getBoundingClientRect();
    if (popupRect.right > window.innerWidth - 4) {
      popup.style.left = `${Math.max(4, Math.round(window.innerWidth - popupRect.width - 4))}px`;
    }

    refs.root.querySelectorAll(".menu-item").forEach((button) => {
      button.classList.toggle("active", button === anchor);
    });

    activeMenu = menuName;
  }

  popup.addEventListener("mouseleave", (event) => {
    const related = event.relatedTarget;
    if (related instanceof Node && submenuPopup.contains(related)) return;
    hideSubmenu();
  });

  submenuPopup.addEventListener("mouseleave", (event) => {
    const related = event.relatedTarget;
    if (related instanceof Node && popup.contains(related)) return;
    hideSubmenu();
  });

  refs.root.querySelectorAll(".menu-item").forEach((button) => {
    button.addEventListener("click", () => {
      const menuName = button.dataset.menu || button.textContent.trim();
      if (menuName === activeMenu) {
        hide();
        return;
      }
      open(menuName, button);
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest(".menu-item") || target.closest(".menu-popup")) return;
    hide();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });

  return { hide };
}
























































