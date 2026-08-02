/*
 * Shared file-manager view.
 *
 * Three surfaces list files today - the project tree in the main window, the
 * same tree in the "Project Files" tool window, and the Browser Storage
 * open/save dialog - and each used to ship its own markup, its own row layout
 * and its own responsive story. This module owns the chrome (toolbar,
 * breadcrumb, column header, rows, status bar) so they stay identical, and it
 * renders one node model two ways: an indented tree on the desktop and a
 * drill-down list on narrow screens, where an 18px tree row is unusable.
 */
(function initFileManagerModule(rootScope) {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);
  const registry = root.WebMarsModules || (root.WebMarsModules = {});
  if (registry.fileManager) return;

  const STYLE_ID = "webmars-file-manager-style";
  // Matches the stacked layout breakpoint so the list view and the desktop
  // window layout switch on the same screen width.
  const TOUCH_LAYOUT_QUERY = "(max-width: 800px)";
  const SORT_KEYS = ["name", "size", "lines", "updatedAt"];
  const LONG_PRESS_MS = 480;
  const LONG_PRESS_SLOP_PX = 10;

  function t(message, variables) {
    return typeof translateText === "function"
      ? translateText(message, variables)
      : String(message ?? "");
  }

  function esc(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value < 0) return "";
    if (value < 1024) return `${Math.round(value)} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} kB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  // File managers show a date, not a full timestamp: today collapses to a
  // clock reading and anything older drops the part the reader can infer.
  function formatDate(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
    const date = new Date(timestamp);
    const now = new Date();
    try {
      const sameDay = date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth()
        && date.getDate() === now.getDate();
      if (sameDay) {
        return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      }
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
      }
      return date.toLocaleDateString(undefined, { year: "numeric", month: "short" });
    } catch {
      return date.toISOString().slice(0, 10);
    }
  }

  function formatDateFull(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return "";
    }
  }

  const GLYPHS = Object.freeze({
    folder: "<path d=\"M2 4.4a1.2 1.2 0 0 1 1.2-1.2h3l1.5 1.8h5.1A1.2 1.2 0 0 1 14 6.2v6.2a1.2 1.2 0 0 1-1.2 1.2H3.2A1.2 1.2 0 0 1 2 12.4z\"/>",
    folderOpen: "<path d=\"M2 12.4V4.4a1.2 1.2 0 0 1 1.2-1.2h3l1.5 1.8h5.1A1.2 1.2 0 0 1 14 6.2v1.1\"/><path d=\"M2.1 12.9 4 7.9a.9.9 0 0 1 .85-.6h9.1a.6.6 0 0 1 .57.8l-1.62 4.6a.9.9 0 0 1-.85.6H3.2a1.1 1.1 0 0 1-1.1-1.4z\"/>",
    file: "<path d=\"M4 1.9h4.6L12.1 5.4v8.7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.9a1 1 0 0 1 1-1z\"/><path d=\"M8.5 2v3.4h3.5\"/>",
    project: "<path d=\"M8 1.7 14 5v6L8 14.3 2 11V5z\"/><path d=\"M2 5l6 3.2L14 5\"/><path d=\"M8 8.2v6.1\"/>",
    library: "<path d=\"M3 2.6h3v10.8H3z\"/><path d=\"M6.6 2.6h2.8v10.8H6.6z\"/><path d=\"m10.4 3.2 2.7.7-2.4 9.6-2.7-.7z\"/>",
    drive: "<path d=\"M2.2 8.6h11.6v4A1.2 1.2 0 0 1 12.6 13.8H3.4a1.2 1.2 0 0 1-1.2-1.2z\"/><path d=\"m3.6 3.1.9-.9h7l.9.9 1.4 5.5H2.2z\"/><path d=\"M4.6 11.2h2.2\"/>",
    search: "<circle cx=\"7.2\" cy=\"7.2\" r=\"4.3\"/><path d=\"m10.5 10.5 3 3\"/>",
    newFolder: "<path d=\"M14 8.6V6.2A1.2 1.2 0 0 0 12.8 5H7.7L6.2 3.2h-3A1.2 1.2 0 0 0 2 4.4v8a1.2 1.2 0 0 0 1.2 1.2h4.6\"/><path d=\"M11.6 9.4v4.4M9.4 11.6h4.4\"/>",
    newFile: "<path d=\"M8.8 2H4a1 1 0 0 0-1 1v10.2a1 1 0 0 0 1 1h3.4\"/><path d=\"M8.7 2v3.4h3.5\"/><path d=\"M11.6 9.4v4.4M9.4 11.6h4.4\"/>",
    rename: "<path d=\"M2.6 11.1 10.4 3.3l2.3 2.3-7.8 7.8-3 .7z\"/><path d=\"m9.1 4.6 2.3 2.3\"/>",
    trash: "<path d=\"M2.9 4.2h10.2\"/><path d=\"M5.4 4.2V2.9h5.2v1.3\"/><path d=\"M4.2 4.2 4.9 13a.9.9 0 0 0 .9.8h4.4a.9.9 0 0 0 .9-.8l.7-8.8\"/>",
    refresh: "<path d=\"M13.2 8a5.2 5.2 0 1 1-1.6-3.7\"/><path d=\"M13.4 2.4v3h-3\"/>",
    upload: "<path d=\"M8 10.6V2.6\"/><path d=\"m4.9 5.7 3.1-3.1 3.1 3.1\"/><path d=\"M2.8 10.2v2.2a1.2 1.2 0 0 0 1.2 1.2h8a1.2 1.2 0 0 0 1.2-1.2v-2.2\"/>",
    download: "<path d=\"M8 2.4v8\"/><path d=\"m4.9 7.3 3.1 3.1 3.1-3.1\"/><path d=\"M2.8 10.2v2.2a1.2 1.2 0 0 0 1.2 1.2h8a1.2 1.2 0 0 0 1.2-1.2v-2.2\"/>",
    back: "<path d=\"M12.6 8H3.6\"/><path d=\"m7.2 3.6-4 4.4 4 4.4\"/>",
    chevron: "<path d=\"m6.2 3.4 4.6 4.6-4.6 4.6\"/>",
    more: "<circle cx=\"3.6\" cy=\"8\" r=\"1.1\"/><circle cx=\"8\" cy=\"8\" r=\"1.1\"/><circle cx=\"12.4\" cy=\"8\" r=\"1.1\"/>",
    sort: "<path d=\"M4.4 3.2v9.6\"/><path d=\"m2.2 5.4 2.2-2.2 2.2 2.2\"/><path d=\"M11.6 12.8V3.2\"/><path d=\"m9.4 10.6 2.2 2.2 2.2-2.2\"/>",
    close: "<path d=\"m4 4 8 8M12 4l-8 8\"/>"
  });

  function icon(name, extraClass = "") {
    const glyph = GLYPHS[name];
    if (!glyph) return "";
    const classes = ["fm-glyph", extraClass].filter(Boolean).join(" ");
    return `<svg class="${classes}" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${glyph}</svg>`;
  }

  // Node types map onto a glyph plus an accent class; the accent is the only
  // thing that distinguishes a .c from a .s at a glance.
  function resolveNodeIcon(node) {
    const type = String(node?.type || "");
    if (type === "root") return icon("drive", "fm-glyph-root");
    if (type === "project") return icon("project", "fm-glyph-project");
    if (type === "libs-root") return icon("library", "fm-glyph-libs");
    if (type.endsWith("folder")) {
      return icon(node?.expanded ? "folderOpen" : "folder", "fm-glyph-folder");
    }
    const name = String(node?.name || "").toLowerCase();
    if (/\.(c|c0)$/.test(name)) return icon("file", "fm-glyph-c");
    if (/\.(h|h0)$/.test(name)) return icon("file", "fm-glyph-h");
    if (/\.(s|asm|mips)$/.test(name)) return icon("file", "fm-glyph-asm");
    return icon("file", "fm-glyph-text");
  }

  function isFolderType(type) {
    const value = String(type || "");
    return value === "root"
      || value === "project"
      || value === "libs-root"
      || value.endsWith("folder");
  }

  function ensureFileManagerStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
    .fm {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr) auto auto;
      min-height: 0;
      height: 100%;
      background: var(--surface-sunken);
      color: var(--text);
      font-family: "Segoe UI", "Tahoma", sans-serif;
      font-size: 12px;
      --fm-row-height: 24px;
      --fm-indent: 15px;
    }

    /* Rows are pinned explicitly: hiding the column header or the footer with
       [hidden] removes it from grid flow and would otherwise shift the rest. */
    .fm-toolbar { grid-row: 1; }
    .fm-columns { grid-row: 2; }
    .fm-body { grid-row: 3; }
    .fm-status { grid-row: 4; }
    .fm-footer { grid-row: 5; }

    .fm-toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      padding: 5px 7px;
      border-bottom: 1px solid var(--line-soft);
      background: linear-gradient(180deg, var(--surface-raised), var(--surface-strong));
    }

    .fm-glyph {
      width: 15px;
      height: 15px;
      flex: 0 0 auto;
      /* Decorative: clicks belong to the button or row underneath. */
      pointer-events: none;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.3;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .fm-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid var(--line);
      border-radius: 3px;
      background: linear-gradient(180deg, var(--btn-hi), var(--btn-lo));
      color: var(--text);
      padding: 2px 8px;
      min-height: 24px;
      font: inherit;
      font-size: 11px;
      line-height: 1.4;
      cursor: pointer;
      white-space: nowrap;
    }

    .fm-btn:hover:enabled {
      border-color: var(--line-hover);
      background: linear-gradient(180deg, var(--btn-hi), var(--btn-lo-hover));
    }

    .fm-btn:active:enabled {
      background: var(--surface-inset);
    }

    .fm-btn:disabled {
      opacity: 0.45;
      cursor: default;
    }

    .fm-btn-danger:enabled {
      color: var(--error-deep);
    }

    .fm-btn-icon {
      padding: 2px 5px;
    }

    .fm-btn.primary {
      border-color: var(--accent);
      background: linear-gradient(180deg, var(--accent), var(--accent-2));
      color: var(--text-on-accent);
      font-weight: 600;
    }

    .fm-btn.primary:hover:enabled {
      background: linear-gradient(180deg, var(--accent-strong), var(--accent-2));
    }

    .fm-toolbar-spacer {
      flex: 1 1 auto;
      min-width: 0;
    }

    .fm-breadcrumb {
      display: flex;
      align-items: center;
      gap: 1px;
      min-width: 0;
      overflow: hidden;
      flex: 1 1 180px;
    }

    .fm-crumb {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: 190px;
      border: 1px solid transparent;
      border-radius: 3px;
      background: transparent;
      color: var(--text-muted);
      padding: 2px 5px;
      min-height: 22px;
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .fm-crumb:hover:enabled {
      border-color: var(--line-soft);
      background: var(--accent-soft-2);
      color: var(--text);
    }

    .fm-crumb:last-child {
      color: var(--text);
      font-weight: 600;
    }

    .fm-crumb-sep {
      color: var(--text-faint);
      flex: 0 0 auto;
    }

    .fm-crumb-sep .fm-glyph {
      width: 11px;
      height: 11px;
    }

    .fm-search {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1px solid var(--line);
      border-radius: 3px;
      background: var(--surface);
      padding: 0 6px;
      min-height: 24px;
      flex: 0 1 200px;
      min-width: 110px;
      color: var(--text-faint);
    }

    .fm-search:focus-within {
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--focus-ring);
    }

    .fm-search input {
      border: none;
      outline: none;
      background: transparent;
      color: var(--text);
      font: inherit;
      font-size: 11px;
      min-width: 0;
      width: 100%;
      padding: 2px 0;
    }

    .fm-search input::-webkit-search-cancel-button {
      appearance: none;
    }

    .fm-actions {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }

    .fm-columns {
      display: grid;
      align-items: center;
      border-bottom: 1px solid var(--line-soft);
      background: var(--surface-inset);
      padding-right: 6px;
      font-size: 10px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--text-faint);
    }

    .fm-col-btn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      border: none;
      background: transparent;
      color: inherit;
      font: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
      padding: 3px 4px;
      min-height: 20px;
      cursor: pointer;
      overflow: hidden;
      white-space: nowrap;
    }

    .fm-col-btn:hover {
      color: var(--text);
      background: var(--accent-soft-2);
    }

    .fm-col-btn[data-fm-active="1"] {
      color: var(--accent-strong);
      font-weight: 700;
    }

    .fm-col-arrow {
      font-size: 9px;
      line-height: 1;
    }

    .fm-body {
      min-height: 0;
      overflow: auto;
      padding: 3px 0 6px;
      outline: none;
    }

    .fm-body:focus-visible {
      box-shadow: inset 0 0 0 2px var(--accent-line);
    }

    .fm-row {
      display: grid;
      align-items: center;
      column-gap: 5px;
      padding-right: 6px;
      min-height: var(--fm-row-height);
      border: 1px solid transparent;
      border-left-width: 3px;
      background: transparent;
      cursor: pointer;
      user-select: none;
    }

    .fm-row:hover {
      background: var(--accent-soft-2);
    }

    .fm-row[data-fm-selected="1"] {
      background: var(--accent-soft);
      border-color: var(--accent-line);
    }

    .fm-row[data-fm-active="1"] {
      border-left-color: var(--accent);
      background: var(--accent-active);
      font-weight: 600;
    }

    .fm-row[data-fm-active="1"][data-fm-selected="1"] {
      background: var(--accent-soft);
      border-color: var(--accent);
    }

    .fm-row[data-fm-focused="1"] {
      outline: 1px dotted var(--line-hover);
      outline-offset: -2px;
    }

    .fm-row[data-fm-readonly="1"] .fm-name-text {
      color: var(--text-soft);
    }

    .fm-row[data-fm-drop="1"] {
      border-color: var(--accent);
      background: var(--accent-active);
    }

    .fm-row[data-fm-dragging="1"] {
      opacity: 0.5;
    }

    .fm-lead {
      display: inline-flex;
      align-self: stretch;
      align-items: stretch;
      justify-content: flex-end;
      flex: 0 0 auto;
      padding-left: calc(var(--fm-depth, 0) * var(--fm-indent));
    }

    .fm-toggle {
      width: 20px;
      /* Fills the row so a click a few pixels above or below the 11px glyph
         still lands on the button instead of the inert indent cell. */
      height: 100%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      border-radius: 3px;
      background: transparent;
      color: var(--text-muted);
      padding: 0;
      cursor: pointer;
    }

    .fm-toggle:hover {
      border-color: var(--line-soft);
      background: var(--surface-raised);
      color: var(--text);
    }

    .fm-toggle .fm-glyph {
      width: 11px;
      height: 11px;
      stroke-width: 1.8;
      transition: transform 120ms ease;
    }

    .fm-toggle[data-fm-expanded="1"] .fm-glyph {
      transform: rotate(90deg);
    }

    .fm-toggle.spacer {
      visibility: hidden;
      pointer-events: none;
    }

    .fm-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      margin: 0;
      cursor: pointer;
    }

    .fm-check input {
      width: 13px;
      height: 13px;
      margin: 0;
      accent-color: var(--accent);
      cursor: pointer;
    }

    .fm-check input:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .fm-check.spacer {
      visibility: hidden;
      pointer-events: none;
    }

    .fm-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      color: var(--text-muted);
    }

    .fm-glyph-folder { color: var(--amber-line); }
    .fm-glyph-project { color: var(--accent); }
    .fm-glyph-libs { color: var(--text-soft); }
    .fm-glyph-root { color: var(--text-muted); }
    .fm-glyph-c { color: var(--syntax-opcode); }
    .fm-glyph-h { color: var(--syntax-directive); }
    .fm-glyph-asm { color: var(--syntax-register); }
    .fm-glyph-text { color: var(--text-faint); }

    .fm-name {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
      gap: 1px;
      padding: 2px 0;
    }

    .fm-name-text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text);
    }

    .fm-name-sub {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 10px;
      font-weight: 400;
      color: var(--text-faint);
    }

    .fm-badge {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      flex: 0 0 auto;
      box-shadow: inset 0 0 0 1px var(--inset-ring);
    }

    .fm-badge-green { background: var(--sync-green); }
    .fm-badge-orange { background: var(--sync-orange); }
    .fm-badge-red { background: var(--sync-red); }
    .fm-badge-none { background: transparent; box-shadow: none; }

    .fm-cell {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
      font-weight: 400;
      font-variant-numeric: tabular-nums;
      color: var(--text-soft);
      text-align: right;
    }

    .fm-cell-date {
      text-align: left;
    }

    .fm-row-menu {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: 1px solid transparent;
      border-radius: 3px;
      background: transparent;
      color: var(--text-faint);
      padding: 0;
      cursor: pointer;
      opacity: 0;
    }

    .fm-row:hover .fm-row-menu,
    .fm-row[data-fm-selected="1"] .fm-row-menu,
    .fm-row-menu:focus-visible {
      opacity: 1;
    }

    .fm-row-menu:hover {
      border-color: var(--line-soft);
      background: var(--surface-raised);
      color: var(--text);
    }

    .fm-empty {
      padding: 14px 12px;
      color: var(--text-faint);
      font-style: italic;
      text-align: center;
    }

    .fm-status {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 12px;
      padding: 4px 8px 5px;
      border-top: 1px solid var(--line-soft);
      background: linear-gradient(180deg, var(--surface-raised), var(--surface-inset));
      font-size: 11px;
      color: var(--text-muted);
    }

    .fm-footer {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      padding: 7px 8px;
      border-top: 1px solid var(--line-soft);
      background: var(--surface-muted);
    }

    .fm-footer-spacer {
      flex: 1 1 auto;
    }

    .fm-field {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      flex: 1 1 160px;
      font-size: 11px;
      color: var(--text-muted);
    }

    .fm-field input {
      flex: 1 1 auto;
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 3px;
      background: var(--surface);
      color: var(--text);
      font: inherit;
      font-size: 12px;
      padding: 3px 6px;
      min-height: 26px;
    }

    .fm-field input:read-only {
      background: var(--flat-field-ro);
      color: var(--text-muted);
    }

    .fm-field input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--focus-ring);
    }

    /* Details view: the desktop grid carries the size, lines and date columns.
       Every cell names its column explicitly. Relying on auto-placement broke
       search results, where hiding the indent cell with display:none pulled all
       nine cells one column left and squeezed the file name into the 18px icon
       track. */
    .fm[data-fm-view="tree"] .fm-row,
    .fm[data-fm-view="search"] .fm-row,
    .fm[data-fm-view="tree"] .fm-columns,
    .fm[data-fm-view="search"] .fm-columns {
      grid-template-columns:
        auto auto 18px minmax(0, 1fr) 9px
        var(--fm-size-col, 68px) var(--fm-lines-col, 56px) var(--fm-date-col, 104px) 22px;
    }

    .fm[data-fm-view="tree"] .fm-lead,
    .fm[data-fm-view="search"] .fm-lead { grid-column: 1; }
    .fm[data-fm-view="tree"] .fm-check,
    .fm[data-fm-view="search"] .fm-check { grid-column: 2; }
    .fm[data-fm-view="tree"] .fm-icon,
    .fm[data-fm-view="search"] .fm-icon { grid-column: 3; }
    .fm[data-fm-view="tree"] .fm-name,
    .fm[data-fm-view="search"] .fm-name { grid-column: 4; }
    .fm[data-fm-view="tree"] .fm-badge,
    .fm[data-fm-view="search"] .fm-badge { grid-column: 5; }
    .fm[data-fm-view="tree"] .fm-cell-size,
    .fm[data-fm-view="search"] .fm-cell-size { grid-column: 6; }
    .fm[data-fm-view="tree"] .fm-cell-lines,
    .fm[data-fm-view="search"] .fm-cell-lines { grid-column: 7; }
    .fm[data-fm-view="tree"] .fm-cell-date,
    .fm[data-fm-view="search"] .fm-cell-date { grid-column: 8; }
    .fm[data-fm-view="tree"] .fm-row-menu,
    .fm[data-fm-view="tree"] .fm-chevron,
    .fm[data-fm-view="search"] .fm-row-menu,
    .fm[data-fm-view="search"] .fm-chevron { grid-column: 9; }

    /* Drill-down list: one folder level at a time, no indentation, no columns. */
    .fm[data-fm-view="list"] .fm-row {
      grid-template-columns: auto 22px minmax(0, 1fr) 9px 26px;
    }

    .fm[data-fm-view="list"] .fm-check { grid-column: 1; }
    .fm[data-fm-view="list"] .fm-icon { grid-column: 2; }
    .fm[data-fm-view="list"] .fm-name { grid-column: 3; }
    .fm[data-fm-view="list"] .fm-badge { grid-column: 4; }
    .fm[data-fm-view="list"] .fm-row-menu,
    .fm[data-fm-view="list"] .fm-chevron { grid-column: 5; }

    .fm[data-fm-view="list"] .fm-columns,
    .fm[data-fm-view="list"] .fm-lead,
    .fm[data-fm-view="list"] .fm-cell-size,
    .fm[data-fm-view="list"] .fm-cell-lines,
    .fm[data-fm-view="list"] .fm-cell-date {
      display: none;
    }

    .fm[data-fm-view="list"] .fm-icon {
      width: 22px;
    }

    .fm[data-fm-view="list"] .fm-icon .fm-glyph {
      width: 19px;
      height: 19px;
    }

    .fm[data-fm-view="list"] .fm-row-menu {
      opacity: 1;
      width: 26px;
      height: 30px;
    }

    .fm[data-fm-view="list"] .fm-chevron {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-faint);
    }

    .fm-chevron {
      display: none;
    }

    .fm[data-fm-view="search"] .fm-lead {
      display: none;
    }

    /* A narrow pane - the Project tool window pulled in, or a phone showing
       search results - drops the two widest columns. The metadata is already
       repeated in the row subtitle, and keeping them left the name ~26px. */
    .fm[data-fm-narrow="1"] .fm-row,
    .fm[data-fm-narrow="1"] .fm-columns {
      --fm-lines-col: 0px;
      --fm-date-col: 0px;
    }

    .fm[data-fm-narrow="1"] .fm-cell-lines,
    .fm[data-fm-narrow="1"] .fm-cell-date,
    .fm[data-fm-narrow="1"] .fm-col-btn[data-fm-sort-key="lines"],
    .fm[data-fm-narrow="1"] .fm-col-btn[data-fm-sort-key="updatedAt"] {
      display: none;
    }

    .fm-empty-branch {
      padding: 2px 0 3px calc(6px + (var(--fm-depth, 0) * var(--fm-indent)) + 41px);
      color: var(--text-faint);
      font-size: 11px;
      font-style: italic;
    }

    /* Touch layout: rows and controls grow to a thumb-sized target. */
    @media ${TOUCH_LAYOUT_QUERY} {
      .fm {
        --fm-row-height: 46px;
        font-size: 13px;
      }

      .fm-toolbar {
        padding: 6px;
        gap: 5px;
      }

      .fm-btn {
        min-height: 34px;
        padding: 4px 10px;
        font-size: 12px;
      }

      .fm-btn-icon {
        padding: 4px 8px;
      }

      .fm-crumb {
        min-height: 30px;
        font-size: 12px;
      }

      /* Two fixed lines instead of flex wrapping: back plus breadcrumb, then
         search beside the icon-only actions. Wrapping put each control on its
         own line and ate a third of a phone screen. */
      .fm-toolbar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
      }

      .fm-toolbar > [data-fm-up] {
        grid-area: 1 / 1 / 2 / 2;
      }

      .fm-breadcrumb {
        grid-area: 1 / 2 / 2 / 4;
      }

      .fm-toolbar-spacer {
        display: none;
      }

      .fm-search {
        grid-area: 2 / 1 / 3 / 3;
        min-height: 34px;
      }

      .fm-actions {
        grid-area: 2 / 3 / 3 / 4;
        flex-wrap: nowrap;
      }

      .fm-actions .fm-btn span {
        display: none;
      }

      .fm-actions .fm-btn {
        padding: 4px 9px;
      }

      .fm-search input {
        font-size: 13px;
      }

      .fm-name-text {
        font-size: 13px;
      }

      .fm-name-sub {
        font-size: 11px;
      }

      .fm-check input {
        width: 18px;
        height: 18px;
      }

      .fm-toggle {
        width: 32px;
      }

      .fm-toggle .fm-glyph {
        width: 14px;
        height: 14px;
      }

      /* Search results reuse the drill-down row: the size, line count and
         date all live in the subtitle already. */
      .fm[data-fm-view="search"] .fm-row {
        grid-template-columns: auto 22px minmax(0, 1fr) 9px 26px;
      }

      .fm[data-fm-view="search"] .fm-check { grid-column: 1; }
      .fm[data-fm-view="search"] .fm-icon { grid-column: 2; }
      .fm[data-fm-view="search"] .fm-name { grid-column: 3; }
      .fm[data-fm-view="search"] .fm-badge { grid-column: 4; }
      .fm[data-fm-view="search"] .fm-row-menu,
      .fm[data-fm-view="search"] .fm-chevron { grid-column: 5; }

      .fm[data-fm-view="search"] .fm-columns,
      .fm[data-fm-view="search"] .fm-cell-size,
      .fm[data-fm-view="search"] .fm-cell-lines,
      .fm[data-fm-view="search"] .fm-cell-date {
        display: none;
      }

      .fm[data-fm-view="search"] .fm-icon {
        width: 22px;
      }

      .fm[data-fm-view="search"] .fm-icon .fm-glyph {
        width: 19px;
        height: 19px;
      }

      .fm[data-fm-view="search"] .fm-row-menu {
        opacity: 1;
        width: 26px;
        height: 30px;
      }

      .fm-status {
        font-size: 11px;
        padding: 6px 8px;
      }

      .fm-footer {
        padding: 8px;
      }

      .fm-field input {
        min-height: 34px;
        font-size: 14px;
      }
    }

    /* Context menu shared by right-click, the row overflow button and long press. */
    .fm-menu {
      position: fixed;
      z-index: 12000;
      min-width: 172px;
      max-width: 260px;
      border: 1px solid var(--line);
      border-radius: 4px;
      background: var(--surface-raised);
      box-shadow: var(--shadow-popup);
      padding: 3px;
      font-family: "Segoe UI", "Tahoma", sans-serif;
      font-size: 12px;
      color: var(--text);
    }

    .fm-menu[hidden] {
      display: none;
    }

    .fm-menu-title {
      padding: 4px 8px 5px;
      margin-bottom: 2px;
      border-bottom: 1px solid var(--line-subtle);
      color: var(--text-faint);
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .fm-menu-item {
      display: flex;
      align-items: center;
      gap: 7px;
      width: 100%;
      border: none;
      border-radius: 3px;
      background: transparent;
      color: var(--text);
      font: inherit;
      text-align: left;
      padding: 5px 8px;
      min-height: 28px;
      cursor: pointer;
    }

    .fm-menu-item:hover:enabled {
      background: var(--accent-soft);
    }

    .fm-menu-item:disabled {
      opacity: 0.45;
      cursor: default;
    }

    .fm-menu-item.danger:enabled {
      color: var(--error-deep);
    }

    .fm-menu-sep {
      height: 1px;
      margin: 3px 4px;
      background: var(--line-subtle);
    }

    @media ${TOUCH_LAYOUT_QUERY} {
      .fm-menu {
        min-width: 200px;
      }

      .fm-menu-item {
        min-height: 40px;
        font-size: 13px;
      }
    }
    `;
    document.head.appendChild(style);
  }

  // One popup is enough: only one context menu can be open at a time, and
  // sharing it keeps every file-manager instance consistent.
  let sharedMenu = null;

  function getSharedMenu() {
    if (sharedMenu && sharedMenu.isConnected) return sharedMenu;
    ensureFileManagerStyles();
    sharedMenu = document.createElement("div");
    sharedMenu.className = "fm-menu";
    sharedMenu.hidden = true;
    sharedMenu.setAttribute("role", "menu");
    document.body.appendChild(sharedMenu);
    return sharedMenu;
  }

  function closeContextMenu() {
    if (sharedMenu) {
      sharedMenu.hidden = true;
      sharedMenu.innerHTML = "";
    }
  }

  function openContextMenu(items, position, onPick, titleText = "") {
    const menu = getSharedMenu();
    const usable = (Array.isArray(items) ? items : []).filter(Boolean);
    if (!usable.length) {
      closeContextMenu();
      return;
    }
    menu.innerHTML = `${titleText ? `<div class="fm-menu-title">${esc(titleText)}</div>` : ""}${usable.map((item) => {
      if (item === "-") return "<div class=\"fm-menu-sep\"></div>";
      const classes = ["fm-menu-item", item.danger ? "danger" : ""].filter(Boolean).join(" ");
      return `<button type="button" class="${classes}" data-fm-menu-id="${esc(item.id)}"${item.disabled ? " disabled" : ""} role="menuitem">${item.icon ? icon(item.icon) : ""}<span>${esc(item.label)}</span></button>`;
    }).join("")}`;
    menu.hidden = false;
    const rect = menu.getBoundingClientRect();
    const left = Math.max(4, Math.min(position.x, window.innerWidth - rect.width - 4));
    const top = Math.max(4, Math.min(position.y, window.innerHeight - rect.height - 4));
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
    menu.onclick = (event) => {
      const button = event.target instanceof Element
        ? event.target.closest("[data-fm-menu-id]")
        : null;
      if (!(button instanceof HTMLElement)) return;
      const id = String(button.dataset.fmMenuId || "");
      closeContextMenu();
      if (id) onPick(id);
    };
  }

  if (typeof document !== "undefined") {
    document.addEventListener("pointerdown", (event) => {
      if (!sharedMenu || sharedMenu.hidden) return;
      if (event.target instanceof Node && sharedMenu.contains(event.target)) return;
      closeContextMenu();
    }, true);
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeContextMenu();
    });
    window.addEventListener("blur", closeContextMenu);
  }

  function compareNodes(left, right, sortKey, sortDirection) {
    // A node can pin itself to the bottom of its level (the read-only global
    // library sits below the projects however the list is sorted).
    if ((left.sortLast === true) !== (right.sortLast === true)) {
      return left.sortLast === true ? 1 : -1;
    }

    // Folders always lead, whatever the sort: that is what every file manager
    // does and it keeps a deep tree readable.
    const leftIsFolder = isFolderType(left.type);
    const rightIsFolder = isFolderType(right.type);
    if (leftIsFolder !== rightIsFolder) return leftIsFolder ? -1 : 1;

    const direction = sortDirection === "desc" ? -1 : 1;
    if (sortKey === "size") {
      return direction * ((Number(left.bytes) || 0) - (Number(right.bytes) || 0));
    }
    if (sortKey === "lines") {
      return direction * ((Number(left.lineCount) || 0) - (Number(right.lineCount) || 0));
    }
    if (sortKey === "updatedAt") {
      return direction * ((Number(left.updatedAt) || 0) - (Number(right.updatedAt) || 0));
    }
    return direction * String(left.name || "").localeCompare(
      String(right.name || ""),
      undefined,
      { sensitivity: "base", numeric: true }
    );
  }

  function createFileManager(config = {}) {
    ensureFileManagerStyles();

    const host = config.host;
    if (!(host instanceof HTMLElement)) {
      throw new Error("createFileManager requires a host element");
    }

    const features = {
      search: true,
      sort: true,
      columns: true,
      checkboxes: false,
      contextMenu: true,
      keyboard: true,
      dragDrop: false,
      drillDown: true,
      status: true,
      ...(config.features || {})
    };

    const state = {
      query: "",
      sortKey: "name",
      sortDirection: "asc",
      cwdKey: "",
      focusKey: ""
    };

    const index = new Map();
    let rootNodes = [];
    let visibleRows = [];
    let dragSourceKey = "";
    let longPressTimer = null;
    let longPressOrigin = null;

    host.classList.add("fm");
    host.innerHTML = `
      <div class="fm-toolbar" data-fm-toolbar>
        <button class="fm-btn fm-btn-icon" type="button" data-fm-up title="${esc(t("Up one level"))}" aria-label="${esc(t("Up one level"))}" hidden>${icon("back")}</button>
        <nav class="fm-breadcrumb" data-fm-breadcrumb aria-label="${esc(t("Location"))}"></nav>
        <div class="fm-toolbar-spacer"></div>
        <label class="fm-search" data-fm-search-wrap${features.search ? "" : " hidden"}>
          ${icon("search")}
          <input type="search" data-fm-search inputmode="search" enterkeyhint="search" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${esc(t("Search files"))}" aria-label="${esc(t("Search files"))}">
        </label>
        <div class="fm-actions" data-fm-actions></div>
      </div>
      <div class="fm-columns" data-fm-columns${features.columns ? "" : " hidden"}></div>
      <div class="fm-body" data-fm-body tabindex="0" role="tree" aria-label="${esc(config.label || t("Files"))}"></div>
      <div class="fm-status" data-fm-status${features.status ? "" : " hidden"}></div>
      <div class="fm-footer" data-fm-footer hidden></div>
    `;

    const toolbarNode = host.querySelector("[data-fm-toolbar]");
    const upButton = host.querySelector("[data-fm-up]");
    const breadcrumbNode = host.querySelector("[data-fm-breadcrumb]");
    const searchInput = host.querySelector("[data-fm-search]");
    const actionsNode = host.querySelector("[data-fm-actions]");
    const columnsNode = host.querySelector("[data-fm-columns]");
    const bodyNode = host.querySelector("[data-fm-body]");
    const statusNode = host.querySelector("[data-fm-status]");
    const footerNode = host.querySelector("[data-fm-footer]");

    const touchQuery = typeof window.matchMedia === "function"
      ? window.matchMedia(TOUCH_LAYOUT_QUERY)
      : null;
    function isTouchLayout() {
      return touchQuery ? touchQuery.matches : false;
    }

    function callback(name, ...args) {
      const handler = config[name];
      return typeof handler === "function" ? handler(...args) : undefined;
    }

    function resolveView() {
      if (state.query.trim()) return "search";
      // Read the query live: a `change` listener alone misses viewport
      // changes that never fire one, and a stale flag strands the desktop in
      // the drill-down list.
      if (features.drillDown && isTouchLayout()) return "list";
      return "tree";
    }

    function indexNodes(nodes, parentKey, depth) {
      (Array.isArray(nodes) ? nodes : []).forEach((node) => {
        if (!node || !node.key) return;
        index.set(node.key, { node, parentKey, depth });
        if (Array.isArray(node.children)) indexNodes(node.children, node.key, depth + 1);
      });
    }

    function getEntry(key) {
      return index.get(String(key || "")) || null;
    }

    function getChildren(key) {
      if (!key) return rootNodes;
      const entry = getEntry(key);
      return Array.isArray(entry?.node?.children) ? entry.node.children : [];
    }

    function getAncestors(key) {
      const chain = [];
      let current = getEntry(key);
      while (current) {
        chain.unshift(current.node);
        current = current.parentKey ? getEntry(current.parentKey) : null;
      }
      return chain;
    }

    function sorted(nodes) {
      return (Array.isArray(nodes) ? nodes : [])
        .slice()
        .sort((left, right) => compareNodes(left, right, state.sortKey, state.sortDirection));
    }

    function isExpanded(node) {
      const result = callback("isExpanded", node);
      return result === undefined ? true : result === true;
    }

    function nodeSubtitle(node, view) {
      const parts = [];
      if (view === "search") {
        const parentPath = String(node.path || "").split("/").slice(0, -1).join("/");
        const location = [node.rootPath, parentPath].filter(Boolean).join("/");
        if (location) parts.push(location);
      }
      if (Number.isFinite(Number(node.bytes))) parts.push(formatBytes(node.bytes));
      if (Number.isFinite(Number(node.lineCount))) {
        parts.push(t("lines: {count}", { count: Math.max(0, Number(node.lineCount) || 0) }));
      }
      const dateLabel = formatDate(node.updatedAt);
      if (dateLabel) parts.push(dateLabel);
      return parts.join(" · ");
    }

    function renderRow(node, depth, view) {
      const expanded = isFolderType(node.type) && isExpanded(node);
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      const selected = callback("isSelected", node) === true;
      const active = callback("isActive", node) === true;
      const checkable = features.checkboxes && node.checkable !== false;
      const checked = checkable && callback("isChecked", node) === true;
      const readOnly = node.readOnly === true;
      const draggable = features.dragDrop && node.draggable === true;
      // Every folder gets a disclosure control, even an empty one: without it a
      // newly created folder is indistinguishable from a leaf.
      const showToggle = view === "tree" && isFolderType(node.type);
      const subtitle = (view === "list" || view === "search") ? nodeSubtitle(node, view) : "";
      const titleParts = [node.title || node.path || node.name];
      const fullDate = formatDateFull(node.updatedAt);
      if (fullDate) titleParts.push(t("Last write: {date}", { date: fullDate }));

      const attributes = [
        "data-fm-row=\"1\"",
        `data-tree-node-key="${esc(node.key)}"`,
        `data-tree-node-type="${esc(node.type)}"`,
        node.rootPath ? `data-project-root="${esc(node.rootPath)}"` : "",
        node.path ? `data-project-path="${esc(node.path)}"` : "",
        readOnly ? "data-tree-readonly=\"true\" data-fm-readonly=\"1\"" : "",
        selected ? "data-fm-selected=\"1\"" : "",
        active ? "data-fm-active=\"1\"" : "",
        state.focusKey === node.key ? "data-fm-focused=\"1\"" : "",
        draggable ? "draggable=\"true\"" : "",
        `style="--fm-depth:${Math.max(0, depth)}"`,
        `role="treeitem"`,
        isFolderType(node.type) ? `aria-expanded="${expanded ? "true" : "false"}"` : "",
        `title="${esc(titleParts.filter(Boolean).join(" — "))}"`
      ].filter(Boolean).join(" ");

      const toggleMarkup = showToggle
        ? `<button class="fm-toggle" type="button" data-fm-toggle="1" data-tree-toggle="1" data-tree-node-key="${esc(node.key)}" data-fm-expanded="${expanded ? "1" : "0"}" tabindex="-1" aria-label="${esc(t(expanded ? "Collapse" : "Expand"))}">${icon("chevron")}</button>`
        : "<span class=\"fm-toggle spacer\" aria-hidden=\"true\"></span>";

      const checkMarkup = checkable
        ? `<label class="fm-check" title="${esc(t("Select"))}"><input type="checkbox" data-fm-checkbox="1" data-tree-checkbox="1" data-tree-node-key="${esc(node.key)}" data-tree-node-type="${esc(node.type)}"${node.rootPath ? ` data-project-root="${esc(node.rootPath)}"` : ""}${node.path ? ` data-project-path="${esc(node.path)}"` : ""}${readOnly ? " data-tree-readonly=\"true\"" : ""}${checked ? " checked" : ""}${node.checkboxDisabled === true ? " disabled" : ""} tabindex="-1"></label>`
        : "<span class=\"fm-check spacer\" aria-hidden=\"true\"></span>";

      const badgeClass = node.badge ? `fm-badge-${esc(node.badge)}` : "fm-badge-none";
      const badgeTitle = node.badgeTitle ? ` title="${esc(node.badgeTitle)}"` : "";

      return `<div class="fm-row" ${attributes}>
        <span class="fm-lead">${toggleMarkup}</span>
        ${checkMarkup}
        <span class="fm-icon">${resolveNodeIcon({ ...node, expanded })}</span>
        <span class="fm-name"><span class="fm-name-text">${esc(node.name)}</span>${subtitle ? `<span class="fm-name-sub">${esc(subtitle)}</span>` : ""}</span>
        <span class="fm-badge ${badgeClass}"${badgeTitle}></span>
        <span class="fm-cell fm-cell-size">${esc(Number.isFinite(Number(node.bytes)) ? formatBytes(node.bytes) : "")}</span>
        <span class="fm-cell fm-cell-lines">${esc(Number.isFinite(Number(node.lineCount)) ? String(node.lineCount) : "")}</span>
        <span class="fm-cell fm-cell-date">${esc(formatDate(node.updatedAt))}</span>
        ${view === "list" && isFolderType(node.type) && hasChildren
          ? `<span class="fm-chevron">${icon("chevron")}</span>`
          : `<button class="fm-row-menu" type="button" data-fm-row-menu="1" tabindex="-1" aria-label="${esc(t("More actions"))}">${icon("more")}</button>`}
      </div>`;
    }

    function renderTreeBranch(nodes, depth) {
      return sorted(nodes).map((node) => {
        if (!isFolderType(node.type) || !isExpanded(node)) return renderRow(node, depth, "tree");
        const children = Array.isArray(node.children) ? node.children : [];
        // An expanded folder with nothing in it says so, rather than looking
        // like a toggle that did not respond.
        const childMarkup = children.length
          ? renderTreeBranch(children, depth + 1)
          : `<div class="fm-empty-branch" style="--fm-depth:${depth + 1}">${esc(t("This folder is empty."))}</div>`;
        return renderRow(node, depth, "tree") + childMarkup;
      }).join("");
    }

    function collectSearchMatches() {
      const query = state.query.trim().toLowerCase();
      const matches = [];
      index.forEach((entry) => {
        const node = entry.node;
        if (node.type === "root") return;
        const haystack = `${node.name || ""} ${node.path || ""}`.toLowerCase();
        if (haystack.includes(query)) matches.push(node);
      });
      return sorted(matches).slice(0, 400);
    }

    function renderBody(view) {
      if (view === "search") {
        const matches = collectSearchMatches();
        if (!matches.length) {
          return `<div class="fm-empty">${esc(t("No files match '{query}'.", { query: state.query.trim() }))}</div>`;
        }
        return matches.map((node) => renderRow(node, 0, "search")).join("");
      }
      if (view === "list") {
        const children = sorted(getChildren(state.cwdKey));
        if (!children.length) {
          return `<div class="fm-empty">${esc(callback("emptyText") || t("This folder is empty."))}</div>`;
        }
        return children.map((node) => renderRow(node, 0, "list")).join("");
      }
      if (!rootNodes.length) {
        return `<div class="fm-empty">${esc(callback("emptyText") || t("This folder is empty."))}</div>`;
      }
      return renderTreeBranch(rootNodes, 0);
    }

    function renderBreadcrumb(view) {
      const chain = view === "list"
        ? getAncestors(state.cwdKey)
        : getAncestors(state.focusKey).slice(0, -1);
      const crumbs = [{ key: "", name: config.rootLabel || "/" }, ...chain.map((node) => ({
        key: node.key,
        name: node.name
      }))];
      breadcrumbNode.innerHTML = crumbs.map((crumb, position) => {
        const separator = position > 0
          ? `<span class="fm-crumb-sep" aria-hidden="true">${icon("chevron")}</span>`
          : "";
        return `${separator}<button class="fm-crumb" type="button" data-fm-crumb="${esc(crumb.key)}">${esc(crumb.name)}</button>`;
      }).join("");
      if (upButton instanceof HTMLElement) {
        upButton.hidden = !(view === "list" && state.cwdKey);
      }
    }

    function renderColumns(view) {
      if (!features.columns) return;
      columnsNode.hidden = view === "list";
      if (columnsNode.hidden) return;
      const columns = [
        { key: "name", label: t("Name"), span: "grid-column: 1 / 6;" },
        { key: "size", label: t("Size"), span: "grid-column: 6;" },
        { key: "lines", label: t("Lines"), span: "grid-column: 7;" },
        { key: "updatedAt", label: t("Modified"), span: "grid-column: 8;" }
      ];
      columnsNode.innerHTML = `${columns.map((column) => {
        const active = state.sortKey === column.key;
        const arrow = active ? (state.sortDirection === "asc" ? "▲" : "▼") : "";
        const style = column.span ? ` style="${column.span}"` : "";
        return `<button class="fm-col-btn" type="button" data-fm-sort-key="${esc(column.key)}" data-fm-active="${active ? "1" : "0"}"${style}>${esc(column.label)}<span class="fm-col-arrow">${arrow}</span></button>`;
      }).join("")}<span></span>`;
    }

    function renderActions() {
      const actions = Array.isArray(config.actions) ? config.actions : [];
      if (!actions.length) {
        actionsNode.innerHTML = "";
        return;
      }
      actionsNode.innerHTML = actions.map((action) => {
        const disabled = callback("isActionEnabled", action.id) === false;
        const classes = [
          "fm-btn",
          action.danger ? "fm-btn-danger" : "",
          action.iconOnly ? "fm-btn-icon" : ""
        ].filter(Boolean).join(" ");
        const label = t(action.label);
        return `<button class="${classes}" type="button" data-fm-action="${esc(action.id)}"${disabled ? " disabled" : ""} title="${esc(label)}" aria-label="${esc(label)}">${action.icon ? icon(action.icon) : ""}${action.iconOnly ? "" : `<span>${esc(label)}</span>`}</button>`;
      }).join("");
    }

    function renderStatus() {
      if (!features.status) return;
      const cells = callback("getStatusCells");
      statusNode.innerHTML = (Array.isArray(cells) ? cells : [])
        .filter((cell) => String(cell || "").trim())
        .map((cell) => `<span>${esc(cell)}</span>`)
        .join("");
    }

    function syncFocusRow() {
      visibleRows = [...bodyNode.querySelectorAll("[data-fm-row]")];
      if (!visibleRows.some((row) => row.dataset.treeNodeKey === state.focusKey)) {
        state.focusKey = visibleRows[0]?.dataset.treeNodeKey || "";
      }
    }

    const NARROW_PANE_PX = 520;

    function applyPaneWidthState() {
      const width = host.clientWidth;
      // A hidden pane measures zero; keep the last known state rather than
      // flip-flopping every time the panel is tabbed away from.
      if (!width) return;
      const narrow = width < NARROW_PANE_PX ? "1" : "0";
      if (host.dataset.fmNarrow !== narrow) host.dataset.fmNarrow = narrow;
    }

    function render() {
      applyPaneWidthState();
      const model = callback("getModel") || [];
      rootNodes = Array.isArray(model) ? model : (Array.isArray(model?.children) ? model.children : []);
      index.clear();
      indexNodes(rootNodes, "", 0);

      // A drilled-into folder can disappear between renders (deleted project,
      // closed library); drop back to the top rather than render nothing.
      if (state.cwdKey && !index.has(state.cwdKey)) state.cwdKey = "";

      const view = resolveView();
      host.dataset.fmView = view;
      renderBreadcrumb(view);
      renderColumns(view);
      renderActions();
      bodyNode.innerHTML = renderBody(view);
      bodyNode.setAttribute("role", view === "tree" ? "tree" : "listbox");
      syncFocusRow();
      renderStatus();
    }

    function rowNodeFromEvent(target) {
      if (!(target instanceof Element)) return null;
      const row = target.closest("[data-fm-row]");
      if (!(row instanceof HTMLElement)) return null;
      const entry = getEntry(row.dataset.treeNodeKey);
      return entry ? { row, node: entry.node } : null;
    }

    function openMenuFor(node, position) {
      if (!features.contextMenu) return;
      const items = callback("getContextItems", node);
      if (!Array.isArray(items) || !items.length) return;
      openContextMenu(
        items.map((item) => (item === "-" ? item : { ...item, label: t(item.label) })),
        position,
        (id) => callback("onAction", id, node),
        node.name
      );
    }

    function navigateInto(node) {
      state.cwdKey = node.key;
      state.focusKey = "";
      render();
      bodyNode.scrollTop = 0;
    }

    // A folder row in the tree responds to a plain click, the way a modern file
    // tree does; files still need a double click so a single click can select.
    function togglesOnRowClick(node) {
      return resolveView() === "tree"
        && config.toggleFoldersOnRowClick !== false
        && isFolderType(node.type);
    }

    function activate(node) {
      if (resolveView() === "list" && isFolderType(node.type)
        && Array.isArray(node.children) && node.children.length) {
        navigateInto(node);
        return;
      }
      callback("onActivate", node);
    }

    function cancelLongPress() {
      if (longPressTimer !== null) {
        window.clearTimeout(longPressTimer);
        longPressTimer = null;
      }
      longPressOrigin = null;
    }

    // Event wiring. All of it lives on the container so a full innerHTML
    // re-render never leaves a stale listener behind.
    const listeners = [];

    function on(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      listeners.push(() => target.removeEventListener(type, handler, options));
    }

    on(bodyNode, "click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const toggle = target.closest("[data-fm-toggle]");
      if (toggle instanceof HTMLElement) {
        event.stopPropagation();
        const entry = getEntry(toggle.dataset.treeNodeKey);
        if (entry) {
          callback("onToggle", entry.node);
          render();
        }
        return;
      }

      const hit = rowNodeFromEvent(target);
      if (!hit) return;

      if (target.closest("[data-fm-checkbox]")) {
        const input = target.closest("input");
        if (input instanceof HTMLInputElement) {
          callback("onCheck", hit.node, input.checked);
          render();
        }
        return;
      }

      if (target.closest("[data-fm-row-menu]")) {
        event.stopPropagation();
        const rect = target.closest("[data-fm-row-menu]").getBoundingClientRect();
        openMenuFor(hit.node, { x: rect.left, y: rect.bottom + 2 });
        return;
      }

      state.focusKey = hit.node.key;
      callback("onSelect", hit.node);
      // On touch a single tap is the only affordance there is.
      if (resolveView() === "list" || config.activateOnSingleClick === true) {
        render();
        activate(hit.node);
        return;
      }
      // In the tree the whole folder row is a disclosure target, not just the
      // chevron. The second click of a double click is skipped so the pair does
      // not toggle twice and appear to do nothing.
      if (event.detail <= 1 && togglesOnRowClick(hit.node)) {
        callback("onToggle", hit.node);
      }
      render();
    });

    on(bodyNode, "dblclick", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-fm-checkbox]") || target.closest("[data-fm-toggle]")) return;
      const hit = rowNodeFromEvent(target);
      if (!hit) return;
      // The first click already expanded the folder; opening it again here
      // would collapse it right back.
      if (togglesOnRowClick(hit.node)) return;
      activate(hit.node);
    });

    on(bodyNode, "contextmenu", (event) => {
      const hit = rowNodeFromEvent(event.target);
      if (!hit) return;
      event.preventDefault();
      state.focusKey = hit.node.key;
      callback("onSelect", hit.node);
      render();
      openMenuFor(hit.node, { x: event.clientX, y: event.clientY });
    });

    // Long press stands in for right click on touch devices.
    on(bodyNode, "pointerdown", (event) => {
      if (event.pointerType !== "touch") return;
      const hit = rowNodeFromEvent(event.target);
      if (!hit) return;
      longPressOrigin = { x: event.clientX, y: event.clientY };
      longPressTimer = window.setTimeout(() => {
        longPressTimer = null;
        openMenuFor(hit.node, { x: event.clientX, y: event.clientY });
      }, LONG_PRESS_MS);
    });

    on(bodyNode, "pointermove", (event) => {
      if (longPressTimer === null || !longPressOrigin) return;
      const moved = Math.abs(event.clientX - longPressOrigin.x) > LONG_PRESS_SLOP_PX
        || Math.abs(event.clientY - longPressOrigin.y) > LONG_PRESS_SLOP_PX;
      if (moved) cancelLongPress();
    });

    on(bodyNode, "pointerup", cancelLongPress);
    on(bodyNode, "pointercancel", cancelLongPress);

    on(bodyNode, "change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.matches("[data-fm-checkbox]")) return;
      const hit = rowNodeFromEvent(target);
      if (!hit) return;
      callback("onCheck", hit.node, target.checked);
      render();
    });

    if (features.keyboard) {
      on(bodyNode, "keydown", (event) => {
        const keys = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft", "Enter", "Home", "End", "F2", "Delete", " "];
        if (!keys.includes(event.key)) return;
        syncFocusRow();
        const position = visibleRows.findIndex((row) => row.dataset.treeNodeKey === state.focusKey);
        const currentEntry = getEntry(state.focusKey);
        const move = (nextPosition) => {
          const clamped = Math.max(0, Math.min(visibleRows.length - 1, nextPosition));
          const row = visibleRows[clamped];
          if (!row) return;
          state.focusKey = row.dataset.treeNodeKey || "";
          const entry = getEntry(state.focusKey);
          if (entry) callback("onSelect", entry.node);
          render();
          bodyNode.querySelector("[data-fm-focused=\"1\"]")?.scrollIntoView({ block: "nearest" });
        };

        event.preventDefault();
        if (event.key === "ArrowDown") return move(position + 1);
        if (event.key === "ArrowUp") return move(position - 1);
        if (event.key === "Home") return move(0);
        if (event.key === "End") return move(visibleRows.length - 1);
        if (!currentEntry) return;
        const node = currentEntry.node;
        if (event.key === "Enter" || event.key === " ") return activate(node);
        if (event.key === "F2") return callback("onAction", "rename", node);
        if (event.key === "Delete") return callback("onAction", "delete", node);
        if (event.key === "ArrowRight") {
          if (isFolderType(node.type) && !isExpanded(node)) {
            callback("onToggle", node);
            render();
            return;
          }
          return move(position + 1);
        }
        if (event.key === "ArrowLeft") {
          if (isFolderType(node.type) && isExpanded(node)) {
            callback("onToggle", node);
            render();
            return;
          }
          const parentKey = currentEntry.parentKey;
          if (parentKey) {
            state.focusKey = parentKey;
            const parentEntry = getEntry(parentKey);
            if (parentEntry) callback("onSelect", parentEntry.node);
            render();
          }
        }
      });
    }

    if (features.dragDrop) {
      on(bodyNode, "dragstart", (event) => {
        const hit = rowNodeFromEvent(event.target);
        if (!hit || hit.node.draggable !== true) return;
        dragSourceKey = hit.node.key;
        hit.row.dataset.fmDragging = "1";
        callback("onDragStart", hit.node, event);
      });

      on(bodyNode, "dragover", (event) => {
        if (!dragSourceKey) return;
        bodyNode.querySelectorAll("[data-fm-drop]").forEach((row) => delete row.dataset.fmDrop);
        const hit = rowNodeFromEvent(event.target);
        if (!hit) return;
        const sourceEntry = getEntry(dragSourceKey);
        const effect = callback("onDragOver", hit.node, sourceEntry?.node || null);
        if (!effect) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = effect;
        hit.row.dataset.fmDrop = "1";
      });

      on(bodyNode, "drop", (event) => {
        if (!dragSourceKey) return;
        event.preventDefault();
        bodyNode.querySelectorAll("[data-fm-drop]").forEach((row) => delete row.dataset.fmDrop);
        const hit = rowNodeFromEvent(event.target);
        const sourceEntry = getEntry(dragSourceKey);
        dragSourceKey = "";
        if (!hit || !sourceEntry) return;
        void callback("onDrop", hit.node, sourceEntry.node, event);
      });

      on(bodyNode, "dragend", () => {
        dragSourceKey = "";
        bodyNode.querySelectorAll("[data-fm-drop]").forEach((row) => delete row.dataset.fmDrop);
        bodyNode.querySelectorAll("[data-fm-dragging]").forEach((row) => delete row.dataset.fmDragging);
      });
    }

    on(toolbarNode, "click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest("[data-fm-up]")) {
        const entry = getEntry(state.cwdKey);
        state.cwdKey = entry?.parentKey || "";
        state.focusKey = "";
        render();
        return;
      }

      const crumb = target.closest("[data-fm-crumb]");
      if (crumb instanceof HTMLElement) {
        const key = String(crumb.dataset.fmCrumb || "");
        if (resolveView() === "list") {
          state.cwdKey = key;
          state.focusKey = "";
        } else if (key) {
          state.focusKey = key;
          const entry = getEntry(key);
          if (entry) callback("onSelect", entry.node);
        }
        render();
        return;
      }

      const action = target.closest("[data-fm-action]");
      if (action instanceof HTMLElement) {
        callback("onAction", String(action.dataset.fmAction || ""), null);
      }
    });

    on(columnsNode, "click", (event) => {
      const button = event.target instanceof Element
        ? event.target.closest("[data-fm-sort-key]")
        : null;
      if (!(button instanceof HTMLElement)) return;
      const key = String(button.dataset.fmSortKey || "name");
      if (!SORT_KEYS.includes(key)) return;
      if (state.sortKey === key) {
        state.sortDirection = state.sortDirection === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDirection = key === "name" ? "asc" : "desc";
      }
      render();
    });

    if (searchInput instanceof HTMLInputElement) {
      on(searchInput, "input", () => {
        state.query = searchInput.value;
        render();
      });
      on(searchInput, "keydown", (event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        searchInput.value = "";
        state.query = "";
        render();
      });
    }

    if (typeof ResizeObserver === "function") {
      const narrowObserver = new ResizeObserver(() => applyPaneWidthState());
      narrowObserver.observe(host);
      listeners.push(() => narrowObserver.disconnect());
    }

    // Belt and braces: some embedders deliver neither ResizeObserver callbacks
    // nor media-query change events, so the width is re-read on every render
    // and on every window resize as well.
    on(window, "resize", () => {
      applyPaneWidthState();
      if (resolveView() !== host.dataset.fmView) render();
    });

    if (touchQuery) {
      const onTouchQueryChange = () => render();
      if (typeof touchQuery.addEventListener === "function") {
        touchQuery.addEventListener("change", onTouchQueryChange);
        listeners.push(() => touchQuery.removeEventListener("change", onTouchQueryChange));
      } else if (typeof touchQuery.addListener === "function") {
        touchQuery.addListener(onTouchQueryChange);
        listeners.push(() => touchQuery.removeListener(onTouchQueryChange));
      }
    }

    return {
      element: host,
      render,
      // Selection changes only alter which actions are live and what the status
      // bar counts, so they skip the row rebuild.
      refreshChrome() {
        renderActions();
        renderStatus();
      },
      focus() {
        bodyNode.focus();
      },
      getQuery() {
        return state.query;
      },
      clearQuery() {
        if (searchInput instanceof HTMLInputElement) searchInput.value = "";
        state.query = "";
      },
      getCurrentFolderKey() {
        return state.cwdKey;
      },
      setCurrentFolderKey(key) {
        state.cwdKey = String(key || "");
      },
      setFocusKey(key) {
        state.focusKey = String(key || "");
      },
      // Picker hosts append their own name field and confirm buttons below the
      // status bar; the browser keeps them inside the same grid row flow.
      getFooter() {
        footerNode.hidden = false;
        return footerNode;
      },
      destroy() {
        listeners.splice(0).forEach((remove) => remove());
        cancelLongPress();
        host.innerHTML = "";
        host.classList.remove("fm");
      }
    };
  }

  const api = Object.freeze({
    createFileManager,
    ensureFileManagerStyles,
    closeContextMenu,
    formatBytes,
    formatDate,
    formatDateFull,
    icon,
    isFolderType
  });

  registry.fileManager = api;
  root.WebMarsFileManager = api;
  root.createFileManager = createFileManager;
  root.ensureFileManagerStyles = ensureFileManagerStyles;
})(typeof window !== "undefined" ? window : globalThis);
