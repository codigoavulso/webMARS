import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimePath = resolve(projectRoot, "assets/js/app-modules/20-app-runtime.js");

test("cloud mutations always carry an optimistic-locking token", async () => {
  const source = await readFile(runtimePath, "utf8");

  assert.match(
    source,
    /method: "PUT",[\s\S]*?headers: \{ "If-Match": versionToken \}/,
    "project saves must send the version they read"
  );
  assert.match(
    source,
    /method: "DELETE",\s*headers: \{ "If-Match": versionToken \}/,
    "project deletion must not remove a concurrently changed remote copy"
  );
  assert.match(
    source,
    /if \(!versionToken\) throw new Error\(translateText\("The cloud service did not provide a project version token\."\)\);/,
    "the client must fail closed when the server omits a token"
  );
});

test("cloud status refresh batches documents and compensates clock skew at the request midpoint", async () => {
  const source = await readFile(runtimePath, "utf8");

  assert.match(source, /listCloudProjects\(\{ includeDocuments: true \}\)/);
  assert.match(source, /"\/projects\?include=documents"/);
  assert.match(
    source,
    /serverTime - Math\.floor\(\(startedAt \+ receivedAt\) \/ 2\)/,
    "network latency must be split across the clock-offset estimate"
  );
  assert.match(
    source,
    /const projectRecord = remoteMeta\.project\s*\? remoteMeta\s*: await loadCloudProject\(remoteMeta\.id\);/,
    "batched documents must avoid one GET per project"
  );
});

test("project rename uses the same versioned remote record instead of duplicating it", async () => {
  const source = await readFile(runtimePath, "utf8");

  assert.match(source, /async function renameCloudProjectByName\(/);
  assert.match(
    source,
    /cloudRequestJson\(`\/projects\/\$\{remote\.id\}`,[\s\S]*?method: "PUT",[\s\S]*?headers: \{ "If-Match": versionToken \},[\s\S]*?body: \{ name: nextName \}/
  );
  assert.match(source, /await renameCloudProjectByName\(rootPath, nextRootPath\);/);
});

test("cloud project identity follows the client's case-insensitive project keys", async () => {
  const source = await readFile(runtimePath, "utf8");

  assert.match(source, /const key = normalizeProjectRootKey\(project\?\.name \|\| ""\);/);
  assert.doesNotMatch(source, /remoteByName\.get\(localProject\.rootPath\)/);
  assert.match(source, /remoteProjectsByName\.get\(normalizeProjectRootKey\(projectName\)\)/);
});
