import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { resolve } from "node:path";

import { projectRoot } from "./helpers/engines.mjs";
import { isStableAppRoute } from "../scripts/serve.mjs";

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
  const runtime = await readFile(
    resolve(projectRoot, "assets", "js", "app-modules", "20-app-runtime.js"),
    "utf8"
  );
  assert.match(runtime, /async function editOwnPublication\(publication\)/);
  assert.match(runtime, /method: "PUT"/);
  assert.match(runtime, /value: "published"[\s\S]*value: "unlisted"/);
  assert.match(runtime, /publication\.status === "archived" \? publication\.latestRevision : null/);
  assert.match(runtime, /Restore this publication before adding a revision/);
  assert.match(runtime, /`\/publications\/mine\?\$\{params\}`/);
  assert.match(runtime, /payload\?\.hasMore === true/);
  assert.match(runtime, /selected === "__previous__"/);
  assert.match(runtime, /selected === "__next__"/);
});
