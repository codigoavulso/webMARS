injectRuntimeStyles();

const preferences = loadPreferences();
const runtimeSettings = { ...DEFAULT_SETTINGS };

const MIN_MEMORY_GB = 0.25;
const MAX_MEMORY_GB = 16;
const DEFAULT_MEMORY_GB = 2;
const DEFAULT_MAX_BACKSTEPS = 100;
const MIN_MAX_BACKSTEPS = 0;
const MAX_MAX_BACKSTEPS = 1000000;

function sanitizeMemoryGb(value, fallback = DEFAULT_MEMORY_GB) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(MIN_MEMORY_GB, Math.min(MAX_MEMORY_GB, parsed));
}

function sanitizeMaxBacksteps(value, fallback = DEFAULT_MAX_BACKSTEPS) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(MIN_MAX_BACKSTEPS, Math.min(MAX_MAX_BACKSTEPS, parsed));
}

function memoryGbToBytes(gbValue) {
  return Math.floor(sanitizeMemoryGb(gbValue) * 1024 * 1024 * 1024);
}

function getI18nApi() {
  return typeof window !== "undefined" ? window.WebMarsI18n : globalThis.WebMarsI18n;
}

function applyLanguagePreference(language) {
  const i18n = getI18nApi();
  if (!i18n || typeof i18n.setLanguage !== "function") return;
  i18n.setLanguage(language || "en");
}

function getAvailableLanguages() {
  const i18n = getI18nApi();
  if (!i18n || typeof i18n.getLanguages !== "function") return ["en"];
  const languages = i18n.getLanguages();
  return languages.length ? languages : ["en"];
}

applyLanguagePreference(preferences.language || "en");

runtimeSettings.startAtMain = preferences.startAtMain;
runtimeSettings.delayedBranching = preferences.delayedBranching;
runtimeSettings.warningsAreErrors = preferences.warningsAreErrors;
runtimeSettings.assembleOnOpen = preferences.assembleOnOpen;
runtimeSettings.assembleAll = preferences.assembleAll;
runtimeSettings.extendedAssembler = preferences.extendedAssembler;
runtimeSettings.selfModifyingCode = preferences.selfModifyingCode;
runtimeSettings.popupSyscallInput = preferences.popupSyscallInput;
runtimeSettings.programArguments = preferences.programArguments;
runtimeSettings.programArgumentsLine = preferences.programArgumentsText || "";
runtimeSettings.maxBacksteps = sanitizeMaxBacksteps(preferences.maxBacksteps, DEFAULT_SETTINGS.maxBacksteps);
runtimeSettings.maxMemoryBytes = memoryGbToBytes(preferences.maxMemoryGb ?? DEFAULT_MEMORY_GB);

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
const dialogSystem = createDialogSystem(windowManager, refs.windows.desktop);
const SESSION_STORAGE_KEY = "mars45-web-session-v1";
const ABOUT_VISITED_KEY = "mars45-web-about-visited-v1";


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
function loadWorkspaceSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.files) || !parsed.files.length) return null;

    const files = parsed.files
      .map((file, index) => {
        if (!file || typeof file !== "object") return null;
        const source = String(file.source ?? "");
        const savedSource = typeof file.savedSource === "string" ? String(file.savedSource) : source;
        return {
          id: String(file.id || `file-restored-${index}`),
          name: normalizeFilename(file.name || `restored_${index + 1}.s`),
          source,
          savedSource,
          undoStack: [source],
          redoStack: []
        };
      })
      .filter(Boolean);

    if (!files.length) return null;
    const activeFileId = String(parsed.activeFileId || files[0].id);
    const active = files.find((file) => file.id === activeFileId) || files[0];
    return { files, activeFileId: active.id, active };
  } catch {
    return null;
  }
}

const restoredSession = loadWorkspaceSession();
const initialFileId = restoredSession?.activeFileId || "file-initial";
const initialFiles = restoredSession?.files || [{
  id: initialFileId,
  name: "untitled.s",
  source: INITIAL_SOURCE,
  savedSource: INITIAL_SOURCE,
  undoStack: [INITIAL_SOURCE],
  redoStack: []
}];
const initialActiveFile = restoredSession?.active || initialFiles[0];

const store = createStore({
  sourceCode: initialActiveFile.source,
  fileName: initialActiveFile.name,
  files: initialFiles,
  activeFileId: initialActiveFile.id,
  assembled: false,
  halted: false,
  running: false,
  preferences
});

const editor = setupEditor(refs, store);
const messagesPane = createMessagesPane(refs, DEFAULT_SETTINGS.maxMessageCharacters);
const postMarsRaw = (template, variables = {}, options = {}) => (
  messagesPane.postMars(translateText(template, variables), { translate: false, ...options })
);
const postMarsMessage = (template, variables = {}, options = {}) => (
  messagesPane.postMars(`${translateText(template, variables)}\n`, { translate: false, ...options })
);
const postRunRaw = (template, variables = {}, options = {}) => (
  messagesPane.postRun(translateText(template, variables), { translate: false, ...options })
);
const postRunMessage = (template, variables = {}, options = {}) => (
  messagesPane.postRun(`${translateText(template, variables)}\n`, { translate: false, ...options })
);
const helpSystem = createHelpSystem(refs, messagesPane, windowManager);
const engine = createMarsEngine({ settings: runtimeSettings, memoryMap: initialMemoryMap });
let activeMemoryConfigId = memoryPresets[initialMemorySelection.id] ? initialMemorySelection.id : "Default";
const executePane = createExecutePane(refs, engine);
const registersPane = createRegistersPane(refs);
const toolManager = createToolManager(engine, messagesPane, windowManager, refs.windows.desktop);
const modeController = createModeController(refs, windowManager);
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

let runTimer = null;
let runActive = false;
let runStopRequested = false;
let runLastTickAt = 0;
let runStepCarry = 0;
let runLastUiSyncAt = 0;
let runPausedForInput = false;
let resumeRunAfterInput = false;
let allowPageUnload = false;
const RUN_LOOP_INTERVAL_MS = 16;
const RUN_LOOP_MAX_BATCH = 240;
const RUN_LOOP_MAX_BATCH_UNLIMITED = 720;
const RUN_LOOP_COOPERATIVE_CHECK_INTERVAL_INTERACTIVE = 24;
const RUN_LOOP_COOPERATIVE_CHECK_INTERVAL_FAST = 8;
const RUN_LOOP_TIME_BUDGET_MS_INTERACTIVE = 7;
const RUN_LOOP_TIME_BUDGET_MS_FAST = 6;
const RUN_LOOP_UI_SYNC_INTERVAL_MS_INTERACTIVE = 66;
const RUN_LOOP_UI_SYNC_INTERVAL_MS_FAST = 33;

function getCurrentProgramName() {
  const active = editor.getActiveFile?.();
  return normalizeFilename(active?.name || store.getState().fileName || "untitled.s");
}

function describeAssemblySources(assemblyContext) {
  if (!assemblyContext) return getCurrentProgramName();
  if (assemblyContext.fileCount <= 1) {
    return normalizeFilename(assemblyContext.activeFile?.name || assemblyContext.sourceName || getCurrentProgramName());
  }
  const names = Array.from(assemblyContext.includeMap?.keys?.() ?? [])
    .map((name) => normalizeFilename(name))
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
    postMarsRaw(
      actionLabel === translateText("Step")
        ? "{action}: execution terminated due to null instruction.\n\n"
        : "{action}: execution terminated by null instruction.\n\n",
      { action: actionLabel }
    );
    postRunRaw("\n-- program is finished running (dropped off bottom) --\n\n");
    messagesPane.selectRunTab?.();
    return;
  }

  postMarsRaw("{action}: execution completed successfully.\n\n", { action: actionLabel });
  postRunRaw("\n-- program is finished running --\n\n");
  messagesPane.selectRunTab?.();
}

function postExecutionError(actionLabel, message) {
  if (message) {
    postMarsRaw("{message}\n", {
      message: formatDiagnosticMessage("error", { line: 0, message })
    });
  }
  postMarsRaw("{action}: execution terminated with errors.\n\n", { action: actionLabel });
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
  syncSnapshot(engine.getSnapshot());
}

function tryResumeRunAfterInput() {
  if (!runPausedForInput || !resumeRunAfterInput || runActive) return;
  const snapshot = engine.getSnapshot();
  if (!snapshot.assembled || snapshot.halted) {
    clearInputPauseState();
    return;
  }
  runPausedForInput = false;
  runStopRequested = false;
  runActive = true;
  runLastTickAt = performance.now();
  runStepCarry = 0;
  runLastUiSyncAt = 0;
  syncButtons(snapshot);
  runLoopTick();
}

function echoPopupInput(value) {
  if (value == null) return;
  postRunRaw("**** user input : {value}\n", { value: String(value) });
}

function getPopupRunIoContext() {
  const recent = messagesPane.getRecentRunLines?.(4) || "";
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
    void dialogSystem.prompt({
      title: translateText("Input syscall {service}", { service: request.service || "" }).trim(),
      message: label || translateText("Input"),
      contextText: getPopupRunIoContext(),
      contextLabel: translateText("Recent Run I/O"),
      defaultValue: fallback,
      confirmLabel: translateText("Send"),
      cancelLabel: translateText("Cancel")
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
    void dialogSystem.prompt({
      title: translateText("Confirm syscall {service}", { service: request.service || "" }).trim(),
      message: translateText("{message}\n\nType: yes, no, or cancel", { message }),
      defaultValue: "yes",
      confirmLabel: translateText("Send"),
      cancelLabel: translateText("Cancel")
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

    void dialogSystem.confirm({
      title: translateText("{typeLabel} syscall {service}", {
        typeLabel: translateText(typeLabel),
        service: request?.service || ""
      }).trim(),
      message,
      confirmLabel: translateText("OK"),
      cancelLabel: translateText("Close")
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
function getRunSpeedIndex() {
  const raw = Number(refs.controls.runSpeedSlider?.value ?? RUN_SPEED_INDEX_MAX);
  return Math.max(0, Math.min(RUN_SPEED_INDEX_MAX, raw));
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

function updateRunSpeedLabel() {
  refs.controls.runSpeedLabel.textContent = formatRunSpeedLabel(getRunSpeedIndex());
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
  refs.buttons.assemble.disabled = runActive;
  refs.buttons.reset.disabled = runActive;
  refs.buttons.go.disabled = !snapshot.assembled || runActive || snapshot.halted;
  refs.buttons.step.disabled = !snapshot.assembled || runActive || snapshot.halted;
  refs.buttons.backstep.disabled = !snapshot.assembled || runActive || (Number(snapshot.backstepDepth) <= 0);
  refs.buttons.pause.disabled = !runActive;
  refs.buttons.stop.disabled = !runActive && !snapshot.assembled;
  if (refs.buttons.undo) refs.buttons.undo.disabled = runActive;
  if (refs.buttons.redo) refs.buttons.redo.disabled = runActive;
}

let previousSnapshot = null;

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

  const previousData = previousSnapshot.memoryWords ?? new Map();
  const currentData = snapshot.memoryWords ?? new Map();
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
  const diff = computeSnapshotDiff(snapshot, {
    ...options,
    skipDiff: skipHeavyRender
  });

  if (!skipHeavyRender) {
    executePane.render(snapshot, {
      changedDataAddresses: diff.changedDataAddresses,
      focusDataAddress: snapshot.lastMemoryWriteAddress,
      disableHighlights: noInteraction,
      disableAutoScroll: noInteraction
    });
    registersPane.render(snapshot, diff.changedRegisters, {
      disableHighlights: noInteraction,
      disableAutoScroll: noInteraction
    });
  }

  refs.status.runtimePc.textContent = translateText("PC: {pc}", { pc: snapshot.pcHex });
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

  syncButtons(snapshot);
  updateNoInteractionUiMode();
  if (!skipToolSync) toolManager.onSnapshot(snapshot);
  store.setState({ assembled: snapshot.assembled, halted: snapshot.halted, running: runActive });
  if (!preservePreviousSnapshot) previousSnapshot = createSnapshotDiffBaseline(snapshot, options);
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
  store.setState({ preferences: nextPreferences });
  savePreferences(nextPreferences);
  applyLanguagePreference(nextPreferences.language || "en");
  runtimeSettings.startAtMain = nextPreferences.startAtMain;
  runtimeSettings.delayedBranching = nextPreferences.delayedBranching;
  runtimeSettings.warningsAreErrors = nextPreferences.warningsAreErrors;
  runtimeSettings.assembleOnOpen = nextPreferences.assembleOnOpen;
  runtimeSettings.assembleAll = nextPreferences.assembleAll;
  runtimeSettings.extendedAssembler = nextPreferences.extendedAssembler;
  runtimeSettings.selfModifyingCode = nextPreferences.selfModifyingCode;
  runtimeSettings.popupSyscallInput = nextPreferences.popupSyscallInput;
  runtimeSettings.programArguments = nextPreferences.programArguments;
  runtimeSettings.programArgumentsLine = nextPreferences.programArgumentsText || "";
  runtimeSettings.maxBacksteps = sanitizeMaxBacksteps(nextPreferences.maxBacksteps, runtimeSettings.maxBacksteps);
  runtimeSettings.maxMemoryBytes = memoryGbToBytes(nextPreferences.maxMemoryGb ?? DEFAULT_MEMORY_GB);

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
    const currentUsage = engine.getMemoryUsageBytes();
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
  if ((nextPreferences.language || "en") !== previousLanguage) {
    refs.refreshTranslations?.();
    messagesPane.refreshTranslations?.();
    editor.refreshStatus?.();
    updateRunSpeedLabel();
  }
  if (memoryChanged) previousSnapshot = null;
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
        if (result.runIo && result.message) {
          runOutputMessages.push({ text: result.message, translate: false });
        }
        if (result.waitingForInput) {
          waitingForInput = true;
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

      if (result.runIo && result.message) {
        runOutputMessages.push({ text: result.message, translate: false });
      }

      if (result.waitingForInput) {
        waitingForInput = true;
        break;
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
    syncSnapshot(engine.getSnapshot());
    if (stopReason === "user") {
      postMarsRaw("{action}: execution terminated by user.\n\n", { action: translateText("Go") });
      messagesPane.selectMarsTab?.();
    } else if (stopReason === "breakpoint") {
      postMarsRaw("{action}: execution paused at breakpoint: {name}\n\n", {
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
    if ((nowSync - runLastUiSyncAt) >= RUN_LOOP_UI_SYNC_INTERVAL_MS_FAST) {
      syncSnapshot(engine.getSnapshot({
        includeDataRows: false,
        shareMemoryWords: true
      }), {
        fastMode: true,
        suppressPulse: true,
        noInteraction: true
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
  const result = await dialogSystem.prompt({
    title: translateText(title),
    message: translateText(message),
    defaultValue,
    confirmLabel: translateText(options.confirmLabel || "OK"),
    cancelLabel: translateText(options.cancelLabel || "Cancel"),
    placeholder: translateText(options.placeholder || "")
  });
  if (!result?.ok) return null;
  return String(result.value ?? "");
}

async function requestConfirmDialog(title, message, options = {}) {
  return dialogSystem.confirm({
    title: translateText(title),
    message: translateText(message),
    confirmLabel: translateText(options.confirmLabel || "OK"),
    cancelLabel: translateText(options.cancelLabel || "Cancel")
  });
}

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
const fileInput = document.createElement("input");
fileInput.type = "file";
fileInput.accept = ".asm,.s,.txt";
fileInput.multiple = true;
fileInput.hidden = true;
document.body.appendChild(fileInput);

function buildAssemblyContext() {
  const files = editor.getFiles();
  const active = editor.getActiveFile() || files[0] || { name: "untitled.s", source: store.getState().sourceCode || "" };
  const includeMap = new Map();
  files.forEach((file) => {
    includeMap.set(file.name, file.source);
  });
  engine.setSourceFiles(includeMap);

  if (runtimeSettings.assembleAll) {
    const mergedSource = files
      .map((file) => `# -- file: ${file.name}\n${file.source}`)
      .join("\n\n");
    return {
      source: mergedSource,
      sourceName: active.name,
      includeMap,
      fileCount: files.length,
      activeFile: active
    };
  }

  return {
    source: active.source,
    sourceName: active.name,
    includeMap,
    fileCount: 1,
    activeFile: active
  };
}

function assembleFromEditor() {
  const assemblyContext = buildAssemblyContext();
  const result = engine.assemble(assemblyContext.source, {
    sourceName: assemblyContext.sourceName,
    includeMap: assemblyContext.includeMap,
    programArgumentsEnabled: runtimeSettings.programArguments,
    programArguments: runtimeSettings.programArgumentsLine
  });
  return { result, assemblyContext };
}

const commands = {
  newFile() {
    if (runActive) stopRunLoop();
    const created = editor.createFile({
      name: "untitled.s",
      source: "# new MIPS file\n.text\nmain:\n"
    });
    modeController.setMode("edit");
    windowManager.focus("window-editor");
    editor.focus();
    postMarsMessage("New source buffer created: {name}.", { name: created.name });
  },

  openFile() {
    if (runActive) stopRunLoop();
    fileInput.value = "";
    fileInput.click();
  },

  async closeFile() {
    if (runActive) stopRunLoop();
    const active = editor.getActiveFile();
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
  },

  async closeAllFiles() {
    if (runActive) stopRunLoop();
    const dirtyFiles = editor.getDirtyFiles();
    const ok = await confirmCloseDirtyFiles(dirtyFiles, translateText("Close all files?"));
    if (!ok) return;

    const result = editor.closeAll();
    modeController.setMode("edit");
    windowManager.focus("window-editor");
    editor.focus();
    postMarsMessage("Closed {count} file(s).", { count: result.closedCount });
  },

  saveFile() {
    const active = editor.getActiveFile();
    if (!active) return;
    downloadText(normalizeFilename(active.name), active.source);
    editor.markActiveSaved();
    postMarsMessage("Saved '{name}'.", { name: normalizeFilename(active.name) });
  },

  async saveFileAs() {
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

  dumpRunIo() {
    downloadText("run-io.txt", refs.messages.run.value || refs.messages.run.textContent || "");
    postMarsMessage("Run I/O dumped to file.");
  },

  assemble() {
    modeController.setMode("execute");
    clearRunTimer();
    runActive = false;
    runStopRequested = false;
    runLastTickAt = 0;
    runStepCarry = 0;
    runLastUiSyncAt = 0;
    clearInputPauseState();
    windowManager.focus("window-text"); windowManager.focus("window-data");

    const assemblyContext = buildAssemblyContext();
    postMarsRaw("{action}: assembling {sources}\n\n", {
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
      postMarsRaw("{action}: operation completed with errors.\n\n", { action: translateText("Assemble") });
    } else {
      postMarsRaw("{action}: operation completed successfully.\n\n", { action: translateText("Assemble") });
    }

    syncSnapshot(engine.getSnapshot());
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
    syncSnapshot(result.snapshot ?? engine.getSnapshot());

    if (result.waitingForInput) {
      runPausedForInput = true;
      resumeRunAfterInput = false;
      messagesPane.focusRunInput();
      return;
    }

    clearInputPauseState();
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
    runLastTickAt = performance.now();
    runStepCarry = 0;
    runLastUiSyncAt = 0;
    syncButtons(snapshot);
    updateNoInteractionUiMode();
    postMarsRaw("{action}: running {name}\n\n", {
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
    syncSnapshot(engine.getSnapshot());
    postMarsRaw("{action}: execution paused by user: {name}\n\n", {
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

    if (typeof engine.stop === "function") engine.stop();
    clearInputPauseState();
    syncSnapshot(engine.getSnapshot());
    postMarsRaw("{action}: execution terminated by user.\n\n", { action: translateText("Go") });
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
    const result = engine.backstep();
    if (!result.ok) {
      postMarsMessage("[warn] {message}", { message: result.message });
      return;
    }
    syncSnapshot(result.snapshot ?? engine.getSnapshot());
  },
  reset() {
    modeController.setMode("execute");
    clearRunTimer();
    runActive = false;
    runStopRequested = false;
    runLastTickAt = 0;
    runStepCarry = 0;
    runLastUiSyncAt = 0;
    clearInputPauseState();
    engine.reset();
    messagesPane.clearInputRequest();

    const activeFile = editor.getActiveFile();
    const source = activeFile?.source ?? store.getState().sourceCode;
    if (source.trim().length) {
      const { result: assembleResult, assemblyContext } = assembleFromEditor();
      reportDiagnostics(assembleResult, assemblyContext);
      if (!assembleResult.ok) {
        postMarsRaw("Unable to reset.  Please close file then re-open and re-assemble.\n");
      } else {
        postRunRaw("\n{action}: reset completed.\n\n", { action: translateText("Reset") });
        messagesPane.selectRunTab?.();
      }
    }

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
  },  togglePopupSyscallInput() { togglePreference("popupSyscallInput", "Popup dialog for input syscalls"); },
  toggleAddressDisplayBase() { togglePreference("displayAddressesHex", "Addresses displayed in hexadecimal"); },
  toggleValueDisplayBase() { togglePreference("displayValuesHex", "Values displayed in hexadecimal"); },
  toggleAssembleOnOpen() { togglePreference("assembleOnOpen", "Assemble file upon opening"); },
  toggleAssembleAll() { togglePreference("assembleAll", "Assemble all files in directory"); },
  toggleWarningsAreErrors() { togglePreference("warningsAreErrors", "Assembler warnings are considered errors"); },
  toggleStartAtMain() { togglePreference("startAtMain", "Initialize Program Counter to global 'main' if defined"); },
  toggleExtendedAssembler() { togglePreference("extendedAssembler", "Permit extended (pseudo) instructions and formats"); },
  toggleDelayedBranching() { togglePreference("delayedBranching", "Delayed branching"); },
  toggleSelfModifyingCode() { togglePreference("selfModifyingCode", "Self-modifying code"); },

  showLanguagePreferences() { openLanguagePreferencesDialog(); },
  showEditorPreferences() { openEditorPreferencesDialog(); },
  showHighlightingPreferences() { openHighlightingPreferencesDialog(); },
  showExceptionHandlerPreferences() { openExceptionHandlerPreferencesDialog(); },
  showMemoryConfigurationPreferences() { openMemoryConfigurationPreferencesDialog(); },
  showMemoryUsagePreferences() { openMemoryUsagePreferencesDialog(); },

  openTool(toolId) { toolManager.open(toolId); },

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
      const variant = await loadLocalizedExample(example);
      const files = Array.isArray(variant?.files) ? variant.files : [];
      const mainFile = files.find((file) => file.main) || files[0];
      if (!mainFile) throw new Error(translateText("Failed to load file."));
      const openedFiles = files.map((file) => editor.openFile(file.name, file.source, file === mainFile));
      const opened = openedFiles.find((file) => file.name === mainFile.name) || openedFiles[0];
      modeController.setMode("edit");
      windowManager.focus("window-editor");
      editor.focus();
      postMarsMessage("Opened example '{name}'.", { name: opened.name });
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
  helpMipsPdf() { helpSystem.openDocument("mipsref.pdf", "MIPS Reference PDF"); },
  helpAbout() { helpSystem.openAbout(); }
};

const menuSystem = createMenuSystem(refs, commands, () => store.getState(), toolManager);
getI18nApi()?.subscribe?.(() => {
  refs.refreshTranslations?.();
  messagesPane.refreshTranslations?.();
  editor.refreshStatus?.();
  dialogSystem.refreshTranslations?.();
  helpSystem.refreshTranslations?.();
  updateRunSpeedLabel();
  menuSystem.hide();
  previousSnapshot = null;
  syncSnapshot(engine.getSnapshot(), { suppressPulse: true });
});

function persistWorkspaceSession() {
  try {
    const files = editor.getFiles();
    if (!Array.isArray(files) || !files.length) return;
    const active = editor.getActiveFile() || files[0];
    const payload = {
      version: 1,
      updatedAt: Date.now(),
      activeFileId: active.id,
      files: files.map((file) => ({
        id: file.id,
        name: file.name,
        source: file.source,
        savedSource: typeof file.savedSource === "string" ? file.savedSource : file.source
      }))
    };
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage issues.
  }
}

let persistTimer = null;
let lastTrackedFilesRef = store.getState().files;
let lastTrackedActiveId = store.getState().activeFileId;
let lastTrackedSource = store.getState().sourceCode;

function scheduleWorkspacePersist() {
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    persistWorkspaceSession();
  }, 180);
}

store.subscribe((state) => {
  if (state.files === lastTrackedFilesRef && state.activeFileId === lastTrackedActiveId && state.sourceCode === lastTrackedSource) return;
  lastTrackedFilesRef = state.files;
  lastTrackedActiveId = state.activeFileId;
  lastTrackedSource = state.sourceCode;
  scheduleWorkspacePersist();
});

refs.buttons.newFile.addEventListener("click", commands.newFile);
refs.buttons.open.addEventListener("click", commands.openFile);
refs.buttons.save.addEventListener("click", commands.saveFile);
refs.buttons.undo.addEventListener("click", commands.undo);
refs.buttons.redo.addEventListener("click", commands.redo);
refs.buttons.assemble.addEventListener("click", commands.assemble);
refs.buttons.go.addEventListener("click", commands.go);
refs.buttons.step.addEventListener("click", commands.step);
refs.buttons.backstep.addEventListener("click", commands.backstep);
refs.buttons.reset.addEventListener("click", commands.reset);
refs.buttons.pause.addEventListener("click", commands.pause);
refs.buttons.stop.addEventListener("click", commands.stop);

refs.controls.runSpeedSlider.addEventListener("input", updateRunSpeedLabel);
refs.controls.runSpeedSlider.addEventListener("change", updateRunSpeedLabel);

fileInput.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.files || !target.files.length) return;

  const files = [...target.files];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const content = await file.text();
    const activate = index === files.length - 1;
    editor.openFile(normalizeFilename(file.name), content, activate);
    postMarsMessage("Opened '{name}'.", { name: file.name });
  }

  modeController.setMode("edit");
  windowManager.focus("window-editor");
  editor.focus();
  if (store.getState().preferences.assembleOnOpen) commands.assemble();
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
  if (event.key === "F5") { event.preventDefault(); void commands.go(); }
  if (event.key === "F7") { event.preventDefault(); void commands.step(); }
  if (event.key === "Escape") {
    menuSystem.hide();
  }
});

function handleBeforeUnload(event) {
  persistWorkspaceSession();
  if (allowPageUnload) return;
  if (!editor.hasDirtyFiles()) return;
  event.preventDefault();
  event.returnValue = "";
}

window.addEventListener("beforeunload", handleBeforeUnload);
window.onbeforeunload = handleBeforeUnload;
window.addEventListener("pagehide", persistWorkspaceSession);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persistWorkspaceSession();
});

applyUiPreferences(preferences);
updateRunSpeedLabel();
if (!restoredSession) {
  editor.setSource(INITIAL_SOURCE);
} else {
  editor.refreshView?.();
  postMarsMessage("Workspace restored ({count} file(s)).", { count: restoredSession.files.length });
}
modeController.setMode("edit");
syncSnapshot(engine.getSnapshot());
persistWorkspaceSession();
showAboutOnFirstVisit();
























































