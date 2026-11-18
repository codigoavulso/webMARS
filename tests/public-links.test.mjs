import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";

import { projectRoot } from "./helpers/engines.mjs";
import { writeReleaseBuild } from "../scripts/package-release.mjs";
import { createStaticServer, isStableAppRoute, server } from "../scripts/serve.mjs";

test("the source checkout serves fresh entry pages without claiming a packaged build", async () => {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options) => fetch(base + path, options);
  try {
    for (const path of ["/", "/e/lesson01-registers", "/p/first-lab@3", "/manual/", "/webmars-config.js"]) {
      const response = await request(path, { method: "HEAD" });
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get("cache-control"), "no-store", path);
      assert.equal(response.headers.get("etag"), null, path);
      const fresh = await request(path, { method: "HEAD", headers: { "If-None-Match": 'W/"5e0be100-2bb8"' } });
      assert.equal(fresh.status, 200, path);
    }

    const asset = "/assets/js/app.bundle.js";
    for (const query of ["", "?b=invalid"]) {
      const response = await request(asset + query, { method: "HEAD" });
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
    const entry = await request("/");
    const html = await entry.text();
    const builds = [...html.matchAll(/(?:\?|&amp;)b=(\d{6}\.\d{2}\.\d{4})"/g)].map((match) => match[1]);
    assert.equal(builds.length, 6);
    assert.equal(new Set(builds).size, 1);
    assert.match(html, /<meta name="webmars-build-id" content="">/);
    const manifest = await request("/build.json", { method: "HEAD" });
    assert.equal(manifest.status, 404);
    assert.equal(manifest.headers.get("cache-control"), "no-store");
    const versioned = await request(`${asset}?b=${builds[0]}`, { method: "HEAD" });
    assert.equal(versioned.headers.get("cache-control"), "no-store");
    const missing = await request(`/tools/nonexistent.js?b=${builds[0]}`);
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get("cache-control"), "no-store");
    await missing.text();
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("packaged deployments receive distinct identities and never serve current bytes under a stale identity", async (t) => {
  const directory = await mkdtemp(resolve(tmpdir(), "webmars-deployment-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const shell = await readFile(resolve(projectRoot, "index.html"));
  const manual = await readFile(resolve(projectRoot, "manual/index.html"));
  const version = await readFile(resolve(projectRoot, "assets/js/app-version.js"));
  const fixedDate = new Date("2020-01-01T00:00:00Z");
  const files = ["assets/js/app-version.js", "index.html", "assets/js/app.bundle.js", "webmars-config.js", "manual/index.html"];
  async function createRelease(name, module) {
    const root = resolve(directory, name);
    await mkdir(resolve(root, "assets/js"), { recursive: true });
    await mkdir(resolve(root, "manual"), { recursive: true });
    await writeFile(resolve(root, "index.html"), shell);
    await writeFile(resolve(root, "manual/index.html"), manual);
    await writeFile(resolve(root, "assets/js/app-version.js"), version);
    await writeFile(resolve(root, "assets/js/app.bundle.js"), module);
    await writeFile(resolve(root, "webmars-config.js"), module);
    const build = await writeReleaseBuild(files, root);
    for (const file of ["index.html", "build.json"]) {
      await utimes(resolve(root, file), fixedDate, fixedDate);
    }
    return { root, ...build };
  }

  const first = await createRelease("first", "window.generation = 'A';");
  const identical = await createRelease("identical", "window.generation = 'A';");
  const second = await createRelease("second", "window.generation = 'B';");
  assert.equal(first.id, identical.id);
  assert.equal(first.build, second.build);
  assert.notEqual(first.id, second.id);
  assert.match(second.id, /^[a-f0-9]{64}$/);

  const instance = createStaticServer(second.root);
  instance.listen(0, "127.0.0.1");
  await once(instance, "listening");
  t.after(() => new Promise((resolve, reject) => instance.close((error) => error ? reject(error) : resolve())));
  const request = (path, headers) => fetch(`http://127.0.0.1:${instance.address().port}${path}`, { headers });
  const oldValidators = { "If-None-Match": 'W/"5e0be100-2bb8"', "If-Modified-Since": fixedDate.toUTCString() };
  const manifest = await request("/build.json", oldValidators);
  assert.equal(manifest.status, 200);
  assert.equal(manifest.headers.get("cache-control"), "no-store");
  assert.deepEqual(await manifest.json(), { id: second.id, build: second.build });
  const packagedManual = await (await request("/manual/")).text();
  assert.ok(packagedManual.includes('<meta name="webmars-surface" content="manual">'));
  assert.ok(packagedManual.includes(`../assets/js/usage-metrics.js?b=${second.id}`));
  assert.ok(packagedManual.includes(`../webmars-config.js?b=${second.id}`));
  const entry = await request(`/e/lesson01-registers?__webmars_update=${second.id}`, oldValidators);
  assert.equal(entry.status, 200);
  assert.equal(entry.headers.get("cache-control"), "no-store");
  const html = await entry.text();
  assert.ok(html.includes(`<meta name="webmars-build-id" content="${second.id}">`));
  assert.deepEqual([...html.matchAll(/(?:\?|&amp;)b=([a-f0-9]{64})"/g)].map((match) => match[1]), Array(6).fill(second.id));

  const old = await request(`/assets/js/app.bundle.js?b=${first.id}`);
  assert.equal(old.status, 404);
  assert.equal(old.headers.get("cache-control"), "no-store");
  await old.text();
  const current = await request(`/assets/js/app.bundle.js?b=${second.id}`);
  assert.equal(current.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(await current.text(), "window.generation = 'B';");
  const config = await request(`/webmars-config.js?b=${second.id}`);
  assert.equal(config.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.equal(await config.text(), "window.generation = 'B';");
});

async function loadPublicLibraryModule() {
  const source = await readFile(
    resolve(projectRoot, "assets", "js", "app-modules", "19-public-library.js"),
    "utf8"
  );
  const window = {
    location: {
      origin: "https://university.example",
      pathname: "/lab/",
      search: "",
      hash: ""
    },
    WebMarsModules: {},
    WebMarsConfig: {
      instanceName: "University Lab",
      appBasePath: "/lab/",
      publicBaseUrl: "https://university.example/lab/",
      backMarsApiBase: "https://university.example/backmars/api"
    }
  };
  vm.runInNewContext(source, { window, URL, URLSearchParams, fetch: async () => null });
  return window.WebMarsModules.publicLibrary;
}

async function loadDeploymentConfig(hostname, origin) {
  const source = await readFile(resolve(projectRoot, "webmars-config.js"), "utf8");
  const window = { location: { hostname, origin, protocol: new URL(origin).protocol } };
  vm.runInNewContext(source, { window });
  return plain(window.WebMarsConfig);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("stable example and publication routes parse under a deployment base path", async () => {
  const library = await loadPublicLibraryModule();
  assert.deepEqual(
    plain(library.parseLaunchRoute({ pathname: "/lab/e/lesson01-registers", search: "", hash: "" })),
    { kind: "example", id: "lesson01-registers" }
  );
  assert.deepEqual(
    plain(library.parseLaunchRoute({ pathname: "/lab/p/first-lab@3", search: "", hash: "" })),
    { kind: "publication", slug: "first-lab", revision: 3 }
  );
  assert.deepEqual(
    plain(library.parseLaunchRoute({ pathname: "/lab/e/lesson01-registers/", search: "", hash: "" })),
    { kind: "example", id: "lesson01-registers" }
  );
  assert.deepEqual(
    plain(library.parseLaunchRoute({ pathname: "/lab/p/first-lab@3/", search: "", hash: "" })),
    { kind: "publication", slug: "first-lab", revision: 3 }
  );
  assert.deepEqual(
    plain(library.parseLaunchRoute({ pathname: "/lab/", search: "", hash: "#/p/first-lab@2" })),
    { kind: "publication", slug: "first-lab", revision: 2 }
  );
  assert.equal(
    library.parseLaunchRoute({ pathname: "/other/e/lesson01-registers", search: "", hash: "" }),
    null
  );
});

test("local BackMars keeps the browser hostname so session cookies remain same-site", async () => {
  const byName = await loadDeploymentConfig("localhost", "http://localhost:8080");
  const byAddress = await loadDeploymentConfig("127.0.0.1", "http://127.0.0.1:8080");

  assert.equal(byName.backMarsApiBase, "http://localhost:5000/api");
  assert.equal(byAddress.backMarsApiBase, "http://127.0.0.1:5000/api");
});

test("pinned links keep the documented @N delimiter and reject invalid tokens", async () => {
  const library = await loadPublicLibraryModule();
  assert.equal(
    library.buildExampleUrl("lesson01-registers"),
    "https://university.example/lab/e/lesson01-registers"
  );
  assert.equal(
    library.buildPublicationUrl("first-lab", 3),
    "https://university.example/lab/p/first-lab@3"
  );
  assert.equal(library.buildPublicationUrl("../private", 1), "");
  assert.equal(library.publicationApiPath("first-lab", 3), "/publications/first-lab/revisions/3");
});

test("public browse pagination trusts an explicit hasMore result", async () => {
  const library = await loadPublicLibraryModule();
  const fullPage = { publications: Array.from({ length: 50 }, (_, index) => ({ slug: `item-${index}` })) };

  assert.equal(library.hasNextPublicationPage({ ...fullPage, hasMore: false }, 50), false);
  assert.equal(library.hasNextPublicationPage({ ...fullPage, hasMore: true }, 50), true);
  assert.equal(library.hasNextPublicationPage(fullPage, 50), true, "old BackMars remains navigable");
  assert.equal(library.hasNextPublicationPage({ publications: fullPage.publications.slice(0, 49) }, 50), false);
});

test("retired stable example IDs resolve through redirects without loops", async () => {
  const library = await loadPublicLibraryModule();
  const registry = {
    entries: [
      { id: "old-lab", status: "retired", redirectTo: "middle-lab" },
      { id: "middle-lab", status: "retired", redirectTo: "current-lab" },
      { id: "current-lab", status: "active" },
      { id: "gone-lab", status: "retired" },
      { id: "loop-a", status: "retired", redirectTo: "loop-b" },
      { id: "loop-b", status: "retired", redirectTo: "loop-a" }
    ]
  };

  assert.deepEqual(
    plain(library.resolveExampleRegistryId("OLD-LAB", registry)),
    { status: "active", id: "current-lab", redirected: true }
  );
  assert.deepEqual(plain(library.resolveExampleRegistryId("current-lab", registry)), {
    status: "active", id: "current-lab", redirected: false
  });
  assert.deepEqual(plain(library.resolveExampleRegistryId("gone-lab", registry)), {
    status: "retired", id: "gone-lab"
  });
  assert.deepEqual(plain(library.resolveExampleRegistryId("loop-a", registry)), {
    status: "retired", id: "loop-a"
  });
  assert.deepEqual(plain(library.resolveExampleRegistryId("unknown-lab", registry)), {
    status: "unknown", id: "unknown-lab"
  });
});

test("the runtime does not reopen tombstoned examples left in an old manifest", async () => {
  const runtime = await readFile(
    resolve(projectRoot, "assets", "js", "app-modules", "20-app-runtime.js"),
    "utf8"
  );
  const routeHandler = runtime.slice(runtime.indexOf("async function handleLaunchRoute"));
  assert.match(routeHandler, /if \(stableExampleRegistryEntries\.length\)/);
  assert.match(routeHandler, /registryResolution\.status !== "active"/);
  assert.match(routeHandler, /registryResolution\.status !== "active"[\s\S]*?return true;/);
});

test("the development server falls back only for valid stable application routes", () => {
  assert.equal(isStableAppRoute("/e/lesson01-registers"), true);
  assert.equal(isStableAppRoute("/p/first-lab@3"), true);
  assert.equal(isStableAppRoute("/p/first-lab%403"), true);
  assert.equal(isStableAppRoute("/assets/missing.js"), false);
  assert.equal(isStableAppRoute("/p/../secret"), false);
  assert.equal(isStableAppRoute("/anything/else"), false);
});

test("built-in example IDs are pinned by a permanent registry", async () => {
  const manifest = JSON.parse(await readFile(resolve(projectRoot, "examples", "examples.json"), "utf8"));
  const registry = JSON.parse(await readFile(resolve(projectRoot, "examples", "stable-ids.json"), "utf8"));
  const ids = registry.entries.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length, "stable IDs must never be duplicated or reused");
  assert.match(registry.policy, /never removed or reused/i);

  const active = new Map(
    registry.entries
      .filter((entry) => entry.status === "active")
      .map((entry) => [entry.id, entry.path])
  );
  assert.deepEqual(
    [...active.entries()].sort(),
    manifest.examples.map((entry) => [entry.id, entry.path]).sort(),
    "removing or renaming an active stable ID requires retaining a tombstone or redirect"
  );
  for (const entry of registry.entries) {
    assert.ok(["active", "retired"].includes(entry.status));
    if (entry.status === "retired" && entry.redirectTo) {
      assert.ok(ids.includes(entry.redirectTo), `unknown redirect target ${entry.redirectTo}`);
    }
  }
});

test("public copies require interchange version 1 and foreign origins are refused", async () => {
  const runtime = await readFile(
    resolve(projectRoot, "assets", "js", "app-modules", "20-app-runtime.js"),
    "utf8"
  );
  assert.match(runtime, /Number\(payload\.version\) !== 1/);
  assert.match(runtime, /supplied\.origin !== configured\.origin/);
  assert.match(runtime, /const token = raw\.replace/);
});

test("owners can edit visibility, restore archives and preserve pinned access", async () => {
  const manager = await readFile(resolve(projectRoot, "assets", "js", "app-modules", "21-project-manager.js"), "utf8");
  const runtime = await readFile(
    resolve(projectRoot, "assets", "js", "app-modules", "20-app-runtime.js"),
    "utf8"
  );
  assert.match(runtime, /async function editOwnPublication\(publication\)/);
  assert.match(runtime, /method: "PUT"/);
  assert.match(runtime, /value: "published"[\s\S]*value: "unlisted"/);
  assert.match(runtime, /publication\.status === "archived" \? publication\.latestRevision : null/);
  assert.match(runtime, /Restore this publication before adding a revision/);
  assert.match(manager, /owned \? "\/publications\/mine" : "\/publications"/);
  assert.match(manager, /hasMore: Boolean\(payload\?\.hasMore\)/);
  assert.match(manager, /id: "copy-latest"/);
  assert.match(manager, /id: "copy-pinned"/);
  assert.match(manager, /id: "revision"/);
  assert.match(manager, /id: "archive"/);
});
