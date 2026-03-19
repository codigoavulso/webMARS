((rootScope) => {
  const registry = rootScope.WebMarsModules || (rootScope.WebMarsModules = {});
  if (registry.fileKinds) return;

  const C_SOURCE_EXTENSIONS = Object.freeze([".c", ".c0"]);
  const C_HEADER_EXTENSIONS = Object.freeze([".h", ".h0"]);
  const ASM_SOURCE_EXTENSIONS = Object.freeze([".s", ".asm", ".mips"]);
  const OPENABLE_TEXT_EXTENSIONS = Object.freeze([".txt"]);
  const cSourceSet = new Set(C_SOURCE_EXTENSIONS);
  const cHeaderSet = new Set(C_HEADER_EXTENSIONS);
  const asmSourceSet = new Set(ASM_SOURCE_EXTENSIONS);
  const openableTextSet = new Set(OPENABLE_TEXT_EXTENSIONS);

  function getPathExtension(fileName = "") {
    const normalized = String(fileName || "").trim().toLowerCase().replace(/\\/g, "/");
    const slashIndex = normalized.lastIndexOf("/");
    const baseName = slashIndex >= 0 ? normalized.slice(slashIndex + 1) : normalized;
    const dotIndex = baseName.lastIndexOf(".");
    if (dotIndex <= 0) return "";
    return baseName.slice(dotIndex);
  }

  function classifyFileName(fileName = "") {
    const extension = getPathExtension(fileName);
    const isCSource = cSourceSet.has(extension);
    const isCHeader = cHeaderSet.has(extension);
    const isCFamily = isCSource || isCHeader;
    const isAssemblySource = asmSourceSet.has(extension);
    const isOpenableText = openableTextSet.has(extension);
    return {
      extension,
      family: isAssemblySource ? "asm" : (isCFamily ? "c" : (isOpenableText ? "text" : "unknown")),
      isCSource,
      isCHeader,
      isCFamily,
      isAssemblySource,
      isOpenableText,
      isSupportedProjectFile: isAssemblySource || isCFamily || isOpenableText
    };
  }

  registry.fileKinds = Object.freeze({
    cSourceExtensions: C_SOURCE_EXTENSIONS,
    cHeaderExtensions: C_HEADER_EXTENSIONS,
    asmSourceExtensions: ASM_SOURCE_EXTENSIONS,
    openableTextExtensions: OPENABLE_TEXT_EXTENSIONS,
    supportedProjectExtensions: Object.freeze([
      ...ASM_SOURCE_EXTENSIONS,
      ...C_SOURCE_EXTENSIONS,
      ...C_HEADER_EXTENSIONS,
      ...OPENABLE_TEXT_EXTENSIONS
    ]),
    getPathExtension,
    classifyFileName,
    isCSourceFile(fileName = "") {
      return classifyFileName(fileName).isCSource;
    },
    isCFamilyFile(fileName = "") {
      return classifyFileName(fileName).isCFamily;
    },
    isAssemblySourceFile(fileName = "") {
      return classifyFileName(fileName).isAssemblySource;
    }
  });
})(typeof window !== "undefined" ? window : globalThis);

function tabController(root, buttonSelector, panelSelector) {
  const buttons = [...root.querySelectorAll(buttonSelector)];
  const panels = [...root.querySelectorAll(panelSelector)];
  const activate = (panelId) => {
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.panel === panelId));
    panels.forEach((panel) => panel.classList.toggle("active", panel.id === panelId));
  };
  buttons.forEach((button) => button.addEventListener("click", () => activate(button.dataset.panel)));
  return {
    activate,
    getActivePanel() {
      return panels.find((panel) => panel.classList.contains("active"))?.id || null;
    }
  };
}

function renderLayout(root) {
  root.innerHTML = `
    <div class="shell">
      <nav class="menu-bar panel">
        <span class="menu-logo" aria-hidden="true">&#128640;</span>
        <button class="menu-item" type="button" data-menu="File">File</button>
        <button class="menu-item" type="button" data-menu="Cloud">Cloud</button>
        <button class="menu-item" type="button" data-menu="Edit">Edit</button>
        <button class="menu-item" type="button" data-menu="View">View</button>
        <button class="menu-item" type="button" data-menu="Run">Run</button>
        <button class="menu-item" type="button" data-menu="Settings">Settings</button>
        <button class="menu-item" type="button" data-menu="Tools">Tools</button>
        <button class="menu-item" type="button" data-menu="Help">Help</button>
      </nav>

      <section class="toolbar panel">
        <div class="toolbar-group">
          <button class="tool-btn" id="btn-new" type="button">New</button>
          <button class="tool-btn" id="btn-open" type="button">Open</button>
          <button class="tool-btn" id="btn-save" type="button">Save</button>
          <button class="tool-btn" id="btn-undo" type="button">Undo</button>
          <button class="tool-btn" id="btn-redo" type="button">Redo</button>
        </div>

        <div class="toolbar-group">
          <button class="tool-btn" id="btn-compile-c0" type="button">Compile</button>
          <button class="tool-btn" id="btn-assemble" type="button">Assemble</button>
          <button class="tool-btn primary" id="btn-go" type="button">Go</button>
          <button class="tool-btn" id="btn-step" type="button">Step</button>
          <button class="tool-btn" id="btn-backstep" type="button">Backstep</button>
          <button class="tool-btn" id="btn-reset" type="button">Reset</button>
          <button class="tool-btn" id="btn-pause" type="button">Pause</button>
          <button class="tool-btn" id="btn-stop" type="button">Stop</button>
        </div>

        <div class="toolbar-group toolbar-speed-group">
          <span id="assembly-status" class="tag warn">not assembled</span>
          <label id="run-speed-label" class="run-speed-label" for="run-speed-slider">Run speed at max (no interaction)</label>
          <div class="run-speed-slider-wrap">
            <input id="run-speed-slider" type="range" min="0" max="40" step="1" value="40" />
            <div class="run-speed-ruler" aria-hidden="true"></div>
          </div>
          <select id="run-speed-select-mobile" class="run-speed-select-mobile" aria-label="Run speed preset">
            <option value="5">speed: 0.5 instr/sec</option>
            <option value="6">speed: 1 instr/sec</option>
            <option value="7">speed: 2 instr/sec</option>
            <option value="10">speed: 5 instr/sec</option>
            <option value="15">speed: 10 instr/sec</option>
            <option value="25">speed: 20 instr/sec</option>
            <option value="40">speed: no interaction</option>
          </select>
        </div>
      </section>

      <section id="mars-desktop" class="desktop panel">
        <section class="desktop-window" id="window-main" style="left:0px; top:0px; width:75%; height:75%;">
          <div class="window-titlebar"><span class="window-title">Main</span><div class="window-controls"><button class="win-btn" data-win-action="min" type="button">_</button><button class="win-btn" data-win-action="max" type="button">[]</button></div></div>
          <div class="window-content main-window-content">
            <div class="mode-tabs">
              <button class="mode-tab-btn" id="mode-project" type="button">Project</button>
              <button class="mode-tab-btn active" id="mode-editor" type="button">Editor</button>
              <button class="mode-tab-btn" id="mode-execute" type="button">Execute</button>
            </div>

            <section id="main-panel-project" class="main-tab-panel">
              <div class="project-tree-pane project-tree-pane-main">
                <div class="project-tree-header">
                  <div class="project-tree-actions" role="group" aria-label="Project actions">
                    <button id="project-main-new-folder" class="project-tree-action-btn" type="button" data-project-action="new-folder">New Folder</button>
                    <button id="project-main-rename" class="project-tree-action-btn" type="button" data-project-action="rename">Rename</button>
                    <button id="project-main-delete" class="project-tree-action-btn project-tree-action-btn-danger" type="button" data-project-action="delete">Delete</button>
                  </div>
                  <span id="project-tree-main-root-label" class="project-tree-root-label">/</span>
                </div>
                <div id="project-tree-main" class="project-tree-container" role="tree" aria-label="Project files"></div>
                <div class="project-tree-status" aria-live="polite">
                  <span id="project-tree-main-status-selected">files: 0</span>
                  <span id="project-tree-main-status-size">size: 0 B</span>
                  <span id="project-tree-main-status-usage">used: 0 B / 0 B</span>
                </div>
              </div>
            </section>

            <section id="main-panel-editor" class="main-tab-panel active">
              <div id="editor-host" class="editor-host">
                <section id="main-editor-workspace" class="main-editor-workspace">
                  <div class="subtabs editor-file-tabs" id="editor-file-tabs"></div>
                  <div class="editor-wrap">
                    <div class="editor-surface" id="editor-surface">
                      <div class="editor-gutter" id="editor-gutter" aria-hidden="true"><pre id="editor-gutter-lines"></pre></div>
                      <div class="editor-code-wrap">
                        <pre id="editor-highlight" class="editor-highlight" aria-hidden="true"></pre>
                        <textarea id="source-editor" spellcheck="false"></textarea>
                      </div>
                    </div>
                  </div>
                  <div class="status-bar">
                    <span id="editor-lines">lines: 0</span>
                    <span id="editor-caret">Ln 1, Col 1</span>
                    <span id="runtime-pc">PC: 0x00400000</span>
                    <span id="runtime-steps">steps: 0</span>
                  </div>
                </section>
              </div>
            </section>

            <section id="main-panel-execute" class="main-tab-panel">
              <div class="execute-wrap">
                <section class="execute-subwindow execute-text-window">
                  <div class="execute-subwindow-title">Text Segment</div>
                  <div class="execute-subwindow-body">
                    <div class="execute-top">
                      <section class="segment-panel">
                        <div class="table-wrap text-table-wrap">
                          <table>
                            <thead><tr><th>BP</th><th>Address</th><th>Code</th><th>Basic</th><th>Source</th></tr></thead>
                            <tbody id="text-segment-body"></tbody>
                          </table>
                        </div>
                      </section>
                      <section class="labels-panel">
                        <div class="panel-title">Labels</div>
                        <ul id="labels-list" class="labels-list"></ul>
                      </section>
                    </div>
                  </div>
                </section>


                <div class="execute-splitter" id="execute-splitter" title="Drag to resize Text/Data" aria-label="Resize text and data segments"></div>
                <section class="execute-subwindow execute-data-window">
                  <div class="execute-subwindow-title">Data Segment</div>
                  <div class="execute-subwindow-body data-subwindow-body">
                    <div class="table-wrap data-table-wrap">
                      <table class="data-segment-table">
                        <thead>
                          <tr>
                            <th>Address</th>
                            <th id="data-col-0">Value (+0)</th>
                            <th id="data-col-4">Value (+4)</th>
                            <th id="data-col-8">Value (+8)</th>
                            <th id="data-col-c">Value (+c)</th>
                            <th id="data-col-10">Value (+10)</th>
                            <th id="data-col-14">Value (+14)</th>
                            <th id="data-col-18">Value (+18)</th>
                            <th id="data-col-1c">Value (+1c)</th>
                          </tr>
                        </thead>
                        <tbody id="data-segment-body"></tbody>
                      </table>
                    </div>
                    <div class="data-nav">
                      <button class="tool-btn" id="data-nav-prev" type="button">&lt;</button>
                      <button class="tool-btn" id="data-nav-next" type="button">&gt;</button>
                      <select id="data-base-select">
                        <option value="data">0x10010000 (.data)</option>
                        <option value="extern">0x10000000 (.extern)</option>
                        <option value="heap">0x10040000 (heap)</option>
                        <option value="gp">current $gp</option>
                        <option value="sp">current $sp</option>
                        <option value="text">0x00400000 (.text)</option>
                        <option value="kdata">0x90000000 (.kdata)</option>
                        <option value="mmio">0xffff0000 (MMIO)</option>
                      </select>
                      <label id="data-hex-addresses-label"><input id="data-hex-addresses" type="checkbox" checked> Hexadecimal Addresses</label>
                      <label id="data-hex-values-label"><input id="data-hex-values" type="checkbox" checked> Hexadecimal Values</label>
                      <label><input id="data-ascii" type="checkbox"> ASCII</label>
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </div>
        </section>

        <section class="desktop-window" id="window-messages" style="left:0px; top:75%; width:75%; height:25%;">
          <div class="window-titlebar"><span class="window-title">Messages / Run I/O</span><div class="window-controls"><button class="win-btn" data-win-action="min" type="button">_</button><button class="win-btn" data-win-action="max" type="button">[]</button></div></div>
          <div class="window-content messages-pane">
            <div class="subtabs">
              <button class="subtab-btn active" type="button" data-panel="panel-mars-messages">Mars Messages</button>
              <button class="subtab-btn" type="button" data-panel="panel-run-io">Run I/O</button>
            </div>
            <div id="panel-mars-messages" class="subtab-panel active messages-subtab-panel">
              <div class="messages-tab-shell">
                <div class="messages-tab-actions">
                  <button class="tool-btn messages-clear-btn" id="messages-clear-mars" type="button" title="Clear the Mars Messages area">Clear</button>
                </div>
                <textarea id="mars-messages" class="message-body mars" readonly spellcheck="false" wrap="off"></textarea>
              </div>
            </div>
            <div id="panel-run-io" class="subtab-panel messages-subtab-panel">
              <div class="messages-tab-shell">
                <div class="messages-tab-actions">
                  <button class="tool-btn messages-clear-btn" id="messages-clear-run" type="button" title="Clear the Run I/O area">Clear</button>
                </div>
                <div class="run-io-body">
                  <textarea id="run-messages" class="message-body run" readonly spellcheck="false" wrap="off"></textarea>
                  <div class="run-io-input-bar">
                    <input id="run-input-field" class="run-io-input" type="text" autocomplete="off" placeholder="Type input for syscall and press Enter">
                    <button id="run-input-send" class="tool-btn" type="button">Send</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="desktop-window" id="window-registers" style="left:75%; top:0px; width:25%; height:100%;">
          <div class="window-titlebar"><span class="window-title">Registers</span><div class="window-controls"><button class="win-btn" data-win-action="min" type="button">_</button><button class="win-btn" data-win-action="max" type="button">[]</button></div></div>
          <div class="window-content registers-pane">
            <div class="subtabs">
              <button class="subtab-btn active" type="button" data-panel="panel-registers">Registers</button>
              <button class="subtab-btn" type="button" data-panel="panel-coprocessor1">Coproc 1</button>
              <button class="subtab-btn" type="button" data-panel="panel-coprocessor0">Coproc 0</button>
            </div>
            <div id="panel-registers" class="subtab-panel active">
              <div class="register-body">
                <table>
                  <thead><tr><th>Name</th><th>Number</th><th>Hex</th><th>Dec</th></tr></thead>
                  <tbody id="registers-body"></tbody>
                </table>
              </div>
            </div>
            <div id="panel-coprocessor1" class="subtab-panel"><div class="register-body"><table><thead><tr><th>Name</th><th>Float</th><th>Double</th></tr></thead><tbody id="cop1-body"></tbody></table><div class="cop-flags" id="cop1-flags"></div></div></div>
            <div id="panel-coprocessor0" class="subtab-panel"><div class="register-body"><table><thead><tr><th>Name</th><th>Number</th><th>Value</th></tr></thead><tbody id="cop0-body"></tbody></table></div></div>
          </div>
        </section>

        <section class="desktop-window tool-window window-hidden" id="window-project" style="left:90px; top:80px; width:320px; height:420px;">
          <div class="window-titlebar">
            <span class="window-title">Project</span>
            <div class="window-controls">
              <button class="win-btn" data-win-action="min" type="button">_</button>
              <button class="win-btn" data-win-action="max" type="button">[]</button>
              <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
            </div>
          </div>
          <div class="window-content project-tree-pane">
            <div class="project-tree-header">
              <div class="project-tree-actions" role="group" aria-label="Project actions">
                <button id="project-tool-new-folder" class="project-tree-action-btn" type="button" data-project-action="new-folder">New Folder</button>
                <button id="project-tool-rename" class="project-tree-action-btn" type="button" data-project-action="rename">Rename</button>
                <button id="project-tool-delete" class="project-tree-action-btn project-tree-action-btn-danger" type="button" data-project-action="delete">Delete</button>
              </div>
              <span id="project-tree-root-label" class="project-tree-root-label">project.p</span>
            </div>
            <div id="project-tree" class="project-tree-container" role="tree" aria-label="Project files"></div>
            <div class="project-tree-status" aria-live="polite">
              <span id="project-tree-tool-status-selected">files: 0</span>
              <span id="project-tree-tool-status-size">size: 0 B</span>
              <span id="project-tree-tool-status-usage">used: 0 B / 0 B</span>
            </div>
          </div>
        </section>

        <section class="desktop-window tool-window window-hidden" id="window-mini-c" style="left:170px; top:95px; width:760px; height:520px;">
          <div class="window-titlebar">
            <span class="window-title">Mini-C Compiler</span>
            <div class="window-controls">
              <button class="win-btn" data-win-action="min" type="button">_</button>
              <button class="win-btn" data-win-action="max" type="button">[]</button>
              <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
            </div>
          </div>
          <div class="window-content mini-c-pane">
            <div class="subtabs">
              <button class="subtab-btn active" type="button" data-panel="panel-mini-c-log">Compiler Log</button>
              <button class="subtab-btn" type="button" data-panel="panel-mini-c-asm">Generated MIPS</button>
            </div>
            <div id="panel-mini-c-log" class="subtab-panel active mini-c-subtab-panel">
              <textarea id="mini-c-log" class="mini-c-textarea" readonly spellcheck="false" wrap="off"></textarea>
            </div>
            <div id="panel-mini-c-asm" class="subtab-panel mini-c-subtab-panel">
              <textarea id="mini-c-asm" class="mini-c-textarea" readonly spellcheck="false" wrap="off"></textarea>
            </div>
            <div class="mini-c-actions">
              <label class="mini-c-option"><input id="mini-c-dont-show-again" type="checkbox"> Don't show again</label>
              <button class="tool-btn" id="mini-c-open-asm" type="button">Open ASM as new file</button>
              <button class="tool-btn" id="mini-c-copy-asm" type="button">Copy ASM</button>
              <button class="tool-btn" id="mini-c-clear" type="button">Clear</button>
            </div>
          </div>
        </section>
      </section>
    </div>`;
  const refreshTranslations = translateStaticTree(root);

  const refs = {
    root,
    refreshTranslations,
    tabs: {
      messages: tabController(root, "#window-messages .subtab-btn", "#window-messages .subtab-panel"),
      registers: tabController(root, "#window-registers .subtab-btn", "#window-registers .subtab-panel"),
      miniC: tabController(root, "#window-mini-c .subtab-btn", "#window-mini-c .subtab-panel")
    },
    mode: {
      project: root.querySelector("#mode-project"),
      editor: root.querySelector("#mode-editor"),
      execute: root.querySelector("#mode-execute"),
      panelProject: root.querySelector("#main-panel-project"),
      panelEditor: root.querySelector("#main-panel-editor"),
      panelExecute: root.querySelector("#main-panel-execute"),
      editorWorkspace: root.querySelector("#main-editor-workspace"),
      hostEditor: root.querySelector("#editor-host")
    },
    windows: {
      desktop: root.querySelector("#mars-desktop"),
      main: root.querySelector("#window-main"),
      editor: root.querySelector("#window-main"),
      text: root.querySelector("#window-main"),
      data: root.querySelector("#window-main"),
      messages: root.querySelector("#window-messages"),
      registers: root.querySelector("#window-registers"),
      project: root.querySelector("#window-project"),
      miniC: root.querySelector("#window-mini-c")
    },
    buttons: {
      newFile: root.querySelector("#btn-new"),
      open: root.querySelector("#btn-open"),
      save: root.querySelector("#btn-save"),
      undo: root.querySelector("#btn-undo"),
      redo: root.querySelector("#btn-redo"),
      assemble: root.querySelector("#btn-assemble"),
      compileC0: root.querySelector("#btn-compile-c0"),
      go: root.querySelector("#btn-go"),
      step: root.querySelector("#btn-step"),
      backstep: root.querySelector("#btn-backstep"),
      reset: root.querySelector("#btn-reset"),
      pause: root.querySelector("#btn-pause"),
      stop: root.querySelector("#btn-stop")
    },
    editor: root.querySelector("#source-editor"),
    editorSurface: root.querySelector("#editor-surface"),
    editorHighlight: root.querySelector("#editor-highlight"),
    editorGutter: root.querySelector("#editor-gutter"),
    editorGutterLines: root.querySelector("#editor-gutter-lines"),
    editorTabs: root.querySelector("#editor-file-tabs"),
    status: {
      assemblyTag: root.querySelector("#assembly-status"),
      lines: root.querySelector("#editor-lines"),
      caret: root.querySelector("#editor-caret"),
      runtimePc: root.querySelector("#runtime-pc"),
      runtimeSteps: root.querySelector("#runtime-steps")
    },
    controls: {
      runSpeedLabel: root.querySelector("#run-speed-label"),
      runSpeedSlider: root.querySelector("#run-speed-slider"),
      runSpeedSelectMobile: root.querySelector("#run-speed-select-mobile")
    },
    execute: {
      textBody: root.querySelector("#text-segment-body"),
      labelsList: root.querySelector("#labels-list"),
      dataBody: root.querySelector("#data-segment-body"),
      splitter: root.querySelector("#execute-splitter"),
      dataNavPrev: root.querySelector("#data-nav-prev"),
      dataNavNext: root.querySelector("#data-nav-next"),
      dataBaseSelect: root.querySelector("#data-base-select"),
      dataHeaders: [
        root.querySelector("#data-col-0"),
        root.querySelector("#data-col-4"),
        root.querySelector("#data-col-8"),
        root.querySelector("#data-col-c"),
        root.querySelector("#data-col-10"),
        root.querySelector("#data-col-14"),
        root.querySelector("#data-col-18"),
        root.querySelector("#data-col-1c")
      ],
      dataHexAddressesLabel: root.querySelector("#data-hex-addresses-label"),
      dataHexAddresses: root.querySelector("#data-hex-addresses"),
      dataHexValuesLabel: root.querySelector("#data-hex-values-label"),
      dataHexValues: root.querySelector("#data-hex-values"),
      dataAscii: root.querySelector("#data-ascii")
    },
    messages: {
      mars: root.querySelector("#mars-messages"),
      run: root.querySelector("#run-messages"),
      runInput: root.querySelector("#run-input-field"),
      runSend: root.querySelector("#run-input-send"),
      clearMars: root.querySelector("#messages-clear-mars"),
      clearRun: root.querySelector("#messages-clear-run")
    },
    miniC: {
      log: root.querySelector("#mini-c-log"),
      asm: root.querySelector("#mini-c-asm"),
      dontShowAgain: root.querySelector("#mini-c-dont-show-again"),
      openAsm: root.querySelector("#mini-c-open-asm"),
      copyAsm: root.querySelector("#mini-c-copy-asm"),
      clear: root.querySelector("#mini-c-clear"),
      close: root.querySelector("#window-mini-c [data-win-action=\"close\"]")
    },
    project: {
      mainRootLabel: root.querySelector("#project-tree-main-root-label"),
      mainTree: root.querySelector("#project-tree-main"),
      mainNewFolder: root.querySelector("#project-main-new-folder"),
      mainRename: root.querySelector("#project-main-rename"),
      mainDelete: root.querySelector("#project-main-delete"),
      mainStatusSelected: root.querySelector("#project-tree-main-status-selected"),
      mainStatusSize: root.querySelector("#project-tree-main-status-size"),
      mainStatusUsage: root.querySelector("#project-tree-main-status-usage"),
      toolRootLabel: root.querySelector("#project-tree-root-label"),
      toolTree: root.querySelector("#project-tree"),
      toolNewFolder: root.querySelector("#project-tool-new-folder"),
      toolRename: root.querySelector("#project-tool-rename"),
      toolDelete: root.querySelector("#project-tool-delete"),
      toolStatusSelected: root.querySelector("#project-tree-tool-status-selected"),
      toolStatusSize: root.querySelector("#project-tree-tool-status-size"),
      toolStatusUsage: root.querySelector("#project-tree-tool-status-usage")
    },
    registers: {
      body: root.querySelector("#registers-body"),
      cop1Body: root.querySelector("#cop1-body"),
      cop0Body: root.querySelector("#cop0-body"),
      cop1Flags: root.querySelector("#cop1-flags")
    }
  };

  return refs;
}

function getLayoutConfig() {
  const root = typeof window !== "undefined" ? window : globalThis;
  const config = (root && typeof root.WebMarsLayoutConfig === "object")
    ? root.WebMarsLayoutConfig
    : {};
  const stackedBreakpointPx = Number(config.STACKED_BREAKPOINT_PX) > 0
    ? Number(config.STACKED_BREAKPOINT_PX)
    : 800;
  const compactBreakpointPx = Number(config.COMPACT_BREAKPOINT_PX) > 0
    ? Number(config.COMPACT_BREAKPOINT_PX)
    : 500;
  return {
    stackedBreakpointPx,
    stackedMaxWidthPx: Math.max(0, stackedBreakpointPx - 1),
    compactBreakpointPx
  };
}

function createWindowManager(refs) {
  const desktop = refs.windows.desktop;
  const windows = new Map();
  const layoutConfig = getLayoutConfig();
  const NATIVE_Z_BASE = 80;
  const TOOL_Z_BASE = 920;
  const NATIVE_Z_MAX = TOOL_Z_BASE - 12;
  const TOOL_Z_MAX = 1150;
  const SNAP_DISTANCE_PX = 20;
  const LINKED_EDGE_TOLERANCE_PX = 6;
  const MOVE_SNAP_MIN_SPAN_PX = 24;
  const EDGE_TOUCH_TOLERANCE_PX = 1.5;
  const SHARED_SPLITTER_THICKNESS_PX = 6;
  const SHARED_SPLITTER_MIN_SPAN_PX = 48;
  const STACKED_MINIMIZED_HEIGHT_PX = 24;
  const TOOL_DESKTOP_MAX_WIDTH_RATIO = 0.66;
  const TOOL_DESKTOP_ABSOLUTE_MAX_WIDTH_PX = 860;
  const HELP_DESKTOP_MAX_WIDTH_RATIO = 0.82;
  const HELP_DESKTOP_ABSOLUTE_MAX_WIDTH_PX = 1040;
  const DESKTOP_LAYOUT_HISTORY_LIMIT = 4;
  const DESKTOP_LAYOUT_STORAGE_KEY = "mars45-window-layout-history-v1";
  const SAVED_LAYOUT_STORAGE_KEY = "mars45-window-layout-saved-v1";
  const STACK_BREAKPOINT_PX = layoutConfig.stackedBreakpointPx;
  const COMPACT_BREAKPOINT_PX = layoutConfig.compactBreakpointPx;
  const STACKED_WINDOW_ORDER = ["window-main", "window-messages", "window-registers"];
  const DESKTOP_NATIVE_ORDER = ["window-main", "window-messages", "window-registers"];
  const DESKTOP_LINKED_RESIZE_IDS = new Set(DESKTOP_NATIVE_ORDER);
  const STACKED_DEFAULT_HEIGHTS = {
    "window-main": 440,
    "window-messages": 230,
    "window-registers": 340
  };
  const DEFAULT_DESKTOP_NATIVE_BOUNDS = {
    "window-main": { left: 0, top: 0, width: 0.75, height: 0.75 },
    "window-messages": { left: 0, top: 0.75, width: 0.75, height: 0.25 },
    "window-registers": { left: 0.75, top: 0, width: 0.25, height: 1 }
  };
  let nativeZCounter = NATIVE_Z_BASE;
  let toolZCounter = TOOL_Z_BASE;
  let dragging = null;
  let resizing = null;
  let sharedDragging = null;
  let sharedSplittersFrame = null;
  let desktopLayoutSaveTimer = null;
  let layoutMode = window.innerWidth < STACK_BREAKPOINT_PX ? "stacked" : "desktop";
  let desktopLayoutHistory = [];
  const pendingSessionWindowState = new Map();
  const pendingSavedLayoutState = new Map();
  const sharedSplitters = new Set();

  const getKind = (win) => (win.classList.contains("tool-window") ? "tool" : "native");
  const WINDOW_ALIASES = {
    "window-editor": "window-main",
    "window-text": "window-main",
    "window-data": "window-main"
  };
  const resolveWindowId = (windowId) => WINDOW_ALIASES[windowId] ?? windowId;
  const clamp01 = (value) => Math.max(0, Math.min(1, value));
  const px = (value) => `${Number.isFinite(value) ? value.toFixed(3) : "0"}px`;
  const nearlyEqual = (a, b, tolerance = EDGE_TOUCH_TOLERANCE_PX) => Math.abs(a - b) <= tolerance;
  const nearlyLinkedEdge = (a, b) => nearlyEqual(a, b, LINKED_EDGE_TOLERANCE_PX);
  const isHiddenEntry = (entry) => Boolean(!entry || entry.element.classList.contains("window-hidden"));
  const isVisibleEntry = (entry) => Boolean(entry && !isHiddenEntry(entry) && !entry.minimized);
  const getDesktopRect = () => desktop.getBoundingClientRect();
  const overlapSize = (aStart, aEnd, bStart, bEnd) => Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
  const overlapsVertically = (a, b) => overlapSize(a.top, a.top + a.height, b.top, b.top + b.height) > 0;
  const overlapsHorizontally = (a, b) => overlapSize(a.left, a.left + a.width, b.left, b.left + b.width) > 0;
  const isStackedMode = () => layoutMode !== "desktop";
  const isMainStackedMaximized = () => {
    if (!isStackedMode()) return false;
    const mainEntry = windows.get("window-main");
    if (!mainEntry || isHiddenEntry(mainEntry) || mainEntry.minimized) return false;
    return Boolean(mainEntry.stackedMaximized);
  };

  function parseDesktopLayoutHistory(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item) => item && typeof item === "object" && item.windows && typeof item.windows === "object")
      .slice(0, DESKTOP_LAYOUT_HISTORY_LIMIT)
      .map((item) => ({
        bucket: String(item.bucket || ""),
        width: Number(item.width) || 0,
        height: Number(item.height) || 0,
        timestamp: Number(item.timestamp) || Date.now(),
        windows: item.windows
      }));
  }

  function loadDesktopLayoutHistory() {
    try {
      const raw = localStorage.getItem(DESKTOP_LAYOUT_STORAGE_KEY);
      if (!raw) return [];
      return parseDesktopLayoutHistory(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  function persistDesktopLayoutHistory() {
    try {
      localStorage.setItem(DESKTOP_LAYOUT_STORAGE_KEY, JSON.stringify(desktopLayoutHistory));
    } catch {
      // ignore storage errors
    }
  }

  function toResolutionBucket(width, height) {
    const bucketWidth = Math.max(320, Math.round(width / 120) * 120);
    const bucketHeight = Math.max(240, Math.round(height / 80) * 80);
    return `${bucketWidth}x${bucketHeight}`;
  }

  function findBestDesktopLayoutSnapshot(width, height) {
    if (!desktopLayoutHistory.length) return null;
    const targetBucket = toResolutionBucket(width, height);
    const exact = desktopLayoutHistory.find((snapshot) => snapshot.bucket === targetBucket);
    if (exact) return exact;
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;
    desktopLayoutHistory.forEach((snapshot) => {
      const score = Math.abs((snapshot.width || 0) - width) + (Math.abs((snapshot.height || 0) - height) * 1.12);
      if (score < bestScore) {
        bestScore = score;
        best = snapshot;
      }
    });
    return best;
  }

  desktopLayoutHistory = loadDesktopLayoutHistory();

  function applyDefaultNativeDesktopLayout() {
    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return;
    DESKTOP_NATIVE_ORDER.forEach((id) => {
      const entry = windows.get(id);
      if (!entry) return;
      const normalized = DEFAULT_DESKTOP_NATIVE_BOUNDS[id];
      if (!normalized) return;
      entry.maximized = false;
      entry.minimized = false;
      entry.stackedMaximized = false;
      entry.element.classList.remove("window-maximized");
      entry.element.classList.remove("window-minimized");
      entry.element.classList.remove("window-hidden");
      entry.element.style.left = px(normalized.left * desktopRect.width);
      entry.element.style.top = px(normalized.top * desktopRect.height);
      entry.element.style.width = px(normalized.width * desktopRect.width);
      entry.element.style.height = px(normalized.height * desktopRect.height);
      clampWindow(entry, true, false);
      updateNormalizedBounds(entry);
    });
  }

  function isDesktopSnapshotUsable(snapshot, desktopRect) {
    if (!snapshot || !snapshot.windows || typeof snapshot.windows !== "object") return false;
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return false;

    const nativeMetrics = {};
    for (const id of DESKTOP_NATIVE_ORDER) {
      const saved = snapshot.windows[id];
      if (!saved || typeof saved !== "object") return false;
      if (saved.hidden || saved.minimized) return false;
      const left = Number(saved.left);
      const top = Number(saved.top);
      const width = Number(saved.width);
      const height = Number(saved.height);
      if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height)) return false;
      if (width < 120 || height < 80) return false;
      if (left < -24 || top < -24) return false;
      if (left > desktopRect.width + 24 || top > desktopRect.height + 24) return false;
      nativeMetrics[id] = { left, top, width, height };
    }

    const tolerance = Math.max(6, Math.round(Math.min(desktopRect.width, desktopRect.height) * 0.012));
    const main = nativeMetrics["window-main"];
    const messages = nativeMetrics["window-messages"];
    const registers = nativeMetrics["window-registers"];
    if (!main || !messages || !registers) return false;

    const mainRight = main.left + main.width;
    const mainBottom = main.top + main.height;
    const messagesRight = messages.left + messages.width;
    const messagesBottom = messages.top + messages.height;
    const registersRight = registers.left + registers.width;
    const registersBottom = registers.top + registers.height;

    // Require a docked 3-pane topology:
    // [main | registers]
    // [messages | registers]
    if (!nearlyEqual(main.left, 0, tolerance)) return false;
    if (!nearlyEqual(messages.left, 0, tolerance)) return false;
    if (!nearlyEqual(main.top, 0, tolerance)) return false;
    if (!nearlyEqual(registers.top, 0, tolerance)) return false;
    if (!nearlyEqual(mainRight, registers.left, tolerance)) return false;
    if (!nearlyEqual(messagesRight, registers.left, tolerance)) return false;
    if (!nearlyEqual(mainBottom, messages.top, tolerance)) return false;
    if (!nearlyEqual(messagesBottom, desktopRect.height, tolerance)) return false;
    if (!nearlyEqual(registersRight, desktopRect.width, tolerance)) return false;
    if (!nearlyEqual(registersBottom, desktopRect.height, tolerance)) return false;

    const leftPaneWidth = Math.max(main.width, messages.width);
    if (leftPaneWidth < 160 || registers.width < 160) return false;
    const topPaneHeight = main.height;
    const bottomPaneHeight = messages.height;
    if (topPaneHeight < 120 || bottomPaneHeight < 100) return false;
    return true;
  }

  function getViewportMode() {
    if (window.innerWidth < COMPACT_BREAKPOINT_PX) return "compact";
    if (window.innerWidth < STACK_BREAKPOINT_PX) return "stacked";
    return "desktop";
  }

  function isStackedToolEntry(entry) {
    if (!entry || entry.kind !== "tool" || isHiddenEntry(entry)) return false;
    const el = entry.element;
    if (!(el instanceof HTMLElement)) return false;
    if (!el.classList.contains("tool-window")) return false;
    if (el.classList.contains("dialog-window")) return false;
    return true;
  }

  function isStackedFlowEntry(entry) {
    if (!entry || isHiddenEntry(entry)) return false;
    if (entry.kind === "native") return true;
    return isStackedToolEntry(entry);
  }

  function getStackedEntries() {
    const nativeById = new Map(
      [...windows.values()]
        .filter((entry) => entry.kind === "native" && !isHiddenEntry(entry))
        .map((entry) => [entry.id, entry])
    );
    const stackedTools = [...windows.values()]
      .filter((entry) => isStackedToolEntry(entry))
      .sort((a, b) => Number.parseInt(a.element.style.zIndex || "0", 10) - Number.parseInt(b.element.style.zIndex || "0", 10));

    const entries = [];
    if (nativeById.has("window-main")) entries.push(nativeById.get("window-main"));
    entries.push(...stackedTools);
    if (nativeById.has("window-messages")) entries.push(nativeById.get("window-messages"));
    if (nativeById.has("window-registers")) entries.push(nativeById.get("window-registers"));

    nativeById.forEach((entry) => {
      if (!entries.includes(entry)) entries.push(entry);
    });
    return entries;
  }

  function getMinSize(entry) {
    const computed = window.getComputedStyle(entry.element);
    return {
      minWidth: parseFloat(computed.minWidth) || 180,
      minHeight: parseFloat(computed.minHeight) || 120
    };
  }

  function getDesktopToolWidthLimit(entry, desktopRect, minWidth) {
    const isHelpFamily = entry.element.classList.contains("help-window") || entry.element.classList.contains("about-window");
    const ratio = isHelpFamily ? HELP_DESKTOP_MAX_WIDTH_RATIO : TOOL_DESKTOP_MAX_WIDTH_RATIO;
    const absCap = isHelpFamily ? HELP_DESKTOP_ABSOLUTE_MAX_WIDTH_PX : TOOL_DESKTOP_ABSOLUTE_MAX_WIDTH_PX;
    const ratioCap = Math.round(desktopRect.width * ratio);
    const hardCap = Math.min(absCap, ratioCap);
    return Math.max(minWidth, Math.min(Math.max(minWidth, desktopRect.width - 12), hardCap));
  }

  function getTitlebarHeight(entry) {
    const titlebar = entry.element.querySelector(".window-titlebar");
    if (titlebar instanceof HTMLElement) return Math.max(20, titlebar.getBoundingClientRect().height || 20);
    return 20;
  }

  function getStackedCollapsedHeight(entry) {
    return Math.max(STACKED_MINIMIZED_HEIGHT_PX, Math.ceil(getTitlebarHeight(entry) + 2));
  }

  function getRegistersStackedContentMinHeight(entry) {
    if (!entry || entry.id !== "window-registers") return 0;
    const tabs = entry.element.querySelector(".subtabs");
    const activePanel = entry.element.querySelector(".subtab-panel.active") || entry.element.querySelector(".subtab-panel");
    const table = activePanel?.querySelector("table") || entry.element.querySelector(".register-body table");
    const header = table?.querySelector("thead");
    const firstRow = table?.querySelector("tbody tr");
    const bodyRows = table ? table.querySelectorAll("tbody tr").length : 0;
    const tabsHeight = tabs instanceof HTMLElement ? Math.max(22, tabs.getBoundingClientRect().height || 0) : 22;
    const headerHeight = header instanceof HTMLElement ? Math.max(18, header.getBoundingClientRect().height || 0) : 20;
    const rowHeight = firstRow instanceof HTMLElement ? Math.max(16, firstRow.getBoundingClientRect().height || 0) : 20;
    // Keep Registers tall enough on mobile to show the full table with no inner scroll.
    const rowCount = Math.max(36, bodyRows);
    const bodyChrome = 10;
    const contentPadding = 5;
    return Math.ceil(tabsHeight + headerHeight + (rowHeight * rowCount) + bodyChrome + contentPadding);
  }

  function getStackedMinHeight(entry) {
    if (entry.minimized) return getStackedCollapsedHeight(entry);
    const baseMinHeight = getMinSize(entry).minHeight;
    if (entry.id === "window-registers") {
      const titlebarHeight = getTitlebarHeight(entry);
      const registersContentMin = getRegistersStackedContentMinHeight(entry);
      return Math.max(baseMinHeight, titlebarHeight + registersContentMin);
    }
    return baseMinHeight;
  }

  function ensureStackedHeight(entry) {
    const minHeight = getStackedMinHeight(entry);
    const isTool = entry.kind === "tool";
    const viewportHeight = Math.max(320, window.innerHeight || 0);
    const registersDefaultHeight = entry.id === "window-registers"
      ? Math.max(minHeight, getStackedMinHeight(entry) + 5)
      : 0;
    const nativeCapById = {
      "window-main": Math.round(viewportHeight * 0.56),
      "window-messages": Math.round(viewportHeight * 0.32),
      "window-registers": Math.round(viewportHeight * 0.42)
    };
    const nativeCap = Math.max(minHeight, nativeCapById[entry.id] ?? Math.round(viewportHeight * 0.5));
    const compactCap = Math.max(minHeight, Math.round(window.innerHeight * 0.58));
    const expandedCap = Math.max(minHeight, Math.round(window.innerHeight * 0.78));
    if (entry.minimized) {
      entry.stackedHeight = getStackedCollapsedHeight(entry);
      return entry.stackedHeight;
    }
    if (entry.stackedExpandedHeight > 0) {
      const bounded = Math.max(minHeight, entry.stackedExpandedHeight);
      if (isTool && !entry.stackedMaximized) {
        entry.stackedHeight = Math.min(compactCap, bounded);
        entry.stackedExpandedHeight = entry.stackedHeight;
        return entry.stackedHeight;
      }
      if (isTool && entry.stackedMaximized) {
        entry.stackedHeight = Math.min(expandedCap, bounded);
        entry.stackedExpandedHeight = entry.stackedHeight;
        return entry.stackedHeight;
      }
      if (entry.id === "window-registers" && !entry.stackedUserSized) {
        entry.stackedHeight = registersDefaultHeight;
        entry.stackedExpandedHeight = entry.stackedHeight;
        return entry.stackedHeight;
      }
      entry.stackedHeight = Math.min(nativeCap, bounded);
      return entry.stackedHeight;
    }
    if (entry.stackedHeight > 0) {
      const bounded = Math.max(minHeight, entry.stackedHeight);
      if (isTool && !entry.stackedMaximized) {
        entry.stackedHeight = Math.min(compactCap, bounded);
        return entry.stackedHeight;
      }
      if (isTool && entry.stackedMaximized) {
        entry.stackedHeight = Math.min(expandedCap, bounded);
        return entry.stackedHeight;
      }
      if (entry.id === "window-registers" && !entry.stackedUserSized) {
        entry.stackedHeight = registersDefaultHeight;
        return entry.stackedHeight;
      }
      entry.stackedHeight = Math.min(nativeCap, bounded);
      return entry.stackedHeight;
    }
    const currentHeight = readWindowMetrics(entry).height;
    const fallback = STACKED_DEFAULT_HEIGHTS[entry.id] ?? (isTool ? 320 : 260);
    entry.stackedHeight = Math.max(minHeight, currentHeight > 0 ? currentHeight : fallback);
    if (isTool && !entry.stackedMaximized) {
      entry.stackedHeight = Math.min(compactCap, entry.stackedHeight);
      entry.stackedExpandedHeight = entry.stackedHeight;
      return entry.stackedHeight;
    }
    if (entry.id === "window-registers") {
      entry.stackedHeight = registersDefaultHeight;
      entry.stackedExpandedHeight = entry.stackedHeight;
      return entry.stackedHeight;
    }
    entry.stackedHeight = Math.min(nativeCap, entry.stackedHeight);
    return entry.stackedHeight;
  }

  function syncStackedHeightsFromCurrentLayout() {
    getStackedEntries().forEach((entry) => {
      entry.stackedUserSized = false;
      if (entry.minimized) {
        entry.stackedHeight = getStackedCollapsedHeight(entry);
        return;
      }
      const minHeight = getStackedMinHeight(entry);
      const nextHeight = entry.id === "window-registers"
        ? Math.max(minHeight, getStackedMinHeight(entry) + 5)
        : Math.max(minHeight, readWindowMetrics(entry).height);
      entry.stackedHeight = nextHeight;
      entry.stackedExpandedHeight = nextHeight;
    });
  }

  function readWindowMetrics(entry) {
    const win = entry.element;
    let left = parseFloat(win.style.left || "0");
    let top = parseFloat(win.style.top || "0");
    let width = parseFloat(win.style.width || "0");
    let height = parseFloat(win.style.height || "0");
    if (!(width > 0) || !(height > 0)) {
      const desktopRect = desktop.getBoundingClientRect();
      const rect = win.getBoundingClientRect();
      left = rect.left - desktopRect.left;
      top = rect.top - desktopRect.top;
      width = rect.width;
      height = rect.height;
    }
    return { left, top, width, height };
  }

  function captureDesktopLayoutSnapshot() {
    if (isStackedMode()) return;
    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return;
    const bucket = toResolutionBucket(desktopRect.width, desktopRect.height);
    const snapshot = {
      bucket,
      width: Math.round(desktopRect.width),
      height: Math.round(desktopRect.height),
      timestamp: Date.now(),
      windows: {}
    };

    windows.forEach((entry) => {
      const metrics = readWindowMetrics(entry);
      snapshot.windows[entry.id] = {
        left: metrics.left,
        top: metrics.top,
        width: metrics.width,
        height: metrics.height,
        zIndex: Number.parseInt(entry.element.style.zIndex || "0", 10) || 0,
        minimized: Boolean(entry.minimized),
        maximized: Boolean(entry.maximized),
        hidden: Boolean(entry.element.classList.contains("window-hidden"))
      };
    });

    desktopLayoutHistory = [snapshot, ...desktopLayoutHistory.filter((item) => item.bucket !== bucket)]
      .slice(0, DESKTOP_LAYOUT_HISTORY_LIMIT);
    persistDesktopLayoutHistory();
  }

  function scheduleDesktopLayoutSave(delayMs = 180) {
    if (isStackedMode()) return;
    if (desktopLayoutSaveTimer !== null) window.clearTimeout(desktopLayoutSaveTimer);
    desktopLayoutSaveTimer = window.setTimeout(() => {
      desktopLayoutSaveTimer = null;
      captureDesktopLayoutSnapshot();
    }, delayMs);
  }

  function applyDesktopLayoutSnapshot(snapshot) {
    if (!snapshot || !snapshot.windows || typeof snapshot.windows !== "object") return false;
    windows.forEach((entry) => {
      const saved = snapshot.windows[entry.id];
      if (!saved || typeof saved !== "object") return;

      entry.maximized = false;
      if (entry.kind === "native" && DESKTOP_NATIVE_ORDER.includes(entry.id)) {
        entry.minimized = false;
        entry.element.classList.remove("window-hidden");
      } else {
        if (saved.hidden) entry.element.classList.add("window-hidden");
        else entry.element.classList.remove("window-hidden");
        entry.minimized = Boolean(saved.minimized);
      }
      entry.element.classList.remove("window-maximized");
      entry.element.classList.toggle("window-minimized", entry.minimized);

      entry.element.style.left = px(Number(saved.left) || 0);
      entry.element.style.top = px(Number(saved.top) || 0);
      entry.element.style.width = px(Number(saved.width) || readWindowMetrics(entry).width);
      entry.element.style.height = px(Number(saved.height) || readWindowMetrics(entry).height);
      entry.element.style.zIndex = `${Number(saved.zIndex) || nextZ(entry.kind)}`;

      clampWindow(entry, true, false);
      updateNormalizedBounds(entry);
    });
    rebalance("native");
    rebalance("tool");
    return true;
  }

  function restoreDesktopLayoutForViewport() {
    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return false;
    const snapshot = findBestDesktopLayoutSnapshot(desktopRect.width, desktopRect.height);
    if (!snapshot) return false;
    if (!isDesktopSnapshotUsable(snapshot, desktopRect)) return false;
    return applyDesktopLayoutSnapshot(snapshot);
  }

  function updateNormalizedBounds(entry) {
    if (!entry || entry.maximized) return;
    if (isStackedMode() && isStackedFlowEntry(entry)) return;
    if (isStackedMode() && entry.element?.classList?.contains("dialog-window")) return;
    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return;
    const metrics = readWindowMetrics(entry);
    entry.normalizedBounds = {
      left: clamp01(metrics.left / desktopRect.width),
      top: clamp01(metrics.top / desktopRect.height),
      width: clamp01(metrics.width / desktopRect.width),
      height: clamp01(metrics.height / desktopRect.height)
    };
  }

  function applyNormalizedBounds(entry) {
    if (!entry || entry.maximized || !entry.normalizedBounds) return;
    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return;
    const bounds = entry.normalizedBounds;
    entry.element.style.left = px(bounds.left * desktopRect.width);
    entry.element.style.top = px(bounds.top * desktopRect.height);
    entry.element.style.width = px(bounds.width * desktopRect.width);
    entry.element.style.height = px(bounds.height * desktopRect.height);
  }

  function applyToolDesktopPreferredBounds(entry) {
    if (!entry || entry.kind !== "tool" || entry.maximized) return false;
    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return false;
    const pref = entry.desktopPreferredBounds;
    if (!pref || !Number.isFinite(pref.width) || !Number.isFinite(pref.height)) return false;

    const { minWidth, minHeight } = getMinSize(entry);
    // During desktop viewport resize, preserve preferred width and slide window left first.
    // Only reduce width when the window has already reached the left edge.
    const width = Math.max(minWidth, Math.min(desktopRect.width, Number(pref.width) || minWidth));
    const height = Math.max(minHeight, Math.min(Math.max(minHeight, desktopRect.height - 12), Number(pref.height) || minHeight));
    const left = Math.max(0, Math.min(Math.max(0, desktopRect.width - width), Number(pref.left) || 0));
    const top = Math.max(0, Math.min(Math.max(0, desktopRect.height - height), Number(pref.top) || 0));

    entry.element.style.left = px(left);
    entry.element.style.top = px(top);
    entry.element.style.width = px(width);
    entry.element.style.height = px(height);
    return true;
  }

  function rebalance(kind) {
    const ordered = [...windows.values()]
      .filter((entry) => entry.kind === kind)
      .sort((a, b) => (Number.parseInt(a.element.style.zIndex || "0", 10) - Number.parseInt(b.element.style.zIndex || "0", 10)));

    if (kind === "tool") {
      let z = TOOL_Z_BASE;
      ordered.forEach((entry) => {
        entry.element.style.zIndex = `${z}`;
        z += 1;
      });
      toolZCounter = z;
      return;
    }

    let z = NATIVE_Z_BASE;
    ordered.forEach((entry) => {
      entry.element.style.zIndex = `${z}`;
      z += 1;
    });
    nativeZCounter = z;
  }

  function nextZ(kind) {
    if (kind === "tool") {
      toolZCounter += 1;
      if (toolZCounter >= TOOL_Z_MAX) rebalance("tool");
      return toolZCounter;
    }
    nativeZCounter += 1;
    if (nativeZCounter >= NATIVE_Z_MAX) rebalance("native");
    return nativeZCounter;
  }

  function focus(windowId, options = {}) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;
    if (entry.minimized && !options.skipRestore && !isStackedMode()) {
      entry.minimized = false;
      entry.element.classList.remove("window-minimized");
    }
    entry.element.style.zIndex = `${nextZ(entry.kind)}`;
    entry.element.classList.add("window-focus");
    window.setTimeout(() => entry.element.classList.remove("window-focus"), 180);
  }

  function pulse(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;
    entry.element.classList.remove("window-activity");
    void entry.element.offsetWidth;
    entry.element.classList.add("window-activity");
    window.setTimeout(() => entry.element.classList.remove("window-activity"), 550);
  }

  function ensureDesktopNormalizedBounds(entry) {
    if (!entry || entry.normalizedBounds) return;
    if (entry.kind === "native") {
      const fallback = DEFAULT_DESKTOP_NATIVE_BOUNDS[entry.id];
      if (fallback) {
        entry.normalizedBounds = {
          left: clamp01(fallback.left),
          top: clamp01(fallback.top),
          width: clamp01(fallback.width),
          height: clamp01(fallback.height)
        };
        return;
      }
    }
    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return;
    const metrics = readWindowMetrics(entry);
    entry.normalizedBounds = {
      left: clamp01(metrics.left / desktopRect.width),
      top: clamp01(metrics.top / desktopRect.height),
      width: clamp01(metrics.width / desktopRect.width),
      height: clamp01(metrics.height / desktopRect.height)
    };
  }

  function restoreDesktopFromNormalizedBounds() {
    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return false;

    let restoredAny = false;
    DESKTOP_NATIVE_ORDER.forEach((id) => {
      const entry = windows.get(id);
      if (!entry) return;
      ensureDesktopNormalizedBounds(entry);
      if (!entry.normalizedBounds) return;
      entry.maximized = false;
      entry.minimized = false;
      entry.stackedMaximized = false;
      entry.element.classList.remove("window-maximized");
      entry.element.classList.remove("window-minimized");
      entry.element.classList.remove("window-hidden");
      applyNormalizedBounds(entry);
      clampWindow(entry, true, false);
      updateNormalizedBounds(entry);
      restoredAny = true;
    });

    windows.forEach((entry) => {
      if (entry.kind !== "tool") return;
      if (entry.element.classList.contains("window-hidden")) return;
      entry.maximized = false;
      entry.element.classList.remove("window-maximized");
      if (entry.element.classList.contains("dialog-window")) {
        if (!applyToolDesktopPreferredBounds(entry)) return;
        clampWindow(entry, true, false);
        return;
      }
      if (!applyToolDesktopPreferredBounds(entry)) {
        if (!entry.normalizedBounds) return;
        applyNormalizedBounds(entry);
      }
      clampWindow(entry, true, false);
      updateNormalizedBounds(entry);
      restoredAny = true;
    });

    return restoredAny;
  }

  function restoreToolsAfterStackedToDesktop() {
    if (isStackedMode()) return;
    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return;

    let cascadeIndex = 0;
    windows.forEach((entry) => {
      if (!entry || entry.kind !== "tool") return;
      if (isHiddenEntry(entry) || entry.minimized || entry.maximized) return;
      clearStackedToolZoom(entry);
      if (entry.desktopMinWidth > 0) entry.element.style.minWidth = `${Math.round(entry.desktopMinWidth)}px`;
      if (entry.desktopMinHeight > 0) entry.element.style.minHeight = `${Math.round(entry.desktopMinHeight)}px`;
      if (entry.element.classList.contains("dialog-window")) {
        if (applyToolDesktopPreferredBounds(entry)) {
          clampWindow(entry, true, false);
        }
        return;
      }

      const bounds = entry.normalizedBounds;
      const hasUsableNormalizedBounds = Boolean(
        bounds
        && bounds.width > 0.12
        && bounds.height > 0.12
        && bounds.width < 0.88
        && bounds.height < 0.95
      );
      if (hasUsableNormalizedBounds) {
        applyNormalizedBounds(entry);
        clampWindow(entry, true, false);
        updateNormalizedBounds(entry);
        return;
      }

      const pref = entry.desktopPreferredBounds;
      const { minWidth, minHeight } = getMinSize(entry);
      let width = Number.isFinite(pref?.width) ? pref.width : Math.round(desktopRect.width * 0.58);
      let height = Number.isFinite(pref?.height) ? pref.height : Math.round(desktopRect.height * 0.5);
      const widthLimit = getDesktopToolWidthLimit(entry, desktopRect, minWidth);
      width = Math.max(minWidth, Math.min(widthLimit, width));
      height = Math.max(minHeight, Math.min(Math.max(minHeight, desktopRect.height - 12), height));

      let left = Number.isFinite(pref?.left) ? pref.left : (72 + (cascadeIndex * 22));
      let top = Number.isFinite(pref?.top) ? pref.top : (58 + (cascadeIndex * 20));
      left = Math.max(0, Math.min(Math.max(0, desktopRect.width - width), left));
      top = Math.max(0, Math.min(Math.max(0, desktopRect.height - height), top));

      setWindowMetrics(entry, { left, top, width, height }, false);
      updateNormalizedBounds(entry);
      entry.desktopPreferredBounds = { left, top, width, height };
      cascadeIndex = (cascadeIndex + 1) % 10;
    });
  }

  function enforceNativeDesktopDocking(persistNormalized = true) {
    if (isStackedMode()) return false;
    const mainEntry = windows.get("window-main");
    const messagesEntry = windows.get("window-messages");
    const registersEntry = windows.get("window-registers");
    if (!mainEntry || !messagesEntry || !registersEntry) return false;
    if (mainEntry.maximized || messagesEntry.maximized || registersEntry.maximized) return false;
    if (isHiddenEntry(mainEntry) || isHiddenEntry(messagesEntry) || isHiddenEntry(registersEntry)) return false;

    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return false;

    const mainMinSize = getMinSize(mainEntry);
    const messagesMinSize = getMinSize(messagesEntry);
    const registersMinSize = getMinSize(registersEntry);

    const minLeftWidth = Math.max(mainMinSize.minWidth, messagesMinSize.minWidth, 120);
    const minRightWidth = Math.max(registersMinSize.minWidth, 120);
    const minTopHeight = Math.max(mainMinSize.minHeight, 120);
    const minBottomHeight = Math.max(messagesMinSize.minHeight, 90);

    const desiredLeftRatio = clamp01(
      mainEntry.normalizedBounds?.width
        ?? messagesEntry.normalizedBounds?.width
        ?? registersEntry.normalizedBounds?.left
        ?? DEFAULT_DESKTOP_NATIVE_BOUNDS["window-main"].width
    );
    const desiredTopRatio = clamp01(
      mainEntry.normalizedBounds?.height
        ?? messagesEntry.normalizedBounds?.top
        ?? DEFAULT_DESKTOP_NATIVE_BOUNDS["window-main"].height
    );

    let leftWidth = Math.round(desktopRect.width * desiredLeftRatio);
    const minWidthTotal = minLeftWidth + minRightWidth;
    if (desktopRect.width >= minWidthTotal) {
      leftWidth = Math.max(minLeftWidth, Math.min(desktopRect.width - minRightWidth, leftWidth));
    } else {
      leftWidth = Math.max(0, Math.min(desktopRect.width, Math.round(desktopRect.width * desiredLeftRatio)));
    }
    let rightWidth = Math.max(0, desktopRect.width - leftWidth);

    let topHeight = Math.round(desktopRect.height * desiredTopRatio);
    const minHeightTotal = minTopHeight + minBottomHeight;
    if (desktopRect.height >= minHeightTotal) {
      topHeight = Math.max(minTopHeight, Math.min(desktopRect.height - minBottomHeight, topHeight));
    } else {
      topHeight = Math.max(0, Math.min(desktopRect.height, Math.round(desktopRect.height * desiredTopRatio)));
    }
    let bottomHeight = Math.max(0, desktopRect.height - topHeight);

    setWindowMetrics(mainEntry, { left: 0, top: 0, width: leftWidth, height: topHeight }, persistNormalized);
    setWindowMetrics(messagesEntry, { left: 0, top: topHeight, width: leftWidth, height: bottomHeight }, persistNormalized);
    setWindowMetrics(registersEntry, { left: leftWidth, top: 0, width: rightWidth, height: desktopRect.height }, persistNormalized);

    if (!persistNormalized) {
      updateNormalizedBounds(mainEntry);
      updateNormalizedBounds(messagesEntry);
      updateNormalizedBounds(registersEntry);
    }
    return true;
  }

  function setWindowMetrics(entry, metrics, persistNormalized = true) {
    entry.element.style.left = px(metrics.left);
    entry.element.style.top = px(metrics.top);
    entry.element.style.width = px(metrics.width);
    entry.element.style.height = px(metrics.height);
    if (persistNormalized && !isStackedMode() && entry.kind === "tool" && !entry.maximized && !entry.minimized) {
      entry.desktopPreferredBounds = {
        left: Number(metrics.left) || 0,
        top: Number(metrics.top) || 0,
        width: Number(metrics.width) || 0,
        height: Number(metrics.height) || 0
      };
    }
    if (persistNormalized && !(isStackedMode() && isStackedFlowEntry(entry)) && !(isStackedMode() && entry.element?.classList?.contains("dialog-window"))) {
      updateNormalizedBounds(entry);
    }
    const interactionActive = Boolean(dragging || resizing || sharedDragging);
    if (!interactionActive) {
      scheduleSharedSplitterRefresh();
      if (!isStackedMode()) scheduleDesktopLayoutSave(220);
    }
  }

  function clampMetrics(entry, metrics) {
    const desktopRect = getDesktopRect();
    const { minWidth, minHeight } = getMinSize(entry);
    if (isStackedMode() && isStackedFlowEntry(entry)) {
      const width = Math.max(0, desktopRect.width);
      const stackedMinHeight = getStackedMinHeight(entry);
      const height = Math.max(stackedMinHeight, Number.isFinite(metrics.height) ? metrics.height : readWindowMetrics(entry).height);
      const top = Math.max(0, Number.isFinite(metrics.top) ? metrics.top : readWindowMetrics(entry).top);
      return { left: 0, top, width, height };
    }
    let width = Number.isFinite(metrics.width) ? metrics.width : readWindowMetrics(entry).width;
    let height = Number.isFinite(metrics.height) ? metrics.height : readWindowMetrics(entry).height;
    width = Math.max(minWidth, Math.min(desktopRect.width, width));
    height = Math.max(minHeight, Math.min(desktopRect.height, height));

    let left = Number.isFinite(metrics.left) ? metrics.left : readWindowMetrics(entry).left;
    let top = Number.isFinite(metrics.top) ? metrics.top : readWindowMetrics(entry).top;
    left = Math.max(0, Math.min(Math.max(0, desktopRect.width - width), left));
    top = Math.max(0, Math.min(Math.max(0, desktopRect.height - height), top));

    return { left, top, width, height };
  }

  function applyResponsiveClasses() {
    desktop.classList.toggle("desktop-stacked", isStackedMode());
    desktop.classList.toggle("desktop-compact", layoutMode === "compact");
    desktop.classList.toggle("desktop-main-maximized", isMainStackedMaximized());
  }

  function layoutStackedWindows(persistNormalized = true) {
    applyResponsiveClasses();
    const desktopRect = getDesktopRect();
    const mainEntry = windows.get("window-main");
    const maximizeMain = Boolean(
      mainEntry
      && !isHiddenEntry(mainEntry)
      && !mainEntry.minimized
      && mainEntry.stackedMaximized
    );

    if (maximizeMain && mainEntry) {
      const minHeight = getStackedMinHeight(mainEntry);
      const visibleDesktopHeight = Math.max(
        minHeight,
        Math.round(window.innerHeight - Math.max(0, desktopRect.top))
      );
      mainEntry.stackedHeight = visibleDesktopHeight;
      mainEntry.stackedExpandedHeight = visibleDesktopHeight;
      mainEntry.element.style.left = "0px";
      mainEntry.element.style.top = "0px";
      mainEntry.element.style.width = px(Math.max(0, desktopRect.width));
      mainEntry.element.style.height = px(visibleDesktopHeight);
      if (persistNormalized && !(isStackedMode() && isStackedFlowEntry(mainEntry))) updateNormalizedBounds(mainEntry);
      desktop.style.height = px(visibleDesktopHeight);
      return;
    }

    const entries = getStackedEntries();
    const placeEntries = () => {
      let top = 0;
      entries.forEach((entry) => {
        const height = ensureStackedHeight(entry);
        const metrics = {
          left: 0,
          top,
          width: Math.max(0, desktopRect.width),
          height
        };
        entry.element.style.left = "0px";
        entry.element.style.top = px(top);
        entry.element.style.width = px(metrics.width);
        entry.element.style.height = px(height);
        if (persistNormalized && !(isStackedMode() && isStackedFlowEntry(entry))) updateNormalizedBounds(entry);
        top += height;
      });
      desktop.style.height = px(top);
    };

    placeEntries();

    let requiresRelayout = false;
    entries.forEach((entry) => {
      const suggestedHeight = applyStackedToolZoomToFit(entry);
      if (suggestedHeight > 0 && !entry.stackedUserSized && Math.abs(suggestedHeight - entry.stackedHeight) > 2) {
        entry.stackedHeight = suggestedHeight;
        entry.stackedExpandedHeight = suggestedHeight;
        requiresRelayout = true;
      }
    });

    if (requiresRelayout) {
      placeEntries();
    }
  }

  function refreshWindowLayout() {
    sharedSplittersFrame = null;
    clearSharedSplitters();
    applyResponsiveClasses();
    if (isStackedMode()) {
      windows.forEach((entry) => {
        if (!entry || entry.kind !== "tool") return;
        entry.element.style.minWidth = "0px";
      });
      layoutStackedWindows(false);
      if (isMainStackedMaximized()) return;
      const entries = getStackedEntries();
      for (let index = 0; index < entries.length - 1; index += 1) {
        const first = entries[index];
        const second = entries[index + 1];
        // In stacked/mobile mode only the Main bottom edge is user-resizable.
        if (first.id !== "window-main") continue;
        const firstMetrics = readWindowMetrics(first);
        const secondMetrics = readWindowMetrics(second);
        const boundary = (firstMetrics.top + firstMetrics.height + secondMetrics.top) / 2;
        createSharedSplitter("horizontal", first, second, {
          left: 0,
          top: boundary - (SHARED_SPLITTER_THICKNESS_PX / 2),
          width: Math.max(firstMetrics.width, secondMetrics.width),
          height: SHARED_SPLITTER_THICKNESS_PX
        });
      }
      return;
    }
    windows.forEach((entry) => {
      clearStackedToolZoom(entry);
      if (entry.kind !== "tool") return;
      if (entry.desktopMinWidth > 0) entry.element.style.minWidth = `${Math.round(entry.desktopMinWidth)}px`;
      if (entry.desktopMinHeight > 0) entry.element.style.minHeight = `${Math.round(entry.desktopMinHeight)}px`;
    });
    desktop.style.height = "";
    refreshSharedSplitters();
  }

  function clearStackedToolZoom(entry) {
    if (!entry || entry.kind !== "tool") return;
    const content = entry.element.querySelector(".window-content");
    if (!(content instanceof HTMLElement)) return;
    content.style.removeProperty("zoom");
    entry.element.classList.remove("stacked-tool-zoomed");
  }

  function applyStackedToolZoomToFit(entry) {
    if (!entry || !isStackedToolEntry(entry) || !isStackedMode()) {
      clearStackedToolZoom(entry);
      return 0;
    }
    const content = entry.element.querySelector(".window-content");
    if (!(content instanceof HTMLElement)) return 0;

    const availableWidth = Math.max(120, content.clientWidth - 4);
    const previousZoom = content.style.zoom;
    content.style.zoom = "1";

    let naturalWidth = Math.max(content.scrollWidth, content.clientWidth);
    let naturalHeight = Math.max(content.scrollHeight, content.clientHeight);
    Array.from(content.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      naturalWidth = Math.max(naturalWidth, child.scrollWidth, child.getBoundingClientRect().width);
      naturalHeight = Math.max(naturalHeight, child.scrollHeight, child.getBoundingClientRect().height);
    });

    const rawScale = naturalWidth > 0 ? (availableWidth / naturalWidth) : 1;
    const scale = Math.max(0.72, Math.min(1, rawScale));
    if (scale < 0.999) {
      content.style.zoom = scale.toFixed(3);
      entry.element.classList.add("stacked-tool-zoomed");
    } else if (previousZoom) {
      content.style.removeProperty("zoom");
      entry.element.classList.remove("stacked-tool-zoomed");
    } else {
      content.style.removeProperty("zoom");
      entry.element.classList.remove("stacked-tool-zoomed");
    }

    if (entry.stackedUserSized) return 0;
    const minHeight = getStackedMinHeight(entry);
    const titlebarHeight = getTitlebarHeight(entry);
    const bonusFactor = scale < 1 ? (1 + ((1 - scale) * 0.45)) : 1;
    const suggested = Math.round(titlebarHeight + (naturalHeight * scale * bonusFactor) + 6);
    const cap = Math.max(minHeight, Math.round(window.innerHeight * 0.76));
    return Math.max(minHeight, Math.min(cap, suggested));
  }

  function applySnapToMetrics(entry, baseMetrics, directions = "") {
    const metrics = clampMetrics(entry, baseMetrics);
    const desktopRect = getDesktopRect();
    const isMoveOperation = directions === "move";
    const hasWest = !isMoveOperation && directions.includes("w");
    const hasEast = !isMoveOperation && directions.includes("e");
    const hasNorth = !isMoveOperation && directions.includes("n");
    const hasSouth = !isMoveOperation && directions.includes("s");
    const targets = [...windows.values()].filter((candidate) => {
      if (candidate === entry || !isVisibleEntry(candidate)) return false;
      return true;
    });

    const current = {
      left: metrics.left,
      top: metrics.top,
      width: metrics.width,
      height: metrics.height
    };

    const currentRight = () => current.left + current.width;
    const currentBottom = () => current.top + current.height;

    const moveLeft = isMoveOperation || hasWest;
    const moveRight = isMoveOperation || hasEast;
    const moveTop = isMoveOperation || hasNorth;
    const moveBottom = isMoveOperation || hasSouth;
    const originalLeft = current.left;
    const originalRight = currentRight();
    const originalTop = current.top;
    const originalBottom = currentBottom();

    const chooseClosestSnap = (candidates) => {
      let best = null;
      candidates.forEach((candidate) => {
        if (!candidate || !Number.isFinite(candidate.distance) || candidate.distance > SNAP_DISTANCE_PX) return;
        if (!best || candidate.distance < best.distance) best = candidate;
      });
      return best;
    };

    const snapLeftTo = (targetLeft) => {
      if (hasWest && !hasEast) {
        const nextWidth = currentRight() - targetLeft;
        if (nextWidth >= getMinSize(entry).minWidth) {
          current.left = targetLeft;
          current.width = nextWidth;
        }
        return;
      }
      current.left = targetLeft;
    };

    const snapRightTo = (targetRight) => {
      if (hasEast && !hasWest) {
        current.width = Math.max(getMinSize(entry).minWidth, targetRight - current.left);
        return;
      }
      current.left = targetRight - current.width;
    };

    const snapTopTo = (targetTop) => {
      if (hasNorth && !hasSouth) {
        const nextHeight = currentBottom() - targetTop;
        if (nextHeight >= getMinSize(entry).minHeight) {
          current.top = targetTop;
          current.height = nextHeight;
        }
        return;
      }
      current.top = targetTop;
    };

    const snapBottomTo = (targetBottom) => {
      if (hasSouth && !hasNorth) {
        current.height = Math.max(getMinSize(entry).minHeight, targetBottom - current.top);
        return;
      }
      current.top = targetBottom - current.height;
    };

    const leftCandidates = [];
    const rightCandidates = [];
    const topCandidates = [];
    const bottomCandidates = [];

    if (!isMoveOperation) {
      if (moveLeft) leftCandidates.push({ target: 0, distance: Math.abs(originalLeft) });
      if (moveRight) rightCandidates.push({ target: desktopRect.width, distance: Math.abs(desktopRect.width - originalRight) });
      if (moveTop) topCandidates.push({ target: 0, distance: Math.abs(originalTop) });
      if (moveBottom) bottomCandidates.push({ target: desktopRect.height, distance: Math.abs(desktopRect.height - originalBottom) });
    }

    targets.forEach((targetEntry) => {
      const target = readWindowMetrics(targetEntry);
      const targetLeft = target.left;
      const targetRight = target.left + target.width;
      const targetTop = target.top;
      const targetBottom = target.top + target.height;

      if (moveLeft || moveRight) {
        const verticalOverlap = overlapSize(originalTop, originalBottom, targetTop, targetBottom);
        const enoughVerticalOverlap = isMoveOperation ? verticalOverlap >= MOVE_SNAP_MIN_SPAN_PX : verticalOverlap > 0;
        if (enoughVerticalOverlap) {
          if (moveLeft) {
            leftCandidates.push({ target: targetLeft, distance: Math.abs(originalLeft - targetLeft) });
            leftCandidates.push({ target: targetRight, distance: Math.abs(originalLeft - targetRight) });
          }
          if (moveRight) {
            rightCandidates.push({ target: targetLeft, distance: Math.abs(originalRight - targetLeft) });
            rightCandidates.push({ target: targetRight, distance: Math.abs(originalRight - targetRight) });
          }
        }
      }

      if (moveTop || moveBottom) {
        const horizontalOverlap = overlapSize(originalLeft, originalRight, targetLeft, targetRight);
        const enoughHorizontalOverlap = isMoveOperation ? horizontalOverlap >= MOVE_SNAP_MIN_SPAN_PX : horizontalOverlap > 0;
        if (enoughHorizontalOverlap) {
          if (moveTop) {
            topCandidates.push({ target: targetTop, distance: Math.abs(originalTop - targetTop) });
            topCandidates.push({ target: targetBottom, distance: Math.abs(originalTop - targetBottom) });
          }
          if (moveBottom) {
            bottomCandidates.push({ target: targetTop, distance: Math.abs(originalBottom - targetTop) });
            bottomCandidates.push({ target: targetBottom, distance: Math.abs(originalBottom - targetBottom) });
          }
        }
      }
    });

    if (isMoveOperation) {
      const horizontalSnap = chooseClosestSnap([
        ...leftCandidates.map((candidate) => ({ axis: "left", ...candidate })),
        ...rightCandidates.map((candidate) => ({ axis: "right", ...candidate }))
      ]);
      const verticalSnap = chooseClosestSnap([
        ...topCandidates.map((candidate) => ({ axis: "top", ...candidate })),
        ...bottomCandidates.map((candidate) => ({ axis: "bottom", ...candidate }))
      ]);

      if (horizontalSnap) {
        if (horizontalSnap.axis === "left") snapLeftTo(horizontalSnap.target);
        else snapRightTo(horizontalSnap.target);
      }
      if (verticalSnap) {
        if (verticalSnap.axis === "top") snapTopTo(verticalSnap.target);
        else snapBottomTo(verticalSnap.target);
      }
      return clampMetrics(entry, current);
    }

    const leftSnap = moveLeft ? chooseClosestSnap(leftCandidates) : null;
    const rightSnap = moveRight ? chooseClosestSnap(rightCandidates) : null;
    const topSnap = moveTop ? chooseClosestSnap(topCandidates) : null;
    const bottomSnap = moveBottom ? chooseClosestSnap(bottomCandidates) : null;

    if (leftSnap && (!rightSnap || leftSnap.distance <= rightSnap.distance)) snapLeftTo(leftSnap.target);
    else if (rightSnap) snapRightTo(rightSnap.target);

    if (topSnap && (!bottomSnap || topSnap.distance <= bottomSnap.distance)) snapTopTo(topSnap.target);
    else if (bottomSnap) snapBottomTo(bottomSnap.target);

    return clampMetrics(entry, current);
  }

  function clampWindow(entry, clampSize = false, persistNormalized = true) {
    if (!entry || entry.maximized) return;
    const metrics = readWindowMetrics(entry);
    const nextMetrics = clampSize ? clampMetrics(entry, metrics) : metrics;
    setWindowMetrics(entry, nextMetrics, persistNormalized);
  }

  function canUseDesktopLinkedResize(entry) {
    if (!entry || isStackedMode()) return false;
    if (entry.kind !== "native") return false;
    if (!DESKTOP_LINKED_RESIZE_IDS.has(entry.id)) return false;
    if (entry.maximized || entry.minimized || isHiddenEntry(entry)) return false;
    return true;
  }

  function edgeNodeKey(windowId, edge) {
    return `${windowId}:${edge}`;
  }

  function parseEdgeNodeKey(key) {
    const separator = String(key).lastIndexOf(":");
    if (separator <= 0) return null;
    return {
      id: key.slice(0, separator),
      edge: key.slice(separator + 1)
    };
  }

  function getEdgeCoordinate(metrics, edge) {
    if (edge === "w") return metrics.left;
    if (edge === "e") return metrics.left + metrics.width;
    if (edge === "n") return metrics.top;
    return metrics.top + metrics.height;
  }

  function edgesCanClampTogether(aMetrics, aEdge, bMetrics, bEdge) {
    const aVertical = aEdge === "w" || aEdge === "e";
    const bVertical = bEdge === "w" || bEdge === "e";
    if (aVertical !== bVertical) return false;

    if (aVertical) {
      const oppositeSides = (aEdge === "e" && bEdge === "w") || (aEdge === "w" && bEdge === "e");
      if (!oppositeSides) return false;
      if (!nearlyLinkedEdge(getEdgeCoordinate(aMetrics, aEdge), getEdgeCoordinate(bMetrics, bEdge))) return false;
      const overlap = overlapSize(
        aMetrics.top,
        aMetrics.top + aMetrics.height,
        bMetrics.top,
        bMetrics.top + bMetrics.height
      );
      return overlap >= SHARED_SPLITTER_MIN_SPAN_PX;
    }

    const oppositeSides = (aEdge === "s" && bEdge === "n") || (aEdge === "n" && bEdge === "s");
    if (!oppositeSides) return false;
    if (!nearlyLinkedEdge(getEdgeCoordinate(aMetrics, aEdge), getEdgeCoordinate(bMetrics, bEdge))) return false;
    const overlap = overlapSize(
      aMetrics.left,
      aMetrics.left + aMetrics.width,
      bMetrics.left,
      bMetrics.left + bMetrics.width
    );
    return overlap >= SHARED_SPLITTER_MIN_SPAN_PX;
  }

  function connectEdgeNodes(adjacency, fromKey, toKey) {
    if (!adjacency.has(fromKey)) adjacency.set(fromKey, new Set());
    if (!adjacency.has(toKey)) adjacency.set(toKey, new Set());
    adjacency.get(fromKey).add(toKey);
    adjacency.get(toKey).add(fromKey);
  }

  function collectConnectedEdgeNodes(adjacency, startKey) {
    if (!adjacency.has(startKey)) return [];
    const visited = new Set([startKey]);
    const queue = [startKey];
    while (queue.length) {
      const current = queue.shift();
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor) => {
        if (visited.has(neighbor)) return;
        visited.add(neighbor);
        queue.push(neighbor);
      });
    }
    return [...visited];
  }

  function shiftMetricsEdge(metrics, edge, delta) {
    if (!metrics || !Number.isFinite(delta) || delta === 0) return;
    if (edge === "w") {
      metrics.left += delta;
      metrics.width -= delta;
      return;
    }
    if (edge === "e") {
      metrics.width += delta;
      return;
    }
    if (edge === "n") {
      metrics.top += delta;
      metrics.height -= delta;
      return;
    }
    metrics.height += delta;
  }

  function buildLinkedResizeState(entry, direction) {
    if (!canUseDesktopLinkedResize(entry)) return null;
    const edges = new Set(direction.split(""));
    if (!edges.size) return null;

    const startMetricsById = {};
    DESKTOP_NATIVE_ORDER.forEach((id) => {
      const target = windows.get(id);
      if (!target || target.maximized || target.minimized || isHiddenEntry(target)) return;
      startMetricsById[id] = readWindowMetrics(target);
    });
    if (!startMetricsById[entry.id]) return null;

    const sourceStart = startMetricsById[entry.id];
    const adjacency = new Map();
    const ids = Object.keys(startMetricsById);
    ids.forEach((id) => {
      ["w", "e", "n", "s"].forEach((edge) => {
        const key = edgeNodeKey(id, edge);
        if (!adjacency.has(key)) adjacency.set(key, new Set());
      });
    });

    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const idA = ids[i];
        const idB = ids[j];
        const metricsA = startMetricsById[idA];
        const metricsB = startMetricsById[idB];
        const pairs = [
          ["e", "w"],
          ["w", "e"],
          ["s", "n"],
          ["n", "s"]
        ];
        pairs.forEach(([edgeA, edgeB]) => {
          if (!edgesCanClampTogether(metricsA, edgeA, metricsB, edgeB)) return;
          connectEdgeNodes(
            adjacency,
            edgeNodeKey(idA, edgeA),
            edgeNodeKey(idB, edgeB)
          );
        });
      }
    }

    const sourceEdges = [...edges].filter((edge) => ["w", "e", "n", "s"].includes(edge));
    if (!sourceEdges.length) return null;

    const edgeGroups = sourceEdges.map((sourceEdge) => {
      const sourceKey = edgeNodeKey(entry.id, sourceEdge);
      const nodes = collectConnectedEdgeNodes(adjacency, sourceKey);
      return {
        sourceEdge,
        nodes
      };
    }).filter((group) => group.nodes.length > 0);
    if (!edgeGroups.length) return null;

    return {
      sourceId: entry.id,
      sourceDirection: direction,
      sourceStart,
      startMetricsById,
      edgeGroups
    };
  }

  function applyLinkedResizeState(linkedResize, sourceMetrics) {
    if (!linkedResize || !sourceMetrics) return;
    const sourceStart = linkedResize.sourceStart;
    const delta = {
      w: sourceMetrics.left - sourceStart.left,
      e: (sourceMetrics.left + sourceMetrics.width) - (sourceStart.left + sourceStart.width),
      n: sourceMetrics.top - sourceStart.top,
      s: (sourceMetrics.top + sourceMetrics.height) - (sourceStart.top + sourceStart.height)
    };

    const nextById = {};
    Object.entries(linkedResize.startMetricsById).forEach(([id, metrics]) => {
      nextById[id] = { ...metrics };
    });

    linkedResize.edgeGroups.forEach((group) => {
      const d = delta[group.sourceEdge] || 0;
      if (!d) return;
      group.nodes.forEach((nodeKey) => {
        const parsed = parseEdgeNodeKey(nodeKey);
        if (!parsed) return;
        if (parsed.id === linkedResize.sourceId && parsed.edge === group.sourceEdge) return;
        const target = windows.get(parsed.id);
        if (!canUseDesktopLinkedResize(target)) return;
        const next = nextById[parsed.id];
        if (!next) return;
        shiftMetricsEdge(next, parsed.edge, d);
      });
    });

    Object.entries(nextById).forEach(([id, metrics]) => {
      if (id === linkedResize.sourceId) return;
      const target = windows.get(id);
      if (!canUseDesktopLinkedResize(target)) return;
      const clamped = clampMetrics(target, metrics);
      setWindowMetrics(target, clamped, false);
    });
  }

  function clampDialogPosition(entry) {
    if (!entry || !entry.element.classList.contains("dialog-window")) return false;
    const desktopRect = getDesktopRect();
    if (!(desktopRect.width > 0) || !(desktopRect.height > 0)) return false;
    const metrics = readWindowMetrics(entry);
    const width = Number.isFinite(metrics.width) ? metrics.width : 0;
    const height = Number.isFinite(metrics.height) ? metrics.height : 0;
    const leftLimit = Math.max(0, desktopRect.width - Math.min(width, desktopRect.width));
    const topLimit = Math.max(0, desktopRect.height - Math.min(height, desktopRect.height));
    entry.element.style.left = px(Math.max(0, Math.min(leftLimit, metrics.left)));
    entry.element.style.top = px(Math.max(0, Math.min(topLimit, metrics.top)));
    return true;
  }

  function onPointerMove(event) {
    if (!dragging) return;
    const activeEntry = dragging.entry;
    if (!activeEntry || activeEntry.maximized) return;
    if (isStackedMode() && isStackedFlowEntry(activeEntry)) return;
    const desktopRect = getDesktopRect();
    const metrics = readWindowMetrics(activeEntry);
    const nextMetrics = applySnapToMetrics(activeEntry, {
      left: event.clientX - desktopRect.left - dragging.offsetX,
      top: event.clientY - desktopRect.top - dragging.offsetY,
      width: metrics.width,
      height: metrics.height
    }, "move");
    setWindowMetrics(activeEntry, nextMetrics, false);
  }

  function stopDragging() {
    if (!dragging) return;
    const activeEntry = dragging.entry;
    if (!activeEntry) return;
    activeEntry.element.classList.remove("window-dragging");
    if (!isStackedMode()) {
      const snapped = applySnapToMetrics(activeEntry, readWindowMetrics(activeEntry), "move");
      setWindowMetrics(activeEntry, snapped, true);
    }
    clampWindow(activeEntry, true, true);
    dragging = null;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", stopDragging);
    document.body.style.cursor = "";
    if (!isStackedMode()) scheduleDesktopLayoutSave(80);
  }

  function onResizePointerMove(event) {
    if (!resizing) return;
    if (isStackedMode() && isStackedFlowEntry(resizing.entry)) return;
    const dx = event.clientX - resizing.startX;
    const dy = event.clientY - resizing.startY;
    const start = resizing.startMetrics;
    const directions = resizing.direction;
    const next = {
      left: start.left,
      top: start.top,
      width: start.width,
      height: start.height
    };

    if (directions.includes("e")) next.width = start.width + dx;
    if (directions.includes("s")) next.height = start.height + dy;
    if (directions.includes("w")) {
      next.left = start.left + dx;
      next.width = start.width - dx;
    }
    if (directions.includes("n")) {
      next.top = start.top + dy;
      next.height = start.height - dy;
    }

    const snapped = applySnapToMetrics(resizing.entry, next, directions);
    setWindowMetrics(resizing.entry, snapped, false);
    applyLinkedResizeState(resizing.linkedResize, snapped);
  }

  function stopResizing() {
    if (!resizing) return;
    resizing.entry.element.classList.remove("window-dragging");
    if (!isStackedMode()) {
      const snapped = applySnapToMetrics(resizing.entry, readWindowMetrics(resizing.entry), resizing.direction);
      setWindowMetrics(resizing.entry, snapped, true);
    }
    clampWindow(resizing.entry, true, true);
    resizing = null;
    document.removeEventListener("pointermove", onResizePointerMove);
    document.removeEventListener("pointerup", stopResizing);
    document.body.style.cursor = "";
    if (!isStackedMode()) scheduleDesktopLayoutSave(80);
  }

  function onSharedSplitterPointerMove(event) {
    if (!sharedDragging) return;
    const delta = sharedDragging.orientation === "vertical"
      ? (event.clientX - sharedDragging.startPointer)
      : (event.clientY - sharedDragging.startPointer);

    if (isStackedMode() && sharedDragging.orientation === "horizontal") {
      if (sharedDragging.first.minimized || sharedDragging.second.minimized) return;
      const firstMinHeight = getStackedMinHeight(sharedDragging.first);
      const secondMinHeight = getStackedMinHeight(sharedDragging.second);
      const totalHeight = sharedDragging.firstStart.height + sharedDragging.secondStart.height;
      const nextFirstHeight = Math.max(firstMinHeight, Math.min(totalHeight - secondMinHeight, sharedDragging.firstStart.height + delta));
      const nextSecondHeight = Math.max(secondMinHeight, totalHeight - nextFirstHeight);
      sharedDragging.first.stackedHeight = nextFirstHeight;
      sharedDragging.second.stackedHeight = nextSecondHeight;
      sharedDragging.first.stackedExpandedHeight = nextFirstHeight;
      sharedDragging.second.stackedExpandedHeight = nextSecondHeight;
      sharedDragging.first.stackedUserSized = true;
      sharedDragging.second.stackedUserSized = true;
      sharedDragging.first.stackedMaximized = false;
      sharedDragging.second.stackedMaximized = false;
      layoutStackedWindows(false);
      clearSharedSplitters();
      const entries = getStackedEntries();
      for (let index = 0; index < entries.length - 1; index += 1) {
        const first = entries[index];
        const second = entries[index + 1];
        const firstMetrics = readWindowMetrics(first);
        const secondMetrics = readWindowMetrics(second);
        const boundary = (firstMetrics.top + firstMetrics.height + secondMetrics.top) / 2;
        createSharedSplitter("horizontal", first, second, {
          left: 0,
          top: boundary - (SHARED_SPLITTER_THICKNESS_PX / 2),
          width: Math.max(firstMetrics.width, secondMetrics.width),
          height: SHARED_SPLITTER_THICKNESS_PX
        });
      }
      return;
    }

    const firstStart = sharedDragging.firstStart;
    const secondStart = sharedDragging.secondStart;
    const firstMin = getMinSize(sharedDragging.first).minWidth;
    const secondMin = getMinSize(sharedDragging.second).minWidth;
    const firstMinHeight = getMinSize(sharedDragging.first).minHeight;
    const secondMinHeight = getMinSize(sharedDragging.second).minHeight;

    if (sharedDragging.orientation === "vertical") {
      const boundaryStart = firstStart.left + firstStart.width;
      const minBoundary = firstStart.left + firstMin;
      const maxBoundary = secondStart.left + secondStart.width - secondMin;
      const boundary = Math.max(minBoundary, Math.min(maxBoundary, boundaryStart + delta));
      setWindowMetrics(sharedDragging.first, {
        left: firstStart.left,
        top: firstStart.top,
        width: boundary - firstStart.left,
        height: firstStart.height
      }, false);
      setWindowMetrics(sharedDragging.second, {
        left: boundary,
        top: secondStart.top,
        width: (secondStart.left + secondStart.width) - boundary,
        height: secondStart.height
      }, false);
      return;
    }

    const boundaryStart = firstStart.top + firstStart.height;
    const minBoundary = firstStart.top + firstMinHeight;
    const maxBoundary = secondStart.top + secondStart.height - secondMinHeight;
    const boundary = Math.max(minBoundary, Math.min(maxBoundary, boundaryStart + delta));
    setWindowMetrics(sharedDragging.first, {
      left: firstStart.left,
      top: firstStart.top,
      width: firstStart.width,
      height: boundary - firstStart.top
    }, false);
    setWindowMetrics(sharedDragging.second, {
      left: secondStart.left,
      top: boundary,
      width: secondStart.width,
      height: (secondStart.top + secondStart.height) - boundary
    }, false);
  }

  function stopSharedSplitterDragging() {
    if (!sharedDragging) return;
    if (isStackedMode() && sharedDragging.orientation === "horizontal") {
      layoutStackedWindows(true);
    } else {
      clampWindow(sharedDragging.first, true, true);
      clampWindow(sharedDragging.second, true, true);
    }
    sharedDragging = null;
    document.removeEventListener("pointermove", onSharedSplitterPointerMove);
    document.removeEventListener("pointerup", stopSharedSplitterDragging);
    document.body.style.cursor = "";
    scheduleSharedSplitterRefresh();
    if (!isStackedMode()) scheduleDesktopLayoutSave(100);
  }

  function toggleMinimize(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;

    if (entry.minimized) {
      entry.minimized = false;
      entry.element.classList.remove("window-minimized");
      if (isStackedMode() && isStackedFlowEntry(entry)) {
        const fallbackHeight = STACKED_DEFAULT_HEIGHTS[entry.id] ?? getStackedMinHeight(entry);
        const restoredHeight = entry.stackedExpandedHeight > 0 ? entry.stackedExpandedHeight : fallbackHeight;
        entry.stackedHeight = Math.max(getStackedMinHeight(entry), restoredHeight);
        layoutStackedWindows(true);
      }
      clampWindow(entry, true, true);
      focus(windowId, { skipRestore: true });
      scheduleSharedSplitterRefresh();
      if (!isStackedMode()) scheduleDesktopLayoutSave(100);
      return;
    }

    if (entry.maximized) {
      toggleMaximize(windowId);
    }

    entry.minimized = true;
    entry.stackedMaximized = false;
    if (isStackedMode() && isStackedFlowEntry(entry)) {
      entry.stackedExpandedHeight = Math.max(getMinSize(entry).minHeight, readWindowMetrics(entry).height);
      entry.stackedHeight = getStackedCollapsedHeight(entry);
      layoutStackedWindows(true);
    }
    entry.element.classList.add("window-minimized");
    entry.element.classList.remove("window-maximized");
    scheduleSharedSplitterRefresh();
    if (!isStackedMode()) scheduleDesktopLayoutSave(100);
  }

  function toggleMaximize(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;
    if (isStackedMode() && isStackedFlowEntry(entry)) {
      const canToggleStackedMaximize = entry.kind === "tool" || entry.id === "window-main";
      if (!canToggleStackedMaximize) return;
      if (entry.minimized) {
        entry.minimized = false;
        entry.element.classList.remove("window-minimized");
      }
      const minHeight = getStackedMinHeight(entry);
      const desktopRect = getDesktopRect();
      const mainFullHeight = Math.max(
        minHeight,
        Math.round(window.innerHeight - Math.max(0, desktopRect.top))
      );
      if (entry.stackedMaximized) {
        const fallbackHeight = STACKED_DEFAULT_HEIGHTS[entry.id] ?? minHeight;
        const restoredHeight = entry.stackedRestoreHeight > 0
          ? entry.stackedRestoreHeight
          : (entry.stackedExpandedHeight > 0 ? entry.stackedExpandedHeight : fallbackHeight);
        entry.stackedMaximized = false;
        entry.stackedHeight = Math.max(minHeight, restoredHeight);
        entry.stackedExpandedHeight = entry.stackedHeight;
      } else {
        const currentHeight = Math.max(minHeight, readWindowMetrics(entry).height);
        entry.stackedRestoreHeight = currentHeight;
        entry.stackedMaximized = true;
        entry.stackedHeight = entry.id === "window-main"
          ? mainFullHeight
          : Math.max(minHeight, Math.round(window.innerHeight * 0.72));
        entry.stackedExpandedHeight = entry.stackedHeight;
      }
      entry.element.classList.remove("window-maximized");
      layoutStackedWindows(true);
      focus(windowId, { skipRestore: true });
      scheduleSharedSplitterRefresh();
      return;
    }

    if (entry.maximized) {
      const bounds = entry.restoreBounds;
      entry.maximized = false;
      entry.element.classList.remove("window-maximized");
      if (bounds) {
        entry.element.style.left = `${bounds.left}px`;
        entry.element.style.top = `${bounds.top}px`;
        entry.element.style.width = `${bounds.width}px`;
        entry.element.style.height = `${bounds.height}px`;
      }
      clampWindow(entry, true, true);
      focus(windowId, { skipRestore: true });
      scheduleDesktopLayoutSave(100);
      return;
    }

    if (entry.minimized) {
      entry.minimized = false;
      entry.element.classList.remove("window-minimized");
    }

    const desktopRect = getDesktopRect();
    const rect = entry.element.getBoundingClientRect();
    const left = parseFloat(entry.element.style.left || `${rect.left - desktopRect.left}`);
    const top = parseFloat(entry.element.style.top || `${rect.top - desktopRect.top}`);
    const width = parseFloat(entry.element.style.width || `${rect.width}`);
    const height = parseFloat(entry.element.style.height || `${rect.height}`);

    entry.restoreBounds = { left, top, width, height };
    entry.stackedMaximized = false;
    entry.maximized = true;
    entry.element.classList.add("window-maximized");
    entry.element.style.left = "0px";
    entry.element.style.top = "0px";
    entry.element.style.width = `${Math.round(desktopRect.width)}px`;
    entry.element.style.height = `${Math.round(desktopRect.height)}px`;
    focus(windowId, { skipRestore: true });
    scheduleSharedSplitterRefresh();
    scheduleDesktopLayoutSave(100);
  }

  function bindDragging(entry) {
    const bar = entry.element.querySelector(".window-titlebar");
    if (!bar) return;
    bar.style.touchAction = "none";

    bar.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (event.target instanceof HTMLElement && event.target.closest("button")) return;
      if (entry.maximized) return;
      if (isStackedMode() && isStackedFlowEntry(entry)) return;
      event.preventDefault();

      const rect = entry.element.getBoundingClientRect();
      dragging = {
        entry,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };

      entry.element.classList.add("window-dragging");
      focus(entry.id, { skipRestore: true });
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", stopDragging);
      document.body.style.cursor = "move";
    });
  }

  function createResizeHandles(entry) {
    const directions = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
    directions.forEach((direction) => {
      const handle = document.createElement("div");
      handle.className = `window-resize-handle resize-${direction}`;
      handle.dataset.resizeDirection = direction;
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || entry.maximized || entry.minimized) return;
        if (isStackedMode() && isStackedFlowEntry(entry)) return;
        event.preventDefault();
        event.stopPropagation();
        focus(entry.id, { skipRestore: true });
        entry.element.classList.add("window-dragging");
        resizing = {
          entry,
          direction,
          startX: event.clientX,
          startY: event.clientY,
          startMetrics: readWindowMetrics(entry),
          linkedResize: buildLinkedResizeState(entry, direction)
        };
        document.addEventListener("pointermove", onResizePointerMove);
        document.addEventListener("pointerup", stopResizing);
        document.body.style.cursor = window.getComputedStyle(handle).cursor;
      });
      entry.element.appendChild(handle);
    });
  }

  function clearSharedSplitters() {
    sharedSplitters.forEach((splitter) => splitter.remove());
    sharedSplitters.clear();
  }

  function createSharedSplitter(orientation, first, second, metrics) {
    const splitter = document.createElement("div");
    splitter.className = `desktop-shared-splitter ${orientation === "vertical" ? "splitter-vertical" : "splitter-horizontal"}`;
    splitter.style.left = px(metrics.left);
    splitter.style.top = px(metrics.top);
    splitter.style.width = px(metrics.width);
    splitter.style.height = px(metrics.height);
    splitter.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (isStackedMode() && orientation === "horizontal" && (first.minimized || second.minimized)) return;
      event.preventDefault();
      sharedDragging = {
        orientation,
        first,
        second,
        startPointer: orientation === "vertical" ? event.clientX : event.clientY,
        firstStart: readWindowMetrics(first),
        secondStart: readWindowMetrics(second)
      };
      document.addEventListener("pointermove", onSharedSplitterPointerMove);
      document.addEventListener("pointerup", stopSharedSplitterDragging);
      document.body.style.cursor = orientation === "vertical" ? "col-resize" : "row-resize";
    });
    desktop.appendChild(splitter);
    sharedSplitters.add(splitter);
  }

  function refreshSharedSplitters() {
    const entries = [...windows.values()].filter((entry) => entry.kind === "native" && isVisibleEntry(entry) && !entry.maximized);
    for (let i = 0; i < entries.length; i += 1) {
      for (let j = i + 1; j < entries.length; j += 1) {
        const a = entries[i];
        const b = entries[j];
        const aMetrics = readWindowMetrics(a);
        const bMetrics = readWindowMetrics(b);

        if (nearlyEqual(aMetrics.left + aMetrics.width, bMetrics.left) || nearlyEqual(bMetrics.left + bMetrics.width, aMetrics.left)) {
          const leftEntry = (aMetrics.left <= bMetrics.left) ? a : b;
          const rightEntry = leftEntry === a ? b : a;
          const leftMetrics = leftEntry === a ? aMetrics : bMetrics;
          const rightMetrics = rightEntry === a ? aMetrics : bMetrics;
          const overlap = overlapSize(leftMetrics.top, leftMetrics.top + leftMetrics.height, rightMetrics.top, rightMetrics.top + rightMetrics.height);
          if (overlap >= SHARED_SPLITTER_MIN_SPAN_PX) {
            const boundary = (leftMetrics.left + leftMetrics.width + rightMetrics.left) / 2;
            createSharedSplitter("vertical", leftEntry, rightEntry, {
              left: boundary - (SHARED_SPLITTER_THICKNESS_PX / 2),
              top: Math.max(leftMetrics.top, rightMetrics.top),
              width: SHARED_SPLITTER_THICKNESS_PX,
              height: overlap
            });
          }
        }

        if (nearlyEqual(aMetrics.top + aMetrics.height, bMetrics.top) || nearlyEqual(bMetrics.top + bMetrics.height, aMetrics.top)) {
          const topEntry = (aMetrics.top <= bMetrics.top) ? a : b;
          const bottomEntry = topEntry === a ? b : a;
          const topMetrics = topEntry === a ? aMetrics : bMetrics;
          const bottomMetrics = bottomEntry === a ? aMetrics : bMetrics;
          const overlap = overlapSize(topMetrics.left, topMetrics.left + topMetrics.width, bottomMetrics.left, bottomMetrics.left + bottomMetrics.width);
          if (overlap >= SHARED_SPLITTER_MIN_SPAN_PX) {
            const boundary = (topMetrics.top + topMetrics.height + bottomMetrics.top) / 2;
            createSharedSplitter("horizontal", topEntry, bottomEntry, {
              left: Math.max(topMetrics.left, bottomMetrics.left),
              top: boundary - (SHARED_SPLITTER_THICKNESS_PX / 2),
              width: overlap,
              height: SHARED_SPLITTER_THICKNESS_PX
            });
          }
        }
      }
    }
  }

  function scheduleSharedSplitterRefresh() {
    if (sharedSplittersFrame !== null) return;
    sharedSplittersFrame = window.requestAnimationFrame(refreshWindowLayout);
  }

  function bindControls(entry) {
    entry.element.querySelectorAll("[data-win-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const action = button.dataset.winAction;
        if (action === "min") toggleMinimize(entry.id);
        if (action === "max") toggleMaximize(entry.id);
        if (action === "close") hide(entry.id);
      });
    });
  }

  function registerWindow(win) {
    if (!(win instanceof HTMLElement) || !win.id || windows.has(win.id)) return;

    const kind = getKind(win);
    const entry = {
      id: win.id,
      kind,
      element: win,
      minimized: false,
      maximized: false,
      restoreBounds: null,
      normalizedBounds: null,
      desktopPreferredBounds: null,
      desktopMinWidth: 0,
      desktopMinHeight: 0,
      stackedHeight: 0,
      stackedExpandedHeight: 0,
      stackedMaximized: false,
      stackedRestoreHeight: 0,
      stackedUserSized: false,
      resizeFrame: null
    };
    windows.set(win.id, entry);

    const seededMetrics = {
      left: parseFloat(win.style.left || "NaN"),
      top: parseFloat(win.style.top || "NaN"),
      width: parseFloat(win.style.width || "NaN"),
      height: parseFloat(win.style.height || "NaN")
    };
    const seededMinWidth = parseFloat(win.style.minWidth || "NaN");
    const seededMinHeight = parseFloat(win.style.minHeight || "NaN");
    if (Number.isFinite(seededMinWidth) && seededMinWidth > 0) entry.desktopMinWidth = seededMinWidth;
    if (Number.isFinite(seededMinHeight) && seededMinHeight > 0) entry.desktopMinHeight = seededMinHeight;
    if (kind === "tool"
      && Number.isFinite(seededMetrics.width) && seededMetrics.width > 0
      && Number.isFinite(seededMetrics.height) && seededMetrics.height > 0) {
      entry.desktopPreferredBounds = {
        left: Number.isFinite(seededMetrics.left) ? seededMetrics.left : 0,
        top: Number.isFinite(seededMetrics.top) ? seededMetrics.top : 0,
        width: seededMetrics.width,
        height: seededMetrics.height
      };
    }

    const desktopRect = getDesktopRect();
    const rect = win.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      win.style.left = px(Math.max(0, rect.left - desktopRect.left));
      win.style.top = px(Math.max(0, rect.top - desktopRect.top));
      win.style.width = px(rect.width);
      win.style.height = px(rect.height);
      if (kind === "tool" && !entry.desktopPreferredBounds) {
        entry.desktopPreferredBounds = {
          left: Math.max(0, rect.left - desktopRect.left),
          top: Math.max(0, rect.top - desktopRect.top),
          width: rect.width,
          height: rect.height
        };
      }
    }

    if (kind === "tool" && !isStackedMode()) {
      const current = readWindowMetrics(entry);
      const { minWidth, minHeight } = getMinSize(entry);
      const widthLimit = getDesktopToolWidthLimit(entry, desktopRect, minWidth);
      const width = Math.max(minWidth, Math.min(widthLimit, current.width));
      const height = Math.max(minHeight, Math.min(Math.max(minHeight, desktopRect.height - 12), current.height));
      const left = Math.max(0, Math.min(Math.max(0, desktopRect.width - width), current.left));
      const top = Math.max(0, Math.min(Math.max(0, desktopRect.height - height), current.top));
      win.style.left = px(left);
      win.style.top = px(top);
      win.style.width = px(width);
      win.style.height = px(height);
      entry.desktopPreferredBounds = { left, top, width, height };
    }

    win.style.zIndex = `${nextZ(kind)}`;
    bindDragging(entry);
    createResizeHandles(entry);
    bindControls(entry);

    win.addEventListener("pointerdown", () => focus(win.id, { skipRestore: true }));
    win.addEventListener("pointerup", () => {
      if (isStackedMode() && isStackedFlowEntry(entry)) {
        layoutStackedWindows(true);
        return;
      }
      clampWindow(entry, true, true);
    });

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => {
        if (entry.maximized) return;
        if (isStackedMode() && isStackedFlowEntry(entry)) return;
        if (entry.resizeFrame !== null) window.cancelAnimationFrame(entry.resizeFrame);
        entry.resizeFrame = window.requestAnimationFrame(() => {
          entry.resizeFrame = null;
          clampWindow(entry, true, false);
        });
      });
      observer.observe(win);
    }

    const pendingState = pendingSessionWindowState.get(entry.id);
    if (pendingState) {
      applySessionWindowEntry(entry, pendingState, {
        skipLayoutRefresh: true,
        skipDesktopPersist: true
      });
      pendingSessionWindowState.delete(entry.id);
    }

    const pendingSavedState = pendingSavedLayoutState.get(entry.id);
    if (pendingSavedState) {
      applySavedLayoutEntry(entry, pendingSavedState, {
        skipLayoutRefresh: true,
        skipDesktopPersist: true
      });
      pendingSavedLayoutState.delete(entry.id);
    }

    clampWindow(entry, true, true);
  }

  function unregisterWindow(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return false;
    if (entry.kind === "native") return false;

    if (dragging?.entry === entry) stopDragging();
    if (resizing?.entry === entry) stopResizing();
    if (sharedDragging && (sharedDragging.first === entry || sharedDragging.second === entry)) {
      stopSharedSplitterDragging();
    }

    if (entry.resizeFrame !== null) {
      window.cancelAnimationFrame(entry.resizeFrame);
      entry.resizeFrame = null;
    }

    pendingSessionWindowState.delete(entry.id);
    pendingSavedLayoutState.delete(entry.id);
    windows.delete(entry.id);
    if (entry.element instanceof HTMLElement) entry.element.remove();

    scheduleSharedSplitterRefresh();
    if (!isStackedMode()) scheduleDesktopLayoutSave(120);
    return true;
  }

  function show(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;
    entry.element.classList.remove("window-hidden");
    if (entry.minimized) {
      entry.minimized = false;
      entry.element.classList.remove("window-minimized");
    }
    if (entry.element.classList.contains("dialog-window") && !entry.maximized) {
      const metrics = readWindowMetrics(entry);
      if (Number.isFinite(metrics.width) && metrics.width > 0 && Number.isFinite(metrics.height) && metrics.height > 0) {
        entry.desktopPreferredBounds = {
          left: Number(metrics.left) || 0,
          top: Number(metrics.top) || 0,
          width: Number(metrics.width) || 0,
          height: Number(metrics.height) || 0
        };
      }
    }
    focus(windowId);
    scheduleSharedSplitterRefresh();
    if (!isStackedMode()) scheduleDesktopLayoutSave(120);
  }

  function hide(windowId) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return;
    entry.element.classList.add("window-hidden");
    scheduleSharedSplitterRefresh();
    if (!isStackedMode()) scheduleDesktopLayoutSave(120);
  }

  function shouldPersistSessionWindow(entry) {
    if (!entry || entry.kind !== "tool") return false;
    if (entry.element.classList.contains("dialog-window")) return false;
    return true;
  }

  function shouldPersistSavedLayoutWindow(entry) {
    if (!entry) return false;
    if (entry.element.classList.contains("dialog-window")) return false;
    return true;
  }

  function normalizeSavedLayoutSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    const windowsPayload = Array.isArray(snapshot.windows)
      ? snapshot.windows.filter((entry) => entry && typeof entry === "object")
      : [];
    if (!windowsPayload.length) return null;
    return {
      version: Number.isFinite(snapshot.version) ? (snapshot.version | 0) : 1,
      layoutMode: String(snapshot.layoutMode || ""),
      windows: windowsPayload
    };
  }

  function isNativeLayoutModeCompatible(savedLayoutMode) {
    const savedMode = String(savedLayoutMode || "").trim().toLowerCase();
    if (!savedMode) return true;
    const currentIsDesktop = !isStackedMode();
    const savedIsDesktop = savedMode === "desktop";
    return currentIsDesktop === savedIsDesktop;
  }

  function exportSessionWindowState() {
    const payload = {
      version: 1,
      layoutMode,
      windows: []
    };
    windows.forEach((entry) => {
      if (!shouldPersistSessionWindow(entry)) return;
      const metrics = readWindowMetrics(entry);
      payload.windows.push({
        id: entry.id,
        kind: entry.kind,
        toolId: String(entry.element.dataset.toolId || ""),
        hidden: Boolean(entry.element.classList.contains("window-hidden")),
        minimized: Boolean(entry.minimized),
        maximized: Boolean(entry.maximized),
        zIndex: Number.parseInt(entry.element.style.zIndex || "0", 10) || 0,
        left: metrics.left,
        top: metrics.top,
        width: metrics.width,
        height: metrics.height,
        stackedHeight: Number.isFinite(entry.stackedHeight) ? entry.stackedHeight : 0,
        stackedExpandedHeight: Number.isFinite(entry.stackedExpandedHeight) ? entry.stackedExpandedHeight : 0,
        stackedMaximized: Boolean(entry.stackedMaximized)
      });
    });
    return payload;
  }

  function exportSavedLayoutState() {
    const payload = {
      version: 1,
      layoutMode,
      windows: []
    };
    windows.forEach((entry) => {
      if (!shouldPersistSavedLayoutWindow(entry)) return;
      const metrics = readWindowMetrics(entry);
      payload.windows.push({
        id: entry.id,
        kind: entry.kind,
        toolId: String(entry.element.dataset.toolId || ""),
        hidden: Boolean(entry.element.classList.contains("window-hidden")),
        minimized: Boolean(entry.minimized),
        maximized: Boolean(entry.maximized),
        zIndex: Number.parseInt(entry.element.style.zIndex || "0", 10) || 0,
        left: metrics.left,
        top: metrics.top,
        width: metrics.width,
        height: metrics.height,
        stackedHeight: Number.isFinite(entry.stackedHeight) ? entry.stackedHeight : 0,
        stackedExpandedHeight: Number.isFinite(entry.stackedExpandedHeight) ? entry.stackedExpandedHeight : 0,
        stackedMaximized: Boolean(entry.stackedMaximized)
      });
    });
    return payload;
  }

  function applySessionWindowEntry(entry, saved, options = {}) {
    if (!entry || !saved || typeof saved !== "object") return;
    if (!shouldPersistSessionWindow(entry)) return;

    entry.maximized = false;
    entry.element.classList.remove("window-maximized");

    const left = Number(saved.left);
    const top = Number(saved.top);
    const width = Number(saved.width);
    const height = Number(saved.height);
    if (Number.isFinite(left) && Number.isFinite(top) && Number.isFinite(width) && Number.isFinite(height) && width > 8 && height > 8) {
      entry.element.style.left = px(left);
      entry.element.style.top = px(top);
      entry.element.style.width = px(width);
      entry.element.style.height = px(height);
      entry.desktopPreferredBounds = { left, top, width, height };
    }

    entry.stackedHeight = Number.isFinite(saved.stackedHeight) ? Math.max(0, saved.stackedHeight) : entry.stackedHeight;
    entry.stackedExpandedHeight = Number.isFinite(saved.stackedExpandedHeight) ? Math.max(0, saved.stackedExpandedHeight) : entry.stackedExpandedHeight;
    entry.stackedMaximized = Boolean(saved.stackedMaximized);

    entry.minimized = Boolean(saved.minimized);
    entry.element.classList.toggle("window-minimized", entry.minimized);
    if (saved.hidden) entry.element.classList.add("window-hidden");
    else entry.element.classList.remove("window-hidden");

    if (!isStackedMode() && !entry.minimized && !saved.hidden && saved.maximized) {
      const metrics = readWindowMetrics(entry);
      entry.restoreBounds = { ...metrics };
      entry.maximized = true;
      entry.element.classList.add("window-maximized");
      const desktopRect = getDesktopRect();
      entry.element.style.left = "0px";
      entry.element.style.top = "0px";
      entry.element.style.width = `${Math.round(desktopRect.width)}px`;
      entry.element.style.height = `${Math.round(desktopRect.height)}px`;
    }

    if (Number.isFinite(saved.zIndex)) {
      entry.element.style.zIndex = `${saved.zIndex | 0}`;
    }
    clampWindow(entry, true, false);
    updateNormalizedBounds(entry);
    if (!options.skipLayoutRefresh) scheduleSharedSplitterRefresh();
    if (!isStackedMode() && !options.skipDesktopPersist) scheduleDesktopLayoutSave(80);
  }

  function applySavedLayoutEntry(entry, saved, options = {}) {
    if (!entry || !saved || typeof saved !== "object") return;
    if (!shouldPersistSavedLayoutWindow(entry)) return;

    entry.maximized = false;
    entry.element.classList.remove("window-maximized");

    const left = Number(saved.left);
    const top = Number(saved.top);
    const width = Number(saved.width);
    const height = Number(saved.height);
    if (Number.isFinite(left) && Number.isFinite(top) && Number.isFinite(width) && Number.isFinite(height) && width > 8 && height > 8) {
      entry.element.style.left = px(left);
      entry.element.style.top = px(top);
      entry.element.style.width = px(width);
      entry.element.style.height = px(height);
      if (entry.kind === "tool") {
        entry.desktopPreferredBounds = { left, top, width, height };
      }
    }

    entry.stackedHeight = Number.isFinite(saved.stackedHeight) ? Math.max(0, saved.stackedHeight) : entry.stackedHeight;
    entry.stackedExpandedHeight = Number.isFinite(saved.stackedExpandedHeight) ? Math.max(0, saved.stackedExpandedHeight) : entry.stackedExpandedHeight;
    entry.stackedMaximized = Boolean(saved.stackedMaximized);

    if (entry.kind === "native") {
      entry.minimized = false;
      entry.element.classList.remove("window-minimized");
      entry.element.classList.remove("window-hidden");
    } else {
      entry.minimized = Boolean(saved.minimized);
      entry.element.classList.toggle("window-minimized", entry.minimized);
      if (saved.hidden) entry.element.classList.add("window-hidden");
      else entry.element.classList.remove("window-hidden");
    }

    const hidden = entry.element.classList.contains("window-hidden");
    if (!isStackedMode() && !entry.minimized && !hidden && saved.maximized) {
      const metrics = readWindowMetrics(entry);
      entry.restoreBounds = { ...metrics };
      entry.maximized = true;
      entry.element.classList.add("window-maximized");
      const desktopRect = getDesktopRect();
      entry.element.style.left = "0px";
      entry.element.style.top = "0px";
      entry.element.style.width = `${Math.round(desktopRect.width)}px`;
      entry.element.style.height = `${Math.round(desktopRect.height)}px`;
    }

    if (Number.isFinite(saved.zIndex)) {
      entry.element.style.zIndex = `${saved.zIndex | 0}`;
    }

    clampWindow(entry, true, false);
    updateNormalizedBounds(entry);
    if (!options.skipLayoutRefresh) scheduleSharedSplitterRefresh();
    if (!isStackedMode() && !options.skipDesktopPersist) scheduleDesktopLayoutSave(80);
  }

  function applySessionWindowState(snapshot, options = {}) {
    if (!snapshot || typeof snapshot !== "object") return false;
    const savedWindows = Array.isArray(snapshot.windows) ? snapshot.windows : [];
    const nativeModeCompatible = isNativeLayoutModeCompatible(snapshot.layoutMode);
    pendingSessionWindowState.clear();

    savedWindows.forEach((saved) => {
      if (!saved || typeof saved !== "object") return;
      const id = String(saved.id || "");
      if (!id) return;
      pendingSessionWindowState.set(id, saved);
      const existing = windows.get(id);
      if (existing) {
        if (!nativeModeCompatible && existing.kind === "native") return;
        applySessionWindowEntry(existing, saved, {
          skipLayoutRefresh: true,
          skipDesktopPersist: true
        });
      }
    });

    if (!isStackedMode()) {
      enforceNativeDesktopDocking(false);
    }
    if (!options.skipLayoutRefresh) scheduleSharedSplitterRefresh();
    return true;
  }

  function applySavedLayoutState(snapshot, options = {}) {
    const normalized = normalizeSavedLayoutSnapshot(snapshot);
    if (!normalized) return false;
    const savedWindows = normalized.windows;
    const nativeModeCompatible = isNativeLayoutModeCompatible(normalized.layoutMode);
    pendingSavedLayoutState.clear();

    savedWindows.forEach((saved) => {
      const id = String(saved.id || "");
      if (!id) return;
      pendingSavedLayoutState.set(id, saved);
      const existing = windows.get(id);
      if (existing) {
        if (!nativeModeCompatible && existing.kind === "native") return;
        applySavedLayoutEntry(existing, saved, {
          skipLayoutRefresh: true,
          skipDesktopPersist: true
        });
      }
    });

    if (!isStackedMode()) {
      enforceNativeDesktopDocking(false);
    }
    if (!options.skipLayoutRefresh) scheduleSharedSplitterRefresh();
    if (!isStackedMode() && !options.skipDesktopPersist) scheduleDesktopLayoutSave(120);
    return true;
  }

  function saveLayoutToStorage() {
    const snapshot = exportSavedLayoutState();
    try {
      localStorage.setItem(SAVED_LAYOUT_STORAGE_KEY, JSON.stringify(snapshot));
      return { saved: true, snapshot };
    } catch {
      return { saved: false, snapshot: null };
    }
  }

  function loadLayoutFromStorage(options = {}) {
    try {
      const raw = localStorage.getItem(SAVED_LAYOUT_STORAGE_KEY);
      if (!raw) return { loaded: false, snapshot: null };
      const snapshot = normalizeSavedLayoutSnapshot(JSON.parse(raw));
      if (!snapshot) return { loaded: false, snapshot: null };
      if (options.apply !== false) {
        applySavedLayoutState(snapshot, options);
      }
      return { loaded: true, snapshot };
    } catch {
      return { loaded: false, snapshot: null };
    }
  }

  function resetBaseLayoutToDefault(options = {}) {
    pendingSavedLayoutState.clear();
    DESKTOP_NATIVE_ORDER.forEach((id) => {
      const entry = windows.get(id);
      if (!entry) return;
      const normalized = DEFAULT_DESKTOP_NATIVE_BOUNDS[id];
      if (normalized) {
        entry.normalizedBounds = {
          left: clamp01(normalized.left),
          top: clamp01(normalized.top),
          width: clamp01(normalized.width),
          height: clamp01(normalized.height)
        };
      }
      entry.maximized = false;
      entry.minimized = false;
      entry.stackedMaximized = false;
      entry.element.classList.remove("window-maximized");
      entry.element.classList.remove("window-minimized");
      entry.element.classList.remove("window-hidden");
    });

    if (isStackedMode()) {
      DESKTOP_NATIVE_ORDER.forEach((id) => {
        const entry = windows.get(id);
        if (!entry) return;
        entry.stackedUserSized = false;
        entry.stackedMaximized = false;
        entry.stackedRestoreHeight = 0;
        const minHeight = getStackedMinHeight(entry);
        const fallback = STACKED_DEFAULT_HEIGHTS[id] ?? minHeight;
        const height = Math.max(minHeight, fallback);
        entry.stackedHeight = height;
        entry.stackedExpandedHeight = height;
      });
      layoutStackedWindows(true);
      if (!options.skipLayoutRefresh) scheduleSharedSplitterRefresh();
      return true;
    }

    applyDefaultNativeDesktopLayout();
    if (!options.skipLayoutRefresh) scheduleSharedSplitterRefresh();
    if (!options.skipDesktopPersist) scheduleDesktopLayoutSave(120);
    return true;
  }

  function getOpenToolWindowIds() {
    const openIds = [];
    windows.forEach((entry) => {
      if (!shouldPersistSessionWindow(entry)) return;
      if (entry.element.classList.contains("window-hidden")) return;
      const toolId = String(entry.element.dataset.toolId || "").trim();
      if (!toolId) return;
      openIds.push(toolId);
    });
    return openIds;
  }

  function getWindowTitle(entry) {
    if (!entry || !(entry.element instanceof HTMLElement)) return "";
    const titleNode = entry.element.querySelector(".window-title");
    const title = String(titleNode?.textContent || "").trim();
    return title || entry.id;
  }

  function getWindowEntries() {
    return [...windows.values()].map((entry) => {
      const metrics = readWindowMetrics(entry);
      const hidden = entry.element.classList.contains("window-hidden");
      return {
        id: entry.id,
        kind: entry.kind,
        title: getWindowTitle(entry),
        hidden,
        minimized: Boolean(entry.minimized),
        maximized: Boolean(entry.maximized),
        visible: !hidden && !entry.minimized,
        isDialog: entry.element.classList.contains("dialog-window"),
        toolId: String(entry.element.dataset.toolId || "").trim(),
        metrics: {
          left: metrics.left,
          top: metrics.top,
          width: metrics.width,
          height: metrics.height
        }
      };
    });
  }

  function reveal(windowId, options = {}) {
    const resolvedId = resolveWindowId(windowId);
    const entry = windows.get(resolvedId);
    if (!entry) return false;

    if (options.show !== false) show(resolvedId);
    else focus(resolvedId, { skipRestore: true });

    if (isStackedMode() && options.scroll !== false && entry.element instanceof HTMLElement) {
      const behavior = options.behavior === "smooth" ? "smooth" : "auto";
      entry.element.scrollIntoView({
        behavior,
        block: "start",
        inline: "nearest"
      });
    }
    return true;
  }

  desktop.querySelectorAll(".desktop-window").forEach((win) => registerWindow(win));
  windows.forEach((entry) => ensureDesktopNormalizedBounds(entry));
  applyResponsiveClasses();
  if (isStackedMode()) {
    syncStackedHeightsFromCurrentLayout();
  } else if (!restoreDesktopLayoutForViewport()) {
    applyDefaultNativeDesktopLayout();
    captureDesktopLayoutSnapshot();
  }
  scheduleSharedSplitterRefresh();

  window.addEventListener("resize", () => {
    const nextLayoutMode = getViewportMode();
    const wasStacked = isStackedMode();
    if (!wasStacked && nextLayoutMode !== "desktop") {
      captureDesktopLayoutSnapshot();
      syncStackedHeightsFromCurrentLayout();
      windows.forEach((entry) => {
        if (!isStackedFlowEntry(entry) || !entry.maximized) return;
        entry.maximized = false;
        entry.element.classList.remove("window-maximized");
      });
    }
    const switchingToDesktop = wasStacked && nextLayoutMode === "desktop";
    layoutMode = nextLayoutMode;
    applyResponsiveClasses();

    if (nextLayoutMode === "desktop") {
      // Clear stacked content height before any desktop geometry math.
      desktop.style.height = "";
    }

    let restoredDesktopLayout = false;
    if (switchingToDesktop) {
      windows.forEach((entry) => ensureDesktopNormalizedBounds(entry));
      restoredDesktopLayout = restoreDesktopFromNormalizedBounds();
      if (!restoredDesktopLayout) {
        restoredDesktopLayout = restoreDesktopLayoutForViewport();
      }
      if (!restoredDesktopLayout) {
        applyDefaultNativeDesktopLayout();
        restoredDesktopLayout = true;
      }
      restoreToolsAfterStackedToDesktop();
    }

    windows.forEach((entry) => {
      if (isStackedMode() && isStackedFlowEntry(entry)) return;
      if (entry.maximized) {
        const desktopRect = getDesktopRect();
        entry.element.style.width = `${Math.round(desktopRect.width)}px`;
        entry.element.style.height = `${Math.round(desktopRect.height)}px`;
        entry.element.style.left = "0px";
        entry.element.style.top = "0px";
        return;
      }
      if (entry.element.classList.contains("dialog-window")) {
        clampDialogPosition(entry);
        return;
      }
      if (!restoredDesktopLayout) {
        if (entry.kind === "tool") {
          if (!applyToolDesktopPreferredBounds(entry)) applyNormalizedBounds(entry);
        } else {
          applyNormalizedBounds(entry);
        }
      }
      clampWindow(entry, true, false);
    });
    if (!isStackedMode()) {
      enforceNativeDesktopDocking(true);
    }
    scheduleSharedSplitterRefresh();
    if (!isStackedMode()) scheduleDesktopLayoutSave(260);
  });

  return {
    focus,
    pulse,
    registerWindow,
    unregisterWindow,
    show,
    reveal,
    hide,
    toggleMinimize,
    toggleMaximize,
    exportSessionWindowState,
    applySessionWindowState,
    exportSavedLayoutState,
    applySavedLayoutState,
    saveLayoutToStorage,
    loadLayoutFromStorage,
    resetBaseLayoutToDefault,
    getOpenToolWindowIds,
    getWindowEntries
  };
}

function setupEditor(refs, store, options = {}) {
  const { editor, editorSurface, editorHighlight, editorGutter, editorGutterLines, editorTabs, status } = refs;
  const HISTORY_LIMIT = 500;
  let fileCounter = 0;
  let suppressInput = false;
  let activeFileChangeHandler = typeof options.onActiveFileChange === "function" ? options.onActiveFileChange : null;
  let filesChangeGuard = typeof options.onBeforeFilesChange === "function" ? options.onBeforeFilesChange : null;
  let lastActiveFileChangeKey = "";

  function copyExtraFileFields(file) {
    const extra = {};
    if (!file || typeof file !== "object") return extra;
    Object.keys(file).forEach((key) => {
      if (
        key === "id"
        || key === "name"
        || key === "source"
        || key === "savedSource"
        || key === "undoStack"
        || key === "redoStack"
      ) {
        return;
      }
      extra[key] = file[key];
    });
    return extra;
  }

  function createFileId() {
    fileCounter += 1;
    return `file-${Date.now().toString(36)}-${fileCounter.toString(36)}`;
  }

  function ensureUniqueName(name, files, skipId = "") {
    const baseName = normalizeFilename(name);
    if (!files.some((file) => file.id !== skipId && file.name === baseName)) return baseName;

    const dot = baseName.lastIndexOf(".");
    const stem = dot > 0 ? baseName.slice(0, dot) : baseName;
    const ext = dot > 0 ? baseName.slice(dot) : "";
    let suffix = 1;
    let candidate = `${stem}_${suffix}${ext}`;
    while (files.some((file) => file.id !== skipId && file.name === candidate)) {
      suffix += 1;
      candidate = `${stem}_${suffix}${ext}`;
    }
    return candidate;
  }

  function normalizeFile(file, existing = []) {
    const source = String(file?.source ?? "");
    const savedSource = typeof file?.savedSource === "string" ? String(file.savedSource) : source;
    const undoSeed = Array.isArray(file?.undoStack) && file.undoStack.length ? file.undoStack.map((entry) => String(entry)) : [source];
    const undoStack = undoSeed[undoSeed.length - 1] === source ? undoSeed : [...undoSeed, source];
    const redoStack = Array.isArray(file?.redoStack) ? file.redoStack.map((entry) => String(entry)) : [];
    return {
      ...copyExtraFileFields(file),
      id: String(file?.id ?? createFileId()),
      name: ensureUniqueName(file?.name ?? "untitled.s", existing),
      source,
      savedSource,
      undoStack: undoStack.slice(-HISTORY_LIMIT),
      redoStack: redoStack.slice(0, HISTORY_LIMIT)
    };
  }

  function isDiscardableEmptyFile(file) {
    if (!file || typeof file !== "object") return false;
    const source = String(file.source ?? "").trim();
    const savedSource = String(file.savedSource ?? "").trim();
    return source.length === 0 && savedSource.length === 0;
  }

  function buildFilesForIncomingActiveFile(state, incomingFile) {
    const active = state.files.find((file) => file.id === state.activeFileId) || null;
    if (!isDiscardableEmptyFile(active)) return [...state.files, incomingFile];
    return state.files
      .filter((file) => file.id !== active.id)
      .concat(incomingFile);
  }

  function ensureState() {
    const state = store.getState();
    let files = Array.isArray(state.files) ? state.files : [];

    if (!files.length) {
      const fallback = normalizeFile({
        id: state.activeFileId || createFileId(),
        name: state.fileName || "untitled.s",
        source: state.sourceCode || ""
      });
      files = [fallback];
    }

    let needsMigration = false;
    const seen = [];
    const migrated = files.map((file) => {
      const normalized = normalizeFile(file, seen);
      seen.push(normalized);
      if (
        normalized.id !== file.id
        || normalized.name !== file.name
        || normalized.source !== file.source
        || normalized.savedSource !== file.savedSource
        || !Array.isArray(file.undoStack)
        || !Array.isArray(file.redoStack)
      ) {
        needsMigration = true;
      }
      return normalized;
    });
    files = needsMigration ? migrated : files;

    let activeFileId = state.activeFileId;
    let active = files.find((file) => file.id === activeFileId);
    if (!active) {
      active = files[0];
      activeFileId = active.id;
    }

    const patch = {};
    if (needsMigration || !Array.isArray(state.files) || state.files.length !== files.length || state.activeFileId !== activeFileId || state.sourceCode !== active.source || state.fileName !== active.name) {
      patch.files = files;
      patch.activeFileId = activeFileId;
      patch.sourceCode = active.source;
      patch.fileName = active.name;
      store.setState(patch);
    }

    return { files, activeFileId, active };
  }

  function notifyActiveFileChange(file) {
    if (typeof activeFileChangeHandler !== "function" || !file) return;
    const key = `${String(file.id || "")}|${String(file.name || "")}`;
    if (key === lastActiveFileChangeKey) return;
    lastActiveFileChangeKey = key;
    try {
      activeFileChangeHandler({ ...file });
    } catch {
      // Ignore callback errors to keep editor responsive.
    }
  }

  function highlightCodeFragment(fragment) {
    if (!fragment) return "";

    const stringLiterals = [];
    const withStringTokens = fragment.replace(/"(?:\\.|[^"\\])*"?/g, (match) => {
      const token = `\u0000${stringLiterals.length}\u0000`;
      stringLiterals.push(match);
      return token;
    });

    let html = escapeHtml(withStringTokens);
    html = html.replace(/(^|[\s,(])(\.[A-Za-z_][A-Za-z0-9_]*)/g, "$1<span class=\"editor-token-directive\">$2</span>");
    html = html.replace(/(\$[A-Za-z0-9_.$]+)/g, "<span class=\"editor-token-register\">$1</span>");
    html = html.replace(/(^|[\s,(])(-?(?:0x[0-9a-fA-F]+|\d+))/g, "$1<span class=\"editor-token-number\">$2</span>");
    html = html.replace(/^([\s]*)([A-Za-z_][A-Za-z0-9_.]*)/, "$1<span class=\"editor-token-opcode\">$2</span>");
    html = html.replace(/\u0000(\d+)\u0000/g, (_full, index) => {
      const original = stringLiterals[Number(index)] || "";
      return `<span class=\"editor-token-string\">${escapeHtml(original)}</span>`;
    });

    return html;
  }

  function highlightLine(line) {
    const commentIndex = line.indexOf("#");
    const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : "";

    let html = "";
    const labelMatch = codePart.match(/^(\s*)([A-Za-z_.$][A-Za-z0-9_.$]*:)(.*)$/);
    if (labelMatch) {
      html += escapeHtml(labelMatch[1]);
      html += `<span class=\"editor-token-label\">${escapeHtml(labelMatch[2])}</span>`;
      html += highlightCodeFragment(labelMatch[3]);
    } else {
      html += highlightCodeFragment(codePart);
    }

    if (commentPart) {
      html += `<span class=\"editor-token-comment\">${escapeHtml(commentPart)}</span>`;
    }

    return html.length ? html : " ";
  }

  function renderHighlightedSource(source) {
    return source.split("\n").map((line) => highlightLine(line)).join("\n");
  }

  function syncEditorScroll() {
    const scrollTop = editor.scrollTop || 0;
    const scrollLeft = editor.scrollLeft || 0;
    if (editorHighlight) editorHighlight.style.transform = `translate(${-scrollLeft}px, ${-scrollTop}px)`;
    if (editorGutterLines) editorGutterLines.style.transform = `translateY(${-scrollTop}px)`;
  }

  function updateEditorDecorations(text, lineCount) {
    const safeText = String(text ?? "");
    const totalLines = Number.isFinite(lineCount) ? lineCount : (safeText.length ? safeText.split("\n").length : 1);

    if (editorGutterLines) {
      editorGutterLines.textContent = Array.from({ length: Math.max(1, totalLines) }, (_entry, index) => String(index + 1)).join("\n");
    }

    if (editorGutter) {
      const digits = String(Math.max(1, totalLines)).length;
      const width = Math.max(28, 12 + digits * 8);
      editorGutter.style.width = `${width}px`;
    }

    if (editorHighlight) {
      const computed = window.getComputedStyle(editor);
      editorHighlight.style.fontFamily = computed.fontFamily;
      editorHighlight.style.fontSize = computed.fontSize;
      editorHighlight.style.lineHeight = computed.lineHeight;
      editorHighlight.innerHTML = renderHighlightedSource(safeText);
      editorHighlight.style.width = `${Math.max(editor.clientWidth, editor.scrollWidth)}px`;
      editorHighlight.style.height = `${Math.max(editor.clientHeight, editor.scrollHeight)}px`;
    }

    if (editorGutterLines) {
      const computed = window.getComputedStyle(editor);
      editorGutterLines.style.fontFamily = computed.fontFamily;
      editorGutterLines.style.fontSize = computed.fontSize;
      editorGutterLines.style.lineHeight = computed.lineHeight;
      editorGutterLines.style.height = `${Math.max(editor.clientHeight, editor.scrollHeight)}px`;
    }

    syncEditorScroll();
  }

  function updateStatus() {
    const text = editor.value;
    const lineCount = text.length === 0 ? 1 : text.split("\n").length;
    const upToCursor = text.slice(0, editor.selectionStart ?? 0);
    const lines = upToCursor.split("\n");
    const line = lines.length;
    const column = lines[lines.length - 1].length + 1;
    status.lines.textContent = translateText("lines: {count}", { count: lineCount });
    status.caret.textContent = translateText("Ln {line}, Col {column}", { line, column });
    updateEditorDecorations(text, lineCount);
  }

  function renderTabs() {
    if (!editorTabs) return;
    const { files, activeFileId } = ensureState();
    editorTabs.innerHTML = "";
    files.forEach((file) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `subtab-btn editor-file-tab${file.id === activeFileId ? " active" : ""}${file.readOnly === true ? " readonly" : ""}`;
      button.dataset.fileId = file.id;
      button.title = file.readOnly === true ? `${file.name} (${translateText("Read-only")})` : file.name;
      const dirty = file.source !== file.savedSource;
      const prefix = file.readOnly === true ? "[RO] " : "";
      button.textContent = dirty ? `*${prefix}${file.name}` : `${prefix}${file.name}`;
      editorTabs.appendChild(button);
    });
  }

  function syncEditorFromActive() {
    const { active } = ensureState();
    const cursor = editor.selectionStart ?? active.source.length;
    suppressInput = true;
    editor.value = active.source;
    editor.readOnly = active.readOnly === true;
    editor.setAttribute("aria-readonly", active.readOnly === true ? "true" : "false");
    editorSurface?.classList.toggle("readonly", active.readOnly === true);
    const clampedCursor = Math.min(cursor, active.source.length);
    editor.setSelectionRange(clampedCursor, clampedCursor);
    suppressInput = false;
    updateStatus();
  }

  function canApplyFiles(files, activeFileId, context = {}) {
    if (typeof filesChangeGuard !== "function") return true;
    try {
      return filesChangeGuard(
        files.map((file) => ({ ...file })),
        activeFileId,
        { ...context }
      ) !== false;
    } catch {
      return true;
    }
  }

  function applyFiles(files, activeFileId, syncEditor = true, context = {}) {
    const active = files.find((file) => file.id === activeFileId) || files[0];
    const normalizedFiles = files.map((file) => ({
      ...file,
      savedSource: typeof file.savedSource === "string" ? file.savedSource : String(file.source ?? ""),
      undoStack: (Array.isArray(file.undoStack) ? file.undoStack : [String(file.source ?? "")]).slice(-HISTORY_LIMIT),
      redoStack: (Array.isArray(file.redoStack) ? file.redoStack : []).slice(0, HISTORY_LIMIT)
    }));
    const safeActive = normalizedFiles.find((file) => file.id === active.id) || normalizedFiles[0];
    if (!canApplyFiles(normalizedFiles, safeActive.id, context)) {
      renderTabs();
      syncEditorFromActive();
      return null;
    }
    store.setState({
      files: normalizedFiles,
      activeFileId: safeActive.id,
      sourceCode: safeActive.source,
      fileName: safeActive.name
    });
    notifyActiveFileChange(safeActive);
    renderTabs();
    if (syncEditor) syncEditorFromActive();
    else updateStatus();
    return safeActive;
  }

  function activateFile(fileId) {
    const { files, activeFileId } = ensureState();
    if (!fileId || fileId === activeFileId) return;
    if (!files.some((file) => file.id === fileId)) return;
    applyFiles(files, fileId, true, { reason: "activate" });
    editor.focus();
  }

  function updateActiveSource(nextSource, options = {}) {
    const { pushHistory = true } = options;
    const { files, activeFileId } = ensureState();
    const idx = files.findIndex((file) => file.id === activeFileId);
    if (idx < 0) return;

    const current = files[idx];
    const source = String(nextSource);
    if (current.source === source) {
      updateStatus();
      return;
    }

    const updatedFiles = [...files];
    const undoStack = Array.isArray(current.undoStack) ? [...current.undoStack] : [current.source];
    let redoStack = [];
    if (pushHistory) {
      if (undoStack[undoStack.length - 1] !== source) undoStack.push(source);
    } else if (undoStack.length) {
      undoStack[undoStack.length - 1] = source;
    } else {
      undoStack.push(source);
    }

    updatedFiles[idx] = {
      ...current,
      source,
      undoStack: undoStack.slice(-HISTORY_LIMIT),
      redoStack
    };

    const applied = applyFiles(updatedFiles, activeFileId, false, { reason: "edit", changedFileId: activeFileId });
    if (!applied) return;
  }

  editor.addEventListener("input", () => {
    if (suppressInput) return;
    updateActiveSource(editor.value, { pushHistory: true });
    updateStatus();
  });
  editor.addEventListener("click", updateStatus);
  editor.addEventListener("keyup", updateStatus);
  editor.addEventListener("select", updateStatus);
  editor.addEventListener("scroll", syncEditorScroll);

  editorTabs?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const tab = target.closest("[data-file-id]");
    if (!(tab instanceof HTMLElement)) return;
    activateFile(tab.dataset.fileId || "");
  });

  ensureState();
  renderTabs();
  syncEditorFromActive();

  return {
    setSource(source) {
      updateActiveSource(source, { pushHistory: true });
      syncEditorFromActive();
    },
    setFiles(files, activeFileId = "") {
      const input = Array.isArray(files) ? files : [];
      const normalized = [];
      input.forEach((file) => {
        const next = normalizeFile(file, normalized);
        normalized.push(next);
      });
      if (!normalized.length) {
        normalized.push(normalizeFile({ id: createFileId(), name: "untitled.s", source: "" }, normalized));
      }
      const target = String(activeFileId || "").trim();
      const active = normalized.find((file) => file.id === target || file.name === target) || normalized[0];
      const applied = applyFiles(normalized, active.id, true, { reason: "setFiles" });
      return applied ? { ...applied } : null;
    },
    createFile({ name = "untitled.s", source = "" } = {}) {
      const state = ensureState();
      const safeName = ensureUniqueName(name, state.files);
      const file = normalizeFile({ id: createFileId(), name: safeName, source }, state.files);
      const applied = applyFiles(buildFilesForIncomingActiveFile(state, file), file.id, true, { reason: "createFile", file });
      return applied ? file : null;
    },
    openFile(name, source, activate = true, options = {}) {
      let resolvedActivate = activate;
      let resolvedOptions = options;
      if (activate && typeof activate === "object") {
        resolvedOptions = activate;
        resolvedActivate = activate.activate !== false;
      }
      const state = ensureState();
      const safeName = ensureUniqueName(name, state.files);
      const file = normalizeFile({ id: createFileId(), name: safeName, source, ...resolvedOptions }, state.files);
      const files = buildFilesForIncomingActiveFile(state, file);
      const applied = applyFiles(files, resolvedActivate ? file.id : state.activeFileId, resolvedActivate, { reason: "openFile", file });
      return applied ? file : null;
    },
    renameActive(name) {
      const { files, activeFileId } = ensureState();
      const idx = files.findIndex((file) => file.id === activeFileId);
      if (idx < 0) return null;
      const updated = [...files];
      const safeName = ensureUniqueName(name, files, activeFileId);
      updated[idx] = { ...updated[idx], name: safeName };
      const applied = applyFiles(updated, activeFileId, false, { reason: "rename" });
      if (!applied) return null;
      renderTabs();
      return updated[idx];
    },
    closeActive() {
      const { files, activeFileId } = ensureState();
      const idx = files.findIndex((file) => file.id === activeFileId);
      if (idx < 0) return null;

      if (files.length <= 1) {
        const replacement = normalizeFile({ id: createFileId(), name: "untitled.s", source: "" }, []);
        applyFiles([replacement], replacement.id, true, { reason: "close" });
        return { closed: files[idx], fallbackCreated: true, remaining: 1 };
      }

      const updated = files.filter((file) => file.id !== activeFileId);
      const nextIndex = Math.max(0, Math.min(idx, updated.length - 1));
      const nextActive = updated[nextIndex];
      applyFiles(updated, nextActive.id, true, { reason: "close" });
      return { closed: files[idx], fallbackCreated: false, remaining: updated.length };
    },
    closeAll() {
      const { files } = ensureState();
      const closedCount = files.length;
      const replacement = normalizeFile({ id: createFileId(), name: "untitled.s", source: "" }, []);
      applyFiles([replacement], replacement.id, true, { reason: "closeAll" });
      return { closedCount, replacement };
    },
    markActiveSaved() {
      const { files, activeFileId } = ensureState();
      const idx = files.findIndex((file) => file.id === activeFileId);
      if (idx < 0) return null;
      const updated = [...files];
      const active = updated[idx];
      updated[idx] = { ...active, savedSource: active.source };
      applyFiles(updated, activeFileId, false, { reason: "markSaved" });
      return updated[idx];
    },
    markProjectOwnedSaved() {
      const { files, activeFileId } = ensureState();
      const updated = files.map((file) => (
        file?.projectOwned === false
          ? file
          : { ...file, savedSource: String(file.source ?? "") }
      ));
      applyFiles(updated, activeFileId, false, { reason: "markProjectSaved" });
      return updated.map((file) => ({ ...file }));
    },
    getDirtyFiles() {
      const { files } = ensureState();
      return files
        .filter((file) => file.source !== file.savedSource)
        .map((file) => ({ ...file }));
    },
    hasDirtyFiles() {
      const { files } = ensureState();
      return files.some((file) => file.source !== file.savedSource);
    },
    isActiveDirty() {
      const { active } = ensureState();
      return active.source !== active.savedSource;
    },
    undo() {
      const { files, activeFileId } = ensureState();
      const idx = files.findIndex((file) => file.id === activeFileId);
      if (idx < 0) return false;
      const updatedFiles = [...files];
      const current = files[idx];
      const undoStack = Array.isArray(current.undoStack) ? [...current.undoStack] : [current.source];
      if (undoStack.length <= 1) return false;
      const currentSource = undoStack.pop();
      const previous = undoStack[undoStack.length - 1] ?? "";
      const redoStack = [currentSource, ...(Array.isArray(current.redoStack) ? current.redoStack : [])].slice(0, HISTORY_LIMIT);
      updatedFiles[idx] = { ...current, source: previous, undoStack, redoStack };
      applyFiles(updatedFiles, activeFileId, true, { reason: "undo" });
      return true;
    },
    redo() {
      const { files, activeFileId } = ensureState();
      const idx = files.findIndex((file) => file.id === activeFileId);
      if (idx < 0) return false;
      const updatedFiles = [...files];
      const current = files[idx];
      const redoStack = Array.isArray(current.redoStack) ? [...current.redoStack] : [];
      if (!redoStack.length) return false;
      const source = redoStack.shift();
      const undoStack = [...(Array.isArray(current.undoStack) ? current.undoStack : [current.source]), source].slice(-HISTORY_LIMIT);
      updatedFiles[idx] = { ...current, source, undoStack, redoStack };
      applyFiles(updatedFiles, activeFileId, true, { reason: "redo" });
      return true;
    },
    getActiveFile() {
      return ensureState().active;
    },
    getFiles() {
      const state = ensureState();
      return state.files.map((file) => ({ ...file }));
    },
    getFileMap() {
      const map = new Map();
      const state = ensureState();
      state.files.forEach((file) => map.set(file.name, file.source));
      return map;
    },
    activateFile(fileId) {
      activateFile(fileId);
      return ensureState().active;
    },
    activateFileByName(fileName) {
      const { files, activeFileId } = ensureState();
      const target = files.find((file) => file.name === String(fileName || "").trim());
      if (!target) return null;
      if (target.id !== activeFileId) activateFile(target.id);
      return ensureState().active;
    },
    refreshStatus() {
      updateStatus();
    },
    setActiveFileChangeHandler(handler, options = {}) {
      activeFileChangeHandler = typeof handler === "function" ? handler : null;
      lastActiveFileChangeKey = "";
      if (activeFileChangeHandler && options.emitCurrent !== false) {
        notifyActiveFileChange(ensureState().active);
      }
    },
    setFilesChangeGuard(handler) {
      filesChangeGuard = typeof handler === "function" ? handler : null;
    },
    focus() {
      editor.focus();
    }
  };
}

function createDialogSystem(windowManager, desktop, options = {}) {
  const windowId = String(options.windowId || "window-dialog-system").trim() || "window-dialog-system";
  const defaultLeft = String(options.left || "220px");
  const defaultTop = String(options.top || "150px");
  const defaultWidth = String(options.width || "460px");
  const defaultHeight = String(options.height || "200px");
  const windowTitle = String(options.title || "Dialog");
  const win = document.createElement("section");
  win.className = "desktop-window window-hidden tool-window dialog-window";
  win.id = windowId;
  win.style.left = defaultLeft;
  win.style.top = defaultTop;
  win.style.width = defaultWidth;
  win.style.height = defaultHeight;
  win.innerHTML = `
    <div class="window-titlebar">
      <span class="window-title" data-dialog-role="title">${escapeHtml(windowTitle)}</span>
      <div class="window-controls">
        <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
      </div>
    </div>
    <div class="window-content dialog-window-content">
      <textarea data-dialog-role="message" class="dialog-message" readonly spellcheck="false" wrap="soft"></textarea>
      <div data-dialog-role="form" class="dialog-form" hidden></div>
      <input data-dialog-role="input" class="run-io-input dialog-input" type="text" autocomplete="off">
      <div class="dialog-actions">
        <button class="tool-btn" data-dialog-role="cancel" type="button">Cancel</button>
        <button class="tool-btn primary" data-dialog-role="confirm" type="button">OK</button>
      </div>
    </div>
  `;

  desktop.appendChild(win);
  windowManager.registerWindow(win);
  const refreshDialogTranslations = translateStaticTree(win);

  const titleNode = win.querySelector('[data-dialog-role="title"]');
  const messageNode = win.querySelector('[data-dialog-role="message"]');
  const formNode = win.querySelector('[data-dialog-role="form"]');
  const inputNode = win.querySelector('[data-dialog-role="input"]');
  const confirmButton = win.querySelector('[data-dialog-role="confirm"]');
  const cancelButton = win.querySelector('[data-dialog-role="cancel"]');
  const titleCloseButton = win.querySelector('[data-win-action="close"]');

  const queue = [];
  let active = null;
  const fieldIdPrefix = `dialog-field-${windowId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const defaultSize = {
    width: win.style.width || "460px",
    height: win.style.height || "200px"
  };

  function setMessageContent(text, tone = "") {
    if (!(messageNode instanceof HTMLTextAreaElement)) return;
    messageNode.value = String(text || "");
    messageNode.classList.remove("info", "success", "error");
    const normalizedTone = String(tone || "").trim().toLowerCase();
    if (normalizedTone === "info" || normalizedTone === "success" || normalizedTone === "error") {
      messageNode.classList.add(normalizedTone);
    }
    messageNode.scrollTop = 0;
  }

  function setFormDisabled(disabled) {
    if (!(formNode instanceof HTMLElement)) return;
    formNode.querySelectorAll("input, select, textarea, button").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement || node instanceof HTMLButtonElement) {
        node.disabled = disabled;
      }
    });
  }

  function syncActiveButtons() {
    if (!active) return;
    const confirmHidden = active.hideConfirm === true;
    const cancelHidden = active.hideCancel === true;
    const allowCancelWhilePending = active.pendingConfirm === true && active.allowCancelWhilePending === true;
    confirmButton.hidden = confirmHidden;
    cancelButton.hidden = cancelHidden;
    confirmButton.disabled = active.confirmDisabled === true || active.pendingConfirm === true;
    cancelButton.disabled = active.cancelDisabled === true || (active.pendingConfirm === true && !allowCancelWhilePending);
    titleCloseButton.disabled = active.closeDisabled === true || (active.pendingConfirm === true && !allowCancelWhilePending);
  }

  function createActiveFormController(activeDialog) {
    return {
      getValues() {
        return collectFormValues();
      },
      setMessage(text, tone = "") {
        if (active !== activeDialog) return;
        activeDialog.message = String(text || "");
        activeDialog.messageTone = String(tone || "");
        setMessageContent(activeDialog.message, activeDialog.messageTone);
      },
      setBusy(busy = true, options = {}) {
        if (active !== activeDialog) return;
        const isBusy = busy === true;
        const allowCancelWhilePending = isBusy && options && typeof options === "object" && options.allowCancel === true;
        activeDialog.pendingConfirm = isBusy;
        activeDialog.allowCancelWhilePending = allowCancelWhilePending;
        activeDialog.confirmDisabled = isBusy;
        activeDialog.cancelDisabled = isBusy && !allowCancelWhilePending;
        activeDialog.closeDisabled = isBusy && !allowCancelWhilePending;
        setFormDisabled(isBusy);
        syncActiveButtons();
      },
      setActions(options = {}) {
        if (active !== activeDialog || !options || typeof options !== "object") return;
        if (Object.prototype.hasOwnProperty.call(options, "confirmLabel")) activeDialog.confirmLabel = String(options.confirmLabel || "");
        if (Object.prototype.hasOwnProperty.call(options, "cancelLabel")) activeDialog.cancelLabel = String(options.cancelLabel || "");
        if (Object.prototype.hasOwnProperty.call(options, "confirmDisabled")) activeDialog.confirmDisabled = options.confirmDisabled === true;
        if (Object.prototype.hasOwnProperty.call(options, "cancelDisabled")) activeDialog.cancelDisabled = options.cancelDisabled === true;
        if (Object.prototype.hasOwnProperty.call(options, "closeDisabled")) activeDialog.closeDisabled = options.closeDisabled === true;
        if (Object.prototype.hasOwnProperty.call(options, "hideConfirm")) activeDialog.hideConfirm = options.hideConfirm === true;
        if (Object.prototype.hasOwnProperty.call(options, "hideCancel")) activeDialog.hideCancel = options.hideCancel === true;
        confirmButton.textContent = activeDialog.confirmLabel || "OK";
        cancelButton.textContent = activeDialog.cancelLabel || "Cancel";
        syncActiveButtons();
      },
      setCloseOnly(label = "Close") {
        if (active !== activeDialog) return;
        activeDialog.pendingConfirm = false;
        activeDialog.hideConfirm = true;
        activeDialog.hideCancel = false;
        activeDialog.confirmDisabled = true;
        activeDialog.cancelDisabled = false;
        activeDialog.closeDisabled = false;
        activeDialog.cancelLabel = String(label || "Close");
        setFormDisabled(true);
        confirmButton.textContent = activeDialog.confirmLabel || "OK";
        cancelButton.textContent = activeDialog.cancelLabel || "Cancel";
        syncActiveButtons();
      },
      setFinalResult(result) {
        if (active !== activeDialog) return;
        activeDialog.finalResult = result;
      },
      setCancelHandler(handler = null) {
        if (active !== activeDialog) return;
        activeDialog.cancelHandler = typeof handler === "function" ? handler : null;
      },
      close(result) {
        if (active !== activeDialog) return;
        resolveActive(result ?? activeDialog.finalResult ?? { ok: false, value: null });
      }
    };
  }

  function renderForm(activeDialog) {
    if (!(formNode instanceof HTMLElement)) return;
    const sections = Array.isArray(activeDialog.sections) ? activeDialog.sections : [];
    formNode.innerHTML = sections.map((section, sectionIndex) => {
      const title = String(section?.title || "").trim();
      const description = String(section?.description || "").trim();
      const sectionLayout = String(section?.layout || "").trim().toLowerCase();
      const sectionClassName = String(section?.className || "").trim();
      const fields = Array.isArray(section?.fields) ? section.fields : [];
      const sectionClasses = [
        "dialog-form-section",
        sectionLayout === "table" ? "dialog-form-section-table" : "",
        sectionClassName
      ].filter(Boolean).join(" ");
      const fieldsClasses = [
        "dialog-form-fields",
        sectionLayout === "table" ? "dialog-form-fields-table" : ""
      ].filter(Boolean).join(" ");
      const fieldsMarkup = fields.map((field, fieldIndex) => {
        const fieldId = `${fieldIdPrefix}-${sectionIndex}-${fieldIndex}`;
        const type = String(field?.type || "text");
        const label = escapeHtml(String(field?.label || field?.name || ""));
        const help = String(field?.help || "").trim();
        const value = field?.value;
        if (type === "checkbox") {
          return `
            <label class="dialog-form-check" for="${fieldId}">
              <input id="${fieldId}" data-field-name="${escapeHtml(String(field?.name || ""))}" type="checkbox" ${value ? "checked" : ""}>
              <span>${label}</span>
            </label>
            ${help ? `<div class="dialog-form-help">${escapeHtml(help)}</div>` : ""}
          `;
        }
        if (type === "select") {
          const options = Array.isArray(field?.options) ? field.options : [];
          return `
            <label class="dialog-form-row${sectionLayout === "table" ? " dialog-form-row-inline" : ""}" for="${fieldId}">
              <span class="dialog-form-label">${label}</span>
              <select id="${fieldId}" data-field-name="${escapeHtml(String(field?.name || ""))}" class="dialog-form-control">
                ${options.map((option) => {
                  const optionValue = String(option?.value ?? "");
                  const optionLabel = String(option?.label ?? optionValue);
                  return `<option value="${escapeHtml(optionValue)}" ${String(value ?? "") === optionValue ? "selected" : ""}>${escapeHtml(optionLabel)}</option>`;
                }).join("")}
              </select>
            </label>
            ${help ? `<div class="dialog-form-help">${escapeHtml(help)}</div>` : ""}
          `;
        }
        const min = Number.isFinite(field?.min) ? ` min="${field.min}"` : "";
        const max = Number.isFinite(field?.max) ? ` max="${field.max}"` : "";
        const step = Number.isFinite(field?.step) ? ` step="${field.step}"` : "";
        const inputType = type === "number"
          ? "number"
          : (type === "password" ? "password" : "text");
        return `
          <label class="dialog-form-row${sectionLayout === "table" ? " dialog-form-row-inline" : ""}" for="${fieldId}">
            <span class="dialog-form-label">${label}</span>
            <input
              id="${fieldId}"
              data-field-name="${escapeHtml(String(field?.name || ""))}"
              class="dialog-form-control"
              type="${inputType}"
              value="${escapeHtml(String(value ?? ""))}"
              ${min}${max}${step}
            >
          </label>
          ${help ? `<div class="dialog-form-help">${escapeHtml(help)}</div>` : ""}
        `;
      }).join("");
      return `
        <section class="${sectionClasses}">
          ${title ? `<h3 class="dialog-form-section-title">${escapeHtml(title)}</h3>` : ""}
          ${description ? `<p class="dialog-form-section-description">${escapeHtml(description)}</p>` : ""}
          <div class="${fieldsClasses}">${fieldsMarkup}</div>
        </section>
      `;
    }).join("");
  }

  function collectFormValues() {
    if (!(formNode instanceof HTMLElement)) return {};
    const values = {};
    formNode.querySelectorAll("[data-field-name]").forEach((node) => {
      if (!(node instanceof HTMLInputElement) && !(node instanceof HTMLSelectElement) && !(node instanceof HTMLTextAreaElement)) return;
      const name = String(node.dataset.fieldName || "").trim();
      if (!name) return;
      values[name] = node instanceof HTMLInputElement && node.type === "checkbox"
        ? node.checked
        : node.value;
    });
    return values;
  }

  function applyActiveDialog() {
    if (!active) {
      windowManager.hide(win.id);
      return;
    }

    win.style.width = active.width || defaultSize.width;
    win.style.height = active.height || defaultSize.height;
    titleNode.textContent = active.title || "Dialog";
    const baseMessage = String(active.message || "");
    const contextText = String(active.contextText || "");
    const contextLabel = String(active.contextLabel || "");
    if (!contextText) {
      setMessageContent(baseMessage, active.messageTone || "");
    } else {
      const contextBlock = contextLabel ? `${contextLabel}:\n${contextText}` : contextText;
      setMessageContent(baseMessage ? `${baseMessage}\n\n${contextBlock}` : contextBlock, active.messageTone || "");
    }
    confirmButton.textContent = active.confirmLabel || "OK";
    cancelButton.textContent = active.cancelLabel || "Cancel";

    if (active.kind === "prompt") {
      formNode.hidden = true;
      formNode.innerHTML = "";
      inputNode.hidden = false;
      inputNode.value = active.defaultValue || "";
      inputNode.placeholder = active.placeholder || "";
      setFormDisabled(false);
    } else if (active.kind === "form") {
      renderForm(active);
      formNode.hidden = false;
      inputNode.hidden = true;
      inputNode.value = "";
      inputNode.placeholder = "";
      setFormDisabled(active.formDisabled === true);
    } else {
      formNode.hidden = true;
      formNode.innerHTML = "";
      inputNode.hidden = true;
      inputNode.value = "";
      inputNode.placeholder = "";
      setFormDisabled(false);
    }

    syncActiveButtons();

    windowManager.show(win.id);
    if (active.kind === "prompt") {
      inputNode.focus();
      inputNode.select();
    } else if (active.kind === "form") {
      const firstInput = formNode.querySelector("input:not([type='checkbox']), select, textarea, input[type='checkbox']");
      if (firstInput instanceof HTMLElement) firstInput.focus();
    } else {
      confirmButton.focus();
    }
  }

  function dequeueNext() {
    if (active || !queue.length) return;
    active = queue.shift();
    applyActiveDialog();
  }

  function resolveActive(result) {
    if (!active) return;
    const current = active;
    active = null;
    windowManager.hide(win.id);
    try {
      current.resolve(result);
    } finally {
      dequeueNext();
    }
  }

  function closeAsCancel() {
    if (!active) return;
    const allowCancelWhilePending = active.pendingConfirm === true && active.allowCancelWhilePending === true;
    if (active.closeDisabled === true) return;
    if (active.pendingConfirm === true && !allowCancelWhilePending) return;
    if (typeof active.cancelHandler === "function") {
      try {
        active.cancelHandler();
      } catch {}
    }
    resolveActive(active.finalResult ?? { ok: false, value: null });
  }

  confirmButton?.addEventListener("click", async () => {
    if (!active) return;
    if (active.kind === "prompt") {
      resolveActive({ ok: true, value: inputNode.value });
      return;
    }
    if (active.kind === "form") {
      if (typeof active.beforeResolve === "function") {
        const activeDialog = active;
        const controller = createActiveFormController(activeDialog);
        const values = collectFormValues();
        try {
          activeDialog.pendingConfirm = true;
          syncActiveButtons();
          const resolution = await activeDialog.beforeResolve(values, controller);
          if (active !== activeDialog) return;
          activeDialog.pendingConfirm = false;
          syncActiveButtons();
          if (resolution && typeof resolution === "object" && Object.prototype.hasOwnProperty.call(resolution, "result")) {
            resolveActive(resolution.result);
            return;
          }
          if (resolution && resolution.close === false) return;
        } catch (error) {
          if (active !== activeDialog) return;
          activeDialog.pendingConfirm = false;
          syncActiveButtons();
          controller.setMessage(String(error?.message || error || "Operation failed."), "error");
          return;
        }
      }
      resolveActive({ ok: true, value: collectFormValues() });
      return;
    }
    resolveActive({ ok: true, value: true });
  });

  cancelButton?.addEventListener("click", closeAsCancel);
  titleCloseButton?.addEventListener("click", closeAsCancel);

  inputNode?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmButton?.click();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeAsCancel();
    }
  });

  formNode?.addEventListener("keydown", (event) => {
    if (!(event.target instanceof HTMLElement)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeAsCancel();
      return;
    }
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
      event.preventDefault();
      confirmButton?.click();
    }
  });

  return {
    prompt(options = {}) {
      return new Promise((resolve) => {
        queue.push({
          kind: "prompt",
          title: String(options.title || translateText("Input")),
          message: String(options.message || ""),
          contextText: String(options.contextText || ""),
          contextLabel: options.contextLabel === undefined
            ? translateText("Recent Run I/O")
            : String(options.contextLabel ?? ""),
          defaultValue: String(options.defaultValue || ""),
          placeholder: String(options.placeholder || ""),
          confirmLabel: String(options.confirmLabel || translateText("OK")),
          cancelLabel: String(options.cancelLabel || translateText("Cancel")),
          resolve
        });
        dequeueNext();
      });
    },
    confirm(options = {}) {
      return new Promise((resolve) => {
        queue.push({
          kind: "confirm",
          title: String(options.title || translateText("Confirm")),
          message: String(options.message || ""),
          contextText: String(options.contextText || ""),
          contextLabel: options.contextLabel === undefined
            ? translateText("Recent Run I/O")
            : String(options.contextLabel ?? ""),
          confirmLabel: String(options.confirmLabel || translateText("OK")),
          cancelLabel: String(options.cancelLabel || translateText("Cancel")),
          resolve
        });
        dequeueNext();
      }).then((result) => Boolean(result?.ok));
    },
    form(options = {}) {
      return new Promise((resolve) => {
        queue.push({
          kind: "form",
          title: String(options.title || translateText("Dialog")),
          message: String(options.message || ""),
          contextText: String(options.contextText || ""),
          contextLabel: options.contextLabel === undefined
            ? translateText("Recent Run I/O")
            : String(options.contextLabel ?? ""),
          confirmLabel: String(options.confirmLabel || translateText("OK")),
          cancelLabel: String(options.cancelLabel || translateText("Cancel")),
          width: String(options.width || "520px"),
          height: String(options.height || "430px"),
          sections: Array.isArray(options.sections) ? options.sections : [],
          beforeResolve: typeof options.beforeResolve === "function" ? options.beforeResolve : null,
          messageTone: String(options.messageTone || ""),
          hideConfirm: options.hideConfirm === true,
          hideCancel: options.hideCancel === true,
          confirmDisabled: options.confirmDisabled === true,
          cancelDisabled: options.cancelDisabled === true,
          closeDisabled: options.closeDisabled === true,
          allowCancelWhilePending: false,
          cancelHandler: null,
          formDisabled: options.formDisabled === true,
          finalResult: Object.prototype.hasOwnProperty.call(options, "finalResult") ? options.finalResult : null,
          resolve
        });
        dequeueNext();
      });
    },
    close() {
      closeAsCancel();
      queue.length = 0;
      windowManager.hide(win.id);
    },
    destroy() {
      queue.length = 0;
      closeAsCancel();
      windowManager.hide(win.id);
      if (typeof windowManager.unregisterWindow === "function") {
        windowManager.unregisterWindow(win.id);
      } else {
        win.remove();
      }
    },
    refreshTranslations() {
      refreshDialogTranslations();
      if (active) applyActiveDialog();
    }
  };
}
function createModeController(refs, windowManager) {
  const fileKindsModule = ((typeof window !== "undefined" ? window.WebMarsModules : globalThis.WebMarsModules) || {}).fileKinds || {};
  const projectButton = refs.mode.project;
  const editorButton = refs.mode.editor;
  const executeButton = refs.mode.execute;
  const projectPanel = refs.mode.panelProject;
  const editorPanel = refs.mode.panelEditor;
  const executePanel = refs.mode.panelExecute;
  const editorWorkspace = refs.mode.editorWorkspace;
  const editorHost = refs.mode.hostEditor;
  let authoringMode = "assembly";
  let mode = "editor";

  function normalizeMode(nextMode) {
    const raw = String(nextMode || "").trim().toLowerCase();
    if (raw === "run") return "execute";
    if (raw === "project" || raw === "execute" || raw === "editor") return raw;
    if (raw === "edit" || raw === "authoring" || raw === "assembly" || raw === "c0") return "editor";
    return "editor";
  }

  function moveEditorWorkspace() {
    if (!(editorWorkspace instanceof HTMLElement)) return;
    if (!(editorHost instanceof HTMLElement)) return;
    if (editorWorkspace.parentElement === editorHost) return;
    editorHost.appendChild(editorWorkspace);
  }

  function apply(nextMode) {
    const raw = String(nextMode || "").trim().toLowerCase();
    if (raw === "c0" || raw === "assembly") authoringMode = raw;
    mode = normalizeMode(nextMode);
    if (mode === "editor") moveEditorWorkspace();

    projectButton?.classList.toggle("active", mode === "project");
    editorButton?.classList.toggle("active", mode === "editor");
    executeButton?.classList.toggle("active", mode === "execute");

    projectPanel?.classList.toggle("active", mode === "project");
    editorPanel?.classList.toggle("active", mode === "editor");
    executePanel?.classList.toggle("active", mode === "execute");

    windowManager.focus("window-main");
  }

  function syncForFileName(fileName, options = {}) {
    const name = String(fileName || "").trim();
    if (!name) return authoringMode;
    let target = null;
    const classification = typeof fileKindsModule.classifyFileName === "function"
      ? fileKindsModule.classifyFileName(name)
      : {
          isCFamily: /\.(c|c0|h|h0)$/i.test(name),
          isAssemblySource: /\.(s|asm|mips)$/i.test(name)
        };
    if (classification.isCFamily) target = "c0";
    else if (classification.isAssemblySource) target = "assembly";
    if (!target) return authoringMode;
    authoringMode = target;
    if (options.activate !== false) apply("editor");
    return target;
  }

  projectButton?.addEventListener("click", () => apply("project"));
  editorButton?.addEventListener("click", () => apply("editor"));
  executeButton?.addEventListener("click", () => apply("execute"));

  apply("editor");

  return {
    setMode: apply,
    getMode: () => mode,
    getAuthoringMode: () => authoringMode,
    syncForFileName
  };
}
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function scrollElementWithinContainer(target, container, options = {}) {
  if (!(target instanceof HTMLElement) || !(container instanceof HTMLElement)) return;
  const topInset = Number.isFinite(options.topInset) ? Math.max(0, options.topInset) : 0;
  const bottomInset = Number.isFinite(options.bottomInset) ? Math.max(0, options.bottomInset) : 0;
  const margin = Number.isFinite(options.margin) ? Math.max(0, options.margin) : 4;
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetTop = targetRect.top - containerRect.top + container.scrollTop;
  const targetBottom = targetRect.bottom - containerRect.top + container.scrollTop;
  const viewTop = container.scrollTop + topInset;
  const viewBottom = container.scrollTop + container.clientHeight - bottomInset;

  if ((targetTop - margin) < viewTop) {
    container.scrollTop = Math.max(0, targetTop - topInset - margin);
    return;
  }
  if ((targetBottom + margin) > viewBottom) {
    container.scrollTop = Math.max(0, targetBottom + bottomInset + margin - container.clientHeight);
  }
}

  function createExecutePane(refs, engine) {
  const { execute } = refs;
  const DATA_COLUMNS = 8;
  const DATA_ROWS_PER_PAGE = 16;
  const WORD_SIZE_BYTES = 4;
  const DATA_PAGE_BYTES = DATA_COLUMNS * DATA_ROWS_PER_PAGE * WORD_SIZE_BYTES;
  const DATA_ROW_BYTES = DATA_COLUMNS * WORD_SIZE_BYTES;
  const DATA_VIEW_MAX_RANGE = 0x01000000;

  function alignToDataRow(address) {
    const value = Number(address) >>> 0;
    return (value - (value % DATA_ROW_BYTES)) >>> 0;
  }

  const DATA_BASE_PRESETS = [
    { key: "data", label: "0x10010000 (.data)", resolve: () => DEFAULT_MEMORY_MAP.dataBase >>> 0 },
    { key: "extern", label: "0x10000000 (.extern)", resolve: () => 0x10000000 },
    { key: "heap", label: "0x10040000 (heap)", resolve: () => DEFAULT_MEMORY_MAP.heapBase >>> 0 },
    { key: "gp", label: "current $gp", resolve: (snapshot) => alignToDataRow(getRegisterUnsigned(snapshot, "$gp", 0x10008000)) },
    { key: "sp", label: "current $sp", resolve: (snapshot) => alignToDataRow(getRegisterUnsigned(snapshot, "$sp", DEFAULT_MEMORY_MAP.stackBase >>> 0)) },
    { key: "text", label: "0x00400000 (.text)", resolve: () => DEFAULT_MEMORY_MAP.textBase >>> 0 },
    { key: "kdata", label: "0x90000000 (.kdata)", resolve: () => 0x90000000 },
    { key: "mmio", label: "0xffff0000 (MMIO)", resolve: () => DEFAULT_MEMORY_MAP.mmioBase >>> 0 }
  ];

  const PRESET_KEYS = new Set(DATA_BASE_PRESETS.map((preset) => preset.key));

  function getRegisterUnsigned(snapshot, name, fallback) {
    if (snapshot?.registers?.length) {
      const register = snapshot.registers.find((entry) => entry.name === name);
      if (register && Number.isFinite(register.valueUnsigned)) return register.valueUnsigned >>> 0;
      if (register && Number.isFinite(register.value)) return register.value >>> 0;
    }
    return fallback >>> 0;
  }

  function normalizeBaseSelection(value) {
    const key = String(value ?? "").trim();
    return PRESET_KEYS.has(key) ? key : "data";
  }

  function resolveBaseAddress(selection, snapshot) {
    const preset = DATA_BASE_PRESETS.find((entry) => entry.key === selection);
    if (!preset) return DEFAULT_MEMORY_MAP.dataBase >>> 0;
    const resolved = preset.resolve(snapshot);
    return Number.isFinite(resolved) ? (resolved >>> 0) : (DEFAULT_MEMORY_MAP.dataBase >>> 0);
  }

  const dataState = {
    baseSelection: normalizeBaseSelection(execute.dataBaseSelect?.value ?? "data"),
    pageOffset: 0,
    hexAddresses: execute.dataHexAddresses?.checked !== false,
    hexValues: execute.dataHexValues?.checked !== false,
    ascii: execute.dataAscii?.checked === true
  };

  if (execute.dataBaseSelect) {
    execute.dataBaseSelect.value = dataState.baseSelection;
  }

  let lastSnapshot = null;
  let lastRenderOptions = {};

  const executeSplitState = {
    ratio: 0.56,
    minPaneHeight: 120,
    splitterHeight: 6
  };

  function applyExecuteSplit() {
    const executeWrap = refs.root.querySelector("#main-panel-execute .execute-wrap");
    if (!executeWrap || !execute.splitter) return;
    const total = executeWrap.clientHeight;
    if (total <= (executeSplitState.minPaneHeight * 2 + executeSplitState.splitterHeight)) {
      executeWrap.style.gridTemplateRows = `minmax(${executeSplitState.minPaneHeight}px, 1fr) ${executeSplitState.splitterHeight}px minmax(${executeSplitState.minPaneHeight}px, 1fr)`;
      return;
    }

    const available = total - executeSplitState.splitterHeight;
    const top = Math.round(Math.max(
      executeSplitState.minPaneHeight,
      Math.min(available - executeSplitState.minPaneHeight, available * executeSplitState.ratio)
    ));

    executeWrap.style.gridTemplateRows = `${top}px ${executeSplitState.splitterHeight}px minmax(${executeSplitState.minPaneHeight}px, 1fr)`;
  }

  (function setupExecuteSplitter() {
    const executeWrap = refs.root.querySelector("#main-panel-execute .execute-wrap");
    const splitter = execute.splitter;
    if (!executeWrap || !splitter) return;

    let dragState = null;

    const onPointerMove = (event) => {
      if (!dragState) return;
      event.preventDefault();
      const delta = event.clientY - dragState.startY;
      const available = dragState.wrapHeight - executeSplitState.splitterHeight;
      const nextTop = Math.max(
        executeSplitState.minPaneHeight,
        Math.min(available - executeSplitState.minPaneHeight, dragState.startTop + delta)
      );
      executeSplitState.ratio = nextTop / available;
      applyExecuteSplit();
    };

    const stopDrag = () => {
      if (!dragState) return;
      dragState = null;
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDrag);
    };

    splitter.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const rows = getComputedStyle(executeWrap).gridTemplateRows.split(" ");
      const currentTop = Number.parseFloat(rows[0]) || (executeWrap.clientHeight * executeSplitState.ratio);
      dragState = {
        startY: event.clientY,
        startTop: currentTop,
        wrapHeight: executeWrap.clientHeight
      };
      document.body.style.cursor = "row-resize";
      window.addEventListener("pointermove", onPointerMove, { passive: false });
      window.addEventListener("pointerup", stopDrag);
      splitter.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver(() => applyExecuteSplit());
      observer.observe(executeWrap);
    } else {
      window.addEventListener("resize", applyExecuteSplit);
    }

    applyExecuteSplit();
  })();

  const signed32 = (value) => value | 0;

  function asciiFromWord(value) {
    let text = "";
    for (let i = 3; i >= 0; i -= 1) {
      const code = (value >>> (i * 8)) & 0xff;
      text += code >= 32 && code <= 126 ? String.fromCharCode(code) : DEFAULT_SETTINGS.asciiNonPrint;
    }
    return text;
  }

  function formatAddress(address) {
    return dataState.hexAddresses ? toHex(address >>> 0) : `${address >>> 0}`;
  }

  function formatProgramAddress(address, addressHex, displayAddressesHex) {
    if (displayAddressesHex !== false) {
      if (typeof addressHex === "string" && addressHex.trim().length) return addressHex;
      return toHex(Number.isFinite(address) ? (address >>> 0) : 0);
    }
    return `${Number.isFinite(address) ? (address >>> 0) : 0}`;
  }

  function formatValue(value) {
    if (dataState.ascii) return asciiFromWord(value >>> 0);
    return dataState.hexValues ? toHex(value >>> 0) : `${signed32(value)}`;
  }

  function getPageStart(snapshot) {
    const baseAddress = resolveBaseAddress(dataState.baseSelection, snapshot);
    return (baseAddress + dataState.pageOffset) >>> 0;
  }

  function updateDataNavButtons() {
    if (execute.dataNavPrev) execute.dataNavPrev.disabled = dataState.pageOffset === 0;
    if (execute.dataNavNext) execute.dataNavNext.disabled = dataState.pageOffset >= (DATA_VIEW_MAX_RANGE - DATA_PAGE_BYTES);
  }

  function rerender() {
    if (!lastSnapshot) return;
    api.render(lastSnapshot, lastRenderOptions);
  }

  function refreshBaseOptions(snapshot) {
    if (!execute.dataBaseSelect) return;
    DATA_BASE_PRESETS.forEach((preset) => {
      const option = execute.dataBaseSelect.querySelector(`option[value="${preset.key}"]`);
      if (!option) return;
      if (preset.key === "gp" || preset.key === "sp") {
        const current = resolveBaseAddress(preset.key, snapshot);
        option.textContent = translateText("{label} ({address})", {
          label: translateText(preset.label),
          address: toHex(current)
        });
        return;
      }
      option.textContent = translateText(preset.label);
    });
    execute.dataBaseSelect.value = dataState.baseSelection;
  }

  function addressInSelectedRange(address, selection, snapshot) {
    const base = resolveBaseAddress(selection, snapshot);
    if (address < base) return false;
    return (address - base) < DATA_VIEW_MAX_RANGE;
  }

  function pickSelectionForAddress(address, snapshot) {
    if (addressInSelectedRange(address, dataState.baseSelection, snapshot)) return dataState.baseSelection;
    for (const preset of DATA_BASE_PRESETS) {
      if (addressInSelectedRange(address, preset.key, snapshot)) return preset.key;
    }
    return dataState.baseSelection;
  }

  function getLatestChangedAddress(changedDataAddresses) {
    let latest = null;
    changedDataAddresses.forEach((address) => {
      latest = address >>> 0;
    });
    return latest;
  }

  function isCompactDataControlsMode() {
    return refs.root?.classList?.contains("desktop-stacked") === true
      || refs.windows?.desktop?.classList?.contains("desktop-stacked") === true
      || (window.innerWidth || 0) < 800;
  }

  function refreshDataControlLabels() {
    const compact = isCompactDataControlsMode();
    if (execute.dataHexAddressesLabel instanceof HTMLElement) {
      execute.dataHexAddressesLabel.lastChild?.remove?.();
      execute.dataHexAddressesLabel.append(` ${translateText(compact ? "Hex Addr." : "Hexadecimal Addresses")}`);
    }
    if (execute.dataHexValuesLabel instanceof HTMLElement) {
      execute.dataHexValuesLabel.lastChild?.remove?.();
      execute.dataHexValuesLabel.append(` ${translateText(compact ? "Hex. Val." : "Hexadecimal Values")}`);
    }

    const suffixes = ["0", "4", "8", "c", "10", "14", "18", "1c"];
    execute.dataHeaders?.forEach((header, index) => {
      if (!(header instanceof HTMLElement)) return;
      const suffix = suffixes[index] || "0";
      header.textContent = compact ? `Value+${suffix}` : `Value (+${suffix})`;
    });
  }

  execute.dataNavPrev?.addEventListener("click", () => {
    dataState.pageOffset = Math.max(0, dataState.pageOffset - DATA_PAGE_BYTES);
    rerender();
  });

  execute.dataNavNext?.addEventListener("click", () => {
    dataState.pageOffset = Math.min(DATA_VIEW_MAX_RANGE - DATA_PAGE_BYTES, dataState.pageOffset + DATA_PAGE_BYTES);
    rerender();
  });

  execute.dataBaseSelect?.addEventListener("change", () => {
    dataState.baseSelection = normalizeBaseSelection(execute.dataBaseSelect.value);
    dataState.pageOffset = 0;
    rerender();
  });

  execute.dataHexAddresses?.addEventListener("change", () => {
    dataState.hexAddresses = execute.dataHexAddresses.checked;
    rerender();
  });

  execute.dataHexValues?.addEventListener("change", () => {
    dataState.hexValues = execute.dataHexValues.checked;
    rerender();
  });

  execute.dataAscii?.addEventListener("change", () => {
    dataState.ascii = execute.dataAscii.checked;
    rerender();
  });

  window.addEventListener("resize", refreshDataControlLabels);

  const api = {
    render(snapshot, options = {}) {
      const changedDataAddresses = options.changedDataAddresses ?? new Set();
      const focusDataAddress = Number.isFinite(options.focusDataAddress) ? (options.focusDataAddress >>> 0) : null;
      const disableHighlights = options.disableHighlights === true;
      const disableAutoScroll = options.disableAutoScroll === true;
      const displayAddressesHex = options.displayAddressesHex !== false;
      lastSnapshot = snapshot;
      lastRenderOptions = {
        ...options,
        changedDataAddresses: new Set(changedDataAddresses),
        focusDataAddress
      };

      execute.textBody.innerHTML = snapshot.textRows.length
        ? snapshot.textRows.map((row) => {
            const checked = row.breakpoint ? "checked" : "";
            const classes = [];
            if (row.isCurrent && !disableHighlights) classes.push("current-row", "updated-row");
            const cls = classes.join(" ");
            return `<tr class="${cls}" data-text-address="${row.address}"><td><input type="checkbox" data-breakpoint-address="${row.address}" ${checked}></td><td>${formatProgramAddress(row.address, row.addressHex, displayAddressesHex)}</td><td>${row.code}</td><td>${escapeHtml(row.basic)}</td><td>${escapeHtml(row.source)}</td></tr>`;
          }).join("")
        : `<tr><td colspan="5" class="muted">${escapeHtml(translateText("No text segment loaded."))}</td></tr>`;

      execute.labelsList.innerHTML = snapshot.labels.length
        ? snapshot.labels.map((entry) => `<li>${escapeHtml(entry.label)} = ${formatProgramAddress(entry.address, entry.addressHex, displayAddressesHex)}</li>`).join("")
        : `<li class="muted">${escapeHtml(translateText("No labels"))}</li>`;

      refreshBaseOptions(snapshot);

      const latestChangedAddress = getLatestChangedAddress(changedDataAddresses);
      const activeDataAddress = focusDataAddress ?? latestChangedAddress;
      const currentWriteAddress = changedDataAddresses.size
        ? ((focusDataAddress != null && changedDataAddresses.has(focusDataAddress)) ? focusDataAddress : latestChangedAddress)
        : null;
      if (currentWriteAddress != null) {
        const nextSelection = pickSelectionForAddress(currentWriteAddress, snapshot);
        if (nextSelection !== dataState.baseSelection) {
          dataState.baseSelection = nextSelection;
          if (execute.dataBaseSelect) execute.dataBaseSelect.value = nextSelection;
        }

        const baseAddress = resolveBaseAddress(dataState.baseSelection, snapshot);
        if (currentWriteAddress >= baseAddress && (currentWriteAddress - baseAddress) < DATA_VIEW_MAX_RANGE) {
          const relative = currentWriteAddress - baseAddress;
          dataState.pageOffset = Math.floor(relative / DATA_PAGE_BYTES) * DATA_PAGE_BYTES;
        }
      }

      const pageStart = getPageStart(snapshot);
      const memoryWords = snapshot.memoryWords instanceof Map ? snapshot.memoryWords : new Map(snapshot.memoryWords ?? []);
      const rows = [];
      for (let rowIndex = 0; rowIndex < DATA_ROWS_PER_PAGE; rowIndex += 1) {
        const rowAddress = (pageStart + rowIndex * DATA_COLUMNS * WORD_SIZE_BYTES) >>> 0;
        const valueCells = [];

        for (let col = 0; col < DATA_COLUMNS; col += 1) {
          const cellAddress = (rowAddress + col * WORD_SIZE_BYTES) >>> 0;
          const rawValue = memoryWords.get(cellAddress) ?? 0;
          const isActiveCell = activeDataAddress != null && cellAddress === activeDataAddress;
          const cellUpdated = currentWriteAddress != null && cellAddress === currentWriteAddress;

          const cellClasses = [];
          if (!disableHighlights && isActiveCell) cellClasses.push("active-data-cell");
          if (!disableHighlights && cellUpdated) cellClasses.push("updated-cell");
          const cellClass = cellClasses.join(" ");

          valueCells.push(`<td class="${cellClass}" data-data-address="${cellAddress}"><span class="data-cell-text">${escapeHtml(formatValue(rawValue))}</span></td>`);
        }

        rows.push(`<tr data-row-address="${rowAddress}"><td>${formatAddress(rowAddress)}</td>${valueCells.join("")}</tr>`);
      }

      execute.dataBody.innerHTML = rows.join("");
      refreshDataControlLabels();

      if (!disableAutoScroll) {
        const currentRow = execute.textBody.querySelector("tr.current-row");
        const textTableWrap = execute.textBody.closest(".text-table-wrap");
        const textHeader = textTableWrap?.querySelector("thead");
        if (currentRow && textTableWrap) {
          scrollElementWithinContainer(currentRow, textTableWrap, {
            topInset: textHeader instanceof HTMLElement ? textHeader.getBoundingClientRect().height : 0,
            margin: 6
          });
        }

        const focusCell = currentWriteAddress == null ? null : execute.dataBody.querySelector(`td[data-data-address="${currentWriteAddress}"]`);
        const dataTableWrap = execute.dataBody.closest(".data-table-wrap");
        const dataHeader = dataTableWrap?.querySelector("thead");
        if (focusCell) {
          if (dataTableWrap) {
            scrollElementWithinContainer(focusCell, dataTableWrap, {
              topInset: dataHeader instanceof HTMLElement ? dataHeader.getBoundingClientRect().height : 0,
              margin: 6
            });
          }
        } else {
          const changedDataRow = currentWriteAddress == null ? null : execute.dataBody.querySelector(`td[data-data-address="${currentWriteAddress}"]`);
          if (changedDataRow && dataTableWrap) {
            scrollElementWithinContainer(changedDataRow, dataTableWrap, {
              topInset: dataHeader instanceof HTMLElement ? dataHeader.getBoundingClientRect().height : 0,
              margin: 6
            });
          }
        }
      }

      updateDataNavButtons();
    },

    onToggleBreakpoint(handler) {
      execute.textBody.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        const addr = target.dataset.breakpointAddress;
        if (!addr) return;
        handler(Number(addr));
      });
    }
  };

  return api;
}

function formatNumericDisplay(value) {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if ((abs >= 1e6 || (abs > 0 && abs < 1e-4)) && abs !== 0) return value.toExponential(5);
  return String(value);
}

function formatCop1Float(rawValue) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setInt32(0, rawValue | 0, false);
  return formatNumericDisplay(view.getFloat32(0, false));
}

function formatCop1Double(lowWord, highWord) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setInt32(0, highWord | 0, false);
  view.setInt32(4, lowWord | 0, false);
  return formatNumericDisplay(view.getFloat64(0, false));
}

function createRegistersPane(refs) {
  const cop0RowsLikeMars = [
    { number: 8, name: "$8 (vaddr)" },
    { number: 12, name: "$12 (status)" },
    { number: 13, name: "$13 (cause)" },
    { number: 14, name: "$14 (epc)" }
  ];
  const marsRegisterOrder = [
    "$zero", "$at", "$v0", "$v1", "$a0", "$a1", "$a2", "$a3",
    "$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7",
    "$s0", "$s1", "$s2", "$s3", "$s4", "$s5", "$s6", "$s7",
    "$t8", "$t9", "$k0", "$k1", "$gp", "$sp", "$fp", "$ra",
    "$pc", "$hi", "$lo"
  ];
  const marsRegisterOrderIndex = new Map(marsRegisterOrder.map((name, index) => [name, index]));
  const sortRegistersLikeMars = (rows) => {
    const list = Array.isArray(rows) ? rows.slice() : [];
    return list.sort((a, b) => {
      const aName = String(a?.name || "");
      const bName = String(b?.name || "");
      const aRank = marsRegisterOrderIndex.has(aName) ? marsRegisterOrderIndex.get(aName) : Number.POSITIVE_INFINITY;
      const bRank = marsRegisterOrderIndex.has(bName) ? marsRegisterOrderIndex.get(bName) : Number.POSITIVE_INFINITY;
      if (aRank !== bRank) return aRank - bRank;

      const aIndex = Number.isFinite(a?.index) ? Number(a.index) : Number.POSITIVE_INFINITY;
      const bIndex = Number.isFinite(b?.index) ? Number(b.index) : Number.POSITIVE_INFINITY;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return aName.localeCompare(bName);
    });
  };
  const isStackedLayout = () => (
    refs.root?.classList?.contains("desktop-stacked") === true
    || refs.windows?.desktop?.classList?.contains("desktop-stacked") === true
  );

  let previousCop0 = null;
  let previousCop1 = null;
  let previousFlags = null;
  let cop1FlagToggleHandler = null;

  refs.registers.cop1Flags?.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const index = Number.parseInt(String(target.dataset.cop1Flag ?? ""), 10);
    if (!Number.isFinite(index) || index < 0 || index > 7) return;
    cop1FlagToggleHandler?.(index, target.checked ? 1 : 0);
  });

  return {
    onToggleCop1Flag(handler) {
      cop1FlagToggleHandler = typeof handler === "function" ? handler : null;
    },
    render(snapshotOrRows, changedRegisters = new Set(), options = {}) {
      const disableHighlights = options.disableHighlights === true;
      const disableAutoScroll = options.disableAutoScroll === true;
      const displayValuesHex = options.displayValuesHex === true;
      const snapshot = Array.isArray(snapshotOrRows)
        ? { registers: snapshotOrRows }
        : (snapshotOrRows && typeof snapshotOrRows === "object" ? snapshotOrRows : { registers: [] });

      const registerRows = sortRegistersLikeMars(Array.isArray(snapshot.registers) ? snapshot.registers : []);
      refs.registers.body.innerHTML = registerRows
        .map((register) => {
          const key = register.name === "$pc" ? "pc" : String(register.index);
          const changed = !disableHighlights && (changedRegisters.has(key) || changedRegisters.has(register.name));
          const cls = changed ? "updated-row" : "";
          const isSpecial = register.name === "$pc" || register.name === "$hi" || register.name === "$lo";
          const numberCell = isSpecial ? "" : register.index;
          const displayName = register.name === "$pc"
            ? "pc"
            : (register.name === "$hi" ? "hi" : (register.name === "$lo" ? "lo" : register.name));
          return `<tr class="${cls}" data-register-key="${escapeHtml(key)}"><td>${displayName}</td><td>${numberCell}</td><td>${register.valueHex}</td><td>${register.value}</td></tr>`;
        })
        .join("");

      if (!disableAutoScroll) {
        const changedRow = refs.registers.body.querySelector("tr.updated-row");
        if (changedRow && !isStackedLayout()) {
          const registerBody = changedRow.closest(".register-body");
          if (registerBody) scrollElementWithinContainer(changedRow, registerBody);
        }
      }

      const cop1Values = Array.isArray(snapshot.cop1) ? snapshot.cop1 : [];
      if (refs.registers.cop1Body) {
        const cop1Rows = [];
        for (let i = 0; i < 32; i += 1) {
          const raw = cop1Values[i] | 0;
          const changed = !disableHighlights && previousCop1 && previousCop1[i] !== raw;
          const cls = changed ? "updated-row" : "";
          const floatText = displayValuesHex ? toHex(raw >>> 0) : formatCop1Float(raw);
          const doubleText = (i % 2 === 0 && (i + 1) < cop1Values.length)
            ? (displayValuesHex
              ? `0x${((cop1Values[i + 1] >>> 0).toString(16).padStart(8, "0"))}${((cop1Values[i] >>> 0).toString(16).padStart(8, "0"))}`
              : formatCop1Double(cop1Values[i] | 0, cop1Values[i + 1] | 0))
            : "";
          cop1Rows.push(`<tr class="${cls}" data-cop1-index="${i}"><td>$f${i}</td><td>${escapeHtml(floatText)}</td><td>${escapeHtml(doubleText)}</td></tr>`);
        }
        refs.registers.cop1Body.innerHTML = cop1Rows.join("");
      }
      previousCop1 = cop1Values.slice(0, 32);

      const cop0Values = Array.isArray(snapshot.cop0) ? snapshot.cop0 : [];
      if (refs.registers.cop0Body) {
        const cop0Rows = cop0RowsLikeMars.map((entry) => {
          const i = entry.number;
          const raw = cop0Values[i] | 0;
          const changed = !disableHighlights && previousCop0 && previousCop0[i] !== raw;
          const cls = changed ? "updated-row" : "";
          const valueText = displayValuesHex ? toHex(raw >>> 0) : String(raw | 0);
          return `<tr class="${cls}" data-cop0-index="${i}"><td>${entry.name}</td><td>${i}</td><td>${valueText}</td></tr>`;
        });
        refs.registers.cop0Body.innerHTML = cop0Rows.join("");
      }
      previousCop0 = cop0Values.slice(0, 32);

      const flags = Array.isArray(snapshot.fpuFlags) ? snapshot.fpuFlags : [];
      if (refs.registers.cop1Flags) {
        refs.registers.cop1Flags.innerHTML = `<span>${escapeHtml(translateText("Condition Flags:"))}</span>${[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
          const on = flags[index] ? "cop0-flag on" : "cop0-flag";
          return `<label class="${on}"><input type="checkbox" data-cop1-flag="${index}" ${flags[index] ? "checked" : ""}>${index}</label>`;
        }).join("")}`;

        if (!disableHighlights && previousFlags && flags.some((value, index) => value !== previousFlags[index])) {
          refs.registers.cop1Flags.classList.add("updated-row");
          window.setTimeout(() => refs.registers.cop1Flags.classList.remove("updated-row"), 160);
        }
      }
      previousFlags = flags.slice(0, 8);
    }
  };
}
function createMessagesPane(refs, limit) {
  const trimCut = Math.max(1, Math.floor(limit / 10));
  const trim = (text) => {
    if (text.length <= limit) return text;
    const overflow = text.length - limit;
    return text.slice(Math.max(trimCut, overflow));
  };
  const queuedInputs = [];
  let pendingPrompt = "";
  let onInputSubmitted = null;
  const buffers = new Map();
  let flushPending = false;
  const activePanelId = () => refs.tabs.messages.getActivePanel?.() || "panel-mars-messages";

  function getNodeValue(node) {
    if (!node) return "";
    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
      return node.value || "";
    }
    return node.textContent || "";
  }

  function setNodeValue(node, value) {
    if (!node) return;
    if (node instanceof HTMLTextAreaElement || node instanceof HTMLInputElement) {
      if (node.value !== value) node.value = value;
      return;
    }
    if (node.textContent !== value) node.textContent = value;
  }

  function getBuffer(node) {
    if (!node) return "";
    if (!buffers.has(node)) buffers.set(node, getNodeValue(node));
    return buffers.get(node) || "";
  }

  function setBuffer(node, value) {
    if (!node) return;
    buffers.set(node, trim(value));
  }

  function flush() {
    flushPending = false;
    buffers.forEach((value, node) => {
      if (!node) return;
      setNodeValue(node, value);
      if (typeof node.setSelectionRange === "function") {
        const end = getNodeValue(node).length;
        try { node.setSelectionRange(end, end); } catch {}
      }
      node.scrollTop = node.scrollHeight;
    });
  }

  function scheduleFlush() {
    if (flushPending) return;
    flushPending = true;
    window.requestAnimationFrame(flush);
  }

  const maybeTranslate = (msg, translate = true) => (
    translate ? translateText(msg) : String(msg ?? "")
  );

  const append = (node, msg) => {
    if (!node) return;
    const current = getBuffer(node);
    setBuffer(node, `${current}${msg}`);
    scheduleFlush();
  };

  const refreshInputPlaceholder = () => {
    if (!refs.messages.runInput) return;
    const suffix = pendingPrompt
      ? translateText(" ({prompt})", { prompt: pendingPrompt })
      : "";
    refs.messages.runInput.placeholder = `${translateText("Type input for syscall and press Enter")}${suffix}`;
  };

  const getRecentRunLines = (count = 4) => {
    const text = getBuffer(refs.messages.run);
    if (!text) return "";
    const lines = text.split(/\r?\n/);
    while (lines.length && lines[lines.length - 1] === "") lines.pop();
    return lines.slice(-Math.max(1, count | 0)).join("\n");
  };

  const queueInput = () => {
    const field = refs.messages.runInput;
    if (!(field instanceof HTMLInputElement)) return;
    const value = field.value;
    queuedInputs.push(value);
    field.value = "";
    pendingPrompt = "";
    refreshInputPlaceholder();
    append(refs.messages.run, `${String(value ?? "")}\n`);
    if (typeof onInputSubmitted === "function") {
      try { onInputSubmitted(value); } catch {}
    }
  };

  refs.messages.clearMars?.addEventListener("click", () => {
    setBuffer(refs.messages.mars, "");
    scheduleFlush();
  });
  refs.messages.clearRun?.addEventListener("click", () => {
    setBuffer(refs.messages.run, "");
    scheduleFlush();
  });
  refs.messages.runSend?.addEventListener("click", queueInput);
  refs.messages.runInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    queueInput();
  });

  refreshInputPlaceholder();

  return {
    postMars: (msg, options = {}) => {
      append(refs.messages.mars, maybeTranslate(msg, options.translate !== false));
      if (options.activate !== false) refs.tabs.messages.activate("panel-mars-messages");
    },
    postRun: (msg, options = {}) => {
      append(refs.messages.run, maybeTranslate(msg, options.translate !== false));
      if (options.activate !== false) refs.tabs.messages.activate("panel-run-io");
    },
    clear() {
      if (activePanelId() === "panel-run-io") {
        setBuffer(refs.messages.run, "");
      } else {
        setBuffer(refs.messages.mars, "");
      }
      scheduleFlush();
    },
    clearMars() {
      setBuffer(refs.messages.mars, "");
      scheduleFlush();
    },
    clearRun() {
      setBuffer(refs.messages.run, "");
      scheduleFlush();
    },
    requestInput(promptText = "") {
      pendingPrompt = String(promptText || "");
      refreshInputPlaceholder();
      refs.tabs.messages.activate("panel-run-io");
      refs.messages.runInput?.focus();
    },
    consumeInput() {
      if (!queuedInputs.length) return null;
      return queuedInputs.shift();
    },
    clearInputRequest() {
      pendingPrompt = "";
      refreshInputPlaceholder();
    },
    refreshTranslations() {
      refreshInputPlaceholder();
    },
    focusRunInput() {
      refs.tabs.messages.activate("panel-run-io");
      refs.messages.runInput?.focus();
    },
    selectMarsTab() {
      refs.tabs.messages.activate("panel-mars-messages");
    },
    selectRunTab() {
      refs.tabs.messages.activate("panel-run-io");
    },
    setInputSubmittedHandler(handler) {
      onInputSubmitted = typeof handler === "function" ? handler : null;
    },
    marsEndsWithNewline() {
      const text = getBuffer(refs.messages.mars);
      return !text || text.endsWith("\n");
    },
    runEndsWithNewline() {
      const text = getBuffer(refs.messages.run);
      return !text || text.endsWith("\n");
    },
    getRecentRunLines
  };
}
const STORAGE_KEY = "mars45-web-preferences";
const DEFAULT_PREFERENCES = {
  language: "en",
  menuPosition: "top",
  showLabelsWindow: true,
  programArguments: false,
  popupSyscallInput: false,
  displayAddressesHex: true,
  displayValuesHex: true,
  assembleOnOpen: false,
  assembleAll: false,
  warningsAreErrors: false,
  startAtMain: false,
  extendedAssembler: true,
  delayedBranching: false,
  strictMarsCompatibility: false,
  selfModifyingCode: false,
  assemblerBackendMode: "js",
  simulatorBackendMode: "js",
  splitMessagesRunIo: false,
  programArgumentsText: "",
  editorFontSize: 12,
  editorLineHeight: 1.25,
  highlightTextUpdates: true,
  highlightDataUpdates: true,
  highlightRegisterUpdates: true,
  exceptionHandlerAddress: "0x80000180",
  memoryConfiguration: "Default",
  maxMemoryGb: 2,
  maxBacksteps: 100,
  cloudApiBase: "",
  miniCSubset: "C1-NATIVE",
  miniCTargetAbi: "o32",
  miniCOpenOutputWindow: true,
  miniCEmitScaffoldingComments: true
};

function loadPreferences() {
  try {
    const rawPrefs = localStorage.getItem(STORAGE_KEY);
    if (!rawPrefs) return { ...DEFAULT_PREFERENCES };
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(rawPrefs) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function normalizeFilename(name) {
  const value = (name || "").trim();
  if (!value) return "untitled.s";
  if (/\.(asm|s|mips|c|c0|h|h0|txt|p)$/i.test(value)) return value;
  return `${value}.s`;
}

function injectRuntimeStyles() {
  if (document.getElementById("mars-runtime-style")) return;
  const { stackedMaxWidthPx } = getLayoutConfig();

  const style = document.createElement("style");
  style.id = "mars-runtime-style";
  style.textContent = `
    .menu-item.active { border-color: #7f8da0; background: linear-gradient(180deg, #f9fbfe, #e7edf5); }
    .menu-logo { width: 16px; height: 16px; margin: 0 4px 0 1px; align-self: center; flex: 0 0 16px; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; line-height: 1; }
    .menu-bar { padding: 3px 5px; gap: 3px; }
    .menu-item { padding: 2px 7px; font-size: 12px; line-height: 1.1; }
    .toolbar { padding: 4px 5px; gap: 4px; }
    .toolbar-group { gap: 3px; padding-right: 6px; }
    .tool-btn { padding: 2px 7px; font-size: 11px; min-height: 20px; border-radius: 1px; }
    .toolbar .tool-btn { min-height: 18px; padding: 2px 6px; }
    .data-nav .tool-btn { min-height: 18px; padding: 1px 6px; }
    .window-controls .win-btn { min-height: 14px; padding: 0 2px; }
    .subtabs { padding: 3px 4px; gap: 3px; }
    .editor-file-tabs { overflow-x: auto; overflow-y: hidden; flex-wrap: nowrap; }
    .editor-file-tab { flex: 0 0 auto; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .subtab-btn { padding: 2px 8px; font-size: 11px; }
    .status-bar { padding: 3px 7px; font-size: 11px; }
    .tag { padding: 2px 6px; font-size: 10px; }
    .editor-surface {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      height: 100%;
      min-height: 0;
      border: 1px solid #a3b2c4;
      background: #f2f5f9;
      font-family: "Cascadia Code", "Consolas", "Lucida Console", monospace;
      font-size: 12px;
      line-height: 1.25;
    }

    .editor-gutter {
      border-right: 1px solid #bdc8d7;
      background: #edf2f8;
      color: #607185;
      text-align: right;
      min-width: 28px;
      user-select: none;
      overflow: hidden;
    }

    .editor-gutter pre {
      margin: 0;
      padding: 8px 4px 8px 2px;
      white-space: pre;
      transform: translateY(0);
    }

    .editor-code-wrap {
      position: relative;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: #f2f5f9;
    }
    .editor-highlight {
      position: absolute;
      top: 0;
      left: 0;
      margin: 0;
      padding: 8px;
      white-space: pre;
      transform: translate(0, 0);
      pointer-events: none;
      color: #1f2d3f;
      min-width: 100%;
      overflow: visible;
    }


    #source-editor {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      resize: none;
      border: none;
      border-radius: 0;
      padding: 8px;
      background: transparent;
      color: transparent;
      caret-color: #1f2d3f;
      font-size: 12px;
      line-height: 1.25;
      font-family: "Cascadia Code", "Consolas", "Lucida Console", monospace;
      z-index: 2;
      overflow: auto;
    }

    #source-editor::selection {
      background: rgba(100, 149, 237, 0.34);
    }

    .editor-surface.readonly,
    .editor-surface.readonly .editor-code-wrap {
      background: #fff8dc;
    }

    #source-editor[readonly] {
      cursor: default;
    }

    .editor-token-comment { color: #37b24d; font-style: italic; }
    .editor-token-directive { color: #8b5cf6; }
    .editor-token-label { color: #2f3f52; font-weight: 600; }
    .editor-token-opcode { color: #145799; font-weight: 600; }
    .editor-token-register { color: #9b4b18; }
    .editor-token-number { color: #2563eb; }
    .editor-token-string { color: #b42318; }

    html, body { overflow: hidden; }

    .shell {
      display: grid;
      height: 100vh;
      overflow: hidden;
      grid-template-rows: auto auto 1fr;
      grid-template-areas:
        "menu"
        "toolbar"
        "desktop";
    }

    .menu-bar { grid-area: menu; }
    .toolbar { grid-area: toolbar; }
    .desktop { grid-area: desktop; }

    .menu-at-bottom .shell {
      grid-template-rows: 1fr auto auto;
      grid-template-areas:
        "desktop"
        "toolbar"
        "menu";
    }

    .mode-tabs {
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 1px 4px 0;
    }

    .mode-tab-btn {
      border: 1px solid #8f9cad;
      border-bottom: none;
      background: #f7f9fc;
      border-radius: 2px 2px 0 0;
      padding: 2px 9px;
      font-size: 10px;
      cursor: pointer;
    }

    .mode-tab-btn.active {
      background: #d5e4f6;
      border-color: #6f86a3;
      font-weight: 600;
    }

    .desktop {
      position: relative;
      min-height: 0;
      overflow: hidden;
      background: linear-gradient(180deg, #d8dee6 0%, #cfd7e2 100%);
    }

    .desktop-window {
      position: absolute;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-width: 200px;
      min-height: 120px;
      box-sizing: border-box;
      border: 1px solid #8e9cad;
      border-radius: 2px;
      background: #eef3f8;
      box-shadow: 0 2px 5px rgba(22, 31, 44, 0.2);
      overflow: hidden;
      resize: none;
    }

    .window-resize-handle {
      position: absolute;
      z-index: 3;
      background: transparent;
      touch-action: none;
    }

    .resize-n,
    .resize-s {
      left: 6px;
      right: 6px;
      height: 8px;
    }

    .resize-n {
      top: -4px;
      cursor: n-resize;
    }

    .resize-s {
      bottom: -4px;
      cursor: s-resize;
    }

    .resize-e,
    .resize-w {
      top: 6px;
      bottom: 6px;
      width: 8px;
    }

    .resize-e {
      right: -4px;
      cursor: e-resize;
    }

    .resize-w {
      left: -4px;
      cursor: w-resize;
    }

    .resize-ne,
    .resize-nw,
    .resize-se,
    .resize-sw {
      width: 12px;
      height: 12px;
    }

    .resize-ne {
      top: -4px;
      right: -4px;
      cursor: ne-resize;
    }

    .resize-nw {
      top: -4px;
      left: -4px;
      cursor: nw-resize;
    }

    .resize-se {
      right: -4px;
      bottom: -4px;
      cursor: se-resize;
    }

    .resize-sw {
      left: -4px;
      bottom: -4px;
      cursor: sw-resize;
    }

    .desktop-shared-splitter {
      position: absolute;
      z-index: 70;
      background: transparent;
      touch-action: none;
    }

    .desktop-shared-splitter::before {
      content: "";
      position: absolute;
      inset: 1px;
      border-radius: 1px;
      background: rgba(76, 120, 168, 0.14);
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .desktop-shared-splitter:hover::before,
    .desktop-shared-splitter:active::before {
      opacity: 1;
    }

    .splitter-vertical {
      cursor: col-resize;
    }

    .splitter-horizontal {
      cursor: row-resize;
    }

    .tool-window {
      border-radius: 0;
      border-color: #8f8f8f;
      background: #f0f0f0;
      box-shadow: 0 1px 0 rgba(255, 255, 255, 0.85) inset;
    }

    .desktop-window .status-bar {
      border-top: 1px solid #a9b3bf;
      background: #edf2f8;
    }

    .window-hidden {
      display: none;
    }

    .window-titlebar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 20px;
      padding: 0 5px 0 6px;
      background: linear-gradient(180deg, #f7fbff 0%, #d7e3f2 100%);
      border-bottom: 1px solid #97a8bd;
      font-size: 10px;
      color: #223347;
      user-select: none;
      cursor: move;
    }

    .window-title {
      font-weight: 600;
    }

    .window-controls {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .win-btn {
      min-width: 14px;
      height: 14px;
      border: 1px solid #8596aa;
      background: linear-gradient(180deg, #ffffff 0%, #d9e3ee 100%);
      color: #223347;
      font-size: 10px;
      line-height: 1;
      padding: 0 3px;
      cursor: pointer;
    }

    .win-btn:hover {
      border-color: #57779a;
      background: linear-gradient(180deg, #ffffff 0%, #c5d9ee 100%);
    }

    .win-btn-close {
      color: #5d1820;
    }

    .window-content {
      min-height: 0;
      overflow: auto;
      background: #f7f9fc;
    }

    .tool-window .window-titlebar {
      height: 22px;
      padding: 0 6px;
      background: linear-gradient(180deg, #fcfcfc 0%, #dedede 100%);
      border-bottom-color: #a6a6a6;
      color: #111;
      font-size: 11px;
    }

    .tool-window .window-title {
      font-weight: 400;
    }

    .tool-window .window-controls {
      gap: 0;
    }

    .tool-window .win-btn {
      min-width: 16px;
      height: 16px;
      border-color: #7f7f7f;
      background: linear-gradient(180deg, #ffffff 0%, #e6e6e6 100%);
      color: #111;
      padding: 0;
    }

    .tool-window .window-content {
      padding: 4px;
      background: #f0f0f0;
    }

    .tool-window .window-content > * > h2,
    .tool-window .window-content > * > h3,
    .tool-window .window-content > * > [class$='-title']:first-child {
      margin: 0 0 8px;
      text-align: center;
      font-size: 18px;
      line-height: 1.15;
      font-weight: 400;
      color: #111;
    }

    .tool-window .tool-btn,
    .tool-window button:not(.win-btn),
    .tool-window select,
    .tool-window input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
    .tool-window textarea {
      font-family: Tahoma, "Segoe UI", sans-serif;
      font-size: 11px;
    }

    .tool-window .tool-btn,
    .tool-window button:not(.win-btn) {
      min-height: 22px;
      padding: 1px 10px;
      border: 1px solid #7f9db9;
      border-radius: 0;
      background: linear-gradient(180deg, #ffffff 0%, #ece9d8 100%);
      color: #111;
      box-shadow: inset 1px 1px 0 rgba(255, 255, 255, 0.9);
    }

    .tool-window .tool-btn:hover,
    .tool-window button:not(.win-btn):hover {
      border-color: #5f83aa;
      background: linear-gradient(180deg, #ffffff 0%, #e2edf9 100%);
    }

    .tool-window .tool-btn:active,
    .tool-window button:not(.win-btn):active {
      background: linear-gradient(180deg, #ddd7c1 0%, #f7f7f7 100%);
      box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.18);
    }

    .tool-window .tool-btn:disabled,
    .tool-window button:not(.win-btn):disabled {
      color: #7f7f7f;
      border-color: #b8b8b8;
      background: #efefef;
      box-shadow: none;
    }

    .tool-window select,
    .tool-window input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
    .tool-window textarea {
      border: 1px solid #7f9db9;
      border-radius: 0;
      background: #fff;
      color: #111;
      box-sizing: border-box;
    }

    .tool-window select,
    .tool-window input:not([type="checkbox"]):not([type="radio"]):not([type="range"]) {
      min-height: 22px;
      padding: 1px 4px;
    }

    .tool-window textarea {
      padding: 4px;
    }

    .tool-window input[readonly],
    .tool-window textarea[readonly] {
      background: #f6f6f6;
    }

    .tool-window label {
      color: #111;
    }

    .tool-window .mars-tool-shell {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
      min-height: 0;
      box-sizing: border-box;
    }

    .tool-window .mars-tool-heading {
      margin: 0;
      text-align: center;
      font-size: 18px;
      line-height: 1.15;
      font-weight: 400;
      color: #111;
    }

    .tool-window .mars-tool-panel {
      position: relative;
      min-height: 0;
      border: 1px solid #a7a7a7;
      background: #fff;
      box-sizing: border-box;
    }

    .tool-window .mars-tool-panel-title {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      padding: 0 6px;
      background: #f0f0f0;
      font-size: 11px;
      font-weight: 400;
      color: #111;
      white-space: nowrap;
    }

    .tool-window .mars-tool-panel-body {
      min-height: 0;
      height: 100%;
      padding: 14px 8px 8px;
      box-sizing: border-box;
    }

    .tool-window .mars-tool-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-width: 0;
    }

    .tool-window .mars-tool-row > :first-child {
      flex: 1 1 auto;
      min-width: 0;
    }

    .tool-window .mars-tool-row > :last-child {
      flex: 0 0 auto;
    }

    .tool-window .mars-tool-footer {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tool-window .mars-tool-footer-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }

    .tool-window .mars-tool-split-vertical {
      display: grid;
      grid-template-rows: 1fr 6px 1fr;
      min-height: 0;
      height: 100%;
    }

    .tool-window .mars-tool-splitter {
      background: linear-gradient(180deg, #f7f7f7 0%, #d8d8d8 100%);
      border-top: 1px solid #ffffff;
      border-bottom: 1px solid #9f9f9f;
      cursor: row-resize;
      touch-action: none;
    }

    .tool-window [class$='-footer'] {
      position: relative;
      margin-top: 8px;
      padding: 11px 8px 8px;
      border: 1px solid #a7a7a7;
      background: #f0f0f0;
      box-sizing: border-box;
    }

    .tool-window [class$='-footer'] .ctrl {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      padding: 0 6px;
      background: #f0f0f0;
      font-size: 11px;
      font-weight: 400;
      color: #111;
      white-space: nowrap;
    }

    .window-focus .window-titlebar {
      filter: brightness(1.03);
    }

    .window-dragging {
      opacity: 0.94;
    }

    .window-activity .window-titlebar {
      animation: windowPulse 0.55s ease;
    }

    .desktop:not(.desktop-stacked) .window-minimized {
      height: 20px !important;
      min-height: 20px !important;
      resize: none;
    }

    .window-minimized .window-content,
    .window-minimized .status-bar {
      display: none !important;
    }

    .window-maximized {
      border-radius: 0;
      resize: none;
    }

    .updated-row {
      animation: rowFlash 0.85s ease;
      background: #d1e8ff;
    }

    .active-data-cell {
      background: #d1e8ff;
    }

    .updated-cell {
      animation: rowFlash 0.85s ease;
      background: #d1e8ff;
    }

    .disable-text-highlight #text-segment-body tr.updated-row,
    .disable-text-highlight #text-segment-body tr.current-row,
    .disable-data-highlight #data-segment-body td.active-data-cell,
    .disable-data-highlight #data-segment-body td.updated-cell,
    .disable-register-highlight #registers-body tr.updated-row {
      animation: none;
      background: inherit;
    }

    .run-no-interaction #text-segment-body tr.updated-row,
    .run-no-interaction #text-segment-body tr.current-row,
    .run-no-interaction #data-segment-body td.active-data-cell,
    .run-no-interaction #data-segment-body td.updated-cell,
    .run-no-interaction #registers-body tr.updated-row {
      animation: none;
      background: inherit;
    }

    @keyframes rowFlash {
      0% { background: #ffe88f; }
      100% { background: #d1e8ff; }
    }

    @keyframes windowPulse {
      0% { background: linear-gradient(180deg, #fff4a6 0%, #f2dd85 100%); }
      100% { background: linear-gradient(180deg, #f7fbff 0%, #d7e3f2 100%); }
    }

    #window-main .window-content,
    #window-registers .window-content,
    #window-messages .window-content {
      display: grid;
    }

    .main-window-content {
      grid-template-rows: auto minmax(0, 1fr);
      padding: 0;
      min-height: 0;
    }

    .mode-tabs {
      border-bottom: 1px solid #9aa8b8;
      background: #e4ebf4;
    }

    .main-tab-panel {
      display: none;
      min-height: 0;
    }

    .main-tab-panel.active {
      display: grid;
    }

    #main-panel-project {
      padding: 0;
      min-height: 0;
      overflow: hidden;
    }

    .project-tree-pane-main {
      height: 100%;
    }

    .project-tree-pane {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      min-height: 0;
      background: #eef3f9;
    }

    .project-tree-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      row-gap: 4px;
      min-height: 24px;
      padding: 4px 6px 5px;
      border-bottom: 1px solid #b9c6d6;
      background: linear-gradient(180deg, #f9fcff, #dde7f3);
      font-size: 12px;
      font-weight: 600;
      color: #1c3552;
    }

    .project-tree-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
    }

    .project-tree-action-btn {
      border: 1px solid #97abc2;
      border-radius: 2px;
      background: linear-gradient(180deg, #fefefe, #dbe6f3);
      color: #153451;
      padding: 1px 7px;
      font-size: 11px;
      line-height: 1.5;
      cursor: pointer;
    }

    .project-tree-action-btn:hover:enabled {
      border-color: #6f8ca9;
      background: linear-gradient(180deg, #ffffff, #d1dff0);
    }

    .project-tree-action-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .project-tree-action-btn.project-tree-action-btn-danger {
      color: #6f1d1d;
    }

    .project-tree-root-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-height: 16px;
      font-size: 11px;
      color: #35516c;
    }

    .project-tree-container {
      min-height: 0;
      overflow: auto;
      padding: 6px 6px 8px;
      font-family: "Consolas", "Cascadia Code", "Courier New", monospace;
      font-size: 12px;
      color: #1a324d;
    }

    .project-tree-list {
      list-style: none;
      margin: 0;
      padding: 0 0 0 14px;
    }

    .project-tree-list.root {
      padding-left: 0;
    }

    .project-tree-item {
      margin: 1px 0;
    }

    .project-tree-row {
      display: grid;
      grid-template-columns: 14px auto minmax(0, 1fr);
      align-items: center;
      column-gap: 4px;
      min-height: 18px;
    }

    .project-tree-check {
      width: 14px;
      height: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      cursor: pointer;
    }

    .project-tree-check input {
      width: 12px;
      height: 12px;
      margin: 0;
      accent-color: #c79c1d;
      cursor: pointer;
    }

    .project-tree-check input:disabled {
      cursor: default;
      opacity: 0.45;
    }

    .project-tree-toggle {
      width: 14px;
      height: 14px;
      border: 1px solid transparent;
      border-radius: 2px;
      background: transparent;
      color: #33536f;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      line-height: 1;
      padding: 0;
      cursor: pointer;
    }

    .project-tree-toggle:hover {
      border-color: #9aadc3;
      background: #dbe7f6;
    }

    .project-tree-toggle.spacer {
      visibility: hidden;
      pointer-events: none;
    }

    .project-tree-root,
    .project-tree-project,
    .project-tree-folder,
    .project-tree-file,
    .project-tree-libs-root,
    .project-tree-libs-folder,
    .project-tree-libs-file {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      font-weight: 600;
      align-items: center;
      column-gap: 6px;
      width: 100%;
      border: 1px solid transparent;
      border-radius: 2px;
      padding: 1px 4px;
      background: transparent;
      color: #204769;
      cursor: pointer;
      font: inherit;
      text-align: left;
      min-height: 18px;
    }

    .project-tree-root {
      cursor: default;
      color: #1b3f5f;
      border-color: transparent;
      background: transparent;
    }

    .project-tree-project,
    .project-tree-folder,
    .project-tree-libs-root,
    .project-tree-libs-folder {
      color: #1b4469;
    }

    .project-tree-file,
    .project-tree-libs-file {
      font-weight: 500;
      color: #1a324d;
    }

    .project-tree-project:hover,
    .project-tree-folder:hover,
    .project-tree-file:hover,
    .project-tree-libs-root:hover,
    .project-tree-libs-folder:hover,
    .project-tree-libs-file:hover {
      border-color: #8fa6bf;
      background: #dce8f7;
    }

    .project-tree-project.active,
    .project-tree-file.active {
      border-color: #6f89a8;
      background: #c7dcf4;
      color: #0f2f4d;
      font-weight: 700;
    }

    .project-tree-project.selected,
    .project-tree-folder.selected,
    .project-tree-file.selected,
    .project-tree-libs-root.selected,
    .project-tree-libs-folder.selected,
    .project-tree-libs-file.selected {
      border-color: #b88d26;
      background: linear-gradient(180deg, #fff5bf 0%, #f1df96 100%);
      color: #5d4208;
    }

    .project-tree-file.active.selected,
    .project-tree-project.active.selected {
      border-color: #a37a19;
      background: linear-gradient(180deg, #fff0a5 0%, #ead07d 100%);
      color: #4f3908;
    }

    .project-tree-project.drop-target,
    .project-tree-folder.drop-target {
      border-color: #3f6f9f;
      background: #c3daf5;
      box-shadow: inset 0 0 0 1px #7ca3ca;
    }

    .project-tree-file.dragging {
      opacity: 0.55;
    }

    .project-tree-libs-root,
    .project-tree-libs-folder,
    .project-tree-libs-file {
      color: #38536f;
    }

    .project-tree-libs-root.readonly,
    .project-tree-libs-folder.readonly,
    .project-tree-libs-file.readonly {
      color: #4f657c;
    }

    .project-tree-main {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .project-tree-node-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .project-tree-sync {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      flex: 0 0 auto;
      box-shadow: inset 0 0 0 1px rgba(18, 28, 40, 0.22);
    }

    .project-tree-sync-green { background: #35a853; }
    .project-tree-sync-orange { background: #ee8f1f; }
    .project-tree-sync-red { background: #d94848; }

    .project-tree-meta {
      color: #5f7288;
      font-size: 11px;
      font-weight: 400;
      white-space: nowrap;
    }

    .project-tree-file.active .project-tree-meta,
    .project-tree-project.active .project-tree-meta {
      color: #2e5576;
    }

    .project-tree-project.selected .project-tree-meta,
    .project-tree-folder.selected .project-tree-meta,
    .project-tree-file.selected .project-tree-meta,
    .project-tree-libs-root.selected .project-tree-meta,
    .project-tree-libs-folder.selected .project-tree-meta,
    .project-tree-libs-file.selected .project-tree-meta {
      color: #75561a;
    }

    .project-tree-empty {
      color: #647993;
      padding: 4px 2px;
      font-style: italic;
    }

    .project-tree-status {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 5px 8px 6px;
      border-top: 1px solid #c0ccda;
      background: linear-gradient(180deg, #f8fbff 0%, #e2ebf5 100%);
      color: #36506a;
      font-size: 11px;
      line-height: 1.4;
    }

    .project-tree-status span {
      white-space: nowrap;
    }

    #main-panel-editor {
      min-height: 0;
      overflow: hidden;
    }

    #main-panel-editor .editor-host {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
      min-height: 0;
      height: 100%;
      overflow: hidden;
    }

    .main-editor-workspace {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      min-height: 0;
      overflow: hidden;
    }

    .main-editor-workspace .editor-wrap {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
      min-height: 0;
      height: 100%;
      overflow: hidden;
    }

    .main-editor-workspace .editor-surface,
    .main-editor-workspace .editor-code-wrap {
      min-height: 0;
    }

    #main-panel-execute {
      padding: 4px;
      min-height: 0;
      overflow: hidden;
    }

    #main-panel-execute .execute-wrap {
      display: grid;
      grid-template-rows: minmax(0, 56%) minmax(0, 44%);
      gap: 4px;
      min-height: 0;
      height: 100%;
      padding: 0;
    }

    .execute-subwindow {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      border: 1px solid #9aa9ba;
      background: #f5f8fc;
      min-height: 0;
      overflow: hidden;
    }


    .execute-splitter {
      height: 6px;
      cursor: row-resize;
      background: linear-gradient(180deg, #d9e2ee 0%, #b8c5d6 50%, #d9e2ee 100%);
      border-top: 1px solid #8fa0b6;
      border-bottom: 1px solid #8fa0b6;
      user-select: none;
    }

    .execute-splitter:hover {
      background: linear-gradient(180deg, #e5edf7 0%, #c6d4e6 50%, #e5edf7 100%);
    }
    .execute-subwindow-title {
      height: 18px;
      display: flex;
      align-items: center;
      padding: 0 6px;
      font-size: 10px;
      font-weight: 600;
      border-bottom: 1px solid #9aa9ba;
      background: linear-gradient(180deg, #f7fbff 0%, #dbe7f3 100%);
    }

    .execute-subwindow-body {
      min-height: 0;
      overflow: hidden;
    }

    .execute-text-window .execute-subwindow-body {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
    }

    .execute-top {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(150px, 0.23fr);
      gap: 4px;
      min-height: 0;
      height: 100%;
    }

    .segment-panel,
    .labels-panel {
      min-height: 0;
      border: none;
      background: transparent;
      overflow: hidden;
    }

    .segment-panel {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
    }

    .text-table-wrap {
      min-height: 0;
      overflow: auto;
      padding: 0;
    }

    .labels-panel {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      border-left: 1px solid #bcc7d3;
    }

    .labels-panel .panel-title {
      margin: 0;
      padding: 2px 6px;
      font-size: 10px;
      border-bottom: 1px solid #c6ced8;
    }

    .labels-list {
      margin: 0;
      padding: 4px;
      overflow: auto;
    }

    .labels-list li {
      padding: 3px 2px;
      font-size: 10px;
    }

    .execute-data-window .data-subwindow-body {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      min-height: 0;
    }

    .data-table-wrap {
      min-height: 0;
      overflow: auto;
      padding: 0;
    }

    .data-segment-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }

    .data-segment-table th,
    .data-segment-table td {
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .data-segment-table th:first-child,
    .data-segment-table td:first-child {
      text-align: right;
      width: 12%;
    }

    .data-segment-table th:not(:first-child),
    .data-segment-table td:not(:first-child) {
      width: 11%;
      font-family: "Cascadia Code", "Consolas", monospace;
    }

    .data-cell-text {
      display: inline-block;
      max-width: 100%;
      white-space: nowrap;
      vertical-align: top;
      overflow: hidden;
      direction: rtl;
      text-align: left;
    }

    .data-nav {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      padding: 3px 5px;
      border-top: 1px solid #aab4c0;
      background: #edf2f8;
    }

    .data-nav > label {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
    }

    #data-base-select {
      min-width: 150px;
      border: 1px solid #8c9aad;
      background: #fff;
      border-radius: 2px;
      padding: 2px 5px;
      font-size: 10px;
    }

    #data-nav-prev,
    #data-nav-next {
      min-width: 24px;
      padding: 1px 6px;
      line-height: 1;
    }
    #window-messages .messages-pane {
      margin: 0;
      grid-template-rows: auto minmax(0, 1fr);
      min-height: 0;
      padding: 0;
      overflow: hidden;
    }

    #window-registers .registers-pane {
      margin: 0;
      grid-template-rows: auto 1fr;
    }

    #window-registers .register-body {
      margin: 4px;
    }

    .subtab-panel {
      display: none;
      min-height: 0;
      overflow: hidden;
    }

    .subtab-panel.active {
      display: block;
    }

    #window-messages .messages-subtab-panel.active {
      display: grid;
      min-height: 0;
    }

    .split-messages-runio .desktop:not(.desktop-stacked) #window-messages .messages-pane {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-template-rows: auto minmax(0, 1fr);
      column-gap: 4px;
      row-gap: 2px;
      padding: 4px;
    }

    .split-messages-runio .desktop:not(.desktop-stacked) #window-messages .messages-pane > .subtabs {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      grid-column: 1 / span 2;
      grid-row: 1;
      gap: 4px;
      padding: 0;
      margin: 0;
      align-items: end;
    }

    .split-messages-runio .desktop:not(.desktop-stacked) #window-messages .messages-pane > .subtabs {
      --messages-tab-offset: 54px;
    }

    .split-messages-runio .desktop:not(.desktop-stacked) #window-messages .messages-pane > .subtabs .subtab-btn {
      width: max-content;
      max-width: 100%;
      justify-self: start;
      margin-left: var(--messages-tab-offset);
      pointer-events: none;
      cursor: default;
      border-color: var(--accent);
      color: #fff;
      background: var(--accent);
    }

    .split-messages-runio .desktop:not(.desktop-stacked) #window-messages .messages-pane > .subtabs .subtab-btn:nth-child(1) {
      grid-column: 1;
    }

    .split-messages-runio .desktop:not(.desktop-stacked) #window-messages .messages-pane > .subtabs .subtab-btn:nth-child(2) {
      grid-column: 2;
    }

    .split-messages-runio .desktop:not(.desktop-stacked) #window-messages .messages-subtab-panel {
      display: grid;
      min-height: 0;
      grid-row: 2;
    }

    .split-messages-runio .desktop:not(.desktop-stacked) #window-messages #panel-mars-messages {
      grid-column: 1;
      border-right: 1px solid #b7c4d4;
      padding-right: 2px;
    }

    .split-messages-runio .desktop:not(.desktop-stacked) #window-messages #panel-run-io {
      grid-column: 2;
      padding-left: 2px;
    }

    .split-messages-runio .desktop:not(.desktop-stacked) #window-messages .messages-tab-shell {
      padding: 0;
    }

    .messages-tab-shell {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      min-height: 0;
      height: 100%;
      padding: 4px;
      gap: 4px;
    }

    .messages-tab-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 50px;
    }

    .messages-clear-btn {
      align-self: center;
    }

    #window-messages .message-body {
      width: 100%;
      height: 100%;
      min-height: 0;
      margin: 0;
      padding: 4px 6px;
      border: 1px solid #a8b5c6;
      background: #fff;
      color: #1c2532;
      resize: none;
      overflow: auto;
      white-space: pre;
      font-family: "Cascadia Code", "Consolas", "Lucida Console", monospace;
      font-size: 12px;
      line-height: 1.3;
    }

    .run-io-body {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      min-height: 0;
      height: 100%;
    }

    .run-io-input-bar {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6px;
      align-items: center;
      padding: 4px;
      border-top: 1px solid #b6c1cf;
      background: #eef3f9;
    }

    .run-io-input {
      width: 100%;
      min-width: 0;
      border: 1px solid #93a3b7;
      background: #fff;
      border-radius: 2px;
      padding: 2px 5px;
      font-size: 11px;
      line-height: 1.2;
    }
    .dialog-window {
      min-width: 340px;
      min-height: 160px;
      resize: none;
    }

    .dialog-window-content {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto auto;
      gap: 8px;
      padding: 10px;
      background: #eef3f9;
      min-height: 0;
    }

    .dialog-message {
      white-space: pre-wrap;
      overflow: auto;
      border: 1px solid #b1becd;
      background: #fff;
      padding: 8px;
      line-height: 1.25;
      font-size: 11px;
      min-height: 56px;
      resize: none;
      color: #243649;
    }

    .dialog-message.info {
      color: #1f5f99;
      background: #eef6ff;
      border-color: #8fb4d9;
    }

    .dialog-message.success {
      color: #1d6b2f;
      background: #edf9ef;
      border-color: #93c29d;
    }

    .dialog-message.error {
      color: #9a2323;
      background: #fff2f2;
      border-color: #d9a1a1;
    }

    .dialog-input {
      width: 100%;
      margin: 0;
    }

    .dialog-form {
      min-height: 0;
      overflow: auto;
      display: grid;
      gap: 10px;
      padding-right: 2px;
    }

    .dialog-form-section {
      border: 1px solid #b1becd;
      background: #fff;
      padding: 8px;
      display: grid;
      gap: 8px;
    }

    .dialog-form-section-title {
      margin: 0;
      font-size: 12px;
      color: #243649;
    }

    .dialog-form-section-description {
      margin: 0;
      color: #42556a;
      font-size: 11px;
      line-height: 1.3;
    }

    .dialog-form-fields {
      display: grid;
      gap: 8px;
    }

    .dialog-form-row {
      display: grid;
      gap: 4px;
      font-size: 11px;
      color: #1f2d3b;
    }

    .dialog-form-fields-table {
      gap: 6px;
    }

    .dialog-form-row-inline {
      grid-template-columns: minmax(150px, 1fr) minmax(0, 1.35fr);
      align-items: center;
      gap: 8px;
    }

    .dialog-form-row-inline .dialog-form-label {
      display: block;
    }

    .dialog-form-section-table {
      padding: 7px 8px;
      gap: 6px;
    }

    .dialog-form-check {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #1f2d3b;
    }

    .dialog-form-control {
      width: 100%;
      min-width: 0;
      border: 1px solid #93a3b7;
      background: #fff;
      border-radius: 2px;
      padding: 2px 5px;
      font-size: 11px;
      line-height: 1.2;
      min-height: 22px;
    }

    .dialog-form-help {
      margin-top: -4px;
      font-size: 10px;
      line-height: 1.3;
      color: #5a6d82;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }

    #window-registers table th,
    #window-registers table td,
    #window-main table th,
    #window-main table td {
      font-size: 10px;
      padding: 2px 4px;
    }

    .cop-flags {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;
      font-size: 10px;
      color: #324258;
    }

    .cop0-flag {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      min-width: 14px;
      padding: 1px 3px;
      border: 1px solid #a5b2c2;
      border-radius: 2px;
      background: #f3f6fa;
      text-align: center;
    }

    .cop0-flag input[type="checkbox"] {
      margin: 0;
      width: 11px;
      height: 11px;
    }

    .cop0-flag.on {
      background: #9cd13f;
      border-color: #7faa32;
      color: #21340a;
      font-weight: 700;
    }
    .toolbar-speed-group {
      display: inline-grid;
      grid-template-columns: auto auto minmax(188px, 210px);
      align-items: center;
      gap: 6px;
      min-width: 360px;
    }

    .run-speed-label {
      font-size: 10px;
      color: #364454;
      white-space: nowrap;
      display: inline-block;
      width: 190px;
      min-width: 190px;
      max-width: 190px;
      overflow: hidden;
    }

    .run-speed-slider-wrap {
      display: grid;
      grid-template-rows: 14px 5px;
      align-items: center;
      gap: 1px;
    }

    #run-speed-slider {
      width: 188px;
      margin: 0;
      height: 14px;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
    }

    #run-speed-slider::-webkit-slider-runnable-track {
      height: 4px;
      background: linear-gradient(180deg, #bcc7d5, #a5b2c3);
      border: 1px solid #7f8fa4;
      border-radius: 1px;
    }

    #run-speed-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 10px;
      height: 14px;
      margin-top: -6px;
      border: 1px solid #6b7d93;
      border-radius: 2px;
      background: linear-gradient(180deg, #fefefe, #cfdceb);
    }

    #run-speed-slider::-moz-range-track {
      height: 4px;
      background: linear-gradient(180deg, #bcc7d5, #a5b2c3);
      border: 1px solid #7f8fa4;
      border-radius: 1px;
    }

    #run-speed-slider::-moz-range-thumb {
      width: 10px;
      height: 14px;
      border: 1px solid #6b7d93;
      border-radius: 2px;
      background: linear-gradient(180deg, #fefefe, #cfdceb);
    }

    .run-speed-ruler {
      width: 188px;
      height: 5px;
      border-left: 1px solid #92a0b1;
      border-right: 1px solid #92a0b1;
      background: repeating-linear-gradient(90deg, #8596ab 0, #8596ab 1px, transparent 1px, transparent 19px);
    }

    .run-speed-select-mobile {
      display: none;
      min-height: 24px;
      padding: 1px 4px;
      font-size: 11px;
      border: 1px solid #7f9db9;
      background: #fff;
      color: #1f2d3f;
    }
    #btn-new,
    #btn-open,
    #btn-save,
    #btn-undo,
    #btn-redo,
    #btn-assemble,
    #btn-compile-c0,
    #btn-go,
    #btn-step,
    #btn-backstep,
    #btn-reset,
    #btn-pause,
    #btn-stop {
      padding-left: 22px;
      background-repeat: no-repeat;
      background-position: 4px center;
      background-size: 13px 13px;
    }

    #btn-new { background-image: url("./assets/images/New16.png"); }
    #btn-open { background-image: url("./assets/images/Open16.png"); }
    #btn-save { background-image: url("./assets/images/Save16.png"); }
    #btn-undo { background-image: url("./assets/images/Undo16.png"); }
    #btn-redo { background-image: url("./assets/images/Redo16.png"); }
    #btn-assemble { background-image: url("./assets/images/Assemble16.png"); }
    #btn-compile-c0 { background-image: url("./assets/images/Assemble16.png"); }
    #btn-go { background-image: url("./assets/images/Play16.png"); }
    #btn-step { background-image: url("./assets/images/StepForward16.png"); }
    #btn-backstep { background-image: url("./assets/images/StepBack16.png"); }
    #btn-reset { background-image: url("./assets/images/Reset16.png"); }
    #btn-pause { background-image: url("./assets/images/Pause16.png"); }
    #btn-stop { background-image: url("./assets/images/Stop16.png"); }

    .menu-popup {
      position: fixed;
      z-index: 1200;
      min-width: 300px;
      background: #f0f4f9;
      border: 1px solid #8f9cac;
      border-radius: 2px;
      box-shadow: 0 8px 18px rgba(20, 28, 40, 0.28);
      padding: 4px;
    }

    .menu-popup.hidden { display: none; }
    .menu-sub-popup { min-width: 220px; }

    .menu-row {
      width: 100%;
      border: 1px solid transparent;
      background: transparent;
      display: grid;
      grid-template-columns: 18px 1fr auto 10px;
      gap: 8px;
      align-items: center;
      padding: 4px 8px;
      text-align: left;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
    }

    .menu-row:hover { border-color: #8fa1b6; background: #d9e7f8; }
    .menu-row.disabled { color: #7c8794; cursor: not-allowed; }
    .menu-row.disabled:hover { border-color: transparent; background: transparent; }
    .menu-row.has-submenu .menu-shortcut { color: #7d8897; }
    .menu-check { color: #20558f; font-weight: 700; }
    .menu-shortcut { color: #59687b; font-size: 11px; }
    .menu-arrow { color: #47586e; font-size: 10px; text-align: right; }
    .menu-separator { height: 1px; background: #c0cad7; margin: 4px 4px; }

    .mini-c-pane {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      min-height: 0;
      overflow: hidden;
      background: #e7edf6;
    }

    .mini-c-subtab-panel.active {
      display: block;
      min-height: 0;
      height: 100%;
      padding: 4px;
    }

    .mini-c-textarea {
      width: 100%;
      height: 100%;
      resize: none;
      border: 1px solid #8ea6c2;
      background: #f9fcff;
      color: #17273c;
      font-family: "Cascadia Code", "Consolas", "Lucida Console", monospace;
      font-size: 12px;
      line-height: 1.25;
      padding: 8px;
      box-sizing: border-box;
    }

    .mini-c-actions {
      display: flex;
      gap: 6px;
      align-items: center;
      justify-content: flex-end;
      padding: 5px 6px 7px;
      border-top: 1px solid #b3c2d4;
      background: #e2e9f2;
    }

    .mini-c-option {
      margin-right: auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #2a405a;
      font-size: 12px;
      user-select: none;
    }

    .help-window {
      min-width: 760px;
      min-height: 520px;
      max-width: calc(100% - 12px);
      max-height: calc(100% - 12px);
    }

    .help-window .window-content {
      padding: 0;
      overflow: hidden;
    }

    .help-window-content {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: #eef2f7;
      overflow: hidden;
    }

    .help-tab-row {
      display: flex;
      flex: 0 0 auto;
      flex-wrap: nowrap;
      align-items: flex-end;
      gap: 1px;
      padding: 3px 4px 0;
      border-bottom: 1px solid #9caab9;
      background: #d4d0c8;
      overflow-x: auto;
      overflow-y: hidden;
    }

    .help-subtab-row {
      background: #dfdfdf;
    }

    .help-subtab-row.hidden {
      display: none;
    }

    .help-tab-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #9c9c9c;
      border-bottom: none;
      background: #ece9d8;
      border-radius: 0;
      padding: 3px 10px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 400;
      white-space: nowrap;
      line-height: 1.1;
      flex: 0 0 auto;
    }

    .help-tab-btn.active {
      background: #fff;
      border-color: #808080;
      font-weight: 400;
      position: relative;
      top: 1px;
    }

    .help-mips-remarks-wrap {
      flex: 0 0 auto;
      min-height: 90px;
      max-height: 180px;
      overflow: auto;
      border-top: 1px solid #b8b8b8;
      border-bottom: 1px solid #b8b8b8;
      background: #ccff99;
    }

    .help-mips-remarks-wrap.hidden {
      display: none;
    }

    .help-mips-remarks {
      min-width: max-content;
      padding: 10px;
      font-size: 12px;
      line-height: 1.35;
    }

    .help-mips-remarks table {
      border-collapse: collapse;
      margin: 0 auto;
      background: #ccff99;
      font-size: 12px;
    }

    .help-mips-remarks td,
    .help-mips-remarks th {
      padding: 2px 8px;
      text-align: left;
      vertical-align: top;
    }

    .help-body-wrap {
      position: relative;
      flex: 1 1 auto;
      display: block;
      min-height: 0;
      overflow: hidden;
      background: #fff;
      border-top: 1px solid #bbc5d1;
    }

    .help-frame,
    .help-inline {
      display: block;
      width: 100%;
      height: 100%;
      border: none;
    }

    .help-inline {
      padding: 10px;
      overflow: auto;
      font-family: Tahoma, "Segoe UI", sans-serif;
      font-size: 12px;
      background: #fff;
    }

    .help-inline.hidden,
    .help-frame.hidden {
      display: none;
    }

    .help-inline h2 {
      margin-top: 0;
    }

    .help-list {
      margin: 0;
      padding: 0;
      list-style: none;
      font-family: "Courier New", monospace;
      font-size: 12px;
    }

    .help-list-item {
      display: grid;
      grid-template-columns: minmax(220px, max-content) 1fr;
      gap: 12px;
      padding: 3px 6px;
      line-height: 1.35;
      white-space: pre-wrap;
    }

    .help-list-item:nth-child(odd) {
      background: #eeeeee;
    }

    .help-list-example {
      white-space: pre;
    }

    .help-list-description {
      font-family: Tahoma, "Segoe UI", sans-serif;
    }

    .help-article {
      max-width: 960px;
      line-height: 1.35;
    }

    .help-article ul {
      margin-top: 0.35rem;
    }

    .help-plain {
      margin: 0;
      white-space: pre-wrap;
      font-family: "Courier New", monospace;
      font-size: 12px;
      line-height: 1.35;
      color: #1f2835;
    }

    .help-footer {
      display: flex;
      flex: 0 0 auto;
      justify-content: center;
      align-items: center;
      padding: 5px;
      border-top: 1px solid #a9b3bf;
      background: #edf2f8;
    }

    .about-window {
      min-width: 360px;
      min-height: 220px;
    }

    .about-window-content {
      display: grid;
      grid-template-rows: minmax(0, 1fr) auto;
      gap: 10px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.35;
      background: #f0f0f0;
    }

    .about-brand {
      display: block;
      min-height: 0;
      height: 100%;
    }

    .about-brand .help-frame {
      border: 1px solid #a9b3bf;
      background: #fff;
    }

    .about-copy {
      color: #111;
      white-space: pre-wrap;
    }

    .about-actions {
      display: flex;
      justify-content: center;
    }

    .tool-modal {
      position: fixed;
      inset: 0;
      z-index: 1320;
      background: rgba(9, 13, 20, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .tool-modal.hidden { display: none; }

    .tool-card {
      width: min(1180px, 96vw);
      height: min(88vh, 760px);
      display: grid;
      grid-template-rows: auto 1fr;
      overflow: hidden;
    }

    .tool-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid #9caab9;
      padding: 8px 10px;
      background: linear-gradient(180deg, #f6f8fb, #e7edf5);
    }

    .tool-content {
      min-height: 0;
      overflow: auto;
      background: #f4f7fb;
    }

    .tool-placeholder {
      max-width: 760px;
      padding: 20px;
      line-height: 1.45;
    }

    .bitmap-tool {
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 10px;
      padding: 10px;
      height: 100%;
    }

    .bitmap-tool-title {
      margin: 0;
      text-align: center;
      font-size: 42px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #1c2a3c;
    }

    .bitmap-main {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 12px;
      min-height: 0;
    }

    .bitmap-controls {
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .bitmap-control {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 10px;
      align-items: center;
      font-size: 18px;
      font-weight: 600;
    }

    .bitmap-control select {
      min-width: 175px;
      border: 1px solid #8497ad;
      background: #fff;
      border-radius: 2px;
      padding: 4px 6px;
      font-size: 18px;
      font-weight: 600;
    }

    .bitmap-canvas-wrap {
      border: 1px solid #20242b;
      background: #000;
      overflow: auto;
    }

    .bitmap-canvas {
      display: block;
      background: #000;
    }

    .bitmap-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #a9b5c4;
      padding-top: 10px;
    }

    .bitmap-footer .tool-btn { min-width: 116px; }

    .hide-labels-window .desktop:not(.desktop-stacked) .labels-panel { display: none; }
    .hide-labels-window .desktop:not(.desktop-stacked) .execute-top { grid-template-columns: 1fr; }

    @media (max-width: 1250px) {
      .toolbar-speed-group { min-width: 100%; grid-template-columns: auto 1fr; }
      .toolbar-speed-group .run-speed-label { display: none; }
      #run-speed-slider, .run-speed-ruler { width: 100%; }
      .bitmap-main { grid-template-columns: 1fr; }
      .bitmap-control { font-size: 17px; }
      .bitmap-control select { font-size: 16px; }
      .bitmap-tool-title { font-size: 26px; }
    }

    @media (max-width: ${stackedMaxWidthPx}px) {
      html, body {
        overflow: auto;
      }

      .execute-top {
        grid-template-columns: 1fr !important;
      }

      .labels-panel {
        display: none !important;
      }

      .shell {
        height: auto;
        min-height: 100vh;
        overflow: visible;
        grid-template-rows: auto auto minmax(0, 1fr);
        align-content: start;
      }

      .menu-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        row-gap: 3px;
        column-gap: 2px;
        padding: 2px 4px;
        min-height: 0;
      }

      .toolbar {
        display: grid;
        grid-template-columns: 1fr;
        align-content: start;
        gap: 1px;
        padding: 2px 4px;
        min-height: 0;
      }

      .toolbar-group {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 3px;
        width: 100%;
        padding: 3px 0 2px;
        border-top: 1px solid #afbccb;
      }

      .toolbar-group:first-child {
        border-top: none;
      }

      .toolbar-speed-group {
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: center;
        gap: 6px;
        min-width: 100%;
        width: 100%;
      }

      .run-speed-label {
        display: inline-block;
        width: auto;
        min-width: 0;
        max-width: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-size: 11px;
      }

      .run-speed-slider-wrap {
        display: none;
      }

      .run-speed-select-mobile {
        display: block;
        width: 100%;
        min-height: 28px;
        font-size: 13px;
      }

      .toolbar .tool-btn {
        min-height: 24px;
      }

      .desktop {
        overflow: visible;
        min-height: auto;
      }

      .menu-bar.panel,
      .toolbar.panel {
        border-radius: 0;
        box-shadow: none;
      }

      .desktop.desktop-stacked {
        height: auto !important;
        padding-bottom: 8px;
        overscroll-behavior-y: auto;
        overflow-x: hidden;
      }

      .desktop.desktop-stacked.desktop-main-maximized {
        height: auto !important;
        padding-bottom: 0 !important;
        overflow-y: hidden;
      }

      .desktop.desktop-stacked.desktop-main-maximized .desktop-window:not(#window-main) {
        display: none !important;
      }

      .desktop.desktop-stacked.desktop-main-maximized #window-main {
        left: 0 !important;
        right: 0 !important;
        width: auto !important;
      }

      .desktop.desktop-stacked .desktop-window {
        box-sizing: border-box;
        max-width: 100%;
        min-width: 0 !important;
      }

      .desktop.desktop-stacked .desktop-window:not(.tool-window) {
        left: 0 !important;
        right: 0 !important;
        width: auto !important;
        min-width: 0;
        max-width: 100%;
        border-radius: 0;
      }

      .desktop.desktop-stacked .desktop-window.window-minimized {
        height: auto !important;
        resize: none;
      }

      .desktop.desktop-stacked .desktop-window:not(.tool-window).window-minimized {
        height: 28px !important;
        min-height: 28px !important;
      }

      .desktop.desktop-stacked .desktop-window.tool-window:not(.dialog-window).window-minimized {
        height: 31px !important;
        min-height: 31px !important;
      }

      .desktop.desktop-stacked .desktop-window.tool-window:not(.dialog-window) {
        left: 0 !important;
        right: 0 !important;
        width: auto !important;
        min-width: 0;
        max-width: 100%;
        border-radius: 0;
        box-shadow: none;
      }

      .desktop.desktop-stacked .desktop-window:not(.tool-window) .window-titlebar {
        cursor: default;
        height: 26px;
        font-size: 12px;
        padding: 0 7px 0 8px;
      }

      .desktop.desktop-stacked .desktop-window.tool-window:not(.dialog-window) .window-titlebar {
        cursor: default;
        height: 29px;
        font-size: 12px;
        padding: 0 7px 0 8px;
      }

      .desktop.desktop-stacked .desktop-window .window-controls {
        gap: 4px;
      }

      .desktop.desktop-stacked .desktop-window .win-btn {
        min-width: 20px;
        height: 20px;
        font-size: 12px;
        padding: 0 3px;
      }

      .desktop.desktop-stacked .desktop-window.tool-window:not(.dialog-window) .win-btn {
        min-width: 21px;
        height: 21px;
      }

      .desktop.desktop-stacked .desktop-window:not(.tool-window) .window-content {
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
      }

      .desktop.desktop-stacked .desktop-window.tool-window:not(.dialog-window) .window-content {
        min-height: 0;
        padding: 2px;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: auto;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
      }

      .desktop.desktop-stacked .desktop-window.tool-window:not(.dialog-window) .window-content,
      .desktop.desktop-stacked .desktop-window.tool-window:not(.dialog-window) .window-content * {
        box-sizing: border-box;
        max-width: 100%;
        min-width: 0;
      }

      .desktop.desktop-stacked #window-registers .window-content,
      .desktop.desktop-stacked #window-registers .subtab-panel,
      .desktop.desktop-stacked #window-registers .register-body {
        overflow: visible;
      }

      .desktop.desktop-stacked .desktop-window:not(#window-main) .window-controls [data-win-action="max"] {
        display: none;
      }

      .desktop.desktop-stacked .desktop-window:not(.tool-window) .window-resize-handle {
        display: none;
      }

      .desktop.desktop-stacked .desktop-window.tool-window:not(.dialog-window) .window-resize-handle {
        display: none;
      }

      .desktop.desktop-stacked .desktop-shared-splitter.splitter-vertical {
        display: none;
      }

      .desktop.desktop-stacked .desktop-shared-splitter.splitter-horizontal {
        left: 0 !important;
        width: 100% !important;
      }

      .desktop.desktop-stacked .desktop-shared-splitter.splitter-horizontal::before {
        inset: 0;
        background: rgba(73, 119, 171, 0.22);
      }

      .desktop.desktop-stacked.desktop-main-maximized .desktop-shared-splitter {
        display: none !important;
      }
    }

    @media (max-width: 499px) {
      .menu-logo {
        display: none;
      }

      .menu-bar {
        padding: 2px 4px;
      }

      .menu-item {
        padding: 2px 6px;
        font-size: 11px;
      }

      .toolbar {
        padding: 2px 4px;
      }

      .toolbar .tool-btn {
        padding: 1px 5px;
        font-size: 11px;
        min-height: 24px;
      }

      .run-speed-label {
        font-size: 11px;
      }

      .window-titlebar {
        padding: 0 4px 0 5px;
      }

      #window-registers table th,
      #window-registers table td,
      #window-main table th,
      #window-main table td {
        font-size: 11px;
      }
    }
  `;
  document.head.appendChild(style);
}

