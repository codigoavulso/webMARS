injectRuntimeStyles();

const preferences = loadPreferences();
const runtimeSettings = { ...DEFAULT_SETTINGS };

const moduleRegistry = (typeof window !== "undefined" ? window.WebMarsModules : globalThis.WebMarsModules) || {};
const runtimeCoreStoreModule = moduleRegistry.coreStore;
const runtimeSettingsModule = moduleRegistry.runtimeSettings;
const miniCCompilerModule = moduleRegistry.miniCCompiler;
const fileKindsModule = moduleRegistry.fileKinds;

if (!runtimeCoreStoreModule || typeof runtimeCoreStoreModule.createStore !== "function") {
  throw new Error("[mars-web] coreStore module was not loaded before app runtime.");
}
if (!runtimeSettingsModule || typeof runtimeSettingsModule.sanitizeMemoryGb !== "function") {
  throw new Error("[mars-web] runtimeSettings module was not loaded before app runtime.");
}
if (!miniCCompilerModule
  || typeof miniCCompilerModule.compile !== "function"
  || typeof miniCCompilerModule.isSourceFile !== "function"
  || typeof miniCCompilerModule.deriveGeneratedAsmName !== "function"
  || typeof miniCCompilerModule.defaultTemplate !== "string"
  || !miniCCompilerModule.defaultTemplate.trim()
) {
  throw new Error("[mars-web] miniCCompiler module was not loaded before app runtime.");
}
if (!fileKindsModule
  || typeof fileKindsModule.classifyFileName !== "function"
  || typeof fileKindsModule.isCSourceFile !== "function"
  || typeof fileKindsModule.isCFamilyFile !== "function"
  || typeof fileKindsModule.isAssemblySourceFile !== "function"
) {
  throw new Error("[mars-web] fileKinds module was not loaded before app runtime.");
}

const { createStore: runtimeCreateStore } = runtimeCoreStoreModule;
const {
  MIN_MEMORY_GB,
  MAX_MEMORY_GB,
  DEFAULT_MEMORY_GB,
  DEFAULT_MAX_BACKSTEPS,
  MIN_MAX_BACKSTEPS,
  MAX_MAX_BACKSTEPS,
  BACKEND_MODE_JS,
  BACKEND_MODE_HYBRID,
  DEFAULT_BACKEND_MODE,
  sanitizeMemoryGb,
  sanitizeMaxBacksteps,
  sanitizeBackendMode,
  memoryGbToBytes,
  getI18nApi,
  applyLanguagePreference,
  getAvailableLanguages
} = runtimeSettingsModule;

applyLanguagePreference(preferences.language || "en");

runtimeSettings.startAtMain = preferences.startAtMain;
runtimeSettings.delayedBranching = preferences.delayedBranching;
runtimeSettings.warningsAreErrors = preferences.warningsAreErrors;
runtimeSettings.assembleOnOpen = preferences.assembleOnOpen;
runtimeSettings.assembleAll = preferences.assembleAll;
runtimeSettings.extendedAssembler = preferences.extendedAssembler;
runtimeSettings.strictMarsCompatibility = preferences.strictMarsCompatibility;
runtimeSettings.selfModifyingCode = preferences.selfModifyingCode;
runtimeSettings.popupSyscallInput = preferences.popupSyscallInput;
runtimeSettings.programArguments = preferences.programArguments;
runtimeSettings.programArgumentsLine = preferences.programArgumentsText || "";
runtimeSettings.maxBacksteps = sanitizeMaxBacksteps(preferences.maxBacksteps, DEFAULT_SETTINGS.maxBacksteps);
runtimeSettings.maxMemoryBytes = memoryGbToBytes(preferences.maxMemoryGb ?? DEFAULT_MEMORY_GB);
runtimeSettings.assemblerBackendMode = sanitizeBackendMode(preferences.assemblerBackendMode, DEFAULT_BACKEND_MODE);
runtimeSettings.simulatorBackendMode = sanitizeBackendMode(preferences.simulatorBackendMode, DEFAULT_BACKEND_MODE);
runtimeSettings.coreBackend = runtimeSettings.simulatorBackendMode === BACKEND_MODE_HYBRID ? "wasm" : "js";

const memoryPresets = (typeof MEMORY_CONFIG_PRESETS === "object" && MEMORY_CONFIG_PRESETS) || {};

function parseAddressPreference(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value)) return value >>> 0;
  if (typeof value !== "string") return fallback >>> 0;
  const trimmed = value.trim();
  if (!trimmed) return fallback >>> 0;
  const parsed = trimmed.toLowerCase().startsWith("0x")
    ? Number.parseInt(trimmed.slice(2), 16)
    : Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) return fallback >>> 0;
  return parsed >>> 0;
}

function resolveMemoryPreset(preferenceState) {
  const preferred = String(preferenceState.memoryConfiguration || "Default");
  const preset = memoryPresets[preferred] || memoryPresets.Default || DEFAULT_MEMORY_MAP;
  return { id: preferred, map: { ...DEFAULT_MEMORY_MAP, ...preset } };
}

const initialMemorySelection = resolveMemoryPreset(preferences);
const initialMemoryMap = {
  ...initialMemorySelection.map,
  exceptionHandlerAddress: parseAddressPreference(
    preferences.exceptionHandlerAddress,
    initialMemorySelection.map.exceptionHandlerAddress ?? DEFAULT_MEMORY_MAP.exceptionHandlerAddress
  )
};

const refs = renderLayout(document.querySelector("#app"));
const windowManager = createWindowManager(refs);
const transientDialogSystems = new Set();
let transientDialogCounter = 0;
const createModernHelpSystem = (typeof window !== "undefined" ? window : globalThis).createMarsJavaStyleHelpSystem;

if (typeof createModernHelpSystem !== "function") {
  throw new Error("[mars-web] Help system module was not loaded before app runtime.");
}

function createTransientDialogSystem(windowOptions = {}) {
  transientDialogCounter += 1;
  const prefix = String(windowOptions.windowIdPrefix || "window-dialog-system").trim() || "window-dialog-system";
  const { windowIdPrefix, ...rest } = windowOptions;
  const dialogSystem = createDialogSystem(windowManager, refs.windows.desktop, {
    ...rest,
    windowId: prefix === "window-dialog-system"
      ? prefix
      : `${prefix}-${transientDialogCounter}`
  });
  transientDialogSystems.add(dialogSystem);
  return dialogSystem;
}

async function runDialogPrompt(options = {}, windowOptions = {}) {
  const dialogSystem = createTransientDialogSystem(windowOptions);
  try {
    return await dialogSystem.prompt(options);
  } finally {
    transientDialogSystems.delete(dialogSystem);
    dialogSystem.destroy?.();
  }
}

async function runDialogConfirm(options = {}, windowOptions = {}) {
  const dialogSystem = createTransientDialogSystem(windowOptions);
  try {
    return await dialogSystem.confirm(options);
  } finally {
    transientDialogSystems.delete(dialogSystem);
    dialogSystem.destroy?.();
  }
}

async function runDialogForm(options = {}, windowOptions = {}) {
  const dialogSystem = createTransientDialogSystem(windowOptions);
  try {
    return await dialogSystem.form(options);
  } finally {
    transientDialogSystems.delete(dialogSystem);
    dialogSystem.destroy?.();
  }
}
const SESSION_STORAGE_KEY = "mars45-web-session-v3";
const LEGACY_SESSION_STORAGE_KEY = "mars45-web-session-v1";
const SESSION_SERVER_DRAFT_KEY = "mars45-web-session-server-draft-v1";
const SESSION_SCHEMA_VERSION = 3;
const SESSION_MAX_AUTOSAVED_BACKSTEPS = 10;
const SESSION_PERSIST_DEBOUNCE_MS = 180;
const SESSION_PERSIST_INTERVAL_MS = 2 * 60 * 1000;
const SESSION_STORAGE_TARGET_MAX_CHARS = 3600000;
const ABOUT_VISITED_KEY = "mars45-web-about-visited-v1";
const ONLINE_SOURCE_STORAGE_KEY = "mars45-web-online-source-folder-v1";
const ONLINE_SOURCE_MAX_BYTES = Math.max(1024, Math.floor(Number(DEFAULT_SETTINGS?.maxUserStorageBytes) || (1024 * 1024)));
const PROJECT_STORAGE_KEY = "mars45-web-project-v1";
const PROJECT_LIBRARY_STORAGE_KEY = "mars45-web-project-library-v1";
const CLOUD_PROJECT_DOCUMENT_KIND = "webmars-project";
const CLOUD_PROJECT_DOCUMENT_VERSION = 1;
const CLOUD_LOCAL_DEV_API_BASE = "http://localhost:5000/api";
const RESETTABLE_LOCAL_STORAGE_KEYS = Object.freeze([
  SESSION_STORAGE_KEY,
  LEGACY_SESSION_STORAGE_KEY,
  SESSION_SERVER_DRAFT_KEY,
  ABOUT_VISITED_KEY,
  ONLINE_SOURCE_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
  PROJECT_LIBRARY_STORAGE_KEY,
  "mars45-web-preferences",
  "webmars-language-v1",
  "mars45-window-layout-history-v1",
  "mars45-window-layout-saved-v1",
  "webmars-vfs-v1"
]);
const STARTUP_RECOVERY_LOCAL_STORAGE_KEYS = Object.freeze([
  SESSION_STORAGE_KEY,
  LEGACY_SESSION_STORAGE_KEY,
  SESSION_SERVER_DRAFT_KEY,
  ONLINE_SOURCE_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
  PROJECT_LIBRARY_STORAGE_KEY,
  "webmars-vfs-v1"
]);
const STARTUP_RECOVERY_SKIP_SESSION_KEY = "mars45-startup-skip-recovery-once-v1";
const PROJECT_SCHEMA_VERSION = 1;
const PROJECT_LIBRARY_SCHEMA_VERSION = 1;
const PROJECT_STATE_SLOT_COUNT = 5;
const C_SOURCE_FILE_EXTENSIONS = normalizeExtensionAliasList(fileKindsModule.cSourceExtensions, [".c", ".c0"]);
const C_HEADER_FILE_EXTENSIONS = normalizeExtensionAliasList(fileKindsModule.cHeaderExtensions, [".h", ".h0"]);
const ASM_SOURCE_FILE_EXTENSIONS = normalizeExtensionAliasList(fileKindsModule.asmSourceExtensions, [".s", ".asm", ".mips"]);
const OPENABLE_TEXT_FILE_EXTENSIONS = normalizeExtensionAliasList(fileKindsModule.openableTextExtensions, [".txt"]);
const SUPPORTED_PROJECT_FILE_EXTENSIONS = new Set([
  ...ASM_SOURCE_FILE_EXTENSIONS,
  ...C_SOURCE_FILE_EXTENSIONS,
  ...C_HEADER_FILE_EXTENSIONS,
  ...OPENABLE_TEXT_FILE_EXTENSIONS
]);
const DEFAULT_PROJECT_C_TEMPLATE = [
  "int main(void) {",
  "  int n = 5;",
  "  int acc = 1;",
  "  while (n > 1) {",
  "    acc = acc * n;",
  "    n = n - 1;",
  "  }",
  "  print_int(acc);",
  "  print_char(10);",
  "  return 0;",
  "}",
  ""
].join("\n");
const textEncoder = typeof TextEncoder === "function" ? new TextEncoder() : null;
let cloudApiBase = resolveCloudApiBase();
let cloudAuthState = "unknown";
let cloudUser = null;
let cloudLastError = "";
let cloudSyncInFlight = false;
let cloudLastSyncAt = 0;
let cloudSessionRefreshPromise = null;
let cloudProjectSyncRefreshPromise = null;
const cloudProjectSyncDocuments = new Map();

function getExperimentalFlags() {
  const scope = typeof window !== "undefined" ? window : globalThis;
  return (scope && typeof scope.WebMarsExperimental === "object" && scope.WebMarsExperimental) || {};
}

function isMachineSessionAutosaveEnabled() {
  return getExperimentalFlags().machineSessionAutosave === true;
}

function resolveDefaultCloudApiBase() {
  const configuredDefault = normalizeCloudApiBase(DEFAULT_SETTINGS?.cloudApiBase || "");
  if (typeof window === "undefined" || !window.location) return configuredDefault || CLOUD_LOCAL_DEV_API_BASE;
  const host = String(window.location.hostname || "").trim().toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return CLOUD_LOCAL_DEV_API_BASE;
  }
  return configuredDefault || CLOUD_LOCAL_DEV_API_BASE;
}

function normalizeCloudApiBase(value) {
  return String(value || "").trim().replace(/\/+$/g, "");
}

function resolveCloudApiBase(preferenceState = preferences) {
  const scope = typeof window !== "undefined" ? window : globalThis;
  const config = (scope && typeof scope.WebMarsCloudConfig === "object" && scope.WebMarsCloudConfig) || {};
  const preferred = normalizeCloudApiBase(preferenceState?.cloudApiBase || "");
  const configured = normalizeCloudApiBase(config.baseUrl || "");
  const selected = preferred || configured || resolveDefaultCloudApiBase();
  return normalizeCloudApiBase(selected);
}

function parseTimestampValue(value, fallback = 0) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
}

function formatTimestampForDisplay(value) {
  const timestamp = parseTimestampValue(value, 0);
  if (!timestamp) return "unknown";
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return String(value || "unknown");
  }
}

function describeCloudError(error, fallback = "Cloud request failed.") {
  if (error && typeof error === "object" && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

function describeCloudApiBasePreference(preferenceState = store?.getState?.().preferences || preferences) {
  const explicit = normalizeCloudApiBase(preferenceState?.cloudApiBase || "");
  return explicit || resolveDefaultCloudApiBase();
}

function formatCloudAttemptProgress(template, url, startedAt) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Number(startedAt || Date.now())) / 1000));
  return translateText(template, {
    url: String(url || cloudApiBase || ""),
    seconds: elapsedSeconds
  });
}

function startCloudAttemptStatus(dialog, template, url) {
  const startedAt = Date.now();
  const update = () => {
    dialog.setMessage(formatCloudAttemptProgress(template, url, startedAt), "info");
  };
  update();
  const timer = window.setInterval(update, 1000);
  return () => {
    window.clearInterval(timer);
  };
}

function buildCloudStoreState() {
  return {
    apiBase: cloudApiBase,
    authState: cloudAuthState,
    authenticated: cloudAuthState === "authenticated",
    user: cloudUser && typeof cloudUser === "object"
      ? {
        id: Number(cloudUser.id) || 0,
        username: String(cloudUser.username || ""),
        email: String(cloudUser.email || "")
      }
      : null,
    syncInFlight: cloudSyncInFlight === true,
    lastSyncAt: Number(cloudLastSyncAt) || 0,
    lastError: String(cloudLastError || "")
  };
}


function showAboutOnFirstVisit() {
  try {
    const visited = window.localStorage.getItem(ABOUT_VISITED_KEY);
    if (visited === "1") return;
    helpSystem.openAbout();
    window.localStorage.setItem(ABOUT_VISITED_KEY, "1");
  } catch {
    // Ignore localStorage failures and continue without first-visit persistence.
  }
}

function normalizeRestoredFile(file, index) {
  if (!file || typeof file !== "object") return null;
  const source = String(file.source ?? "");
  const savedSource = typeof file.savedSource === "string" ? String(file.savedSource) : source;
  return {
    id: String(file.id || `file-restored-${index}`),
    name: normalizeFilename(file.name || `restored_${index + 1}.s`),
    source,
    savedSource,
    projectOwned: file.projectOwned !== false,
    readOnly: file.readOnly === true,
    sourceKind: String(file.sourceKind || (file.projectOwned === false ? "external" : "project")),
    sourceProjectRootPath: String(file.sourceProjectRootPath || ""),
    sourceProjectPath: String(file.sourceProjectPath || file.name || ""),
    originKey: String(file.originKey || ""),
    undoStack: [source],
    redoStack: []
  };
}

function collectSessionProjectSeedFiles(files = []) {
  return (Array.isArray(files) ? files : [])
    .filter((file) => file && typeof file === "object" && file.projectOwned !== false)
    .map((file) => ({
      id: String(file.id || ""),
      path: String(file.sourceProjectPath || file.name || ""),
      source: String(file.source ?? ""),
      savedSource: typeof file.savedSource === "string" ? String(file.savedSource) : String(file.source ?? "")
    }))
    .filter((file) => String(file.path || "").trim().length);
}

function collectSessionExternalEditorFiles(files = [], existingFiles = []) {
  const existingIds = new Set(
    (Array.isArray(existingFiles) ? existingFiles : [])
      .map((file) => String(file?.id || "").trim())
      .filter(Boolean)
  );
  return (Array.isArray(files) ? files : [])
    .filter((file) => file && typeof file === "object" && file.projectOwned === false)
    .filter((file) => {
      const id = String(file.id || "").trim();
      return !id || !existingIds.has(id);
    })
    .map((file, index) => normalizeRestoredFile(file, index))
    .filter(Boolean);
}

function buildStartupEditorFiles(project, restoredFiles = [], fallbackFiles = []) {
  if (project?.isOpen === true) {
    const projectFiles = mapProjectFilesToEditorFiles(project.files, restoredFiles);
    return [
      ...projectFiles,
      ...collectSessionExternalEditorFiles(restoredFiles, projectFiles)
    ];
  }
  return Array.isArray(restoredFiles) && restoredFiles.length ? restoredFiles : fallbackFiles;
}

function resolveStartupActiveFileId(project, restoredSession, files = []) {
  const restoredActiveId = String(restoredSession?.activeFileId || "").trim();
  if (restoredActiveId && files.some((file) => String(file?.id || "") === restoredActiveId)) {
    return restoredActiveId;
  }
  if (project?.isOpen === true) {
    const projectActiveId = String(project?.activeFileId || "").trim();
    if (projectActiveId && files.some((file) => String(file?.id || "") === projectActiveId)) {
      return projectActiveId;
    }
  }
  return String(files[0]?.id || "");
}

function normalizeMachineStateEntry(state) {
  if (!state || typeof state !== "object") return null;
  if (!Array.isArray(state.registers) || !Array.isArray(state.memoryWords)) return null;
  return state;
}

function normalizeWindowSessionData(windowState) {
  if (!windowState || typeof windowState !== "object") return null;
  const windows = Array.isArray(windowState.windows)
    ? windowState.windows.filter((entry) => entry && typeof entry === "object")
    : [];
  if (!windows.length) return null;
  return {
    version: Number.isFinite(windowState.version) ? (windowState.version | 0) : 1,
    layoutMode: String(windowState.layoutMode || ""),
    windows
  };
}

function normalizeProjectName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "project";
  return raw.replace(/[\\/:*?"<>|]+/g, "_");
}

function normalizeProjectRootKey(rootPath) {
  return String(rootPath || "").trim().toLowerCase();
}

function normalizeExtensionAliasList(values, fallback) {
  const source = Array.isArray(values) && values.length ? values : fallback;
  return Array.from(new Set(
    source
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean)
      .map((value) => (value.startsWith(".") ? value : `.${value}`))
  ));
}

const classifyWorkspaceFile = (fileName = "") => fileKindsModule.classifyFileName(fileName);
const isCSourceFile = (fileName = "") => fileKindsModule.isCSourceFile(fileName);
const isCFamilyFile = (fileName = "") => fileKindsModule.isCFamilyFile(fileName);
const isAssemblySourceFile = (fileName = "") => fileKindsModule.isAssemblySourceFile(fileName);

function getPathExtension(pathValue) {
  const normalized = String(pathValue || "").trim().toLowerCase();
  const slash = normalized.lastIndexOf("/");
  const base = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return "";
  return base.slice(dot);
}

function isSupportedProjectFilePath(pathValue) {
  const extension = getPathExtension(pathValue);
  return SUPPORTED_PROJECT_FILE_EXTENSIONS.has(extension);
}

function normalizeProjectRootPath(rootPath, fallbackName = "project") {
  const safeFallback = `${normalizeProjectName(fallbackName)}.p`;
  const raw = String(rootPath || "").trim().replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/^\/+/, "");
  if (!raw) return safeFallback;
  return /\.p$/i.test(raw) ? raw : `${raw}.p`;
}

function normalizeProjectPath(pathValue, fallbackName = "untitled.s") {
  const raw = String(pathValue || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");
  const candidate = raw || fallbackName;
  return normalizeFilename(candidate);
}

function splitProjectPathSegments(pathValue = "") {
  return String(pathValue || "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => String(segment || "").trim())
    .filter(Boolean);
}

function joinProjectPathSegments(segments = []) {
  return segments
    .map((segment) => String(segment || "").trim())
    .filter(Boolean)
    .join("/");
}

function projectPathBasename(pathValue = "") {
  const segments = splitProjectPathSegments(pathValue);
  return segments.length ? segments[segments.length - 1] : "";
}

function projectPathDirname(pathValue = "") {
  const segments = splitProjectPathSegments(pathValue);
  if (segments.length <= 1) return "";
  return joinProjectPathSegments(segments.slice(0, -1));
}

function normalizeProjectFolderSegment(value, fallbackValue = "folder") {
  const raw = String(value || "").trim();
  const fallback = String(fallbackValue || "folder").trim() || "folder";
  const candidate = raw || fallback;
  const sanitized = candidate
    .replace(/[\u0000-\u001f]+/g, "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return sanitized || fallback;
}

function normalizeProjectFolderPath(pathValue, fallbackName = "folder") {
  const rawSegments = splitProjectPathSegments(pathValue);
  const fallback = normalizeProjectFolderSegment(fallbackName, "folder");
  const segments = (rawSegments.length ? rawSegments : [fallback])
    .map((segment) => normalizeProjectFolderSegment(segment, fallback))
    .map((segment) => String(segment || "").trim())
    .filter(Boolean);
  return joinProjectPathSegments(segments);
}

function normalizeProjectFolderPaths(paths, files = []) {
  const normalized = new Set();
  (Array.isArray(paths) ? paths : []).forEach((entry, index) => {
    const folderPath = normalizeProjectFolderPath(entry, `folder_${index + 1}`);
    const parts = splitProjectPathSegments(folderPath);
    if (!parts.length) return;
    for (let cursor = 1; cursor <= parts.length; cursor += 1) {
      normalized.add(joinProjectPathSegments(parts.slice(0, cursor)));
    }
  });
  normalizeProjectFiles(files).forEach((file) => {
    const filePath = normalizeProjectPath(file?.path, "untitled.s");
    const parts = splitProjectPathSegments(filePath);
    if (parts.length <= 1) return;
    for (let cursor = 1; cursor < parts.length; cursor += 1) {
      normalized.add(joinProjectPathSegments(parts.slice(0, cursor)));
    }
  });
  return [...normalized].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function normalizeProjectFileEntry(file, index = 0) {
  if (!file || typeof file !== "object") return null;
  const source = String(file.source ?? "");
  const savedSource = typeof file.savedSource === "string" ? String(file.savedSource) : source;
  const path = normalizeProjectPath(file.path || file.name, `src/file_${index + 1}.s`);
  const updatedAtRaw = Number(file.updatedAt);
  const updatedAt = Number.isFinite(updatedAtRaw) && updatedAtRaw > 0
    ? Math.floor(updatedAtRaw)
    : Date.now();
  return {
    id: String(file.id || `project-file-${index + 1}`),
    path,
    source,
    savedSource,
    updatedAt
  };
}

function normalizeProjectFiles(files) {
  const entries = Array.isArray(files) ? files : [];
  const usedPaths = new Set();
  const normalized = [];
  entries.forEach((entry, index) => {
    const next = normalizeProjectFileEntry(entry, index);
    if (!next) return;
    let candidate = next.path;
    let suffix = 1;
    while (usedPaths.has(candidate)) {
      const dot = next.path.lastIndexOf(".");
      const stem = dot > 0 ? next.path.slice(0, dot) : next.path;
      const ext = dot > 0 ? next.path.slice(dot) : "";
      candidate = `${stem}_${suffix}${ext}`;
      suffix += 1;
    }
    usedPaths.add(candidate);
    normalized.push({
      ...next,
      path: candidate
    });
  });
  return normalized;
}

function normalizeProjectStateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const files = normalizeProjectFiles(snapshot.files);
  if (!files.length) return null;
  const activeFileId = String(snapshot.activeFileId || files[0].id);
  return {
    files,
    activeFileId,
    preferences: snapshot.preferences && typeof snapshot.preferences === "object"
      ? { ...snapshot.preferences }
      : null,
    windowState: normalizeWindowSessionData(snapshot.windowState),
    layoutState: normalizeWindowSessionData(snapshot.layoutState),
    mode: String(snapshot.mode || "")
  };
}

function normalizeProjectStateSlots(slots) {
  const out = Array.from({ length: PROJECT_STATE_SLOT_COUNT }, () => null);
  if (!Array.isArray(slots)) return out;
  for (let index = 0; index < PROJECT_STATE_SLOT_COUNT; index += 1) {
    const slot = slots[index];
    if (!slot || typeof slot !== "object") continue;
    const snapshot = normalizeProjectStateSnapshot(slot.snapshot);
    if (!snapshot) continue;
    out[index] = {
      label: String(slot.label || "").trim(),
      savedAt: Number(slot.savedAt) || Date.now(),
      snapshot
    };
  }
  return out;
}

function normalizeProjectData(project) {
  if (!project || typeof project !== "object") return null;
  const name = normalizeProjectName(project.name || "project");
  const files = normalizeProjectFiles(project.files);
  const folderPaths = normalizeProjectFolderPaths(project.folderPaths, files);
  const activeFileId = String(project.activeFileId || files[0]?.id || "");
  return {
    version: Number.isFinite(project.version) ? (project.version | 0) : PROJECT_SCHEMA_VERSION,
    isOpen: project.isOpen !== false,
    name,
    description: String(project.description || ""),
    rootPath: normalizeProjectRootPath(project.rootPath, name),
    folderPaths,
    files,
    activeFileId,
    settings: project.settings && typeof project.settings === "object"
      ? { ...project.settings }
      : {},
    layout: normalizeWindowSessionData(project.layout),
    states: normalizeProjectStateSlots(project.states),
    updatedAt: Number(project.updatedAt) || Date.now()
  };
}

function normalizeProjectLibraryData(library) {
  const payload = library && typeof library === "object" ? library : {};
  const sourceProjects = Array.isArray(payload.projects) ? payload.projects : [];
  const projects = [];
  const seenRoots = new Set();
  sourceProjects.forEach((entry) => {
    const normalized = normalizeProjectData(entry);
    if (!normalized) return;
    const rootKey = normalizeProjectRootKey(normalized.rootPath);
    if (!rootKey || seenRoots.has(rootKey)) return;
    seenRoots.add(rootKey);
    projects.push(normalized);
  });
  projects.sort((a, b) => String(a.rootPath || "").localeCompare(String(b.rootPath || ""), undefined, { sensitivity: "base" }));
  if (!projects.length) {
    return {
      version: PROJECT_LIBRARY_SCHEMA_VERSION,
      activeRootPath: "",
      projects: []
    };
  }
  const rawActiveRootPath = normalizeProjectRootPath(payload.activeRootPath || projects[0].rootPath, projects[0].name);
  const activeRootKey = normalizeProjectRootKey(rawActiveRootPath);
  const activeProject = projects.find((entry) => normalizeProjectRootKey(entry.rootPath) === activeRootKey) || projects[0];
  return {
    version: Number.isFinite(payload.version) ? (payload.version | 0) : PROJECT_LIBRARY_SCHEMA_VERSION,
    activeRootPath: activeProject.rootPath,
    projects
  };
}

function saveProjectLibraryData(library) {
  try {
    window.localStorage.setItem(PROJECT_LIBRARY_STORAGE_KEY, JSON.stringify(library));
    return true;
  } catch {
    return false;
  }
}

function loadProjectLibraryData() {
  try {
    const raw = window.localStorage.getItem(PROJECT_LIBRARY_STORAGE_KEY);
    if (!raw) return null;
    return normalizeProjectLibraryData(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveProjectData(project) {
  try {
    window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    return true;
  } catch {
    return false;
  }
}

function loadProjectData() {
  try {
    const raw = window.localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) return null;
    return normalizeProjectData(JSON.parse(raw));
  } catch {
    return null;
  }
}

function clearRecoverableLocalStorageData() {
  let removed = 0;
  try {
    if (!window.localStorage) return 0;
    RESETTABLE_LOCAL_STORAGE_KEYS.forEach((key) => {
      const existing = window.localStorage.getItem(key);
      if (existing == null) return;
      window.localStorage.removeItem(key);
      removed += 1;
    });
  } catch {
    // Ignore storage errors.
  }
  return removed;
}

function enterResetReloadMode() {
  suppressPersistenceForResetReload = true;
  allowPageUnload = true;
  if (persistTimer !== null) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (projectPersistTimer !== null) {
    window.clearTimeout(projectPersistTimer);
    projectPersistTimer = null;
  }
  projectPersistWantsEditorSync = false;
}

function hasStartupRecoverableLocalStorageData() {
  try {
    if (!window.localStorage) return false;
    return STARTUP_RECOVERY_LOCAL_STORAGE_KEYS.some((key) => {
      const value = window.localStorage.getItem(key);
      return value != null && String(value).trim() !== "";
    });
  } catch {
    return false;
  }
}

function markSkipStartupRecoveryPromptOnce() {
  try {
    window.sessionStorage?.setItem(STARTUP_RECOVERY_SKIP_SESSION_KEY, "1");
  } catch {
    // Ignore storage errors.
  }
}

function consumeStartupRecoverySkipFlag() {
  try {
    const shouldSkip = window.sessionStorage?.getItem(STARTUP_RECOVERY_SKIP_SESSION_KEY) === "1";
    if (shouldSkip) {
      window.sessionStorage?.removeItem(STARTUP_RECOVERY_SKIP_SESSION_KEY);
    }
    return shouldSkip;
  } catch {
    return false;
  }
}

function createDefaultProjectData(options = {}) {
  const name = normalizeProjectName(options.name || "project");
  const seedFiles = normalizeProjectFiles(options.files);
  const files = seedFiles.length
    ? seedFiles
    : normalizeProjectFiles([
      {
        id: "project-file-c0",
        path: "src/main.c",
        source: DEFAULT_PROJECT_C_TEMPLATE,
        savedSource: DEFAULT_PROJECT_C_TEMPLATE
      },
      {
        id: "project-file-asm",
        path: "src/main.s",
        source: INITIAL_SOURCE,
        savedSource: INITIAL_SOURCE
      }
    ]);
  const activeFileId = String(options.activeFileId || files[0]?.id || "");
  const folderPaths = normalizeProjectFolderPaths(options.folderPaths, files);
  return normalizeProjectData({
    version: PROJECT_SCHEMA_VERSION,
    isOpen: true,
    name,
    description: String(options.description || ""),
    rootPath: normalizeProjectRootPath(options.rootPath, name),
    folderPaths,
    files,
    activeFileId,
    settings: options.settings && typeof options.settings === "object" ? options.settings : {},
    layout: options.layout || null,
    states: Array.from({ length: PROJECT_STATE_SLOT_COUNT }, () => null),
    updatedAt: Date.now()
  });
}

function mapProjectFilesToEditorFiles(projectFiles, fallbackFiles = []) {
  const fallbackByName = new Map(
    (Array.isArray(fallbackFiles) ? fallbackFiles : [])
      .filter((entry) => entry && typeof entry === "object")
      .map((entry) => [String(entry.name || ""), entry])
  );
  const rawEntriesByPath = new Map(
    (Array.isArray(projectFiles) ? projectFiles : [])
      .filter((entry) => entry && typeof entry === "object")
      .map((entry, index) => [
        normalizeProjectPath(entry.path || entry.name, `src/file_${index + 1}.s`),
        entry
      ])
  );
  const normalized = normalizeProjectFiles(projectFiles);
  return normalized.map((file, index) => {
    const fallback = fallbackByName.get(file.path);
    const rawEntry = rawEntriesByPath.get(file.path);
    const hasRawSource = Boolean(rawEntry && Object.prototype.hasOwnProperty.call(rawEntry, "source"));
    const hasRawSavedSource = Boolean(rawEntry && Object.prototype.hasOwnProperty.call(rawEntry, "savedSource"));
    const source = hasRawSource
      ? String(rawEntry.source ?? "")
      : String(fallback?.source ?? "");
    const savedSource = hasRawSavedSource
      ? String(rawEntry.savedSource ?? source)
      : (typeof fallback?.savedSource === "string" ? fallback.savedSource : source);
    return {
      id: String(file.id || `file-project-${index + 1}`),
      name: file.path,
      source,
      savedSource,
      projectOwned: true,
      readOnly: false,
      sourceKind: "project",
      sourceProjectRootPath: "",
      sourceProjectPath: file.path,
      undoStack: [source],
      redoStack: []
    };
  });
}

function buildProjectStoreState(project) {
  const slots = Array.isArray(project?.states)
    ? project.states.map((slot) => (
      slot && typeof slot === "object"
        ? {
          label: String(slot.label || "").trim(),
          savedAt: Number(slot.savedAt) || 0
        }
        : null
    ))
    : Array.from({ length: PROJECT_STATE_SLOT_COUNT }, () => null);
  return {
    isOpen: project?.isOpen === true,
    name: String(project?.name || "project"),
    description: String(project?.description || ""),
    rootPath: String(project?.rootPath || "project.p"),
    states: slots
  };
}

function loadWorkspaceSession() {
  const candidateKeys = [SESSION_STORAGE_KEY, LEGACY_SESSION_STORAGE_KEY];
  for (let i = 0; i < candidateKeys.length; i += 1) {
    const storageKey = candidateKeys[i];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.files) || !parsed.files.length) continue;

      const files = parsed.files
        .map((file, index) => normalizeRestoredFile(file, index))
        .filter(Boolean);

      if (!files.length) continue;
      const activeFileId = String(parsed.activeFileId || files[0].id);
      const active = files.find((file) => file.id === activeFileId) || files[0];
      const windowState = normalizeWindowSessionData(parsed.windowState);
      return { files, activeFileId: active.id, active, windowState };
    } catch {
      // Try next key.
    }
  }
  return null;
}

const startupHadRecoverableLocalData = hasStartupRecoverableLocalStorageData() && !consumeStartupRecoverySkipFlag();
const restoredSession = loadWorkspaceSession();
const storedProject = loadProjectData();
const fallbackBootstrapProject = storedProject || createDefaultProjectData({
  files: collectSessionProjectSeedFiles(restoredSession?.files),
  activeFileId: restoredSession?.activeFileId || "",
  settings: preferences
});
const storedProjectLibrary = loadProjectLibraryData();
let bootstrapProjectLibrary = (
  storedProjectLibrary && Array.isArray(storedProjectLibrary.projects) && storedProjectLibrary.projects.length
    ? storedProjectLibrary
    : normalizeProjectLibraryData({
      version: PROJECT_LIBRARY_SCHEMA_VERSION,
      activeRootPath: fallbackBootstrapProject.rootPath,
      projects: [fallbackBootstrapProject]
    })
);
const storedProjectRootKey = normalizeProjectRootKey(storedProject?.rootPath || "");
if (storedProjectRootKey) {
  const hasStoredProject = bootstrapProjectLibrary.projects.some((entry) => (
    normalizeProjectRootKey(entry.rootPath) === storedProjectRootKey
  ));
  if (!hasStoredProject) {
    bootstrapProjectLibrary = normalizeProjectLibraryData({
      ...bootstrapProjectLibrary,
      activeRootPath: storedProject.rootPath,
      projects: [...bootstrapProjectLibrary.projects, storedProject]
    });
  }
}
if (!Array.isArray(bootstrapProjectLibrary.projects) || !bootstrapProjectLibrary.projects.length) {
  bootstrapProjectLibrary = normalizeProjectLibraryData({
    version: PROJECT_LIBRARY_SCHEMA_VERSION,
    activeRootPath: fallbackBootstrapProject.rootPath,
    projects: [fallbackBootstrapProject]
  });
}
const bootstrapProject = bootstrapProjectLibrary.projects.find((entry) => (
  normalizeProjectRootKey(entry.rootPath) === normalizeProjectRootKey(bootstrapProjectLibrary.activeRootPath)
)) || fallbackBootstrapProject;
saveProjectData(bootstrapProject);
saveProjectLibraryData(bootstrapProjectLibrary);

const fallbackInitialFileId = restoredSession?.activeFileId || "file-initial";
const fallbackInitialFiles = restoredSession?.files || [{
  id: fallbackInitialFileId,
  name: "src/main.s",
  source: INITIAL_SOURCE,
  savedSource: INITIAL_SOURCE,
  undoStack: [INITIAL_SOURCE],
  redoStack: []
}];
const initialFiles = buildStartupEditorFiles(bootstrapProject, restoredSession?.files, fallbackInitialFiles);
const preferredInitialActiveId = resolveStartupActiveFileId(bootstrapProject, restoredSession, initialFiles);
const initialActiveFile = initialFiles.find((file) => file.id === preferredInitialActiveId) || initialFiles[0];

const store = runtimeCreateStore({
  sourceCode: initialActiveFile.source,
  fileName: initialActiveFile.name,
  files: initialFiles,
  activeFileId: initialActiveFile.id,
  assembled: false,
  halted: false,
  running: false,
  preferences,
  project: buildProjectStoreState(bootstrapProject),
  cloud: buildCloudStoreState()
});

const editor = setupEditor(refs, store);
const messagesPane = createMessagesPane(refs, DEFAULT_SETTINGS.maxMessageCharacters);
const postMarsRaw = (template, variables = {}, options = {}) => (
  messagesPane.postMars(translateText(template, variables), { translate: false, ...options })
);
const postMarsMessage = (template, variables = {}, options = {}) => (
  messagesPane.postMars(`${translateText(template, variables)}\n`, { translate: false, ...options })
);
const postMarsSystemLine = (template, variables = {}, options = {}) => {
  const prefix = messagesPane.marsEndsWithNewline?.() === false ? "\n" : "";
  messagesPane.postMars(`${prefix}${translateText(template, variables)}\n`, { translate: false, ...options });
};
const postRunRaw = (template, variables = {}, options = {}) => (
  messagesPane.postRun(translateText(template, variables), { translate: false, ...options })
);
const postRunMessage = (template, variables = {}, options = {}) => (
  messagesPane.postRun(`${translateText(template, variables)}\n`, { translate: false, ...options })
);
const postRunSystemLine = (template, variables = {}, options = {}) => {
  const prefix = messagesPane.runEndsWithNewline?.() === false ? "\n" : "";
  messagesPane.postRun(`${prefix}${translateText(template, variables)}\n`, { translate: false, ...options });
};
const helpSystem = createModernHelpSystem(refs, messagesPane, windowManager);
const engine = createMarsEngine({ settings: runtimeSettings, memoryMap: initialMemoryMap });
let activeMemoryConfigId = memoryPresets[initialMemorySelection.id] ? initialMemorySelection.id : "Default";
const executePane = createExecutePane(refs, engine);
const registersPane = createRegistersPane(refs);
const toolManager = createToolManager(engine, messagesPane, windowManager, refs.windows.desktop);
const modeController = createModeController(refs, windowManager);
editor.setActiveFileChangeHandler?.((file) => {
  modeController.syncForFileName?.(file?.name || "");
  Promise.resolve().then(() => {
    refreshRuntimeControls();
  });
});
const browserStorageManager = createBrowserStorageManager(refs, windowManager);
const RUN_SPEED_INDEX_MAX = 40;
const RUN_SPEED_INDEX_INTERACTION_LIMIT = 35;
const RUN_SPEED_UNLIMITED = 40;
const RUN_SPEED_TABLE = [
  0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 1, 2, 3, 4, 5,
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
  26, 27, 28, 29, 30, RUN_SPEED_UNLIMITED, RUN_SPEED_UNLIMITED,
  RUN_SPEED_UNLIMITED, RUN_SPEED_UNLIMITED, RUN_SPEED_UNLIMITED
];
const MOBILE_RUN_SPEED_PRESET_INDEXES = Object.freeze([5, 6, 7, 10, 15, 25, 40]);

let runTimer = null;
let runActive = false;
let runStopRequested = false;
let runLastTickAt = 0;
let runStepCarry = 0;
let runLastUiSyncAt = 0;
let runPausedForInput = false;
let resumeRunAfterInput = false;
let backstepDepthEstimate = 0;
let allowPageUnload = false;
let suppressPersistenceForResetReload = false;
let startupRecoveryDecisionPrompted = false;
const RUN_LOOP_INTERVAL_MS = 16;
const RUN_LOOP_MAX_BATCH = 240;
const RUN_LOOP_MAX_BATCH_UNLIMITED = 720;
const RUN_LOOP_COOPERATIVE_CHECK_INTERVAL_INTERACTIVE = 24;
const RUN_LOOP_COOPERATIVE_CHECK_INTERVAL_FAST = 8;
const RUN_LOOP_TIME_BUDGET_MS_INTERACTIVE = 7;
const RUN_LOOP_TIME_BUDGET_MS_FAST = 6;
const RUN_LOOP_UI_SYNC_INTERVAL_MS_INTERACTIVE = 66;
const RUN_LOOP_UI_SYNC_INTERVAL_MS_FAST = 33;
const RUN_LOOP_MACHINE_CAPTURE_INTERVAL_MS = 220;
const RUN_LOOP_MACHINE_FULL_CAPTURE_INTERVAL_MS = 2200;
const RUN_LOOP_TOOL_SYNC_INTERVAL_MS_NO_INTERACTION = 120;
const MINI_C_DEFAULT_TEMPLATE = miniCCompilerModule.defaultTemplate;
const MINI_C_BITMAP_DEFAULT_BASE = 0x10010000;
const MINI_C_NATIVE_LIB_BITMAP_RECT = [
  "void bitmap_set_base_address(int baseAddress) {",
  "  if (baseAddress == 0) {",
  "    return;",
  "  }",
  "}",
  "",
  "int bitmap_get_base_address(void) {",
  `  return ${MINI_C_BITMAP_DEFAULT_BASE};`,
  "}",
  "",
  "int* bitmap_framebuffer_base(void) {",
  `  return (int*)${MINI_C_BITMAP_DEFAULT_BASE};`,
  "}",
  "",
  "int bitmap_point_in_bounds(int x, int y, int cols, int rows) {",
  "  if (x < 0) return 0;",
  "  if (y < 0) return 0;",
  "  if (x >= cols) return 0;",
  "  if (y >= rows) return 0;",
  "  return 1;",
  "}",
  "",
  "void bitmap_put_pixel(int x, int y, int cols, int rows, int color) {",
  "  if (bitmap_point_in_bounds(x, y, cols, rows) == 0) return;",
  "  int* fb = bitmap_framebuffer_base();",
  "  fb[y * cols + x] = color;",
  "}",
  "",
  "void bitmap_fill_rect(int x, int y, int width, int height, int cols, int rows, int color) {",
  "  if (width <= 0) return;",
  "  if (height <= 0) return;",
  "  int x0 = x;",
  "  int y0 = y;",
  "  int x1 = x + width;",
  "  int y1 = y + height;",
  "  if (x0 < 0) x0 = 0;",
  "  if (y0 < 0) y0 = 0;",
  "  if (x1 > cols) x1 = cols;",
  "  if (y1 > rows) y1 = rows;",
  "  if (x0 >= x1) return;",
  "  if (y0 >= y1) return;",
  "  int* fb = bitmap_framebuffer_base();",
  "  int span = x1 - x0;",
  "  int yy = y0;",
  "  while (yy < y1) {",
  "    int index = yy * cols + x0;",
  "    int remaining = span;",
  "    while (remaining >= 4) {",
  "      fb[index] = color;",
  "      fb[index + 1] = color;",
  "      fb[index + 2] = color;",
  "      fb[index + 3] = color;",
  "      index = index + 4;",
  "      remaining = remaining - 4;",
  "    }",
  "    while (remaining > 0) {",
  "      fb[index] = color;",
  "      index = index + 1;",
  "      remaining = remaining - 1;",
  "    }",
  "    yy = yy + 1;",
  "  }",
  "}",
  ""
].join("\n");
const MINI_C_NATIVE_LIB_BITMAP_ASCII = [
  "#use <bitmap_rect>",
  "",
  "int bitmap_ascii_normalize(int ch) {",
  "  if (ch >= 97 && ch <= 122) return ch - 32;",
  "  return ch;",
  "}",
  "",
  "int bitmap_ascii_row_bits(int ch, int row) {",
  "  if (row < 0 || row > 6) return 0;",
  "  if (ch == 32) return 0;",
  "",
  "  if (ch == 64) {",
  "    if (row == 0) return 14;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 23;",
  "    if (row == 3) return 21;",
  "    if (row == 4) return 23;",
  "    if (row == 5) return 16;",
  "    if (row == 6) return 14;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 48) {",
  "    if (row == 0) return 14;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 19;",
  "    if (row == 3) return 21;",
  "    if (row == 4) return 25;",
  "    if (row == 5) return 17;",
  "    if (row == 6) return 14;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 50) {",
  "    if (row == 0) return 14;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 1;",
  "    if (row == 3) return 2;",
  "    if (row == 4) return 4;",
  "    if (row == 5) return 8;",
  "    if (row == 6) return 31;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 54) {",
  "    if (row == 0) return 6;",
  "    if (row == 1) return 8;",
  "    if (row == 2) return 16;",
  "    if (row == 3) return 30;",
  "    if (row == 4) return 17;",
  "    if (row == 5) return 17;",
  "    if (row == 6) return 14;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 65) {",
  "    if (row == 0) return 14;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 17;",
  "    if (row == 3) return 31;",
  "    if (row == 4) return 17;",
  "    if (row == 5) return 17;",
  "    if (row == 6) return 17;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 66) {",
  "    if (row == 0) return 30;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 17;",
  "    if (row == 3) return 30;",
  "    if (row == 4) return 17;",
  "    if (row == 5) return 17;",
  "    if (row == 6) return 30;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 67) {",
  "    if (row == 0) return 14;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 16;",
  "    if (row == 3) return 16;",
  "    if (row == 4) return 16;",
  "    if (row == 5) return 17;",
  "    if (row == 6) return 14;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 68) {",
  "    if (row == 0) return 30;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 17;",
  "    if (row == 3) return 17;",
  "    if (row == 4) return 17;",
  "    if (row == 5) return 17;",
  "    if (row == 6) return 30;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 69) {",
  "    if (row == 0) return 31;",
  "    if (row == 1) return 16;",
  "    if (row == 2) return 16;",
  "    if (row == 3) return 30;",
  "    if (row == 4) return 16;",
  "    if (row == 5) return 16;",
  "    if (row == 6) return 31;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 70) {",
  "    if (row == 0) return 31;",
  "    if (row == 1) return 16;",
  "    if (row == 2) return 16;",
  "    if (row == 3) return 30;",
  "    if (row == 4) return 16;",
  "    if (row == 5) return 16;",
  "    if (row == 6) return 16;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 72) {",
  "    if (row == 0) return 17;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 17;",
  "    if (row == 3) return 31;",
  "    if (row == 4) return 17;",
  "    if (row == 5) return 17;",
  "    if (row == 6) return 17;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 73) {",
  "    if (row == 0) return 14;",
  "    if (row == 1) return 4;",
  "    if (row == 2) return 4;",
  "    if (row == 3) return 4;",
  "    if (row == 4) return 4;",
  "    if (row == 5) return 4;",
  "    if (row == 6) return 14;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 76) {",
  "    if (row == 0) return 16;",
  "    if (row == 1) return 16;",
  "    if (row == 2) return 16;",
  "    if (row == 3) return 16;",
  "    if (row == 4) return 16;",
  "    if (row == 5) return 16;",
  "    if (row == 6) return 31;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 77) {",
  "    if (row == 0) return 17;",
  "    if (row == 1) return 27;",
  "    if (row == 2) return 21;",
  "    if (row == 3) return 21;",
  "    if (row == 4) return 17;",
  "    if (row == 5) return 17;",
  "    if (row == 6) return 17;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 78) {",
  "    if (row == 0) return 17;",
  "    if (row == 1) return 25;",
  "    if (row == 2) return 21;",
  "    if (row == 3) return 19;",
  "    if (row == 4) return 17;",
  "    if (row == 5) return 17;",
  "    if (row == 6) return 17;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 79) {",
  "    if (row == 0) return 14;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 17;",
  "    if (row == 3) return 17;",
  "    if (row == 4) return 17;",
  "    if (row == 5) return 17;",
  "    if (row == 6) return 14;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 80) {",
  "    if (row == 0) return 30;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 17;",
  "    if (row == 3) return 30;",
  "    if (row == 4) return 16;",
  "    if (row == 5) return 16;",
  "    if (row == 6) return 16;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 82) {",
  "    if (row == 0) return 30;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 17;",
  "    if (row == 3) return 30;",
  "    if (row == 4) return 20;",
  "    if (row == 5) return 18;",
  "    if (row == 6) return 17;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 83) {",
  "    if (row == 0) return 15;",
  "    if (row == 1) return 16;",
  "    if (row == 2) return 16;",
  "    if (row == 3) return 14;",
  "    if (row == 4) return 1;",
  "    if (row == 5) return 1;",
  "    if (row == 6) return 30;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 84) {",
  "    if (row == 0) return 31;",
  "    if (row == 1) return 4;",
  "    if (row == 2) return 4;",
  "    if (row == 3) return 4;",
  "    if (row == 4) return 4;",
  "    if (row == 5) return 4;",
  "    if (row == 6) return 4;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 87) {",
  "    if (row == 0) return 17;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 17;",
  "    if (row == 3) return 21;",
  "    if (row == 4) return 21;",
  "    if (row == 5) return 21;",
  "    if (row == 6) return 10;",
  "    return 0;",
  "  }",
  "",
  "  if (ch == 89) {",
  "    if (row == 0) return 17;",
  "    if (row == 1) return 17;",
  "    if (row == 2) return 10;",
  "    if (row == 3) return 4;",
  "    if (row == 4) return 4;",
  "    if (row == 5) return 4;",
  "    if (row == 6) return 4;",
  "    return 0;",
  "  }",
  "",
  "  return 0;",
  "}",
  "",
  "void bitmap_ascii_put_char(int x, int y, int cols, int rows, int ch, int fgColor, int bgColor) {",
  "  int normalized = bitmap_ascii_normalize(ch);",
  "  int* fb = bitmap_framebuffer_base();",
  "  int row = 0;",
  "  while (row < 7) {",
  "    int bits = bitmap_ascii_row_bits(normalized, row);",
    "    int col = 0;",
  "    while (col < 5) {",
  "      int mask = 1 << (4 - col);",
  "      int px = x + col;",
  "      int py = y + row;",
  "      int color = bgColor;",
  "      if ((bits & mask) != 0) color = fgColor;",
  "      if (bitmap_point_in_bounds(px, py, cols, rows) != 0) {",
  "        fb[py * cols + px] = color;",
  "      }",
  "      col = col + 1;",
  "    }",
  "    row = row + 1;",
  "  }",
  "}",
  ""
].join("\n");
const MINI_C_NATIVE_LIBRARY_SOURCES = Object.freeze({
  stdio: "",
  bitmap_rect: MINI_C_NATIVE_LIB_BITMAP_RECT,
  bitmap_ascii: MINI_C_NATIVE_LIB_BITMAP_ASCII
});
const MINI_C_GLOBAL_LIBRARIES_ROOT = "./libs";
const MINI_C_GLOBAL_LIBRARIES_MANIFEST_PATH = `${MINI_C_GLOBAL_LIBRARIES_ROOT}/manifest.json`;
const MINI_C_LIBRARY_EXTENSION_PATTERN = /\.(h0|h|c0|c)$/i;
const MINI_C_GLOBAL_LIBRARY_FALLBACK_ENTRIES = Object.freeze(
  Object.keys(MINI_C_NATIVE_LIBRARY_SOURCES || {}).map((name) => {
    const normalized = String(name || "").trim().toLowerCase();
    return {
      name: normalized.replace(MINI_C_LIBRARY_EXTENSION_PATTERN, ""),
      path: `${normalized}.c0`
    };
  })
);
const miniCGlobalLibrarySources = new Map();
let miniCGlobalLibraryEntries = MINI_C_GLOBAL_LIBRARY_FALLBACK_ENTRIES.map((entry) => ({ ...entry }));
let miniCGlobalLibrariesReady = false;
let miniCGlobalLibrariesPromise = null;

let machineCurrentState = null;
let machineCurrentSignature = "";
let machineBackstepHistory = [];
let lastMachineCaptureAt = 0;
let lastMachineFullCaptureAt = 0;
let machineCurrentProgramMarker = "";
let lastMachinePersistScheduleAt = 0;
let autosaveBackstepFallbackArmed = false;
let restoredBackstepFallbackActive = false;
let persistTimer = null;
let lastSuccessfulAssemblyContext = null;
let lastSuccessfulAssemblySelection = {
  fileId: "",
  sourceName: ""
};
let lastTrackedFilesRef = store.getState().files;
let lastTrackedActiveId = store.getState().activeFileId;
let lastTrackedSource = store.getState().sourceCode;
let lastObservedProjectFileSignature = getProjectTreePathSignature(
  (Array.isArray(store.getState().files) ? store.getState().files : [])
    .map((file) => ({ path: String(file?.name || ""), updatedAt: 0 }))
);
let lastObservedProjectActivePath = String(store.getState().fileName || "");
const miniCCompilerState = {
  lastSourceName: "",
  lastGeneratedAsmName: "",
  lastGeneratedAsm: "",
  lastCompilerLog: "",
  lastCompiledAt: 0
};
let projectLibraryState = normalizeProjectLibraryData(bootstrapProjectLibrary);
let projectState = normalizeProjectData(bootstrapProject) || createDefaultProjectData({ settings: preferences });
let projectPersistTimer = null;
let projectPersistWantsEditorSync = true;
let lastProjectTreePathSignature = "";
let lastProjectTreeActivePath = "";
let lastProjectTreeLibrarySignature = "";
let lastProjectTreeGlobalLibrarySignature = "";
const projectTreeExpandedNodes = new Set();
const projectTreeKnownNodes = new Set();
let projectTreeSelectedNode = null;
const projectTreeCheckedNodes = new Map();
let projectTreeDragPayload = null;
let lastProjectTreeClickInfo = { key: "", at: 0 };
let lastProjectTreeActivationInfo = { key: "", at: 0 };

editor.setFilesChangeGuard?.((files, _activeFileId, context = {}) => {
  const reason = String(context?.reason || "").trim().toLowerCase();
  if (reason === "activate" || reason === "close" || reason === "closeall" || reason === "rename" || reason === "marksaved" || reason === "markprojectsaved") {
    return true;
  }
  if (!projectIsOpen()) return true;
  const usageBytes = computeEditorProjectOwnedUsageBytes(files);
  if (usageBytes <= ONLINE_SOURCE_MAX_BYTES) return true;
  postProjectQuotaExceededMessage(usageBytes);
  return false;
});

function projectIsOpen() {
  return projectState?.isOpen === true;
}

function updateProjectStoreState() {
  store.setState({ project: buildProjectStoreState(projectState) });
}

function updateCloudStoreState() {
  store.setState({ cloud: buildCloudStoreState() });
}

function getCloudUserDisplayName(user = cloudUser) {
  const username = String(user?.username || "").trim();
  const email = String(user?.email || "").trim();
  return username || email || "user";
}

function setCloudSessionState(nextState, user = null, errorMessage = "") {
  cloudAuthState = String(nextState || "unknown").trim().toLowerCase() || "unknown";
  cloudUser = user && typeof user === "object" ? { ...user } : null;
  cloudLastError = String(errorMessage || "");
  if (cloudAuthState !== "authenticated") {
    clearCloudProjectSyncDocuments();
    renderProjectTree(true);
  }
  updateCloudStoreState();
}

function setCloudSyncState(active, errorMessage = "", options = {}) {
  cloudSyncInFlight = active === true;
  cloudLastError = String(errorMessage || "");
  if (options.updateTimestamp === true) {
    cloudLastSyncAt = Date.now();
  }
  updateCloudStoreState();
}

async function cloudRequestJson(path, options = {}) {
  const method = String(options.method || "GET").trim().toUpperCase() || "GET";
  const rawPath = String(path || "").trim();
  const url = /^https?:\/\//i.test(rawPath) ? rawPath : `${cloudApiBase}${rawPath.startsWith("/") ? rawPath : `/${rawPath}`}`;
  const headers = {
    Accept: "application/json",
    ...(options.headers && typeof options.headers === "object" ? options.headers : {})
  };
  const hasBody = Object.prototype.hasOwnProperty.call(options, "body");
  if (hasBody && !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: "include",
      mode: /^https?:\/\//i.test(url) ? "cors" : "same-origin",
      signal: options.signal,
      body: hasBody
        ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body))
        : undefined
    });
  } catch (error) {
    throw new Error(`Could not reach cloud service at ${cloudApiBase}. ${describeCloudError(error, "")}`.trim());
  }

  const rawText = await response.text();
  let payload = null;
  try {
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(String(payload?.error || `HTTP ${response.status}`));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function refreshCloudSession(options = {}) {
  const silent = options.silent === true;
  const syncProjects = options.syncProjects === true;
  if (cloudSessionRefreshPromise) return cloudSessionRefreshPromise;
  cloudSessionRefreshPromise = (async () => {
    try {
      const payload = await cloudRequestJson("/me");
      if (payload?.authenticated === true && payload.user && typeof payload.user === "object") {
        setCloudSessionState("authenticated", payload.user, "");
        if (!silent) {
          postMarsMessage("Cloud session ready: {name}.", { name: getCloudUserDisplayName(payload.user) });
        }
        if (syncProjects) {
          void refreshCloudProjectSyncDocuments({
            render: true,
            postStatus: options.postSyncStatus !== false,
            reason: options.syncReason || "session"
          }).catch(() => {});
        }
      } else {
        setCloudSessionState("anonymous", null, "");
        if (!silent) {
          postMarsMessage("[info] Cloud session is not signed in.");
        }
      }
      return buildCloudStoreState();
    } catch (error) {
      const message = describeCloudError(error, "Cloud session check failed.");
      setCloudSessionState("error", null, message);
      if (!silent) {
        postMarsMessage("[warn] Cloud session check failed: {message}", { message });
      }
      return buildCloudStoreState();
    } finally {
      cloudSessionRefreshPromise = null;
    }
  })();
  return cloudSessionRefreshPromise;
}

function serializeProjectForCloud(project) {
  const normalized = normalizeProjectData(project);
  if (!normalized) return null;
  return {
    kind: CLOUD_PROJECT_DOCUMENT_KIND,
    version: CLOUD_PROJECT_DOCUMENT_VERSION,
    savedAt: new Date().toISOString(),
    project: normalized
  };
}

function deserializeProjectFromCloudDocument(documentPayload, fallbackRootPath = "project.p") {
  let payload = documentPayload;
  if (
    payload
    && typeof payload === "object"
    && String(payload.kind || "").trim() === CLOUD_PROJECT_DOCUMENT_KIND
    && payload.project
    && typeof payload.project === "object"
  ) {
    payload = payload.project;
  }
  if (!payload || typeof payload !== "object") return null;

  let files = Array.isArray(payload.files) ? payload.files : [];
  let activeFileId = String(payload.activeFileId || "");
  if (!files.length && payload.files && typeof payload.files === "object") {
    const fileEntries = Object.entries(payload.files);
    files = fileEntries.map(([path, source], index) => ({
      id: `cloud-file-${index + 1}`,
      path,
      source: String(source ?? ""),
      savedSource: String(source ?? ""),
      updatedAt: parseTimestampValue(payload.updatedAt, Date.now()) || Date.now()
    }));
    const activePath = typeof payload.activeFile === "string" ? normalizeProjectPath(payload.activeFile, "src/main.s") : "";
    const activeEntry = activePath
      ? files.find((entry) => normalizeProjectPath(entry.path, entry.path) === activePath)
      : files[0];
    activeFileId = String(activeEntry?.id || files[0]?.id || "");
  }

  const normalized = normalizeProjectData({
    ...payload,
    rootPath: normalizeProjectRootPath(payload.rootPath || fallbackRootPath, payload.name || fallbackRootPath),
    files,
    activeFileId
  });
  return normalized;
}

function chooseLatestRemoteProjectByName(projects = []) {
  const out = new Map();
  projects.forEach((project) => {
    const key = String(project?.name || "").trim();
    if (!key) return;
    const existing = out.get(key);
    if (!existing || parseTimestampValue(project.updatedAt, 0) >= parseTimestampValue(existing.updatedAt, 0)) {
      out.set(key, project);
    }
  });
  return out;
}

async function listCloudProjects() {
  const payload = await cloudRequestJson("/projects");
  return Array.isArray(payload?.projects) ? payload.projects.filter((entry) => entry && typeof entry === "object") : [];
}

async function loadCloudProject(projectId) {
  const payload = await cloudRequestJson(`/projects/${projectId}`);
  return payload?.project && typeof payload.project === "object" ? payload.project : null;
}

async function refreshCloudProjectSyncDocuments(options = {}) {
  if (cloudProjectSyncRefreshPromise) return cloudProjectSyncRefreshPromise;
  const reasonLabel = String(options.reason || "session").trim();
  const shouldPostStatus = options.postStatus === true;
  cloudProjectSyncRefreshPromise = (async () => {
    if (cloudAuthState !== "authenticated") {
      clearCloudProjectSyncDocuments();
      if (options.render !== false) renderProjectTree(true);
      return { ok: true, count: 0 };
    }

    const localProjects = Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [];
    if (!localProjects.length) {
      clearCloudProjectSyncDocuments();
      if (options.render !== false) renderProjectTree(true);
      return { ok: true, count: 0 };
    }

    if (shouldPostStatus) {
      postMarsMessage("[info] Cloud project sync started after {reason} at {url}.", {
        reason: translateText(reasonLabel),
        url: `${cloudApiBase}/projects`
      });
    }

    const remoteProjects = await listCloudProjects();
    const remoteByName = chooseLatestRemoteProjectByName(remoteProjects);
    clearCloudProjectSyncDocuments();

    for (let index = 0; index < localProjects.length; index += 1) {
      const localProject = normalizeProjectData(localProjects[index]);
      if (!localProject) continue;
      const remoteMeta = remoteByName.get(localProject.rootPath);
      if (!remoteMeta?.id) continue;
      try {
        const projectRecord = await loadCloudProject(remoteMeta.id);
        const normalizedRemote = deserializeProjectFromCloudDocument(projectRecord?.project, remoteMeta.name || localProject.rootPath);
        setCloudProjectSyncDocument(localProject.rootPath, normalizedRemote);
      } catch {
        setCloudProjectSyncDocument(localProject.rootPath, null);
      }
    }

    if (options.render !== false) renderProjectTree(true);
    if (shouldPostStatus) {
      postMarsMessage("Cloud project sync finished: {count} project(s) checked.", {
        count: cloudProjectSyncDocuments.size
      });
    }
    return { ok: true, count: cloudProjectSyncDocuments.size };
  })().catch((error) => {
    const message = describeCloudError(error, "Cloud project sync failed.");
    if (shouldPostStatus) {
      postMarsMessage("[warn] Cloud project sync failed: {message}", { message });
    }
    throw error;
  }).finally(() => {
    cloudProjectSyncRefreshPromise = null;
  });
  return cloudProjectSyncRefreshPromise;
}

function importCloudProjectRecord(projectRecord, options = {}) {
  const fallbackRootPath = String(projectRecord?.name || "project.p").trim() || "project.p";
  const normalized = deserializeProjectFromCloudDocument(projectRecord?.project, fallbackRootPath);
  if (!normalized) return null;

  const shouldOpen = options.open === true
    || (projectIsOpen() && isSameProjectRootPath(projectState.rootPath, normalized.rootPath));
  if (shouldOpen) {
    const opened = openProjectWorkspace(normalized, {
      applySettings: false,
      applyLayout: false
    });
    return opened ? normalized : null;
  }

  upsertProjectInLibrary(normalized, {
    makeActive: isSameProjectRootPath(projectLibraryState?.activeRootPath || "", normalized.rootPath)
  });
  if (!projectIsOpen() && isSameProjectRootPath(projectState?.rootPath || "", normalized.rootPath)) {
    projectState = normalized;
    updateProjectStoreState();
  }
  renderProjectTree(true);
  scheduleProjectPersist({ syncFromEditor: false });
  return normalized;
}

async function saveProjectToCloud(project, remoteProjectsByName = null) {
  const normalized = normalizeProjectData(project);
  if (!normalized) throw new Error("Active project is not valid.");
  const document = serializeProjectForCloud(normalized);
  if (!document) throw new Error("Failed to serialize project for cloud sync.");

  const projectName = normalized.rootPath;
  const existing = remoteProjectsByName instanceof Map ? remoteProjectsByName.get(projectName) : null;
  if (existing && Number.isFinite(Number(existing.id))) {
    const payload = await cloudRequestJson(`/projects/${existing.id}`, {
      method: "PUT",
      body: {
        name: projectName,
        project: document
      }
    });
    return {
      created: false,
      project: payload?.project || null
    };
  }

  const payload = await cloudRequestJson("/projects", {
    method: "POST",
    body: {
      name: projectName,
      project: document
    }
  });
  return {
    created: true,
    project: payload?.project || null
  };
}

async function chooseCloudProjectId(projects = []) {
  if (!projects.length) return null;
  const options = projects.map((project) => ({
    value: String(project.id),
    label: `${project.name} (${formatTimestampForDisplay(project.updatedAt)})`
  }));
  const result = await runDialogForm({
    title: translateText("Open Cloud Project"),
    message: translateText("Choose a remote project to load into the workspace."),
    confirmLabel: translateText("Open"),
    cancelLabel: translateText("Cancel"),
    width: "520px",
    height: "260px",
    sections: [
      {
        title: translateText("Projects"),
        fields: [
          {
            name: "projectId",
            label: translateText("Project"),
            type: "select",
            value: String(projects[0].id),
            options
          }
        ]
      }
    ]
  }, {
    windowIdPrefix: "window-dialog-system",
    left: "240px",
    top: "130px",
    width: "520px",
    height: "260px"
  });
  if (!result?.ok) return null;
  const parsed = Number.parseInt(String(result.value?.projectId || ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function openCloudLoginDialog() {
  const result = await runDialogForm({
    title: translateText("Cloud Login"),
    message: translateText("Sign in to the WebMARS cloud workspace service."),
    confirmLabel: translateText("Login"),
    cancelLabel: translateText("Cancel"),
    width: "460px",
    height: "300px",
    sections: [
      {
        title: translateText("Credentials"),
        layout: "table",
        fields: [
          {
            name: "username",
            label: translateText("Username"),
            type: "text",
            value: ""
          },
          {
            name: "password",
            label: translateText("Password"),
            type: "password",
            value: ""
          }
        ]
      }
    ],
    beforeResolve: async (values, dialog) => {
      const username = String(values?.username || "").trim();
      const password = String(values?.password || "");
      if (!username || !password) {
        dialog.setMessage(translateText("[warn] Username and password are required."), "error");
        dialog.setFinalResult({ ok: true, value: false });
        dialog.setCloseOnly(translateText("Close"));
        return { close: false };
      }

      const attemptUrl = `${cloudApiBase}/login`;
      postMarsMessage("[info] Cloud login started at {url}.", { url: attemptUrl });
      const stopAttemptStatus = startCloudAttemptStatus(dialog, "Attempting cloud login at {url}... {seconds}s elapsed.", attemptUrl);
      const attemptController = typeof AbortController === "function" ? new AbortController() : null;
      let attemptCancelled = false;
      dialog.setCancelHandler(() => {
        attemptCancelled = true;
        stopAttemptStatus();
        attemptController?.abort();
      });
      dialog.setBusy(true, { allowCancel: true });
      try {
        const payload = await cloudRequestJson("/login", {
          method: "POST",
          signal: attemptController?.signal,
          body: { username, password }
        });
        if (attemptCancelled || attemptController?.signal?.aborted) return { close: false };
        stopAttemptStatus();
        setCloudSessionState("authenticated", payload?.user || { username }, "");
        void refreshCloudProjectSyncDocuments({ render: true, postStatus: true, reason: "login" }).catch(() => {});
        postMarsMessage("Cloud login successful: {name}.", { name: getCloudUserDisplayName(payload?.user || { username }) });
        dialog.setMessage(translateText("Cloud login successful: {name}.", {
          name: getCloudUserDisplayName(payload?.user || { username })
        }), "success");
        dialog.setFinalResult({ ok: true, value: true });
      } catch (error) {
        if (attemptCancelled || attemptController?.signal?.aborted) return { close: false };
        stopAttemptStatus();
        const message = describeCloudError(error, "Cloud login failed.");
        setCloudSessionState("error", null, message);
        postMarsMessage("[error] Cloud login failed: {message}", { message });
        dialog.setMessage(translateText("[error] Cloud login failed: {message}", { message }), "error");
        dialog.setFinalResult({ ok: true, value: false });
      }
      dialog.setCancelHandler(null);
      dialog.setCloseOnly(translateText("Close"));
      return { close: false };
    }
  }, {
    windowIdPrefix: "window-dialog-system",
    left: "250px",
    top: "130px",
    width: "460px",
    height: "300px"
  });
  return result?.value === true;
}

async function openCloudRegisterDialog() {
  const result = await runDialogForm({
    title: translateText("Create Cloud User"),
    message: translateText("Create a new WebMARS cloud user and sign in immediately."),
    confirmLabel: translateText("Create User"),
    cancelLabel: translateText("Cancel"),
    width: "500px",
    height: "390px",
    sections: [
      {
        title: translateText("Account"),
        layout: "table",
        fields: [
          {
            name: "username",
            label: translateText("Username"),
            type: "text",
            value: ""
          },
          {
            name: "email",
            label: translateText("Email"),
            type: "text",
            value: ""
          },
          {
            name: "password",
            label: translateText("Password"),
            type: "password",
            value: ""
          },
          {
            name: "repeatPassword",
            label: translateText("Repeat Password"),
            type: "password",
            value: ""
          }
        ]
      }
    ],
    beforeResolve: async (values, dialog) => {
      const username = String(values?.username || "").trim();
      const email = String(values?.email || "").trim().toLowerCase();
      const password = String(values?.password || "");
      const repeatPassword = String(values?.repeatPassword || "");

      if (!username || !email || !password || !repeatPassword) {
        dialog.setMessage(translateText("[warn] Username, email, password and repeat password are required."), "error");
        dialog.setFinalResult({ ok: true, value: false });
        dialog.setCloseOnly(translateText("Close"));
        return { close: false };
      }
      if (password !== repeatPassword) {
        dialog.setMessage(translateText("[warn] Password and repeat password must match."), "error");
        dialog.setFinalResult({ ok: true, value: false });
        dialog.setCloseOnly(translateText("Close"));
        return { close: false };
      }

      const attemptUrl = `${cloudApiBase}/register`;
      postMarsMessage("[info] Cloud user registration started at {url}.", { url: attemptUrl });
      const stopAttemptStatus = startCloudAttemptStatus(dialog, "Attempting cloud user registration at {url}... {seconds}s elapsed.", attemptUrl);
      const attemptController = typeof AbortController === "function" ? new AbortController() : null;
      let attemptCancelled = false;
      dialog.setCancelHandler(() => {
        attemptCancelled = true;
        stopAttemptStatus();
        attemptController?.abort();
      });
      dialog.setBusy(true, { allowCancel: true });
      try {
        const payload = await cloudRequestJson("/register", {
          method: "POST",
          signal: attemptController?.signal,
          body: { username, email, password }
        });
        if (attemptCancelled || attemptController?.signal?.aborted) return { close: false };
        stopAttemptStatus();
        setCloudSessionState("authenticated", payload?.user || { username, email }, "");
        void refreshCloudProjectSyncDocuments({ render: true, postStatus: true, reason: "register" }).catch(() => {});
        postMarsMessage("Cloud user created: {name}.", {
          name: getCloudUserDisplayName(payload?.user || { username, email })
        });
        dialog.setMessage(translateText("Cloud user created: {name}.", {
          name: getCloudUserDisplayName(payload?.user || { username, email })
        }), "success");
        dialog.setFinalResult({ ok: true, value: true });
      } catch (error) {
        if (attemptCancelled || attemptController?.signal?.aborted) return { close: false };
        stopAttemptStatus();
        const status = Number(error?.status) || 0;
        const field = String(error?.payload?.field || "").trim().toLowerCase();
        let dialogMessage = "";
        if (status === 409) {
          if (field === "username") {
            dialogMessage = translateText("Username already exists. Please choose another username and try again.");
            postMarsMessage("[warn] Username already exists. Please choose another username and try again.");
          } else if (field === "email") {
            dialogMessage = translateText("Email already exists. Please choose another email and try again.");
            postMarsMessage("[warn] Email already exists. Please choose another email and try again.");
          } else {
            dialogMessage = translateText("Username or email already exists. Please review the form and try again.");
            postMarsMessage("[warn] Username or email already exists. Please review the form and try again.");
          }
        } else {
          const message = describeCloudError(error, "Cloud user creation failed.");
          setCloudSessionState("error", null, message);
          postMarsMessage("[error] Cloud user creation failed: {message}", { message });
          dialogMessage = translateText("[error] Cloud user creation failed: {message}", { message });
        }
        dialog.setMessage(dialogMessage, "error");
        dialog.setFinalResult({ ok: true, value: false });
      }
      dialog.setCancelHandler(null);
      dialog.setCloseOnly(translateText("Close"));
      return { close: false };
    }
  }, {
    windowIdPrefix: "window-dialog-system",
    left: "250px",
    top: "130px",
    width: "500px",
    height: "390px"
  });
  return result?.value === true;
}

async function openCloudServerPreferencesDialog() {
  const current = store.getState().preferences || preferences;
  const defaultApiBase = resolveDefaultCloudApiBase();
  const currentApiBase = normalizeCloudApiBase(current.cloudApiBase || "");
  const result = await runDialogForm({
    title: translateText("Cloud Server Preferences"),
    message: translateText("Configure the WebMARS cloud server URL."),
    confirmLabel: translateText("OK"),
    cancelLabel: translateText("Cancel"),
    width: "540px",
    height: "270px",
    sections: [
      {
        title: translateText("Server"),
        fields: [
          {
            name: "cloudApiBase",
            label: translateText("Cloud server URL"),
            type: "text",
            value: currentApiBase,
            placeholder: translateText("Leave blank to use the default cloud server.")
          }
        ]
      }
    ]
  }, {
    windowIdPrefix: "window-cloud-server-preferences",
    left: "210px",
    top: "130px",
    width: "540px",
    height: "270px"
  });
  if (!result?.ok) return;

  const rawValue = String(result.value?.cloudApiBase || "").trim();
  const normalized = normalizeCloudApiBase(rawValue);
  const isValid = !normalized || /^https?:\/\//i.test(normalized);
  if (!isValid) {
    postMarsMessage("[warn] Cloud server URL must be blank, or start with http:// or https://.");
    return;
  }

  updatePreferencesPatch({
    cloudApiBase: normalized
  }, translateText("Cloud server updated: {url}.", {
    url: normalized || translateText("default ({url})", { url: defaultApiBase })
  }));
}

async function ensureCloudAuthenticated(actionLabel = "using cloud features") {
  const state = await refreshCloudSession({ silent: true });
  if (state?.authenticated === true) return true;
  postMarsMessage("[info] Cloud login required before {action}.", { action: translateText(actionLabel) });
  return openCloudLoginDialog();
}

function syncOpenProjectBeforeCloudAction() {
  if (!projectIsOpen()) return null;
  syncProjectFromEditor(true);
  persistProjectNow({ syncFromEditor: true });
  return normalizeProjectData(projectState);
}

function saveActiveFileToBrowser(activeFile) {
  const target = activeFile && typeof activeFile === "object" ? activeFile : editor.getActiveFile();
  if (!target) return { ok: false, reason: "missing" };
  return saveOnlineSourceFile(target.name, target.source);
}

function persistOpenProjectLocally() {
  if (!projectIsOpen()) return { ok: true, skipped: true };
  syncProjectFromEditor(true);
  const ok = persistProjectNow({ syncFromEditor: true });
  return {
    ok,
    skipped: false
  };
}

async function saveActiveProjectToCloud(options = {}) {
  if (!ensureProjectOpenForAction("saving the active project")) return { ok: false, cancelled: true };
  if (!await ensureCloudAuthenticated("saving the active project")) return { ok: false, cancelled: true };

  setCloudSyncState(true, "");
  try {
    const localProject = normalizeProjectData(options.localProject) || syncOpenProjectBeforeCloudAction();
    const remoteProjects = await listCloudProjects();
    const remoteByName = chooseLatestRemoteProjectByName(remoteProjects);
    const result = await saveProjectToCloud(localProject, remoteByName);
    setCloudProjectSyncDocument(localProject.rootPath, localProject);
    setCloudSyncState(false, "", { updateTimestamp: true });
    renderProjectTree(true);
    if (options.silentSuccess !== true) {
      postMarsMessage("Cloud project saved: {name}.", { name: localProject.rootPath });
    }
    return {
      ok: true,
      created: result.created === true,
      name: localProject.rootPath
    };
  } catch (error) {
    const message = describeCloudError(error, "Cloud save failed.");
    setCloudSyncState(false, message);
    postMarsMessage("[error] Cloud save failed: {message}", { message });
    return { ok: false, message };
  }
}

async function openProjectFromCloud() {
  if (!await ensureCloudAuthenticated("opening a cloud project")) return { ok: false, cancelled: true };
  try {
    if (runActive) stopRunLoop();
    const projects = await listCloudProjects();
    if (!projects.length) {
      postMarsMessage("[warn] No cloud projects available.");
      return { ok: false, empty: true };
    }
    const selectedId = await chooseCloudProjectId(projects);
    if (selectedId == null) return { ok: false, cancelled: true };
    syncOpenProjectBeforeCloudAction();
    const projectRecord = await loadCloudProject(selectedId);
    const imported = importCloudProjectRecord(projectRecord, { open: true });
    if (!imported) throw new Error("Cloud project payload is invalid.");
    setCloudProjectSyncDocument(imported.rootPath, imported);
    setCloudSyncState(false, "", { updateTimestamp: true });
    renderProjectTree(true);
    postMarsMessage("Cloud project opened: {name}.", { name: imported.rootPath });
    return { ok: true, name: imported.rootPath };
  } catch (error) {
    const message = describeCloudError(error, "Cloud project open failed.");
    setCloudSyncState(false, message);
    postMarsMessage("[error] Cloud project open failed: {message}", { message });
    return { ok: false, message };
  }
}

async function syncAllProjectsWithCloud() {
  if (!await ensureCloudAuthenticated("syncing all projects")) return { ok: false, cancelled: true };

  setCloudSyncState(true, "");
  try {
    if (runActive) stopRunLoop();
    syncOpenProjectBeforeCloudAction();
    const localProjects = Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [];
    const remoteProjects = await listCloudProjects();
    const remoteByName = chooseLatestRemoteProjectByName(remoteProjects);
    let uploaded = 0;
    let downloaded = 0;
    let skipped = 0;

    for (let index = 0; index < localProjects.length; index += 1) {
      const localProject = normalizeProjectData(localProjects[index]);
      if (!localProject) {
        skipped += 1;
        continue;
      }

      const remoteMeta = remoteByName.get(localProject.rootPath);
      if (!remoteMeta) {
        await saveProjectToCloud(localProject);
        uploaded += 1;
        continue;
      }

      const remoteUpdatedAt = parseTimestampValue(remoteMeta.updatedAt, 0);
      const localUpdatedAt = parseTimestampValue(localProject.updatedAt, 0);
      if (remoteUpdatedAt > localUpdatedAt + 1000) {
        const projectRecord = await loadCloudProject(remoteMeta.id);
        const imported = importCloudProjectRecord(projectRecord, { open: false });
        if (imported) downloaded += 1;
        else skipped += 1;
      } else {
        await saveProjectToCloud(localProject, remoteByName);
        uploaded += 1;
      }
      remoteByName.delete(localProject.rootPath);
    }

    for (const remoteMeta of remoteByName.values()) {
      const projectRecord = await loadCloudProject(remoteMeta.id);
      const imported = importCloudProjectRecord(projectRecord, { open: false });
      if (imported) downloaded += 1;
      else skipped += 1;
    }

    await refreshCloudProjectSyncDocuments({ render: true });
    setCloudSyncState(false, "", { updateTimestamp: true });
    postMarsMessage("Cloud sync complete: {uploaded} uploaded, {downloaded} downloaded, {skipped} skipped.", {
      uploaded,
      downloaded,
      skipped
    });
    return { ok: true, uploaded, downloaded, skipped };
  } catch (error) {
    const message = describeCloudError(error, "Cloud sync failed.");
    setCloudSyncState(false, message);
    postMarsMessage("[error] Cloud sync failed: {message}", { message });
    return { ok: false, message };
  }
}

function collectProjectFilesFromEditor() {
  const previousFiles = normalizeProjectFiles(projectState?.files);
  const previousById = new Map(previousFiles.map((entry) => [String(entry.id), entry]));
  const previousByPath = new Map(previousFiles.map((entry) => [String(entry.path), entry]));
  const now = Date.now();
  return normalizeProjectFiles(
    editor.getFiles()
      .filter((file) => file?.projectOwned !== false)
      .map((file) => {
      const normalizedPath = normalizeProjectPath(file.name, "untitled.s");
      const previous = previousById.get(String(file.id)) || previousByPath.get(normalizedPath);
      const source = String(file.source ?? "");
      const savedSource = String(file.savedSource ?? source);
      const changed = !previous
        || String(previous.source ?? "") !== source
        || String(previous.savedSource ?? source) !== savedSource;
      return {
        id: file.id,
        path: normalizedPath,
        source,
        savedSource,
        updatedAt: changed ? now : Number(previous?.updatedAt || now)
      };
      })
  );
}

function resolveProjectOwnedEditorActiveFile(projectFiles, activeEditorFile) {
  const normalizedFiles = Array.isArray(projectFiles) ? projectFiles : [];
  const activeId = String(activeEditorFile?.id || "");
  if (activeId) {
    const byId = normalizedFiles.find((file) => String(file.id || "") === activeId);
    if (byId) return byId;
  }
  const activeName = String(activeEditorFile?.sourceProjectPath || activeEditorFile?.name || "");
  if (activeName) {
    const normalizedName = normalizeProjectPath(activeName, "untitled.s");
    const byPath = normalizedFiles.find((file) => normalizeProjectPath(file.path, "untitled.s") === normalizedName);
    if (byPath) return byPath;
  }
  const currentActiveId = String(projectState?.activeFileId || "");
  if (currentActiveId) {
    const byCurrent = normalizedFiles.find((file) => String(file.id || "") === currentActiveId);
    if (byCurrent) return byCurrent;
  }
  return normalizedFiles[0] || null;
}

function getProjectTreePathSignature(files) {
  return (Array.isArray(files) ? files : [])
    .map((entry) => `${String(entry?.path || "")}|${Number(entry?.updatedAt || 0)}`)
    .join("\u0001");
}

function getProjectLibrarySignature(library) {
  const projects = Array.isArray(library?.projects) ? library.projects : [];
  return projects.map((project) => {
    const rootPath = String(project?.rootPath || "");
    const updatedAt = Number(project?.updatedAt || 0);
    const fileSignature = getProjectTreePathSignature(project?.files);
    const folderSignature = (Array.isArray(project?.folderPaths) ? project.folderPaths : [])
      .map((entry) => normalizeProjectFolderPath(entry, "folder"))
      .join("\u0001");
    return `${rootPath}|${updatedAt}|${folderSignature}|${fileSignature}`;
  }).join("\u0002");
}

function getProjectTreeTargets() {
  const targets = [];
  if (refs.project?.mainTree instanceof HTMLElement) {
    targets.push({
      tree: refs.project.mainTree,
      rootLabel: refs.project.mainRootLabel,
      statusSelected: refs.project.mainStatusSelected,
      statusSize: refs.project.mainStatusSize,
      statusUsage: refs.project.mainStatusUsage
    });
  }
  if (refs.project?.toolTree instanceof HTMLElement) {
    targets.push({
      tree: refs.project.toolTree,
      rootLabel: refs.project.toolRootLabel,
      statusSelected: refs.project.toolStatusSelected,
      statusSize: refs.project.toolStatusSize,
      statusUsage: refs.project.toolStatusUsage
    });
  }
  return targets;
}

function formatProjectTimestamp(value) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "";
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return "";
  }
}

function countSourceLines(sourceText) {
  const text = String(sourceText ?? "");
  return text.length === 0 ? 1 : text.split("\n").length;
}

function measureProjectSourceBytes(sourceText) {
  return measureStoredSourceBytes(String(sourceText ?? ""));
}

function computeProjectFileListUsageBytes(files = []) {
  return normalizeProjectFiles(files).reduce((total, file) => (
    total + measureProjectSourceBytes(String(file?.source ?? ""))
  ), 0);
}

function computeProjectUsageBytes(project) {
  return computeProjectFileListUsageBytes(project?.files);
}

function computeProjectLibraryUsageBytes(library = projectLibraryState) {
  const projects = Array.isArray(library?.projects) ? library.projects : [];
  return projects.reduce((total, project) => total + computeProjectUsageBytes(project), 0);
}

function buildProjectLibraryCandidate(project, options = {}) {
  const normalizedProject = normalizeProjectData(project);
  if (!normalizedProject) return null;
  const makeActive = options.makeActive !== false;
  const nextProjects = Array.isArray(projectLibraryState?.projects)
    ? projectLibraryState.projects.slice()
    : [];
  const rootKey = normalizeProjectRootKey(normalizedProject.rootPath);
  const existingIndex = nextProjects.findIndex((entry) => normalizeProjectRootKey(entry?.rootPath) === rootKey);
  if (existingIndex >= 0) nextProjects[existingIndex] = normalizedProject;
  else nextProjects.push(normalizedProject);
  return normalizeProjectLibraryData({
    version: projectLibraryState?.version || PROJECT_LIBRARY_SCHEMA_VERSION,
    activeRootPath: makeActive
      ? normalizedProject.rootPath
      : (projectLibraryState?.activeRootPath || normalizedProject.rootPath),
    projects: nextProjects
  });
}

function isProjectLibraryWithinQuota(library = projectLibraryState) {
  return computeProjectLibraryUsageBytes(library) <= ONLINE_SOURCE_MAX_BYTES;
}

function postProjectQuotaExceededMessage(usedBytes) {
  postMarsMessage("[warn] Browser storage limit exceeded: {used}/{limit}.", {
    used: formatStoredSourceUsage(usedBytes),
    limit: formatStoredSourceUsage(ONLINE_SOURCE_MAX_BYTES)
  });
}

function ensureProjectLibraryQuota(candidateLibrary, options = {}) {
  const usageBytes = computeProjectLibraryUsageBytes(candidateLibrary);
  const ok = usageBytes <= ONLINE_SOURCE_MAX_BYTES;
  if (!ok && options.silent !== true) {
    postProjectQuotaExceededMessage(usageBytes);
  }
  return {
    ok,
    usageBytes,
    maxBytes: ONLINE_SOURCE_MAX_BYTES
  };
}

function computeEditorProjectOwnedUsageBytes(files = []) {
  return (Array.isArray(files) ? files : [])
    .filter((file) => file && typeof file === "object" && file.projectOwned !== false)
    .reduce((total, file) => total + measureProjectSourceBytes(String(file?.source ?? "")), 0);
}

function clearCloudProjectSyncDocuments() {
  cloudProjectSyncDocuments.clear();
}

function setCloudProjectSyncDocument(rootPath, projectDocument = null) {
  const rootKey = normalizeProjectRootKey(rootPath);
  if (!rootKey) return;
  if (!projectDocument) {
    cloudProjectSyncDocuments.delete(rootKey);
    return;
  }
  const normalized = normalizeProjectData(projectDocument);
  if (!normalized) {
    cloudProjectSyncDocuments.delete(rootKey);
    return;
  }
  cloudProjectSyncDocuments.set(rootKey, normalized);
}

function getCloudProjectSyncDocument(rootPath) {
  const rootKey = normalizeProjectRootKey(rootPath);
  if (!rootKey) return null;
  return cloudProjectSyncDocuments.get(rootKey) || null;
}

function classifyCloudSyncTone(syncedCount, totalCount, hasRemoteOnly = false) {
  if (totalCount <= 0) return hasRemoteOnly ? "red" : "green";
  if (syncedCount <= 0) return "red";
  if (syncedCount >= totalCount && !hasRemoteOnly) return "green";
  return "orange";
}

function buildProjectCloudSyncSummary(localProject, remoteProject) {
  const localFiles = normalizeProjectFiles(localProject?.files);
  const remoteFiles = normalizeProjectFiles(remoteProject?.files);
  const localFolders = normalizeProjectFolderPaths(localProject?.folderPaths, localFiles);
  const remoteFolders = new Set(normalizeProjectFolderPaths(remoteProject?.folderPaths, remoteFiles));
  const localPaths = new Set(localFiles.map((file) => normalizeProjectPath(file.path, "untitled.s")));
  const remoteByPath = new Map(remoteFiles.map((file) => [
    normalizeProjectPath(file.path, "untitled.s"),
    String(file.source ?? "")
  ]));
  const remoteOnlyPaths = remoteFiles
    .map((file) => normalizeProjectPath(file.path, "untitled.s"))
    .filter((path) => !localPaths.has(path));
  const fileTones = new Map();
  let syncedFiles = 0;

  localFiles.forEach((file) => {
    const path = normalizeProjectPath(file.path, "untitled.s");
    const remoteSource = remoteByPath.get(path);
    const synced = typeof remoteSource === "string" && remoteSource === String(file.source ?? "");
    if (synced) syncedFiles += 1;
    fileTones.set(path, synced ? "green" : "red");
  });

  const folderTones = new Map();
  localFolders.forEach((folderPath) => {
    const localDescendants = localFiles.filter((file) => isPathInsideFolder(file.path, folderPath));
    const syncedDescendants = localDescendants.filter((file) => fileTones.get(normalizeProjectPath(file.path, "untitled.s")) === "green").length;
    const hasRemoteOnly = remoteOnlyPaths.some((path) => isPathInsideFolder(path, folderPath));
    if (!localDescendants.length) {
      folderTones.set(folderPath, remoteFolders.has(folderPath) && !hasRemoteOnly ? "green" : "red");
      return;
    }
    folderTones.set(folderPath, classifyCloudSyncTone(syncedDescendants, localDescendants.length, hasRemoteOnly));
  });

  const remoteOnlyFolders = Array.from(remoteFolders).filter((folderPath) => !localFolders.includes(folderPath));
  return {
    projectTone: classifyCloudSyncTone(syncedFiles, localFiles.length, remoteOnlyPaths.length > 0 || remoteOnlyFolders.length > 0),
    fileTones,
    folderTones
  };
}

function getProjectTreeCloudSyncSummary(rootPath = "") {
  const project = findProjectInLibrary(rootPath);
  if (!project) return {
    projectTone: "red",
    fileTones: new Map(),
    folderTones: new Map()
  };
  return buildProjectCloudSyncSummary(project, getCloudProjectSyncDocument(rootPath));
}

function summarizeFileMetrics(files = []) {
  const summary = {
    fileCount: 0,
    totalBytes: 0,
    totalLines: 0,
    latestUpdatedAt: 0
  };
  (Array.isArray(files) ? files : []).forEach((file) => {
    if (!file || typeof file !== "object") return;
    summary.fileCount += 1;
    summary.totalBytes += Number(file.bytes) || 0;
    summary.totalLines += Number(file.lineCount) || 0;
    const updatedAt = Number(file.updatedAt) || 0;
    if (updatedAt > summary.latestUpdatedAt) summary.latestUpdatedAt = updatedAt;
  });
  return summary;
}

function summarizeProjectTreeBranch(node) {
  const summary = {
    fileCount: 0,
    totalBytes: 0,
    totalLines: 0,
    latestUpdatedAt: 0
  };
  if (!node || typeof node !== "object") return summary;

  const filesSummary = summarizeFileMetrics(node.files);
  summary.fileCount += filesSummary.fileCount;
  summary.totalBytes += filesSummary.totalBytes;
  summary.totalLines += filesSummary.totalLines;
  summary.latestUpdatedAt = Math.max(summary.latestUpdatedAt, filesSummary.latestUpdatedAt);

  [...node.folders.values()].forEach((childNode) => {
    const childSummary = summarizeProjectTreeBranch(childNode);
    childNode.summary = childSummary;
    summary.fileCount += childSummary.fileCount;
    summary.totalBytes += childSummary.totalBytes;
    summary.totalLines += childSummary.totalLines;
    summary.latestUpdatedAt = Math.max(summary.latestUpdatedAt, childSummary.latestUpdatedAt);
  });

  node.summary = summary;
  return summary;
}

function formatProjectTreeMeta(options = {}) {
  const parts = [];
  const timestampLabel = formatProjectTimestamp(options.updatedAt);
  if (timestampLabel) parts.push(timestampLabel);
  if (options.includeSize === true && Number.isFinite(Number(options.bytes))) {
    parts.push(formatStoredSourceUsage(Number(options.bytes) || 0));
  }
  if (options.includeLines === true && Number.isFinite(Number(options.lineCount))) {
    parts.push(translateText("lines: {count}", { count: Math.max(0, Number(options.lineCount) || 0) }));
  }
  return parts.join(" | ");
}

function buildProjectTreeSelectionSummaryLabel(fileCount = 0) {
  return translateText("files: {count}", { count: Math.max(0, Number(fileCount) || 0) });
}

function findProjectInLibrary(rootPath) {
  const rootKey = normalizeProjectRootKey(rootPath);
  if (!rootKey) return null;
  const projects = Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [];
  return projects.find((entry) => normalizeProjectRootKey(entry?.rootPath) === rootKey) || null;
}

function upsertProjectInLibrary(project, options = {}) {
  const normalizedProject = normalizeProjectData(project);
  if (!normalizedProject) return null;
  const candidateLibrary = buildProjectLibraryCandidate(normalizedProject, options);
  if (!candidateLibrary) return null;
  if (!ensureProjectLibraryQuota(candidateLibrary, { silent: options.silentQuota === true }).ok) return null;
  projectLibraryState = candidateLibrary;
  saveProjectLibraryData(projectLibraryState);
  return normalizedProject;
}

function replaceProjectInLibrary(previousRootPath, nextProject, options = {}) {
  const normalizedProject = normalizeProjectData(nextProject);
  if (!normalizedProject) return null;
  const previousRootKey = normalizeProjectRootKey(previousRootPath);
  const nextRootKey = normalizeProjectRootKey(normalizedProject.rootPath);
  const sourceProjects = Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [];
  const projects = sourceProjects.filter((entry) => {
    const rootKey = normalizeProjectRootKey(entry?.rootPath);
    if (!rootKey) return false;
    if (previousRootKey && rootKey === previousRootKey) return false;
    if (nextRootKey && rootKey === nextRootKey) return false;
    return true;
  });
  projects.push(normalizedProject);
  const previousActiveKey = normalizeProjectRootKey(projectLibraryState?.activeRootPath || "");
  const makeActive = options.makeActive === true || (previousRootKey && previousActiveKey === previousRootKey);
  const candidateLibrary = normalizeProjectLibraryData({
    version: projectLibraryState?.version || PROJECT_LIBRARY_SCHEMA_VERSION,
    activeRootPath: makeActive ? normalizedProject.rootPath : (projectLibraryState?.activeRootPath || normalizedProject.rootPath),
    projects
  });
  if (!ensureProjectLibraryQuota(candidateLibrary, { silent: options.silentQuota === true }).ok) return null;
  projectLibraryState = candidateLibrary;
  saveProjectLibraryData(projectLibraryState);
  return normalizedProject;
}

function removeProjectFromLibrary(rootPath) {
  const rootKey = normalizeProjectRootKey(rootPath);
  if (!rootKey) return false;
  const sourceProjects = Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [];
  const projects = sourceProjects.filter((entry) => normalizeProjectRootKey(entry?.rootPath) !== rootKey);
  if (projects.length === sourceProjects.length) return false;
  const activeRootKey = normalizeProjectRootKey(projectLibraryState?.activeRootPath || "");
  const nextActiveRoot = (
    projects.length
      ? (activeRootKey === rootKey ? projects[0].rootPath : (projectLibraryState?.activeRootPath || projects[0].rootPath))
      : ""
  );
  projectLibraryState = normalizeProjectLibraryData({
    version: projectLibraryState?.version || PROJECT_LIBRARY_SCHEMA_VERSION,
    activeRootPath: nextActiveRoot,
    projects
  });
  saveProjectLibraryData(projectLibraryState);
  return true;
}

function persistProjectStorageFromLibrary(preferredRootPath = "") {
  const projects = Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [];
  if (!projects.length) {
    try {
      window.localStorage.removeItem(PROJECT_STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  }
  const preferredKey = normalizeProjectRootKey(preferredRootPath);
  const activeKey = normalizeProjectRootKey(projectLibraryState?.activeRootPath || "");
  const preferredProject = projects.find((entry) => normalizeProjectRootKey(entry?.rootPath) === preferredKey)
    || projects.find((entry) => normalizeProjectRootKey(entry?.rootPath) === activeKey)
    || projects[0];
  return saveProjectData(preferredProject);
}

function activateProjectInLibrary(rootPath) {
  const rootKey = normalizeProjectRootKey(rootPath);
  const projects = Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [];
  if (!rootKey || !projects.length) return;
  const project = projects.find((entry) => normalizeProjectRootKey(entry?.rootPath) === rootKey);
  if (!project) return;
  const projectNodeKey = getProjectTreeNodeKey("project", project.rootPath);
  projectTreeKnownNodes.add(projectNodeKey);
  projectTreeExpandedNodes.add(projectNodeKey);
  projectLibraryState = normalizeProjectLibraryData({
    ...projectLibraryState,
    activeRootPath: project.rootPath,
    projects
  });
  saveProjectLibraryData(projectLibraryState);
}

function createProjectTreeBranchNode() {
  return { folders: new Map(), files: [] };
}

function ensureProjectTreeBranchFolder(node, folderName) {
  if (!node.folders.has(folderName)) {
    node.folders.set(folderName, createProjectTreeBranchNode());
  }
  return node.folders.get(folderName);
}

function buildProjectTreeModel(project) {
  const root = createProjectTreeBranchNode();
  const files = normalizeProjectFiles(project?.files);
  const folderPaths = normalizeProjectFolderPaths(project?.folderPaths, files);

  folderPaths.forEach((folderPath) => {
    const parts = splitProjectPathSegments(folderPath);
    if (!parts.length) return;
    let node = root;
    parts.forEach((segment) => {
      node = ensureProjectTreeBranchFolder(node, segment);
    });
  });

  files.forEach((entry) => {
    const path = normalizeProjectPath(entry?.path, "untitled.s");
    const parts = splitProjectPathSegments(path);
    if (!parts.length) return;
    const fileUpdatedAt = Number(entry?.updatedAt || 0) || Date.now();
    const sourceText = String(entry?.source ?? "");
    const bytes = measureProjectSourceBytes(sourceText);
    const lineCount = countSourceLines(sourceText);
    let node = root;
    for (let index = 0; index < parts.length; index += 1) {
      const segment = parts[index];
      const isFile = index === parts.length - 1;
      if (isFile) {
        node.files.push({ name: segment, path, updatedAt: fileUpdatedAt, bytes, lineCount });
      } else {
        node = ensureProjectTreeBranchFolder(node, segment);
      }
    }
  });

  return root;
}

function getProjectTreeGlobalLibraryEntries() {
  const entries = Array.isArray(miniCGlobalLibraryEntries) && miniCGlobalLibraryEntries.length
    ? miniCGlobalLibraryEntries
    : MINI_C_GLOBAL_LIBRARY_FALLBACK_ENTRIES;
  const out = [];
  const seen = new Set();
  entries.forEach((entry) => {
    const normalizedPath = normalizeMiniCLibraryIdentifier(entry?.path || "");
    if (!normalizedPath) return;
    if (!MINI_C_LIBRARY_EXTENSION_PATTERN.test(normalizedPath)) return;
    if (seen.has(normalizedPath)) return;
    seen.add(normalizedPath);
    out.push({
      path: normalizedPath,
      name: normalizedPath.split("/").pop() || normalizedPath
    });
  });
  out.sort((a, b) => String(a.path || "").localeCompare(String(b.path || ""), undefined, { sensitivity: "base" }));
  return out;
}

function buildGlobalLibraryTreeModel() {
  const root = createProjectTreeBranchNode();
  getProjectTreeGlobalLibraryEntries().forEach((entry) => {
    const path = normalizeMiniCLibraryIdentifier(entry.path || "");
    const parts = splitProjectPathSegments(path);
    if (!parts.length) return;
    let node = root;
    for (let index = 0; index < parts.length; index += 1) {
      const segment = parts[index];
      const isFile = index === parts.length - 1;
      if (isFile) {
        const sourceText = resolveMiniCGlobalLibrarySource([path]) || "";
        node.files.push({
          name: segment,
          path,
          updatedAt: 0,
          bytes: measureProjectSourceBytes(sourceText),
          lineCount: countSourceLines(sourceText)
        });
      } else {
        node = ensureProjectTreeBranchFolder(node, segment);
      }
    }
  });
  return root;
}

function getProjectTreeGlobalLibrarySignature() {
  return getProjectTreeGlobalLibraryEntries()
    .map((entry) => entry.path)
    .join("\u0001");
}

function getProjectTreeNodeKey(type, projectRootPath = "", nodePath = "") {
  const nodeType = String(type || "").trim().toLowerCase();
  if (nodeType === "root") return "root:/";
  if (nodeType === "libs-root") return "libs-root:libs";
  if (nodeType === "project") {
    return `project:${normalizeProjectRootKey(projectRootPath)}`;
  }
  if (nodeType === "folder") {
    return `folder:${normalizeProjectRootKey(projectRootPath)}:${normalizeProjectFolderPath(nodePath, "folder").toLowerCase()}`;
  }
  if (nodeType === "file") {
    return `file:${normalizeProjectRootKey(projectRootPath)}:${normalizeProjectPath(nodePath, "untitled.s").toLowerCase()}`;
  }
  if (nodeType === "libs-folder") {
    return `libs-folder:${normalizeMiniCLibraryIdentifier(nodePath)}`;
  }
  if (nodeType === "libs-file") {
    return `libs-file:${normalizeMiniCLibraryIdentifier(nodePath)}`;
  }
  return `${nodeType}:${normalizeProjectRootKey(projectRootPath)}:${String(nodePath || "").trim().toLowerCase()}`;
}

function isProjectTreeNodeExpanded(nodeKey, defaultExpanded = true) {
  const key = String(nodeKey || "").trim();
  if (!key) return false;
  if (projectTreeExpandedNodes.has(key)) return true;
  if (!projectTreeKnownNodes.has(key)) {
    projectTreeKnownNodes.add(key);
    if (defaultExpanded) {
      projectTreeExpandedNodes.add(key);
      return true;
    }
  }
  return false;
}

function toggleProjectTreeNodeExpanded(nodeKey) {
  const key = String(nodeKey || "").trim();
  if (!key) return;
  projectTreeKnownNodes.add(key);
  if (projectTreeExpandedNodes.has(key)) projectTreeExpandedNodes.delete(key);
  else projectTreeExpandedNodes.add(key);
}

function setProjectTreeSelection(selection) {
  if (!selection || typeof selection !== "object") {
    projectTreeSelectedNode = null;
  } else {
    const type = String(selection.type || "").trim();
    const rootPath = String(selection.rootPath || "").trim();
    const path = String(selection.path || "").trim();
    projectTreeSelectedNode = {
      key: getProjectTreeNodeKey(type, rootPath, path),
      type,
      rootPath,
      path,
      readOnly: selection.readOnly === true
    };
  }
  updateProjectTreeActionButtons();
  updateProjectTreeStatusBars();
}

function getProjectTreeCheckedSelection() {
  return [...projectTreeCheckedNodes.values()];
}

function hasProjectTreeCheckedSelection() {
  return projectTreeCheckedNodes.size > 0;
}

function isProjectTreeNodeChecked(nodeKey) {
  return projectTreeCheckedNodes.has(String(nodeKey || "").trim());
}

function setProjectTreeNodeChecked(selection, checked) {
  if (!selection || typeof selection !== "object") return;
  const type = String(selection.type || "").trim();
  const rootPath = String(selection.rootPath || "").trim();
  const path = String(selection.path || "").trim();
  const readOnly = selection.readOnly === true;
  const key = getProjectTreeNodeKey(type, rootPath, path);
  if (!key) return;
  if (checked) {
    projectTreeCheckedNodes.set(key, {
      key,
      type,
      rootPath,
      path,
      readOnly
    });
  } else {
    projectTreeCheckedNodes.delete(key);
  }
  updateProjectTreeActionButtons();
  updateProjectTreeStatusBars();
}

function clearProjectTreeCheckedSelection() {
  if (!projectTreeCheckedNodes.size) return;
  projectTreeCheckedNodes.clear();
  updateProjectTreeActionButtons();
  updateProjectTreeStatusBars();
}

function getProjectTreeStatusSelection() {
  if (projectTreeCheckedNodes.size) return getProjectTreeCheckedSelection();
  return projectTreeSelectedNode ? [projectTreeSelectedNode] : [];
}

function collectProjectSelectionFiles(selection) {
  if (!selection || typeof selection !== "object") return [];
  const type = String(selection.type || "").trim();
  const rootPath = String(selection.rootPath || "").trim();
  const path = String(selection.path || "").trim();

  if (type === "file") {
    const project = findProjectInLibrary(rootPath);
    const entry = resolveProjectFileEntry(project, path);
    if (!entry || !entry.file) return [];
    const sourceText = String(entry.file.source ?? "");
    return [{
      key: `project-file:${normalizeProjectRootKey(rootPath)}:${normalizeProjectPath(path, "untitled.s")}`,
      bytes: measureProjectSourceBytes(sourceText),
      lineCount: countSourceLines(sourceText),
      updatedAt: Number(entry.file.updatedAt) || 0
    }];
  }

  if (type === "folder") {
    const project = findProjectInLibrary(rootPath);
    const files = normalizeProjectFiles(project?.files);
    const folderPath = normalizeProjectFolderPath(path, "folder");
    return files
      .filter((entry) => isPathInsideFolder(entry.path, folderPath))
      .map((entry) => {
        const sourceText = String(entry.source ?? "");
        return {
          key: `project-file:${normalizeProjectRootKey(rootPath)}:${normalizeProjectPath(entry.path, "untitled.s")}`,
          bytes: measureProjectSourceBytes(sourceText),
          lineCount: countSourceLines(sourceText),
          updatedAt: Number(entry.updatedAt) || 0
        };
      });
  }

  if (type === "project") {
    const project = findProjectInLibrary(rootPath);
    const files = normalizeProjectFiles(project?.files);
    return files.map((entry) => {
      const sourceText = String(entry.source ?? "");
      return {
        key: `project-file:${normalizeProjectRootKey(rootPath)}:${normalizeProjectPath(entry.path, "untitled.s")}`,
        bytes: measureProjectSourceBytes(sourceText),
        lineCount: countSourceLines(sourceText),
        updatedAt: Number(entry.updatedAt) || 0
      };
    });
  }

  if (type === "libs-file") {
    const sourceText = resolveMiniCGlobalLibrarySource([path]) || "";
    return [{
      key: `libs-file:${normalizeMiniCLibraryIdentifier(path)}`,
      bytes: 0,
      lineCount: countSourceLines(sourceText),
      updatedAt: 0
    }];
  }

  if (type === "libs-folder") {
    const folderPath = normalizeMiniCLibraryIdentifier(path);
    return getProjectTreeGlobalLibraryEntries()
      .filter((entry) => normalizeMiniCLibraryIdentifier(entry.path).startsWith(`${folderPath}/`))
      .map((entry) => {
        const sourceText = resolveMiniCGlobalLibrarySource([entry.path]) || "";
        return {
          key: `libs-file:${normalizeMiniCLibraryIdentifier(entry.path)}`,
          bytes: 0,
          lineCount: countSourceLines(sourceText),
          updatedAt: 0
        };
      });
  }

  if (type === "libs-root") {
    return getProjectTreeGlobalLibraryEntries().map((entry) => {
      const sourceText = resolveMiniCGlobalLibrarySource([entry.path]) || "";
      return {
        key: `libs-file:${normalizeMiniCLibraryIdentifier(entry.path)}`,
        bytes: 0,
        lineCount: countSourceLines(sourceText),
        updatedAt: 0
      };
    });
  }

  return [];
}

function buildProjectTreeStatusSummary() {
  const selectedFiles = new Map();
  getProjectTreeStatusSelection().forEach((selection) => {
    collectProjectSelectionFiles(selection).forEach((file) => {
      selectedFiles.set(file.key, file);
    });
  });

  let selectedBytes = 0;
  selectedFiles.forEach((file) => {
    selectedBytes += Number(file.bytes) || 0;
  });

  return {
    fileCount: selectedFiles.size,
    selectedBytes,
    usedBytes: computeProjectLibraryUsageBytes(projectLibraryState),
    limitBytes: ONLINE_SOURCE_MAX_BYTES
  };
}

function shouldSkipProjectTreeActivation(key) {
  const normalizedKey = String(key || "").trim();
  const now = Date.now();
  if (
    normalizedKey
    && normalizedKey === lastProjectTreeActivationInfo.key
    && (now - lastProjectTreeActivationInfo.at) <= 220
  ) {
    return true;
  }
  lastProjectTreeActivationInfo = {
    key: normalizedKey,
    at: now
  };
  return false;
}

function activateProjectTreeNode(info) {
  if (!info || typeof info !== "object") return;
  if (shouldSkipProjectTreeActivation(info.key)) return;
  if (info.type === "file" && info.rootPath && info.path) {
    void openProjectFileFromTree(info.rootPath, info.path);
    return;
  }
  if (info.type === "project" || info.type === "folder" || info.type === "libs-root" || info.type === "libs-folder") {
    toggleProjectTreeNodeExpanded(info.key);
    renderProjectTree(true);
    return;
  }
  if (info.type === "libs-file" && info.path) {
    void openGlobalLibraryFileFromTree(info.path);
  }
}

function updateProjectTreeStatusBars() {
  const summary = buildProjectTreeStatusSummary();
  getProjectTreeTargets().forEach((target) => {
    if (target.statusSelected instanceof HTMLElement) {
      target.statusSelected.textContent = buildProjectTreeSelectionSummaryLabel(summary.fileCount);
    }
    if (target.statusSize instanceof HTMLElement) {
      target.statusSize.textContent = translateText("size: {size}", {
        size: formatStoredSourceUsage(summary.selectedBytes)
      });
    }
    if (target.statusUsage instanceof HTMLElement) {
      target.statusUsage.textContent = translateText("used: {used} / {limit}", {
        used: formatStoredSourceUsage(summary.usedBytes),
        limit: formatStoredSourceUsage(summary.limitBytes)
      });
    }
  });
}

function updateProjectTreeActionButtons() {
  const buttons = [
    refs.project?.mainNewFolder,
    refs.project?.mainRename,
    refs.project?.mainDelete,
    refs.project?.toolNewFolder,
    refs.project?.toolRename,
    refs.project?.toolDelete
  ].filter((button) => button instanceof HTMLButtonElement);
  if (!buttons.length) return;

  const checkedSelection = getProjectTreeCheckedSelection();
  if (checkedSelection.length) {
    const canDeleteChecked = checkedSelection.some((selection) => (
      selection
      && selection.readOnly !== true
      && (selection.type === "project" || selection.type === "folder" || selection.type === "file")
    ));
    buttons.forEach((button) => {
      const action = String(button.dataset.projectAction || "");
      button.disabled = action !== "delete" || !canDeleteChecked;
    });
    return;
  }

  const selection = projectTreeSelectedNode;
  const hasSelection = Boolean(selection?.type);
  const selectionType = String(selection?.type || "");
  const isReadOnly = selection?.readOnly === true || selectionType.startsWith("libs-");
  const canCreateFolder = (
    (!hasSelection && projectIsOpen())
    || (selectionType === "root" && projectIsOpen())
    || (!isReadOnly && (selectionType === "project" || selectionType === "folder" || selectionType === "file"))
  );
  const canRename = !isReadOnly && (selectionType === "project" || selectionType === "folder" || selectionType === "file");
  const canDelete = !isReadOnly && (selectionType === "project" || selectionType === "folder" || selectionType === "file");

  buttons.forEach((button) => {
    const action = String(button.dataset.projectAction || "");
    if (action === "new-folder") {
      button.disabled = !canCreateFolder;
    } else if (action === "rename") {
      button.disabled = !canRename;
    } else if (action === "delete") {
      button.disabled = !canDelete;
    }
  });
}

function clearProjectTreeDropTargets() {
  const targets = getProjectTreeTargets();
  targets.forEach((entry) => {
    if (!(entry.tree instanceof HTMLElement)) return;
    entry.tree.querySelectorAll(".project-tree-project.drop-target, .project-tree-folder.drop-target")
      .forEach((node) => node.classList.remove("drop-target"));
  });
}

function renderProjectTreeRow(options = {}) {
  const type = String(options.type || "file").trim();
  const nodeKey = String(options.nodeKey || "").trim();
  const label = String(options.label || "");
  const meta = String(options.meta || "");
  const rootPath = String(options.rootPath || "");
  const path = String(options.path || "");
  const hasChildren = options.hasChildren === true;
  const expanded = options.expanded === true;
  const active = options.active === true;
  const selected = options.selected === true;
  const readOnly = options.readOnly === true;
  const draggable = options.draggable === true;
  const checkboxVisible = options.checkboxVisible !== false;
  const checkboxChecked = options.checkboxChecked === true;
  const checkboxDisabled = options.checkboxDisabled === true;
  const syncTone = String(options.syncTone || "").trim().toLowerCase();
  const title = String(options.title || label || path || rootPath || "");
  const toggle = hasChildren
    ? `<button class="project-tree-toggle" type="button" data-tree-toggle="1" data-tree-node-key="${escapeHtml(nodeKey)}" aria-label="${expanded ? escapeHtml(translateText("Collapse")) : escapeHtml(translateText("Expand"))}">${expanded ? "v" : ">"}</button>`
    : `<span class="project-tree-toggle spacer" aria-hidden="true">.</span>`;
  const checkbox = checkboxVisible
    ? `<label class="project-tree-check" title="${checkboxDisabled ? escapeHtml(translateText("Read-only")) : escapeHtml(translateText("Select"))}"><input type="checkbox" data-tree-checkbox="1" data-tree-node-key="${escapeHtml(nodeKey)}" data-tree-node-type="${escapeHtml(type)}"${rootPath ? ` data-project-root="${escapeHtml(rootPath)}"` : ""}${path ? ` data-project-path="${escapeHtml(path)}"` : ""}${readOnly ? " data-tree-readonly=\"true\"" : ""}${checkboxChecked ? " checked" : ""}${checkboxDisabled ? " disabled" : ""}></label>`
    : "<span class=\"project-tree-check\" aria-hidden=\"true\"></span>";
  const classes = [
    `project-tree-${type}`,
    active ? "active" : "",
    selected ? "selected" : "",
    readOnly ? "readonly" : ""
  ].filter(Boolean).join(" ");
  const attrs = [
    "type=\"button\"",
    `class="${classes}"`,
    `data-tree-node-key="${escapeHtml(nodeKey)}"`,
    `data-tree-node-type="${escapeHtml(type)}"`,
    rootPath ? `data-project-root="${escapeHtml(rootPath)}"` : "",
    path ? `data-project-path="${escapeHtml(path)}"` : "",
    readOnly ? "data-tree-readonly=\"true\"" : "",
    draggable ? "draggable=\"true\"" : "",
    `title="${escapeHtml(title)}"`
  ].filter(Boolean).join(" ");
  const syncMarker = syncTone
    ? `<span class="project-tree-sync project-tree-sync-${escapeHtml(syncTone)}" title="${escapeHtml(translateText(syncTone === "green" ? "Cloud sync: synced" : (syncTone === "orange" ? "Cloud sync: partial" : "Cloud sync: not synced")))}" aria-hidden="true"></span>`
    : "";
  return `<div class="project-tree-row">${toggle}${checkbox}<button ${attrs}><span class="project-tree-main">${syncMarker}<span class="project-tree-node-label">${escapeHtml(label)}</span></span>${meta ? `<span class="project-tree-meta">${escapeHtml(meta)}</span>` : ""}</button></div>`;
}

function renderProjectTreeBranch(node, context, parentPath = "") {
  const folders = [...node.folders.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));
  let html = "<ul class=\"project-tree-list\">";

  folders.forEach(([folderName, childNode]) => {
    const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    const nodeKey = getProjectTreeNodeKey("folder", context.rootPath, folderPath);
    const hasChildren = childNode.folders.size > 0 || childNode.files.length > 0;
    const expanded = isProjectTreeNodeExpanded(nodeKey, true);
    const selected = projectTreeSelectedNode?.key === nodeKey || isProjectTreeNodeChecked(nodeKey);
    const folderSummary = childNode.summary || summarizeProjectTreeBranch(childNode);
    html += "<li class=\"project-tree-item\">";
    html += renderProjectTreeRow({
      type: "folder",
      nodeKey,
      label: folderName,
      meta: formatProjectTreeMeta({
        updatedAt: folderSummary.latestUpdatedAt
      }),
      rootPath: context.rootPath,
      path: folderPath,
      hasChildren,
      expanded,
      selected,
      syncTone: context.syncSummary?.folderTones?.get(folderPath) || "red",
      checkboxChecked: isProjectTreeNodeChecked(nodeKey),
      title: folderPath
    });
    if (hasChildren && expanded) {
      html += renderProjectTreeBranch(childNode, context, folderPath);
    }
    html += "</li>";
  });

  files.forEach((file) => {
    const nodeKey = getProjectTreeNodeKey("file", context.rootPath, file.path);
    const isActive = context.projectKey === context.activeProjectKey && context.activePath === file.path;
    const selected = projectTreeSelectedNode?.key === nodeKey || isProjectTreeNodeChecked(nodeKey);
    const metaLabel = formatProjectTreeMeta({
      updatedAt: file.updatedAt,
      bytes: file.bytes,
      lineCount: file.lineCount,
      includeSize: true,
      includeLines: true
    });
    const titleTimestamp = formatProjectTimestamp(file.updatedAt);
    const title = titleTimestamp
      ? `${file.path} - ${translateText("Last write: {date}", { date: titleTimestamp })}`
      : file.path;
    html += "<li class=\"project-tree-item\">";
    html += renderProjectTreeRow({
      type: "file",
      nodeKey,
      label: file.name,
      meta: metaLabel,
      rootPath: context.rootPath,
      path: file.path,
      active: isActive,
      selected,
      syncTone: context.syncSummary?.fileTones?.get(file.path) || "red",
      draggable: true,
      checkboxChecked: isProjectTreeNodeChecked(nodeKey),
      title
    });
    html += "</li>";
  });

  html += "</ul>";
  return html;
}

function renderGlobalLibraryTreeBranch(node, parentPath = "") {
  const folders = [...node.folders.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const files = [...node.files].sort((a, b) => a.name.localeCompare(b.name));
  let html = "<ul class=\"project-tree-list\">";

  folders.forEach(([folderName, childNode]) => {
    const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
    const nodeKey = getProjectTreeNodeKey("libs-folder", "", folderPath);
    const hasChildren = childNode.folders.size > 0 || childNode.files.length > 0;
    const expanded = isProjectTreeNodeExpanded(nodeKey, true);
    const selected = projectTreeSelectedNode?.key === nodeKey;
    html += "<li class=\"project-tree-item\">";
    html += renderProjectTreeRow({
      type: "libs-folder",
      nodeKey,
      label: folderName,
      path: folderPath,
      hasChildren,
      expanded,
      selected,
      readOnly: true,
      checkboxDisabled: true,
      title: `libs/${folderPath}`
    });
    if (hasChildren && expanded) {
      html += renderGlobalLibraryTreeBranch(childNode, folderPath);
    }
    html += "</li>";
  });

  files.forEach((file) => {
    const nodeKey = getProjectTreeNodeKey("libs-file", "", file.path);
    const selected = projectTreeSelectedNode?.key === nodeKey;
    html += "<li class=\"project-tree-item\">";
    html += renderProjectTreeRow({
      type: "libs-file",
      nodeKey,
      label: file.name,
      meta: formatProjectTreeMeta({
        bytes: file.bytes,
        lineCount: file.lineCount,
        includeSize: true,
        includeLines: true
      }),
      path: file.path,
      selected,
      readOnly: true,
      checkboxDisabled: true,
      title: `libs/${file.path}`
    });
    html += "</li>";
  });

  html += "</ul>";
  return html;
}

function renderProjectTree(force = false) {
  const targets = getProjectTreeTargets();
  if (!targets.length) return;

  const activeProjectKey = projectIsOpen()
    ? normalizeProjectRootKey(projectState.rootPath)
    : normalizeProjectRootKey(projectLibraryState?.activeRootPath || "");
  const activePath = projectIsOpen() ? String(editor.getActiveFile()?.name || "") : "";
  const librarySignature = getProjectLibrarySignature(projectLibraryState);
  const globalLibrarySignature = getProjectTreeGlobalLibrarySignature();
  if (
    !force
    && librarySignature === lastProjectTreeLibrarySignature
    && globalLibrarySignature === lastProjectTreeGlobalLibrarySignature
    && activePath === lastProjectTreeActivePath
    && activeProjectKey === lastProjectTreePathSignature
  ) {
    return;
  }

  const projects = Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [];
  const projectRows = projects
    .slice()
    .sort((a, b) => String(a.rootPath || "").localeCompare(String(b.rootPath || ""), undefined, { sensitivity: "base" }))
    .map((project) => {
      const rootPath = String(project.rootPath || "project.p");
      const projectKey = normalizeProjectRootKey(rootPath);
      const nodeKey = getProjectTreeNodeKey("project", rootPath);
      const isActiveProject = projectKey === activeProjectKey;
      const selected = projectTreeSelectedNode?.key === nodeKey || isProjectTreeNodeChecked(nodeKey);
      const model = buildProjectTreeModel(project);
      const projectSummary = summarizeProjectTreeBranch(model);
      const updatedLabel = formatProjectTreeMeta({
        updatedAt: Number(project.updatedAt) || projectSummary.latestUpdatedAt,
        bytes: projectSummary.totalBytes,
        includeSize: true
      });
      const hasChildren = model.folders.size > 0 || model.files.length > 0;
      const expanded = isProjectTreeNodeExpanded(nodeKey, isActiveProject);
      const syncSummary = getProjectTreeCloudSyncSummary(rootPath);
      let branchHtml = "";
      if (hasChildren && expanded) {
        branchHtml = renderProjectTreeBranch(model, {
          rootPath,
          projectKey,
          activeProjectKey,
          activePath,
          syncSummary
        });
      } else if (!hasChildren) {
        branchHtml = `<div class="project-tree-empty">${escapeHtml(translateText("No files in project."))}</div>`;
      }
      return `<li class="project-tree-item">${renderProjectTreeRow({
        type: "project",
        nodeKey,
        label: rootPath,
        meta: updatedLabel,
        rootPath,
        active: isActiveProject,
        selected,
        syncTone: syncSummary.projectTone,
        hasChildren,
        expanded,
        checkboxChecked: isProjectTreeNodeChecked(nodeKey),
        title: rootPath
      })}${branchHtml}</li>`;
    })
    .join("");

  const libsNodeKey = getProjectTreeNodeKey("libs-root", "", "libs");
  const libsModel = buildGlobalLibraryTreeModel();
  const libsHasChildren = libsModel.folders.size > 0 || libsModel.files.length > 0;
  summarizeProjectTreeBranch(libsModel);
  const libsExpanded = isProjectTreeNodeExpanded(libsNodeKey, false);
  const libsSelected = projectTreeSelectedNode?.key === libsNodeKey;
  const libsBranchHtml = libsHasChildren && libsExpanded
    ? renderGlobalLibraryTreeBranch(libsModel)
    : (!libsHasChildren
      ? `<div class="project-tree-empty">${escapeHtml(translateText("No global libraries."))}</div>`
      : "");

  const rootNodeKey = getProjectTreeNodeKey("root", "", "/");
  const rootSelected = projectTreeSelectedNode?.key === rootNodeKey;
  const treeHtml = `<ul class="project-tree-list root"><li class="project-tree-item">${renderProjectTreeRow({
    type: "root",
    nodeKey: rootNodeKey,
    label: "/",
    selected: rootSelected,
    checkboxVisible: false,
    title: "/"
  })}<ul class="project-tree-list">${projectRows}<li class="project-tree-item">${renderProjectTreeRow({
    type: "libs-root",
    nodeKey: libsNodeKey,
    label: "libs/",
    hasChildren: libsHasChildren,
    expanded: libsExpanded,
    selected: libsSelected,
    readOnly: true,
    checkboxDisabled: true,
    path: "libs",
    title: "Global libraries (read-only)"
  })}${libsBranchHtml}</li></ul></li></ul>`;

  targets.forEach((target) => {
    if (!(target.tree instanceof HTMLElement)) return;
    if (target.rootLabel instanceof HTMLElement) target.rootLabel.textContent = "/";
    target.tree.innerHTML = treeHtml;
  });
  updateProjectTreeActionButtons();
  updateProjectTreeStatusBars();
  lastProjectTreeGlobalLibrarySignature = globalLibrarySignature;
  lastProjectTreeLibrarySignature = librarySignature;
  lastProjectTreePathSignature = activeProjectKey;
  lastProjectTreeActivePath = activePath;
}

function persistProjectNow(options = {}) {
  if (suppressPersistenceForResetReload) return false;
  const syncFromEditor = options.syncFromEditor !== false;
  if (!projectState || typeof projectState !== "object") return false;
  let nextProjectState = normalizeProjectData(projectState) || projectState;

  if (projectIsOpen() && syncFromEditor) {
    const files = collectProjectFilesFromEditor();
    const active = resolveProjectOwnedEditorActiveFile(files, editor.getActiveFile());
    nextProjectState = normalizeProjectData({
      ...nextProjectState,
      files,
      activeFileId: String(active?.id || files[0]?.id || ""),
      settings: {
        ...(store.getState().preferences || preferences)
      }
    }) || nextProjectState;
    if (typeof windowManager.exportSavedLayoutState === "function") {
      const layoutSnapshot = normalizeWindowSessionData(windowManager.exportSavedLayoutState());
      if (layoutSnapshot && String(layoutSnapshot.layoutMode || "").toLowerCase() === "desktop") {
        nextProjectState.layout = layoutSnapshot;
      }
    }
    const candidateLibrary = buildProjectLibraryCandidate(nextProjectState, { makeActive: projectIsOpen() });
    if (candidateLibrary && !ensureProjectLibraryQuota(candidateLibrary).ok) {
      return false;
    }
    projectState.files = nextProjectState.files;
    projectState.activeFileId = nextProjectState.activeFileId;
    projectState.settings = {
      ...(store.getState().preferences || preferences)
    };
    if (nextProjectState.layout) projectState.layout = nextProjectState.layout;
  }

  const closedProjectExistsInLibrary = Boolean(findProjectInLibrary(projectState.rootPath));
  if (!projectIsOpen() && !closedProjectExistsInLibrary) {
    updateProjectStoreState();
    renderProjectTree();
    const savedActive = persistProjectStorageFromLibrary(projectLibraryState?.activeRootPath || "");
    const savedLibrary = saveProjectLibraryData(projectLibraryState);
    return savedActive && savedLibrary;
  }

  projectState.updatedAt = Date.now();
  projectState = normalizeProjectData(projectState) || projectState;
  const upserted = upsertProjectInLibrary(projectState, { makeActive: projectIsOpen() });
  if (!upserted) return false;
  if (projectIsOpen()) activateProjectInLibrary(projectState.rootPath);
  updateProjectStoreState();
  renderProjectTree();
  const savedActive = saveProjectData(projectState);
  const savedLibrary = saveProjectLibraryData(projectLibraryState);
  return savedActive && savedLibrary;
}

function scheduleProjectPersist(options = {}) {
  if (suppressPersistenceForResetReload) return;
  const syncFromEditor = options.syncFromEditor !== false;
  projectPersistWantsEditorSync = projectPersistWantsEditorSync || syncFromEditor;
  if (projectPersistTimer !== null) window.clearTimeout(projectPersistTimer);
  projectPersistTimer = window.setTimeout(() => {
    projectPersistTimer = null;
    const shouldSync = projectPersistWantsEditorSync;
    projectPersistWantsEditorSync = false;
    persistProjectNow({ syncFromEditor: shouldSync });
  }, 240);
}

function syncProjectFromEditor(forceRender = false) {
  if (!projectIsOpen()) {
    renderProjectTree(forceRender);
    return;
  }
  const files = collectProjectFilesFromEditor();
  const signature = getProjectTreePathSignature(files);
  const previousSignature = getProjectTreePathSignature(projectState?.files);
  const activeEditorFile = editor.getActiveFile();
  const active = resolveProjectOwnedEditorActiveFile(files, activeEditorFile);
  const activePath = String(active?.path || activeEditorFile?.sourceProjectPath || activeEditorFile?.name || "");
  const activeRootKey = normalizeProjectRootKey(projectState?.rootPath || "");
  if (
    !forceRender
    && signature === previousSignature
    && activePath === lastProjectTreeActivePath
    && activeRootKey === lastProjectTreePathSignature
  ) {
    return;
  }
  projectState.files = files;
  projectState.activeFileId = String(active?.id || files[0]?.id || "");
  projectState.updatedAt = Date.now();
  upsertProjectInLibrary(projectState, { makeActive: true });
  renderProjectTree(true);
}

function extractVisibleToolIds(windowState) {
  if (!windowState || typeof windowState !== "object") return [];
  const windowsPayload = Array.isArray(windowState.windows) ? windowState.windows : [];
  return Array.from(new Set(
    windowsPayload
      .filter((entry) => entry && typeof entry === "object" && entry.hidden !== true)
      .map((entry) => String(entry.toolId || "").trim())
      .filter(Boolean)
  ));
}

function buildProjectStateSnapshot() {
  const files = collectProjectFilesFromEditor();
  if (!files.length) return null;
  const active = resolveProjectOwnedEditorActiveFile(files, editor.getActiveFile());
  return normalizeProjectStateSnapshot({
    files,
    activeFileId: String(active?.id || files[0].id),
    preferences: {
      ...(store.getState().preferences || preferences)
    },
    windowState: typeof windowManager.exportSessionWindowState === "function"
      ? windowManager.exportSessionWindowState()
      : null,
    layoutState: typeof windowManager.exportSavedLayoutState === "function"
      ? windowManager.exportSavedLayoutState()
      : null,
    mode: modeController.getMode?.() || "editor"
  });
}

function applyProjectStateSnapshot(snapshot) {
  const normalized = normalizeProjectStateSnapshot(snapshot);
  if (!normalized) return false;

  if (normalized.preferences && typeof normalized.preferences === "object") {
    applyPreferences({
      ...(store.getState().preferences || preferences),
      ...normalized.preferences
    });
  }

  const files = mapProjectFilesToEditorFiles(normalized.files);
  if (!files.length) return false;
  const activeFile = editor.setFiles(files, normalized.activeFileId || files[0].id);
  if (normalized.mode) modeController.setMode(normalized.mode);
  else modeController.syncForFileName?.(activeFile?.name || "");

  const stateToolIds = extractVisibleToolIds(normalized.windowState);
  const layoutToolIds = extractVisibleToolIds(normalized.layoutState);
  [...new Set([...stateToolIds, ...layoutToolIds])].forEach((toolId) => toolManager.open(toolId));

  if (normalized.layoutState && typeof windowManager.applySavedLayoutState === "function") {
    windowManager.applySavedLayoutState(normalized.layoutState, {
      skipLayoutRefresh: false,
      skipDesktopPersist: true
    });
  }
  if (normalized.windowState && typeof windowManager.applySessionWindowState === "function") {
    windowManager.applySessionWindowState(normalized.windowState, {
      skipLayoutRefresh: false,
      skipDesktopPersist: true
    });
  }

  if (projectIsOpen()) {
    projectState.files = normalizeProjectFiles(normalized.files);
    projectState.activeFileId = String(activeFile?.id || normalized.activeFileId || projectState.files[0]?.id || "");
  }

  syncProjectFromEditor(true);
  scheduleWorkspacePersist();
  scheduleProjectPersist({ syncFromEditor: true });
  return true;
}

function ensureProjectOpenForAction(actionLabel = "") {
  if (projectIsOpen()) return true;
  if (actionLabel) {
    postMarsMessage("[warn] No project open. Use New > Project before {action}.", {
      action: translateText(actionLabel)
    });
  } else {
    postMarsMessage("[warn] No project open.");
  }
  return false;
}

function resolveUniqueProjectName(baseName = "project") {
  const seed = normalizeProjectName(baseName || "project");
  const ignoredRootKey = "";
  const existingRoots = new Set(
    (Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [])
      .map((entry) => normalizeProjectRootKey(entry?.rootPath))
      .filter((rootKey) => rootKey && rootKey !== ignoredRootKey)
  );
  let candidate = seed;
  let suffix = 1;
  while (existingRoots.has(normalizeProjectRootKey(normalizeProjectRootPath(candidate, candidate)))) {
    candidate = `${seed}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function resolveUniqueProjectNameExcept(baseName = "project", ignoredRootPath = "") {
  const seed = normalizeProjectName(baseName || "project");
  const ignoredRootKey = normalizeProjectRootKey(ignoredRootPath);
  const existingRoots = new Set(
    (Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [])
      .map((entry) => normalizeProjectRootKey(entry?.rootPath))
      .filter((rootKey) => rootKey && rootKey !== ignoredRootKey)
  );
  let candidate = seed;
  let suffix = 1;
  while (existingRoots.has(normalizeProjectRootKey(normalizeProjectRootPath(candidate, candidate)))) {
    candidate = `${seed}_${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function createEmptyOpenProject(name = "project") {
  const uniqueName = resolveUniqueProjectName(name);
  const exportedLayout = typeof windowManager.exportSavedLayoutState === "function"
    ? normalizeWindowSessionData(windowManager.exportSavedLayoutState())
    : null;
  const desktopLayout = (
    exportedLayout && String(exportedLayout.layoutMode || "").toLowerCase() === "desktop"
  ) ? exportedLayout : null;
  const next = createDefaultProjectData({
    name: uniqueName,
    files: [],
    activeFileId: "",
    settings: {
      ...(store.getState().preferences || preferences)
    },
    layout: desktopLayout
  });
  next.files = [];
  next.activeFileId = "";
  return normalizeProjectData(next) || next;
}

function ensureProjectForIncomingFiles(nameHint = "project") {
  if (projectIsOpen()) return;
  projectState = createEmptyOpenProject(nameHint);
  projectState.isOpen = true;
  projectState.updatedAt = Date.now();
  upsertProjectInLibrary(projectState, { makeActive: true });
  activateProjectInLibrary(projectState.rootPath);
  updateProjectStoreState();
  modeController.setMode("project");
  windowManager.focus("window-main");
  renderProjectTree(true);
  scheduleProjectPersist({ syncFromEditor: false });
}

function openProjectWorkspace(nextProject, options = {}) {
  const normalized = normalizeProjectData(nextProject);
  if (!normalized) return false;
  normalized.isOpen = true;
  projectState = normalized;
  activateProjectInLibrary(projectState.rootPath);
  upsertProjectInLibrary(projectState, { makeActive: true });
  updateProjectStoreState();

  if (options.applySettings === true && projectState.settings && typeof projectState.settings === "object") {
    applyPreferences({
      ...(store.getState().preferences || preferences),
      ...projectState.settings
    });
  }

  const editorFiles = mapProjectFilesToEditorFiles(projectState.files, editor.getFiles());
  const loadedFile = editorFiles.length
    ? editor.setFiles(editorFiles, projectState.activeFileId || editorFiles[0].id)
    : editor.setFiles([{
      id: "project-file-c0",
      name: "src/main.c",
      source: MINI_C_DEFAULT_TEMPLATE,
      savedSource: MINI_C_DEFAULT_TEMPLATE
    }], "project-file-c0");

  modeController.syncForFileName?.(loadedFile?.name || "", { activate: true });

  if (options.applyLayout === true && projectState.layout && typeof windowManager.applySavedLayoutState === "function") {
    const toolIdsToRestore = extractVisibleToolIds(projectState.layout);
    toolIdsToRestore.forEach((toolId) => toolManager.open(toolId));
    windowManager.applySavedLayoutState(projectState.layout, {
      skipLayoutRefresh: false,
      skipDesktopPersist: true
    });
  }

  syncProjectFromEditor(true);
  scheduleWorkspacePersist();
  scheduleProjectPersist({ syncFromEditor: true });
  return true;
}

async function closeProjectWorkspace() {
  if (!projectIsOpen()) return false;
  const dirtyFiles = editor.getDirtyFiles();
  const ok = await confirmCloseDirtyFiles(dirtyFiles, translateText("Close project?"));
  if (!ok) return false;

  projectState.isOpen = false;
  projectState.settings = {
    ...(store.getState().preferences || preferences)
  };
  projectState.updatedAt = Date.now();
  upsertProjectInLibrary(projectState, { makeActive: false });
  updateProjectStoreState();
  editor.setFiles([{
    id: "project-closed-scratch",
    name: "untitled.s",
    source: "",
    savedSource: ""
  }], "project-closed-scratch");
  modeController.setMode("project");
  renderProjectTree(true);
  scheduleWorkspacePersist();
  scheduleProjectPersist({ syncFromEditor: false });
  return true;
}

function resolveProjectFileEntry(project, filePath) {
  const normalizedPath = normalizeProjectPath(filePath, "untitled.s");
  const files = Array.isArray(project?.files) ? project.files : [];
  for (let index = 0; index < files.length; index += 1) {
    const entry = files[index];
    const entryPath = normalizeProjectPath(entry?.path || entry?.name, `src/file_${index + 1}.s`);
    if (entryPath !== normalizedPath) continue;
    return {
      path: entryPath,
      file: entry
    };
  }
  return null;
}

function classifyProjectFileContent(pathValue, sourceText) {
  const path = normalizeProjectPath(pathValue, "untitled.s");
  if (!isSupportedProjectFilePath(path)) {
    return { ok: false, reason: "unsupported", path };
  }
  const text = String(sourceText ?? "");
  if (text.includes("\u0000")) {
    return { ok: false, reason: "binary", path };
  }
  const replacementMatches = text.match(/\uFFFD/g);
  const replacementCount = replacementMatches ? replacementMatches.length : 0;
  if (replacementCount > 0) {
    const ratio = replacementCount / Math.max(1, text.length);
    if (ratio > 0.005 || replacementCount > 12) {
      return { ok: false, reason: "corrupted", path };
    }
  }
  return { ok: true, reason: "", path };
}

async function showUnsupportedProjectFileDialog(pathValue, reason) {
  const name = String(pathValue || "file");
  let title = "Unsupported file";
  let message = "This file cannot be opened in the editor.";
  if (reason === "binary") {
    title = "Binary file detected";
    message = "The selected file appears to be binary and cannot be opened as text.";
  } else if (reason === "corrupted") {
    title = "Corrupted text detected";
    message = "The selected file appears to be corrupted or encoded in an unsupported format.";
  } else if (reason === "unsupported") {
    title = "Unsupported file type";
    message = `Only ${Array.from(SUPPORTED_PROJECT_FILE_EXTENSIONS).sort().join(", ")} files can be opened.`;
  }
  await runDialogConfirm({
    title: translateText(title),
    message: `${translateText(message)}\n${translateText("File")}: ${name}`,
    confirmLabel: translateText("OK"),
    cancelLabel: translateText("Close")
  }, {
    windowIdPrefix: "window-project-file-open-warning",
    left: "220px",
    top: "140px",
    width: "520px",
    height: "240px"
  });
}

function buildReadOnlyTreeFileName(sourceKind, projectRootPath, filePath) {
  const normalizedPath = normalizeProjectPath(filePath, "untitled.s");
  if (String(sourceKind || "").trim() === "libs") {
    return `libs/${normalizedPath}`;
  }
  const rootPath = normalizeProjectRootPath(projectRootPath || "project.p");
  return `${rootPath} :: ${normalizedPath}`;
}

function buildReadOnlyTreeFileOriginKey(sourceKind, projectRootPath, filePath) {
  const normalizedKind = String(sourceKind || "project").trim().toLowerCase();
  const normalizedPath = normalizeProjectPath(filePath, "untitled.s");
  if (normalizedKind === "libs") {
    return `libs:${normalizeMiniCLibraryIdentifier(normalizedPath)}`;
  }
  return `project:${normalizeProjectRootKey(projectRootPath)}:${normalizedPath.toLowerCase()}`;
}

function findEditorFileByOriginKey(originKey) {
  const normalizedKey = String(originKey || "").trim();
  if (!normalizedKey) return null;
  return editor.getFiles().find((file) => String(file.originKey || "").trim() === normalizedKey) || null;
}

function openReadOnlyTreeFile(options = {}) {
  const sourceKind = String(options.sourceKind || "project").trim().toLowerCase();
  const projectRootPath = String(options.projectRootPath || "").trim();
  const normalizedPath = normalizeProjectPath(options.filePath, "untitled.s");
  const sourceText = String(options.sourceText ?? "");
  const originKey = buildReadOnlyTreeFileOriginKey(sourceKind, projectRootPath, normalizedPath);
  const existing = findEditorFileByOriginKey(originKey);
  if (existing) {
    const activated = editor.activateFile(String(existing.id || ""));
    return activated || existing;
  }
  return editor.openFile(
    buildReadOnlyTreeFileName(sourceKind, projectRootPath, normalizedPath),
    sourceText,
    true,
    {
      readOnly: true,
      projectOwned: false,
      originKey,
      sourceKind,
      sourceProjectRootPath: projectRootPath,
      sourceProjectPath: normalizedPath
    }
  );
}

async function openGlobalLibraryFileFromTree(filePath) {
  const normalizedPath = normalizeProjectPath(filePath, "library.c0");
  const sourceText = resolveMiniCGlobalLibrarySource([normalizedPath]);
  if (sourceText == null) {
    postMarsMessage("[warn] File '{name}' not found in global libraries.", { name: normalizedPath });
    return null;
  }
  const classification = classifyProjectFileContent(normalizedPath, sourceText);
  if (!classification.ok) {
    await showUnsupportedProjectFileDialog(normalizedPath, classification.reason);
    return null;
  }
  const opened = openReadOnlyTreeFile({
    sourceKind: "libs",
    filePath: normalizedPath,
    sourceText
  });
  modeController.syncForFileName?.(opened?.name || normalizedPath, { activate: true });
  modeController.setMode("editor");
  windowManager.focus("window-main");
  editor.focus();
  renderProjectTree(true);
  return opened;
}

async function openProjectFileFromTree(projectRootPath, filePath) {
  const rootPath = normalizeProjectRootPath(projectRootPath || "project.p");
  const normalizedPath = normalizeProjectPath(filePath, "untitled.s");
  const project = findProjectInLibrary(rootPath);
  if (!project) {
    postMarsMessage("[warn] Project '{name}' not found.", { name: rootPath });
    return;
  }
  const entry = resolveProjectFileEntry(project, normalizedPath);
  if (!entry || !entry.file) {
    postMarsMessage("[warn] File '{name}' not found in project.", { name: normalizedPath });
    return;
  }
  const sourceText = String(entry.file.source ?? "");
  const classification = classifyProjectFileContent(normalizedPath, sourceText);
  if (!classification.ok) {
    await showUnsupportedProjectFileDialog(normalizedPath, classification.reason);
    return;
  }

  const editableRootPath = normalizeProjectRootPath(
    projectIsOpen() ? projectState.rootPath : (projectLibraryState?.activeRootPath || project.rootPath),
    projectState?.name || project?.name || "project"
  );
  const editableProject = normalizeProjectRootKey(editableRootPath) === normalizeProjectRootKey(project.rootPath);
  const sameProject = projectIsOpen()
    && normalizeProjectRootKey(projectState.rootPath) === normalizeProjectRootKey(project.rootPath);
  if (!editableProject) {
    const opened = openReadOnlyTreeFile({
      sourceKind: "project",
      projectRootPath: project.rootPath,
      filePath: normalizedPath,
      sourceText
    });
    modeController.syncForFileName?.(opened?.name || normalizedPath, { activate: true });
    modeController.setMode("editor");
    windowManager.focus("window-main");
    editor.focus();
    renderProjectTree(true);
    return;
  }

  if (!sameProject) {
    const opened = openProjectWorkspace(project, {
      applySettings: true,
      applyLayout: true
    });
    if (!opened) {
      postMarsMessage("[error] Failed to open project '{name}'.", { name: project.rootPath });
      return;
    }
    postMarsMessage("Project loaded: {name}.", { name: project.rootPath });
  }

  let activated = editor.activateFileByName?.(normalizedPath);
  if (!activated) {
    activated = editor.openFile(normalizedPath, sourceText, true);
  }
  modeController.syncForFileName?.(activated?.name || normalizedPath, { activate: true });
  modeController.setMode("editor");
  windowManager.focus("window-main");
  editor.focus();
  renderProjectTree(true);
}

function isSameProjectRootPath(a, b) {
  return normalizeProjectRootKey(a) === normalizeProjectRootKey(b);
}

function resolveProjectTreeNodeFromElement(element) {
  if (!(element instanceof HTMLElement)) return null;
  const type = String(element.dataset.treeNodeType || "").trim();
  if (!type) return null;
  const rootPath = String(element.dataset.projectRoot || "").trim();
  const path = String(element.dataset.projectPath || "").trim();
  return {
    type,
    rootPath,
    path,
    key: getProjectTreeNodeKey(type, rootPath, path),
    readOnly: element.dataset.treeReadonly === "true" || type.startsWith("libs-")
  };
}

function resolveProjectActionRootPath() {
  const selected = projectTreeSelectedNode;
  if (selected && !selected.readOnly && (selected.type === "project" || selected.type === "folder" || selected.type === "file")) {
    return normalizeProjectRootPath(selected.rootPath || projectState?.rootPath || "project.p");
  }
  if (projectIsOpen()) return normalizeProjectRootPath(projectState.rootPath, projectState.name || "project");
  const activeRoot = String(projectLibraryState?.activeRootPath || "").trim();
  return activeRoot ? normalizeProjectRootPath(activeRoot, "project") : "";
}

function applyProjectMutation(projectRootPath, mutate, options = {}) {
  const rootPath = normalizeProjectRootPath(projectRootPath || "project.p");
  const sourceProject = findProjectInLibrary(rootPath);
  if (!sourceProject) return null;
  const working = normalizeProjectData(sourceProject);
  if (!working) return null;
  const changed = mutate(working);
  if (!changed) return null;
  working.updatedAt = Date.now();
  const normalized = normalizeProjectData(working);
  if (!normalized) return null;

  const isOpenProject = projectIsOpen() && isSameProjectRootPath(projectState.rootPath, rootPath);
  if (isOpenProject) {
    projectState = normalized;
    const editorFiles = mapProjectFilesToEditorFiles(projectState.files, editor.getFiles());
    const preferredActivePath = String(options.preferredActivePath || editor.getActiveFile()?.name || "");
    const preferredByPath = editorFiles.find((file) => file.name === preferredActivePath);
    const preferredById = editorFiles.find((file) => String(file.id) === String(projectState.activeFileId || ""));
    const nextActiveId = String(preferredByPath?.id || preferredById?.id || editorFiles[0]?.id || "");
    const active = editor.setFiles(editorFiles, nextActiveId);
    projectState.activeFileId = String(active?.id || editorFiles[0]?.id || "");
    modeController.syncForFileName?.(active?.name || "", { activate: false });
    persistProjectNow({ syncFromEditor: false });
    return projectState;
  }

  upsertProjectInLibrary(normalized, {
    makeActive: isSameProjectRootPath(projectLibraryState?.activeRootPath || "", rootPath)
  });
  if (!projectIsOpen() && isSameProjectRootPath(projectState?.rootPath || "", rootPath)) {
    projectState = normalized;
    updateProjectStoreState();
  }
  if (isSameProjectRootPath(projectLibraryState?.activeRootPath || "", rootPath)) {
    saveProjectData(normalized);
  }
  saveProjectLibraryData(projectLibraryState);
  renderProjectTree(true);
  return normalized;
}

function isPathInsideFolder(pathValue, folderPath) {
  const normalizedPath = normalizeProjectPath(pathValue, "untitled.s");
  const normalizedFolder = normalizeProjectFolderPath(folderPath, "folder");
  return normalizedPath.startsWith(`${normalizedFolder}/`);
}

function resolveUniqueProjectFilePath(project, desiredPath, ignorePath = "") {
  const normalizedDesired = normalizeProjectPath(desiredPath, "untitled.s");
  const normalizedIgnore = ignorePath ? normalizeProjectPath(ignorePath, "untitled.s") : "";
  const existing = new Set(
    normalizeProjectFiles(project?.files)
      .map((entry) => normalizeProjectPath(entry.path, "untitled.s"))
      .filter((entry) => entry && entry !== normalizedIgnore)
  );
  if (!existing.has(normalizedDesired)) return normalizedDesired;

  const dot = normalizedDesired.lastIndexOf(".");
  const stem = dot > 0 ? normalizedDesired.slice(0, dot) : normalizedDesired;
  const ext = dot > 0 ? normalizedDesired.slice(dot) : "";
  let suffix = 1;
  let candidate = normalizedDesired;
  while (existing.has(candidate)) {
    candidate = `${stem}_${suffix}${ext}`;
    suffix += 1;
  }
  return candidate;
}

function normalizeProjectFileBasename(nameValue, fallbackFilePath = "untitled.s") {
  const raw = String(nameValue || "").trim().replace(/\\/g, "/");
  const rawBase = raw.split("/").filter(Boolean).pop() || "";
  const fallbackPath = normalizeProjectPath(fallbackFilePath, "untitled.s");
  const fallbackBase = projectPathBasename(fallbackPath) || "untitled.s";
  const fallbackExt = getPathExtension(fallbackBase);
  let candidate = rawBase || fallbackBase;
  if (!getPathExtension(candidate) && fallbackExt) {
    candidate = `${candidate}${fallbackExt}`;
  }
  return projectPathBasename(normalizeProjectPath(candidate, fallbackBase));
}

function buildProjectFileCopyId(existingFiles = []) {
  const existingIds = new Set(
    (Array.isArray(existingFiles) ? existingFiles : [])
      .map((entry) => String(entry?.id || "").trim())
      .filter(Boolean)
  );
  let id = "";
  do {
    id = `project-file-copy-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  } while (existingIds.has(id));
  return id;
}

async function resolveCopyTargetPathWithPrompt(destinationProject, destinationFolderPath, sourceFilePath) {
  const destinationFolder = String(destinationFolderPath || "").trim()
    ? normalizeProjectFolderPath(destinationFolderPath, "folder")
    : "";
  const sourceBase = projectPathBasename(normalizeProjectPath(sourceFilePath, "untitled.s"));
  const existing = new Set(
    normalizeProjectFiles(destinationProject?.files)
      .map((entry) => normalizeProjectPath(entry.path, "untitled.s"))
  );
  const makeTargetPath = (baseName) => (
    destinationFolder
      ? normalizeProjectPath(`${destinationFolder}/${baseName}`, sourceBase)
      : normalizeProjectPath(baseName, sourceBase)
  );

  let targetPath = makeTargetPath(sourceBase);
  if (!existing.has(targetPath)) return targetPath;

  const dot = sourceBase.lastIndexOf(".");
  const stem = dot > 0 ? sourceBase.slice(0, dot) : sourceBase;
  const ext = dot > 0 ? sourceBase.slice(dot) : "";
  let suggestedBase = `${stem}_copy${ext}`;

  while (existing.has(targetPath)) {
    const candidate = await requestTextDialog(
      "Copy File",
      translateText("A file with this name already exists in destination folder. New file name"),
      suggestedBase,
      {
        confirmLabel: "Copy",
        cancelLabel: "Cancel"
      }
    );
    if (candidate == null) return null;
    const nextBase = normalizeProjectFileBasename(candidate, sourceBase);
    targetPath = makeTargetPath(nextBase);
    suggestedBase = nextBase;
    if (existing.has(targetPath)) {
      postMarsMessage("[warn] A file with that name already exists in destination folder.");
    }
  }

  return targetPath;
}

function moveProjectFileToFolder(projectRootPath, filePath, destinationFolderPath = "") {
  const rootPath = normalizeProjectRootPath(projectRootPath || "project.p");
  const normalizedFilePath = normalizeProjectPath(filePath, "untitled.s");
  const destinationFolder = String(destinationFolderPath || "").trim()
    ? normalizeProjectFolderPath(destinationFolderPath, "folder")
    : "";
  const basename = projectPathBasename(normalizedFilePath);
  const targetPathRaw = destinationFolder ? `${destinationFolder}/${basename}` : basename;

  let resolvedTargetPath = "";
  const updated = applyProjectMutation(rootPath, (project) => {
    const files = normalizeProjectFiles(project.files);
    const index = files.findIndex((entry) => normalizeProjectPath(entry.path, "untitled.s") === normalizedFilePath);
    if (index < 0) return false;
    const uniqueTarget = resolveUniqueProjectFilePath(project, targetPathRaw, normalizedFilePath);
    if (uniqueTarget === normalizedFilePath) return false;
    files[index] = {
      ...files[index],
      path: uniqueTarget,
      updatedAt: Date.now()
    };
    project.files = files;
    resolvedTargetPath = uniqueTarget;
    return true;
  }, {
    preferredActivePath: normalizedFilePath
  });

  if (!updated || !resolvedTargetPath) return null;
  setProjectTreeSelection({
    type: "file",
    rootPath,
    path: resolvedTargetPath,
    readOnly: false
  });
  renderProjectTree(true);
  return resolvedTargetPath;
}

async function copyProjectFileToProjectFolder(sourceProjectRootPath, sourceFilePath, destinationProjectRootPath, destinationFolderPath = "") {
  const sourceRootPath = normalizeProjectRootPath(sourceProjectRootPath || "project.p");
  const destinationRootPath = normalizeProjectRootPath(destinationProjectRootPath || "project.p");
  const normalizedSourcePath = normalizeProjectPath(sourceFilePath, "untitled.s");

  const sourceProject = findProjectInLibrary(sourceRootPath);
  if (!sourceProject) {
    postMarsMessage("[warn] Source project '{name}' not found.", { name: sourceRootPath });
    return null;
  }
  const sourceEntry = resolveProjectFileEntry(sourceProject, normalizedSourcePath);
  if (!sourceEntry || !sourceEntry.file) {
    postMarsMessage("[warn] File '{name}' not found in source project.", { name: normalizedSourcePath });
    return null;
  }

  const destinationProject = findProjectInLibrary(destinationRootPath);
  if (!destinationProject) {
    postMarsMessage("[warn] Destination project '{name}' not found.", { name: destinationRootPath });
    return null;
  }

  const targetPath = await resolveCopyTargetPathWithPrompt(
    destinationProject,
    destinationFolderPath,
    sourceEntry.path
  );
  if (!targetPath) return null;

  const copiedSource = String(sourceEntry.file.source ?? "");
  const copiedSavedSource = typeof sourceEntry.file.savedSource === "string"
    ? String(sourceEntry.file.savedSource)
    : copiedSource;
  const updated = applyProjectMutation(destinationRootPath, (project) => {
    const files = normalizeProjectFiles(project.files);
    if (files.some((entry) => normalizeProjectPath(entry.path, "untitled.s") === targetPath)) {
      return false;
    }
    const id = buildProjectFileCopyId(files);
    files.push({
      id,
      path: targetPath,
      source: copiedSource,
      savedSource: copiedSavedSource,
      updatedAt: Date.now()
    });
    project.files = files;
    return true;
  });

  if (!updated) {
    postMarsMessage("[warn] Failed to copy file to destination project.");
    return null;
  }

  setProjectTreeSelection({
    type: "file",
    rootPath: destinationRootPath,
    path: targetPath,
    readOnly: false
  });
  renderProjectTree(true);
  return targetPath;
}

async function handleProjectTreeCreateFolderAction() {
  const selected = projectTreeSelectedNode;
  const rootPath = resolveProjectActionRootPath();
  if (!rootPath) {
    postMarsMessage("[warn] No project selected.");
    return;
  }

  let baseFolder = "";
  if (selected && !selected.readOnly) {
    if (selected.type === "folder") {
      baseFolder = normalizeProjectFolderPath(selected.path, "folder");
    } else if (selected.type === "file") {
      baseFolder = projectPathDirname(normalizeProjectPath(selected.path, "untitled.s"));
    }
  }
  const suggested = baseFolder ? `${baseFolder}/new_folder` : "new_folder";
  const candidate = await requestTextDialog("New Folder", "Folder name", suggested, {
    confirmLabel: "Create",
    cancelLabel: "Cancel"
  });
  if (candidate == null) return;
  const trimmed = String(candidate || "").trim();
  if (!trimmed) return;

  const folderPath = normalizeProjectFolderPath(
    trimmed.includes("/")
      ? trimmed
      : (baseFolder ? `${baseFolder}/${trimmed}` : trimmed),
    "new_folder"
  );

  let reason = "";
  const updated = applyProjectMutation(rootPath, (project) => {
    const allFolders = new Set(normalizeProjectFolderPaths(project.folderPaths, project.files));
    if (allFolders.has(folderPath)) {
      reason = "exists";
      return false;
    }
    project.folderPaths = [
      ...(Array.isArray(project.folderPaths) ? project.folderPaths : []),
      folderPath
    ];
    return true;
  });
  if (!updated) {
    if (reason === "exists") {
      postMarsMessage("[warn] Folder already exists: {name}.", { name: folderPath });
    }
    return;
  }
  setProjectTreeSelection({
    type: "folder",
    rootPath,
    path: folderPath,
    readOnly: false
  });
  renderProjectTree(true);
  postMarsMessage("Folder created: {name}.", { name: folderPath });
}

async function handleProjectTreeRenameAction() {
  const selected = projectTreeSelectedNode;
  if (!selected || selected.readOnly || (selected.type !== "project" && selected.type !== "file" && selected.type !== "folder")) {
    return;
  }
  const rootPath = normalizeProjectRootPath(selected.rootPath || "project.p");
  if (selected.type === "project") {
    const project = findProjectInLibrary(rootPath);
    if (!project) {
      postMarsMessage("[warn] Project '{name}' not found.", { name: rootPath });
      return;
    }
    const defaultName = normalizeProjectName(project.name || String(project.rootPath || "").replace(/\.p$/i, "") || "project");
    const candidate = await requestTextDialog("Rename Project", "Project name", defaultName, {
      confirmLabel: "Rename",
      cancelLabel: "Cancel"
    });
    if (candidate == null) return;
    const requestedName = normalizeProjectName(candidate);
    if (!requestedName) return;
    const uniqueName = resolveUniqueProjectNameExcept(requestedName, rootPath);
    const nextRootPath = normalizeProjectRootPath(uniqueName, uniqueName);
    if (nextRootPath === rootPath && uniqueName === defaultName) return;

    const nextProject = normalizeProjectData({
      ...project,
      name: uniqueName,
      rootPath: nextRootPath,
      updatedAt: Date.now()
    });
    if (!nextProject) return;

    replaceProjectInLibrary(rootPath, nextProject, {
      makeActive: isSameProjectRootPath(projectLibraryState?.activeRootPath || "", rootPath)
    });

    const renamedOpenProject = projectIsOpen() && isSameProjectRootPath(projectState?.rootPath || "", rootPath);
    if (renamedOpenProject) {
      projectState = normalizeProjectData({
        ...projectState,
        name: uniqueName,
        rootPath: nextRootPath,
        updatedAt: Date.now()
      }) || projectState;
      updateProjectStoreState();
      saveProjectData(projectState);
    } else {
      persistProjectStorageFromLibrary(nextRootPath);
    }

    setProjectTreeSelection({
      type: "project",
      rootPath: nextRootPath,
      path: "",
      readOnly: false
    });
    renderProjectTree(true);
    if (uniqueName !== requestedName) {
      postMarsMessage("[warn] Project name already exists. Renamed to '{name}' instead.", { name: nextRootPath });
    } else {
      postMarsMessage("Project renamed: {from} -> {to}.", { from: rootPath, to: nextRootPath });
    }
    return;
  }

  if (selected.type === "file") {
    const oldPath = normalizeProjectPath(selected.path, "untitled.s");
    const parentPath = projectPathDirname(oldPath);
    const defaultName = projectPathBasename(oldPath);
    const candidate = await requestTextDialog("Rename File", "New file name", defaultName, {
      confirmLabel: "Rename",
      cancelLabel: "Cancel"
    });
    if (candidate == null) return;
    const trimmed = String(candidate || "").trim();
    if (!trimmed) return;
    const nextPath = normalizeProjectPath(
      trimmed.includes("/")
        ? trimmed
        : (parentPath ? `${parentPath}/${trimmed}` : trimmed),
      defaultName
    );
    if (nextPath === oldPath) return;

    let reason = "";
    const updated = applyProjectMutation(rootPath, (project) => {
      const files = normalizeProjectFiles(project.files);
      const index = files.findIndex((entry) => normalizeProjectPath(entry.path, "untitled.s") === oldPath);
      if (index < 0) {
        reason = "missing";
        return false;
      }
      const exists = files.some((entry, cursor) => (
        cursor !== index && normalizeProjectPath(entry.path, "untitled.s") === nextPath
      ));
      if (exists) {
        reason = "exists";
        return false;
      }
      files[index] = {
        ...files[index],
        path: nextPath,
        updatedAt: Date.now()
      };
      project.files = files;
      return true;
    }, {
      preferredActivePath: oldPath
    });
    if (!updated) {
      if (reason === "exists") postMarsMessage("[warn] A file with that name already exists.");
      return;
    }
    setProjectTreeSelection({
      type: "file",
      rootPath,
      path: nextPath,
      readOnly: false
    });
    renderProjectTree(true);
    postMarsMessage("Renamed file: {from} -> {to}.", { from: oldPath, to: nextPath });
    return;
  }

  const oldFolder = normalizeProjectFolderPath(selected.path, "folder");
  const oldBaseName = projectPathBasename(oldFolder);
  const parentFolder = projectPathDirname(oldFolder);
  const candidate = await requestTextDialog("Rename Folder", "New folder name", oldBaseName, {
    confirmLabel: "Rename",
    cancelLabel: "Cancel"
  });
  if (candidate == null) return;
  const trimmed = String(candidate || "").trim();
  if (!trimmed) return;
  const nextFolder = normalizeProjectFolderPath(
    trimmed.includes("/")
      ? trimmed
      : (parentFolder ? `${parentFolder}/${trimmed}` : trimmed),
    oldBaseName
  );
  if (nextFolder === oldFolder) return;
  if (nextFolder.startsWith(`${oldFolder}/`)) {
    postMarsMessage("[warn] Folder cannot be renamed into its own child.");
    return;
  }

  let reason = "";
  const updated = applyProjectMutation(rootPath, (project) => {
    const allFolders = normalizeProjectFolderPaths(project.folderPaths, project.files);
    if (allFolders.includes(nextFolder)) {
      reason = "exists";
      return false;
    }
    const files = normalizeProjectFiles(project.files).map((entry) => {
      const currentPath = normalizeProjectPath(entry.path, "untitled.s");
      if (!isPathInsideFolder(currentPath, oldFolder)) return entry;
      const suffix = currentPath.slice(oldFolder.length + 1);
      return {
        ...entry,
        path: normalizeProjectPath(`${nextFolder}/${suffix}`, projectPathBasename(currentPath)),
        updatedAt: Date.now()
      };
    });
    const folderPaths = (Array.isArray(project.folderPaths) ? project.folderPaths : [])
      .map((folderPath) => {
        const normalizedFolder = normalizeProjectFolderPath(folderPath, "folder");
        if (normalizedFolder === oldFolder) return nextFolder;
        if (!normalizedFolder.startsWith(`${oldFolder}/`)) return normalizedFolder;
        const suffix = normalizedFolder.slice(oldFolder.length + 1);
        return normalizeProjectFolderPath(`${nextFolder}/${suffix}`, suffix || "folder");
      });
    project.files = files;
    project.folderPaths = folderPaths;
    return true;
  });
  if (!updated) {
    if (reason === "exists") postMarsMessage("[warn] A folder with that name already exists.");
    return;
  }
  setProjectTreeSelection({
    type: "folder",
    rootPath,
    path: nextFolder,
    readOnly: false
  });
  renderProjectTree(true);
  postMarsMessage("Renamed folder: {from} -> {to}.", { from: oldFolder, to: nextFolder });
}

function buildProjectTreeBulkDeletePlan(selectedNodes = []) {
  const deduped = new Map();
  (Array.isArray(selectedNodes) ? selectedNodes : []).forEach((selection) => {
    if (!selection || typeof selection !== "object") return;
    if (selection.readOnly === true) return;
    const type = String(selection.type || "").trim();
    if (type !== "project" && type !== "folder" && type !== "file") return;
    const rootPath = normalizeProjectRootPath(selection.rootPath || "project.p");
    const path = type === "project"
      ? ""
      : (type === "folder"
        ? normalizeProjectFolderPath(selection.path, "folder")
        : normalizeProjectPath(selection.path, "untitled.s"));
    const key = getProjectTreeNodeKey(type, rootPath, path);
    deduped.set(key, {
      key,
      type,
      rootPath,
      path,
      readOnly: false
    });
  });

  const projects = [];
  const selectedProjectKeys = new Set();
  deduped.forEach((selection) => {
    if (selection.type !== "project") return;
    const rootKey = normalizeProjectRootKey(selection.rootPath);
    if (selectedProjectKeys.has(rootKey)) return;
    selectedProjectKeys.add(rootKey);
    projects.push(selection.rootPath);
  });

  const grouped = new Map();
  deduped.forEach((selection) => {
    if (selection.type === "project") return;
    const rootKey = normalizeProjectRootKey(selection.rootPath);
    if (selectedProjectKeys.has(rootKey)) return;
    if (!grouped.has(rootKey)) {
      grouped.set(rootKey, {
        rootPath: selection.rootPath,
        folders: [],
        files: []
      });
    }
    if (selection.type === "folder") grouped.get(rootKey).folders.push(selection.path);
    if (selection.type === "file") grouped.get(rootKey).files.push(selection.path);
  });

  grouped.forEach((group) => {
    const folderPaths = Array.from(new Set(group.folders))
      .sort((left, right) => left.length - right.length);
      group.folders = folderPaths.filter((folderPath, index) => (
        !folderPaths.slice(0, index).some((ancestorPath) => folderPath.startsWith(`${ancestorPath}/`))
      ));
    group.files = Array.from(new Set(group.files)).filter((filePath) => (
      !group.folders.some((folderPath) => isPathInsideFolder(filePath, folderPath))
    ));
  });

  const totalCount = projects.length + [...grouped.values()].reduce((total, group) => (
    total + group.folders.length + group.files.length
  ), 0);
  return {
    projects,
    grouped,
    totalCount
  };
}

function resetProjectStateAfterDeletingOpenProject() {
  const libraryProjects = Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [];
  const fallbackProject = libraryProjects.find((entry) => (
    normalizeProjectRootKey(entry?.rootPath) === normalizeProjectRootKey(projectLibraryState?.activeRootPath || "")
  )) || libraryProjects[0] || null;
  if (fallbackProject) {
    projectState = normalizeProjectData({
      ...fallbackProject,
      isOpen: false,
      settings: {
        ...(store.getState().preferences || preferences)
      },
      updatedAt: Date.now()
    }) || projectState;
  } else {
    projectState = normalizeProjectData({
      version: PROJECT_SCHEMA_VERSION,
      isOpen: false,
      name: "project",
      description: "",
      rootPath: normalizeProjectRootPath("project", "project"),
      folderPaths: [],
      files: [],
      activeFileId: "",
      settings: {
        ...(store.getState().preferences || preferences)
      },
      layout: null,
      states: Array.from({ length: PROJECT_STATE_SLOT_COUNT }, () => null),
      updatedAt: Date.now()
    }) || projectState;
  }
  updateProjectStoreState();
  editor.setFiles([{
    id: "project-closed-scratch",
    name: "untitled.s",
    source: "",
    savedSource: ""
  }], "project-closed-scratch");
  modeController.setMode("project");
  scheduleWorkspacePersist();
}

async function handleProjectTreeBulkDeleteAction(selectedNodes = []) {
  const plan = buildProjectTreeBulkDeletePlan(selectedNodes);
  if (plan.totalCount <= 0) return;

  const deletingOpenProject = plan.projects.some((rootPath) => (
    projectIsOpen() && isSameProjectRootPath(projectState?.rootPath || "", rootPath)
  ));
  const confirmMessage = translateText("Delete {count} selected item(s)?", { count: plan.totalCount });
  const ok = deletingOpenProject
    ? await confirmCloseDirtyFiles(editor.getDirtyFiles(), confirmMessage)
    : await requestConfirmDialog("Delete", confirmMessage, {
      confirmLabel: "Delete",
      cancelLabel: "Cancel"
    });
  if (!ok) return;

  let deletedCount = 0;
  let removedOpenProject = false;
  let hadLastFileWarning = false;

  plan.projects.forEach((rootPath) => {
    if (projectIsOpen() && isSameProjectRootPath(projectState?.rootPath || "", rootPath)) {
      removedOpenProject = true;
    }
    if (removeProjectFromLibrary(rootPath)) {
      deletedCount += 1;
    }
  });

  plan.grouped.forEach((group) => {
    let reason = "";
    const updated = applyProjectMutation(group.rootPath, (project) => {
      const files = normalizeProjectFiles(project.files);
      const previousFolderCount = Array.isArray(project.folderPaths) ? project.folderPaths.length : 0;
      const nextFiles = files.filter((entry) => {
        const normalizedPath = normalizeProjectPath(entry.path, "untitled.s");
        if (group.files.includes(normalizedPath)) return false;
        if (group.folders.some((folderPath) => isPathInsideFolder(normalizedPath, folderPath))) return false;
        return true;
      });
      const removedFileCount = files.length - nextFiles.length;
      if (removedFileCount > 0 && nextFiles.length <= 0) {
        reason = "last-file";
        return false;
      }
      const nextFolders = (Array.isArray(project.folderPaths) ? project.folderPaths : [])
        .filter((entry) => {
          const normalizedFolder = normalizeProjectFolderPath(entry, "folder");
          return !group.folders.some((folderPath) => (
            normalizedFolder === folderPath || normalizedFolder.startsWith(`${folderPath}/`)
          ));
        });
      const removedActive = files.some((entry) => (
        String(entry.id || "") === String(project.activeFileId || "")
        && (
          group.files.includes(normalizeProjectPath(entry.path, "untitled.s"))
          || group.folders.some((folderPath) => isPathInsideFolder(entry.path, folderPath))
        )
      ));
      if (removedActive) project.activeFileId = String(nextFiles[0]?.id || "");
      project.files = nextFiles;
      project.folderPaths = nextFolders;
      return removedFileCount > 0 || nextFolders.length !== previousFolderCount;
    }, {
      preferredActivePath: editor.getActiveFile()?.name || ""
    });
    if (!updated) {
      if (reason === "last-file") hadLastFileWarning = true;
      return;
    }
    deletedCount += group.files.length + group.folders.length;
  });

  if (removedOpenProject) {
    resetProjectStateAfterDeletingOpenProject();
  }

  persistProjectStorageFromLibrary(projectLibraryState?.activeRootPath || "");
  clearProjectTreeCheckedSelection();
  setProjectTreeSelection(null);
  renderProjectTree(true);
  if (hadLastFileWarning) {
    postMarsMessage("[warn] Keep at least one file in the project.");
  }
  postMarsMessage("Deleted {count} selected item(s).", { count: deletedCount });
}

async function handleProjectTreeDeleteAction() {
  const checkedSelection = getProjectTreeCheckedSelection();
  if (checkedSelection.length) {
    await handleProjectTreeBulkDeleteAction(checkedSelection);
    return;
  }
  const selected = projectTreeSelectedNode;
  if (!selected || selected.readOnly || (selected.type !== "project" && selected.type !== "file" && selected.type !== "folder")) {
    return;
  }
  const rootPath = normalizeProjectRootPath(selected.rootPath || "project.p");
  if (selected.type === "project") {
    const project = findProjectInLibrary(rootPath);
    if (!project) {
      postMarsMessage("[warn] Project '{name}' not found.", { name: rootPath });
      return;
    }
    const isOpenSelectedProject = projectIsOpen() && isSameProjectRootPath(projectState?.rootPath || "", rootPath);
    const confirmMessage = translateText("Delete project '{name}'?", { name: rootPath });
    const ok = isOpenSelectedProject
      ? await confirmCloseDirtyFiles(editor.getDirtyFiles(), confirmMessage)
      : await requestConfirmDialog("Delete Project", confirmMessage, {
        confirmLabel: "Delete",
        cancelLabel: "Cancel"
      });
    if (!ok) return;

    const removed = removeProjectFromLibrary(rootPath);
    if (!removed) return;

    if (isOpenSelectedProject) {
      const libraryProjects = Array.isArray(projectLibraryState?.projects) ? projectLibraryState.projects : [];
      const fallbackProject = libraryProjects.find((entry) => (
        normalizeProjectRootKey(entry?.rootPath) === normalizeProjectRootKey(projectLibraryState?.activeRootPath || "")
      )) || libraryProjects[0] || null;
      if (fallbackProject) {
        projectState = normalizeProjectData({
          ...fallbackProject,
          isOpen: false,
          settings: {
            ...(store.getState().preferences || preferences)
          },
          updatedAt: Date.now()
        }) || projectState;
      } else {
        projectState = normalizeProjectData({
          version: PROJECT_SCHEMA_VERSION,
          isOpen: false,
          name: "project",
          description: "",
          rootPath: normalizeProjectRootPath("project", "project"),
          folderPaths: [],
          files: [],
          activeFileId: "",
          settings: {
            ...(store.getState().preferences || preferences)
          },
          layout: null,
          states: Array.from({ length: PROJECT_STATE_SLOT_COUNT }, () => null),
          updatedAt: Date.now()
        }) || projectState;
      }
      updateProjectStoreState();
      editor.setFiles([{
        id: "project-closed-scratch",
        name: "untitled.s",
        source: "",
        savedSource: ""
      }], "project-closed-scratch");
      modeController.setMode("project");
      scheduleWorkspacePersist();
    }

    persistProjectStorageFromLibrary(projectLibraryState?.activeRootPath || "");
    setProjectTreeSelection(null);
    renderProjectTree(true);
    postMarsMessage("Project deleted: {name}.", { name: rootPath });
    return;
  }

  if (selected.type === "file") {
    const filePath = normalizeProjectPath(selected.path, "untitled.s");
    const confirm = await requestConfirmDialog("Delete File", translateText("Delete '{name}'?", { name: filePath }), {
      confirmLabel: "Delete",
      cancelLabel: "Cancel"
    });
    if (!confirm) return;

    let reason = "";
    const updated = applyProjectMutation(rootPath, (project) => {
      const files = normalizeProjectFiles(project.files);
      const index = files.findIndex((entry) => normalizeProjectPath(entry.path, "untitled.s") === filePath);
      if (index < 0) {
        reason = "missing";
        return false;
      }
      if (files.length <= 1) {
        reason = "last-file";
        return false;
      }
      const removed = files[index];
      const nextFiles = files.filter((_, cursor) => cursor !== index);
      if (String(project.activeFileId || "") === String(removed.id || "")) {
        project.activeFileId = String(nextFiles[0]?.id || "");
      }
      project.files = nextFiles;
      return true;
    }, {
      preferredActivePath: editor.getActiveFile()?.name || ""
    });
    if (!updated) {
      if (reason === "last-file") postMarsMessage("[warn] Keep at least one file in the project.");
      return;
    }
    setProjectTreeSelection(null);
    renderProjectTree(true);
    postMarsMessage("Deleted file: {name}.", { name: filePath });
    return;
  }

  const folderPath = normalizeProjectFolderPath(selected.path, "folder");
  const confirm = await requestConfirmDialog(
    "Delete Folder",
    translateText("Delete folder '{name}' and contained files?", { name: folderPath }),
    {
    confirmLabel: "Delete",
    cancelLabel: "Cancel"
    }
  );
  if (!confirm) return;

  let reason = "";
  const updated = applyProjectMutation(rootPath, (project) => {
    const files = normalizeProjectFiles(project.files);
    const filesToRemove = files.filter((entry) => isPathInsideFolder(entry.path, folderPath));
    const remainingCount = files.length - filesToRemove.length;
    if (filesToRemove.length > 0 && remainingCount <= 0) {
      reason = "last-file";
      return false;
    }
    const nextFiles = files.filter((entry) => !isPathInsideFolder(entry.path, folderPath));
    const nextFolders = (Array.isArray(project.folderPaths) ? project.folderPaths : [])
      .filter((entry) => {
        const normalizedFolder = normalizeProjectFolderPath(entry, "folder");
        return normalizedFolder !== folderPath && !normalizedFolder.startsWith(`${folderPath}/`);
      });
    const previousFolderCount = Array.isArray(project.folderPaths) ? project.folderPaths.length : 0;
    const removedActive = filesToRemove.some((entry) => String(entry.id || "") === String(project.activeFileId || ""));
    if (removedActive) project.activeFileId = String(nextFiles[0]?.id || "");
    project.files = nextFiles;
    project.folderPaths = nextFolders;
    return filesToRemove.length > 0 || nextFolders.length !== previousFolderCount;
  }, {
    preferredActivePath: editor.getActiveFile()?.name || ""
  });
  if (!updated) {
    if (reason === "last-file") postMarsMessage("[warn] Keep at least one file in the project.");
    return;
  }
  setProjectTreeSelection(null);
  renderProjectTree(true);
  postMarsMessage("Deleted folder: {name}.", { name: folderPath });
}

async function handleProjectTreeAction(action) {
  const normalizedAction = String(action || "").trim().toLowerCase();
  if (normalizedAction === "new-folder") {
    await handleProjectTreeCreateFolderAction();
    return;
  }
  if (normalizedAction === "rename") {
    await handleProjectTreeRenameAction();
    return;
  }
  if (normalizedAction === "delete") {
    await handleProjectTreeDeleteAction();
  }
}

function resolveProjectTreeDropTarget(target) {
  if (!(target instanceof HTMLElement)) return null;
  const node = target.closest("[data-tree-node-type]");
  if (!(node instanceof HTMLElement)) return null;
  const info = resolveProjectTreeNodeFromElement(node);
  if (!info || info.readOnly) return null;
  if (info.type !== "project" && info.type !== "folder") return null;
  return { node, info };
}

const projectTreeNodes = [refs.project?.mainTree, refs.project?.toolTree]
  .filter((node) => node instanceof HTMLElement);
projectTreeNodes.forEach((treeNode) => {
  treeNode.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (!target.matches("[data-tree-checkbox]")) return;
    const info = resolveProjectTreeNodeFromElement(target);
    if (!info) return;
    setProjectTreeSelection(info);
    setProjectTreeNodeChecked(info, target.checked);
    renderProjectTree(true);
  });

  treeNode.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target instanceof HTMLInputElement && target.matches("[data-tree-checkbox]")) {
      const info = resolveProjectTreeNodeFromElement(target);
      if (!info) return;
      setProjectTreeSelection(info);
      setProjectTreeNodeChecked(info, target.checked);
      renderProjectTree(true);
      return;
    }
    const toggle = target.closest("[data-tree-toggle]");
    if (toggle instanceof HTMLElement) {
      const key = String(toggle.dataset.treeNodeKey || "").trim();
      if (key) {
        toggleProjectTreeNodeExpanded(key);
        renderProjectTree(true);
      }
      return;
    }
    const node = target.closest("[data-tree-node-type]");
    if (!(node instanceof HTMLElement)) return;
    const info = resolveProjectTreeNodeFromElement(node);
    if (!info) return;
    setProjectTreeSelection(info);
    if (info.type === "project" && info.rootPath) {
      activateProjectInLibrary(info.rootPath);
    }
    const now = Date.now();
    const repeatedClick = info.key === lastProjectTreeClickInfo.key && (now - lastProjectTreeClickInfo.at) <= 420;
    lastProjectTreeClickInfo = {
      key: info.key,
      at: now
    };
    renderProjectTree(true);
    if (repeatedClick) {
      activateProjectTreeNode(info);
    }
  });

  treeNode.addEventListener("dblclick", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-tree-checkbox]")) return;
    const node = target.closest("[data-tree-node-type]");
    if (!(node instanceof HTMLElement)) return;
    const info = resolveProjectTreeNodeFromElement(node);
    if (!info) return;
    activateProjectTreeNode(info);
  });

  treeNode.addEventListener("dragstart", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const node = target.closest("[data-tree-node-type='file']");
    if (!(node instanceof HTMLElement)) return;
    const info = resolveProjectTreeNodeFromElement(node);
    if (!info || !info.rootPath || !info.path) return;
    projectTreeDragPayload = {
      rootPath: info.rootPath,
      path: normalizeProjectPath(info.path, "untitled.s")
    };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copyMove";
      event.dataTransfer.setData("text/plain", `${projectTreeDragPayload.rootPath}|${projectTreeDragPayload.path}`);
    }
    node.classList.add("dragging");
  });

  treeNode.addEventListener("dragover", (event) => {
    if (!projectTreeDragPayload) return;
    const dropTarget = resolveProjectTreeDropTarget(event.target);
    clearProjectTreeDropTargets();
    if (!dropTarget) return;
    event.preventDefault();
    const isSameProject = isSameProjectRootPath(dropTarget.info.rootPath, projectTreeDragPayload.rootPath);
    if (event.dataTransfer) event.dataTransfer.dropEffect = isSameProject ? "move" : "copy";
    dropTarget.node.classList.add("drop-target");
  });

  treeNode.addEventListener("drop", async (event) => {
    if (!projectTreeDragPayload) return;
    event.preventDefault();
    const dropTarget = resolveProjectTreeDropTarget(event.target);
    clearProjectTreeDropTargets();
    if (!dropTarget) return;
    const destinationFolder = dropTarget.info.type === "folder"
      ? normalizeProjectFolderPath(dropTarget.info.path, "folder")
      : "";
    const sameProject = isSameProjectRootPath(dropTarget.info.rootPath, projectTreeDragPayload.rootPath);
    if (sameProject) {
      const movedPath = moveProjectFileToFolder(
        projectTreeDragPayload.rootPath,
        projectTreeDragPayload.path,
        destinationFolder
      );
      if (movedPath && movedPath !== projectTreeDragPayload.path) {
        postMarsMessage("Moved file to: {path}.", { path: movedPath });
      }
    } else {
      const copiedPath = await copyProjectFileToProjectFolder(
        projectTreeDragPayload.rootPath,
        projectTreeDragPayload.path,
        dropTarget.info.rootPath,
        destinationFolder
      );
      if (copiedPath) {
        postMarsMessage("Copied file to: {path}.", { path: copiedPath });
      }
    }
    projectTreeDragPayload = null;
    treeNode.querySelectorAll(".project-tree-file.dragging").forEach((node) => node.classList.remove("dragging"));
  });

  treeNode.addEventListener("dragend", () => {
    projectTreeDragPayload = null;
    clearProjectTreeDropTargets();
    treeNode.querySelectorAll(".project-tree-file.dragging").forEach((node) => node.classList.remove("dragging"));
  });
});

const projectTreeActionButtons = [
  refs.project?.mainNewFolder,
  refs.project?.mainRename,
  refs.project?.mainDelete,
  refs.project?.toolNewFolder,
  refs.project?.toolRename,
  refs.project?.toolDelete
].filter((button) => button instanceof HTMLButtonElement);
projectTreeActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void handleProjectTreeAction(button.dataset.projectAction || "");
  });
});

renderProjectTree(true);
void ensureMiniCGlobalLibrariesLoaded()
  .then(() => {
    renderProjectTree(true);
  })
  .catch(() => {
    // Ignore global library loading errors for tree rendering.
  });

function canPersistMachineState() {
  return typeof engine.exportNativeState === "function" && typeof engine.importNativeState === "function";
}

function exportMachineState(options = {}) {
  if (!canPersistMachineState()) return null;
  try {
    return engine.exportNativeState({
      includeProgram: options.includeProgram === true,
      includeBreakpoints: options.includeBreakpoints !== false,
      includeExecutionPlan: options.includeExecutionPlan === true
    });
  } catch {
    return null;
  }
}

function importMachineState(state, options = {}) {
  if (!canPersistMachineState() || !state || typeof state !== "object") return false;
  try {
    if (state.memoryMap && typeof state.memoryMap === "object" && typeof engine.setMemoryMap === "function") {
      engine.setMemoryMap(state.memoryMap);
    }
    engine.importNativeState(state, options);
    return true;
  } catch {
    return false;
  }
}

function computeMachineStateSignature(state) {
  if (!state || typeof state !== "object") return "";
  const pc = Number.isFinite(state.pc) ? (state.pc >>> 0) : 0;
  const steps = Number.isFinite(state.steps) ? (state.steps | 0) : 0;
  const memoryUsage = Number.isFinite(state.memoryUsageBytes) ? (state.memoryUsageBytes >>> 0) : 0;
  const lastWrite = state.lastMemoryWriteAddress == null ? -1 : (state.lastMemoryWriteAddress >>> 0);
  return [
    state.assembled ? 1 : 0,
    state.halted ? 1 : 0,
    pc,
    steps,
    memoryUsage,
    lastWrite
  ].join(":");
}

function resetMachineSessionTracking() {
  machineCurrentState = null;
  machineCurrentSignature = "";
  machineBackstepHistory = [];
  lastMachineCaptureAt = 0;
  lastMachineFullCaptureAt = 0;
  machineCurrentProgramMarker = "";
  lastMachinePersistScheduleAt = 0;
  autosaveBackstepFallbackArmed = false;
  restoredBackstepFallbackActive = false;
}

function getSnapshotProgramMarker(snapshot) {
  const rowCount = Array.isArray(snapshot?.textRows) ? snapshot.textRows.length : 0;
  const firstAddress = rowCount > 0 && Number.isFinite(snapshot.textRows[0]?.address)
    ? (snapshot.textRows[0].address >>> 0)
    : 0;
  const lastAddress = rowCount > 0 && Number.isFinite(snapshot.textRows[rowCount - 1]?.address)
    ? (snapshot.textRows[rowCount - 1].address >>> 0)
    : 0;
  const sourceName = getCurrentProgramName();
  return `${sourceName}:${rowCount}:${firstAddress}:${lastAddress}`;
}

function trackMachineStateCheckpoint(snapshot = null, options = {}) {
  if (!isMachineSessionAutosaveEnabled()) return;
  if (!canPersistMachineState()) return;
  const effectiveSnapshot = snapshot || engine.getSnapshot({
    includeDataRows: false,
    includeMemoryWords: false,
    shareMemoryWords: true
  });
  const assembled = effectiveSnapshot?.assembled === true;
  if (!assembled) {
    if (machineCurrentState || machineBackstepHistory.length) {
      resetMachineSessionTracking();
      if (!options.skipPersistSchedule) scheduleWorkspacePersist();
    }
    return;
  }

  const marker = getSnapshotProgramMarker(effectiveSnapshot);
  if (marker && marker !== machineCurrentProgramMarker) {
    machineCurrentState = null;
    machineCurrentSignature = "";
    machineBackstepHistory = [];
    autosaveBackstepFallbackArmed = false;
  }

  const now = Date.now();
  const interval = options.force === true
    ? 0
    : ((runActive || options.fastMode === true || options.noInteraction === true)
      ? RUN_LOOP_MACHINE_CAPTURE_INTERVAL_MS
      : 0);
  if (interval > 0 && (now - lastMachineCaptureAt) < interval) return;
  if (
    options.force !== true
    && (runActive || options.fastMode === true || options.noInteraction === true)
    && (now - lastMachineFullCaptureAt) < RUN_LOOP_MACHINE_FULL_CAPTURE_INTERVAL_MS
  ) {
    lastMachineCaptureAt = now;
    return;
  }

  const state = exportMachineState({
    includeProgram: false,
    includeBreakpoints: true,
    includeExecutionPlan: false
  });
  if (!state) return;

  const signature = computeMachineStateSignature(state);
  if (!signature || signature === machineCurrentSignature) {
    lastMachineCaptureAt = now;
    return;
  }

  if (machineCurrentState && machineCurrentState.assembled) {
    machineBackstepHistory.push(machineCurrentState);
    if (machineBackstepHistory.length > SESSION_MAX_AUTOSAVED_BACKSTEPS) {
      machineBackstepHistory = machineBackstepHistory.slice(-SESSION_MAX_AUTOSAVED_BACKSTEPS);
    }
  }

  machineCurrentState = state;
  machineCurrentSignature = signature;
  lastMachineCaptureAt = now;
  lastMachineFullCaptureAt = now;
  machineCurrentProgramMarker = marker || machineCurrentProgramMarker;
  if (!options.skipPersistSchedule) {
    const minPersistInterval = runActive ? 1500 : 0;
    if (minPersistInterval === 0 || (now - lastMachinePersistScheduleAt) >= minPersistInterval) {
      lastMachinePersistScheduleAt = now;
      scheduleWorkspacePersist();
    }
  }
}

function forceMachineStateCheckpoint() {
  if (!isMachineSessionAutosaveEnabled()) return;
  if (!canPersistMachineState()) return;
  trackMachineStateCheckpoint(null, { force: true });
}

function stateHasSerializedProgram(state) {
  if (!state || typeof state !== "object") return false;
  if (Array.isArray(state.textRows) && state.textRows.length > 0) return true;
  if (typeof state.source === "string" && state.source.trim().length > 0) return true;
  return false;
}

function ensureProgramLoadedForStateRestore() {
  const snapshot = engine.getSnapshot({
    includeDataRows: false,
    includeMemoryWords: false,
    shareMemoryWords: true
  });
  if (snapshot?.assembled === true && Array.isArray(snapshot.textRows) && snapshot.textRows.length > 0) {
    return true;
  }
  const { result } = assembleFromEditor();
  return Boolean(result?.ok);
}

function restoreMachineSession(machineSession) {
  autosaveBackstepFallbackArmed = false;
  restoredBackstepFallbackActive = false;
  if (!canPersistMachineState()) return false;
  if (!machineSession || typeof machineSession !== "object") return false;
  const current = normalizeMachineStateEntry(machineSession.current);
  if (!current) return false;

  const currentHasProgram = stateHasSerializedProgram(current);
  if (!currentHasProgram && !ensureProgramLoadedForStateRestore()) return false;

  let restored = importMachineState(current, {
    preserveProgram: !currentHasProgram,
    preserveBreakpoints: false
  });
  if (!restored) return false;

  let restoredSnapshot = engine.getSnapshot({
    includeDataRows: false,
    includeMemoryWords: false,
    shareMemoryWords: true
  });
  const hasRestoredProgram = Array.isArray(restoredSnapshot?.textRows) && restoredSnapshot.textRows.length > 0;
  if (!hasRestoredProgram) {
    if (!ensureProgramLoadedForStateRestore()) return false;
    restored = importMachineState(current, {
      preserveProgram: true,
      preserveBreakpoints: false
    });
    if (!restored) return false;
    restoredSnapshot = engine.getSnapshot({
      includeDataRows: false,
      includeMemoryWords: false,
      shareMemoryWords: true
    });
    if (!Array.isArray(restoredSnapshot?.textRows) || restoredSnapshot.textRows.length === 0) return false;
  }

  machineBackstepHistory = Array.isArray(machineSession.backsteps)
    ? machineSession.backsteps
        .map((entry) => normalizeMachineStateEntry(entry))
        .filter(Boolean)
        .slice(-SESSION_MAX_AUTOSAVED_BACKSTEPS)
    : [];

  machineCurrentState = exportMachineState({
    includeProgram: false,
    includeBreakpoints: true,
    includeExecutionPlan: false
  });
  machineCurrentSignature = computeMachineStateSignature(machineCurrentState);
  lastMachineCaptureAt = Date.now();
  lastMachineFullCaptureAt = lastMachineCaptureAt;
  lastMachinePersistScheduleAt = lastMachineCaptureAt;
  machineCurrentProgramMarker = getSnapshotProgramMarker(restoredSnapshot);
  autosaveBackstepFallbackArmed = machineBackstepHistory.length > 0;
  restoredBackstepFallbackActive = machineBackstepHistory.length > 0;
  return true;
}

function backstepFromAutosaveHistory() {
  if (!canPersistMachineState() || !machineBackstepHistory.length) return false;
  if (!ensureProgramLoadedForStateRestore()) {
    machineBackstepHistory = [];
    restoredBackstepFallbackActive = false;
    scheduleWorkspacePersist();
    return false;
  }
  const previous = machineBackstepHistory[machineBackstepHistory.length - 1];
  const restored = importMachineState(previous, {
    preserveProgram: true,
    preserveBreakpoints: false
  });
  if (!restored) {
    machineBackstepHistory = [];
    autosaveBackstepFallbackArmed = false;
    restoredBackstepFallbackActive = false;
    scheduleWorkspacePersist();
    return false;
  }
  machineBackstepHistory.pop();
  if (!machineBackstepHistory.length) {
    autosaveBackstepFallbackArmed = false;
    restoredBackstepFallbackActive = false;
  }
  machineCurrentState = previous;
  machineCurrentSignature = computeMachineStateSignature(previous);
  lastMachineCaptureAt = Date.now();
  lastMachineFullCaptureAt = lastMachineCaptureAt;
  lastMachinePersistScheduleAt = lastMachineCaptureAt;
  machineCurrentProgramMarker = getSnapshotProgramMarker(engine.getSnapshot({
    includeDataRows: false,
    includeMemoryWords: false,
    shareMemoryWords: true
  }));
  scheduleWorkspacePersist();
  return true;
}

function buildServerDraftPayload(payload) {
  const files = Array.isArray(payload?.files) ? payload.files : [];
  const windowState = payload?.windowState && typeof payload.windowState === "object" ? payload.windowState : null;
  const windowEntries = Array.isArray(windowState?.windows) ? windowState.windows : [];
  const openToolIds = windowEntries
    .filter((entry) => entry && typeof entry === "object" && entry.hidden !== true && String(entry.toolId || "").trim().length)
    .map((entry) => String(entry.toolId || "").trim());
  return {
    version: 1,
    updatedAt: payload?.updatedAt || Date.now(),
    activeFileId: payload?.activeFileId || "",
    files: files.map((file) => ({
      id: String(file.id || ""),
      name: String(file.name || ""),
      bytes: String(file.source || "").length
    })),
    windows: {
      total: windowEntries.length,
      openToolIds
    }
  };
}

function getCurrentProgramName() {
  const active = editor.getActiveFile?.();
  return normalizeFilename(active?.name || store.getState().fileName || "untitled.s");
}

function describeAssemblySources(assemblyContext) {
  if (!assemblyContext) return getCurrentProgramName();
  if (assemblyContext.fileCount <= 1) {
    return normalizeFilename(assemblyContext.activeFile?.name || assemblyContext.sourceName || getCurrentProgramName());
  }
  const names = (Array.isArray(assemblyContext.sourceFiles) ? assemblyContext.sourceFiles : [])
    .map((file) => normalizeFilename(file?.name || ""))
    .filter(Boolean);
  return names.join(", ");
}

function extractDiagnosticDetails(message) {
  const raw = String(message ?? "").trim();
  const match = /^\[([^\]]+)\]\s*(.*)$/.exec(raw);
  if (match) {
    return {
      fileName: String(match[1] || "").trim(),
      message: String(match[2] || "").trim() || raw
    };
  }
  return { fileName: "", message: raw };
}

function formatDiagnosticMessage(kind, diagnostic, fallbackFileName = "") {
  const details = extractDiagnosticDetails(diagnostic?.message);
  const fileName = details.fileName || String(fallbackFileName || "").trim();
  const line = Number.isFinite(diagnostic?.line) ? (diagnostic.line | 0) : 0;
  if (fileName && line > 0) {
    return translateText("{kind} in {fileName} line {line}: {message}", {
      kind: kind === "error" ? translateText("Error") : translateText("Warning"),
      fileName,
      line,
      message: details.message
    });
  }
  if (fileName) {
    return translateText("{kind} in {fileName}: {message}", {
      kind: kind === "error" ? translateText("Error") : translateText("Warning"),
      fileName,
      message: details.message
    });
  }
  if (line > 0) {
    return translateText("{kind} line {line}: {message}", {
      kind: kind === "error" ? translateText("Error") : translateText("Warning"),
      line,
      message: details.message
    });
  }
  return translateText("{kind}: {message}", {
    kind: kind === "error" ? translateText("Error") : translateText("Warning"),
    message: details.message
  });
}

function postExecutionSuccess(actionLabel, haltReason = "exit") {
  if (haltReason === "cliff") {
    postMarsSystemLine(
      actionLabel === translateText("Step")
        ? "{action}: execution terminated due to null instruction."
        : "{action}: execution terminated by null instruction.",
      { action: actionLabel }
    );
    postRunSystemLine("-- program is finished running (dropped off bottom) --");
    messagesPane.selectRunTab?.();
    return;
  }

  postMarsSystemLine("{action}: execution completed successfully.", { action: actionLabel });
  postRunSystemLine("-- program is finished running --");
  messagesPane.selectRunTab?.();
}

function postExecutionError(actionLabel, message) {
  if (message) {
    postMarsRaw("{message}\n", {
      message: formatDiagnosticMessage("error", { line: 0, message })
    });
  }
  postMarsSystemLine("{action}: execution terminated with errors.", { action: actionLabel });
  messagesPane.selectMarsTab?.();
}

let audioContext = null;

function ensureAudioContext() {
  if (audioContext) return audioContext;
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (typeof AudioCtor !== "function") return null;
  try {
    audioContext = new AudioCtor();
  } catch {
    audioContext = null;
  }
  return audioContext;
}

function playMidiTone(payload) {
  const context = ensureAudioContext();
  if (!context) return;

  const pitch = payload.pitch | 0;
  const durationMs = Math.max(16, payload.duration | 0);
  const volume = Math.max(0, Math.min(127, payload.volume | 0)) / 127;
  const frequency = 440 * Math.pow(2, (pitch - 69) / 12);

  if (!Number.isFinite(frequency) || frequency <= 0) return;

  if (context.state === "suspended") {
    context.resume().catch(() => {});
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(context.destination);

  const startAt = context.currentTime;
  const stopAt = startAt + (durationMs / 1000);
  oscillator.start(startAt);
  oscillator.stop(stopAt);
}

function parseConfirmChoice(value, fallback = 2) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["y", "yes", "1", "true", "ok", "sim", "s"].includes(normalized)) return 0;
  if (["n", "no", "0", "false", "nao", "não"].includes(normalized)) return 1;
  if (["", "cancel", "c", "2", "esc", "escape"].includes(normalized)) return 2;
  return fallback;
}

const popupDialogState = {
  input: null,
  confirm: null,
  message: null
};
function flushRunOutputMessages(entries) {
  if (!Array.isArray(entries) || !entries.length) return;
  entries.forEach((entry) => {
    if (entry && typeof entry === "object") {
      messagesPane.postRun(entry.text || "", { translate: entry.translate !== false });
      return;
    }
    messagesPane.postRun(entry || "");
  });
}

function clearInputPauseState() {
  runPausedForInput = false;
  resumeRunAfterInput = false;
}

function markPausedForInput(autoResume = false) {
  clearRunTimer();
  runActive = false;
  runStopRequested = false;
  runLastTickAt = 0;
  runStepCarry = 0;
  runLastUiSyncAt = 0;
  runPausedForInput = true;
  resumeRunAfterInput = autoResume === true;
  syncSnapshot(engine.getSnapshot(), { force: true });
}

function tryResumeRunAfterInput() {
  if (!runPausedForInput || runActive) return;
  if (!resumeRunAfterInput) {
    const snapshot = engine.getSnapshot();
    clearInputPauseState();
    refreshRuntimeControls(snapshot);
    return;
  }
  const snapshot = engine.getSnapshot();
  if (!snapshot.assembled || snapshot.halted) {
    clearInputPauseState();
    refreshRuntimeControls(snapshot);
    return;
  }
  runPausedForInput = false;
  runStopRequested = false;
  runActive = true;
  runLastTickAt = performance.now();
  runStepCarry = 0;
  runLastUiSyncAt = 0;
  refreshRuntimeControls(snapshot);
  runLoopTick();
}

function echoPopupInput(value) {
  if (value == null) return;
  postRunRaw("**** user input : {value}\n", { value: String(value) });
}

function getPopupRunIoContext() {
  const recent = messagesPane.getRecentRunLines?.(3) || "";
  return recent.trim().length ? recent : "";
}

function consumePopupPrompt(request, label, fallback) {
  const key = `input:${request.service || ""}:${label}:${fallback}`;
  if (!popupDialogState.input || popupDialogState.input.key !== key) {
    const ticket = {
      key,
      ready: false,
      value: null
    };
    popupDialogState.input = ticket;
    void runDialogPrompt({
      title: translateText("Input syscall {service}", { service: request.service || "" }).trim(),
      message: label || translateText("Input"),
      contextText: getPopupRunIoContext(),
      contextLabel: "",
      defaultValue: fallback,
      confirmLabel: translateText("Send"),
      cancelLabel: translateText("Cancel")
    }, {
      windowIdPrefix: "window-popup-input"
    }).then((result) => {
      if (popupDialogState.input !== ticket) return;
      ticket.ready = true;
      ticket.value = result?.ok ? String(result.value ?? "") : null;
      ticket.cancelled = !result?.ok;
      tryResumeRunAfterInput();
    });
    return { wait: true, message: translateText("[input] Waiting for popup input: {label}", { label: label || translateText("input") }) };
  }

  if (!popupDialogState.input.ready) {
    return { wait: true, message: translateText("[input] Waiting for popup input: {label}", { label: label || translateText("input") }) };
  }

  const value = popupDialogState.input.value;
  const cancelled = popupDialogState.input.cancelled === true;
  popupDialogState.input = null;
  echoPopupInput(value);
  if (cancelled) return { cancelled: true };
  return { value };
}

function consumePopupConfirm(request, message) {
  const key = `confirm:${request.service || ""}:${message}`;
  if (!popupDialogState.confirm || popupDialogState.confirm.key !== key) {
    const ticket = {
      key,
      ready: false,
      value: 2
    };
    popupDialogState.confirm = ticket;
    void runDialogPrompt({
      title: translateText("Confirm syscall {service}", { service: request.service || "" }).trim(),
      message: translateText("{message}\n\nType: yes, no, or cancel", { message }),
      defaultValue: "yes",
      confirmLabel: translateText("Send"),
      cancelLabel: translateText("Cancel")
    }, {
      windowIdPrefix: "window-popup-confirm"
    }).then((result) => {
      if (popupDialogState.confirm !== ticket) return;
      ticket.ready = true;
      ticket.value = result?.ok ? parseConfirmChoice(result.value, 2) : 2;
      tryResumeRunAfterInput();
    });
    return { wait: true, message: translateText("[input] Waiting for popup confirmation: {message}", { message }) };
  }

  if (!popupDialogState.confirm.ready) {
    return { wait: true, message: translateText("[input] Waiting for popup confirmation: {message}", { message }) };
  }

  const value = popupDialogState.confirm.value;
  popupDialogState.confirm = null;
  return { value };
}

function consumePopupMessage(request) {
  const message = String(request?.message || "");
  const messageType = Number.isFinite(request?.messageType) ? (request.messageType | 0) : -1;
  const key = `message:${request?.service || ""}:${messageType}:${message}`;

  if (!popupDialogState.message || popupDialogState.message.key !== key) {
    const ticket = {
      key,
      ready: false,
      value: true
    };
    popupDialogState.message = ticket;

    const typeLabel = messageType === 1 ? "Error"
      : messageType === 2 ? "Information"
        : messageType === 3 ? "Warning"
          : messageType === 4 ? "Question"
            : "Message";

    void runDialogConfirm({
      title: translateText("{typeLabel} syscall {service}", {
        typeLabel: translateText(typeLabel),
        service: request?.service || ""
      }).trim(),
      message,
      confirmLabel: translateText("OK"),
      cancelLabel: translateText("Close")
    }, {
      windowIdPrefix: "window-popup-message"
    }).then(() => {
      if (popupDialogState.message !== ticket) return;
      ticket.ready = true;
      ticket.value = true;
      tryResumeRunAfterInput();
    });

    return { wait: true, message: translateText("[dialog] Waiting for message dialog close: {typeLabel}", {
      typeLabel: translateText(typeLabel)
    }) };
  }

  if (!popupDialogState.message.ready) {
    return { wait: true, message: translateText("[dialog] Waiting for message dialog close.") };
  }

  const value = popupDialogState.message.value;
  popupDialogState.message = null;
  return { value };
}

engine.setRuntimeHooks({
  readInput(request) {
    const fallback = typeof request.fallback === "string" ? request.fallback : "";
    const label = translateText(
      String(request.label || "Input syscall {service}"),
      { service: request.service || "" }
    ).trim();

    if (request.popup) {
      return consumePopupPrompt(request, label, fallback);
    }

    const queued = messagesPane.consumeInput();
    if (queued == null) {
      messagesPane.requestInput(label || translateText("input"));
      return { wait: true, message: translateText("[input] Waiting for Run I/O input: {label}", {
        label: label || translateText("input")
      }) };
    }

    messagesPane.clearInputRequest();
    return { value: queued };
  },

  confirmInput(request) {
    const message = request.message == null ? translateText("Confirm?") : String(request.message);

    if (request.popup) {
      return consumePopupConfirm(request, message);
    }

    const queued = messagesPane.consumeInput();
    if (queued == null) {
      messagesPane.requestInput(translateText("{message} [yes/no/cancel]", { message }));
      return { wait: true, message: translateText("[input] Waiting for confirmation in Run I/O: {message}", { message }) };
    }

    messagesPane.clearInputRequest();
    return { value: parseConfirmChoice(queued, 2) };
  },

  messageDialog(request) {
    if (request?.popup !== false) {
      return consumePopupMessage(request || {});
    }
    messagesPane.postRun(String(request?.message || ""), { translate: false });
    return { value: true };
  },

  sleep(request) {
    const milliseconds = Math.max(0, Number(request?.milliseconds ?? 0) | 0);
    return { milliseconds };
  },

  midi(payload) {
    playMidiTone(payload || {});
    return { ok: true };
  }
});

messagesPane.setInputSubmittedHandler(() => {
  tryResumeRunAfterInput();
});

function applyUiPreferences(nextPreferences) {
  refs.root.classList.toggle("hide-labels-window", !nextPreferences.showLabelsWindow);
  refs.root.classList.toggle("split-messages-runio", nextPreferences.splitMessagesRunIo === true);
  const menuPosition = String(nextPreferences.menuPosition || "top").trim().toLowerCase();
  refs.root.classList.toggle("menu-at-bottom", menuPosition === "bottom");

  if (refs.execute.dataHexAddresses) {
    refs.execute.dataHexAddresses.checked = nextPreferences.displayAddressesHex;
    refs.execute.dataHexAddresses.dispatchEvent(new Event("change"));
  }

  if (refs.execute.dataHexValues) {
    refs.execute.dataHexValues.checked = nextPreferences.displayValuesHex;
    refs.execute.dataHexValues.dispatchEvent(new Event("change"));
  }

  const editorFontSize = Math.max(9, Math.min(22, Number(nextPreferences.editorFontSize) || 12));
  const editorLineHeight = Math.max(1, Math.min(2.2, Number(nextPreferences.editorLineHeight) || 1.25));
  refs.editor.style.fontSize = `${editorFontSize}px`;
  refs.editor.style.lineHeight = `${editorLineHeight}`;

  refs.root.classList.toggle("disable-text-highlight", !nextPreferences.highlightTextUpdates);
  refs.root.classList.toggle("disable-data-highlight", !nextPreferences.highlightDataUpdates);
  refs.root.classList.toggle("disable-register-highlight", !nextPreferences.highlightRegisterUpdates);
}

function normalizeRunSpeedIndex(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw)) return RUN_SPEED_INDEX_MAX;
  return Math.max(0, Math.min(RUN_SPEED_INDEX_MAX, Math.round(raw)));
}

function getClosestMobileRunSpeedIndex(index) {
  let closest = MOBILE_RUN_SPEED_PRESET_INDEXES[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  MOBILE_RUN_SPEED_PRESET_INDEXES.forEach((presetIndex) => {
    const distance = Math.abs(presetIndex - index);
    if (distance < bestDistance) {
      bestDistance = distance;
      closest = presetIndex;
    }
  });
  return closest;
}

function syncMobileRunSpeedSelect(index) {
  const select = refs.controls.runSpeedSelectMobile;
  if (!select) return;
  const normalized = normalizeRunSpeedIndex(index);
  const selected = MOBILE_RUN_SPEED_PRESET_INDEXES.includes(normalized)
    ? normalized
    : getClosestMobileRunSpeedIndex(normalized);
  select.value = String(selected);
}

function getRunSpeedIndex() {
  return normalizeRunSpeedIndex(refs.controls.runSpeedSlider?.value ?? RUN_SPEED_INDEX_MAX);
}

function setRunSpeedIndex(index) {
  const normalized = normalizeRunSpeedIndex(index);
  if (refs.controls.runSpeedSlider) {
    refs.controls.runSpeedSlider.value = String(normalized);
  }
  return normalized;
}

function getRunSpeedValue() {
  return RUN_SPEED_TABLE[getRunSpeedIndex()];
}

function formatRunSpeedLabel(index) {
  if (index <= RUN_SPEED_INDEX_INTERACTION_LIMIT) {
    const value = RUN_SPEED_TABLE[index];
    const display = value < 1 ? `${value}` : `${Math.trunc(value)}`;
    return translateText("Run speed {display} inst/sec", { display });
  }
  return translateText("Run speed at max (no interaction)");
}

function formatRunSpeedSummary(index) {
  if (index <= RUN_SPEED_INDEX_INTERACTION_LIMIT) {
    const value = RUN_SPEED_TABLE[index];
    const display = value < 1 ? `${value}` : `${Math.trunc(value)}`;
    return translateText("{display} inst/sec", { display });
  }
  return translateText("max (no interaction)");
}

function isNoInteractionMode(index = getRunSpeedIndex()) {
  return index > RUN_SPEED_INDEX_INTERACTION_LIMIT;
}

function updateNoInteractionUiMode() {
  refs.root.classList.toggle("run-no-interaction", runActive && isNoInteractionMode());
}

let lastControlSyncDebug = null;
let lastControlSyncError = null;
let backstepButtonRecoveryPending = false;
let runtimeControlRecoveryTimer = null;

function refreshRuntimeControls(snapshot = null) {
  const effectiveSnapshot = snapshot ?? engine.getSnapshot();
  lastControlSyncDebug = {
    source: snapshot ? "provided" : "engine",
    steps: Number(effectiveSnapshot?.steps) || 0,
    backstepDepth: Number(effectiveSnapshot?.backstepDepth) || 0,
    canBackstep: hasAvailableBackstep(effectiveSnapshot)
  };
  syncButtons(effectiveSnapshot);
  updateNoInteractionUiMode();
}

function scheduleBackstepButtonRecovery() {
  if (!refs?.buttons?.backstep) return;
  if (backstepButtonRecoveryPending) return;
  backstepButtonRecoveryPending = true;
  Promise.resolve().then(() => {
    backstepButtonRecoveryPending = false;
    const liveSnapshot = engine.getSnapshot();
    const runBusy = runActive || runPausedForInput;
    refs.buttons.backstep.disabled = runBusy || !hasAvailableBackstep(liveSnapshot);
  });
}

function scheduleRuntimeControlRecovery(maxAttempts = 8, delayMs = 25) {
  if (typeof window === "undefined") return;
  if (runtimeControlRecoveryTimer !== null) {
    window.clearTimeout(runtimeControlRecoveryTimer);
    runtimeControlRecoveryTimer = null;
  }

  let attempts = 0;
  const runRecovery = () => {
    attempts += 1;
    refreshRuntimeControls();
    const liveSnapshot = engine.getSnapshot();
    const desiredBackstepDisabled = (runActive || runPausedForInput) || !hasAvailableBackstep(liveSnapshot);
    if (refs?.buttons?.backstep?.disabled !== desiredBackstepDisabled && attempts < maxAttempts) {
      runtimeControlRecoveryTimer = window.setTimeout(runRecovery, Math.max(0, delayMs | 0));
      return;
    }
    runtimeControlRecoveryTimer = null;
  };

  runtimeControlRecoveryTimer = window.setTimeout(runRecovery, 0);
}

function isMobileRunSpeedDropdownVisible() {
  const select = refs.controls.runSpeedSelectMobile;
  if (!select || typeof window === "undefined") return false;
  return window.getComputedStyle(select).display !== "none";
}

function updateRunSpeedLabel() {
  const index = getRunSpeedIndex();
  refs.controls.runSpeedLabel.textContent = isMobileRunSpeedDropdownVisible()
    ? translateText("Run speed")
    : formatRunSpeedLabel(index);
  syncMobileRunSpeedSelect(index);
  updateNoInteractionUiMode();
}

function clearRunTimer() {
  if (runTimer !== null) {
    window.clearTimeout(runTimer);
    runTimer = null;
  }
}

function shouldPostRunLoopMessage(result) {
  if (!result || !result.message) return false;
  if (result.done || result.stoppedOnBreakpoint || result.waitingForInput) return true;
  return result.messageCode !== "executed-line";
}

function setAssemblyTag(kind, text) {
  const tag = refs.status.assemblyTag;
  tag.classList.remove("ok", "warn", "error");
  tag.classList.add(kind);
  tag.textContent = translateText(text);
}

function syncButtons(snapshot) {
  const assembled = snapshot?.assembled === true;
  const halted = snapshot?.halted === true;
  const hasProgramRows = Array.isArray(snapshot?.textRows) && snapshot.textRows.length > 0;
  const runBusy = runActive || runPausedForInput;
  const canExecute = assembled && hasProgramRows && !halted;
  const canBackstep = hasAvailableBackstep(snapshot);
  const actionState = getActiveFileActionState();

  refs.buttons.assemble.disabled = runBusy || !actionState.canAssemble;
  refs.buttons.assemble.title = actionState.canAssemble
    ? "Assemble active assembly source."
    : "Open an assembly source (.s, .asm, .mips) to assemble.";
  if (refs.buttons.compileC0) {
    refs.buttons.compileC0.disabled = runBusy || !actionState.canCompile;
    refs.buttons.compileC0.title = actionState.canCompile
      ? "Compile active C0 source."
      : "Open a .c or .c0 source file to compile.";
  }
  refs.buttons.reset.disabled = runBusy || !assembled;
  refs.buttons.go.disabled = runBusy || !canExecute;
  refs.buttons.step.disabled = runBusy || !canExecute;
  refs.buttons.backstep.disabled = runBusy || !canBackstep;
  refs.buttons.pause.disabled = !runActive;
  refs.buttons.stop.disabled = !(runActive || runPausedForInput);
  if (refs.buttons.undo) refs.buttons.undo.disabled = runBusy;
  if (refs.buttons.redo) refs.buttons.redo.disabled = runBusy;
}

let previousSnapshot = null;

function getBackstepHistoryLimit() {
  const parsed = Number(runtimeSettings?.maxBacksteps);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.max(0, Math.floor(parsed));
}

function clampBackstepEstimate(value) {
  const limit = getBackstepHistoryLimit();
  if (limit <= 0) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(limit, Math.floor(parsed));
}

function incrementBackstepEstimate(delta = 1) {
  const parsed = Number(delta);
  if (!Number.isFinite(parsed) || parsed <= 0) return;
  backstepDepthEstimate = clampBackstepEstimate(backstepDepthEstimate + parsed);
}

function decrementBackstepEstimate(delta = 1) {
  const parsed = Number(delta);
  if (!Number.isFinite(parsed) || parsed <= 0) return;
  backstepDepthEstimate = clampBackstepEstimate(Math.max(0, backstepDepthEstimate - parsed));
}

function syncBackstepEstimateFromSnapshot(snapshot) {
  if (snapshot?.assembled !== true || getBackstepHistoryLimit() <= 0) {
    backstepDepthEstimate = 0;
    return;
  }

  const snapshotDepth = clampBackstepEstimate(Number(snapshot?.backstepDepth) || 0);
  if (snapshotDepth > 0) {
    backstepDepthEstimate = snapshotDepth;
    return;
  }

  if ((Number(snapshot?.steps) || 0) === 0) {
    backstepDepthEstimate = 0;
    return;
  }

  backstepDepthEstimate = clampBackstepEstimate(backstepDepthEstimate);
}

function hasAvailableBackstep(snapshot) {
  const assembled = snapshot?.assembled === true;
  const hasProgramRows = Array.isArray(snapshot?.textRows) && snapshot.textRows.length > 0;
  if (!assembled || !hasProgramRows) return false;
  const backstepDepth = Number(snapshot?.backstepDepth) || 0;
  if (backstepDepth > 0) return true;
  return getBackstepHistoryLimit() > 0 && clampBackstepEstimate(backstepDepthEstimate) > 0;
}

function updateBackstepButtonImmediate(enabled) {
  if (!refs?.buttons?.backstep) return;
  const runBusy = runActive || runPausedForInput;
  refs.buttons.backstep.disabled = runBusy || enabled !== true;
}

function chooseFresherSnapshot(preferredSnapshot = null, liveSnapshot = null) {
  const preferred = preferredSnapshot && typeof preferredSnapshot === "object" ? preferredSnapshot : null;
  const live = liveSnapshot && typeof liveSnapshot === "object" ? liveSnapshot : null;
  if (!preferred) return live;
  if (!live) return preferred;

  const preferredSteps = Number(preferred.steps) || 0;
  const liveSteps = Number(live.steps) || 0;
  if (liveSteps !== preferredSteps) {
    return liveSteps > preferredSteps ? live : preferred;
  }

  const preferredBackstepDepth = Number(preferred.backstepDepth) || 0;
  const liveBackstepDepth = Number(live.backstepDepth) || 0;
  if (liveBackstepDepth !== preferredBackstepDepth) {
    return liveBackstepDepth > preferredBackstepDepth ? live : preferred;
  }

  const preferredRows = Array.isArray(preferred.textRows) ? preferred.textRows.length : 0;
  const liveRows = Array.isArray(live.textRows) ? live.textRows.length : 0;
  if (liveRows !== preferredRows) {
    return liveRows > preferredRows ? live : preferred;
  }

  return preferred;
}

function resolveStableRuntimeSnapshot(preferredSnapshot = null, options = {}) {
  let resolved = chooseFresherSnapshot(preferredSnapshot, engine.getSnapshot());
  const expectBackstep = options.expectBackstep === true;
  if (!expectBackstep || hasAvailableBackstep(resolved)) {
    return resolved;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    resolved = chooseFresherSnapshot(resolved, engine.getSnapshot());
    if (hasAvailableBackstep(resolved)) return resolved;
  }

  return resolved;
}

function computeSnapshotDiff(snapshot, options = {}) {
  const changedRegisters = new Set();
  const changedDataAddresses = new Set();
  const fastMode = options.fastMode === true;
  const skipDiff = options.skipDiff === true;

  if (skipDiff) {
    return { changedRegisters, changedDataAddresses };
  }

  if (!previousSnapshot) {
    return { changedRegisters, changedDataAddresses };
  }

  const previousRegisters = new Map(previousSnapshot.registers.map((register) => [String(register.index), register.value]));
  snapshot.registers.forEach((register) => {
    const key = String(register.index);
    const before = previousRegisters.get(key);
    if (before !== register.value) {
      changedRegisters.add(key);
      changedRegisters.add(register.name);
    }
  });

  if (fastMode) {
    if (Number.isFinite(snapshot.lastMemoryWriteAddress)) {
      changedDataAddresses.add(snapshot.lastMemoryWriteAddress >>> 0);
    }
    return { changedRegisters, changedDataAddresses };
  }

  const previousSteps = Number(previousSnapshot.steps) || 0;
  const currentSteps = Number(snapshot?.steps) || 0;
  const previousData = previousSnapshot.memoryWords ?? new Map();
  const currentData = snapshot.memoryWords ?? new Map();
  const lastWriteAddress = Number.isFinite(snapshot?.lastMemoryWriteAddress)
    ? (snapshot.lastMemoryWriteAddress >>> 0)
    : null;

  if (lastWriteAddress != null) {
    const before = previousData.get(lastWriteAddress) ?? 0;
    const after = currentData.get(lastWriteAddress) ?? 0;
    if (before !== after) changedDataAddresses.add(lastWriteAddress);
    return { changedRegisters, changedDataAddresses };
  }

  if (currentSteps > previousSteps) {
    return { changedRegisters, changedDataAddresses };
  }

  const candidateAddresses = new Set([...previousData.keys(), ...currentData.keys()]);
  candidateAddresses.forEach((address) => {
    const before = previousData.get(address) ?? 0;
    const after = currentData.get(address) ?? 0;
    if (before !== after) changedDataAddresses.add(address >>> 0);
  });

  return { changedRegisters, changedDataAddresses };
}

function createSnapshotDiffBaseline(snapshot, options = {}) {
  const fastMode = options.fastMode === true;
  const previousMemoryWords = previousSnapshot?.memoryWords instanceof Map
    ? previousSnapshot.memoryWords
    : new Map();

  return {
    steps: Number(snapshot?.steps) || 0,
    registers: Array.isArray(snapshot.registers)
      ? snapshot.registers.map((register) => ({ ...register }))
      : [],
    memoryWords: fastMode
      ? previousMemoryWords
      : (snapshot.memoryWords instanceof Map ? new Map(snapshot.memoryWords) : new Map())
  };
}

function syncSnapshot(snapshot, options = {}) {
  const skipHeavyRender = options.skipHeavyRender === true;
  const noInteraction = options.noInteraction === true;
  const suppressPulse = options.suppressPulse === true;
  const skipToolSync = options.skipToolSync === true;
  const preservePreviousSnapshot = options.preservePreviousSnapshot === true;
  let syncError = null;
  const captureSyncError = (error) => {
    const message = error instanceof Error ? (error.stack || error.message) : String(error);
    if (!syncError) syncError = message;
    if (typeof console !== "undefined" && typeof console.error === "function") {
      console.error(error);
    }
  };
  const diff = computeSnapshotDiff(snapshot, {
    ...options,
    skipDiff: skipHeavyRender
  });
  const currentPreferences = store.getState().preferences || preferences;

  syncBackstepEstimateFromSnapshot(snapshot);
  syncButtons(snapshot);
  lastControlSyncDebug = {
    source: "syncSnapshot",
    steps: Number(snapshot?.steps) || 0,
    backstepDepth: Number(snapshot?.backstepDepth) || 0,
    canBackstep: hasAvailableBackstep(snapshot)
  };
  updateNoInteractionUiMode();

  if (!skipHeavyRender) {
    try {
      executePane.render(snapshot, {
        changedDataAddresses: diff.changedDataAddresses,
        focusDataAddress: snapshot.lastMemoryWriteAddress,
        disableHighlights: noInteraction,
        disableAutoScroll: noInteraction,
        displayAddressesHex: currentPreferences.displayAddressesHex === true
      });
    } catch (error) {
      captureSyncError(error);
    }
    try {
      registersPane.render(snapshot, diff.changedRegisters, {
        disableHighlights: noInteraction,
        disableAutoScroll: noInteraction,
        displayValuesHex: currentPreferences.displayValuesHex === true
      });
    } catch (error) {
      captureSyncError(error);
    }
  }

  try {
    refs.status.runtimePc.textContent = translateText("PC: {pc}", {
      pc: formatRuntimeAddress(snapshot.pc, snapshot.pcHex, currentPreferences.displayAddressesHex === true)
    });
    refs.status.runtimeSteps.textContent = translateText("steps: {steps}", { steps: snapshot.steps });

    if (!snapshot.assembled) setAssemblyTag("warn", "not assembled");
    else if (snapshot.errors.length) setAssemblyTag("error", "assembly errors");
    else if (snapshot.warnings.length) setAssemblyTag("warn", "assembled with warnings");
    else if (snapshot.halted) setAssemblyTag("warn", "program halted");
    else setAssemblyTag("ok", "assembled");

    if (!suppressPulse && !skipHeavyRender) {
      if (snapshot.textRows.some((row) => row.isCurrent) || diff.changedDataAddresses.size) {
        windowManager.pulse("window-main");
      }
      if (diff.changedRegisters.size) windowManager.pulse("window-registers");
    }
  } catch (error) {
    captureSyncError(error);
  }

  try {
    if (!skipToolSync) toolManager.onSnapshot(snapshot);
    trackMachineStateCheckpoint(snapshot, options);
    store.setState({ assembled: snapshot.assembled, halted: snapshot.halted, running: runActive });
  } catch (error) {
    captureSyncError(error);
  }
  try {
    if (!preservePreviousSnapshot) previousSnapshot = createSnapshotDiffBaseline(snapshot, options);
  } catch (error) {
    captureSyncError(error);
  }
  lastControlSyncError = syncError;
  scheduleBackstepButtonRecovery();
}

function reportDiagnostics(result, assemblyContext = null) {
  const fallbackFileName = normalizeFilename(assemblyContext?.activeFile?.name || assemblyContext?.sourceName || "");
  if (result.errors?.length) {
    result.errors.forEach((e) => {
      postMarsRaw("{message}\n", {
        message: formatDiagnosticMessage("error", e, fallbackFileName)
      });
    });
  }
  if (result.warnings?.length) {
    result.warnings.forEach((w) => {
      postMarsRaw("{message}\n", {
        message: formatDiagnosticMessage("warning", w, fallbackFileName)
      });
    });
  }
}

function applyPreferences(nextPreferences) {
  const previousLanguage = store.getState().preferences?.language || "en";
  const previousCloudApiBase = cloudApiBase;
  store.setState({ preferences: nextPreferences });
  savePreferences(nextPreferences);
  applyLanguagePreference(nextPreferences.language || "en");
  runtimeSettings.startAtMain = nextPreferences.startAtMain;
  runtimeSettings.delayedBranching = nextPreferences.delayedBranching;
  runtimeSettings.warningsAreErrors = nextPreferences.warningsAreErrors;
  runtimeSettings.assembleOnOpen = nextPreferences.assembleOnOpen;
  runtimeSettings.assembleAll = nextPreferences.assembleAll;
  runtimeSettings.extendedAssembler = nextPreferences.extendedAssembler;
  runtimeSettings.strictMarsCompatibility = nextPreferences.strictMarsCompatibility;
  runtimeSettings.selfModifyingCode = nextPreferences.selfModifyingCode;
  runtimeSettings.popupSyscallInput = nextPreferences.popupSyscallInput;
  runtimeSettings.programArguments = nextPreferences.programArguments;
  runtimeSettings.programArgumentsLine = nextPreferences.programArgumentsText || "";
  runtimeSettings.maxBacksteps = sanitizeMaxBacksteps(nextPreferences.maxBacksteps, runtimeSettings.maxBacksteps);
  runtimeSettings.maxMemoryBytes = memoryGbToBytes(nextPreferences.maxMemoryGb ?? DEFAULT_MEMORY_GB);
  runtimeSettings.assemblerBackendMode = sanitizeBackendMode(nextPreferences.assemblerBackendMode, runtimeSettings.assemblerBackendMode || DEFAULT_BACKEND_MODE);
  runtimeSettings.simulatorBackendMode = sanitizeBackendMode(nextPreferences.simulatorBackendMode, runtimeSettings.simulatorBackendMode || DEFAULT_BACKEND_MODE);
  runtimeSettings.coreBackend = runtimeSettings.simulatorBackendMode === BACKEND_MODE_HYBRID ? "wasm" : "js";
  cloudApiBase = resolveCloudApiBase(nextPreferences);

  if (typeof engine.trimExecutionHistory === "function") {
    engine.trimExecutionHistory();
  } else if (Array.isArray(engine.executionHistory)) {
    const limit = runtimeSettings.maxBacksteps;
    if (limit <= 0) {
      engine.executionHistory.length = 0;
    } else if (engine.executionHistory.length > limit) {
      engine.executionHistory.splice(0, engine.executionHistory.length - limit);
    }
  }
  if (typeof engine.getMemoryUsageBytes === "function") {
    const currentUsage = typeof engine.getAccountedMemoryUsageBytes === "function"
      ? engine.getAccountedMemoryUsageBytes()
      : engine.getMemoryUsageBytes();
    if (Number.isFinite(currentUsage) && currentUsage > runtimeSettings.maxMemoryBytes) {
      postMarsMessage("[warn] Current memory usage exceeds configured limit; new allocations may fail until usage decreases.");
    }
  }

  const selectedMemory = resolveMemoryPreset(nextPreferences);
  const memoryConfigId = memoryPresets[selectedMemory.id] ? selectedMemory.id : (memoryPresets.Default ? "Default" : selectedMemory.id);
  const exceptionHandlerAddress = parseAddressPreference(
    nextPreferences.exceptionHandlerAddress,
    selectedMemory.map.exceptionHandlerAddress ?? DEFAULT_MEMORY_MAP.exceptionHandlerAddress
  );

  const currentMemory = engine.memoryMap || {};
  const memoryChanged =
    activeMemoryConfigId !== memoryConfigId
    || (currentMemory.textBase >>> 0) !== (selectedMemory.map.textBase >>> 0)
    || (currentMemory.dataBase >>> 0) !== (selectedMemory.map.dataBase >>> 0)
    || (currentMemory.heapBase >>> 0) !== (selectedMemory.map.heapBase >>> 0)
    || (currentMemory.stackPointer >>> 0) !== ((selectedMemory.map.stackPointer ?? selectedMemory.map.stackBase) >>> 0)
    || (currentMemory.exceptionHandlerAddress >>> 0) !== (exceptionHandlerAddress >>> 0);

  if (memoryChanged) {
    activeMemoryConfigId = memoryConfigId;
    engine.setMemoryMap({
      ...selectedMemory.map,
      exceptionHandlerAddress
    });
  }

  applyUiPreferences(nextPreferences);
  if (cloudApiBase !== previousCloudApiBase) {
    setCloudSessionState("unknown", null, "");
    void refreshCloudSession({ silent: false });
  } else {
    updateCloudStoreState();
  }
  if ((nextPreferences.language || "en") !== previousLanguage) {
    refs.refreshTranslations?.();
    messagesPane.refreshTranslations?.();
    editor.refreshStatus?.();
    updateRunSpeedLabel();
  }
  if (memoryChanged) previousSnapshot = null;
  if (projectState && typeof projectState === "object") {
    projectState.settings = { ...nextPreferences };
    scheduleProjectPersist({ syncFromEditor: false });
  }
  syncSnapshot(engine.getSnapshot());
}
function stopRunLoop() {
  clearRunTimer();
  runActive = false;
  runStopRequested = false;
  runLastTickAt = 0;
  runStepCarry = 0;
  runLastUiSyncAt = 0;
  clearInputPauseState();
  messagesPane.clearInputRequest();
  syncSnapshot(engine.getSnapshot());
}

function runLoopTick() {
  if (!runActive) return;

  const speedIndex = getRunSpeedIndex();
  const speed = RUN_SPEED_TABLE[speedIndex];
  const interactive = speedIndex <= RUN_SPEED_INDEX_INTERACTION_LIMIT;
  const now = performance.now();
  const elapsedMs = runLastTickAt > 0 ? Math.max(1, now - runLastTickAt) : RUN_LOOP_INTERVAL_MS;
  runLastTickAt = now;

  let stepBudget = 0;
  if (speed === RUN_SPEED_UNLIMITED) {
    stepBudget = RUN_LOOP_MAX_BATCH_UNLIMITED;
  } else {
    runStepCarry += (speed * elapsedMs) / 1000;
    stepBudget = Math.floor(runStepCarry);
    if (stepBudget > 0) {
      runStepCarry -= stepBudget;
    }
    stepBudget = Math.min(RUN_LOOP_MAX_BATCH, stepBudget);
  }

  if (stepBudget <= 0) {
    runTimer = window.setTimeout(runLoopTick, RUN_LOOP_INTERVAL_MS);
    return;
  }

  const runOutputMessages = [];
  let waitingForInput = false;
  let forceCriticalCheckpoint = false;
  let deferredDelayMs = 0;
  let stopReason = "";
  let lastStepResult = null;
  const backendInfo = typeof engine.getBackendInfo === "function" ? engine.getBackendInfo() : null;
  const useBatchStep = typeof engine.stepMany === "function" && backendInfo?.backend === "wasm";

  if (useBatchStep) {
    if (runStopRequested) {
      stopReason = "user";
    } else {
      const result = engine.stepMany(stepBudget, { includeSnapshot: false });
      lastStepResult = result;
      if (!result.ok) {
        postExecutionError(translateText("Go"), result.message);
        stopReason = "error";
        runStopRequested = true;
      } else {
        const executedInBatch = Math.max(0, Number(result.stepsExecuted) || 0);
        if (executedInBatch > 0) incrementBackstepEstimate(executedInBatch);
        if (result.runIo) {
          forceCriticalCheckpoint = true;
          if (result.message) runOutputMessages.push({ text: result.message, translate: false });
        }
        if (result.waitingForInput) {
          waitingForInput = true;
          forceCriticalCheckpoint = true;
        }
        if (interactive) {
          const nowSync = performance.now();
          const shouldSyncNow =
            result.done
            || result.stoppedOnBreakpoint
            || result.waitingForInput
            || ((nowSync - runLastUiSyncAt) >= RUN_LOOP_UI_SYNC_INTERVAL_MS_INTERACTIVE);
          if (shouldSyncNow) {
            syncSnapshot(engine.getSnapshot({
              shareMemoryWords: true,
              includeDataRows: false
            }), {
              fastMode: true,
              suppressPulse: true
            });
            runLastUiSyncAt = nowSync;
          }
        }
        if (result.stoppedOnBreakpoint) {
          stopReason = "breakpoint";
          runStopRequested = true;
        } else if (result.done) {
          stopReason = result.exception ? "exception" : "normal";
          runStopRequested = true;
        } else if (result.sleepMs > 0) {
          deferredDelayMs = Math.max(deferredDelayMs, result.sleepMs | 0);
        }
      }
    }
  } else {
    const loopStart = performance.now();
    const timeBudgetMs = interactive ? RUN_LOOP_TIME_BUDGET_MS_INTERACTIVE : RUN_LOOP_TIME_BUDGET_MS_FAST;
    const cooperativeCheckInterval = interactive
      ? RUN_LOOP_COOPERATIVE_CHECK_INTERVAL_INTERACTIVE
      : RUN_LOOP_COOPERATIVE_CHECK_INTERVAL_FAST;

    for (let i = 0; i < stepBudget; i += 1) {
      if (runStopRequested) {
        stopReason = "user";
        break;
      }

      const result = engine.step({ includeSnapshot: false });
      lastStepResult = result;
      if (!result.ok) {
        postExecutionError(translateText("Go"), result.message);
        stopReason = "error";
        runStopRequested = true;
        break;
      }
      restoredBackstepFallbackActive = false;

      if (result.runIo) {
        forceCriticalCheckpoint = true;
        if (result.message) runOutputMessages.push({ text: result.message, translate: false });
      }

      if (result.waitingForInput) {
        waitingForInput = true;
        forceCriticalCheckpoint = true;
        break;
      }

      incrementBackstepEstimate(1);

      if (interactive) {
        const nowSync = performance.now();
        const shouldSyncNow =
          result.done
          || result.stoppedOnBreakpoint
          || result.waitingForInput
          || ((nowSync - runLastUiSyncAt) >= RUN_LOOP_UI_SYNC_INTERVAL_MS_INTERACTIVE);
        if (shouldSyncNow) {
          syncSnapshot(engine.getSnapshot({
            shareMemoryWords: true,
            includeDataRows: false
          }), {
            fastMode: true,
            suppressPulse: true
          });
          runLastUiSyncAt = nowSync;
        }
      }

      if (result.stoppedOnBreakpoint) {
        stopReason = "breakpoint";
        runStopRequested = true;
        break;
      }

      if (result.done) {
        stopReason = result.exception ? "exception" : "normal";
        runStopRequested = true;
        break;
      }

      if (result.sleepMs > 0) {
        deferredDelayMs = Math.max(deferredDelayMs, result.sleepMs | 0);
        break;
      }

      if (((i + 1) % cooperativeCheckInterval) === 0 && (performance.now() - loopStart) >= timeBudgetMs) {
        break;
      }
    }
  }

  flushRunOutputMessages(runOutputMessages);
  if (forceCriticalCheckpoint) forceMachineStateCheckpoint();

  if (waitingForInput) {
    markPausedForInput(true);
    messagesPane.focusRunInput();
    return;
  }

  if (runStopRequested) {
    clearRunTimer();
    runActive = false;
    runStopRequested = false;
    runLastTickAt = 0;
    runStepCarry = 0;
    runLastUiSyncAt = 0;
    clearInputPauseState();
    syncSnapshot(engine.getSnapshot(), { force: true });
    if (stopReason === "user") {
      postMarsSystemLine("{action}: execution terminated by user.", { action: translateText("Go") });
      messagesPane.selectMarsTab?.();
    } else if (stopReason === "breakpoint") {
      postMarsSystemLine("{action}: execution paused at breakpoint: {name}", {
        action: translateText("Go"),
        name: getCurrentProgramName()
      });
      messagesPane.selectMarsTab?.();
    } else if (stopReason === "exception") {
      postExecutionError(translateText("Go"), lastStepResult?.message);
    } else if (stopReason === "normal") {
      postExecutionSuccess(translateText("Go"), lastStepResult?.haltReason || "exit");
    }
    return;
  }

  if (!interactive) {
    const nowSync = performance.now();
    if ((nowSync - runLastUiSyncAt) >= RUN_LOOP_TOOL_SYNC_INTERVAL_MS_NO_INTERACTION) {
      syncSnapshot(engine.getSnapshot({
        includeTextRows: false,
        includeLabels: false,
        includeDataRows: false,
        includeRegisters: false,
        shareMemoryWords: true
      }), {
        skipHeavyRender: true,
        fastMode: true,
        suppressPulse: true,
        noInteraction: true,
        preservePreviousSnapshot: true
      });
      runLastUiSyncAt = nowSync;
    }
  }
  const nextDelay = deferredDelayMs > 0 ? deferredDelayMs : (speed === RUN_SPEED_UNLIMITED ? 1 : RUN_LOOP_INTERVAL_MS);
  runTimer = window.setTimeout(runLoopTick, nextDelay);
}
function togglePreference(key, label) {
  const current = store.getState().preferences;
  const next = { ...current, [key]: !current[key] };
  applyPreferences(next);
  postMarsMessage("Setting updated: {label} = {value}.", {
    label: translateText(label),
    value: next[key]
  });
}

function updatePreferencesPatch(patch, successMessage = "") {
  const current = store.getState().preferences;
  const next = { ...current, ...patch };
  applyPreferences(next);
  if (successMessage) postMarsMessage(successMessage);
}

async function openLanguagePreferencesDialog() {
  const current = store.getState().preferences;
  const languages = getAvailableLanguages();
  const menu = languages
    .map((language, index) => `${index + 1}: ${language}`)
    .join("\n");
  const raw = await requestTextDialog(
    "Language",
    translateText("Language\n{menu}\n\nChoose language number or code", { menu }),
    current.language || "en"
  );
  if (raw == null) return;

  const trimmed = raw.trim();
  let selected = languages.find((language) => language.toLowerCase() === trimmed.toLowerCase()) || "";
  if (!selected) {
    const numeric = Number.parseInt(trimmed, 10);
    if (Number.isFinite(numeric) && numeric >= 1 && numeric <= languages.length) {
      selected = languages[numeric - 1];
    }
  }

  if (!selected) {
    postMarsMessage("[warn] Unknown language.");
    return;
  }

  updatePreferencesPatch({ language: selected }, translateText("Language updated: {language}.", { language: selected }));
}

async function requestTextDialog(title, message, defaultValue = "", options = {}) {
  const result = await runDialogPrompt({
    title: translateText(title),
    message: translateText(message),
    defaultValue,
    confirmLabel: translateText(options.confirmLabel || "OK"),
    cancelLabel: translateText(options.cancelLabel || "Cancel"),
    placeholder: translateText(options.placeholder || "")
  }, {
    windowIdPrefix: "window-dialog-system"
  });
  if (!result?.ok) return null;
  return String(result.value ?? "");
}

async function requestConfirmDialog(title, message, options = {}) {
  return runDialogConfirm({
    title: translateText(title),
    message: translateText(message),
    confirmLabel: translateText(options.confirmLabel || "OK"),
    cancelLabel: translateText(options.cancelLabel || "Cancel")
  }, {
    windowIdPrefix: "window-dialog-system"
  });
}

async function promptStartupRecoveryChoiceIfNeeded() {
  if (startupRecoveryDecisionPrompted) return;
  startupRecoveryDecisionPrompted = true;
  if (!startupHadRecoverableLocalData) return;

  const recoverExisting = await requestConfirmDialog(
    "Recover Local Data",
    translateText("Local storage data was found. Recover it?"),
    {
      confirmLabel: "Recover",
      cancelLabel: "Start New Project"
    }
  );

  if (recoverExisting) {
    postMarsMessage("Recovered local data.");
    return;
  }

  const clearAndRestart = await requestConfirmDialog(
    "Start New Project",
    translateText("This will clear local data and restart with a clean default project. Continue?"),
    {
      confirmLabel: "Clear and Restart",
      cancelLabel: "Cancel"
    }
  );
  if (!clearAndRestart) {
    postMarsMessage("Kept current local data.");
    return;
  }

  enterResetReloadMode();
  const removedCount = clearRecoverableLocalStorageData();
  postMarsMessage("Starting new project. Cleared local data entries: {count}.", { count: removedCount });
  markSkipStartupRecoveryPromptOnce();
  window.setTimeout(() => {
    window.location.reload();
  }, 40);
}

function parseBooleanPreferenceToken(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y", "sim", "s", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "nao", "não", "off"].includes(normalized)) return false;
  return fallback;
}

async function openInterfacePreferencesPanel() {
  const current = store.getState().preferences;
  const languages = getAvailableLanguages();
  const result = await runDialogForm({
    title: translateText("Interface Preferences"),
    message: translateText("Adjust language, editor, and highlighting settings."),
    confirmLabel: translateText("OK"),
    cancelLabel: translateText("Cancel"),
    width: "540px",
    height: "520px",
    sections: [
      {
        title: translateText("Language"),
        fields: [
          {
            name: "language",
            label: translateText("Language"),
            type: "select",
            value: current.language || "en",
            options: languages.map((language) => ({ value: language, label: language }))
          }
        ]
      },
      {
        title: translateText("Layout"),
        fields: [
          {
            name: "menuPosition",
            label: translateText("Menu position"),
            type: "select",
            value: (String(current.menuPosition || "top").trim().toLowerCase() === "bottom") ? "bottom" : "top",
            options: [
              { value: "top", label: translateText("Top") },
              { value: "bottom", label: translateText("Bottom") }
            ]
          }
        ]
      },
      {
        title: translateText("Editor"),
        fields: [
          {
            name: "editorFontSize",
            label: translateText("Editor font size"),
            type: "number",
            min: 9,
            max: 22,
            step: 1,
            value: String(current.editorFontSize ?? 12)
          },
          {
            name: "editorLineHeight",
            label: translateText("Editor line height"),
            type: "number",
            min: 1,
            max: 2.2,
            step: 0.05,
            value: String(current.editorLineHeight ?? 1.25)
          }
        ]
      },
      {
        title: translateText("Highlighting"),
        fields: [
          {
            name: "highlightTextUpdates",
            label: translateText("Highlight text updates"),
            type: "checkbox",
            value: current.highlightTextUpdates === true
          },
          {
            name: "highlightDataUpdates",
            label: translateText("Highlight data updates"),
            type: "checkbox",
            value: current.highlightDataUpdates === true
          },
          {
            name: "highlightRegisterUpdates",
            label: translateText("Highlight register updates"),
            type: "checkbox",
            value: current.highlightRegisterUpdates === true
          }
        ]
      }
    ]
  }, {
    windowIdPrefix: "window-interface-preferences",
    left: "120px",
    top: "90px",
    width: "540px",
    height: "520px"
  });
  if (!result?.ok) return;

  const values = result.value || {};
  const selectedLanguage = languages.includes(String(values.language || "").trim())
    ? String(values.language || "").trim()
    : (current.language || "en");
  const parsedFont = Number(values.editorFontSize);
  const parsedLineHeight = Number(values.editorLineHeight);
  const parsedMenuPosition = String(values.menuPosition || current.menuPosition || "top").trim().toLowerCase() === "bottom"
    ? "bottom"
    : "top";
  if (!Number.isFinite(parsedFont) || !Number.isFinite(parsedLineHeight)) {
    postMarsMessage("[warn] Invalid editor preferences.");
    return;
  }

  updatePreferencesPatch({
    language: selectedLanguage,
    menuPosition: parsedMenuPosition,
    editorFontSize: Math.max(9, Math.min(22, parsedFont)),
    editorLineHeight: Math.max(1, Math.min(2.2, parsedLineHeight)),
    highlightTextUpdates: parseBooleanPreferenceToken(values.highlightTextUpdates, current.highlightTextUpdates),
    highlightDataUpdates: parseBooleanPreferenceToken(values.highlightDataUpdates, current.highlightDataUpdates),
    highlightRegisterUpdates: parseBooleanPreferenceToken(values.highlightRegisterUpdates, current.highlightRegisterUpdates)
  }, "Interface preferences updated.");
}

async function openRuntimeMemoryPreferencesPanel() {
  const ids = Object.keys(memoryPresets);
  if (!ids.length) {
    postMarsMessage("[warn] No memory presets available.");
    return;
  }

  const current = store.getState().preferences;
  const defaultMemoryGb = sanitizeMemoryGb(current.maxMemoryGb, DEFAULT_MEMORY_GB);
  const defaultBacksteps = sanitizeMaxBacksteps(current.maxBacksteps, DEFAULT_MAX_BACKSTEPS);
  const runtimeMemoryMap = (engine.memoryMap && typeof engine.memoryMap === "object")
    ? engine.memoryMap
    : (initialMemoryMap && typeof initialMemoryMap === "object" ? initialMemoryMap : DEFAULT_MEMORY_MAP);
  const fallbackAddress = parseAddressPreference(
    current.exceptionHandlerAddress,
    runtimeMemoryMap.exceptionHandlerAddress ?? DEFAULT_MEMORY_MAP.exceptionHandlerAddress
  );
  const originalExceptionText = current.exceptionHandlerAddress || toHex(fallbackAddress);
  const backendOptions = [
    { value: BACKEND_MODE_JS, label: translateText("only JS") },
    { value: BACKEND_MODE_HYBRID, label: translateText("experimental JS + C++") }
  ];
  const defaultAssemblerBackend = sanitizeBackendMode(current.assemblerBackendMode, DEFAULT_BACKEND_MODE);
  const defaultSimulatorBackend = sanitizeBackendMode(current.simulatorBackendMode, DEFAULT_BACKEND_MODE);

  const result = await runDialogForm({
    title: translateText("Runtime & Memory Preferences"),
    message: translateText("Adjust exception handler, memory configuration, and memory limits."),
    confirmLabel: translateText("OK"),
    cancelLabel: translateText("Cancel"),
    width: "520px",
    height: "390px",
    sections: [
      {
        title: translateText("Runtime Engines"),
        layout: "table",
        fields: [
          {
            name: "assemblerBackendMode",
            label: translateText("Assembler"),
            type: "select",
            value: defaultAssemblerBackend,
            options: backendOptions
          },
          {
            name: "simulatorBackendMode",
            label: translateText("Simulator"),
            type: "select",
            value: defaultSimulatorBackend,
            options: backendOptions
          }
        ]
      },
      {
        title: translateText("Memory Configuration"),
        layout: "table",
        fields: [
          {
            name: "exceptionHandlerAddress",
            label: translateText("Exception handler address"),
            type: "text",
            value: originalExceptionText
          },
          {
            name: "memoryConfiguration",
            label: translateText("Memory configuration"),
            type: "select",
            value: activeMemoryConfigId || "Default",
            options: ids.map((id) => ({
              value: id,
              label: memoryPresets[id].label || id
            }))
          }
        ]
      },
      {
        title: translateText("Memory Limits"),
        layout: "table",
        fields: [
          {
            name: "maxMemoryGb",
            label: translateText("Maximum memory (GB)"),
            type: "number",
            min: MIN_MEMORY_GB,
            max: MAX_MEMORY_GB,
            step: 0.25,
            value: String(defaultMemoryGb)
          },
          {
            name: "maxBacksteps",
            label: translateText("Maximum backsteps"),
            type: "number",
            min: MIN_MAX_BACKSTEPS,
            max: MAX_MAX_BACKSTEPS,
            step: 1,
            value: String(defaultBacksteps)
          }
        ]
      }
    ]
  }, {
    windowIdPrefix: "window-runtime-memory-preferences",
    left: "210px",
    top: "130px",
    width: "520px",
    height: "390px"
  });
  if (!result?.ok) return;

  const values = result.value || {};
  const selectedId = ids.includes(String(values.memoryConfiguration || "").trim())
    ? String(values.memoryConfiguration || "").trim()
    : (activeMemoryConfigId || "Default");
  const selectedMap = { ...DEFAULT_MEMORY_MAP, ...(memoryPresets[selectedId] || {}) };
  const exceptionRaw = String(values.exceptionHandlerAddress || "").trim();
  const memoryChanged = selectedId !== (activeMemoryConfigId || "Default");
  const shouldUsePresetException = memoryChanged && (!exceptionRaw || exceptionRaw === originalExceptionText);
  const exceptionSource = shouldUsePresetException
    ? toHex(selectedMap.exceptionHandlerAddress ?? DEFAULT_MEMORY_MAP.exceptionHandlerAddress)
    : (exceptionRaw || originalExceptionText);
  const parsedException = parseAddressPreference(
    exceptionSource,
    selectedMap.exceptionHandlerAddress ?? fallbackAddress
  );
  const parsedMemoryGb = sanitizeMemoryGb(values.maxMemoryGb, defaultMemoryGb);
  const parsedBacksteps = sanitizeMaxBacksteps(values.maxBacksteps, defaultBacksteps);
  const parsedAssemblerBackend = sanitizeBackendMode(values.assemblerBackendMode, defaultAssemblerBackend);
  const parsedSimulatorBackend = sanitizeBackendMode(values.simulatorBackendMode, defaultSimulatorBackend);

  updatePreferencesPatch({
    exceptionHandlerAddress: toHex(parsedException),
    memoryConfiguration: selectedId,
    maxMemoryGb: parsedMemoryGb,
    maxBacksteps: parsedBacksteps,
    assemblerBackendMode: parsedAssemblerBackend,
    simulatorBackendMode: parsedSimulatorBackend
  }, "Runtime and memory preferences updated.");
}

function normalizeMiniCSubsetPreferenceToken(value) {
  const raw = String(value || "C1-NATIVE").trim().toUpperCase();
  if (!raw) return "C1-NATIVE";
  if (raw === "C0-S1-") return "C0-S1";
  if (raw === "C0-S2-") return "C0-S2";
  if (raw === "C0-S3-") return "C0-S3";
  if (raw === "C0-S4-") return "C0-S4";
  if (raw === "C1" || raw === "C1-" || raw === "C1-NATIVE-" || raw === "C1/NATIVE" || raw === "C1_NATIVE") {
    return "C1-NATIVE";
  }
  return raw;
}

function isMiniCNativeSubset(value) {
  return normalizeMiniCSubsetPreferenceToken(value) === "C1-NATIVE";
}

async function openMiniCCompilerPreferencesPanel() {
  const current = store.getState().preferences || preferences;
  const currentSubsetToken = normalizeMiniCSubsetPreferenceToken(current.miniCSubset || "C1-NATIVE");
  const result = await runDialogForm({
    title: translateText("Mini-C Compiler Preferences"),
    message: translateText("Configure Mini-C frontend settings."),
    confirmLabel: translateText("OK"),
    cancelLabel: translateText("Cancel"),
    width: "520px",
    height: "410px",
    sections: [
      {
        title: translateText("Compilation Target"),
        fields: [
          {
            name: "miniCTargetAbi",
            label: translateText("Target ABI"),
            type: "select",
            value: String(current.miniCTargetAbi || "o32").toLowerCase(),
            options: [
              { value: "o32", label: translateText("MIPS O32 (recommended)") }
            ]
          },
          {
            name: "miniCSubset",
            label: translateText("Subset profile"),
            type: "select",
            value: currentSubsetToken,
            options: [
              { value: "C0-S0", label: "C0-S0 (phase 2 baseline)" },
              { value: "C0-S1", label: "C0-S1 (S0 + dialogs/files/includes)" },
              { value: "C0-S2", label: "C0-S2 (loop control profile)" },
              { value: "C0-S3", label: "C0-S3 (array-centric profile)" },
              { value: "C0-S4", label: "C0-S4 (full academic C0 layer)" },
              { value: "C1-NATIVE", label: "C1/native (byte-addressed char*, argv, native string helpers)" }
            ]
          }
        ]
      },
      {
        title: translateText("Output"),
        fields: [
          {
            name: "miniCOpenOutputWindow",
            label: translateText("Open Mini-C output window after compile"),
            type: "checkbox",
            value: current.miniCOpenOutputWindow !== false
          },
          {
            name: "miniCEmitScaffoldingComments",
            label: translateText("Emit scaffold comments in generated ASM"),
            type: "checkbox",
            value: current.miniCEmitScaffoldingComments !== false
          }
        ]
      }
    ]
  }, {
    windowIdPrefix: "window-mini-c-preferences",
    left: "210px",
    top: "120px",
    width: "520px",
    height: "410px"
  });
  if (!result?.ok) return;

  const values = result.value || {};
  const nextTargetAbi = String(values.miniCTargetAbi || "o32").toLowerCase() === "o32" ? "o32" : "o32";
  const nextSubset = normalizeMiniCSubsetPreferenceToken(values.miniCSubset || "C1-NATIVE");
  updatePreferencesPatch({
    miniCTargetAbi: nextTargetAbi,
    miniCSubset: nextSubset,
    miniCOpenOutputWindow: parseBooleanPreferenceToken(values.miniCOpenOutputWindow, current.miniCOpenOutputWindow !== false),
    miniCEmitScaffoldingComments: parseBooleanPreferenceToken(values.miniCEmitScaffoldingComments, current.miniCEmitScaffoldingComments !== false)
  }, "Mini-C compiler preferences updated.");
}

function normalizeLanguageCode(language) {
  return String(language || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function expandLanguageVariants(language) {
  const normalized = normalizeLanguageCode(language);
  if (!normalized) return [];
  const base = normalized.split("-")[0];
  return normalized === base ? [normalized] : [normalized, base];
}

function uniqueStrings(values) {
  const seen = new Set();
  const out = [];
  values.forEach((value) => {
    const normalized = String(value || "").trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });
  return out;
}

function normalizeExampleLanguageList(value) {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value.flatMap((entry) => expandLanguageVariants(entry)));
}

function normalizeExampleRelativePath(path) {
  const normalized = String(path || "").trim().replace(/\\/g, "/");
  if (!normalized) return "";
  if (normalized.startsWith("./examples/")) return normalized.slice("./examples/".length);
  if (normalized.startsWith("examples/")) return normalized.slice("examples/".length);
  if (normalized.startsWith("/examples/")) return normalized.slice("/examples/".length);
  return normalized.replace(/^\.?\//, "");
}

function toExampleResourcePath(path) {
  const normalized = normalizeExampleRelativePath(path);
  return normalized ? `./examples/${normalized}` : "./examples/";
}

function getExampleFileName(path) {
  const normalized = normalizeExampleRelativePath(path);
  return normalized.split("/").pop() || normalized || "example.asm";
}

function normalizeExampleFileEntry(entry, fallbackPath) {
  if (typeof entry === "string") {
    const relativePath = normalizeExampleRelativePath(entry);
    if (!relativePath) return null;
    return {
      path: relativePath,
      name: relativePath,
      main: false
    };
  }
  if (!entry || typeof entry !== "object") return null;
  const rawPath = String(entry.path || entry.file || entry.name || fallbackPath || "").trim();
  const relativePath = normalizeExampleRelativePath(rawPath);
  if (!relativePath) return null;
  const displayName = String(entry.name || relativePath).trim() || relativePath;
  return {
    path: relativePath,
    name: displayName,
    main: entry.main === true
  };
}

function normalizeExampleFiles(entry, fallbackPath) {
  const entries = Array.isArray(entry?.files) && entry.files.length
    ? entry.files
    : [fallbackPath];
  const files = entries
    .map((fileEntry) => normalizeExampleFileEntry(fileEntry, fallbackPath))
    .filter(Boolean);
  if (!files.length) return [];
  if (!files.some((file) => file.main)) {
    files[0] = { ...files[0], main: true };
  }
  return files;
}

function getCurrentExampleLanguage() {
  const i18n = getI18nApi();
  return normalizeLanguageCode(i18n?.getLanguage?.() || preferences.language || DEFAULT_EXAMPLE_LANGUAGE) || DEFAULT_EXAMPLE_LANGUAGE;
}

function buildExampleLanguageOrder(example) {
  const i18n = getI18nApi();
  const current = getCurrentExampleLanguage();
  const fallback = normalizeLanguageCode(i18n?.getFallbackLanguage?.() || exampleManifestState.defaultLanguage || DEFAULT_EXAMPLE_LANGUAGE);
  const manifestLanguages = normalizeExampleLanguageList(exampleManifestState.languages);
  const exampleLanguages = normalizeExampleLanguageList(example?.languages);
  const appLanguages = getAvailableLanguages().flatMap((language) => expandLanguageVariants(language));
  return uniqueStrings([
    ...expandLanguageVariants(current),
    ...expandLanguageVariants(fallback),
    ...expandLanguageVariants(exampleManifestState.defaultLanguage),
    DEFAULT_EXAMPLE_LANGUAGE,
    ...exampleLanguages,
    ...manifestLanguages,
    ...appLanguages
  ]);
}

function buildExampleVariantCacheKey(example) {
  return `${example?.id || example?.path || example?.label || "example"}::${getCurrentExampleLanguage()}`;
}

async function loadExampleVariant(example, language) {
  const files = Array.isArray(example?.files) ? example.files : [];
  const loadedFiles = [];
  for (const file of files) {
    const candidatePath = language
      ? `./examples/${language}/${normalizeExampleRelativePath(file.path)}`
      : toExampleResourcePath(file.path);
    const source = await loadTextResource(candidatePath);
    loadedFiles.push({
      path: candidatePath,
      source,
      logicalPath: normalizeExampleRelativePath(file.path),
      name: String(file.name || normalizeExampleRelativePath(file.path)).trim() || normalizeExampleRelativePath(file.path) || getExampleFileName(file.path),
      main: file.main === true
    });
  }
  return {
    language: language || null,
    files: loadedFiles
  };
}

async function loadLocalizedExample(example) {
  const cacheKey = buildExampleVariantCacheKey(example);
  const cached = exampleVariantCache.get(cacheKey);
  if (cached) {
    try {
      return await loadExampleVariant(example, cached.language);
    } catch {
      exampleVariantCache.delete(cacheKey);
    }
  }

  const attempted = [];
  const languages = buildExampleLanguageOrder(example);
  for (const language of languages) {
    try {
      const variant = await loadExampleVariant(example, language);
      exampleVariantCache.set(cacheKey, { language });
      return variant;
    } catch (error) {
      attempted.push(error);
    }
  }

  try {
    const legacyVariant = await loadExampleVariant(example, null);
    exampleVariantCache.set(cacheKey, { language: null });
    return legacyVariant;
  } catch (error) {
    attempted.push(error);
  }

  throw attempted[attempted.length - 1] || new Error(translateText("Failed to load file."));
}

function normalizeExampleEntry(entry) {
  if (!entry) return null;
  if (typeof entry === "string") {
    const fileName = entry.trim();
    if (!fileName) return null;
    const relativePath = normalizeExampleRelativePath(fileName);
    return {
      label: fileName,
      path: toExampleResourcePath(relativePath),
      relativePath,
      category: DEFAULT_EXAMPLE_CATEGORY,
      languages: [],
      files: normalizeExampleFiles({}, relativePath),
      id: relativePath || fileName
    };
  }
  if (typeof entry !== "object") return null;
  const rawPath = String(entry.path || entry.file || entry.name || "").trim();
  if (!rawPath) return null;
  const relativePath = normalizeExampleRelativePath(rawPath);
  const path = toExampleResourcePath(relativePath);
  const label = String(entry.label || entry.name || rawPath).trim() || (path.split("/").pop() || path);
  const category = String(entry.category || DEFAULT_EXAMPLE_CATEGORY).trim() || DEFAULT_EXAMPLE_CATEGORY;
  const languages = normalizeExampleLanguageList(entry.languages);
  const files = normalizeExampleFiles(entry, relativePath);
  return {
    label,
    path,
    relativePath,
    category,
    languages,
    files,
    id: String(entry.id || relativePath || label).trim() || relativePath || label
  };
}

const runtimeExampleFiles = EXAMPLE_FILES
  .map((entry) => normalizeExampleEntry(entry))
  .filter(Boolean);

function mergeExampleEntries(entries) {
  entries.forEach((entry) => {
    const normalized = normalizeExampleEntry(entry);
    if (!normalized) return;
    const existingIndex = runtimeExampleFiles.findIndex((example) => example.path === normalized.path);
    if (existingIndex >= 0) {
      runtimeExampleFiles[existingIndex] = {
        ...runtimeExampleFiles[existingIndex],
        ...normalized
      };
      return;
    }
    runtimeExampleFiles.push(normalized);
  });
}

async function discoverExampleFiles() {
  try {
    const text = await loadTextResource("./examples/examples.json");
    const manifest = JSON.parse(text);
    if (manifest && typeof manifest === "object" && !Array.isArray(manifest)) {
      const defaultLanguage = normalizeLanguageCode(manifest.defaultLanguage);
      if (defaultLanguage) exampleManifestState.defaultLanguage = defaultLanguage;
      const languages = normalizeExampleLanguageList(manifest.languages);
      exampleManifestState.languages = uniqueStrings([
        exampleManifestState.defaultLanguage || DEFAULT_EXAMPLE_LANGUAGE,
        ...languages
      ]);
    }
    const entries = Array.isArray(manifest)
      ? manifest
      : (Array.isArray(manifest?.examples) ? manifest.examples : []);
    if (entries.length) {
      mergeExampleEntries(entries);
    }
  } catch {
    // Optional manifest file.
  }
}

void discoverExampleFiles();
void ensureMiniCGlobalLibrariesLoaded();
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = "";
fileInput.multiple = true;
fileInput.hidden = true;
document.body.appendChild(fileInput);

function normalizeDiskImportPath(pathValue, fallbackName = "untitled") {
  const raw = String(pathValue || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "");
  return raw || fallbackName;
}

async function loadProjectDescriptorFromFile(file) {
  try {
    const descriptorText = await file.text();
    const parsed = JSON.parse(descriptorText);
    const importedProject = normalizeProjectData(parsed);
    if (!importedProject) return null;
    upsertProjectInLibrary(importedProject, { makeActive: true });
    return importedProject;
  } catch {
    return null;
  }
}

async function readSourceFileFromDisk(file) {
  const sourceName = normalizeDiskImportPath(file?.name, "untitled");
  if (!isSupportedProjectFilePath(sourceName)) {
    return {
      ok: false,
      reason: "unsupported",
      path: sourceName
    };
  }
  let content = "";
  try {
    content = await file.text();
  } catch {
    return {
      ok: false,
      reason: "corrupted",
      path: sourceName
    };
  }
  const classification = classifyProjectFileContent(sourceName, content);
  if (!classification.ok) {
    return {
      ok: false,
      reason: classification.reason,
      path: sourceName
    };
  }
  return {
    ok: true,
    path: normalizeFilename(sourceName),
    source: content
  };
}

function buildAssemblyContext(options = {}) {
  const files = editor.getFiles();
  const activeByEditor = editor.getActiveFile() || files[0] || null;
  const normalizeAssemblyPath = (name) => String(name || "").replace(/\\/g, "/");
  const normalizeAssemblyKey = (name) => normalizeAssemblyPath(name).trim().toLowerCase();
  const getDirectoryName = (name) => {
    const normalized = normalizeAssemblyPath(name);
    const cut = normalized.lastIndexOf("/");
    return cut >= 0 ? normalized.slice(0, cut) : "";
  };
  const preferredFileId = String(options.preferredFileId || "").trim();
  const preferredSourceName = String(options.preferredSourceName || "").trim();
  let active = activeByEditor;
  if (preferredFileId) {
    active = files.find((file) => String(file?.id || "") === preferredFileId) || active;
  }
  if (preferredSourceName) {
    const preferredKey = normalizeAssemblyKey(preferredSourceName);
    active = files.find((file) => normalizeAssemblyKey(file?.name || "") === preferredKey) || active;
  }
  if (!active || !isAssemblySourceFile(active.name)) return null;
  const activeDirectory = getDirectoryName(active.name);
  const assemblyFiles = runtimeSettings.assembleAll
    ? files.filter((file) => (
        isAssemblySourceFile(file?.name || "")
        && getDirectoryName(file.name) === activeDirectory
      ))
    : [active];
  if (!assemblyFiles.length) return null;
  const includeMap = new Map();
  files.forEach((file) => {
    includeMap.set(file.name, file.source);
  });
  engine.setSourceFiles(includeMap);

  if (runtimeSettings.assembleAll) {
    const mergedSource = assemblyFiles
      .map((file) => `# -- file: ${file.name}\n${file.source}`)
      .join("\n\n");
    return {
      source: mergedSource,
      sourceName: active.name,
      includeMap,
      fileCount: assemblyFiles.length,
      activeFile: active,
      sourceFiles: assemblyFiles.map((file) => ({ ...file }))
    };
  }

  return {
    source: active.source,
    sourceName: active.name,
    includeMap,
    fileCount: 1,
    activeFile: active,
    sourceFiles: [{ ...active }]
  };
}

function assembleFromEditor(options = {}) {
  const assemblyContext = buildAssemblyContext(options);
  if (!assemblyContext) return { result: null, assemblyContext: null };
  const result = engine.assemble(assemblyContext.source, {
    sourceName: assemblyContext.sourceName,
    includeMap: assemblyContext.includeMap,
    programArgumentsEnabled: runtimeSettings.programArguments,
    programArguments: runtimeSettings.programArgumentsLine
  });
  return { result, assemblyContext };
}

function maybeAssembleAfterOpen() {
  const active = editor.getActiveFile();
  if (!active) return;
  if (isMiniCSourceFile(active.name)) {
    postMarsMessage("[mini-c] Auto-assemble skipped for C0 source. Use Compile C0.");
    return;
  }
  if (!isAssemblySourceFile(active.name)) return;
  if (store.getState().preferences.assembleOnOpen) {
    commands.assemble();
  }
}

function formatRuntimeAddress(address, addressHex, displayAddressesHex) {
  if (displayAddressesHex !== false) {
    if (typeof addressHex === "string" && addressHex.trim().length) return addressHex;
    return toHex(Number.isFinite(address) ? (address >>> 0) : 0);
  }
  return `${Number.isFinite(address) ? (address >>> 0) : 0}`;
}

function isMiniCSourceFile(fileName = "") {
  return miniCCompilerModule.isSourceFile(fileName);
}

function getActiveFileActionState() {
  const activeFile = editor.getActiveFile() || null;
  const classification = classifyWorkspaceFile(activeFile?.name || "");
  return {
    activeFile,
    classification,
    canAssemble: Boolean(activeFile && classification.isAssemblySource),
    canCompile: Boolean(activeFile && classification.isCSource),
    isCFamily: Boolean(activeFile && classification.isCFamily)
  };
}

function rememberSuccessfulAssemblyContext(assemblyContext) {
  if (!assemblyContext?.activeFile) return;
  lastSuccessfulAssemblyContext = {
    source: String(assemblyContext.source || ""),
    sourceName: String(assemblyContext.sourceName || assemblyContext.activeFile.name || ""),
    includeMapEntries: Array.from(assemblyContext.includeMap?.entries?.() ?? [])
      .map(([name, source]) => [String(name || ""), String(source || "")]),
    fileCount: Number(assemblyContext.fileCount || 0),
    activeFile: { ...assemblyContext.activeFile },
    sourceFiles: (Array.isArray(assemblyContext.sourceFiles) ? assemblyContext.sourceFiles : [])
      .map((file) => ({ ...file }))
  };
  lastSuccessfulAssemblySelection = {
    fileId: String(assemblyContext.activeFile.id || ""),
    sourceName: String(assemblyContext.sourceName || assemblyContext.activeFile.name || "")
  };
}

function buildLastSuccessfulAssemblyContext() {
  if (!lastSuccessfulAssemblyContext) return null;
  const includeMap = new Map(
    (Array.isArray(lastSuccessfulAssemblyContext.includeMapEntries) ? lastSuccessfulAssemblyContext.includeMapEntries : [])
      .map(([name, source]) => [String(name || ""), String(source || "")])
  );
  engine.setSourceFiles(includeMap);
  return {
    source: String(lastSuccessfulAssemblyContext.source || ""),
    sourceName: String(lastSuccessfulAssemblyContext.sourceName || ""),
    includeMap,
    fileCount: Number(lastSuccessfulAssemblyContext.fileCount || 0),
    activeFile: lastSuccessfulAssemblyContext.activeFile ? { ...lastSuccessfulAssemblyContext.activeFile } : null,
    sourceFiles: (Array.isArray(lastSuccessfulAssemblyContext.sourceFiles) ? lastSuccessfulAssemblyContext.sourceFiles : [])
      .map((file) => ({ ...file }))
  };
}

function deriveMiniCGeneratedAsmName(fileName = "untitled.c") {
  return String(miniCCompilerModule.deriveGeneratedAsmName(fileName) || "program.generated.s");
}

function normalizeMiniCIncludePath(pathValue = "") {
  const raw = String(pathValue || "").trim().replace(/\\/g, "/");
  if (!raw.length) return "";
  const parts = [];
  raw.split("/").forEach((segment) => {
    const part = String(segment || "").trim();
    if (!part || part === ".") return;
    if (part === "..") {
      if (parts.length) parts.pop();
      return;
    }
    parts.push(part);
  });
  return parts.join("/");
}

function miniCIncludeDirname(pathValue = "") {
  const normalized = normalizeMiniCIncludePath(pathValue);
  const splitIndex = normalized.lastIndexOf("/");
  return splitIndex >= 0 ? normalized.slice(0, splitIndex) : "";
}

function miniCIncludeJoin(baseDir = "", relativePath = "") {
  const base = normalizeMiniCIncludePath(baseDir);
  const rel = normalizeMiniCIncludePath(relativePath);
  if (!base) return rel;
  if (!rel) return base;
  return normalizeMiniCIncludePath(`${base}/${rel}`);
}

function normalizeMiniCLibraryIdentifier(value = "") {
  return normalizeMiniCIncludePath(value).toLowerCase();
}

function registerMiniCGlobalLibrarySource(identifier = "", sourceText = "") {
  const normalized = normalizeMiniCLibraryIdentifier(identifier);
  if (!normalized) return;
  const source = String(sourceText ?? "");
  const withoutExtension = normalized.replace(MINI_C_LIBRARY_EXTENSION_PATTERN, "");
  const leafWithExtension = normalized.split("/").pop() || "";
  const leaf = withoutExtension.split("/").pop() || "";
  if (normalized) miniCGlobalLibrarySources.set(normalized, source);
  if (withoutExtension) miniCGlobalLibrarySources.set(withoutExtension, source);
  if (leafWithExtension) miniCGlobalLibrarySources.set(leafWithExtension, source);
  if (leaf) miniCGlobalLibrarySources.set(leaf, source);
}

function resolveMiniCGlobalLibrarySource(aliasCandidates = []) {
  const seen = new Set();
  for (let index = 0; index < aliasCandidates.length; index += 1) {
    const raw = String(aliasCandidates[index] || "").trim();
    if (!raw) continue;
    const normalized = normalizeMiniCLibraryIdentifier(raw);
    if (!normalized) continue;
    const withoutExtension = normalized.replace(MINI_C_LIBRARY_EXTENSION_PATTERN, "");
    const leafWithExtension = normalized.split("/").pop() || "";
    const leaf = withoutExtension.split("/").pop() || "";
    const lookupKeys = [normalized, withoutExtension, leafWithExtension, leaf];
    for (let cursor = 0; cursor < lookupKeys.length; cursor += 1) {
      const key = String(lookupKeys[cursor] || "").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      if (!miniCGlobalLibrarySources.has(key)) continue;
      return String(miniCGlobalLibrarySources.get(key) || "");
    }
  }
  return null;
}

function normalizeMiniCGlobalLibraryManifestEntries(manifestPayload) {
  const entries = Array.isArray(manifestPayload)
    ? manifestPayload
    : (Array.isArray(manifestPayload?.libraries) ? manifestPayload.libraries : []);
  const normalizedEntries = [];
  const seen = new Set();

  entries.forEach((entry) => {
    const rawPath = typeof entry === "string"
      ? entry
      : String(entry?.path || entry?.file || entry?.name || "");
    let path = normalizeMiniCIncludePath(rawPath);
    if (!path) return;
    path = path.replace(/^(?:\.\/)+/, "");
    path = path.replace(/^libs?\//i, "");
    if (!MINI_C_LIBRARY_EXTENSION_PATTERN.test(path)) {
      path = `${path}.c0`;
    }
    const normalizedPath = normalizeMiniCLibraryIdentifier(path);
    if (!normalizedPath) return;

    const rawName = typeof entry === "object" && entry
      ? String(entry.name || "")
      : "";
    const fallbackName = normalizedPath.replace(MINI_C_LIBRARY_EXTENSION_PATTERN, "").split("/").pop() || "";
    const normalizedName = normalizeMiniCLibraryIdentifier(rawName || fallbackName).replace(MINI_C_LIBRARY_EXTENSION_PATTERN, "");
    const key = `${normalizedName}|${normalizedPath}`;
    if (seen.has(key)) return;
    seen.add(key);
    normalizedEntries.push({
      name: normalizedName || fallbackName,
      path: normalizedPath
    });
  });

  return normalizedEntries;
}

function invalidateMiniCGlobalLibrariesCache() {
  miniCGlobalLibrarySources.clear();
  miniCGlobalLibraryEntries = MINI_C_GLOBAL_LIBRARY_FALLBACK_ENTRIES.map((entry) => ({ ...entry }));
  miniCGlobalLibrariesReady = false;
  miniCGlobalLibrariesPromise = null;
}

async function ensureMiniCGlobalLibrariesLoaded(forceReload = false) {
  if (forceReload) invalidateMiniCGlobalLibrariesCache();
  if (miniCGlobalLibrariesReady) return miniCGlobalLibrarySources;
  if (miniCGlobalLibrariesPromise) return miniCGlobalLibrariesPromise;

  miniCGlobalLibrariesPromise = (async () => {
    let entries = [];
    try {
      const manifestText = await loadTextResource(MINI_C_GLOBAL_LIBRARIES_MANIFEST_PATH);
      const manifestPayload = JSON.parse(manifestText);
      entries = normalizeMiniCGlobalLibraryManifestEntries(manifestPayload);
    } catch {
      entries = [];
    }
    if (!entries.length) entries = MINI_C_GLOBAL_LIBRARY_FALLBACK_ENTRIES.map((entry) => ({ ...entry }));
    miniCGlobalLibraryEntries = entries.map((entry) => ({
      name: normalizeMiniCLibraryIdentifier(entry.name || "").replace(MINI_C_LIBRARY_EXTENSION_PATTERN, ""),
      path: normalizeMiniCLibraryIdentifier(entry.path || "")
    }));

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const relativePath = normalizeMiniCIncludePath(entry.path || "");
      if (!relativePath) continue;
      const resourcePath = `${MINI_C_GLOBAL_LIBRARIES_ROOT}/${relativePath}`;
      try {
        const source = await loadTextResource(resourcePath);
        registerMiniCGlobalLibrarySource(relativePath, source);
        registerMiniCGlobalLibrarySource(entry.name, source);
      } catch {
        // Keep fallback libraries available when server-side resources are missing.
      }
    }

    miniCGlobalLibrariesReady = true;
    return miniCGlobalLibrarySources;
  })().finally(() => {
    miniCGlobalLibrariesPromise = null;
  });

  return miniCGlobalLibrariesPromise;
}

function collectMiniCIncludeSourceMap() {
  const normalizedMap = new Map();
  const projectFiles = Array.isArray(projectState?.files) ? projectState.files : [];
  projectFiles.forEach((file, index) => {
    const key = normalizeMiniCIncludePath(
      normalizeProjectPath(file?.path || file?.name, `src/file_${index + 1}.s`)
    );
    if (!key) return;
    normalizedMap.set(key, String(file?.source ?? ""));
  });
  editor.getFiles().forEach((file) => {
    const key = normalizeMiniCIncludePath(file?.name || "");
    if (!key) return;
    normalizedMap.set(key, String(file?.source || ""));
  });
  return normalizedMap;
}

function buildMiniCUseLibrarySources(includeSourceMap = null, subset = "C1-NATIVE") {
  const sourceMap = includeSourceMap instanceof Map
    ? includeSourceMap
    : collectMiniCIncludeSourceMap();
  const librarySources = {};
  const setLibraryAlias = (alias, sourceText) => {
    const normalizedAlias = normalizeMiniCLibraryIdentifier(alias).replace(MINI_C_LIBRARY_EXTENSION_PATTERN, "");
    if (!normalizedAlias) return;
    const source = String(sourceText ?? "");
    librarySources[normalizedAlias] = source;
    const leaf = normalizedAlias.split("/").pop() || "";
    if (leaf) librarySources[leaf] = source;
  };

  sourceMap.forEach((sourceText, pathValue) => {
    const normalizedPath = normalizeMiniCIncludePath(pathValue || "");
    if (!/\.(h0|h|c0|c)$/i.test(normalizedPath)) return;
    const basePath = normalizedPath.replace(/\.(h0|h|c0|c)$/i, "");
    const fileName = basePath.split("/").pop() || "";
    const source = String(sourceText ?? "");
    if (basePath) setLibraryAlias(basePath, source);
    if (fileName) setLibraryAlias(fileName, source);
  });

  // Built-in fallback libraries keep priority over project/user sources when names collide.
  Object.keys(MINI_C_NATIVE_LIBRARY_SOURCES || {}).forEach((name) => {
    const key = String(name || "").trim().toLowerCase();
    if (!key) return;
    setLibraryAlias(key, MINI_C_NATIVE_LIBRARY_SOURCES[key]);
  });

  // Global libraries from ./libs override fallback implementations.
  miniCGlobalLibrarySources.forEach((sourceText, key) => {
    setLibraryAlias(key, sourceText);
  });

  if (isMiniCNativeSubset(subset) && miniCGlobalLibrarySources.has("string_native")) {
    const nativeStringSource = String(miniCGlobalLibrarySources.get("string_native") || "");
    setLibraryAlias("string", nativeStringSource);
    setLibraryAlias("string.h", nativeStringSource);
  }

  return librarySources;
}

function createMiniCIncludeResolver(sourceName = "", includeSourceMap = null) {
  const normalizedMap = includeSourceMap instanceof Map
    ? includeSourceMap
    : collectMiniCIncludeSourceMap();

  const readFromCandidates = (candidates = []) => {
    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = normalizeMiniCIncludePath(candidates[i]);
      if (!candidate) continue;
      if (!normalizedMap.has(candidate)) continue;
      return { sourceName: candidate, source: normalizedMap.get(candidate) };
    }
    return null;
  };

  const pathsByLeaf = new Map();
  normalizedMap.forEach((_source, key) => {
    const leaf = key.split("/").pop() || "";
    if (!leaf) return;
    const list = pathsByLeaf.get(leaf) || [];
    list.push(key);
    pathsByLeaf.set(leaf, list);
  });

  const readUniqueLeafCandidate = (leafCandidates = []) => {
    for (let i = 0; i < leafCandidates.length; i += 1) {
      const leaf = String(leafCandidates[i] || "").trim();
      if (!leaf) continue;
      const matches = pathsByLeaf.get(leaf) || [];
      if (matches.length !== 1) continue;
      const match = matches[0];
      if (!normalizedMap.has(match)) continue;
      return { sourceName: match, source: normalizedMap.get(match) };
    }
    return null;
  };

  const builtInLibraries = new Set(
    Object.keys(MINI_C_NATIVE_LIBRARY_SOURCES || {}).map((entry) => String(entry || "").trim().toLowerCase())
  );

  return ({ kind, target, fromSourceName }) => {
    const resolvedKind = String(kind || "").trim().toLowerCase();
    const normalizedTarget = normalizeMiniCIncludePath(target || "");
    if (!normalizedTarget) return null;
    const normalizedFrom = normalizeMiniCIncludePath(fromSourceName || sourceName || "");

    if (resolvedKind === "lib") {
      const libraryBase = normalizedTarget.replace(/\.(h0|h|c0|c)$/i, "").toLowerCase();
      const libSuffixes = [".h0", ".c0", ".h", ".c"];
      const libPrefixes = ["", "lib/", "libs/", "include/", "src/", "src/lib/", "src/libs/"];
      const libCandidates = [
        ...libSuffixes.map((suffix) => `${libraryBase}${suffix}`),
        ...libPrefixes.flatMap((prefix) => libSuffixes.map((suffix) => `${prefix}${libraryBase}${suffix}`))
      ];
      const resolved = readFromCandidates(libCandidates);
      if (resolved) return resolved;
      const leafResolved = readUniqueLeafCandidate(libSuffixes.map((suffix) => `${libraryBase}${suffix}`));
      if (leafResolved) return leafResolved;
      const globalSource = resolveMiniCGlobalLibrarySource([
        libraryBase,
        ...libCandidates
      ]);
      if (typeof globalSource === "string") {
        return {
          sourceName: `<${libraryBase}>`,
          source: globalSource
        };
      }
      if (builtInLibraries.has(libraryBase)) {
        return {
          sourceName: `<${libraryBase}>`,
          source: String(MINI_C_NATIVE_LIBRARY_SOURCES[libraryBase] || "")
        };
      }
      return null;
    }

    const fromDir = miniCIncludeDirname(normalizedFrom);
    const directCandidates = [normalizedTarget];
    if (fromDir) directCandidates.push(miniCIncludeJoin(fromDir, normalizedTarget));
    if (!/\.[a-z0-9]+$/i.test(normalizedTarget)) {
      const extensionCandidates = [".c0", ".c", ".h0", ".h"];
      extensionCandidates.forEach((suffix) => {
        directCandidates.push(`${normalizedTarget}${suffix}`);
        if (fromDir) directCandidates.push(miniCIncludeJoin(fromDir, `${normalizedTarget}${suffix}`));
      });
    }
    return readFromCandidates(directCandidates);
  };
}

function formatMiniCDiagnosticEntry(diagnostic, index = 0) {
  const isObjectDiagnostic = diagnostic && typeof diagnostic === "object";
  const line = Number.isFinite(diagnostic?.line) ? diagnostic.line : 0;
  const column = Number.isFinite(diagnostic?.column) ? diagnostic.column : 0;
  const phase = String(isObjectDiagnostic && diagnostic.phase ? diagnostic.phase : "mini-c");
  const message = typeof diagnostic === "string"
    ? diagnostic
    : String((isObjectDiagnostic && diagnostic.message) || "Unknown Mini-C compiler error.");
  const marker = `E${index + 1}`;
  const output = [];
  if (line > 0 && column > 0) output.push(`[${marker}] [${phase}] ${line}:${column} ${message}`);
  else if (line > 0) output.push(`[${marker}] [${phase}] ${line}:1 ${message}`);
  else output.push(`[${marker}] [${phase}] ${message}`);

  const suggestionValue = isObjectDiagnostic ? diagnostic.suggestion : null;
  if (suggestionValue && typeof suggestionValue === "object") {
    const suggestionCode = String(suggestionValue.code || "").trim();
    const suggestionMessage = String(suggestionValue.message || "").trim();
    const suggestionAction = String(suggestionValue.action || "").trim();
    if (suggestionCode || suggestionMessage) {
      const suggestionLabel = suggestionCode ? `suggestion[${suggestionCode}]` : "suggestion";
      output.push(`    ${suggestionLabel}: ${suggestionMessage || suggestionAction}`);
    }
    if (suggestionAction && suggestionAction !== suggestionMessage) {
      output.push(`    action: ${suggestionAction}`);
    }
  } else if (typeof suggestionValue === "string" && suggestionValue.trim().length) {
    output.push(`    suggestion: ${suggestionValue.trim()}`);
  }

  const snippet = isObjectDiagnostic && typeof diagnostic.snippet === "string"
    ? diagnostic.snippet
    : "";
  if (snippet.trim().length) {
    output.push("    snippet:");
    snippet.split("\n").forEach((lineText) => output.push(`      ${lineText}`));
  }

  return output.join("\n");
}

async function buildMiniCOutput(activeFile, sourceText, compilerPreferences) {
  const sourceName = String(activeFile?.name || "untitled.c");
  const source = String(sourceText || "");
  const targetAbi = String(compilerPreferences?.miniCTargetAbi || "o32").toLowerCase() === "o32" ? "o32" : "o32";
  const subset = normalizeMiniCSubsetPreferenceToken(compilerPreferences?.miniCSubset || "C1-NATIVE");
  const emitComments = compilerPreferences?.miniCEmitScaffoldingComments !== false;
  const generatedAsmName = deriveMiniCGeneratedAsmName(sourceName);

  let compileResult = null;
  try {
    await ensureMiniCGlobalLibrariesLoaded(true);
    const includeSourceMap = collectMiniCIncludeSourceMap();
    const includeResolver = createMiniCIncludeResolver(sourceName, includeSourceMap);
    const useLibrarySources = buildMiniCUseLibrarySources(includeSourceMap, subset);
    compileResult = miniCCompilerModule.compile(source, {
      sourceName,
      subset,
      targetAbi,
      emitComments,
      includeResolver,
      useLibrarySources
    });
  } catch (error) {
    const message = (error && typeof error === "object" && typeof error.message === "string")
      ? error.message
      : String(error || "Unknown Mini-C compiler error.");
    const diagnostic = { message, line: 0, column: 0, phase: "mini-c" };
    compileResult = {
      ok: false,
      sourceName,
      generatedAsmName,
      asm: "",
      subset,
      targetAbi,
      logs: [],
      warnings: [],
      errors: [diagnostic]
    };
  }

  const normalized = compileResult && typeof compileResult === "object" ? compileResult : {};
  const ok = normalized.ok === true;
  const warnings = Array.isArray(normalized.warnings) ? normalized.warnings : [];
  const errors = Array.isArray(normalized.errors) ? normalized.errors : [];
  const logLines = [];
  const logs = Array.isArray(normalized.logs) ? normalized.logs : [];

  logs.forEach((entry) => {
    const line = String(entry || "").trim();
    if (line) logLines.push(line);
  });

  if (warnings.length) {
    if (logLines.length) logLines.push("");
    logLines.push(`Warnings (${warnings.length}):`);
    warnings.forEach((warning, index) => {
      logLines.push(formatMiniCDiagnosticEntry(warning, index));
    });
  }

  if (errors.length) {
    if (logLines.length) logLines.push("");
    logLines.push(`Errors (${errors.length}):`);
    errors.forEach((error, index) => {
      logLines.push(formatMiniCDiagnosticEntry(error, index));
    });
  }

  if (!logLines.length) {
    logLines.push(ok ? "Mini-C compile succeeded." : "Mini-C compile failed.");
  }

  return {
    ok,
    sourceName: String(normalized.sourceName || sourceName),
    generatedAsmName: String(normalized.generatedAsmName || generatedAsmName),
    targetAbi: String(normalized.targetAbi || targetAbi),
    subset: String(normalized.subset || subset),
    asm: ok ? String(normalized.asm || "") : "",
    log: `${logLines.join("\n")}\n`,
    warnings,
    errors
  };
}

function writeMiniCCompilerOutput(logText = "", asmText = "") {
  if (refs.miniC?.log) refs.miniC.log.value = String(logText || "");
  if (refs.miniC?.asm) refs.miniC.asm.value = String(asmText || "");
  refs.tabs.miniC?.activate?.("panel-mini-c-log");
}

function resetMiniCOutputWindowChoice() {
  if (refs.miniC?.dontShowAgain) refs.miniC.dontShowAgain.checked = false;
}

function shouldDisableMiniCOutputWindowFromChoice() {
  return refs.miniC?.dontShowAgain?.checked === true;
}

function revealMiniCCompilerWindow() {
  resetMiniCOutputWindowChoice();
  const windowId = "window-mini-c";
  if (typeof windowManager.show === "function") windowManager.show(windowId);
  if (typeof windowManager.focus === "function") windowManager.focus(windowId);
}

function hideMiniCCompilerWindow(options = {}) {
  const persistChoice = options.persistChoice !== false;
  if (persistChoice && shouldDisableMiniCOutputWindowFromChoice()) {
    const currentPreferences = store.getState().preferences || preferences;
    if (currentPreferences.miniCOpenOutputWindow !== false) {
      applyPreferences({
        ...currentPreferences,
        miniCOpenOutputWindow: false
      });
    }
  }
  resetMiniCOutputWindowChoice();
  if (typeof windowManager.hide === "function") windowManager.hide("window-mini-c");
}

const commands = {
  newFile() {
    if (!projectIsOpen()) {
      void commands.newProject();
      return;
    }
    commands.newSFile();
  },

  async newProject() {
    if (runActive) stopRunLoop();
    const defaultName = normalizeProjectName(projectState?.name || "project");
    const rawName = await requestTextDialog("New Project", "Project name", defaultName, {
      confirmLabel: "Create",
      cancelLabel: "Cancel"
    });
    if (rawName == null) return;

    if (projectIsOpen()) {
      const dirtyFiles = editor.getDirtyFiles();
      const ok = await confirmCloseDirtyFiles(dirtyFiles, translateText("Create new project?"));
      if (!ok) return;
    }

    const requestedName = normalizeProjectName(rawName);
    const name = resolveUniqueProjectName(requestedName);
    const exportedLayout = typeof windowManager.exportSavedLayoutState === "function"
      ? normalizeWindowSessionData(windowManager.exportSavedLayoutState())
      : null;
    const desktopLayout = (
      exportedLayout && String(exportedLayout.layoutMode || "").toLowerCase() === "desktop"
    ) ? exportedLayout : null;
    const createdProject = createDefaultProjectData({
      name,
      files: [
        {
          id: "project-file-c0",
          path: "src/main.c",
          source: MINI_C_DEFAULT_TEMPLATE,
          savedSource: MINI_C_DEFAULT_TEMPLATE
        },
        {
          id: "project-file-asm",
          path: "src/main.s",
          source: INITIAL_SOURCE,
          savedSource: INITIAL_SOURCE
        }
      ],
      activeFileId: "project-file-c0",
      settings: {
        ...(store.getState().preferences || preferences)
      },
      layout: desktopLayout
    });
    const opened = openProjectWorkspace(createdProject, { applySettings: false, applyLayout: false });
    if (!opened) {
      postMarsMessage("[error] Failed to create project.");
      return;
    }
    modeController.setMode("c0");
    windowManager.focus("window-main");
    editor.focus();
    if (name !== requestedName) {
      postMarsMessage("[warn] Project name already exists. Created '{name}' instead.", { name: createdProject.rootPath });
    }
    postMarsMessage("Project created: {name}.", { name: createdProject.rootPath });
  },

  newSFile() {
    if (!ensureProjectOpenForAction("creating files")) return;
    if (runActive) stopRunLoop();
    const created = editor.createFile({
      name: "src/untitled.s",
      source: "# new MIPS file\n.text\nmain:\n"
    });
    if (!created) return;
    modeController.setMode("edit");
    windowManager.focus("window-editor");
    editor.focus();
    postMarsMessage("New source buffer created: {name}.", { name: created.name });
    syncProjectFromEditor(true);
    scheduleProjectPersist({ syncFromEditor: true });
  },

  newC0File() {
    if (!ensureProjectOpenForAction("creating files")) return;
    if (runActive) stopRunLoop();
    const created = editor.createFile({
      name: "src/untitled.c",
      source: MINI_C_DEFAULT_TEMPLATE
    });
    if (!created) return;
    modeController.setMode("edit");
    windowManager.focus("window-editor");
    editor.focus();
    postMarsMessage("New C0 source buffer created: {name}.", { name: created.name });
    syncProjectFromEditor(true);
    scheduleProjectPersist({ syncFromEditor: true });
  },

  openFileFromDisk() {
    if (runActive) stopRunLoop();
    fileInput.value = "";
    fileInput.click();
  },

  async openFileFromBrowserStorage() {
    if (runActive) stopRunLoop();
    const selection = await browserStorageManager.openForLoad();
    if (!selection?.file) return;
    const path = normalizeDiskImportPath(selection.file.name, "untitled.s");
    const classification = classifyProjectFileContent(path, selection.file.source);
    if (!classification.ok) {
      await showUnsupportedProjectFileDialog(path, classification.reason);
      postMarsMessage("[warn] Skipped unsupported file '{name}'.", { name: path });
      return;
    }
    ensureProjectForIncomingFiles("project");
    const opened = editor.openFile(path, selection.file.source, true);
    if (!opened) return;
    modeController.syncForFileName?.(opened?.name || path, { activate: true });
    windowManager.focus("window-main");
    editor.focus();
    postMarsMessage("Opened '{name}' from browser storage.", { name: opened.name });
    syncProjectFromEditor(true);
    scheduleProjectPersist({ syncFromEditor: true });
    maybeAssembleAfterOpen();
  },

  openFile() {
    if (runActive) stopRunLoop();
    fileInput.value = "";
    fileInput.click();
  },

  async cloudRefreshSession() {
    await refreshCloudSession({
      silent: false,
      syncProjects: true,
      postSyncStatus: true,
      syncReason: "session refresh"
    });
  },

  async cloudLogin() {
    if (cloudAuthState === "authenticated" && cloudUser) {
      postMarsMessage("Cloud session ready: {name}.", { name: getCloudUserDisplayName(cloudUser) });
      return true;
    }
    return openCloudLoginDialog();
  },

  async cloudRegister() {
    if (cloudAuthState === "authenticated" && cloudUser) {
      postMarsMessage("[info] Cloud session already active: {name}.", { name: getCloudUserDisplayName(cloudUser) });
      return true;
    }
    return openCloudRegisterDialog();
  },

  async cloudLogout() {
    if (cloudAuthState !== "authenticated") {
      postMarsMessage("[info] Cloud session is not signed in.");
      return true;
    }
    try {
      await cloudRequestJson("/logout", { method: "POST", body: {} });
      setCloudSessionState("anonymous", null, "");
      postMarsMessage("Cloud logout complete.");
      return true;
    } catch (error) {
      const message = describeCloudError(error, "Cloud logout failed.");
      setCloudSessionState("error", null, message);
      postMarsMessage("[error] Cloud logout failed: {message}", { message });
      return false;
    }
  },

  async cloudOpenProject() {
    return openProjectFromCloud();
  },

  async cloudSaveProject() {
    return commands.saveProjectWorkspace();
  },

  async cloudSyncAllProjects() {
    return syncAllProjectsWithCloud();
  },

  async closeFile() {
    if (runActive) stopRunLoop();
    const active = editor.getActiveFile();
    if (!active) return;
    if (active && editor.isActiveDirty()) {
      const ok = await confirmCloseDirtyFiles([active], translateText("Close '{name}'?", { name: active.name }));
      if (!ok) return;
    }

    const result = editor.closeActive();
    if (!result) return;
    modeController.setMode("edit");
    windowManager.focus("window-editor");
    editor.focus();
    postMarsMessage("Closed '{name}'.", { name: result.closed.name });
    syncProjectFromEditor(true);
    scheduleProjectPersist({ syncFromEditor: projectIsOpen() });
  },

  async closeAllFiles() {
    if (!ensureProjectOpenForAction("closing files")) return;
    if (runActive) stopRunLoop();
    const dirtyFiles = editor.getDirtyFiles();
    const ok = await confirmCloseDirtyFiles(dirtyFiles, translateText("Close all files?"));
    if (!ok) return;

    const result = editor.closeAll();
    modeController.setMode("edit");
    windowManager.focus("window-editor");
    editor.focus();
    postMarsMessage("Closed {count} file(s).", { count: result.closedCount });
    syncProjectFromEditor(true);
    scheduleProjectPersist({ syncFromEditor: true });
  },

  async closeProject() {
    if (runActive) stopRunLoop();
    const closed = await closeProjectWorkspace();
    if (!closed) return;
    postMarsMessage("Project closed.");
  },

  saveFileToDisk() {
    const active = editor.getActiveFile();
    if (!active) return;
    downloadText(normalizeFilename(active.name), active.source);
    editor.markActiveSaved();
    postMarsMessage("Saved '{name}'.", { name: normalizeFilename(active.name) });
  },

  async saveFileToDiskAs() {
    const active = editor.getActiveFile();
    if (!active) return;

    const candidate = await requestTextDialog("Save as", "Save as", normalizeFilename(active.name), {
      confirmLabel: "Save",
      cancelLabel: "Cancel"
    });
    if (candidate == null) return;

    const fileName = normalizeFilename(candidate);
    const renamed = editor.renameActive(fileName);
    const target = renamed ?? editor.getActiveFile();
    if (!target) return;
    downloadText(target.name, target.source);
    editor.markActiveSaved();
    postMarsMessage("Saved as '{name}'.", { name: target.name });
  },

  saveFile() {
    const active = editor.getActiveFile();
    if (!active) return;
    if (active.readOnly === true) {
      postMarsMessage("[warn] Read-only files cannot be saved.");
      return;
    }

    const localProjectSave = persistOpenProjectLocally();
    if (!localProjectSave.ok) return;

    const browserResult = saveActiveFileToBrowser(active);
    if (!browserResult.ok) {
      if (browserResult.reason === "quota") {
        postMarsMessage("[warn] Browser storage limit exceeded: {used}/{limit}.", {
          used: formatStoredSourceUsage(browserResult.usageBytes),
          limit: formatStoredSourceUsage(browserResult.maxBytes)
        });
        return;
      }
      postMarsMessage("[error] Failed to save to browser storage.");
      return;
    }

    editor.markActiveSaved();
    if (projectIsOpen()) {
      void saveActiveProjectToCloud({ silentSuccess: true }).then((result) => {
        if (result?.ok) {
          postMarsMessage("Saved active file '{name}' ({used}/{limit}) and synced project '{project}'.", {
            name: browserResult.file.name,
            used: formatStoredSourceUsage(browserResult.usageBytes),
            limit: formatStoredSourceUsage(browserResult.maxBytes),
            project: projectState.rootPath
          });
          return;
        }
        postMarsMessage("[warn] Active file '{name}' was saved locally, but cloud sync is pending.", {
          name: browserResult.file.name
        });
      });
      return;
    }

    postMarsMessage("Saved active file '{name}' to browser storage ({used}/{limit}).", {
      name: browserResult.file.name,
      used: formatStoredSourceUsage(browserResult.usageBytes),
      limit: formatStoredSourceUsage(browserResult.maxBytes)
    });
  },

  async saveProjectWorkspace() {
    if (!ensureProjectOpenForAction("saving the project")) return { ok: false, cancelled: true };
    const localProjectSave = persistOpenProjectLocally();
    if (!localProjectSave.ok) return { ok: false, message: "quota" };
    editor.markProjectOwnedSaved?.();
    const cloudResult = await saveActiveProjectToCloud({ silentSuccess: true });
    if (cloudResult?.ok) {
      postMarsMessage("Project saved: {name}.", { name: projectState.rootPath });
      return { ok: true, name: projectState.rootPath };
    }
    postMarsMessage("[warn] Project '{name}' was saved locally, but cloud sync is pending.", {
      name: projectState.rootPath
    });
    return { ok: false, message: cloudResult?.message || "cloud" };
  },

  saveFileToBrowserStorage() {
    return commands.saveFile();
  },

  async saveFileToBrowserStorageAs() {
    return commands.saveProjectWorkspace();
  },

  saveFileAs() {
    return commands.saveFileToDiskAs();
  },

  dumpRunIo() {
    downloadText("run-io.txt", refs.messages.run.value || refs.messages.run.textContent || "");
    postMarsMessage("Run I/O dumped to file.");
  },

  assemble() {
    const actionState = getActiveFileActionState();
    if (runActive || runPausedForInput) return;
    if (actionState.activeFile && isMiniCSourceFile(actionState.activeFile.name)) {
      postMarsMessage("[warn] Active file appears to be C0. Use Compile C0 before Assemble.");
      return;
    }

    const assemblyContext = buildAssemblyContext();
    if (!assemblyContext) {
      postMarsMessage("[warn] Open an assembly source (.s/.asm/.mips) before assembling.");
      refreshRuntimeControls();
      return;
    }

    modeController.setMode("execute");
    clearRunTimer();
    runActive = false;
    runStopRequested = false;
    runLastTickAt = 0;
    runStepCarry = 0;
    runLastUiSyncAt = 0;
    backstepDepthEstimate = 0;
    clearInputPauseState();
    windowManager.focus("window-text"); windowManager.focus("window-data");
    postMarsSystemLine("{action}: assembling {sources}", {
      action: translateText("Assemble"),
      sources: describeAssemblySources(assemblyContext)
    });
    const result = engine.assemble(assemblyContext.source, {
      sourceName: assemblyContext.sourceName,
      includeMap: assemblyContext.includeMap,
      programArgumentsEnabled: runtimeSettings.programArguments,
      programArguments: runtimeSettings.programArgumentsLine
    });
    reportDiagnostics(result, assemblyContext);

    if (!result.ok) {
      setAssemblyTag("error", "assembly failed");
      postMarsSystemLine("{action}: operation completed with errors.", { action: translateText("Assemble") });
    } else {
      rememberSuccessfulAssemblyContext(assemblyContext);
      postMarsSystemLine("{action}: operation completed successfully.", { action: translateText("Assemble") });
    }

    restoredBackstepFallbackActive = false;
    syncSnapshot(engine.getSnapshot());
  },
  async compileC0() {
    try {
      if (runActive || runPausedForInput) return;
      const active = editor.getActiveFile();
      if (!active) {
        postMarsMessage("[warn] No active source file.");
        return;
      }
      if (!isMiniCSourceFile(active.name)) {
        postMarsMessage("[warn] Active file is not a C0 source (.c/.c0): {name}.", {
          name: active.name
        });
        postMarsMessage("Use 'New C0 File' or open a .c/.c0 file before compiling.");
        return;
      }

      const source = String(active.source || "");
      if (!source.trim()) {
        postMarsMessage("[warn] C0 source is empty.");
        return;
      }

      const currentPreferences = store.getState().preferences || preferences;
      const output = await buildMiniCOutput(active, source, currentPreferences);
      miniCCompilerState.lastSourceName = output.sourceName;
      miniCCompilerState.lastGeneratedAsmName = output.generatedAsmName;
      miniCCompilerState.lastGeneratedAsm = output.asm;
      miniCCompilerState.lastCompilerLog = output.log;
      miniCCompilerState.lastCompiledAt = Date.now();
      writeMiniCCompilerOutput(output.log, output.asm);

      if (currentPreferences.miniCOpenOutputWindow !== false || output.ok !== true) {
        revealMiniCCompilerWindow();
      }

      if (output.ok !== true) {
        const errorCount = Array.isArray(output.errors) ? output.errors.length : 1;
        postMarsMessage("Compile C0 failed: {count} error(s).", { count: errorCount });
        postMarsMessage("[mini-c] Compilation failed for '{name}'.", { name: output.sourceName });
        (output.errors || []).slice(0, 8).forEach((diagnostic, index) => {
          postMarsMessage("[mini-c] {entry}", { entry: formatMiniCDiagnosticEntry(diagnostic, index) });
        });
        return;
      }

      postMarsMessage("Compile C0: output generated as '{name}'.", { name: output.generatedAsmName });
      postMarsMessage("[mini-c] {source} -> {target} ({subset}/{abi})", {
        source: output.sourceName,
        target: output.generatedAsmName,
        subset: output.subset,
        abi: output.targetAbi.toUpperCase()
      });
      if (Array.isArray(output.warnings) && output.warnings.length) {
        postMarsMessage("[mini-c] Compilation finished with {count} warning(s).", {
          count: output.warnings.length
        });
      }
      if (currentPreferences.miniCOpenOutputWindow === false) {
        commands.openMiniCAsmAsFile({ closeMiniCWindow: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || "Unknown compile error.");
      postMarsMessage("[error] Compile C0 failed unexpectedly: {message}", { message });
    }
  },
  step() {
    modeController.setMode("execute");
    windowManager.focus("window-text"); windowManager.focus("window-data");
    const snapshot = engine.getSnapshot();
    if (!snapshot.assembled) {
      postMarsMessage("The program must be assembled before it can be run.");
      return;
    }
    if (snapshot.halted) {
      postMarsMessage("You must reset before you can execute the program again.");
      return;
    }
    messagesPane.selectRunTab?.();
    const result = engine.step();
    if (!result.ok) {
      postExecutionError(translateText("Step"), result.message);
      return;
    }

    if (result.runIo && result.message) {
      messagesPane.postRun(result.message, { translate: false });
    }
    if (result.waitingForInput) {
      runPausedForInput = true;
      resumeRunAfterInput = false;
    } else {
      clearInputPauseState();
      incrementBackstepEstimate(1);
    }
    scheduleRuntimeControlRecovery();
    restoredBackstepFallbackActive = false;
    const nextSnapshot = resolveStableRuntimeSnapshot(result.snapshot, { expectBackstep: true });
    syncSnapshot(nextSnapshot, {
      force: result.runIo === true || result.waitingForInput === true
    });
    refreshRuntimeControls(nextSnapshot);
    updateBackstepButtonImmediate(getBackstepHistoryLimit() > 0 && clampBackstepEstimate(backstepDepthEstimate) > 0);

    if (result.waitingForInput) {
      messagesPane.focusRunInput();
      return;
    }
    if (result.done) {
      if (result.exception) {
        postExecutionError(translateText("Step"), result.message);
      } else {
        postExecutionSuccess(translateText("Step"), result.haltReason || "exit");
      }
    }
  },  go() {
    modeController.setMode("execute");
    windowManager.focus("window-text"); windowManager.focus("window-data");
    if (runActive) return;
    const snapshot = engine.getSnapshot();
    if (!snapshot.assembled) {
      postMarsMessage("The program must be assembled before it can be run.");
      return;
    }
    if (snapshot.halted) {
      postMarsMessage("You must reset before you can execute the program again.");
      return;
    }
    clearInputPauseState();
    runStopRequested = false;
    runActive = true;
    restoredBackstepFallbackActive = false;
    runLastTickAt = performance.now();
    runStepCarry = 0;
    runLastUiSyncAt = 0;
    forceMachineStateCheckpoint();
    syncButtons(snapshot);
    updateNoInteractionUiMode();
    postMarsSystemLine("{action}: running {name}", {
      action: translateText("Go"),
      name: getCurrentProgramName()
    }, { activate: false });
    messagesPane.selectRunTab?.();
    runLoopTick();
  },
  pause() {
    if (!runActive) {
      postMarsMessage("[warn] Runtime is not running.");
      return;
    }
    clearRunTimer();
    runActive = false;
    runStopRequested = false;
    runLastTickAt = 0;
    runStepCarry = 0;
    runLastUiSyncAt = 0;
    clearInputPauseState();
    syncSnapshot(engine.getSnapshot(), { force: true });
    postMarsSystemLine("{action}: execution paused by user: {name}", {
      action: translateText("Go"),
      name: getCurrentProgramName()
    });
    messagesPane.selectMarsTab?.();
  },
  stop() {
    if (runActive) {
      runStopRequested = true;
      return;
    }

    const snapshot = engine.getSnapshot();
    if (!snapshot.assembled) {
      postMarsMessage("[warn] No assembled program to stop.");
      return;
    }

    const result = typeof engine.stop === "function" ? engine.stop() : null;
    clearInputPauseState();
    const nextSnapshot = resolveStableRuntimeSnapshot(result?.snapshot);
    syncSnapshot(nextSnapshot, { force: true });
    refreshRuntimeControls(nextSnapshot);
    postMarsSystemLine("{action}: execution terminated by user.", { action: translateText("Go") });
    messagesPane.selectMarsTab?.();
  },
  backstep() {
    modeController.setMode("execute");
    clearRunTimer();
    runActive = false;
    runStopRequested = false;
    runLastTickAt = 0;
    runStepCarry = 0;
    runLastUiSyncAt = 0;
    clearInputPauseState();
    windowManager.focus("window-text"); windowManager.focus("window-data");
    const snapshot = engine.getSnapshot();
    if (!snapshot.assembled || !Array.isArray(snapshot?.textRows) || snapshot.textRows.length === 0) {
      refreshRuntimeControls(snapshot);
      return;
    }
    const result = engine.backstep();
    if (!result.ok) {
      backstepDepthEstimate = 0;
      scheduleRuntimeControlRecovery();
      refreshRuntimeControls(snapshot);
      postMarsMessage("[warn] {message}", { message: result.message });
      return;
    }
    decrementBackstepEstimate(1);
    scheduleRuntimeControlRecovery();
    const nextSnapshot = resolveStableRuntimeSnapshot(result.snapshot);
    syncSnapshot(nextSnapshot);
    refreshRuntimeControls(nextSnapshot);
    updateBackstepButtonImmediate(hasAvailableBackstep(nextSnapshot));
  },
  reset() {
    modeController.setMode("execute");
    clearRunTimer();
    runActive = false;
    runStopRequested = false;
    runLastTickAt = 0;
    runStepCarry = 0;
    runLastUiSyncAt = 0;
    backstepDepthEstimate = 0;
    clearInputPauseState();
    engine.reset();
    messagesPane.clearInputRequest();

    let assemblyContext = buildLastSuccessfulAssemblyContext();
    let assembleResult = null;
    if (assemblyContext) {
      assembleResult = engine.assemble(assemblyContext.source, {
        sourceName: assemblyContext.sourceName,
        includeMap: assemblyContext.includeMap,
        programArgumentsEnabled: runtimeSettings.programArguments,
        programArguments: runtimeSettings.programArgumentsLine
      });
    } else {
      const activeFile = editor.getActiveFile();
      const preferredAssemblyTarget = (activeFile && isAssemblySourceFile(activeFile.name))
        ? {
            preferredFileId: String(activeFile.id || ""),
            preferredSourceName: String(activeFile.name || "")
          }
        : lastSuccessfulAssemblySelection;
      ({ result: assembleResult, assemblyContext } = assembleFromEditor(preferredAssemblyTarget));
    }
    if (assemblyContext && assembleResult) {
      reportDiagnostics(assembleResult, assemblyContext);
      if (!assembleResult.ok) {
        postMarsRaw("Unable to reset.  Please close file then re-open and re-assemble.\n");
      } else {
        rememberSuccessfulAssemblyContext(assemblyContext);
        postRunSystemLine("{action}: reset completed.", { action: translateText("Reset") });
        messagesPane.selectRunTab?.();
      }
    }

    restoredBackstepFallbackActive = false;
    syncSnapshot(engine.getSnapshot());
  },
  undo() {
    modeController.setMode("edit");
    if (editor.undo()) editor.focus();
  },
  redo() {
    modeController.setMode("edit");
    if (editor.redo()) editor.focus();
  },
  cut() { refs.editor.focus(); document.execCommand("cut"); },
  copy() { refs.editor.focus(); document.execCommand("copy"); },
  paste() { refs.editor.focus(); document.execCommand("paste"); },

  selectAll() {
    refs.editor.focus();
    refs.editor.select();
  },
  openMiniCAsmAsFile(options = {}) {
    const asm = String(miniCCompilerState.lastGeneratedAsm || "").trim();
    if (!asm) {
      postMarsMessage("[warn] No generated Mini-C output to open.");
      return;
    }
    ensureProjectForIncomingFiles("project");
    const fileName = miniCCompilerState.lastGeneratedAsmName || "program.generated.s";
    const opened = editor.openFile(fileName, `${miniCCompilerState.lastGeneratedAsm}`, true);
    if (!opened) return;
    modeController.setMode("edit");
    windowManager.focus("window-editor");
    editor.focus();
    if (options.closeMiniCWindow !== false) hideMiniCCompilerWindow();
    postMarsMessage("Opened generated ASM as '{name}'.", { name: opened.name });
    syncProjectFromEditor(true);
    scheduleProjectPersist({ syncFromEditor: true });
  },
  async copyMiniCAsm() {
    const asm = String(miniCCompilerState.lastGeneratedAsm || "");
    if (!asm.trim()) {
      postMarsMessage("[warn] No generated Mini-C output to copy.");
      return;
    }
    let copied = false;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(asm);
        copied = true;
      }
    } catch {
      copied = false;
    }
    if (!copied && refs.miniC?.asm) {
      refs.miniC.asm.focus();
      refs.miniC.asm.select();
      copied = document.execCommand("copy") === true;
    }
    if (copied) postMarsMessage("Generated ASM copied to clipboard.");
    else postMarsMessage("[warn] Could not copy generated ASM to clipboard.");
  },
  clearMiniCOutput() {
    miniCCompilerState.lastSourceName = "";
    miniCCompilerState.lastGeneratedAsmName = "";
    miniCCompilerState.lastGeneratedAsm = "";
    miniCCompilerState.lastCompilerLog = "";
    miniCCompilerState.lastCompiledAt = 0;
    writeMiniCCompilerOutput("", "");
    postMarsMessage("Mini-C output cleared.");
  },
  async find() {
    const query = await requestTextDialog("Find", "Find text", "");
    if (!query) return;

    const source = store.getState().sourceCode;
    const start = refs.editor.selectionEnd ?? 0;
    let idx = source.indexOf(query, start);
    if (idx < 0) idx = source.indexOf(query);

    if (idx < 0) {
      postMarsMessage("[warn] '{query}' not found.", { query });
      return;
    }

    refs.editor.focus();
    refs.editor.setSelectionRange(idx, idx + query.length);
    postMarsMessage("Found '{query}' at offset {offset}.", { query, offset: idx });
  },
  toggleShowLabelsWindow() { togglePreference("showLabelsWindow", "Show Labels Window (symbol table)"); },
  async toggleProgramArguments() {
    const current = store.getState().preferences;
    if (current.programArguments) {
      updatePreferencesPatch({
        programArguments: false
      }, translateText("Setting updated: {label} = {value}.", {
        label: translateText("Program arguments provided to MIPS program"),
        value: false
      }));
      return;
    }

    const args = await requestTextDialog(
      "Program Arguments",
      "Program arguments provided to MIPS program",
      current.programArgumentsText || "",
      {
        placeholder: translateText("arg1 arg2 \"arg with spaces\"")
      }
    );
    if (args == null) return;

    updatePreferencesPatch({
      programArguments: true,
      programArgumentsText: String(args)
    });
    postMarsMessage("Program arguments enabled: {args}.", {
      args: String(args || "").trim() || '""'
    });
  },
  togglePopupSyscallInput() { togglePreference("popupSyscallInput", "Popup dialog for input syscalls"); },
  toggleSplitMessagesRunIo() { togglePreference("splitMessagesRunIo", "Separate Mars Messages from Run I/O"); },
  toggleAddressDisplayBase() { togglePreference("displayAddressesHex", "Addresses displayed in hexadecimal"); },
  toggleValueDisplayBase() { togglePreference("displayValuesHex", "Values displayed in hexadecimal"); },
  toggleAssembleOnOpen() { togglePreference("assembleOnOpen", "Assemble file upon opening"); },
  toggleAssembleAll() { togglePreference("assembleAll", "Assemble all files in directory"); },
  toggleWarningsAreErrors() { togglePreference("warningsAreErrors", "Assembler warnings are considered errors"); },
  toggleStartAtMain() { togglePreference("startAtMain", "Initialize Program Counter to global 'main' if defined"); },
  toggleExtendedAssembler() { togglePreference("extendedAssembler", "Permit extended (pseudo) instructions and formats"); },
  toggleDelayedBranching() { togglePreference("delayedBranching", "Delayed branching"); },
  toggleStrictMarsCompatibility() { togglePreference("strictMarsCompatibility", "Strict MARS 4.5 compatibility mode"); },
  toggleSelfModifyingCode() { togglePreference("selfModifyingCode", "Self-modifying code"); },
  toggleMiniCOutputWindow() { togglePreference("miniCOpenOutputWindow", "Open Mini-C output window after compile"); },
  showCloudServerPreferences() { openCloudServerPreferencesDialog(); },
  async clearLocalData() {
    const confirmed = await requestConfirmDialog(
      "Reset Local Data",
      translateText("Delete localStorage data and loaded states, then restart with a clean default project?"),
      {
        confirmLabel: "Delete and Restart",
        cancelLabel: "Cancel"
      }
    );
    if (!confirmed) return;

    clearRunTimer();
    runActive = false;
    runStopRequested = false;
    runPausedForInput = false;
    resumeRunAfterInput = false;
    messagesPane.clearInputRequest();

    enterResetReloadMode();
    const removedCount = clearRecoverableLocalStorageData();
    postMarsMessage("Cleared local data entries: {count}. Restarting...", { count: removedCount });
    markSkipStartupRecoveryPromptOnce();
    window.setTimeout(() => {
      window.location.reload();
    }, 40);
  },
  async manageProjectStates() {
    if (!ensureProjectOpenForAction("managing state slots")) return;
    const slotOptions = Array.from({ length: PROJECT_STATE_SLOT_COUNT }, (_entry, index) => {
      const slot = projectState.states?.[index];
      const label = slot?.label ? `#${index + 1} - ${slot.label}` : `#${index + 1}`;
      return {
        value: String(index + 1),
        label
      };
    });
    const result = await runDialogForm({
      title: translateText("Store/Load state"),
      message: translateText("Manage up to 5 saved state slots for this project."),
      confirmLabel: translateText("Apply"),
      cancelLabel: translateText("Cancel"),
      width: "500px",
      height: "330px",
      sections: [
        {
          title: translateText("Action"),
          fields: [
            {
              name: "action",
              label: translateText("Action"),
              type: "select",
              value: "store",
              options: [
                { value: "store", label: translateText("Store") },
                { value: "load", label: translateText("Load") }
              ]
            },
            {
              name: "slot",
              label: translateText("Slot"),
              type: "select",
              value: "1",
              options: slotOptions
            },
            {
              name: "label",
              label: translateText("Label"),
              type: "text",
              value: ""
            }
          ]
        }
      ]
    }, {
      windowIdPrefix: "window-project-states",
      left: "230px",
      top: "130px",
      width: "500px",
      height: "330px"
    });
    if (!result?.ok) return;

    const values = result.value || {};
    const action = String(values.action || "store").trim().toLowerCase() === "load" ? "load" : "store";
    const parsedSlot = Number.parseInt(String(values.slot || "1"), 10);
    const slotIndex = Math.max(0, Math.min(PROJECT_STATE_SLOT_COUNT - 1, (Number.isFinite(parsedSlot) ? parsedSlot : 1) - 1));
    if (action === "store") {
      const snapshot = buildProjectStateSnapshot();
      if (!snapshot) {
        postMarsMessage("[warn] Failed to capture project state.");
        return;
      }
      const rawLabel = String(values.label || "").trim();
      const label = rawLabel || new Date().toLocaleString();
      if (!Array.isArray(projectState.states)) {
        projectState.states = Array.from({ length: PROJECT_STATE_SLOT_COUNT }, () => null);
      }
      projectState.states[slotIndex] = {
        label,
        savedAt: Date.now(),
        snapshot
      };
      persistProjectNow({ syncFromEditor: true });
      postMarsMessage("State stored in slot {slot}.", { slot: slotIndex + 1 });
      return;
    }

    const slot = Array.isArray(projectState.states) ? projectState.states[slotIndex] : null;
    if (!slot || !slot.snapshot) {
      postMarsMessage("[warn] Slot {slot} is empty.", { slot: slotIndex + 1 });
      return;
    }
    const loaded = applyProjectStateSnapshot(slot.snapshot);
    if (!loaded) {
      postMarsMessage("[error] Failed to load slot {slot}.", { slot: slotIndex + 1 });
      return;
    }
    postMarsMessage("State loaded from slot {slot}.", { slot: slotIndex + 1 });
  },
  resetLayout() {
    if (typeof windowManager.resetBaseLayoutToDefault !== "function") return;
    windowManager.resetBaseLayoutToDefault();
    postMarsMessage("Layout reset to default.");
    scheduleWorkspacePersist();
    scheduleProjectPersist({ syncFromEditor: false });
  },
  saveLayout() {
    if (typeof windowManager.saveLayoutToStorage !== "function") return;
    const result = windowManager.saveLayoutToStorage();
    if (!result?.saved || !result.snapshot) {
      postMarsMessage("[error] Failed to save layout.");
      return;
    }
    postMarsMessage("Layout saved ({count} window(s)).", {
      count: Array.isArray(result.snapshot.windows) ? result.snapshot.windows.length : 0
    });
    scheduleWorkspacePersist();
    scheduleProjectPersist({ syncFromEditor: false });
  },
  loadLayout() {
    const supportsLoad = typeof windowManager.loadLayoutFromStorage === "function";
    const supportsApply = typeof windowManager.applySavedLayoutState === "function";
    if (!supportsLoad || !supportsApply) return;

    const loaded = windowManager.loadLayoutFromStorage({
      skipLayoutRefresh: true,
      skipDesktopPersist: true
    });
    if (!loaded?.loaded || !loaded.snapshot) {
      if (typeof windowManager.resetBaseLayoutToDefault === "function") {
        windowManager.resetBaseLayoutToDefault();
      }
      postMarsMessage("[warn] No saved layout found. Default layout loaded.");
      scheduleWorkspacePersist();
      scheduleProjectPersist({ syncFromEditor: false });
      return;
    }

    const toolIdsToRestore = Array.from(new Set(
      loaded.snapshot.windows
        .filter((entry) => entry && typeof entry === "object" && entry.hidden !== true)
        .map((entry) => String(entry.toolId || "").trim())
        .filter(Boolean)
    ));
    toolIdsToRestore.forEach((toolId) => toolManager.open(toolId));

    windowManager.applySavedLayoutState(loaded.snapshot, {
      skipLayoutRefresh: false,
      skipDesktopPersist: true
    });
    if (toolIdsToRestore.length) {
      window.setTimeout(() => {
        windowManager.applySavedLayoutState(loaded.snapshot, {
          skipLayoutRefresh: false,
          skipDesktopPersist: true
        });
        persistWorkspaceSession();
      }, 420);
    }

    postMarsMessage("Saved layout loaded ({count} window(s)).", {
      count: Array.isArray(loaded.snapshot.windows) ? loaded.snapshot.windows.length : 0
    });
    scheduleWorkspacePersist();
    scheduleProjectPersist({ syncFromEditor: false });
  },

  showInterfacePreferences() { openInterfacePreferencesPanel(); },
  showRuntimeMemoryPreferences() { openRuntimeMemoryPreferencesPanel(); },
  showMiniCCompilerPreferences() { openMiniCCompilerPreferencesPanel(); },
  showLanguagePreferences() { openLanguagePreferencesDialog(); },
  showEditorPreferences() { openEditorPreferencesDialog(); },
  showHighlightingPreferences() { openHighlightingPreferencesDialog(); },
  showExceptionHandlerPreferences() { openExceptionHandlerPreferencesDialog(); },
  showMemoryConfigurationPreferences() { openMemoryConfigurationPreferencesDialog(); },
  showMemoryUsagePreferences() { openMemoryUsagePreferencesDialog(); },

  openTool(toolId) { toolManager.open(toolId); },
  revealWindow(windowId, toolId = "") {
    const windowIdText = String(windowId || "").trim();
    const toolIdText = String(toolId || "").trim();
    if (toolIdText) toolManager.open(toolIdText);
    const revealOptions = { show: true, scroll: true, behavior: "smooth" };
    const revealed = typeof windowManager.reveal === "function"
      ? windowManager.reveal(windowIdText, revealOptions)
      : false;

    if (revealed) return;
    if (!windowIdText) return;

    if (typeof windowManager.show === "function") windowManager.show(windowIdText);
    if (typeof windowManager.focus === "function") windowManager.focus(windowIdText);

    const node = document.getElementById(windowIdText);
    const stacked = refs.root?.classList?.contains("desktop-stacked") === true
      || refs.windows?.desktop?.classList?.contains("desktop-stacked") === true;
    if (stacked && node instanceof HTMLElement) {
      node.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
    }
  },
  getViewMenuItems() {
    const entries = typeof windowManager.getWindowEntries === "function"
      ? windowManager.getWindowEntries()
      : [];
    const actions = [
      { label: "Reset layout", command: "resetLayout" },
      { label: "Save layout", command: "saveLayout" },
      { label: "Load layout", command: "loadLayout" }
    ];
    if (!entries.length) return actions;

    const nativeOrder = ["window-main", "window-messages", "window-registers", "window-project"];
    const alwaysHiddenIds = new Set(["window-help-doc"]);

    const listedEntries = entries.filter((entry) => {
      if (!entry || alwaysHiddenIds.has(String(entry.id || ""))) return false;
      if (nativeOrder.includes(String(entry.id || ""))) return true;
      // For non-base windows, list only when they are actually open.
      return entry.hidden !== true;
    });
    if (!listedEntries.length) return actions;

    const fixedOrder = ["window-browser-storage", "window-help", "window-help-about"];

    const score = (entry) => {
      const nativeIndex = nativeOrder.indexOf(entry.id);
      if (nativeIndex >= 0) return nativeIndex;
      const fixedIndex = fixedOrder.indexOf(entry.id);
      if (fixedIndex >= 0) return 10 + fixedIndex;
      if (entry.kind === "tool") return 30;
      return 20;
    };

    const sorted = [...listedEntries].sort((a, b) => {
      const scoreDelta = score(a) - score(b);
      if (scoreDelta !== 0) return scoreDelta;
      return String(a.title || a.id).localeCompare(String(b.title || b.id));
    });

    const windowItems = sorted.map((entry) => ({
      label: entry.title || entry.id,
      command: () => commands.revealWindow(entry.id, entry.toolId || ""),
      check: () => entry.hidden !== true
    }));
    return [...actions, "-", ...windowItems];
  },

  getExampleMenuItems() {
    const categoryOrder = [
      ...EXAMPLE_CATEGORY_ORDER,
      ...runtimeExampleFiles
        .map((example) => example.category)
        .filter((category, index, values) => category && !EXAMPLE_CATEGORY_ORDER.includes(category) && values.indexOf(category) === index)
    ];

    return categoryOrder
      .map((category) => {
        const items = runtimeExampleFiles
          .filter((example) => example.category === category)
          .map((example) => ({
            label: example.label,
            command: () => commands.openExample(example)
          }));
        if (!items.length) return null;
        return {
          label: category,
          submenu: items
        };
      })
      .filter(Boolean);
  },

  async openExample(example) {
    if (runActive) stopRunLoop();
    try {
      ensureProjectForIncomingFiles("project");
      const variant = await loadLocalizedExample(example);
      const files = Array.isArray(variant?.files) ? variant.files : [];
      const mainFile = files.find((file) => file.main) || files[0];
      if (!mainFile) throw new Error(translateText("Failed to load file."));
      const openedFiles = files.map((file) => editor.openFile(file.name, file.source, file === mainFile)).filter(Boolean);
      const opened = openedFiles.find((file) => file.name === mainFile.name) || openedFiles[0];
      if (!opened) throw new Error(translateText("Browser storage limit exceeded: {used}/{limit}.", {
        used: formatStoredSourceUsage(computeProjectLibraryUsageBytes(projectLibraryState)),
        limit: formatStoredSourceUsage(ONLINE_SOURCE_MAX_BYTES)
      }));
      modeController.syncForFileName?.(opened?.name || mainFile.name, { activate: true });
      windowManager.focus("window-editor");
      editor.focus();
      postMarsMessage("Opened example '{name}'.", { name: opened.name });
      syncProjectFromEditor(true);
      scheduleProjectPersist({ syncFromEditor: true });
      maybeAssembleAfterOpen();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      postMarsMessage("[error] Failed to open example '{label}': {message}", {
        label: example.label,
        message
      });
    }
  },

  helpHub() { helpSystem.open("mips", "basic"); },
  helpIntro() { helpSystem.open("mars", "intro"); },
  helpIde() { helpSystem.open("mars", "ide"); },
  helpSyscalls() { helpSystem.open("mips", "syscalls"); },
  helpLicense() { helpSystem.open("license", "main"); },
  helpBugs() { helpSystem.open("bugs", "main"); },
  helpAcknowledgements() { helpSystem.open("ack", "main"); },
  helpSong() { helpSystem.open("song", "main"); },
  helpMipsPdf() { helpSystem.openDocument("./help/mipsref.pdf", "MIPS Reference PDF"); },
  helpAbout() { helpSystem.openAbout(); }
};

const editorTabContextMenu = document.createElement("div");
editorTabContextMenu.className = "menu-popup editor-tab-context-menu hidden";
document.body.appendChild(editorTabContextMenu);
let editorTabContextFileId = "";

function hideEditorTabContextMenu() {
  editorTabContextFileId = "";
  editorTabContextMenu.classList.add("hidden");
  editorTabContextMenu.innerHTML = "";
}

function positionEditorTabContextMenu(clientX = 0, clientY = 0) {
  editorTabContextMenu.style.left = `${Math.max(4, Math.round(Number(clientX) || 0))}px`;
  editorTabContextMenu.style.top = `${Math.max(4, Math.round(Number(clientY) || 0))}px`;
  const rect = editorTabContextMenu.getBoundingClientRect();
  if (rect.right > window.innerWidth - 4) {
    editorTabContextMenu.style.left = `${Math.max(4, Math.round(window.innerWidth - rect.width - 4))}px`;
  }
  if (rect.bottom > window.innerHeight - 4) {
    editorTabContextMenu.style.top = `${Math.max(4, Math.round(window.innerHeight - rect.height - 4))}px`;
  }
}

function getEditorTabContextState(fileId = "") {
  const normalizedFileId = String(fileId || "").trim();
  const files = editor.getFiles();
  const file = files.find((entry) => String(entry?.id || "") === normalizedFileId) || null;
  const dirty = Boolean(file && String(file.source ?? "") !== String(file.savedSource ?? ""));
  const readOnly = file?.readOnly === true;
  const canSave = Boolean(file && !readOnly && dirty);
  return {
    file,
    dirty,
    readOnly,
    canClose: Boolean(file),
    canSave,
    canSaveAndClose: canSave
  };
}

function activateEditorTabContextFile(fileId = "") {
  const normalizedFileId = String(fileId || "").trim();
  if (!normalizedFileId) return editor.getActiveFile() || null;
  const active = editor.activateFile(normalizedFileId) || editor.getActiveFile() || null;
  modeController.syncForFileName?.(active?.name || "", { activate: true });
  return active;
}

async function runEditorTabContextCommand(action = "close") {
  const state = getEditorTabContextState(editorTabContextFileId);
  hideEditorTabContextMenu();
  if (!state.file) return;
  activateEditorTabContextFile(state.file.id);

  if (action === "save") {
    if (!state.canSave) return;
    commands.saveFile();
    return;
  }

  if (action === "saveAndClose") {
    if (!state.canSaveAndClose) return;
    commands.saveFile();
    await commands.closeFile();
    return;
  }

  if (state.canClose) {
    await commands.closeFile();
  }
}

function renderEditorTabContextMenu(fileId = "") {
  const state = getEditorTabContextState(fileId);
  if (!state.file) {
    hideEditorTabContextMenu();
    return false;
  }

  editorTabContextFileId = state.file.id;
  editorTabContextMenu.innerHTML = "";
  const items = [
    { label: "Close", action: "close", enabled: state.canClose },
    { label: "Save", action: "save", enabled: state.canSave },
    { label: "Save and Close", action: "saveAndClose", enabled: state.canSaveAndClose }
  ];

  items.forEach((item) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "menu-row";
    row.innerHTML = `<span class="menu-check"></span><span>${escapeHtml(translateText(item.label))}</span><span class="menu-shortcut"></span><span class="menu-arrow"></span>`;
    if (!item.enabled) {
      row.classList.add("disabled");
      row.disabled = true;
    } else {
      row.addEventListener("click", () => {
        void runEditorTabContextCommand(item.action);
      });
    }
    editorTabContextMenu.appendChild(row);
  });

  editorTabContextMenu.classList.remove("hidden");
  return true;
}

const menuSystem = createMenuSystem(refs, commands, () => store.getState(), toolManager);
refs.editorTabs?.addEventListener("contextmenu", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const tab = target.closest("[data-file-id]");
  if (!(tab instanceof HTMLElement)) return;
  const fileId = String(tab.dataset.fileId || "").trim();
  if (!fileId) return;
  event.preventDefault();
  activateEditorTabContextFile(fileId);
  if (!renderEditorTabContextMenu(fileId)) return;
  positionEditorTabContextMenu(event.clientX, event.clientY);
});
refs.editorTabs?.addEventListener("click", () => {
  hideEditorTabContextMenu();
});
document.addEventListener("mousedown", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && (editorTabContextMenu.contains(target) || refs.editorTabs?.contains(target))) return;
  hideEditorTabContextMenu();
});
document.addEventListener("scroll", () => {
  hideEditorTabContextMenu();
}, true);
window.addEventListener("resize", () => {
  hideEditorTabContextMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideEditorTabContextMenu();
});
void refreshCloudSession({ silent: true });
getI18nApi()?.subscribe?.(() => {
  refs.refreshTranslations?.();
  messagesPane.refreshTranslations?.();
  editor.refreshStatus?.();
  transientDialogSystems.forEach((dialog) => dialog.refreshTranslations?.());
  helpSystem.refreshTranslations?.();
  browserStorageManager.refreshTranslations?.();
  updateRunSpeedLabel();
  menuSystem.hide();
  previousSnapshot = null;
  syncSnapshot(engine.getSnapshot(), { suppressPulse: true });
});

function persistWorkspaceSession() {
  if (suppressPersistenceForResetReload) return;
  try {
    const files = editor.getFiles();
    if (!Array.isArray(files) || !files.length) return;
    const active = editor.getActiveFile() || files[0];
    const basePayload = {
      version: SESSION_SCHEMA_VERSION,
      updatedAt: Date.now(),
      activeFileId: active.id,
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        source: file.source,
        savedSource: typeof file.savedSource === "string" ? file.savedSource : file.source,
        readOnly: file?.readOnly === true,
        projectOwned: file?.projectOwned !== false,
        sourceKind: String(file?.sourceKind || ""),
        sourceProjectRootPath: String(file?.sourceProjectRootPath || ""),
        sourceProjectPath: String(file?.sourceProjectPath || file?.name || ""),
        originKey: String(file?.originKey || "")
      })),
      windowState: typeof windowManager.exportSessionWindowState === "function"
        ? windowManager.exportSessionWindowState()
        : null
    };

    const candidates = [basePayload];

    for (let i = 0; i < candidates.length; i += 1) {
      const payload = candidates[i];
      const serialized = JSON.stringify(payload);
      if (serialized.length > SESSION_STORAGE_TARGET_MAX_CHARS) continue;
      try {
        window.localStorage.setItem(SESSION_STORAGE_KEY, serialized);
        window.localStorage.setItem(SESSION_SERVER_DRAFT_KEY, JSON.stringify(buildServerDraftPayload(payload)));
        return;
      } catch {
        // Try the next smaller candidate.
      }
    }
  } catch {
    // Ignore storage issues.
  }
}

if (typeof window !== "undefined") {
  window.WebMarsSessionServerBridge = {
    exportDraft() {
      persistWorkspaceSession();
      try {
        const raw = window.localStorage.getItem(SESSION_SERVER_DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    async testUpload(url = `${resolveCloudApiBase()}/webmars/session`) {
      const draft = this.exportDraft();
      if (!draft) {
        return { ok: false, status: 0, message: "No session draft available." };
      }
      try {
        const response = await fetch(String(url), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft)
        });
        return {
          ok: response.ok,
          status: response.status,
          message: response.ok ? "Upload accepted." : `Upload failed: HTTP ${response.status}.`
        };
      } catch (error) {
        return {
          ok: false,
          status: 0,
          message: error instanceof Error ? error.message : String(error)
        };
      }
    }
  };
  window.WebMarsCloudBridge = {
    getState() {
      return buildCloudStoreState();
    },
    async refreshSession() {
      return refreshCloudSession({ silent: false });
    },
    async saveActiveProject() {
      return saveActiveProjectToCloud();
    },
    async syncAllProjects() {
      return syncAllProjectsWithCloud();
    }
  };
}

function scheduleWorkspacePersist() {
  if (suppressPersistenceForResetReload) return;
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistWorkspaceSession();
  }, SESSION_PERSIST_DEBOUNCE_MS);
}

store.subscribe((state) => {
  if (state.files === lastTrackedFilesRef && state.activeFileId === lastTrackedActiveId && state.sourceCode === lastTrackedSource) return;
  lastTrackedFilesRef = state.files;
  lastTrackedActiveId = state.activeFileId;
  lastTrackedSource = state.sourceCode;
  scheduleWorkspacePersist();

  const nextSignature = getProjectTreePathSignature(
    (Array.isArray(state.files) ? state.files : [])
      .map((file) => ({ path: String(file?.name || ""), updatedAt: 0 }))
  );
  const nextActivePath = String(state.fileName || "");
  const structureChanged = nextSignature !== lastObservedProjectFileSignature
    || nextActivePath !== lastObservedProjectActivePath;
  lastObservedProjectFileSignature = nextSignature;
  lastObservedProjectActivePath = nextActivePath;

  if (projectIsOpen()) {
    if (structureChanged) {
      syncProjectFromEditor(true);
    }
    scheduleProjectPersist({ syncFromEditor: true });
  } else {
    if (!structureChanged) return;
    renderProjectTree(true);
    scheduleProjectPersist({ syncFromEditor: false });
  }
});

refs.buttons.newFile.addEventListener("click", commands.newFile);
refs.buttons.open.addEventListener("click", commands.openFile);
refs.buttons.save.addEventListener("click", commands.saveFile);
refs.buttons.undo.addEventListener("click", commands.undo);
refs.buttons.redo.addEventListener("click", commands.redo);
refs.buttons.assemble.addEventListener("click", commands.assemble);
if (refs.buttons.compileC0) refs.buttons.compileC0.addEventListener("click", () => { void commands.compileC0(); });
refs.buttons.go.addEventListener("click", commands.go);
refs.buttons.step.addEventListener("click", commands.step);
refs.buttons.backstep.addEventListener("click", commands.backstep);
refs.buttons.reset.addEventListener("click", commands.reset);
refs.buttons.pause.addEventListener("click", commands.pause);
refs.buttons.stop.addEventListener("click", commands.stop);
if (refs.miniC?.close) refs.miniC.close.addEventListener("click", () => { hideMiniCCompilerWindow(); });
if (refs.miniC?.openAsm) refs.miniC.openAsm.addEventListener("click", commands.openMiniCAsmAsFile);
if (refs.miniC?.copyAsm) refs.miniC.copyAsm.addEventListener("click", () => { void commands.copyMiniCAsm(); });
if (refs.miniC?.clear) refs.miniC.clear.addEventListener("click", commands.clearMiniCOutput);

refs.controls.runSpeedSlider.addEventListener("input", updateRunSpeedLabel);
refs.controls.runSpeedSlider.addEventListener("change", updateRunSpeedLabel);
if (refs.controls.runSpeedSelectMobile) {
  refs.controls.runSpeedSelectMobile.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    setRunSpeedIndex(target.value);
    updateRunSpeedLabel();
  });
}

fileInput.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.files || !target.files.length) return;

  const files = [...target.files];
  const descriptorFiles = files.filter((file) => /\.p$/i.test(String(file?.name || "").trim()));
  if (files.length === 1 && descriptorFiles.length === 1) {
    const importedProject = await loadProjectDescriptorFromFile(descriptorFiles[0]);
    if (!importedProject) {
      await showUnsupportedProjectFileDialog(String(descriptorFiles[0]?.name || "project.p"), "corrupted");
      postMarsMessage("[warn] Failed to load project descriptor '{name}'.", { name: descriptorFiles[0].name });
      target.value = "";
      return;
    }
    const opened = openProjectWorkspace(importedProject, {
      applySettings: true,
      applyLayout: true
    });
    if (opened) {
      postMarsMessage("Project loaded: {name}.", { name: importedProject.rootPath });
      target.value = "";
      return;
    }
    postMarsMessage("[warn] Failed to load project descriptor '{name}'.", { name: descriptorFiles[0].name });
    target.value = "";
    return;
  }
  if (descriptorFiles.length > 0) {
    postMarsMessage("[warn] Ignored {count} project descriptor file(s). Open .p files separately.", {
      count: descriptorFiles.length
    });
  }

  const sourceCandidates = files.filter((file) => !/\.p$/i.test(String(file?.name || "").trim()));
  const acceptedSources = [];
  for (let index = 0; index < sourceCandidates.length; index += 1) {
    const file = sourceCandidates[index];
    const result = await readSourceFileFromDisk(file);
    if (!result.ok) {
      await showUnsupportedProjectFileDialog(result.path || file.name, result.reason);
      postMarsMessage("[warn] Skipped unsupported file '{name}'.", { name: result.path || file.name });
      continue;
    }
    acceptedSources.push(result);
  }
  if (!acceptedSources.length) {
    target.value = "";
    renderProjectTree(true);
    return;
  }

  ensureProjectForIncomingFiles("project");
  for (let index = 0; index < acceptedSources.length; index += 1) {
    const sourceFile = acceptedSources[index];
    const activate = index === acceptedSources.length - 1;
    const opened = editor.openFile(sourceFile.path, sourceFile.source, activate);
    if (!opened) break;
    postMarsMessage("Opened '{name}'.", { name: sourceFile.path });
  }

  modeController.syncForFileName?.(editor.getActiveFile()?.name || "", { activate: true });
  windowManager.focus("window-main");
  editor.focus();
  syncProjectFromEditor(true);
  scheduleProjectPersist({ syncFromEditor: true });
  if (store.getState().preferences.assembleOnOpen) maybeAssembleAfterOpen();
  target.value = "";
});
executePane.onToggleBreakpoint((address) => {
  const enabled = engine.toggleBreakpoint(address);
  postMarsMessage("Breakpoint {state}: {address}.", {
    state: translateText(enabled ? "added" : "removed"),
    address: toHex(address)
  });
  syncSnapshot(engine.getSnapshot());
});
registersPane.onToggleCop1Flag((flagIndex, flagValue) => {
  if (runActive) return;
  const index = Number(flagIndex) | 0;
  if (index < 0 || index > 7) return;
  const value = flagValue ? 1 : 0;

  let updated = false;
  if (typeof engine.setConditionFlag === "function") {
    try {
      engine.setConditionFlag(index, value);
      updated = true;
    } catch {
      updated = false;
    }
  }

  if (!updated && typeof engine.exportNativeState === "function" && typeof engine.importNativeState === "function") {
    try {
      const state = engine.exportNativeState({
        includeProgram: false,
        includeExecutionPlan: false,
        includeBreakpoints: true
      });
      if (state && typeof state === "object") {
        const nextFlags = Array.isArray(state.fpuFlags) ? state.fpuFlags.slice(0, 8) : Array.from({ length: 8 }, () => 0);
        while (nextFlags.length < 8) nextFlags.push(0);
        nextFlags[index] = value;
        state.fpuFlags = nextFlags;
        engine.importNativeState(state, { preserveHistory: true, preserveExecutionHistory: true });
        updated = true;
      }
    } catch {
      updated = false;
    }
  }

  if (!updated) return;
  postMarsMessage("COP1 condition flag {index} set to {value}.", {
    index,
    value
  });
  syncSnapshot(engine.getSnapshot());
});

window.addEventListener("keydown", async (event) => {
  if (event.ctrlKey || event.metaKey) {
    const key = event.key.toLowerCase();
    if (key === "n") { event.preventDefault(); void commands.newFile(); }
    if (key === "o") { event.preventDefault(); void commands.openFile(); }
    if (key === "w") { event.preventDefault(); void commands.closeFile(); }
    if (key === "s" && event.shiftKey) { event.preventDefault(); void commands.saveFileAs(); }
    if (key === "s" && !event.shiftKey) { event.preventDefault(); void commands.saveFile(); }
    if (key === "f") { event.preventDefault(); void commands.find(); }
    if (key === "a") { event.preventDefault(); void commands.selectAll(); }
    if (key === "z" && !event.shiftKey) { event.preventDefault(); void commands.undo(); }
    if (key === "y" || (key === "z" && event.shiftKey)) { event.preventDefault(); void commands.redo(); }
    if (key === "r") {
      event.preventDefault();
      const dirtyFiles = editor.getDirtyFiles();
      const ok = await confirmCloseDirtyFiles(dirtyFiles, translateText("Reload page?"));
      if (!ok) return;
      allowPageUnload = true;
      window.location.reload();
      return;
    }
  }

  if (event.key === "F1") { event.preventDefault(); void commands.helpHub(); }
  if (event.key === "F3") { event.preventDefault(); void commands.assemble(); }
  if (event.key === "F4") { event.preventDefault(); void commands.compileC0(); }
  if (event.key === "F5") { event.preventDefault(); void commands.go(); }
  if (event.key === "F7") { event.preventDefault(); void commands.step(); }
  if (event.key === "Escape") {
    menuSystem.hide();
  }
});

function handleBeforeUnload(event) {
  if (suppressPersistenceForResetReload || allowPageUnload) return;
  persistWorkspaceSession();
  if (!editor.hasDirtyFiles()) return;
  event.preventDefault();
  event.returnValue = "";
}

function handlePageHidePersist() {
  if (suppressPersistenceForResetReload || allowPageUnload) return;
  persistWorkspaceSession();
}

function handleVisibilityPersist() {
  if (document.visibilityState !== "hidden") return;
  if (suppressPersistenceForResetReload || allowPageUnload) return;
  persistWorkspaceSession();
}

function handlePeriodicPersist() {
  if (suppressPersistenceForResetReload || allowPageUnload) return;
  persistWorkspaceSession();
}

window.addEventListener("beforeunload", handleBeforeUnload);
window.onbeforeunload = handleBeforeUnload;
window.addEventListener("pagehide", handlePageHidePersist);
document.addEventListener("visibilitychange", handleVisibilityPersist);
window.setInterval(() => {
  handlePeriodicPersist();
}, SESSION_PERSIST_INTERVAL_MS);

const startupPreferences = (
  projectIsOpen()
  && projectState.settings
  && typeof projectState.settings === "object"
  && Object.keys(projectState.settings).length
)
  ? { ...preferences, ...projectState.settings }
  : preferences;
if (startupPreferences !== preferences) {
  applyPreferences(startupPreferences);
} else {
  applyUiPreferences(preferences);
}
updateRunSpeedLabel();
if (!restoredSession && !projectIsOpen()) {
  editor.setSource(INITIAL_SOURCE);
} else {
  editor.refreshView?.();
  if (restoredSession?.files?.length) {
    postMarsMessage("Workspace restored ({count} file(s)).", { count: restoredSession.files.length });
  } else if (projectIsOpen()) {
    postMarsMessage("Project loaded: {name}.", { name: projectState.rootPath });
  }
}

const restoredWindowState = normalizeWindowSessionData(restoredSession?.windowState);
if (restoredWindowState && typeof windowManager.applySessionWindowState === "function") {
  windowManager.applySessionWindowState(restoredWindowState);
  postMarsMessage("Tool windows restored ({count} state entry(ies)).", {
    count: restoredWindowState.windows.length
  });
  const restoredHelpWindow = restoredWindowState.windows.find((entry) => (
    entry
    && typeof entry === "object"
    && entry.hidden !== true
    && String(entry.id || "") === "window-help"
  ));
  if (restoredHelpWindow) {
    helpSystem.open();
  }
  const restoredAboutWindow = restoredWindowState.windows.find((entry) => (
    entry
    && typeof entry === "object"
    && entry.hidden !== true
    && String(entry.id || "") === "window-help-about"
  ));
  if (restoredAboutWindow) {
    helpSystem.openAbout();
  }
  const toolIdsToRestore = Array.from(new Set(
    restoredWindowState.windows
      .filter((entry) => entry && typeof entry === "object" && entry.hidden !== true)
      .map((entry) => String(entry.toolId || "").trim())
      .filter(Boolean)
  ));
  toolIdsToRestore.forEach((toolId) => {
    toolManager.open(toolId);
  });
  if (toolIdsToRestore.length) {
    window.setTimeout(() => {
      windowManager.applySessionWindowState(restoredWindowState);
      persistWorkspaceSession();
    }, 420);
  }
}

const startupSavedLayout = typeof windowManager.loadLayoutFromStorage === "function"
  ? windowManager.loadLayoutFromStorage({
      skipLayoutRefresh: true,
      skipDesktopPersist: true
    })
  : { loaded: false, snapshot: null };
if (startupSavedLayout?.loaded && startupSavedLayout.snapshot && typeof windowManager.applySavedLayoutState === "function") {
  const toolIdsToRestoreFromLayout = Array.from(new Set(
    startupSavedLayout.snapshot.windows
      .filter((entry) => entry && typeof entry === "object" && entry.hidden !== true)
      .map((entry) => String(entry.toolId || "").trim())
      .filter(Boolean)
  ));
  toolIdsToRestoreFromLayout.forEach((toolId) => {
    toolManager.open(toolId);
  });
  windowManager.applySavedLayoutState(startupSavedLayout.snapshot, {
    skipLayoutRefresh: false,
    skipDesktopPersist: true
  });
  if (toolIdsToRestoreFromLayout.length) {
    window.setTimeout(() => {
      windowManager.applySavedLayoutState(startupSavedLayout.snapshot, {
        skipLayoutRefresh: false,
        skipDesktopPersist: true
      });
      persistWorkspaceSession();
    }, 420);
  }
  postMarsMessage("Saved layout loaded ({count} window(s)).", {
    count: Array.isArray(startupSavedLayout.snapshot.windows) ? startupSavedLayout.snapshot.windows.length : 0
  });
} else if (projectState?.layout && typeof windowManager.applySavedLayoutState === "function") {
  const toolIdsToRestoreFromProjectLayout = extractVisibleToolIds(projectState.layout);
  toolIdsToRestoreFromProjectLayout.forEach((toolId) => {
    toolManager.open(toolId);
  });
  windowManager.applySavedLayoutState(projectState.layout, {
    skipLayoutRefresh: false,
    skipDesktopPersist: true
  });
  if (toolIdsToRestoreFromProjectLayout.length) {
    window.setTimeout(() => {
      windowManager.applySavedLayoutState(projectState.layout, {
        skipLayoutRefresh: false,
        skipDesktopPersist: true
      });
      persistWorkspaceSession();
    }, 420);
  }
  postMarsMessage("Project layout loaded ({count} window(s)).", {
    count: Array.isArray(projectState.layout.windows) ? projectState.layout.windows.length : 0
  });
}

resetMachineSessionTracking();
modeController.setMode(projectIsOpen() ? "edit" : "project");
syncSnapshot(engine.getSnapshot());
if (restoredSession && store.getState().preferences.assembleOnOpen) {
  maybeAssembleAfterOpen();
}
persistWorkspaceSession();
persistProjectNow({ syncFromEditor: projectIsOpen() });
showAboutOnFirstVisit();
if (typeof window !== "undefined") {
  window.__webMarsRuntimeReady = true;
  try {
    window.dispatchEvent(new CustomEvent("webmars:ready"));
  } catch {
    window.dispatchEvent(new Event("webmars:ready"));
  }
  window.setTimeout(() => {
    void promptStartupRecoveryChoiceIfNeeded();
  }, 0);
}

if (typeof window !== "undefined") {
  window.WebMarsRuntimeDebug = {
    getSnapshot(options = {}) {
      return engine.getSnapshot(options);
    },
    readByte(address) {
      try {
        return engine.readByte(Number(address) >>> 0, false) & 0xff;
      } catch {
        return null;
      }
    },
    readWord(address) {
      try {
        return engine.readWord(Number(address) >>> 0) | 0;
      } catch {
        return null;
      }
    },
    getBackendInfo() {
      return typeof engine.getBackendInfo === "function" ? engine.getBackendInfo() : null;
    },
    getBackendSelection() {
      const currentPreferences = store.getState().preferences || {};
      return {
        assemblerBackendMode: sanitizeBackendMode(currentPreferences.assemblerBackendMode, DEFAULT_BACKEND_MODE),
        simulatorBackendMode: sanitizeBackendMode(currentPreferences.simulatorBackendMode, DEFAULT_BACKEND_MODE)
      };
    },
    setBackendSelection(nextModes = {}) {
      const currentPreferences = store.getState().preferences || {};
      const nextPreferences = {
        ...currentPreferences,
        assemblerBackendMode: sanitizeBackendMode(nextModes.assemblerBackendMode, currentPreferences.assemblerBackendMode || DEFAULT_BACKEND_MODE),
        simulatorBackendMode: sanitizeBackendMode(nextModes.simulatorBackendMode, currentPreferences.simulatorBackendMode || DEFAULT_BACKEND_MODE)
      };
      applyPreferences(nextPreferences);
      return {
        selection: this.getBackendSelection(),
        backend: this.getBackendInfo()
      };
    },
    getPreferences() {
      return { ...(store.getState().preferences || {}) };
    },
    setPreferences(patch = {}) {
      const currentPreferences = store.getState().preferences || {};
      const nextPreferences = { ...currentPreferences, ...(patch && typeof patch === "object" ? patch : {}) };
      applyPreferences(nextPreferences);
      return { ...(store.getState().preferences || {}) };
    },
    getWindowState(windowId = "window-mini-c") {
      const element = document.getElementById(String(windowId || ""));
      return {
        id: String(windowId || ""),
        exists: element instanceof HTMLElement,
        hidden: element instanceof HTMLElement ? element.classList.contains("window-hidden") : true
      };
    },
    getButtonState() {
      return {
        compileDisabled: refs.buttons.compileC0?.disabled === true,
        assembleDisabled: refs.buttons.assemble?.disabled === true,
        goDisabled: refs.buttons.go?.disabled === true,
        stepDisabled: refs.buttons.step?.disabled === true,
        backstepDisabled: refs.buttons.backstep?.disabled === true,
        resetDisabled: refs.buttons.reset?.disabled === true,
        pauseDisabled: refs.buttons.pause?.disabled === true,
        stopDisabled: refs.buttons.stop?.disabled === true
      };
    },
    getRunFlags() {
      return {
        runActive,
        runPausedForInput,
        resumeRunAfterInput
      };
    },
    getControlInputs() {
      const snapshot = engine.getSnapshot();
      const assembled = snapshot?.assembled === true;
      const halted = snapshot?.halted === true;
      const hasProgramRows = Array.isArray(snapshot?.textRows) && snapshot.textRows.length > 0;
      const runBusy = runActive || runPausedForInput;
      const canExecute = assembled && hasProgramRows && !halted;
      const canBackstep = hasAvailableBackstep(snapshot);
      return {
        assembled,
        halted,
        hasProgramRows,
        runBusy,
        canAssemble: getActiveFileActionState().canAssemble,
        canCompile: getActiveFileActionState().canCompile,
        canExecute,
        canBackstep,
        backstepDepth: Number(snapshot?.backstepDepth) || 0
      };
    },
    getControlDomState() {
      const liveBackstep = document.getElementById("btn-backstep");
      const livePause = document.getElementById("btn-pause");
      const liveStop = document.getElementById("btn-stop");
      return {
        backstepCount: document.querySelectorAll("#btn-backstep").length,
        pauseCount: document.querySelectorAll("#btn-pause").length,
        stopCount: document.querySelectorAll("#btn-stop").length,
        refBackstepDisabled: refs.buttons.backstep?.disabled === true,
        liveBackstepDisabled: liveBackstep?.disabled === true,
        refBackstepConnected: refs.buttons.backstep?.isConnected === true,
        liveBackstepConnected: liveBackstep?.isConnected === true,
        sameBackstepNode: liveBackstep === refs.buttons.backstep,
        refPauseDisabled: refs.buttons.pause?.disabled === true,
        livePauseDisabled: livePause?.disabled === true,
        samePauseNode: livePause === refs.buttons.pause,
        refStopDisabled: refs.buttons.stop?.disabled === true,
        liveStopDisabled: liveStop?.disabled === true,
        sameStopNode: liveStop === refs.buttons.stop
      };
    },
    getLastControlSyncDebug() {
      return lastControlSyncDebug ? { ...lastControlSyncDebug } : null;
    },
    getBackstepRuntimeDebug() {
      return {
        maxBacksteps: Number(runtimeSettings?.maxBacksteps) || 0,
        backstepDepthEstimate
      };
    },
    getLastControlSyncError() {
      return lastControlSyncError;
    },
    setEditorFiles(files, activeFileId = "") {
      const normalizedFiles = (Array.isArray(files) ? files : []).map((file, index) => ({
        id: String(file?.id || `debug-file-${index + 1}`),
        name: normalizeFilename(file?.name || `debug_${index + 1}.txt`),
        source: String(file?.source ?? ""),
        savedSource: typeof file?.savedSource === "string" ? String(file.savedSource) : String(file?.source ?? ""),
        readOnly: file?.readOnly === true,
        projectOwned: file?.projectOwned !== false,
        sourceKind: String(file?.sourceKind || ""),
        sourceProjectRootPath: String(file?.sourceProjectRootPath || ""),
        sourceProjectPath: String(file?.sourceProjectPath || file?.name || ""),
        originKey: String(file?.originKey || "")
      }));
      const active = editor.setFiles(normalizedFiles, activeFileId);
      modeController.syncForFileName?.(active?.name || "", { activate: true });
      refreshRuntimeControls();
      return {
        activeFile: active ? { ...active } : null,
        files: editor.getFiles()
      };
    },
    setProjectLibrary(payload = {}) {
      const source = payload && typeof payload === "object" && payload.library && typeof payload.library === "object"
        ? payload.library
        : payload;
      const normalizedLibrary = normalizeProjectLibraryData(source);
      projectLibraryState = normalizedLibrary;
      saveProjectLibraryData(projectLibraryState);
      projectTreeExpandedNodes.clear();
      projectTreeKnownNodes.clear();
      projectTreeCheckedNodes.clear();
      projectTreeSelectedNode = null;

      const requestedOpenRoot = String(payload?.openRootPath || "").trim();
      const projectToOpen = requestedOpenRoot
        ? findProjectInLibrary(requestedOpenRoot)
        : null;
      if (projectToOpen) {
        openProjectWorkspace(projectToOpen, {
          applySettings: false,
          applyLayout: false
        });
      } else {
        const activeProject = findProjectInLibrary(projectLibraryState?.activeRootPath || "") || projectLibraryState.projects[0] || null;
        if (activeProject) {
          projectState = normalizeProjectData({
            ...activeProject,
            isOpen: false,
            settings: {
              ...(store.getState().preferences || preferences)
            },
            updatedAt: Number(activeProject.updatedAt) || Date.now()
          }) || projectState;
          updateProjectStoreState();
        }
        editor.setFiles([{
          id: "project-debug-scratch",
          name: "untitled.s",
          source: "",
          savedSource: ""
        }], "project-debug-scratch");
        modeController.setMode("project");
        renderProjectTree(true);
      }
      return this.getProjectTreeDebug();
    },
    getProjectTreeDebug() {
      return {
        activeRootPath: String(projectLibraryState?.activeRootPath || ""),
        isOpen: projectIsOpen(),
        selected: projectTreeSelectedNode ? { ...projectTreeSelectedNode } : null,
        checked: getProjectTreeCheckedSelection().map((entry) => ({ ...entry })),
        mainStatus: {
          selected: String(refs.project?.mainStatusSelected?.textContent || ""),
          size: String(refs.project?.mainStatusSize?.textContent || ""),
          usage: String(refs.project?.mainStatusUsage?.textContent || "")
        },
        syncDocuments: Array.from(cloudProjectSyncDocuments.entries()).map(([rootKey, project]) => ({
          rootKey,
          rootPath: String(project?.rootPath || ""),
          fileCount: normalizeProjectFiles(project?.files).length
        })),
        openFiles: editor.getFiles().map((file) => ({
          id: String(file?.id || ""),
          name: String(file?.name || ""),
          readOnly: file?.readOnly === true,
          projectOwned: file?.projectOwned !== false,
          originKey: String(file?.originKey || "")
        }))
      };
    },
    getEditorFiles() {
      return editor.getFiles();
    },
    setCloudProjectSyncDocuments(payload = {}) {
      clearCloudProjectSyncDocuments();
      Object.entries(payload && typeof payload === "object" ? payload : {}).forEach(([rootPath, project]) => {
        setCloudProjectSyncDocument(rootPath, project && typeof project === "object" ? project : null);
      });
      renderProjectTree(true);
      return this.getProjectTreeDebug();
    },
    persistWorkspaceSession() {
      persistWorkspaceSession();
      return true;
    },
    getStoredWorkspaceSession() {
      return loadWorkspaceSession();
    },
    getStartupEditorFiles() {
      const restored = loadWorkspaceSession();
      const fallbackId = restored?.activeFileId || "debug-file-startup";
      const fallbackFiles = restored?.files || [{
        id: fallbackId,
        name: "src/main.s",
        source: INITIAL_SOURCE,
        savedSource: INITIAL_SOURCE,
        undoStack: [INITIAL_SOURCE],
        redoStack: []
      }];
      const project = projectState && typeof projectState === "object" ? projectState : null;
      const files = buildStartupEditorFiles(project, restored?.files, fallbackFiles);
      const activeFileId = resolveStartupActiveFileId(project, restored, files);
      return {
        files: files.map((file) => ({ ...file })),
        activeFileId
      };
    },
    openTool(toolId) {
      const normalized = String(toolId || "").trim();
      if (!normalized) return false;
      toolManager.open(normalized);
      return true;
    },
    refreshControls() {
      refreshRuntimeControls();
      return this.getButtonState();
    }
  };
}
























































