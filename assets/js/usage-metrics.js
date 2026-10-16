/* Optional first-party product metrics. Never pass editor/runtime data here. */
(function installUsageMetrics(scope) {
  "use strict";
  const config = scope.WebMarsConfig?.metrics;
  const EVENTS = new Set(["page_view", "app_ready", "launch_app", "example_open", "assemble_success", "assemble_error", "run_success", "run_error", "active_time"]);
  const SURFACES = new Set(["overview", "learn", "teach", "stack", "pipeline", "minic", "privacy", "app"]);
  const CONSENT_KEY = "webmars-metrics-choice-v1";
  const SESSION_KEY = "webmars-metrics-session-v1";
  const VISIT_KEY = "webmars-metrics-last-visit-v1";
  const DAY = 86400000;
  const SESSION_IDLE = 30 * 60000;
  const document = scope.document;
  let session = null;
  let lastTick = Date.now();
  let lastInteraction = lastTick;
  let lastSentSeconds = 0;
  let ready = false;
  let endpoint = null;
  try {
    const candidate = new URL(config?.endpoint || "", scope.location.href);
    if (config?.enabled === true && candidate.origin === scope.location.origin && !candidate.search && !candidate.hash && !candidate.username && !candidate.password) endpoint = candidate.href;
  } catch { /* Misconfigured installations collect nothing. */ }
  const surfaceValue = document.querySelector('meta[name="webmars-surface"]')?.content || "app";
  const surface = SURFACES.has(surfaceValue) ? surfaceValue : "app";
  function read(storage, key) { try { return storage.getItem(key); } catch { return null; } }
  function write(storage, key, value) { try { storage.setItem(key, value); } catch { /* Memory-only session is sufficient. */ } }
  function remove(storage, key) { try { storage.removeItem(key); } catch { /* Storage may be unavailable. */ } }
  function storage(name) { try { return scope[name]; } catch { return null; } }
  const local = storage("localStorage");
  const tab = storage("sessionStorage");
  const localReadable = (() => {
    try { return Boolean(local) && typeof local.getItem === "function" && (local.getItem(CONSENT_KEY), true); }
    catch { return false; }
  })();
  function blocked() { return scope.navigator.globalPrivacyControl === true || scope.navigator.doNotTrack === "1"; }
  // The official instance starts with anonymous product signals enabled.  A
  // stored "no" is an immediate, persistent opt-out; browser privacy signals
  // always win over either choice.
  function allowed() { return Boolean(endpoint) && localReadable && !blocked() && read(local, CONSENT_KEY) !== "no"; }
  function available() { return Boolean(endpoint) && localReadable && !blocked(); }
  function sourceCategory() {
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host === scope.location.hostname) return "internal";
      if (/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com)$/.test(host)) return "search";
      if (/(^|\.)(youtube\.com|youtu\.be|reddit\.com|linkedin\.com|facebook\.com|instagram\.com|t\.co|x\.com)$/.test(host)) return "social";
      return "other";
    } catch { return "direct"; }
  }
  function getSession() {
    const now = Date.now();
    if (!session) {
      try { session = JSON.parse(read(tab, SESSION_KEY)); } catch { session = null; }
    }
    if (!session || !/^[a-f0-9]{32}$/.test(session.id) || !Number.isFinite(session.touched)
      || !["new", "same_day", "days_1_6", "days_7_30", "older"].includes(session.returning)
      || !["direct", "search", "social", "internal", "other"].includes(session.source)
      || now - session.touched >= SESSION_IDLE || now < session.touched) {
      const bytes = new Uint8Array(16);
      if (!scope.crypto?.getRandomValues) return null;
      scope.crypto.getRandomValues(bytes);
      const previous = Number(read(local, VISIT_KEY));
      const days = previous > 0 && previous <= now ? Math.floor((now - previous) / DAY) : null;
      session = {
        id: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
        touched: now, seconds: 0,
        returning: days === null ? "new" : days === 0 ? "same_day" : days < 7 ? "days_1_6" : days < 31 ? "days_7_30" : "older",
        source: sourceCategory()
      };
      write(local, VISIT_KEY, String(now));
      lastSentSeconds = 0;
    }
    session.touched = now;
    session.seconds = Math.max(0, Math.min(86400, Number(session.seconds) || 0));
    write(tab, SESSION_KEY, JSON.stringify(session));
    return session;
  }
  function track(event, detail = "none") {
    if (!allowed() || !EVENTS.has(event)) return false;
    let current;
    try { current = getSession(); } catch { return false; }
    if (!current) return false;
    // Only lesson numbers or the category "other" may cross this boundary.
    const safeDetail = event === "example_open" ? (/^lesson(?:0[1-9]|1[0-5])$/.test(detail) ? detail : "other") : "none";
    const language = String(scope.WebMarsI18n?.getLanguage?.() || document.documentElement.lang || "en").split("-")[0];
    const payload = {
      v: 1, session: current.id, event, surface, detail: safeDetail,
      seconds: Math.floor(current.seconds), returning: current.returning, source: current.source,
      device: scope.matchMedia?.("(pointer: coarse)").matches ? "touch" : "pointer",
      language: /^(en|pt|es|zh|hi|ar|fr|bn|ru|id|de|ja|ko|tr|vi|ur|it|pl|fa|th)$/.test(language) ? language : "other"
    };
    try {
      // No cookies, URL parameters, retries, persistent queue, or third-party host.
      Promise.resolve(scope.fetch(endpoint, {
        // CORS mode preserves Origin with no-referrer. The URL is already
        // restricted to this origin and redirects cannot forward the payload.
        method: "POST", credentials: "omit", mode: "cors", redirect: "error", cache: "no-store",
        referrerPolicy: "no-referrer", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      })).catch(() => {});
    } catch { /* Metrics must never interrupt learning. */ }
    return true;
  }
  function exampleOpened(id) {
    const lesson = /^lesson(0[1-9]|1[0-5])(?:-|$)/.exec(String(id));
    track("example_open", lesson ? `lesson${lesson[1]}` : "other");
  }
  function flush() {
    if (session && session.seconds > lastSentSeconds && track("active_time")) lastSentSeconds = session.seconds;
  }
  function tick() {
    const now = Date.now();
    const elapsed = Math.max(0, Math.min(5000, now - lastTick));
    lastTick = now;
    if (!allowed() || document.visibilityState !== "visible" || !document.hasFocus() || now - lastInteraction > 60000) return;
    let current;
    try { current = getSession(); } catch { return; }
    if (!current) return;
    current.seconds = Math.min(86400, current.seconds + elapsed / 1000);
    write(tab, SESSION_KEY, JSON.stringify(current));
    if (current.seconds - lastSentSeconds >= 30) flush();
  }
  function setConsent(yes) {
    write(local, CONSENT_KEY, yes ? "yes" : "no");
    if (!yes || blocked()) {
      session = null;
      remove(tab, SESSION_KEY);
      remove(local, VISIT_KEY);
    } else {
      lastInteraction = lastTick = Date.now();
      track(surface === "app" && ready ? "app_ready" : "page_view");
    }
  }
  scope.WebMarsUsage = Object.freeze({ track, exampleOpened, setConsent, allowed, available });
  function init() {
    if (!endpoint) return;
    if (blocked()) { remove(tab, SESSION_KEY); remove(local, VISIT_KEY); }
    if (surface !== "app") track("page_view");
    for (const name of ["pointerdown", "keydown", "scroll", "focus"]) {
      scope.addEventListener(name, () => { lastInteraction = Date.now(); }, { passive: true });
    }
    document.addEventListener("click", (event) => {
      if (event.target.closest?.("a[data-launch-app]")) track("launch_app");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") flush();
      lastTick = Date.now();
    });
    scope.addEventListener("pagehide", flush);
    scope.setInterval(tick, 5000);
  }
  scope.addEventListener("webmars:scripts-loaded", (event) => {
    if (event.detail?.ok === true) { ready = true; track("app_ready"); }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
