(() => {
  const scope = typeof window !== "undefined" ? window : globalThis;
  const registry = scope.WebMarsModules || (scope.WebMarsModules = {});
  const rawConfig = scope.WebMarsConfig && typeof scope.WebMarsConfig === "object"
    ? scope.WebMarsConfig
    : {};

  function normalizeBasePath(value) {
    const raw = String(value || "/").trim().replace(/\\/g, "/");
    const surrounded = `/${raw.replace(/^\/+|\/+$/g, "")}`;
    return surrounded === "/" ? "/" : `${surrounded}/`;
  }

  function absoluteUrl(value, fallback = "") {
    const raw = String(value || "").trim();
    if (!raw) return fallback;
    try {
      return new URL(raw, scope.location?.origin || "http://localhost").href.replace(/\/+$/, "");
    } catch {
      return fallback;
    }
  }

  const appBasePath = normalizeBasePath(rawConfig.appBasePath);
  const locationOrigin = String(scope.location?.origin || "http://localhost").replace(/\/+$/, "");
  const publicBaseUrl = absoluteUrl(rawConfig.publicBaseUrl, `${locationOrigin}${appBasePath}`.replace(/\/+$/, ""));
  const legacyCloudBase = scope.WebMarsCloudConfig && typeof scope.WebMarsCloudConfig === "object"
    ? scope.WebMarsCloudConfig.baseUrl
    : "";
  const backMarsApiBase = absoluteUrl(rawConfig.backMarsApiBase || legacyCloudBase, `${locationOrigin}/api`);
  const exampleIdPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
  const publicationSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  function safeDecode(value) {
    try {
      return decodeURIComponent(String(value || ""));
    } catch {
      return "";
    }
  }

  function stripAppBase(pathname) {
    const path = String(pathname || "/").replace(/\\/g, "/");
    if (appBasePath === "/") return path.startsWith("/") ? path : `/${path}`;
    const baseWithoutSlash = appBasePath.replace(/\/$/, "");
    if (path === baseWithoutSlash) return "/";
    if (!path.startsWith(appBasePath)) return "";
    return `/${path.slice(appBasePath.length).replace(/^\/+/, "")}`;
  }

  function parsePublicationToken(value) {
    const decoded = safeDecode(value).trim().toLowerCase();
    if (!decoded) return null;
    const match = decoded.match(/^([^@]+?)(?:@(\d+))?$/);
    if (!match || !publicationSlugPattern.test(match[1]) || match[1].length > 64) return null;
    const revision = match[2] ? Number.parseInt(match[2], 10) : null;
    if (revision !== null && (!Number.isSafeInteger(revision) || revision < 1)) return null;
    return { slug: match[1], revision };
  }

  function parseRouteText(routeText) {
    const normalized = String(routeText || "").replace(/^#/, "").replace(/^\/+|\/+$/g, "");
    const [kind, ...rest] = normalized.split("/");
    const token = rest.join("/");
    if (kind === "e") {
      const id = safeDecode(token).trim().toLowerCase();
      return exampleIdPattern.test(id) ? { kind: "example", id } : { kind: "invalid", route: "example" };
    }
    if (kind === "p") {
      const parsed = parsePublicationToken(token);
      return parsed ? { kind: "publication", ...parsed } : { kind: "invalid", route: "publication" };
    }
    return null;
  }

  function parseLaunchRoute(locationValue = scope.location) {
    const locationLike = locationValue || {};
    const path = stripAppBase(locationLike.pathname || "/");
    const fromPath = path ? parseRouteText(path) : null;
    if (fromPath) return fromPath;

    const hash = String(locationLike.hash || "");
    if (/^#\/?(?:e|p)\//.test(hash)) {
      return parseRouteText(hash);
    }

    let params;
    try {
      params = new URLSearchParams(String(locationLike.search || ""));
    } catch {
      return null;
    }
    const example = String(params.get("example") || "").trim().toLowerCase();
    if (example) {
      return exampleIdPattern.test(example) ? { kind: "example", id: example } : { kind: "invalid", route: "example" };
    }
    const publication = String(params.get("publication") || "").trim();
    if (publication) {
      const revision = String(params.get("revision") || "").trim();
      const parsed = parsePublicationToken(revision ? `${publication}@${revision}` : publication);
      return parsed ? { kind: "publication", ...parsed } : { kind: "invalid", route: "publication" };
    }
    return null;
  }

  function routeUrl(kind, token) {
    const base = `${publicBaseUrl}/`.replace(/\/+$/, "/");
    const encoded = encodeURIComponent(String(token || ""));
    // `@N` is part of the documented, human-readable pinned-revision format.
    // Slugs contain only lowercase ASCII, so preserving this delimiter is safe.
    return new URL(`${kind}/${kind === "p" ? encoded.replace(/%40/gi, "@") : encoded}`, base).href;
  }

  function buildExampleUrl(id) {
    const normalized = String(id || "").trim().toLowerCase();
    if (!exampleIdPattern.test(normalized)) return "";
    return routeUrl("e", normalized);
  }

  function buildPublicationUrl(slug, revision = null) {
    const parsed = parsePublicationToken(`${String(slug || "").trim()}${revision ? `@${revision}` : ""}`);
    if (!parsed) return "";
    return routeUrl("p", `${parsed.slug}${parsed.revision ? `@${parsed.revision}` : ""}`);
  }

  function publicationApiPath(slug, revision = null) {
    const parsed = parsePublicationToken(`${String(slug || "").trim()}${revision ? `@${revision}` : ""}`);
    if (!parsed) return "";
    const base = `/publications/${encodeURIComponent(parsed.slug)}`;
    return parsed.revision ? `${base}/revisions/${parsed.revision}` : base;
  }

  function normalizeExampleRegistry(value) {
    const entries = Array.isArray(value) ? value : value?.entries;
    if (!Array.isArray(entries)) return [];
    const seen = new Set();
    return entries.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const id = String(entry.id || "").trim().toLowerCase();
      const status = String(entry.status || "").trim().toLowerCase();
      const redirectTo = String(entry.redirectTo || "").trim().toLowerCase();
      if (!exampleIdPattern.test(id) || seen.has(id) || !["active", "retired"].includes(status)) return [];
      seen.add(id);
      return [{
        id,
        status,
        redirectTo: status === "retired" && exampleIdPattern.test(redirectTo) ? redirectTo : ""
      }];
    });
  }

  function resolveExampleRegistryId(value, registryValue) {
    const requestedId = String(value || "").trim().toLowerCase();
    if (!exampleIdPattern.test(requestedId)) return { status: "unknown", id: requestedId };
    const entries = normalizeExampleRegistry(registryValue);
    const byId = new Map(entries.map((entry) => [entry.id, entry]));
    if (!byId.has(requestedId)) return { status: "unknown", id: requestedId };

    const visited = new Set();
    let currentId = requestedId;
    while (!visited.has(currentId)) {
      visited.add(currentId);
      const entry = byId.get(currentId);
      if (!entry) return { status: "retired", id: requestedId };
      if (entry.status === "active") {
        return { status: "active", id: currentId, redirected: currentId !== requestedId };
      }
      if (!entry.redirectTo) return { status: "retired", id: requestedId };
      currentId = entry.redirectTo;
    }
    return { status: "retired", id: requestedId };
  }

  function hasNextPublicationPage(payload, pageSize) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, "hasMore")) {
      return payload.hasMore === true;
    }
    const publications = Array.isArray(payload?.publications) ? payload.publications : [];
    return publications.length === pageSize;
  }

  async function requestJson(path, options = {}) {
    const method = String(options.method || "GET").trim().toUpperCase() || "GET";
    const relative = String(path || "").trim();
    const url = /^https?:\/\//i.test(relative)
      ? relative
      : `${backMarsApiBase}${relative.startsWith("/") ? relative : `/${relative}`}`;
    const headers = {
      Accept: "application/json",
      ...(options.headers && typeof options.headers === "object" ? options.headers : {})
    };
    const hasBody = Object.prototype.hasOwnProperty.call(options, "body");
    if (hasBody && !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
      headers["Content-Type"] = "application/json";
    }
    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        credentials: options.authenticated === false ? "omit" : "include",
        mode: /^https?:\/\//i.test(url) ? "cors" : "same-origin",
        signal: options.signal,
        body: hasBody ? (typeof options.body === "string" ? options.body : JSON.stringify(options.body)) : undefined
      });
    } catch (cause) {
      const error = new Error(`Could not reach this installation's BackMars service at ${backMarsApiBase}.`);
      error.cause = cause;
      throw error;
    }
    const rawText = await response.text();
    let payload = null;
    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const error = new Error(String(payload?.error || `HTTP ${response.status}`));
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  registry.publicLibrary = Object.freeze({
    config: Object.freeze({
      instanceName: String(rawConfig.instanceName || scope.location?.hostname || "webMARS"),
      appBasePath,
      publicBaseUrl,
      backMarsApiBase,
      allowBackMarsOverride: rawConfig.allowBackMarsOverride === true,
      manualUrl: absoluteUrl(rawConfig.manualUrl, ""),
      supportUrl: absoluteUrl(rawConfig.supportUrl, "")
    }),
    parseLaunchRoute,
    parsePublicationToken,
    buildExampleUrl,
    buildPublicationUrl,
    publicationApiPath,
    normalizeExampleRegistry,
    resolveExampleRegistryId,
    hasNextPublicationPage,
    requestJson
  });
})();
