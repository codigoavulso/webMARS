import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = await readFile(new URL("../assets/js/usage-metrics.js", import.meta.url), "utf8");
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
  const window = {
    document, location: new URL("https://webmars.test/"), localStorage, sessionStorage,
    WebMarsConfig: { appBasePath: "/", metrics: { enabled: options.enabled ?? true, endpoint: options.endpoint || "https://webmars.test/_metrics/events" } },
    navigator: { language: "pt", ...options.navigator }, crypto: webcrypto,
    matchMedia: () => ({ matches: false }), addEventListener: add(events), setInterval: (fn) => timers.push(fn),
    fetch: (url, request) => { sent.push({ url, request, body: JSON.parse(request.body) }); return options.failFetch ? Promise.reject(new Error("offline")) : Promise.resolve({ ok: true }); }
  };
  class Clock extends Date { static now() { return now; } }
  vm.runInNewContext(source, { window, URL, Uint8Array, Date: Clock, Promise });
  emit(documentEvents, "DOMContentLoaded");
  return {
    window, document, sent, localStorage, sessionStorage,
    emit: (name, event) => emit(events, name, event),
    documentEmit: (name, event) => emit(documentEvents, name, event),
    advance: (ms) => { now += ms; for (const callback of timers) callback(); },
    api: window.WebMarsUsage
  };
}

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

test("resource adoption accepts shipped IDs and deduplicates rapid repeated actions", async () => {
  const env = harness();
  const manifest = JSON.parse(await readFile(new URL("../tools/tools.json", import.meta.url), "utf8"));
  for (const tool of manifest.tools) {
    assert.equal(env.api.track("tool_open", tool.id), true, tool.id);
    assert.equal(env.api.track("tool_open", tool.id), false);
  }
  for (const feature of ["step", "backstep", "run", "project_save", "project_import", "cloud_save", "cloud_load", "help", "teacher_kit"]) {
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
  env.emit("keydown");
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
  assert.match(runtime, /WebMarsUsage\?\.track\(ok \? "compile_success" : "compile_error"\)/);
});

test("assembly and execution hooks do not count pauses or fall-through as success", async () => {
  const runtime = await readFile(new URL("../assets/js/app-modules/20-app-runtime.js", import.meta.url), "utf8");
  const start = runtime.indexOf("function postExecutionSuccess(");
  const end = runtime.indexOf("let audioContext", start);
  const events = [];
  const context = { window: { WebMarsUsage: { track: (event) => events.push(event) } }, translateText: (s) => s, postMarsSystemLine() {}, postRunSystemLine() {}, postMarsRaw() {}, formatDiagnosticMessage() {}, messagesPane: {} };
  vm.createContext(context);
  vm.runInContext(runtime.slice(start, end), context);
  vm.runInContext('postExecutionSuccess("Go", "cliff")', context);
  assert.deepEqual(events, []);
  vm.runInContext('postExecutionSuccess("Step", "exit"); postExecutionError("Go", "private-error")', context);
  assert.deepEqual(events, ["run_success", "run_error"]);
});
