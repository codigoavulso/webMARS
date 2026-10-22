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
    ["presence_seconds", "Visible presence (seconds)"],
    ["login_start", "Sign-in attempts"], ["login_success", "Successful sign-ins"],
    ["account_created", "Accounts created"], ["login_error", "Sign-in errors"], ["account_linked", "Accounts linked"]
  ];
  const DIMENSIONS = [
    ["audience", "Traffic classification"],
    ["events", "Event types"], ["resources", "Resources"], ["source", "Sources"],
    ["language", "Languages"], ["device", "Input devices"],
    ["surface", "Pages and app"], ["returning", "Return categories"]
  ];
  const EVENT_LABELS = Object.fromEntries(METRICS.map(([key, label]) => [key, label]));
  Object.assign(EVENT_LABELS, { active_time: "Interaction samples", launch_app: "App launches" });
  Object.assign(EVENT_LABELS, { cloud_save: "Save Project", cloud_load: "Open Cloud Project..." });

  function createUsageStatisticsWindow(refs, windowManager, translate, getTools = () => []) {
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
        <div class="usage-stats-toolbar usage-stats-controls">
          <label><span data-stat-label="Period"></span><select data-stat-role="window"></select></label>
          <label><span data-stat-label="Audience"></span><select data-stat-role="audience"></select></label>
          <button class="tool-btn" type="button" data-stat-role="refresh" data-stat-label="Refresh"></button>
          <button class="tool-btn" type="button" data-stat-role="export" data-stat-label="Export CSV"></button>
        </div>
        <p class="usage-stats-status" data-stat-role="status" role="status"></p>
        <div class="usage-stats-population" data-stat-role="population-summary"></div>
        <p class="usage-stats-note" data-stat-role="web-summary"></p>
        <p class="usage-stats-note" data-stat-role="coverage"></p>
        <div class="usage-stats-overview">
          <div class="usage-stats-kpis usage-stats-kpis-primary" data-stat-role="kpis-primary"></div>
          <details class="usage-stats-kpi-details"><summary data-stat-label="Show values"></summary>
            <div class="usage-stats-kpis usage-stats-kpis-details" data-stat-role="kpis-details"></div>
          </details>
        </div>
        <div class="usage-stats-tabs" role="tablist">
          <button type="button" class="tool-btn" role="tab" data-stat-tab="overview" aria-controls="usage-stats-overview" aria-selected="true" data-stat-label="Overview"></button>
          <button type="button" class="tool-btn" role="tab" data-stat-tab="resources" aria-controls="usage-stats-resources" aria-selected="false" tabindex="-1" data-stat-label="Resources"></button>
          <button type="button" class="tool-btn" role="tab" data-stat-tab="cloud" aria-controls="usage-stats-cloud" aria-selected="false" tabindex="-1" data-stat-label="Server-confirmed Cloud activity"></button>
        </div>
        <section data-stat-view="overview" id="usage-stats-overview" role="tabpanel">
          <div class="usage-stats-charts">
            <section class="usage-stats-panel">
              <div class="usage-stats-panel-head"><h3 data-stat-label="Activity over time"></h3>
                <div class="usage-stats-controls">
                  <label><span data-stat-label="Trend metric"></span><select data-stat-role="metric"></select></label>
                  <label><span data-stat-label="Chart style"></span><select data-stat-role="style"></select></label>
                </div>
              </div>
              <svg data-stat-role="trend-chart" class="usage-stats-chart" viewBox="0 0 800 240" role="img"></svg>
              <details><summary data-stat-label="Show values"></summary><div class="usage-stats-table-wrap" data-stat-role="trend-table"></div></details>
            </section>
            <section class="usage-stats-panel"><h3 data-stat-label="Sessions"></h3><div data-stat-role="funnel"></div></section>
          </div>
          <details class="usage-stats-panel usage-stats-diagnostics"><summary data-stat-label="Traffic classification"></summary>
            <div data-stat-role="population"></div>
            <p data-stat-label="Traffic estimates can include unmarked internal use."></p>
          </details>
        </section>
        <section data-stat-view="resources" id="usage-stats-resources" role="tabpanel" hidden>
          <section class="usage-stats-panel">
            <div class="usage-stats-panel-head"><h3 data-stat-label="Breakdown"></h3>
              <div class="usage-stats-controls usage-stats-breakdown-controls">
                <label><span data-stat-label="Group by"></span><select data-stat-role="dimension"></select></label>
                <label><span data-stat-label="Measure"></span><select data-stat-role="measure"></select></label>
                <label><span data-stat-label="Filter results"></span><input data-stat-role="filter" type="search" maxlength="80"></label>
                <label><span data-stat-label="Show"></span><select data-stat-role="limit"></select></label>
              </div>
            </div>
            <svg data-stat-role="breakdown-chart" class="usage-stats-chart usage-stats-ranking" viewBox="0 0 800 340" role="img"></svg>
            <details><summary data-stat-label="Show values"></summary><div class="usage-stats-table-wrap" data-stat-role="breakdown-table"></div></details>
          </section>
        </section>
        <section data-stat-view="cloud" id="usage-stats-cloud" role="tabpanel" hidden>
          <section class="usage-stats-panel"><h3 data-stat-label="Server-confirmed Cloud activity"></h3><div data-stat-role="cloud-activity"></div></section>
        </section>
        <p class="usage-stats-note" data-stat-label="Sessions are visits, not people. Time measures overlap; sessions may repeat across intervals."></p>
      </div>`;
    refs.windows.desktop.appendChild(win);
    windowManager.registerWindow(win);
    const field = (name) => win.querySelector(`[data-stat-role="${name}"]`);
    const state = { data: null, cloudData: null, loading: false, controller: null, request: 0, refreshTimer: null };
    const audienceLabel = (key) => translate({ public: "Public traffic", human: "Probable human", unknown: "Unclassified",
      internal: "Internal usage", test: "Tests", automated: "Probable automation", all: "All traffic" }[key] || key);
    const options = (select, values) => {
      for (const [value, label] of values) {
        const option = document.createElement("option");
        option.value = value;
        option.dataset.statLabel = label;
        select.appendChild(option);
      }
    };
    options(field("window"), WINDOWS);
    options(field("audience"), [["public", "Public traffic"], ["human", "Probable human"], ["unknown", "Unclassified"],
      ["internal", "Internal usage"], ["test", "Tests"], ["automated", "Probable automation"], ["all", "All traffic"]]);
    options(field("metric"), METRICS);
    options(field("style"), [["columns", "Columns"], ["line", "Line"]]);
    options(field("dimension"), DIMENSIONS);
    options(field("measure"), [["sessions", "Sessions"], ["events", "Events"]]);
    options(field("limit"), [["10", "Top 10"], ["20", "Top 20"], ["all", "All"]]);
    field("dimension").value = "resources";
    field("window").value = "24h";
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
      const canvasWidth = Math.max(300, target.clientWidth || 760);
      target.setAttribute("viewBox", `0 0 ${canvasWidth} 210`);
      const left = 40, top = 18, width = canvasWidth - 52, height = 145;
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
        const empty = svg("text", { x: canvasWidth / 2, y: 105, "text-anchor": "middle", class: "usage-stats-axis-label" });
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
        const labelEvery = Math.max(1, Math.ceil(items.length / Math.max(2, Math.floor(width / 85))));
        if (index === 0 || index === items.length - 1 || (index % labelEvery === 0 && items.length - 1 - index >= labelEvery)) {
          const label = svg("text", { x, y: 190, "text-anchor": "middle", class: "usage-stats-axis-label" });
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

    function renderRanking(target, items, title) {
      target.replaceChildren();
      const height = Math.max(80, items.length * 32 + 12);
      const width = Math.max(300, target.clientWidth || 800);
      const start = Math.round(width * .45), barWidth = width - start - 40;
      target.setAttribute("viewBox", `0 0 ${width} ${height}`);
      target.style.height = `${height}px`;
      target.setAttribute("aria-label", `${title}: ${items.map(item => `${item.label} ${item.display}`).join(", ")}`);
      const maximum = Math.max(1, ...items.map(item => item.value));
      if (!items.length) {
        const empty = svg("text", {x: 12, y: 30, class: "usage-stats-axis-label"});
        empty.textContent = translate("No data for these filters."); target.append(empty);
      }
      items.forEach((item, index) => {
        const y = 12 + index * 32;
        const label = svg("text", {x: 0, y: y + 13, class: "usage-stats-axis-label"});
        const characters = Math.max(15, Math.floor((start - 12) / 6));
        label.textContent = item.label.length > characters ? `${item.label.slice(0, characters - 1)}…` : item.label;
        const bar = svg("rect", {x: start, y, width: item.value / maximum * barWidth, height: 19, class: "usage-stats-bar"});
        const tooltip = svg("title"); tooltip.textContent = `${item.label}: ${item.display}`; bar.append(tooltip);
        const value = svg("text", {x: width - 8, y: y + 13, "text-anchor": "end", class: "usage-stats-axis-label"});
        value.textContent = item.display;
        target.append(label, bar, value);
      });
    }

    function metricValue(bucket, metric) {
      return Number(metric in bucket ? bucket[metric] : bucket.event_counts?.[metric]) || 0;
    }

    function render() {
      const data = state.data;
      if (data) {
        const classification = data.web_traffic?.web_visits_by_class || data.classification?.sessions_by_class || {};
        const title = data.web_traffic?.web_visits_by_class ? translate("Web visits") : translate("Sessions");
        renderTable(field("population"), Object.entries(classification).map(([key,count]) => ({label:audienceLabel(key),display:number(count)})), translate("Traffic classification"), title);
        if (data.web_traffic && !data.web_traffic.unavailable) {
          field("population").append(el("p", "", `${translate("App sessions linked to web visits")}: ${number(data.web_traffic.linked_app_sessions)} · ${translate("Unlinked app sessions")}: ${number(data.web_traffic.unlinked_app_sessions)}`));
        }
        const cloud = state.cloudData;
        if (cloud) {
          const rows = [{label:translate("Active Cloud accounts"),display:number(cloud.active_accounts)}];
          for (const row of cloud.events || []) rows.push({label:`${translate(EVENT_LABELS[row.event] || row.event)} · ${{google:"Google",facebook:"Facebook",password:translate("Password"),session:translate("Authenticated session")}[row.method] || row.method}`,display:number(row.count)});
          renderTable(field("cloud-activity"), rows, translate("Measure"), translate("Value"));
        } else field("cloud-activity").textContent = translate("Cloud activity is unavailable for this filter or installation.");
      }
      if (!data) return;
      const totals = data.totals || {};
      const population = data.classification?.sessions_by_class || {};
      field("population-summary").replaceChildren(...["human", "unknown", "internal", "test", "automated"].map((kind) => {
        const button = el("button", "tool-btn", audienceLabel(kind) + ": " + number(population[kind]));
        button.type = "button";
        button.setAttribute("aria-pressed", String(field("audience").value === kind));
        button.addEventListener("click", () => { field("audience").value = kind; void load(); });
        return button;
      }));
      field("population-summary").prepend(el("span", "usage-stats-population-caption", translate("Sessions") + " · " + translate("All traffic") + ":"));
      const web = data.web_traffic?.web_visits_by_class;
      field("web-summary").textContent = web
        ? `${translate("Web visits")}: ${number(Object.values(web).reduce((sum, count) => sum + Number(count), 0))} · `
          + ["human", "unknown", "internal", "test", "automated"].filter(kind => web[kind]).map(kind => `${audienceLabel(kind)}: ${number(web[kind])}`).join(" · ") : "";
      field("coverage").textContent = data.quality?.collected_from
        ? translate("Collected since") + ": " + new Intl.DateTimeFormat(locale(), {dateStyle:"short",timeStyle:"short"}).format(new Date(data.quality.collected_from))
          : "";
      const steps = [["Measured sessions", totals.sessions], ["Ready sessions", totals.ready_sessions],
        ["Sessions with interaction", totals.interacting_sessions], ["Successful runs", totals.successful_sessions ?? totals.ready_with_successful_run],
        ["Error sessions", totals.error_sessions]];
      field("funnel").replaceChildren(...steps.map(([label, count]) => {
        const row = el("div", "usage-stats-funnel-row");
        const progress = el("progress"); progress.max = Math.max(1, Number(totals.sessions) || 0); progress.value = Number(count) || 0;
        progress.setAttribute("aria-label", translate(label));
        row.append(el("span", "", translate(label)), el("strong", "", number(count)), progress);
        return row;
      }));
      const cards = [
        ["Measured sessions", number(totals.sessions)], ["New sessions", number(totals.new_sessions)],
        ["Sessions with interaction", number(totals.interacting_sessions)],
        ["Returning sessions", number(totals.returning_sessions)],
        ["Successful runs", number(totals.successful_sessions ?? totals.ready_with_successful_run)],
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
        if (label === "Measured sessions" && data.comparison?.complete) {
          const previous = Number(data.comparison.sessions) || 0;
          card.append(el("small", "", translate("Previous period") + ": " + number(previous)
            + (previous ? " · " + (totals.sessions >= previous ? "+" : "") + number(Math.round((totals.sessions - previous) / previous * 100)) + "%" : "")));
        }
        return card;
      };
      const primaryLabels = new Set([
        "Measured sessions", "Sessions with interaction", "Returning sessions", "Successful runs"
      ]);
      field("kpis-primary").replaceChildren(...cards.filter(([label]) => primaryLabels.has(label)).map(renderKpi));
      field("kpis-details").replaceChildren(...cards.map(renderKpi));
      const selectedMetric = field("metric").value;
      const metricLabel = translate(METRICS.find(([key]) => key === selectedMetric)?.[1] || selectedMetric);
      const windowName = field("window").value;
      const timed = (Array.isArray(data.timeline) ? data.timeline : [])
        .filter((bucket) => !data.quality?.collected_from || new Date(bucket.through) > new Date(data.quality.collected_from)).map((bucket) => {
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
      const resourceLabel = (entry) => {
        if (["google", "facebook"].includes(entry.key)) return entry.key === "google" ? "Google" : "Facebook";
        if (entry.kind === "tool_open") return translate(getTools().find(tool => tool.id === entry.key)?.label || entry.key);
        const feature = {step:"Step", backstep:"Backstep", run:"Run", project_save:"Save Project",
          cloud_save:"Save Project", cloud_load:"Open Cloud Project...", help:"Help"}[entry.key];
        return feature ? translate(feature) : String(entry.key || "").replaceAll(/[-_]/g, " ");
      };
      const matches = entries.map((entry) => ({ ...entry,
        label: dimension === "events"
          ? translate(EVENT_LABELS[entry.key] || entry.key)
          : dimension === "resources"
            ? `${translate(EVENT_LABELS[entry.kind] || (entry.kind === "tool_open" ? "Tool" : entry.kind === "feature_use" ? "Feature" : "Example"))}: ${resourceLabel(entry)}`
            : dimension === "audience" ? audienceLabel(entry.key) : translate(String(entry.key || "")) }))
        .filter((entry) => entry.label.toLocaleLowerCase(locale()).includes(filter))
        .sort((a, b) => (Number(b[measure]) || 0) - (Number(a[measure]) || 0));
      const limit = field("limit").value === "all" ? matches.length : Number(field("limit").value);
      const grouped = matches.slice(0, limit).map((entry) => ({ label: entry.label,
        value: Number(entry[measure]) || 0, display: number(entry[measure]) }));
      const dimensionLabel = translate(DIMENSIONS.find(([key]) => key === dimension)?.[1] || dimension);
      state.exportRows = [[dimension, measure], ...grouped.map(entry => [entry.label, entry.value])];
      renderRanking(field("breakdown-chart"), grouped, dimensionLabel);
      renderTable(field("breakdown-table"), grouped, dimensionLabel, translate(measure === "events" ? "Events" : "Sessions"));
      field("status").textContent = `${translate("Updated")}: ${new Intl.DateTimeFormat(locale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(data.through))}`;
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
      endpoint.searchParams.set("audience", field("audience").value);
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
        state.cloudData = null;
        // Account aggregates are server-confirmed and separately labelled;
        // they cannot be restricted to a browser's probable-human class.
        if (["public", "internal", "test", "all"].includes(field("audience").value)) {
          try {
            const api = new URL(scope.WebMarsConfig?.backMarsApiBase || "/api", scope.location.origin);
            if (api.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(api.hostname)) throw new Error("Invalid API URL");
            const accountUrl = new URL(api.href.replace(/\/$/, "") + "/statistics");
            accountUrl.searchParams.set("window", field("window").value);
            accountUrl.searchParams.set("context", field("audience").value);
            const signal = AbortSignal.any([state.controller.signal, AbortSignal.timeout(3000)]);
            const accountResponse = await scope.fetch(accountUrl.href, { credentials: "omit", cache: "no-store", redirect: "error", signal });
            if (accountResponse.ok) {
              const accountData = await accountResponse.json();
              if (request === state.request) state.cloudData = accountData;
            }
          } catch { /* The static simulator also runs without BackMars. */ }
        }
        if (request !== state.request) return;
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
        field("population-summary").replaceChildren();
        field("web-summary").textContent = "";
        field("coverage").textContent = "";
        field("population").replaceChildren();
        field("funnel").replaceChildren();
        field("cloud-activity").replaceChildren();
        field("status").textContent = translate("Statistics are unavailable on this installation.");
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
    field("audience").addEventListener("change", () => { void load(); });
    for (const name of ["metric", "style", "dimension", "measure", "limit"]) {
      field(name).addEventListener("change", render);
    }
    field("filter").addEventListener("input", render);
    field("refresh").addEventListener("click", () => { void load(); });
    const tabs = [...win.querySelectorAll("[data-stat-tab]")];
    const selectTab = (tab) => {
      tabs.forEach(button => { const selected = button === tab;
        button.setAttribute("aria-selected", String(selected)); button.tabIndex = selected ? 0 : -1;
      });
      win.querySelectorAll("[data-stat-view]").forEach(panel => { panel.hidden = panel.dataset.statView !== tab.dataset.statTab; });
      render();
    };
    tabs.forEach((tab, index) => {
      tab.id = `usage-stats-tab-${tab.dataset.statTab}`;
      win.querySelector(`[data-stat-view="${tab.dataset.statTab}"]`).setAttribute("aria-labelledby", tab.id);
      tab.addEventListener("click", () => selectTab(tab));
      tab.addEventListener("keydown", event => {
        let next;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = tabs.length - 1;
        if (next === undefined) return;
        event.preventDefault(); selectTab(tabs[next]); tabs[next].focus();
      });
    });
    field("export").addEventListener("click", () => {
      if (!state.data) return;
      const data = state.data;
      const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const rows = [["window", data.window, "audience", data.audience], ["from", data.from, "through", data.through],
        ["metric", "value"], ...Object.entries(data.totals).filter(([, value]) => typeof value === "number"),
        ["interval", "sessions", "events", "interaction_seconds", "presence_seconds"],
        ...data.timeline.map(bucket => [bucket.from, bucket.sessions, bucket.events, bucket.interaction_seconds, bucket.presence_seconds]),
        ...(state.exportRows || []),
        ["cloud_event", "method", "count"], ...(state.cloudData?.events || []).map(row => [row.event, row.method, row.count])];
      const blob = new Blob(["\uFEFF" + rows.map(row => row.map(quote).join(",")).join("\r\n")], {type: "text/csv;charset=utf-8"});
      const url = URL.createObjectURL(blob), link = el("a");
      link.href = url; link.download = `webmars-${data.window}-${data.audience}.csv`; link.click();
      scope.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    win.querySelector('[data-win-action="close"]').addEventListener("click", () => {
      state.request += 1;
      state.controller?.abort();
    });
    state.refreshTimer = scope.setInterval(() => {
      if (!win.classList.contains("window-hidden") && !state.loading) void load();
    }, 60000);
    // Resize with the desktop window and with the stacked mobile layout.
    let measuredWidth = 0;
    const observer = new ResizeObserver(entries => {
      const width = Math.round(entries[0]?.contentRect.width || 0);
      if (width > 0 && width !== measuredWidth) { measuredWidth = width; render(); }
    });
    observer.observe(win);
    refreshTranslations();
    return {
      open() { windowManager.show(win.id); void load(); },
      refreshTranslations
    };
  }

  registry.usageStatistics = Object.freeze({ createUsageStatisticsWindow });
})();
