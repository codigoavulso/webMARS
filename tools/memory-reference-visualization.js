(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-memory-viz-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .mv-tool { display:flex; flex-direction:column; gap:8px; height:100%; box-sizing:border-box; padding:8px; font:12px "Segoe UI", Tahoma, sans-serif; }
      .mv-title { margin:0; text-align:center; font-size:40px; color:#1f3048; line-height:1; }
      .mv-main { display:grid; grid-template-columns:280px 1fr; gap:10px; min-height:0; flex:1; }
      .mv-controls { border:1px solid #9db0c8; background:#f7fbff; padding:8px; display:flex; flex-direction:column; gap:8px; overflow:auto; }
      .mv-controls label { font-weight:700; display:flex; flex-direction:column; gap:4px; }
      .mv-canvas-wrap { border:1px solid #9db0c8; background:#fff; overflow:auto; padding:6px; }
      .mv-canvas { display:block; image-rendering:pixelated; }
      .mv-scale { border:1px solid #9db0c8; background:#fff; padding:6px; font-family:Consolas, monospace; }
      .mv-footer { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .mv-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#24354b; }
      .mv-footer .tool-btn { min-width:130px; }
    `;
    document.head.appendChild(style);
  }

  const MEMORY_OPS = new Set([
    "lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "sb", "sh", "sw", "swl", "swr", "ll", "sc",
    "lwc1", "swc1", "ldc1", "sdc1"
  ]);

  const COLOR_SCALE = [
    { count: 0, color: "#000000" },
    { count: 1, color: "#1e59ff" },
    { count: 2, color: "#22bf2f" },
    { count: 3, color: "#fff03a" },
    { count: 5, color: "#ff9d2a" },
    { count: 10, color: "#e41b1b" }
  ];

  const BASE_OPTIONS = [
    { value: 0x00400000, label: "0x00400000 (.text)" },
    { value: 0x10000000, label: "0x10000000 (.extern)" },
    { value: 0x10010000, label: "0x10010000 (.data)" },
    { value: 0x10040000, label: "0x10040000 (heap)" },
    { value: 0x7fffeffc, label: "0x7fffeffc (stack pointer)" },
    { value: 0x90000000, label: "0x90000000 (.kdata)" },
    { value: 0xffff0000, label: "0xffff0000 (MMIO)" }
  ];

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

    const lbl = labels.get(token.toLowerCase());
    if (Number.isFinite(lbl)) return lbl >>> 0;

    const immediate = parseImmediate(token);
    if (Number.isFinite(immediate)) {
      if (Math.abs(immediate) < 0x10000) return (((rowAddress + 4) | 0) + ((immediate | 0) << 2)) >>> 0;
      return immediate >>> 0;
    }
    return null;
  }

  function colorForCount(count) {
    let selected = COLOR_SCALE[0].color;
    COLOR_SCALE.forEach((step) => {
      if (count >= step.count) selected = step.color;
    });
    return selected;
  }

  host.register({
    id: "memory-reference-visualization",
    label: "Memory Reference Visualization",
    create(ctx) {
      const shell = ctx.createToolWindowShell("memory-reference-visualization", "Memory Reference Visualization, Version 1.0", 980, 860, `
        <div class="mv-tool">
          <h2 class="mv-title">Visualizing memory reference patterns</h2>
          <div class="mv-main">
            <div class="mv-controls">
              <label>Words per unit<select data-mv="words"></select></label>
              <label>Unit pixel width<select data-mv="uw"></select></label>
              <label>Unit pixel height<select data-mv="uh"></select></label>
              <label>Display width (px)<select data-mv="dw"></select></label>
              <label>Display height (px)<select data-mv="dh"></select></label>
              <label>Display base address<select data-mv="base"></select></label>
              <label><input type="checkbox" data-mv="hash" checked> Draw hash marks</label>
              <div class="mv-scale" data-mv="scale"></div>
            </div>
            <div class="mv-canvas-wrap"><canvas class="mv-canvas" data-mv="canvas"></canvas></div>
          </div>
          <div class="mv-footer">
            <button class="tool-btn" data-mv="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-mv="reset" type="button">Reset</button>
            <button class="tool-btn" data-mv="help" type="button">Help</button>
            <button class="tool-btn" data-mv="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const canvas = root.querySelector("[data-mv='canvas']");
      const context = canvas.getContext("2d", { alpha: false });
      const wordsSelect = root.querySelector("[data-mv='words']");
      const unitWSelect = root.querySelector("[data-mv='uw']");
      const unitHSelect = root.querySelector("[data-mv='uh']");
      const dispWSelect = root.querySelector("[data-mv='dw']");
      const dispHSelect = root.querySelector("[data-mv='dh']");
      const baseSelect = root.querySelector("[data-mv='base']");
      const hashCheck = root.querySelector("[data-mv='hash']");
      const scaleBox = root.querySelector("[data-mv='scale']");
      const connectButton = root.querySelector("[data-mv='connect']");
      const resetButton = root.querySelector("[data-mv='reset']");
      const helpButton = root.querySelector("[data-mv='help']");
      const closeButton = root.querySelector("[data-mv='close']");

      let connected = false;
      let lastSnapshot = null;
      let wordsPerUnit = 1;
      let unitPixelWidth = 16;
      let unitPixelHeight = 16;
      let displayWidth = 256;
      let displayHeight = 256;
      let baseAddress = 0x10010000 >>> 0;
      let counts = new Map();

      function fillOptions(control, values, current) {
        control.innerHTML = values.map((value) => `<option value="${value}"${value === current ? " selected" : ""}>${value}</option>`).join("");
      }

      function fillBaseOptions() {
        baseSelect.innerHTML = BASE_OPTIONS.map((option) => `<option value="${option.value}"${option.value === baseAddress ? " selected" : ""}>${option.label}</option>`).join("");
      }

      function grid() {
        const cols = Math.max(1, Math.floor(displayWidth / unitPixelWidth));
        const rows = Math.max(1, Math.floor(displayHeight / unitPixelHeight));
        return { cols, rows, units: cols * rows };
      }

      function updateScaleLegend() {
        const rows = COLOR_SCALE.map((step) => `${step.count.toString().padStart(4, " ")} -> ${step.color}`).join("\n");
        scaleBox.textContent = `Color scale (count -> color)\n${rows}\nBase: 0x${baseAddress.toString(16).padStart(8, "0")}\nWords/unit: ${wordsPerUnit}`;
      }

      function clearCanvas() {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      function render() {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        clearCanvas();

        const g = grid();
        for (let unitIndex = 0; unitIndex < g.units; unitIndex += 1) {
          const count = counts.get(unitIndex) ?? 0;
          const col = unitIndex % g.cols;
          const row = Math.floor(unitIndex / g.cols);
          context.fillStyle = colorForCount(count);
          context.fillRect(col * unitPixelWidth, row * unitPixelHeight, unitPixelWidth, unitPixelHeight);

          if (hashCheck.checked) {
            context.strokeStyle = "rgba(255,255,255,0.08)";
            context.strokeRect(col * unitPixelWidth + 0.5, row * unitPixelHeight + 0.5, unitPixelWidth, unitPixelHeight);
          }
        }

        updateScaleLegend();
      }

      function resetCounts() {
        counts = new Map();
        render();
      }

      function reconfigure() {
        wordsPerUnit = Number.parseInt(wordsSelect.value, 10) || 1;
        unitPixelWidth = Number.parseInt(unitWSelect.value, 10) || 16;
        unitPixelHeight = Number.parseInt(unitHSelect.value, 10) || 16;
        displayWidth = Number.parseInt(dispWSelect.value, 10) || 256;
        displayHeight = Number.parseInt(dispHSelect.value, 10) || 256;
        baseAddress = (Number.parseInt(baseSelect.value, 10) || 0x10010000) >>> 0;
        render();
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

        return address >>> 0;
      }

      function incrementAddress(address) {
        const g = grid();
        const totalWords = g.units * wordsPerUnit;
        const deltaBytes = ((address >>> 0) - (baseAddress >>> 0)) >>> 0;
        const wordOffset = Math.floor(deltaBytes / 4);
        if (!Number.isFinite(wordOffset) || wordOffset < 0 || wordOffset >= totalWords) return;

        const unitIndex = Math.floor(wordOffset / wordsPerUnit);
        counts.set(unitIndex, (counts.get(unitIndex) ?? 0) + 1);
        render();
      }

      fillOptions(wordsSelect, [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048], wordsPerUnit);
      fillOptions(unitWSelect, [1, 2, 4, 8, 16, 32], unitPixelWidth);
      fillOptions(unitHSelect, [1, 2, 4, 8, 16, 32], unitPixelHeight);
      fillOptions(dispWSelect, [64, 128, 256, 512, 1024], displayWidth);
      fillOptions(dispHSelect, [64, 128, 256, 512, 1024], displayHeight);
      fillBaseOptions();

      [wordsSelect, unitWSelect, unitHSelect, dispWSelect, dispHSelect, baseSelect, hashCheck]
        .forEach((control) => control.addEventListener("change", reconfigure));

      connectButton.addEventListener("click", () => {
        connected = !connected;
        connectButton.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
      });

      resetButton.addEventListener("click", resetCounts);

      helpButton.addEventListener("click", () => {
        ctx.messagesPane.postMars("[tool] Memory Reference Visualization: each memory load/store increments the visual unit containing that address.");
      });

      closeButton.addEventListener("click", shell.close);

      render();

      return {
        open: shell.open,
        close: shell.close,
        onSnapshot(snapshot) {
          const previous = lastSnapshot;
          lastSnapshot = snapshot;
          if (!connected || !snapshot || !previous) return;
          if ((snapshot.steps | 0) <= (previous.steps | 0)) return;

          const address = extractMemoryAccess(previous);
          if (Number.isFinite(address)) incrementAddress(address >>> 0);
        }
      };
    }
  });
})();
