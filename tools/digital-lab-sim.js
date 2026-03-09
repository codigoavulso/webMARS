(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-digital-lab-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .dlab-tool { display:flex; flex-direction:column; gap:8px; height:100%; box-sizing:border-box; padding:8px; font:12px "Segoe UI", Tahoma, sans-serif; }
      .dlab-title { margin:0; text-align:center; font-size:42px; color:#1f3048; line-height:1; }
      .dlab-main { display:grid; grid-template-columns: 1fr 1fr; gap:14px; align-items:start; }
      .dlab-display { border:1px solid #9db0c8; background:#f7fbff; padding:10px; display:flex; gap:12px; justify-content:center; }
      .dlab-digit { border:1px solid #a7bad1; background:#fff; }
      .dlab-keypad { border:1px solid #9db0c8; background:#f7fbff; padding:10px; display:grid; grid-template-columns:repeat(4, 1fr); gap:6px; }
      .dlab-key { border:1px solid #8fa3bf; background:linear-gradient(#fefefe,#e8eef8); min-height:48px; font:700 22px Consolas, monospace; cursor:pointer; }
      .dlab-key.active { background:linear-gradient(#9bc1ff,#6999e0); color:#fff; }
      .dlab-info { border:1px solid #9db0c8; background:#fff; padding:8px; font-family:Consolas, monospace; white-space:pre-wrap; min-height:120px; }
      .dlab-footer { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .dlab-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#24354b; }
      .dlab-footer .tool-btn { min-width:120px; }
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

  function toHex32(value) {
    return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
  }

  function drawSevenSegment(canvas, valueByte) {
    const ctx2d = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx2d.clearRect(0, 0, w, h);
    ctx2d.fillStyle = "#f3f3f3";
    ctx2d.fillRect(0, 0, w, h);

    const on = "#ef2f2f";
    const off = "#d7d7d7";
    const thick = Math.max(8, Math.floor(w * 0.11));
    const margin = Math.max(9, Math.floor(w * 0.12));

    const segments = [
      { bit: 0, x: margin + thick, y: margin, width: w - 2 * margin - 2 * thick, height: thick }, // a
      { bit: 1, x: w - margin - thick, y: margin + thick, width: thick, height: h / 2 - margin - thick * 1.5 }, // b
      { bit: 2, x: w - margin - thick, y: h / 2 + thick / 2, width: thick, height: h / 2 - margin - thick * 1.5 }, // c
      { bit: 3, x: margin + thick, y: h - margin - thick, width: w - 2 * margin - 2 * thick, height: thick }, // d
      { bit: 4, x: margin, y: h / 2 + thick / 2, width: thick, height: h / 2 - margin - thick * 1.5 }, // e
      { bit: 5, x: margin, y: margin + thick, width: thick, height: h / 2 - margin - thick * 1.5 }, // f
      { bit: 6, x: margin + thick, y: Math.floor(h / 2 - thick / 2), width: w - 2 * margin - 2 * thick, height: thick } // g
    ];

    segments.forEach((segment) => {
      const enabled = ((valueByte >>> segment.bit) & 1) === 1;
      ctx2d.fillStyle = enabled ? on : off;
      ctx2d.fillRect(segment.x, segment.y, segment.width, segment.height);
    });

    const dpOn = ((valueByte >>> 7) & 1) === 1;
    ctx2d.fillStyle = dpOn ? on : off;
    ctx2d.beginPath();
    ctx2d.arc(w - margin * 0.8, h - margin * 0.8, Math.max(4, thick * 0.45), 0, Math.PI * 2);
    ctx2d.fill();
  }

  host.register({
    id: "digital-lab-sim",
    label: "Digital Lab Sim",
    create(ctx) {
      const shell = ctx.createToolWindowShell("digital-lab-sim", "Digital Lab Sim, Version 1.0 (Didier Teifreto)", 600, 520, `
        <div class="dlab-tool">
          <h2 class="dlab-title">Digital Lab Sim</h2>
          <div class="dlab-main">
            <div class="dlab-display">
              <canvas class="dlab-digit" width="150" height="220" data-dl="digit-left"></canvas>
              <canvas class="dlab-digit" width="150" height="220" data-dl="digit-right"></canvas>
            </div>
            <div class="dlab-keypad" data-dl="keypad"></div>
          </div>
          <div class="dlab-info" data-dl="info"></div>
          <div class="dlab-footer">
            <button class="tool-btn" data-dl="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-dl="reset" type="button">Reset</button>
            <button class="tool-btn" data-dl="help" type="button">Help</button>
            <button class="tool-btn" data-dl="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const leftDigit = root.querySelector("[data-dl='digit-left']");
      const rightDigit = root.querySelector("[data-dl='digit-right']");
      const keypadRoot = root.querySelector("[data-dl='keypad']");
      const info = root.querySelector("[data-dl='info']");
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

      function updateInfo() {
        const a = addresses();
        const selected = pressedKey == null ? "none" : `${pressedKey.label} (${toHex32(pressedKey.code)})`;
        info.textContent = [
          `Display1: ${toHex32(a.DISPLAY_1)}  Display2: ${toHex32(a.DISPLAY_2)}`,
          `Keyboard Ctrl: ${toHex32(a.KEYBOARD_CTRL)}  Keyboard Out: ${toHex32(a.KEYBOARD_OUT)}`,
          `Counter Ctrl: ${toHex32(a.COUNTER_CTRL)}  Internal countdown: ${counterValue}`,
          `Pressed key: ${selected}`
        ].join("\n");
      }

      function highlightKeypad() {
        keyButtons.forEach((entry) => {
          entry.button.classList.toggle("active", pressedKey && entry.label === pressedKey.label);
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
        updateInfo();
      }

      KEY_LAYOUT.forEach((row, rowIndex) => {
        row.forEach((label, colIndex) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "dlab-key";
          button.textContent = label;
          button.addEventListener("click", () => {
            const sameKey = pressedKey && pressedKey.row === rowIndex && pressedKey.col === colIndex;
            if (sameKey) {
              pressedKey = null;
            } else {
              pressedKey = { label, row: rowIndex, col: colIndex, code: ((COL_BITS[colIndex] << 4) | ROW_BITS[rowIndex]) >>> 0 };
            }
            highlightKeypad();
            updateKeyboardOutput();
            updateInfo();
          });
          keyButtons.push({ label, button });
          keypadRoot.appendChild(button);
        });
      });

      connectButton.addEventListener("click", () => {
        connected = !connected;
        connectButton.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
        if (connected) {
          updateFromMemory();
          ctx.messagesPane.postMars("[tool] Digital Lab Sim connected.");
        }
      });

      resetButton.addEventListener("click", () => {
        pressedKey = null;
        counterValue = counterValueMax;
        highlightKeypad();
        drawSevenSegment(leftDigit, 0);
        drawSevenSegment(rightDigit, 0);
        const a = addresses();
        writeByteSafe(a.KEYBOARD_OUT, 0);
        updateInfo();
      });

      helpButton.addEventListener("click", () => {
        ctx.messagesPane.postMars("[tool] Digital Lab Sim: display bytes at mmio+0x10/0x11 drive seven-segment; keyboard scan row bits in mmio+0x12 and read code from mmio+0x14.");
      });

      closeButton.addEventListener("click", shell.close);

      drawSevenSegment(leftDigit, 0);
      drawSevenSegment(rightDigit, 0);
      updateInfo();

      return {
        open: shell.open,
        close: shell.close,
        onSnapshot(snapshot) {
          const previous = lastSnapshot;
          lastSnapshot = snapshot;
          if (!connected || !snapshot || !previous) return;
          if ((snapshot.steps | 0) <= (previous.steps | 0)) return;
          updateFromMemory();
        }
      };
    }
  });
})();
