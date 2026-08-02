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

function ensureBrowserStorageManagerStyles() {
  if (typeof document === "undefined") return;
  ensureFileManagerStyles();
  if (document.getElementById("mars-browser-storage-manager-style")) return;
  const style = document.createElement("style");
  style.id = "mars-browser-storage-manager-style";
  style.textContent = `
    .browser-storage-manager {
      display: grid;
      grid-template-rows: minmax(0, 1fr);
      min-height: 0;
      padding: 0;
      background: var(--surface-sunken);
    }

    .browser-storage-file-manager {
      min-height: 0;
      height: 100%;
    }

    .browser-storage-quota {
      margin-left: auto;
      color: var(--text-muted);
    }
  `;
  document.head.appendChild(style);
}

// Builds the file-manager node tree from the flat "folder/name" paths that
// browser storage keeps, so the same view can list it as a desktop tree or a
// mobile drill-down.
function buildOnlineSourceFileManagerModel(files) {
  const roots = [];
  const folderNodes = new Map();

  function ensureFolder(folderPath) {
    if (!folderPath) return null;
    if (folderNodes.has(folderPath)) return folderNodes.get(folderPath);
    const segments = folderPath.split("/");
    const name = segments[segments.length - 1];
    const parent = ensureFolder(segments.slice(0, -1).join("/"));
    const node = {
      key: `storage-folder:${folderPath}`,
      type: "folder",
      name,
      path: folderPath,
      children: [],
      title: folderPath
    };
    folderNodes.set(folderPath, node);
    (parent ? parent.children : roots).push(node);
    return node;
  }

  listOnlineSourceFolders(files).forEach((folderPath) => ensureFolder(folderPath));

  files.forEach((file) => {
    const parent = ensureFolder(getOnlineSourceDirname(file.name));
    const bytes = measureStoredSourceBytes(file.source);
    (parent ? parent.children : roots).push({
      key: `storage-file:${file.name}`,
      type: "file",
      name: getOnlineSourceBasename(file.name),
      path: file.name,
      bytes,
      lineCount: String(file.source ?? "").split("\n").length,
      updatedAt: file.updatedAt,
      title: file.name
    });
  });

  // Folder byte totals let the size column and the size sort mean something
  // for folders too, the way a desktop file manager reports them.
  function summarize(node) {
    if (node.type !== "folder") return Number(node.bytes) || 0;
    const total = node.children.reduce((sum, child) => sum + summarize(child), 0);
    node.bytes = total;
    node.updatedAt = node.children.reduce(
      (latest, child) => Math.max(latest, Number(child.updatedAt) || 0),
      0
    ) || undefined;
    return total;
  }
  roots.forEach((node) => summarize(node));

  return roots;
}

function createBrowserStorageManager(refs, windowManager) {
  ensureBrowserStorageManagerStyles();
  const desktop = refs.windows.desktop;
  const win = document.createElement("section");
  // The dialog joins the mobile panel flow so a narrow screen gets a full-width
  // manager instead of a 180px floating window with a collapsed file list.
  win.className = "desktop-window window-hidden tool-window dialog-window mobile-panel-window";
  win.id = "window-browser-storage";
  win.style.left = "180px";
  win.style.top = "120px";
  win.style.width = "780px";
  win.style.height = "500px";
  win.style.minWidth = "320px";
  win.style.minHeight = "320px";
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
      <div class="browser-storage-file-manager" id="browser-storage-file-manager"></div>
    </div>
  `;
  desktop.appendChild(win);
  windowManager.registerWindow(win);
  const refreshWindowTranslations = translateStaticTree(win);

  const titleNode = win.querySelector("#browser-storage-title");
  const managerHost = win.querySelector("#browser-storage-file-manager");
  const titleCloseButton = win.querySelector('[data-win-action="close"]');

  const state = {
    mode: "open",
    selectedPath: "",
    pendingSource: "",
    resolver: null
  };

  let cachedFiles = [];
  // Browser storage holds few files, so folders read better open by default.
  const collapsedFolders = new Set();

  const fileManager = createFileManager({
    host: managerHost,
    label: translateText("Browser storage files"),
    rootLabel: translateText("Browser storage"),
    features: { dragDrop: false, checkboxes: false },
    actions: [{ id: "delete", label: "Delete", icon: "trash", danger: true }],
    getModel() {
      cachedFiles = loadOnlineSourceFolder();
      return buildOnlineSourceFileManagerModel(cachedFiles);
    },
    isExpanded: (node) => !collapsedFolders.has(node.key),
    onToggle(node) {
      if (collapsedFolders.has(node.key)) collapsedFolders.delete(node.key);
      else collapsedFolders.add(node.key);
    },
    isSelected: (node) => node.type === "file" && node.path === state.selectedPath,
    isChecked: () => false,
    onSelect(node) {
      if (node.type !== "file") return;
      state.selectedPath = node.path;
      syncNameField();
    },
    onActivate(node) {
      if (node.type !== "file") return;
      state.selectedPath = node.path;
      syncNameField();
      handlePrimaryAction();
    },
    isActionEnabled: (actionId) => (actionId === "delete" ? Boolean(state.selectedPath) : true),
    getContextItems: (node) => (node.type === "file"
      ? [
        { id: "primary", label: state.mode === "save" ? "Save" : "Open", icon: "file" },
        "-",
        { id: "delete", label: "Delete", icon: "trash", danger: true }
      ]
      : []),
    onAction(actionId, node) {
      if (node?.type === "file") {
        state.selectedPath = node.path;
        syncNameField();
      }
      if (actionId === "primary") {
        handlePrimaryAction();
        return;
      }
      if (actionId === "delete") void handleDelete();
    },
    getStatusCells() {
      const usage = computeOnlineSourceUsage(cachedFiles);
      return [
        translateText("files: {count}", { count: cachedFiles.length }),
        translateText("used: {used} / {limit}", {
          used: formatStoredSourceUsage(usage),
          limit: formatStoredSourceUsage(ONLINE_SOURCE_MAX_BYTES)
        })
      ];
    },
    emptyText: () => translateText("No files in this folder.")
  });

  const footer = fileManager.getFooter();
  footer.innerHTML = `
    <label class="fm-field">
      <span id="browser-storage-name-label">File name</span>
      <input id="browser-storage-name-input" type="text" inputmode="text" enterkeyhint="done" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">
    </label>
    <span class="fm-footer-spacer"></span>
    <button class="fm-btn" id="browser-storage-close" type="button">Close</button>
    <button class="fm-btn primary" id="browser-storage-primary" type="button">Open</button>
  `;

  const nameLabelNode = footer.querySelector("#browser-storage-name-label");
  const nameInput = footer.querySelector("#browser-storage-name-input");
  const closeButton = footer.querySelector("#browser-storage-close");
  const primaryButton = footer.querySelector("#browser-storage-primary");

  function syncNameField() {
    if (!(nameInput instanceof HTMLInputElement)) return;
    if (state.mode === "open") {
      nameInput.value = state.selectedPath;
      nameInput.readOnly = true;
    } else {
      nameInput.readOnly = false;
      if (state.selectedPath) nameInput.value = state.selectedPath;
    }
    refreshPrimaryButton();
  }

  function refreshPrimaryButton() {
    if (!(primaryButton instanceof HTMLButtonElement)) return;
    primaryButton.disabled = state.mode === "open"
      ? !state.selectedPath
      : String(nameInput?.value || "").trim().length === 0;
  }

  function closeManager(result = null) {
    const resolve = state.resolver;
    state.resolver = null;
    windowManager.hide(win.id);
    if (typeof resolve === "function") resolve(result);
  }

  function refreshLabels() {
    if (titleNode instanceof HTMLElement) {
      titleNode.textContent = translateText(state.mode === "save"
        ? "Save to Browser Storage"
        : "Open from Browser Storage");
    }
    if (nameLabelNode instanceof HTMLElement) nameLabelNode.textContent = translateText("File name");
    if (closeButton instanceof HTMLButtonElement) closeButton.textContent = translateText("Close");
    if (primaryButton instanceof HTMLButtonElement) {
      primaryButton.textContent = translateText(state.mode === "save" ? "Save" : "Open");
    }
  }

  function render() {
    refreshLabels();
    fileManager.render();
    syncNameField();
  }

  async function handleDelete() {
    if (!state.selectedPath) return;
    const ok = await requestConfirmDialog(
      "Delete file?",
      translateText("Delete '{name}' from browser storage?", { name: state.selectedPath }),
      { confirmLabel: "Delete", cancelLabel: "Cancel" }
    );
    if (!ok) return;
    const result = removeOnlineSourceFile(state.selectedPath);
    if (!result.ok) {
      postMarsMessage("[error] Failed to delete browser storage file.");
      return;
    }
    postMarsMessage("Deleted '{name}' from browser storage.", { name: state.selectedPath });
    state.selectedPath = "";
    render();
  }

  function handlePrimaryAction() {
    if (state.mode === "open") {
      const selected = loadOnlineSourceFolder().find((file) => file.name === state.selectedPath) || null;
      if (!selected) return;
      closeManager({ type: "open", file: selected });
      return;
    }

    const typedPath = normalizeOnlineSourcePath(String(nameInput?.value || "").trim());
    if (!typedPath) return;
    const result = saveOnlineSourceFile(typedPath, state.pendingSource);
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

  nameInput?.addEventListener("input", refreshPrimaryButton);
  nameInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handlePrimaryAction();
  });
  primaryButton?.addEventListener("click", handlePrimaryAction);
  closeButton?.addEventListener("click", () => closeManager(null));
  titleCloseButton?.addEventListener("click", () => closeManager(null));

  return {
    async openForLoad() {
      state.mode = "open";
      state.selectedPath = "";
      state.pendingSource = "";
      fileManager.clearQuery();
      fileManager.setCurrentFolderKey("");
      render();
      windowManager.show(win.id);
      return new Promise((resolve) => {
        state.resolver = resolve;
      });
    },
    async openForSave(defaultPath, source) {
      state.mode = "save";
      state.selectedPath = normalizeOnlineSourcePath(defaultPath || "untitled.s");
      state.pendingSource = String(source ?? "");
      fileManager.clearQuery();
      fileManager.setCurrentFolderKey("");
      render();
      if (nameInput instanceof HTMLInputElement) {
        nameInput.value = state.selectedPath;
        refreshPrimaryButton();
      }
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

const EXAMPLE_CATEGORY_ORDER = ["Tools", "Math", "Learn", "Lessons", "Tests"];
const DEFAULT_EXAMPLE_CATEGORY = "Learn";
const DEFAULT_EXAMPLE_LANGUAGE = "en";
const exampleManifestState = {
  defaultLanguage: DEFAULT_EXAMPLE_LANGUAGE,
  languages: [DEFAULT_EXAMPLE_LANGUAGE]
};
const exampleVariantCache = new Map();
