import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = await readFile(new URL("../assets/js/usage-metrics.js", import.meta.url), "utf8");
function harness({ webdriver = false, cookie = "", config = {}, store = new Map() } = {}) {
  const sent = [], listeners = new Map();
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: k => store.delete(k) };
  const document = { cookie, referrer: "", readyState: "complete", documentElement: { lang: "en" },
    querySelector: () => null, addEventListener() {} };
  const window = { document, location: new URL("https://webmars.test/"), navigator: { webdriver }, crypto: webcrypto,
    WebMarsConfig: { metrics: { enabled: true, endpoint: "/_metrics/events", ...config } },
    localStorage: storage, sessionStorage: storage, setInterval() {},
    addEventListener: (name, callback) => listeners.set(name, callback),
    fetch: (_url, options) => { sent.push(JSON.parse(options.body)); return Promise.resolve({ok: true}); } };
  vm.runInNewContext(source, { window, URL, Uint8Array, Date, Promise });
  return { sent, api: window.WebMarsUsage, emit: (name, event) => listeners.get(name)?.(event), document, store };
}

test("only trusted input supplies probable-human evidence; webdriver stays explicit", () => {
  const env = harness({ webdriver: true, cookie: `webmars_visit=${"a".repeat(32)}` });
  assert.equal(env.sent[0].v, 2);
  assert.equal(env.sent[0].automation, "webdriver");
  assert.equal(env.sent[0].interaction, "not_seen");
  env.emit("pointerdown", {isTrusted: false});
  assert.equal(env.sent.length, 1);
  env.emit("pointerdown", {isTrusted: true});
  assert.equal(env.sent.at(-1).event, "interaction");
  assert.equal(env.sent.at(-1).interaction, "trusted");
  assert.equal(env.sent.at(-1).visit, "a".repeat(32));
});

test("internal marker persists and starts a fresh session; test deployment cannot be relabelled public", () => {
  const env = harness();
  const before = env.sent[0].session;
  assert.equal(env.api.setContext("internal"), true);
  assert.equal(env.sent.at(-1).context, "internal");
  assert.notEqual(env.sent.at(-1).session, before);
  assert.equal(env.store.get("webmars-metrics-context-v1"), "internal");
  assert.equal(env.api.setContext("account@example.com"), false);
  const preview = harness({config: {context: "test"}});
  assert.equal(preview.api.setContext("public"), false);
  assert.equal(preview.api.getContext(), "test");
});

test("account events accept only provider categories, never emails or account IDs", () => {
  const env = harness();
  assert.equal(env.api.track("login_success", "google"), true);
  assert.equal(env.api.track("account_created", "password"), true);
  assert.equal(env.api.track("account_created", "person@example.com"), false);
  assert.equal(env.api.track("account_created", "12345"), false);
});
