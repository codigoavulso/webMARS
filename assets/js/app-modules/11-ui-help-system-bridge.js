function createHelpSystem(refs, messagesPane, windowManager) {
  if (typeof window !== "undefined" && typeof window.createMarsJavaStyleHelpSystem === "function") {
    return window.createMarsJavaStyleHelpSystem(refs, messagesPane, windowManager);
  }
  const desktop = refs.windows.desktop;
  const renderArticle = (title, body) => `
    <article class="help-article">
      <h2>${escapeHtml(translateText(title))}</h2>
      ${body}
    </article>`;
  const renderParagraph = (message) => `<p>${escapeHtml(translateText(message))}</p>`;
  const appVersion = String((typeof window !== "undefined" ? window.WebMarsAppVersion?.version : "") || "").trim();
  const helpBrandTitle = appVersion ? `webMARS ${appVersion}` : "webMARS";
  const ABOUT_INFO_PAGE_PATH = "./help/info.html";
  const groups = [
    {
      id: "webmars",
      label: "webMARS",
      pages: [
        { id: "info", label: "Info", path: "./help/info.html" },
        { id: "changelog", label: "Changelog", path: "./help/changelog.html" }
      ]
    },
    {
      id: "mips",
      label: "MIPS",
      pages: [
        {
          id: "basic",
          label: "Basic Instructions",
          renderHtml: () => renderArticle("Basic Instructions", [
            renderParagraph("The web runtime follows the Java MARS 4.5 core for basic MIPS instruction execution."),
            renderParagraph("Use the official references below for canonical syntax and behavior details."),
            `<ul>
              <li><a href="./help/mipsref.pdf" target="_blank" rel="noopener noreferrer">${escapeHtml(translateText("Open mipsref.pdf"))}</a></li>
              <li>${escapeHtml(translateText("Source of truth in this workspace:"))} <code>mars/mips/instructions/</code>.</li>
            </ul>`
          ].join(""))
        },
        {
          id: "extended",
          label: "Extended (pseudo) Instructions",
          renderHtml: () => renderArticle("Extended (Pseudo) Instructions", [
            `<p>${escapeHtml(translateText("Pseudo-instruction expansion follows"))} <code>PseudoOps.txt</code> ${escapeHtml(translateText("from Java MARS 4.5."))}</p>`,
            renderParagraph("Macro expansion and pseudo-op lowering are applied before assembly, matching the Java workflow.")
          ].join(""))
        },
        {
          id: "directives",
          label: "Directives",
          renderHtml: () => renderArticle("Directives", [
            renderParagraph("The assembler supports the MARS directive set used in normal workflows, including data directives, macros and includes."),
            `<p>${escapeHtml(translateText("See"))} <code>mars/assembler</code> ${escapeHtml(translateText("and bundled help pages for directive-specific semantics."))}</p>`
          ].join(""))
        },
        { id: "syscalls", label: "Syscalls", path: "./help/SyscallHelp.html" },
        { id: "exceptions", label: "Exceptions", path: "./help/ExceptionsHelp.html" },
        { id: "macros", label: "Macros", path: "./help/MacrosHelp.html" }
      ]
    },
    {
      id: "mars",
      label: "MARS",
      pages: [
        { id: "intro", label: "Intro", path: "./help/MarsHelpIntro.html" },
        { id: "ide", label: "IDE", path: "./help/MarsHelpIDE.html" },
        { id: "debugging", label: "Debugging", path: "./help/MarsHelpDebugging.html" },
        { id: "settings", label: "Settings", path: "./help/MarsHelpSettings.html" },
        { id: "tools", label: "Tools", path: "./help/MarsHelpTools.html" },
        { id: "command", label: "Command", path: "./help/MarsHelpCommand.html" },
        { id: "limits", label: "Limits", path: "./help/MarsHelpLimits.html" },
        { id: "history", label: "History", path: "./help/MarsHelpHistory.html" }
      ]
    },
    {
      id: "license",
      label: "License",
      pages: [{ id: "main", label: "License", path: "./help/MARSlicense.txt" }]
    },
    {
      id: "bugs",
      label: "Bugs/Comments",
      pages: [{ id: "main", label: "Bugs/Comments", path: "./help/BugReportingHelp.html" }]
    },
    {
      id: "ack",
      label: "Acknowledgements",
      pages: [{ id: "main", label: "Acknowledgements", path: "./help/Acknowledgements.html" }]
    },
    {
      id: "song",
      label: "Instruction Set Song",
      pages: [{ id: "main", label: "Instruction Set Song", path: "./help/MIPSInstructionSetSong.html" }]
    }
  ];

  const win = document.createElement("section");
  win.className = "desktop-window window-hidden tool-window help-window";
  win.id = "window-help";
  win.style.left = "110px";
  win.style.top = "60px";
  win.style.width = "992px";
  win.style.height = "732px";
  win.innerHTML = `
    <div class="window-titlebar">
      <span class="window-title" id="help-title">${helpBrandTitle} Help</span>
      <div class="window-controls">
        <button class="win-btn" data-win-action="min" type="button">_</button>
        <button class="win-btn" data-win-action="max" type="button">[]</button>
        <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
      </div>
    </div>
    <div class="window-content help-window-content">
      <div class="help-tab-row" id="help-top-tabs"></div>
      <div class="help-tab-row help-subtab-row" id="help-sub-tabs"></div>
      <div class="help-body-wrap">
        <iframe id="help-frame" class="help-frame" title="MARS Help"></iframe>
        <div id="help-inline" class="help-inline hidden"></div>
      </div>
      <div class="help-footer">
        <button id="help-close" class="tool-btn" type="button">Close</button>
      </div>
    </div>
  `;

  desktop.appendChild(win);
  windowManager.registerWindow(win);

  const aboutWin = document.createElement("section");
  aboutWin.className = "desktop-window window-hidden tool-window about-window";
  aboutWin.id = "window-help-about";
  aboutWin.style.left = "180px";
  aboutWin.style.top = "120px";
  aboutWin.style.width = "760px";
  aboutWin.style.height = "420px";
  aboutWin.innerHTML = `
    <div class="window-titlebar">
      <span class="window-title">About webMARS</span>
      <div class="window-controls">
        <button class="win-btn" data-win-action="min" type="button">_</button>
        <button class="win-btn" data-win-action="max" type="button">[]</button>
        <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
      </div>
    </div>
    <div class="window-content about-window-content">
      <div class="about-brand">
        <iframe id="about-frame" class="help-frame" title="About webMARS"></iframe>
      </div>
      <div class="about-actions">
        <button id="help-about-close" class="tool-btn" type="button">Close</button>
      </div>
    </div>
  `;
  desktop.appendChild(aboutWin);
  windowManager.registerWindow(aboutWin);
  const docWin = document.createElement("section");
  docWin.className = "desktop-window window-hidden tool-window help-window";
  docWin.id = "window-help-doc";
  docWin.style.left = "140px";
  docWin.style.top = "90px";
  docWin.style.width = "980px";
  docWin.style.height = "700px";
  docWin.innerHTML = `
    <div class="window-titlebar">
      <span class="window-title" id="help-doc-title">Help Document</span>
      <div class="window-controls">
        <button class="win-btn" data-win-action="min" type="button">_</button>
        <button class="win-btn" data-win-action="max" type="button">[]</button>
        <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
      </div>
    </div>
    <div class="window-content help-window-content">
      <div class="help-body-wrap">
        <iframe id="help-doc-frame" class="help-frame" title="Help Document"></iframe>
      </div>
      <div class="help-footer">
        <button id="help-doc-close" class="tool-btn" type="button">Close</button>
      </div>
    </div>
  `;
  desktop.appendChild(docWin);
  windowManager.registerWindow(docWin);
  const refreshHelpWindowTranslations = translateStaticTree(win);
  const refreshAboutWindowTranslations = translateStaticTree(aboutWin);
  const refreshDocumentWindowTranslations = translateStaticTree(docWin);

  const titleNode = win.querySelector("#help-title");
  const closeButton = win.querySelector("#help-close");
  const topTabsNode = win.querySelector("#help-top-tabs");
  const subTabsNode = win.querySelector("#help-sub-tabs");
  const frame = win.querySelector("#help-frame");
  const inlineNode = win.querySelector("#help-inline");
  const titleCloseButton = win.querySelector('[data-win-action="close"]');
  const aboutFrameNode = aboutWin.querySelector("#about-frame");
  const aboutCloseButton = aboutWin.querySelector("#help-about-close");
  const docTitleNode = docWin.querySelector("#help-doc-title");
  const docFrame = docWin.querySelector("#help-doc-frame");
  const docCloseButton = docWin.querySelector("#help-doc-close");
  const docTitleCloseButton = docWin.querySelector('[data-win-action="close"]');

  let activeGroupId = "webmars";
  let activePageId = "info";
  let currentDocumentTitle = "Help Document";
  let currentLoadToken = 0;

  const getGroup = (groupId) => groups.find((group) => group.id === groupId) || groups[0];
  const getPage = (group, pageId) => group.pages.find((page) => page.id === pageId) || group.pages[0];
  const updateTitle = (group, page) => {
    titleNode.textContent = `${helpBrandTitle} [${translateText(group.label)} / ${translateText(page.label)}]`;
  };

  function cleanupView() {
    frame.src = "about:blank";
    inlineNode.innerHTML = "";
    inlineNode.classList.add("hidden");
    frame.classList.remove("hidden");
  }

  function closeWindow() {
    cleanupView();
    windowManager.hide(win.id);
  }

  function closeDocWindow() {
    docFrame.src = "about:blank";
    windowManager.hide(docWin.id);
  }

  function loadAboutWindow() {
    if (!(aboutFrameNode instanceof HTMLIFrameElement)) return;
    aboutFrameNode.src = "about:blank";
    aboutFrameNode.src = ABOUT_INFO_PAGE_PATH;
  }

  function renderTopTabs() {
    topTabsNode.innerHTML = groups.map((group) => {
      const active = group.id === activeGroupId ? "active" : "";
      return `<button type="button" class="help-tab-btn ${active}" data-help-group="${group.id}">${escapeHtml(translateText(group.label))}</button>`;
    }).join("");

    topTabsNode.querySelectorAll("[data-help-group]").forEach((button) => {
      button.addEventListener("click", () => {
        activeGroupId = button.dataset.helpGroup;
        const group = getGroup(activeGroupId);
        activePageId = group.pages[0].id;
        render();
      });
    });
  }

  function renderSubTabs(group) {
    if (group.pages.length <= 1) {
      subTabsNode.classList.add("hidden");
      subTabsNode.innerHTML = "";
      return;
    }

    subTabsNode.classList.remove("hidden");
    subTabsNode.innerHTML = group.pages.map((page) => {
      const active = page.id === activePageId ? "active" : "";
      return `<button type="button" class="help-tab-btn ${active}" data-help-page="${page.id}">${escapeHtml(translateText(page.label))}</button>`;
    }).join("");

    subTabsNode.querySelectorAll("[data-help-page]").forEach((button) => {
      button.addEventListener("click", () => {
        activePageId = button.dataset.helpPage;
        render();
      });
    });
  }

  function loadPage(page, group) {
    const loadToken = ++currentLoadToken;
    updateTitle(group, page);
    if (typeof page.renderHtml === "function") {
      frame.classList.add("hidden");
      inlineNode.classList.remove("hidden");
      inlineNode.innerHTML = page.renderHtml();
      return;
    }

    if (typeof page.path === "string" && /\.txt$/i.test(page.path)) {
      frame.classList.add("hidden");
      inlineNode.classList.remove("hidden");
      inlineNode.innerHTML = `<pre class="help-plain">${escapeHtml(translateText("Loading..."))}</pre>`;
      const loadPlainText = () => fetch(page.path, { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.text();
        })
        .catch(() => new Promise((resolve, reject) => {
          const req = new XMLHttpRequest();
          req.open("GET", page.path, true);
          req.onload = () => {
            if (req.status === 0 || (req.status >= 200 && req.status < 300)) {
              resolve(req.responseText);
              return;
            }
            reject(new Error("HTTP " + req.status));
          };
          req.onerror = () => reject(new Error(translateText("Failed to load text resource.")));
          req.send();
        }));

      loadPlainText()
        .then((body) => {
          if (loadToken !== currentLoadToken) return;
          inlineNode.innerHTML = `<pre class="help-plain">${escapeHtml(body)}</pre>`;
        })
        .catch(() => {
          if (loadToken !== currentLoadToken) return;
          inlineNode.innerHTML = `<pre class="help-plain">${escapeHtml(translateText("Failed to load this help page."))}</pre>`;
          messagesPane.postMars("[error] Failed to load selected help file.\n");
        });
      return;
    }

    inlineNode.classList.add("hidden");
    inlineNode.innerHTML = "";
    frame.classList.remove("hidden");
    frame.src = page.path;
  }
  function render() {
    const group = getGroup(activeGroupId);
    const page = getPage(group, activePageId);
    renderTopTabs();
    renderSubTabs(group);
    loadPage(page, group);
  }

  closeButton.addEventListener("click", closeWindow);
  titleCloseButton?.addEventListener("click", closeWindow);
  aboutCloseButton?.addEventListener("click", () => windowManager.hide(aboutWin.id));
  docCloseButton?.addEventListener("click", closeDocWindow);
  docTitleCloseButton?.addEventListener("click", closeDocWindow);
  aboutFrameNode?.addEventListener("error", () => {
    messagesPane.postMars("[error] Failed to load About info page.\n");
  });
  docFrame?.addEventListener("error", () => {
    messagesPane.postMars("[error] Failed to load selected help document.\n");
  });

  frame.addEventListener("error", () => {
    messagesPane.postMars("[error] Failed to load selected help file.\n");
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !win.classList.contains("window-hidden")) closeWindow();
    if (event.key === "Escape" && !aboutWin.classList.contains("window-hidden")) windowManager.hide(aboutWin.id);
    if (event.key === "Escape" && !docWin.classList.contains("window-hidden")) closeDocWindow();
  });

  return {
    open(groupId = "webmars", pageId = "info") {
      const group = getGroup(groupId);
      const page = getPage(group, pageId);
      activeGroupId = group.id;
      activePageId = page.id;
      render();
      windowManager.show(win.id);
    },
    openAbout() {
      loadAboutWindow();
      windowManager.show(aboutWin.id);
    },
    openDocument(path, title = "Help Document") {
      const safePath = String(path || "").trim();
      if (!safePath) return;
      currentDocumentTitle = String(title || "Help Document");
      docTitleNode.textContent = translateText(currentDocumentTitle);
      docFrame.src = safePath;
      windowManager.show(docWin.id);
    },
    close: closeWindow,
    refreshTranslations() {
      refreshHelpWindowTranslations();
      refreshAboutWindowTranslations();
      refreshDocumentWindowTranslations();
      if (!aboutWin.classList.contains("window-hidden")) loadAboutWindow();
      if (docTitleNode) docTitleNode.textContent = translateText(currentDocumentTitle || "Help Document");
      const group = getGroup(activeGroupId);
      const page = getPage(group, activePageId);
      renderTopTabs();
      renderSubTabs(group);
      updateTitle(group, page);
      if (!win.classList.contains("window-hidden") && typeof page.renderHtml === "function") {
        frame.classList.add("hidden");
        inlineNode.classList.remove("hidden");
        inlineNode.innerHTML = page.renderHtml();
      }
    }
  };
}

