import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (
      entry.name === ".git"
      || entry.name === "dist"
      || entry.name === "node_modules"
      || entry.name === "test-results"
    ) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

function fail(message) {
  failures.push(message);
}

const files = await walk(projectRoot);
const relativeFiles = new Set(files.map((file) => file.slice(projectRoot.length + 1).replaceAll("\\", "/")));

for (const relativePath of relativeFiles) {
  if (relativePath.startsWith("wasm/") || /^assets\/js\/app-modules\/00-core-wasm-/i.test(relativePath)) {
    fail(`Obsolete WASM runtime artifact remains: ${relativePath}`);
  }
}

for (const required of [
  "index.html",
  "assets/js/app.bundle.js",
  "assets/js/app-modules/00-core.js"
]) {
  if (!relativeFiles.has(required)) fail(`Missing required file: ${required}`);
}

const bundleSource = await readFile(join(projectRoot, "assets/js/app.bundle.js"), "utf8");
for (const match of bundleSource.matchAll(/["']\.\/([^"']+\.js)["']/g)) {
  if (!relativeFiles.has(match[1])) fail(`Bundle references missing script: ${match[1]}`);
}

for (const file of files) {
  const extension = extname(file).toLowerCase();
  if (extension === ".json") {
    try {
      JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, ""));
    } catch (error) {
      fail(`Invalid JSON: ${file.slice(projectRoot.length + 1)} (${error.message})`);
    }
  }
  if (extension === ".js" || extension === ".mjs") {
    const checked = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    if (checked.status !== 0) {
      fail(`Invalid JavaScript: ${file.slice(projectRoot.length + 1)}\n${checked.stderr.trim()}`);
    }
  }
}

const privacyFiles = [
  "help/info.html",
  "help/en/info.html",
  "help/pt/info.html",
  "help/es/info.html",
  "assets/js/i18n/en.js",
  "assets/js/i18n/pt.js",
  "assets/js/i18n/es.js"
];
const obsoletePrivacyClaims = [
  /no cookies,? and no user data collection/i,
  /sem cookies e sem (?:coleta|recolha) de dados/i,
  /sin cookies y sin (?:recogida|recopilacion) de datos/i
];
for (const relativePath of privacyFiles) {
  const source = await readFile(join(projectRoot, relativePath), "utf8");
  if (obsoletePrivacyClaims.some((pattern) => pattern.test(source))) {
    fail(`Obsolete privacy claim remains in ${relativePath}`);
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(`[build] ${failure}`));
  process.exit(1);
}

console.log(`[build] Static release validated (${files.length} files).`);
