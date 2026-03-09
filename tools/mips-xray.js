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
      .xray-image-wrap { border:1px solid #9db0c8; background:#fff; overflow:auto; }
      .xray-image-wrap img { display:block; max-width:none; }
      .xray-side { border:1px solid #9db0c8; background:#f7fbff; padding:8px; overflow:auto; display:flex; flex-direction:column; gap:8px; }
      .xray-side pre { margin:0; font:11px Consolas, monospace; background:#fff; border:1px solid #9db0c8; padding:6px; white-space:pre-wrap; }
      .xray-footer { margin-top:auto; display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .xray-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#24354b; }
      .xray-footer .tool-btn { min-width:120px; }
    `;
    document.head.appendChild(style);
  }

  const BRANCH_OPS = new Set(["beq", "bne", "blez", "bgtz", "bltz", "bgez", "beql", "bnel", "blezl", "bgtzl", "bltzl", "bgezl", "bc1f", "bc1t"]);
  const JUMP_OPS = new Set(["j", "jal", "jr", "jalr"]);
  const MEMORY_OPS = new Set(["lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "sb", "sh", "sw", "swl", "swr", "ll", "sc", "lwc1", "swc1", "ldc1", "sdc1"]);

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
      let lastSnapshot = null;

      function applyZoom() {
        image.style.transformOrigin = "top left";
        image.style.transform = `scale(${zoom})`;
        zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
      }

      function updateInstruction(previousSnapshot) {
        const row = (previousSnapshot?.textRows || []).find((entry) => entry.isCurrent);
        if (!row) return;

        const statement = row.basic || row.source || "";
        const tokens = parseTokens(statement);
        const opcode = (tokens[0] || "").toLowerCase();

        const details = [
          `Line: ${row.line ?? "-"}`,
          `Address: ${row.addressHex || "-"}`,
          `Machine code: ${row.code || "-"}`,
          `Opcode: ${opcode || "-"}`,
          `Category: ${classify(opcode)}`,
          `Registers: ${formatRegisters(tokens.slice(1))}`,
          `Instruction: ${statement || "-"}`,
          `Source: ${row.source || "-"}`
        ];

        info.textContent = details.join("\n");
      }

      connectButton.addEventListener("click", () => {
        connected = !connected;
        connectButton.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
      });
      zoomInButton.addEventListener("click", () => { zoom = Math.min(2.5, zoom + 0.1); applyZoom(); });
      zoomOutButton.addEventListener("click", () => { zoom = Math.max(0.4, zoom - 0.1); applyZoom(); });
      helpButton.addEventListener("click", () => {
        ctx.messagesPane.postMars("[tool] MIPS X-Ray: this browser version decodes each executed instruction and overlays datapath context on the static datapath figure.");
      });
      closeButton.addEventListener("click", shell.close);

      applyZoom();

      return {
        open: shell.open,
        close: shell.close,
        onSnapshot(snapshot) {
          const previous = lastSnapshot;
          lastSnapshot = snapshot;
          if (!connected || !snapshot || !previous) return;
          if ((snapshot.steps | 0) <= (previous.steps | 0)) return;
          updateInstruction(previous);
        }
      };
    }
  });
})();
