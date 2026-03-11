(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  const HELP_STYLE_ID = "mars-java-help-styles";
  const HELP_LANGUAGE_MANIFEST_PATH = "./help/languages.json";
  const HELP_REFERENCE_PATH = "./help/help-reference.json";
  const DEFAULT_HELP_MANIFEST = {
    defaultLanguage: "en",
    languages: [
      { id: "en", label: "English", dir: "en" }
    ]
  };
  const MARS_HELP_TITLE = "MARS 4.5 Help";
  const ABOUT_MARS_TITLE = "About Mars";
  const DOC_VIEWER_TITLE = "Primitive HTML Viewer";

  const HELP_SECTIONS = [
    {
      id: "webmars",
      label: "webMars",
      pages: [
        { id: "info", label: "Info", type: "html", file: "info.html" },
        { id: "changelog", label: "Changelog", type: "html", file: "changelog.html" }
      ]
    },
    {
      id: "mips",
      label: "MIPS",
      kind: "mips",
      pages: [
        { id: "basic", label: "Basic Instructions", type: "generated-list", listKey: "basicInstructions" },
        { id: "extended", label: "Extended (pseudo) Instructions", type: "generated-list", listKey: "extendedInstructions" },
        { id: "directives", label: "Directives", type: "generated-list", listKey: "directives" },
        { id: "syscalls", label: "Syscalls", type: "html", file: "SyscallHelp.html" },
        { id: "exceptions", label: "Exceptions", type: "html", file: "ExceptionsHelp.html" },
        { id: "macros", label: "Macros", type: "html", file: "MacrosHelp.html" }
      ]
    },
    {
      id: "mars",
      label: "MARS",
      pages: [
        { id: "intro", label: "Intro", type: "html", file: "MarsHelpIntro.html" },
        { id: "ide", label: "IDE", type: "html", file: "MarsHelpIDE.html" },
        { id: "debugging", label: "Debugging", type: "html", file: "MarsHelpDebugging.html" },
        { id: "settings", label: "Settings", type: "html", file: "MarsHelpSettings.html" },
        { id: "tools", label: "Tools", type: "html", file: "MarsHelpTools.html" },
        { id: "command", label: "Command", type: "html", file: "MarsHelpCommand.html" },
        { id: "limits", label: "Limits", type: "html", file: "MarsHelpLimits.html" },
        { id: "history", label: "History", type: "html", file: "MarsHelpHistory.html" }
      ]
    },
    {
      id: "license",
      label: "License",
      pages: [{ id: "main", label: "License", type: "text", file: "MARSlicense.txt" }]
    },
    {
      id: "bugs",
      label: "Bugs/Comments",
      pages: [{ id: "main", label: "Bugs/Comments", type: "html", file: "BugReportingHelp.html" }]
    },
    {
      id: "ack",
      label: "Acknowledgements",
      pages: [{ id: "main", label: "Acknowledgements", type: "html", file: "Acknowledgements.html" }]
    },
    {
      id: "song",
      label: "Instruction Set Song",
      pages: [{ id: "main", label: "Instruction Set Song", type: "html", file: "MIPSInstructionSetSong.html" }]
    }
  ];

  const ABOUT_MARS_LINES = [
    "MARS 4.5    Copyright 2003-2014",
    "Pete Sanderson and Kenneth Vollmar",
    "",
    "MARS is the Mips Assembler and Runtime Simulator.",
    "",
    "Mars image courtesy of NASA/JPL.",
    "Toolbar and menu icons are from:",
    "  *  Tango Desktop Project (tango.freedesktop.org),",
    "  *  glyFX (www.glyfx.com) Common Toolbar Set,",
    "  *  KDE-Look (www.kde-look.org) crystalline-blue-0.1,",
    "  *  Icon-King (www.icon-king.com) Nuvola 1.0.",
    "Print feature adapted from HardcopyWriter class in David Flanagan's",
    "Java Examples in a Nutshell 3rd Edition, O'Reilly, ISBN 0-596-00620-9."
  ];

  function translate(message, variables = {}) {
    if (typeof translateText === "function") return translateText(message, variables);
    return String(message ?? "");
  }

  function escape(value) {
    if (typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function ensureHelpStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById(HELP_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = HELP_STYLE_ID;
    style.textContent = `
      .mars-java-help-window,
      .mars-java-about-window,
      .mars-java-doc-window {
        min-width: 520px;
        min-height: 320px;
      }

      .mars-java-help-window .window-controls [data-win-action="min"],
      .mars-java-help-window .window-controls [data-win-action="max"],
      .mars-java-about-window .window-controls [data-win-action="min"],
      .mars-java-about-window .window-controls [data-win-action="max"],
      .mars-java-doc-window .window-controls [data-win-action="min"],
      .mars-java-doc-window .window-controls [data-win-action="max"] {
        display: inline-flex;
      }

      .mars-help-window-content,
      .mars-help-doc-content,
      .mars-help-about-content {
        background: #d4d0c8;
        color: #000;
        display: grid;
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }

      .mars-help-window-content {
        grid-template-rows: auto minmax(0, 1fr) auto;
      }

      .mars-help-tab-row {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: 3px;
        padding: 6px 7px 0;
        border-bottom: 1px solid #7f9db9;
        background: #d4d0c8;
      }

      .mars-help-subtab-row {
        padding-top: 5px;
      }

      .mars-help-tab {
        border: 1px solid #7f9db9;
        border-bottom: none;
        border-radius: 0;
        background: linear-gradient(#f5f5f1, #d8d8d1);
        color: #000;
        min-height: 24px;
        padding: 3px 10px 4px;
        font: 11px Tahoma, sans-serif;
        cursor: pointer;
      }

      .mars-help-tab.active {
        background: #fff;
        position: relative;
        top: 1px;
      }

      .mars-help-body {
        min-height: 0;
        padding: 0 7px 7px;
        overflow: hidden;
      }

      .mars-help-panel-shell {
        height: 100%;
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        border: 1px solid #7f9db9;
        background: #fff;
        overflow: hidden;
      }

      .mars-help-panel-shell.single-page {
        grid-template-rows: minmax(0, 1fr);
      }

      .mars-help-panel-host {
        min-height: 0;
        background: #fff;
        overflow: hidden;
      }

      .mars-help-panel-fill,
      .mars-help-text-wrap,
      .mars-help-error-wrap,
      .mars-help-loading-wrap {
        height: 100%;
        overflow: auto;
      }

      .mars-help-text,
      .mars-help-error,
      .mars-help-loading {
        margin: 0;
        padding: 12px;
        white-space: pre-wrap;
        font: 12px "Courier New", monospace;
      }

      .mars-help-error {
        color: #7b0000;
      }

      .mars-help-loading {
        color: #404040;
      }

      .mars-help-frame,
      .mars-help-doc-frame {
        display: block;
        width: 100%;
        height: 100%;
        border: none;
        background: #fff;
      }

      .mars-help-footer {
        display: flex;
        justify-content: center;
        padding: 0 0 8px;
        background: #d4d0c8;
      }

      .mars-help-footer .tool-btn {
        min-width: 92px;
      }

      .mars-help-mips-layout {
        height: 100%;
        display: grid;
        grid-template-rows: 132px 6px minmax(0, 1fr);
        border: 1px solid #7f9db9;
        background: #fff;
        overflow: hidden;
      }

      .mars-help-mips-remarks-wrap {
        min-height: 0;
        overflow: auto;
        background: #ccff99;
        border-bottom: 1px solid #8ab363;
      }

      .mars-help-mips-remarks {
        padding: 8px 12px;
        font: 12px Tahoma, sans-serif;
      }

      .mars-help-mips-remarks table {
        width: 100%;
        border-collapse: collapse;
      }

      .mars-help-mips-remarks th,
      .mars-help-mips-remarks td {
        padding: 2px 8px;
        vertical-align: top;
      }

      .mars-help-mips-remarks th {
        text-align: left;
        font-weight: 700;
      }

      .mars-help-mips-remarks code {
        font: 12px "Courier New", monospace;
      }

      .mars-help-mips-divider {
        background: linear-gradient(#efe9d7, #d3c7a7);
        border-top: 1px solid #b7a874;
        border-bottom: 1px solid #9e936a;
        cursor: row-resize;
      }

      .mars-help-list {
        display: grid;
        align-content: start;
        min-height: 100%;
        background: #fff;
        font: 12px "Courier New", monospace;
      }

      .mars-help-list-row {
        display: grid;
        grid-template-columns: minmax(260px, auto) 1fr;
        gap: 12px;
        padding: 3px 8px;
        border-bottom: 1px solid #efefef;
        align-items: start;
      }

      .mars-help-list-row.alt {
        background: #eeeeee;
      }

      .mars-help-list-example {
        white-space: pre-wrap;
      }

      .mars-help-list-description {
        white-space: pre-wrap;
      }

      .mars-help-empty {
        padding: 12px;
        font: 12px Tahoma, sans-serif;
      }

      .mars-help-about-content {
        grid-template-rows: minmax(0, 1fr) auto;
      }

      .mars-help-about-main {
        display: grid;
        grid-template-columns: 76px minmax(0, 1fr);
        gap: 16px;
        align-items: start;
        padding: 16px 18px 8px;
        min-height: 0;
        overflow: auto;
      }

      .mars-help-about-image {
        width: 50px;
        height: 50px;
        image-rendering: pixelated;
      }

      .mars-help-about-text {
        margin: 0;
        white-space: pre-wrap;
        font: 13px Tahoma, sans-serif;
        line-height: 1.35;
      }

      .mars-help-doc-content {
        grid-template-rows: auto minmax(0, 1fr) auto;
      }

      .mars-help-url-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 8px;
        align-items: center;
        padding: 8px 10px 0;
        background: #d4d0c8;
      }

      .mars-help-url-row label {
        font: 11px Tahoma, sans-serif;
      }

      .mars-help-url-row input {
        min-width: 0;
        border: 1px solid #7f9db9;
        background: #fff;
        padding: 4px 6px;
        font: 12px "Courier New", monospace;
      }

      .mars-help-doc-host {
        margin: 8px 10px;
        border: 1px solid #7f9db9;
        background: #fff;
        min-height: 0;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  function loadTextResource(path) {
    return fetch(path, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .catch((fetchError) => new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open("GET", path, true);
        req.onload = () => {
          if (req.status === 0 || (req.status >= 200 && req.status < 300)) {
            resolve(req.responseText);
            return;
          }
          reject(new Error(`HTTP ${req.status}`));
        };
        req.onerror = () => reject(fetchError instanceof Error ? fetchError : new Error("Failed to load resource."));
        req.send();
      }));
  }

  function loadJsonResource(path, fallbackValue) {
    return loadTextResource(path)
      .then((text) => JSON.parse(String(text || "").replace(/^\uFEFF/, "")))
      .catch(() => fallbackValue);
  }

  function normalizeHelpManifest(manifest) {
    const entries = Array.isArray(manifest?.languages) ? manifest.languages : [];
    const languages = entries
      .map((entry) => {
        if (typeof entry === "string") {
          const id = entry.trim();
          return id ? { id, label: id, dir: id } : null;
        }
        if (!entry || typeof entry !== "object") return null;
        const id = String(entry.id || entry.lang || "").trim();
        const dir = String(entry.dir || entry.path || id).trim();
        if (!id || !dir) return null;
        return {
          id,
          label: String(entry.label || id).trim() || id,
          dir
        };
      })
      .filter(Boolean);

    if (!languages.length) return DEFAULT_HELP_MANIFEST;
    const defaultLanguage = String(manifest?.defaultLanguage || languages[0].id || "en").trim() || "en";
    return { defaultLanguage, languages };
  }

  let helpManifestPromise = null;
  function getHelpManifest() {
    if (!helpManifestPromise) {
      helpManifestPromise = loadJsonResource(HELP_LANGUAGE_MANIFEST_PATH, DEFAULT_HELP_MANIFEST)
        .then(normalizeHelpManifest);
    }
    return helpManifestPromise;
  }

  function getCurrentUiLanguage() {
    return globalScope.WebMarsI18n?.getLanguage?.() || "en";
  }

  async function getActiveHelpLanguage() {
    const manifest = await getHelpManifest();
    const preferred = String(getCurrentUiLanguage() || "").trim();
    const exact = manifest.languages.find((entry) => entry.id === preferred);
    if (exact) return exact;
    const base = preferred.split("-")[0];
    const partial = manifest.languages.find((entry) => entry.id === base || entry.id.startsWith(`${base}-`));
    if (partial) return partial;
    return manifest.languages.find((entry) => entry.id === manifest.defaultLanguage) || manifest.languages[0] || DEFAULT_HELP_MANIFEST.languages[0];
  }

  async function resolveHelpPath(pathOrFile) {
    const raw = String(pathOrFile || "").trim();
    if (!raw) return "";
    if (/^(?:[a-z]+:|\/\/)/i.test(raw)) return raw;

    const normalized = raw.replace(/\\/g, "/");
    if (normalized.startsWith("./help/") || normalized.startsWith("help/")) {
      const fileName = normalized.split("/").pop() || normalized;
      const helpLanguage = await getActiveHelpLanguage();
      return `./help/${helpLanguage.dir}/${fileName}`;
    }

    if (normalized.includes("/")) return normalized;

    const helpLanguage = await getActiveHelpLanguage();
    return `./help/${helpLanguage.dir}/${normalized}`;
  }

  const helpReferencePromises = new Map();
  async function getHelpReference() {
    const helpLanguage = await getActiveHelpLanguage();
    const key = helpLanguage?.dir || "default";
    if (!helpReferencePromises.has(key)) {
      const localizedPath = helpLanguage?.dir ? `./help/${helpLanguage.dir}/help-reference.json` : HELP_REFERENCE_PATH;
      const promise = loadJsonResource(localizedPath, null)
        .then((payload) => payload || loadJsonResource(HELP_REFERENCE_PATH, {
          basicInstructions: [],
          extendedInstructions: [],
          directives: []
        }));
      helpReferencePromises.set(key, promise);
    }
    return helpReferencePromises.get(key);
  }

  function renderTopTabs(activeId) {
    return HELP_SECTIONS.map((section) => `
      <button class="mars-help-tab ${section.id === activeId ? "active" : ""}" type="button" data-help-section="${section.id}">
        ${escape(translate(section.label))}
      </button>
    `).join("");
  }

  function renderSubTabs(section, activePageId) {
    return section.pages.map((page) => `
      <button class="mars-help-tab ${page.id === activePageId ? "active" : ""}" type="button" data-help-page="${page.id}">
        ${escape(translate(page.label))}
      </button>
    `).join("");
  }

  function renderMipsRemarks() {
    const groups = [
      {
        heading: "Operand Key for Example Instructions",
        rows: [
          ["label, target", "any textual label"],
          ["$t1, $t2, $t3", "any integer register"],
          ["$f2, $f4, $f6", "even-numbered floating point register"],
          ["$f0, $f1, $f3", "any floating point register"],
          ["$8", "any Coprocessor 0 register"],
          ["1", "condition flag (0 to 7)"],
          ["10", "unsigned 5-bit integer (0 to 31)"],
          ["-100", "signed 16-bit integer (-32768 to 32767)"],
          ["100", "unsigned 16-bit integer (0 to 65535)"],
          ["100000", "signed 32-bit integer (-2147483648 to 2147483647)"]
        ]
      },
      {
        heading: "Load & Store addressing mode, basic instructions",
        rows: [
          ["-100($t2)", "sign-extended 16-bit integer added to contents of $t2"]
        ]
      },
      {
        heading: "Load & Store addressing modes, pseudo instructions",
        rows: [
          ["($t2)", "contents of $t2"],
          ["-100", "signed 16-bit integer"],
          ["100", "unsigned 16-bit integer"],
          ["100000", "signed 32-bit integer"],
          ["100($t2)", "zero-extended unsigned 16-bit integer added to contents of $t2"],
          ["100000($t2)", "signed 32-bit integer added to contents of $t2"],
          ["label", "32-bit address of label"],
          ["label($t2)", "32-bit address of label added to contents of $t2"],
          ["label+100000", "32-bit integer added to label's address"],
          ["label+100000($t2)", "sum of 32-bit integer, label's address, and contents of $t2"]
        ]
      }
    ];

    const body = groups.map((group) => {
      const rows = group.rows.map(([example, description]) => `
        <tr>
          <td><code>${escape(example)}</code></td>
          <td>${escape(translate(description))}</td>
        </tr>
      `).join("");
      return `
        <tr><th colspan="2">${escape(translate(group.heading))}</th></tr>
        ${rows}
      `;
    }).join("");

    return `
      <div class="mars-help-mips-remarks">
        <table>
          ${body}
        </table>
      </div>
    `;
  }

  function renderReferenceList(items, kind) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) {
      return `<div class="mars-help-empty">${escape(translate("No help data is available for this section."))}</div>`;
    }

    return `
      <div class="mars-help-list">
        ${list.map((entry, index) => {
          const example = kind === "directives" ? entry.name : entry.example;
          return `
            <div class="mars-help-list-row ${index % 2 === 0 ? "alt" : ""}">
              <span class="mars-help-list-example">${escape(example || "")}</span>
              <span class="mars-help-list-description">${escape(entry.description || "")}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderAboutMarkup() {
    const aboutText = ABOUT_MARS_LINES.map((line) => translate(line)).join("\n");
    return `
      <div class="mars-help-about-main">
        <img class="mars-help-about-image" src="./assets/images/RedMars50.gif" alt="${escape(translate("Mars"))}">
        <pre class="mars-help-about-text">${escape(aboutText)}</pre>
      </div>
    `;
  }

  function buildWindowShell(id, className, title, width, height, bodyHtml, options = {}) {
    const left = Number.isFinite(options.left) ? options.left : 120;
    const top = Number.isFinite(options.top) ? options.top : 64;
    const minWidth = Number.isFinite(options.minWidth) ? options.minWidth : 520;
    const minHeight = Number.isFinite(options.minHeight) ? options.minHeight : 320;
    const controlsHtml = options.closeOnly
      ? `<button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>`
      : `
        <button class="win-btn" data-win-action="min" type="button">_</button>
        <button class="win-btn" data-win-action="max" type="button">[]</button>
        <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
      `;

    const win = document.createElement("section");
    win.className = `desktop-window window-hidden tool-window ${className}`;
    win.id = id;
    win.style.left = `${left}px`;
    win.style.top = `${top}px`;
    win.style.width = `${width}px`;
    win.style.height = `${height}px`;
    win.style.minWidth = `${minWidth}px`;
    win.style.minHeight = `${minHeight}px`;
    win.innerHTML = `
      <div class="window-titlebar">
        <span class="window-title">${escape(translate(title))}</span>
        <div class="window-controls">${controlsHtml}</div>
      </div>
      ${bodyHtml}
    `;
    return win;
  }

  function bindHelpFrameLinks(frame, openDocument) {
    frame.addEventListener("load", () => {
      try {
        const doc = frame.contentDocument;
        if (!doc) return;
        doc.addEventListener("click", (event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const anchor = target.closest("a[href]");
          if (!(anchor instanceof HTMLAnchorElement)) return;
          const href = anchor.getAttribute("href");
          if (!href || href.startsWith("#")) return;
          event.preventDefault();
          event.stopPropagation();
          const resolved = new URL(href, frame.contentWindow?.location?.href || frame.src).toString();
          openDocument(resolved, anchor.textContent?.trim() || DOC_VIEWER_TITLE, { alreadyResolved: true });
        }, { capture: true });
      } catch {
        // Ignore iframe bridge issues on browsers with restricted access.
      }
    });
  }

  globalScope.createMarsJavaStyleHelpSystem = function createMarsJavaStyleHelpSystem(refs, messagesPane, windowManager) {
    ensureHelpStyles();

    const desktop = refs.windows.desktop;
    const helpWin = buildWindowShell(
      "window-help",
      "mars-java-help-window",
      MARS_HELP_TITLE,
      800,
      600,
      `
        <div class="window-content mars-help-window-content">
          <div class="mars-help-tab-row" id="mars-help-top-tabs"></div>
          <div class="mars-help-body" id="mars-help-body"></div>
          <div class="mars-help-footer">
            <button class="tool-btn" id="mars-help-close" type="button">Close</button>
          </div>
        </div>
      `,
      { left: 118, top: 56, minWidth: 680, minHeight: 500 }
    );

    const aboutWin = buildWindowShell(
      "window-help-about",
      "mars-java-about-window",
      ABOUT_MARS_TITLE,
      560,
      360,
      `
        <div class="window-content mars-help-about-content">
          ${renderAboutMarkup()}
          <div class="mars-help-footer">
            <button class="tool-btn" id="mars-help-about-close" type="button">Close</button>
          </div>
        </div>
      `,
      { left: 210, top: 110, minWidth: 520, minHeight: 320 }
    );

    const docWin = buildWindowShell(
      "window-help-doc",
      "mars-java-doc-window",
      DOC_VIEWER_TITLE,
      760,
      560,
      `
        <div class="window-content mars-help-doc-content">
          <div class="mars-help-url-row">
            <label for="mars-help-doc-url">URL:</label>
            <input id="mars-help-doc-url" type="text" readonly>
          </div>
          <div class="mars-help-doc-host">
            <iframe id="mars-help-doc-frame" class="mars-help-doc-frame" title="${escape(translate(DOC_VIEWER_TITLE))}"></iframe>
          </div>
          <div class="mars-help-footer">
            <button class="tool-btn" id="mars-help-doc-close" type="button">Close</button>
          </div>
        </div>
      `,
      { left: 148, top: 78, minWidth: 620, minHeight: 420 }
    );

    desktop.appendChild(helpWin);
    desktop.appendChild(aboutWin);
    desktop.appendChild(docWin);
    windowManager.registerWindow(helpWin);
    windowManager.registerWindow(aboutWin);
    windowManager.registerWindow(docWin);

    const refreshHelpWindowTranslations = typeof translateStaticTree === "function" ? translateStaticTree(helpWin) : () => {};
    const refreshAboutWindowTranslations = typeof translateStaticTree === "function" ? translateStaticTree(aboutWin) : () => {};
    const refreshDocumentWindowTranslations = typeof translateStaticTree === "function" ? translateStaticTree(docWin) : () => {};

    const helpTitleNode = helpWin.querySelector(".window-title");
    const helpTopTabsNode = helpWin.querySelector("#mars-help-top-tabs");
    const helpBodyNode = helpWin.querySelector("#mars-help-body");
    const helpCloseButton = helpWin.querySelector("#mars-help-close");
    const aboutTitleNode = aboutWin.querySelector(".window-title");
    const aboutCloseButton = aboutWin.querySelector("#mars-help-about-close");
    const docTitleNode = docWin.querySelector(".window-title");
    const docUrlNode = docWin.querySelector("#mars-help-doc-url");
    const docFrameNode = docWin.querySelector("#mars-help-doc-frame");
    const docCloseButton = docWin.querySelector("#mars-help-doc-close");

    const state = {
      sectionId: "mips",
      pages: {
        webmars: "info",
        mips: "basic",
        mars: "intro",
        license: "main",
        bugs: "main",
        ack: "main",
        song: "main"
      },
      renderToken: 0,
      mipsSplitRatio: 0.22,
      docUrl: "",
      docTitle: DOC_VIEWER_TITLE
    };

    function postMarsError(message) {
      if (!messagesPane || typeof messagesPane.postMars !== "function") return;
      messagesPane.postMars(`${translate(message)}\n`, { translate: false });
    }

    function getSection(sectionId) {
      return HELP_SECTIONS.find((entry) => entry.id === sectionId) || HELP_SECTIONS[0];
    }

    function getPage(section, pageId) {
      return section.pages.find((entry) => entry.id === pageId) || section.pages[0];
    }

    function normalizeOpenTarget(sectionId = "mips", pageId = "basic") {
      const section = getSection(sectionId);
      const page = getPage(section, pageId);
      return { sectionId: section.id, pageId: page.id };
    }

    function applyMipsSplit(layout) {
      if (!(layout instanceof HTMLElement)) return;
      const totalHeight = Math.max(220, layout.clientHeight || layout.getBoundingClientRect().height || 0);
      const topHeight = Math.max(96, Math.min(Math.round(totalHeight * 0.48), Math.round(totalHeight * state.mipsSplitRatio)));
      layout.style.gridTemplateRows = `${topHeight}px 6px minmax(0, 1fr)`;
    }

    function bindMipsDivider(layout, divider) {
      if (!(layout instanceof HTMLElement) || !(divider instanceof HTMLElement)) return;
      applyMipsSplit(layout);
      divider.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        const startY = event.clientY;
        const currentRows = layout.style.gridTemplateRows.split(" ");
        const initialTop = Number.parseFloat(currentRows[0] || "132") || 132;

        const onPointerMove = (moveEvent) => {
          const totalHeight = Math.max(220, layout.clientHeight || layout.getBoundingClientRect().height || 0);
          const nextTop = Math.max(96, Math.min(Math.round(totalHeight * 0.48), initialTop + (moveEvent.clientY - startY)));
          state.mipsSplitRatio = nextTop / totalHeight;
          applyMipsSplit(layout);
        };

        const stop = () => {
          document.removeEventListener("pointermove", onPointerMove);
          document.removeEventListener("pointerup", stop);
        };

        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", stop, { once: true });
      });
    }

    function renderLoading(host) {
      if (!(host instanceof HTMLElement)) return;
      host.innerHTML = `<div class="mars-help-loading-wrap"><pre class="mars-help-loading">${escape(translate("Loading..."))}</pre></div>`;
    }

    function renderError(host, message) {
      if (!(host instanceof HTMLElement)) return;
      host.innerHTML = `<div class="mars-help-error-wrap"><pre class="mars-help-error">${escape(translate(message))}</pre></div>`;
    }

    function wirePageTabs(container, sectionId) {
      container.querySelectorAll("[data-help-page]").forEach((button) => {
        button.addEventListener("click", () => {
          const pageId = button.getAttribute("data-help-page") || "";
          state.pages[sectionId] = pageId;
          void renderHelpWindow();
        });
      });
    }

    function wireSectionTabs() {
      helpTopTabsNode.querySelectorAll("[data-help-section]").forEach((button) => {
        button.addEventListener("click", () => {
          const sectionId = button.getAttribute("data-help-section") || "";
          state.sectionId = getSection(sectionId).id;
          void renderHelpWindow();
        });
      });
    }

    async function renderGeneratedList(host, page) {
      renderLoading(host);
      const reference = await getHelpReference();
      const items = reference?.[page.listKey] || [];
      if (page.listKey === "directives") {
        host.innerHTML = renderReferenceList(items, "directives");
        return;
      }
      host.innerHTML = renderReferenceList(items, page.listKey);
    }

    async function renderTextPage(host, page) {
      renderLoading(host);
      const path = await resolveHelpPath(page.file);
      try {
        const text = await loadTextResource(path);
        host.innerHTML = `
          <div class="mars-help-text-wrap">
            <pre class="mars-help-text">${escape(text)}</pre>
          </div>
        `;
      } catch {
        renderError(host, "Failed to load this help page.");
        postMarsError("[error] Failed to load selected help file.");
      }
    }

    async function renderHtmlPage(host, page) {
      renderLoading(host);
      const path = await resolveHelpPath(page.file);
      host.innerHTML = `<div class="mars-help-panel-fill"><iframe class="mars-help-frame" title="${escape(translate(page.label))}"></iframe></div>`;
      const frame = host.querySelector("iframe");
      if (!(frame instanceof HTMLIFrameElement)) return;
      bindHelpFrameLinks(frame, openDocument);
      frame.addEventListener("error", () => {
        postMarsError("[error] Failed to load selected help file.");
      });
      frame.src = path;
    }

    async function renderPage(host, page, token) {
      try {
        if (page.type === "generated-list") {
          await renderGeneratedList(host, page);
        } else if (page.type === "text") {
          await renderTextPage(host, page);
        } else if (page.type === "html") {
          await renderHtmlPage(host, page);
        } else {
          renderError(host, "This help page type is not implemented.");
        }
      } catch {
        if (token !== state.renderToken) return;
        renderError(host, "Failed to load this help page.");
        postMarsError("[error] Failed to load selected help file.");
      }
    }

    async function renderHelpWindow() {
      const token = ++state.renderToken;
      const section = getSection(state.sectionId);
      const page = getPage(section, state.pages[section.id]);

      helpTitleNode.textContent = translate(MARS_HELP_TITLE);
      helpTopTabsNode.innerHTML = renderTopTabs(section.id);
      wireSectionTabs();

      if (section.kind === "mips") {
        helpBodyNode.innerHTML = `
          <div class="mars-help-mips-layout" id="mars-help-mips-layout">
            <div class="mars-help-mips-remarks-wrap">${renderMipsRemarks()}</div>
            <div class="mars-help-mips-divider" id="mars-help-mips-divider"></div>
            <div class="mars-help-panel-shell">
              <div class="mars-help-tab-row mars-help-subtab-row" id="mars-help-sub-tabs">${renderSubTabs(section, page.id)}</div>
              <div class="mars-help-panel-host" id="mars-help-panel-host"></div>
            </div>
          </div>
        `;
        bindMipsDivider(
          helpBodyNode.querySelector("#mars-help-mips-layout"),
          helpBodyNode.querySelector("#mars-help-mips-divider")
        );
      } else {
        const singlePage = section.pages.length <= 1 ? " single-page" : "";
        helpBodyNode.innerHTML = `
          <div class="mars-help-panel-shell${singlePage}">
            ${section.pages.length > 1 ? `<div class="mars-help-tab-row mars-help-subtab-row" id="mars-help-sub-tabs">${renderSubTabs(section, page.id)}</div>` : ""}
            <div class="mars-help-panel-host" id="mars-help-panel-host"></div>
          </div>
        `;
      }

      const subTabsNode = helpBodyNode.querySelector("#mars-help-sub-tabs");
      if (subTabsNode instanceof HTMLElement) wirePageTabs(subTabsNode, section.id);
      const host = helpBodyNode.querySelector("#mars-help-panel-host");
      if (!(host instanceof HTMLElement)) return;

      await renderPage(host, page, token);
      if (token !== state.renderToken) return;
    }

    async function resolveDocumentUrl(pathOrFile, options = {}) {
      const raw = String(pathOrFile || "").trim();
      if (!raw) return "";
      if (options.alreadyResolved) return raw;
      return resolveHelpPath(raw);
    }

    async function openDocument(pathOrFile, title = DOC_VIEWER_TITLE, options = {}) {
      const resolvedUrl = await resolveDocumentUrl(pathOrFile, options);
      if (!resolvedUrl) return;
      state.docTitle = String(options.viewerTitle || DOC_VIEWER_TITLE);
      state.docUrl = resolvedUrl;
      docTitleNode.textContent = translate(state.docTitle || DOC_VIEWER_TITLE);
      docUrlNode.value = resolvedUrl;
      docFrameNode.src = resolvedUrl;
      windowManager.show(docWin.id);
    }

    bindHelpFrameLinks(docFrameNode, openDocument);
    docFrameNode.addEventListener("error", () => {
      postMarsError("[error] Failed to load selected help document.");
    });

    helpCloseButton.addEventListener("click", () => windowManager.hide(helpWin.id));
    aboutCloseButton.addEventListener("click", () => windowManager.hide(aboutWin.id));
    docCloseButton.addEventListener("click", () => windowManager.hide(docWin.id));

    window.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!docWin.classList.contains("window-hidden")) {
        windowManager.hide(docWin.id);
        return;
      }
      if (!aboutWin.classList.contains("window-hidden")) {
        windowManager.hide(aboutWin.id);
        return;
      }
      if (!helpWin.classList.contains("window-hidden")) {
        windowManager.hide(helpWin.id);
      }
    });

    return {
      open(sectionId = "mips", pageId = "basic") {
        const target = normalizeOpenTarget(sectionId, pageId);
        state.sectionId = target.sectionId;
        state.pages[target.sectionId] = target.pageId;
        void renderHelpWindow();
        windowManager.show(helpWin.id);
      },
      openAbout() {
        aboutTitleNode.textContent = translate(ABOUT_MARS_TITLE);
        const aboutMain = aboutWin.querySelector(".mars-help-about-main");
        if (aboutMain) aboutMain.outerHTML = renderAboutMarkup();
        refreshAboutWindowTranslations();
        windowManager.show(aboutWin.id);
      },
      openDocument,
      close() {
        windowManager.hide(helpWin.id);
      },
      refreshTranslations() {
        refreshHelpWindowTranslations();
        refreshAboutWindowTranslations();
        refreshDocumentWindowTranslations();
        helpTitleNode.textContent = translate(MARS_HELP_TITLE);
        aboutTitleNode.textContent = translate(ABOUT_MARS_TITLE);
        docTitleNode.textContent = translate(state.docTitle || DOC_VIEWER_TITLE);
        docUrlNode.value = state.docUrl || "";
        if (!helpWin.classList.contains("window-hidden")) {
          void renderHelpWindow();
        }
        if (!aboutWin.classList.contains("window-hidden")) {
          const aboutMain = aboutWin.querySelector(".mars-help-about-main");
          if (aboutMain) aboutMain.outerHTML = renderAboutMarkup();
        }
      }
    };
  };
})();
