(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-instruction-counter-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .icount-tool { display:flex; flex-direction:column; gap:10px; height:100%; padding:10px; box-sizing:border-box; font:12px "Segoe UI", Tahoma, sans-serif; }
      .icount-title { font-size:44px; font-weight:700; letter-spacing:0.5px; color:var(--text-heading); margin:0; }
      .icount-grid { display:grid; grid-template-columns:auto 1fr auto 1fr; align-items:center; gap:8px 10px; }
      .icount-grid label { font-weight:700; text-align:right; color:var(--text); }
      .icount-grid input { width:100%; box-sizing:border-box; padding:4px 6px; border:1px solid var(--line); background:var(--surface-raised); font-family:Consolas, monospace; }
      .icount-bar { width:100%; height:24px; border:1px solid var(--line); background:linear-gradient(var(--surface-muted), var(--surface-strong)); position:relative; overflow:hidden; }
      .icount-fill { position:absolute; left:0; top:0; bottom:0; background:linear-gradient(90deg, var(--bar-hi), var(--bar-lo)); }
      .icount-bar span { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--accent); font-weight:700; }
      .icount-footer { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .icount-footer .ctrl { flex:1; text-align:center; font-weight:700; color:var(--text); }
      .icount-footer .tool-btn { min-width:130px; }

      /* The four-column grid squeezed the percentage bars into a sliver on a
         phone, so they read as empty. Two columns, with each bar on its own
         full-width row under its counter. */
      .desktop-stacked .icount-grid { grid-template-columns:auto 1fr; gap:5px 8px; }
      .desktop-stacked .icount-bar { grid-column:1 / -1; height:20px; }
      .desktop-stacked .icount-footer .tool-btn { min-width:0; flex:1 1 auto; }
    `;
    document.head.appendChild(style);
  }

  const J_OPS = new Set(["j", "jal"]);
  const I_OPS = new Set([
    "addi", "addiu", "andi", "ori", "xori", "slti", "sltiu", "lui",
    "beq", "bne", "blez", "bgtz", "beql", "bnel", "blezl", "bgtzl",
    "bltz", "bgez", "bltzl", "bgezl", "bltzal", "bgezal", "bltzall", "bgezall",
    "lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "sb", "sh", "sw", "swl", "swr", "ll", "sc",
    "lwc1", "swc1", "ldc1", "sdc1", "mfc0", "mtc0", "mfc1", "mtc1"
  ]);

  function t(message, variables = {}) {
    if (typeof translateText === "function") return translateText(message, variables);
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (i18n && typeof i18n.t === "function") return i18n.t(message, variables);
    return String(message ?? "");
  }

  function subscribeLanguageChange(listener) {
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (!i18n || typeof i18n.subscribe !== "function" || typeof listener !== "function") return () => {};
    return i18n.subscribe(listener);
  }

  function classify(opcode) {
    const op = String(opcode || "").toLowerCase();
    if (!op) return "R";
    if (J_OPS.has(op)) return "J";
    if (I_OPS.has(op)) return "I";
    return "R";
  }

  host.register({
    id: "instruction-counter",
    label: "Instruction Counter",
    create(ctx) {
      const shell = ctx.createToolWindowShell("instruction-counter", "Instruction Counter, Version 1.0 (Felipe Lessa)", 650, 470, `
        <div class="icount-tool">
          <h2 class="icount-title">Counting the number of instructions executed</h2>
          <div class="icount-grid">
            <label>Instructions so far:</label><input data-ic="total" readonly>
            <div></div><div></div>
            <label>R-type:</label><input data-ic="r" readonly>
            <div class="icount-bar"><div class="icount-fill" data-ic-fill="r"></div><span data-ic-pct="r">0%</span></div>
            <div></div>
            <label>I-type:</label><input data-ic="i" readonly>
            <div class="icount-bar"><div class="icount-fill" data-ic-fill="i"></div><span data-ic-pct="i">0%</span></div>
            <div></div>
            <label>J-type:</label><input data-ic="j" readonly>
            <div class="icount-bar"><div class="icount-fill" data-ic-fill="j"></div><span data-ic-pct="j">0%</span></div>
            <div></div>
          </div>
          <div class="icount-footer">
            <button class="tool-btn" data-ic="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-ic="reset" type="button">Reset</button>
            <button class="tool-btn" data-ic="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const fields = {
        total: root.querySelector("[data-ic='total']"),
        r: root.querySelector("[data-ic='r']"),
        i: root.querySelector("[data-ic='i']"),
        j: root.querySelector("[data-ic='j']")
      };
      const bars = {
        r: root.querySelector("[data-ic-fill='r']"),
        i: root.querySelector("[data-ic-fill='i']"),
        j: root.querySelector("[data-ic-fill='j']")
      };
      const pcts = {
        r: root.querySelector("[data-ic-pct='r']"),
        i: root.querySelector("[data-ic-pct='i']"),
        j: root.querySelector("[data-ic-pct='j']")
      };

      let connected = false;
      let total = 0;
      let rCount = 0;
      let iCount = 0;
      let jCount = 0;
      const history = ctx.createToolDeltaHistory({
        applyInverse(delta) {
          total = delta.total | 0;
          rCount = delta.rCount | 0;
          iCount = delta.iCount | 0;
          jCount = delta.jCount | 0;
          render();
        }
      });

      function render() {
        fields.total.value = String(total);
        fields.r.value = String(rCount);
        fields.i.value = String(iCount);
        fields.j.value = String(jCount);

        const denom = total > 0 ? total : 1;
        const rp = Math.round((rCount * 100) / denom);
        const ip = Math.round((iCount * 100) / denom);
        const jp = Math.round((jCount * 100) / denom);

        bars.r.style.width = `${rp}%`;
        bars.i.style.width = `${ip}%`;
        bars.j.style.width = `${jp}%`;

        pcts.r.textContent = `${total === 0 ? 0 : rp}%`;
        pcts.i.textContent = `${total === 0 ? 0 : ip}%`;
        pcts.j.textContent = `${total === 0 ? 0 : jp}%`;
      }

      function resetCounters() {
        history.clear(Number(ctx.engine?.steps) | 0);
        total = 0;
        rCount = 0;
        iCount = 0;
        jCount = 0;
        render();
      }

      function processInstruction(opcode, step, shouldRender = true, retainHistory = true) {
        if (retainHistory) history.record(step, { total, rCount, iCount, jCount });
        const category = classify(opcode);

        total += 1;
        if (category === "R") rCount += 1;
        else if (category === "I") iCount += 1;
        else if (category === "J") jCount += 1;
        if (shouldRender) render();
      }

      const connectButton = root.querySelector("[data-ic='connect']");

      // The connect label is rewritten at runtime, so the shell's static-tree
      // pass cannot keep it in the current language on its own.
      function refreshUiText() {
        connectButton.textContent = connected ? t("Disconnect from MIPS") : t("Connect to MIPS");
      }

      connectButton.addEventListener("click", () => {
        connected = !connected;
        refreshUiText();
      });
      root.querySelector("[data-ic='reset']").addEventListener("click", resetCounters);
      root.querySelector("[data-ic='close']").addEventListener("click", shell.close);

      subscribeLanguageChange(refreshUiText);
      resetCounters();
      refreshUiText();

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
          processInstruction(
            event.opcode || event.instructionTokens?.[0],
            event.stepAfter | 0,
            false,
            delivery.retainHistory !== false
          );
          history.pruneBefore(event.historyStartStep | 0);
        },
        onRuntimeEventBatch(events, batch = {}) {
          if (!connected || !Array.isArray(events)) return;
          const historyStart = Number.isFinite(batch.finalHistoryStartStep)
            ? Math.max(0, batch.finalHistoryStartStep | 0)
            : null;
          events.forEach((event) => {
            if (!event) return;
            if (event.type === "backstep") {
              history.rewind(event.stepAfter | 0);
              return;
            }
            if (event.type !== "instruction") return;
            const step = event.stepAfter | 0;
            processInstruction(
              event.opcode || event.instructionTokens?.[0],
              step,
              false,
              historyStart == null || step > historyStart
            );
          });
          if (historyStart != null) history.pruneBefore(historyStart);
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
