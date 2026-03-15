(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-tty-ansi-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .tty-ansi-tool {
        font: 11px Tahoma, "Segoe UI", sans-serif;
      }

      .tty-ansi-main {
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        gap: 8px;
        min-height: 0;
        flex: 1 1 auto;
      }

      .tty-ansi-top {
        display: grid;
        gap: 8px;
      }

      .tty-ansi-controls {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px 10px;
        align-items: end;
      }

      .tty-ansi-field {
        display: grid;
        gap: 2px;
        min-width: 0;
      }

      .tty-ansi-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        padding-top: 18px;
        color: #24425f;
        user-select: none;
      }

      .tty-ansi-toggle input {
        margin: 0;
      }

      .tty-ansi-field select,
      .tty-ansi-field input,
      .tty-ansi-field button {
        width: 100%;
      }

      .tty-ansi-hint {
        grid-column: 1 / -1;
        color: #294766;
        line-height: 1.25;
        font-size: 11px;
      }

      .tty-ansi-stage {
        display: flex;
        min-height: 0;
      }

      .tty-ansi-viewport {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        border: 1px solid #7f9db9;
        background: linear-gradient(180deg, #0f1622 0%, #080d15 100%);
        padding: 12px;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }

      .tty-ansi-canvas {
        display: block;
        outline: none;
        box-shadow: 0 0 0 1px rgba(255,255,255,0.05), 0 12px 28px rgba(0,0,0,0.35);
        background: #000;
      }

      .tty-ansi-status {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: 6px 8px;
        color: #24425f;
      }

      .tty-ansi-status-item {
        display: grid;
        gap: 1px;
        min-width: 0;
      }

      .tty-ansi-status-label {
        font-size: 11px;
        color: #5c7590;
        white-space: nowrap;
      }

      .tty-ansi-status-value {
        color: #0f355f;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .tty-ansi-status strong {
        color: #0f355f;
      }

      @media (max-width: 980px) {
        .tty-ansi-status {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 840px) {
        .tty-ansi-controls {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .tty-ansi-status {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 560px) {
        .tty-ansi-controls {
          grid-template-columns: minmax(0, 1fr);
        }

        .tty-ansi-status {
          grid-template-columns: minmax(0, 1fr);
        }
      }
    `;
    document.head.appendChild(style);
  }

  const MEMORY_OPS = new Set([
    "lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "sb", "sh", "sw", "swl", "swr", "ll", "sc",
    "lwc1", "swc1", "ldc1", "sdc1"
  ]);
  const WRITE_OPS = new Set(["sb", "sh", "sw", "swl", "swr", "sc", "swc1", "sdc1"]);
  const TERMINAL_GEOMETRY = { columns: 80, rows: 25 };
  const FONT_OPTIONS = [8, 10, 12, 14, 16, 18, 20];
  const DEFAULT_FONT_SIZE = 12;
  const DEFAULT_COLORS = {
    fg: "#d7dde8",
    bg: "#000000"
  };
  const ANSI_PALETTE = [
    "#000000", "#b21818", "#18a050", "#c09018",
    "#2e66d0", "#a63cc8", "#1a9ea4", "#c0c7d1",
    "#565f6b", "#ff5f56", "#27c93f", "#ffbd2e",
    "#4f8cff", "#c678dd", "#29c7cf", "#f2f6ff"
  ];

  const DEC_SPECIAL_GRAPHICS = Object.freeze({
    "`": "\u25c6",
    "a": "\u2592",
    "f": "\u00b0",
    "g": "\u00b1",
    "j": "\u2518",
    "k": "\u2510",
    "l": "\u250c",
    "m": "\u2514",
    "n": "\u253c",
    "o": "\u23ba",
    "p": "\u23bb",
    "q": "\u2500",
    "r": "\u23bc",
    "s": "\u23bd",
    "t": "\u251c",
    "u": "\u2524",
    "v": "\u2534",
    "w": "\u252c",
    "x": "\u2502",
    "y": "\u2264",
    "z": "\u2265",
    "{": "\u03c0",
    "|": "\u2260",
    "}": "\u00a3",
    "~": "\u00b7"
  });

  const CP437_BOX_DRAWING = Object.freeze({
    179: "\u2502",
    180: "\u2524",
    191: "\u2510",
    192: "\u2514",
    193: "\u2534",
    194: "\u252c",
    195: "\u251c",
    196: "\u2500",
    197: "\u253c",
    217: "\u2518",
    218: "\u250c"
  });

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
    if (opcode === "sb") return regValue & 0xff;
    if (opcode === "sh") return regValue & 0xffff;
    if (opcode === "swc1") {
      const idx = Number.parseInt(token.replace(/^\$f/, ""), 10);
      if (Number.isFinite(idx) && Array.isArray(snapshot?.cop1)) return snapshot.cop1[idx] | 0;
    }
    return regValue | 0;
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

  function createCell() {
    return {
      ch: " ",
      fg: 7,
      bg: 0,
      bold: false,
      inverse: false
    };
  }

  host.register({
    id: "tty-ansi-terminal",
    label: "TTY Device + ANSI Terminal",
    create(ctx) {
      const shell = ctx.createToolWindowShell("tty-ansi-terminal", "TTY Device + ANSI Terminal, Version 1.0", 980, 720, `
        <div class="mars-tool-shell tty-ansi-tool">
          <h2 class="mars-tool-heading">TTY Device + ANSI Terminal</h2>
          <div class="tty-ansi-main">
            <section class="mars-tool-panel">
              <div class="mars-tool-panel-title">Terminal Settings</div>
              <div class="mars-tool-panel-body">
                <div class="tty-ansi-top">
                  <div class="tty-ansi-controls">
                    <label class="tty-ansi-field">
                      <span>Font size</span>
                      <select data-tty="fontsize">
                        ${FONT_OPTIONS.map((value) => `<option value="${value}"${value === DEFAULT_FONT_SIZE ? " selected" : ""}>${value}px</option>`).join("")}
                      </select>
                    </label>
                    <label class="tty-ansi-field">
                      <span>Encoding</span>
                      <select data-tty="encoding">
                        <option value="ansi" selected>ANSI + DEC graphics</option>
                        <option value="cp437">ANSI + CP437 box drawing</option>
                      </select>
                    </label>
                    <label class="tty-ansi-field">
                      <span>Geometry</span>
                      <input data-tty="geometry" type="text" value="80 x 25 chars" readonly>
                    </label>
                    <label class="tty-ansi-field">
                      <span>MMIO base</span>
                      <input data-tty="base" type="text" value="${toHex32((ctx.engine?.memoryMap?.mmioBase ?? ctx.defaultMemoryMap?.mmioBase ?? 0xffff0000) >>> 0)}" readonly>
                    </label>
                    <label class="tty-ansi-toggle">
                      <input data-tty="localecho" type="checkbox">
                      <span>Local echo</span>
                    </label>
                    <label class="tty-ansi-toggle">
                      <input data-tty="crlf" type="checkbox" checked>
                      <span>CRLF translation</span>
                    </label>
                    <div class="tty-ansi-hint" data-tty="hint">
                      Focus the terminal and type to feed receiver data. The transmitter stream understands text, ANSI cursor control, screen clearing, colors, and DEC line drawing.
                    </div>
                  </div>
                  <div class="tty-ansi-status" data-tty="status"></div>
                </div>
              </div>
            </section>
            <section class="mars-tool-panel tty-ansi-stage">
              <div class="mars-tool-panel-body tty-ansi-viewport">
                <canvas class="tty-ansi-canvas" data-tty="canvas" tabindex="0" aria-label="TTY terminal"></canvas>
              </div>
            </section>
          </div>
          <div class="mars-tool-footer">
            <button class="tool-btn" data-tty="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <div class="mars-tool-footer-actions">
              <button class="tool-btn" data-tty="reset" type="button">Reset</button>
              <button class="tool-btn" data-tty="help" type="button">Help</button>
              <button class="tool-btn" data-tty="close" type="button">Close</button>
            </div>
          </div>
        </div>
      `);

      const root = shell.root;
      const canvas = root.querySelector("[data-tty='canvas']");
      const fontSizeSelect = root.querySelector("[data-tty='fontsize']");
      const encodingSelect = root.querySelector("[data-tty='encoding']");
      const localEchoToggle = root.querySelector("[data-tty='localecho']");
      const crlfToggle = root.querySelector("[data-tty='crlf']");
      const statusNode = root.querySelector("[data-tty='status']");
      const hintNode = root.querySelector("[data-tty='hint']");
      const baseNode = root.querySelector("[data-tty='base']");
      const connectButton = root.querySelector("[data-tty='connect']");
      const resetButton = root.querySelector("[data-tty='reset']");
      const helpButton = root.querySelector("[data-tty='help']");
      const closeButton = root.querySelector("[data-tty='close']");

      const gfx = canvas.getContext("2d", { alpha: false });

      let connected = false;
      let lastSnapshot = null;
      let fontSize = DEFAULT_FONT_SIZE;
      let cellWidth = 9;
      let cellHeight = 18;
      let baseline = 14;
      let focusVisible = false;
      let renderFrame = null;
      let dirtyAll = true;
      let dirty = new Set();
      let cursorOverlayIndex = -1;
      let inputQueue = [];
      let stepHistory = new Map();
      let savedCursor = { row: 0, col: 0 };
      let terminalState = null;
      let detachMemoryObserver = () => {};
      let syncTimer = null;
      let observerReadCount = 0;
      let observerWriteCount = 0;
      let snapshotReadCount = 0;
      let snapshotWriteCount = 0;
      let polledTxCount = 0;
      let localEchoEnabled = false;
      let crlfTranslationEnabled = true;

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

      function getSnapshotStep(snapshot = lastSnapshot) {
        return snapshot ? (snapshot.steps | 0) : 0;
      }

      function pruneFutureHistory(step) {
        const normalizedStep = step | 0;
        for (const candidate of [...stepHistory.keys()]) {
          if ((candidate | 0) > normalizedStep) {
            stepHistory.delete(candidate);
          }
        }
      }

      function cloneCell(cell) {
        return {
          ch: String(cell?.ch || " "),
          fg: (cell?.fg | 0) || 0,
          bg: (cell?.bg | 0) || 0,
          bold: !!cell?.bold,
          inverse: !!cell?.inverse
        };
      }

      function cloneTerminalState(state) {
        if (!state) return null;
        return {
          rows: state.rows | 0,
          columns: state.columns | 0,
          cursorRow: state.cursorRow | 0,
          cursorCol: state.cursorCol | 0,
          savedRow: state.savedRow | 0,
          savedCol: state.savedCol | 0,
          cells: Array.isArray(state.cells) ? state.cells.map((cell) => cloneCell(cell)) : [],
          currentFg: state.currentFg | 0,
          currentBg: state.currentBg | 0,
          currentBold: !!state.currentBold,
          currentInverse: !!state.currentInverse,
          parserState: String(state.parserState || "normal"),
          csiBuffer: String(state.csiBuffer || ""),
          charsetMode: String(state.charsetMode || "ascii")
        };
      }

      function captureToolState() {
        return {
          inputQueue: Array.isArray(inputQueue) ? inputQueue.map((value) => value & 0xff) : [],
          savedCursor: {
            row: savedCursor?.row | 0,
            col: savedCursor?.col | 0
          },
          terminalState: cloneTerminalState(terminalState),
          observerReadCount: observerReadCount | 0,
          observerWriteCount: observerWriteCount | 0,
          snapshotReadCount: snapshotReadCount | 0,
          snapshotWriteCount: snapshotWriteCount | 0,
          polledTxCount: polledTxCount | 0
        };
      }

      function restoreToolState(state) {
        if (!state || !state.terminalState) return false;
        inputQueue = Array.isArray(state.inputQueue) ? state.inputQueue.map((value) => value & 0xff) : [];
        savedCursor = {
          row: state.savedCursor?.row | 0,
          col: state.savedCursor?.col | 0
        };
        terminalState = cloneTerminalState(state.terminalState);
        observerReadCount = state.observerReadCount | 0;
        observerWriteCount = state.observerWriteCount | 0;
        snapshotReadCount = state.snapshotReadCount | 0;
        snapshotWriteCount = state.snapshotWriteCount | 0;
        polledTxCount = state.polledTxCount | 0;
        dirty = new Set();
        dirtyAll = true;
        cursorOverlayIndex = -1;
        scheduleRender();
        updateStatus();
        return true;
      }

      function captureHistoryForStep(step) {
        const normalizedStep = step | 0;
        pruneFutureHistory(normalizedStep);
        stepHistory.set(normalizedStep, captureToolState());
      }

      function restoreHistoryForStep(step) {
        const normalizedStep = step | 0;
        if (stepHistory.has(normalizedStep)) {
          return restoreToolState(stepHistory.get(normalizedStep));
        }
        let bestStep = null;
        for (const candidate of stepHistory.keys()) {
          if ((candidate | 0) <= normalizedStep && (bestStep == null || (candidate | 0) > (bestStep | 0))) {
            bestStep = candidate | 0;
          }
        }
        if (bestStep == null) return false;
        return restoreToolState(stepHistory.get(bestStep));
      }

      function resetTerminalState() {
        const cellCount = TERMINAL_GEOMETRY.columns * TERMINAL_GEOMETRY.rows;
        terminalState = {
          rows: TERMINAL_GEOMETRY.rows,
          columns: TERMINAL_GEOMETRY.columns,
          cursorRow: 0,
          cursorCol: 0,
          savedRow: 0,
          savedCol: 0,
          cells: Array.from({ length: cellCount }, () => createCell()),
          currentFg: 7,
          currentBg: 0,
          currentBold: false,
          currentInverse: false,
          parserState: "normal",
          csiBuffer: "",
          charsetMode: "ascii"
        };
        savedCursor = { row: 0, col: 0 };
        dirtyAll = true;
        scheduleRender();
      }

      function idx(row, col) {
        return row * terminalState.columns + col;
      }

      function markCellDirty(row, col) {
        if (!terminalState) return;
        if (row < 0 || row >= terminalState.rows || col < 0 || col >= terminalState.columns) return;
        dirty.add(idx(row, col));
      }

      function writeCell(row, col, ch, attrs = null) {
        if (!terminalState) return;
        if (row < 0 || row >= terminalState.rows || col < 0 || col >= terminalState.columns) return;
        const cell = terminalState.cells[idx(row, col)];
        const next = attrs || {
          fg: terminalState.currentFg,
          bg: terminalState.currentBg,
          bold: terminalState.currentBold,
          inverse: terminalState.currentInverse
        };
        cell.ch = ch;
        cell.fg = next.fg;
        cell.bg = next.bg;
        cell.bold = !!next.bold;
        cell.inverse = !!next.inverse;
        markCellDirty(row, col);
      }

      function scrollUp() {
        if (!terminalState) return;
        for (let row = 1; row < terminalState.rows; row += 1) {
          for (let col = 0; col < terminalState.columns; col += 1) {
            const target = terminalState.cells[idx(row - 1, col)];
            const source = terminalState.cells[idx(row, col)];
            target.ch = source.ch;
            target.fg = source.fg;
            target.bg = source.bg;
            target.bold = source.bold;
            target.inverse = source.inverse;
          }
        }
        for (let col = 0; col < terminalState.columns; col += 1) {
          const cell = terminalState.cells[idx(terminalState.rows - 1, col)];
          cell.ch = " ";
          cell.fg = terminalState.currentFg;
          cell.bg = terminalState.currentBg;
          cell.bold = false;
          cell.inverse = false;
        }
        dirtyAll = true;
        scheduleRender();
      }

      function lineFeed() {
        if (!terminalState) return;
        terminalState.cursorRow += 1;
        if (terminalState.cursorRow >= terminalState.rows) {
          terminalState.cursorRow = terminalState.rows - 1;
          scrollUp();
        }
      }

      function carriageReturn() {
        if (!terminalState) return;
        terminalState.cursorCol = 0;
      }

      function backspaceDestructive() {
        if (!terminalState) return;
        if (terminalState.cursorCol > 0) {
          terminalState.cursorCol -= 1;
        } else if (terminalState.cursorRow > 0) {
          terminalState.cursorRow -= 1;
          let lastNonSpace = -1;
          for (let col = terminalState.columns - 1; col >= 0; col -= 1) {
            const cell = terminalState.cells[idx(terminalState.cursorRow, col)];
            if (cell && cell.ch !== " ") {
              lastNonSpace = col;
              break;
            }
          }
          terminalState.cursorCol = lastNonSpace >= 0 ? lastNonSpace : 0;
        }
        writeCell(terminalState.cursorRow, terminalState.cursorCol, " ", {
          fg: terminalState.currentFg,
          bg: terminalState.currentBg,
          bold: terminalState.currentBold,
          inverse: terminalState.currentInverse
        });
      }

      function putGlyph(glyph) {
        if (!terminalState) return;
        writeCell(terminalState.cursorRow, terminalState.cursorCol, glyph);
        terminalState.cursorCol += 1;
        if (terminalState.cursorCol >= terminalState.columns) {
          terminalState.cursorCol = 0;
          lineFeed();
        }
      }

      function clearLine(mode = 0) {
        if (!terminalState) return;
        let start = 0;
        let end = terminalState.columns - 1;
        if (mode === 0) start = terminalState.cursorCol;
        if (mode === 1) end = terminalState.cursorCol;
        for (let col = start; col <= end; col += 1) {
          writeCell(terminalState.cursorRow, col, " ", {
            fg: terminalState.currentFg,
            bg: terminalState.currentBg,
            bold: false,
            inverse: false
          });
        }
      }

      function clearScreen(mode = 0) {
        if (!terminalState) return;
        if (mode === 2) {
          for (let row = 0; row < terminalState.rows; row += 1) {
            for (let col = 0; col < terminalState.columns; col += 1) {
              writeCell(row, col, " ", {
                fg: terminalState.currentFg,
                bg: terminalState.currentBg,
                bold: false,
                inverse: false
              });
            }
          }
          terminalState.cursorRow = 0;
          terminalState.cursorCol = 0;
          return;
        }
        if (mode === 1) {
          for (let row = 0; row <= terminalState.cursorRow; row += 1) {
            const maxCol = row === terminalState.cursorRow ? terminalState.cursorCol : terminalState.columns - 1;
            for (let col = 0; col <= maxCol; col += 1) {
              writeCell(row, col, " ", {
                fg: terminalState.currentFg,
                bg: terminalState.currentBg,
                bold: false,
                inverse: false
              });
            }
          }
          return;
        }
        for (let row = terminalState.cursorRow; row < terminalState.rows; row += 1) {
          const startCol = row === terminalState.cursorRow ? terminalState.cursorCol : 0;
          for (let col = startCol; col < terminalState.columns; col += 1) {
            writeCell(row, col, " ", {
              fg: terminalState.currentFg,
              bg: terminalState.currentBg,
              bold: false,
              inverse: false
            });
          }
        }
      }

      function clampCursor() {
        terminalState.cursorRow = Math.max(0, Math.min(terminalState.rows - 1, terminalState.cursorRow | 0));
        terminalState.cursorCol = Math.max(0, Math.min(terminalState.columns - 1, terminalState.cursorCol | 0));
      }

      function applySgr(params) {
        const values = params.length ? params : [0];
        values.forEach((raw) => {
          const value = Number.parseInt(raw, 10);
          const code = Number.isFinite(value) ? value : 0;
          if (code === 0) {
            terminalState.currentFg = 7;
            terminalState.currentBg = 0;
            terminalState.currentBold = false;
            terminalState.currentInverse = false;
            return;
          }
          if (code === 1) {
            terminalState.currentBold = true;
            return;
          }
          if (code === 22) {
            terminalState.currentBold = false;
            return;
          }
          if (code === 7) {
            terminalState.currentInverse = true;
            return;
          }
          if (code === 27) {
            terminalState.currentInverse = false;
            return;
          }
          if (code >= 30 && code <= 37) {
            terminalState.currentFg = code - 30;
            return;
          }
          if (code >= 40 && code <= 47) {
            terminalState.currentBg = code - 40;
            return;
          }
          if (code >= 90 && code <= 97) {
            terminalState.currentFg = (code - 90) + 8;
            return;
          }
          if (code >= 100 && code <= 107) {
            terminalState.currentBg = (code - 100) + 8;
          }
        });
      }

      function handleCsi(finalChar, buffer) {
        if (!terminalState) return;
        const raw = String(buffer || "");
        const privateMode = raw.startsWith("?");
        const normalized = privateMode ? raw.slice(1) : raw;
        const params = normalized.length ? normalized.split(";") : [];
        const num = (index, fallback) => {
          const value = Number.parseInt(params[index] ?? "", 10);
          return Number.isFinite(value) && value !== 0 ? value : fallback;
        };

        switch (finalChar) {
          case "A":
            terminalState.cursorRow -= num(0, 1);
            clampCursor();
            break;
          case "B":
            terminalState.cursorRow += num(0, 1);
            clampCursor();
            break;
          case "C":
            terminalState.cursorCol += num(0, 1);
            clampCursor();
            break;
          case "D":
            terminalState.cursorCol -= num(0, 1);
            clampCursor();
            break;
          case "G":
            terminalState.cursorCol = num(0, 1) - 1;
            clampCursor();
            break;
          case "H":
          case "f":
            terminalState.cursorRow = num(0, 1) - 1;
            terminalState.cursorCol = num(1, 1) - 1;
            clampCursor();
            break;
          case "J":
            clearScreen(Number.parseInt(params[0] ?? "0", 10) || 0);
            break;
          case "K":
            clearLine(Number.parseInt(params[0] ?? "0", 10) || 0);
            break;
          case "m":
            applySgr(params);
            break;
          case "s":
            terminalState.savedRow = terminalState.cursorRow;
            terminalState.savedCol = terminalState.cursorCol;
            break;
          case "u":
            terminalState.cursorRow = terminalState.savedRow | 0;
            terminalState.cursorCol = terminalState.savedCol | 0;
            clampCursor();
            break;
          case "h":
          case "l":
            if (privateMode && params[0] === "25") {
              // cursor visibility hint ignored for now
            }
            break;
          default:
            break;
        }
        scheduleRender();
      }

      function mapByteToGlyph(byteValue) {
        const byte = byteValue & 0xff;
        if (terminalState.charsetMode === "dec") {
          const glyph = DEC_SPECIAL_GRAPHICS[String.fromCharCode(byte)];
          if (glyph) return glyph;
        }
        if (encodingSelect.value === "cp437" && Object.prototype.hasOwnProperty.call(CP437_BOX_DRAWING, byte)) {
          return CP437_BOX_DRAWING[byte];
        }
        if (byte >= 32 && byte <= 126) return String.fromCharCode(byte);
        if (byte >= 160) return String.fromCharCode(byte);
        return " ";
      }

      function processTerminalByte(byteValue) {
        if (!terminalState) return;
        const byte = byteValue & 0xff;

        if (terminalState.parserState === "esc") {
          if (byte === 91) {
            terminalState.parserState = "csi";
            terminalState.csiBuffer = "";
            return;
          }
          if (byte === 40) {
            terminalState.parserState = "charset";
            return;
          }
          if (byte === 99) {
            resetTerminalState();
            return;
          }
          if (byte === 55) {
            terminalState.savedRow = terminalState.cursorRow;
            terminalState.savedCol = terminalState.cursorCol;
          } else if (byte === 56) {
            terminalState.cursorRow = terminalState.savedRow | 0;
            terminalState.cursorCol = terminalState.savedCol | 0;
            clampCursor();
          }
          terminalState.parserState = "normal";
          scheduleRender();
          return;
        }

        if (terminalState.parserState === "charset") {
          terminalState.charsetMode = byte === 48 ? "dec" : "ascii";
          terminalState.parserState = "normal";
          return;
        }

        if (terminalState.parserState === "csi") {
          if (byte >= 0x40 && byte <= 0x7e) {
            handleCsi(String.fromCharCode(byte), terminalState.csiBuffer);
            terminalState.parserState = "normal";
            terminalState.csiBuffer = "";
            return;
          }
          terminalState.csiBuffer += String.fromCharCode(byte);
          return;
        }

        if (byte === 27) {
          terminalState.parserState = "esc";
          return;
        }
        if (byte === 13) {
          carriageReturn();
          scheduleRender();
          return;
        }
        if (byte === 10) {
          if (crlfTranslationEnabled) carriageReturn();
          lineFeed();
          scheduleRender();
          return;
        }
        if (byte === 8) {
          backspaceDestructive();
          scheduleRender();
          return;
        }
        if (byte === 9) {
          const nextTab = Math.min(terminalState.columns - 1, ((Math.floor(terminalState.cursorCol / 8) + 1) * 8));
          terminalState.cursorCol = nextTab;
          scheduleRender();
          return;
        }
        if (byte === 12) {
          clearScreen(2);
          scheduleRender();
          return;
        }
        if (byte < 32) return;

        putGlyph(mapByteToGlyph(byte));
        scheduleRender();
      }

      function updateMetrics() {
        fontSize = Number.parseInt(fontSizeSelect.value, 10) || DEFAULT_FONT_SIZE;
        cellWidth = Math.max(8, Math.round(fontSize * 0.62));
        cellHeight = Math.max(14, Math.round(fontSize * 1.35));
        baseline = Math.round(cellHeight * 0.78);
        canvas.width = terminalState.columns * cellWidth;
        canvas.height = terminalState.rows * cellHeight;
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
        gfx.font = `${fontSize}px "Cascadia Mono", Consolas, "Courier New", monospace`;
        gfx.textBaseline = "alphabetic";
        gfx.textAlign = "left";
        dirtyAll = true;
        scheduleRender();
      }

      function effectiveCellColors(cell) {
        let fg = cell.bold && cell.fg < 8 ? cell.fg + 8 : cell.fg;
        let bg = cell.bg;
        if (cell.inverse) {
          const tmp = fg;
          fg = bg;
          bg = tmp;
        }
        return {
          fg: ANSI_PALETTE[fg] || DEFAULT_COLORS.fg,
          bg: ANSI_PALETTE[bg] || DEFAULT_COLORS.bg
        };
      }

      function drawCell(index) {
        const row = Math.floor(index / terminalState.columns);
        const col = index % terminalState.columns;
        const cell = terminalState.cells[index];
        const { fg, bg } = effectiveCellColors(cell);
        const x = col * cellWidth;
        const y = row * cellHeight;
        gfx.fillStyle = bg;
        gfx.fillRect(x, y, cellWidth, cellHeight);
        if (cell.ch && cell.ch !== " ") {
          gfx.fillStyle = fg;
          gfx.fillText(cell.ch, x + 1, y + baseline);
        }
      }

      function drawCursor() {
        if (!focusVisible || !connected || !terminalState) return;
        cursorOverlayIndex = idx(terminalState.cursorRow, terminalState.cursorCol);
        const x = terminalState.cursorCol * cellWidth;
        const y = terminalState.cursorRow * cellHeight;
        gfx.fillStyle = "rgba(255,255,255,0.24)";
        gfx.fillRect(x, y + cellHeight - 3, cellWidth, 2);
      }

      function renderNow() {
        renderFrame = null;
        if (!terminalState) return;
        if (cursorOverlayIndex >= 0 && cursorOverlayIndex < terminalState.cells.length) {
          drawCell(cursorOverlayIndex);
          cursorOverlayIndex = -1;
        }
        if (dirtyAll) {
          gfx.fillStyle = DEFAULT_COLORS.bg;
          gfx.fillRect(0, 0, canvas.width, canvas.height);
          for (let i = 0; i < terminalState.cells.length; i += 1) drawCell(i);
          dirtyAll = false;
          dirty.clear();
          drawCursor();
          return;
        }
        if (!dirty.size) {
          drawCursor();
          return;
        }
        const cells = [...dirty.values()];
        dirty.clear();
        cells.forEach((index) => drawCell(index));
        drawCursor();
      }

      function scheduleRender() {
        if (renderFrame !== null) return;
        renderFrame = window.requestAnimationFrame(renderNow);
      }

      function queueInputBytes(bytes) {
        bytes.forEach((value) => inputQueue.push(value & 0xff));
        feedReceiverFromQueue();
        captureHistoryForStep(getSnapshotStep());
        updateStatus();
      }

      function echoInputBytes(bytes) {
        if (!localEchoEnabled) return;
        bytes.forEach((value) => processTerminalByte(value & 0xff));
      }

      function feedReceiverFromQueue() {
        if (!connected || !inputQueue.length) return;
        const { RECEIVER_CONTROL, RECEIVER_DATA } = addresses();
        if (isReadyBitSet(RECEIVER_CONTROL)) return;
        const byte = inputQueue.shift() | 0;
        writeByteSafe(RECEIVER_DATA, byte & 0xff);
        writeByteSafe(RECEIVER_CONTROL, readyBitSet(RECEIVER_CONTROL));
      }

      function processSnapshotAccess(previousSnapshot) {
        if (!connected || !previousSnapshot) return;
        const { RECEIVER_DATA, RECEIVER_CONTROL, TRANSMITTER_DATA, TRANSMITTER_CONTROL } = addresses();
        const access = extractMemoryAccess(previousSnapshot);
        if (!access) return;
        if (!access.write && access.address === (RECEIVER_DATA >>> 0)) {
          snapshotReadCount += 1;
          writeByteSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
          writeByteSafe(RECEIVER_DATA, 0);
          feedReceiverFromQueue();
          updateStatus();
          return;
        }
        if (access.write && access.address === (TRANSMITTER_DATA >>> 0) && observerWriteCount === 0) {
          snapshotWriteCount += 1;
          writeByteSafe(TRANSMITTER_CONTROL, readyBitCleared(TRANSMITTER_CONTROL));
          processTerminalByte(access.value | 0);
          writeByteSafe(TRANSMITTER_DATA, 0);
          writeByteSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
          updateStatus();
        }
      }

      function syncDeviceRegisters() {
        if (!connected) return;
        const { TRANSMITTER_CONTROL, TRANSMITTER_DATA, RECEIVER_CONTROL } = addresses();
        if (!isReadyBitSet(TRANSMITTER_CONTROL)) {
          writeByteSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
        }
        if (observerWriteCount === 0) {
          const txByte = readByteSafe(TRANSMITTER_DATA);
          if (txByte !== 0) {
            polledTxCount += 1;
            processTerminalByte(txByte);
            writeByteSafe(TRANSMITTER_DATA, 0);
            writeByteSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
          }
        }
        if (inputQueue.length > 0 && !isReadyBitSet(RECEIVER_CONTROL)) {
          feedReceiverFromQueue();
        }
      }

      function stopSyncTimer() {
        if (syncTimer == null) return;
        window.clearInterval(syncTimer);
        syncTimer = null;
      }

      function startSyncTimer() {
        stopSyncTimer();
        syncTimer = window.setInterval(() => {
          syncDeviceRegisters();
          updateStatus();
        }, 16);
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
        const { RECEIVER_DATA, RECEIVER_CONTROL, TRANSMITTER_DATA, TRANSMITTER_CONTROL } = addresses();
        detachMemoryObserver = ctx.engine.registerMemoryObserver({
          start: RECEIVER_DATA,
          end: TRANSMITTER_DATA,
          onRead(detail) {
            if (!connected) return;
            if ((detail?.address >>> 0) !== (RECEIVER_DATA >>> 0)) return;
            observerReadCount += 1;
            writeByteSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
            writeByteSafe(RECEIVER_DATA, 0);
            feedReceiverFromQueue();
            updateStatus();
          },
          onWrite(detail) {
            if (!connected) return;
            if ((detail?.address >>> 0) !== (TRANSMITTER_DATA >>> 0)) return;
            observerWriteCount += 1;
            if (!isReadyBitSet(TRANSMITTER_CONTROL)) return;
            writeByteSafe(TRANSMITTER_CONTROL, readyBitCleared(TRANSMITTER_CONTROL));
            processTerminalByte(detail?.value | 0);
            writeByteSafe(TRANSMITTER_DATA, 0);
            writeByteSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
            updateStatus();
          }
        });
      }

      function updateConnectButtonLabel() {
        connectButton.textContent = connected ? t("Disconnect from MIPS") : t("Connect to MIPS");
      }

      function updateStatus() {
        if (!statusNode || !terminalState) return;
        const { RECEIVER_DATA, TRANSMITTER_DATA } = addresses();
        const items = [
          [t("Cursor"), `${terminalState.cursorCol + 1}, ${terminalState.cursorRow + 1}`],
          [t("Input queue"), `${inputQueue.length}`],
          [t("Local echo"), localEchoEnabled ? t("on") : t("off")],
          [t("CRLF"), crlfTranslationEnabled ? t("on") : t("off")],
          [t("RX"), toHex32(RECEIVER_DATA)],
          [t("TX"), toHex32(TRANSMITTER_DATA)]
        ];
        statusNode.innerHTML = items.map(([label, value]) => `
          <div class="tty-ansi-status-item">
            <span class="tty-ansi-status-label">${label}</span>
            <span class="tty-ansi-status-value">${value}</span>
          </div>
        `).join("");
      }

      function refreshUiText() {
        shell.refreshTranslations?.();
        if (hintNode) {
          hintNode.textContent = t("Focus the terminal and type to feed receiver data. Optional local echo, CRLF translation, and destructive backspace make the terminal feel closer to a system console.");
        }
        if (baseNode) baseNode.value = toHex32(mmioBase());
        if (localEchoToggle) localEchoToggle.checked = localEchoEnabled;
        if (crlfToggle) crlfToggle.checked = crlfTranslationEnabled;
        updateConnectButtonLabel();
        updateStatus();
      }

      function resetDevice() {
        inputQueue = [];
        stepHistory = new Map();
        observerReadCount = 0;
        observerWriteCount = 0;
        snapshotReadCount = 0;
        snapshotWriteCount = 0;
        polledTxCount = 0;
        if (terminalState) {
          terminalState.currentFg = 7;
          terminalState.currentBg = 0;
          terminalState.currentBold = false;
          terminalState.currentInverse = false;
          terminalState.parserState = "normal";
          terminalState.csiBuffer = "";
          terminalState.charsetMode = "ascii";
        }
        resetTerminalState();
        const { TRANSMITTER_CONTROL, TRANSMITTER_DATA, RECEIVER_CONTROL, RECEIVER_DATA } = addresses();
        writeByteSafe(TRANSMITTER_DATA, 0);
        writeByteSafe(RECEIVER_DATA, 0);
        writeByteSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
        writeByteSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
        captureHistoryForStep(getSnapshotStep());
        updateStatus();
      }

      function handleKeydown(event) {
        if (!connected) return;
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const bytes = [event.key.charCodeAt(0) & 0xff];
          queueInputBytes(bytes);
          echoInputBytes(bytes);
          event.preventDefault();
          return;
        }
        if (event.key === "Enter") {
          const bytes = crlfTranslationEnabled ? [13, 10] : [13];
          queueInputBytes(bytes);
          echoInputBytes(bytes);
          event.preventDefault();
          return;
        }
        if (event.key === "Backspace") {
          const bytes = [8];
          queueInputBytes(bytes);
          echoInputBytes(bytes);
          event.preventDefault();
          return;
        }
        if (event.key === "Tab") {
          const bytes = [9];
          queueInputBytes(bytes);
          echoInputBytes(bytes);
          event.preventDefault();
          return;
        }
        if (event.key === "Escape") {
          queueInputBytes([27]);
          event.preventDefault();
          return;
        }
        if (event.key === "ArrowUp") {
          queueInputBytes([27, 91, 65]);
          event.preventDefault();
          return;
        }
        if (event.key === "ArrowDown") {
          queueInputBytes([27, 91, 66]);
          event.preventDefault();
          return;
        }
        if (event.key === "ArrowRight") {
          queueInputBytes([27, 91, 67]);
          event.preventDefault();
          return;
        }
        if (event.key === "ArrowLeft") {
          queueInputBytes([27, 91, 68]);
          event.preventDefault();
        }
      }

      canvas.addEventListener("keydown", handleKeydown);
      canvas.addEventListener("focus", () => {
        focusVisible = true;
        dirtyAll = true;
        scheduleRender();
      });
      canvas.addEventListener("blur", () => {
        focusVisible = false;
        dirtyAll = true;
        scheduleRender();
      });

      fontSizeSelect.addEventListener("change", updateMetrics);
      encodingSelect.addEventListener("change", () => {
        dirtyAll = true;
        scheduleRender();
      });
      localEchoToggle?.addEventListener("change", () => {
        localEchoEnabled = localEchoToggle.checked === true;
        updateStatus();
      });
      crlfToggle?.addEventListener("change", () => {
        crlfTranslationEnabled = crlfToggle.checked === true;
        updateStatus();
      });

      connectButton.addEventListener("click", () => {
        connected = !connected;
        updateConnectButtonLabel();
        if (connected) {
          const { TRANSMITTER_CONTROL, RECEIVER_CONTROL } = addresses();
          writeByteSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
          writeByteSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
          attachMmioObserver();
          startSyncTimer();
          feedReceiverFromQueue();
          captureHistoryForStep(getSnapshotStep());
          canvas.focus();
          ctx.messagesPane.postMars(`${t("[tool] TTY ANSI Terminal connected to keyboard/display MMIO {address}.", {
            address: toHex32(mmioBase())
          })}\n`);
        } else {
          detachMmioObserver();
          stopSyncTimer();
          ctx.messagesPane.postMars(`${t("[tool] TTY ANSI Terminal disconnected.")}\n`);
        }
        updateStatus();
      });

      resetButton.addEventListener("click", () => {
        resetDevice();
        canvas.focus();
      });

      helpButton.addEventListener("click", () => {
        ctx.messagesPane.postMars(`${t("[tool] TTY ANSI Terminal: writes to transmitter data are rendered as terminal bytes; receiver data is fed from keyboard input. Supported ANSI includes cursor movement, clear screen/line, colors, ESC(0 line drawing, optional local echo, CRLF translation, and destructive backspace.")}\n`);
      });

      closeButton.addEventListener("click", () => {
        detachMmioObserver();
        stopSyncTimer();
        shell.close();
      });
      shell.onResize(() => {
        dirtyAll = true;
        scheduleRender();
      });

      subscribeLanguageChange(refreshUiText);
      resetTerminalState();
      updateMetrics();
      resetDevice();
      refreshUiText();

      return {
        open() {
          shell.open();
          canvas.focus();
          dirtyAll = true;
          scheduleRender();
        },
        close() {
          detachMmioObserver();
          stopSyncTimer();
          shell.close();
        },
        onSnapshot(snapshot) {
          const previous = lastSnapshot;
          lastSnapshot = snapshot;
          if (!connected) {
            updateStatus();
            return;
          }
          const nextStep = getSnapshotStep(snapshot);
          const previousStep = getSnapshotStep(previous);
          if (previous == null) {
            captureHistoryForStep(nextStep);
            syncDeviceRegisters();
            updateStatus();
            return;
          }
          if (nextStep < previousStep) {
            restoreHistoryForStep(nextStep);
            pruneFutureHistory(nextStep);
            updateStatus();
            return;
          }
          if (nextStep > previousStep) {
            processSnapshotAccess(previous);
            syncDeviceRegisters();
            captureHistoryForStep(nextStep);
            updateStatus();
            return;
          }
          updateStatus();
        }
      };
    }
  });
})();
