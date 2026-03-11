(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-bitmap-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .bitmap-tool {
        font: 11px Tahoma, "Segoe UI", sans-serif;
      }

      .bitmap-main {
        display: grid;
        grid-template-columns: minmax(250px, 290px) minmax(0, 1fr);
        gap: 8px;
        min-height: 0;
        flex: 1 1 auto;
      }

      .bitmap-controls {
        display: grid;
        grid-auto-rows: minmax(22px, auto);
        gap: 6px;
        align-content: start;
      }

      .bitmap-control-label {
        color: #111;
      }

      .bitmap-control-field {
        width: 128px;
      }

      .bitmap-viewport {
        display: flex;
        min-height: 0;
      }

      .bitmap-canvas-wrap {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        border: 1px solid #bdbdbd;
        background: #fff;
        padding: 8px;
        display: flex;
        align-items: flex-start;
        justify-content: center;
      }

      .bitmap-canvas {
        display: block;
        flex: 0 0 auto;
        background: #000;
        image-rendering: pixelated;
      }

      @media (max-width: 860px) {
        .bitmap-main {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const DEFAULT_CONFIG = {
    unitWidth: 1,
    unitHeight: 1,
    displayWidth: 512,
    displayHeight: 256,
    baseAddress: 0x10010000
  };

  const UNIT_OPTIONS = [1, 2, 4, 8, 16, 32];
  const WIDTH_OPTIONS = [64, 128, 256, 512, 1024];
  const HEIGHT_OPTIONS = [64, 128, 256, 512, 1024];
  const BASE_OPTIONS = [
    { value: 0x10000000, label: "0x10000000 (global data)" },
    { value: 0x10008000, label: "0x10008000 ($gp)" },
    { value: 0x10010000, label: "0x10010000 (static data)" },
    { value: 0x10040000, label: "0x10040000 (heap)" },
    { value: 0xffff0000, label: "0xFFFF0000 (memory map)" }
  ];

  function formatFallback(message, variables = {}) {
    return String(message ?? "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match
    ));
  }

  function t(message, variables = {}) {
    if (typeof translateText === "function") return translateText(message, variables);
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (i18n && typeof i18n.t === "function") return i18n.t(message, variables);
    return formatFallback(message, variables);
  }

  function subscribeLanguageChange(listener) {
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (!i18n || typeof i18n.subscribe !== "function" || typeof listener !== "function") return () => {};
    return i18n.subscribe(listener);
  }

  function toHex32(value) {
    return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
  }

  function parseNumeric(value, fallback) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function buildOptions(values, selected) {
    return values
      .map((value) => `<option value="${value}"${value === selected ? " selected" : ""}>${value}</option>`)
      .join("");
  }

  function buildBaseOptions(selected) {
    return BASE_OPTIONS
      .map(({ value, label }) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`)
      .join("");
  }

  host.register({
    id: "bitmap-display",
    label: "Bitmap Display",
    create(ctx) {
      const shell = ctx.createToolWindowShell("bitmap-display", "Bitmap Display, Version 1.0", 980, 620, `
        <div class="mars-tool-shell bitmap-tool">
          <h2 class="mars-tool-heading">Bitmap Display</h2>
          <div class="bitmap-main">
            <section class="mars-tool-panel">
              <div class="mars-tool-panel-title">Display Settings</div>
              <div class="mars-tool-panel-body bitmap-controls">
                <div class="mars-tool-row">
                  <span class="bitmap-control-label">Unit Width in Pixels</span>
                  <select class="bitmap-control-field" data-bitmap="unit-width">${buildOptions(UNIT_OPTIONS, DEFAULT_CONFIG.unitWidth)}</select>
                </div>
                <div class="mars-tool-row">
                  <span class="bitmap-control-label">Unit Height in Pixels</span>
                  <select class="bitmap-control-field" data-bitmap="unit-height">${buildOptions(UNIT_OPTIONS, DEFAULT_CONFIG.unitHeight)}</select>
                </div>
                <div class="mars-tool-row">
                  <span class="bitmap-control-label">Display Width in Pixels</span>
                  <select class="bitmap-control-field" data-bitmap="display-width">${buildOptions(WIDTH_OPTIONS, DEFAULT_CONFIG.displayWidth)}</select>
                </div>
                <div class="mars-tool-row">
                  <span class="bitmap-control-label">Display Height in Pixels</span>
                  <select class="bitmap-control-field" data-bitmap="display-height">${buildOptions(HEIGHT_OPTIONS, DEFAULT_CONFIG.displayHeight)}</select>
                </div>
                <div class="mars-tool-row">
                  <span class="bitmap-control-label">Base address for display</span>
                  <select class="bitmap-control-field" data-bitmap="base-address">${buildBaseOptions(DEFAULT_CONFIG.baseAddress)}</select>
                </div>
              </div>
            </section>
            <section class="mars-tool-panel">
              <div class="mars-tool-panel-title">Bitmap Display</div>
              <div class="mars-tool-panel-body bitmap-viewport">
                <div class="bitmap-canvas-wrap">
                  <canvas class="bitmap-canvas" data-bitmap="canvas"></canvas>
                </div>
              </div>
            </section>
          </div>
          <div class="mars-tool-footer bitmap-footer">
            <button class="tool-btn" data-bitmap="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <div class="mars-tool-footer-actions">
              <button class="tool-btn" data-bitmap="reset" type="button">Reset</button>
              <button class="tool-btn" data-bitmap="help" type="button">Help</button>
              <button class="tool-btn" data-bitmap="close" type="button">Close</button>
            </div>
          </div>
        </div>
      `);

      const root = shell.root;
      const unitWidthSelect = root.querySelector("[data-bitmap='unit-width']");
      const unitHeightSelect = root.querySelector("[data-bitmap='unit-height']");
      const displayWidthSelect = root.querySelector("[data-bitmap='display-width']");
      const displayHeightSelect = root.querySelector("[data-bitmap='display-height']");
      const baseAddressSelect = root.querySelector("[data-bitmap='base-address']");
      const canvas = root.querySelector("[data-bitmap='canvas']");
      const connectButton = root.querySelector("[data-bitmap='connect']");
      const resetButton = root.querySelector("[data-bitmap='reset']");
      const helpButton = root.querySelector("[data-bitmap='help']");
      const closeButton = root.querySelector("[data-bitmap='close']");

      const screenContext = canvas.getContext("2d", { alpha: false });
      const sourceCanvas = document.createElement("canvas");
      const sourceContext = sourceCanvas.getContext("2d", { alpha: false });

      let connected = false;
      let framePending = false;
      let latestSnapshot = null;
      let config = { ...DEFAULT_CONFIG };
      let sourceImageData = null;
      let sourceData = null;
      let fullRedrawNeeded = true;
      let pendingWriteAddress = null;
      let lastSnapshotStep = null;

      function getGrid() {
        const cols = Math.max(1, Math.floor(config.displayWidth / config.unitWidth));
        const rows = Math.max(1, Math.floor(config.displayHeight / config.unitHeight));
        return { cols, rows };
      }

      function getVisibleAddressRange() {
        const { cols, rows } = getGrid();
        const pixelCount = cols * rows;
        const start = config.baseAddress >>> 0;
        const endExclusive = (start + (pixelCount * 4)) >>> 0;
        return { start, endExclusive, pixelCount, cols, rows };
      }

      function isAddressVisible(address) {
        if (!Number.isFinite(address)) return false;
        const addr = address >>> 0;
        const { start, pixelCount } = getVisibleAddressRange();
        if (addr < start) return false;
        return ((addr - start) >>> 0) < (pixelCount * 4);
      }

      function ensureSourceImageData() {
        const { cols, rows } = getGrid();
        if (!sourceImageData || sourceImageData.width !== cols || sourceImageData.height !== rows) {
          sourceImageData = sourceContext.createImageData(cols, rows);
          sourceData = sourceImageData.data;
          for (let i = 0; i < sourceData.length; i += 4) {
            sourceData[i] = 0;
            sourceData[i + 1] = 0;
            sourceData[i + 2] = 0;
            sourceData[i + 3] = 0xff;
          }
        }
      }

      function resizeCanvases() {
        canvas.width = config.displayWidth;
        canvas.height = config.displayHeight;
        canvas.style.width = `${config.displayWidth}px`;
        canvas.style.height = `${config.displayHeight}px`;

        const { cols, rows } = getGrid();
        sourceCanvas.width = cols;
        sourceCanvas.height = rows;
        ensureSourceImageData();
        fullRedrawNeeded = true;
      }

      function clearDisplay() {
        screenContext.fillStyle = "#000";
        screenContext.fillRect(0, 0, canvas.width, canvas.height);
      }

      function readConfigFromControls() {
        return {
          unitWidth: parseNumeric(unitWidthSelect.value, DEFAULT_CONFIG.unitWidth),
          unitHeight: parseNumeric(unitHeightSelect.value, DEFAULT_CONFIG.unitHeight),
          displayWidth: parseNumeric(displayWidthSelect.value, DEFAULT_CONFIG.displayWidth),
          displayHeight: parseNumeric(displayHeightSelect.value, DEFAULT_CONFIG.displayHeight),
          baseAddress: parseNumeric(baseAddressSelect.value, DEFAULT_CONFIG.baseAddress) >>> 0
        };
      }

      function applyConfigToControls() {
        unitWidthSelect.value = String(config.unitWidth);
        unitHeightSelect.value = String(config.unitHeight);
        displayWidthSelect.value = String(config.displayWidth);
        displayHeightSelect.value = String(config.displayHeight);
        baseAddressSelect.value = String(config.baseAddress >>> 0);
      }

      function updateConnectButtonLabel() {
        connectButton.textContent = connected ? t("Disconnect from MIPS") : t("Connect to MIPS");
      }

      function readMemoryWords(snapshot) {
        if (!snapshot) return new Map();
        if (snapshot.memoryWords instanceof Map) return snapshot.memoryWords;
        if (Array.isArray(snapshot.memoryWords)) return new Map(snapshot.memoryWords);
        return new Map();
      }

      function setPixelFromWord(pixelIndex, word) {
        if (!sourceData) return;
        const offset = pixelIndex * 4;
        const value = (word ?? 0) >>> 0;
        sourceData[offset] = (value >>> 16) & 0xff;
        sourceData[offset + 1] = (value >>> 8) & 0xff;
        sourceData[offset + 2] = value & 0xff;
        sourceData[offset + 3] = 0xff;
      }

      function drawScaledPixel(pixelIndex) {
        const { cols } = getGrid();
        const x = pixelIndex % cols;
        const y = Math.floor(pixelIndex / cols);
        screenContext.imageSmoothingEnabled = false;
        screenContext.drawImage(
          sourceCanvas,
          x,
          y,
          1,
          1,
          x * config.unitWidth,
          y * config.unitHeight,
          config.unitWidth,
          config.unitHeight
        );
      }

      function redrawFull(snapshot) {
        ensureSourceImageData();
        const memoryWords = readMemoryWords(snapshot);
        const { start, pixelCount, cols, rows } = getVisibleAddressRange();

        let address = start;
        for (let i = 0; i < pixelCount; i += 1) {
          setPixelFromWord(i, memoryWords.get(address) ?? 0);
          address = (address + 4) >>> 0;
        }

        sourceContext.putImageData(sourceImageData, 0, 0);
        clearDisplay();
        screenContext.imageSmoothingEnabled = false;
        screenContext.drawImage(
          sourceCanvas,
          0,
          0,
          cols,
          rows,
          0,
          0,
          cols * config.unitWidth,
          rows * config.unitHeight
        );
      }

      function redrawLastWrite(snapshot, writeAddress) {
        if (!Number.isFinite(writeAddress) || !isAddressVisible(writeAddress)) return false;
        ensureSourceImageData();
        const memoryWords = readMemoryWords(snapshot);
        const { start } = getVisibleAddressRange();
        const aligned = (writeAddress >>> 0) & ~0x3;
        const pixelIndex = ((aligned - start) >>> 0) >>> 2;
        if (!Number.isFinite(pixelIndex) || pixelIndex < 0) return false;
        setPixelFromWord(pixelIndex, memoryWords.get(aligned) ?? 0);
        const { cols } = getGrid();
        const x = pixelIndex % cols;
        const y = Math.floor(pixelIndex / cols);
        sourceContext.putImageData(sourceImageData, 0, 0, x, y, 1, 1);
        drawScaledPixel(pixelIndex);
        return true;
      }

      function renderSnapshot(snapshot) {
        if (!connected) {
          clearDisplay();
          return;
        }

        if (fullRedrawNeeded) {
          redrawFull(snapshot);
          fullRedrawNeeded = false;
          pendingWriteAddress = null;
          return;
        }

        if (pendingWriteAddress != null) {
          const updated = redrawLastWrite(snapshot, pendingWriteAddress);
          pendingWriteAddress = null;
          if (updated) return;
        }

        if (Number.isFinite(snapshot?.lastMemoryWriteAddress) && isAddressVisible(snapshot.lastMemoryWriteAddress)) {
          if (!redrawLastWrite(snapshot, snapshot.lastMemoryWriteAddress >>> 0)) {
            fullRedrawNeeded = true;
            redrawFull(snapshot);
            fullRedrawNeeded = false;
          }
        }
      }

      function scheduleRender() {
        if (framePending) return;
        framePending = true;
        window.requestAnimationFrame(() => {
          framePending = false;
          renderSnapshot(latestSnapshot);
        });
      }

      function syncConfigAndRender(logChange = false) {
        config = readConfigFromControls();
        resizeCanvases();
        fullRedrawNeeded = true;
        if (logChange) {
          ctx.messagesPane.postMars(`${t("[tool] Bitmap Display: {width}x{height}, unit {unitWidth}x{unitHeight}, base {address}.", {
            width: config.displayWidth,
            height: config.displayHeight,
            unitWidth: config.unitWidth,
            unitHeight: config.unitHeight,
            address: toHex32(config.baseAddress)
          })}\n`);
        }
        if (connected) scheduleRender();
      }

      function refreshUiText() {
        shell.refreshTranslations?.();
        updateConnectButtonLabel();
      }

      [unitWidthSelect, unitHeightSelect, displayWidthSelect, displayHeightSelect, baseAddressSelect].forEach((control) => {
        control.addEventListener("change", () => syncConfigAndRender(false));
      });

      connectButton.addEventListener("click", () => {
        connected = !connected;
        updateConnectButtonLabel();
        if (connected) {
          fullRedrawNeeded = true;
          pendingWriteAddress = null;
          lastSnapshotStep = Number.isFinite(latestSnapshot?.steps) ? (latestSnapshot.steps | 0) : null;
          ctx.messagesPane.postMars(`${t("[tool] Bitmap Display connected to MIPS memory.")}\n`);
          scheduleRender();
          return;
        }
        ctx.messagesPane.postMars(`${t("[tool] Bitmap Display disconnected.")}\n`);
        pendingWriteAddress = null;
        lastSnapshotStep = null;
        clearDisplay();
      });

      resetButton.addEventListener("click", () => {
        config = { ...DEFAULT_CONFIG };
        applyConfigToControls();
        resizeCanvases();
        fullRedrawNeeded = true;
        pendingWriteAddress = null;
        lastSnapshotStep = null;
        clearDisplay();
        if (connected) scheduleRender();
      });

      helpButton.addEventListener("click", () => {
        window.open("./help/MarsHelpTools.html", "_blank", "noopener,noreferrer");
      });

      closeButton.addEventListener("click", () => {
        shell.close();
      });

      subscribeLanguageChange(refreshUiText);
      applyConfigToControls();
      resizeCanvases();
      clearDisplay();
      refreshUiText();

      return {
        open() {
          shell.open();
          if (connected) {
            fullRedrawNeeded = true;
            pendingWriteAddress = null;
            scheduleRender();
          }
        },
        close: shell.close,
        onSnapshot(snapshot) {
          latestSnapshot = snapshot;
          if (!connected) return;

          const nextStep = Number.isFinite(snapshot?.steps) ? (snapshot.steps | 0) : null;
          if (Number.isFinite(nextStep) && Number.isFinite(lastSnapshotStep) && (nextStep - lastSnapshotStep) > 1) {
            fullRedrawNeeded = true;
          }
          if (Number.isFinite(nextStep)) lastSnapshotStep = nextStep;

          const writeAddress = Number.isFinite(snapshot?.lastMemoryWriteAddress)
            ? (snapshot.lastMemoryWriteAddress >>> 0)
            : null;

          if (fullRedrawNeeded) {
            scheduleRender();
            return;
          }

          if (writeAddress != null && isAddressVisible(writeAddress)) {
            pendingWriteAddress = writeAddress;
            scheduleRender();
          }
        }
      };
    }
  });
})();
