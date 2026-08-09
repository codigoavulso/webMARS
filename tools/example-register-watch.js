// Example tool: Register Watch.
//
// The smallest tool that does something real. It watches one register and
// reports every time its value changes, so it exercises the parts of the API a
// new tool actually needs: registration, the window shell, snapshot delivery,
// translation, language changes and failure-free reopening.
//
// Read it alongside docs/tool-api.md. The pure part is exported as
// MarsRegisterWatchCore so it can be tested without a DOM, which is the pattern
// every tool in this repository should follow.
((rootScope) => {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);

  const WATCHABLE_REGISTERS = Object.freeze([
    "$v0", "$a0", "$t0", "$t1", "$t2", "$s0", "$s1", "$sp", "$ra"
  ]);
  const MAX_HISTORY = 200;

  function readRegister(snapshot, name) {
    const registers = snapshot && snapshot.registers;
    if (!registers) return null;
    // The runtime has used both shapes over time; accept either rather than
    // guessing, so the tool keeps working if the snapshot format is widened.
    if (Array.isArray(registers)) {
      const entry = registers.find((item) => item && (item.name === name || item.label === name));
      return entry ? Number(entry.value) : null;
    }
    const value = registers[name];
    return value === undefined ? null : Number(value);
  }

  // Pure: given the previous reading and a new snapshot, decide whether the
  // watched register changed and what to record. No DOM, no globals.
  function nextObservation(previous, snapshot, name) {
    const value = readRegister(snapshot, name);
    if (value === null || !Number.isFinite(value)) return null;
    if (previous && previous.value === value && previous.revision === snapshot.runtimeRevision) return null;
    return {
      value,
      previousValue: previous ? previous.value : null,
      step: Number(snapshot.steps) || 0,
      pcHex: String(snapshot.pcHex || ""),
      revision: snapshot.runtimeRevision
    };
  }

  function appendObservation(history, observation) {
    if (!observation) return history;
    const next = history.concat(observation);
    return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
  }

  const coreApi = Object.freeze({
    WATCHABLE_REGISTERS,
    MAX_HISTORY,
    readRegister,
    nextObservation,
    appendObservation
  });
  root.MarsRegisterWatchCore = coreApi;

  const host = root.MarsWebTools;
  if (!host || typeof host.register !== "function" || typeof document === "undefined") return;

  const STYLE_ID = "mars-web-tool-register-watch-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .register-watch-tool { height:100%; min-height:0; box-sizing:border-box; padding:8px; display:flex; flex-direction:column; gap:8px; color:var(--text); font:12px "Segoe UI",Tahoma,sans-serif; }
      .register-watch-toolbar { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .register-watch-toolbar label { display:flex; align-items:center; gap:5px; font-weight:600; }
      .register-watch-toolbar select { min-height:28px; border:1px solid var(--line); background:var(--surface); color:var(--text); }
      .register-watch-status { margin:0; min-height:18px; color:var(--text-muted); }
      .register-watch-current { border:1px solid var(--line); background:var(--surface-raised); padding:6px 8px; }
      .register-watch-current strong { display:block; font-size:18px; color:var(--accent-strong); font-family:Consolas,monospace; }
      .register-watch-log { flex:1; min-height:80px; overflow:auto; border:1px solid var(--line); background:var(--surface); }
      .register-watch-log table { border-collapse:collapse; width:100%; font:11px Consolas,monospace; }
      .register-watch-log th,.register-watch-log td { border:1px solid var(--line); padding:3px 6px; text-align:right; }
      .register-watch-log th { position:sticky; top:0; background:var(--table-head); }
      .desktop-stacked .register-watch-toolbar { flex-wrap:nowrap; overflow-x:auto; }
      .desktop-stacked .register-watch-toolbar > * { flex:0 0 auto; }
    `;
    document.head.appendChild(style);
  }

  function t(message, params = {}) {
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (i18n && typeof i18n.t === "function") return i18n.t(message, params);
    return String(message).replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(params[key] ?? ""));
  }

  function subscribeLanguageChange(listener) {
    const i18n = typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
    if (!i18n || typeof i18n.subscribe !== "function" || typeof listener !== "function") return () => {};
    return i18n.subscribe(listener);
  }

  host.register({
    id: "example-register-watch",
    label: "Register Watch (example)",
    create(ctx) {
      const shell = ctx.createToolWindowShell("example-register-watch", "Register Watch (example)", 520, 420, `
        <div class="register-watch-tool">
          <div class="register-watch-toolbar">
            <label>Watched register
              <select data-watch="register">
                ${WATCHABLE_REGISTERS.map((name) => `<option value="${name}">${name}</option>`).join("")}
              </select>
            </label>
            <button class="tool-btn" data-watch="clear" type="button">Clear log</button>
            <button class="tool-btn" data-watch="close" type="button">Close</button>
          </div>
          <p class="register-watch-status" data-watch="status"></p>
          <div class="register-watch-current">Current value<strong data-watch="value">-</strong></div>
          <div class="register-watch-log"><table data-watch="log"></table></div>
        </div>
      `);

      const rootElement = shell.root;
      const registerSelect = rootElement.querySelector("[data-watch='register']");
      const statusNode = rootElement.querySelector("[data-watch='status']");
      const valueNode = rootElement.querySelector("[data-watch='value']");
      const logNode = rootElement.querySelector("[data-watch='log']");

      // State lives in the closure: create() runs once, so it survives every
      // close and reopen of the window.
      let watched = registerSelect.value;
      let history = [];
      let previous = null;
      let latestSnapshot = null;

      function render() {
        const current = history.length ? history[history.length - 1] : null;
        valueNode.textContent = current
          ? `${current.value} (0x${(current.value >>> 0).toString(16).padStart(8, "0")})`
          : "-";
        statusNode.textContent = !latestSnapshot || latestSnapshot.assembled !== true
          ? t("Assemble a program to start watching a register.")
          : t("Watching {register}: {count} change(s) recorded.", { register: watched, count: history.length });

        logNode.replaceChildren();
        const head = document.createElement("thead");
        const headRow = document.createElement("tr");
        [t("Step"), t("PC"), t("Previous"), t("New value")].forEach((title) => {
          const cell = document.createElement("th");
          cell.textContent = title;
          headRow.appendChild(cell);
        });
        head.appendChild(headRow);
        logNode.appendChild(head);

        const body = document.createElement("tbody");
        history.slice().reverse().forEach((entry) => {
          const row = document.createElement("tr");
          [entry.step, entry.pcHex || "-", entry.previousValue === null ? "-" : entry.previousValue, entry.value]
            .forEach((value) => {
              const cell = document.createElement("td");
              cell.textContent = String(value);
              row.appendChild(cell);
            });
          body.appendChild(row);
        });
        logNode.appendChild(body);
      }

      function consume(snapshot) {
        latestSnapshot = snapshot;
        if (!snapshot || snapshot.assembled !== true) {
          render();
          return;
        }
        const observation = coreApi.nextObservation(previous, snapshot, watched);
        if (observation) {
          previous = observation;
          history = coreApi.appendObservation(history, observation);
        }
        render();
      }

      registerSelect.addEventListener("change", () => {
        watched = registerSelect.value;
        history = [];
        previous = null;
        if (latestSnapshot) consume(latestSnapshot);
        else render();
      });
      rootElement.querySelector("[data-watch='clear']").addEventListener("click", () => {
        history = [];
        previous = null;
        render();
      });
      rootElement.querySelector("[data-watch='close']").addEventListener("click", shell.close);

      subscribeLanguageChange(() => {
        shell.refreshTranslations?.();
        render();
      });
      render();

      return {
        root: rootElement,
        // No connect control, so the tool is always willing to receive updates.
        // Returning false here would stop delivery after the seed snapshot.
        isConnected: () => true,
        open() {
          shell.open();
          if (latestSnapshot) consume(latestSnapshot);
        },
        close: shell.close,
        onSnapshot(snapshot, delivery = {}) {
          // Cheap enough to process every entry of a batch, but the render is
          // deferred to the last one so a long batch paints once.
          if (delivery.batched === true && delivery.isLast !== true) {
            latestSnapshot = snapshot;
            if (snapshot && snapshot.assembled === true) {
              const observation = coreApi.nextObservation(previous, snapshot, watched);
              if (observation) {
                previous = observation;
                history = coreApi.appendObservation(history, observation);
              }
            }
            return;
          }
          consume(snapshot);
        }
      };
    }
  });
})(typeof window !== "undefined" ? window : globalThis);
