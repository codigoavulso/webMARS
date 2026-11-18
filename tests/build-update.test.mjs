import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../assets/js/build-update.js", import.meta.url), "utf8");
const script = new vm.Script(source, { filename: "build-update.js" });
const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);
const BUILD = "202611.13.2212";
const BASE = "https://webmars.test/mips/";
const MARKER = "webmars:build-update";
const UPDATE_PARAM = "__webmars_update";
const flush = () => new Promise((resolve) => setImmediate(resolve));

function browser(options = {}) {
  let time = options.time ?? 1_000;
  let nextTimer = 0;
  const listeners = new Map();
  const timers = new Map();
  const session = options.session ?? new Map();
  const requests = [];
  const navigations = [];
  const events = [];
  const history = { state: { existing: 1 }, replaceState(state, _, href) {
    assert.equal(state, history.state);
    window.location.href = href;
  } };
  function on(target, name, handler, config) {
    listeners.set(`${target}:${name}`, { handler, once: config?.once === true });
  }
  function emit(name, target = "window") {
    const key = `${target}:${name}`;
    const listener = listeners.get(key);
    if (listener?.once) listeners.delete(key);
    listener?.handler();
  }
  function timer(fn, delay, repeating) {
    const id = ++nextTimer;
    timers.set(id, { fn, delay, at: time + delay, repeating });
    return id;
  }
  const document = {
    baseURI: options.base ?? BASE,
    visibilityState: "visible",
    addEventListener: (...args) => on("document", ...args)
  };
  const window = {
    location: { href: options.href ?? BASE, replace: (href) => navigations.push(href) },
    history,
    navigator: { onLine: true },
    sessionStorage: {
      getItem: (key) => session.get(key) ?? null,
      setItem: (key, value) => {
        if (options.blockStorage) throw Error("Blocked storage");
        session.set(key, value);
      },
      removeItem: (key) => session.delete(key)
    },
    crypto: { getRandomValues: (bytes) => bytes.fill(7) },
    WebMarsAppVersion: { id: options.id === undefined ? A : options.id },
    WebMarsBuildUpdateRuntime: {
      reload(navigate) {
        if (options.safe && !options.safe()) return false;
        navigate();
        return true;
      }
    },
    WebMarsUsage: {
      trackBuildUpdate(phase, transition) {
        events.push({ phase, ...transition });
        return options.track?.(phase) ?? true;
      }
    },
    fetch(url, request) {
      requests.push({ url, request });
      return options.fetch?.(request) ?? Promise.resolve({
        ok: true,
        json: () => ({ id: options.published?.() ?? options.id ?? A, build: BUILD })
      });
    },
    addEventListener: (...args) => on("window", ...args),
    setTimeout: (fn, delay) => timer(fn, delay, false),
    setInterval: (fn, delay) => timer(fn, delay, true),
    clearTimeout: (id) => timers.delete(id)
  };
  script.runInNewContext({ window, document, URL, AbortController, Date: { now: () => time } });
  return {
    window, session, requests, navigations, events, emit,
    ready: () => emit("webmars:ready"),
    show(visible) {
      document.visibilityState = visible ? "visible" : "hidden";
      emit("visibilitychange", "document");
    },
    advance(ms) {
      time += ms;
      for (const [id, task] of [...timers]) {
        if (task.at > time) continue;
        if (task.repeating) task.at = time + task.delay;
        else timers.delete(id);
        task.fn();
      }
    }
  };
}

test("a retained tab discovers the next build on return and confirms it after runtime startup", async () => {
  let published = A;
  const href = `${BASE}p/intro@2?lang=pt#editor`;
  const before = browser({ href, published: () => published });
  before.emit("pageshow");
  assert.equal(before.requests.length, 0);
  before.ready();
  await flush();
  assert.deepEqual(before.navigations, []);
  before.show(false);
  before.advance(3 * 24 * 60 * 60 * 1_000);
  assert.equal(before.requests.length, 1);

  published = B;
  before.show(true);
  before.emit("focus");
  before.emit("pageshow");
  await flush();
  assert.equal(before.requests.length, 2);
  assert.equal(before.requests[1].url, `${BASE}build.json`);
  assert.equal(before.requests[1].request.cache, "no-store");
  assert.equal(before.requests[1].request.redirect, "error");
  assert.deepEqual(before.navigations, [`${BASE}p/intro@2?lang=pt&${UPDATE_PARAM}=${B}#editor`]);
  const transition = { id: "07".repeat(16), from: A, to: B };
  assert.deepEqual(before.events, [{ phase: "attempted", ...transition }]);

  const next = browser({ id: B, href: before.navigations[0], session: before.session });
  assert.equal(next.window.WebMarsBuildUpdate.isReload, true);
  assert.equal(next.window.location.href, href);
  assert.deepEqual(next.events, []);
  next.ready();
  await flush();
  assert.deepEqual(next.events, [{ phase: "completed", ...transition }]);
  assert.equal(next.session.has(MARKER), false);
  assert.deepEqual(next.navigations, []);
});

test("a stale HTML response restores the handoff without repeatedly navigating or recording completion", async () => {
  let published = B;
  const before = browser({ published: () => published });
  before.ready();
  await flush();
  const stale = browser({ href: before.navigations[0], session: before.session, published: () => published });
  assert.equal(stale.window.WebMarsBuildUpdate.isReload, true);
  assert.equal(stale.window.location.href, BASE);
  stale.ready();
  await flush();
  stale.advance(30_000);
  await flush();
  assert.equal(stale.requests.length, 2);
  assert.deepEqual(stale.navigations, []);
  assert.deepEqual(stale.events, []);

  published = C;
  stale.advance(30_000);
  await flush();
  assert.deepEqual(stale.navigations, [`${BASE}?${UPDATE_PARAM}=${C}`]);
});

test("a third build served during navigation restores the handoff without confirming the requested target", async () => {
  const before = browser({ published: () => B });
  before.ready();
  await flush();
  const overshot = browser({ id: C, href: before.navigations[0], session: before.session });
  assert.equal(overshot.window.WebMarsBuildUpdate.isReload, true);
  overshot.ready();
  await flush();
  assert.deepEqual(overshot.events, []);
});

test("the reload waits for a safe runtime and an available tab marker", async () => {
  let safe = false;
  const env = browser({ published: () => B, safe: () => safe });
  env.ready();
  await flush();
  assert.equal(env.session.has(MARKER), false);
  assert.deepEqual(env.navigations, []);
  assert.deepEqual(env.events, []);
  safe = true;
  env.advance(30_000);
  await flush();
  assert.equal(env.navigations.length, 1);

  const blocked = browser({ published: () => B, blockStorage: true });
  blocked.ready();
  await flush();
  assert.deepEqual(blocked.navigations, []);
  assert.deepEqual(blocked.events, []);
});

test("the online event rechecks while a timeout or invalid response never starts an update", async () => {
  let connected = false;
  const env = browser({ fetch: ({ signal }) => new Promise((resolve, reject) => {
    if (connected) resolve({ ok: true, json: () => ({ id: B, build: BUILD }) });
    else signal.addEventListener("abort", () => reject(Error("timeout")), { once: true });
  }) });
  env.ready();
  env.advance(5_000);
  await flush();
  assert.equal(env.requests[0].request.signal.aborted, true);
  assert.deepEqual(env.navigations, []);
  env.window.navigator.onLine = false;
  env.emit("pagehide");
  env.emit("pageshow");
  assert.equal(env.requests.length, 1);
  connected = true;
  env.window.navigator.onLine = true;
  env.emit("online");
  await flush();
  assert.equal(env.navigations.length, 1);

  for (const manifest of [{ id: [B], build: BUILD }, { id: B, build: "not a build" }, { id: "bad", build: BUILD }]) {
    const invalid = browser({ fetch: () => Promise.resolve({ ok: true, json: () => manifest }) });
    invalid.ready();
    await flush();
    assert.deepEqual(invalid.navigations, []);
  }
});

test("confirmation can be retried after reload and collector failure never delays navigation", async () => {
  const before = browser({ published: () => B, track: () => new Promise(() => {}) });
  before.ready();
  await flush();
  assert.equal(before.navigations.length, 1);

  const ordinary = browser({ id: B, session: before.session });
  ordinary.ready();
  await flush();
  assert.deepEqual(ordinary.events, []);

  const offline = browser({ id: B, session: before.session, href: before.navigations[0] });
  offline.window.navigator.onLine = false;
  offline.ready();
  await flush();
  assert.equal(JSON.parse(offline.session.get(MARKER)).arrived, true);
  assert.deepEqual(offline.events, []);

  let ack = false;
  const after = browser({ id: B, session: offline.session, track: () => ack });
  after.ready();
  await flush();
  assert.deepEqual(after.events.map(({ phase }) => phase), ["completed"]);
  assert.equal(after.session.has(MARKER), true);
  ack = true;
  after.advance(30_000);
  await flush();
  assert.deepEqual(after.events.map(({ phase }) => phase), ["completed", "completed"]);
  assert.equal(after.events[0].id, after.events[1].id);
  assert.equal(after.session.has(MARKER), false);
});

test("an unavailable collector cannot trigger unbounded completion retries", async () => {
  const before = browser({ published: () => B });
  before.ready();
  await flush();
  const after = browser({ id: B, href: before.navigations[0], session: before.session, track: () => false });
  after.ready();
  await flush();
  for (let poll = 0; poll < 7; poll += 1) {
    after.advance(30_000);
    await flush();
  }
  assert.deepEqual(after.events.map(({ phase }) => phase), Array(5).fill("completed"));
  const later = browser({ id: B, session: after.session });
  later.ready();
  await flush();
  assert.deepEqual(later.events, []);
});

test("a source checkout or a different manifest origin makes no version requests", async () => {
  for (const options of [{ id: null }, { base: "https://another.test/" }]) {
    const env = browser(options);
    env.ready();
    env.advance(60_000);
    await flush();
    assert.deepEqual(env.requests, []);
    assert.deepEqual(env.navigations, []);
  }
});
