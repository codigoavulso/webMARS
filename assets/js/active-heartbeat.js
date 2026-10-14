/* Ephemeral session heartbeat: no account identity, storage, UI, or runtime/program data. */
(() => {
  "use strict";
  const config = window.WebMarsConfig?.heartbeat;
  if (config?.enabled !== true || !config.endpoint) return;
  let endpoint;
  try {
    endpoint = new URL(config.endpoint, window.location.href);
    if (endpoint.origin !== window.location.origin || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) return;
  } catch { return; }

  const now = () => window.performance.now();
  const isActive = () => document.visibilityState === "visible";
  const newSessionId = () => {
    try {
      const bytes = new Uint8Array(16);
      window.crypto?.getRandomValues?.(bytes);
      return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    } catch { return ""; }
  };
  const sessionId = newSessionId();
  if (!/^[a-f0-9]{32}$/.test(sessionId)) return;
  let lastSample = now();
  let lastPing = lastSample;
  let active = isActive();
  let activeMs = 0;
  let running = true;
  // Sampling also bounds time counted across browser/OS suspension. Reading
  // without typing counts; hidden tabs do not. A visible background tab still
  // contributes time, even when another window or tab has focus.
  function sample() {
    const time = now();
    if (running && active) activeMs += Math.max(0, Math.min(5000, time - lastSample));
    lastSample = time;
    active = running && isActive();
    return time;
  }
  function tick() {
    const time = sample();
    if (!running || !active || time - lastPing < 60000) return;
    lastPing = time;
    const activeSeconds = Math.min(31536000, Math.floor(activeMs / 1000));
    if (!activeSeconds) return;
    try {
      // CORS mode retains Origin with no-referrer. The destination is strictly
      // same-origin, redirects are rejected, and cookies are never attached.
      const registered = window.WebMarsPresence?.isRegistered?.() === true
        || window.WebMarsCloudBridge?.getState?.().authenticated === true;
      Promise.resolve(window.fetch(endpoint.href, {
        method: "POST", mode: "cors", credentials: "omit", redirect: "error",
        referrerPolicy: "no-referrer", cache: "no-store", keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active_seconds: activeSeconds, session: sessionId, registered })
      })).catch(() => {});
    } catch { /* A failed metric must never affect the simulator. */ }
  }
  document.addEventListener("visibilitychange", sample);
  window.addEventListener("pagehide", () => { sample(); running = false; active = false; });
  window.addEventListener("pageshow", () => {
    running = true;
    lastSample = now();
    active = isActive();
    // Resuming the back/forward cache must not generate an immediate burst.
    lastPing = lastSample;
  });
  window.setInterval(tick, 5000);
})();
