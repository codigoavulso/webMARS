(function initRuntimeBenchmarksModule(rootScope) {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);
  const registry = root.WebMarsModules || (root.WebMarsModules = {});
  if (registry.runtimeBenchmarks) return;

  const DEFAULT_HISTORY_LIMIT = 120;
  const DEFAULT_REFRESH_INTERVAL_MS = 250;

  function finiteNonNegative(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }

  function cloneMetadata(metadata) {
    return metadata && typeof metadata === "object" ? { ...metadata } : {};
  }

  function createBenchmarkCollector(options = {}) {
    const clock = typeof options.now === "function"
      ? options.now
      : () => (
          root.performance && typeof root.performance.now === "function"
            ? root.performance.now()
            : Date.now()
        );
    const wallClock = typeof options.dateNow === "function" ? options.dateNow : () => Date.now();
    const historyLimit = Math.max(1, Math.floor(finiteNonNegative(options.historyLimit, DEFAULT_HISTORY_LIMIT)));
    const refreshIntervalMs = finiteNonNegative(options.refreshIntervalMs, DEFAULT_REFRESH_INTERVAL_MS);
    const metrics = new Map();
    const history = [];
    const activeSessions = new Set();
    const listeners = new Set();
    let latest = null;
    let sessionSequence = 0;

    function readNow() {
      const value = Number(clock());
      return Number.isFinite(value) ? value : 0;
    }

    function serializeSample(sample) {
      if (!sample) return null;
      return {
        name: sample.name,
        durationMs: sample.durationMs,
        cpuMs: sample.cpuMs,
        cpuPercent: sample.cpuPercent,
        units: sample.units,
        unitsPerSecond: sample.unitsPerSecond,
        outcome: sample.outcome,
        startedAt: sample.startedAt,
        completedAt: sample.completedAt,
        metadata: cloneMetadata(sample.metadata)
      };
    }

    function serializeMetric(metric) {
      return {
        name: metric.name,
        count: metric.count,
        totalDurationMs: metric.totalDurationMs,
        totalCpuMs: metric.totalCpuMs,
        averageDurationMs: metric.count > 0 ? metric.totalDurationMs / metric.count : 0,
        averageCpuPercent: metric.totalDurationMs > 0
          ? Math.min(100, (metric.totalCpuMs / metric.totalDurationMs) * 100)
          : 0,
        minDurationMs: metric.minDurationMs,
        maxDurationMs: metric.maxDurationMs,
        last: serializeSample(metric.last)
      };
    }

    function serializeActive(session, at = readNow()) {
      if (!session || session.closed) return null;
      const durationMs = Math.max(0, at - session.startedAt);
      const cpuMs = Math.min(durationMs, finiteNonNegative(session.cpuMs));
      const units = finiteNonNegative(session.units);
      return {
        name: session.name,
        durationMs,
        cpuMs,
        cpuPercent: durationMs > 0 ? Math.min(100, (cpuMs / durationMs) * 100) : 0,
        units,
        unitsPerSecond: durationMs > 0 ? (units * 1000) / durationMs : 0,
        outcome: "running",
        startedAt: session.startedWallAt,
        completedAt: null,
        metadata: cloneMetadata(session.metadata)
      };
    }

    function snapshot() {
      const metricSnapshot = {};
      metrics.forEach((metric, name) => {
        metricSnapshot[name] = serializeMetric(metric);
      });
      const sessions = Array.from(activeSessions);
      let active = null;
      for (let index = sessions.length - 1; index >= 0; index -= 1) {
        if (!sessions[index].closed) {
          active = sessions[index];
          break;
        }
      }
      return {
        version: 1,
        updatedAt: Number(wallClock()) || Date.now(),
        active: serializeActive(active),
        latest: serializeSample(latest),
        metrics: metricSnapshot,
        history: history.map(serializeSample)
      };
    }

    function notify() {
      if (!listeners.size) return;
      const current = snapshot();
      listeners.forEach((listener) => {
        try {
          listener(current);
        } catch {
          // Benchmark rendering must never interrupt the measured operation.
        }
      });
    }

    function record(name, sample = {}) {
      const normalizedName = String(name || "operation").trim() || "operation";
      const durationMs = finiteNonNegative(sample.durationMs);
      const cpuMs = Math.min(durationMs, finiteNonNegative(sample.cpuMs, durationMs));
      const units = finiteNonNegative(sample.units);
      const completedAt = Number(sample.completedAt) || Number(wallClock()) || Date.now();
      const normalized = {
        name: normalizedName,
        durationMs,
        cpuMs,
        cpuPercent: durationMs > 0 ? Math.min(100, (cpuMs / durationMs) * 100) : 0,
        units,
        unitsPerSecond: durationMs > 0 ? (units * 1000) / durationMs : 0,
        outcome: String(sample.outcome || "ok"),
        startedAt: Number(sample.startedAt) || completedAt,
        completedAt,
        metadata: cloneMetadata(sample.metadata)
      };
      const previous = metrics.get(normalizedName);
      const metric = previous || {
        name: normalizedName,
        count: 0,
        totalDurationMs: 0,
        totalCpuMs: 0,
        minDurationMs: Number.POSITIVE_INFINITY,
        maxDurationMs: 0,
        last: null
      };
      metric.count += 1;
      metric.totalDurationMs += normalized.durationMs;
      metric.totalCpuMs += normalized.cpuMs;
      metric.minDurationMs = Math.min(metric.minDurationMs, normalized.durationMs);
      metric.maxDurationMs = Math.max(metric.maxDurationMs, normalized.durationMs);
      metric.last = normalized;
      metrics.set(normalizedName, metric);
      latest = normalized;
      history.push(normalized);
      if (history.length > historyLimit) history.splice(0, history.length - historyLimit);
      notify();
      return serializeSample(normalized);
    }

    function start(name, metadata = {}) {
      sessionSequence += 1;
      const startedAt = readNow();
      const session = {
        id: sessionSequence,
        name: String(name || "operation").trim() || "operation",
        startedAt,
        startedWallAt: Number(wallClock()) || Date.now(),
        cpuMs: 0,
        units: 0,
        metadata: cloneMetadata(metadata),
        lastPublishedAt: startedAt,
        closed: false
      };
      activeSessions.add(session);
      notify();
      return session;
    }

    function addCpu(session, cpuMs, units = 0) {
      if (!session || session.closed || !activeSessions.has(session)) return false;
      session.cpuMs += finiteNonNegative(cpuMs);
      session.units += finiteNonNegative(units);
      const current = readNow();
      if ((current - session.lastPublishedAt) >= refreshIntervalMs) {
        session.lastPublishedAt = current;
        notify();
      }
      return true;
    }

    function finish(session, details = {}) {
      if (!session || session.closed || !activeSessions.has(session)) return null;
      const finishedAt = readNow();
      session.closed = true;
      activeSessions.delete(session);
      const durationMs = finiteNonNegative(details.durationMs, Math.max(0, finishedAt - session.startedAt));
      const cpuMs = Object.prototype.hasOwnProperty.call(details, "cpuMs")
        ? finiteNonNegative(details.cpuMs)
        : finiteNonNegative(session.cpuMs);
      const units = Object.prototype.hasOwnProperty.call(details, "units")
        ? finiteNonNegative(details.units)
        : finiteNonNegative(session.units);
      return record(session.name, {
        durationMs,
        cpuMs,
        units,
        outcome: details.outcome || "ok",
        startedAt: session.startedWallAt,
        completedAt: Number(wallClock()) || Date.now(),
        metadata: {
          ...session.metadata,
          ...cloneMetadata(details.metadata)
        }
      });
    }

    function measure(name, callback, metadata = {}) {
      const session = start(name, metadata);
      const cpuStartedAt = readNow();
      try {
        const result = callback();
        const cpuMs = Math.max(0, readNow() - cpuStartedAt);
        finish(session, {
          cpuMs,
          outcome: result && typeof result === "object" && result.ok === false ? "error" : "ok"
        });
        return result;
      } catch (error) {
        const cpuMs = Math.max(0, readNow() - cpuStartedAt);
        finish(session, {
          cpuMs,
          outcome: "error",
          metadata: { error: error instanceof Error ? error.message : String(error || "Unknown error") }
        });
        throw error;
      }
    }

    function subscribe(listener, settings = {}) {
      if (typeof listener !== "function") return () => {};
      listeners.add(listener);
      if (settings.emitCurrent === true) listener(snapshot());
      return () => listeners.delete(listener);
    }

    function clear() {
      metrics.clear();
      history.splice(0, history.length);
      latest = null;
      notify();
    }

    return Object.freeze({
      start,
      addCpu,
      finish,
      measure,
      record,
      snapshot,
      subscribe,
      clear
    });
  }

  registry.runtimeBenchmarks = Object.freeze({
    DEFAULT_HISTORY_LIMIT,
    DEFAULT_REFRESH_INTERVAL_MS,
    createBenchmarkCollector
  });
})(typeof window !== "undefined" ? window : globalThis);
