(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-system-clock-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .sc-tool { display:flex; flex-direction:column; gap:8px; height:100%; box-sizing:border-box; padding:8px; font:12px "Segoe UI", Tahoma, sans-serif; color:var(--text); }
      .sc-toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .sc-main { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 300px); gap:8px; flex:1; min-height:0; }
      .sc-left, .sc-right { display:flex; flex-direction:column; gap:8px; min-height:0; min-width:0; }
      .sc-card { border:1px solid var(--line); background:var(--surface-raised); padding:8px; display:flex; flex-direction:column; gap:6px; min-height:0; }
      .sc-card > h4 { margin:0; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-soft); }
      .sc-readout { font:28px Consolas, "Courier New", monospace; color:var(--text-heading); text-align:center; line-height:1.1; }
      .sc-sub { font:11px Consolas, "Courier New", monospace; color:var(--text-muted); text-align:center; }
      .sc-bar { height:16px; border:1px solid var(--line); background:var(--surface); position:relative; overflow:hidden; }
      .sc-bar > span { display:block; height:100%; background:var(--accent); transition:width .05s linear; }
      .sc-field { display:flex; align-items:center; gap:6px; }
      .sc-field label { min-width:104px; color:var(--text-muted); }
      .sc-field input[type="number"] { width:110px; font:12px Consolas, monospace; padding:2px 4px; border:1px solid var(--line); background:var(--surface); color:var(--text); }
      .sc-check { display:flex; align-items:center; gap:5px; }
      .sc-regs { width:100%; border-collapse:collapse; font:11px Consolas, "Courier New", monospace; }
      .sc-regs th, .sc-regs td { border:1px solid var(--line); padding:2px 5px; text-align:left; }
      .sc-regs th { background:var(--surface-inset); color:var(--text-soft); font-weight:700; }
      .sc-regs td.sc-value { text-align:right; }
      .sc-log { flex:1; min-height:60px; overflow:auto; border:1px solid var(--line); background:var(--surface); font:11px Consolas, "Courier New", monospace; padding:3px; }
      .sc-log div { padding:1px 3px; }
      .sc-log div.sc-irq { color:var(--accent); font-weight:700; }
      .sc-note { font-size:10px; color:var(--text-faint); }
      .sc-warn { color:var(--warn); font-weight:700; }
      .sc-footer { margin-top:auto; display:flex; align-items:center; gap:8px; }
      .sc-footer .ctrl { flex:1; text-align:center; font-weight:700; }
      .sc-footer .tool-btn { min-width:110px; }

      .sc-tool.sc-narrow .sc-main { grid-template-columns:minmax(0, 1fr); grid-template-rows:auto minmax(0, 1fr); }
      .desktop-stacked .sc-tool { gap:5px; padding:5px; }
      .desktop-stacked .sc-tool .sc-toolbar { flex-wrap:nowrap; overflow-x:auto; }
      .desktop-stacked .sc-tool .sc-toolbar > * { flex:0 0 auto; }
      .desktop-stacked .sc-tool .sc-toolbar .tool-btn { min-height:30px; }
      .desktop-stacked .sc-tool .sc-main { grid-template-columns:minmax(0, 1fr); grid-template-rows:auto minmax(0, 1fr); gap:5px; }
      .desktop-stacked .sc-tool .sc-readout { font-size:22px; }
      .desktop-stacked .sc-tool .sc-footer { gap:5px; overflow-x:auto; }
      .desktop-stacked .sc-tool .sc-footer .ctrl { display:none; }
      .desktop-stacked .sc-tool .sc-footer .tool-btn { min-width:max-content; min-height:30px; flex:1 0 auto; }
    `;
    document.head.appendChild(style);
  }

  // Register block, word aligned, placed after the MARS devices (+0x00..+0x14) and
  // the webMARS bitmap configuration protocol (+0x20..+0x40).
  const CLOCK_OFFSETS = Object.freeze({
    control: 0x50,
    status: 0x54,
    period: 0x58,
    counter: 0x5c,
    timeLow: 0x60,
    timeHigh: 0x64,
    uptime: 0x68
  });
  const CONTROL_ENABLE = 1 << 0;
  const CONTROL_INTERRUPT_ENABLE = 1 << 1;
  const CONTROL_WALL_CLOCK = 1 << 2;
  const STATUS_EXPIRED = 1 << 0;
  const DEFAULT_PERIOD = 1000;
  const MAX_LOG_ROWS = 120;
  // mars.tools.DigitalLabSim.EXTERNAL_INTERRUPT_TIMER
  const TIMER_INTERRUPT_CAUSE = (globalThis.WebMarsExternalInterrupts?.timer ?? 0x100) | 0;

  function formatFallback(template, variables = {}) {
    return String(template ?? "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(variables, key) ? String(variables[key]) : match
    ));
  }

  function t(message, variables = {}) {
    if (typeof translateText === "function") return translateText(message, variables);
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (i18n && typeof i18n.t === "function") return i18n.t(message, variables);
    return formatFallback(message, variables);
  }

  function subscribeLanguageChange(listener) {
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (!i18n || typeof i18n.subscribe !== "function" || typeof listener !== "function") return () => {};
    return i18n.subscribe(listener);
  }

  function toHex32(value) {
    return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
  }

  function formatClock(epochMs) {
    const date = new Date(epochMs);
    const pad = (value, size = 2) => String(value).padStart(size, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  }

  host.register({
    id: "system-clock",
    label: "System Clock and Timer",
    create(ctx) {
      const shell = ctx.createToolWindowShell("system-clock", "System Clock and Timer, Version 1.0", 900, 620, `
        <div class="sc-tool">
          <div class="sc-toolbar">
            <button class="tool-btn" data-sc="connect" type="button">Connect to MIPS</button>
            <span class="sc-check"><span data-sc="state"></span></span>
          </div>
          <div class="sc-main">
            <div class="sc-left">
              <div class="sc-card">
                <h4>Clock</h4>
                <div class="sc-readout" data-sc="readout">--:--:--.---</div>
                <div class="sc-sub" data-sc="epoch"></div>
                <div class="sc-bar"><span data-sc="bar" style="width:0%"></span></div>
                <div class="sc-sub" data-sc="counter"></div>
              </div>
              <div class="sc-card" style="flex:1; min-height:0;">
                <h4>Ticks and interrupts</h4>
                <div class="sc-log" data-sc="log"></div>
                <div class="sc-note" data-sc="note"></div>
              </div>
            </div>
            <div class="sc-right">
              <div class="sc-card">
                <h4>Timer</h4>
                <div class="sc-field">
                  <label>Period</label>
                  <input type="number" min="1" step="1" value="1000" data-sc="period">
                  <span data-sc="period-unit">instructions</span>
                </div>
                <label class="sc-check"><input type="checkbox" data-sc="enable"><span>Enabled (control bit 0)</span></label>
                <label class="sc-check"><input type="checkbox" data-sc="irq"><span>Raise interrupts (control bit 1)</span></label>
                <label class="sc-check"><input type="checkbox" data-sc="wall"><span>Count real milliseconds (control bit 2)</span></label>
                <div class="sc-note">Simulated time counts executed instructions, so a run is repeatable and backstep stays exact. Real milliseconds are not reproducible.</div>
              </div>
              <div class="sc-card" style="flex:1; min-height:0; overflow:auto;">
                <h4>Memory-mapped registers</h4>
                <table class="sc-regs" data-sc="regs"></table>
                <div class="sc-note">The program owns these words: write the control register to arm the timer, and write the status register to acknowledge a tick.</div>
              </div>
            </div>
          </div>
          <div class="sc-footer">
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-sc="reset" type="button">Reset</button>
            <button class="tool-btn" data-sc="help" type="button">Help</button>
            <button class="tool-btn" data-sc="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const toolRoot = root.querySelector(".sc-tool");
      const connectButton = root.querySelector("[data-sc='connect']");
      const stateLabel = root.querySelector("[data-sc='state']");
      const readout = root.querySelector("[data-sc='readout']");
      const epochLabel = root.querySelector("[data-sc='epoch']");
      const bar = root.querySelector("[data-sc='bar']");
      const counterLabel = root.querySelector("[data-sc='counter']");
      const logBox = root.querySelector("[data-sc='log']");
      const noteBox = root.querySelector("[data-sc='note']");
      const periodInput = root.querySelector("[data-sc='period']");
      const periodUnit = root.querySelector("[data-sc='period-unit']");
      const enableCheck = root.querySelector("[data-sc='enable']");
      const irqCheck = root.querySelector("[data-sc='irq']");
      const wallCheck = root.querySelector("[data-sc='wall']");
      const registersTable = root.querySelector("[data-sc='regs']");
      const resetButton = root.querySelector("[data-sc='reset']");
      const helpButton = root.querySelector("[data-sc='help']");
      const closeButton = root.querySelector("[data-sc='close']");

      const escapeHtml = typeof ctx.escapeHtml === "function"
        ? ctx.escapeHtml
        : (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
          })[character]);

      let connected = false;
      let latestSnapshot = null;
      let lastRuntimeRevision = null;
      let releaseObserver = null;
      let renderScheduled = false;
      // The simulated base derives everything from the executed instruction count, so
      // no local counter can drift out of step with a backstep.
      let baseStep = 0;
      let baseTimeMs = Date.now();
      let lastTickIndex = 0;
      let ticks = 0;
      let interrupts = 0;
      let log = [];

      function mmioBase() {
        return (ctx.engine?.memoryMap?.mmioBase ?? ctx.defaultMemoryMap?.mmioBase ?? 0xffff0000) >>> 0;
      }

      function addressOf(name) {
        return (mmioBase() + CLOCK_OFFSETS[name]) >>> 0;
      }

      // Reads bypass the observer path so other connected devices do not see traffic
      // the program never issued.
      function peek(name) {
        const words = ctx.engine?.memoryWords;
        if (!(words instanceof Map)) return 0;
        return (words.get(addressOf(name)) ?? 0) | 0;
      }

      function poke(name, value) {
        try {
          ctx.engine?.writeWord?.(addressOf(name), value >>> 0);
        } catch {
          // A memory configuration without MMIO simply has no clock.
        }
      }

      function control() {
        return peek("control") | 0;
      }

      function period() {
        const value = peek("period") | 0;
        return value > 0 ? value : DEFAULT_PERIOD;
      }

      function usesWallClock() {
        return (control() & CONTROL_WALL_CLOCK) !== 0;
      }

      function currentTicksElapsed() {
        if (usesWallClock()) return Math.max(0, Date.now() - baseTimeMs);
        const steps = Number(ctx.engine?.steps);
        return Math.max(0, (Number.isFinite(steps) ? steps : 0) - baseStep);
      }

      function pushLog(text, kind = "tick") {
        log.push({ text, kind });
        while (log.length > MAX_LOG_ROWS) log.shift();
      }

      function writeControlFromUi() {
        let value = 0;
        if (enableCheck.checked) value |= CONTROL_ENABLE;
        if (irqCheck.checked) value |= CONTROL_INTERRUPT_ENABLE;
        if (wallCheck.checked) value |= CONTROL_WALL_CLOCK;
        poke("control", value);
        poke("period", Math.max(1, Number.parseInt(periodInput.value, 10) || DEFAULT_PERIOD));
        restartCycle();
        scheduleRender();
      }

      function restartCycle() {
        const steps = Number(ctx.engine?.steps);
        baseStep = Number.isFinite(steps) ? steps : 0;
        baseTimeMs = Date.now();
        lastTickIndex = 0;
      }

      // Called from inside the engine, once per executed instruction.
      function onInstruction() {
        if (!connected) return;
        const ctrl = control();
        if ((ctrl & CONTROL_ENABLE) === 0) {
          if (lastTickIndex !== 0) restartCycle();
          return;
        }
        const span = period();
        const elapsed = currentTicksElapsed();
        const tickIndex = Math.floor(elapsed / span);
        const remaining = Math.max(0, span - (elapsed % span));
        poke("counter", remaining);
        poke("uptime", elapsed);
        const now = Date.now();
        poke("timeLow", now % 0x100000000);
        poke("timeHigh", Math.floor(now / 0x100000000));

        if (tickIndex <= lastTickIndex) return;
        lastTickIndex = tickIndex;
        ticks += 1;
        poke("status", peek("status") | STATUS_EXPIRED);
        pushLog(t("tick {count} at step {step}", {
          count: ticks,
          step: Number(ctx.engine?.steps) | 0
        }));

        if ((ctrl & CONTROL_INTERRUPT_ENABLE) === 0) return;
        if (typeof ctx.engine?.requestExternalInterrupt !== "function") return;
        ctx.engine.requestExternalInterrupt(TIMER_INTERRUPT_CAUSE);
        interrupts += 1;
        pushLog(t("interrupt requested (cause {cause})", { cause: toHex32(TIMER_INTERRUPT_CAUSE) }), "irq");
      }

      function installObserver() {
        if (releaseObserver || typeof ctx.engine?.registerInstructionObserver !== "function") return;
        releaseObserver = ctx.engine.registerInstructionObserver(() => {
          try {
            onInstruction();
          } catch {
            // A device must never interrupt the simulated program.
          }
        });
      }

      function removeObserver() {
        if (!releaseObserver) return;
        releaseObserver();
        releaseObserver = null;
      }

      function syncUiFromMemory() {
        const ctrl = control();
        enableCheck.checked = (ctrl & CONTROL_ENABLE) !== 0;
        irqCheck.checked = (ctrl & CONTROL_INTERRUPT_ENABLE) !== 0;
        wallCheck.checked = (ctrl & CONTROL_WALL_CLOCK) !== 0;
        if (document.activeElement !== periodInput) periodInput.value = String(period());
      }

      function renderRegisters() {
        const rows = [
          ["control", t("control"), control()],
          ["status", t("status"), peek("status")],
          ["period", t("period"), period()],
          ["counter", t("counter"), peek("counter")],
          ["timeLow", t("time low"), peek("timeLow")],
          ["timeHigh", t("time high"), peek("timeHigh")],
          ["uptime", t("uptime"), peek("uptime")]
        ];
        registersTable.innerHTML = `
          <tr><th>${escapeHtml(t("address"))}</th><th>${escapeHtml(t("register"))}</th><th>${escapeHtml(t("value"))}</th></tr>
          ${rows.map(([name, label, value]) => `
            <tr>
              <td>${toHex32(addressOf(name))}</td>
              <td>${escapeHtml(label)}</td>
              <td class="sc-value">${toHex32(value)}</td>
            </tr>`).join("")}
        `;
      }

      function render() {
        const now = Date.now();
        readout.textContent = formatClock(now);
        epochLabel.textContent = t("epoch {low} / {high} (syscall 30)", {
          low: toHex32(now % 0x100000000),
          high: toHex32(Math.floor(now / 0x100000000))
        });

        const span = period();
        const remaining = Math.max(0, Math.min(span, peek("counter") | 0));
        bar.style.width = `${Math.round(((span - remaining) / span) * 100)}%`;
        counterLabel.textContent = t("{remaining} of {period} {unit} to the next tick", {
          remaining,
          period: span,
          unit: usesWallClock() ? t("milliseconds") : t("instructions")
        });
        periodUnit.textContent = usesWallClock() ? t("milliseconds") : t("instructions");

        stateLabel.textContent = connected
          ? t("{ticks} tick(s), {interrupts} interrupt(s)", { ticks, interrupts })
          : t("not connected");

        const status = peek("status") | 0;
        const pending = Number(latestSnapshot?.pendingExternalInterrupt) | 0;
        noteBox.innerHTML = [
          (status & STATUS_EXPIRED) !== 0
            ? `<span class="sc-warn">${escapeHtml(t("A tick is waiting: the program has not acknowledged the status register."))}</span>`
            : "",
          pending !== 0 ? escapeHtml(t("An interrupt request is latched in the CPU.")) : "",
          irqCheck.checked && !hasHandler()
            ? `<span class="sc-warn">${escapeHtml(t("No handler at the exception address: an interrupt would stop the program."))}</span>`
            : ""
        ].filter(Boolean).join("<br>");

        logBox.innerHTML = log.map((entry) => (
          `<div class="${entry.kind === "irq" ? "sc-irq" : ""}">${escapeHtml(entry.text)}</div>`
        )).join("");
        logBox.scrollTop = logBox.scrollHeight;

        syncUiFromMemory();
        renderRegisters();
      }

      function hasHandler() {
        const address = (ctx.engine?.memoryMap?.exceptionHandlerAddress ?? 0x80000180) >>> 0;
        const rows = latestSnapshot?.textRows;
        if (!Array.isArray(rows)) return true;
        return rows.some((row) => (row.address >>> 0) === address);
      }

      function scheduleRender() {
        if (renderScheduled) return;
        renderScheduled = true;
        window.requestAnimationFrame(() => {
          renderScheduled = false;
          if (root.classList.contains("window-hidden")) return;
          try {
            render();
          } catch {
            // Rendering must never break runtime delivery to other tools.
          }
        });
      }

      function resetDevice() {
        ticks = 0;
        interrupts = 0;
        log = [];
        restartCycle();
        poke("status", 0);
        poke("counter", period());
        poke("uptime", 0);
        scheduleRender();
      }

      function updateConnectLabel() {
        connectButton.textContent = connected ? t("Disconnect from MIPS") : t("Connect to MIPS");
      }

      [enableCheck, irqCheck, wallCheck].forEach((control) => {
        control.addEventListener("change", writeControlFromUi);
      });
      periodInput.addEventListener("change", writeControlFromUi);

      connectButton.addEventListener("click", () => {
        connected = !connected;
        updateConnectLabel();
        if (connected) {
          installObserver();
          resetDevice();
          poke("period", Math.max(1, Number.parseInt(periodInput.value, 10) || DEFAULT_PERIOD));
          ctx.messagesPane.postMars(`${t("[tool] System Clock connected at {address}.", {
            address: toHex32(addressOf("control"))
          })}\n`);
        } else {
          removeObserver();
          ctx.messagesPane.postMars(`${t("[tool] System Clock disconnected.")}\n`);
        }
        scheduleRender();
      });

      resetButton.addEventListener("click", resetDevice);

      helpButton.addEventListener("click", () => {
        ctx.messagesPane.postMars(`${t("[tool] System Clock: the timer counts executed instructions (or real milliseconds) and, when the program sets control bit 1, raises the MARS timer interrupt so the handler at the exception address runs.")}\n`);
      });

      closeButton.addEventListener("click", shell.close);

      subscribeLanguageChange(() => {
        shell.refreshTranslations?.();
        updateConnectLabel();
        scheduleRender();
      });

      function applyLayoutClasses(detail = {}) {
        const width = Number.isFinite(detail.width) && detail.width > 0 ? detail.width : toolRoot.clientWidth;
        if (!width) return;
        toolRoot.classList.toggle("sc-narrow", width < 720);
      }

      shell.onResize((detail) => {
        applyLayoutClasses(detail);
        scheduleRender();
      });

      updateConnectLabel();
      applyLayoutClasses();
      scheduleRender();

      return {
        isConnected: () => connected,
        open() {
          shell.open();
          updateConnectLabel();
          applyLayoutClasses();
          scheduleRender();
        },
        close: shell.close,
        onSnapshot(snapshot) {
          if (!snapshot) return;
          latestSnapshot = snapshot;
          const revision = snapshot.runtimeRevision >>> 0;
          if (lastRuntimeRevision !== revision) {
            lastRuntimeRevision = revision;
            if (connected) resetDevice();
          }
          if (connected) scheduleRender();
        },
        onRuntimeBatchEnd() {
          if (connected) scheduleRender();
        },
        onBackstep() {
          // Everything the device shows derives from the engine step count, so a
          // backstep only needs the cycle boundary recomputed.
          if (!connected) return;
          lastTickIndex = Math.floor(currentTicksElapsed() / period());
          scheduleRender();
        }
      };
    }
  });
})();
