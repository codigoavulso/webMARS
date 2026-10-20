import { lstat, readFile, readdir, rm } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseName = /^webmars-(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(\.zip(?:\.sha256)?)?$/;
const generatedDirectories = [
  "manual/dist", "coverage/raw", "tmp/pdfs",
  "tests/__pycache__", "ops/raspberry-pi/__pycache__"
];

function allowedTarget(path) {
  return generatedDirectories.includes(path)
    || /^hs_err_pid\d+\.log$/.test(path)
    || (path.startsWith("dist/") && releaseName.test(path.slice(5)));
}

async function inspectTarget(root, path) {
  const absolute = resolve(root, path);
  const local = relative(root, absolute);
  if (!allowedTarget(path) || !local || isAbsolute(local) || local.split(sep).includes("..")) {
    throw new Error(`Refusing cleanup outside the generated-file allowlist: ${path}`);
  }
  // Check every parent as well as the target: a junction named manual/dist or
  // a symlink below it must never turn cleanup into deletion outside the repo.
  let parent = root;
  for (const part of local.split(sep)) {
    parent = resolve(parent, part);
    let info;
    try { info = await lstat(parent); }
    catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
    if (info.isSymbolicLink()) throw new Error(`Refusing cleanup through a link: ${path}`);
  }
  let bytes = 0, files = 0;
  async function visit(target) {
    const info = await lstat(target);
    if (info.isSymbolicLink()) throw new Error(`Refusing linked cleanup input: ${target}`);
    if (info.isDirectory()) {
      for (const entry of await readdir(target)) {
        if (entry === ".git") throw new Error(`Refusing nested Git repository: ${target}`);
        await visit(resolve(target, entry));
      }
    } else if (info.isFile()) {
      bytes += info.size;
      files += 1;
    } else throw new Error(`Unsupported cleanup input: ${target}`);
  }
  await visit(absolute);
  return { path, bytes, files };
}

export async function planWorkspaceCleanup(root = projectRoot) {
  root = resolve(root);
  const metadata = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(metadata.version || "")) {
    throw new Error("Cannot identify the current release to preserve its ZIP.");
  }
  const candidates = [...generatedDirectories];
  let entries = [];
  try { entries = await readdir(resolve(root, "dist")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  for (const name of entries) {
    const match = name.match(releaseName);
    if (!match) continue;
    // Keep the current ZIP and checksum, including while deployment is pending.
    // Expanded sites and all older archives can be built from their Git tags.
    if (match[1] === metadata.version && match[2]) continue;
    candidates.push(`dist/${name}`);
  }
  for (const name of await readdir(root)) {
    if (/^hs_err_pid\d+\.log$/.test(name)) candidates.push(name);
  }
  const targets = [];
  for (const path of candidates.sort()) {
    const target = await inspectTarget(root, path);
    if (target) targets.push(target);
  }
  return { version: metadata.version, targets,
    bytes: targets.reduce((total, target) => total + target.bytes, 0),
    files: targets.reduce((total, target) => total + target.files, 0) };
}

export async function cleanWorkspace(root = projectRoot, { apply = false } = {}) {
  root = resolve(root);
  // Validate the complete plan before deleting anything. Unknown archives,
  // source files, reports, preview databases and Git history are never selected.
  const plan = await planWorkspaceCleanup(root);
  if (apply) {
    for (const target of plan.targets) {
      await inspectTarget(root, target.path);
      await rm(resolve(root, target.path), { recursive: true, force: true });
    }
  }
  return plan;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const flags = process.argv.slice(2);
  if (flags.some((flag) => !["--apply", "--dry-run"].includes(flag))
    || (flags.includes("--apply") && flags.includes("--dry-run"))) {
    console.error("Usage: npm run clean -- [--dry-run | --apply]");
    process.exitCode = 1;
  } else {
    try {
      const apply = flags.includes("--apply");
      const plan = await cleanWorkspace(projectRoot, { apply });
      for (const target of plan.targets) {
        console.log(`[clean] ${target.path}: ${(target.bytes / 1024 / 1024).toFixed(2)} MiB`);
      }
      console.log(`[clean] ${apply ? "Removed" : "Would remove"} ${plan.files} generated files, ${(plan.bytes / 1024 / 1024).toFixed(2)} MiB.`);
      if (!apply) console.log("[clean] Preview only. Use npm run clean -- --apply to remove these files.");
    } catch (error) {
      console.error(`[clean] ${error.message}`);
      process.exitCode = 1;
    }
  }
}
