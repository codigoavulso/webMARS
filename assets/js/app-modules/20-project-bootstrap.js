// Pure startup policy shared by the runtime and recovery regression tests.
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const registry = root.WebMarsModules || (root.WebMarsModules = {});
  function sessionProjectFiles(files) {
    return (Array.isArray(files) ? files : [])
      .filter(file => file && typeof file === "object" && file.projectOwned !== false)
      .map(file => ({ id: String(file.id || ""), path: String(file.sourceProjectPath || file.name || ""),
        source: String(file.source ?? ""), savedSource: typeof file.savedSource === "string" ? file.savedSource : String(file.source ?? "") }))
      .filter(file => file.path.trim().length);
  }
  function resolve({ library, project, session, createDefault, normalizeLibrary, rootKey }) {
    // A valid catalogue, even an empty one, supersedes older active/session
    // snapshots. Otherwise reloading after deletion resurrects removed work.
    if (library && Array.isArray(library.projects)) {
      const projects = library.projects;
      const active = projects.find(entry => rootKey(entry.rootPath) === rootKey(library.activeRootPath)) || projects[0];
      if (active) return { library, project: active, session };
      const placeholder = { ...createDefault({ files: [] }), isOpen: false, files: [], folderPaths: [], activeFileId: "" };
      const external = (session?.files || []).filter(file => file.projectOwned === false);
      return { library, project: placeholder, session: session ? { ...session, files: external,
        activeFileId: external.some(file => file.id === session.activeFileId) ? session.activeFileId : external[0]?.id || "" } : null };
    }
    // First run and migration of pre-catalogue sessions retain the old path.
    const fallback = project || createDefault({ files: sessionProjectFiles(session?.files), activeFileId: session?.activeFileId || "" });
    return { library: normalizeLibrary({ version: 1, activeRootPath: fallback.rootPath, projects: [fallback] }), project: fallback, session };
  }
  registry.projectBootstrap = Object.freeze({ resolve });
})();
