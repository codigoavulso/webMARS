(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-mars-bot-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .mbot-tool { display:flex; flex-direction:column; gap:8px; height:100%; box-sizing:border-box; padding:8px; font:12px "Segoe UI", Tahoma, sans-serif; }
      .mbot-canvas-wrap { border:1px solid #9db0c8; background:#dcdcdc; padding:0; overflow:hidden; flex:1; }
      .mbot-canvas { display:block; width:100%; height:100%; background:#dcdcdc; }
      .mbot-footer { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .mbot-footer .ctrl { flex:1; text-align:center; font-weight:700; color:#24354b; }
      .mbot-footer .tool-btn { min-width:120px; }
      .mbot-info { border:1px solid #9db0c8; background:#fff; padding:6px; font-family:Consolas, monospace; white-space:pre-wrap; min-height:64px; }
    `;
    document.head.appendChild(style);
  }

  const WRITE_OPS = new Set(["sb", "sh", "sw", "swl", "swr", "sc", "swc1", "sdc1"]);
  const MEMORY_OPS = new Set([
    "lb", "lbu", "lh", "lhu", "lw", "lwl", "lwr", "sb", "sh", "sw", "swl", "swr", "ll", "sc",
    "lwc1", "swc1", "ldc1", "sdc1"
  ]);

  const ADDR_HEADING = 0xffff8010 >>> 0;
  const ADDR_LEAVETRACK = 0xffff8020 >>> 0;
  const ADDR_WHERE_X = 0xffff8030 >>> 0;
  const ADDR_WHERE_Y = 0xffff8040 >>> 0;
  const ADDR_MOVE = 0xffff8050 >>> 0;

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

  function resolveSourceValue(opcode, sourceToken, registers, snapshot) {
    const token = String(sourceToken || "").trim().toLowerCase();
    const reg = registers.get(token) ?? registers.get(token.replace(/^\$/, "")) ?? 0;
    if (opcode === "sb") return reg & 0xff;
    if (opcode === "sh") return reg & 0xffff;
    if (opcode === "swc1") {
      const idx = Number.parseInt(token.replace(/^\$f/, ""), 10);
      if (Number.isFinite(idx) && Array.isArray(snapshot?.cop1)) return snapshot.cop1[idx] | 0;
    }
    return reg | 0;
  }

  host.register({
    id: "mars-bot",
    label: "Mars Bot",
    create(ctx) {
      const shell = ctx.createToolWindowShell("mars-bot", "This is the MarsBot", 980, 780, `
        <div class="mbot-tool">
          <div class="mbot-canvas-wrap"><canvas class="mbot-canvas" data-mb="canvas" width="760" height="560"></canvas></div>
          <div class="mbot-info" data-mb="info"></div>
          <div class="mbot-footer">
            <button class="tool-btn" data-mb="connect" type="button">Connect to MIPS</button>
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-mb="clear" type="button">Clear</button>
            <button class="tool-btn" data-mb="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const canvas = root.querySelector("[data-mb='canvas']");
      const info = root.querySelector("[data-mb='info']");
      const connectButton = root.querySelector("[data-mb='connect']");
      const clearButton = root.querySelector("[data-mb='clear']");
      const closeButton = root.querySelector("[data-mb='close']");
      const g = canvas.getContext("2d");

      let connected = false;
      let lastSnapshot = null;
      let heading = 0;
      let leaveTrack = false;
      let moving = false;
      let x = 0;
      let y = 0;
      let tracks = [];
      let frameTimer = null;

      function writeWordSafe(address, value) {
        try {
          ctx.engine.writeWord(address >>> 0, value | 0);
        } catch {
          // ignore
        }
      }

      function updateInfo() {
        info.textContent = [
          `Heading: ${heading}`,
          `Position: (${x.toFixed(2)}, ${y.toFixed(2)})`,
          `Moving: ${moving ? "yes" : "no"}`,
          `Leave Track: ${leaveTrack ? "yes" : "no"}`,
          `MMIO: heading=${ADDR_HEADING.toString(16)} move=${ADDR_MOVE.toString(16)} x=${ADDR_WHERE_X.toString(16)} y=${ADDR_WHERE_Y.toString(16)}`
        ].join("\n");
      }

      function clearState() {
        heading = 0;
        leaveTrack = false;
        moving = false;
        x = 0;
        y = 0;
        tracks = [];
        writeWordSafe(ADDR_WHERE_X, 0);
        writeWordSafe(ADDR_WHERE_Y, 0);
        render();
        updateInfo();
      }

      function render() {
        g.fillStyle = "#dcdcdc";
        g.fillRect(0, 0, canvas.width, canvas.height);

        g.strokeStyle = "#1d5ec0";
        g.lineWidth = 2;
        g.beginPath();
        tracks.forEach((segment) => {
          g.moveTo(segment.x1, segment.y1);
          g.lineTo(segment.x2, segment.y2);
        });
        g.stroke();

        g.fillStyle = "#000";
        g.fillRect(Math.round(x), Math.round(y), 20, 20);
      }

      function stepMovement() {
        if (!connected || !moving) {
          render();
          return;
        }

        const oldX = x;
        const oldY = y;

        const mathAngle = ((360 - heading) + 90) % 360;
        x += Math.cos((mathAngle * Math.PI) / 180);
        y += -Math.sin((mathAngle * Math.PI) / 180);

        x = Math.max(0, Math.min(canvas.width - 20, x));
        y = Math.max(0, Math.min(canvas.height - 20, y));

        if (leaveTrack) {
          tracks.push({ x1: oldX + 10, y1: oldY + 10, x2: x + 10, y2: y + 10 });
          if (tracks.length > 6000) tracks.splice(0, tracks.length - 6000);
        }

        writeWordSafe(ADDR_WHERE_X, Math.round(x));
        writeWordSafe(ADDR_WHERE_Y, Math.round(y));
        render();
        updateInfo();
      }

      function ensureTimer() {
        if (frameTimer != null) return;
        frameTimer = window.setInterval(stepMovement, 40);
      }

      function extractWrite(previousSnapshot) {
        const row = (previousSnapshot?.textRows || []).find((entry) => entry.isCurrent);
        if (!row) return null;
        const tokens = parseTokens(row.basic || row.source);
        if (!tokens.length) return null;

        const opcode = tokens[0].toLowerCase();
        if (!MEMORY_OPS.has(opcode) || !WRITE_OPS.has(opcode)) return null;
        const args = tokens.slice(1);
        const memArg = args[1] ?? args[0];
        if (!memArg) return null;

        const registers = buildRegisterMap(previousSnapshot);
        const labels = buildLabelMap(previousSnapshot);
        const address = resolveMemoryAddress(memArg, registers, labels, row.address >>> 0);
        if (!Number.isFinite(address)) return null;

        const value = resolveSourceValue(opcode, args[0], registers, previousSnapshot);
        return { address: address >>> 0, value: value | 0 };
      }

      function processWrite(write) {
        if (!write) return;
        if (write.address === ADDR_HEADING) {
          heading = write.value | 0;
        } else if (write.address === ADDR_LEAVETRACK) {
          const next = (write.value | 0) !== 0;
          if (next !== leaveTrack) {
            leaveTrack = next;
          }
        } else if (write.address === ADDR_MOVE) {
          moving = (write.value | 0) !== 0;
        }
        updateInfo();
      }

      connectButton.addEventListener("click", () => {
        connected = !connected;
        connectButton.textContent = connected ? "Disconnect from MIPS" : "Connect to MIPS";
        if (connected) {
          ensureTimer();
          ctx.messagesPane.postMars("[tool] Mars Bot connected.");
        }
      });

      clearButton.addEventListener("click", clearState);
      closeButton.addEventListener("click", shell.close);

      clearState();
      ensureTimer();

      return {
        open: shell.open,
        close() {
          shell.close();
        },
        onSnapshot(snapshot) {
          const previous = lastSnapshot;
          lastSnapshot = snapshot;
          if (!connected || !snapshot || !previous) return;
          if ((snapshot.steps | 0) <= (previous.steps | 0)) return;
          processWrite(extractWrite(previous));
        }
      };
    }
  });
})();
