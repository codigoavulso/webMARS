(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-bht-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .bht-tool { display:flex; flex-direction:column; gap:8px; height:100%; padding:8px; box-sizing:border-box; font: 12px "Segoe UI", Tahoma, sans-serif; }
      .bht-tool h2 { margin:0; text-align:center; font-size:42px; line-height:1; letter-spacing:0.5px; color:var(--text-heading); }
      .bht-row { display:flex; gap:8px; align-items:center; }
      .bht-row label { font-weight:600; display:flex; align-items:center; gap:6px; }
      .bht-row select { min-width:76px; }
      .bht-main { display:grid; grid-template-columns: 130px 1fr; gap:10px; min-height:0; flex:1; }
      .bht-info { display:flex; flex-direction:column; gap:8px; }
      .bht-info label { font-weight:700; color:var(--text); }
      .bht-info input { width:100%; box-sizing:border-box; padding:3px 4px; border:1px solid var(--line); background:var(--surface-raised); font-family:Consolas, monospace; }
      .bht-table-wrap { border:1px solid var(--line); background:var(--surface-raised); overflow:auto; min-height:0; }
      .bht-table { width:100%; border-collapse:collapse; table-layout:fixed; font: 11px "Segoe UI", sans-serif; }
      .bht-table th, .bht-table td { border:1px solid var(--line); padding:3px 5px; text-align:center; }
      .bht-table th { background:var(--surface-inset); font-weight:700; }
      .bht-table tbody tr.active { outline:2px solid var(--row-active-ring); outline-offset:-2px; }
      .bht-table tbody tr.ok { background:var(--row-good); }
      .bht-table tbody tr.bad { background:var(--row-bad); }
      .bht-log-wrap { border:1px solid var(--line); min-height:110px; }
      .bht-log-wrap .title { font-weight:700; padding:3px 6px; border-bottom:1px solid var(--line); background:var(--window-bg); }
      .bht-log { width:100%; height:100%; min-height:86px; border:0; resize:none; padding:6px; box-sizing:border-box; font-family:Consolas, monospace; font-size:11px; background:var(--surface); }
      .bht-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:auto; }
      .bht-footer .ctrl { flex:1; text-align:center; font-weight:700; color:var(--text); }
      .bht-footer .tool-btn { min-width:130px; }
    `;
    document.head.appendChild(style);
  }

  const BRANCH_OPS = new Set([
    "beq", "bne", "bgtz", "blez", "bltz", "bgez", "bgezal", "bltzal",
    "beql", "bnel", "bgtzl", "blezl", "bltzl", "bgezl", "bltzall", "bgezall"
  ]);

  function toHex32(value) {
    return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
  }

  function parseTokens(statement) {
    if (!statement) return [];
    const cleaned = String(statement).split("#")[0].trim();
    if (!cleaned) return [];
    return cleaned.split(/[\s,]+/).filter(Boolean);
  }

  class BHTEntry {
    constructor(historySize, initTake) {
      this.prediction = Boolean(initTake);
      this.history = Array.from({ length: historySize }, () => Boolean(initTake));
      this.correct = 0;
      this.incorrect = 0;
    }

    update(branchTaken) {
      for (let i = 0; i < this.history.length - 1; i += 1) {
        this.history[i] = this.history[i + 1];
      }
      this.history[this.history.length - 1] = Boolean(branchTaken);

      if (branchTaken === this.prediction) {
        this.correct += 1;
        return;
      }

      this.incorrect += 1;
      const allMatch = this.history.every((entry) => entry === Boolean(branchTaken));
      if (allMatch) this.prediction = !this.prediction;
    }

    precision() {
      const total = this.correct + this.incorrect;
      return total === 0 ? 0 : (this.correct * 100) / total;
    }

    historyText() {
      return this.history.map((v) => (v ? "T" : "NT")).join(", ");
    }

    predictionText() {
      return this.prediction ? "TAKE" : "NOT TAKE";
    }
  }

  host.register({
    id: "bht-simulator",
    label: "BHT Simulator",
    create(ctx) {
      const shell = ctx.createToolWindowShell("bht-simulator", "BHT Simulator, Version 1.0 (Ingo Kofler)", 900, 760, `
        <div class="bht-tool">
          <h2>Branch History Table Simulator</h2>
          <div class="bht-row">
            <label># of BHT entries
              <select data-bht="entries">
                <option value="8">8</option>
                <option value="16" selected>16</option>
                <option value="32">32</option>
              </select>
            </label>
            <label>BHT history size
              <select data-bht="history">
                <option value="1" selected>1</option>
                <option value="2">2</option>
              </select>
            </label>
            <label>Initial value
              <select data-bht="init">
                <option value="nt" selected>NOT TAKE</option>
                <option value="t">TAKE</option>
              </select>
            </label>
          </div>
          <div class="bht-main">
            <div class="bht-info">
              <label>Instruction</label>
              <input data-bht="instruction" readonly>
              <label>@ Address</label>
              <input data-bht="address" readonly>
              <label>-&gt; Index</label>
              <input data-bht="index" readonly>
            </div>
            <div class="bht-table-wrap">
              <table class="bht-table">
                <thead>
                  <tr><th>Index</th><th>History</th><th>Prediction</th><th>Correct</th><th>Incorrect</th><th>Precision</th></tr>
                </thead>
                <tbody data-bht="rows"></tbody>
              </table>
            </div>
          </div>
          <div class="bht-log-wrap">
            <div class="title">Log</div>
            <textarea class="bht-log" data-bht="log" readonly></textarea>
          </div>
          <div class="bht-footer">
            <button class="tool-btn" data-bht="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-bht="reset" type="button">Reset</button>
            <button class="tool-btn" data-bht="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const entriesSelect = root.querySelector("[data-bht='entries']");
      const historySelect = root.querySelector("[data-bht='history']");
      const initSelect = root.querySelector("[data-bht='init']");
      const instructionField = root.querySelector("[data-bht='instruction']");
      const addressField = root.querySelector("[data-bht='address']");
      const indexField = root.querySelector("[data-bht='index']");
      const rowsBody = root.querySelector("[data-bht='rows']");
      const logArea = root.querySelector("[data-bht='log']");
      const connectButton = root.querySelector("[data-bht='connect']");
      const resetButton = root.querySelector("[data-bht='reset']");
      const closeButton = root.querySelector("[data-bht='close']");

      let connected = false;
      let entries = 16;
      let historySize = 1;
      let initTake = false;
      let model = [];
      let activeIndex = null;
      let activeClass = "";
      let logLines = [];
      let activeHistoryDelta = null;
      let currentInstruction = "";
      let currentAddress = "";
      let currentIndex = "";
      const MAX_LOG_LINES = 5000;
      const history = ctx.createToolDeltaHistory({
        applyInverse(delta) {
          if (!delta) return;
          if (delta.entry && delta.entryIndex >= 0 && delta.entryIndex < model.length) {
            const entry = model[delta.entryIndex];
            entry.prediction = delta.entry.prediction === true;
            entry.history = Array.isArray(delta.entry.history) ? [...delta.entry.history] : [];
            entry.correct = delta.entry.correct | 0;
            entry.incorrect = delta.entry.incorrect | 0;
          }
          if (Array.isArray(delta.removedLog) && delta.removedLog.length) {
            logLines = [...delta.removedLog, ...logLines];
          }
          logLines.length = Math.min(logLines.length, Math.max(0, delta.logLength | 0));
          currentInstruction = String(delta.instruction || "");
          currentAddress = String(delta.address || "");
          currentIndex = String(delta.index || "");
          activeIndex = Number.isFinite(delta.activeIndex) ? (delta.activeIndex | 0) : null;
          activeClass = String(delta.activeClass || "");
          renderInstructionInfo();
          flushLog();
          renderTable();
        }
      });

      function flushLog() {
        logArea.value = logLines.length ? `${logLines.join("\n")}\n` : "";
        logArea.scrollTop = logArea.scrollHeight;
      }

      function appendLog(line) {
        if (!line) return;
        logLines.push(String(line));
        if (logLines.length > MAX_LOG_LINES) {
          const removed = logLines.splice(0, logLines.length - MAX_LOG_LINES);
          if (activeHistoryDelta && Array.isArray(activeHistoryDelta.removedLog)) {
            activeHistoryDelta.removedLog.push(...removed);
          }
        }
      }

      function renderTable() {
        rowsBody.innerHTML = model.map((entry, index) => {
          const classes = [];
          if (index === activeIndex) {
            classes.push("active");
            if (activeClass) classes.push(activeClass);
          }
          return `<tr class="${classes.join(" ")}">
            <td>${index}</td>
            <td>${entry.historyText()}</td>
            <td>${entry.predictionText()}</td>
            <td>${entry.correct}</td>
            <td>${entry.incorrect}</td>
            <td>${entry.precision().toFixed(2).replace(".", ",")}</td>
          </tr>`;
        }).join("");
      }

      function renderInstructionInfo() {
        instructionField.value = currentInstruction;
        addressField.value = currentAddress;
        indexField.value = currentIndex;
      }

      function clearInstructionInfo(shouldRender = true) {
        currentInstruction = "";
        currentAddress = "";
        currentIndex = "";
        activeIndex = null;
        activeClass = "";
        if (shouldRender) {
          renderInstructionInfo();
          renderTable();
        }
      }

      function resetModel() {
        history.clear(Number(ctx.engine?.steps) | 0);
        entries = Number.parseInt(entriesSelect.value, 10) || 16;
        historySize = Number.parseInt(historySelect.value, 10) || 1;
        initTake = initSelect.value === "t";
        model = Array.from({ length: entries }, () => new BHTEntry(historySize, initTake));
        logLines = [];
        flushLog();
        clearInstructionInfo();
      }

      function processRuntimeInstruction(event, shouldRender = true, retainHistory = true) {
        const delta = retainHistory
          ? {
              instruction: currentInstruction,
              address: currentAddress,
              index: currentIndex,
              activeIndex,
              activeClass,
              logLength: logLines.length,
              removedLog: [],
              entryIndex: -1,
              entry: null
            }
          : null;
        if (delta) history.record(event.stepAfter | 0, delta);
        activeHistoryDelta = delta;
        const statement = String(event?.executedInstruction || "").trim();
        const tokens = parseTokens(statement);
        const opcode = String(tokens[0] || "").toLowerCase();
        if (!BRANCH_OPS.has(opcode)) {
          clearInstructionInfo(shouldRender);
          activeHistoryDelta = null;
          if (shouldRender) flushLog();
          return;
        }

        const address = event.executedAddress >>> 0;
        const branchTaken = Number.isFinite(event.controlTransferTarget);
        const targetAddress = branchTaken ? (event.controlTransferTarget >>> 0) : null;
        const idx = ((address >>> 2) % entries) >>> 0;
        const entry = model[idx];
        delta.entryIndex = idx;
        delta.entry = {
          prediction: entry.prediction,
          history: [...entry.history],
          correct: entry.correct,
          incorrect: entry.incorrect
        };
        const prediction = entry.prediction;
        const correct = prediction === branchTaken;

        currentInstruction = statement || opcode;
        currentAddress = toHex32(address);
        currentIndex = String(idx);
        activeIndex = idx;
        activeClass = "";
        appendLog(`instruction ${statement || opcode} at address ${toHex32(address)}, maps to index ${idx}`);
        if (targetAddress != null) appendLog(`branches to address ${toHex32(targetAddress)}`);
        appendLog(`prediction is: ${prediction ? "take" : "do not take"}...`);
        entry.update(branchTaken);
        activeClass = correct ? "ok" : "bad";
        appendLog(`branch ${branchTaken ? "taken" : "not taken"}, prediction was ${correct ? "correct" : "incorrect"}`);
        appendLog("");
        activeHistoryDelta = null;
        if (shouldRender) {
          renderInstructionInfo();
          flushLog();
          renderTable();
        }
      }

      connectButton.addEventListener("click", () => {
        connected = !connected;
        connectButton.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
        ctx.messagesPane.postMars(`[tool] BHT Simulator ${connected ? "connected" : "disconnected"}.`);
        if (!connected) clearInstructionInfo();
      });

      [entriesSelect, historySelect, initSelect].forEach((input) => {
        input.addEventListener("change", resetModel);
      });

      resetButton.addEventListener("click", () => {
        resetModel();
      });

      closeButton.addEventListener("click", shell.close);

      resetModel();

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
          processRuntimeInstruction(
            event,
            delivery.isLast !== false,
            delivery.retainHistory !== false
          );
          history.pruneBefore(event.historyStartStep | 0);
        },
        onBackstep(event) {
          if (!connected || !event) return;
          history.rewind(event.stepAfter | 0);
          flushLog();
          renderTable();
        }
      };
    }
  });
})();
