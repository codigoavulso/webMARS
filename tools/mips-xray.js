(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-mips-xray-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .xray-tool { display:flex; flex-direction:column; gap:8px; height:100%; box-sizing:border-box; padding:8px; font:12px "Segoe UI", Tahoma, sans-serif; }
      .xray-toolbar { display:flex; gap:6px; align-items:center; }
      .xray-main { display:grid; grid-template-columns: 1fr 320px; gap:8px; min-height:0; flex:1; }
      .xray-image-wrap { border:1px solid var(--line); background:var(--surface); overflow:auto; }
      .xray-image-wrap img { display:block; max-width:none; }
      .xray-side { border:1px solid var(--line); background:var(--surface-raised); padding:8px; overflow:auto; display:flex; flex-direction:column; gap:8px; }
      .xray-side pre { margin:0; font:11px Consolas, monospace; background:var(--surface); border:1px solid var(--line); padding:6px; white-space:pre-wrap; }
      .xray-footer { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .xray-footer .ctrl { flex:1; text-align:center; font-weight:700; color:var(--text); }
      .xray-footer .tool-btn { min-width:120px; }

      /* On mobile decoded information is the upper pane and the datapath image
         is the larger, scrollable pane below it. */
      .desktop-stacked .xray-tool { gap:6px; padding:6px; }
      .desktop-stacked .xray-toolbar {
        gap:5px;
        overflow-x:auto;
        flex-wrap:nowrap;
      }
      .desktop-stacked .xray-toolbar .tool-btn { min-width:max-content; flex:1 0 auto; }
      .desktop-stacked .xray-main {
        display:grid;
        grid-template-columns:minmax(0, 1fr);
        grid-template-rows:auto minmax(160px, 1fr);
        gap:6px;
      }
      .desktop-stacked .xray-side {
        order:1;
        display:grid;
        grid-template-columns:minmax(0, 1fr) minmax(0, 1fr);
        gap:4px 6px;
        max-height:160px;
        padding:5px;
      }
      .desktop-stacked .xray-side strong { font-size:11px; }
      .desktop-stacked .xray-side pre {
        min-height:0;
        max-height:110px;
        overflow:auto;
        padding:4px;
        font-size:10px;
      }
      .desktop-stacked .xray-image-wrap {
        order:2;
        width:100%;
        min-height:160px;
      }
      .desktop-stacked .xray-image-wrap img { max-width:none; }
      .desktop-stacked .xray-footer { gap:5px; overflow-x:auto; }
      .desktop-stacked .xray-footer .ctrl { display:none; }
      .desktop-stacked .xray-footer .tool-btn { min-width:max-content; flex:1 0 auto; }
    `;
    document.head.appendChild(style);
  }

  const BRANCH_OPS = new Set(["beq", "bne", "blez", "bgtz", "bltz", "bgez", "beql", "bnel", "blezl", "bgtzl", "bltzl", "bgezl", "bc1f", "bc1t"]);
  const JUMP_OPS = new Set(["j", "jal", "jr", "jalr"]);
  const MEMORY_OPS = new Set(["lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "sb", "sh", "sw", "swl", "swr", "ll", "sc", "lwc1", "swc1", "ldc1", "sdc1"]);

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

  function parseTokens(statement) {
    if (!statement) return [];
    const cleaned = String(statement).split("#")[0].trim();
    if (!cleaned) return [];
    return cleaned.split(/[\s,]+/).filter(Boolean);
  }

  function classify(op) {
    if (!op) return "OTHER";
    if (MEMORY_OPS.has(op)) return "MEMORY";
    if (BRANCH_OPS.has(op)) return "BRANCH";
    if (JUMP_OPS.has(op)) return "JUMP";
    return "ALU/OTHER";
  }

  function formatRegisters(tokens) {
    const regs = tokens.filter((tok) => /^\$(f?\d+|[a-z][a-z0-9]*)$/i.test(tok));
    return regs.length ? regs.join(", ") : "-";
  }

  host.register({
    id: "mips-xray",
    label: "MIPS X-Ray",
    create(ctx) {
      const shell = ctx.createToolWindowShell("mips-xray", "MIPS X-Ray - Animation of MIPS Datapath, Version 2.0", 1240, 840, `
        <div class="xray-tool">
          <div class="xray-toolbar">
            <button class="tool-btn" data-xray="connect" type="button">Connect to MIPS</button>
            <button class="tool-btn" data-xray="zoom-in" type="button">Zoom +</button>
            <button class="tool-btn" data-xray="zoom-out" type="button">Zoom -</button>
            <span data-xray="zoom-label">100%</span>
          </div>
          <div class="xray-main">
            <div class="xray-image-wrap"><img src="./assets/images/datapath.png" alt="MIPS datapath" data-xray="img"></div>
            <div class="xray-side">
              <strong>Decoded Instruction</strong>
              <pre data-xray="info">No instruction yet.</pre>
              <strong>Legend</strong>
              <pre>Blue: Memory path\nGreen: ALU/control path\nOrange: Branch/jump path\nRed: Current instruction summary</pre>
            </div>
          </div>
          <div class="xray-footer">
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-xray="help" type="button">Help</button>
            <button class="tool-btn" data-xray="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const connectButton = root.querySelector("[data-xray='connect']");
      const zoomInButton = root.querySelector("[data-xray='zoom-in']");
      const zoomOutButton = root.querySelector("[data-xray='zoom-out']");
      const zoomLabel = root.querySelector("[data-xray='zoom-label']");
      const info = root.querySelector("[data-xray='info']");
      const image = root.querySelector("[data-xray='img']");
      const helpButton = root.querySelector("[data-xray='help']");
      const closeButton = root.querySelector("[data-xray='close']");

      let connected = false;
      let zoom = 1;
      // The panel keeps the decoded event rather than its rendered text, so a
      // language switch can re-render it instead of stranding the old labels.
      let currentInfoEvent = null;
      const history = ctx.createToolDeltaHistory({
        applyInverse(delta) {
          currentInfoEvent = delta?.event || null;
          renderInfo();
        }
      });
      function applyZoom() {
        image.style.transformOrigin = "top left";
        image.style.transform = `scale(${zoom})`;
        zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
      }

      function formatRuntimeInstruction(event) {
        const statement = String(event?.executedInstruction || "");
        const tokens = Array.isArray(event?.instructionTokens) && event.instructionTokens.length
          ? event.instructionTokens
          : parseTokens(statement);
        const opcode = String(event?.opcode || tokens[0] || "").toLowerCase();
        return [
          t("Line: {value}", { value: "-" }),
          t("Address: {value}", { value: toHex32(event?.executedAddress >>> 0) }),
          t("Machine code: {value}", { value: Number.isFinite(event?.machineWord) ? toHex32(event.machineWord) : "-" }),
          t("Opcode: {value}", { value: opcode || "-" }),
          t("Category: {value}", { value: classify(opcode) }),
          t("Registers: {value}", { value: formatRegisters(tokens.slice(1)) }),
          t("Instruction: {value}", { value: statement || "-" }),
          t("Next address: {value}", { value: toHex32(event?.pcAfter >>> 0) })
        ].join("\n");
      }

      function renderInfo() {
        info.textContent = currentInfoEvent
          ? formatRuntimeInstruction(currentInfoEvent)
          : t("No instruction yet.");
      }

      function refreshUiText() {
        connectButton.textContent = connected ? t("Disconnect from MIPS") : t("Connect to MIPS");
        renderInfo();
      }

      function updateRuntimeInstruction(event, shouldRender = true, retainHistory = true) {
        if (retainHistory) history.record(event.stepAfter | 0, { event: currentInfoEvent });
        currentInfoEvent = event;
        if (shouldRender) renderInfo();
      }

      connectButton.addEventListener("click", () => {
        connected = !connected;
        refreshUiText();
      });
      zoomInButton.addEventListener("click", () => { zoom = Math.min(2.5, zoom + 0.1); applyZoom(); });
      zoomOutButton.addEventListener("click", () => { zoom = Math.max(0.4, zoom - 0.1); applyZoom(); });
      helpButton.addEventListener("click", () => {
        ctx.messagesPane.postMars(t("[tool] MIPS X-Ray: this browser version decodes each executed instruction and overlays datapath context on the static datapath figure."));
      });
      closeButton.addEventListener("click", shell.close);

      subscribeLanguageChange(refreshUiText);
      applyZoom();
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
          updateRuntimeInstruction(
            event,
            delivery.isLast !== false,
            delivery.retainHistory !== false
          );
          history.pruneBefore(event.historyStartStep | 0);
        },
        onRuntimeEventBatch(events, batch = {}) {
          if (!connected || !Array.isArray(events) || !events.length) return;
          const instructionEvents = events.filter((event) => event?.type === "instruction");
          if (!instructionEvents.length) return;
          const historyStart = Number.isFinite(batch.finalHistoryStartStep)
            ? Math.max(0, batch.finalHistoryStartStep | 0)
            : null;
          let firstRetainedIndex = 0;
          if (historyStart != null) {
            firstRetainedIndex = instructionEvents.findIndex((event) => (event.stepAfter | 0) > historyStart);
            if (firstRetainedIndex < 0) firstRetainedIndex = instructionEvents.length;
          }
          if (firstRetainedIndex > 0) {
            currentInfoEvent = instructionEvents[firstRetainedIndex - 1];
          }
          for (let index = firstRetainedIndex; index < instructionEvents.length; index += 1) {
            updateRuntimeInstruction(
              instructionEvents[index],
              index === instructionEvents.length - 1,
              true
            );
          }
          if (firstRetainedIndex === instructionEvents.length) {
            renderInfo();
          }
          if (historyStart != null) history.pruneBefore(historyStart);
        },
        onBackstep(event) {
          if (!connected || !event) return;
          history.rewind(event.stepAfter | 0);
        }
      };
    }
  });
})();
