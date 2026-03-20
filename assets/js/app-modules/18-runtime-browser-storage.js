function summarizeDirtyFiles(files) {
  if (!Array.isArray(files) || !files.length) return "";
  const maxListed = 6;
  const listed = files.slice(0, maxListed).map((file) => `- ${file.name}`).join("\n");
  const remaining = files.length - maxListed;
  return remaining > 0
    ? `${listed}\n${translateText("- ... and {count} more", { count: remaining })}`
    : listed;
}

async function confirmCloseDirtyFiles(files, actionLabel) {
  if (!files.length) return true;
  const details = summarizeDirtyFiles(files);
  const message = translateText("{actionLabel}\n\nUnsaved files:\n{details}\n\nContinue without saving?", {
    actionLabel,
    details
  });
  return requestConfirmDialog("Unsaved changes", message, {
    confirmLabel: "Close anyway",
    cancelLabel: "Cancel"
  });
}

function measureStoredSourceBytes(source) {
  const text = String(source ?? "");
  if (textEncoder) return textEncoder.encode(text).length;
  if (typeof Blob === "function") return new Blob([text]).size;
  return text.length;
}

function normalizeOnlineSourceFolderPath(path) {
  const normalized = String(path ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!normalized) return "";
  return normalized
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== ".")
    .join("/");
}

function normalizeOnlineSourcePath(path) {
  const cleaned = normalizeOnlineSourceFolderPath(path);
  if (!cleaned) return "untitled.s";
  const parts = cleaned.split("/");
  const fileName = normalizeFilename(parts.pop() || "untitled.s");
  return parts.length ? `${parts.join("/")}/${fileName}` : fileName;
}

function getOnlineSourceDirname(path) {
  const normalized = normalizeOnlineSourcePath(path);
  const parts = normalized.split("/");
  parts.pop();
  return parts.join("/");
}

function getOnlineSourceBasename(path) {
  const normalized = normalizeOnlineSourcePath(path);
  return normalized.split("/").pop() || normalized;
}

function listOnlineSourceFolders(files) {
  const set = new Set([""]);
  files.forEach((file) => {
    const folder = getOnlineSourceDirname(file?.name || "");
    if (!folder) return;
    const parts = folder.split("/");
    let current = "";
    parts.forEach((part) => {
      current = current ? `${current}/${part}` : part;
      set.add(current);
    });
  });
  return Array.from(set).sort((left, right) => {
    if (!left) return -1;
    if (!right) return 1;
    const depthDiff = left.split("/").length - right.split("/").length;
    return depthDiff !== 0 ? depthDiff : left.localeCompare(right);
  });
}

function formatStoredSourceUsage(bytes) {
  const value = Number.isFinite(bytes) ? Math.max(0, bytes | 0) : 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} kB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function normalizeOnlineSourceTimestamp(value, fallback = Date.now()) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  const parsed = Date.parse(String(value || ""));
  if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  const safeFallback = Number(fallback);
  return Number.isFinite(safeFallback) && safeFallback > 0
    ? Math.floor(safeFallback)
    : Date.now();
}

function normalizeOnlineSourceEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const name = normalizeOnlineSourcePath(entry.name || "");
  if (!name) return null;
  return {
    name,
    source: String(entry.source ?? ""),
    updatedAt: normalizeOnlineSourceTimestamp(entry.updatedAt, Date.now())
  };
}

function loadOnlineSourceFolder() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(ONLINE_SOURCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed?.files) ? parsed.files : [];
    const seen = new Set();
    return entries
      .map((entry) => normalizeOnlineSourceEntry(entry))
      .filter((entry) => {
        if (!entry || seen.has(entry.name)) return false;
        seen.add(entry.name);
        return true;
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return [];
  }
}

function persistOnlineSourceFolder(files) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    window.localStorage.setItem(ONLINE_SOURCE_STORAGE_KEY, JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      files: files.map((file) => ({
        name: normalizeOnlineSourcePath(file.name),
        source: String(file.source ?? ""),
        updatedAt: normalizeOnlineSourceTimestamp(file.updatedAt, Date.now())
      }))
    }));
    return true;
  } catch {
    return false;
  }
}

function computeOnlineSourceUsage(files) {
  return files.reduce((total, file) => total + measureStoredSourceBytes(file?.source), 0);
}

function saveOnlineSourceFile(name, source) {
  const safeName = normalizeOnlineSourcePath(name);
  const nextEntry = {
    name: safeName,
    source: String(source ?? ""),
    updatedAt: Date.now()
  };
  const files = loadOnlineSourceFolder();
  const existingIndex = files.findIndex((file) => file.name === safeName);
  const nextFiles = existingIndex >= 0
    ? files.map((file, index) => (index === existingIndex ? nextEntry : file))
    : [...files, nextEntry];
  const usageBytes = computeOnlineSourceUsage(nextFiles);
  if (usageBytes > ONLINE_SOURCE_MAX_BYTES) {
    return {
      ok: false,
      reason: "quota",
      usageBytes,
      maxBytes: ONLINE_SOURCE_MAX_BYTES,
      totalFiles: nextFiles.length
    };
  }
  if (!persistOnlineSourceFolder(nextFiles)) {
    return {
      ok: false,
      reason: "storage",
      usageBytes: computeOnlineSourceUsage(files),
      maxBytes: ONLINE_SOURCE_MAX_BYTES,
      totalFiles: files.length
    };
  }
  return {
    ok: true,
    file: nextEntry,
    usageBytes,
    maxBytes: ONLINE_SOURCE_MAX_BYTES,
    totalFiles: nextFiles.length,
    replaced: existingIndex >= 0
  };
}

function removeOnlineSourceFile(name) {
  const safeName = normalizeOnlineSourcePath(name);
  const files = loadOnlineSourceFolder();
  const nextFiles = files.filter((file) => file.name !== safeName);
  if (nextFiles.length === files.length) return { ok: false, reason: "missing" };
  if (!persistOnlineSourceFolder(nextFiles)) return { ok: false, reason: "storage" };
  return {
    ok: true,
    removed: safeName,
    totalFiles: nextFiles.length,
    usageBytes: computeOnlineSourceUsage(nextFiles),
    maxBytes: ONLINE_SOURCE_MAX_BYTES
  };
}

function getOnlineSourceMenu(files) {
  return files
    .map((file, index) => `${index + 1}: ${file.name} (${formatStoredSourceUsage(measureStoredSourceBytes(file.source))})`)
    .join("\n");
}

async function chooseOnlineSourceFile() {
  const files = loadOnlineSourceFolder();
  if (!files.length) {
    postMarsMessage("[warn] Browser storage folder is empty.");
    return null;
  }

  const menu = getOnlineSourceMenu(files);
  const usage = formatStoredSourceUsage(computeOnlineSourceUsage(files));
  const limit = formatStoredSourceUsage(ONLINE_SOURCE_MAX_BYTES);
  const raw = await requestTextDialog(
    "Open from browser storage",
    translateText("Browser storage\nUsed: {used} / {limit}\n\n{menu}\n\nChoose file number or name", {
      used: usage,
      limit,
      menu
    }),
    files[0].name,
    {
      confirmLabel: "Open",
      cancelLabel: "Cancel"
    }
  );
  if (raw == null) return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;
  const numeric = Number.parseInt(trimmed, 10);
  if (Number.isFinite(numeric) && numeric >= 1 && numeric <= files.length) {
    return files[numeric - 1];
  }
  const selected = files.find((file) => file.name.toLowerCase() === trimmed.toLowerCase()) || null;
  if (!selected) {
    postMarsMessage("[warn] Browser storage file not found.");
  }
  return selected;
}

function ensureBrowserStorageManagerStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("mars-browser-storage-manager-style")) return;
  const style = document.createElement("style");
  style.id = "mars-browser-storage-manager-style";
  style.textContent = `
    .browser-storage-manager {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto auto;
      gap: 8px;
      height: 100%;
      min-height: 0;
      background: #f0f0f0;
    }
    .browser-storage-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 3px 6px;
      border: 1px solid #a7a7a7;
      background: linear-gradient(180deg, #fdfdfd 0%, #ebebeb 100%);
      font-size: 11px;
    }
    .browser-storage-path {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #2b3c4f;
    }
    .browser-storage-panels {
      display: grid;
      grid-template-columns: 220px minmax(0, 1fr);
      gap: 8px;
      min-height: 0;
    }
    .browser-storage-folder-list,
    .browser-storage-file-list {
      min-height: 0;
      overflow: auto;
      background: #fff;
      border: 1px solid #a7a7a7;
    }
    .browser-storage-folder-item,
    .browser-storage-file-row {
      width: 100%;
      border: none;
      border-bottom: 1px solid #ececec;
      background: #fff;
      text-align: left;
      padding: 4px 6px;
      font-size: 11px;
      line-height: 1.25;
      cursor: pointer;
    }
    .browser-storage-folder-item:hover,
    .browser-storage-file-row:hover {
      background: #eef4fb;
    }
    .browser-storage-folder-item.active,
    .browser-storage-file-row.active {
      background: #d7e6f7;
    }
    .browser-storage-file-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 10px;
      align-items: center;
    }
    .browser-storage-file-name,
    .browser-storage-file-meta {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .browser-storage-file-meta {
      color: #55687d;
      font-size: 10px;
    }
    .browser-storage-editor {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
      gap: 8px;
    }
    .browser-storage-field {
      display: grid;
      gap: 4px;
      min-width: 0;
      font-size: 11px;
    }
    .browser-storage-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border: 1px solid #a7a7a7;
      background: #efefef;
      padding: 8px;
    }
    .browser-storage-footer-actions {
      display: inline-flex;
      gap: 8px;
      margin-left: auto;
    }
    @media (max-width: 700px) {
      .browser-storage-panels {
        grid-template-columns: 1fr;
        grid-template-rows: 140px minmax(0, 1fr);
      }
      .browser-storage-editor {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function createBrowserStorageManager(refs, windowManager) {
  ensureBrowserStorageManagerStyles();
  const desktop = refs.windows.desktop;
  const win = document.createElement("section");
  win.className = "desktop-window window-hidden tool-window dialog-window";
  win.id = "window-browser-storage";
  win.style.left = "180px";
  win.style.top = "120px";
  win.style.width = "760px";
  win.style.height = "470px";
  win.style.minWidth = "520px";
  win.style.minHeight = "340px";
  win.innerHTML = `
    <div class="window-titlebar">
      <span class="window-title" id="browser-storage-title">Browser Storage</span>
      <div class="window-controls">
        <button class="win-btn" data-win-action="min" type="button">_</button>
        <button class="win-btn" data-win-action="max" type="button">[]</button>
        <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
      </div>
    </div>
    <div class="window-content browser-storage-manager">
      <div class="browser-storage-summary">
        <span id="browser-storage-path" class="browser-storage-path"></span>
        <span id="browser-storage-usage"></span>
      </div>
      <div class="browser-storage-panels">
        <section class="mars-tool-panel">
          <div class="mars-tool-panel-title" id="browser-storage-folders-title">Folders</div>
          <div class="mars-tool-panel-body browser-storage-folder-list" id="browser-storage-folders"></div>
        </section>
        <section class="mars-tool-panel">
          <div class="mars-tool-panel-title" id="browser-storage-files-title">Files</div>
          <div class="mars-tool-panel-body browser-storage-file-list" id="browser-storage-files"></div>
        </section>
      </div>
      <div class="browser-storage-editor">
        <label class="browser-storage-field">
          <span id="browser-storage-folder-label">Folder</span>
          <input id="browser-storage-folder-input" type="text" autocomplete="off">
        </label>
        <label class="browser-storage-field">
          <span id="browser-storage-name-label">File name</span>
          <input id="browser-storage-name-input" type="text" autocomplete="off">
        </label>
      </div>
      <div class="browser-storage-footer">
        <button class="tool-btn" id="browser-storage-delete" type="button">Delete</button>
        <div class="browser-storage-footer-actions">
          <button class="tool-btn" id="browser-storage-close" type="button">Close</button>
          <button class="tool-btn primary" id="browser-storage-primary" type="button">Open</button>
        </div>
      </div>
    </div>
  `;
  desktop.appendChild(win);
  windowManager.registerWindow(win);
  const refreshWindowTranslations = translateStaticTree(win);

  const titleNode = win.querySelector("#browser-storage-title");
  const pathNode = win.querySelector("#browser-storage-path");
  const usageNode = win.querySelector("#browser-storage-usage");
  const foldersTitleNode = win.querySelector("#browser-storage-folders-title");
  const filesTitleNode = win.querySelector("#browser-storage-files-title");
  const foldersNode = win.querySelector("#browser-storage-folders");
  const filesNode = win.querySelector("#browser-storage-files");
  const folderLabelNode = win.querySelector("#browser-storage-folder-label");
  const nameLabelNode = win.querySelector("#browser-storage-name-label");
  const folderInput = win.querySelector("#browser-storage-folder-input");
  const nameInput = win.querySelector("#browser-storage-name-input");
  const deleteButton = win.querySelector("#browser-storage-delete");
  const closeButton = win.querySelector("#browser-storage-close");
  const primaryButton = win.querySelector("#browser-storage-primary");
  const titleCloseButton = win.querySelector('[data-win-action="close"]');

  const state = {
    mode: "open",
    currentFolder: "",
    selectedFile: "",
    pendingSource: "",
    resolver: null
  };

  function closeManager(result = null) {
    const resolve = state.resolver;
    state.resolver = null;
    windowManager.hide(win.id);
    if (typeof resolve === "function") resolve(result);
  }

  function getCurrentFiles() {
    return loadOnlineSourceFolder();
  }

  function getVisibleFiles(files) {
    return files
      .filter((file) => getOnlineSourceDirname(file.name) === state.currentFolder)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  function refreshButtons(files) {
    const hasSelection = Boolean(state.selectedFile);
    if (deleteButton instanceof HTMLButtonElement) deleteButton.disabled = !hasSelection;
    if (primaryButton instanceof HTMLButtonElement) {
      if (state.mode === "open") {
        primaryButton.disabled = !hasSelection;
      } else {
        primaryButton.disabled = String(nameInput?.value || "").trim().length === 0;
      }
    }
    if (folderInput instanceof HTMLInputElement) {
      folderInput.readOnly = state.mode !== "save";
    }
    if (nameInput instanceof HTMLInputElement) {
      nameInput.readOnly = state.mode === "open";
    }
    if (filesNode instanceof HTMLElement && !getVisibleFiles(files).length) {
      filesNode.innerHTML = `<div class="mars-help-loading" style="padding:8px;">${escapeHtml(translateText("No files in this folder."))}</div>`;
    }
  }

  function render() {
    const files = getCurrentFiles();
    const folders = listOnlineSourceFolders(files);

    if (state.mode === "open" && !folders.includes(state.currentFolder)) {
      state.currentFolder = "";
    }
    if (!files.some((file) => file.name === state.selectedFile)) {
      state.selectedFile = "";
    }
    const visibleFiles = getVisibleFiles(files);

    if (titleNode instanceof HTMLElement) {
      titleNode.textContent = translateText(state.mode === "save" ? "Save to Browser Storage" : "Open from Browser Storage");
    }
    if (foldersTitleNode instanceof HTMLElement) foldersTitleNode.textContent = translateText("Folders");
    if (filesTitleNode instanceof HTMLElement) filesTitleNode.textContent = translateText("Files");
    if (folderLabelNode instanceof HTMLElement) folderLabelNode.textContent = translateText("Folder");
    if (nameLabelNode instanceof HTMLElement) nameLabelNode.textContent = translateText("File name");
    if (closeButton instanceof HTMLButtonElement) closeButton.textContent = translateText("Close");
    if (deleteButton instanceof HTMLButtonElement) deleteButton.textContent = translateText("Delete");
    if (primaryButton instanceof HTMLButtonElement) {
      primaryButton.textContent = translateText(state.mode === "save" ? "Save" : "Open");
    }
    if (pathNode instanceof HTMLElement) {
      pathNode.textContent = translateText("Current folder: {folder}", {
        folder: state.currentFolder || "/"
      });
    }
    if (usageNode instanceof HTMLElement) {
      usageNode.textContent = translateText("Used: {used} / {limit}", {
        used: formatStoredSourceUsage(computeOnlineSourceUsage(files)),
        limit: formatStoredSourceUsage(ONLINE_SOURCE_MAX_BYTES)
      });
    }

    if (foldersNode instanceof HTMLElement) {
      foldersNode.innerHTML = folders.map((folder) => {
        const depth = folder ? folder.split("/").length - 1 : 0;
        const label = folder || "/";
        return `
          <button
            class="browser-storage-folder-item${folder === state.currentFolder ? " active" : ""}"
            data-folder-path="${escapeHtml(folder)}"
            type="button"
            style="padding-left:${8 + depth * 16}px;"
          >${escapeHtml(label)}</button>
        `;
      }).join("");
    }

    if (filesNode instanceof HTMLElement) {
      filesNode.innerHTML = visibleFiles.map((file) => `
        <button class="browser-storage-file-row${file.name === state.selectedFile ? " active" : ""}" data-file-path="${escapeHtml(file.name)}" type="button">
          <span class="browser-storage-file-name">${escapeHtml(getOnlineSourceBasename(file.name))}</span>
          <span class="browser-storage-file-meta">${escapeHtml(formatStoredSourceUsage(measureStoredSourceBytes(file.source)))}</span>
          <span class="browser-storage-file-meta">${escapeHtml(new Date(file.updatedAt || Date.now()).toLocaleDateString())}</span>
        </button>
      `).join("");
    }

    if (folderInput instanceof HTMLInputElement) {
      folderInput.value = state.currentFolder;
    }
    if (nameInput instanceof HTMLInputElement) {
      if (state.mode === "open") {
        nameInput.value = state.selectedFile ? getOnlineSourceBasename(state.selectedFile) : "";
      }
    }

    refreshButtons(files);
  }

  async function handleDelete() {
    if (!state.selectedFile) return;
    const ok = await requestConfirmDialog(
      "Delete file?",
      translateText("Delete '{name}' from browser storage?", { name: state.selectedFile }),
      { confirmLabel: "Delete", cancelLabel: "Cancel" }
    );
    if (!ok) return;
    const result = removeOnlineSourceFile(state.selectedFile);
    if (!result.ok) {
      postMarsMessage("[error] Failed to delete browser storage file.");
      return;
    }
    postMarsMessage("Deleted '{name}' from browser storage.", { name: state.selectedFile });
    state.selectedFile = "";
    render();
  }

  function handlePrimaryAction() {
    const files = getCurrentFiles();
    if (state.mode === "open") {
      const selected = files.find((file) => file.name === state.selectedFile) || null;
      if (!selected) return;
      closeManager({ type: "open", file: selected });
      return;
    }

    const folder = normalizeOnlineSourceFolderPath(folderInput?.value || "");
    const typedName = String(nameInput?.value || "").trim();
    if (!typedName) return;
    const targetPath = folder ? `${folder}/${typedName}` : typedName;
    const result = saveOnlineSourceFile(targetPath, state.pendingSource);
    if (!result.ok) {
      if (result.reason === "quota") {
        postMarsMessage("[warn] Browser storage limit exceeded: {used}/{limit}.", {
          used: formatStoredSourceUsage(result.usageBytes),
          limit: formatStoredSourceUsage(result.maxBytes)
        });
        return;
      }
      postMarsMessage("[error] Failed to save to browser storage.");
      return;
    }
    closeManager({ type: "save", path: result.file.name, result });
  }

  foldersNode?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-folder-path]");
    if (!(button instanceof HTMLElement)) return;
    state.currentFolder = String(button.dataset.folderPath || "");
    state.selectedFile = "";
    render();
  });

  filesNode?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-file-path]");
    if (!(button instanceof HTMLElement)) return;
    state.selectedFile = String(button.dataset.filePath || "");
    state.currentFolder = getOnlineSourceDirname(state.selectedFile);
    render();
  });

  filesNode?.addEventListener("dblclick", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("[data-file-path]");
    if (!(button instanceof HTMLElement)) return;
    state.selectedFile = String(button.dataset.filePath || "");
    state.currentFolder = getOnlineSourceDirname(state.selectedFile);
    render();
    handlePrimaryAction();
  });

  folderInput?.addEventListener("input", () => {
    if (state.mode !== "save") return;
    state.currentFolder = normalizeOnlineSourceFolderPath(folderInput.value);
    render();
  });

  nameInput?.addEventListener("input", () => {
    refreshButtons(getCurrentFiles());
  });

  deleteButton?.addEventListener("click", () => {
    void handleDelete();
  });
  primaryButton?.addEventListener("click", handlePrimaryAction);
  closeButton?.addEventListener("click", () => closeManager(null));
  titleCloseButton?.addEventListener("click", () => closeManager(null));

  return {
    async openForLoad() {
      state.mode = "open";
      state.currentFolder = "";
      state.selectedFile = "";
      state.pendingSource = "";
      render();
      windowManager.show(win.id);
      return new Promise((resolve) => {
        state.resolver = resolve;
      });
    },
    async openForSave(defaultPath, source) {
      state.mode = "save";
      const normalizedPath = normalizeOnlineSourcePath(defaultPath || "untitled.s");
      state.currentFolder = getOnlineSourceDirname(normalizedPath);
      state.selectedFile = normalizedPath;
      state.pendingSource = String(source ?? "");
      render();
      if (nameInput instanceof HTMLInputElement) {
        nameInput.value = getOnlineSourceBasename(normalizedPath);
      }
      refreshButtons(getCurrentFiles());
      windowManager.show(win.id);
      return new Promise((resolve) => {
        state.resolver = resolve;
      });
    },
    refreshTranslations() {
      refreshWindowTranslations();
      if (!win.classList.contains("window-hidden")) render();
    }
  };
}
async function openEditorPreferencesDialog() {
  const current = store.getState().preferences;
  const nextFontRaw = await requestTextDialog(
    "Editor Preferences",
    "Editor font size (9-22)",
    String(current.editorFontSize ?? 12)
  );
  if (nextFontRaw == null) return;

  const nextLineRaw = await requestTextDialog(
    "Editor Preferences",
    "Editor line height (1.0-2.2)",
    String(current.editorLineHeight ?? 1.25)
  );
  if (nextLineRaw == null) return;

  const parsedFont = Number(nextFontRaw);
  const parsedLine = Number(nextLineRaw);
  if (!Number.isFinite(parsedFont) || !Number.isFinite(parsedLine)) {
    postMarsMessage("[warn] Invalid editor preferences.");
    return;
  }

  updatePreferencesPatch({
    editorFontSize: Math.max(9, Math.min(22, parsedFont)),
    editorLineHeight: Math.max(1, Math.min(2.2, parsedLine))
  }, "Editor preferences updated.");
}

async function openHighlightingPreferencesDialog() {
  const current = store.getState().preferences;
  const defaults = [
    current.highlightTextUpdates ? "1" : "0",
    current.highlightDataUpdates ? "1" : "0",
    current.highlightRegisterUpdates ? "1" : "0"
  ].join(",");
  const raw = await requestTextDialog(
    "Highlighting",
    "Highlighting (text,data,registers) using 1/0",
    defaults
  );
  if (raw == null) return;

  const parts = raw.split(/[\s,;]+/).filter(Boolean);
  if (parts.length < 3) {
    postMarsMessage("[warn] Provide 3 values (text,data,registers). Example: 1,1,1");
    return;
  }

  const asBool = (token, fallback) => {
    const normalized = String(token).trim().toLowerCase();
    if (["1", "true", "yes", "y", "sim", "s", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "n", "nao", "não", "off"].includes(normalized)) return false;
    return fallback;
  };

  updatePreferencesPatch({
    highlightTextUpdates: asBool(parts[0], current.highlightTextUpdates),
    highlightDataUpdates: asBool(parts[1], current.highlightDataUpdates),
    highlightRegisterUpdates: asBool(parts[2], current.highlightRegisterUpdates)
  }, "Highlighting preferences updated.");
}

async function openExceptionHandlerPreferencesDialog() {
  const current = store.getState().preferences;
  const fallbackAddress = parseAddressPreference(
    current.exceptionHandlerAddress,
    engine.memoryMap.exceptionHandlerAddress ?? DEFAULT_MEMORY_MAP.exceptionHandlerAddress
  );
  const raw = await requestTextDialog(
    "Exception Handler",
    "Exception handler address (hex or dec)",
    current.exceptionHandlerAddress || toHex(fallbackAddress)
  );
  if (raw == null) return;
  const parsed = parseAddressPreference(raw, fallbackAddress);
  updatePreferencesPatch(
    { exceptionHandlerAddress: toHex(parsed) },
    translateText("Exception handler set to {address}.", { address: toHex(parsed) })
  );
}

async function openMemoryConfigurationPreferencesDialog() {
  const ids = Object.keys(memoryPresets);
  if (!ids.length) {
    postMarsMessage("[warn] No memory presets available.");
    return;
  }

  const menu = ids
    .map((id, index) => `${index + 1}: ${memoryPresets[id].label || id}`)
    .join("\n");
  const raw = await requestTextDialog(
    "Memory Configuration",
    translateText("Memory Configuration\n{menu}\n\nChoose preset number or id", { menu }),
    activeMemoryConfigId || "Default"
  );
  if (raw == null) return;

  const trimmed = raw.trim();
  let selectedId = ids.find((id) => id.toLowerCase() === trimmed.toLowerCase()) || "";
  if (!selectedId) {
    const numeric = Number.parseInt(trimmed, 10);
    if (Number.isFinite(numeric) && numeric >= 1 && numeric <= ids.length) selectedId = ids[numeric - 1];
  }

  if (!selectedId) {
    postMarsMessage("[warn] Unknown memory preset.");
    return;
  }

  const selectedMap = { ...DEFAULT_MEMORY_MAP, ...memoryPresets[selectedId] };
  const defaultException = selectedMap.exceptionHandlerAddress ?? DEFAULT_MEMORY_MAP.exceptionHandlerAddress;
  updatePreferencesPatch({
    memoryConfiguration: selectedId,
    exceptionHandlerAddress: toHex(defaultException)
  }, translateText("Memory configuration set to {label}.", {
    label: memoryPresets[selectedId].label || selectedId
  }));
}

async function openMemoryUsagePreferencesDialog() {
  const current = store.getState().preferences;
  const defaultMemoryGb = sanitizeMemoryGb(current.maxMemoryGb, DEFAULT_MEMORY_GB);
  const defaultBacksteps = sanitizeMaxBacksteps(current.maxBacksteps, DEFAULT_MAX_BACKSTEPS);
  const defaultValue = `${defaultMemoryGb},${defaultBacksteps}`;

  const raw = await requestTextDialog(
    "Memory Limits",
    "Set limits: memory GB and max backsteps (GB,steps)\nBackstep history automatically fits the memory budget.\nExample: 2,100",
    defaultValue
  );
  if (raw == null) return;

  const parts = raw.split(/[\s,;]+/).filter(Boolean);
  const parsedMemoryGb = sanitizeMemoryGb(parts[0], defaultMemoryGb);
  const parsedBacksteps = sanitizeMaxBacksteps(parts[1], defaultBacksteps);

  updatePreferencesPatch(
    {
      maxMemoryGb: parsedMemoryGb,
      maxBacksteps: parsedBacksteps
    },
    translateText("Memory limits updated: {memoryGb} GB, {backsteps} backsteps.", {
      memoryGb: parsedMemoryGb,
      backsteps: parsedBacksteps
    })
  );
}

async function loadTextResource(path) {
  if (typeof fetch === "function") {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (fetchError) {
      if (fetchError instanceof Error && /^HTTP \d+$/i.test(fetchError.message)) {
        throw fetchError;
      }
    }
  }
  return await new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open("GET", path, true);
    req.onload = () => {
      if (req.status === 0 || (req.status >= 200 && req.status < 300)) {
        resolve(req.responseText);
        return;
      }
      reject(new Error(`HTTP ${req.status}`));
    };
    req.onerror = () => reject(new Error(translateText("Failed to load file.")));
    req.send();
  });
}

const EXAMPLE_CATEGORY_ORDER = ["Tools", "Math", "Learn", "Tests"];
const DEFAULT_EXAMPLE_CATEGORY = "Learn";
const DEFAULT_EXAMPLE_LANGUAGE = "en";
const exampleManifestState = {
  defaultLanguage: DEFAULT_EXAMPLE_LANGUAGE,
  languages: [DEFAULT_EXAMPLE_LANGUAGE]
};
const exampleVariantCache = new Map();

