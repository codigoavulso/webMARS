function createMenuSystem(refs, handlers, getState, toolManager) {
  const popup = document.createElement("div");
  popup.className = "menu-popup hidden";
  document.body.appendChild(popup);

  const submenuPopup = document.createElement("div");
  submenuPopup.className = "menu-popup menu-sub-popup hidden";
  document.body.appendChild(submenuPopup);

  const submenuPopupLevel2 = document.createElement("div");
  submenuPopupLevel2.className = "menu-popup menu-sub-popup hidden";
  document.body.appendChild(submenuPopupLevel2);

  const definitions = () => {
    const state = getState();
    const hasOpenProject = state?.project?.isOpen === true;
    const hasActiveFile = Array.isArray(state?.files) && state.files.length > 0;
    const cloudAuthenticated = state?.cloud?.authenticated === true;
    const cloudUserName = String(state?.cloud?.user?.username || "").trim();
    const examples = typeof handlers.getExampleMenuItems === "function" ? handlers.getExampleMenuItems() : [];
    const exampleItems = examples.length ? examples : [{ label: "(no examples)", enabled: () => false }];
    const windows = typeof handlers.getViewMenuItems === "function" ? handlers.getViewMenuItems() : [];
    const viewItems = windows.length ? windows : [{ label: "(no windows)", enabled: () => false }];
    const newMenuItems = [{ label: "Project", command: "newProject", shortcut: "Ctrl+N" }];
    if (hasOpenProject) {
      newMenuItems.push(
        { label: "c file", command: "newC0File" },
        { label: "s file", command: "newSFile" }
      );
    }
    const closeMenuItems = [
      { label: "Active file", command: "closeFile", shortcut: "Ctrl+W", enabled: () => hasActiveFile },
      { label: "Close project", command: "closeProject", enabled: () => hasOpenProject }
    ];
    const cloudMenuItems = [
      {
        label: () => (cloudAuthenticated
          ? `Signed in as ${cloudUserName || "user"}`
          : "Not signed in"),
        enabled: () => false
      },
      {
        label: () => (cloudAuthenticated
          ? `Logout${cloudUserName ? ` (${cloudUserName})` : ""}`
          : "Login..."),
        command: cloudAuthenticated ? "cloudLogout" : "cloudLogin"
      }
    ];
    if (!cloudAuthenticated) {
      cloudMenuItems.push({ label: "Create User...", command: "cloudRegister" });
    }
    cloudMenuItems.push(
      "-",
      { label: "Open Cloud Project...", command: "cloudOpenProject", enabled: () => cloudAuthenticated },
      { label: "Save Project", command: "cloudSaveProject", enabled: () => cloudAuthenticated && hasOpenProject },
      { label: "Sync All Projects", command: "cloudSyncAllProjects", enabled: () => cloudAuthenticated },
      { label: "Refresh Session", command: "cloudRefreshSession" }
    );
    return {
      File: [
        { label: "New", submenu: newMenuItems },
        { label: "Open from Disk...", command: "openFileFromDisk", shortcut: "Ctrl+O" },
        { label: "Open from Browser Storage...", command: "openFileFromBrowserStorage" },
        "-",
        { label: "Close", submenu: closeMenuItems },
        "-",
        { label: "Save Active File", command: "saveFile", shortcut: "Ctrl+S", enabled: () => hasActiveFile },
        { label: "Save Project", command: "saveProjectWorkspace", enabled: () => hasOpenProject },
        "-",
        { label: "Download", command: "saveFileToDisk" },
        { label: "Download As...", command: "saveFileToDiskAs", shortcut: "Ctrl+Shift+S" },
        "-",
        { label: "Examples", submenu: exampleItems },
        "-",
        { label: "Dump Run I/O", command: "dumpRunIo" }
      ],
      Cloud: cloudMenuItems,
      Edit: [
        { label: "Undo", command: "undo", shortcut: "Ctrl+Z" },
        { label: "Redo", command: "redo", shortcut: "Ctrl+Y" },
        "-",
        { label: "Cut", command: "cut", shortcut: "Ctrl+X" },
        { label: "Copy", command: "copy", shortcut: "Ctrl+C" },
        { label: "Paste", command: "paste", shortcut: "Ctrl+V" },
        { label: "Find", command: "find", shortcut: "Ctrl+F" },
        { label: "Select All", command: "selectAll", shortcut: "Ctrl+A" }
      ],
      Run: [
        { label: "Compile C0", command: "compileC0", shortcut: "F4", enabled: () => refs.buttons?.compileC0?.disabled !== true },
        { label: "Assemble", command: "assemble", shortcut: "F3", enabled: () => refs.buttons?.assemble?.disabled !== true },
        { label: "Go", command: "go", shortcut: "F5", enabled: () => refs.buttons?.go?.disabled !== true },
        { label: "Pause", command: "pause", enabled: () => refs.buttons?.pause?.disabled !== true },
        { label: "Stop", command: "stop", enabled: () => refs.buttons?.stop?.disabled !== true },
        { label: "Step", command: "step", shortcut: "F7", enabled: () => refs.buttons?.step?.disabled !== true },
        { label: "Backstep", command: "backstep", enabled: () => refs.buttons?.backstep?.disabled !== true },
        { label: "Reset", command: "reset", enabled: () => refs.buttons?.reset?.disabled !== true }
      ],
      Settings: [
        { label: "Show Labels Window (symbol table)", command: "toggleShowLabelsWindow", check: (st) => st.preferences.showLabelsWindow },
        { label: "Program arguments provided to MIPS program", command: "toggleProgramArguments", check: (st) => st.preferences.programArguments },
        { label: "Popup dialog for input syscalls", command: "togglePopupSyscallInput", check: (st) => st.preferences.popupSyscallInput },
        { label: "Separate Mars Messages from Run I/O", command: "toggleSplitMessagesRunIo", check: (st) => st.preferences.splitMessagesRunIo },
        { label: "Addresses displayed in hexadecimal", command: "toggleAddressDisplayBase", check: (st) => st.preferences.displayAddressesHex },
        { label: "Values displayed in hexadecimal", command: "toggleValueDisplayBase", check: (st) => st.preferences.displayValuesHex },
        "-",
        { label: "Assemble file upon opening", command: "toggleAssembleOnOpen", check: (st) => st.preferences.assembleOnOpen },
        { label: "Assemble all files in directory", command: "toggleAssembleAll", check: (st) => st.preferences.assembleAll },
        { label: "Assembler warnings are considered errors", command: "toggleWarningsAreErrors", check: (st) => st.preferences.warningsAreErrors },
        { label: "Initialize Program Counter to global 'main' if defined", command: "toggleStartAtMain", check: (st) => st.preferences.startAtMain },
        { label: "Permit extended (pseudo) instructions and formats", command: "toggleExtendedAssembler", check: (st) => st.preferences.extendedAssembler },
        { label: "Delayed branching", command: "toggleDelayedBranching", check: (st) => st.preferences.delayedBranching },
        { label: "Self-modifying code", command: "toggleSelfModifyingCode", check: (st) => st.preferences.selfModifyingCode },
        "-",
        { label: "Open Mini-C output window after compile", command: "toggleMiniCOutputWindow", check: (st) => st.preferences.miniCOpenOutputWindow },
        { label: "Mini-C (C0) Compiler...", command: "showMiniCCompilerPreferences" },
        "-",
        { label: "Store/Load state...", command: "manageProjectStates" },
        { label: "Clear localStorage and loaded states...", command: "clearLocalData" },
        "-",
        { label: "Cloud Server...", command: "showCloudServerPreferences" },
        "-",
        { label: "Interface...", command: "showInterfacePreferences" },
        { label: "Runtime & Memory...", command: "showRuntimeMemoryPreferences" }
      ],
      View: viewItems,
      Tools: toolManager.getTools().map((tool) => ({
        label: tool.label,
        command: () => handlers.openTool(tool.id)
      })),
      Help: [
        { label: "Help", command: "helpHub", shortcut: "F1" },
        "-",
        { label: "About ...", command: "helpAbout" }
      ]
    };
  };

  let activeMenu = null;

  function isMenuDockedBottom() {
    return refs.root?.classList?.contains("menu-at-bottom") === true;
  }

  function hideDeepSubmenu() {
    submenuPopupLevel2.classList.add("hidden");
    submenuPopupLevel2.innerHTML = "";
  }

  function hideSubmenu() {
    hideDeepSubmenu();
    submenuPopup.classList.add("hidden");
    submenuPopup.innerHTML = "";
  }

  function hide() {
    hideSubmenu();
    popup.classList.add("hidden");
    popup.innerHTML = "";
    refs.root.querySelectorAll(".menu-item").forEach((button) => button.classList.remove("active"));
    activeMenu = null;
  }

  function run(command) {
    if (typeof command === "function") command();
    else if (typeof handlers[command] === "function") handlers[command]();
    hide();
  }

  function renderRows(target, items, state) {
    const inSubmenu = target === submenuPopup || target === submenuPopupLevel2;
    target.innerHTML = "";
    items.forEach((item) => {
      if (item === "-") {
        const sep = document.createElement("div");
        sep.className = "menu-separator";
        target.appendChild(sep);
        return;
      }

      const row = document.createElement("button");
      row.type = "button";
      const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
      row.className = `menu-row${hasSubmenu ? " has-submenu" : ""}`;

      const checked = typeof item.check === "function" ? item.check(state) : false;
      const enabled = typeof item.enabled === "function" ? item.enabled(state) : true;
      const label = typeof item.label === "function" ? String(item.label(state) ?? "") : String(item.label ?? "");
      const shortcut = typeof item.shortcut === "function" ? String(item.shortcut(state) ?? "") : String(item.shortcut ?? "");
      row.innerHTML = `<span class="menu-check">${checked ? "&#10003;" : ""}</span><span>${escapeHtml(translateText(label))}</span><span class="menu-shortcut">${escapeHtml(shortcut)}</span><span class="menu-arrow">${hasSubmenu ? "&#9654;" : ""}</span>`;

      if (!enabled) {
        row.classList.add("disabled");
        row.disabled = true;
        target.appendChild(row);
        return;
      }

      if (hasSubmenu) {
        const submenuItems = item.submenu;
        const childPopup = target === submenuPopup ? submenuPopupLevel2 : submenuPopup;
        const openSubmenu = () => {
          if (childPopup === submenuPopup) hideDeepSubmenu();
          renderRows(childPopup, submenuItems, state);
          const rowRect = row.getBoundingClientRect();
          childPopup.style.left = `${Math.round(rowRect.right - 2)}px`;
          childPopup.style.top = `${Math.round(rowRect.top)}px`;
          childPopup.classList.remove("hidden");

          let subRect = childPopup.getBoundingClientRect();
          if (isMenuDockedBottom()) {
            childPopup.style.top = `${Math.round(rowRect.bottom - subRect.height)}px`;
            subRect = childPopup.getBoundingClientRect();
          }

          if (subRect.right > window.innerWidth - 4) {
            childPopup.style.left = `${Math.max(4, Math.round(rowRect.left - subRect.width + 2))}px`;
            subRect = childPopup.getBoundingClientRect();
          }
          if (subRect.left < 4) {
            childPopup.style.left = "4px";
            subRect = childPopup.getBoundingClientRect();
          }
          if (subRect.bottom > window.innerHeight - 4) {
            childPopup.style.top = `${Math.max(4, Math.round(window.innerHeight - subRect.height - 4))}px`;
            subRect = childPopup.getBoundingClientRect();
          }
          if (subRect.top < 4) {
            childPopup.style.top = "4px";
          }
        };

        row.addEventListener("mouseenter", openSubmenu);
        row.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openSubmenu();
        });
      } else {
        if (!inSubmenu) row.addEventListener("mouseenter", hideSubmenu);
        else if (target === submenuPopup) row.addEventListener("mouseenter", hideDeepSubmenu);
        row.addEventListener("click", () => run(item.command));
      }

      target.appendChild(row);
    });
  }

  function open(menuName, anchor) {
    const menuMap = definitions();
    const items = menuMap[menuName];
    if (!items) return;

    hideSubmenu();
    const state = getState();
    renderRows(popup, items, state);

    const rect = anchor.getBoundingClientRect();
    popup.style.left = `${Math.round(rect.left)}px`;
    popup.style.top = `${Math.round(rect.bottom + 2)}px`;
    popup.classList.remove("hidden");

    let popupRect = popup.getBoundingClientRect();
    if (isMenuDockedBottom()) {
      popup.style.top = `${Math.max(4, Math.round(rect.top - popupRect.height - 2))}px`;
      popupRect = popup.getBoundingClientRect();
    }
    if (popupRect.right > window.innerWidth - 4) {
      popup.style.left = `${Math.max(4, Math.round(window.innerWidth - popupRect.width - 4))}px`;
      popupRect = popup.getBoundingClientRect();
    }
    if (popupRect.left < 4) {
      popup.style.left = "4px";
      popupRect = popup.getBoundingClientRect();
    }
    if (popupRect.bottom > window.innerHeight - 4) {
      popup.style.top = `${Math.max(4, Math.round(window.innerHeight - popupRect.height - 4))}px`;
      popupRect = popup.getBoundingClientRect();
    }
    if (popupRect.top < 4) {
      popup.style.top = "4px";
    }

    refs.root.querySelectorAll(".menu-item").forEach((button) => {
      button.classList.toggle("active", button === anchor);
    });

    activeMenu = menuName;
  }

  popup.addEventListener("mouseleave", (event) => {
    const related = event.relatedTarget;
    if (related instanceof Node && (submenuPopup.contains(related) || submenuPopupLevel2.contains(related))) return;
    hideSubmenu();
  });

  submenuPopup.addEventListener("mouseleave", (event) => {
    const related = event.relatedTarget;
    if (related instanceof Node && (popup.contains(related) || submenuPopupLevel2.contains(related))) return;
    hideSubmenu();
  });

  submenuPopupLevel2.addEventListener("mouseleave", (event) => {
    const related = event.relatedTarget;
    if (related instanceof Node && submenuPopup.contains(related)) return;
    hideDeepSubmenu();
  });

  refs.root.querySelectorAll(".menu-item").forEach((button) => {
    button.addEventListener("click", () => {
      const menuName = button.dataset.menu || button.textContent.trim();
      if (menuName === activeMenu) {
        hide();
        return;
      }
      open(menuName, button);
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest(".menu-item") || target.closest(".menu-popup")) return;
    hide();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });

  return { hide };
}























































