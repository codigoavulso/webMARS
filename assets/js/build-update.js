(() => {
  const MARKER_KEY = "webmars:build-update";
  const RELOAD_PARAM = "__webmars_update";
  const ARTIFACT_ID = /^[0-9a-f]{64}$/;
  const TRANSITION_ID = /^[0-9a-f]{32}$/;
  const BUILD_NUMBER = /^(?:[0-9]{12}|[0-9]{6}\.[0-9]{2}\.[0-9]{4})$/;
  const CHECK_INTERVAL_MS = 30_000;
  const CHECK_SPACING_MS = 1_000;
  const REQUEST_TIMEOUT_MS = 5_000;
  const FAILED_NAVIGATION_COOLDOWN_MS = 24 * 60 * 60 * 1_000;
  const MAX_CONFIRMATION_ATTEMPTS = 5;
  const currentId = window.WebMarsAppVersion?.id;

  function isArtifactId(value) {
    return typeof value === "string" && ARTIFACT_ID.test(value);
  }

  function readMarker() {
    try {
      const marker = JSON.parse(window.sessionStorage.getItem(MARKER_KEY));
      if (!marker || (marker.id !== null && (typeof marker.id !== "string" || !TRANSITION_ID.test(marker.id)))
          || !isArtifactId(marker.from) || !isArtifactId(marker.to) || marker.from === marker.to
          || !Number.isFinite(marker.createdAt)) {
        return null;
      }
      return marker;
    } catch {
      return null;
    }
  }

  function sameTransition(first, second) {
    return first?.id === second.id && first?.from === second.from && first?.to === second.to
      && first?.createdAt === second.createdAt;
  }

  function writeMarker(marker) {
    try {
      if (!marker) {
        window.sessionStorage.removeItem(MARKER_KEY);
        return true;
      }
      const value = JSON.stringify(marker);
      window.sessionStorage.setItem(MARKER_KEY, value);
      return window.sessionStorage.getItem(MARKER_KEY) === value;
    } catch {
      return false;
    }
  }

  const pageUrl = new URL(window.location.href);
  const arrival = readMarker();
  const isReload = !!arrival && pageUrl.searchParams.get(RELOAD_PARAM) === arrival.to;
  window.WebMarsBuildUpdate = Object.freeze({ isReload });
  if (isReload) {
    pageUrl.searchParams.delete(RELOAD_PARAM);
    try {
      window.history.replaceState(window.history.state, "", pageUrl.href);
    } catch {
      // The tab marker also prevents retries when the browser refuses history changes.
    }
  }

  const manifestUrl = new URL("./build.json", document.baseURI);
  if (!isArtifactId(currentId) || manifestUrl.origin !== pageUrl.origin
      || !["http:", "https:"].includes(manifestUrl.protocol)) return;

  let runtimeReady = window.__webMarsRuntimeReady === true;
  let pageActive = true;
  let checking = false;
  let reloading = false;
  let confirming = false;
  let lastCheckAt = -Infinity;
  let lastConfirmationAt = -Infinity;

  function transitionId() {
    try {
      const bytes = window.crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    } catch {
      return null;
    }
  }

  async function trackUpdate(phase, marker) {
    if (!marker.id) return true;
    const { id, from, to } = marker;
    try {
      return await window.WebMarsUsage?.trackBuildUpdate?.(phase, { id, from, to });
    } catch {
      return false;
    }
  }

  function isOnline() {
    return window.navigator.onLine !== false;
  }

  function canCheck() {
    return runtimeReady && pageActive && !reloading && document.visibilityState === "visible" && isOnline();
  }

  async function confirmArrival() {
    if (!runtimeReady || !pageActive || confirming) return;
    const marker = readMarker();
    if (marker?.to !== currentId || !(marker.arrived === true || (isReload && sameTransition(marker, arrival)))) {
      return;
    }
    if (!marker.arrived) writeMarker({ ...marker, arrived: true });
    if (!isOnline() || Date.now() - lastConfirmationAt < CHECK_INTERVAL_MS) return;
    const attempts = Number.isInteger(marker.confirmationAttempts) ? marker.confirmationAttempts : 0;
    if (attempts >= MAX_CONFIRMATION_ATTEMPTS) return;
    if (!writeMarker({ ...marker, arrived: true, confirmationAttempts: attempts + 1 })) return;
    confirming = true;
    lastConfirmationAt = Date.now();
    try {
      if (await trackUpdate("completed", marker)) {
        if (sameTransition(readMarker(), marker)) writeMarker(null);
      }
    } finally {
      confirming = false;
    }
  }

  async function getPublishedId() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await window.fetch(manifestUrl.href, {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
        signal: controller.signal
      });
      if (!response.ok) return null;
      const manifest = await response.json();
      return isArtifactId(manifest?.id) && typeof manifest.build === "string" && BUILD_NUMBER.test(manifest.build)
        ? manifest.id
        : null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function checkForUpdate() {
    if (!canCheck() || checking || Date.now() - lastCheckAt < CHECK_SPACING_MS) return;
    checking = true;
    lastCheckAt = Date.now();
    try {
      const target = await getPublishedId();
      if (!target || target === currentId || !canCheck()) return;
      const previous = readMarker();
      if (previous?.from === currentId && previous.to === target
          && Math.abs(Date.now() - previous.createdAt) < FAILED_NAVIGATION_COOLDOWN_MS) return;

      const runtime = window.WebMarsBuildUpdateRuntime;
      if (typeof runtime?.reload !== "function") return;
      const marker = { id: transitionId(), from: currentId, to: target, createdAt: Date.now() };
      if (!writeMarker(marker)) return;
      try {
        reloading = runtime.reload(() => {
          const destination = new URL(window.location.href);
          destination.searchParams.set(RELOAD_PARAM, target);
          void trackUpdate("attempted", marker);
          window.location.replace(destination.href);
        }) === true;
      } finally {
        if (!reloading) writeMarker(previous);
      }
    } catch {
      // A network, manifest, or storage error leaves the current session open.
    } finally {
      checking = false;
    }
  }

  function checkWhenVisible() {
    if (!canCheck()) return;
    void confirmArrival();
    void checkForUpdate();
  }

  window.addEventListener("webmars:ready", () => {
    runtimeReady = true;
    void confirmArrival();
    void checkForUpdate();
  }, { once: true });
  window.addEventListener("pageshow", () => {
    pageActive = true;
    checkWhenVisible();
  });
  window.addEventListener("pagehide", () => { pageActive = false; });
  window.addEventListener("focus", checkWhenVisible);
  window.addEventListener("online", () => {
    lastCheckAt = -Infinity;
    lastConfirmationAt = -Infinity;
    checkWhenVisible();
  });
  document.addEventListener("visibilitychange", checkWhenVisible);
  window.setInterval(checkWhenVisible, CHECK_INTERVAL_MS);
  if (runtimeReady) {
    void confirmArrival();
    void checkForUpdate();
  }
})();
