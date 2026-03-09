import { DEFAULT_MEMORY_MAP, DEFAULT_SETTINGS, INITIAL_SOURCE } from "./config/defaults.js";
import { createStore } from "./state/store.js";
import { MarsEngine } from "./core/mars-engine.js";
import { renderLayout } from "./ui/layout.js";
import { setupEditor } from "./ui/editor-pane.js";
import { createExecutePane } from "./ui/execute-pane.js";
import { createRegistersPane } from "./ui/registers-pane.js";
import { createMessagesPane } from "./ui/messages-pane.js";

const appRoot = document.querySelector("#app");
const refs = renderLayout(appRoot);

const store = createStore({
  sourceCode: INITIAL_SOURCE,
  assembled: false,
  halted: false
});

const editor = setupEditor(refs, store);
const executePane = createExecutePane(refs);
const registersPane = createRegistersPane(refs);
const messagesPane = createMessagesPane(refs, DEFAULT_SETTINGS.maxMessageCharacters);
const engine = new MarsEngine({
  settings: DEFAULT_SETTINGS,
  memoryMap: DEFAULT_MEMORY_MAP
});

function setAssemblyTag(kind, text) {
  const tag = refs.status.assemblyTag;
  tag.classList.remove("ok", "warn", "error");
  tag.classList.add(kind);
  tag.textContent = text;
}

function toHex(value) {
  return `0x${(value >>> 0).toString(16).padStart(8, "0")}`;
}

function syncButtons(snapshot) {
  const assembled = snapshot.assembled;
  refs.buttons.go.disabled = !assembled;
  refs.buttons.step.disabled = !assembled;
  refs.buttons.reset.disabled = false;
  refs.buttons.backstep.disabled = !assembled || snapshot.steps === 0;
  refs.buttons.pause.disabled = true;
  refs.buttons.stop.disabled = true;
}

function syncSnapshot(snapshot) {
  executePane.render(snapshot);
  registersPane.render(snapshot.registers);

  refs.status.runtimePc.textContent = `PC: ${snapshot.pcHex}`;
  refs.status.runtimeSteps.textContent = `steps: ${snapshot.steps}`;

  if (!snapshot.assembled) {
    setAssemblyTag("warn", "not assembled");
  } else if (snapshot.errors.length > 0) {
    setAssemblyTag("error", "assembly errors");
  } else if (snapshot.warnings.length > 0) {
    setAssemblyTag("warn", "assembled with warnings");
  } else {
    setAssemblyTag("ok", "assembled");
  }

  syncButtons(snapshot);
  store.setState({ assembled: snapshot.assembled, halted: snapshot.halted });
}

function reportDiagnostics(result) {
  if (result.errors?.length) {
    result.errors.forEach((error) => {
      messagesPane.postMars(`[error] line ${error.line}: ${error.message}`);
    });
  }

  if (result.warnings?.length) {
    result.warnings.forEach((warning) => {
      messagesPane.postMars(`[warn] line ${warning.line}: ${warning.message}`);
    });
  }
}

function onAssemble() {
  refs.tabs.main.activate("panel-execute");
  const source = store.getState().sourceCode;
  const result = engine.assemble(source);

  reportDiagnostics(result);

  if (!result.ok) {
    setAssemblyTag("error", "assembly failed");
    messagesPane.postMars("Assembly failed.");
    syncSnapshot(engine.getSnapshot());
    return;
  }

  messagesPane.postMars(`Assembly complete. ${engine.getSnapshot().textRows.length} text rows generated.`);
  syncSnapshot(engine.getSnapshot());
}

function onStep() {
  refs.tabs.main.activate("panel-execute");
  const result = engine.step();
  if (!result.ok) {
    messagesPane.postMars(`[error] ${result.message}`);
    return;
  }
  if (result.message) {
    messagesPane.postRun(result.message);
  }
  syncSnapshot(result.snapshot ?? engine.getSnapshot());
}

function onGo() {
  refs.tabs.main.activate("panel-execute");
  const result = engine.go(500);
  if (!result.ok) {
    messagesPane.postMars(`[error] ${result.message}`);
    return;
  }

  if (result.stoppedOnBreakpoint) {
    messagesPane.postRun(result.message || "Execution stopped at breakpoint.");
  } else if (result.done) {
    messagesPane.postRun(result.message || "Execution finished.");
  } else {
    messagesPane.postRun(`Execution paused after ${result.stepsExecuted} steps.`);
  }

  syncSnapshot(result.snapshot ?? engine.getSnapshot());
}

function onBackstep() {
  refs.tabs.main.activate("panel-execute");
  const result = engine.backstep();
  if (!result.ok) {
    messagesPane.postMars(`[warn] ${result.message}`);
    return;
  }
  messagesPane.postRun(result.message);
  syncSnapshot(result.snapshot ?? engine.getSnapshot());
}

function onReset() {
  const source = store.getState().sourceCode;
  engine.reset();
  messagesPane.postMars("Runtime reset.");

  if (source.trim().length > 0) {
    const assembleResult = engine.assemble(source);
    reportDiagnostics(assembleResult);
    if (assembleResult.ok) {
      messagesPane.postMars("Program reassembled after reset.");
    }
  }

  syncSnapshot(engine.getSnapshot());
}

function wireUi() {
  refs.buttons.assemble.addEventListener("click", onAssemble);
  refs.buttons.step.addEventListener("click", onStep);
  refs.buttons.go.addEventListener("click", onGo);
  refs.buttons.backstep.addEventListener("click", onBackstep);
  refs.buttons.reset.addEventListener("click", onReset);

  refs.buttons.newFile.addEventListener("click", () => {
    editor.setSource("# new MIPS file\n.text\nmain:\n");
    messagesPane.postMars("New source buffer created.");
    refs.tabs.main.activate("panel-edit");
  });

  refs.buttons.open.addEventListener("click", () => {
    messagesPane.postMars("Open action is pending browser file API integration.");
  });

  refs.buttons.save.addEventListener("click", () => {
    messagesPane.postMars("Save action is pending browser download integration.");
  });

  refs.buttons.pause.addEventListener("click", () => {
    messagesPane.postMars("Pause is not yet needed in synchronous execution mode.");
  });

  refs.buttons.stop.addEventListener("click", () => {
    messagesPane.postMars("Stop is reserved for asynchronous simulator mode.");
  });

  executePane.onToggleBreakpoint((address) => {
    const enabled = engine.toggleBreakpoint(address);
    const tag = enabled ? "added" : "removed";
    messagesPane.postMars(`Breakpoint ${tag}: ${toHex(address)}.`);
    syncSnapshot(engine.getSnapshot());
  });
}

function bootstrap() {
  editor.setSource(INITIAL_SOURCE);
  wireUi();
  syncSnapshot(engine.getSnapshot());
  messagesPane.postMars("MARS 4.5 web shell initialized.");
  messagesPane.postMars("Use Assemble -> Go/Step to iterate while core parity is being ported.");
}

bootstrap();
