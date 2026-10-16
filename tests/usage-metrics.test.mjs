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
    env.api.setConsent(true);
    env.api.track("run_success");
    assert.equal(env.sent.length, 0);
  }
});

test("collection starts enabled and a saved opt-out stops it", () => {
  const env = harness();
  env.api.track("run_success");
  assert.equal(env.sent.at(-1).body.event, "run_success");
  env.api.setConsent(false);
  env.api.track("run_success");
  assert.equal(env.sent.filter((entry) => entry.body.event === "run_success").length, 1);
});

test("consent sends only allowlisted data and revocation stops subsequent events", () => {
  const env = harness({ referrer: "https://www.google.com/search?q=private-query" });
  env.api.setConsent(true);
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
  const count = env.sent.length;
  env.api.setConsent(false);
  env.api.track("run_success");
  env.advance(30000);
  assert.equal(env.sent.length, count);
  assert.equal(env.sessionStorage.data.size, 0);
  assert.equal(env.localStorage.getItem("webmars-metrics-last-visit-v1"), null);
});

test("browser privacy signals override saved acceptance", () => {
  for (const navigator of [{ doNotTrack: "1" }, { globalPrivacyControl: true }]) {
    const env = harness({ navigator });
    env.api.setConsent(true);
    env.api.track("app_ready");
    assert.equal(env.sent.length, 0);
  }
});

test("active time excludes hidden, unfocused, idle pages and long timer suspension", () => {
  const env = harness();
  env.api.setConsent(true);
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
  first.api.setConsent(true);
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
  env.api.setConsent(true);
  assert.doesNotThrow(() => env.api.track("run_success"));
  await Promise.resolve();
  const badStorage = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); }, removeItem() { throw Error("blocked"); } };
  const blocked = harness({ localStorage: badStorage, sessionStorage: badStorage });
  assert.doesNotThrow(() => blocked.api.setConsent(true));
  assert.equal(blocked.sent.length, 0);
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
