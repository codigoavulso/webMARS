import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateDocumentReferences } from "../scripts/package-release.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
test("the app is the canonical entry in the sitemap", async () => {
  const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
  assert.deepEqual([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]), ["https://webmars.nfiles.top/"]);
  assert.match(await readFile(resolve(root, "robots.txt"), "utf8"), /Sitemap: https:\/\/webmars.nfiles.top\/sitemap.xml/);
});

test("packaging accepts registered example routes and rejects missing or retired targets", async () => {
  const fixture = await mkdtemp(resolve(tmpdir(), "webmars-public-routes-"));
  try {
    await mkdir(resolve(fixture, "examples"));
    await writeFile(resolve(fixture, "examples/stable-ids.json"), JSON.stringify({ entries: [
      { id: "lesson01-registers", status: "active" }, { id: "retired", status: "tombstone" }
    ] }));
    const files = ["index.html", "examples/stable-ids.json"];
    await writeFile(resolve(fixture, "index.html"), '<a href="./e/lesson01-registers">Lesson</a>');
    await validateDocumentReferences(fixture, files);
    for (const target of ["e/unknown", "e/retired", "missing.css"]) {
      await writeFile(resolve(fixture, "index.html"), `<a href="./${target}">Missing</a>`);
      await assert.rejects(validateDocumentReferences(fixture, files), /Broken packaged reference/);
    }
  } finally { await rm(fixture, { recursive: true, force: true }); }
});

test("public files ship in release allowlist and root exposes learning links without script", async () => {
  const packaging = await readFile(resolve(root, "scripts/package-release.mjs"), "utf8");
  assert.match(packaging, /"sitemap.xml"/);
  const index = await readFile(resolve(root, "index.html"), "utf8");
  assert.match(index, /href="\.\/manual\/"/);
  assert.match(index, /href="\.\/help\/en\/info\.html"/);
  assert.match(index, /<noscript>/);
  const config = await readFile(resolve(root, "webmars-config.js"), "utf8");
  assert.match(config, /metrics: Object.freeze\(\{ enabled: official/);
});
