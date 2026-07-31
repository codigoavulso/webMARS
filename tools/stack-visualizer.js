(() => {
  const host = window.MarsWebTools;
  if (!host || typeof host.register !== "function") return;

  const STYLE_ID = "mars-web-tool-stack-visualizer-style";
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .sv-tool { display:flex; flex-direction:column; gap:6px; height:100%; box-sizing:border-box; padding:8px; font:12px "Segoe UI", Tahoma, sans-serif; color:var(--text); }
      .sv-toolbar { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
      .sv-toolbar .tool-btn { padding:4px 9px; }
      .sv-field { display:flex; align-items:center; gap:4px; font-weight:700; }
      .sv-field select, .sv-field input { font:12px Consolas, "Courier New", monospace; padding:2px 4px; border:1px solid var(--line); background:var(--surface); color:var(--text); }
      .sv-field input { width:104px; }
      .sv-check { display:flex; align-items:center; gap:4px; white-space:nowrap; }
      .sv-zoom { display:flex; align-items:center; gap:4px; }
      .sv-zoom input[type="range"] { width:96px; }
      .sv-zoom .sv-zoom-label { min-width:74px; font-weight:700; color:var(--text-muted); }
      .sv-icon { min-width:26px; text-align:center; }

      .sv-exec { display:flex; align-items:center; gap:8px; flex-wrap:wrap; border:1px solid var(--line); background:var(--surface-raised); padding:4px 6px; }
      .sv-exec-group { display:flex; align-items:center; gap:3px; }
      .sv-exec-label { font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-soft); margin-right:2px; }
      .sv-exec .tool-btn { padding:3px 8px; }
      .sv-exec .tool-btn[aria-pressed="true"] { border-color:var(--accent); background:var(--accent-soft); font-weight:700; }
      .sv-exec .tool-btn:disabled { opacity:.5; }
      .sv-exec-state { margin-left:auto; font:11px Consolas, "Courier New", monospace; color:var(--text-muted); }
      .sv-exec-state.is-armed { color:var(--accent); font-weight:700; }
      .sv-exec-state.is-stopped { color:var(--warn); font-weight:700; }

      .sv-main { display:grid; grid-template-columns:minmax(150px, 190px) minmax(0, 1fr) minmax(0, 274px); grid-template-rows:minmax(0, 1fr); gap:8px; flex:1; min-height:0; }
      .sv-map-pane, .sv-detail-pane { display:flex; flex-direction:column; gap:4px; min-height:0; min-width:0; }
      .sv-map-pane { border:1px solid var(--line); background:var(--surface); padding:4px; }
      .sv-map-pane canvas[data-sv="map"] { flex:1; min-height:0; width:100%; display:block; cursor:pointer; touch-action:none; }
      .sv-map-pane canvas[data-sv="spark"] { height:62px; flex:0 0 62px; width:100%; display:block; }
      .sv-pane-label { font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-faint); }

      .sv-detail-pane canvas { flex:1; min-height:0; width:100%; display:block; border:1px solid var(--line); background:var(--surface); outline:none; cursor:crosshair; touch-action:none; }
      .sv-detail-pane canvas:focus { border-color:var(--accent); }
      .sv-hint { font-size:10px; color:var(--text-faint); }
      .sv-status { display:flex; flex-wrap:wrap; gap:4px 10px; font:11px Consolas, "Courier New", monospace; color:var(--text-muted); }
      .sv-status b { color:var(--text); font-weight:700; }

      .sv-side { display:flex; flex-direction:column; gap:6px; min-height:0; min-width:0; }
      .sv-card { border:1px solid var(--line); background:var(--surface-raised); padding:6px; display:flex; flex-direction:column; gap:4px; min-height:0; }
      .sv-card > h4 { margin:0; font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-soft); }
      .sv-card.sv-inspector { flex:1 1 auto; overflow:auto; }
      .sv-card.sv-frames { flex:0 0 auto; max-height:38%; overflow:auto; }
      .sv-decode { margin:0; font:11px Consolas, "Courier New", monospace; white-space:pre-wrap; word-break:break-word; color:var(--text); user-select:text; }
      .sv-frame-row { display:flex; gap:6px; align-items:baseline; padding:2px 4px; border-left:4px solid var(--line); cursor:pointer; font:11px Consolas, "Courier New", monospace; }
      .sv-frame-row:hover { background:var(--surface-inset); }
      .sv-frame-row.is-selected { background:var(--accent-soft); }
      .sv-frame-row .sv-frame-name { font-weight:700; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      .sv-frame-row .sv-frame-size { color:var(--text-muted); }
      .sv-empty { color:var(--text-faint); font-style:italic; }

      .sv-log-pane { display:flex; flex-direction:column; gap:4px; flex:0 0 auto; height:172px; min-height:96px; }
      .sv-log-head { display:flex; align-items:center; gap:8px; }
      .sv-log-head strong { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--text-soft); }
      .sv-log-head .sv-warn-count { color:var(--warn); font-weight:700; }
      .sv-log-head .sv-filter { display:flex; gap:2px; margin-left:auto; }
      .sv-log-head .sv-filter .tool-btn { margin-left:0; padding:2px 8px; }
      .sv-log-head .tool-btn { margin-left:6px; padding:2px 8px; }
      .sv-log-head .tool-btn[aria-pressed="true"] { border-color:var(--accent); background:var(--accent-soft); color:var(--text); font-weight:700; }
      .sv-log { flex:1; min-height:0; overflow:auto; border:1px solid var(--line); background:var(--surface); font:11px Consolas, "Courier New", monospace; padding:2px; }
      .sv-log-row { display:flex; gap:6px; padding:1px 4px; border-left:3px solid transparent; cursor:default; }
      .sv-log-row[data-address] { cursor:pointer; }
      .sv-log-row:hover { background:var(--surface-inset); }
      .sv-log-row .sv-log-step { color:var(--text-faint); min-width:56px; }
      .sv-log-row .sv-log-text { flex:1; white-space:pre-wrap; word-break:break-word; }
      .sv-log-row.sv-kind-call { border-left-color:#3f8fd6; }
      .sv-log-row.sv-kind-return { border-left-color:#7d6fd1; }
      .sv-log-row.sv-kind-alloc { border-left-color:#d18f3a; }
      .sv-log-row.sv-kind-store { border-left-color:#3fa06a; }
      .sv-log-row.sv-kind-load { border-left-color:#59b1a8; }
      .sv-log-row.sv-kind-warn { border-left-color:var(--warn); background:var(--warn-bg); color:var(--warn); }
      .sv-log-row.sv-kind-stop { border-left-color:var(--accent); background:var(--accent-soft); font-weight:700; }

      .sv-footer { display:flex; align-items:center; gap:8px; }
      .sv-footer .ctrl { flex:1; text-align:center; font-weight:700; color:var(--text); }
      .sv-footer .tool-btn { min-width:110px; }

      /* A narrow window drops the side column below the map and detail panes, and
         a very narrow one stacks everything so the zoomable view keeps its space. */
      .sv-tool.sv-medium .sv-main {
        grid-template-columns:minmax(140px, 172px) minmax(0, 1fr);
        grid-template-rows:minmax(0, 1fr) auto;
      }
      .sv-tool.sv-medium .sv-side {
        grid-column:1 / -1;
        flex-direction:row;
        max-height:132px;
      }
      .sv-tool.sv-medium .sv-card { flex:1 1 0; min-width:0; }
      .sv-tool.sv-medium .sv-card.sv-frames { max-height:none; }

      .sv-tool.sv-small .sv-toolbar { flex-wrap:nowrap; overflow-x:auto; }
      .sv-tool.sv-small .sv-toolbar > * { flex:0 0 auto; }
      .sv-tool.sv-small .sv-main {
        grid-template-columns:minmax(0, 1fr);
        grid-template-rows:78px minmax(120px, 1fr) auto;
        gap:5px;
      }
      .sv-tool.sv-small .sv-map-pane { flex-direction:row; align-items:stretch; }
      .sv-tool.sv-small .sv-map-pane .sv-pane-label { display:none; }
      .sv-tool.sv-small .sv-map-pane canvas[data-sv="map"] { flex:2 1 0; height:auto; }
      .sv-tool.sv-small .sv-map-pane canvas[data-sv="spark"] { flex:1 1 0; height:auto; }
      .sv-tool.sv-small .sv-hint { display:none; }
      .sv-tool.sv-small .sv-side { flex-direction:row; max-height:132px; }
      .sv-tool.sv-small .sv-card { flex:1 1 0; min-width:0; }
      .sv-tool.sv-small .sv-card.sv-frames { max-height:none; }
      .sv-tool.sv-small .sv-log-pane { height:120px; }
      .sv-tool.sv-short .sv-log-pane { height:92px; min-height:64px; }
      .sv-tool.sv-short .sv-side { max-height:96px; }
      .sv-tool.sv-short .sv-hint { display:none; }

      /* A short window (a landscape phone, or a squeezed desktop window) gives
         every spare pixel to the zoomable view. */
      .sv-tool.sv-tiny .sv-main { grid-template-rows:54px minmax(96px, 1fr); }
      .sv-tool.sv-tiny .sv-side { display:none; }
      .sv-tool.sv-tiny .sv-log-pane { height:66px; min-height:52px; }
      .sv-tool.sv-tiny .sv-footer .ctrl { display:none; }
      .sv-tool.sv-tiny .sv-status { display:none; }

      /* Mobile mode: one full-screen panel, touch-sized controls, and the same
         stacked geometry the width tiers already produce. */
      .desktop-stacked .sv-tool { gap:5px; padding:5px; }
      .desktop-stacked .sv-tool .sv-toolbar { gap:5px; overflow-x:auto; flex-wrap:nowrap; padding-bottom:2px; }
      .desktop-stacked .sv-tool .sv-toolbar > * { flex:0 0 auto; }
      .desktop-stacked .sv-tool .sv-toolbar .tool-btn { min-width:max-content; min-height:30px; padding:4px 10px; }
      .desktop-stacked .sv-tool .sv-field select,
      .desktop-stacked .sv-tool .sv-field input { min-height:28px; }
      .desktop-stacked .sv-tool .sv-check input { width:17px; height:17px; }
      .desktop-stacked .sv-tool .sv-zoom input[type="range"] { width:118px; height:26px; }
      .desktop-stacked .sv-tool .sv-main {
        grid-template-columns:minmax(0, 1fr);
        grid-template-rows:92px minmax(140px, 1fr) auto;
        gap:5px;
      }
      .desktop-stacked .sv-tool .sv-map-pane { flex-direction:row; align-items:stretch; }
      .desktop-stacked .sv-tool .sv-map-pane .sv-pane-label { display:none; }
      .desktop-stacked .sv-tool .sv-map-pane canvas[data-sv="map"] { flex:2 1 0; height:auto; }
      .desktop-stacked .sv-tool .sv-map-pane canvas[data-sv="spark"] { flex:1 1 0; height:auto; }
      .desktop-stacked .sv-tool .sv-side { flex-direction:row; max-height:128px; }
      .desktop-stacked .sv-tool .sv-card { flex:1 1 0; min-width:0; }
      .desktop-stacked .sv-tool .sv-card.sv-frames { max-height:none; }
      .desktop-stacked .sv-tool .sv-log-pane { height:118px; }
      .desktop-stacked .sv-tool .sv-log-head .tool-btn { min-height:26px; }
      .desktop-stacked .sv-tool .sv-footer { gap:5px; overflow-x:auto; }
      .desktop-stacked .sv-tool .sv-footer .ctrl { display:none; }
      .desktop-stacked .sv-tool .sv-footer .tool-btn { min-width:max-content; min-height:30px; flex:1 0 auto; }
      /* Portrait phones are tall enough for the inspector; landscape is not. */
      .desktop-stacked .sv-tool.sv-tiny .sv-side { display:none; }
      .desktop-stacked .sv-tool.sv-tiny .sv-main { grid-template-rows:52px minmax(96px, 1fr); }
    `;
    document.head.appendChild(style);
  }

  const REGISTER_NAMES = [
    "$zero", "$at", "$v0", "$v1", "$a0", "$a1", "$a2", "$a3",
    "$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7",
    "$s0", "$s1", "$s2", "$s3", "$s4", "$s5", "$s6", "$s7",
    "$t8", "$t9", "$k0", "$k1", "$gp", "$sp", "$fp", "$ra"
  ];
  const REG_GP = 28;
  const REG_SP = 29;
  const REG_FP = 30;
  const REG_RA = 31;

  const STORE_OPS = new Set(["sw", "sh", "sb", "swl", "swr", "sc", "swc1", "sdc1"]);
  const LOAD_OPS = new Set(["lw", "lh", "lhu", "lb", "lbu", "lwl", "lwr", "ll", "lwc1", "ldc1"]);

  // Zoom levels run from a compressed overview of a whole segment down to the
  // individual bits of one word.
  const ZOOM_LEVELS = [
    { bytesPerRow: 64, rowHeight: 8, mode: "blocks", label: "Overview" },
    { bytesPerRow: 16, rowHeight: 16, mode: "blocks", label: "Blocks" },
    { bytesPerRow: 4, rowHeight: 24, mode: "word", label: "Words" },
    { bytesPerRow: 4, rowHeight: 62, mode: "bytes", label: "Bytes" },
    { bytesPerRow: 4, rowHeight: 92, mode: "bits", label: "Bits" }
  ];

  const FRAME_COLORS = ["#4f8fd6", "#3fa06a", "#d18f3a", "#b565c9", "#59b1a8", "#c9694f"];
  const SEGMENT_COLORS = {
    reserved: "#7b8794",
    text: "#4f8fd6",
    extern: "#7d6fd1",
    data: "#3fa06a",
    heap: "#d18f3a",
    free: "#8a94a3",
    stack: "#d2553c",
    ktext: "#7f8a99",
    kdata: "#69788a",
    mmio: "#b44db4"
  };

  const MAX_NARRATION = 400;
  const MAX_CELLS = 20000;
  const MAX_SP_SAMPLES = 720;
  const MAX_DENSITY_SCAN = 60000;
  const DENSITY_REFRESH_MS = 250;

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

  function toHexByte(value) {
    return (value & 0xff).toString(16).padStart(2, "0");
  }

  function parseAddressText(text) {
    const cleaned = String(text ?? "").trim().replace(/\s+/g, "");
    if (!cleaned) return null;
    const parsed = /^0[xX][0-9a-fA-F]+$/.test(cleaned)
      ? Number.parseInt(cleaned.slice(2), 16)
      : (/^[0-9]+$/.test(cleaned) ? Number.parseInt(cleaned, 10) : Number.NaN);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 0xffffffff) return null;
    return parsed >>> 0;
  }

  function parseInstruction(statement) {
    const cleaned = String(statement ?? "").split("#")[0].trim();
    if (!cleaned) return { op: "", operands: [] };
    const parts = cleaned.split(/\s+/);
    const op = (parts.shift() || "").toLowerCase();
    const operands = parts.join(" ").split(",").map((operand) => operand.trim()).filter(Boolean);
    return { op, operands };
  }

  function normalizeRegisterToken(token) {
    const match = /^\$([a-z0-9]+)$/i.exec(String(token ?? "").trim());
    if (!match) return null;
    const name = `$${match[1].toLowerCase()}`;
    if (REGISTER_NAMES.includes(name)) return name;
    const numeric = Number.parseInt(match[1], 10);
    if (Number.isInteger(numeric) && numeric >= 0 && numeric < REGISTER_NAMES.length) return REGISTER_NAMES[numeric];
    return name;
  }

  // "8($sp)" -> { offset: 8, base: "$sp" }
  function parseMemoryOperand(operand) {
    const match = /^(-?(?:0[xX][0-9a-fA-F]+|\d+))?\s*\(\s*(\$[a-z0-9]+)\s*\)$/i.exec(String(operand ?? "").trim());
    if (!match) return null;
    const rawOffset = match[1] ?? "0";
    const offset = /^-?0[xX]/.test(rawOffset)
      ? Number.parseInt(rawOffset, 16)
      : Number.parseInt(rawOffset, 10);
    return {
      offset: Number.isFinite(offset) ? offset : 0,
      base: normalizeRegisterToken(match[2])
    };
  }

  function findRegisterChange(triples, index) {
    if (!Array.isArray(triples)) return null;
    for (let offset = 0; offset + 2 < triples.length; offset += 3) {
      if ((triples[offset] | 0) === index) {
        return { before: triples[offset + 1] | 0, after: triples[offset + 2] | 0 };
      }
    }
    return null;
  }

  function asciiChar(byte) {
    return byte >= 0x20 && byte <= 0x7e ? String.fromCharCode(byte) : ".";
  }

  function wordBytes(word) {
    const value = word >>> 0;
    return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
  }

  function asciiOfWord(word) {
    return wordBytes(word).map(asciiChar).join("");
  }

  host.register({
    id: "stack-visualizer",
    label: "Stack Visualizer",
    create(ctx) {
      const shell = ctx.createToolWindowShell("stack-visualizer", "Stack Visualizer - Memory Space and Call Frames, Version 1.0", 1220, 830, `
        <div class="sv-tool">
          <div class="sv-toolbar">
            <button class="tool-btn" data-sv="connect" type="button">Connect to MIPS</button>
            <label class="sv-field"><span>Region</span><select data-sv="segment"></select></label>
            <label class="sv-field"><span>Go to</span><input data-sv="goto" type="text" spellcheck="false" placeholder="0x7fffeffc"></label>
            <span class="sv-zoom">
              <button class="tool-btn sv-icon" data-sv="zoom-out" type="button">&minus;</button>
              <input type="range" min="0" max="4" step="1" value="2" data-sv="zoom">
              <button class="tool-btn sv-icon" data-sv="zoom-in" type="button">+</button>
              <span class="sv-zoom-label" data-sv="zoom-label">Words</span>
            </span>
            <label class="sv-check"><input type="checkbox" data-sv="follow" checked><span>Follow $sp</span></label>
            <label class="sv-check"><input type="checkbox" data-sv="hex" checked><span>Hex values</span></label>
            <label class="sv-check"><input type="checkbox" data-sv="high-top" checked><span>High addresses on top</span></label>
          </div>
          <div class="sv-exec">
            <span class="sv-exec-group">
              <button class="tool-btn" data-sv-run="step" type="button">Step</button>
              <button class="tool-btn" data-sv-run="backstep" type="button">Back</button>
              <button class="tool-btn" data-sv-run="go" type="button">Run</button>
              <button class="tool-btn" data-sv-run="pause" type="button">Pause</button>
            </span>
            <span class="sv-exec-group">
              <span class="sv-exec-label">Run until</span>
              <button class="tool-btn" data-sv-until="call" type="button" aria-pressed="false">next call</button>
              <button class="tool-btn" data-sv-until="over" type="button" aria-pressed="false">step over</button>
              <button class="tool-btn" data-sv-until="finish" type="button" aria-pressed="false">frame returns</button>
              <button class="tool-btn" data-sv-until="sp" type="button" aria-pressed="false">$sp moves</button>
              <button class="tool-btn" data-sv-until="watch" type="button" aria-pressed="false">word changes</button>
            </span>
            <label class="sv-check"><input type="checkbox" data-sv="break-warn"><span>Pause on warning</span></label>
            <span class="sv-exec-state" data-sv="exec-state"></span>
          </div>
          <div class="sv-main">
            <div class="sv-map-pane">
              <div class="sv-pane-label">Memory space</div>
              <canvas data-sv="map" role="img" aria-label="Map of the address space with the current stack pointer"></canvas>
              <div class="sv-pane-label">Stack depth over time</div>
              <canvas data-sv="spark" role="img" aria-label="Stack depth over time"></canvas>
            </div>
            <div class="sv-detail-pane">
              <canvas data-sv="detail" tabindex="0" role="img" aria-label="Memory window: use the arrow keys to scroll and plus or minus to zoom"></canvas>
              <div class="sv-status" data-sv="status"></div>
              <div class="sv-hint" data-sv="hint">Wheel scrolls &middot; Ctrl+wheel zooms &middot; click inspects a word &middot; double-click follows it as a pointer</div>
            </div>
            <div class="sv-side">
              <div class="sv-card sv-inspector">
                <h4>Word inspector</h4>
                <pre class="sv-decode" data-sv="decode">Connect the tool and run a program, then click any word.</pre>
              </div>
              <div class="sv-card sv-frames">
                <h4>Call stack</h4>
                <div data-sv="frames"><div class="sv-empty">No active frames.</div></div>
              </div>
            </div>
          </div>
          <div class="sv-log-pane">
            <div class="sv-log-head">
              <strong>What the stack is doing</strong>
              <span class="sv-warn-count" data-sv="warn-count"></span>
              <span class="sv-filter">
                <button class="tool-btn" data-sv-filter="all" type="button" aria-pressed="true">All</button>
                <button class="tool-btn" data-sv-filter="calls" type="button" aria-pressed="false">Calls</button>
                <button class="tool-btn" data-sv-filter="memory" type="button" aria-pressed="false">Saves</button>
                <button class="tool-btn" data-sv-filter="warn" type="button" aria-pressed="false">Warnings</button>
              </span>
              <button class="tool-btn" data-sv="clear-log" type="button">Clear log</button>
            </div>
            <div class="sv-log" data-sv="log"></div>
          </div>
          <div class="sv-footer">
            <div class="ctrl">Tool Control</div>
            <button class="tool-btn" data-sv="reset" type="button">Reset</button>
            <button class="tool-btn" data-sv="help" type="button">Help</button>
            <button class="tool-btn" data-sv="close" type="button">Close</button>
          </div>
        </div>
      `);

      const root = shell.root;
      const connectButton = root.querySelector("[data-sv='connect']");
      const segmentSelect = root.querySelector("[data-sv='segment']");
      const gotoInput = root.querySelector("[data-sv='goto']");
      const zoomInput = root.querySelector("[data-sv='zoom']");
      const zoomLabel = root.querySelector("[data-sv='zoom-label']");
      const zoomInButton = root.querySelector("[data-sv='zoom-in']");
      const zoomOutButton = root.querySelector("[data-sv='zoom-out']");
      const followCheck = root.querySelector("[data-sv='follow']");
      const hexCheck = root.querySelector("[data-sv='hex']");
      const highTopCheck = root.querySelector("[data-sv='high-top']");
      const mapCanvas = root.querySelector("[data-sv='map']");
      const sparkCanvas = root.querySelector("[data-sv='spark']");
      const detailCanvas = root.querySelector("[data-sv='detail']");
      const execStateBox = root.querySelector("[data-sv='exec-state']");
      const breakWarnCheck = root.querySelector("[data-sv='break-warn']");
      const runButtons = new Map([...root.querySelectorAll("[data-sv-run]")]
        .map((button) => [button.dataset.svRun, button]));
      const untilButtons = new Map([...root.querySelectorAll("[data-sv-until]")]
        .map((button) => [button.dataset.svUntil, button]));
      const statusBox = root.querySelector("[data-sv='status']");
      const hintBox = root.querySelector("[data-sv='hint']");
      const filterButtons = [...root.querySelectorAll("[data-sv-filter]")];
      const decodeBox = root.querySelector("[data-sv='decode']");
      const framesBox = root.querySelector("[data-sv='frames']");
      const logBox = root.querySelector("[data-sv='log']");
      const warnCountLabel = root.querySelector("[data-sv='warn-count']");
      const clearLogButton = root.querySelector("[data-sv='clear-log']");
      const resetButton = root.querySelector("[data-sv='reset']");
      const helpButton = root.querySelector("[data-sv='help']");
      const closeButton = root.querySelector("[data-sv='close']");

      const escapeHtml = typeof ctx.escapeHtml === "function"
        ? ctx.escapeHtml
        : (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
          })[character]);

      let connected = false;
      let latestSnapshot = null;
      let lastRuntimeRevision = null;
      let labelByAddress = new Map();
      let labelCount = -1;

      // Provenance of the words the program wrote: who wrote them, when and why.
      let cells = new Map();
      let frames = [];
      let frameSeq = 0;
      let narration = [];
      let narrationSeq = 0;
      let spSamples = [];
      let deepestSp = null;
      let warnCount = 0;
      let lastWriteAddress = null;

      let trackedSp = null;
      let trackedFp = null;
      let trackedRa = null;
      let trackedPc = null;

      let zoomIndex = 2;
      let viewTopAddress = null;
      let selectedAddress = null;
      let selectedFrameId = null;
      let followSp = true;
      let hexValues = true;
      let highTop = true;
      let logFilter = "all";

      let renderScheduled = false;
      let renderFailureReported = false;
      let renderedNarrationSeq = -1;
      let renderedNarrationHead = null;
      let densityCache = null;
      let densityStamp = 0;
      let detailRowMap = [];
      let mapBands = [];
      let dragPointerId = null;
      let dragOrigin = null;
      const activePointers = new Map();
      let pinchOrigin = null;

      // Execution control: an armed condition watches the running program and stops
      // it on the very next instruction once the condition holds.
      let armedStop = null;
      let armedBreakpoint = null;
      let pauseOnWarning = false;
      let watchAddress = null;
      let pendingStepOver = false;
      let observerSp = null;
      let releaseObservers = null;
      let pendingStopMessage = "";
      let lastStopReason = "";
      let pendingResume = false;
      let queuedObserverStop = null;

      const history = ctx.createToolDeltaHistory({
        applyInverse(delta) {
          applyInverseDelta(delta);
        }
      });

      function memoryMap() {
        const engineMap = ctx.engine?.memoryMap;
        const base = ctx.defaultMemoryMap || {};
        return { ...base, ...(engineMap || {}) };
      }

      function memoryWords() {
        if (ctx.engine?.memoryWords instanceof Map) return ctx.engine.memoryWords;
        if (latestSnapshot?.memoryWords instanceof Map) return latestSnapshot.memoryWords;
        return null;
      }

      function readWord(address) {
        const words = memoryWords();
        if (!words) return 0;
        return (words.get(address >>> 0) ?? 0) | 0;
      }

      function hasWord(address) {
        const words = memoryWords();
        if (!words) return false;
        return words.has(address >>> 0) || cells.has(address >>> 0);
      }

      function readRegister(index) {
        const registers = ctx.engine?.registers;
        if (registers && index < registers.length) return registers[index] | 0;
        const rows = latestSnapshot?.registers;
        if (Array.isArray(rows)) {
          const row = rows.find((entry) => entry.index === index);
          if (row) return row.value | 0;
        }
        return 0;
      }

      function currentSp() {
        if (Number.isFinite(trackedSp)) return trackedSp >>> 0;
        return readRegister(REG_SP) >>> 0;
      }

      function currentFp() {
        if (Number.isFinite(trackedFp)) return trackedFp >>> 0;
        return readRegister(REG_FP) >>> 0;
      }

      function currentPc() {
        if (Number.isFinite(trackedPc)) return trackedPc >>> 0;
        if (Number.isFinite(latestSnapshot?.pc)) return latestSnapshot.pc >>> 0;
        return (ctx.engine?.pc ?? 0) >>> 0;
      }

      // ---------------------------------------------------------------- segments

      function buildSegments() {
        const map = memoryMap();
        const textBase = map.textBase >>> 0;
        const externBase = (map.externBase ?? map.dataSegmentBase ?? 0x10000000) >>> 0;
        const dataBase = (map.dataBase ?? 0x10010000) >>> 0;
        const heapBase = (map.heapBase ?? 0x10040000) >>> 0;
        const kernelTextBase = (map.kernelTextBase ?? map.kernelBase ?? 0x80000000) >>> 0;
        const kernelDataBase = (map.kernelDataBase ?? 0x90000000) >>> 0;
        const mmioBase = (map.mmioBase ?? 0xffff0000) >>> 0;
        const stackBase = (map.stackBase ?? map.stackPointer ?? 0x7ffffffc) >>> 0;
        const stackPointer = (map.stackPointer ?? stackBase) >>> 0;

        const heapBytes = Number(ctx.engine?.reservedHeapMappedBytes);
        const heapBreak = heapBase + (Number.isFinite(heapBytes) && heapBytes > 0 ? heapBytes : 0);
        const heapEnd = Math.max(heapBreak, heapBase + 0x1000);

        // The visible stack band follows how deep the program has actually gone.
        const observed = [currentSp(), deepestSp, stackPointer].filter((value) => Number.isFinite(value));
        const deepest = observed.length ? Math.min(...observed.map((value) => value >>> 0)) : stackPointer;
        const stackStart = Math.max(heapEnd, (deepest - 0x200) & ~0xf) >>> 0;

        return [
          { id: "reserved", label: "reserved", start: 0, end: textBase, weight: 0.5 },
          { id: "text", label: ".text", start: textBase, end: externBase, weight: 1.4 },
          { id: "extern", label: ".extern / $gp", start: externBase, end: dataBase, weight: 0.8 },
          { id: "data", label: ".data", start: dataBase, end: heapBase, weight: 1.6 },
          { id: "heap", label: "heap", start: heapBase, end: heapEnd, weight: 1.0 },
          { id: "free", label: "free space", start: heapEnd, end: stackStart, weight: 0.8 },
          { id: "stack", label: "stack", start: stackStart, end: (stackBase + 4) >>> 0, weight: 2.4 },
          { id: "ktext", label: ".ktext", start: kernelTextBase, end: kernelDataBase, weight: 0.7 },
          { id: "kdata", label: ".kdata", start: kernelDataBase, end: mmioBase, weight: 0.7 },
          { id: "mmio", label: "MMIO", start: mmioBase, end: Math.min(0x100000000, mmioBase + 0x10000), weight: 0.7 }
        ].filter((segment) => segment.end > segment.start);
      }

      function segmentAt(address, segments = buildSegments()) {
        const addr = address >>> 0;
        return segments.find((segment) => addr >= segment.start && addr < segment.end) || null;
      }

      function isStackAddress(address, segments = buildSegments()) {
        const map = memoryMap();
        const stackBase = (map.stackBase ?? map.stackPointer ?? 0x7ffffffc) >>> 0;
        const addr = address >>> 0;
        if (addr > stackBase) return false;
        const segment = segmentAt(addr, segments);
        return segment?.id === "stack" || segment?.id === "free";
      }

      function labelFor(address) {
        return labelByAddress.get(address >>> 0) || null;
      }

      // A new program often has the same number of labels as the previous one, so
      // the count alone cannot decide whether the symbol table is still current.
      function syncLabels(snapshot, force = false) {
        const rows = Array.isArray(snapshot?.labels) ? snapshot.labels : null;
        if (rows) {
          if (!force && rows.length === labelCount) return;
          labelByAddress = new Map(rows.map((entry) => [Number(entry.address) >>> 0, String(entry.label)]));
          labelCount = rows.length;
          return;
        }
        const engineLabels = ctx.engine?.program?.labels;
        if (engineLabels instanceof Map && (force || engineLabels.size !== labelCount)) {
          labelByAddress = new Map([...engineLabels.entries()].map(([label, address]) => [address >>> 0, label]));
          labelCount = engineLabels.size;
        }
      }

      // ------------------------------------------------------------ tracked state

      function resetTracking(preserveView = true) {
        history.clear(Number(latestSnapshot?.steps) | 0);
        cells = new Map();
        frames = [];
        frameSeq = 0;
        narration = [];
        narrationSeq = 0;
        spSamples = [];
        deepestSp = null;
        warnCount = 0;
        lastWriteAddress = null;
        trackedSp = readRegister(REG_SP) >>> 0;
        trackedFp = readRegister(REG_FP) >>> 0;
        trackedRa = readRegister(REG_RA) >>> 0;
        trackedPc = currentPc();
        selectedFrameId = null;
        renderedNarrationSeq = -1;
        renderedNarrationHead = null;
        if (!preserveView) {
          selectedAddress = null;
          viewTopAddress = null;
        }
      }

      function createDelta() {
        return {
          cells: new Map(),
          framesPushed: 0,
          framesPopped: [],
          frameFlags: new Map(),
          frameSeq,
          narrationAdded: 0,
          narrationShifted: [],
          narrationSeq,
          spAdded: 0,
          spShifted: [],
          trackedSp,
          trackedFp,
          trackedRa,
          trackedPc,
          deepestSp,
          warnCount,
          lastWriteAddress
        };
      }

      function applyInverseDelta(delta) {
        if (!delta) return;
        delta.cells.forEach((previous, address) => {
          if (previous == null) cells.delete(address);
          else cells.set(address, previous);
        });
        if (delta.narrationAdded > 0) narration.length = Math.max(0, narration.length - delta.narrationAdded);
        if (delta.narrationShifted.length) narration.unshift(...delta.narrationShifted);
        narrationSeq = delta.narrationSeq;
        if (delta.spAdded > 0) spSamples.length = Math.max(0, spSamples.length - delta.spAdded);
        if (delta.spShifted.length) spSamples.unshift(...delta.spShifted);
        if (delta.framesPushed > 0) frames.length = Math.max(0, frames.length - delta.framesPushed);
        if (delta.framesPopped.length) frames.push(...delta.framesPopped);
        delta.frameFlags.forEach((flags, id) => {
          const frame = frames.find((entry) => entry.id === id);
          if (!frame) return;
          frame.raSaved = flags.raSaved;
          frame.minSp = flags.minSp;
        });
        frameSeq = delta.frameSeq;
        trackedSp = delta.trackedSp;
        trackedFp = delta.trackedFp;
        trackedRa = delta.trackedRa;
        trackedPc = delta.trackedPc;
        deepestSp = delta.deepestSp;
        warnCount = delta.warnCount;
        lastWriteAddress = delta.lastWriteAddress;
        renderedNarrationSeq = -1;
      }

      function rememberFrameFlags(delta, frame) {
        if (!delta || !frame || delta.frameFlags.has(frame.id)) return;
        delta.frameFlags.set(frame.id, { raSaved: frame.raSaved, minSp: frame.minSp });
      }

      function recordCell(delta, address, entry) {
        const addr = address >>> 0;
        if (!cells.has(addr) && cells.size >= MAX_CELLS) return;
        if (delta && !delta.cells.has(addr)) delta.cells.set(addr, cells.get(addr) ?? null);
        cells.set(addr, entry);
      }

      function pushNarration(delta, entry) {
        narrationSeq += 1;
        narration.push({ seq: narrationSeq, ...entry });
        if (delta) delta.narrationAdded += 1;
        while (narration.length > MAX_NARRATION) {
          const removed = narration.shift();
          if (delta) delta.narrationShifted.unshift(removed);
        }
        if (entry.kind === "warn") {
          warnCount += 1;
          requestWarningStop(entry.text);
        }
      }

      function pushSpSample(delta, step, sp) {
        spSamples.push({ step: step | 0, sp: sp >>> 0 });
        if (delta) delta.spAdded += 1;
        while (spSamples.length > MAX_SP_SAMPLES) {
          const removed = spSamples.shift();
          if (delta) delta.spShifted.unshift(removed);
        }
      }

      // ------------------------------------------------------------ event decoding

      function frameName(address) {
        return labelFor(address) || toHex32(address);
      }

      function activeFrame() {
        return frames.length ? frames[frames.length - 1] : null;
      }

      function frameRegions() {
        const sp = currentSp();
        return frames.map((frame, index) => {
          const high = (frame.spAtCall - 4) >>> 0;
          const low = (index + 1 < frames.length ? frames[index + 1].spAtCall : sp) >>> 0;
          return { frame, low, high, index };
        });
      }

      function frameForAddress(address) {
        const addr = address >>> 0;
        const regions = frameRegions();
        for (let index = regions.length - 1; index >= 0; index -= 1) {
          const region = regions[index];
          if (addr >= region.low && addr <= region.high) return region;
        }
        return null;
      }

      function describeSpOffset(address) {
        const sp = currentSp();
        const addr = address >>> 0;
        if (addr === sp) return "$sp";
        const delta = addr - sp;
        if (delta > 0 && delta < 0x10000) return `$sp+${delta}`;
        const fp = currentFp();
        if (fp !== 0) {
          const fpDelta = addr - fp;
          if (fpDelta >= 0 && fpDelta < 0x10000) return fpDelta === 0 ? "$fp" : `$fp+${fpDelta}`;
        }
        return null;
      }

      function handleInstructionEvent(event, retainHistory) {
        const step = event.stepAfter | 0;
        const delta = retainHistory ? history.ensure(step, createDelta) : null;
        const parsed = event.opcode
          ? { op: event.opcode, operands: event.instructionOperands || [] }
          : parseInstruction(event.executedInstruction);
        const spChange = findRegisterChange(event.registerChanges, REG_SP);
        const fpChange = findRegisterChange(event.registerChanges, REG_FP);
        const raChange = findRegisterChange(event.registerChanges, REG_RA);
        const accesses = Array.isArray(event.memoryAccesses) ? event.memoryAccesses : [];
        const segments = spChange || accesses.length ? buildSegments() : null;
        const spBefore = Number.isFinite(trackedSp) ? trackedSp >>> 0 : (spChange ? spChange.before >>> 0 : currentSp());

        if (spChange) trackedSp = spChange.after >>> 0;
        if (fpChange) trackedFp = fpChange.after >>> 0;
        if (raChange) trackedRa = raChange.after >>> 0;
        trackedPc = event.pcAfter >>> 0;

        const sp = currentSp();
        if (deepestSp == null || sp < deepestSp) deepestSp = sp;

        // 1. Stack pointer movement: the frame being reserved or released.
        if (spChange && spChange.after !== spChange.before) {
          pushSpSample(delta, step, sp);
          const moved = (spChange.after | 0) - (spChange.before | 0);
          const isStack = isStackAddress(sp, segments) || isStackAddress(spBefore, segments);
          if (isStack) {
            pushNarration(delta, {
              step,
              kind: "alloc",
              address: sp,
              text: moved < 0
                ? t("{instruction} — reserved {bytes} bytes ({words} word(s)): $sp {from} → {to}", {
                    instruction: event.executedInstruction || "$sp change",
                    bytes: Math.abs(moved),
                    words: Math.round(Math.abs(moved) / 4),
                    from: toHex32(spChange.before),
                    to: toHex32(spChange.after)
                  })
                : t("{instruction} — released {bytes} bytes ({words} word(s)): $sp {from} → {to}", {
                    instruction: event.executedInstruction || "$sp change",
                    bytes: Math.abs(moved),
                    words: Math.round(Math.abs(moved) / 4),
                    from: toHex32(spChange.before),
                    to: toHex32(spChange.after)
                  })
            });
          }
          if (sp % 4 !== 0) {
            pushNarration(delta, {
              step,
              kind: "warn",
              address: sp,
              text: t("$sp is no longer word aligned ({address}); MIPS loads and stores of words will trap.", {
                address: toHex32(sp)
              })
            });
          }
          const map = memoryMap();
          const stackBase = (map.stackBase ?? 0x7ffffffc) >>> 0;
          if (sp > stackBase) {
            pushNarration(delta, {
              step,
              kind: "warn",
              address: sp,
              text: t("$sp moved above the bottom of the stack ({address}): more was released than reserved.", {
                address: toHex32(stackBase)
              })
            });
          }
        }

        // 2. Memory traffic that touches the stack.
        const storedRegister = STORE_OPS.has(parsed.op) ? normalizeRegisterToken(parsed.operands[0]) : null;
        const loadedRegister = LOAD_OPS.has(parsed.op) ? normalizeRegisterToken(parsed.operands[0]) : null;
        const memoryOperand = parseMemoryOperand(parsed.operands[1]);

        accesses.forEach((access) => {
          const address = access.address >>> 0;
          const wordAddress = address & ~0x3;
          const inStack = isStackAddress(wordAddress, segments);

          if (access.kind === "write") {
            lastWriteAddress = wordAddress;
            recordCell(delta, wordAddress, {
              step,
              pc: event.executedAddress >>> 0,
              instruction: event.executedInstruction || "",
              register: storedRegister,
              base: memoryOperand?.base ?? null,
              frameId: activeFrame()?.id ?? 0,
              stack: inStack
            });
            if (!inStack) return;

            const frame = activeFrame();
            if (frame && storedRegister === "$ra") {
              rememberFrameFlags(delta, frame);
              frame.raSaved = true;
            }
            pushNarration(delta, {
              step,
              kind: "store",
              address: wordAddress,
              text: t("{instruction} — stored {source} = {value} at {address}{position}", {
                instruction: event.executedInstruction || parsed.op,
                source: storedRegister || t("a value"),
                value: toHex32(access.value),
                address: toHex32(address),
                position: describeSpOffset(wordAddress) ? ` (${describeSpOffset(wordAddress)})` : ""
              })
            });
            if (address < sp) {
              pushNarration(delta, {
                step,
                kind: "warn",
                address: wordAddress,
                text: t("Wrote {address} below $sp ({sp}): that area is not reserved and any call may overwrite it.", {
                  address: toHex32(address),
                  sp: toHex32(sp)
                })
              });
            }
            return;
          }

          if (!inStack) return;
          const known = cells.has(wordAddress);
          pushNarration(delta, {
            step,
            kind: "load",
            address: wordAddress,
            text: t("{instruction} — loaded {value} from {address}{position} into {target}", {
              instruction: event.executedInstruction || parsed.op,
              value: toHex32(access.value),
              address: toHex32(address),
              position: describeSpOffset(wordAddress) ? ` (${describeSpOffset(wordAddress)})` : "",
              target: loadedRegister || t("a register")
            })
          });
          if (!known && address >= sp) {
            pushNarration(delta, {
              step,
              kind: "warn",
              address: wordAddress,
              text: t("Read {address} before anything was stored there: the value is leftover stack data.", {
                address: toHex32(address)
              })
            });
          }
          if (address < sp) {
            pushNarration(delta, {
              step,
              kind: "warn",
              address: wordAddress,
              text: t("Read {address} below $sp ({sp}): that word belongs to a frame that was already released.", {
                address: toHex32(address),
                sp: toHex32(sp)
              })
            });
          }
        });

        // 3. Returns first, so a call in the same step opens on top of the caller.
        const target = Number.isFinite(event.controlTransferTarget) ? event.controlTransferTarget >>> 0 : null;
        const isCall = parsed.op === "jal" || parsed.op === "jalr"
          || (raChange != null && target != null && raChange.after !== raChange.before);
        // Only the jump family can return; a conditional branch that happens to
        // land on a return address is still an ordinary branch.
        const isJump = parsed.op === "j" || parsed.op === "jr" || parsed.op === "jalr" || parsed.op === "jal";

        if (target != null && isJump && !isCall && frames.length) {
          for (let index = frames.length - 1; index >= 0; index -= 1) {
            if (frames[index].returnAddress !== target) continue;
            const removed = frames.splice(index);
            if (delta) delta.framesPopped.unshift(...removed);
            const returned = removed[0];
            if (returned.spAtCall !== sp) {
              pushNarration(delta, {
                step,
                kind: "warn",
                address: sp,
                text: t("{name} returned with $sp at {actual} instead of {expected}: the frame was not fully released.", {
                  name: returned.name,
                  actual: toHex32(sp),
                  expected: toHex32(returned.spAtCall)
                })
              });
            }
            pushNarration(delta, {
              step,
              kind: "return",
              address: sp,
              text: t("{instruction} — returned from {name} to {address}; {count} frame(s) closed, depth is now {depth}", {
                instruction: event.executedInstruction || "return",
                name: returned.name,
                address: toHex32(target),
                count: removed.length,
                depth: frames.length
              })
            });
            break;
          }
        }

        if (isCall && target != null) {
          // A recursive call from the same site leaves $ra unchanged, so the live
          // register is the only reliable source for the return address.
          const returnAddress = (raChange
            ? raChange.after
            : (Number.isFinite(trackedRa) ? trackedRa : readRegister(REG_RA))) >>> 0;
          const parent = activeFrame();
          if (parent && parent.raSaved !== true) {
            pushNarration(delta, {
              step,
              kind: "warn",
              address: sp,
              text: t("{name} calls another function before saving $ra: its own return address is about to be lost.", {
                name: parent.name
              })
            });
          }
          frameSeq += 1;
          frames.push({
            id: frameSeq,
            name: frameName(target),
            target,
            callSite: event.executedAddress >>> 0,
            returnAddress,
            spAtCall: sp,
            fpAtCall: currentFp(),
            step,
            minSp: sp,
            raSaved: false
          });
          if (delta) delta.framesPushed += 1;
          pushNarration(delta, {
            step,
            kind: "call",
            address: sp,
            text: t("{instruction} — called {name}; $ra = {ra}, $sp = {sp}, depth is now {depth}", {
              instruction: event.executedInstruction || "call",
              name: frameName(target),
              ra: toHex32(returnAddress),
              sp: toHex32(sp),
              depth: frames.length
            })
          });
          if (frames.length === 40) {
            pushNarration(delta, {
              step,
              kind: "warn",
              address: sp,
              text: t("Call depth reached {depth}: deep recursion consumes one frame per call and can exhaust the stack.", {
                depth: frames.length
              })
            });
          }
        }

        const frame = activeFrame();
        if (frame && sp < frame.minSp) {
          rememberFrameFlags(delta, frame);
          frame.minSp = sp;
        }
      }

      // --------------------------------------------------------- execution control

      // A breakpoint is how the runtime already stops a run cleanly, so an armed
      // condition turns into a one-shot breakpoint on the next instruction.
      function placeBreakpoint(address) {
        const engine = ctx.engine;
        const target = address >>> 0;
        if (!engine || typeof engine.toggleBreakpoint !== "function") return;
        clearArmedBreakpoint();
        const owned = engine.breakpoints instanceof Set ? !engine.breakpoints.has(target) : true;
        if (owned) engine.toggleBreakpoint(target);
        armedBreakpoint = { address: target, owned };
      }

      function clearArmedBreakpoint() {
        const engine = ctx.engine;
        if (!armedBreakpoint) return;
        if (armedBreakpoint.owned
          && engine?.breakpoints instanceof Set
          && engine.breakpoints.has(armedBreakpoint.address)) {
          engine.toggleBreakpoint(armedBreakpoint.address);
        }
        armedBreakpoint = null;
      }

      function stopAtNextInstruction() {
        const nextPc = (ctx.engine?.pc ?? 0) >>> 0;
        placeBreakpoint(nextPc);
      }

      function armedLabel(kind, detail = {}) {
        switch (kind) {
          case "call": return t("next call");
          case "over": return t("step over");
          case "finish": return t("{name} returns", { name: detail.name || t("the current frame") });
          case "sp": return t("$sp moves");
          case "watch": return t("{address} changes", { address: toHex32(detail.address >>> 0) });
          default: return t("condition");
        }
      }

      function updateExecState() {
        const running = ctx.runtimeControls?.isRunning?.() === true;
        untilButtons.forEach((button, kind) => {
          button.setAttribute("aria-pressed", armedStop?.kind === kind ? "true" : "false");
        });
        runButtons.forEach((button, kind) => {
          if (kind === "pause") button.disabled = !running;
          else if (kind === "go") button.disabled = running;
          else button.disabled = running;
        });
        if (armedStop) {
          execStateBox.className = "sv-exec-state is-armed";
          execStateBox.textContent = t("waiting for: {condition}", { condition: armedStop.label });
          return;
        }
        if (lastStopReason) {
          execStateBox.className = "sv-exec-state is-stopped";
          execStateBox.textContent = lastStopReason;
          return;
        }
        execStateBox.className = "sv-exec-state";
        execStateBox.textContent = connected ? "" : t("not connected");
      }

      function reportStop(message) {
        keepToolVisible();
        lastStopReason = message;
        pushNarration(null, { step: Number(latestSnapshot?.steps) | 0, kind: "stop", text: message });
        ctx.messagesPane.postMars(`${t("[tool] Stack Visualizer paused: {reason}", { reason: message })}\n`);
        updateExecState();
        scheduleRender();
      }

      function cancelArmedStop(silent = false) {
        clearArmedBreakpoint();
        armedStop = null;
        pendingStepOver = false;
        queuedObserverStop = null;
        if (!silent) updateExecState();
      }

      // Running a program focuses the main window, which on mobile replaces the
      // whole screen; a tool that drives execution has to come back to the front.
      function keepToolVisible() {
        if (ctx.desktop?.classList?.contains("desktop-stacked") !== true) return;
        try {
          ctx.windowManager?.show?.(root.id);
        } catch {
          // Panel selection is best effort.
        }
      }

      function requestImmediateStop(message) {
        armedStop = null;
        stopAtNextInstruction();
        pendingStopMessage = message;
      }

      // Diagnostics found while decoding an event stop the program too, one event
      // batch later than the observers above.
      function requestWarningStop(text) {
        if (!pauseOnWarning || pendingStopMessage) return;
        // While stepping the user is already in control; there is nothing to halt.
        if (ctx.runtimeControls?.isRunning?.() !== true) {
          lastStopReason = text;
          updateExecState();
          return;
        }
        requestImmediateStop(text);
      }

      // Observers run inside the engine, so a condition is evaluated the moment it
      // happens instead of one event batch later.
      function installObservers() {
        const engine = ctx.engine;
        if (!engine || releaseObservers) return;
        const disposers = [];
        observerSp = currentSp();

        // Inside a memory observer the engine has not advanced the program counter
        // yet, so the stop is queued and armed when the instruction finishes.
        const armAt = (nextPc, message) => {
          armedStop = null;
          placeBreakpoint(nextPc);
          pendingStopMessage = message;
        };

        if (typeof engine.registerInstructionObserver === "function") {
          disposers.push(engine.registerInstructionObserver((detail) => {
            const nextPc = detail?.pc >>> 0;
            if (queuedObserverStop) {
              const message = queuedObserverStop;
              queuedObserverStop = null;
              armAt(nextPc, message);
              return;
            }
            if (!armedStop) return;
            const spNow = engine.registers ? engine.registers[REG_SP] >>> 0 : observerSp;
            const previousSp = observerSp;
            observerSp = spNow;
            if (armedStop.kind === "call") {
              const op = parseInstruction(detail?.executedInstruction).op;
              if (op === "jal" || op === "jalr") {
                armAt(nextPc, t("stopped at a call: {instruction}", {
                  instruction: detail?.executedInstruction || op
                }));
              }
              return;
            }
            if (armedStop.kind === "sp" && spNow !== previousSp) {
              armAt(nextPc, t("$sp moved {from} → {to}", {
                from: toHex32(previousSp),
                to: toHex32(spNow)
              }));
            }
          }));
        }

        if (typeof engine.registerMemoryObserver === "function") {
          const map = memoryMap();
          const stackBase = (map.stackBase ?? 0x7ffffffc) >>> 0;
          disposers.push(engine.registerMemoryObserver({
            start: 0,
            end: stackBase,
            onWrite(access) {
              if (queuedObserverStop) return;
              const wordAddress = access.address & ~0x3;
              if (armedStop?.kind === "watch" && wordAddress === (watchAddress >>> 0)) {
                queuedObserverStop = t("{address} was written with {value}", {
                  address: toHex32(access.address),
                  value: toHex32(access.value)
                });
                return;
              }
              // Same rule as the narrated diagnostic, checked early enough to stop
              // the program on the offending instruction.
              if (!pauseOnWarning) return;
              if (access.address < (engine.registers[REG_SP] >>> 0) && isStackAddress(wordAddress)) {
                queuedObserverStop = t("wrote {address} below $sp", { address: toHex32(access.address) });
              }
            }
          }));
        }

        releaseObservers = () => {
          disposers.forEach((dispose) => {
            try {
              dispose();
            } catch {
              // A tool must never break engine teardown.
            }
          });
        };
      }

      function removeObservers() {
        if (!releaseObservers) return;
        releaseObservers();
        releaseObservers = null;
      }

      function armStop(kind) {
        if (!connected) {
          ctx.messagesPane.postMars(`${t("[tool] Stack Visualizer: connect the tool before driving execution.")}\n`);
          return;
        }
        if (armedStop?.kind === kind) {
          cancelArmedStop();
          return;
        }
        cancelArmedStop(true);
        lastStopReason = "";

        if (kind === "finish") {
          const frame = activeFrame();
          if (!frame) {
            ctx.messagesPane.postMars(`${t("[tool] Stack Visualizer: no open frame to return from.")}\n`);
            updateExecState();
            return;
          }
          armedStop = { kind, label: armedLabel(kind, { name: frame.name }), frameId: frame.id };
          placeBreakpoint(frame.returnAddress);
          pendingStopMessage = t("{name} returned to {address}", {
            name: frame.name,
            address: toHex32(frame.returnAddress)
          });
          updateExecState();
          ctx.runtimeControls?.go?.();
          keepToolVisible();
          return;
        }

        if (kind === "watch") {
          if (selectedAddress == null) {
            ctx.messagesPane.postMars(`${t("[tool] Stack Visualizer: select a word first, then watch it.")}\n`);
            updateExecState();
            return;
          }
          watchAddress = selectedAddress >>> 0;
          armedStop = { kind, label: armedLabel(kind, { address: watchAddress }) };
          installObservers();
          updateExecState();
          ctx.runtimeControls?.go?.();
          keepToolVisible();
          return;
        }

        if (kind === "over") {
          // One step first: if it opened a frame, run on until that frame returns.
          armedStop = { kind, label: armedLabel(kind), depth: frames.length };
          pendingStepOver = true;
          updateExecState();
          ctx.runtimeControls?.step?.();
          keepToolVisible();
          return;
        }

        armedStop = { kind, label: armedLabel(kind) };
        installObservers();
        observerSp = currentSp();
        updateExecState();
        ctx.runtimeControls?.go?.();
        keepToolVisible();
      }

      // "Step over" needs the step to finish before it can tell whether a frame was
      // opened, so the follow-up run is scheduled outside the command that ran it.
      function resolveStepOver() {
        if (!pendingStepOver) return;
        pendingStepOver = false;
        const opened = armedStop && frames.length > (armedStop.depth | 0) ? activeFrame() : null;
        if (!opened) {
          cancelArmedStop(true);
          lastStopReason = t("stepped one instruction; there was no call to step over");
          updateExecState();
          scheduleRender();
          return;
        }
        armedStop = { kind: "over", label: armedLabel("finish", { name: opened.name }), frameId: opened.id };
        placeBreakpoint(opened.returnAddress);
        pendingStopMessage = t("stepped over {name}, back at {address}", {
          name: opened.name,
          address: toHex32(opened.returnAddress)
        });
        updateExecState();
        pendingResume = true;
        window.setTimeout(() => {
          pendingResume = false;
          if (armedStop?.kind === "over") ctx.runtimeControls?.go?.(); keepToolVisible();
        }, 0);
      }

      // Called once the runtime has actually come to a stop.
      function settleAfterStop() {
        if (armedBreakpoint && (ctx.engine?.pc >>> 0) === armedBreakpoint.address) {
          clearArmedBreakpoint();
          armedStop = null;
          const message = pendingStopMessage || t("reached the armed condition");
          pendingStopMessage = "";
          reportStop(message);
          return;
        }
        if (pendingResume) return;
        if (armedStop && ctx.runtimeControls?.isRunning?.() !== true && !pendingStepOver) {
          // The program halted or the user intervened before the condition held.
          cancelArmedStop(true);
          pendingStopMessage = "";
          lastStopReason = t("execution stopped before the condition was reached");
          updateExecState();
        }
      }

      // -------------------------------------------------------------- canvas setup

      function prepareCanvas(canvas) {
        const ratio = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const pixelWidth = Math.round(width * ratio);
        const pixelHeight = Math.round(height * ratio);
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }
        const context = canvas.getContext("2d");
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);
        return { context, width, height };
      }

      function themeColors() {
        const style = window.getComputedStyle(root);
        const read = (name, fallback) => {
          const value = style.getPropertyValue(name).trim();
          return value || fallback;
        };
        return {
          surface: read("--surface", "#ffffff"),
          raised: read("--surface-raised", "#f7fbff"),
          inset: read("--surface-inset", "#e7edf5"),
          line: read("--line", "#9db0c8"),
          lineSoft: read("--line-soft", "#b7c4d4"),
          text: read("--text", "#24354b"),
          muted: read("--text-muted", "#4e5a69"),
          faint: read("--text-faint", "#7c8794"),
          accent: read("--accent", "#2f6ea9"),
          highlight: read("--highlight", "#fff6b2"),
          warn: read("--warn", "#8f5a13")
        };
      }

      function frameColor(frameId) {
        if (!frameId) return SEGMENT_COLORS.stack;
        return FRAME_COLORS[(frameId - 1) % FRAME_COLORS.length];
      }

      function withAlpha(color, alpha) {
        const hex = String(color).replace("#", "");
        if (hex.length !== 6) return color;
        const value = Number.parseInt(hex, 16);
        return `rgba(${(value >> 16) & 0xff}, ${(value >> 8) & 0xff}, ${value & 0xff}, ${alpha})`;
      }

      // --------------------------------------------------------------- memory map

      function computeDensity(segments, buckets) {
        const now = performance.now();
        const key = `${buckets}:${segments.map((segment) => segment.id).join(",")}`;
        if (densityCache && now - densityStamp < DENSITY_REFRESH_MS && densityCache.key === key) {
          return densityCache.data;
        }
        const data = segments.map(() => new Float32Array(buckets));
        const words = memoryWords();
        if (words) {
          let scanned = 0;
          for (const address of words.keys()) {
            if (scanned >= MAX_DENSITY_SCAN) break;
            scanned += 1;
            const addr = address >>> 0;
            for (let index = 0; index < segments.length; index += 1) {
              const segment = segments[index];
              if (addr < segment.start || addr >= segment.end) continue;
              const span = segment.end - segment.start;
              const bucket = Math.min(buckets - 1, Math.floor(((addr - segment.start) / span) * buckets));
              data[index][bucket] += 1;
              break;
            }
          }
        }
        densityCache = { data, key };
        densityStamp = now;
        return data;
      }

      // A phone-sized strip cannot label ten bands, so it keeps the ones a program
      // actually touches; the Region picker still reaches every segment.
      const COMPACT_MAP_SEGMENTS = new Set(["text", "extern", "data", "heap", "stack", "mmio"]);

      function renderMap() {
        const { context, width, height } = prepareCanvas(mapCanvas);
        const colors = themeColors();
        const allSegments = buildSegments();
        const segments = height < 120
          ? allSegments.filter((segment) => COMPACT_MAP_SEGMENTS.has(segment.id))
          : allSegments;
        const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0) || 1;
        const density = computeDensity(segments, 24);
        const sp = currentSp();
        const fp = currentFp();
        const pc = currentPc();
        const gp = readRegister(REG_GP) >>> 0;
        const level = ZOOM_LEVELS[zoomIndex];
        const viewSpan = level.bytesPerRow * visibleRowCount();
        const viewLow = highTop ? ((viewTopAddress ?? 0) - viewSpan + level.bytesPerRow) >>> 0 : (viewTopAddress ?? 0) >>> 0;
        const viewHigh = (viewLow + viewSpan) >>> 0;

        context.font = "10px Consolas, 'Courier New', monospace";
        context.textBaseline = "middle";

        mapBands = [];
        let cursor = 0;
        const ordered = highTop ? [...segments].reverse() : segments;

        // Every band has to fit, however short the strip is on a phone: give each a
        // floor, then rescale the whole column back to the available height.
        const minBand = Math.max(5, Math.min(18, Math.floor(height / Math.max(1, ordered.length))));
        const rawHeights = ordered.map((segment) => Math.max(minBand, (segment.weight / totalWeight) * height));
        const rawTotal = rawHeights.reduce((sum, value) => sum + value, 0) || 1;
        const bandHeights = rawHeights.map((value) => (value * height) / rawTotal);

        ordered.forEach((segment, bandIndex) => {
          const y0 = cursor;
          const y1 = Math.min(height, cursor + bandHeights[bandIndex]);
          cursor = y1;
          const bandHeight = y1 - y0;
          const index = segments.indexOf(segment);
          const color = SEGMENT_COLORS[segment.id] || colors.line;

          context.fillStyle = withAlpha(color, 0.14);
          context.fillRect(0, y0, width, y1 - y0);
          context.fillStyle = color;
          context.fillRect(0, y0, 4, y1 - y0);
          context.strokeStyle = withAlpha(colors.line, 0.6);
          context.beginPath();
          context.moveTo(0, y1 + 0.5);
          context.lineTo(width, y1 + 0.5);
          context.stroke();

          // Usage strip: where inside this segment the program actually keeps data.
          const buckets = density[index];
          const stripX = width - 26;
          const bucketHeight = (y1 - y0) / buckets.length;
          for (let bucket = 0; bucket < buckets.length; bucket += 1) {
            if (buckets[bucket] <= 0) continue;
            const intensity = Math.min(1, 0.25 + Math.log10(1 + buckets[bucket]) / 2.4);
            const position = highTop ? buckets.length - 1 - bucket : bucket;
            context.fillStyle = withAlpha(color, intensity);
            context.fillRect(stripX, y0 + position * bucketHeight, 22, Math.max(1, bucketHeight));
          }
          context.strokeStyle = withAlpha(colors.line, 0.8);
          context.strokeRect(stripX + 0.5, y0 + 0.5, 21, Math.max(1, y1 - y0 - 1));

          if (bandHeight >= 11) {
            context.fillStyle = colors.text;
            context.fillText(t(segment.label), 8, y0 + Math.min(10, bandHeight / 2));
          }
          if (bandHeight >= 26) {
            context.fillStyle = colors.faint;
            context.fillText(toHex32(segment.start), 8, y0 + 22);
          }

          mapBands.push({ segment, y0, y1 });

          const markerFor = (address, text, markerColor) => {
            const addr = address >>> 0;
            if (addr < segment.start || addr >= segment.end) return;
            const span = segment.end - segment.start;
            const fraction = (addr - segment.start) / span;
            const y = highTop ? y1 - fraction * (y1 - y0) : y0 + fraction * (y1 - y0);
            context.strokeStyle = markerColor;
            context.lineWidth = 1.5;
            context.beginPath();
            context.moveTo(4, y);
            context.lineTo(width - 28, y);
            context.stroke();
            context.lineWidth = 1;
            context.fillStyle = markerColor;
            context.fillText(text, width - 26 - context.measureText(text).width - 3, y - 5);
          };

          markerFor(pc, "pc", colors.accent);
          markerFor(gp, "$gp", SEGMENT_COLORS.extern);
          markerFor(fp, "$fp", SEGMENT_COLORS.text);
          markerFor(sp, "$sp", SEGMENT_COLORS.stack);

          // Viewport indicator for the detail pane.
          const overlapLow = Math.max(segment.start, viewLow);
          const overlapHigh = Math.min(segment.end, viewHigh);
          if (overlapHigh > overlapLow) {
            const span = segment.end - segment.start;
            const lowFraction = (overlapLow - segment.start) / span;
            const highFraction = (overlapHigh - segment.start) / span;
            const yA = highTop ? y1 - highFraction * (y1 - y0) : y0 + lowFraction * (y1 - y0);
            const yB = highTop ? y1 - lowFraction * (y1 - y0) : y0 + highFraction * (y1 - y0);
            context.strokeStyle = colors.accent;
            context.lineWidth = 2;
            context.strokeRect(1, Math.min(yA, yB) - 1, width - 3, Math.max(3, Math.abs(yB - yA) + 2));
            context.lineWidth = 1;
          }
        });
      }

      function renderSpark() {
        const { context, width, height } = prepareCanvas(sparkCanvas);
        const colors = themeColors();
        context.fillStyle = colors.surface;
        context.fillRect(0, 0, width, height);
        context.strokeStyle = withAlpha(colors.line, 0.8);
        context.strokeRect(0.5, 0.5, width - 1, height - 1);
        context.font = "9px Consolas, 'Courier New', monospace";
        context.textBaseline = "middle";

        if (spSamples.length < 2) {
          context.fillStyle = colors.faint;
          context.fillText(t("No $sp movement recorded yet."), 6, height / 2);
          return;
        }

        const map = memoryMap();
        const base = (map.stackPointer ?? map.stackBase ?? 0x7fffeffc) >>> 0;
        const depths = spSamples.map((sample) => Math.max(0, base - (sample.sp >>> 0)));
        const maxDepth = Math.max(16, ...depths);
        const stepX = width / Math.max(1, depths.length - 1);

        context.beginPath();
        context.moveTo(0, height - 1);
        depths.forEach((depth, index) => {
          const x = index * stepX;
          const y = height - 2 - (depth / maxDepth) * (height - 14);
          context.lineTo(x, y);
        });
        context.lineTo(width, height - 1);
        context.closePath();
        context.fillStyle = withAlpha(SEGMENT_COLORS.stack, 0.28);
        context.fill();

        context.beginPath();
        depths.forEach((depth, index) => {
          const x = index * stepX;
          const y = height - 2 - (depth / maxDepth) * (height - 14);
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.strokeStyle = SEGMENT_COLORS.stack;
        context.stroke();

        context.fillStyle = colors.faint;
        context.fillText(t("max {bytes} B", { bytes: maxDepth }), 5, 8);
        context.fillText(t("now {bytes} B", { bytes: depths[depths.length - 1] }), width - 62, 8);
      }

      // ------------------------------------------------------------- detail canvas

      // Drawing and hit testing must agree on where each word block sits.
      function blockGeometry(width, level) {
        const words = Math.max(1, level.bytesPerRow / 4);
        const startX = 96;
        const available = Math.max(40, width - startX - 10);
        return { words, startX, blockWidth: Math.max(3, Math.min(26, (available / words) - 1)) };
      }

      function visibleRowCount() {
        const level = ZOOM_LEVELS[zoomIndex];
        const height = detailCanvas.getBoundingClientRect().height || 320;
        return Math.max(1, Math.floor((height - 20) / level.rowHeight));
      }

      function rowAddress(index) {
        const level = ZOOM_LEVELS[zoomIndex];
        const top = (viewTopAddress ?? defaultViewAddress()) >>> 0;
        const offset = index * level.bytesPerRow;
        return (highTop ? top - offset : top + offset) >>> 0;
      }

      function defaultViewAddress() {
        const sp = currentSp();
        const level = ZOOM_LEVELS[zoomIndex];
        return (sp + level.bytesPerRow * 6) >>> 0;
      }

      function centerView(address) {
        const level = ZOOM_LEVELS[zoomIndex];
        const rows = visibleRowCount();
        const aligned = (address >>> 0) - ((address >>> 0) % level.bytesPerRow);
        const half = Math.floor(rows / 2) * level.bytesPerRow;
        viewTopAddress = (highTop ? aligned + half : Math.max(0, aligned - half)) >>> 0;
      }

      function scrollView(rows) {
        const level = ZOOM_LEVELS[zoomIndex];
        const offset = rows * level.bytesPerRow;
        const next = (viewTopAddress ?? defaultViewAddress()) + (highTop ? -offset : offset);
        viewTopAddress = Math.max(0, Math.min(0xfffffffc, next)) >>> 0;
        followSp = false;
        followCheck.checked = false;
      }

      function renderDetail() {
        const { context, width, height } = prepareCanvas(detailCanvas);
        const colors = themeColors();
        const level = ZOOM_LEVELS[zoomIndex];
        const segments = buildSegments();
        const sp = currentSp();
        const fp = currentFp();
        const regions = frameRegions();
        const rows = Math.max(1, Math.floor((height - 20) / level.rowHeight));
        if (viewTopAddress == null) viewTopAddress = defaultViewAddress();

        context.fillStyle = colors.surface;
        context.fillRect(0, 0, width, height);
        context.font = "12px Consolas, 'Courier New', monospace";
        context.textBaseline = "middle";
        const charWidth = context.measureText("0").width || 7;

        const gutter = 20;
        // Visual order is fixed, but a narrow pane drops the least useful columns
        // first: which register was stored and which frame owns the word matter
        // more than the decimal and ASCII readings.
        const COLUMN_PLAN = [
          { id: "address", chars: 10, priority: 1 },
          { id: "value", chars: 10, priority: 2 },
          { id: "decimal", chars: 12, priority: 5 },
          { id: "ascii", chars: 6, priority: 6 },
          { id: "register", chars: 6, priority: 3 },
          { id: "note", chars: 20, priority: 4 }
        ];
        let columns = [];
        if (level.mode !== "blocks") {
          let plan = COLUMN_PLAN.map((column) => ({ ...column }));
          const layout = () => {
            let cursorX = gutter + 6;
            plan.forEach((column) => {
              column.x = cursorX;
              column.width = column.chars * charWidth;
              cursorX += column.width + 10;
            });
            return cursorX;
          };
          while (layout() > width && plan.length > 2) {
            const weakest = plan.reduce((worst, column) => (column.priority > worst.priority ? column : worst), plan[0]);
            if (weakest.id === "note" && weakest.chars > 10) weakest.chars = 10;
            else plan = plan.filter((column) => column !== weakest);
          }
          columns = plan;
        }
        const columnX = (id) => columns.find((column) => column.id === id)?.x ?? null;

        // Header
        context.fillStyle = colors.raised;
        context.fillRect(0, 0, width, 18);
        context.fillStyle = colors.muted;
        if (level.mode === "blocks") {
          context.fillText(t("address"), gutter + 6, 9);
          context.fillText(t("{bytes} bytes per row — each block is one word", { bytes: level.bytesPerRow }), gutter + 100, 9);
        } else {
          const headers = {
            address: t("address"),
            value: t("value"),
            decimal: t("decimal"),
            ascii: t("ascii"),
            register: t("stored"),
            note: t("frame / meaning")
          };
          columns.forEach((column) => context.fillText(headers[column.id] || "", column.x, 9));
        }
        context.strokeStyle = withAlpha(colors.line, 0.8);
        context.beginPath();
        context.moveTo(0, 18.5);
        context.lineTo(width, 18.5);
        context.stroke();

        detailRowMap = [];

        for (let row = 0; row < rows; row += 1) {
          const address = rowAddress(row);
          const y = 20 + row * level.rowHeight;
          const rowSegment = segmentAt(address, segments);
          detailRowMap.push({ y0: y, y1: y + level.rowHeight, address });

          if (!rowSegment) {
            context.fillStyle = withAlpha(colors.faint, 0.08);
            context.fillRect(0, y, width, level.rowHeight - 1);
          }

          if (level.mode === "blocks") {
            const { words, startX, blockWidth } = blockGeometry(width, level);
            context.fillStyle = colors.faint;
            context.font = "10px Consolas, 'Courier New', monospace";
            context.fillText(toHex32(address), 2, y + level.rowHeight / 2);
            context.font = "12px Consolas, 'Courier New', monospace";
            for (let index = 0; index < words; index += 1) {
              const wordAddress = (address + index * 4) >>> 0;
              const x = startX + index * (blockWidth + 1);
              drawWordBlock(context, colors, x, y + 1, blockWidth, level.rowHeight - 3, wordAddress, sp, segments, regions);
            }
            continue;
          }

          const value = readWord(address);
          const cell = cells.get(address);
          const region = regions.find((entry) => address >= entry.low && address <= entry.high);
          const inStack = isStackAddress(address, segments);
          const live = inStack && address >= sp;

          // Row background states: live frame, released area, plain memory.
          if (inStack) {
            if (live) {
              const color = region ? frameColor(region.frame.id) : SEGMENT_COLORS.stack;
              context.fillStyle = withAlpha(color, region ? 0.16 : 0.08);
            } else {
              context.fillStyle = withAlpha(colors.faint, 0.13);
            }
            context.fillRect(0, y, width, level.rowHeight - 1);
          } else if (rowSegment) {
            context.fillStyle = withAlpha(SEGMENT_COLORS[rowSegment.id] || colors.line, 0.05);
            context.fillRect(0, y, width, level.rowHeight - 1);
          }

          if (region) {
            context.fillStyle = frameColor(region.frame.id);
            context.fillRect(2, y, 5, level.rowHeight - 1);
            if (address === region.high) {
              context.fillStyle = frameColor(region.frame.id);
              context.fillRect(2, y, 12, 3);
            }
          }

          if (address === selectedAddress) {
            context.strokeStyle = colors.accent;
            context.lineWidth = 2;
            context.strokeRect(1, y + 0.5, width - 2, level.rowHeight - 2);
            context.lineWidth = 1;
          }
          if (address === lastWriteAddress) {
            context.fillStyle = withAlpha(colors.highlight, 0.55);
            context.fillRect(gutter, y + 1, width - gutter, level.rowHeight - 3);
          }

          const hasValue = hasWord(address);
          context.fillStyle = hasValue || live ? colors.text : colors.faint;
          const middle = y + (level.mode === "word" ? level.rowHeight / 2 : 13);

          const addressX = columnX("address");
          if (addressX != null) context.fillText(toHex32(address), addressX, middle);
          const valueX = columnX("value");
          if (valueX != null) {
            context.fillText(hexValues ? toHex32(value) : String(value >>> 0), valueX, middle);
          }
          const decimalX = columnX("decimal");
          if (decimalX != null) context.fillText(String(value | 0), decimalX, middle);
          const asciiX = columnX("ascii");
          if (asciiX != null) {
            context.fillStyle = colors.muted;
            context.fillText(asciiOfWord(value), asciiX, middle);
          }
          const registerX = columnX("register");
          if (registerX != null && cell?.register) {
            context.fillStyle = SEGMENT_COLORS.data;
            context.fillText(cell.register, registerX, middle);
          }
          const noteX = columnX("note");
          if (noteX != null) {
            context.fillStyle = colors.muted;
            context.fillText(noteForAddress(address, region, cell, live, inStack, segments), noteX, middle);
          }

          // Pointer markers on the right edge.
          const markers = [];
          if (address === sp) markers.push({ text: "$sp", color: SEGMENT_COLORS.stack });
          if (address === fp && fp !== 0) markers.push({ text: "$fp", color: SEGMENT_COLORS.text });
          if (markers.length) {
            let markerX = width - 6;
            markers.forEach((marker) => {
              const textWidth = context.measureText(marker.text).width;
              markerX -= textWidth + 8;
              context.fillStyle = withAlpha(marker.color, 0.22);
              context.fillRect(markerX - 3, y + 2, textWidth + 6, 15);
              context.fillStyle = marker.color;
              context.fillText(marker.text, markerX, y + 10);
            });
          }

          if (level.mode === "bytes" || level.mode === "bits") {
            drawByteDetail(context, colors, gutter + 6, y + 24, width - gutter - 12, address, value, level.mode === "bits", charWidth);
          }
        }
      }

      function noteForAddress(address, region, cell, live, inStack, segments) {
        if (region) {
          // Recursion repeats the same function name, so the frame number is what
          // tells two activations apart.
          const position = describeSpOffset(address);
          const suffix = position ? ` (${position})` : "";
          const name = `#${region.frame.id} ${region.frame.name}${suffix}`;
          return address === region.high ? `${name} ${t("frame top")}` : name;
        }
        if (inStack && !live) return t("released");
        if (cell?.instruction) return cell.instruction;
        const segment = segmentAt(address, segments);
        if (!segment) return t("unmapped");
        const label = labelFor(address);
        return label ? `${t(segment.label)} · ${label}` : t(segment.label);
      }

      function drawWordBlock(context, colors, x, y, width, height, address, sp, segments, regions) {
        const inStack = isStackAddress(address, segments);
        const region = regions.find((entry) => address >= entry.low && address <= entry.high);
        const live = inStack && address >= sp;
        const present = hasWord(address);
        let color = colors.faint;
        let alpha = 0.12;
        if (region) {
          color = frameColor(region.frame.id);
          alpha = present ? 0.85 : 0.3;
        } else if (inStack) {
          color = live ? SEGMENT_COLORS.stack : colors.faint;
          alpha = present ? 0.6 : 0.16;
        } else {
          const segment = segmentAt(address, segments);
          if (segment) {
            color = SEGMENT_COLORS[segment.id] || colors.line;
            alpha = present ? 0.7 : 0.12;
          }
        }
        context.fillStyle = withAlpha(color, alpha);
        context.fillRect(x, y, width, height);
        if (address === sp) {
          context.strokeStyle = SEGMENT_COLORS.stack;
          context.lineWidth = 2;
          context.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);
          context.lineWidth = 1;
        }
        if (address === selectedAddress) {
          context.strokeStyle = colors.accent;
          context.lineWidth = 2;
          context.strokeRect(x - 0.5, y - 0.5, width + 1, height + 1);
          context.lineWidth = 1;
        }
      }

      function drawByteDetail(context, colors, x, y, width, address, value, withBits, charWidth) {
        const bytes = wordBytes(value);
        const boxWidth = Math.min(84, Math.max(52, (width - 24) / 4));
        context.font = "11px Consolas, 'Courier New', monospace";
        bytes.forEach((byte, index) => {
          const boxX = x + index * (boxWidth + 6);
          context.fillStyle = withAlpha(colors.line, 0.16);
          context.fillRect(boxX, y, boxWidth, 18);
          context.strokeStyle = withAlpha(colors.line, 0.7);
          context.strokeRect(boxX + 0.5, y + 0.5, boxWidth - 1, 17);
          context.fillStyle = colors.text;
          context.fillText(`+${index} ${toHexByte(byte)} '${asciiChar(byte)}'`, boxX + 4, y + 9);
        });
        context.fillStyle = colors.faint;
        context.fillText(t("byte {address} is the least significant one (little endian)", {
          address: toHex32(address)
        }), x, y + 30);

        if (!withBits) {
          context.font = "12px Consolas, 'Courier New', monospace";
          return;
        }
        const bits = (value >>> 0).toString(2).padStart(32, "0");
        const bitWidth = Math.max(6, Math.min(14, (width - 20) / 32));
        for (let index = 0; index < 32; index += 1) {
          const bitX = x + index * bitWidth;
          const set = bits[index] === "1";
          context.fillStyle = set ? withAlpha(colors.accent, 0.75) : withAlpha(colors.line, 0.18);
          context.fillRect(bitX, y + 36, bitWidth - 1, 14);
          if (bitWidth >= 9) {
            context.fillStyle = set ? "#ffffff" : colors.faint;
            context.fillText(bits[index], bitX + bitWidth / 2 - charWidth / 2, y + 43);
          }
        }
        context.fillStyle = colors.faint;
        context.fillText("31", x, y + 58);
        context.fillText("0", x + 31 * bitWidth, y + 58);
        context.font = "12px Consolas, 'Courier New', monospace";
      }

      // ------------------------------------------------------------- side panels

      function describeWord(address) {
        const addr = address >>> 0;
        const value = readWord(addr);
        const segments = buildSegments();
        const segment = segmentAt(addr, segments);
        const cell = cells.get(addr);
        const region = frameForAddress(addr);
        const sp = currentSp();
        const lines = [];

        lines.push(`${t("Address")}: ${toHex32(addr)}${describeSpOffset(addr) ? `  (${describeSpOffset(addr)})` : ""}`);
        lines.push(`${t("Segment")}: ${segment ? t(segment.label) : t("unmapped")}`);
        if (region) {
          lines.push(`${t("Frame")}: #${region.frame.id} ${region.frame.name} (${toHex32(region.low)} … ${toHex32(region.high)})`);
        } else if (isStackAddress(addr, segments) && addr < sp) {
          lines.push(`${t("Frame")}: ${t("below $sp — released memory, contents are leftovers")}`);
        }
        lines.push("");
        lines.push(`${t("Word")}: ${toHex32(value)}`);
        lines.push(`  ${t("signed")}   ${value | 0}`);
        lines.push(`  ${t("unsigned")} ${value >>> 0}`);
        lines.push(`  ${t("binary")}   ${(value >>> 0).toString(2).padStart(32, "0").replace(/(.{8})(?=.)/g, "$1 ")}`);
        lines.push(`  ${t("bytes")}    ${wordBytes(value).map(toHexByte).join(" ")}  '${asciiOfWord(value)}'`);
        lines.push("");

        const meaning = [];
        const valueSegment = segmentAt(value >>> 0, segments);
        const valueLabel = labelFor(value >>> 0);
        // "reserved" and "free space" are not real targets, so a value landing there
        // is a plain number rather than a pointer.
        if (valueSegment && valueSegment.id !== "reserved" && valueSegment.id !== "free") {
          meaning.push(t("The value points into {segment}{label}.", {
            segment: t(valueSegment.label),
            label: valueLabel ? ` (${valueLabel})` : ""
          }));
        }
        if ((value | 0) >= -1024 && (value | 0) <= 1024) {
          meaning.push(t("It is a small number ({decimal}), the usual shape of a counter or an argument.", {
            decimal: value | 0
          }));
        }
        const owningFrame = frames.find((frame) => frame.returnAddress === (value >>> 0));
        if (owningFrame) {
          meaning.push(t("It is the return address of frame #{id} {name}.", {
            id: owningFrame.id,
            name: owningFrame.name
          }));
        }
        if (wordBytes(value).every((byte) => byte >= 0x20 && byte <= 0x7e)) {
          meaning.push(t("All four bytes are printable, so this may be text: '{text}'.", { text: asciiOfWord(value) }));
        }
        if (!meaning.length) meaning.push(t("No pointer or text interpretation stands out; treat it as a plain number."));
        lines.push(`${t("Interpretation")}:`);
        meaning.forEach((entry) => lines.push(`  ${entry}`));
        lines.push("");

        if (cell) {
          lines.push(`${t("Written")}: ${t("step {step} by {instruction} at {pc}", {
            step: cell.step,
            instruction: cell.instruction || "?",
            pc: toHex32(cell.pc)
          })}`);
          if (cell.register) lines.push(`  ${t("Source register")}: ${cell.register}`);
          if (cell.base) lines.push(`  ${t("Addressed through")}: ${cell.base}`);
        } else {
          lines.push(t("Not written by the program while the tool was connected."));
        }
        return lines.join("\n");
      }

      // Until a word is selected the card is free real estate, so it explains how
      // to read the colours instead of showing an empty box.
      function legendText() {
        return [
          connected
            ? t("Select a word to decode it.")
            : t("Connect the tool, then run or step a program."),
          "",
          `${t("Reading the view")}:`,
          `  ${t("coloured band = one call frame, numbered as it was opened")}`,
          `  ${t("grey 'released' = below $sp, already given back")}`,
          `  ${t("stored column = the register whose value was written there")}`,
          `  ${t("$sp / $fp tags = where those registers point right now")}`,
          "",
          `${t("Segments")}: ${buildSegments()
            .filter((segment) => segment.id !== "reserved" && segment.id !== "free")
            .map((segment) => t(segment.label))
            .join(" · ")}`,
          `  ${t("the left strip colours each one and marks pc, $gp, $fp and $sp")}`
        ].join("\n");
      }

      function renderInspector() {
        decodeBox.textContent = selectedAddress == null ? legendText() : describeWord(selectedAddress);
      }

      function renderStatus() {
        const sp = currentSp();
        const fp = currentFp();
        const map = memoryMap();
        const base = (map.stackPointer ?? map.stackBase ?? 0x7fffeffc) >>> 0;
        const used = Math.max(0, base - sp);
        const deepest = Number.isFinite(deepestSp) ? Math.max(0, base - deepestSp) : 0;
        statusBox.innerHTML = [
          `$sp <b>${toHex32(sp)}</b>`,
          fp !== 0 ? `$fp <b>${toHex32(fp)}</b>` : null,
          `${t("depth")} <b>${frames.length}</b>`,
          `${t("in use")} <b>${used} B</b>`,
          `${t("deepest")} <b>${deepest} B</b>`
        ].filter(Boolean).join(" ");
      }

      // The region picker doubles as a "you are here" indicator.
      function syncRegionSelect() {
        const level = ZOOM_LEVELS[zoomIndex];
        const middle = ((viewTopAddress ?? defaultViewAddress())
          + (highTop ? -1 : 1) * Math.floor(visibleRowCount() / 2) * level.bytesPerRow) >>> 0;
        const segment = segmentAt(middle);
        if (segment && segmentSelect.value !== segment.id) segmentSelect.value = segment.id;
      }

      function renderFrames() {
        const regions = frameRegions();
        if (!regions.length) {
          framesBox.innerHTML = `<div class="sv-empty">${escapeHtml(t("No active frames."))}</div>`;
          return;
        }
        framesBox.innerHTML = [...regions].reverse().map((region) => {
          const size = Math.max(0, region.high + 4 - region.low);
          const selected = region.frame.id === selectedFrameId ? " is-selected" : "";
          return `<div class="sv-frame-row${selected}" data-frame-id="${region.frame.id}" style="border-left-color:${frameColor(region.frame.id)}">
            <span class="sv-frame-name">#${region.frame.id} ${escapeHtml(region.frame.name)}</span>
            <span class="sv-frame-size">${size}B</span>
          </div>`;
        }).join("");
      }

      const FILTER_KINDS = {
        calls: new Set(["call", "return", "alloc"]),
        memory: new Set(["store", "load"]),
        warn: new Set(["warn"])
      };

      function narrationMatchesFilter(entry) {
        // Why the program stopped is relevant under every filter.
        if (entry.kind === "stop") return true;
        const kinds = FILTER_KINDS[logFilter];
        return !kinds || kinds.has(entry.kind);
      }

      function renderNarration() {
        const visible = logFilter === "all" ? narration : narration.filter(narrationMatchesFilter);
        const first = visible.length ? visible[0].seq : null;
        const last = visible.length ? visible[visible.length - 1].seq : -1;
        const canAppend = renderedNarrationSeq >= 0
          && first === renderedNarrationHead
          && last >= renderedNarrationSeq;

        const rowHtml = (entry) => `<div class="sv-log-row sv-kind-${entry.kind}"${entry.address != null ? ` data-address="${entry.address >>> 0}"` : ""}>
          <span class="sv-log-step">${escapeHtml(t("step {step}", { step: entry.step }))}</span>
          <span class="sv-log-text">${escapeHtml(entry.text)}</span>
        </div>`;

        if (!canAppend) {
          logBox.innerHTML = visible.map(rowHtml).join("");
        } else {
          const pending = visible.filter((entry) => entry.seq > renderedNarrationSeq);
          if (pending.length) logBox.insertAdjacentHTML("beforeend", pending.map(rowHtml).join(""));
        }
        renderedNarrationSeq = last;
        renderedNarrationHead = first;
        logBox.scrollTop = logBox.scrollHeight;
        warnCountLabel.textContent = warnCount > 0 ? t("{count} warning(s)", { count: warnCount }) : "";
      }

      function renderAll() {
        if (followSp && connected) centerView(currentSp());
        renderMap();
        renderSpark();
        renderDetail();
        renderStatus();
        syncRegionSelect();
        renderInspector();
        renderFrames();
        renderNarration();
      }

      function scheduleRender() {
        if (renderScheduled) return;
        renderScheduled = true;
        window.requestAnimationFrame(() => {
          renderScheduled = false;
          if (root.classList.contains("window-hidden")) return;
          try {
            renderAll();
          } catch (error) {
            // A rendering failure must never break runtime delivery to other tools,
            // but it must not disappear either.
            if (!renderFailureReported) {
              renderFailureReported = true;
              console.error("[mars-web] Stack Visualizer failed to render.", error);
              ctx.messagesPane.postMars(`${t("[error] Stack Visualizer failed to render: {message}", {
                message: error instanceof Error ? error.message : String(error)
              })}\n`);
            }
          }
        });
      }

      // ------------------------------------------------------------- interaction

      function addressFromDetailPoint(clientX, clientY) {
        const rect = detailCanvas.getBoundingClientRect();
        const y = clientY - rect.top;
        const x = clientX - rect.left;
        const row = detailRowMap.find((entry) => y >= entry.y0 && y < entry.y1);
        if (!row) return null;
        const level = ZOOM_LEVELS[zoomIndex];
        if (level.mode !== "blocks") return row.address;
        const { words, startX, blockWidth } = blockGeometry(rect.width, level);
        const index = Math.floor((x - startX) / (blockWidth + 1));
        if (index < 0 || index >= words) return row.address;
        return (row.address + index * 4) >>> 0;
      }

      function selectAddress(address) {
        selectedAddress = address == null ? null : address >>> 0;
        scheduleRender();
      }

      function applyZoom(nextIndex, anchorAddress = null) {
        const clamped = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, nextIndex));
        if (clamped === zoomIndex) return;
        const anchor = anchorAddress ?? selectedAddress ?? (viewTopAddress ?? defaultViewAddress());
        zoomIndex = clamped;
        zoomInput.value = String(zoomIndex);
        zoomLabel.textContent = t(ZOOM_LEVELS[zoomIndex].label);
        centerView(anchor);
        scheduleRender();
      }

      function populateSegmentSelect() {
        const segments = buildSegments();
        const current = segmentSelect.value;
        segmentSelect.innerHTML = segments
          .map((segment) => `<option value="${segment.id}">${escapeHtml(t(segment.label))}</option>`)
          .join("");
        segmentSelect.value = segments.some((segment) => segment.id === current) ? current : "stack";
      }

      function jumpToSegment(id) {
        const segments = buildSegments();
        const segment = segments.find((entry) => entry.id === id);
        if (!segment) return;
        followSp = false;
        followCheck.checked = false;
        // Every segment is interesting where it begins; the stack is the exception
        // because it fills downwards from its base.
        centerView(id === "stack" ? currentSp() : segment.start);
      }

      function updateConnectLabel() {
        connectButton.textContent = connected ? t("Disconnect from MIPS") : t("Connect to MIPS");
      }

      detailCanvas.addEventListener("wheel", (event) => {
        event.preventDefault();
        if (event.ctrlKey) {
          applyZoom(zoomIndex + (event.deltaY < 0 ? 1 : -1), addressFromDetailPoint(event.clientX, event.clientY));
          return;
        }
        scrollView(event.deltaY > 0 ? 3 : -3);
        scheduleRender();
      }, { passive: false });

      function pinchDistance() {
        const points = [...activePointers.values()];
        if (points.length < 2) return 0;
        return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      }

      detailCanvas.addEventListener("pointerdown", (event) => {
        detailCanvas.focus();
        activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (activePointers.size === 2) {
          // A second finger turns the gesture into a zoom, so the pan is dropped.
          dragPointerId = null;
          dragOrigin = null;
          pinchOrigin = { distance: pinchDistance(), zoom: zoomIndex, address: selectedAddress };
          return;
        }
        const address = addressFromDetailPoint(event.clientX, event.clientY);
        if (address != null) selectAddress(address);
        dragPointerId = event.pointerId;
        dragOrigin = { y: event.clientY, top: viewTopAddress ?? defaultViewAddress() };
        detailCanvas.setPointerCapture(event.pointerId);
      });

      detailCanvas.addEventListener("pointermove", (event) => {
        if (activePointers.has(event.pointerId)) {
          activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        }
        if (pinchOrigin && activePointers.size >= 2) {
          const distance = pinchDistance();
          if (distance > 0 && pinchOrigin.distance > 0) {
            const ratio = distance / pinchOrigin.distance;
            if (ratio > 1.25) applyZoom(pinchOrigin.zoom + 1, pinchOrigin.address);
            else if (ratio < 0.8) applyZoom(pinchOrigin.zoom - 1, pinchOrigin.address);
          }
          return;
        }
        if (dragPointerId !== event.pointerId || !dragOrigin) return;
        const level = ZOOM_LEVELS[zoomIndex];
        const movedRows = Math.round((event.clientY - dragOrigin.y) / level.rowHeight);
        if (movedRows === 0) return;
        const offset = movedRows * level.bytesPerRow;
        const next = dragOrigin.top + (highTop ? offset : -offset);
        viewTopAddress = Math.max(0, Math.min(0xfffffffc, next)) >>> 0;
        followSp = false;
        followCheck.checked = false;
        scheduleRender();
      });

      const endDrag = (event) => {
        activePointers.delete(event.pointerId);
        if (activePointers.size < 2) pinchOrigin = null;
        if (dragPointerId !== event.pointerId) return;
        dragPointerId = null;
        dragOrigin = null;
      };
      detailCanvas.addEventListener("pointerup", endDrag);
      detailCanvas.addEventListener("pointercancel", endDrag);

      detailCanvas.addEventListener("dblclick", (event) => {
        const address = addressFromDetailPoint(event.clientX, event.clientY);
        if (address == null) return;
        const value = readWord(address) >>> 0;
        if (!segmentAt(value)) return;
        followSp = false;
        followCheck.checked = false;
        selectedAddress = value;
        centerView(value);
        scheduleRender();
      });

      detailCanvas.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") scrollView(1);
        else if (event.key === "ArrowUp") scrollView(-1);
        else if (event.key === "PageDown") scrollView(visibleRowCount());
        else if (event.key === "PageUp") scrollView(-visibleRowCount());
        else if (event.key === "+" || event.key === "=") applyZoom(zoomIndex + 1);
        else if (event.key === "-") applyZoom(zoomIndex - 1);
        else if (event.key === "Home") {
          followSp = true;
          followCheck.checked = true;
        } else return;
        event.preventDefault();
        scheduleRender();
      });

      function navigateFromMap(clientY) {
        const rect = mapCanvas.getBoundingClientRect();
        const y = clientY - rect.top;
        const band = mapBands.find((entry) => y >= entry.y0 && y < entry.y1);
        if (!band) return;
        const span = band.segment.end - band.segment.start;
        const fraction = highTop
          ? (band.y1 - y) / Math.max(1, band.y1 - band.y0)
          : (y - band.y0) / Math.max(1, band.y1 - band.y0);
        const address = (band.segment.start + Math.floor(span * fraction)) >>> 0;
        followSp = false;
        followCheck.checked = false;
        segmentSelect.value = band.segment.id;
        centerView(address);
        scheduleRender();
      }

      let mapPointerId = null;
      mapCanvas.addEventListener("pointerdown", (event) => {
        mapPointerId = event.pointerId;
        mapCanvas.setPointerCapture(event.pointerId);
        navigateFromMap(event.clientY);
      });

      // Dragging the map scrubs through the address space.
      mapCanvas.addEventListener("pointermove", (event) => {
        if (mapPointerId !== event.pointerId) return;
        navigateFromMap(event.clientY);
      });

      const endMapDrag = (event) => {
        if (mapPointerId === event.pointerId) mapPointerId = null;
      };
      mapCanvas.addEventListener("pointerup", endMapDrag);
      mapCanvas.addEventListener("pointercancel", endMapDrag);

      logBox.addEventListener("click", (event) => {
        const row = event.target.closest?.("[data-address]");
        if (!row) return;
        const address = Number.parseInt(row.dataset.address, 10);
        if (!Number.isFinite(address)) return;
        followSp = false;
        followCheck.checked = false;
        selectedAddress = address >>> 0;
        centerView(address >>> 0);
        scheduleRender();
      });

      framesBox.addEventListener("click", (event) => {
        const row = event.target.closest?.("[data-frame-id]");
        if (!row) return;
        const id = Number.parseInt(row.dataset.frameId, 10);
        const region = frameRegions().find((entry) => entry.frame.id === id);
        if (!region) return;
        selectedFrameId = id;
        followSp = false;
        followCheck.checked = false;
        selectedAddress = region.high;
        centerView(region.high);
        scheduleRender();
      });

      segmentSelect.addEventListener("change", () => {
        jumpToSegment(segmentSelect.value);
        scheduleRender();
      });

      gotoInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        const address = parseAddressText(gotoInput.value);
        if (address == null) {
          ctx.messagesPane.postMars(`${t("[tool] Stack Visualizer: '{value}' is not a valid address.", {
            value: gotoInput.value
          })}\n`);
          return;
        }
        followSp = false;
        followCheck.checked = false;
        selectedAddress = address & ~0x3;
        centerView(address);
        scheduleRender();
      });

      zoomInput.addEventListener("input", () => applyZoom(Number.parseInt(zoomInput.value, 10) || 0));
      zoomInButton.addEventListener("click", () => applyZoom(zoomIndex + 1));
      zoomOutButton.addEventListener("click", () => applyZoom(zoomIndex - 1));

      followCheck.addEventListener("change", () => {
        followSp = followCheck.checked === true;
        scheduleRender();
      });
      hexCheck.addEventListener("change", () => {
        hexValues = hexCheck.checked === true;
        scheduleRender();
      });
      highTopCheck.addEventListener("change", () => {
        highTop = highTopCheck.checked === true;
        centerView(selectedAddress ?? currentSp());
        scheduleRender();
      });

      connectButton.addEventListener("click", () => {
        connected = !connected;
        updateConnectLabel();
        if (connected) {
          resetTracking(false);
          populateSegmentSelect();
          centerView(currentSp());
          if (pauseOnWarning) installObservers();
          ctx.messagesPane.postMars(`${t("[tool] Stack Visualizer connected: watching $sp, call frames and stack memory.")}\n`);
        } else {
          cancelArmedStop(true);
          removeObservers();
          ctx.messagesPane.postMars(`${t("[tool] Stack Visualizer disconnected.")}\n`);
        }
        lastStopReason = "";
        updateExecState();
        scheduleRender();
      });

      runButtons.forEach((button, kind) => {
        button.addEventListener("click", () => {
          if (kind !== "pause") cancelArmedStop(true);
          lastStopReason = "";
          ctx.runtimeControls?.[kind]?.();
          keepToolVisible();
          updateExecState();
        });
      });

      untilButtons.forEach((button, kind) => {
        button.addEventListener("click", () => armStop(kind));
      });

      breakWarnCheck.addEventListener("change", () => {
        pauseOnWarning = breakWarnCheck.checked === true;
        if (pauseOnWarning) installObservers();
        updateExecState();
      });

      filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
          logFilter = button.dataset.svFilter || "all";
          filterButtons.forEach((entry) => {
            entry.setAttribute("aria-pressed", entry === button ? "true" : "false");
          });
          renderedNarrationSeq = -1;
          renderedNarrationHead = null;
          scheduleRender();
        });
      });

      clearLogButton.addEventListener("click", () => {
        narration = [];
        warnCount = 0;
        renderedNarrationSeq = -1;
        renderedNarrationHead = null;
        scheduleRender();
      });

      resetButton.addEventListener("click", () => {
        cancelArmedStop(true);
        lastStopReason = "";
        pendingStopMessage = "";
        resetTracking(false);
        populateSegmentSelect();
        centerView(currentSp());
        updateExecState();
        scheduleRender();
      });

      helpButton.addEventListener("click", () => {
        ctx.messagesPane.postMars(`${t("[tool] Stack Visualizer: the left strip is the whole address space, the middle pane is a zoomable window into memory (wheel scrolls, Ctrl+wheel zooms from blocks to bits) and the log explains every $sp movement, save, restore, call and return.")}\n`);
      });

      closeButton.addEventListener("click", shell.close);

      subscribeLanguageChange(() => {
        shell.refreshTranslations?.();
        populateSegmentSelect();
        updateConnectLabel();
        updateHint();
        updateExecState();
        zoomLabel.textContent = t(ZOOM_LEVELS[zoomIndex].label);
        renderedNarrationSeq = -1;
        scheduleRender();
      });

      const toolRoot = root.querySelector(".sv-tool");

      // The tool window can be resized down to roughly 520x320, so the three-column
      // desktop layout collapses in two stages instead of squeezing the canvases.
      function applyLayoutClasses(detail = {}) {
        const width = Number.isFinite(detail.width) && detail.width > 0
          ? detail.width
          : (toolRoot.clientWidth || 0);
        const height = Number.isFinite(detail.height) && detail.height > 0
          ? detail.height
          : (toolRoot.clientHeight || 0);
        if (!width || !height) return;
        toolRoot.classList.toggle("sv-medium", width < 1040 && width >= 780);
        toolRoot.classList.toggle("sv-small", width < 780);
        toolRoot.classList.toggle("sv-short", height < 520);
        // Narrow but tall (a phone in portrait) still has room for the inspector;
        // only a genuinely short window has to drop it.
        toolRoot.classList.toggle("sv-tiny", height < 400);
        updateHint();
      }

      shell.onResize((detail) => {
        applyLayoutClasses(detail);
        scheduleRender();
      });

      function updateHint() {
        const coarse = (typeof window.matchMedia === "function"
          && window.matchMedia("(pointer: coarse)").matches)
          || ctx.desktop?.classList?.contains("desktop-stacked") === true;
        hintBox.textContent = coarse
          ? t("Drag to scroll · pinch to zoom · tap a word to decode it · double-tap follows it as a pointer")
          : t("Wheel scrolls · Ctrl+wheel zooms · click inspects a word · double-click follows it as a pointer");
      }

      populateSegmentSelect();
      updateConnectLabel();
      updateHint();
      updateExecState();
      zoomLabel.textContent = t(ZOOM_LEVELS[zoomIndex].label);
      applyLayoutClasses();
      scheduleRender();

      return {
        isConnected: () => connected,
        open() {
          shell.open();
          // The shell re-applies the static translations, so the labels this tool
          // writes itself have to be restored afterwards.
          updateConnectLabel();
          updateHint();
          updateExecState();
          zoomLabel.textContent = t(ZOOM_LEVELS[zoomIndex].label);
          applyLayoutClasses();
          scheduleRender();
        },
        close: shell.close,
        onSnapshot(snapshot) {
          if (!snapshot) return;
          latestSnapshot = snapshot;
          const revision = snapshot.runtimeRevision >>> 0;
          syncLabels(snapshot, lastRuntimeRevision !== revision);
          if (lastRuntimeRevision !== revision) {
            lastRuntimeRevision = revision;
            cancelArmedStop(true);
            pendingStopMessage = "";
            lastStopReason = "";
            resetTracking(false);
            populateSegmentSelect();
          } else {
            history.sync(snapshot);
            if (!Number.isFinite(trackedSp)) trackedSp = readRegister(REG_SP) >>> 0;
          }
          if (viewTopAddress == null) centerView(currentSp());
          resolveStepOver();
          settleAfterStop();
          updateExecState();
          if (connected) scheduleRender();
        },
        onRuntimeEvent(event, delivery = {}) {
          if (!connected || !event) return;
          if (event.type === "backstep") {
            history.rewind(event.stepAfter | 0);
            return;
          }
          if (event.type !== "instruction") return;
          handleInstructionEvent(event, delivery.retainHistory !== false);
          history.pruneBefore(event.historyStartStep | 0);
        },
        onRuntimeBatchEnd() {
          if (connected) scheduleRender();
        },
        onBackstep(event) {
          if (!connected || !event) return;
          history.rewind(event.stepAfter | 0);
          scheduleRender();
        }
      };
    }
  });
})();
