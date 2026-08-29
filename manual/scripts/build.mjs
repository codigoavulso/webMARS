import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { MANUAL } from "../content/index.mjs";

const manualRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dataRoot = join(manualRoot, "data");
const distRoot = join(manualRoot, "dist");

if (dirname(distRoot) !== manualRoot || !distRoot.endsWith(`${sep}dist`)) {
  throw new Error(`Refusing to clean unexpected output path: ${distRoot}`);
}

async function copy(source, destination) {
  await cp(source, destination, { recursive: true, force: true });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function validateProductLock(productLock, packageData) {
  if (productLock.schemaVersion !== 1) throw new Error("Unsupported product-lock schema.");
  if (productLock.manual?.name !== packageData.name || productLock.manual?.version !== packageData.version) {
    throw new Error("product-lock.json does not match this Manual release.");
  }
  if (productLock.product?.name !== "webmars" || productLock.product?.version !== MANUAL.webmarsVersion) {
    throw new Error("product-lock.json does not match the documented webMARS release.");
  }
  if (!["pending", "verified"].includes(productLock.product.verificationStatus)) {
    throw new Error("product-lock.json has an invalid verification status.");
  }
  if (productLock.product.verificationStatus === "verified") {
    if (!/^[0-9a-f]{40}$/.test(productLock.product.verifiedCommit || "")) {
      throw new Error("A verified product lock requires a full Git commit hash.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(productLock.product.verifiedAt || "")) {
      throw new Error("A verified product lock requires a YYYY-MM-DD verification date.");
    }
  } else if (productLock.product.verifiedCommit !== null || productLock.product.verifiedAt !== null) {
    throw new Error("A pending product lock must not claim a commit or verification date.");
  }

  const entries = Object.values(productLock.catalogs || {});
  if (entries.length !== 3) throw new Error("product-lock.json must describe all three vendored catalogs.");
  const dataPrefix = `${dataRoot}${sep}`;
  for (const entry of entries) {
    const sourcePath = resolve(manualRoot, entry.file || "");
    if (!sourcePath.startsWith(dataPrefix)) throw new Error(`Catalog path leaves data/: ${entry.file}`);
    const bytes = await readFile(sourcePath);
    if (sha256(bytes) !== entry.sha256) throw new Error(`Vendored catalog hash mismatch: ${entry.file}`);
    JSON.parse(bytes.toString("utf8"));
  }
}

async function totalBytes(path) {
  const info = await stat(path);
  if (info.isFile()) return info.size;
  const entries = await readdir(path, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) total += await totalBytes(join(path, entry.name));
  return total;
}

const packageData = await readJson(join(manualRoot, "package.json"));
const productLock = await readJson(join(manualRoot, "product-lock.json"));
await validateProductLock(productLock, packageData);

await rm(distRoot, { recursive: true, force: true });
await mkdir(distRoot, { recursive: true });

for (const directory of ["assets", "content", "data", "teacher-kit"]) {
  await copy(join(manualRoot, directory), join(distRoot, directory));
}
for (const file of [
  "index.html",
  "manual-config.js",
  "LICENSE",
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SCREENSHOTS.md",
  "VERSION",
  "product-lock.json"
]) {
  await copy(join(manualRoot, file), join(distRoot, file));
}

const counts = productLock.catalogs;
const versionData = {
  manual: packageData.version,
  webmars: productLock.product.version,
  locale: MANUAL.locale,
  verificationStatus: productLock.product.verificationStatus,
  verifiedCommit: productLock.product.verifiedCommit,
  verifiedAt: productLock.product.verifiedAt,
  generatedAt: new Date().toISOString(),
  reference: {
    basicInstructions: counts.helpReference.counts.basicInstructions,
    extendedInstructions: counts.helpReference.counts.extendedInstructions,
    directives: counts.helpReference.counts.directives,
    syscalls: counts.syscalls.counts.entries,
    tools: counts.toolManifest.counts.tools
  }
};

await writeFile(join(distRoot, "version.json"), `${JSON.stringify(versionData, null, 2)}\n`, "utf8");

const size = await totalBytes(distRoot);
console.log(`[manual] Built ${relative(manualRoot, distRoot)} (${(size / 1024 / 1024).toFixed(2)} MiB)`);
console.log(`[manual] Reference: ${versionData.reference.basicInstructions} basic, ${versionData.reference.extendedInstructions} pseudo, ${versionData.reference.directives} directives, ${versionData.reference.syscalls} syscalls, ${versionData.reference.tools} tools`);
console.log(`[manual] Product snapshot: ${versionData.verificationStatus}${versionData.verifiedCommit ? ` (${versionData.verifiedCommit.slice(0, 12)})` : ""}`);
