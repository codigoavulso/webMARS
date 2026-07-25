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

  const ADDR_HEADING = 0xffff8010 >>> 0;
  const ADDR_LEAVETRACK = 0xffff8020 >>> 0;
  const ADDR_WHERE_X = 0xffff8030 >>> 0;
  const ADDR_WHERE_Y = 0xffff8040 >>> 0;
  const ADDR_MOVE = 0xffff8050 >>> 0;

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
      const history = ctx.createToolDeltaHistory({
        applyInverse(delta) {
          if (!delta) return;
          heading = Number(delta.heading) || 0;
          leaveTrack = delta.leaveTrack === true;
          moving = delta.moving === true;
          x = Number(delta.x) || 0;
          y = Number(delta.y) || 0;
          if (Array.isArray(delta.removedTracks) && delta.removedTracks.length) {
            tracks = [...delta.removedTracks.map((segment) => ({ ...segment })), ...tracks];
          }
          tracks.length = Math.min(tracks.length, Math.max(0, delta.trackLength | 0));
          writeWordSafe(ADDR_WHERE_X, Math.round(x));
          writeWordSafe(ADDR_WHERE_Y, Math.round(y));
          render();
          updateInfo();
        }
      });

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

      function getSnapshotStep(snapshot = null) {
        if (snapshot && Number.isFinite(snapshot.steps)) return snapshot.steps | 0;
        return Number.isFinite(ctx.engine?.steps) ? (ctx.engine.steps | 0) : 0;
      }

      function ensureHistoryDelta(step) {
        return history.ensure(step, () => ({
          heading,
          leaveTrack,
          moving,
          x,
          y,
          trackLength: tracks.length,
          removedTracks: []
        }));
      }

      function clearState() {
        history.clear(getSnapshotStep());
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

        const historyDelta = ensureHistoryDelta(getSnapshotStep());
        const oldX = x;
        const oldY = y;

        const mathAngle = ((360 - heading) + 90) % 360;
        x += Math.cos((mathAngle * Math.PI) / 180);
        y += -Math.sin((mathAngle * Math.PI) / 180);

        x = Math.max(0, Math.min(canvas.width - 20, x));
        y = Math.max(0, Math.min(canvas.height - 20, y));

        if (leaveTrack) {
          tracks.push({ x1: oldX + 10, y1: oldY + 10, x2: x + 10, y2: y + 10 });
          if (tracks.length > 6000) {
            const removed = tracks.splice(0, tracks.length - 6000);
            if (historyDelta && Array.isArray(historyDelta.removedTracks)) {
              historyDelta.removedTracks.push(...removed.map((segment) => ({ ...segment })));
            }
          }
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

      function processWrite(write, targetStep = getSnapshotStep()) {
        if (!write) return;
        ensureHistoryDelta(targetStep);
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
          history.sync(lastSnapshot);
          ctx.messagesPane.postMars("[tool] Mars Bot connected.");
        }
      });

      clearButton.addEventListener("click", clearState);
      closeButton.addEventListener("click", shell.close);

      clearState();
      ensureTimer();

      return {
        isConnected: () => connected,
        open: shell.open,
        close() {
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
        onRuntimeEvent(event) {
          if (!connected || !event) return;
          if (event.type === "backstep") {
            history.rewind(event.stepAfter | 0);
            return;
          }
          if (event.type !== "instruction") return;
          const write = (Array.isArray(event.memoryAccesses) ? event.memoryAccesses : [])
            .find((access) => (
              access?.kind === "write"
              && [ADDR_HEADING, ADDR_LEAVETRACK, ADDR_MOVE].includes(access.address >>> 0)
            ));
          if (write) processWrite({ address: write.address >>> 0, value: write.value | 0 }, event.stepAfter | 0);
          history.pruneBefore(event.historyStartStep | 0);
        },
        onBackstep(event) {
          if (!connected || !event) return;
          history.rewind(event.stepAfter | 0);
        }
      };
    }
  });
})();
