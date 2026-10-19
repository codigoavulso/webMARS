/* Ephemeral session heartbeat: no account identity, storage, UI, or runtime/program data. */
(() => {
  "use strict";
  if (typeof window.WebMarsUsage?.trackHeartbeat !== "function") return;

  const now = () => window.performance.now();
  const isActive = () => document.visibilityState === "visible";
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
      window.WebMarsUsage.trackHeartbeat(activeSeconds);
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
