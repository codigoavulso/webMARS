function tabController(root, buttonSelector, panelSelector) {
  const buttons = [...root.querySelectorAll(buttonSelector)];
  const panels = [...root.querySelectorAll(panelSelector)];

  const activate = (panelId) => {
    buttons.forEach((button) => {
      button.classList.toggle("active", button.dataset.panel === panelId);
    });
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === panelId);
    });
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => activate(button.dataset.panel));
  });

  return {
    activate
  };
}

export function renderLayout(root) {
  root.innerHTML = `
    <div class="shell">
      <nav class="menu-bar panel">
        <button class="menu-item" type="button">File</button>
        <button class="menu-item" type="button">Edit</button>
        <button class="menu-item" type="button">Run</button>
        <button class="menu-item" type="button">Settings</button>
        <button class="menu-item" type="button">Help</button>
      </nav>

      <section class="toolbar panel">
        <div class="toolbar-group">
          <button class="tool-btn" id="btn-new" type="button">New</button>
          <button class="tool-btn" id="btn-open" type="button">Open</button>
          <button class="tool-btn" id="btn-save" type="button">Save</button>
        </div>

        <div class="toolbar-group">
          <button class="tool-btn" id="btn-assemble" type="button">Assemble</button>
          <button class="tool-btn primary" id="btn-go" type="button">Go</button>
          <button class="tool-btn" id="btn-step" type="button">Step</button>
          <button class="tool-btn" id="btn-backstep" type="button">Backstep</button>
          <button class="tool-btn" id="btn-reset" type="button">Reset</button>
          <button class="tool-btn" id="btn-pause" type="button">Pause</button>
          <button class="tool-btn" id="btn-stop" type="button">Stop</button>
        </div>

        <div class="toolbar-group">
          <span id="assembly-status" class="tag warn">not assembled</span>
        </div>
      </section>

      <section class="workspace">
        <div class="main-column">
          <section class="main-pane panel">
            <div class="tabs">
              <button class="tab-btn active" type="button" data-panel="panel-edit">Edit</button>
              <button class="tab-btn" type="button" data-panel="panel-execute">Execute</button>
            </div>

            <div id="panel-edit" class="tab-panel active">
              <div class="editor-wrap">
                <textarea id="source-editor" spellcheck="false"></textarea>
              </div>
            </div>

            <div id="panel-execute" class="tab-panel">
              <div class="execute-wrap">
                <div class="execute-top">
                  <section class="segment-panel">
                    <h3 class="panel-title">Text Segment</h3>
                    <div class="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>BP</th>
                            <th>Address</th>
                            <th>Code</th>
                            <th>Basic</th>
                            <th>Source</th>
                          </tr>
                        </thead>
                        <tbody id="text-segment-body"></tbody>
                      </table>
                    </div>
                  </section>

                  <section class="labels-panel">
                    <h3 class="panel-title">Labels</h3>
                    <ul id="labels-list" class="labels-list"></ul>
                  </section>
                </div>

                <section class="data-panel">
                  <h3 class="panel-title">Data Segment</h3>
                  <div class="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Address</th>
                          <th>Hex</th>
                          <th>Decimal</th>
                        </tr>
                      </thead>
                      <tbody id="data-segment-body"></tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>

            <div class="status-bar">
              <span id="editor-lines">lines: 0</span>
              <span id="editor-caret">Ln 1, Col 1</span>
              <span id="runtime-pc">PC: 0x00400000</span>
              <span id="runtime-steps">steps: 0</span>
            </div>
          </section>

          <section class="messages-pane panel">
            <div class="subtabs">
              <button class="subtab-btn active" type="button" data-panel="panel-mars-messages">MARS Messages</button>
              <button class="subtab-btn" type="button" data-panel="panel-run-io">Run I/O</button>
            </div>
            <div id="panel-mars-messages" class="subtab-panel active">
              <pre id="mars-messages" class="message-body mars"></pre>
            </div>
            <div id="panel-run-io" class="subtab-panel">
              <pre id="run-messages" class="message-body run"></pre>
            </div>
          </section>
        </div>

        <section class="registers-pane panel">
          <div class="subtabs">
            <button class="subtab-btn active" type="button" data-panel="panel-registers">Registers</button>
            <button class="subtab-btn" type="button" data-panel="panel-coprocessor1">Coprocessor 1</button>
            <button class="subtab-btn" type="button" data-panel="panel-coprocessor0">Coprocessor 0</button>
          </div>

          <div id="panel-registers" class="subtab-panel active">
            <div class="register-body">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Hex</th>
                    <th>Dec</th>
                  </tr>
                </thead>
                <tbody id="registers-body"></tbody>
              </table>
            </div>
          </div>

          <div id="panel-coprocessor1" class="subtab-panel">
            <div class="register-body muted">
              Coprocessor 1 view will be mapped from legacy MARS behavior.
            </div>
          </div>

          <div id="panel-coprocessor0" class="subtab-panel">
            <div class="register-body muted">
              Coprocessor 0 view will be mapped from legacy MARS behavior.
            </div>
          </div>
        </section>
      </section>
    </div>
  `;

  const mainTabs = tabController(root, ".main-pane .tab-btn", ".main-pane .tab-panel");
  const messageTabs = tabController(root, ".messages-pane .subtab-btn", ".messages-pane .subtab-panel");
  const registerTabs = tabController(root, ".registers-pane .subtab-btn", ".registers-pane .subtab-panel");

  return {
    root,
    tabs: {
      main: mainTabs,
      messages: messageTabs,
      registers: registerTabs
    },
    buttons: {
      newFile: root.querySelector("#btn-new"),
      open: root.querySelector("#btn-open"),
      save: root.querySelector("#btn-save"),
      assemble: root.querySelector("#btn-assemble"),
      go: root.querySelector("#btn-go"),
      step: root.querySelector("#btn-step"),
      backstep: root.querySelector("#btn-backstep"),
      reset: root.querySelector("#btn-reset"),
      pause: root.querySelector("#btn-pause"),
      stop: root.querySelector("#btn-stop")
    },
    editor: root.querySelector("#source-editor"),
    status: {
      assemblyTag: root.querySelector("#assembly-status"),
      lines: root.querySelector("#editor-lines"),
      caret: root.querySelector("#editor-caret"),
      runtimePc: root.querySelector("#runtime-pc"),
      runtimeSteps: root.querySelector("#runtime-steps")
    },
    execute: {
      textBody: root.querySelector("#text-segment-body"),
      labelsList: root.querySelector("#labels-list"),
      dataBody: root.querySelector("#data-segment-body")
    },
    messages: {
      mars: root.querySelector("#mars-messages"),
      run: root.querySelector("#run-messages")
    },
    registers: {
      body: root.querySelector("#registers-body")
    }
  };
}
