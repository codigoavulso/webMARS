import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = await readFile(new URL("../assets/js/usage-metrics.js", import.meta.url), "utf8");
const heartbeatSource = await readFile(new URL("../assets/js/active-heartbeat.js", import.meta.url), "utf8");
function memoryStorage() {
  const data = new Map();
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key), data };
}
function harness(options = {}) {
  let now = options.now || 1788600000000;
  const sent = [];
  const events = new Map();
  const documentEvents = new Map();
  const timers = [];
  const localStorage = options.localStorage || memoryStorage();
  const sessionStorage = options.sessionStorage || memoryStorage();
  const add = (map) => (name, callback) => { map.set(name, [...(map.get(name) || []), callback]); };
  const emit = (map, name, event = {}) => { for (const callback of map.get(name) || []) callback(event); };
  const element = () => ({ content: options.surface || "app", appendChild() {}, prepend() {}, setAttribute() {}, addEventListener() {} });
  const document = {
    referrer: options.referrer || "", readyState: "loading", visibilityState: "visible",
    hasFocus: () => document.focused, focused: true,
    documentElement: { lang: "pt" }, querySelector: () => element(), createElement: element,
    body: { appendChild() {} }, addEventListener: add(documentEvents)
  };
  Object.assign(document, options.windowLayout);
  const window = {
    document, location: new URL("https://webmars.test/"), localStorage, sessionStorage,
    WebMarsAppVersion: { build: options.build },
    WebMarsConfig: { appBasePath: "/", metrics: { enabled: options.enabled ?? true, endpoint: options.endpoint || "https://webmars.test/_metrics/events" } },
    navigator: { language: "pt", ...options.navigator }, crypto: webcrypto, performance: { now: options.performanceNow || (() => now) },
    matchMedia: () => ({ matches: false }), addEventListener: add(events), setInterval: (fn) => timers.push(fn),
    dispatchEvent: (event) => emit(events, event.type, event),
    fetch: (url, request) => { sent.push({ url, request, body: JSON.parse(request.body) }); return options.failFetch ? Promise.reject(new Error("offline")) : Promise.resolve({ ok: true }); }
  };
  class Clock extends Date { static now() { return now; } }
  vm.runInNewContext(source, { window, URL, Uint8Array, Date: Clock, Event, Promise });
  if (options.heartbeat) vm.runInNewContext(heartbeatSource, { window, document });
  emit(documentEvents, "DOMContentLoaded");
  return {
    window, document, sent, localStorage, sessionStorage,
    emit: (name, event) => emit(events, name, event),
    documentEmit: (name, event) => emit(documentEvents, name, event),
    elapse: (ms) => { now += ms; },
    advance: (ms) => { now += ms; for (const callback of timers) callback(); },
    api: window.WebMarsUsage
  };
}

test("all event types, including heartbeat, carry the deployed build", () => {
  const env = harness({ build: "202611.08.2321" });
  env.api.track("run_success");
  env.api.trackHeartbeat(60);
  assert.equal(env.sent.length, 3);
  assert(env.sent.every(({ body }) => body.build === "202611.08.2321"));
  assert.equal(harness({ build: "not-a-build" }).sent[0].body.build, "unknown");
});

test("disabled and cross-origin configurations send nothing", () => {
  for (const options of [{ enabled: false }, { endpoint: "https://other.example/events" }]) {
    const env = harness(options);
    env.api.track("run_success");
    env.advance(30000);
    assert.equal(env.sent.length, 0);
    assert.equal(env.sessionStorage.data.size, 0);
    env.api.track("run_success");
    assert.equal(env.sent.length, 0);
  }
});

test("operation diagnostics carry only bounded categories and a separate millisecond sample", () => {
  const env = harness();
  assert.equal(env.api.trackOperationTime("compile_ok", 124), true);
  assert.equal(env.sent.at(-1).body.milliseconds, 124);
  assert.equal(env.sent.at(-1).body.seconds, 0);
  assert.equal(env.api.trackOperationTime("assemble_error", 120000), true);
  assert.equal(env.api.track("operation_error", "run_memory_read"), true);
  assert.equal(Object.hasOwn(env.sent.at(-1).body, "milliseconds"), false);
  const count = env.sent.length;
  assert.equal(env.api.trackOperationTime("assemble_error", 120001), false);
  assert.equal(env.api.trackOperationTime("compile_ok", 1.5), false);
  assert.equal(env.api.trackOperationTime("private-file.asm", 100), false);
  assert.equal(env.api.track("operation_time", "assemble_ok"), false);
  assert.equal(env.api.track("operation_error", "address 0x1234"), false);
  assert.equal(env.api.track("window_time", "help"), false);
  assert.equal(env.sent.length, count);
  assert.equal(harness({ surface: "learn" }).api.trackOperationTime("compile_ok", 124), false);
});

test("window time tracks visible categories concurrently, excluding covered and minimized windows", () => {
  const box = (id, left, right, options = {}) => ({
    id, dataset: { toolId: options.toolId }, minimized: false,
    matches() { return this.minimized; },
    querySelector() { return options.panel; },
    getBoundingClientRect() { return { left, right, top: 0, bottom: 100 }; },
    contains(node) { return node === this; }
  });
  const editor = box("main-panel-editor", 0, 40);
  const main = box("window-main", 0, 40, { panel: editor });
  const messages = box("window-messages", 40, 60);
  const help = box("window-help-manual", 40, 60);
  const tool = box("window-tool-cache-simulator", 60, 80, { toolId: "cache-simulator" });
  const settings = box("window-interface-preferences-23", 80, 100);
  const outside = box("window-registers", 101, 120);
  const windows = [main, messages, help, tool, settings, outside];
  const env = harness({ windowLayout: {
    documentElement: { lang: "pt", clientWidth: 100, clientHeight: 100 },
    getElementById: () => ({ querySelectorAll: () => windows }),
    elementFromPoint(x) {
      const top = windows.findLast(win => !win.minimized && x >= win.getBoundingClientRect().left && x < win.getBoundingClientRect().right);
      return top === main ? editor : top;
    }
  } });
  const windowEvents = () => env.sent.filter(entry => entry.body.event === "window_time").map(({ body }) => [body.detail, body.seconds]);
  env.emit("webmars:scripts-loaded", { detail: { ok: true } });
  env.advance(5000);
  env.document.visibilityState = "hidden";
  env.documentEmit("visibilitychange");
  assert.deepEqual(windowEvents(), [["editor", 5], ["help", 5], ["tool_cache-simulator", 5], ["settings", 5]]);
  env.advance(120000);
  help.minimized = true;
  tool.minimized = true;
  env.document.visibilityState = "visible";
  env.documentEmit("visibilitychange");
  env.elapse(2400);
  env.emit("pagehide");
  assert.deepEqual(windowEvents().slice(4), [["editor", 2], ["settings", 2], ["messages", 2]]);
});

test("startup duration is bucketed once per app document and carries no failure text", () => {
  for (const [elapsed, expected] of [[999, "under_1s"], [1000, "1_to_3s"], [3000, "3_to_8s"], [8000, "8s_or_more"]]) {
    const env = harness({ performanceNow: () => elapsed });
    env.emit("webmars:scripts-loaded", { detail: { ok: true } });
    env.emit("webmars:scripts-loaded", { detail: { ok: true } });
    assert.deepEqual(env.sent.filter(({ body }) => body.event === "app_startup").map(({ body }) => body.detail), [expected]);
    assert(env.sent.some(({ body }) => body.event === "app_ready"));
  }
  const env = harness({ performanceNow: () => 100 });
  env.emit("webmars:scripts-loaded", { detail: { ok: false, failedModule: "private.js" } });
  env.emit("webmars:scripts-loaded", { detail: { ok: true } });
  assert.deepEqual(env.sent.filter(({ body }) => body.event === "app_startup").map(({ body }) => body.detail), ["failed"]);
  assert(env.sent.every(({ request }) => !request.body.includes("private.js")));
  for (const options of [{ performanceNow: () => NaN }, { surface: "learn" }]) {
    const invalid = harness(options);
    invalid.emit("webmars:scripts-loaded", { detail: { ok: true } });
    assert(!invalid.sent.some(({ body }) => body.event === "app_startup"));
  }
});

test("runtime outcome and fault details expose only fixed categories", () => {
  const env = harness();
  for (const event of ["run_stopped", "run_fallthrough", "run_input_cancelled"]) {
    assert.equal(env.api.track(event, "private details"), true);
    assert.equal(env.sent.at(-1).body.detail, "none");
  }
  for (const detail of ["address", "syscall", "instruction", "arithmetic", "trap", "interrupt", "other"]) {
    assert.equal(env.api.track("run_fault_group", detail), true);
    assert.equal(env.sent.at(-1).body.detail, detail);
  }
  assert.equal(env.api.track("run_fault_group", "private details"), false);
  assert.equal(env.api.track("app_startup", "private details"), false);
  assert.equal(harness({ surface: "learn" }).api.track("run_fault_group", "address"), false);
});

test("automatic collection ignores old preference choices and browser signals", () => {
  for (const navigator of [{}, { doNotTrack: "1" }, { globalPrivacyControl: true }]) {
    const localStorage = memoryStorage();
    localStorage.setItem("webmars-metrics-choice-v1", "no");
    const env = harness({ navigator, localStorage });
    assert.equal(env.sent[0].body.event, "page_view");
    env.api.track("run_success");
    assert.equal(env.sent.at(-1).body.event, "run_success");
    assert.equal(env.api.setConsent, undefined);
    assert.equal(env.api.available, undefined);
  }
});

test("automatic events send only allowlisted data without visitor content", () => {
  const env = harness({ referrer: "https://www.google.com/search?q=private-query" });
  env.emit("webmars:scripts-loaded", { detail: { ok: true } });
  env.api.exampleOpened("lesson02-twos-complement");
  env.api.exampleOpened("private-project-name");
  env.api.track("source_code", "secret");
  env.api.track("run_success", "secret-output");
  assert.equal(env.sent.at(-1).body.detail, "none");
  assert.equal(env.sent.at(-1).body.source, "search");
  assert.deepEqual(env.sent.filter((entry) => entry.body.event === "example_open").map((entry) => entry.body.detail), ["lesson02", "other"]);
  for (const { request, url } of env.sent) {
    assert.equal(request.credentials, "omit");
    assert.equal(request.mode, "cors");
    assert.equal(request.redirect, "error");
    assert.equal(request.referrerPolicy, "no-referrer");
    assert.equal(url, "https://webmars.test/_metrics/events");
    assert.doesNotMatch(request.body, /private|secret|search\?q/);
  }
});

test("heartbeat events reuse the visit session and carry cumulative seconds", () => {
  const env = harness();
  const visitSession = env.sent[0].body.session;
  assert.equal(env.api.getSessionId(), visitSession);
  assert.equal(env.api.trackHeartbeat(60), true);
  const heartbeat = env.sent.at(-1).body;
  assert.equal(heartbeat.event, "heartbeat");
  assert.equal(heartbeat.session, visitSession);
  assert.equal(heartbeat.seconds, 60);
  assert.equal(heartbeat.detail, "none");
});

test("a new session still receives presence after a day on the same page", () => {
  const env = harness();
  assert.equal(env.api.trackHeartbeat(86400), true);
  env.api.rotateSession();
  assert.equal(env.api.trackHeartbeat(86460), true);
  assert.equal(env.sent.at(-1).body.event, "heartbeat");
  assert.equal(env.sent.at(-1).body.seconds, 60);
});

test("presence and resource adoption survive reloads without double counting", () => {
  const first = harness();
  first.api.trackHeartbeat(60);
  first.api.track("tool_open", "pipeline-lab");
  const next = harness({localStorage:first.localStorage, sessionStorage:first.sessionStorage});
  next.api.trackHeartbeat(20);
  assert.equal(next.sent.at(-1).body.seconds, 80);
  assert.equal(next.api.trackHeartbeat(20), false);
  assert.equal(next.api.track("tool_open", "pipeline-lab"), false);
});

test("opening a page and synthetic input do not count as interaction time", () => {
  const env = harness();
  env.emit("pointerdown", {isTrusted:false});
  for (let i=0; i<12; i++) env.advance(5000);
  assert.equal(env.sent.some(e=>e.body.event==="active_time"),false);
  env.emit("pointerdown", {isTrusted:true});
  for (let i=0; i<6; i++) env.advance(5000);
  assert.equal(env.sent.at(-1).body.seconds,30);
});

test("interaction starts at the first trusted input rather than the previous sample", () => {
  const env = harness();
  env.elapse(4900);
  env.emit("pointerdown", { isTrusted: true });
  env.advance(1100);
  env.emit("pagehide");
  assert.equal(env.sent.at(-1).body.event, "active_time");
  assert.equal(env.sent.at(-1).body.seconds, 1);
});

test("interaction evidence survives same-session reloads and renews after the idle timeout", () => {
  const first = harness();
  first.emit("pointerdown", { isTrusted: true });
  const id = first.sent.at(-1).body.session;
  const second = harness({ localStorage: first.localStorage, sessionStorage: first.sessionStorage });
  assert.equal(second.sent[0].body.session, id);
  assert.equal(second.sent[0].body.interaction, "trusted");
  second.emit("keydown", { isTrusted: true });
  assert.equal(second.sent.length, 1);
  second.elapse(31 * 60000);
  second.emit("keydown", { isTrusted: true });
  assert.equal(second.sent.at(-1).body.event, "interaction");
  assert.equal(second.sent.at(-1).body.interaction, "trusted");
  assert.notEqual(second.sent.at(-1).body.session, id);
});

test("a context change flushes both clocks to the old visit and starts the new visit without inherited input", () => {
  const env = harness({ heartbeat: true });
  const original = env.sent[0].body.session;
  env.emit("pointerdown", { isTrusted: true });
  env.advance(5000);
  env.advance(5000);
  env.elapse(2000);
  env.api.setContext("internal");
  assert.deepEqual(env.sent.slice(2).map(({ body }) => [body.event, body.seconds, body.context, body.session]), [
    ["active_time", 12, "public", original],
    ["heartbeat", 12, "public", original]
  ]);
  env.api.track("app_ready");
  const next = env.sent.at(-1).body;
  assert.equal(next.context, "internal");
  assert.notEqual(next.session, original);
  assert.equal(next.interaction, "not_seen");
  assert.equal(next.seconds, 0);
  env.advance(5000);
  env.emit("pagehide");
  assert.equal(env.sent.at(-1).body.event, "heartbeat");
  assert.equal(env.sent.at(-1).body.seconds, 5);
  assert.equal(env.sent.at(-1).body.session, next.session);
});

test("resource adoption accepts shipped IDs and deduplicates rapid repeated actions", async () => {
  const env = harness();
  const manifest = JSON.parse(await readFile(new URL("../tools/tools.json", import.meta.url), "utf8"));
  for (const tool of manifest.tools) {
    assert.equal(env.api.track("tool_open", tool.id), true, tool.id);
    assert.equal(env.api.track("tool_open", tool.id), false);
  }
  for (const feature of ["step", "backstep", "run", "compile", "assemble", "reset", "pause", "breakpoint", "input_wait", "project_manager", "project_save", "project_import", "cloud_save", "cloud_load", "help", "teacher_kit"]) {
    assert.equal(env.api.track("feature_use", feature), true);
    assert.equal(env.api.track("feature_use", feature), false);
  }
  const count = env.sent.length;
  env.api.track("tool_open", "private-project.asm");
  env.api.track("feature_use", "my-account@example.org");
  assert.equal(env.sent.length, count);
  env.advance(31 * 60000);
  assert.equal(env.api.track("tool_open", "pipeline-lab"), true);
});

test("active time excludes hidden, unfocused, idle pages and long timer suspension", () => {
  const env = harness();
  env.emit("pointerdown", {isTrusted: true});
  for (let i = 0; i < 6; i++) env.advance(5000);
  assert.equal(env.sent.at(-1).body.event, "active_time");
  assert.equal(env.sent.at(-1).body.seconds, 30);
  env.document.visibilityState = "hidden";
  env.advance(5000);
  env.document.visibilityState = "visible";
  env.document.focused = false;
  env.advance(5000);
  env.document.focused = true;
  env.advance(120000);
  env.api.track("run_success");
  assert.equal(env.sent.at(-1).body.seconds, 30);
  env.emit("keydown", {isTrusted: true});
  env.advance(5000);
  env.emit("pagehide");
  assert.equal(env.sent.at(-1).body.seconds, 35);
});

test("session survives same-tab navigation and rotates after inactivity with coarse return category", () => {
  const first = harness();
  const id = first.sent.at(-1).body.session;
  const next = harness({ localStorage: first.localStorage, sessionStorage: first.sessionStorage });
  next.api.track("app_ready");
  assert.equal(next.sent.at(-1).body.session, id);
  next.advance(8 * 86400000);
  next.api.track("app_ready");
  assert.notEqual(next.sent.at(-1).body.session, id);
  assert.equal(next.sent.at(-1).body.returning, "days_7_30");
});

test("malformed stored sessions cannot leak arbitrary strings", () => {
  const env = harness();
  env.localStorage.setItem("webmars-metrics-choice-v1", "yes");
  env.sessionStorage.setItem("webmars-metrics-session-v1", JSON.stringify({ id: "a".repeat(32), touched: 1788600000000, returning: "private data", source: "secret source" }));
  env.api.track("app_ready");
  assert.equal(env.sent.at(-1).body.returning, "new");
  assert.doesNotMatch(env.sent.at(-1).request.body, /private|secret/);
});

test("network and storage failures do not interrupt the app", async () => {
  const env = harness({ failFetch: true });
  assert.doesNotThrow(() => env.api.track("run_success"));
  await Promise.resolve();
  const badStorage = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); }, removeItem() { throw Error("blocked"); } };
  const blocked = harness({ localStorage: badStorage, sessionStorage: badStorage });
  assert.equal(blocked.sent[0].body.event, "page_view");
  const id = blocked.sent[0].body.session;
  assert.doesNotThrow(() => blocked.api.track("run_success"));
  assert.equal(blocked.sent.at(-1).body.session, id);
  const newPage = harness({ localStorage: badStorage, sessionStorage: badStorage });
  assert.notEqual(newPage.sent[0].body.session, id);
});

test("metrics explanation is absent from Interface preferences and resource hooks are connected", async () => {
  const runtime = await readFile(new URL("../assets/js/app-modules/20-app-runtime.js", import.meta.url), "utf8");
  const panel = runtime.slice(runtime.indexOf("async function openInterfacePreferencesPanel("), runtime.indexOf("function resolveRuntimeMemoryPreferenceSelection("));
  assert.doesNotMatch(panel, /WebMarsUsage|usageMetricsEnabled|Usage statistics|Estatísticas/);
  const manager = await readFile(new URL("../assets/js/app-modules/12-ui-tool-manager.js", import.meta.url), "utf8");
  assert.match(manager, /tool\.open\(\);\s*window\.WebMarsUsage\?\.track\("tool_open", toolId\)/);
  const projectManager = await readFile(new URL("../assets/js/app-modules/21-project-manager.js", import.meta.url), "utf8");
  assert.match(projectManager, /current\.open\(location\);\s*root\.WebMarsUsage\?\.track\("feature_use", "project_manager"\)/);
  assert.match(runtime, /WebMarsUsage\?\.track\(ok \? "compile_success" : "compile_error"\)/);
});

test("build statistics sort both current and legacy build formats by date", async () => {
  const source = await readFile(new URL("../assets/js/app-modules/19-usage-statistics.js", import.meta.url), "utf8");
  const buildRows = source.match(/    function buildRows\(data\) \{[\s\S]*?\n    \}/)[0];
  const sortRows = vm.runInNewContext(`(${buildRows})`);
  const rows = sortRows({ breakdowns: { build: [
    { key: "unknown" },
    { key: "202611.10.2137" },
    { key: "202611102033" },
    { key: "202611.13.2140" }
  ] } });
  assert.deepEqual(Array.from(rows, row => row.key), [
    "202611.13.2140", "202611.10.2137", "202611102033", "unknown"
  ]);
});

test("statistics keep the observed part of each covered interval", async () => {
  const source = await readFile(new URL("../assets/js/app-modules/19-usage-statistics.js", import.meta.url), "utf8");
  const timelineRows = source.match(/  function timelineRows\(data\) \{[\s\S]*?\n  \}/)[0];
  const timeline = vm.runInNewContext(`(${timelineRows})`);
  const date = (time) => `2026-11-18T${time}:00Z`;
  const rows = [
    { from: date("20:49"), through: date("20:50"), until: date("20:50") },
    { from: date("20:50"), through: date("20:51"), until: date("20:51") },
    { from: date("20:51"), through: date("20:52"), until: date("20:52") },
    { from: date("20:52"), through: date("20:52"), until: date("20:53") }
  ];
  const collectedFrom = "2026-11-18T20:50:15Z";
  assert.deepEqual(Array.from(timeline({ timeline: rows, quality: { collected_from: collectedFrom } }),
    row => [row.observedFrom, row.partial]), [[collectedFrom, true], [date("20:51"), false], [date("20:52"), true]]);
  assert.equal(timeline({ timeline: rows, quality: { collected_from: null } }).length, 0);
  assert.equal(timeline({ timeline: rows }).length, 4);
});

test("action rates use result events and leave unavailable session counts empty", async () => {
  const source = await readFile(new URL("../assets/js/app-modules/19-usage-statistics.js", import.meta.url), "utf8");
  const stages = source.match(/  const STAGES = .*;/)[0];
  const workflowRows = source.match(/  function workflowRows\(data\) \{[\s\S]*?\n  \}/)[0];
  const workflow = vm.runInNewContext(`${stages}\n(${workflowRows})`);
  const breakdowns = { events: [
    { key: "compile_success", events: 2, sessions: 1 }, { key: "compile_error", events: 1, sessions: 1 },
    { key: "run_error", events: 1, sessions: 1 }
  ] };
  const rows = workflow({ breakdowns, workflow: [{ stage: "run", sessions: 1, error_only_sessions: 1, successes: 0, errors: 1 }] });
  assert.deepEqual(Array.from(rows, row => [row.stage, row.sessions, row.errorOnlySessions, row.successRate]), [
    ["compile", undefined, undefined, 2 / 3], ["assemble", undefined, undefined, null], ["run", 1, 1, 0]
  ]);
});

test("segment comparisons filter by sample size and rank by rates rather than raw totals", async () => {
  const view = await readFile(new URL("../assets/js/app-modules/19-usage-statistics.js", import.meta.url), "utf8");
  const definition = view.match(/  function segmentRows\(analysis, dimension, minimum, sort\) \{[\s\S]*?\n  \}/)[0];
  const rows = vm.runInNewContext(`(${definition})`);
  const analysis = { segments: { source: [
    { key: "direct", sessions: 100, interacting_sessions: 80, successful_sessions: 40 },
    { key: "search", sessions: 20, interacting_sessions: 10, successful_sessions: 16 },
    { key: "social", sessions: 2, interacting_sessions: 2, successful_sessions: 2 }
  ] } };
  const keys = (dimension, minimum, sort) => Array.from(rows(analysis, dimension, minimum, sort), row => row.key);
  assert.deepEqual(keys("source", 5, "successful_sessions"), ["search", "direct"]);
  assert.deepEqual(keys("source", 5, "interacting_sessions"), ["direct", "search"]);
  assert.deepEqual(keys("device", 1, "sessions"), []);
  assert.equal(analysis.segments.source[0].key, "direct");
});

test("execution distinguishes normal exit, fall-through, cancellation, and structured faults", async () => {
  const runtime = await readFile(new URL("../assets/js/app-modules/20-app-runtime.js", import.meta.url), "utf8");
  const start = runtime.indexOf("function postExecutionSuccess(");
  const end = runtime.indexOf("let audioContext", start);
  const events = [];
  const context = { window: { WebMarsUsage: { track: (...args) => events.push(args) } }, translateText: (s) => s, postMarsSystemLine() {}, postRunSystemLine() {}, postMarsRaw() {}, formatDiagnosticMessage() {}, messagesPane: {} };
  vm.createContext(context);
  vm.runInContext(runtime.slice(start, end), context);
  vm.runInContext('postExecutionSuccess("Go", "cliff"); postExecutionSuccess("Step", "user"); postExecutionSuccess("Go")', context);
  assert.deepEqual(events, [["run_fallthrough"], ["run_input_cancelled"]]);
  vm.runInContext('postExecutionSuccess("Step", "exit"); postExecutionError("Go", "private-error", "address", "run_memory_read"); postExecutionError("Step", "another message")', context);
  assert.deepEqual(events.slice(2), [["run_success"], ["run_error"], ["run_fault_group", "address"], ["operation_error", "run_memory_read"],
    ["run_error"], ["operation_error", "run_other"]]);
});
