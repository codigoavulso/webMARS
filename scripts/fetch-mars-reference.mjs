// Fetches the reference MARS 4.5 release used by the differential suite.
//
// The differential comparison in scripts/differential-mars.mjs is only
// meaningful if everybody runs it against the same MARS build, so this script
// pins the exact artefact by SHA-256 and refuses anything else. The download
// lands in `vendor/`, which is git-ignored: MARS is MIT licensed and could be
// redistributed, but a 4 MB third-party archive does not belong in this
// repository's history or in its release package.
//
// MARS 4.5 (August 2014) by Pete Sanderson and Kenneth Vollmar. The jar bundles
// its own Java sources, which is what makes it usable as a specification and
// not only as an executable.
//
// Usage:
//   node scripts/fetch-mars-reference.mjs             download, verify, extract
//   node scripts/fetch-mars-reference.mjs --verify    check what is already there
//   node scripts/fetch-mars-reference.mjs --status    print machine-readable status

import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = resolve(projectRoot, "vendor/mars");
const jarPath = resolve(vendorRoot, "Mars4_5.jar");
const extractedRoot = resolve(vendorRoot, "extracted");
const sourceManifestName = ".webmars-reference.json";

export const MARS_REFERENCE = Object.freeze({
  name: "MARS",
  version: "4.5",
  released: "2014-08",
  authors: "Pete Sanderson and Kenneth Vollmar",
  licence: "MIT",
  url: "https://dpetersanderson.github.io/Mars4_5.jar",
  homepage: "https://dpetersanderson.github.io/MARS/",
  sha256: "ac340b676ba2b62246b9df77e62f81ad4447bcfd329ab539716bcd09950b7096",
  bytes: 4169142
});

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function hashFile(path) {
  const hash = createHash("sha256");
  hash.update(await readFile(path));
  return hash.digest("hex");
}

export async function atomicReplaceFile(path, bytes) {
  const temporaryPath = `${path}.tmp-${randomUUID()}`;
  const backupPath = `${path}.bak-${randomUUID()}`;
  const hadPrevious = await exists(path);
  let previousMoved = false;
  await writeFile(temporaryPath, bytes, { flag: "wx" });
  try {
    if (hadPrevious) {
      await rename(path, backupPath);
      previousMoved = true;
    }
    await rename(temporaryPath, path);
    if (previousMoved) await rm(backupPath, { force: true });
  } catch (error) {
    await rm(temporaryPath, { force: true });
    if (previousMoved) {
      await rm(path, { force: true });
      await rename(backupPath, path);
    }
    throw error;
  }
}

export async function buildSourceManifest(root) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      const name = relative(root, path).split(sep).join("/");
      if (name === sourceManifestName) continue;
      if (entry.isSymbolicLink()) throw new Error(`Extracted reference contains a symbolic link: ${name}`);
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile()) {
        files.push({ path: name, sha256: await hashFile(path) });
      }
    }
  }
  await visit(root);
  return files;
}

export function sourceManifestsMatch(expected, actual) {
  if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== actual.length) return false;
  return expected.every((entry, index) => (
    entry?.path === actual[index]?.path
    && /^[0-9a-f]{64}$/.test(String(entry?.sha256 || ""))
    && entry.sha256 === actual[index]?.sha256
  ));
}

async function verifyExtractedSources() {
  try {
    const manifest = JSON.parse(await readFile(resolve(extractedRoot, sourceManifestName), "utf8"));
    if (manifest.schema !== "webmars.reference-sources/1") {
      return { valid: false, problem: "source manifest schema is missing or unsupported" };
    }
    if (manifest.jarSha256 !== MARS_REFERENCE.sha256) {
      return { valid: false, problem: "source manifest belongs to a different reference jar" };
    }
    if (!(await exists(resolve(extractedRoot, "mars/MarsLaunch.java")))) {
      return { valid: false, problem: "mars/MarsLaunch.java is absent" };
    }
    const actual = await buildSourceManifest(extractedRoot);
    if (!sourceManifestsMatch(manifest.files, actual)) {
      return { valid: false, problem: "extracted source list or checksum differs from its verified manifest" };
    }
    return { valid: true, problem: null, files: actual.length };
  } catch (error) {
    return { valid: false, problem: error?.message || String(error) };
  }
}

// Java is optional: the specification checks read the extracted sources, and
// only the behavioural comparison needs a JVM.
export async function findJava() {
  const candidates = [];
  if (process.env.JAVA_HOME) candidates.push(resolve(process.env.JAVA_HOME, "bin/java"));
  candidates.push("java");
  for (const root of ["C:/Program Files/Eclipse Adoptium", "C:/Program Files/Java", "C:/Program Files/Microsoft"]) {
    try {
      for (const entry of await readdir(root)) {
        candidates.push(resolve(root, entry, "bin/java.exe"));
      }
    } catch {
      // The directory is absent on non-Windows hosts; that is not an error.
    }
  }
  for (const candidate of candidates) {
    try {
      const { stderr, stdout } = await run(candidate, ["-version"], { timeout: 30000 });
      const banner = String(stderr || stdout).split("\n")[0].trim();
      return { path: candidate, banner };
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

export async function referenceStatus() {
  const jarPresent = await exists(jarPath);
  const sourcesPresent = await exists(resolve(extractedRoot, "mars/MarsLaunch.java"));
  const java = await findJava();
  let sha256 = null;
  if (jarPresent) sha256 = await hashFile(jarPath);
  const sourceVerification = jarPresent && sha256 === MARS_REFERENCE.sha256
    ? await verifyExtractedSources()
    : { valid: false, problem: jarPresent ? "reference jar checksum mismatch" : "reference jar is absent" };
  return {
    jarPath,
    extractedRoot,
    jarPresent,
    sourcesPresent,
    sourcesVerified: sourceVerification.valid,
    sourceProblem: sourceVerification.problem,
    sha256,
    hashMatches: sha256 === MARS_REFERENCE.sha256,
    java,
    ready: jarPresent && sourceVerification.valid && sha256 === MARS_REFERENCE.sha256,
    canRun: Boolean(java) && jarPresent && sha256 === MARS_REFERENCE.sha256
  };
}

async function download() {
  process.stdout.write(`Downloading ${MARS_REFERENCE.url} (${MARS_REFERENCE.bytes} bytes)...\n`);
  const response = await fetch(MARS_REFERENCE.url);
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== MARS_REFERENCE.sha256) {
    // Refusing beats warning: a differential run against an unknown build
    // produces differences nobody can interpret.
    throw new Error(
      `Checksum mismatch.\n  expected ${MARS_REFERENCE.sha256}\n  received ${sha256}\n` +
      "The upstream artefact changed. Verify the new build before updating MARS_REFERENCE."
    );
  }
  await mkdir(vendorRoot, { recursive: true });
  await atomicReplaceFile(jarPath, bytes);
  process.stdout.write(`Verified SHA-256 ${sha256}\n`);
}

// A jar is a zip. Node has no unzip, so use whatever the host provides; both
// branches produce the same tree.
async function extract() {
  await mkdir(vendorRoot, { recursive: true });
  const extractors = [
    ["unzip", (destination) => ["-q", "-o", jarPath, "-d", destination]],
    ["tar", (destination) => ["-xf", jarPath, "-C", destination]],
    ["powershell", (destination) => [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "& { param([string]$archive, [string]$destination) Expand-Archive -LiteralPath $archive -DestinationPath $destination -Force }",
      jarPath,
      destination
    ]]
  ];
  for (const [command, makeArgs] of extractors) {
    const temporaryRoot = await mkdtemp(resolve(vendorRoot, "extracting-"));
    try {
      await run(command, makeArgs(temporaryRoot), { timeout: 180000, maxBuffer: 32 * 1024 * 1024 });
      if (!(await exists(resolve(temporaryRoot, "mars/MarsLaunch.java")))) {
        throw new Error(`${command} did not produce mars/MarsLaunch.java`);
      }
      const files = await buildSourceManifest(temporaryRoot);
      await writeFile(resolve(temporaryRoot, sourceManifestName), `${JSON.stringify({
        schema: "webmars.reference-sources/1",
        jarSha256: MARS_REFERENCE.sha256,
        files
      }, null, 2)}\n`, "utf8");

      const backupRoot = resolve(vendorRoot, `.extracted-backup-${process.pid}-${Date.now()}`);
      const hadPrevious = await exists(extractedRoot);
      if (hadPrevious) await rename(extractedRoot, backupRoot);
      try {
        await rename(temporaryRoot, extractedRoot);
      } catch (error) {
        if (hadPrevious && !(await exists(extractedRoot))) await rename(backupRoot, extractedRoot);
        throw error;
      }
      if (hadPrevious) await rm(backupRoot, { recursive: true, force: true });
      return command;
    } catch {
      // Try the next extractor.
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
  throw new Error("Could not extract the jar: no working unzip, tar or PowerShell found.");
}

async function main() {
  const verifyOnly = process.argv.includes("--verify");
  const statusOnly = process.argv.includes("--status");

  if (statusOnly) {
    process.stdout.write(`${JSON.stringify(await referenceStatus(), null, 2)}\n`);
    return;
  }

  if (!verifyOnly) {
    const jarPresent = await exists(jarPath);
    const currentHash = jarPresent ? await hashFile(jarPath) : null;
    if (currentHash !== MARS_REFERENCE.sha256) await download();
  }

  if (!(await exists(jarPath))) {
    process.stderr.write("The reference jar is absent. Run without --verify to download it.\n");
    process.exitCode = 1;
    return;
  }

  const sha256 = await hashFile(jarPath);
  if (sha256 !== MARS_REFERENCE.sha256) {
    process.stderr.write(`Checksum mismatch: expected ${MARS_REFERENCE.sha256}, found ${sha256}.\n`);
    process.exitCode = 1;
    return;
  }

  let sourceVerification = await verifyExtractedSources();
  if (!sourceVerification.valid && verifyOnly) {
    process.stderr.write(`Extracted reference sources are not verified: ${sourceVerification.problem}. Run without --verify to refresh them.\n`);
    process.exitCode = 1;
    return;
  }
  if (!sourceVerification.valid) {
    const extractor = await extract();
    process.stdout.write(`Extracted with ${extractor}\n`);
    sourceVerification = await verifyExtractedSources();
    if (!sourceVerification.valid) throw new Error(`Fresh extraction failed verification: ${sourceVerification.problem}`);
  }

  const status = await referenceStatus();
  const sources = (await readdir(resolve(extractedRoot, "mars"))).filter((name) => name.endsWith(".java"));
  process.stdout.write(`MARS ${MARS_REFERENCE.version} ready: ${sources.length} Java sources in mars/, `);
  process.stdout.write(status.java ? `Java found (${status.java.banner}).\n` : "no Java found - behavioural comparison unavailable.\n");
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop())) {
  await main();
}
