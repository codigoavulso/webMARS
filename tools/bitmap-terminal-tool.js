(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-bitmap-terminal-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .bt-tool { display:flex; flex-direction:column; gap:8px; height:100%; padding:8px; box-sizing:border-box; font:12px "Segoe UI", Tahoma, sans-serif; }
      .bt-title { margin:0; text-align:center; font-size:40px; color:#1f3048; line-height:1; }
      .bt-main { display:grid; grid-template-columns:260px 1fr; gap:10px; min-height:0; flex:1; }
      .bt-controls { display:flex; flex-direction:column; gap:8px; }
      .bt-controls label { font-weight:700; display:flex; flex-direction:column; gap:4px; }
      .bt-canvas-wrap { border:1px solid #9db0c8; background:#000; overflow:auto; display:flex; align-items:flex-start; justify-content:flex-start; padding:6px; }
      .bt-canvas { image-rendering:pixelated; background:#000; }
      .bt-kb { border:1px solid #9db0c8; padding:6px; background:#f7fbff; display:flex; flex-direction:column; gap:6px; }
      .bt-kb input { width:100%; box-sizing:border-box; padding:6px 8px; border:1px solid #9db0c8; font:14px Consolas, monospace; }
      .bt-footer { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .bt-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#24354b; }
      .bt-footer .tool-btn { min-width:130px; }
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

  function buildOptions(values, selected) {
    return values.map((value) => `<option value="${value}"${value === selected ? " selected" : ""}>${value}</option>`).join("");
  }

  function buildBaseOptions(selected) {
    return BASE_OPTIONS.map(({ value, label }) => `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`).join("");
  }

  host.register({
    id: "bitmap-terminal-tool",
    label: "Bitmap Terminal Tool",
    create(ctx) {
      const shell = ctx.createToolWindowShell("bitmap-terminal-tool", "Bitmap Terminal Tool, Version 0.1", 1080, 780, `
        <div class="bt-tool">
          <h2 class="bt-title">Bitmap Terminal (Framebuffer + Keyboard)</h2>
          <div class="bt-main">
            <div class="bt-controls">
              <label>Unit Width in Pixels
                <select data-bt="unit-width">${buildOptions([1, 2, 4, 8, 16, 32], DEFAULT_CONFIG.unitWidth)}</select>
              </label>
              <label>Unit Height in Pixels
                <select data-bt="unit-height">${buildOptions([1, 2, 4, 8, 16, 32], DEFAULT_CONFIG.unitHeight)}</select>
              </label>
              <label>Display Width in Pixels
                <select data-bt="display-width">${buildOptions([128, 256, 320, 512, 640, 800, 1024], DEFAULT_CONFIG.displayWidth)}</select>
              </label>
              <label>Display Height in Pixels
                <select data-bt="display-height">${buildOptions([64, 128, 192, 256, 384, 512], DEFAULT_CONFIG.displayHeight)}</select>
              </label>
              <label>Base address for framebuffer
                <select data-bt="base-address">${buildBaseOptions(DEFAULT_CONFIG.baseAddress)}</select>
              </label>
              <div class="bt-kb">
                <strong>Keyboard MMIO</strong>
                <div data-bt="mmio"></div>
                <input data-bt="kb-input" placeholder="Type to enqueue key codes">
              </div>
            </div>
            <div class="bt-canvas-wrap">
              <canvas class="bt-canvas" data-bt="canvas"></canvas>
            </div>
          </div>
          <div class="bt-footer">
            <button class="tool-btn" data-bt="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-bt="reset" type="button">Reset</button>
            <button class="tool-btn" data-bt="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const unitWidthSelect = root.querySelector("[data-bt='unit-width']");
      const unitHeightSelect = root.querySelector("[data-bt='unit-height']");
      const displayWidthSelect = root.querySelector("[data-bt='display-width']");
      const displayHeightSelect = root.querySelector("[data-bt='display-height']");
      const baseAddressSelect = root.querySelector("[data-bt='base-address']");
      const mmioLabel = root.querySelector("[data-bt='mmio']");
      const kbInput = root.querySelector("[data-bt='kb-input']");
      const canvas = root.querySelector("[data-bt='canvas']");
      const connectButton = root.querySelector("[data-bt='connect']");
      const resetButton = root.querySelector("[data-bt='reset']");
      const closeButton = root.querySelector("[data-bt='close']");

      const screenContext = canvas.getContext("2d", { alpha: false });
      const sourceCanvas = document.createElement("canvas");
      const sourceContext = sourceCanvas.getContext("2d", { alpha: false });

      let connected = false;
      let latestSnapshot = null;
      let config = { ...DEFAULT_CONFIG };
      let sourceImageData = null;
      let sourceData = null;
      let fullRedrawNeeded = true;
      let framePending = false;
      let keyQueue = [];
      let detachMemoryObserver = () => {};

      function mmioBase() {
        return (ctx.engine?.memoryMap?.mmioBase ?? ctx.defaultMemoryMap?.mmioBase ?? 0xffff0000) >>> 0;
      }

      function addresses() {
        const base = mmioBase();
        return {
          RECEIVER_CONTROL: base >>> 0,
          RECEIVER_DATA: (base + 4) >>> 0
        };
      }

      function updateMmioLabel() {
        const { RECEIVER_CONTROL, RECEIVER_DATA } = addresses();
        mmioLabel.textContent = `ReceiverCtrl=${toHex32(RECEIVER_CONTROL)} ReceiverData=${toHex32(RECEIVER_DATA)}`;
      }

      function readByteSafe(address) {
        try {
          return ctx.engine.readByte(address >>> 0, false) & 0xff;
        } catch {
          return 0;
        }
      }

      function writeByteSafe(address, value) {
        try {
          ctx.engine.writeByte(address >>> 0, value & 0xff);
          return true;
        } catch {
          return false;
        }
      }

      function readyBitSet(address) {
        return (readByteSafe(address) | 1) & 0xff;
      }

      function readyBitCleared(address) {
        return (readByteSafe(address) & ~1) & 0xff;
      }

      function isReadyBitSet(address) {
        return (readByteSafe(address) & 1) === 1;
      }

      function feedReceiver() {
        if (!connected || !keyQueue.length) return;
        const { RECEIVER_CONTROL, RECEIVER_DATA } = addresses();
        if (isReadyBitSet(RECEIVER_CONTROL)) return;
        const next = keyQueue.shift() | 0;
        writeByteSafe(RECEIVER_DATA, next & 0xff);
        writeByteSafe(RECEIVER_CONTROL, readyBitSet(RECEIVER_CONTROL));
      }

      function detachMmioObserver() {
        try {
          detachMemoryObserver();
        } catch {
          // Ignore observer detach failures.
        }
        detachMemoryObserver = () => {};
      }

      function attachMmioObserver() {
        detachMmioObserver();
        if (!ctx.engine || typeof ctx.engine.registerMemoryObserver !== "function") return;
        const { RECEIVER_DATA, RECEIVER_CONTROL } = addresses();
        detachMemoryObserver = ctx.engine.registerMemoryObserver({
          start: RECEIVER_DATA,
          end: RECEIVER_DATA,
          onRead(detail) {
            if (!connected) return;
            if ((detail?.address >>> 0) !== (RECEIVER_DATA >>> 0)) return;
            writeByteSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
            writeByteSafe(RECEIVER_DATA, 0);
            feedReceiver();
          }
        });
      }

      function queueChar(charCode) {
        if (!Number.isFinite(charCode)) return;
        keyQueue.push(charCode & 0xff);
        feedReceiver();
      }

      function getGrid() {
        const cols = Math.max(1, Math.floor(config.displayWidth / config.unitWidth));
        const rows = Math.max(1, Math.floor(config.displayHeight / config.unitHeight));
        return { cols, rows, pixels: cols * rows };
      }

      function getRange() {
        const grid = getGrid();
        const start = config.baseAddress >>> 0;
        return {
          start,
          endExclusive: (start + (grid.pixels * 4)) >>> 0,
          ...grid
        };
      }

      function ensureImage() {
        const { cols, rows } = getGrid();
        if (!sourceImageData || sourceImageData.width !== cols || sourceImageData.height !== rows) {
          sourceImageData = sourceContext.createImageData(cols, rows);
          sourceData = sourceImageData.data;
          for (let i = 0; i < sourceData.length; i += 4) {
            sourceData[i] = 0;
            sourceData[i + 1] = 0;
            sourceData[i + 2] = 0;
            sourceData[i + 3] = 255;
          }
        }
      }

      function resizeCanvas() {
        canvas.width = config.displayWidth;
        canvas.height = config.displayHeight;
        canvas.style.width = `${config.displayWidth}px`;
        canvas.style.height = `${config.displayHeight}px`;

        const { cols, rows } = getGrid();
        sourceCanvas.width = cols;
        sourceCanvas.height = rows;
        ensureImage();
        fullRedrawNeeded = true;
      }

      function clearDisplay() {
        screenContext.fillStyle = "#000";
        screenContext.fillRect(0, 0, canvas.width, canvas.height);
      }

      function readMemoryWords(snapshot) {
        if (!snapshot) return new Map();
        if (snapshot.memoryWords instanceof Map) return snapshot.memoryWords;
        if (Array.isArray(snapshot.memoryWords)) return new Map(snapshot.memoryWords);
        return new Map();
      }

      function setPixel(index, word) {
        const offset = index * 4;
        const value = (word ?? 0) >>> 0;
        sourceData[offset] = (value >>> 16) & 0xff;
        sourceData[offset + 1] = (value >>> 8) & 0xff;
        sourceData[offset + 2] = value & 0xff;
        sourceData[offset + 3] = 255;
      }

      function redraw(snapshot) {
        if (!connected) {
          clearDisplay();
          return;
        }

        ensureImage();
        const memory = readMemoryWords(snapshot);
        const range = getRange();

        let address = range.start;
        for (let i = 0; i < range.pixels; i += 1) {
          setPixel(i, memory.get(address) ?? 0);
          address = (address + 4) >>> 0;
        }

        sourceContext.putImageData(sourceImageData, 0, 0);
        screenContext.imageSmoothingEnabled = false;
        clearDisplay();
        screenContext.drawImage(sourceCanvas, 0, 0, range.cols, range.rows, 0, 0, range.cols * config.unitWidth, range.rows * config.unitHeight);
      }

      function scheduleRender() {
        if (framePending) return;
        framePending = true;
        window.requestAnimationFrame(() => {
          framePending = false;
          redraw(latestSnapshot);
        });
      }

      function readConfig() {
        config = {
          unitWidth: Number.parseInt(unitWidthSelect.value, 10) || DEFAULT_CONFIG.unitWidth,
          unitHeight: Number.parseInt(unitHeightSelect.value, 10) || DEFAULT_CONFIG.unitHeight,
          displayWidth: Number.parseInt(displayWidthSelect.value, 10) || DEFAULT_CONFIG.displayWidth,
          displayHeight: Number.parseInt(displayHeightSelect.value, 10) || DEFAULT_CONFIG.displayHeight,
          baseAddress: (Number.parseInt(baseAddressSelect.value, 10) || DEFAULT_CONFIG.baseAddress) >>> 0
        };
        resizeCanvas();
        if (connected) scheduleRender();
      }

      [unitWidthSelect, unitHeightSelect, displayWidthSelect, displayHeightSelect, baseAddressSelect]
        .forEach((control) => control.addEventListener("change", readConfig));

      kbInput.addEventListener("keydown", (event) => {
        if (!connected) return;
        if (event.key.length === 1) {
          queueChar(event.key.charCodeAt(0));
          return;
        }
        if (event.key === "Enter") {
          queueChar(10);
          return;
        }
        if (event.key === "Backspace") {
          queueChar(8);
          return;
        }
      });

      connectButton.addEventListener("click", () => {
        connected = !connected;
        connectButton.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
        if (connected) {
          const { RECEIVER_CONTROL } = addresses();
          writeByteSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
          attachMmioObserver();
          feedReceiver();
          scheduleRender();
          kbInput.focus();
        } else {
          detachMmioObserver();
          clearDisplay();
        }
      });

      resetButton.addEventListener("click", () => {
        config = { ...DEFAULT_CONFIG };
        unitWidthSelect.value = String(config.unitWidth);
        unitHeightSelect.value = String(config.unitHeight);
        displayWidthSelect.value = String(config.displayWidth);
        displayHeightSelect.value = String(config.displayHeight);
        baseAddressSelect.value = String(config.baseAddress);
        keyQueue = [];
        const { RECEIVER_CONTROL } = addresses();
        detachMmioObserver();
        writeByteSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
        readConfig();
        clearDisplay();
        if (connected) {
          attachMmioObserver();
          feedReceiver();
        }
      });

      closeButton.addEventListener("click", () => {
        detachMmioObserver();
        shell.close();
      });

      readConfig();
      updateMmioLabel();
      clearDisplay();

      return {
        open() {
          shell.open();
          updateMmioLabel();
          if (connected) {
            attachMmioObserver();
            scheduleRender();
          }
        },
        close() {
          detachMmioObserver();
          shell.close();
        },
        onSnapshot(snapshot) {
          latestSnapshot = snapshot;
          if (!connected) return;

          const writeAddress = Number.isFinite(snapshot?.lastMemoryWriteAddress) ? (snapshot.lastMemoryWriteAddress >>> 0) : null;

          if (writeAddress != null) {
            const range = getRange();
            if (writeAddress >= range.start && writeAddress < range.endExclusive) {
              scheduleRender();
            }
          }
        }
      };
    }
  });
})();
