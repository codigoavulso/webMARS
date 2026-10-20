import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import { basename, dirname, extname, join, posix, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync, inflateRawSync } from "node:zlib";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = join(projectRoot, "dist");

// The release is deliberately assembled from this allowlist. Development
// files at the repository root are never copied implicitly.
const PUBLIC_ROOT_FILES = Object.freeze([
  "index.html",
  "webmars-config.js",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "LICENSE",
  // The application configuration shipped below points at /manual/.  Keep the
  // independently versioned Manual as an explicit public payload instead of
  // publishing a self-described standalone ZIP with a guaranteed dead link.
  "manual/index.html",
  "manual/manual-config.js",
  "manual/LICENSE",
  "manual/README.md",
  "manual/CHANGELOG.md",
  "manual/CONTRIBUTING.md",
  "manual/SCREENSHOTS.md",
  "manual/VERSION",
  "manual/product-lock.json"
]);

const PUBLIC_TREES = Object.freeze([
  { root: "discover", extensions: [".html"] },
  {
    root: "assets",
    extensions: [".css", ".gif", ".ico", ".jpg", ".js", ".json", ".png"]
  },
  {
    root: "examples",
    extensions: [".asm", ".c", ".h", ".json"]
  },
  {
    root: "help",
    extensions: [".css", ".gif", ".html", ".json", ".pdf", ".txt"]
  },
  {
    root: "libs",
    extensions: [".c0", ".h", ".json"]
  },
  {
    root: "tools",
    extensions: [".js", ".json"]
  },
  {
    root: "manual/assets",
    extensions: [".css", ".ico", ".js", ".png"]
  },
  {
    root: "manual/content",
    extensions: [".mjs"]
  },
  {
    root: "manual/data",
    extensions: [".json"]
  },
  {
    root: "manual/teacher-kit",
    extensions: [".md", ".txt"]
  }
]);

const FORBIDDEN_RELEASE_PATH = /(^|\/)(?:\.git|\.github|docs|node_modules|scripts|test-results|tests)(?:\/|$)/i;
const TEMPORARY_NAME = /(?:^|[._-])(?:tmp|temp)(?:[._-]|$)|(?:\.bak|~)$/i;
const APP_VERSION_PATH = "assets/js/app-version.js";
const CHECKSUM_MANIFEST = "SHA256SUMS";
const ZIP_FLAG_UTF8 = 0x0800;
const ZIP_METHOD_DEFLATE = 8;
const ZIP_DOS_TIME = 0;
const ZIP_DOS_DATE = 0x5021; // 2020-01-01, fixed for reproducible archives.

function toPosix(path) {
  return path.replaceAll("\\", "/");
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function resolveInside(base, relativePath) {
  const normalized = toPosix(relativePath);
  assert(normalized && !posix.isAbsolute(normalized), `Unsafe empty or absolute path: ${relativePath}`);
  assert(!normalized.split("/").includes(".."), `Unsafe parent path: ${relativePath}`);
  const resolved = resolve(base, ...normalized.split("/"));
  const prefix = base.endsWith(sep) ? base : `${base}${sep}`;
  assert(resolved.startsWith(prefix), `Path escapes its release root: ${relativePath}`);
  return resolved;
}

async function assertRegularFile(absolutePath, label) {
  let info;
  try {
    info = await lstat(absolutePath);
  } catch {
    throw new Error(`Missing required release file: ${label}`);
  }
  assert(info.isFile() && !info.isSymbolicLink(), `Release input is not a regular file: ${label}`);
}

async function assertRegularDirectory(absolutePath, label) {
  let info;
  try {
    info = await lstat(absolutePath);
  } catch {
    throw new Error(`Missing required release tree: ${label}`);
  }
  assert(
    info.isDirectory() && !info.isSymbolicLink(),
    `Release input tree is not a regular directory: ${label}`
  );
}

async function readPackageMetadata() {
  const packagePath = join(projectRoot, "package.json");
  const metadata = JSON.parse((await readFile(packagePath, "utf8")).replace(/^\uFEFF/, ""));
  const version = String(metadata.version || "").trim();
  assert(
    /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version),
    `package.json contains an unsafe or unsupported version: ${version || "(empty)"}`
  );

  const appVersionSource = await readFile(join(projectRoot, APP_VERSION_PATH), "utf8");
  const appVersion = appVersionSource.match(/\bAPP_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
  assert(appVersion, `${APP_VERSION_PATH} does not declare APP_VERSION.`);
  assert(
    appVersion === version,
    `Version mismatch: package.json is ${version}, but ${APP_VERSION_PATH} is ${appVersion}.`
  );

  return { name: String(metadata.name || "webmars"), version };
}

async function collectTreeFiles(tree, sourceRoot = projectRoot) {
  const allowedExtensions = new Set(tree.extensions);
  const files = [];

  async function visit(relativeDirectory) {
    const absoluteDirectory = resolveInside(sourceRoot, relativeDirectory);
    // `readdir({ withFileTypes: true })` describes the entries below this path;
    // it says nothing about the path itself. An allowlisted root can therefore
    // be a junction or directory symlink unless it is checked with lstat first.
    await assertRegularDirectory(absoluteDirectory, relativeDirectory);
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));

    for (const entry of entries) {
      const relativePath = toPosix(posix.join(relativeDirectory, entry.name));
      const info = await lstat(resolveInside(sourceRoot, relativePath));
      assert(!info.isSymbolicLink(), `Symlinks are not allowed in release inputs: ${relativePath}`);
      assert(!entry.name.startsWith("."), `Hidden release input requires an explicit decision: ${relativePath}`);
      assert(!TEMPORARY_NAME.test(entry.name), `Temporary release input found: ${relativePath}`);

      if (info.isDirectory()) {
        await visit(relativePath);
        continue;
      }

      assert(info.isFile(), `Unsupported release input type: ${relativePath}`);
      assert(
        allowedExtensions.has(extname(entry.name).toLowerCase()),
        `Extension is not allowlisted for ${tree.root}: ${relativePath}`
      );
      files.push(relativePath);
    }
  }

  await visit(tree.root);
  assert(files.length > 0, `Public release tree is empty: ${tree.root}`);
  return files;
}

async function collectReleaseInputs() {
  const files = [];
  for (const relativePath of PUBLIC_ROOT_FILES) {
    await assertRegularFile(resolveInside(projectRoot, relativePath), relativePath);
    files.push(relativePath);
  }
  for (const tree of PUBLIC_TREES) files.push(...await collectTreeFiles(tree));

  const sorted = [...new Set(files)].sort((left, right) => left.localeCompare(right, "en"));
  assert(sorted.length === files.length, "The public release allowlist contains duplicate paths.");
  for (const relativePath of sorted) {
    assert(!FORBIDDEN_RELEASE_PATH.test(relativePath), `Forbidden development path was allowlisted: ${relativePath}`);
  }
  return sorted;
}

async function listFiles(root, relativeDirectory = "") {
  const absoluteDirectory = relativeDirectory
    ? resolveInside(root, relativeDirectory)
    : root;
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
  const files = [];

  for (const entry of entries) {
    const relativePath = toPosix(posix.join(relativeDirectory, entry.name));
    assert(!entry.isSymbolicLink(), `Unexpected symlink in generated release: ${relativePath}`);
    if (entry.isDirectory()) files.push(...await listFiles(root, relativePath));
    else if (entry.isFile()) files.push(relativePath);
    else throw new Error(`Unexpected filesystem entry in generated release: ${relativePath}`);
  }
  return files;
}

async function copyReleaseInputs(files, targetRoot) {
  for (const relativePath of files) {
    const source = resolveInside(projectRoot, relativePath);
    const target = resolveInside(targetRoot, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
  }
}

async function writePayloadChecksums(files, targetRoot) {
  const lines = [];
  for (const relativePath of files) {
    const content = await readFile(resolveInside(targetRoot, relativePath));
    lines.push(`${sha256(content)}  ${relativePath}`);
  }
  await writeFile(
    resolveInside(targetRoot, CHECKSUM_MANIFEST),
    `${lines.join("\n")}\n`,
    "utf8"
  );
}

async function validateCopyIntegrity(sourceFiles, targetRoot) {
  const generatedFiles = await listFiles(targetRoot);
  const expectedFiles = [...sourceFiles, CHECKSUM_MANIFEST]
    .sort((left, right) => left.localeCompare(right, "en"));
  assert(
    JSON.stringify(generatedFiles) === JSON.stringify(expectedFiles),
    "Generated release contains missing or unexpected files."
  );

  const checksumSource = await readFile(resolveInside(targetRoot, CHECKSUM_MANIFEST), "utf8");
  const checksumEntries = checksumSource.trimEnd().split("\n");
  assert(checksumEntries.length === sourceFiles.length, "SHA256SUMS does not cover every payload file.");

  for (let index = 0; index < sourceFiles.length; index += 1) {
    const relativePath = sourceFiles[index];
    const sourceContent = await readFile(resolveInside(projectRoot, relativePath));
    const targetContent = await readFile(resolveInside(targetRoot, relativePath));
    const digest = sha256(targetContent);
    assert(
      sourceContent.equals(targetContent),
      `Generated file differs from its source: ${relativePath}`
    );
    assert(
      checksumEntries[index] === `${digest}  ${relativePath}`,
      `Invalid or out-of-order checksum entry for: ${relativePath}`
    );
  }

  for (const relativePath of generatedFiles) {
    assert(!FORBIDDEN_RELEASE_PATH.test(relativePath), `Development content leaked into release: ${relativePath}`);
    assert(!TEMPORARY_NAME.test(posix.basename(relativePath)), `Temporary content leaked into release: ${relativePath}`);
    assert(
      !relativePath.startsWith("wasm/")
        && !/^assets\/js\/app-modules\/00-core-wasm-/i.test(relativePath),
      `Obsolete WASM artifact leaked into release: ${relativePath}`
    );
  }

  return generatedFiles;
}

function normalizeLocalReference(owner, rawReference) {
  const reference = String(rawReference || "").trim().replaceAll("&amp;", "&");
  if (
    !reference
    || reference.startsWith("#")
    || reference.startsWith("//")
    || /^(?:data|https?|javascript|mailto|tel):/i.test(reference)
  ) {
    return null;
  }

  const pathOnly = reference.split(/[?#]/, 1)[0].replaceAll("\\", "/");
  if (!pathOnly) return null;
  let normalized;
  if (pathOnly.startsWith("/")) normalized = posix.normalize(pathOnly.slice(1));
  else normalized = posix.normalize(posix.join(posix.dirname(owner), pathOnly));
  assert(
    normalized && normalized !== ".." && !normalized.startsWith("../") && !posix.isAbsolute(normalized),
    `Local reference escapes the release in ${owner}: ${rawReference}`
  );
  return normalized;
}

function assertPackagedReference(fileSet, owner, rawReference, appRoutes = new Set()) {
  const normalized = normalizeLocalReference(owner, rawReference);
  if (!normalized) return;
  const pathOnly = String(rawReference || "").trim().split(/[?#]/, 1)[0].replaceAll("\\", "/");
  const directoryIndex = normalized === "."
    ? "index.html"
    : (pathOnly.endsWith("/") ? posix.join(normalized, "index.html") : "");
  assert(
    fileSet.has(normalized) || (directoryIndex && fileSet.has(directoryIndex)) || appRoutes.has(normalized.replace(/\/$/, "")),
    `Broken packaged reference in ${owner}: ${rawReference}`
  );
}

function withoutHtmlBaseElements(source) {
  // A <base> href establishes how the browser resolves every other URL;
  // it is routing metadata, not a packaged file reference of its own.
  return String(source).replace(/<base\b[^>]*>/gi, "");
}

async function validateDocumentReferences(targetRoot, generatedFiles) {
  const fileSet = new Set(generatedFiles);
  const appRoutes = new Set();
  if (fileSet.has("index.html") && fileSet.has("examples/stable-ids.json")) {
    const registry = await readReleaseJson(targetRoot, "examples/stable-ids.json");
    for (const entry of registry.entries || []) {
      // A pretty URL is a runtime route, not a file. Only known active built-in
      // IDs qualify; this must not turn arbitrary missing assets into passes.
      if (entry.status === "active" && /^[a-z0-9][a-z0-9-]{0,79}$/.test(entry.id)) appRoutes.add(`e/${entry.id}`);
    }
  }
  for (const relativePath of generatedFiles) {
    const extension = extname(relativePath).toLowerCase();
    if (extension !== ".html" && extension !== ".css") continue;
    const source = await readFile(resolveInside(targetRoot, relativePath), "utf8");

    if (extension === ".html") {
      const referenceSource = withoutHtmlBaseElements(source);
      for (const match of referenceSource.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
        assertPackagedReference(fileSet, relativePath, match[1], appRoutes);
      }
    } else {
      for (const match of source.matchAll(/\burl\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
        assertPackagedReference(fileSet, relativePath, match[1]);
      }
    }
  }
}

async function readReleaseJson(targetRoot, relativePath) {
  let parsed;
  try {
    parsed = JSON.parse(
      (await readFile(resolveInside(targetRoot, relativePath), "utf8")).replace(/^\uFEFF/, "")
    );
  } catch (error) {
    throw new Error(`Invalid JSON in generated release: ${relativePath} (${error.message})`);
  }
  return parsed;
}

async function validateJsonFiles(targetRoot, generatedFiles) {
  for (const relativePath of generatedFiles) {
    if (extname(relativePath).toLowerCase() === ".json") {
      await readReleaseJson(targetRoot, relativePath);
    }
  }
}

function validateJavaScriptFiles(targetRoot, generatedFiles) {
  for (const relativePath of generatedFiles) {
    if (![".js", ".mjs"].includes(extname(relativePath).toLowerCase())) continue;
    const checked = spawnSync(
      process.execPath,
      ["--check", resolveInside(targetRoot, relativePath)],
      { encoding: "utf8" }
    );
    assert(
      checked.status === 0,
      `Invalid JavaScript in generated release: ${relativePath}`
        + (checked.stderr?.trim() ? `\n${checked.stderr.trim()}` : "")
    );
  }
}

function manifestPath(value, owner) {
  const normalized = toPosix(String(value || "").trim()).replace(/^\.\/+/, "");
  assert(
    normalized && !posix.isAbsolute(normalized) && !normalized.split("/").includes(".."),
    `Unsafe path in ${owner}: ${value}`
  );
  return normalized;
}

async function validateManifestReferences(targetRoot, generatedFiles) {
  const fileSet = new Set(generatedFiles);
  const requireFile = (relativePath, owner) => {
    assert(fileSet.has(relativePath), `${owner} references a file absent from the package: ${relativePath}`);
  };

  const i18nManifest = await readReleaseJson(targetRoot, "assets/js/i18n/languages.json");
  assert(Array.isArray(i18nManifest.languages) && i18nManifest.languages.length > 0, "Empty i18n language manifest.");
  for (const languageFile of i18nManifest.languages) {
    requireFile(`assets/js/i18n/${manifestPath(languageFile, "i18n language manifest")}`, "i18n language manifest");
  }

  const toolsManifest = await readReleaseJson(targetRoot, "tools/tools.json");
  assert(Array.isArray(toolsManifest.tools) && toolsManifest.tools.length > 0, "Empty tools manifest.");
  for (const tool of toolsManifest.tools) {
    requireFile(manifestPath(tool?.script, "tools manifest"), "tools manifest");
  }

  const libraryManifest = await readReleaseJson(targetRoot, "libs/manifest.json");
  assert(Array.isArray(libraryManifest.libraries) && libraryManifest.libraries.length > 0, "Empty library manifest.");
  for (const library of libraryManifest.libraries) {
    requireFile(`libs/${manifestPath(library?.path, "library manifest")}`, "library manifest");
  }

  const helpManifest = await readReleaseJson(targetRoot, "help/languages.json");
  assert(Array.isArray(helpManifest.languages) && helpManifest.languages.length > 0, "Empty help language manifest.");
  const requiredHelpFiles = [
    "Acknowledgements.html",
    "BugReportingHelp.html",
    "ExceptionsHelp.html",
    "MARSlicense.txt",
    "MIPSInstructionSetSong.html",
    "MacrosHelp.html",
    "MarsHelpCommand.html",
    "MarsHelpDebugging.html",
    "MarsHelpHistory.html",
    "MarsHelpIDE.html",
    "MarsHelpIntro.html",
    "MarsHelpLimits.html",
    "MarsHelpSettings.html",
    "MarsHelpTools.html",
    "SyscallHelp.html",
    "TeacherKit.html",
    "about-card.html",
    "changelog.html",
    "help-reference.json",
    "info.html"
  ];
  for (const language of helpManifest.languages) {
    const directory = manifestPath(language?.dir, "help language manifest");
    for (const helpFile of requiredHelpFiles) {
      requireFile(`help/${directory}/${helpFile}`, "help language manifest");
    }
  }

  const examplesManifest = await readReleaseJson(targetRoot, "examples/examples.json");
  const examples = Array.isArray(examplesManifest)
    ? examplesManifest
    : examplesManifest.examples;
  assert(Array.isArray(examples) && examples.length > 0, "Empty examples manifest.");
  const defaultLanguage = manifestPath(examplesManifest.defaultLanguage || "en", "examples manifest");
  for (const example of examples) {
    const fallbackPath = manifestPath(example?.path || example?.file || example?.name, "examples manifest");
    const fileEntries = Array.isArray(example?.files) && example.files.length
      ? example.files
      : [fallbackPath];
    const specs = fileEntries.map((entry) => ({
      path: manifestPath(typeof entry === "string" ? entry : entry?.path || fallbackPath, "examples manifest"),
      // A language-neutral include ships once at the root, so demanding a copy
      // per language would fail on a file that is correct as it stands.
      shared: typeof entry === "object" && entry?.shared === true
    }));
    const languages = Array.isArray(example?.languages) ? example.languages : [];

    for (const { path, shared } of specs) {
      const fallbackCandidates = [
        `examples/${defaultLanguage}/${path}`,
        `examples/${path}`
      ];
      assert(
        fallbackCandidates.some((candidate) => fileSet.has(candidate)),
        `Example has no default or legacy fallback in the package: ${path}`
      );
      if (shared) {
        requireFile(`examples/${path}`, "examples manifest");
        continue;
      }
      for (const language of languages) {
        const normalizedLanguage = manifestPath(language, "examples manifest");
        requireFile(`examples/${normalizedLanguage}/${path}`, "examples manifest");
      }
    }
  }
}

async function validateRuntimeReferences(targetRoot, generatedFiles) {
  const fileSet = new Set(generatedFiles);
  const indexSource = await readFile(resolveInside(targetRoot, "index.html"), "utf8");
  for (const match of withoutHtmlBaseElements(indexSource).matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
    assertPackagedReference(fileSet, "index.html", match[1]);
  }

  const bundleSource = await readFile(resolveInside(targetRoot, "assets/js/app.bundle.js"), "utf8");
  for (const match of bundleSource.matchAll(/["']\.\/([^"'?#]+\.js)["']/g)) {
    requireExactFile(fileSet, match[1], "assets/js/app.bundle.js");
  }

  for (const relativePath of generatedFiles) {
    if (extname(relativePath).toLowerCase() !== ".js") continue;
    const source = await readFile(resolveInside(targetRoot, relativePath), "utf8");
    for (const match of source.matchAll(/["'`]((?:\.\/|\/)?(?:assets|examples|help|libs|tools)\/[^"'`?#\s)]+)["'`]/g)) {
      const reference = match[1];
      if (/[$*{}]/.test(reference) || !extname(reference)) continue;
      const normalized = posix.normalize(reference.replace(/^\.?\//, ""));
      requireExactFile(fileSet, normalized, relativePath);
    }
  }
}

async function validateBundledManual(targetRoot, generatedFiles) {
  const fileSet = new Set(generatedFiles);
  const requiredFiles = [
    "manual/index.html",
    "manual/manual-config.js",
    "manual/LICENSE",
    "manual/VERSION",
    "manual/product-lock.json",
    "manual/assets/manual.css",
    "manual/assets/manual.js",
    "manual/assets/favicon.ico",
    "manual/content/index.mjs",
    "manual/data/help-reference.json",
    "manual/data/syscalls.json",
    "manual/data/tool-manifest.json",
    "manual/teacher-kit/README.md"
  ];
  for (const requiredFile of requiredFiles) requireExactFile(fileSet, requiredFile, "Manual release validator");

  const lock = await readReleaseJson(targetRoot, "manual/product-lock.json");
  const manualVersion = (await readFile(resolveInside(targetRoot, "manual/VERSION"), "utf8")).trim();
  assert(lock?.manual?.version === manualVersion, "Bundled Manual VERSION and product lock disagree.");
  assert(lock?.product?.version, "Bundled Manual product lock does not name a webMARS version.");
  for (const catalog of Object.values(lock.catalogs || {})) {
    const relativePath = `manual/${manifestPath(catalog?.file, "Manual product lock")}`;
    requireExactFile(fileSet, relativePath, "Manual product lock");
    const content = await readFile(resolveInside(targetRoot, relativePath));
    assert(sha256(content) === catalog.sha256, `Bundled Manual catalog hash mismatch: ${relativePath}`);
  }

  // Chapter HTML is authored inside JavaScript template strings and resolves
  // relative to manual/index.html when rendered.  Validate its static links at
  // that document boundary, rather than relative to each module file.
  for (const relativePath of generatedFiles) {
    if (!relativePath.startsWith("manual/content/") || extname(relativePath).toLowerCase() !== ".mjs") continue;
    const source = await readFile(resolveInside(targetRoot, relativePath), "utf8");
    for (const match of source.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
      if (match[1].includes("${")) continue;
      assertPackagedReference(fileSet, "manual/index.html", match[1]);
    }
  }
}

function requireExactFile(fileSet, relativePath, owner) {
  assert(fileSet.has(relativePath), `${owner} references a file absent from the package: ${relativePath}`);
}

async function validateIsolatedRelease(targetRoot, sourceFiles) {
  const generatedFiles = await validateCopyIntegrity(sourceFiles, targetRoot);
  const requiredFiles = [
    "index.html",
    "webmars-config.js",
    "favicon.ico",
    "robots.txt",
    "LICENSE",
    APP_VERSION_PATH,
    "assets/css/styles.css",
    "assets/images/screenshot-main.png",
    "assets/js/app.bundle.js",
    "assets/js/app-modules/00-core.js",
    "assets/js/app-modules/20-app-runtime.js",
    "assets/js/i18n/languages.json",
    "examples/examples.json",
    "examples/stable-ids.json",
    "help/languages.json",
    "help/help-reference.json",
    "help/mipsref.pdf",
    "libs/manifest.json",
    "tools/tools.json",
    "manual/index.html",
    "manual/assets/manual.js",
    "manual/content/index.mjs",
    "manual/product-lock.json",
    "manual/teacher-kit/README.md"
  ];
  const fileSet = new Set(generatedFiles);
  for (const requiredFile of requiredFiles) requireExactFile(fileSet, requiredFile, "release validator");

  await validateJsonFiles(targetRoot, generatedFiles);
  validateJavaScriptFiles(targetRoot, generatedFiles);
  await validateDocumentReferences(targetRoot, generatedFiles);
  await validateManifestReferences(targetRoot, generatedFiles);
  await validateRuntimeReferences(targetRoot, generatedFiles);
  await validateBundledManual(targetRoot, generatedFiles);
  return generatedFiles;
}

const crc32Table = new Uint32Array(256);
for (let index = 0; index < crc32Table.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  }
  crc32Table[index] = value >>> 0;
}

function crc32(data) {
  let value = 0xffffffff;
  for (const byte of data) value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

async function createZipArchive(sourceRoot, archiveRootName, relativeFiles) {
  assert(relativeFiles.length < 0xffff, "ZIP64 would be required for this number of release files.");
  const localParts = [];
  const centralParts = [];
  let localOffset = 0;

  for (const relativePath of relativeFiles) {
    const archivePath = `${archiveRootName}/${relativePath}`;
    const name = Buffer.from(archivePath, "utf8");
    const data = await readFile(resolveInside(sourceRoot, relativePath));
    const compressed = deflateRawSync(data, { level: 9 });
    assert(
      data.length <= 0xffffffff && compressed.length <= 0xffffffff && localOffset <= 0xffffffff,
      `ZIP64 would be required for: ${relativePath}`
    );
    const digest = crc32(data);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(ZIP_FLAG_UTF8, 6);
    localHeader.writeUInt16LE(ZIP_METHOD_DEFLATE, 8);
    localHeader.writeUInt16LE(ZIP_DOS_TIME, 10);
    localHeader.writeUInt16LE(ZIP_DOS_DATE, 12);
    localHeader.writeUInt32LE(digest, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(0x0314, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(ZIP_FLAG_UTF8, 8);
    centralHeader.writeUInt16LE(ZIP_METHOD_DEFLATE, 10);
    centralHeader.writeUInt16LE(ZIP_DOS_TIME, 12);
    centralHeader.writeUInt16LE(ZIP_DOS_DATE, 14);
    centralHeader.writeUInt32LE(digest, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE((0o100644 << 16) >>> 0, 38);
    centralHeader.writeUInt32LE(localOffset, 42);
    centralParts.push(centralHeader, name);

    localOffset += localHeader.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  assert(localOffset + centralDirectory.length <= 0xffffffff, "ZIP64 would be required for this release.");
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(relativeFiles.length, 8);
  end.writeUInt16LE(relativeFiles.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function validateZipArchive(archive, expectedPaths) {
  assert(archive.length >= 22, "Generated ZIP is truncated.");
  const endOffset = archive.length - 22;
  assert(archive.readUInt32LE(endOffset) === 0x06054b50, "Generated ZIP has no valid end record.");
  assert(archive.readUInt16LE(endOffset + 20) === 0, "Generated ZIP unexpectedly has a comment.");
  const count = archive.readUInt16LE(endOffset + 10);
  const centralSize = archive.readUInt32LE(endOffset + 12);
  const centralOffset = archive.readUInt32LE(endOffset + 16);
  assert(count === expectedPaths.length, "Generated ZIP contains an unexpected number of entries.");
  assert(centralOffset + centralSize === endOffset, "Generated ZIP central directory has invalid bounds.");

  const actualPaths = [];
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    assert(archive.readUInt32LE(cursor) === 0x02014b50, "Invalid ZIP central directory entry.");
    const method = archive.readUInt16LE(cursor + 10);
    const expectedCrc = archive.readUInt32LE(cursor + 16);
    const compressedLength = archive.readUInt32LE(cursor + 20);
    const uncompressedLength = archive.readUInt32LE(cursor + 24);
    const nameLength = archive.readUInt16LE(cursor + 28);
    const extraLength = archive.readUInt16LE(cursor + 30);
    const commentLength = archive.readUInt16LE(cursor + 32);
    const localOffset = archive.readUInt32LE(cursor + 42);
    const name = archive.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    actualPaths.push(name);

    assert(method === ZIP_METHOD_DEFLATE, `Unexpected ZIP compression method for: ${name}`);
    assert(archive.readUInt32LE(localOffset) === 0x04034b50, `Invalid ZIP local entry for: ${name}`);
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = archive.subarray(dataOffset, dataOffset + compressedLength);
    const inflated = inflateRawSync(compressed);
    assert(inflated.length === uncompressedLength, `ZIP size mismatch for: ${name}`);
    assert(crc32(inflated) === expectedCrc, `ZIP checksum mismatch for: ${name}`);

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  assert(cursor === endOffset, "Generated ZIP central directory was not consumed exactly.");
  assert(
    JSON.stringify(actualPaths) === JSON.stringify(expectedPaths),
    "Generated ZIP entry list does not match the isolated release."
  );
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

// A release is three public paths that must describe the same build. Renaming
// them one by one without a rollback can leave a new directory beside an old
// ZIP (or no checksum at all). Back up an existing complete set, publish the
// staged set, and restore the previous set if any rename fails. Workspace
// cleanup can retain only the ZIP and checksum; explicitly allow that state
// only after verifying the pair, and restore that same state on failure.
async function publishReleaseSet(entries, operations = {}) {
  const move = operations.rename || rename;
  const remove = operations.rm || rm;
  assert(entries.length > 0, "No release artifacts were supplied for publication.");

  const existing = await Promise.all(entries.map((entry) => pathExists(entry.target)));
  const archiveOnly = operations.allowArchiveOnly === true && entries.length === 3
    && !existing[0] && existing[1] && existing[2];
  assert(
    existing.every(Boolean) || existing.every((present) => !present) || archiveOnly,
    "Existing release artifacts are incomplete; refusing to replace a partial set."
  );
  if (archiveOnly) {
    const digest = sha256(await readFile(entries[1].target));
    const checksum = (await readFile(entries[2].target, "utf8")).trim();
    assert(checksum === `${digest}  ${basename(entries[1].target)}`,
      "Stored release ZIP and checksum disagree; refusing to replace the archived release.");
  }
  for (const entry of entries) {
    assert(!await pathExists(entry.backup), `Release backup already exists: ${toPosix(entry.backup)}`);
  }

  const backedUp = [];
  const published = [];
  try {
    for (const [index, entry] of entries.entries()) {
      if (!existing[index]) continue;
      await move(entry.target, entry.backup);
      backedUp.push(entry);
    }
    for (const entry of entries) {
      await move(entry.staged, entry.target);
      published.push(entry);
    }
  } catch (publicationError) {
    const rollbackErrors = [];
    for (const entry of [...published].reverse()) {
      try {
        await remove(entry.target, { recursive: true, force: true });
      } catch (error) {
        rollbackErrors.push(error);
      }
    }
    for (const entry of [...backedUp].reverse()) {
      try {
        await remove(entry.target, { recursive: true, force: true });
        await move(entry.backup, entry.target);
      } catch (error) {
        rollbackErrors.push(error);
      }
    }
    if (rollbackErrors.length) {
      throw new AggregateError(
        [publicationError, ...rollbackErrors],
        "Release publication failed and the previous complete artifact set could not be fully restored."
      );
    }
    throw publicationError;
  }

  for (const entry of backedUp) {
    await remove(entry.backup, { recursive: true, force: true });
  }
}

async function packageRelease() {
  const metadata = await readPackageMetadata();
  assert(metadata.name === "webmars", `Unexpected package name: ${metadata.name}`);
  const releaseName = `webmars-${metadata.version}`;
  const releaseDirectory = join(distRoot, releaseName);
  const zipPath = join(distRoot, `${releaseName}.zip`);
  const zipChecksumPath = join(distRoot, `${releaseName}.zip.sha256`);
  const stagingDirectory = join(distRoot, `.${releaseName}.staging-${process.pid}`);
  const temporaryZipPath = join(distRoot, `.${releaseName}.zip-${process.pid}.tmp`);
  const temporaryChecksumPath = join(distRoot, `.${releaseName}.zip.sha256-${process.pid}.tmp`);
  const backupDirectory = join(distRoot, `.${releaseName}.backup-${process.pid}`);
  const backupZipPath = join(distRoot, `.${releaseName}.zip.backup-${process.pid}`);
  const backupChecksumPath = join(distRoot, `.${releaseName}.zip.sha256.backup-${process.pid}`);

  await mkdir(distRoot, { recursive: true });
  await rm(stagingDirectory, { recursive: true, force: true });
  await rm(temporaryZipPath, { force: true });
  await rm(temporaryChecksumPath, { force: true });

  try {
    const sourceFiles = await collectReleaseInputs();
    await mkdir(stagingDirectory, { recursive: true });
    await copyReleaseInputs(sourceFiles, stagingDirectory);
    await writePayloadChecksums(sourceFiles, stagingDirectory);
    const generatedFiles = await validateIsolatedRelease(stagingDirectory, sourceFiles);

    const archivePaths = generatedFiles.map((relativePath) => `${releaseName}/${relativePath}`);
    const archive = await createZipArchive(stagingDirectory, releaseName, generatedFiles);
    validateZipArchive(archive, archivePaths);
    await writeFile(temporaryZipPath, archive);

    const archiveDigest = sha256(await readFile(temporaryZipPath));
    const checksumLine = `${archiveDigest}  ${releaseName}.zip\n`;
    await writeFile(temporaryChecksumPath, checksumLine, "utf8");
    assert(
      await readFile(temporaryChecksumPath, "utf8") === checksumLine,
      "Could not verify the generated ZIP checksum file."
    );

    await publishReleaseSet([
      { staged: stagingDirectory, target: releaseDirectory, backup: backupDirectory },
      { staged: temporaryZipPath, target: zipPath, backup: backupZipPath },
      { staged: temporaryChecksumPath, target: zipChecksumPath, backup: backupChecksumPath }
    ], { allowArchiveOnly: true });

    console.log(`[package] Release directory: ${toPosix(releaseDirectory)}`);
    console.log(`[package] ZIP archive: ${toPosix(zipPath)}`);
    console.log(`[package] ZIP checksum: ${toPosix(zipChecksumPath)}`);
    console.log(`[package] Validated ${generatedFiles.length} packaged files.`);
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
    await rm(temporaryZipPath, { force: true });
    await rm(temporaryChecksumPath, { force: true });
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    await packageRelease();
  } catch (error) {
    console.error(`[package] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

export { collectReleaseInputs, collectTreeFiles, publishReleaseSet, validateDocumentReferences };
