(() => {
  const scope = typeof window !== "undefined" ? window : globalThis;
  const registry = scope.WebMarsModules || (scope.WebMarsModules = {});
  const SVG = "http://www.w3.org/2000/svg";
  const WINDOWS = [
    ["60m", "Last 60 minutes"], ["6h", "Last 6 hours"], ["24h", "Last 24 hours"],
    ["7d", "Last 7 days"], ["30d", "Last 30 days"]
  ];
  const EXTENDED_WINDOWS = new Set(["6h", "7d"]);
  const DAILY_WINDOWS = new Set(["7d", "30d"]);
  const CLOUD_AUDIENCES = new Set(["public", "internal", "test", "all"]);
  const PRIMARY_METRICS = [["sessions", "Measured sessions"], ["interacting_sessions", "Sessions with interaction"],
    ["returning_sessions", "Returns after 24 hours"], ["successful_sessions", "Sessions with a successful run"]];
  const OVERVIEW_RANKINGS = [
    ["resources", "Tools", "tool_open"], ["resources", "Features", "feature_use"],
    ["resources", "Examples", "example_open"], ["source", "Sources"],
    ["language", "Languages"], ["device", "Input devices"]
  ];
  const METRICS = [
    ["sessions", "Sessions in interval"], ["new_sessions", "New sessions"],
    ["interacting_sessions", "Sessions with interaction"], ["returning_sessions", "Returns after 24 hours"],
    ["successful_sessions", "Sessions with a successful run"], ["run_success", "Successful runs"],
    ["assemble_success", "Successful assemblies"], ["compile_success", "Successful compilations"],
    ["run_error", "Run errors"], ["assemble_error", "Assembly errors"],
    ["compile_error", "Compilation errors"], ["tool_open", "Tools opened"],
    ["feature_use", "Features used"], ["example_open", "Examples opened"],
    ["interaction_seconds", "Interaction time (seconds)"],
    ["presence_seconds", "Visible presence (seconds)"],
    ["login_start", "Sign-in attempts"], ["login_success", "Successful sign-ins"],
    ["account_created", "Accounts created"], ["login_error", "Sign-in errors"], ["account_linked", "Accounts linked"]
  ];
  const DIAGNOSTICS = [["page_view", "Page views"], ["app_ready", "App ready"],
    ["events", "Events received"], ["heartbeat", "Heartbeats"], ["app_startup", "App startup"],
    ["run_stopped", "Stopped by user"], ["run_fallthrough", "Reached end without exit"],
    ["run_input_cancelled", "Input cancelled"], ["run_fault_group", "Execution error categories"]];
  const COLLECTOR_DIAGNOSTICS = [
    ["window_time", "Visible window time", {}, "Window visibility is estimated. Several windows can be visible at once."],
    ["operation_time", "Operation duration", {}],
    ["operation_errors", "Detailed errors", {}, "Categories are counted once per operation."],
    ["execution_outcomes", "How executions end", {
      run_success: "Successful runs", run_error: "Run errors", run_stopped: "Stopped by user",
      run_fallthrough: "Reached end without exit", run_input_cancelled: "Input cancelled"
    }],
    ["execution_faults", "Execution error categories", {
      address: "Memory address", syscall: "System call", instruction: "Instruction", arithmetic: "Arithmetic",
      trap: "Trap", interrupt: "Interrupt", other: "Other"
    }, "Error categories describe the recorded execution errors."],
    ["startup", "App startup", {
      under_1s: "Under 1 second", "1_to_3s": "1 to under 3 seconds", "3_to_8s": "3 to under 8 seconds",
      "8s_or_more": "8 seconds or more", failed: "Startup failed"
    }, "Startup measures the first reported loading attempt on each page."]
  ];
  const WINDOW_LABELS = { help: "Help", settings: "Settings", editor: "Editor", execute: "Execute",
    messages: "Messages", registers: "Registers", project_manager: "Project Manager" };
  const ERROR_DETAILS = {
    include: "Include files", lexical: "Lexical analysis", syntax: "Syntax", semantic: "Semantic analysis",
    subset: "Language subset", entry_point: "Entry point", codegen: "Code generation", internal: "Internal error",
    macro: "Macros", unknown_operator: "Unknown operator", operand_count: "Operand count", operand_format: "Operand format",
    undefined_symbol: "Undefined symbol", duplicate_label: "Duplicate label", directive: "Directives", memory_limit: "Memory limit",
    encoding: "Instruction encoding", program_arguments: "Program arguments", warning_as_error: "Warning treated as error",
    memory_read: "Memory read", memory_write: "Memory write", instruction_fetch: "Instruction fetch", invalid_input: "Invalid input",
    unsupported_syscall: "Unsupported system call", syscall: "System call", reserved_instruction: "Reserved instruction",
    overflow: "Arithmetic overflow", divide_by_zero: "Division by zero", break_instruction: "BREAK instruction",
    trap: "Trap", interrupt: "Interrupt", other: "Other"
  };
  const STAGES = [["compile", "Compile"], ["assemble", "Assemble"], ["run", "Execute"]];
  const SEGMENT_DIMENSIONS = [["source", "Sources"], ["device", "Input devices"], ["language", "Languages"], ["build", "Builds"]];
  const SEGMENT_METRICS = [["interacting_sessions", "Sessions with interaction"], ["successful_sessions", "Sessions with a successful run"]];
  const RECOVERY_METRICS = [["first_success", "First recorded result successful"], ["recovered", "Recovered after an error"],
    ["error_only", "Sessions with errors only"]];
  const RESOURCE_KINDS = new Set(["tool_open", "feature_use", "example_open"]);
  const SESSION_METRICS = new Set(["new_sessions", ...PRIMARY_METRICS.map(([metric]) => metric)]);
  const DIMENSIONS = [
    ["resources", "Resources"], ["source", "Sources"],
    ["language", "Languages"], ["device", "Input devices"],
    ["surface", "Pages and app"], ["returning", "Return categories"],
    ["audience", "Traffic classification"], ["events", "Event types"], ["auth", "Sign-in methods"]
  ];
  const BREAKDOWN_LABELS = {
    source: { direct: "Direct", search: "Search engines", social: "Social networks", internal: "Internal navigation", other: "Other" },
    device: { touch: "Touch", pointer: "Pointer" }
  };
  const EVENT_LABELS = Object.fromEntries([...METRICS, ...DIAGNOSTICS]);
  Object.assign(EVENT_LABELS, { active_time: "Interaction samples", launch_app: "App launches" });
  Object.assign(EVENT_LABELS, { interaction: "Interaction" });
  Object.assign(EVENT_LABELS, { cloud_save: "Save Project", cloud_load: "Open Cloud Project..." });

  function timelineRows(data) {
    const coverage = data.quality?.collected_from;
    if (coverage === null) return [];
    const collectedFrom = coverage ? Date.parse(coverage) : -Infinity;
    return data.timeline.flatMap(bucket => {
      const from = Date.parse(bucket.from);
      const through = Date.parse(bucket.through || bucket.until);
      const until = Date.parse(bucket.until || bucket.through);
      if (until <= collectedFrom || through < collectedFrom) return [];
      return [{ ...bucket, partial: from < collectedFrom || through < until,
        observedFrom: from < collectedFrom ? coverage : bucket.from }];
    });
  }

  function workflowRows(data) {
    if (!data) return [];
    const events = data.breakdowns.events || [];
    const count = (event) => events.find(row => row.key === event)?.events ?? 0;
    return STAGES.map(([stage, label]) => {
      const observed = Array.isArray(data.workflow) ? data.workflow.find(row => row.stage === stage) : null;
      const successes = observed?.successes ?? count(`${stage}_success`);
      const errors = observed?.errors ?? count(`${stage}_error`);
      const total = successes + errors;
      return { stage, label, successes, errors, sessions: observed?.sessions,
        errorOnlySessions: observed?.error_only_sessions, successRate: total ? successes / total : null };
    });
  }

  function segmentRows(analysis, dimension, minimum, sort) {
    const entries = analysis?.segments?.[dimension];
    if (!Array.isArray(entries)) return [];
    const value = row => sort === "sessions" ? row.sessions : row[sort] / row.sessions;
    return entries.filter(row => row.sessions >= minimum)
      .sort((a, b) => value(b) - value(a) || b.sessions - a.sessions || a.key.localeCompare(b.key));
  }

  function createUsageStatisticsWindow(refs, windowManager, translate, getTools = () => []) {
    const win = document.createElement("section");
    win.id = "window-usage-statistics";
    win.className = "desktop-window window-hidden tool-window dialog-window mobile-panel-window usage-stats-window";
    Object.assign(win.style, { left: "84px", top: "48px", width: "1120px", height: "680px", minWidth: "280px", minHeight: "280px" });
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
          <p class="usage-stats-status" data-stat-role="status" role="status"></p>
        </div>
        <div class="usage-stats-tabs" role="tablist">
          <button type="button" class="tool-btn" role="tab" data-stat-tab="overview" aria-controls="usage-stats-overview" aria-selected="true" data-stat-label="Overview"></button>
          <button type="button" class="tool-btn" role="tab" data-stat-tab="analysis" aria-controls="usage-stats-analysis" aria-selected="false" tabindex="-1" data-stat-label="Analysis"></button>
          <button type="button" class="tool-btn" role="tab" data-stat-tab="diagnostics" aria-controls="usage-stats-diagnostics" aria-selected="false" tabindex="-1" data-stat-label="Diagnostics"></button>
          <button type="button" class="tool-btn" role="tab" data-stat-tab="resources" aria-controls="usage-stats-resources" aria-selected="false" tabindex="-1" data-stat-label="Resources"></button>
          <button type="button" class="tool-btn" role="tab" data-stat-tab="builds" aria-controls="usage-stats-builds" aria-selected="false" tabindex="-1" data-stat-label="Builds"></button>
          <button type="button" class="tool-btn" role="tab" data-stat-tab="cloud" aria-controls="usage-stats-cloud" aria-selected="false" tabindex="-1" data-stat-label="Cloud"></button>
        </div>
        <section data-stat-view="overview" id="usage-stats-overview" role="tabpanel">
          <div class="usage-stats-kpis usage-stats-kpis-primary" data-stat-role="kpis-primary"></div>
          <section class="usage-stats-panel usage-stats-overview-chart">
            <div class="usage-stats-panel-head"><h3><span data-stat-label="Activity over time"></span> <small data-stat-role="axis-zone"></small></h3>
              <div class="usage-stats-controls">
                <label><span data-stat-label="Trend metric"></span><select data-stat-role="metric"></select></label>
                <label><span data-stat-label="Chart style"></span><select data-stat-role="style"></select></label>
              </div>
            </div>
            <svg id="usage-stats-trend" data-stat-role="trend-chart" class="usage-stats-chart" viewBox="0 0 800 240" role="img" tabindex="-1" aria-keyshortcuts="ArrowLeft ArrowRight Home End"></svg>
            <p class="usage-stats-chart-help" data-stat-role="chart-help" aria-live="polite"></p>
            <p class="usage-stats-note" data-stat-role="coverage" hidden></p>
            <details><summary data-stat-label="Show values"></summary><div class="usage-stats-table-wrap" data-stat-role="trend-table"></div><p class="usage-stats-note" data-stat-label="Sessions are visits, not people. Time measures overlap; sessions may repeat across intervals."></p></details>
          </section>
          <div class="usage-stats-overview-rankings" data-stat-role="overview-rankings" hidden></div>
          <section class="usage-stats-panel usage-stats-workflow" data-stat-role="workflow-panel" hidden>
            <h3 data-stat-label="Observed results"></h3>
            <div class="usage-stats-table-wrap" data-stat-role="workflow"></div>
            <p class="usage-stats-note" data-stat-label="Success rate uses the recorded outcomes for each action."></p>
          </section>
          <details class="usage-stats-panel usage-stats-diagnostics">
            <summary data-stat-label="Diagnostics"></summary>
            <div class="usage-stats-table-wrap" data-stat-role="kpis-details"></div>
          </details>
          <details class="usage-stats-panel usage-stats-diagnostics"><summary data-stat-label="Traffic classification"></summary>
            <div class="usage-stats-diagnostic-tables">
              <div data-stat-role="population"></div>
              <div><p class="usage-stats-note" data-stat-role="web-period" hidden></p><div data-stat-role="web-summary"></div></div>
            </div>
            <label class="usage-stats-internal" data-stat-role="internal-label" hidden>
              <input type="checkbox" data-stat-role="internal">
              <span data-stat-label="Mark this browser as internal usage"></span>
            </label>
            <p data-stat-label="Traffic estimates can include unmarked internal use."></p>
          </details>
        </section>
        <section class="usage-stats-analysis" data-stat-view="analysis" id="usage-stats-analysis" role="tabpanel" hidden>
          <p data-stat-role="analysis-status" role="status"></p>
          <div data-stat-role="analysis-content" hidden>
            <section class="usage-stats-panel">
              <h3 data-stat-label="Recovery after errors"></h3>
              <p class="usage-stats-note" data-stat-label="Each stage uses sessions with a recorded result in the selected period."></p>
              <div class="usage-stats-stage-grid" data-stat-role="analysis-stages"></div>
            </section>
            <section class="usage-stats-panel">
              <h3 data-stat-label="Compare segments"></h3>
              <div class="usage-stats-controls usage-stats-analysis-controls">
                <label><span data-stat-label="Group by"></span><select data-stat-role="segment-dimension"></select></label>
                <label><span data-stat-label="Minimum sessions"></span><select data-stat-role="segment-minimum"></select></label>
                <label><span data-stat-label="First segment"></span><select data-stat-role="segment-first"></select></label>
                <label><span data-stat-label="Second segment"></span><select data-stat-role="segment-second"></select></label>
              </div>
              <p class="usage-stats-note" data-stat-label="Rates use all sessions in each segment."></p>
              <p class="usage-stats-note" data-stat-role="segment-build-note" data-stat-label="A session can appear in more than one build." hidden></p>
              <div class="usage-stats-table-wrap" data-stat-role="segment-comparison"></div>
              <div class="usage-stats-controls usage-stats-analysis-controls">
                <label><span data-stat-label="Sort by"></span><select data-stat-role="segment-sort"></select></label>
              </div>
              <div class="usage-stats-table-wrap" data-stat-role="segment-list"></div>
            </section>
          </div>
        </section>
        <section data-stat-view="diagnostics" id="usage-stats-diagnostics" role="tabpanel" hidden>
          <p class="usage-stats-note" data-stat-role="diagnostic-status" role="status"></p>
          <div class="usage-stats-diagnostic-grid" data-stat-role="diagnostic-groups" hidden></div>
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
            <ul data-stat-role="breakdown-chart" class="usage-stats-ranking"></ul>
          </section>
        </section>
        <section data-stat-view="builds" id="usage-stats-builds" class="usage-stats-panel" role="tabpanel" hidden>
          <p class="usage-stats-note" data-stat-role="builds-empty" data-stat-label="No data for these filters." hidden></p>
          <div class="usage-stats-table-wrap" data-stat-role="builds-table" hidden>
            <table class="usage-stats-table">
              <thead><tr>
                <th scope="col" data-stat-label="Build"></th>
                <th scope="col" data-stat-label="Sessions"></th>
                <th scope="col" data-stat-label="Events received"></th>
              </tr></thead>
              <tbody data-stat-role="builds-rows"></tbody>
            </table>
          </div>
        </section>
        <section data-stat-view="cloud" id="usage-stats-cloud" role="tabpanel" hidden>
          <section class="usage-stats-panel">
            <h3 data-stat-label="Server-confirmed Cloud activity"></h3>
            <p class="usage-stats-note" data-stat-role="cloud-period" hidden></p>
            <div data-stat-role="cloud-activity"></div>
            <button class="tool-btn" type="button" data-stat-role="cloud-24h" data-stat-label="Last 24 hours" hidden></button>
          </section>
        </section>

      </div>`;
    refs.windows.desktop.appendChild(win);
    windowManager.registerWindow(win);
    const field = (name) => win.querySelector(`[data-stat-role="${name}"]`);
    const state = { data: null, webData: null, cloudData: null, loading: false, error: false,
      webPending: false, cloudPending: false, controller: null, request: 0, chartSelection: null };
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
    const diagnostics = document.createElement("optgroup");
    options(diagnostics, DIAGNOSTICS);
    field("metric").appendChild(diagnostics);
    options(field("style"), [["columns", "Columns"], ["line", "Line"]]);
    field("style").value = "line";
    options(field("dimension"), DIMENSIONS);
    options(field("measure"), [["sessions", "Sessions"], ["events", "Events"]]);
    options(field("limit"), [["10", "Top 10"], ["20", "Top 20"], ["all", "All"]]);
    options(field("segment-dimension"), SEGMENT_DIMENSIONS);
    options(field("segment-minimum"), [1, 5, 10, 25, 50].map(value => [value, String(value)]));
    options(field("segment-sort"), [["sessions", "Sessions"], ...SEGMENT_METRICS]);
    field("window").value = "7d";
    const locale = () => scope.WebMarsI18n?.getLanguage?.() || document.documentElement.lang || "en";
    const number = (value) => new Intl.NumberFormat(locale()).format(Number(value) || 0);
    const count = (value) => value == null ? "—" : number(value);
    const percent = (value) => value == null ? "—" : new Intl.NumberFormat(locale(),
      { style: "percent", maximumFractionDigits: 1 }).format(value);
    const duration = (seconds) => {
      const value = Math.max(0, Math.round(Number(seconds) || 0));
      if (value < 60) return `${number(value)} s`;
      if (value < 3600) return `${number(Math.floor(value / 60))} min ${number(value % 60)} s`;
      return `${number(Math.floor(value / 3600))} h ${number(Math.floor(value % 3600 / 60))} min`;
    };
    const durationOrDash = (seconds) => seconds == null ? "—" : duration(seconds);
    const operationDuration = (milliseconds) => {
      if (milliseconds == null) return "—";
      const seconds = milliseconds >= 1000;
      return new Intl.NumberFormat(locale(), { style: "unit", unit: seconds ? "second" : "millisecond", maximumFractionDigits: 1 })
        .format(seconds ? milliseconds / 1000 : milliseconds);
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

    function renderChart(items, style, metricLabel, chartKey, emptyMessage) {
      const target = field("trend-chart");
      target.replaceChildren();
      target.setAttribute("aria-label", items.length ? metricLabel : `${metricLabel} · ${emptyMessage}`);
      target.setAttribute("tabindex", items.length ? "0" : "-1");
      target.onkeydown = null;
      target.onpointermove = null;
      target.onpointerdown = null;
      field("chart-help").textContent = "";
      const canvasWidth = Math.max(160, target.clientWidth || 760);
      const canvasHeight = target.clientHeight || 210;
      target.setAttribute("viewBox", `0 0 ${canvasWidth} ${canvasHeight}`);
      const left = 46, top = 18, width = canvasWidth - 58, height = canvasHeight - 54;
      const maximum = Math.max(1, ...items.map((item) => item.value));
      const tickCount = Math.min(4, Math.ceil(maximum));
      for (let tick = 0; tick <= tickCount; tick += 1) {
        const y = top + height - tick * height / tickCount;
        target.appendChild(svg("line", { x1: left, x2: left + width, y1: y, y2: y, class: "usage-stats-grid" }));
        if (items.length) {
          const label = svg("text", { x: left - 7, y: y + 4, "text-anchor": "end", class: "usage-stats-axis-label" });
          label.textContent = new Intl.NumberFormat(locale(), { notation: "compact" })
            .format(Math.round(maximum * tick / tickCount));
          target.appendChild(label);
        }
      }
      if (!items.length) {
        const empty = svg("text", { x: canvasWidth / 2, y: 105, "text-anchor": "middle", class: "usage-stats-axis-label" });
        empty.textContent = emptyMessage;
        target.appendChild(empty);
        return;
      }
      const stride = width / items.length;
      const pointX = index => left + (index + 0.5) * stride;
      const pointY = item => top + height * (1 - item.value / maximum);
      items.forEach((item, index) => {
        const x = pointX(index);
        const y = pointY(item);
        if (style === "columns") {
          const barWidth = stride * 0.8;
          const bar = svg("rect", { x: x - barWidth / 2, y,
            width: barWidth, height: Math.max(0, top + height - y),
            class: item.partial ? "usage-stats-bar usage-stats-partial" : "usage-stats-bar" });
          target.appendChild(bar);
        }
      });
      // Measure the localized labels instead of truncating dates or assuming a
      // fixed character width. Reserve space for both ends of the time axis.
      const ticks = items.map((item, index) => {
        const x = left + (index + 0.5) * stride;
        const label = svg("text", { x, y: top + height + 20, "text-anchor": "middle", class: "usage-stats-axis-label" });
        label.textContent = item.partial ? `${item.axisLabel}*` : item.axisLabel;
        target.appendChild(label);
        const half = label.getComputedTextLength() / 2;
        const center = Math.max(half + 4, Math.min(canvasWidth - half - 4, x));
        label.setAttribute("x", center);
        return { x, label, start: center - half, end: center + half };
      });
      const last = ticks.at(-1);
      let edge = -Infinity;
      ticks.forEach((tick, index) => {
        const first = index === 0;
        if ((first && last !== tick && tick.end + 10 > last.start)
            || (!first && tick !== last && (tick.start < edge + 28 || tick.end + 28 > last.start))) {
          tick.label.remove();
          return;
        }
        target.insertBefore(svg("line", { x1: tick.x, x2: tick.x, y1: top + height,
          y2: top + height + 5, class: "usage-stats-grid" }), tick.label);
        edge = tick.end;
      });
      if (style === "line") {
        const points = items.map((item, index) => `${pointX(index)},${pointY(item)}`).join(" ");
        target.appendChild(svg("polyline", { points, class: "usage-stats-line" }));
      }
      const guide = svg("line", { y1: top, y2: top + height, class: "usage-stats-chart-cursor" });
      const dot = svg("circle", { r: 4, class: "usage-stats-chart-cursor" });
      target.append(guide, dot);
      let activeIndex = -1;
      const inspect = index => {
        const next = Math.min(items.length - 1, Math.max(0, index));
        if (next === activeIndex) return;
        activeIndex = next;
        const item = items[next];
        state.chartSelection = { chartKey, from: item.from };
        const x = pointX(next);
        guide.setAttribute("x1", x);
        guide.setAttribute("x2", x);
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", pointY(item));
        field("chart-help").textContent = `${item.label} · ${metricLabel} · ${item.display}`;
      };
      const inspectPointer = event => {
        const bounds = target.getBoundingClientRect();
        if (bounds.width) inspect(Math.floor(((event.clientX - bounds.left) * canvasWidth / bounds.width - left) / stride));
      };
      target.onpointerdown = inspectPointer;
      target.onpointermove = event => { if (event.pointerType !== "touch") inspectPointer(event); };
      target.onkeydown = event => {
        const offsets = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: items.length - 1 };
        if (!Object.hasOwn(offsets, event.key)) return;
        event.preventDefault();
        inspect(offsets[event.key]);
      };
      const selected = state.chartSelection?.chartKey === chartKey
        ? items.findIndex(item => item.from === state.chartSelection.from) : -1;
      inspect(selected < 0 ? items.length - 1 : selected);
    }

    function renderTable(target, columns, rows) {
      const table = el("table", "usage-stats-table");
      const header = el("tr");
      for (const title of columns) {
        const cell = el("th", "", title);
        cell.scope = "col";
        header.appendChild(cell);
      }
      const thead = el("thead");
      thead.appendChild(header);
      const body = el("tbody");
      for (const [label, ...values] of rows) {
        const row = el("tr");
        const cell = el("th", "", label);
        cell.scope = "row";
        row.append(cell, ...values.map(value => el("td", "", value)));
        body.appendChild(row);
      }
      table.append(thead, body);
      target.replaceChildren(table);
    }

    function buildRows(data) {
      const rows = data?.breakdowns?.build || [];
      const buildValue = (key) => /^(?:\d{12}|\d{6}\.\d{2}\.\d{4})$/.test(key)
        ? Number(key.replaceAll(".", ""))
        : 0;
      return [...rows].sort((a, b) => buildValue(b.key) - buildValue(a.key));
    }

    function renderBuilds(data) {
      const rows = buildRows(data);
      field("builds-empty").hidden = !data || rows.length > 0;
      field("builds-table").hidden = rows.length === 0;
      field("builds-rows").replaceChildren(...rows.map(({ key, sessions, events }) => {
        const row = el("tr");
        const build = el("th", "", key === "unknown" ? "—" : key);
        build.scope = "row";
        row.append(build, el("td", "", number(sessions)), el("td", "", events == null ? "—" : number(events)));
        return row;
      }));
    }

    function renderRanking(target, items, title, sessionTotal) {
      target.setAttribute("aria-label", title);
      const maximum = sessionTotal || Math.max(1, ...items.map(item => item.value));
      target.replaceChildren(...items.map(item => {
        const row = el("li", "usage-stats-ranking-row");
        const label = item.open ? el("button", "usage-stats-rank-link", item.label) : el("span", "", item.label);
        if (item.open) {
          label.type = "button";
          label.addEventListener("click", item.open);
        }
        const bar = el("progress");
        bar.max = maximum;
        bar.value = item.value;
        bar.setAttribute("aria-hidden", "true");
        row.append(label, el("strong", "", item.display), bar);
        return row;
      }));
      if (!items.length) target.append(el("li", "usage-stats-note", translate("No data for these filters.")));
    }

    function metricValue(bucket, metric) {
      if (SESSION_METRICS.has(metric)) return bucket[metric] ?? null;
      return bucket[metric] ?? bucket.event_counts?.[metric] ?? 0;
    }

    const primaryCards = PRIMARY_METRICS.map(([metric]) => {
      const card = el("button", "usage-stats-kpi usage-stats-kpi-button");
      card.type = "button";
      card.setAttribute("aria-controls", "usage-stats-trend");
      card.addEventListener("click", () => {
        field("metric").value = metric;
        renderPrimaryCards(state.data);
        renderTimeline(state.data);
      });
      field("kpis-primary").appendChild(card);
      return card;
    });

    function renderPrimaryCards(data) {
      const totals = data?.totals;
      const comparison = data?.comparison;
      const buckets = data ? timelineRows(data) : [];
      PRIMARY_METRICS.forEach(([metric, label], index) => {
        const card = primaryCards[index];
        const value = totals?.[metric];
        const series = buckets.map(bucket => metricValue(bucket, metric));
        const hasSeries = series.length > 0 && series.every(value => value != null);
        card.disabled = !hasSeries;
        card.setAttribute("aria-pressed", String(field("metric").value === metric));
        card.replaceChildren(el("span", "", translate(label)), el("strong", "", count(value)));
        if (metric !== "sessions" && value != null && totals?.sessions > 0) {
          card.append(el("small", "", `${count(value)} / ${count(totals.sessions)} · ${percent(value / totals.sessions)}`));
        }
        const previous = comparison?.[metric];
        if (value != null && previous != null && comparison.complete) {
          const change = previous ? value / previous - 1 : null;
          card.append(el("small", "", [translate("Previous period"), count(previous),
            ...(change === null ? [] : [`${change > 0 ? "+" : ""}${percent(change)}`])].join(" · ")));
        }
        if (hasSeries) {
          const spark = svg("svg", { class: "usage-stats-sparkline", viewBox: "0 0 160 30", preserveAspectRatio: "none", "aria-hidden": "true" });
          const peak = Math.max(1, ...series);
          const y = value => 28 - 26 * value / peak;
          if (series.length === 1) spark.appendChild(svg("circle", { cx: 80, cy: y(series[0]), r: 2, class: "usage-stats-point" }));
          else spark.appendChild(svg("polyline", { class: "usage-stats-sparkline-path",
            points: series.map((value, i) => `${160 * i / (series.length - 1)},${y(value)}`).join(" ") }));
          card.append(spark);
        }
      });
    }

    function renderWorkflow(data) {
      field("workflow-panel").hidden = !data;
      if (!data) return;
      renderTable(field("workflow"), ["Action", "Sessions", "Sessions with errors only", "OK", "Error", "Success rate"].map(key => translate(key)),
        workflowRows(data).map(row => [translate(row.label), count(row.sessions), count(row.errorOnlySessions),
          count(row.successes), count(row.errors), percent(row.successRate)]));
    }

    function dateTime(value, timeZone) {
      const date = new Date(value);
      if (!Number.isFinite(+date)) return "";
      return new Intl.DateTimeFormat(locale(), { dateStyle: "short", timeStyle: "short", timeZone }).format(date);
    }

    function renderSources() {
      const web = state.webData;
      const cloud = state.cloudData;
      field("cloud-24h").hidden = !(EXTENDED_WINDOWS.has(field("window").value) && CLOUD_AUDIENCES.has(field("audience").value));
      const timeZone = state.data?.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const renderPeriod = (target, from, through) => {
        const start = from == null ? "" : dateTime(from, timeZone);
        const end = through == null ? "…" : dateTime(through, timeZone);
        target.hidden = !start;
        target.textContent = start ? `${translate("Period")} · ${start} – ${end} · ${timeZone}` : "";
      };
      renderPeriod(field("cloud-period"), cloud?.from == null ? null : cloud.from * 1000,
        cloud?.through == null ? null : cloud.through * 1000);
      renderPeriod(field("web-period"), web?.from, web?.through);
      const trafficRows = (counts) => Object.entries(counts || {})
        .sort(([, a], [, b]) => b - a)
        .map(([key, quantity]) => [audienceLabel(key), count(quantity)]);
      if (state.data) {
        renderTable(field("population"), [translate("All traffic"), translate("Sessions")],
          trafficRows(state.data.classification?.sessions_by_class));
      } else {
        field("population").replaceChildren();
      }
      if (web) {
        renderTable(field("web-summary"), [translate("Traffic classification"), translate("Web visits")],
          trafficRows(web.web_visits_by_class));
      } else {
        field("web-summary").textContent = translate(state.webPending ? "Loading..." : "Statistics are unavailable on this installation.");
      }
      if (cloud) {
        const rows = [[translate("Active Cloud accounts"), count(cloud.active_accounts)]];
        for (const row of cloud.events || []) {
          const method = { google: "Google", facebook: "Facebook", password: translate("Password"),
            session: translate("Authenticated session") }[row.method] || row.method;
          rows.push([`${translate(EVENT_LABELS[row.event] || row.event)} · ${method}`, count(row.count)]);
        }
        renderTable(field("cloud-activity"), [translate("Measure"), translate("Value")], rows);
      } else {
        field("cloud-activity").textContent = translate(state.cloudPending ? "Loading..." : "Cloud activity is unavailable for this filter or installation.");
      }
    }

    function renderTimeline(data) {
      const selectedMetric = field("metric").value;
      const metricLabel = translate(EVENT_LABELS[selectedMetric] || selectedMetric);
      const timeZone = data?.time_zone || (DAILY_WINDOWS.has(data?.window) ? "UTC" : Intl.DateTimeFormat().resolvedOptions().timeZone);
      field("axis-zone").textContent = data ? timeZone : "";
      const dateFormat = new Intl.DateTimeFormat(locale(), { day: "2-digit", month: "2-digit", timeZone });
      const clock = new Intl.DateTimeFormat(locale(), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone });
      const rangeOptions = { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        hourCycle: "h23", timeZoneName: "shortOffset", timeZone };
      const range = new Intl.DateTimeFormat(locale(), rangeOptions);
      const partialRange = new Intl.DateTimeFormat(locale(), { ...rangeOptions, second: "2-digit" });
      const timed = (data ? timelineRows(data) : []).flatMap(bucket => {
        const value = metricValue(bucket, selectedMetric);
        if (value == null) return [];
        const from = new Date(bucket.from);
        const observedFrom = new Date(bucket.observedFrom);
        const through = new Date(bucket.through || bucket.until);
        const format = bucket.partial ? partialRange : range;
        const label = `${format.format(observedFrom)} – ${format.format(through)}${bucket.partial ? ` · ${translate("Partial interval")}` : ""}`;
        return [{ from: bucket.from, label, partial: bucket.partial, axisLabel: DAILY_WINDOWS.has(data.window) ? dateFormat.format(from) : clock.format(from),
          value, display: selectedMetric.endsWith("_seconds") ? duration(value) : number(value) }];
      });
      renderChart(timed, field("style").value, metricLabel, `${data?.window}/${data?.audience}/${selectedMetric}`,
        data ? translate("No data for these filters.") : "");
      const coverage = [];
      if (data?.quality?.collected_from) {
        coverage.push(`${translate("Collected since")} · ${dateTime(data.quality.collected_from, timeZone)}`);
      }
      if (timed.some(bucket => bucket.partial)) coverage.push(`* ${translate("Partial interval")}`);
      field("coverage").hidden = !coverage.length;
      field("coverage").textContent = coverage.join(" · ");
      if (timed.length) {
        renderTable(field("trend-table"), [translate("Interval"), metricLabel], timed.map(item => [item.label, item.display]));
      } else {
        field("trend-table").textContent = data ? translate("No data for these filters.") : "";
      }
    }

    function resourceLabel(entry) {
      if (entry.kind === "tool_open") return translate(getTools().find(tool => tool.id === entry.key)?.label || entry.key);
      if (entry.key === "cloud_save") return `${translate("Save Project")} (${translate("Cloud")})`;
      const feature = { step: "Step", backstep: "Backstep", run: "Run", compile: "Compile", assemble: "Assemble",
        reset: "Reset", pause: "Pause", breakpoint: "Breakpoint", input_wait: "Waiting for input", project_save: "Save Project",
        project_import: "Import project", project_manager: "Project Manager",
        cloud_load: "Open Cloud Project...", help: "Help", teacher_kit: "Teacher Kit" }[entry.key];
      if (feature || entry.key === "other") return translate(feature || "Other");
      return String(entry.key || "").replaceAll(/[-_]/g, " ");
    }

    function categoryLabel(dimension, key) {
      if (dimension === "audience") return audienceLabel(key);
      if (dimension === "build" && key === "unknown") return "—";
      if (dimension === "language" && /^[a-z]{2}$/.test(key)) return new Intl.DisplayNames(locale(), { type: "language" }).of(key);
      return translate(BREAKDOWN_LABELS[dimension]?.[key] || (key === "other" ? "Other" : key));
    }

    const rate = (value, total) => total > 0 && value != null ? value / total : null;
    const rateDisplay = (value, total) => total > 0 ? `${count(value)} · ${percent(rate(value, total))}` : count(value);

    function renderRecovery(stages) {
      const target = field("analysis-stages");
      target.replaceChildren(...STAGES.flatMap(([stage, label]) => {
        const row = stages.find(result => result.stage === stage);
        if (!row) return [];
        const panel = el("section", "usage-stats-stage");
        const values = el("dl");
        const metrics = [["Sessions", count(row.sessions)],
          ...RECOVERY_METRICS.map(([key, metric]) => [metric, rateDisplay(row[key], row.sessions)]),
          ["Median time to recovery", durationOrDash(row.median_recovery_seconds)],
          ["P90 time to recovery", durationOrDash(row.p90_recovery_seconds)]];
        for (const [metric, display] of metrics) values.append(el("dt", "", translate(metric)), el("dd", "", display));
        panel.append(el("h4", "", translate(label)), values);
        return [panel];
      }));
    }

    function segmentView(data) {
      const dimension = field("segment-dimension").value;
      const minimum = Number(field("segment-minimum").value);
      const sort = field("segment-sort").value;
      const rows = segmentRows(data?.analysis, dimension, minimum, sort);
      const first = rows.find(row => row.key === field("segment-first").value);
      const second = rows.find(row => row.key === field("segment-second").value);
      return { dimension, minimum, sort, rows, first, second };
    }

    function setSegmentChoices(rows) {
      const dimension = field("segment-dimension").value;
      const bySize = [...rows].sort((a, b) => b.sessions - a.sessions || a.key.localeCompare(b.key));
      const first = field("segment-first");
      const second = field("segment-second");
      const firstKey = bySize.find(row => row.key === first.value)?.key ?? bySize[0]?.key;
      const secondOptions = bySize.filter(row => row.key !== firstKey);
      const secondKey = secondOptions.find(row => row.key === second.value)?.key ?? secondOptions[0]?.key;
      for (const [select, choices, selected] of [[first, bySize, firstKey], [second, secondOptions, secondKey]]) {
        select.replaceChildren(...choices.map(row => {
          const option = el("option", "", categoryLabel(dimension, row.key));
          option.value = row.key;
          return option;
        }));
        if (selected != null) select.value = selected;
        select.disabled = bySize.length < 2;
      }
    }

    function segmentDelta(first, second, metric) {
      return (rate(second[metric], second.sessions) - rate(first[metric], first.sessions)) * 100;
    }

    function renderSegments(data) {
      setSegmentChoices(segmentView(data).rows);
      const { dimension, rows, first, second } = segmentView(data);
      field("segment-build-note").hidden = dimension !== "build";
      const comparison = field("segment-comparison");
      comparison.hidden = !first || !second;
      if (first && second) {
        const deltaFormat = new Intl.NumberFormat(locale(), { signDisplay: "exceptZero", maximumFractionDigits: 1 });
        renderTable(comparison, [translate("Measure"), categoryLabel(dimension, first.key), categoryLabel(dimension, second.key),
          `${translate("Difference (pp)")} · ${translate("Second segment")} − ${translate("First segment")}`], [
          [translate("Sessions"), count(first.sessions), count(second.sessions), "—"],
          ...SEGMENT_METRICS.map(([key, label]) => [translate(label), rateDisplay(first[key], first.sessions),
            rateDisplay(second[key], second.sessions), deltaFormat.format(segmentDelta(first, second, key))])
        ]);
      } else comparison.replaceChildren();
      const list = field("segment-list");
      if (rows.length) {
        const dimensionLabel = SEGMENT_DIMENSIONS.find(([key]) => key === dimension)[1];
        renderTable(list, [translate(dimensionLabel), translate("Sessions"), ...SEGMENT_METRICS.map(([, label]) => translate(label))],
          rows.map(row => [categoryLabel(dimension, row.key), count(row.sessions),
            ...SEGMENT_METRICS.map(([key]) => rateDisplay(row[key], row.sessions))]));
      } else list.textContent = translate("No data for these filters.");
    }

    function renderAnalysis(data) {
      const ready = Array.isArray(data?.analysis?.stages) && data.analysis.segments;
      const status = field("analysis-status");
      status.hidden = Boolean(ready);
      status.textContent = ready ? "" : translate(state.loading ? "Loading..." : data
        ? "Analysis requires the updated collector." : "Statistics are unavailable on this installation.");
      field("analysis-content").hidden = !ready;
      if (!ready) return;
      const selected = field("segment-dimension");
      for (const option of selected.options) option.disabled = !Array.isArray(data.analysis.segments[option.value]);
      if (selected.selectedOptions[0]?.disabled) {
        const available = [...selected.options].find(option => !option.disabled);
        if (available) selected.value = available.value;
      }
      renderRecovery(data.analysis.stages);
      renderSegments(data);
    }

    function analysisCsvRows(data) {
      if (!Array.isArray(data.analysis?.stages) || !data.analysis.segments) return [];
      const { dimension, minimum, sort, rows, first, second } = segmentView(data);
      return [
        ["analysis_stage", "sessions", "first_success", "recovered", "error_only", "median_recovery_seconds", "p90_recovery_seconds"],
        ...data.analysis.stages.map(row => [row.stage, row.sessions, row.first_success, row.recovered, row.error_only,
          row.median_recovery_seconds, row.p90_recovery_seconds]),
        ["segment_dimension", dimension, "minimum_sessions", minimum, "sort", sort, "first_segment", first?.key, "second_segment", second?.key],
        ["segment", "sessions", "interacting_sessions", "interaction_rate", "successful_sessions", "success_rate"],
        ...rows.map(row => [row.key, row.sessions, row.interacting_sessions, rate(row.interacting_sessions, row.sessions),
          row.successful_sessions, rate(row.successful_sessions, row.sessions)]),
        ...(first && second ? [["segment_metric", "difference_pp"],
          ...SEGMENT_METRICS.map(([key]) => [key, segmentDelta(first, second, key)])] : [])
      ];
    }

    function collectorDiagnostics(data) {
      return COLLECTOR_DIAGNOSTICS.flatMap(([key, title, labels, note]) => {
        const rows = data?.analysis?.[key];
        return Array.isArray(rows) ? [{ key, title, labels, note, rows }] : [];
      });
    }

    function diagnosticLabel(group, key) {
      if (group.key === "window_time") {
        return key.startsWith("tool_") ? resourceLabel({ kind: "tool_open", key: key.slice(5) })
          : translate(WINDOW_LABELS[key] || key);
      }
      if (group.key === "operation_time" || group.key === "operation_errors") {
        const separator = key.indexOf("_");
        const stage = STAGES.find(([id]) => id === key.slice(0, separator))?.[1];
        const detail = key.slice(separator + 1);
        const label = group.key === "operation_time" ? (detail === "ok" ? "OK" : "Error") : ERROR_DETAILS[detail];
        return stage && label ? `${translate(stage)} · ${translate(label)}` : key;
      }
      return translate(group.labels[key] || key);
    }

    function diagnosticTable(group) {
      const label = row => diagnosticLabel(group, row.key);
      if (group.key === "window_time") {
        return [["Measure", "Sessions", "Visible time"], group.rows.map(row => [label(row), count(row.sessions), durationOrDash(row.seconds)])];
      }
      if (group.key === "operation_time") {
        return [["Action", "Events", "Median", "P90", "Maximum"], group.rows.map(row => [label(row), count(row.events),
          operationDuration(row.median_ms), operationDuration(row.p90_ms), operationDuration(row.max_ms)])];
      }
      return [["Measure", "Sessions", "Events"], group.rows.map(row => [label(row), count(row.sessions), count(row.events)])];
    }

    function renderCollectorDiagnostics(data) {
      const groups = collectorDiagnostics(data);
      const target = field("diagnostic-groups");
      field("diagnostic-status").textContent = translate(groups.length ? "New categories cover events from the updated app."
        : state.loading ? "Loading..." : data ? "Analysis requires the updated collector." : "Statistics are unavailable on this installation.");
      target.hidden = !groups.length;
      target.replaceChildren(...groups.map(group => {
        const { title, note } = group;
        const panel = el("section", "usage-stats-panel");
        panel.dataset.diagnosticGroup = group.key;
        const table = el("div", "usage-stats-table-wrap");
        const [columns, rows] = diagnosticTable(group);
        if (rows.length) renderTable(table, columns.map(key => translate(key)), rows);
        else table.textContent = translate("No data for these filters.");
        panel.append(el("h3", "", translate(title)));
        if (note) panel.append(el("p", "usage-stats-note", translate(note)));
        panel.append(table);
        return panel;
      }));
    }

    function overviewRankings(data) {
      return OVERVIEW_RANKINGS.map(([dimension, label, kind]) => {
        const entries = (data?.breakdowns?.[dimension] || [])
          .filter(entry => !kind || entry.kind === kind)
          .sort((a, b) => b.sessions - a.sessions).slice(0, 5);
        const items = entries.map(entry => ({ key: entry.key, label: kind ? resourceLabel(entry) : categoryLabel(dimension, entry.key),
          value: entry.sessions, display: count(entry.sessions) }));
        return { dimension, label, kind, items };
      }).filter(group => group.items.length);
    }

    function renderOverviewRankings(data) {
      const target = field("overview-rankings");
      const groups = overviewRankings(data);
      target.hidden = !groups.length;
      target.replaceChildren(...groups.map(({ dimension, label, kind, items }) => {
        const panel = el("section", "usage-stats-panel");
        const title = translate(label);
        const list = el("ul", "usage-stats-ranking");
        renderRanking(list, items.map(item => ({ ...item, open: () => {
          field("dimension").value = dimension;
          field("measure").value = "sessions";
          const prefix = kind ? `${translate({ tool_open: "Tool", feature_use: "Feature", example_open: "Example" }[kind])} · ` : "";
          field("filter").value = `${prefix}${item.label}`;
          const tab = win.querySelector('[data-stat-tab="resources"]');
          selectTab(tab);
          field("filter").focus();
        } })), `${title} · ${translate("Sessions")}`, data.totals.sessions);
        panel.append(el("h3", "", title), list);
        return panel;
      }));
    }

    function breakdownItems(data) {
      const dimension = field("dimension").value;
      const supportsEvents = ["events", "resources", "auth"].includes(dimension);
      field("measure").disabled = !supportsEvents;
      if (!supportsEvents) field("measure").value = "sessions";
      const measure = field("measure").value;
      const filter = field("filter").value.trim().toLocaleLowerCase(locale());
      const entries = (data?.breakdowns?.[dimension === "auth" ? "resources" : dimension] || [])
        .filter(entry => dimension === "resources" ? RESOURCE_KINDS.has(entry.kind)
          : dimension !== "auth" || !RESOURCE_KINDS.has(entry.kind));
      const matches = entries.map((entry) => ({ ...entry,
        label: dimension === "events"
          ? translate(EVENT_LABELS[entry.key] || entry.key)
          : dimension === "resources"
            ? `${translate({ tool_open: "Tool", feature_use: "Feature", example_open: "Example" }[entry.kind])} · ${resourceLabel(entry)}`
            : dimension === "auth"
              ? `${translate(EVENT_LABELS[entry.kind] || entry.kind)} · ${{ google: "Google", facebook: "Facebook", password: translate("Password") }[entry.key] || entry.key}`
              : categoryLabel(dimension, String(entry.key || "")) }))
        .filter((entry) => entry.label.toLocaleLowerCase(locale()).includes(filter))
        .sort((a, b) => (Number(b[measure]) || 0) - (Number(a[measure]) || 0));
      const limit = field("limit").value === "all" ? matches.length : Number(field("limit").value);
      return matches.slice(0, limit).map(entry => ({ key: entry.key, kind: entry.kind, label: entry.label,
        value: entry[measure] ?? 0, display: count(entry[measure]) }));
    }

    function render() {
      const data = state.data;
      field("status").textContent = state.loading ? translate("Loading...") : state.error
        ? translate("Statistics are unavailable on this installation.") : data
          ? `${translate("Updated")} · ${dateTime(data.through, data.time_zone)}` : "";
      field("export").disabled = state.loading || !data;
      renderPrimaryCards(data);
      renderWorkflow(data);
      renderTimeline(data);
      renderAnalysis(data);
      renderCollectorDiagnostics(data);
      renderOverviewRankings(data);
      renderBuilds(data);
      renderSources();
      const dimension = field("dimension").value;
      const dimensionLabel = translate(DIMENSIONS.find(([key]) => key === dimension)?.[1] || dimension);
      if (data) renderRanking(field("breakdown-chart"), breakdownItems(data), dimensionLabel);
      else field("breakdown-chart").replaceChildren();
      if (!data) {
        field("kpis-details").replaceChildren();
        return;
      }
      const totals = data.totals;
      const diagnostics = [
        ["New sessions", count(totals.new_sessions)],
        ["Ready sessions", count(totals.ready_sessions)],
        ["Ready with successful run", count(totals.ready_with_successful_run)],
        ["Events received", count(totals.events)], ["Interaction time", durationOrDash(totals.interaction_seconds)],
        ["Visible presence", durationOrDash(totals.presence_seconds)],
        ["Present in last 5 minutes", count(totals.recent_presence_sessions)],
        ["Median interaction", durationOrDash(totals.interaction_distribution?.median_seconds)],
        ["P90 interaction", durationOrDash(totals.interaction_distribution?.p90_seconds)],
        ["Median visible presence", durationOrDash(totals.presence_distribution?.median_seconds)],
        ["P90 visible presence", durationOrDash(totals.presence_distribution?.p90_seconds)]
      ];
      renderTable(field("kpis-details"), [translate("Measure"), translate("Value")],
        diagnostics.map(([label, display]) => [translate(label), display]));
    }

    const requestOptions = (signal, timeout) => ({ credentials: "omit", cache: "no-store", redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeout)]) });

    async function loadWeb(endpoint, signal, request) {
      const url = new URL(endpoint);
      url.searchParams.delete("audience");
      url.searchParams.set("part", "web");
      try {
        for (let attempt = 0; attempt < 10 && !signal.aborted; attempt += 1) {
          const response = await scope.fetch(url.href, requestOptions(signal, 5000));
          if (response.status === 202) {
            await new Promise(resolve => scope.setTimeout(resolve, 2500));
            continue;
          }
          if (!response.ok) return;
          const result = await response.json();
          if (request === state.request && result?.web_visits_by_class) state.webData = result;
          return;
        }
      } catch { /* Web diagnostics are optional. */ }
      finally {
        if (request === state.request) {
          state.webPending = false;
          renderSources();
        }
      }
    }

    async function loadCloud(period, context, signal, request) {
      try {
        const api = new URL(scope.WebMarsConfig?.backMarsApiBase || "/api", scope.location.origin);
        if (api.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(api.hostname)) return;
        api.pathname = `${api.pathname.replace(/\/$/, "")}/statistics`;
        api.searchParams.set("window", period);
        api.searchParams.set("context", context);
        const response = await scope.fetch(api.href, requestOptions(signal, 3000));
        if (!response.ok) return;
        const data = await response.json();
        if (request === state.request && data.context === context && Array.isArray(data.events)) state.cloudData = data;
      } catch { /* The static simulator also runs without BackMars. */ }
      finally {
        if (request === state.request) {
          state.cloudPending = false;
          renderSources();
        }
      }
    }

    async function load() {
      const period = field("window").value;
      const audience = field("audience").value;
      const request = ++state.request;
      state.controller?.abort();
      state.controller = new AbortController();
      const signal = state.controller.signal;
      if (state.data?.window !== period || state.data?.audience !== audience) state.data = null;
      state.cloudData = null;
      state.webData = null;
      state.loading = true;
      state.error = false;
      state.webPending = false;
      state.cloudPending = !EXTENDED_WINDOWS.has(period) && CLOUD_AUDIENCES.has(audience);
      if (state.cloudPending) void loadCloud(period, audience, signal, request);
      try {
        const configured = scope.WebMarsConfig?.metrics?.publicEndpoint;
        const endpoint = new URL(configured || "/_metrics/public", scope.location.origin);
        if (endpoint.origin !== scope.location.origin) throw new Error("Invalid statistics URL");
        endpoint.searchParams.set("window", period);
        endpoint.searchParams.set("audience", audience);
        endpoint.searchParams.set("part", "app");
        state.webPending = true;
        render();
        void loadWeb(endpoint, signal, request);
        const response = await scope.fetch(endpoint.href, requestOptions(signal, 15000));
        if (request !== state.request) return;
        if (response.status === 400 && EXTENDED_WINDOWS.has(period)) {
          for (const option of field("window").options) option.disabled = EXTENDED_WINDOWS.has(option.value);
          field("window").value = "24h";
          void load();
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (request !== state.request) return;
        if (data.window !== period || data.audience !== audience || !Array.isArray(data.timeline)
            || !data.totals || !data.breakdowns || !Number.isFinite(Date.parse(data.through))) {
          throw new Error("Invalid statistics response");
        }
        state.data = data;
      } catch {
        if (request === state.request) {
          state.data = null;
          state.error = true;
        }
      } finally {
        if (request === state.request) {
          state.loading = false;
          render();
        }
      }
    }

    const usage = scope.WebMarsUsage;
    const internal = field("internal");
    field("internal-label").hidden = !usage?.setContext;
    const syncInternal = () => {
      const context = usage?.getContext?.();
      internal.checked = context === "internal";
      internal.disabled = context === "test";
    };
    internal.addEventListener("change", () => {
      usage?.setContext(internal.checked ? "internal" : "public");
      syncInternal();
      void load();
    });

    function refreshTranslations() {
      win.querySelectorAll("[data-stat-label]").forEach((node) => {
        const key = node.dataset.statLabel;
        if (key) node.textContent = translate(key);
      });
      diagnostics.label = translate("Diagnostics");
      render();
    }
    field("window").addEventListener("change", () => { void load(); });
    field("audience").addEventListener("change", () => { void load(); });
    field("cloud-24h").addEventListener("click", () => {
      field("window").value = "24h";
      field("window").focus();
      void load();
    });
    for (const name of ["metric", "style", "dimension", "measure", "limit"]) {
      field(name).addEventListener("change", render);
    }
    field("filter").addEventListener("input", render);
    for (const name of ["segment-dimension", "segment-minimum", "segment-first", "segment-second", "segment-sort"]) {
      field(name).addEventListener("change", () => renderSegments(state.data));
    }
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
      if (!state.data || state.loading) return;
      const data = state.data;
      const metric = field("metric").value;
      const breakdown = breakdownItems(data);
      const cloud = state.cloudData;
      const web = state.webData;
      const diagnosticGroups = collectorDiagnostics(data);
      const filter = field("filter").value.trim();
      const csvFilter = /^[=+@-]/.test(filter) ? `'${filter}` : filter;
      const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
      const rows = [["window", data.window, "audience", data.audience], ["from", data.from, "through", data.through],
        ["time_zone", data.time_zone, "collected_from", data.quality?.collected_from],
        ["previous_from", data.comparison?.from, "previous_through", data.comparison?.through,
          "previous_complete", data.comparison?.complete, "previous_sessions", data.comparison?.sessions],
        ["metric", "value"], ...Object.entries(data.totals).filter(([, value]) => typeof value === "number"),
        ["stage", "sessions", "error_only_sessions", "successes", "errors", "success_rate"],
        ...workflowRows(data).map(row => [row.stage, row.sessions, row.errorOnlySessions, row.successes, row.errors, row.successRate]),
        ...analysisCsvRows(data),
        ...(diagnosticGroups.length ? [["diagnostic_group", "key", "sessions", "events", "seconds", "median_ms", "p90_ms", "max_ms"],
          ...diagnosticGroups.flatMap(({ key, rows }) => rows.map(row => [key, row.key, row.sessions, row.events,
            row.seconds, row.median_ms, row.p90_ms, row.max_ms]))] : []),
        ["interval", "sessions", "events", "interaction_seconds", "presence_seconds", "observed_from", "through", "until", "partial",
          "interacting_sessions", "successful_sessions", "returning_sessions", "selected_metric", "selected_value"],
        ...timelineRows(data).map(bucket => [bucket.from, bucket.sessions, bucket.events, bucket.interaction_seconds, bucket.presence_seconds,
          bucket.observedFrom, bucket.through, bucket.until, bucket.partial, bucket.interacting_sessions, bucket.successful_sessions,
          bucket.returning_sessions, metric, metricValue(bucket, metric)]),
        ["overview_dimension", "kind", "key", "sessions"], ...overviewRankings(data).flatMap(group =>
          group.items.map(item => [group.dimension, group.kind, item.key, item.value])),
        ["breakdown", field("dimension").value, "measure", field("measure").value, "filter", csvFilter, "limit", field("limit").value],
        ["key", "kind", "label", "value"], ...breakdown.map(entry => [entry.key, entry.kind, entry.label, entry.value]),
        ["build", "sessions", "events"], ...buildRows(data).map(row => [row.key, row.sessions, row.events]),
        ...(web ? [["web_from", web.from, "web_through", web.through], ["web_classification", "visits"],
          ...Object.entries(web.web_visits_by_class)] : []),
        ...(cloud ? [["cloud_from", cloud.from, "cloud_through", cloud.through, "cloud_context", cloud.context, "cloud_precision", cloud.precision],
          ["cloud_active_accounts", cloud.active_accounts], ["cloud_event", "method", "count"],
          ...cloud.events.map(row => [row.event, row.method, row.count])] : [])];
      const blob = new Blob(["\uFEFF" + rows.map(row => row.map(quote).join(",")).join("\r\n")], {type: "text/csv;charset=utf-8"});
      const url = URL.createObjectURL(blob), link = el("a");
      link.href = url; link.download = `webmars-${data.window}-${data.audience}.csv`; link.click();
      scope.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    win.querySelector('[data-win-action="close"]').addEventListener("click", () => {
      state.request += 1;
      state.controller?.abort();
      state.loading = false;
    });
    scope.setInterval(() => {
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
      open() { syncInternal(); windowManager.show(win.id); void load(); },
      refreshTranslations
    };
  }

  registry.usageStatistics = Object.freeze({ createUsageStatisticsWindow });
})();
