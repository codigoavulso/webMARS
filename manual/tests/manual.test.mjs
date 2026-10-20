import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chapters, CHAPTER_ORDER, MANUAL, TOOL_DATA } from "../content/index.mjs";

const manualRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = join(manualRoot, "dist");

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const light = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const dark = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (light + 0.05) / (dark + 0.05);
}

function cssTokens(block) {
  return new Map([...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((match) => [match[1], match[2]]));
}

async function listFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, path));
    else if (entry.isFile()) files.push(relative(root, path).replaceAll("\\", "/"));
  }
  return files.sort();
}

test("manual and product versions are explicit, independent and locked", async () => {
  const packageData = await readJson(join(manualRoot, "package.json"));
  const productLock = await readJson(join(manualRoot, "product-lock.json"));
  const versionFile = (await readFile(join(manualRoot, "VERSION"), "utf8")).trim();

  assert.equal(packageData.version, MANUAL.version);
  assert.equal(versionFile, MANUAL.version);
  assert.equal(productLock.schemaVersion, 1);
  assert.equal(productLock.manual.name, packageData.name);
  assert.equal(productLock.manual.version, packageData.version);
  assert.equal(productLock.product.name, "webmars");
  assert.equal(productLock.product.version, MANUAL.webmarsVersion);
  assert.notEqual(packageData.version, productLock.product.version);

  if (productLock.product.verificationStatus === "verified") {
    assert.match(productLock.product.verifiedCommit, /^[0-9a-f]{40}$/);
    assert.match(productLock.product.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(MANUAL.verifiedCommit, productLock.product.verifiedCommit);
    assert.equal(MANUAL.verifiedAt, productLock.product.verifiedAt);
  } else {
    assert.equal(productLock.product.verificationStatus, "pending");
    assert.equal(productLock.product.verifiedCommit, null);
    assert.equal(productLock.product.verifiedAt, null);
    assert.match(MANUAL.verifiedCommit, /^PENDING-/);
    assert.match(MANUAL.verifiedAt, /^PENDING-/);
  }
});

test("chapter order is explicit, exhaustive and stable", () => {
  assert.deepEqual(chapters.map((chapter) => chapter.id), [...CHAPTER_ORDER]);
  assert.equal(CHAPTER_ORDER.length, 25);
  assert.deepEqual(CHAPTER_ORDER.slice(14, 21), [
    "cloud",
    "biblioteca-publica",
    "preferencias-acessibilidade",
    "aprender-ensinar",
    "resolucao-problemas",
    "kit-docente",
    "administrar-estender"
  ]);
  assert.equal(CHAPTER_ORDER[21], "estatisticas-utilizacao");
});

test("chapter and section routes are unique and substantive", () => {
  assert.ok(chapters.length >= 20, `expected >=20 pages, got ${chapters.length}`);
  const chapterIds = new Set();
  let sectionCount = 0;
  for (const chapter of chapters) {
    assert.match(chapter.id, /^[a-z0-9-]+$/);
    assert.ok(!chapterIds.has(chapter.id), `duplicate chapter ${chapter.id}`);
    chapterIds.add(chapter.id);
    assert.ok(chapter.title && chapter.summary && chapter.intro);
    assert.ok(Array.isArray(chapter.sections) && chapter.sections.length >= 2, chapter.id);
    const sectionIds = new Set();
    for (const section of chapter.sections) {
      assert.match(section.id, /^[a-z0-9-]+$/);
      assert.ok(!sectionIds.has(section.id), `duplicate ${chapter.id}/${section.id}`);
      sectionIds.add(section.id);
      assert.ok(section.title.length >= 3);
      assert.ok(section.content.length >= 80, `thin section ${chapter.id}/${section.id}`);
      sectionCount += 1;
    }
  }
  assert.ok(sectionCount >= 125, `expected >=125 sections, got ${sectionCount}`);
});

test("all internal manual links resolve", () => {
  const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  for (const chapter of chapters) {
    const combined = chapter.sections.map((section) => section.content).join("\n");
    for (const match of combined.matchAll(/href=["']#\/([^"']+)["']/g)) {
      const [targetChapter, ...targetSectionParts] = match[1].split("/");
      const target = chaptersById.get(targetChapter);
      assert.ok(target, `broken chapter link ${chapter.id} -> ${match[1]}`);
      const targetSection = targetSectionParts.join("/");
      if (targetSection) {
        assert.ok(target.sections.some((section) => section.id === targetSection), `broken section link ${chapter.id} -> ${match[1]}`);
      }
    }
  }
});

test("every product tool in the vendored manifest has an individual section", async () => {
  const manifest = await readJson(join(manualRoot, "data", "tool-manifest.json"));
  const manifestIds = manifest.tools.map((tool) => tool.id).sort();
  const documentedIds = TOOL_DATA.map((tool) => tool.id).sort();
  assert.equal(manifestIds.length, 20);
  assert.deepEqual(documentedIds, manifestIds);
  const chapter = chapters.find((entry) => entry.id === "ferramentas");
  for (const id of manifestIds) assert.ok(chapter.sections.some((section) => section.id === id), id);
});

test("vendored product catalogs match their hashes and declared counts", async () => {
  const productLock = await readJson(join(manualRoot, "product-lock.json"));
  assert.deepEqual(Object.keys(productLock.catalogs).sort(), ["helpReference", "syscalls", "toolManifest"]);
  for (const entry of Object.values(productLock.catalogs)) {
    const bytes = await readFile(join(manualRoot, entry.file));
    assert.equal(sha256(bytes), entry.sha256, entry.file);
    assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  }

  const help = await readJson(join(manualRoot, productLock.catalogs.helpReference.file));
  const syscalls = await readJson(join(manualRoot, productLock.catalogs.syscalls.file));
  const tools = await readJson(join(manualRoot, productLock.catalogs.toolManifest.file));
  assert.equal(help.basicInstructions.length, productLock.catalogs.helpReference.counts.basicInstructions);
  assert.equal(help.extendedInstructions.length, productLock.catalogs.helpReference.counts.extendedInstructions);
  assert.equal(help.directives.length, productLock.catalogs.helpReference.counts.directives);
  assert.equal(syscalls.length, productLock.catalogs.syscalls.counts.entries);
  assert.equal(tools.tools.length, productLock.catalogs.toolManifest.counts.tools);
  assert.deepEqual(productLock.catalogs.helpReference.counts, {
    basicInstructions: 157,
    extendedInstructions: 388,
    directives: 20
  });
  assert.equal(syscalls.length, 39);
  assert.ok(syscalls.some((entry) => entry.number === 10 && entry.name === "Exit"));
  assert.equal(tools.tools.length, 20);
});

test("normal build and browser runtime use only Manual-local product data", async () => {
  const build = await readFile(join(manualRoot, "scripts", "build.mjs"), "utf8");
  const runtime = await readFile(join(manualRoot, "assets", "manual.js"), "utf8");
  const packageData = await readJson(join(manualRoot, "package.json"));
  const vendor = await readFile(join(manualRoot, "scripts", "vendor-product-data.mjs"), "utf8");

  assert.doesNotMatch(build, /projectRoot|help\/pt\/help-reference|assets\/js\/reference|tools\/tools\.json/);
  assert.doesNotMatch(runtime, /\.\.\/help\/|\.\.\/tools\/|\.\.\/assets\/js\/reference/);
  assert.match(runtime, /\.\/data\/help-reference\.json/);
  assert.match(runtime, /\.\/data\/syscalls\.json/);
  assert.equal(packageData.scripts["vendor:product"], "node scripts/vendor-product-data.mjs");
  assert.match(vendor, /--commit/);
  assert.match(vendor, /git/);
});

test("the standalone distribution contains metadata, configuration and accessible assets", async () => {
  const required = [
    "index.html",
    "manual-config.js",
    "LICENSE",
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "SCREENSHOTS.md",
    "VERSION",
    "product-lock.json",
    "version.json",
    "assets/manual.css",
    "assets/manual.js",
    "assets/favicon.ico",
    "assets/screenshots/workspace-overview-light.png",
    "content/index.mjs",
    "data/help-reference.json",
    "data/syscalls.json",
    "data/tool-manifest.json",
    "teacher-kit/README.md",
    "teacher-kit/migration.md",
    "teacher-kit/first-class.md",
    "teacher-kit/lms-copy.txt",
    "teacher-kit/publishing-stable-links.md",
    "teacher-kit/self-hosting-privacy.md"
  ];
  for (const path of required) await access(join(distRoot, path));

  const index = await readFile(join(distRoot, "index.html"), "utf8");
  const runtime = await readFile(join(distRoot, "assets", "manual.js"), "utf8");
  assert.match(index, /lang="pt-PT"/);
  assert.match(index, /class="skip-link"/);
  assert.match(index, /aria-live="polite"/);
  assert.match(index, /type="module"/);
  assert.match(index, /id="manual-support-link"/);
  assert.match(runtime, /WebMarsManualConfig\?\.supportUrl/);

  const version = await readJson(join(distRoot, "version.json"));
  const lock = await readJson(join(distRoot, "product-lock.json"));
  assert.equal(version.manual, lock.manual.version);
  assert.equal(version.webmars, lock.product.version);
  assert.equal(version.verificationStatus, lock.product.verificationStatus);
  assert.equal(version.verifiedCommit, lock.product.verifiedCommit);
  assert.equal(version.reference.tools, 20);
});

test("light and dark Manual text tokens meet WCAG AA contrast on every paper surface", async () => {
  const css = await readFile(join(manualRoot, "assets", "manual.css"), "utf8");
  const lightBlock = css.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const darkBlock = css.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  const palettes = [
    { name: "light", tokens: cssTokens(lightBlock) },
    { name: "dark", tokens: cssTokens(darkBlock) }
  ];
  const foregrounds = [
    "ink", "ink-muted", "ink-faint", "accent", "flag",
    "tok-directive", "tok-register", "tok-string", "tok-comment", "tok-punct"
  ];
  const backgrounds = ["paper", "paper-sunk", "paper-raised"];
  for (const { name, tokens } of palettes) {
    for (const foregroundName of foregrounds) {
      for (const backgroundName of backgrounds) {
        const foreground = tokens.get(foregroundName);
        const background = tokens.get(backgroundName);
        assert.ok(foreground && background, `${name} palette is missing ${foregroundName}/${backgroundName}`);
        const ratio = contrastRatio(foreground, background);
        assert.ok(
          ratio >= 4.5,
          `${name} ${foregroundName} on ${backgroundName} is ${ratio.toFixed(2)}:1; expected at least 4.5:1`
        );
      }
    }
  }
  assert.doesNotMatch(css, /(?<![-\w])color:\s*var\(--rule(?:-strong)?\)/, "border-rule tokens must not be used as text colours");
  assert.match(
    css,
    /\.reference-tabs button span\s*\{[\s\S]*?opacity:\s*1\s*;/,
    "reference tab counts must not dilute an already contrast-tested text token"
  );
});

test("copied source trees and release metadata are byte-for-byte identical in dist", async () => {
  const directories = ["assets", "content", "data", "teacher-kit"];
  for (const directory of directories) {
    const sourceRoot = join(manualRoot, directory);
    const outputRoot = join(distRoot, directory);
    const sourceFiles = await listFiles(sourceRoot);
    const outputFiles = await listFiles(outputRoot);
    assert.deepEqual(outputFiles, sourceFiles, directory);
    for (const file of sourceFiles) {
      const source = await readFile(join(sourceRoot, file));
      const output = await readFile(join(outputRoot, file));
      assert.ok(source.equals(output), `${directory}/${file}`);
    }
  }

  for (const file of [
    "index.html", "manual-config.js", "LICENSE", "README.md", "CHANGELOG.md",
    "CONTRIBUTING.md", "SCREENSHOTS.md", "VERSION", "product-lock.json"
  ]) {
    assert.ok((await readFile(join(manualRoot, file))).equals(await readFile(join(distRoot, file))), file);
  }
});

test("the teacher kit is a complete standalone teaching handoff", () => {
  const chapter = chapters.find((entry) => entry.id === "kit-docente");
  assert.ok(chapter);
  assert.ok(chapter.sections.length >= 7);
  const combined = chapter.sections.map((section) => section.content).join("\n");
  assert.match(combined, /\/p\/nome@/);
  assert.match(combined, /Moodle/);
  assert.match(combined, /Self-hosting/i);
  assert.match(combined, /teacher-kit\/lms-copy\.txt/);
});

test("screenshot inventory is exact, canonical and identical in source and dist", async () => {
  const referenced = new Set();
  for (const chapter of chapters) {
    for (const section of chapter.sections) {
      for (const match of section.content.matchAll(/src=["']\.\/assets\/screenshots\/([^"']+)["']/g)) {
        referenced.add(match[1]);
      }
    }
  }

  const sourceInventory = (await readdir(join(manualRoot, "assets", "screenshots")))
    .filter((file) => file.endsWith(".png"))
    .sort();
  const outputInventory = (await readdir(join(distRoot, "assets", "screenshots")))
    .filter((file) => file.endsWith(".png"))
    .sort();
  assert.equal(sourceInventory.length, 36);
  assert.deepEqual([...referenced].sort(), sourceInventory, "every screenshot must be referenced exactly by the edition");
  assert.deepEqual(outputInventory, sourceInventory, "dist screenshot inventory");
  for (const tool of TOOL_DATA) assert.ok(referenced.has(`tool-${tool.id}-light.png`), tool.id);

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const file of sourceInventory) {
    assert.match(file, /-light\.png$/, file);
    const source = await readFile(join(manualRoot, "assets", "screenshots", file));
    const output = await readFile(join(distRoot, "assets", "screenshots", file));
    assert.ok(source.equals(output), `${file} source/dist parity`);
    assert.ok(source.subarray(0, 8).equals(pngSignature), `${file} is not PNG`);
    assert.equal(source.readUInt32BE(16), 1280, `${file} width`);
    assert.equal(source.readUInt32BE(20), 720, `${file} height`);
  }

  const overview = await stat(join(distRoot, "assets", "screenshots", "workspace-overview-light.png"));
  assert.ok(overview.size > 100_000);
});

test("editorial metadata and screenshot protocol stay aligned", async () => {
  const changelog = await readFile(join(manualRoot, "CHANGELOG.md"), "utf8");
  const readme = await readFile(join(manualRoot, "README.md"), "utf8");
  const screenshots = await readFile(join(manualRoot, "SCREENSHOTS.md"), "utf8");
  assert.match(changelog, new RegExp(`\\[${MANUAL.version.replaceAll(".", "\\.")}\\]`));
  assert.match(changelog, new RegExp(`manual-v${MANUAL.version.replaceAll(".", "\\.")}`));
  assert.match(readme, /prefixo de tag `manual-v`/);
  assert.match(readme, new RegExp(`webMARS \`${MANUAL.webmarsVersion.replaceAll(".", "\\.")}\``));
  assert.match(screenshots, /tema: \*\*Claro\*\*/);
  assert.match(screenshots, /36 capturas/);
  assert.match(screenshots, /1280 × 720/);
  for (const tool of TOOL_DATA) assert.match(screenshots, new RegExp(`\\b${tool.id.replaceAll("-", "\\-")}\\b`));
});
