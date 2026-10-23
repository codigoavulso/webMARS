(function projectManagerModule(root) {
  "use strict";

  const LOCAL_LIBRARY_KEY = "mars45-web-project-library-v1";
  const LOCAL_PROJECT_KEY = "mars45-web-project-v1";
  const TRASH_KEY = "webmars-project-trash-v1";
  const MANAGER_ID = "window-project-manager";
  const LOCATIONS = Object.freeze([
    { id: "local", label: "On this device", icon: "▣" },
    { id: "cloud", label: "Cloud", icon: "☁" },
    { id: "public", label: "Public library", icon: "▤" },
    { id: "mine", label: "My publications", icon: "◈" },
    { id: "trash", label: "Recycle bin", icon: "♲" }
  ]);

  const t = (value, vars) => typeof root.WebMarsI18n?.t === "function"
    ? root.WebMarsI18n.t(value, vars)
    : String(value ?? "");

  function esc(value) {
    if (typeof root.escapeHtml === "function") return root.escapeHtml(String(value ?? ""));
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[ch]));
  }

  function stableId(prefix, value) {
    let hash = 2166136261;
    for (const ch of String(value || "")) {
      hash ^= ch.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `${prefix}-${(hash >>> 0).toString(36)}`;
  }

  const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

  function localRootPath(value) {
    const raw = String(value || "imported-project").trim().replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/^\/+/, "");
    return /\.p$/i.test(raw) ? raw : `${raw}.p`;
  }

  function prepareLocalCopy(source, library) {
    const roots = new Set(library.map((entry) => localRootPath(entry.rootPath || entry.name).toLowerCase()));
    const ids = new Set(library.map((entry) => String(entry.id || "")));
    const stem = localRootPath(source.rootPath || source.name).replace(/\.p$/i, "");
    let candidate = `${stem}.p`, suffix = 2;
    while (roots.has(candidate.toLowerCase())) candidate = `${stem} (${suffix++}).p`;
    const baseId = root.crypto?.randomUUID?.() || stableId("local", candidate);
    let id = baseId;
    while (ids.has(id)) id = `${baseId}-${suffix++}`;
    const copy = { ...source, id, name: candidate.replace(/\.p$/i, ""), rootPath: candidate, isOpen: false, updatedAt: Date.now() };
    delete copy.deletedAt;
    delete copy.deletedFrom;
    return copy;
  }

  function validateImportedProject(source) {
    if (!source || typeof source !== "object" || !Array.isArray(source.files)
      || !source.files.length || source.files.length > 4096
      || (source.folderPaths && (!Array.isArray(source.folderPaths) || source.folderPaths.length > 4096))) throw new Error(t("Failed to load file."));
    let total = 0;
    for (const file of source.files) {
      const path = String(file?.path || file?.name || "").replace(/\\/g, "/");
      if (!path || path.length > 1024 || path.startsWith("/") || /^[a-z]:/i.test(path)
        || path.split("/").some((part) => part === "..") || /[\x00-\x1f]/.test(path)
        || typeof file.source !== "string") throw new Error(t("Failed to load file."));
      const size = new TextEncoder().encode(file.source).length;
      total += size;
      if (size > 2 * 1024 * 1024 || total > MAX_IMPORT_BYTES) throw new Error(t("Failed to load file."));
    }
  }

  function localProject(entry, index = 0) {
    if (!entry || typeof entry !== "object") return null;
    const rootPath = String(entry.rootPath || entry.name || `project-${index + 1}`).trim() || `project-${index + 1}`;
    const files = Array.isArray(entry.files) ? entry.files : [];
    const projectId = String(entry.id || stableId("local", rootPath));
    return {
      id: projectId,
      kind: "local",
      location: "local",
      name: String(entry.name || rootPath.replace(/\.p$/i, "") || "project"),
      path: rootPath,
      description: String(entry.description || ""),
      fileCount: files.length,
      updatedAt: Number(entry.updatedAt) || 0,
      createdAt: Number(entry.createdAt) || 0,
      source: entry,
      writable: true
    };
  }

  function readLocalProjects() {
    try {
      const raw = root.localStorage?.getItem(LOCAL_LIBRARY_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const projects = Array.isArray(parsed?.projects) ? parsed.projects : [];
      if (Array.isArray(parsed?.projects)) return projects.map(localProject).filter(Boolean);
      const current = root.localStorage?.getItem(LOCAL_PROJECT_KEY);
      const active = current ? localProject(JSON.parse(current)) : null;
      return active ? [active] : [];
    } catch {
      return [];
    }
  }

  async function readLocalProjectsAsync() {
    // Match the synchronous runtime's committed catalogue, even when empty.
    try { if (Array.isArray(JSON.parse(root.localStorage?.getItem(LOCAL_LIBRARY_KEY))?.projects)) return readLocalProjects(); } catch { /* recovery below */ }
    const repository = root.WebMarsProjectRepository;
    if (repository?.ready && typeof repository.listProjects === "function") {
      try {
        await repository.ready;
        const records = await repository.listProjects();
        if (records.length) return records.map((entry, index) => localProject({ ...(entry.project || entry), id: entry.id }, index)).filter(Boolean);
      } catch { /* the legacy snapshot remains the recovery path */ }
    }
    return readLocalProjects();
  }

  function readTrash() {
    try {
      const parsed = JSON.parse(root.localStorage?.getItem(TRASH_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map((item, index) => ({ ...localProject(item, index), deletedAt: item.deletedAt,
        deletedFrom: item.deletedFrom, kind: "trash", location: "trash", writable: true })) : [];
    } catch {
      return [];
    }
  }

  async function readTrashAsync() {
    try { if (Array.isArray(JSON.parse(root.localStorage?.getItem(TRASH_KEY)))) return readTrash(); } catch { /* recovery below */ }
    const repository = root.WebMarsProjectRepository;
    if (repository?.ready && typeof repository.listProjects === "function") {
      try {
        await repository.ready;
        const records = await repository.listProjects({ trash: true });
        if (records.length) return records.map((entry, index) => ({ ...localProject({ ...(entry.project || entry), id: entry.id }, index), deletedAt: entry.deletedAt, deletedFrom: entry.deletedFrom, kind: "trash", location: "trash", writable: true })).filter(Boolean);
      } catch { /* the legacy snapshot remains the recovery path */ }
    }
    return readTrash();
  }

  function apiBase() {
    return String(root.WebMarsModules?.publicLibrary?.config?.backMarsApiBase || root.WebMarsConfig?.backMarsApiBase || "").replace(/\/$/, "");
  }

  async function requestJson(path, options = {}) {
    const base = apiBase();
    if (!base) throw new Error("O serviço Cloud não está configurado.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const onAbort = () => controller.abort();
    options.signal?.addEventListener("abort", onAbort, { once: true });
    if (options.signal?.aborted) controller.abort();
    try {
    const response = await fetch(`${base}${path}`, {
      credentials: "include",
      headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
      ...options,
      signal: controller.signal
    });
    let payload = null;
    try { payload = await response.json(); } catch { /* status below is authoritative */ }
    if (!response.ok) {
      const error = new Error(String(payload?.error || payload?.message || `HTTP ${response.status}`));
      error.status = response.status;
      throw error;
    }
    if (!payload || typeof payload !== "object") throw new Error(t("Failed to load file."));
    return payload;
    } finally { clearTimeout(timeout); options.signal?.removeEventListener("abort", onAbort); }
  }

  async function loadPublication(item) {
    if (item.source?.project) return item.source;
    const path = `/publications/${encodeURIComponent(item.path)}`;
    const pinned = item.location === "mine" && item.source?.latestRevision
      ? `${path}/revisions/${encodeURIComponent(item.source.latestRevision)}` : null;
    if (pinned && item.source.status === "archived") return (await requestJson(pinned)).publication;
    try { return (await requestJson(path)).publication; }
    catch (error) {
      if (!pinned || ![404, 410].includes(error.status)) throw error;
      return (await requestJson(pinned)).publication;
    }
  }

  function ensureStyles() {
    if (document.getElementById("project-manager-styles")) return;
    const style = document.createElement("style");
    style.id = "project-manager-styles";
    style.textContent = `
      #${MANAGER_ID} { width:100%; height:100%; min-width:0; min-height:0; container-type:inline-size; }
      #${MANAGER_ID} > .window-titlebar { display:none; }
      #${MANAGER_ID} .pm-content { display:grid; grid-template-columns: 174px minmax(0,1fr); grid-template-rows:auto minmax(0,1fr) auto auto; height:100%; min-height:0; padding:0; overflow:hidden; background:var(--surface-sunken); color:var(--text); }
      #${MANAGER_ID} .pm-toolbar { grid-column:1/-1; display:flex; align-items:center; gap:8px; padding:4px 6px; min-height:30px; font-size:12px; border-bottom:1px solid var(--line-soft); background:var(--surface-raised); }
      #${MANAGER_ID} .pm-toolbar input { flex:1 1 260px; min-width:120px; background:var(--surface); color:var(--text); border:1px solid var(--line); border-radius:3px; padding:6px 8px; }
      #${MANAGER_ID} .pm-toolbar select, #${MANAGER_ID} .pm-toolbar button { min-height:24px; font:inherit; }
      #${MANAGER_ID} .pm-filters { position:absolute; z-index:20; bottom:calc(100% + 4px); right:0; display:flex; flex-wrap:wrap; gap:6px; width:min(360px, calc(100vw - 24px)); padding:9px; border:1px solid var(--line); border-radius:4px; box-shadow:0 8px 24px rgba(0,0,0,.32); background:var(--surface-raised); }
      #${MANAGER_ID} .pm-filters[hidden] { display:none; }
      #${MANAGER_ID} .pm-filters select { min-width:92px; background:var(--surface); color:var(--text); border:1px solid var(--line); padding:4px 6px; }
      #${MANAGER_ID} .pm-filter-wrap { position:relative; display:none; }
      #${MANAGER_ID} .pm-filter-wrap[data-visible="true"] { display:block; }
      #${MANAGER_ID} .pm-filter-actions { display:flex; justify-content:flex-end; gap:6px; width:100%; margin-top:2px; }
      #${MANAGER_ID} .pm-locations { grid-column:1; grid-row:2; padding:8px 6px; border-right:1px solid var(--line-soft); overflow:auto; }
      #${MANAGER_ID} .pm-location { width:100%; display:flex; align-items:center; gap:6px; border:0; border-radius:3px; padding:8px 7px; font:inherit; font-size:12px; color:var(--text); background:transparent; text-align:left; cursor:pointer; }
      #${MANAGER_ID} .pm-location > span:nth-child(2) { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      #${MANAGER_ID} .pm-location:hover { background:var(--surface-hover); }
      #${MANAGER_ID} .pm-location[aria-current="true"] { background:var(--accent); color:var(--text-on-accent); font-weight:600; }
      #${MANAGER_ID} .pm-location-count { margin-left:auto; opacity:.7; font-size:11px; }
      #${MANAGER_ID} .pm-list { grid-column:2; grid-row:2; min-width:0; overflow:auto; }
      #${MANAGER_ID} .pm-remote-host { grid-column:2; grid-row:2; height:100%; min-width:0; min-height:0; overflow:hidden; }
      #${MANAGER_ID} .pm-file-area { grid-column:2/-1; grid-row:2; min-width:0; min-height:0; overflow:hidden; }
      #${MANAGER_ID} .pm-file-area > .project-tree-host { height:100%; min-height:0; }
      #${MANAGER_ID} [hidden] { display:none !important; }
      #${MANAGER_ID} .pm-list table { width:100%; border-collapse:collapse; table-layout:fixed; }
      #${MANAGER_ID} .pm-list th, #${MANAGER_ID} .pm-list td { padding:8px 9px; border-bottom:1px solid var(--line-soft); text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #${MANAGER_ID} .pm-list th { position:sticky; top:0; z-index:1; background:var(--surface-strong); font-size:11px; }
      #${MANAGER_ID} .pm-list tr { cursor:pointer; }
      #${MANAGER_ID} .pm-list tr:hover { background:var(--surface-hover); }
      #${MANAGER_ID} .pm-list tr[aria-selected="true"] { background:color-mix(in srgb, var(--accent) 28%, transparent); outline:1px solid var(--accent); outline-offset:-1px; }
      #${MANAGER_ID} .pm-list th:nth-child(1), #${MANAGER_ID} .pm-list td:nth-child(1) { width:36%; }
      #${MANAGER_ID} .pm-list th:nth-child(2), #${MANAGER_ID} .pm-list td:nth-child(2) { width:22%; }
      #${MANAGER_ID} .pm-list th:nth-child(3), #${MANAGER_ID} .pm-list td:nth-child(3) { width:18%; }
      #${MANAGER_ID} .pm-list th:nth-child(4), #${MANAGER_ID} .pm-list td:nth-child(4) { width:24%; }
      #${MANAGER_ID} .pm-inspector { grid-column:2; grid-row:3; max-height:190px; border-top:1px solid var(--line-soft); padding:8px; overflow:auto; font-size:12px; }
      #${MANAGER_ID} .pm-inspector pre { white-space:pre; overflow:auto; max-height:150px; font-size:12px; }
      #${MANAGER_ID} .pm-status { display:none; }
      #${MANAGER_ID} .pm-list { display:none; }
      #${MANAGER_ID} .pm-filters select { font-size:11px; min-height:22px; }
      #${MANAGER_ID} .pm-inspector h3 { margin:0 0 10px; font-size:15px; overflow-wrap:anywhere; }
      #${MANAGER_ID} .pm-inspector dl { display:grid; grid-template-columns:90px 1fr; gap:7px 10px; margin:0; font-size:12px; }
      #${MANAGER_ID} .pm-inspector dt { color:var(--text-muted); }
      #${MANAGER_ID} .pm-inspector dd { margin:0; overflow-wrap:anywhere; }
      #${MANAGER_ID} .pm-actions { display:flex; flex-wrap:wrap; gap:6px; margin-top:16px; }
      #${MANAGER_ID} .pm-actions button { flex:1 1 110px; min-height:30px; }
      #${MANAGER_ID} .pm-status { grid-column:1/-1; }
      #${MANAGER_ID} .pm-status-actions { position:relative; display:flex; align-items:center; flex-wrap:wrap; justify-content:flex-end; gap:5px; }
      #${MANAGER_ID} .fm-status { flex-wrap:wrap; gap:6px; }
      #${MANAGER_ID} [data-fm-status-cells] { display:flex; flex-wrap:wrap; align-items:center; gap:10px; }
      #${MANAGER_ID} .pm-status-actions { margin-left:auto; }
      #${MANAGER_ID} .pm-status-actions button { min-height:24px; font:inherit; }
      #${MANAGER_ID} .pm-page { display:flex; align-items:center; gap:8px; }
      #${MANAGER_ID} .pm-page button { min-height:24px; }
      #${MANAGER_ID} .pm-empty { padding:28px 18px; color:var(--text-muted); }
      #${MANAGER_ID} .pm-error { padding:12px 16px; color:var(--error); }
      @container (max-width:760px) { #${MANAGER_ID} .pm-content { grid-template-columns:160px minmax(0,1fr); } }
      @container (max-width:520px) { #${MANAGER_ID} .pm-content { grid-template-columns:minmax(0,1fr); grid-template-rows:auto auto minmax(0,1fr) auto auto; } #${MANAGER_ID} .pm-locations { grid-column:1; grid-row:2; display:flex; overflow:auto; padding:3px; border-right:0; border-bottom:1px solid var(--line-soft); } #${MANAGER_ID} .pm-location { width:auto; min-width:max-content; padding:6px; } #${MANAGER_ID} .pm-list, #${MANAGER_ID} .pm-file-area, #${MANAGER_ID} .pm-remote-host { grid-column:1; grid-row:3; } #${MANAGER_ID} .pm-inspector { grid-column:1; grid-row:4; } #${MANAGER_ID} .pm-status { grid-row:5; } }
    `;
    document.head.append(style);
  }

  function createManager() {
    ensureStyles();
    const wm = root.WebMarsWindowManager;
    const panel = root.WebMarsAppRefs?.mode?.panelProject || document.querySelector("#main-panel-project");
    if (!panel) return null;
    const fileTree = panel.querySelector("#project-tree-main");
    const win = document.createElement("section");
    win.id = MANAGER_ID;
    win.className = "project-manager-embedded";
    win.innerHTML = `<div class="window-titlebar"><span class="window-title"></span><div class="window-controls"><button class="win-btn" data-win-action="min" type="button">_</button><button class="win-btn" data-win-action="max" type="button">[]</button><button class="win-btn win-btn-close" data-win-action="close" type="button">x</button></div></div><div class="window-content pm-content"><div class="pm-toolbar"><strong class="pm-heading"></strong><input class="pm-search" type="search" maxlength="120" autocomplete="off"><input class="pm-file-input" type="file" accept=".json,.webmars,.p" hidden></div><nav class="pm-locations" aria-label="Project locations"></nav><div class="pm-list"><table><thead><tr><th>Name</th><th>Location</th><th>Files</th><th>Modified</th></tr></thead><tbody></tbody></table><div class="pm-empty" hidden></div><div class="pm-error" hidden></div></div><aside class="pm-inspector" aria-live="polite"></aside><div class="pm-status"><span class="pm-status-text"></span><div class="pm-status-actions"><div class="pm-filter-wrap"><button class="pm-filter-toggle" type="button" aria-expanded="false"></button><div class="pm-filters" hidden><select class="pm-kind" aria-label="Kind"></select><select class="pm-language" aria-label="Language"><option value="">All</option><option value="en">en</option><option value="pt">pt</option><option value="es">es</option><option value="fr">fr</option></select><select class="pm-difficulty" aria-label="Difficulty"></select><select class="pm-sort" aria-label="Sort by"></select><div class="pm-filter-actions"><button class="pm-filter-clear" type="button"></button><button class="pm-filter-apply" type="button"></button></div></div></div><button class="pm-refresh" type="button"></button><button class="pm-import" type="button"></button><button class="pm-export" type="button"></button><button class="pm-new" type="button"></button><span class="pm-page"></span></div></div></div>`;
    panel.append(win);
    const fileArea = document.createElement("div");
    fileArea.className = "pm-file-area";
    if (fileTree) fileArea.append(fileTree);
    win.querySelector(".pm-content").append(fileArea);

    const state = { location: "local", query: "", filters: { kind: "", language: "", difficulty: "", sort: "updated", order: "desc" }, items: [], selected: null, loading: false, error: "", request: 0, timer: null, offset: 0, hasMore: false };
    const qs = (selector) => win.querySelector(selector);
    const locationsNode = qs(".pm-locations");
    const body = qs("tbody");
    const filtersNode = qs(".pm-filters");
    const filterWrap = qs(".pm-filter-wrap");
    const remoteHost = document.createElement("div");
    remoteHost.className = "pm-remote-host project-tree-host";
    qs(".pm-content").append(remoteHost);
    let selectedNode = null;
    const expanded = new Set();
    const documents = new Map();
    function documentNodes(item, project) {
      const branches = new Map();
      const nodes = [];
      function folder(path) {
        if (!path) return nodes;
        if (branches.has(path)) return branches.get(path).children;
        const parts = path.split("/"); const name = parts.pop();
        const node = { key: `${item.id}:folder:${path}`, type: "folder", name, path, item, readOnly: true, children: [] };
        folder(parts.join("/")).push(node); branches.set(path, node);
        return node.children;
      }
      for (const path of project?.folderPaths || []) folder(String(path));
      for (const [index, file] of (project?.files || []).entries()) {
        const path = String(file.path || file.name || `file-${index + 1}`);
        const parts = path.split("/"); const name = parts.pop();
        const source = String(file.source || "");
        folder(parts.join("/")).push({
          key: `${item.id}:file:${path}`, type: "file", name, path, readOnly: true,
          item, source, bytes: new TextEncoder().encode(source).length,
          lineCount: source.split("\n").length
        });
      }
      return nodes;
    }
    const remoteConfig = {
      host: remoteHost, label: t("Projects"), rootLabel: "/", remoteSearch: true,
      features: { checkboxes: false, dragDrop: false },
      toggleFoldersOnRowClick: false,
      actions: [],
      getModel: () => state.items.map((item) => ({
        key: item.id, type: "project", name: item.name, path: item.path,
        updatedAt: item.updatedAt, bytes: Number(item.source?.sizeBytes) || undefined,
        readOnly: item.location === "public" || item.location === "mine",
        item,
        title: [item.name, item.source?.author?.username, item.description].filter(Boolean).join(" — "),
        children: documentNodes(item, documents.get(item.id))
      })),
      isExpanded: (node) => expanded.has(node.key),
      isSelected: (node) => selectedNode?.key === node.key,
      onSelect: (node) => { selectedNode = node; state.selected = node.item; remoteView.refreshChrome(); },
      onToggle: (node) => { void browseFiles(node); },
      onActivate: (node) => { selectedNode = node; state.selected = node.item; void browseFiles(node); },
      onSearch: (query) => { state.query = query; clearTimeout(state.timer); state.timer = setTimeout(() => void load(), 300); },
      isActionEnabled: (id) => Boolean(selectedNode) && !state.loading && !state.error
        && (selectedNode.type === "project" || id === "details"),
      isActionVisible: (id) => Boolean(selectedNode) && !state.loading && !state.error
        && (selectedNode.type === "project" || id === "details"),
      onAction: (id, node) => { if (node) { selectedNode = node; state.selected = node.item; } void performAction(id); },
      getContextItems: (node) => node.type !== "project"
        ? [{ id: "details", label: "Open" }]
        : remoteConfig.actions.filter((action) => action.id !== "archive" || node.item.source.status !== "archived"),
      emptyText: () => state.loading ? t("Loading...") : state.error || t(state.query || Object.values(state.filters).slice(0, 3).some(Boolean) ? "No data for these filters." : state.location === "public" ? "No public projects yet." : "This folder is empty."),
      getStatusCells: () => [state.loading ? t("Loading...") : state.error || `${t("Projects")}: ${state.items.length}`]
    };
    const remoteView = root.createFileManager(remoteConfig);

    function applyLocationVisibility() {
      const local = state.location === "local";
      remoteConfig.rootLabel = t(labelForLocation(state.location));
      fileArea.hidden = !local;
      remoteHost.hidden = local;
    }

    function mountStatusActions() {
      const host = state.location === "local" ? fileTree : remoteHost;
      const status = host?.querySelector?.("[data-fm-status]");
      const actions = qs(".pm-status-actions");
      actions?.querySelectorAll("button").forEach((button) => button.classList.add("fm-btn"));
      if (status && actions && actions.parentElement !== status) status.append(actions);
    }
    const statusObserver = new MutationObserver(() => mountStatusActions());
    if (fileTree) statusObserver.observe(fileTree, { childList: true, subtree: true });
    statusObserver.observe(remoteHost, { childList: true, subtree: true });

    async function browseFiles(node) {
      try {
        if (node.type === "folder") {
          if (expanded.has(node.key)) expanded.delete(node.key); else expanded.add(node.key);
          remoteView.render(); return;
        }
        if (node.type === "file") {
          qs(".pm-inspector").hidden = false;
          qs(".pm-inspector").innerHTML = `<strong>${esc(node.path)}</strong><pre>${esc(node.source)}</pre>`;
          return;
        }
        if (expanded.has(node.key)) { expanded.delete(node.key); remoteView.render(); return; }
        if (!documents.has(node.key)) {
          const item = node.item;
          let project;
          let metadata = null;
          if (item.location === "cloud") {
            const result = await requestJson(`/projects/${encodeURIComponent(item.source.id)}`);
            project = result.project?.project;
            if (project?.project) project = project.project;
          } else if (["public", "mine"].includes(item.location)) {
            metadata = await loadPublication(item);
            project = metadata?.project;
          } else project = item.source;
          let files = project?.files;
          if (files && !Array.isArray(files)) files = Object.entries(files).map(([path, source]) => ({ path, source }));
          if (!Array.isArray(files)) throw new Error(t("Failed to load file."));
          documents.set(node.key, { files, folderPaths: project.folderPaths || [], metadata });
        }
        const metadata = documents.get(node.key)?.metadata;
        if (metadata) {
          const inspector = qs(".pm-inspector"); inspector.hidden = false;
          inspector.innerHTML = `<strong>${esc(metadata.title || node.name)}</strong><p>${esc(t("Author"))}: ${esc(metadata.author?.username || "—")} · ${esc(t("Language"))}: ${esc(metadata.language || "—")} · ${esc(metadata.license || "")} · r${esc(metadata.revision || metadata.latestRevision || "")}</p><p>${esc(metadata.description || "")}</p>${metadata.instructions ? `<pre>${esc(metadata.instructions)}</pre>` : ""}`;
        }
        state.error = "";
        expanded.add(node.key); remoteView.render();
      } catch (error) { state.error = describeError(error); remoteView.render(); }
    }

    function describeError(error) {
      state.authRequired = error?.status === 401;
      if (state.authRequired) return t("Not signed in");
      return t("The service could not be reached.");
    }

    async function performAction(id) {
      const item = state.selected;
      if (!item) return;
      try {
        if (id === "open") { openSelected(); return; }
        if (id === "details") { await browseFiles(selectedNode); return; }
        if (id === "download") { await exportSelected(); return; }
        if (id === "restore") { await restore(item); return; }
        if (["rename", "delete", "edit", "archive", "revision", "copy-latest", "copy-pinned"].includes(id)) {
          const changed = await root.WebMarsProjectManagerBridge?.action?.(id, item);
          if (changed) { documents.clear(); await load(); }
        }
      } catch (error) { state.error = describeError(error); renderList(); }
    }

    function setOptions(select, options, selected) {
      select.replaceChildren(...options.map(([value, label]) => {
        const option = document.createElement("option");
        option.value = value; option.textContent = label; option.selected = value === selected;
        return option;
      }));
    }

    function configureFilters() {
      setOptions(qs(".pm-kind"), [["", `${t("Kind")}: ${t("All")}`], ["example", t("Example")], ["exercise", t("Exercise")], ["solution", t("Solution")], ["lab", t("Lab")], ["library", t("Library")]], state.filters.kind);
      setOptions(qs(".pm-difficulty"), [["", `${t("Difficulty")}: ${t("All")}`], ["beginner", t("Beginner")], ["intermediate", t("Intermediate")], ["advanced", t("Advanced")], ["mixed", t("Mixed")]], state.filters.difficulty);
      setOptions(qs(".pm-sort"), [["updated:desc", t("Updated")], ["title:asc", t("Title")], ["author:asc", t("Author")]], `${state.filters.sort}:${state.filters.order}`);
      const supportsFilters = ["public", "mine"].includes(state.location);
      filterWrap.dataset.visible = String(supportsFilters);
      if (!supportsFilters) {
        filtersNode.hidden = true;
        qs(".pm-filter-toggle").setAttribute("aria-expanded", "false");
      }
      const local = state.location === "local";
      applyLocationVisibility();
      qs(".pm-list").hidden = true;
      qs(".pm-inspector").hidden = true;
      qs(".pm-search").hidden = true;
      qs(".pm-new").hidden = !local;
      qs(".pm-import").hidden = !local;
      qs(".pm-export").hidden = !local;
      remoteConfig.rootLabel = t(labelForLocation(state.location));
      remoteConfig.actions = state.location === "trash"
        ? [{ id: "restore", label: "Restore", icon: "back" }]
        : [{ id: "open", label: state.location === "cloud" ? "Open" : "Open as Local Copy", icon: "file" }, { id: "details", label: "Project files", icon: "folder" }, { id: "download", label: "Download", icon: "download" }];
      if (state.location === "cloud") remoteConfig.actions.push({ id: "rename", label: "Rename", icon: "rename" }, { id: "delete", label: "Delete", icon: "trash", danger: true });
      if (state.location === "mine") remoteConfig.actions.push(
        { id: "edit", label: "Edit", icon: "rename" },
        { id: "revision", label: "Publish active project as new revision" },
        { id: "copy-latest", label: "Copy latest URL" },
        { id: "copy-pinned", label: "Copy pinned revision URL" },
        { id: "archive", label: "Archive", icon: "trash", danger: true }
      );
      remoteView.render();
      applyLocationVisibility();
      mountStatusActions();
    }

    function notify(kind, detail) {
      try { root.dispatchEvent(new CustomEvent(`webmars:project-${kind}`, { detail })); } catch { /* old browsers */ }
    }

    function labelForLocation(id) { return LOCATIONS.find((entry) => entry.id === id)?.label || id; }
    function formatDate(value) {
      const timestamp = Number(value);
      if (!timestamp) return "—";
      try { return new Date(timestamp).toLocaleString(root.WebMarsI18n?.getLanguage?.() || undefined, { dateStyle: "medium", timeStyle: "short" }); } catch { return new Date(timestamp).toISOString(); }
    }

    function renderLocations() {
      locationsNode.replaceChildren();
      for (const location of LOCATIONS) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "pm-location";
        button.dataset.location = location.id;
        button.setAttribute("aria-current", String(state.location === location.id));
        const count = state.location === location.id && !state.loading && !state.error ? state.items.length : "";
        button.innerHTML = `<span aria-hidden="true">${location.icon}</span><span>${esc(t(location.label))}</span><span class="pm-location-count">${count}</span>`;
        button.addEventListener("click", () => {
          state.location = location.id; state.query = ""; selectedNode = null;
          qs(".pm-search").value = "";
          renderLocations();
          remoteView.clearQuery?.(); remoteView.setCurrentFolderKey?.("");
          expanded.clear(); documents.clear();
          try { configureFilters(); void load(); }
          catch (error) { state.error = describeError(error); renderList(); }
        });
        locationsNode.append(button);
      }
    }

    function renderInspector() {
      if (!state.selected) qs(".pm-inspector").hidden = true;
    }

    function renderList() {
      applyLocationVisibility();
      body.replaceChildren();
      qs(".pm-empty").hidden = Boolean(state.loading || state.error || state.items.length);
      qs(".pm-empty").textContent = state.query ? t("No data for these filters.") : t("No files in project.");
      qs(".pm-error").hidden = !state.error;
      qs(".pm-error").textContent = state.error;
      qs(".pm-status-text").textContent = state.loading ? t("Loading...") : state.error || `${t("Projects")}: ${state.items.length}`;
      const page = qs(".pm-page");
      page.replaceChildren();
      if (state.authRequired) {
        const login = document.createElement("button");
        login.type = "button"; login.textContent = t("Cloud Login");
        login.addEventListener("click", async () => { await root.WebMarsProjectManagerBridge?.login?.(); void load(); });
        page.append(login);
      }
      if (state.hasMore) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = t("Next page");
        button.disabled = state.loading;
        button.addEventListener("click", () => void loadMore());
        page.append(button);
      }
      renderLocations();
      remoteView.render();
      mountStatusActions();
      qs(".pm-export").disabled = !state.selected || state.loading;
    }

    async function loadCloud(offset = 0) {
      const payload = await requestJson(`/v2/projects?limit=50&offset=${offset}${state.query.trim() ? `&q=${encodeURIComponent(state.query.trim())}` : ""}`, { signal: state.controller?.signal });
      if (!Array.isArray(payload?.projects)) throw new Error(t("Failed to load file."));
      const projects = payload.projects;
      return { items: projects.map((entry, index) => ({ id: `cloud-${entry.id ?? index + offset}`, kind: "cloud", location: "cloud", name: String(entry.name || `project-${index + 1 + offset}`), path: String(entry.name || ""), description: String(entry.description || ""), fileCount: Array.isArray(entry.files) ? entry.files.length : Number(entry.fileCount) || 0, updatedAt: Date.parse(entry.updatedAt || entry.updated_at || "") || Number(entry.updatedAt) || 0, source: entry, writable: true })), hasMore: Boolean(payload?.hasMore), nextOffset: Number.isFinite(Number(payload?.nextOffset)) ? Number(payload.nextOffset) : offset + projects.length };
    }

    async function loadPublic(owned = false, offset = 0) {
      const params = new URLSearchParams({ limit: "50", offset: String(offset) });
      const query = state.query.trim();
      if (query) params.set("q", query);
      for (const key of ["kind", "language", "difficulty"]) if (state.filters[key]) params.set(key, state.filters[key]);
      params.set("sort", state.filters.sort); params.set("order", state.filters.order);
      const path = `${owned ? "/publications/mine" : "/publications"}?${params.toString()}`;
      const payload = await requestJson(path, { signal: state.controller?.signal, credentials: owned ? "include" : "omit" });
      if (!Array.isArray(payload?.publications)) throw new Error(t("Failed to load file."));
      const publications = payload.publications;
      return { items: publications.map((entry, index) => ({ id: `${owned ? "mine" : "public"}-${entry.slug || index + offset}`, kind: "publication", location: owned ? "mine" : "public", name: String(entry.title || entry.slug || "publication"), path: String(entry.slug || ""), description: String(entry.description || ""), fileCount: Number(entry.fileCount) || (Array.isArray(entry.project?.files) ? entry.project.files.length : 0), updatedAt: Date.parse(entry.updatedAt || entry.updated_at || "") || 0, source: entry, writable: owned })), hasMore: Boolean(payload?.hasMore), nextOffset: offset + publications.length };
    }

    async function load() {
      const request = ++state.request;
      state.controller?.abort(); state.controller = new AbortController();
      selectedNode = null; qs(".pm-inspector").hidden = true;
      state.loading = true; state.error = ""; state.authRequired = false; state.items = []; state.selected = null; renderList(); renderInspector();
      try {
        state.offset = 0;
        state.hasMore = false;
        let items;
        if (state.location === "local") items = await readLocalProjectsAsync();
        else if (state.location === "trash") items = await readTrashAsync();
        else {
          const remote = state.location === "cloud" ? await loadCloud(0) : await loadPublic(state.location === "mine", 0);
          if (request !== state.request) return;
          items = remote.items;
          state.hasMore = remote.hasMore;
          state.offset = remote.nextOffset;
        }
        if (request !== state.request) return;
        if (state.location === "local" || state.location === "trash") {
          const query = state.query.trim().toLocaleLowerCase();
          if (query) items = items.filter((item) => [item.name, item.path, item.description].some((value) => String(value || "").toLocaleLowerCase().includes(query)));
          items.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }));
        }
        state.items = items; state.selected = null; state.loading = false; renderList(); renderInspector();
      } catch (error) {
        if (request !== state.request) return;
        state.loading = false; state.error = describeError(error); renderList(); renderInspector();
      }
    }

    async function loadMore() {
      if (state.loading || !state.hasMore || state.location === "local" || state.location === "trash") return;
      const request = state.request;
      state.loading = true; renderList();
      try {
        const remote = state.location === "cloud" ? await loadCloud(state.offset) : await loadPublic(state.location === "mine", state.offset);
        if (request !== state.request) return;
        state.items = state.items.concat(remote.items);
        state.hasMore = remote.hasMore;
        state.offset = remote.nextOffset;
        state.loading = false;
        renderList();
        renderInspector();
      } catch (error) {
        if (request !== state.request) return;
        state.loading = false;
        state.error = describeError(error);
        renderList();
      }
    }

    function openSelected() {
      const item = state.selected;
      if (!item) return;
      if (item.location === "public" || item.location === "mine") {
        void (async () => {
          try {
            const payload = await loadPublication(item);
            if (!payload?.project) throw new Error(t("This publication does not contain a supported public project."));
            notify("copy-public", { item: { ...item, source: payload } });
          } catch (error) {
            state.error = `${t("The service could not be reached.")} ${String(error?.message || error)}`;
            renderList();
          }
        })();
        return;
      }
      if (item.location === "trash") return;
      notify("open", { item });
    }

    async function restore(item) {
      if (!item || item.location !== "trash") return;
      const library = (await readLocalProjectsAsync()).map((entry) => entry.source);
      const restored = prepareLocalCopy(item.source, library);
      if (!root.WebMarsProjectManagerBridge?.restoreLocal?.(restored, item.id)) {
        state.error = t("Could not restore the project."); renderList(); return;
      }
      state.location = "local";
      void load();
    }

    async function exportSelected() {
      const item = state.selected;
      if (!item) return;
      try {
        let project = item.source;
        if (item.location === "cloud") {
          const record = await requestJson(`/projects/${encodeURIComponent(item.source?.id ?? item.source?.numericId)}`);
          project = record?.project?.project || record?.project;
        } else if ((item.location === "public" || item.location === "mine") && !project?.project) {
          project = await loadPublication(item);
        }
        if (project?.project && typeof project.project === "object") project = project.project;
        if (!project || typeof project !== "object" || !Array.isArray(project.files)) throw new Error(t("Failed to load file."));
        const payload = { kind: "webmars-project", version: 2, exportedAt: new Date().toISOString(), project };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${String(item.name || "project").replace(/[^a-z0-9._-]+/gi, "-")}.webmars.json`;
        link.click();
        URL.revokeObjectURL(link.href);
        notify("export", { item });
      } catch (error) {
        state.error = `${t("The service could not be reached.")} ${String(error?.message || error)}`;
        renderList();
      }
    }

    async function importFile(file) {
      if (!file) return;
      try {
        if (!Number.isFinite(file.size) || file.size > MAX_IMPORT_BYTES) throw new Error(t("Failed to load file."));
        const text = await file.text();
        if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error(t("Failed to load file."));
        const parsed = JSON.parse(text);
        const source = parsed?.project && typeof parsed.project === "object" ? parsed.project : parsed;
        validateImportedProject(source);
        const library = (await readLocalProjectsAsync()).map((entry) => entry.source);
        const imported = prepareLocalCopy(source, library);
        if (!root.WebMarsProjectManagerBridge?.importLocal?.(imported)) throw new Error(t("Failed to save to browser storage."));
        const item = localProject(imported);
        state.location = "local";
        notify("open", { item });
        await load();
      } catch (error) {
        state.error = `${t("Failed to load file.")} ${String(error?.message || error)}`;
        renderList();
      }
    }

    function refreshTranslations() {
    qs(".window-title").textContent = t("Projects");
    qs(".pm-heading").textContent = t("Projects");
    qs(".pm-search").placeholder = t("Search");
    qs(".pm-search").setAttribute("aria-label", t("Search"));
    qs(".pm-refresh").textContent = t("Refresh");
    qs(".pm-import").textContent = t("Open from Disk...");
    qs(".pm-export").textContent = t("Download");
    qs(".pm-new").textContent = t("New Project");
    qs(".pm-filter-toggle").textContent = t("Filter results");
    qs(".pm-filter-clear").textContent = t("Clear");
    qs(".pm-filter-apply").textContent = t("Apply");
    configureFilters();
    qs(".pm-list thead th:nth-child(1)").textContent = t("Name");
    qs(".pm-list thead th:nth-child(2)").textContent = t("Location");
    qs(".pm-list thead th:nth-child(3)").textContent = t("Files");
    qs(".pm-list thead th:nth-child(4)").textContent = t("Modified");
    qs(".pm-locations").setAttribute("aria-label", t("Projects"));
    qs(".pm-language option[value='']").textContent = `${t("Language")}: ${t("All")}`;
    qs(".pm-kind").setAttribute("aria-label", t("Kind"));
    qs(".pm-language").setAttribute("aria-label", t("Language"));
    qs(".pm-difficulty").setAttribute("aria-label", t("Difficulty"));
    qs(".pm-sort").setAttribute("aria-label", t("Updated"));
    renderList(); renderInspector();
    }
    refreshTranslations();
    root.WebMarsI18n?.subscribe?.(refreshTranslations);
    qs(".pm-refresh").addEventListener("click", () => void load());
    qs(".pm-import").addEventListener("click", () => qs(".pm-file-input").click());
    qs(".pm-export").addEventListener("click", exportSelected);
    qs(".pm-file-input").addEventListener("change", () => { void importFile(qs(".pm-file-input").files?.[0]); });
    qs(".pm-new").addEventListener("click", () => notify("new", { location: state.location }));
    qs(".pm-filter-toggle").addEventListener("click", () => {
      const open = filtersNode.hidden;
      filtersNode.hidden = !open;
      qs(".pm-filter-toggle").setAttribute("aria-expanded", String(open));
    });
    qs(".pm-filter-clear").addEventListener("click", () => {
      state.filters.kind = ""; state.filters.language = ""; state.filters.difficulty = "";
      configureFilters();
    });
    qs(".pm-filter-apply").addEventListener("click", () => {
      filtersNode.hidden = true;
      qs(".pm-filter-toggle").setAttribute("aria-expanded", "false");
      void load();
    });
    qs(".pm-search").addEventListener("input", () => { state.query = qs(".pm-search").value; clearTimeout(state.timer); state.timer = setTimeout(() => void load(), 180); });
    for (const selector of [".pm-kind", ".pm-language", ".pm-difficulty", ".pm-sort"]) {
      qs(selector).addEventListener("change", () => {
        const value = qs(selector).value;
        if (selector === ".pm-sort") {
          const [sort, order] = value.split(":"); state.filters.sort = sort; state.filters.order = order || "desc";
        } else state.filters[selector.slice(4)] = value;
      });
    }
    document.addEventListener("pointerdown", (event) => {
      if (!filterWrap.contains(event.target)) {
        filtersNode.hidden = true;
        qs(".pm-filter-toggle").setAttribute("aria-expanded", "false");
      }
    });
    root.addEventListener("webmars:project-manager-selection", (event) => {
      if (state.location !== "local") return;
      const path = String(event.detail?.rootPath || "").toLocaleLowerCase();
      // The unified file manager identifies a project root as `project`. Older
      // restored layouts can still report the same row as `root`; both refer
      // to the project itself and must keep the project actions available.
      const type = String(event.detail?.type || "").toLocaleLowerCase();
      const isProjectRoot = type === "project" || (type === "root" && Boolean(path));
      state.selected = isProjectRoot
        ? state.items.find((item) => String(item.path || "").toLocaleLowerCase() === path) || null
        : null;
      qs(".pm-export").disabled = !state.selected;
    });
    root.addEventListener("webmars:cloud-session-changed", () => {
      documents.clear(); expanded.clear(); selectedNode = null;
      if (["cloud", "mine"].includes(state.location)) void load();
    });
    void load();
    return { open(location) { if (LOCATIONS.some((entry) => entry.id === location)) state.location = location; configureFilters(); root.dispatchEvent(new CustomEvent("webmars:project-manager-show")); void load(); }, reload: load, element: win };
  }

  let manager = null;
  function mount() {
    manager ||= createManager();
    return manager;
  }

  function open(location) { mount()?.open(location); return manager; }

  root.WebMarsProjectManager = Object.freeze({ mount, open, reload: () => manager?.reload?.() });
})(typeof window !== "undefined" ? window : globalThis);
