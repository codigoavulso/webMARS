(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-digital-lab-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .dlab-tool {
        font: 11px Tahoma, "Segoe UI", sans-serif;
      }

      .dlab-main {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        min-height: 0;
        flex: 1 1 auto;
      }

      .dlab-display-body {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
      }

      .dlab-digit {
        width: 60px;
        height: 80px;
        border: 1px solid #8f8f8f;
        background: #fff;
        image-rendering: crisp-edges;
      }

      .dlab-keypad-body {
        display: grid;
        grid-template-columns: repeat(4, minmax(44px, 1fr));
        gap: 6px;
      }

      .dlab-key {
        min-width: 44px;
        min-height: 34px;
        padding: 0;
        margin: 0;
        font: 12px Tahoma, "Segoe UI", sans-serif;
        appearance: none;
        -webkit-appearance: none;
        background: #ffffff !important;
        background-image: none !important;
        border: 1px solid #b8b8b8;
        border-color: #b8b8b8;
        color: #111;
        font-weight: 600;
        cursor: pointer;
        border-radius: 0;
      }

      .dlab-key.active {
        background: #35b54a !important;
        background-image: none !important;
        border-color: #2f9440 !important;
        color: #ffffff !important;
      }

      .dlab-key.active:focus,
      .dlab-key.active:hover,
      .dlab-key.active:active {
        background: #35b54a !important;
        background-image: none !important;
        border-color: #2f9440 !important;
        color: #ffffff !important;
      }

      .dlab-key:hover {
        background: #f3f3f3 !important;
        background-image: none !important;
        border-color: #8f8f8f;
      }

      .dlab-key:active {
        background: #e7e7e7 !important;
        background-image: none !important;
      }

      @media (max-width: 760px) {
        .dlab-main {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const KEY_LAYOUT = [
    ["0", "1", "2", "3"],
    ["4", "5", "6", "7"],
    ["8", "9", "a", "b"],
    ["c", "d", "e", "f"]
  ];

  const ROW_BITS = [0x1, 0x2, 0x4, 0x8];
  const COL_BITS = [0x1, 0x2, 0x4, 0x8];

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

  function drawSevenSegment(canvas, valueByte) {
    const ctx2d = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx2d.clearRect(0, 0, w, h);
    ctx2d.fillStyle = "#ffffff";
    ctx2d.fillRect(0, 0, w, h);

    const on = "#ff2020";
    const off = "#d3d3d3";
    const thick = Math.max(5, Math.floor(w * 0.1));
    const margin = Math.max(5, Math.floor(w * 0.14));

    const segments = [
      { bit: 0, x: margin + thick, y: margin, width: w - 2 * margin - 2 * thick, height: thick },
      { bit: 1, x: w - margin - thick, y: margin + thick, width: thick, height: h / 2 - margin - thick * 1.5 },
      { bit: 2, x: w - margin - thick, y: h / 2 + thick / 2, width: thick, height: h / 2 - margin - thick * 1.5 },
      { bit: 3, x: margin + thick, y: h - margin - thick, width: w - 2 * margin - 2 * thick, height: thick },
      { bit: 4, x: margin, y: h / 2 + thick / 2, width: thick, height: h / 2 - margin - thick * 1.5 },
      { bit: 5, x: margin, y: margin + thick, width: thick, height: h / 2 - margin - thick * 1.5 },
      { bit: 6, x: margin + thick, y: Math.floor(h / 2 - thick / 2), width: w - 2 * margin - 2 * thick, height: thick }
    ];

    segments.forEach((segment) => {
      const enabled = ((valueByte >>> segment.bit) & 1) === 1;
      ctx2d.fillStyle = enabled ? on : off;
      ctx2d.fillRect(segment.x, segment.y, segment.width, segment.height);
    });

    const dpOn = ((valueByte >>> 7) & 1) === 1;
    ctx2d.fillStyle = dpOn ? on : off;
    ctx2d.beginPath();
    ctx2d.arc(w - margin * 0.8, h - margin * 0.8, Math.max(3, thick * 0.4), 0, Math.PI * 2);
    ctx2d.fill();
  }

  host.register({
    id: "digital-lab-sim",
    label: "Digital Lab Sim",
    create(ctx) {
      const shell = ctx.createToolWindowShell("digital-lab-sim", "Digital Lab Sim, Version 1.0 (Didier Teifreto)", 560, 360, `
        <div class="mars-tool-shell dlab-tool">
          <h2 class="mars-tool-heading">Digital Lab Sim</h2>
          <div class="dlab-main">
            <section class="mars-tool-panel">
              <div class="mars-tool-panel-title">Seven Segment Display</div>
              <div class="mars-tool-panel-body dlab-display-body">
                <canvas class="dlab-digit" width="60" height="80" data-dl="digit-left"></canvas>
                <canvas class="dlab-digit" width="60" height="80" data-dl="digit-right"></canvas>
              </div>
            </section>
            <section class="mars-tool-panel">
              <div class="mars-tool-panel-title">Hexadecimal Keyboard</div>
              <div class="mars-tool-panel-body dlab-keypad-body" data-dl="keypad"></div>
            </section>
          </div>
          <div class="mars-tool-footer dlab-footer">
            <button class="tool-btn" data-dl="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <div class="mars-tool-footer-actions">
              <button class="tool-btn" data-dl="reset" type="button">Reset</button>
              <button class="tool-btn" data-dl="help" type="button">Help</button>
              <button class="tool-btn" data-dl="close" type="button">Close</button>
            </div>
          </div>
        </div>
      `);

      const root = shell.root;
      const leftDigit = root.querySelector("[data-dl='digit-left']");
      const rightDigit = root.querySelector("[data-dl='digit-right']");
      const keypadRoot = root.querySelector("[data-dl='keypad']");
      const connectButton = root.querySelector("[data-dl='connect']");
      const resetButton = root.querySelector("[data-dl='reset']");
      const helpButton = root.querySelector("[data-dl='help']");
      const closeButton = root.querySelector("[data-dl='close']");

      let connected = false;
      let lastSnapshot = null;
      let pressedKey = null;
      let counterValueMax = 30;
      let counterValue = counterValueMax;

      const keyButtons = [];

      function mmioBase() {
        return (ctx.engine?.memoryMap?.mmioBase ?? ctx.defaultMemoryMap?.mmioBase ?? 0xffff0000) >>> 0;
      }

      function addresses() {
        const base = mmioBase();
        return {
          DISPLAY_1: (base + 0x10) >>> 0,
          DISPLAY_2: (base + 0x11) >>> 0,
          KEYBOARD_CTRL: (base + 0x12) >>> 0,
          COUNTER_CTRL: (base + 0x13) >>> 0,
          KEYBOARD_OUT: (base + 0x14) >>> 0
        };
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
        } catch {
          // ignore writes rejected by memory config
        }
      }

      function refreshUiText() {
        shell.refreshTranslations?.();
        connectButton.textContent = connected ? t("Disconnect from MIPS") : t("Connect to MIPS");
      }

      function highlightKeypad() {
        keyButtons.forEach((entry) => {
          const isActive = Boolean(pressedKey && entry.row === pressedKey.row && entry.col === pressedKey.col);
          entry.button.classList.toggle("active", isActive);
          entry.button.setAttribute("aria-pressed", isActive ? "true" : "false");
          entry.button.style.setProperty("background", isActive ? "#35b54a" : "#ffffff", "important");
          entry.button.style.setProperty("background-color", isActive ? "#35b54a" : "#ffffff", "important");
          entry.button.style.setProperty("background-image", "none", "important");
          entry.button.style.setProperty("border-color", isActive ? "#2f9440" : "#b8b8b8", "important");
          entry.button.style.setProperty("color", isActive ? "#ffffff" : "#111111", "important");
          entry.button.style.setProperty("box-shadow", "none", "important");
          entry.button.style.setProperty("transform", "none", "important");
          entry.button.style.setProperty("outline", "none", "important");
        });
      }

      function updateKeyboardOutput() {
        const a = addresses();
        if (!connected) return;
        const control = readByteSafe(a.KEYBOARD_CTRL);
        const activeRows = control & 0x0f;
        let out = 0;

        if (pressedKey) {
          const rowBit = ROW_BITS[pressedKey.row];
          if ((activeRows & rowBit) !== 0) {
            out = (COL_BITS[pressedKey.col] << 4) | rowBit;
          }
        }

        writeByteSafe(a.KEYBOARD_OUT, out);
      }

      function updateFromMemory() {
        const a = addresses();
        const rightValue = readByteSafe(a.DISPLAY_1);
        const leftValue = readByteSafe(a.DISPLAY_2);
        drawSevenSegment(rightDigit, rightValue);
        drawSevenSegment(leftDigit, leftValue);

        const counterCtrl = readByteSafe(a.COUNTER_CTRL);
        const counterEnabled = (counterCtrl & 0xff) !== 0;
        if (counterEnabled) {
          if (counterValue > 0) counterValue -= 1;
          else counterValue = counterValueMax;
        } else {
          counterValue = counterValueMax;
        }

        updateKeyboardOutput();
      }

      KEY_LAYOUT.forEach((row, rowIndex) => {
        row.forEach((label, colIndex) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "dlab-key";
          button.textContent = label;
          button.addEventListener("click", () => {
            const sameKey = Boolean(pressedKey && pressedKey.row === rowIndex && pressedKey.col === colIndex);
            if (sameKey) {
              pressedKey = null;
              writeByteSafe(addresses().KEYBOARD_OUT, 0);
            } else {
              pressedKey = {
                label,
                row: rowIndex,
                col: colIndex,
                code: ((COL_BITS[colIndex] << 4) | ROW_BITS[rowIndex]) >>> 0
              };
            }
            highlightKeypad();
            updateKeyboardOutput();
          });
          keyButtons.push({ row: rowIndex, col: colIndex, button });
          keypadRoot.appendChild(button);
        });
      });

      connectButton.addEventListener("click", () => {
        connected = !connected;
        refreshUiText();
        if (connected) {
          updateFromMemory();
          ctx.messagesPane.postMars(`${t("[tool] Digital Lab Sim connected.")}\n`);
          return;
        }
        ctx.messagesPane.postMars(`${t("[tool] Digital Lab Sim disconnected.")}\n`);
        writeByteSafe(addresses().KEYBOARD_OUT, 0);
      });

      resetButton.addEventListener("click", () => {
        pressedKey = null;
        counterValue = counterValueMax;
        highlightKeypad();
        drawSevenSegment(leftDigit, 0);
        drawSevenSegment(rightDigit, 0);
        writeByteSafe(addresses().KEYBOARD_OUT, 0);
      });

      helpButton.addEventListener("click", () => {
        ctx.messagesPane.postMars(`${t("[tool] Digital Lab Sim: display bytes at mmio+0x10/0x11 drive seven-segment; keyboard scan row bits in mmio+0x12 and read code from mmio+0x14.")}\n`);
      });

      closeButton.addEventListener("click", shell.close);

      subscribeLanguageChange(refreshUiText);
      drawSevenSegment(leftDigit, 0);
      drawSevenSegment(rightDigit, 0);
      refreshUiText();

      return {
        open() {
          shell.open();
          refreshUiText();
        },
        close: shell.close,
        onSnapshot(snapshot) {
          lastSnapshot = snapshot;
          if (!connected || !snapshot) return;
          updateFromMemory();
        }
      };
    }
  });
})();
