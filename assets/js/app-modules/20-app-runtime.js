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
const RUN_LOOP_MAX_BATCH_UNLIMITED = 1400;
const RUN_LOOP_COOPERATIVE_CHECK_INTERVAL = 24;
const RUN_LOOP_TIME_BUDGET_MS_INTERACTIVE = 7;
const RUN_LOOP_TIME_BUDGET_MS_FAST = 11;
const RUN_LOOP_UI_SYNC_INTERVAL_MS = 66;

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
function flushRunOutputMessages(lines) {
  if (!Array.isArray(lines) || !lines.length) return;
  messagesPane.postRun(lines.join("\n"));
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
      title: `Input syscall ${request.service || ""}`.trim(),
      message: label || "Input",
      defaultValue: fallback,
      confirmLabel: "Send",
      cancelLabel: "Cancel"
    }).then((result) => {
      if (popupDialogState.input !== ticket) return;
      ticket.ready = true;
      ticket.value = result?.ok ? String(result.value ?? "") : null;
      tryResumeRunAfterInput();
    });
    return { wait: true, message: `[input] Waiting for popup input: ${label || "input"}` };
  }

  if (!popupDialogState.input.ready) {
    return { wait: true, message: `[input] Waiting for popup input: ${label || "input"}` };
  }

  const value = popupDialogState.input.value;
  popupDialogState.input = null;
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
      title: `Confirm syscall ${request.service || ""}`.trim(),
      message: `${message}\n\nType: yes, no, or cancel`,
      defaultValue: "yes",
      confirmLabel: "Send",
      cancelLabel: "Cancel"
    }).then((result) => {
      if (popupDialogState.confirm !== ticket) return;
      ticket.ready = true;
      ticket.value = result?.ok ? parseConfirmChoice(result.value, 2) : 2;
      tryResumeRunAfterInput();
    });
    return { wait: true, message: `[input] Waiting for popup confirmation: ${message}` };
  }

  if (!popupDialogState.confirm.ready) {
    return { wait: true, message: `[input] Waiting for popup confirmation: ${message}` };
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

    const typeLabel = messageType === 0 ? "Error"
      : messageType === 1 ? "Information"
        : messageType === 2 ? "Warning"
          : messageType === 3 ? "Question"
            : "Message";

    void dialogSystem.confirm({
      title: `${typeLabel} syscall ${request?.service || ""}`.trim(),
      message,
      confirmLabel: "OK",
      cancelLabel: "Close"
    }).then(() => {
      if (popupDialogState.message !== ticket) return;
      ticket.ready = true;
      ticket.value = true;
      tryResumeRunAfterInput();
    });

    return { wait: true, message: `[dialog] Waiting for message dialog close: ${typeLabel}` };
  }

  if (!popupDialogState.message.ready) {
    return { wait: true, message: "[dialog] Waiting for message dialog close." };
  }

  const value = popupDialogState.message.value;
  popupDialogState.message = null;
  return { value };
}

engine.setRuntimeHooks({
  readInput(request) {
    const fallback = typeof request.fallback === "string" ? request.fallback : "";
    const label = String(request.label || `Input syscall ${request.service || ""}`).trim();

    if (request.popup) {
      return consumePopupPrompt(request, label, fallback);
    }

    const queued = messagesPane.consumeInput();
    if (queued == null) {
      messagesPane.requestInput(label || "input");
      return { wait: true, message: `[input] Waiting for Run I/O input: ${label || "input"}` };
    }

    messagesPane.clearInputRequest();
    return { value: queued };
  },

  confirmInput(request) {
    const message = String(request.message || "Confirm?");

    if (request.popup) {
      return consumePopupConfirm(request, message);
    }

    const queued = messagesPane.consumeInput();
    if (queued == null) {
      messagesPane.requestInput(`${message} [yes/no/cancel]`);
      return { wait: true, message: `[input] Waiting for confirmation in Run I/O: ${message}` };
    }

    messagesPane.clearInputRequest();
    return { value: parseConfirmChoice(queued, 2) };
  },

  messageDialog(request) {
    if (request?.popup !== false) {
      return consumePopupMessage(request || {});
    }
    messagesPane.postRun(String(request?.message || ""));
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
    return `Run speed ${display} inst/sec`;
  }
  return "Run speed at max (no interaction)";
}

function updateRunSpeedLabel() {
  refs.controls.runSpeedLabel.textContent = formatRunSpeedLabel(getRunSpeedIndex());
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
  return !/^Executed line \d+\.$/.test(result.message);
}

function setAssemblyTag(kind, text) {
  const tag = refs.status.assemblyTag;
  tag.classList.remove("ok", "warn", "error");
  tag.classList.add(kind);
  tag.textContent = text;
}

function syncButtons(snapshot) {
  refs.buttons.assemble.disabled = runActive;
  refs.buttons.reset.disabled = runActive;
  refs.buttons.go.disabled = !snapshot.assembled || runActive || snapshot.halted;
  refs.buttons.step.disabled = !snapshot.assembled || runActive || snapshot.halted;
  refs.buttons.backstep.disabled = !snapshot.assembled || runActive || snapshot.steps === 0;
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

function syncSnapshot(snapshot, options = {}) {
  const diff = computeSnapshotDiff(snapshot, options);
  const suppressPulse = options.suppressPulse === true;

  executePane.render(snapshot, {
    changedDataAddresses: diff.changedDataAddresses,
    focusDataAddress: snapshot.lastMemoryWriteAddress
  });
  registersPane.render(snapshot, diff.changedRegisters);

  refs.status.runtimePc.textContent = `PC: ${snapshot.pcHex}`;
  refs.status.runtimeSteps.textContent = `steps: ${snapshot.steps}`;

  if (!snapshot.assembled) setAssemblyTag("warn", "not assembled");
  else if (snapshot.errors.length) setAssemblyTag("error", "assembly errors");
  else if (snapshot.warnings.length) setAssemblyTag("warn", "assembled with warnings");
  else if (snapshot.halted) setAssemblyTag("warn", "program halted");
  else setAssemblyTag("ok", "assembled");

  if (!suppressPulse) {
    if (snapshot.textRows.some((row) => row.isCurrent) || diff.changedDataAddresses.size) {
      windowManager.pulse("window-main");
    }
    if (diff.changedRegisters.size) windowManager.pulse("window-registers");
  }

  syncButtons(snapshot);
  toolManager.onSnapshot(snapshot);
  store.setState({ assembled: snapshot.assembled, halted: snapshot.halted, running: runActive });
  previousSnapshot = snapshot;
}

function reportDiagnostics(result) {
  if (result.errors?.length) result.errors.forEach((e) => messagesPane.postMars(`[error] line ${e.line}: ${e.message}`));
  if (result.warnings?.length) result.warnings.forEach((w) => messagesPane.postMars(`[warn] line ${w.line}: ${w.message}`));
}

function applyPreferences(nextPreferences) {
  store.setState({ preferences: nextPreferences });
  savePreferences(nextPreferences);
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

  if (Array.isArray(engine.executionHistory)) {
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
      messagesPane.postMars("[warn] Current memory usage exceeds configured limit; new allocations may fail until usage decreases.");
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
  let terminalMessage = "";
  let waitingForInput = false;
  let deferredDelayMs = 0;
  const loopStart = performance.now();
  const timeBudgetMs = interactive ? RUN_LOOP_TIME_BUDGET_MS_INTERACTIVE : RUN_LOOP_TIME_BUDGET_MS_FAST;

  for (let i = 0; i < stepBudget; i += 1) {
    if (runStopRequested) {
      terminalMessage = "Execution stopped by user.";
      break;
    }

    const result = engine.step({ includeSnapshot: false });
    if (!result.ok) {
      messagesPane.postMars(`[error] ${result.message}`);
      terminalMessage = result.message;
      runStopRequested = true;
      break;
    }

    if (result.runIo && result.message) {
      runOutputMessages.push(result.message);
    } else if (interactive && shouldPostRunLoopMessage(result)) {
      runOutputMessages.push(result.message);
    }

    if (result.waitingForInput) {
      waitingForInput = true;
      terminalMessage = result.message || "Waiting for Run I/O input.";
      break;
    }

    if (interactive) {
      const nowSync = performance.now();
      const shouldSyncNow =
        result.done
        || result.stoppedOnBreakpoint
        || result.waitingForInput
        || ((nowSync - runLastUiSyncAt) >= RUN_LOOP_UI_SYNC_INTERVAL_MS);
      if (shouldSyncNow) {
        syncSnapshot(engine.getSnapshot({ shareMemoryWords: true }), { fastMode: true, suppressPulse: true });
        runLastUiSyncAt = nowSync;
      }
    }

    if (result.done || result.stoppedOnBreakpoint) {
      terminalMessage = result.message || (result.stoppedOnBreakpoint ? "Breakpoint reached." : "Program completed.");
      runStopRequested = true;
      break;
    }

    if (result.sleepMs > 0) {
      deferredDelayMs = Math.max(deferredDelayMs, result.sleepMs | 0);
      break;
    }

    if (!interactive && ((i + 1) % RUN_LOOP_COOPERATIVE_CHECK_INTERVAL === 0)) {
      if ((performance.now() - loopStart) >= timeBudgetMs) {
        break;
      }
    }
  }

  flushRunOutputMessages(runOutputMessages);

  if (waitingForInput) {
    markPausedForInput(true);
    if (terminalMessage && (!runOutputMessages.length || runOutputMessages[runOutputMessages.length - 1] !== terminalMessage)) {
      messagesPane.postRun(terminalMessage);
    }
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
    if (terminalMessage && (!runOutputMessages.length || runOutputMessages[runOutputMessages.length - 1] !== terminalMessage)) {
      messagesPane.postRun(terminalMessage);
    }
    return;
  }

  if (!interactive) {
    syncSnapshot(engine.getSnapshot({ shareMemoryWords: true }), { fastMode: true, suppressPulse: true });
    runLastUiSyncAt = performance.now();
  }
  const nextDelay = deferredDelayMs > 0 ? deferredDelayMs : (speed === RUN_SPEED_UNLIMITED ? 0 : RUN_LOOP_INTERVAL_MS);
  runTimer = window.setTimeout(runLoopTick, nextDelay);
}
function togglePreference(key, label) {
  const current = store.getState().preferences;
  const next = { ...current, [key]: !current[key] };
  applyPreferences(next);
  messagesPane.postMars(`Setting updated: ${label} = ${next[key]}.`);
}

function updatePreferencesPatch(patch, successMessage = "") {
  const current = store.getState().preferences;
  const next = { ...current, ...patch };
  applyPreferences(next);
  if (successMessage) messagesPane.postMars(successMessage);
}

async function requestTextDialog(title, message, defaultValue = "", options = {}) {
  const result = await dialogSystem.prompt({
    title,
    message,
    defaultValue,
    confirmLabel: options.confirmLabel || "OK",
    cancelLabel: options.cancelLabel || "Cancel",
    placeholder: options.placeholder || ""
  });
  if (!result?.ok) return null;
  return String(result.value ?? "");
}

async function requestConfirmDialog(title, message, options = {}) {
  return dialogSystem.confirm({
    title,
    message,
    confirmLabel: options.confirmLabel || "OK",
    cancelLabel: options.cancelLabel || "Cancel"
  });
}

function summarizeDirtyFiles(files) {
  if (!Array.isArray(files) || !files.length) return "";
  const maxListed = 6;
  const listed = files.slice(0, maxListed).map((file) => `- ${file.name}`).join("\n");
  const remaining = files.length - maxListed;
  return remaining > 0 ? `${listed}\n- ... and ${remaining} more` : listed;
}

async function confirmCloseDirtyFiles(files, actionLabel) {
  if (!files.length) return true;
  const details = summarizeDirtyFiles(files);
  const message = `${actionLabel}\n\nUnsaved files:\n${details}\n\nContinue without saving?`;
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
    messagesPane.postMars("[warn] Invalid editor preferences.");
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
    messagesPane.postMars("[warn] Provide 3 values (text,data,registers). Example: 1,1,1");
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
  updatePreferencesPatch({ exceptionHandlerAddress: toHex(parsed) }, `Exception handler set to ${toHex(parsed)}.`);
}

async function openMemoryConfigurationPreferencesDialog() {
  const ids = Object.keys(memoryPresets);
  if (!ids.length) {
    messagesPane.postMars("[warn] No memory presets available.");
    return;
  }

  const menu = ids
    .map((id, index) => `${index + 1}: ${memoryPresets[id].label || id}`)
    .join("\n");
  const raw = await requestTextDialog("Memory Configuration", `Memory Configuration\n${menu}\n\nChoose preset number or id`, activeMemoryConfigId || "Default");
  if (raw == null) return;

  const trimmed = raw.trim();
  let selectedId = ids.find((id) => id.toLowerCase() === trimmed.toLowerCase()) || "";
  if (!selectedId) {
    const numeric = Number.parseInt(trimmed, 10);
    if (Number.isFinite(numeric) && numeric >= 1 && numeric <= ids.length) selectedId = ids[numeric - 1];
  }

  if (!selectedId) {
    messagesPane.postMars("[warn] Unknown memory preset.");
    return;
  }

  const selectedMap = { ...DEFAULT_MEMORY_MAP, ...memoryPresets[selectedId] };
  const defaultException = selectedMap.exceptionHandlerAddress ?? DEFAULT_MEMORY_MAP.exceptionHandlerAddress;
  updatePreferencesPatch({
    memoryConfiguration: selectedId,
    exceptionHandlerAddress: toHex(defaultException)
  }, `Memory configuration set to ${memoryPresets[selectedId].label || selectedId}.`);
}

async function openMemoryUsagePreferencesDialog() {
  const current = store.getState().preferences;
  const defaultMemoryGb = sanitizeMemoryGb(current.maxMemoryGb, DEFAULT_MEMORY_GB);
  const defaultBacksteps = sanitizeMaxBacksteps(current.maxBacksteps, DEFAULT_MAX_BACKSTEPS);
  const defaultValue = `${defaultMemoryGb},${defaultBacksteps}`;

  const raw = await requestTextDialog(
    "Uso máximo de Memória",
    "Definir limites: memória GB e max backsteps (GB,steps)\nExemplo: 2,100",
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
    `Memory limits updated: ${parsedMemoryGb} GB, ${parsedBacksteps} backsteps.`
  );
}

async function loadTextResource(path) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (fetchError) {
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
      req.onerror = () => reject(fetchError instanceof Error ? fetchError : new Error("Failed to load file."));
      req.send();
    });
  }
}

const runtimeExampleFiles = [...EXAMPLE_FILES];

function mergeExampleEntries(entries) {
  entries.forEach((entry) => {
    if (!entry || typeof entry.path !== "string") return;
    const path = entry.path.trim();
    if (!path) return;
    if (runtimeExampleFiles.some((example) => example.path === path)) return;
    runtimeExampleFiles.push({
      label: entry.label ? String(entry.label) : path.split("/").pop() || path,
      path
    });
  });
}

async function discoverExampleFiles() {
  try {
    const text = await loadTextResource("./examples/examples.json");
    const manifest = JSON.parse(text);
    if (Array.isArray(manifest)) {
      const entries = manifest.map((item) => {
        if (typeof item === "string") return { label: item, path: `./examples/${item}` };
        if (item && typeof item === "object") {
          const rawPath = String(item.path || item.file || item.name || "").trim();
          if (!rawPath) return null;
          const path = rawPath.startsWith("./") || rawPath.startsWith("/") ? rawPath : `./examples/${rawPath}`;
          return { label: item.label || item.name || rawPath, path };
        }
        return null;
      }).filter(Boolean);
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
    messagesPane.postMars(`New source buffer created: ${created.name}.`);
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
      const ok = await confirmCloseDirtyFiles([active], `Close '${active.name}'?`);
      if (!ok) return;
    }

    const result = editor.closeActive();
    if (!result) return;
    modeController.setMode("edit");
    windowManager.focus("window-editor");
    editor.focus();
    messagesPane.postMars(`Closed '${result.closed.name}'.`);
  },

  async closeAllFiles() {
    if (runActive) stopRunLoop();
    const dirtyFiles = editor.getDirtyFiles();
    const ok = await confirmCloseDirtyFiles(dirtyFiles, "Close all files?");
    if (!ok) return;

    const result = editor.closeAll();
    modeController.setMode("edit");
    windowManager.focus("window-editor");
    editor.focus();
    messagesPane.postMars(`Closed ${result.closedCount} file(s).`);
  },

  saveFile() {
    const active = editor.getActiveFile();
    if (!active) return;
    downloadText(normalizeFilename(active.name), active.source);
    editor.markActiveSaved();
    messagesPane.postMars(`Saved '${normalizeFilename(active.name)}'.`);
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
    messagesPane.postMars(`Saved as '${target.name}'.`);
  },

  dumpRunIo() {
    downloadText("run-io.txt", refs.messages.run.textContent || "");
    messagesPane.postMars("Run I/O dumped to file.");
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

    const { result, assemblyContext } = assembleFromEditor();
    reportDiagnostics(result);

    if (!result.ok) {
      setAssemblyTag("error", "assembly failed");
      messagesPane.postMars("Assembly failed.");
    } else {
      const sourceScope = runtimeSettings.assembleAll
        ? `${assemblyContext.fileCount} file(s)`
        : `active file '${assemblyContext.activeFile?.name || assemblyContext.sourceName}'`;
      messagesPane.postMars(`Assembly complete (${sourceScope}). ${engine.getSnapshot().textRows.length} text rows generated.`);
      if (runtimeSettings.programArguments) {
        const argsText = runtimeSettings.programArgumentsLine || "";
        messagesPane.postMars(`Program arguments enabled: ${argsText || "(none)"}`);
      }
    }

    syncSnapshot(engine.getSnapshot());
  },
  step() {
    modeController.setMode("execute");
    windowManager.focus("window-text"); windowManager.focus("window-data");
    const result = engine.step();
    if (!result.ok) {
      messagesPane.postMars(`[error] ${result.message}`);
      return;
    }

    if (result.message) messagesPane.postRun(result.message);
    syncSnapshot(result.snapshot ?? engine.getSnapshot());

    if (result.waitingForInput) {
      runPausedForInput = true;
      resumeRunAfterInput = false;
      messagesPane.focusRunInput();
      return;
    }

    clearInputPauseState();
  },  go() {
    modeController.setMode("execute");
    windowManager.focus("window-text"); windowManager.focus("window-data");
    if (runActive) return;
    const snapshot = engine.getSnapshot();
    if (!snapshot.assembled) {
      messagesPane.postMars("[error] Program is not assembled.");
      return;
    }
    if (snapshot.halted) {
      messagesPane.postMars("[warn] Program is halted. Use Reset to reassemble and restart.");
      return;
    }
    clearInputPauseState();
    runStopRequested = false;
    runActive = true;
    runLastTickAt = performance.now();
    runStepCarry = 0;
    runLastUiSyncAt = 0;
    syncButtons(snapshot);
    messagesPane.postRun(`Running at ${formatRunSpeedLabel(getRunSpeedIndex()).replace("Run speed ", "")}.`);
    runLoopTick();
  },
  pause() {
    if (!runActive) {
      messagesPane.postMars("[warn] Runtime is not running.");
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
    messagesPane.postRun("Execution paused.");
  },
  stop() {
    if (runActive) {
      runStopRequested = true;
      return;
    }

    const snapshot = engine.getSnapshot();
    if (!snapshot.assembled) {
      messagesPane.postMars("[warn] No assembled program to stop.");
      return;
    }

    engine.halted = true;
    clearInputPauseState();
    syncSnapshot(engine.getSnapshot());
    messagesPane.postRun("Execution stopped.");
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
      messagesPane.postMars(`[warn] ${result.message}`);
      return;
    }
    messagesPane.postRun(result.message);
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
    messagesPane.postMars("Runtime reset.");

    const activeFile = editor.getActiveFile();
    const source = activeFile?.source ?? store.getState().sourceCode;
    if (source.trim().length) {
      const { result: assembleResult } = assembleFromEditor();
      reportDiagnostics(assembleResult);
      if (assembleResult.ok) messagesPane.postMars("Program reassembled after reset.");
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
      messagesPane.postMars(`[warn] '${query}' not found.`);
      return;
    }

    refs.editor.focus();
    refs.editor.setSelectionRange(idx, idx + query.length);
    messagesPane.postMars(`Found '${query}' at offset ${idx}.`);
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

  showEditorPreferences() { openEditorPreferencesDialog(); },
  showHighlightingPreferences() { openHighlightingPreferencesDialog(); },
  showExceptionHandlerPreferences() { openExceptionHandlerPreferencesDialog(); },
  showMemoryConfigurationPreferences() { openMemoryConfigurationPreferencesDialog(); },
  showMemoryUsagePreferences() { openMemoryUsagePreferencesDialog(); },

  openTool(toolId) { toolManager.open(toolId); },

  getExampleMenuItems() {
    return runtimeExampleFiles.map((example) => ({
      label: example.label,
      command: () => commands.openExample(example)
    }));
  },

  async openExample(example) {
    if (runActive) stopRunLoop();
    try {
      const source = await loadTextResource(example.path);
      const opened = editor.openFile(example.label, source, true);
      modeController.setMode("edit");
      windowManager.focus("window-editor");
      editor.focus();
      messagesPane.postMars(`Opened example '${opened.name}'.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      messagesPane.postMars(`[error] Failed to open example '${example.label}': ${message}`);
    }
  },

  helpHub() { helpSystem.open("webmars", "info"); },
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

const menuSystem = createMenuSystem(refs, commands, () => store.getState(), toolManager);

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

refs.messages.clear?.addEventListener("click", () => {
  messagesPane.clear();
});

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
    messagesPane.postMars(`Opened '${file.name}'.`);
  }

  modeController.setMode("edit");
  windowManager.focus("window-editor");
  editor.focus();
  if (store.getState().preferences.assembleOnOpen) commands.assemble();
  target.value = "";
});
executePane.onToggleBreakpoint((address) => {
  const enabled = engine.toggleBreakpoint(address);
  messagesPane.postMars(`Breakpoint ${enabled ? "added" : "removed"}: ${toHex(address)}.`);
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
      const ok = await confirmCloseDirtyFiles(dirtyFiles, "Reload page?");
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
  messagesPane.postMars(`Workspace restored (${restoredSession.files.length} file(s)).`);
}
modeController.setMode("edit");
syncSnapshot(engine.getSnapshot());
messagesPane.postMars("MARS 4.5 web shell initialized.");
messagesPane.postMars("Core parity enabled: multi-file assemble, cooperative run loop, coprocessor views, settings dialogs and Help window integration.");
persistWorkspaceSession();
showAboutOnFirstVisit();

























































