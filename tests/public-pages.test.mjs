import assert from "node:assert/strict";
import { readFile, stat, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateDocumentReferences } from "../scripts/package-release.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const topics = ["", "learn/", "teach/", "stack/", "pipeline/", "minic/", "privacy/"];
test("public pages are indexable, linked, bilingual and version-aligned", async () => {
  const version = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")).version;
  const registry = JSON.parse(await readFile(resolve(root, "examples/stable-ids.json"), "utf8"));
  const active = new Set(registry.entries.filter((entry) => entry.status === "active").map((entry) => entry.id));
  for (const languagePath of ["", "pt/"]) {
    for (const topic of topics) {
      const path = `discover/${languagePath}${topic}`;
      const html = await readFile(resolve(root, path, "index.html"), "utf8");
      assert.match(html, /<h1>[^<]+<\/h1>/);
      assert.match(html, /<meta name="description" content="[^"]+"/);
      assert.match(html, /hreflang="en"/);
      assert.match(html, /hreflang="pt"/);
      assert.match(html, /Nelson Ferreira/);
      assert.match(html, /data-launch-app/);
      assert.ok(html.includes(`MIPS / ${version}`));
      const canonical = /rel="canonical" href="([^"]+)"/.exec(html)?.[1];
      assert.equal(canonical, `https://webmars.nfiles.top/${path}`);
      const schema = JSON.parse(/<script type="application\/l[d]\+json">([^<]+)<\/script>/.exec(html)[1]);
      assert.equal(schema.url, canonical);
      for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
        const href = match[1];
        if (href.startsWith("#") || /^https?:/.test(href)) continue;
        const pathname = new URL(href, canonical).pathname;
        if (pathname.startsWith("/e/")) {
          assert.ok(active.has(pathname.slice(3)), `Unknown built-in example ${pathname}`);
        } else {
          const info = await stat(resolve(root, pathname.slice(1)));
          assert.ok(info.isFile() || info.isDirectory(), `${path}: ${href}`);
        }
      }
    }
  }
  const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, 15);
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
  assert.match(packaging, /root: "discover"/);
  assert.match(packaging, /"sitemap.xml"/);
  const index = await readFile(resolve(root, "index.html"), "utf8");
  assert.match(index, /href="\.\/discover\/learn\/"/);
  assert.match(index, /<noscript>/);
  const config = await readFile(resolve(root, "webmars-config.js"), "utf8");
  assert.match(config, /metrics: Object.freeze\(\{ enabled: official/);
});
