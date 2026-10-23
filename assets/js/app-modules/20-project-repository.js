/* global window */
(() => {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const DB_NAME = "webmars-projects-v2";
  const DB_VERSION = 1;
  const LOCAL_LIBRARY_KEY = "mars45-web-project-library-v1";
  const LOCAL_PROJECT_KEY = "mars45-web-project-v1";
  const TRASH_KEY = "webmars-project-trash-v1";
  const META_STORE = "meta";
  const PROJECT_STORE = "projects";
  const TRASH_STORE = "trash";

  function stableId(value) {
    let hash = 2166136261;
    for (const ch of String(value || "")) {
      hash ^= ch.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `local-${(hash >>> 0).toString(36)}`;
  }

  function createId(seed) {
    try {
      if (typeof root.crypto?.randomUUID === "function") return root.crypto.randomUUID();
    } catch { /* deterministic fallback below */ }
    return stableId(`${seed}-${Date.now()}-${Math.random()}`);
  }

  function parseStorage(key, fallback) {
    try {
      const raw = root.localStorage?.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function projectRoot(project) {
    return String(project?.rootPath || project?.name || "project.p").trim().toLocaleLowerCase();
  }

  function legacyProjects() {
    const library = parseStorage(LOCAL_LIBRARY_KEY, null);
    if (Array.isArray(library?.projects)) return library.projects.filter(Boolean);
    const active = parseStorage(LOCAL_PROJECT_KEY, null);
    return active && typeof active === "object" ? [active] : [];
  }

  function legacyTrash() {
    const value = parseStorage(TRASH_KEY, []);
    return Array.isArray(value) ? value.filter(Boolean) : [];
  }

  function request(db, store, mode, action) {
    return new Promise((resolve, reject) => {
      let transaction;
      try {
        transaction = db.transaction(store, mode);
        const result = action(transaction.objectStore(store));
        // Request success precedes commit; quota/abort can still roll it back.
        transaction.oncomplete = () => resolve(result.result);
        transaction.onerror = () => reject(transaction.error || result.error || new Error("IndexedDB transaction failed."));
        transaction.onabort = () => reject(transaction.error || new Error("IndexedDB transaction aborted."));
        result.onerror = () => reject(result.error || new Error("IndexedDB request failed."));
      } catch (error) {
        reject(error);
      }
    });
  }

  function openDatabase() {
    if (typeof root.indexedDB === "undefined") return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const opening = root.indexedDB.open(DB_NAME, DB_VERSION);
      opening.onupgradeneeded = () => {
        const db = opening.result;
        if (!db.objectStoreNames.contains(PROJECT_STORE)) {
          const store = db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
          store.createIndex("rootKey", "rootKey", { unique: true });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(TRASH_STORE)) {
          const store = db.createObjectStore(TRASH_STORE, { keyPath: "id" });
          store.createIndex("rootKey", "rootKey", { unique: false });
        }
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: "key" });
      };
      opening.onsuccess = () => resolve(opening.result);
      opening.onerror = () => reject(opening.error || new Error("IndexedDB is unavailable."));
      opening.onblocked = () => reject(new Error("IndexedDB is blocked by another tab."));
    });
  }

  async function getMeta(db, key) {
    if (!db) return null;
    return request(db, META_STORE, "readonly", (store) => store.get(key));
  }

  async function setMeta(db, key, value) {
    if (!db) return false;
    await request(db, META_STORE, "readwrite", (store) => store.put({ key, value }));
    return true;
  }

  function record(project, extra = {}) {
    const source = project && typeof project === "object" ? { ...project } : {};
    const rootPath = String(source.rootPath || source.name || "project.p").trim() || "project.p";
    const id = String(source.id || extra.id || stableId(rootPath));
    source.id = id;
    return {
      id,
      rootKey: projectRoot(source),
      name: String(source.name || rootPath.replace(/\.p$/i, "") || "project"),
      updatedAt: Number(source.updatedAt) || Date.now(),
      createdAt: Number(source.createdAt) || Date.now(),
      fileCount: Array.isArray(source.files) ? source.files.length : 0,
      project: source,
      schemaVersion: 2,
      ...extra
    };
  }

  async function migrate(db) {
    if (!db) return false;
    const marker = await getMeta(db, "migration");
    if (marker?.value?.version >= 1) return true;
    const projects = legacyProjects().map((project) => record(project));
    const trash = legacyTrash().map((project, index) => record(project, {
      id: String(project.id || `trash-${index}-${createId(projectRoot(project))}`),
      deletedAt: Number(project.deletedAt) || Date.now(),
      deletedFrom: String(project.deletedFrom || "local")
    }));
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECT_STORE, TRASH_STORE, META_STORE], "readwrite");
      const projectStore = transaction.objectStore(PROJECT_STORE);
      const trashStore = transaction.objectStore(TRASH_STORE);
      projects.forEach((project) => projectStore.put(project));
      trash.forEach((project) => trashStore.put(project));
      transaction.objectStore(META_STORE).put({
        key: "migration",
        value: { version: 1, migratedAt: new Date().toISOString(), projectCount: projects.length, trashCount: trash.length }
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Project migration failed."));
      transaction.onabort = () => reject(transaction.error || new Error("Project migration was cancelled."));
    });
    return true;
  }

  async function all(db, storeName) {
    if (!db) return [];
    return request(db, storeName, "readonly", (store) => store.getAll());
  }

  let mirrorQueue = Promise.resolve();
  function mirrorLibrary() {
    // Serialize mirrors and read the committed source at execution time.
    // An older async write must not overwrite a newer snapshot or rollback.
    const operation = mirrorQueue.then(async () => {
      const db = await ready;
      if (!db) return false;
      const library = parseStorage(LOCAL_LIBRARY_KEY, null);
      if (!Array.isArray(library?.projects)) return false;
      const incoming = library.projects.map((project) => record(project));
      const trash = legacyTrash().map((project) => record(project, { deletedAt: project.deletedAt, deletedFrom: "local" }));
      await new Promise((resolve, reject) => {
        const transaction = db.transaction([PROJECT_STORE, TRASH_STORE], "readwrite");
        const store = transaction.objectStore(PROJECT_STORE);
        const trashStore = transaction.objectStore(TRASH_STORE);
        // Clear within the same transaction before inserts: replacing IDs or
        // swapping names must not collide with an old rootKey unique index.
        store.clear();
        trashStore.clear();
        incoming.forEach((project) => store.put(project));
        trash.forEach((project) => trashStore.put(project));
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error("Project repository update failed."));
        transaction.onabort = () => reject(transaction.error || new Error("Project repository update aborted."));
      });
      return true;
    });
    mirrorQueue = operation.catch(() => {});
    return operation;
  }

  async function listProjects(options = {}) {
    // Runtime and manager must read the same committed catalogue, including
    // an explicitly empty one. IDB is only a recovery source when absent.
    const legacy = parseStorage(options.trash ? TRASH_KEY : LOCAL_LIBRARY_KEY, null);
    if (options.trash ? Array.isArray(legacy) : Array.isArray(legacy?.projects)) {
      return (options.trash ? legacy : legacy.projects).map((project) => record(project,
        options.trash ? { deletedAt: project.deletedAt, deletedFrom: "local" } : {}));
    }
    const db = await ready;
    if (!db) return (options.trash ? legacyTrash() : legacyProjects()).map((project) => record(project));
    const values = await all(db, options.trash ? TRASH_STORE : PROJECT_STORE);
    return values.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base" }));
  }

  async function saveProject(project) {
    const db = await ready;
    if (!db) return false;
    await request(db, PROJECT_STORE, "readwrite", (store) => store.put(record(project)));
    return true;
  }

  async function trashProject(project) {
    const db = await ready;
    if (!db) return false;
    const value = record(project, { deletedAt: Date.now(), deletedFrom: "local" });
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECT_STORE, TRASH_STORE], "readwrite");
      transaction.objectStore(PROJECT_STORE).delete(value.id);
      transaction.objectStore(TRASH_STORE).put(value);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Project recycle operation failed."));
      transaction.onabort = () => reject(transaction.error || new Error("Project recycle operation aborted."));
    });
    return true;
  }

  async function restoreProject(project) {
    const db = await ready;
    if (!db) return false;
    const value = record(project, { deletedAt: undefined });
    delete value.deletedAt;
    delete value.deletedFrom;
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([PROJECT_STORE, TRASH_STORE], "readwrite");
      transaction.objectStore(PROJECT_STORE).put(value);
      transaction.objectStore(TRASH_STORE).delete(String(project.id));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Project restore failed."));
      transaction.onabort = () => reject(transaction.error || new Error("Project restore aborted."));
    });
    return true;
  }

  async function saveSession(session) {
    const db = await ready;
    if (!db) return false;
    await setMeta(db, "session", { version: 2, ...session, savedAt: Date.now() });
    return true;
  }

  async function loadSession() {
    const db = await ready;
    const value = await getMeta(db, "session");
    return value?.value || null;
  }

  let ready;
  try {
    ready = openDatabase().then(async (db) => {
      if (!db) return null;
      await migrate(db);
      return db;
    }).catch(() => null);
  } catch {
    ready = Promise.resolve(null);
  }

  root.WebMarsProjectRepository = Object.freeze({
    dbName: DB_NAME,
    ready,
    listProjects,
    saveProject,
    mirrorLibrary,
    trashProject,
    restoreProject,
    saveSession,
    loadSession,
    projectRoot
  });
})();
