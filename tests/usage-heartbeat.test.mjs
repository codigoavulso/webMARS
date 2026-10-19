import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const source = await readFile(new URL("../assets/js/active-heartbeat.js", import.meta.url), "utf8");
function browser(options = {}) {
  let time = 0;
  const sent = [];
  const listeners = new Map();
  const timers = [];
  const addEventListener = (name, fn) => listeners.set(name, fn);
  const document = { visibilityState: "visible", addEventListener };
  const window = {
    location: new URL("https://webmars.test/"), performance: { now: () => time },
    WebMarsConfig: { heartbeat: { enabled: options.enabled ?? true, endpoint: options.endpoint || "/_metrics/heartbeat" } },
    addEventListener, setInterval: (fn, delay) => timers.push({ fn, delay }),
    crypto: { getRandomValues(bytes) { bytes.fill(7); return bytes; } },
    WebMarsPresence: { isRegistered: () => options.registered === true },
    WebMarsUsage: options.usage || ((options.enabled ?? true) && !String(options.endpoint || "").startsWith("https://elsewhere") && !String(options.endpoint || "").includes("?") ? { trackHeartbeat(seconds) {
      sent.push({ url: "https://webmars.test/_metrics/events", request: { body: JSON.stringify({ event: "heartbeat", seconds, session: "07070707070707070707070707070707" }) } });
    } } : undefined),
    fetch: (url, request) => { sent.push({ url, request }); return options.offline ? Promise.reject(Error("offline")) : Promise.resolve({ ok: true }); }
  };
  Object.defineProperties(window, {
    localStorage: { get() { throw Error("must not access storage"); } },
    sessionStorage: { get() { throw Error("must not access storage"); } }
  });
  vm.runInNewContext(source, { window, document, URL, Promise });
  return {
    sent, document, timers,
    advance(ms) { time += ms; for (const { fn } of timers) fn(); },
    emit(name) { listeners.get(name)?.(); },
    run(seconds) { for (let i = 0; i < seconds; i += 5) this.advance(5000); }
  };
}

test("heartbeat sends only cumulative seconds every 60 seconds, without storage or cookies", () => {
  const env = browser();
  env.run(55);
  assert.equal(env.sent.length, 0);
  env.run(5);
  env.run(60);
  assert.deepEqual(env.sent.map(({ request }) => JSON.parse(request.body).seconds), [60, 120]);
  for (const { url, request } of env.sent) {
    assert.equal(url, "https://webmars.test/_metrics/events");
    assert.equal(JSON.parse(request.body).event, "heartbeat");
  }
});

test("heartbeat can share the event session and emits a matching heartbeat event", () => {
  const eventSessions = [];
  const env = browser({ usage: {
    getSessionId: () => "abababababababababababababababab",
    trackHeartbeat: (seconds) => { eventSessions.push({ seconds, session: "abababababababababababababababab" }); }
  }});
  env.run(60);
  assert.deepEqual(eventSessions, [{ seconds: 60, session: "abababababababababababababababab" }]);
  assert.equal(env.sent.length, 0);
});

test("heartbeat event reports only its session and cumulative seconds", () => {
  const env = browser({ registered: true });
  env.run(60);
  const body = JSON.parse(env.sent[0].request.body);
  assert.deepEqual(Object.keys(body).sort(), ["event", "seconds", "session"]);
  assert.equal(body.event, "heartbeat");
  assert.equal(body.session.length, 32);
});

test("hidden pages do not accrue active time; visible background tabs continue", () => {
  const env = browser();
  env.run(30);
  env.document.visibilityState = "hidden";
  env.emit("visibilitychange");
  env.run(120);
  assert.equal(env.sent.length, 0);
  env.document.visibilityState = "visible";
  env.emit("visibilitychange");
  env.run(5);
  assert.equal(JSON.parse(env.sent[0].request.body).seconds, 35);
});

test("refresh resets counters; suspension and back-forward cache cannot inflate duration", () => {
  const env = browser();
  env.run(60);
  env.advance(3600000);
  assert.equal(JSON.parse(env.sent.at(-1).request.body).seconds, 65);
  env.emit("pagehide");
  env.run(120);
  const count = env.sent.length;
  env.emit("pageshow");
  env.run(55);
  assert.equal(env.sent.length, count);
  env.run(5);
  assert.equal(JSON.parse(env.sent.at(-1).request.body).seconds, 125);
  const fresh = browser();
  fresh.run(60);
  assert.equal(JSON.parse(fresh.sent[0].request.body).seconds, 60);
});

test("disabled and cross-origin configurations create no timer; failed sends never retry in a burst", async () => {
  for (const options of [{ enabled: false }, { endpoint: "https://elsewhere.test/collect" }, { endpoint: "/collect?user=1" }]) {
    assert.equal(browser(options).timers.length, 0);
  }
  const offline = browser({ offline: true });
  assert.doesNotThrow(() => offline.run(120));
  await Promise.resolve();
  assert.equal(offline.sent.length, 2);
});

test("the app loads the heartbeat and the proxy does not persist or forward visitor headers", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(index, /src="\.\/assets\/js\/active-heartbeat.js"/);
  const proxy = await readFile(new URL("../ops/raspberry-pi/nginx-webmars-metrics.conf", import.meta.url), "utf8");
  const route = proxy.split("location = /_metrics/heartbeat {")[1].split("\n}\n")[0];
  assert.match(route, /access_log off;/);
  assert.match(route, /error_log \/dev\/null crit;/);
  assert.match(route, /proxy_pass_request_headers off;/);
  assert.doesNotMatch(route, /proxy_set_header (?:Cookie|User-Agent|Referer|X-Forwarded-For|X-Real-IP)/i);
});
