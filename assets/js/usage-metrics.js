/* Automatic first-party statistics. Never pass editor/runtime data here. */
(function installUsageMetrics(scope) {
  "use strict";
  const config = scope.WebMarsConfig?.metrics;
  const EVENTS = new Set(["page_view", "app_ready", "launch_app", "example_open", "assemble_success", "assemble_error", "compile_success", "compile_error", "run_success", "run_error", "active_time", "heartbeat", "tool_open", "feature_use"]);
  // Only shipped product resource identifiers may leave this boundary.
  const TOOLS = new Set(["bht-simulator", "bitmap-display", "bitmap-terminal-tool", "cache-simulator", "digital-lab-sim", "float-representation", "instruction-counter", "instruction-statistics", "intro-to-tools", "keyboard-display-mmio", "mars-bot", "memory-reference-visualization", "mips-xray", "example-register-watch", "pipeline-lab", "scavenger-hunt", "screen-magnifier", "stack-visualizer", "system-clock", "tty-ansi-terminal"]);
  const FEATURES = new Set(["step", "backstep", "run", "project_save", "project_import", "cloud_save", "cloud_load", "help", "teacher_kit"]);
  const SURFACES = new Set(["overview", "learn", "teach", "stack", "pipeline", "minic", "privacy", "app"]);
  const SESSION_KEY = "webmars-metrics-session-v1";
  const VISIT_KEY = "webmars-metrics-last-visit-v1";
  const DAY = 86400000;
  const SESSION_IDLE = 30 * 60000;
  const document = scope.document;
  let session = null;
  let lastTick = Date.now();
  let lastInteraction = lastTick;
  let lastSentSeconds = 0;
  const usedResources = new Set();
  let endpoint = null;
  try {
    const candidate = new URL(config?.endpoint || "", scope.location.href);
    if (config?.enabled === true && candidate.origin === scope.location.origin && !candidate.search && !candidate.hash && !candidate.username && !candidate.password) endpoint = candidate.href;
  } catch { /* Misconfigured installations collect nothing. */ }
  const surfaceValue = document.querySelector('meta[name="webmars-surface"]')?.content || "app";
  const surface = SURFACES.has(surfaceValue) ? surfaceValue : "app";
  function read(storage, key) { try { return storage.getItem(key); } catch { return null; } }
  function write(storage, key, value) { try { storage.setItem(key, value); } catch { /* Memory-only session is sufficient. */ } }
  function storage(name) { try { return scope[name]; } catch { return null; } }
  const local = storage("localStorage");
  const tab = storage("sessionStorage");
  // Installation configuration controls the destination. UI preferences,
  // storage availability and browser signals do not gate statistical events.
  function allowed() { return Boolean(endpoint); }
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
      usedResources.clear();
    }
    session.touched = now;
    session.seconds = Math.max(0, Math.min(86400, Number(session.seconds) || 0));
    write(tab, SESSION_KEY, JSON.stringify(session));
    return session;
  }
  function send(event, detail = "none", secondsOverride = null) {
    if (!allowed() || !EVENTS.has(event)) return false;
    let current;
    try { current = getSession(); } catch { return false; }
    if (!current) return false;
    let safeDetail = "none";
    if (event === "tool_open" || event === "feature_use") {
      if (!(event === "tool_open" ? TOOLS : FEATURES).has(detail)) return false;
      safeDetail = detail;
      // Rank resource adoption once per visit; repeated stepping must not
      // create one request per instruction or dominate the statistics.
      const key = `${event}:${detail}`;
      if (usedResources.has(key)) return false;
      usedResources.add(key);
    } else if (event === "example_open") {
      safeDetail = /^lesson(?:0[1-9]|1[0-5])$/.test(detail) ? detail : "other";
    }
    const language = String(scope.WebMarsI18n?.getLanguage?.() || document.documentElement.lang || "en").split("-")[0];
    const payload = {
      v: 1, session: current.id, event, surface, detail: safeDetail,
      seconds: Number.isInteger(secondsOverride) ? secondsOverride : Math.floor(current.seconds), returning: current.returning, source: current.source,
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
  function track(event, detail = "none") { return send(event, detail); }
  function trackHeartbeat(seconds) {
    return Number.isInteger(seconds) && seconds > 0 ? send("heartbeat", "none", Math.min(31536000, seconds)) : false;
  }
  function getSessionId() {
    try { return getSession()?.id || null; } catch { return null; }
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
  scope.WebMarsUsage = Object.freeze({ track, trackHeartbeat, getSessionId, exampleOpened });
  function init() {
    if (!endpoint) return;
    track("page_view");
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
    if (event.detail?.ok === true) track("app_ready");
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
