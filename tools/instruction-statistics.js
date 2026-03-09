(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-instruction-stats-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .istats-tool { display:flex; flex-direction:column; gap:10px; height:100%; padding:10px; box-sizing:border-box; font:12px "Segoe UI", Tahoma, sans-serif; }
      .istats-grid { display:grid; grid-template-columns:auto 1fr 1fr; gap:8px; align-items:center; }
      .istats-grid label { font-weight:700; text-align:right; color:#20324a; }
      .istats-grid input { width:100%; box-sizing:border-box; border:1px solid #9db0c8; background:#f7fbff; padding:4px 6px; font-family:Consolas, monospace; }
      .istats-bar { border:1px solid #9db0c8; height:24px; position:relative; background:linear-gradient(#f7f9fc, #e2eaf4); }
      .istats-fill { position:absolute; left:0; top:0; bottom:0; background:linear-gradient(90deg, #88b5ff, #5d8edd); }
      .istats-bar span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:700; color:#446fb1; }
      .istats-footer { margin-top:auto; display:flex; gap:10px; align-items:center; justify-content:space-between; }
      .istats-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#22334a; }
      .istats-footer .tool-btn { min-width:130px; }
    `;
    document.head.appendChild(style);
  }

  const BRANCH_OPS = new Set([
    "beq", "bne", "blez", "bgtz", "beql", "bnel", "blezl", "bgtzl",
    "bltz", "bgez", "bltzl", "bgezl", "bltzal", "bgezal", "bltzall", "bgezall", "bc1f", "bc1t"
  ]);
  const JUMP_OPS = new Set(["j", "jal", "jr", "jalr"]);
  const MEMORY_OPS = new Set([
    "lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "sb", "sh", "sw", "swl", "swr", "ll", "sc",
    "lwc1", "swc1", "ldc1", "sdc1"
  ]);
  const ALU_OPS = new Set([
    "add", "addu", "sub", "subu", "addi", "addiu", "mul", "mult", "multu", "div", "divu", "madd", "maddu", "msub", "msubu",
    "and", "andi", "or", "ori", "xor", "xori", "nor", "slt", "sltu", "slti", "sltiu", "lui",
    "sll", "srl", "sra", "sllv", "srlv", "srav", "clz", "clo",
    "mfhi", "mthi", "mflo", "mtlo",
    "add.s", "sub.s", "mul.s", "div.s", "add.d", "sub.d", "mul.d", "div.d",
    "mov.s", "mov.d", "movf", "movt", "movf.s", "movt.s", "movf.d", "movt.d", "movn", "movz", "movn.s", "movz.s", "movn.d", "movz.d",
    "neg.s", "neg.d", "abs.s", "abs.d", "sqrt.s", "sqrt.d",
    "c.eq.s", "c.lt.s", "c.le.s", "c.eq.d", "c.lt.d", "c.le.d",
    "cvt.s.d", "cvt.s.w", "cvt.d.s", "cvt.d.w", "cvt.w.s", "cvt.w.d", "round.w.s", "round.w.d", "trunc.w.s", "trunc.w.d", "ceil.w.s", "ceil.w.d", "floor.w.s", "floor.w.d"
  ]);

  function parseTokens(statement) {
    if (!statement) return [];
    const cleaned = String(statement).split("#")[0].trim();
    if (!cleaned) return [];
    return cleaned.split(/[\s,]+/).filter(Boolean);
  }

  function classify(opcode) {
    const op = String(opcode || "").toLowerCase();
    if (!op) return "Other";
    if (ALU_OPS.has(op)) return "ALU";
    if (JUMP_OPS.has(op)) return "Jump";
    if (BRANCH_OPS.has(op)) return "Branch";
    if (MEMORY_OPS.has(op)) return "Memory";
    return "Other";
  }

  host.register({
    id: "instruction-statistics",
    label: "Instruction Statistics",
    create(ctx) {
      const shell = ctx.createToolWindowShell("instruction-statistics", "Instruction Statistics, Version 1.0 (Ingo Kofler)", 580, 430, `
        <div class="istats-tool">
          <div class="istats-grid">
            <label>Total:</label>
            <input data-is="total" readonly>
            <div></div>
            <label>ALU:</label>
            <input data-is="alu" readonly>
            <div class="istats-bar"><div class="istats-fill" data-is-fill="alu"></div><span data-is-pct="alu">0%</span></div>
            <label>Jump:</label>
            <input data-is="jump" readonly>
            <div class="istats-bar"><div class="istats-fill" data-is-fill="jump"></div><span data-is-pct="jump">0%</span></div>
            <label>Branch:</label>
            <input data-is="branch" readonly>
            <div class="istats-bar"><div class="istats-fill" data-is-fill="branch"></div><span data-is-pct="branch">0%</span></div>
            <label>Memory:</label>
            <input data-is="memory" readonly>
            <div class="istats-bar"><div class="istats-fill" data-is-fill="memory"></div><span data-is-pct="memory">0%</span></div>
            <label>Other:</label>
            <input data-is="other" readonly>
            <div class="istats-bar"><div class="istats-fill" data-is-fill="other"></div><span data-is-pct="other">0%</span></div>
          </div>
          <div class="istats-footer">
            <button class="tool-btn" data-is="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-is="reset" type="button">Reset</button>
            <button class="tool-btn" data-is="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const fields = {
        total: root.querySelector("[data-is='total']"),
        ALU: root.querySelector("[data-is='alu']"),
        Jump: root.querySelector("[data-is='jump']"),
        Branch: root.querySelector("[data-is='branch']"),
        Memory: root.querySelector("[data-is='memory']"),
        Other: root.querySelector("[data-is='other']")
      };
      const bars = {
        ALU: root.querySelector("[data-is-fill='alu']"),
        Jump: root.querySelector("[data-is-fill='jump']"),
        Branch: root.querySelector("[data-is-fill='branch']"),
        Memory: root.querySelector("[data-is-fill='memory']"),
        Other: root.querySelector("[data-is-fill='other']")
      };
      const pcts = {
        ALU: root.querySelector("[data-is-pct='alu']"),
        Jump: root.querySelector("[data-is-pct='jump']"),
        Branch: root.querySelector("[data-is-pct='branch']"),
        Memory: root.querySelector("[data-is-pct='memory']"),
        Other: root.querySelector("[data-is-pct='other']")
      };

      let connected = false;
      let total = 0;
      let lastAddress = null;
      let lastSnapshot = null;
      const counters = { ALU: 0, Jump: 0, Branch: 0, Memory: 0, Other: 0 };

      function render() {
        fields.total.value = String(total);
        const denom = total > 0 ? total : 1;
        Object.keys(counters).forEach((category) => {
          const value = counters[category];
          fields[category].value = String(value);
          const pct = total === 0 ? 0 : Math.round((value * 100) / denom);
          bars[category].style.width = `${pct}%`;
          pcts[category].textContent = `${pct}%`;
        });
      }

      function resetCounters() {
        total = 0;
        lastAddress = null;
        Object.keys(counters).forEach((category) => { counters[category] = 0; });
        render();
      }

      function processStep(previousSnapshot) {
        const row = (previousSnapshot?.textRows || []).find((entry) => entry.isCurrent);
        if (!row) return;
        const addr = row.address >>> 0;
        if (addr === lastAddress) return;
        lastAddress = addr;
        const tokens = parseTokens(row.basic || row.source);
        const category = classify(tokens[0]);
        total += 1;
        counters[category] += 1;
        render();
      }

      root.querySelector("[data-is='connect']").addEventListener("click", (event) => {
        connected = !connected;
        event.currentTarget.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
      });
      root.querySelector("[data-is='reset']").addEventListener("click", resetCounters);
      root.querySelector("[data-is='close']").addEventListener("click", shell.close);

      resetCounters();

      return {
        open: shell.open,
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
