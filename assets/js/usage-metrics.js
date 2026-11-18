/* Automatic first-party statistics. Never pass editor/runtime data here. */
(function installUsageMetrics(scope) {
  "use strict";
  const config = scope.WebMarsConfig?.metrics;
  const APP_EVENTS = new Set(["app_startup", "run_stopped", "run_fallthrough", "run_input_cancelled", "run_fault_group",
    "window_time", "operation_time", "operation_error"]);
  const EVENTS = new Set(["page_view", "app_ready", "launch_app", "example_open", "assemble_success", "assemble_error", "compile_success", "compile_error", "run_success", "run_error", "active_time", "heartbeat", "tool_open", "feature_use", "interaction", "login_start", "login_success", "login_error", "account_created", "account_linked", "manual_chapter_view", ...APP_EVENTS]);
  const BUILD_UPDATE_EVENTS = { attempted: "build_update_attempted", completed: "build_update_completed" };
  const STARTUP_BANDS = [[1000, "under_1s"], [3000, "1_to_3s"], [8000, "3_to_8s"], [Infinity, "8s_or_more"]];
  const RUN_FAULT_GROUPS = new Set(["address", "syscall", "instruction", "arithmetic", "trap", "interrupt", "other"]);
  // Only shipped product resource identifiers may leave this boundary.
  const TOOLS = new Set(["bht-simulator", "bitmap-display", "bitmap-terminal-tool", "cache-simulator", "digital-lab-sim", "float-representation", "instruction-counter", "instruction-statistics", "intro-to-tools", "keyboard-display-mmio", "mars-bot", "memory-reference-visualization", "mips-xray", "example-register-watch", "pipeline-lab", "scavenger-hunt", "screen-magnifier", "stack-visualizer", "system-clock", "tty-midi-daw", "tty-ansi-terminal"]);
  const WINDOW_CATEGORIES = new Set(["help", "settings", "editor", "execute", "messages", "registers", "project_manager",
    ...Array.from(TOOLS, id => `tool_${id}`)]);
  const NATIVE_WINDOWS = { "window-messages": "messages", "window-registers": "registers", "window-project-manager": "project_manager" };
  const MAIN_PANELS = { "main-panel-editor": "editor", "main-panel-execute": "execute", "main-panel-project": "project_manager" };
  const WINDOW_PROBE_POINTS = [0.17, 0.5, 0.83];
  const OPERATION_TIMES = new Set(["compile_ok", "compile_error", "assemble_ok", "assemble_error"]);
  const OPERATION_ERRORS = new Set([
    "compile_include", "compile_lexical", "compile_syntax", "compile_semantic", "compile_subset", "compile_entry_point", "compile_codegen", "compile_internal",
    "assemble_include", "assemble_macro", "assemble_unknown_operator", "assemble_operand_count", "assemble_operand_format", "assemble_undefined_symbol",
    "assemble_duplicate_label", "assemble_directive", "assemble_memory_limit", "assemble_encoding", "assemble_program_arguments", "assemble_warning_as_error", "assemble_other",
    "run_memory_read", "run_memory_write", "run_instruction_fetch", "run_invalid_input", "run_unsupported_syscall", "run_syscall", "run_reserved_instruction",
    "run_overflow", "run_divide_by_zero", "run_break_instruction", "run_trap", "run_interrupt", "run_other"
  ]);
  const FEATURES = new Set(["step", "backstep", "run", "compile", "assemble", "reset", "pause", "breakpoint", "input_wait", "project_manager", "project_save", "project_import", "cloud_save", "cloud_load", "help", "teacher_kit"]);
  const SURFACES = new Set(["overview", "learn", "teach", "stack", "pipeline", "minic", "privacy", "app", "manual"]);
  const DAY = 86400000;
  const SESSION_IDLE = 30 * 60000;
  const INTERACTION_IDLE = 60000;
  const SAMPLE_INTERVAL = 5000;
  const document = scope.document;
  let session = null;
  let lastTick = Date.now();
  let lastInteraction = null;
  let wasFocused = isFocused();
  let lastPresenceSeconds = 0;
  let endpoint = null;
  try {
    const candidate = new URL(config?.endpoint || "", scope.location.href);
    if (config?.enabled === true && candidate.origin === scope.location.origin && !candidate.search && !candidate.hash && !candidate.username && !candidate.password) endpoint = candidate.href;
  } catch { /* Misconfigured installations collect nothing. */ }
  const surfaceValue = document.querySelector('meta[name="webmars-surface"]')?.content || "app";
  const surface = SURFACES.has(surfaceValue) ? surfaceValue : "app";
  const manual = surface === "manual";
  const prefix = manual ? "webmars-manual-metrics" : "webmars-metrics";
  const SESSION_KEY = `${prefix}-session-v1`;
  const VISIT_KEY = `${prefix}-last-visit-v1`;
  function read(storage, key) { try { return storage.getItem(key); } catch { return null; } }
  function write(storage, key, value) { try { storage.setItem(key, value); } catch { /* Memory-only session is sufficient. */ } }
  function storage(name) { try { return scope[name]; } catch { return null; } }
  const local = storage("localStorage");
  const tab = storage("sessionStorage");
  const CONTEXT_KEY = "webmars-metrics-context-v1";
  let context = ["internal", "test"].includes(config?.context) ? config.context
    : (read(local, CONTEXT_KEY) === "internal" ? "internal" : "public");
  // A short-lived navigation token supplied by this installation's Nginx.
  // Empty on static/custom hosts; never fall back to a persistent visitor ID.
  const visit = /(?:^|;\s*)webmars_visit=([a-f0-9]{32})(?:;|$)/.exec(document.cookie || "")?.[1] || "none";
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
  function getSession(continuedSession = null) {
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
      const previous = continuedSession ? now : Number(read(local, VISIT_KEY));
      const days = previous > 0 && previous <= now ? Math.floor((now - previous) / DAY) : null;
      session = {
        id: Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
        touched: now, seconds: 0,
        returning: days === null ? "new" : days === 0 ? "same_day" : days < 7 ? "days_1_6" : days < 31 ? "days_7_30" : "older",
        source: continuedSession?.source || sourceCategory()
      };
      if (!continuedSession) write(local, VISIT_KEY, String(now));
      lastInteraction = null;
      scope.queueMicrotask?.(() => scope.dispatchEvent(new CustomEvent("webmars:metrics-session")));
    }
    session.touched = now;
    session.seconds = Math.max(0, Math.min(86400, Number(session.seconds) || 0));
    session.presenceSeconds = Math.max(0, Math.min(86400, Number(session.presenceSeconds) || 0));
    session.sentInteractionSeconds = Math.max(0, Math.min(Math.floor(session.seconds), Math.floor(Number(session.sentInteractionSeconds) || 0)));
    write(tab, SESSION_KEY, JSON.stringify(session));
    return session;
  }
  function send(event, detail = "none", secondsOverride = null, milliseconds = null, buildUpdate = null) {
    if (!allowed() || (!buildUpdate && !EVENTS.has(event))
        || ((buildUpdate || APP_EVENTS.has(event)) && surface !== "app")) return false;
    if (manual && event !== "page_view" && event !== "manual_chapter_view") return false;
    let safeDetail = "none";
    const resource = event === "tool_open" || event === "feature_use";
    if (resource) {
      if (!(event === "tool_open" ? TOOLS : FEATURES).has(detail)) return false;
      safeDetail = detail;
    } else if (["login_start", "login_success", "login_error", "account_created", "account_linked"].includes(event)) {
      if (!["password", "google", "facebook"].includes(detail)) return false;
      safeDetail = detail;
    } else if (event === "manual_chapter_view") {
      if (!manual || !/^part_[1-8]$/.test(detail)) return false;
      safeDetail = detail;
    } else if (event === "example_open") {
      safeDetail = /^lesson(?:0[1-9]|1[0-5])$/.test(detail) ? detail : "other";
    } else if (event === "run_fault_group") {
      if (!RUN_FAULT_GROUPS.has(detail)) return false;
      safeDetail = detail;
    } else if (event === "app_startup") {
      if (detail !== "failed" && !STARTUP_BANDS.some(([, band]) => band === detail)) return false;
      safeDetail = detail;
    } else if (event === "window_time") {
      if (!WINDOW_CATEGORIES.has(detail) || !Number.isInteger(secondsOverride) || secondsOverride < 1 || secondsOverride > 300) return false;
      safeDetail = detail;
    } else if (event === "operation_time") {
      if (!OPERATION_TIMES.has(detail) || !Number.isInteger(milliseconds) || milliseconds < 0 || milliseconds > 120000) return false;
      safeDetail = detail;
    } else if (event === "operation_error") {
      if (!OPERATION_ERRORS.has(detail)) return false;
      safeDetail = detail;
    }
    let current;
    try { current = getSession(); } catch { return false; }
    if (!current) return false;
    if (resource) {
      // Rank resource adoption once per visit, including after reload.
      const key = `${event}:${detail}`;
      const resources = Array.isArray(current.resources) ? current.resources : [];
      if (resources.includes(key)) return false;
      current.resources = [key, ...resources].slice(0, 40);
      write(tab, SESSION_KEY, JSON.stringify(current));
    }
    const language = String(scope.WebMarsI18n?.getLanguage?.() || document.documentElement.lang || "en").split("-")[0];
    const payload = {
      v: 2, session: current.id, event, surface, detail: safeDetail,
      build: /^(?:[0-9]{12}|[0-9]{6}\.[0-9]{2}\.[0-9]{4})$/.test(scope.WebMarsAppVersion?.build || "") ? scope.WebMarsAppVersion.build : "unknown",
      context, automation: scope.navigator?.webdriver === true ? "webdriver" : "none",
      interaction: current.interacted === true ? "trusted" : "not_seen", visit,
      seconds: Number.isInteger(secondsOverride) ? secondsOverride : Math.floor(current.seconds), returning: current.returning, source: current.source,
      device: scope.matchMedia?.("(pointer: coarse)").matches ? "touch" : "pointer",
      language: /^(en|pt|es|zh|hi|ar|fr|bn|ru|id|de|ja|ko|tr|vi|ur|it|pl|fa|th)$/.test(language) ? language : "other"
    };
    if (event === "operation_time") payload.milliseconds = milliseconds;
    if (buildUpdate) {
      payload.update_id = buildUpdate.id;
      payload.from_build_id = buildUpdate.from;
      payload.to_build_id = buildUpdate.to;
    }
    try {
      const delivery = Promise.resolve(scope.fetch(endpoint, {
        // CORS mode preserves Origin with no-referrer. The URL is already
        // restricted to this origin and redirects cannot forward the payload.
        method: "POST", credentials: "omit", mode: "cors", redirect: "error", cache: "no-store",
        referrerPolicy: "no-referrer", keepalive: true,
        signal: event === BUILD_UPDATE_EVENTS.completed ? scope.AbortSignal?.timeout?.(10000) : undefined,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      }));
      if (buildUpdate) return delivery.then(response => response?.status === 204, () => false);
      delivery.catch(() => {});
    } catch { /* Metrics must never interrupt learning. */ }
    return !buildUpdate;
  }
  function track(event, detail = "none") { return send(event, detail); }
  async function trackBuildUpdate(phase, transition) {
    if (!allowed()) return true;
    if (!Object.hasOwn(BUILD_UPDATE_EVENTS, phase)) return false;
    const { id, from, to } = transition || {};
    const buildId = /^[a-f0-9]{64}$/;
    if (typeof id !== "string" || !/^[a-f0-9]{32}$/.test(id)
        || typeof from !== "string" || !buildId.test(from) || typeof to !== "string" || !buildId.test(to)
        || from === to || (phase === "attempted" ? from : to) !== scope.WebMarsAppVersion?.id) return false;
    return send(BUILD_UPDATE_EVENTS[phase], "none", 0, null, { id, from, to });
  }
  function trackOperationTime(detail, milliseconds) { return send("operation_time", detail, null, milliseconds); }
  function trackHeartbeat(seconds) {
    if (!allowed() || !Number.isInteger(seconds) || seconds <= lastPresenceSeconds) return false;
    const current = getSession();
    if (!current) return false;
    const increment = seconds - lastPresenceSeconds;
    lastPresenceSeconds = seconds;
    current.presenceSeconds = Math.min(86400, current.presenceSeconds + increment);
    write(tab, SESSION_KEY, JSON.stringify(current));
    return send("heartbeat", "none", current.presenceSeconds);
  }
  function getSessionId() {
    try { return allowed() ? getSession()?.id || null : null; } catch { return null; }
  }
  function exampleOpened(id) {
    const lesson = /^lesson(0[1-9]|1[0-5])(?:-|$)/.exec(String(id));
    track("example_open", lesson ? `lesson${lesson[1]}` : "other");
  }
  function flushInteraction() {
    if (!session || Date.now() - session.touched >= SESSION_IDLE) return;
    const current = session;
    const seconds = Math.floor(current.seconds);
    if (seconds > current.sentInteractionSeconds && track("active_time")) {
      current.sentInteractionSeconds = seconds;
      write(tab, SESSION_KEY, JSON.stringify(current));
    }
  }
  function isFocused() {
    return document.visibilityState === "visible" && document.hasFocus?.() === true;
  }
  function sampleInteraction(now, atBoundary = false) {
    const from = Math.max(lastTick, now - SAMPLE_INTERVAL);
    lastTick = now;
    const focused = isFocused();
    const count = wasFocused && (atBoundary || focused);
    wasFocused = focused;
    if (!allowed() || !count || lastInteraction === null) return;
    const elapsed = Math.min(now, lastInteraction + INTERACTION_IDLE) - Math.max(from, lastInteraction);
    if (elapsed <= 0) return;
    let current;
    try { current = getSession(); } catch { return; }
    if (!current || lastInteraction === null) return;
    current.seconds = Math.min(86400, current.seconds + elapsed / 1000);
    write(tab, SESSION_KEY, JSON.stringify(current));
    if (current.seconds - current.sentInteractionSeconds >= 30) flushInteraction();
  }
  function changeSession(nextContext) {
    sampleInteraction(Date.now());
    flushInteraction();
    scope.dispatchEvent?.(new Event("webmars:metrics-session-ending"));
    const previous = session;
    context = nextContext;
    session = null;
    try { tab?.removeItem(SESSION_KEY); } catch {}
    lastInteraction = null;
    // A context or account change splits the current visit, not the page.
    if (allowed()) {
      try { getSession(previous); } catch { /* The next event can retry. */ }
    }
  }
  function rotateSession() { changeSession(context); }
  function setContext(value) {
    if (!["public", "internal"].includes(value) || config?.context === "test") return false;
    if (context === value) return true;
    changeSession(value);
    write(local, CONTEXT_KEY, value);
    try { document.cookie = `webmars_metrics_context=${value}; Path=/; SameSite=Lax; Max-Age=31536000${scope.location.protocol === "https:" ? "; Secure" : ""}`; } catch {}
    return true;
  }
  scope.WebMarsUsage = Object.freeze({ track, trackBuildUpdate, trackOperationTime, trackHeartbeat, getSessionId, exampleOpened, getContext: () => context, setContext, rotateSession });
  scope.addEventListener("storage", (event) => {
    if (event.key === CONTEXT_KEY && ["public", "internal"].includes(event.newValue)) setContext(event.newValue);
  });
  function onInput(event) {
    if (event.isTrusted !== true) return;
    const now = Date.now();
    sampleInteraction(now);
    let current;
    try { current = getSession(); } catch { return; }
    if (!current) return;
    lastInteraction = now;
    if (current.interacted === true) return;
    current.interacted = true;
    track("interaction");
  }
  function onFocusChange() {
    sampleInteraction(Date.now(), true);
    if (!wasFocused) flushInteraction();
  }
  function visibleWindowCategories(desktop) {
    const viewport = scope.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const right = left + (viewport?.width ?? document.documentElement.clientWidth);
    const bottom = top + (viewport?.height ?? document.documentElement.clientHeight);
    const visible = new Set();
    for (const win of desktop.querySelectorAll(".desktop-window")) {
      if (win.matches(".window-hidden, .window-minimized, [hidden]")) continue;
      let target = win;
      let category = NATIVE_WINDOWS[win.id];
      if (win.id === "window-main") {
        target = win.querySelector(".main-tab-panel.active");
        category = MAIN_PANELS[target?.id];
      } else if (/^window-help(?:-(?:about|doc|manual|welcome-\d+))?$/.test(win.id)) {
        category = "help";
      } else if (/^window-(?:interface|runtime-memory|mini-c|cloud-server)-preferences(?:-\d+)?$/.test(win.id)) {
        category = "settings";
      } else if (win.id === `window-tool-${win.dataset.toolId}` && TOOLS.has(win.dataset.toolId)) {
        category = `tool_${win.dataset.toolId}`;
      }
      if (!WINDOW_CATEGORIES.has(category) || visible.has(category)) continue;
      if (target.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) === false) continue;
      const rect = target.getBoundingClientRect();
      const x = Math.max(left, rect.left);
      const y = Math.max(top, rect.top);
      const width = Math.min(right, rect.right) - x;
      const height = Math.min(bottom, rect.bottom) - y;
      if (width <= 0 || height <= 0) continue;
      // A sample grid leaves room for overlapping windows without counting a
      // completely covered window or probing the identity of its contents.
      if (WINDOW_PROBE_POINTS.some(row => WINDOW_PROBE_POINTS.some(column =>
        target.contains(document.elementFromPoint(x + width * column, y + height * row))))) {
        visible.add(category);
      }
    }
    return visible;
  }

  let windowTimeStarted = false;
  function startWindowTime() {
    if (windowTimeStarted || !allowed() || surface !== "app" || typeof document.elementFromPoint !== "function") return;
    const desktop = document.getElementById("mars-desktop");
    if (!desktop) return;
    windowTimeStarted = true;
    const now = () => scope.performance?.now?.() ?? Date.now();
    let previousSample = now();
    let lastFlush = previousSample;
    let visible = new Set();
    let pageActive = true;
    const pending = new Map();
    function flush() {
      for (const [category, time] of pending) {
        const seconds = Math.min(300, Math.floor(time / 1000));
        if (seconds && send("window_time", category, seconds)) pending.set(category, time - seconds * 1000);
      }
    }
    function sample(forceFlush = false) {
      const at = now();
      const elapsed = Math.max(0, Math.min(SAMPLE_INTERVAL, at - previousSample));
      previousSample = at;
      for (const category of visible) pending.set(category, (pending.get(category) || 0) + elapsed);
      visible = pageActive && document.visibilityState === "visible" ? visibleWindowCategories(desktop) : new Set();
      if (forceFlush || at - lastFlush >= 60000) {
        lastFlush = at;
        flush();
      }
    }
    if (typeof scope.MutationObserver === "function") {
      const observer = new scope.MutationObserver(records => {
        if (records.some(record => record.type === "childList")) observeWindows();
        if (pageActive && document.visibilityState === "visible") sample();
      });
      function observeWindows() {
        observer.disconnect();
        observer.observe(desktop, { childList: true });
        for (const node of desktop.querySelectorAll(".desktop-window, #window-main .main-tab-panel")) {
          observer.observe(node, { attributes: true, attributeFilter: ["class", "hidden"] });
        }
      }
      observeWindows();
    }
    document.addEventListener("visibilitychange", () => sample(document.visibilityState !== "visible"));
    scope.addEventListener("pagehide", () => { pageActive = false; sample(true); });
    scope.addEventListener("pageshow", () => { pageActive = true; sample(); });
    scope.addEventListener("webmars:metrics-session-ending", () => { sample(true); pending.clear(); });
    scope.setInterval(() => sample(), SAMPLE_INTERVAL);
    sample();
  }

  function init() {
    if (!endpoint) return;
    track("page_view");
    if (manual) return;
    scope.addEventListener("pointerdown", onInput, { capture: true, passive: true });
    scope.addEventListener("keydown", onInput, { capture: true, passive: true });
    scope.addEventListener("focus", onFocusChange);
    scope.addEventListener("blur", onFocusChange);
    document.addEventListener("click", (event) => {
      if (event.target.closest?.("a[data-launch-app]")) track("launch_app");
    });
    document.addEventListener("visibilitychange", onFocusChange);
    scope.addEventListener("pagehide", () => {
      sampleInteraction(Date.now(), true);
      flushInteraction();
      lastInteraction = null;
    });
    scope.setInterval(() => sampleInteraction(Date.now()), SAMPLE_INTERVAL);
  }
  let startupMeasured = false;
  scope.addEventListener("webmars:scripts-loaded", (event) => {
    const ok = event.detail?.ok;
    if (!startupMeasured && surface === "app" && typeof ok === "boolean") {
      startupMeasured = true;
      if (ok) {
        const elapsed = scope.performance?.now?.();
        if (Number.isFinite(elapsed) && elapsed >= 0) {
          const [, band] = STARTUP_BANDS.find(([limit]) => elapsed < limit);
          track("app_startup", band);
        }
      } else {
        track("app_startup", "failed");
      }
    }
    if (ok === true) {
      track("app_ready");
      startWindowTime();
    }
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
