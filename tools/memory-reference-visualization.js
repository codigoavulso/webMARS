(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-memory-viz-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .mv-tool { display:flex; flex-direction:column; gap:8px; height:100%; box-sizing:border-box; padding:8px; font:12px "Segoe UI", Tahoma, sans-serif; }
      .mv-title { margin:0; text-align:center; font-size:40px; color:var(--text-heading); line-height:1; }
      .mv-main { display:grid; grid-template-columns:280px 1fr; gap:10px; min-height:0; flex:1; }
      .mv-controls { border:1px solid var(--line); background:var(--surface-raised); padding:8px; display:flex; flex-direction:column; gap:8px; overflow:auto; }
      .mv-controls label { font-weight:700; display:flex; flex-direction:column; gap:4px; }
      .mv-canvas-wrap { border:1px solid var(--line); background:var(--surface); overflow:auto; padding:6px; }
      .mv-canvas { display:block; image-rendering:pixelated; }
      .mv-scale { border:1px solid var(--line); background:var(--surface); padding:6px; font-family:Consolas, monospace; }
      .mv-footer { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .mv-footer .ctrl { flex:1; text-align:center; font-weight:700; color:var(--text); }
      .mv-footer .tool-btn { min-width:130px; }
    `;
    document.head.appendChild(style);
  }

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
      let wordsPerUnit = 1;
      let unitPixelWidth = 16;
      let unitPixelHeight = 16;
      let displayWidth = 256;
      let displayHeight = 256;
      let baseAddress = 0x10010000 >>> 0;
      let counts = new Map();
      const history = ctx.createToolDeltaHistory({
        applyInverse(delta) {
          if (delta?.counts instanceof Map) {
            delta.counts.forEach((previous, unitIndex) => {
              if (previous == null) counts.delete(unitIndex);
              else counts.set(unitIndex, previous | 0);
            });
          }
          render();
        }
      });

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
        history.clear(Number(ctx.engine?.steps) | 0);
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

      function incrementUnit(unitIndex, amount, delta) {
        if (!Number.isFinite(unitIndex) || unitIndex < 0 || amount <= 0) return;
        if (delta?.counts instanceof Map && !delta.counts.has(unitIndex)) {
          delta.counts.set(unitIndex, counts.has(unitIndex) ? counts.get(unitIndex) : null);
        }
        counts.set(unitIndex, (counts.get(unitIndex) ?? 0) + amount);
      }

      function incrementAccess(access, step, shouldRender = true, retainHistory = true) {
        const g = grid();
        const totalWords = g.units * wordsPerUnit;
        const address = access?.address >>> 0;
        const accessCount = Math.max(1, Number(access?.accessCount) | 0);
        const unitSize = Math.max(1, Number(access?.unitSize) | 0);
        const visualUnitBytes = wordsPerUnit * 4;
        const visibleStart = baseAddress >>> 0;
        const visibleEnd = visibleStart + (totalWords * 4);
        const delta = retainHistory ? history.ensure(step, () => ({ counts: new Map() })) : null;

        if (accessCount === 1) {
          const deltaBytes = address - visibleStart;
          if (deltaBytes >= 0 && address < visibleEnd) {
            incrementUnit(Math.floor(deltaBytes / visualUnitBytes), 1, delta);
          }
        } else {
          const accessEnd = address + ((accessCount - 1) * unitSize);
          const firstVisibleAccess = Math.max(0, Math.ceil((visibleStart - address) / unitSize));
          const lastVisibleAccess = Math.min(accessCount - 1, Math.floor(((visibleEnd - 1) - address) / unitSize));
          if (accessEnd >= visibleStart && address < visibleEnd && firstVisibleAccess <= lastVisibleAccess) {
            const firstUnit = Math.floor(((address + (firstVisibleAccess * unitSize)) - visibleStart) / visualUnitBytes);
            const lastUnit = Math.floor(((address + (lastVisibleAccess * unitSize)) - visibleStart) / visualUnitBytes);
            for (let unitIndex = firstUnit; unitIndex <= lastUnit; unitIndex += 1) {
              const unitStart = visibleStart + (unitIndex * visualUnitBytes);
              const unitEnd = unitStart + visualUnitBytes;
              const first = Math.max(firstVisibleAccess, Math.ceil((unitStart - address) / unitSize));
              const last = Math.min(lastVisibleAccess, Math.floor(((unitEnd - 1) - address) / unitSize));
              incrementUnit(unitIndex, Math.max(0, last - first + 1), delta);
            }
          }
        }
        if (shouldRender) render();
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
        isConnected: () => connected,
        open: shell.open,
        close: shell.close,
        onRuntimeEvent(event, delivery = {}) {
          if (!connected || !event) return;
          if (event.type === "backstep") {
            history.rewind(event.stepAfter | 0);
            return;
          }
          if (event.type !== "instruction") return;
          const accesses = Array.isArray(event.memoryAccesses) ? event.memoryAccesses : [];
          accesses.forEach((access, index) => {
            if (Number.isFinite(access?.address)) {
              incrementAccess(
                access,
                event.stepAfter | 0,
                false,
                delivery.retainHistory !== false
              );
            }
          });
          history.pruneBefore(event.historyStartStep | 0);
        },
        onRuntimeBatchEnd() {
          if (connected) render();
        },
        onBackstep(event) {
          if (!connected || !event) return;
          history.rewind(event.stepAfter | 0);
          render();
        }
      };
    }
  });
})();
