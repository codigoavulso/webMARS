(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-keyboard-display-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .kd-tool { display:flex; flex-direction:column; gap:8px; height:100%; padding:8px; box-sizing:border-box; font:12px "Segoe UI", Tahoma, sans-serif; }
      .kd-tool h2 { margin:0; text-align:center; font-size:42px; color:#1f3048; line-height:1; }
      .kd-panel { border:1px solid #9db0c8; background:#f7fbff; padding:6px; }
      .kd-title { font-weight:700; text-align:center; margin-bottom:4px; color:#26364d; }
      .kd-display, .kd-keyboard { width:100%; box-sizing:border-box; resize:none; border:1px solid #9db0c8; font-family:Consolas, monospace; font-size:14px; background:#fff; padding:6px; }
      .kd-display { height:310px; white-space:pre; overflow:auto; }
      .kd-keyboard { height:210px; }
      .kd-options { display:grid; grid-template-columns:auto auto 1fr auto 1fr; gap:8px; align-items:center; margin-top:6px; }
      .kd-options label { font-weight:700; }
      .kd-options input[type='range'] { width:100%; }
      .kd-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:auto; }
      .kd-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#24354b; }
      .kd-footer .tool-btn { min-width:130px; }
    `;
    document.head.appendChild(style);
  }

  const MEMORY_OPS = new Set([
    "lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "sb", "sh", "sw", "swl", "swr", "ll", "sc",
    "lwc1", "swc1", "ldc1", "sdc1"
  ]);
  const WRITE_OPS = new Set(["sb", "sh", "sw", "swl", "swr", "sc", "swc1", "sdc1"]);

  function toHex32(value) {
    return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
  }

  function parseTokens(statement) {
    if (!statement) return [];
    const cleaned = String(statement).split("#")[0].trim();
    if (!cleaned) return [];
    return cleaned.split(/[\s,]+/).filter(Boolean);
  }

  function parseImmediate(token) {
    if (typeof token !== "string") return null;
    const text = token.trim();
    if (!text) return 0;
    if (/^[+-]?\d+$/.test(text)) return Number.parseInt(text, 10) | 0;
    if (/^[+-]?0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text, 16) | 0;
    return null;
  }

  function buildRegisterMap(snapshot) {
    const map = new Map();
    (snapshot?.registers || []).forEach((reg) => {
      const value = reg.value | 0;
      const name = String(reg.name || "").toLowerCase();
      map.set(name, value);
      if (name.startsWith("$")) map.set(name.slice(1), value);
      map.set(String(reg.index), value);
      map.set(`$${reg.index}`, value);
    });
    return map;
  }

  function buildLabelMap(snapshot) {
    const map = new Map();
    (snapshot?.labels || []).forEach((label) => map.set(String(label.label || "").toLowerCase(), label.address >>> 0));
    return map;
  }

  function resolveMemoryAddress(memArg, registers, labels, rowAddress) {
    const token = String(memArg || "").trim();
    const match = token.match(/^(.+?)\(([^)]+)\)$/);
    if (match) {
      const offsetRaw = match[1].trim();
      const baseRaw = match[2].trim().toLowerCase();
      const offset = parseImmediate(offsetRaw);
      const offsetValue = Number.isFinite(offset) ? offset : (labels.get(offsetRaw.toLowerCase()) ?? 0);
      const baseValue = registers.get(baseRaw) ?? registers.get(baseRaw.replace(/^\$/, "")) ?? 0;
      return (((baseValue | 0) + (offsetValue | 0)) >>> 0);
    }

    const labelAddress = labels.get(token.toLowerCase());
    if (Number.isFinite(labelAddress)) return labelAddress >>> 0;

    const immediate = parseImmediate(token);
    if (Number.isFinite(immediate)) {
      if (Math.abs(immediate) < 0x10000) return (((rowAddress + 4) | 0) + ((immediate | 0) << 2)) >>> 0;
      return immediate >>> 0;
    }

    return null;
  }

  function resolveSourceValue(opcode, sourceToken, registers, snapshot) {
    const token = String(sourceToken || "").trim().toLowerCase();
    const regValue = registers.get(token) ?? registers.get(token.replace(/^\$/, "")) ?? 0;
    if (["sb"].includes(opcode)) return regValue & 0xff;
    if (["sh"].includes(opcode)) return regValue & 0xffff;
    if (["swc1"].includes(opcode)) {
      const idx = Number.parseInt(token.replace(/^\$f/, ""), 10);
      if (Number.isFinite(idx) && Array.isArray(snapshot?.cop1)) return snapshot.cop1[idx] | 0;
    }
    return regValue | 0;
  }

  host.register({
    id: "keyboard-display-mmio",
    label: "Keyboard and Display MMIO Simulator",
    create(ctx) {
      const shell = ctx.createToolWindowShell("keyboard-display-mmio", "Keyboard and Display MMIO Simulator, Version 1.4", 1080, 980, `
        <div class="kd-tool">
          <h2>Keyboard and Display MMIO Simulator</h2>
          <div class="kd-panel">
            <div class="kd-title" data-kd="displaytitle"></div>
            <textarea class="kd-display" data-kd="display" spellcheck="false" readonly></textarea>
            <div class="kd-options">
              <button class="tool-btn" data-kd="font" type="button">Font</button>
              <label><input type="checkbox" data-kd="dad" checked> DAD</label>
              <select data-kd="delaymode">
                <option value="fixed" selected>Fixed transmitter delay, select using slider</option>
                <option value="uniform">Uniform random delay around slider value</option>
                <option value="normal">Normal random delay around slider value</option>
              </select>
              <label data-kd="delaylabel">Delay length: 5 instruction executions</label>
              <input type="range" min="0" max="50" step="1" value="5" data-kd="delay">
            </div>
          </div>
          <div class="kd-panel">
            <div class="kd-title" data-kd="keyboardtitle"></div>
            <textarea class="kd-keyboard" data-kd="keyboard" spellcheck="false" placeholder="Type here to send keyboard MMIO input"></textarea>
          </div>
          <div class="kd-footer">
            <button class="tool-btn" data-kd="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-kd="reset" type="button">Reset</button>
            <button class="tool-btn" data-kd="help" type="button">Help</button>
            <button class="tool-btn" data-kd="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const displayTitle = root.querySelector("[data-kd='displaytitle']");
      const keyboardTitle = root.querySelector("[data-kd='keyboardtitle']");
      const displayArea = root.querySelector("[data-kd='display']");
      const keyboardArea = root.querySelector("[data-kd='keyboard']");
      const fontButton = root.querySelector("[data-kd='font']");
      const dadCheck = root.querySelector("[data-kd='dad']");
      const delayMode = root.querySelector("[data-kd='delaymode']");
      const delaySlider = root.querySelector("[data-kd='delay']");
      const delayLabel = root.querySelector("[data-kd='delaylabel']");
      const connectButton = root.querySelector("[data-kd='connect']");
      const resetButton = root.querySelector("[data-kd='reset']");
      const helpButton = root.querySelector("[data-kd='help']");
      const closeButton = root.querySelector("[data-kd='close']");

      const fonts = [
        "14px Consolas, monospace",
        "15px 'Courier New', monospace",
        "16px Menlo, monospace",
        "13px 'Lucida Console', monospace"
      ];

      let connected = false;
      let lastSnapshot = null;
      let fontIndex = 0;
      let displayAfterDelay = true;
      let randomAccessMode = false;
      let columns = 95;
      let rows = 10;
      let cursorX = 0;
      let cursorY = 0;
      let terminalBuffer = [];
      let keyQueue = [];
      let countingInstructions = false;
      let instructionCount = 0;
      let delayLimit = 0;
      let pendingWord = 0;

      function mmioBase() {
        return (ctx.engine?.memoryMap?.mmioBase ?? ctx.defaultMemoryMap?.mmioBase ?? 0xffff0000) >>> 0;
      }

      function addresses() {
        const base = mmioBase();
        return {
          RECEIVER_CONTROL: base >>> 0,
          RECEIVER_DATA: (base + 4) >>> 0,
          TRANSMITTER_CONTROL: (base + 8) >>> 0,
          TRANSMITTER_DATA: (base + 12) >>> 0
        };
      }

      function updateTitles() {
        const { RECEIVER_DATA, TRANSMITTER_DATA } = addresses();
        displayTitle.textContent = `DISPLAY: Store to Transmitter Data ${toHex32(TRANSMITTER_DATA)}, cursor ${cursorY}, area ${columns} x ${rows}`;
        keyboardTitle.textContent = `KEYBOARD: Characters typed here are stored to Receiver Data ${toHex32(RECEIVER_DATA)}`;
      }

      function readWordSafe(address) {
        try {
          return ctx.engine.readWord(address >>> 0) | 0;
        } catch {
          return 0;
        }
      }

      function writeWordSafe(address, value) {
        try {
          ctx.engine.writeWord(address >>> 0, value | 0);
          return true;
        } catch {
          return false;
        }
      }

      function isReadyBitSet(address) {
        return (readWordSafe(address) & 1) === 1;
      }

      function readyBitSet(address) {
        return (readWordSafe(address) | 1) | 0;
      }

      function readyBitCleared(address) {
        return (readWordSafe(address) & ~1) | 0;
      }

      function recalcGrid() {
        const fontSize = Number.parseFloat(window.getComputedStyle(displayArea).fontSize || "14");
        const lineHeight = Math.max(fontSize * 1.35, 16);
        const charWidth = Math.max(fontSize * 0.62, 7);
        columns = Math.max(20, Math.floor((displayArea.clientWidth - 12) / charWidth));
        rows = Math.max(5, Math.floor((displayArea.clientHeight - 12) / lineHeight));
        updateTitles();
      }

      function initializeDisplay(randomAccess) {
        recalcGrid();
        if (!randomAccess) {
          displayArea.value = "";
          cursorX = 0;
          cursorY = 0;
          return;
        }
        terminalBuffer = Array.from({ length: rows }, () => Array.from({ length: columns }, () => " "));
        displayArea.value = terminalBuffer.map((line) => line.join("")).join("\n");
        cursorX = 0;
        cursorY = 0;
      }

      function flushBufferToDisplay() {
        if (!randomAccessMode) return;
        displayArea.value = terminalBuffer.map((line) => line.join("")).join("\n");
      }

      function setCursor(x, y) {
        cursorX = Math.max(0, Math.min(columns - 1, x | 0));
        cursorY = Math.max(0, Math.min(rows - 1, y | 0));
        updateTitles();
      }

      function displayCharacter(word) {
        const ch = word & 0xff;

        if (ch === 12) {
          initializeDisplay(randomAccessMode);
          return;
        }

        if (ch === 7) {
          if (!randomAccessMode) {
            randomAccessMode = true;
            initializeDisplay(true);
          }
          const x = (word & 0xfff00000) >>> 20;
          const y = (word & 0x000fff00) >>> 8;
          setCursor(x, y);
          return;
        }

        if (!randomAccessMode) {
          displayArea.value += String.fromCharCode(ch);
          displayArea.scrollTop = displayArea.scrollHeight;
          return;
        }

        const char = String.fromCharCode(ch);
        terminalBuffer[cursorY][cursorX] = char;
        cursorX += 1;
        if (cursorX >= columns) {
          cursorX = 0;
          cursorY = Math.min(rows - 1, cursorY + 1);
        }
        flushBufferToDisplay();
        updateTitles();
      }

      function generateDelay() {
        const base = Number.parseInt(delaySlider.value, 10) || 0;
        const mode = delayMode.value;
        if (mode === "fixed") return base;
        if (mode === "uniform") {
          const min = Math.max(0, base - Math.floor(base / 2));
          const max = base + Math.floor(base / 2);
          return min + Math.floor(Math.random() * (max - min + 1));
        }
        const sigma = Math.max(1, Math.floor(base / 3));
        const u1 = Math.max(1e-7, Math.random());
        const u2 = Math.max(1e-7, Math.random());
        const gaussian = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return Math.max(0, Math.round(base + gaussian * sigma));
      }

      function updateDelayLabel() {
        delayLabel.textContent = `Delay length: ${Number.parseInt(delaySlider.value, 10) || 0} instruction executions`;
      }

      function feedReceiverFromQueue() {
        if (!connected || !keyQueue.length) return;
        const { RECEIVER_CONTROL, RECEIVER_DATA } = addresses();
        if (isReadyBitSet(RECEIVER_CONTROL)) return;

        const value = keyQueue.shift() | 0;
        writeWordSafe(RECEIVER_DATA, value & 0xff);
        writeWordSafe(RECEIVER_CONTROL, readyBitSet(RECEIVER_CONTROL));
      }

      function queueKey(value) {
        if (!Number.isFinite(value)) return;
        const byte = value & 0xff;
        keyQueue.push(byte);
        feedReceiverFromQueue();
      }

      function extractMemoryAccess(previousSnapshot) {
        const row = (previousSnapshot?.textRows || []).find((entry) => entry.isCurrent);
        if (!row) return null;

        const tokens = parseTokens(row.basic || row.source);
        if (!tokens.length) return null;

        const opcode = tokens[0].toLowerCase();
        if (!MEMORY_OPS.has(opcode)) return null;
        const args = tokens.slice(1);
        const memArg = args[1] ?? args[0];
        if (!memArg) return null;

        const registers = buildRegisterMap(previousSnapshot);
        const labels = buildLabelMap(previousSnapshot);
        const address = resolveMemoryAddress(memArg, registers, labels, row.address >>> 0);
        if (!Number.isFinite(address)) return null;

        return {
          opcode,
          write: WRITE_OPS.has(opcode),
          address: address >>> 0,
          value: resolveSourceValue(opcode, args[0], registers, previousSnapshot)
        };
      }

      function processStep(previousSnapshot) {
        if (!connected) return;
        const { RECEIVER_DATA, RECEIVER_CONTROL, TRANSMITTER_DATA, TRANSMITTER_CONTROL } = addresses();

        const access = extractMemoryAccess(previousSnapshot);
        if (access) {
          if (!access.write && access.address === RECEIVER_DATA) {
            writeWordSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
            feedReceiverFromQueue();
          }

          if (access.write && access.address === TRANSMITTER_DATA && isReadyBitSet(TRANSMITTER_CONTROL)) {
            writeWordSafe(TRANSMITTER_CONTROL, readyBitCleared(TRANSMITTER_CONTROL));
            pendingWord = access.value | 0;
            if (!displayAfterDelay) displayCharacter(pendingWord);
            countingInstructions = true;
            instructionCount = 0;
            delayLimit = generateDelay();
          }
        }

        if (countingInstructions) {
          instructionCount += 1;
          if (instructionCount >= delayLimit) {
            if (displayAfterDelay) displayCharacter(pendingWord);
            countingInstructions = false;
            writeWordSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
          }
        }

        feedReceiverFromQueue();
      }

      function doReset() {
        keyQueue = [];
        countingInstructions = false;
        instructionCount = 0;
        delayLimit = 0;
        pendingWord = 0;
        randomAccessMode = false;
        initializeDisplay(false);
        keyboardArea.value = "";
        const { TRANSMITTER_CONTROL, RECEIVER_CONTROL } = addresses();
        writeWordSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
        writeWordSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
        updateTitles();
      }

      keyboardArea.addEventListener("keydown", (event) => {
        if (!connected) return;

        if (event.key.length === 1) {
          queueKey(event.key.charCodeAt(0));
          return;
        }

        if (event.key === "Enter") {
          queueKey(10);
          return;
        }
        if (event.key === "Backspace") {
          queueKey(8);
          return;
        }
        if (event.key === "Tab") {
          queueKey(9);
          event.preventDefault();
        }
      });

      fontButton.addEventListener("click", () => {
        fontIndex = (fontIndex + 1) % fonts.length;
        displayArea.style.font = fonts[fontIndex];
        keyboardArea.style.font = fonts[fontIndex];
        recalcGrid();
      });

      dadCheck.addEventListener("change", () => {
        displayAfterDelay = dadCheck.checked;
      });

      delaySlider.addEventListener("input", updateDelayLabel);
      delayMode.addEventListener("change", updateDelayLabel);

      connectButton.addEventListener("click", () => {
        connected = !connected;
        connectButton.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
        if (connected) {
          const { TRANSMITTER_CONTROL, RECEIVER_CONTROL } = addresses();
          writeWordSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
          writeWordSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
          feedReceiverFromQueue();
          keyboardArea.focus();
        }
      });

      resetButton.addEventListener("click", doReset);

      helpButton.addEventListener("click", () => {
        ctx.messagesPane.postMars("[tool] Keyboard/Display MMIO: type in keyboard panel to feed receiver data; store to transmitter data address to print.");
      });

      closeButton.addEventListener("click", shell.close);
      window.addEventListener("resize", recalcGrid);

      updateDelayLabel();
      doReset();

      return {
        open() {
          shell.open();
          recalcGrid();
          keyboardArea.focus();
        },
        close: shell.close,
        onSnapshot(snapshot) {
          const previous = lastSnapshot;
          lastSnapshot = snapshot;
          if (!connected || !snapshot || !previous) return;
          if ((snapshot.steps | 0) <= (previous.steps | 0)) return;
          processStep(previous);
        }
      };
    }
  });
})();
