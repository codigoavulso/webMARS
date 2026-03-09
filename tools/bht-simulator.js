(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-bht-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .bht-tool { display:flex; flex-direction:column; gap:8px; height:100%; padding:8px; box-sizing:border-box; font: 12px "Segoe UI", Tahoma, sans-serif; }
      .bht-tool h2 { margin:0; text-align:center; font-size:42px; line-height:1; letter-spacing:0.5px; color:#1f2f44; }
      .bht-row { display:flex; gap:8px; align-items:center; }
      .bht-row label { font-weight:600; display:flex; align-items:center; gap:6px; }
      .bht-row select { min-width:76px; }
      .bht-main { display:grid; grid-template-columns: 130px 1fr; gap:10px; min-height:0; flex:1; }
      .bht-info { display:flex; flex-direction:column; gap:8px; }
      .bht-info label { font-weight:700; color:#22334c; }
      .bht-info input { width:100%; box-sizing:border-box; padding:3px 4px; border:1px solid #9db0c7; background:#f7fbff; font-family:Consolas, monospace; }
      .bht-table-wrap { border:1px solid #9db0c7; background:#f8fbff; overflow:auto; min-height:0; }
      .bht-table { width:100%; border-collapse:collapse; table-layout:fixed; font: 11px "Segoe UI", sans-serif; }
      .bht-table th, .bht-table td { border:1px solid #9db0c7; padding:3px 5px; text-align:center; }
      .bht-table th { background:#e8f0fb; font-weight:700; }
      .bht-table tbody tr.active { outline:2px solid #f3d23c; outline-offset:-2px; }
      .bht-table tbody tr.ok { background:#d6f2c8; }
      .bht-table tbody tr.bad { background:#f6c9c9; }
      .bht-log-wrap { border:1px solid #9db0c7; min-height:110px; }
      .bht-log-wrap .title { font-weight:700; padding:3px 6px; border-bottom:1px solid #9db0c7; background:#eef3f8; }
      .bht-log { width:100%; height:100%; min-height:86px; border:0; resize:none; padding:6px; box-sizing:border-box; font-family:Consolas, monospace; font-size:11px; background:#fff; }
      .bht-footer { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:auto; }
      .bht-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#23334a; }
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

  function parseImmediate(token) {
    if (typeof token !== "string") return null;
    const text = token.trim();
    if (!text) return null;
    if (/^[+-]?\d+$/.test(text)) return Number.parseInt(text, 10) | 0;
    if (/^[+-]?0x[0-9a-f]+$/i.test(text)) return Number.parseInt(text, 16) | 0;
    return null;
  }

  function buildRegisters(snapshot) {
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

  function buildLabels(snapshot) {
    const map = new Map();
    (snapshot?.labels || []).forEach((label) => {
      map.set(String(label.label || "").toLowerCase(), label.address >>> 0);
    });
    return map;
  }

  function resolveRegister(token, registers) {
    if (token == null) return 0;
    const normalized = String(token).toLowerCase().replace(/[\s,]/g, "");
    if (registers.has(normalized)) return registers.get(normalized) | 0;
    if (normalized.startsWith("$") && registers.has(normalized.slice(1))) return registers.get(normalized.slice(1)) | 0;
    return 0;
  }

  function computeBranchTarget(token, rowAddress, labels) {
    const normalized = String(token || "").trim().toLowerCase();
    if (labels.has(normalized)) return labels.get(normalized) >>> 0;
    const immediate = parseImmediate(normalized);
    if (Number.isFinite(immediate)) return (((rowAddress + 4) | 0) + ((immediate | 0) << 2)) >>> 0;
    return null;
  }

  function evaluateBranch(opcode, args, registers) {
    const rs = resolveRegister(args[0], registers);
    const rt = resolveRegister(args[1], registers);

    switch (opcode) {
      case "beq":
      case "beql":
        return rs === rt;
      case "bne":
      case "bnel":
        return rs !== rt;
      case "bgtz":
      case "bgtzl":
        return rs > 0;
      case "blez":
      case "blezl":
        return rs <= 0;
      case "bltz":
      case "bltzl":
      case "bltzal":
      case "bltzall":
        return rs < 0;
      case "bgez":
      case "bgezl":
      case "bgezal":
      case "bgezall":
        return rs >= 0;
      default:
        return false;
    }
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
      let lastSnapshot = null;
      let activeIndex = null;
      let activeClass = "";

      function appendLog(line) {
        if (!line) return;
        logArea.value += `${line}\n`;
        logArea.scrollTop = logArea.scrollHeight;
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

      function clearInstructionInfo() {
        instructionField.value = "";
        addressField.value = "";
        indexField.value = "";
        activeIndex = null;
        activeClass = "";
        renderTable();
      }

      function resetModel() {
        entries = Number.parseInt(entriesSelect.value, 10) || 16;
        historySize = Number.parseInt(historySelect.value, 10) || 1;
        initTake = initSelect.value === "t";
        model = Array.from({ length: entries }, () => new BHTEntry(historySize, initTake));
        logArea.value = "";
        clearInstructionInfo();
      }

      function processInstruction(prevSnapshot, nextSnapshot) {
        const executedRow = (prevSnapshot?.textRows || []).find((row) => row.isCurrent);
        if (!executedRow) return;

        const tokens = parseTokens(executedRow.basic || executedRow.source);
        if (!tokens.length) return;

        const opcode = tokens[0].toLowerCase();
        if (!BRANCH_OPS.has(opcode)) {
          clearInstructionInfo();
          return;
        }

        const args = tokens.slice(1);
        const registers = buildRegisters(prevSnapshot);
        const labels = buildLabels(nextSnapshot || prevSnapshot);
        const branchTaken = evaluateBranch(opcode, args, registers);
        const targetToken = args[args.length - 1];
        const targetAddress = computeBranchTarget(targetToken, executedRow.address >>> 0, labels);

        const idx = ((executedRow.address >>> 2) % entries) >>> 0;
        const entry = model[idx];
        const prediction = entry.prediction;
        const correct = prediction === branchTaken;

        instructionField.value = executedRow.basic || executedRow.source || opcode;
        addressField.value = toHex32(executedRow.address >>> 0);
        indexField.value = String(idx);

        activeIndex = idx;
        activeClass = "";
        renderTable();

        appendLog(`instruction ${(executedRow.basic || executedRow.source || opcode).trim()} at address ${toHex32(executedRow.address >>> 0)}, maps to index ${idx}`);
        if (Number.isFinite(targetAddress)) appendLog(`branches to address ${toHex32(targetAddress >>> 0)}`);
        appendLog(`prediction is: ${prediction ? "take" : "do not take"}...`);

        entry.update(branchTaken);
        activeClass = correct ? "ok" : "bad";
        renderTable();

        appendLog(`branch ${branchTaken ? "taken" : "not taken"}, prediction was ${correct ? "correct" : "incorrect"}`);
        appendLog("");
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
        lastSnapshot = null;
      });

      closeButton.addEventListener("click", shell.close);

      resetModel();

      return {
        open: shell.open,
        close: shell.close,
        onSnapshot(snapshot) {
          if (!connected || !snapshot) {
            lastSnapshot = snapshot;
            return;
          }

          const previous = lastSnapshot;
          lastSnapshot = snapshot;

          if (!previous) return;
          if ((snapshot.steps | 0) <= (previous.steps | 0)) return;

          processInstruction(previous, snapshot);
        }
      };
    }
  });
})();
