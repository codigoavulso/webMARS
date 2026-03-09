(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const DEFAULT_CONFIG = {
    unitWidth: 1,
    unitHeight: 1,
    displayWidth: 512,
    displayHeight: 256,
    baseAddress: 0x10010000
  };

  const UNIT_OPTIONS = [1, 2, 4, 8, 16, 32];
  const WIDTH_OPTIONS = [128, 256, 320, 512, 640, 800, 1024];
  const HEIGHT_OPTIONS = [64, 128, 192, 256, 384, 512];
  const BASE_OPTIONS = [
    { value: 0x10008000, label: "0x10008000 (global data)" },
    { value: 0x10010000, label: "0x10010000 (static data)" },
    { value: 0x10040000, label: "0x10040000 (heap)" },
    { value: 0x00400000, label: "0x00400000 (text)" },
    { value: 0xffff0000, label: "0xFFFF0000 (MMIO)" }
  ];

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
      const shell = ctx.createToolWindowShell("bitmap-display", "Bitmap Display, Version 1.0", 1040, 590, `
        <div class="bitmap-tool">
          <h2 class="bitmap-tool-title">Bitmap Display</h2>
          <div class="bitmap-main">
            <div class="bitmap-controls">
              <label class="bitmap-control">Unit Width in Pixels
                <select data-bitmap="unit-width">${buildOptions(UNIT_OPTIONS, DEFAULT_CONFIG.unitWidth)}</select>
              </label>
              <label class="bitmap-control">Unit Height in Pixels
                <select data-bitmap="unit-height">${buildOptions(UNIT_OPTIONS, DEFAULT_CONFIG.unitHeight)}</select>
              </label>
              <label class="bitmap-control">Display Width in Pixels
                <select data-bitmap="display-width">${buildOptions(WIDTH_OPTIONS, DEFAULT_CONFIG.displayWidth)}</select>
              </label>
              <label class="bitmap-control">Display Height in Pixels
                <select data-bitmap="display-height">${buildOptions(HEIGHT_OPTIONS, DEFAULT_CONFIG.displayHeight)}</select>
              </label>
              <label class="bitmap-control">Base address for display
                <select data-bitmap="base-address">${buildBaseOptions(DEFAULT_CONFIG.baseAddress)}</select>
              </label>
            </div>
            <div class="bitmap-canvas-wrap">
              <canvas class="bitmap-canvas" data-bitmap="canvas"></canvas>
            </div>
          </div>
          <div class="bitmap-footer">
            <button class="tool-btn" data-bitmap="connect" type="button">Connect to MIPS</button>
            <div style="display:flex; gap:10px;">
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
        connectButton.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
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
          ctx.messagesPane.postMars(
            `[tool] Bitmap Display: ${config.displayWidth}x${config.displayHeight}, unit ${config.unitWidth}x${config.unitHeight}, base ${toHex32(config.baseAddress)}.`
          );
        }
        if (connected) scheduleRender();
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
          ctx.messagesPane.postMars("[tool] Bitmap Display connected to MIPS memory.");
          scheduleRender();
        } else {
          ctx.messagesPane.postMars("[tool] Bitmap Display disconnected.");
          pendingWriteAddress = null;
          lastSnapshotStep = null;
          clearDisplay();
        }
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

      applyConfigToControls();
      resizeCanvases();
      clearDisplay();
      updateConnectButtonLabel();

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



