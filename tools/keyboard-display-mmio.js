(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-keyboard-display-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .kd-tool {
        font: 11px Tahoma, "Segoe UI", sans-serif;
      }

      .kd-split {
        flex: 1 1 auto;
        min-height: 0;
      }

      .kd-panel-body {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .kd-display,
      .kd-keyboard {
        width: 100%;
        min-height: 0;
        resize: none;
        border: 1px solid #7f9db9;
        background: #fff;
        padding: 4px;
        font-family: "Courier New", "Lucida Console", monospace;
        font-size: 12px;
        box-sizing: border-box;
      }

      .kd-display {
        flex: 1 1 auto;
        white-space: pre;
        overflow: auto;
      }

      .kd-keyboard {
        flex: 1 1 auto;
      }

      .kd-options {
        display: grid;
        grid-template-columns: auto auto minmax(180px, 1fr);
        gap: 6px 8px;
        align-items: center;
      }

      .kd-options .kd-delay-group {
        display: grid;
        grid-template-columns: auto minmax(180px, 1fr);
        gap: 6px 8px;
        grid-column: 1 / -1;
        align-items: center;
      }

      .kd-options select,
      .kd-options input[type="range"] {
        width: 100%;
      }

      .kd-check {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      @media (max-width: 860px) {
        .kd-options {
          grid-template-columns: 1fr;
        }

        .kd-options .kd-delay-group {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

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

  host.register({
    id: "keyboard-display-mmio",
    label: "Keyboard and Display MMIO Simulator",
    create(ctx) {
      const shell = ctx.createToolWindowShell("keyboard-display-mmio", "Keyboard and Display MMIO Simulator, Version 1.4", 980, 760, `
        <div class="mars-tool-shell kd-tool">
          <h2 class="mars-tool-heading">Keyboard and Display MMIO Simulator</h2>
          <div class="mars-tool-split-vertical kd-split" data-kd="split">
            <section class="mars-tool-panel">
              <div class="mars-tool-panel-title" data-kd="displaytitle"></div>
              <div class="mars-tool-panel-body kd-panel-body">
                <textarea class="kd-display" data-kd="display" spellcheck="false" readonly wrap="off"></textarea>
                <div class="kd-options">
                  <button class="tool-btn" data-kd="font" type="button">Font</button>
                  <label class="kd-check"><input type="checkbox" data-kd="dad" checked> DAD</label>
                  <select data-kd="delaymode">
                    <option value="fixed" selected>Fixed transmitter delay, select using slider</option>
                    <option value="uniform">Uniform random delay around slider value</option>
                    <option value="normal">Normal random delay around slider value</option>
                  </select>
                  <div class="kd-delay-group">
                    <label data-kd="delaylabel">Delay length: 5 instruction executions</label>
                    <input type="range" min="0" max="50" step="1" value="5" data-kd="delay">
                  </div>
                </div>
              </div>
            </section>
            <div class="mars-tool-splitter" data-kd="splitter"></div>
            <section class="mars-tool-panel">
              <div class="mars-tool-panel-title" data-kd="keyboardtitle"></div>
              <div class="mars-tool-panel-body kd-panel-body">
                <textarea class="kd-keyboard" data-kd="keyboard" spellcheck="false" wrap="off" placeholder="Type here to send keyboard MMIO input"></textarea>
              </div>
            </section>
          </div>
          <div class="mars-tool-footer kd-footer">
            <button class="tool-btn" data-kd="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <div class="mars-tool-footer-actions">
              <button class="tool-btn" data-kd="reset" type="button">Reset</button>
              <button class="tool-btn" data-kd="help" type="button">Help</button>
              <button class="tool-btn" data-kd="close" type="button">Close</button>
            </div>
          </div>
        </div>
      `);

      const root = shell.root;
      const splitPane = root.querySelector("[data-kd='split']");
      const splitter = root.querySelector("[data-kd='splitter']");
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
        "12px \"Courier New\", \"Lucida Console\", monospace",
        "12px Consolas, monospace",
        "12px Menlo, monospace",
        "12px Monaco, monospace"
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
      let splitRatio = 0.58;
      let splitDrag = null;
      let activeDisplayDelta = null;
      let detachMemoryObserver = () => {};
      let detachInstructionObserver = () => {};
      let suppressDeviceObservers = false;
      const history = ctx.createToolDeltaHistory({
        applyInverse(delta) {
          if (!delta) return;
          randomAccessMode = delta.randomAccessMode === true;
          columns = Math.max(1, Number(delta.columns) || columns || 1);
          rows = Math.max(1, Number(delta.rows) || rows || 1);
          cursorX = Math.max(0, Math.min(columns - 1, Number(delta.cursorX) || 0));
          cursorY = Math.max(0, Math.min(rows - 1, Number(delta.cursorY) || 0));
          keyQueue = Array.isArray(delta.keyQueue) ? delta.keyQueue.map((value) => value & 0xff) : [];
          countingInstructions = delta.countingInstructions === true;
          instructionCount = Number(delta.instructionCount) || 0;
          delayLimit = Number(delta.delayLimit) || 0;
          pendingWord = Number(delta.pendingWord) || 0;
          if (delta.mmio) {
            const { RECEIVER_CONTROL, RECEIVER_DATA, TRANSMITTER_CONTROL, TRANSMITTER_DATA } = addresses();
            suppressDeviceObservers = true;
            try {
              writeByteSafe(RECEIVER_CONTROL, delta.mmio.receiverControl);
              writeByteSafe(RECEIVER_DATA, delta.mmio.receiverData);
              writeByteSafe(TRANSMITTER_CONTROL, delta.mmio.transmitterControl);
              writeByteSafe(TRANSMITTER_DATA, delta.mmio.transmitterData);
            } finally {
              suppressDeviceObservers = false;
            }
          }

          const display = delta.display;
          if (display?.kind === "full") {
            terminalBuffer = Array.from({ length: rows }, (_, rowIndex) => {
              const rowText = String(display.terminalRows?.[rowIndex] || "");
              return Array.from({ length: columns }, (_, colIndex) => rowText[colIndex] || " ");
            });
            displayArea.value = String(display.value || "");
          } else if (display?.kind === "cell") {
            if (Array.isArray(terminalBuffer?.[display.y])) {
              terminalBuffer[display.y][display.x] = String(display.ch || " ");
              flushBufferToDisplay();
            }
          } else if (display?.kind === "append") {
            displayArea.value = String(displayArea.value || "").slice(0, Math.max(0, display.length | 0));
          }

          const selectionStart = Math.max(0, Math.min(displayArea.value.length, Number(delta.selectionStart) || 0));
          const selectionEnd = Math.max(selectionStart, Math.min(displayArea.value.length, Number(delta.selectionEnd) || selectionStart));
          displayArea.selectionStart = selectionStart;
          displayArea.selectionEnd = selectionEnd;
          displayArea.scrollTop = displayArea.scrollHeight;
          updateTitles();
        }
      });

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

      function isReadyBitSet(address) {
        return (readByteSafe(address) & 1) === 1;
      }

      function readyBitSet(address) {
        return (readByteSafe(address) | 1) & 0xff;
      }

      function readyBitCleared(address) {
        return (readByteSafe(address) & ~1) & 0xff;
      }

      function applySplitLayout() {
        if (!(splitPane instanceof HTMLElement)) return;
        const splitterHeight = 6;
        const available = Math.max(0, splitPane.clientHeight - splitterHeight);
        if (!(available > 0)) return;
        const minTop = 140;
        const minBottom = 120;
        let topHeight = Math.round(available * splitRatio);
        if (available >= (minTop + minBottom)) {
          topHeight = Math.max(minTop, Math.min(available - minBottom, topHeight));
        } else {
          topHeight = Math.round(available / 2);
        }
        splitRatio = available > 0 ? (topHeight / available) : 0.5;
        splitPane.style.gridTemplateRows = `${topHeight}px ${splitterHeight}px ${Math.max(0, available - topHeight)}px`;
      }

      function stopSplitDrag() {
        if (!splitDrag) return;
        splitDrag = null;
        document.removeEventListener("pointermove", onSplitPointerMove);
        document.removeEventListener("pointerup", stopSplitDrag);
        document.removeEventListener("pointercancel", stopSplitDrag);
      }

      function onSplitPointerMove(event) {
        if (!splitDrag || !(splitPane instanceof HTMLElement)) return;
        const rect = splitPane.getBoundingClientRect();
        const splitterHeight = 6;
        const available = Math.max(0, rect.height - splitterHeight);
        if (!(available > 0)) return;
        let topHeight = event.clientY - rect.top - splitDrag.offsetY;
        const minTop = 140;
        const minBottom = 120;
        if (available >= (minTop + minBottom)) {
          topHeight = Math.max(minTop, Math.min(available - minBottom, topHeight));
        } else {
          topHeight = Math.max(0, Math.min(available, topHeight));
        }
        splitRatio = topHeight / available;
        applySplitLayout();
        recalcGrid();
      }

      splitter.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !(splitPane instanceof HTMLElement)) return;
        event.preventDefault();
        const rect = splitter.getBoundingClientRect();
        splitDrag = {
          offsetY: event.clientY - rect.top
        };
        document.addEventListener("pointermove", onSplitPointerMove);
        document.addEventListener("pointerup", stopSplitDrag);
        document.addEventListener("pointercancel", stopSplitDrag);
      });

      function getSequentialCursor() {
        return displayArea.selectionStart ?? displayArea.value.length ?? 0;
      }

      function getSnapshotStep(snapshot = null) {
        if (snapshot && Number.isFinite(snapshot.steps)) return snapshot.steps | 0;
        return Number.isFinite(ctx.engine?.steps) ? (ctx.engine.steps | 0) : 0;
      }

      function ensureHistoryDelta(step) {
        const { RECEIVER_CONTROL, RECEIVER_DATA, TRANSMITTER_CONTROL, TRANSMITTER_DATA } = addresses();
        return history.ensure(step, () => ({
          randomAccessMode,
          columns,
          rows,
          cursorX,
          cursorY,
          selectionStart: Number(displayArea.selectionStart) || 0,
          selectionEnd: Number(displayArea.selectionEnd) || 0,
          keyQueue: keyQueue.slice(),
          countingInstructions,
          instructionCount,
          delayLimit,
          pendingWord,
          mmio: {
            receiverControl: readByteSafe(RECEIVER_CONTROL),
            receiverData: readByteSafe(RECEIVER_DATA),
            transmitterControl: readByteSafe(TRANSMITTER_CONTROL),
            transmitterData: readByteSafe(TRANSMITTER_DATA)
          },
          display: null
        }));
      }

      function recordFullDisplayRollback(delta) {
        if (!delta || delta.display) return;
        delta.display = {
          kind: "full",
          value: String(displayArea.value || ""),
          terminalRows: Array.isArray(terminalBuffer)
            ? terminalBuffer.map((row) => row.join(""))
            : []
        };
      }

      function formatCursorPosition() {
        if (randomAccessMode) return `(${cursorX},${cursorY})`;
        return `${getSequentialCursor()}`;
      }

      function updateTitles() {
        const { RECEIVER_DATA, TRANSMITTER_DATA } = addresses();
        displayTitle.textContent = t("DISPLAY: Store to Transmitter Data {address}, cursor {cursor}, area {columns} x {rows}", {
          address: toHex32(TRANSMITTER_DATA),
          cursor: formatCursorPosition(),
          columns,
          rows
        });
        keyboardTitle.textContent = t("KEYBOARD: Characters typed here are stored to Receiver Data {address}", {
          address: toHex32(RECEIVER_DATA)
        });
      }

      function recalcGrid() {
        const fontSize = Number.parseFloat(window.getComputedStyle(displayArea).fontSize || "12");
        const lineHeight = Math.max(fontSize * 1.35, 16);
        const charWidth = Math.max(fontSize * 0.62, 7);
        columns = Math.max(20, Math.floor((displayArea.clientWidth - 10) / charWidth));
        rows = Math.max(5, Math.floor((displayArea.clientHeight - 10) / lineHeight));
        if (randomAccessMode) {
          terminalBuffer = Array.from({ length: rows }, (_, rowIndex) => (
            Array.from({ length: columns }, (_, colIndex) => terminalBuffer[rowIndex]?.[colIndex] ?? " ")
          ));
          cursorX = Math.max(0, Math.min(columns - 1, cursorX));
          cursorY = Math.max(0, Math.min(rows - 1, cursorY));
          flushBufferToDisplay();
        }
        updateTitles();
      }

      function initializeDisplay(randomAccess) {
        recalcGrid();
        if (!randomAccess) {
          displayArea.value = "";
          displayArea.selectionStart = 0;
          displayArea.selectionEnd = 0;
          cursorX = 0;
          cursorY = 0;
          updateTitles();
          return;
        }
        terminalBuffer = Array.from({ length: rows }, () => Array.from({ length: columns }, () => " "));
        displayArea.value = terminalBuffer.map((line) => line.join("")).join("\n");
        displayArea.selectionStart = 0;
        displayArea.selectionEnd = 0;
        cursorX = 0;
        cursorY = 0;
        updateTitles();
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
          recordFullDisplayRollback(activeDisplayDelta);
          initializeDisplay(randomAccessMode);
          return;
        }

        if (ch === 7) {
          if (!randomAccessMode) {
            recordFullDisplayRollback(activeDisplayDelta);
            randomAccessMode = true;
            initializeDisplay(true);
          }
          const x = (word & 0xfff00000) >>> 20;
          const y = (word & 0x000fff00) >>> 8;
          setCursor(x, y);
          return;
        }

        if (!randomAccessMode) {
          if (activeDisplayDelta && !activeDisplayDelta.display) {
            activeDisplayDelta.display = {
              kind: "append",
              length: String(displayArea.value || "").length
            };
          }
          displayArea.value += String.fromCharCode(ch);
          displayArea.selectionStart = displayArea.value.length;
          displayArea.selectionEnd = displayArea.value.length;
          displayArea.scrollTop = displayArea.scrollHeight;
          updateTitles();
          return;
        }

        if (activeDisplayDelta && !activeDisplayDelta.display) {
          activeDisplayDelta.display = {
            kind: "cell",
            x: cursorX,
            y: cursorY,
            ch: String(terminalBuffer?.[cursorY]?.[cursorX] || " ")
          };
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
        delayLabel.textContent = t("Delay length: {count} instruction executions", {
          count: Number.parseInt(delaySlider.value, 10) || 0
        });
      }

      function updateConnectButtonLabel() {
        connectButton.textContent = connected ? t("Disconnect from MIPS") : t("Connect to MIPS");
      }

      function refreshUiText() {
        shell.refreshTranslations?.();
        updateConnectButtonLabel();
        updateDelayLabel();
        updateTitles();
      }

      function feedReceiverFromQueue() {
        if (!connected || !keyQueue.length) return;
        const { RECEIVER_CONTROL, RECEIVER_DATA } = addresses();
        if (isReadyBitSet(RECEIVER_CONTROL)) return;

        const value = keyQueue.shift() | 0;
        writeByteSafe(RECEIVER_DATA, value & 0xff);
        writeByteSafe(RECEIVER_CONTROL, readyBitSet(RECEIVER_CONTROL));
      }

      function queueKey(value) {
        if (!Number.isFinite(value)) return;
        ensureHistoryDelta(getSnapshotStep());
        keyQueue.push(value & 0xff);
        feedReceiverFromQueue();
      }

      function processResolvedStep(access, targetStep, tickInstruction = true) {
        if (!connected) return;
        const { RECEIVER_DATA, RECEIVER_CONTROL, TRANSMITTER_DATA, TRANSMITTER_CONTROL } = addresses();
        const mayMutate = Boolean(access) || countingInstructions || keyQueue.length > 0;
        if (!mayMutate) return;
        const delta = ensureHistoryDelta(targetStep);
        activeDisplayDelta = delta;
        if (access) {
          if (!access.write && access.address === RECEIVER_DATA) {
            writeByteSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
            feedReceiverFromQueue();
          }

          if (access.write && access.address === TRANSMITTER_DATA && isReadyBitSet(TRANSMITTER_CONTROL)) {
            writeByteSafe(TRANSMITTER_CONTROL, readyBitCleared(TRANSMITTER_CONTROL));
            pendingWord = access.value | 0;
            if (!displayAfterDelay) displayCharacter(pendingWord);
            countingInstructions = true;
            instructionCount = 0;
            delayLimit = generateDelay();
          }
        }

        if (tickInstruction && countingInstructions) {
          instructionCount += 1;
          if (instructionCount >= delayLimit) {
            if (displayAfterDelay) displayCharacter(pendingWord);
            countingInstructions = false;
            writeByteSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
          }
        }

        feedReceiverFromQueue();
        activeDisplayDelta = null;
      }

      function detachDeviceObservers() {
        try {
          detachMemoryObserver();
          detachInstructionObserver();
        } catch {
          // Detaching a device must not affect the simulator.
        }
        detachMemoryObserver = () => {};
        detachInstructionObserver = () => {};
      }

      function attachDeviceObservers() {
        detachDeviceObservers();
        if (!ctx.engine || typeof ctx.engine.registerMemoryObserver !== "function") return;
        const { RECEIVER_DATA, TRANSMITTER_DATA } = addresses();
        detachMemoryObserver = ctx.engine.registerMemoryObserver({
          start: RECEIVER_DATA,
          end: TRANSMITTER_DATA,
          onRead(detail) {
            if (!connected || suppressDeviceObservers || (detail?.address >>> 0) !== RECEIVER_DATA) return;
            processResolvedStep({
              write: false,
              address: RECEIVER_DATA,
              value: detail?.value | 0
            }, (detail?.steps | 0) + 1, false);
          },
          onWrite(detail) {
            if (!connected || suppressDeviceObservers || (detail?.address >>> 0) !== TRANSMITTER_DATA) return;
            processResolvedStep({
              write: true,
              address: TRANSMITTER_DATA,
              value: detail?.value | 0
            }, (detail?.steps | 0) + 1, false);
          }
        });
        if (typeof ctx.engine.registerInstructionObserver === "function") {
          detachInstructionObserver = ctx.engine.registerInstructionObserver((detail) => {
            if (!connected || suppressDeviceObservers) return;
            processResolvedStep(null, detail?.steps | 0, true);
          });
        }
      }

      function doReset() {
        history.clear(getSnapshotStep());
        keyQueue = [];
        countingInstructions = false;
        instructionCount = 0;
        delayLimit = 0;
        pendingWord = 0;
        randomAccessMode = false;
        initializeDisplay(false);
        keyboardArea.value = "";
        const { TRANSMITTER_CONTROL, RECEIVER_CONTROL } = addresses();
        writeByteSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
        writeByteSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
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
        updateConnectButtonLabel();
        if (connected) {
          const { TRANSMITTER_CONTROL, RECEIVER_CONTROL } = addresses();
          writeByteSafe(TRANSMITTER_CONTROL, readyBitSet(TRANSMITTER_CONTROL));
          writeByteSafe(RECEIVER_CONTROL, readyBitCleared(RECEIVER_CONTROL));
          feedReceiverFromQueue();
          history.sync(lastSnapshot);
          attachDeviceObservers();
          keyboardArea.focus();
        } else {
          detachDeviceObservers();
        }
      });

      resetButton.addEventListener("click", () => {
        doReset();
        keyboardArea.focus();
      });

      helpButton.addEventListener("click", () => {
        ctx.messagesPane.postMars(`${t("[tool] Keyboard/Display MMIO: type in keyboard panel to feed receiver data; store to transmitter data address to print.")}\n`);
      });

      closeButton.addEventListener("click", () => {
        detachDeviceObservers();
        shell.close();
      });
      shell.onResize(() => {
        applySplitLayout();
        recalcGrid();
      });

      subscribeLanguageChange(refreshUiText);
      displayArea.style.font = fonts[fontIndex];
      keyboardArea.style.font = fonts[fontIndex];
      applySplitLayout();
      updateDelayLabel();
      doReset();
      refreshUiText();

      return {
        isConnected: () => connected,
        open() {
          shell.open();
          if (connected) attachDeviceObservers();
          applySplitLayout();
          recalcGrid();
          keyboardArea.focus();
        },
        close() {
          detachDeviceObservers();
          shell.close();
        },
        onSnapshot(snapshot) {
          const previous = lastSnapshot;
          lastSnapshot = snapshot;
          if (!connected || !snapshot) return;

          const nextStep = getSnapshotStep(snapshot);
          const previousStep = getSnapshotStep(previous);
          if (!previous) {
            history.sync(snapshot);
            return;
          }

          if (nextStep < previousStep) {
            history.rewind(nextStep);
            history.sync(snapshot);
            return;
          }
          if (nextStep === previousStep) return;

          history.sync(snapshot);
        },
        onBackstep(event) {
          if (!connected || !event) return;
          history.rewind(event.stepAfter | 0);
        }
      };
    }
  });
})();
