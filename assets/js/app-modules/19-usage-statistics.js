(() => {
  const scope = typeof window !== "undefined" ? window : globalThis;
  const registry = scope.WebMarsModules || (scope.WebMarsModules = {});
  const SVG = "http://www.w3.org/2000/svg";
  const WINDOWS = [
    ["60m", "Last 60 minutes"], ["24h", "Last 24 hours"], ["30d", "Last 30 days"]
  ];
  const METRICS = [
    ["sessions", "Sessions in interval"], ["new_sessions", "New sessions"],
    ["events", "Events received"], ["page_view", "Page views"],
    ["app_ready", "App ready"], ["run_success", "Successful runs"],
    ["assemble_success", "Successful assemblies"], ["compile_success", "Successful compilations"],
    ["run_error", "Run errors"], ["assemble_error", "Assembly errors"],
    ["compile_error", "Compilation errors"], ["tool_open", "Tools opened"],
    ["feature_use", "Features used"], ["example_open", "Examples opened"],
    ["heartbeat", "Heartbeats"], ["interaction_seconds", "Interaction time (seconds)"],
    ["presence_seconds", "Visible presence (seconds)"]
  ];
  const DIMENSIONS = [
    ["events", "Event types"], ["resources", "Resources"], ["source", "Sources"],
    ["language", "Languages"], ["device", "Input devices"],
    ["surface", "Pages and app"], ["returning", "Return categories"]
  ];
  const EVENT_LABELS = Object.fromEntries(METRICS.map(([key, label]) => [key, label]));
  Object.assign(EVENT_LABELS, { active_time: "Interaction samples", launch_app: "App launches" });

  function createUsageStatisticsWindow(refs, windowManager, translate) {
    const win = document.createElement("section");
    win.id = "window-usage-statistics";
    win.className = "desktop-window window-hidden tool-window dialog-window mobile-panel-window usage-stats-window";
    Object.assign(win.style, { left: "84px", top: "48px", width: "1120px", height: "680px", minWidth: "520px", minHeight: "420px" });
    win.innerHTML = `
      <div class="window-titlebar">
        <span class="window-title" data-stat-label="Usage statistics"></span>
        <div class="window-controls">
          <button class="win-btn" data-win-action="min" type="button">_</button>
          <button class="win-btn" data-win-action="max" type="button">[]</button>
          <button class="win-btn win-btn-close" data-win-action="close" type="button">x</button>
        </div>
      </div>
      <div class="window-content usage-stats-content">
        <div class="usage-stats-toolbar">
          <div class="usage-stats-controls">
            <label><span data-stat-label="Period"></span><select data-stat-role="window"></select></label>
            <label><span data-stat-label="Trend metric"></span><select data-stat-role="metric"></select></label>
            <label><span data-stat-label="Chart style"></span><select data-stat-role="style"></select></label>
            <button class="tool-btn" type="button" data-stat-role="refresh" data-stat-label="Refresh"></button>
          </div>
        </div>
        <p class="usage-stats-status" data-stat-role="status" role="status"></p>
        <div class="usage-stats-overview">
          <div class="usage-stats-kpis usage-stats-kpis-primary" data-stat-role="kpis-primary"></div>
          <details class="usage-stats-kpi-details">
            <summary data-stat-label="Show values"></summary>
            <div class="usage-stats-kpis usage-stats-kpis-details" data-stat-role="kpis-details"></div>
          </details>
        </div>
        <div class="usage-stats-charts">
          <section class="usage-stats-panel">
            <h3 data-stat-label="Activity over time"></h3>
            <svg data-stat-role="trend-chart" class="usage-stats-chart" viewBox="0 0 800 240" role="img"></svg>
            <details><summary data-stat-label="Show values"></summary><div class="usage-stats-table-wrap" data-stat-role="trend-table"></div></details>
          </section>
          <section class="usage-stats-panel">
            <div class="usage-stats-panel-head"><h3 data-stat-label="Breakdown"></h3>
              <div class="usage-stats-controls usage-stats-breakdown-controls">
                <label><span data-stat-label="Group by"></span><select data-stat-role="dimension"></select></label>
                <label><span data-stat-label="Measure"></span><select data-stat-role="measure"></select></label>
                <label><span data-stat-label="Filter results"></span><input data-stat-role="filter" type="search" maxlength="80"></label>
                <label><span data-stat-label="Show"></span><select data-stat-role="limit"></select></label>
              </div>
            </div>
            <svg data-stat-role="breakdown-chart" class="usage-stats-chart" viewBox="0 0 800 240" role="img"></svg>
            <details><summary data-stat-label="Show values"></summary><div class="usage-stats-table-wrap" data-stat-role="breakdown-table"></div></details>
          </section>
        </div>
        <p class="usage-stats-note" data-stat-label="Sessions are temporary visits, not unique people. Interaction and visible presence are separate measurements."></p>
      </div>`;
    refs.windows.desktop.appendChild(win);
    windowManager.registerWindow(win);
    const field = (name) => win.querySelector(`[data-stat-role="${name}"]`);
    const state = { data: null, loading: false, controller: null, request: 0, refreshTimer: null };
    const options = (select, values) => {
      for (const [value, label] of values) {
        const option = document.createElement("option");
        option.value = value;
        option.dataset.statLabel = label;
        select.appendChild(option);
      }
    };
    options(field("window"), WINDOWS);
    options(field("metric"), METRICS);
    options(field("style"), [["columns", "Columns"], ["line", "Line"]]);
    options(field("dimension"), DIMENSIONS);
    options(field("measure"), [["sessions", "Sessions"], ["events", "Events"]]);
    options(field("limit"), [["10", "Top 10"], ["20", "Top 20"], ["all", "All"]]);
    const locale = () => scope.WebMarsI18n?.getLanguage?.() || document.documentElement.lang || "en";
    const number = (value) => new Intl.NumberFormat(locale()).format(Number(value) || 0);
    const duration = (seconds) => {
      const value = Math.max(0, Math.round(Number(seconds) || 0));
      if (value < 60) return `${number(value)} s`;
      if (value < 3600) return `${number(Math.floor(value / 60))} min ${number(value % 60)} s`;
      return `${number(Math.floor(value / 3600))} h ${number(Math.floor(value % 3600 / 60))} min`;
    };
    const durationOrDash = (seconds) => seconds == null ? "—" : duration(seconds);
    const dateLabel = (iso, windowName) => {
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale(), windowName === "30d"
        ? { day: "numeric", month: "short" } : { hour: "2-digit", minute: "2-digit" }).format(date);
    };
    const el = (tag, className, value) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (value !== undefined) element.textContent = String(value);
      return element;
    };
    const svg = (tag, attributes = {}) => {
      const element = document.createElementNS(SVG, tag);
      for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
      return element;
    };

    function renderChart(target, items, style, metricLabel) {
      target.replaceChildren();
      target.setAttribute("aria-label", `${metricLabel}: ${items.map((item) => `${item.label} ${item.display}`).join(", ")}`);
      const left = 48, top = 18, width = 735, height = 177;
      const maximum = Math.max(1, ...items.map((item) => item.value));
      const tickCount = Math.min(4, Math.ceil(maximum));
      for (let tick = 0; tick <= tickCount; tick += 1) {
        const y = top + height - tick * height / tickCount;
        target.appendChild(svg("line", { x1: left, x2: left + width, y1: y, y2: y, class: "usage-stats-grid" }));
        const label = svg("text", { x: left - 7, y: y + 4, "text-anchor": "end", class: "usage-stats-axis-label" });
        label.textContent = number(Math.round(maximum * tick / tickCount));
        target.appendChild(label);
      }
      if (!items.length) {
        const empty = svg("text", { x: 400, y: 115, "text-anchor": "middle", class: "usage-stats-axis-label" });
        empty.textContent = translate("No data for these filters.");
        target.appendChild(empty);
        return;
      }
      const stride = width / items.length;
      const points = [];
      items.forEach((item, index) => {
        const x = left + (index + 0.5) * stride;
        const y = top + height * (1 - item.value / maximum);
        points.push(`${x},${y}`);
        if (style === "columns") {
          const bar = svg("rect", { x: left + index * stride + Math.max(1, stride * 0.1), y,
            width: Math.max(1, stride * 0.8), height: Math.max(0, top + height - y), class: "usage-stats-bar" });
          const title = svg("title");
          title.textContent = `${item.label}: ${item.display}`;
          bar.appendChild(title);
          target.appendChild(bar);
        }
        const labelEvery = Math.max(1, Math.ceil(items.length / 8));
        if (index % labelEvery === 0 || index === items.length - 1) {
          const label = svg("text", { x, y: 219, "text-anchor": "middle", class: "usage-stats-axis-label" });
          label.textContent = item.label.length > 13 ? `${item.label.slice(0, 12)}…` : item.label;
          target.appendChild(label);
        }
      });
      if (style === "line") {
        target.appendChild(svg("polyline", { points: points.join(" "), class: "usage-stats-line" }));
        items.forEach((item, index) => {
          const x = left + (index + 0.5) * stride;
          const y = top + height * (1 - item.value / maximum);
          const point = svg("circle", { cx: x, cy: y, r: 3, class: "usage-stats-point" });
          const title = svg("title");
          title.textContent = `${item.label}: ${item.display}`;
          point.appendChild(title);
          target.appendChild(point);
        });
      }
    }

    function renderTable(target, items, labelTitle, valueTitle) {
      const table = el("table", "usage-stats-table");
      const header = el("tr");
      header.append(el("th", "", labelTitle), el("th", "", valueTitle));
      const thead = el("thead");
      thead.appendChild(header);
      const body = el("tbody");
      for (const item of items) {
        const row = el("tr");
        row.append(el("td", "", item.label), el("td", "", item.display));
        body.appendChild(row);
      }
      table.append(thead, body);
      target.replaceChildren(table);
    }

    function metricValue(bucket, metric) {
      return Number(metric in bucket ? bucket[metric] : bucket.event_counts?.[metric]) || 0;
    }

    function render() {
      const data = state.data;
      if (!data) return;
      const totals = data.totals || {};
      const cards = [
        ["Measured sessions", number(totals.sessions)], ["New sessions", number(totals.new_sessions)],
        ["Ready sessions", number(totals.ready_sessions)],
        ["Ready with successful run", number(totals.ready_with_successful_run)],
        ["Events received", number(totals.events)], ["Interaction time", duration(totals.interaction_seconds)],
        ["Visible presence", duration(totals.presence_seconds)],
        ["Present in last 5 minutes", number(totals.recent_presence_sessions)],
        ["Median interaction", durationOrDash(totals.interaction_distribution?.median_seconds)],
        ["P90 interaction", durationOrDash(totals.interaction_distribution?.p90_seconds)],
        ["Median visible presence", durationOrDash(totals.presence_distribution?.median_seconds)],
        ["P90 visible presence", durationOrDash(totals.presence_distribution?.p90_seconds)]
      ];
      const renderKpi = ([label, value]) => {
        const card = el("div", "usage-stats-kpi");
        card.append(el("span", "", translate(label)), el("strong", "", value));
        return card;
      };
      const primaryLabels = new Set([
        "Measured sessions", "New sessions", "Events received",
        "Ready with successful run", "Interaction time", "Visible presence"
      ]);
      field("kpis-primary").replaceChildren(...cards.filter(([label]) => primaryLabels.has(label)).map(renderKpi));
      field("kpis-details").replaceChildren(...cards.map(renderKpi));
      const selectedMetric = field("metric").value;
      const metricLabel = translate(METRICS.find(([key]) => key === selectedMetric)?.[1] || selectedMetric);
      const windowName = field("window").value;
      const timed = (Array.isArray(data.timeline) ? data.timeline : []).map((bucket) => {
        const value = metricValue(bucket, selectedMetric);
        return { label: dateLabel(bucket.from, windowName), value,
          display: selectedMetric.endsWith("_seconds") ? duration(value) : number(value) };
      });
      renderChart(field("trend-chart"), timed, field("style").value, metricLabel);
      renderTable(field("trend-table"), timed, translate("Interval"), metricLabel);
      const dimension = field("dimension").value;
      const supportsEvents = dimension === "events" || dimension === "resources";
      field("measure").disabled = !supportsEvents;
      if (!supportsEvents) field("measure").value = "sessions";
      const measure = field("measure").value;
      const filter = field("filter").value.trim().toLocaleLowerCase(locale());
      const entries = Array.isArray(data.breakdowns?.[dimension]) ? data.breakdowns[dimension] : [];
      const matches = entries.map((entry) => ({ ...entry,
        label: dimension === "events"
          ? translate(EVENT_LABELS[entry.key] || entry.key)
          : dimension === "resources"
            ? `${translate(entry.kind === "tool_open" ? "Tool" : entry.kind === "feature_use" ? "Feature" : "Example")}: ${String(entry.key || "").replaceAll(/[-_]/g, " ")}`
            : translate(String(entry.key || "")) }))
        .filter((entry) => entry.label.toLocaleLowerCase(locale()).includes(filter))
        .sort((a, b) => (Number(b[measure]) || 0) - (Number(a[measure]) || 0));
      const limit = field("limit").value === "all" ? matches.length : Number(field("limit").value);
      const grouped = matches.slice(0, limit).map((entry) => ({ label: entry.label,
        value: Number(entry[measure]) || 0, display: number(entry[measure]) }));
      const dimensionLabel = translate(DIMENSIONS.find(([key]) => key === dimension)?.[1] || dimension);
      renderChart(field("breakdown-chart"), grouped, field("style").value, dimensionLabel);
      renderTable(field("breakdown-table"), grouped, dimensionLabel, translate(measure === "events" ? "Events" : "Sessions"));
      field("status").textContent = `${translate("Updated")}: ${new Intl.DateTimeFormat(locale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(data.through))} · ${translate("Buckets can include the same session more than once.")}`;
    }

    async function load() {
      state.request += 1;
      const request = state.request;
      state.controller?.abort();
      state.controller = new AbortController();
      state.loading = true;
      field("status").textContent = translate("Loading...");
      const configured = scope.WebMarsConfig?.metrics?.publicEndpoint;
      let endpoint;
      try { endpoint = new URL(configured || "/_metrics/public", scope.location.origin); }
      catch {
        state.loading = false;
        field("status").textContent = translate("Statistics are unavailable on this installation.");
        return;
      }
      if (endpoint.origin !== scope.location.origin) {
        state.loading = false;
        field("status").textContent = translate("Statistics are unavailable on this installation.");
        return;
      }
      endpoint.searchParams.set("window", field("window").value);
      try {
        const response = await scope.fetch(endpoint.href, { credentials: "omit", cache: "no-store",
          redirect: "error", signal: state.controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (request !== state.request) return;
        if (data.window !== field("window").value || !Array.isArray(data.timeline) || !data.totals || !data.breakdowns) {
          throw new Error("Invalid statistics response");
        }
        state.data = data;
        render();
      } catch (error) {
        if (request !== state.request) return;
        state.data = null;
        field("kpis-primary").replaceChildren();
        field("kpis-details").replaceChildren();
        field("trend-chart").replaceChildren();
        field("breakdown-chart").replaceChildren();
        field("trend-table").replaceChildren();
        field("breakdown-table").replaceChildren();
        field("status").textContent = `${translate("Statistics are unavailable on this installation.")} ${error?.message || ""}`.trim();
      } finally {
        if (request === state.request) state.loading = false;
      }
    }

    function refreshTranslations() {
      win.querySelectorAll("[data-stat-label]").forEach((node) => {
        const key = node.dataset.statLabel;
        if (key) node.textContent = translate(key);
      });
      render();
    }
    field("window").addEventListener("change", () => { void load(); });
    for (const name of ["metric", "style", "dimension", "measure", "limit"]) {
      field(name).addEventListener("change", render);
    }
    field("filter").addEventListener("input", render);
    field("refresh").addEventListener("click", () => { void load(); });
    win.querySelector('[data-win-action="close"]').addEventListener("click", () => {
      state.request += 1;
      state.controller?.abort();
    });
    state.refreshTimer = scope.setInterval(() => {
      if (!win.classList.contains("window-hidden") && !state.loading) void load();
    }, 60000);
    refreshTranslations();
    return {
      open() { windowManager.show(win.id); void load(); },
      refreshTranslations
    };
  }

  registry.usageStatistics = Object.freeze({ createUsageStatisticsWindow });
})();
