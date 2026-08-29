import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { MANUAL } from "../content/index.mjs";

const execFileAsync = promisify(execFile);
const manualRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function parseArguments(values) {
  const result = new Map();
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (!["--product-root", "--commit", "--verified-at"].includes(name)) {
      throw new Error(`Unknown option: ${name}`);
    }
    const value = values[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${name}`);
    result.set(name, value);
    index += 1;
  }
  return result;
}

const options = parseArguments(process.argv.slice(2));
const productRoot = resolve(options.get("--product-root") || join(manualRoot, ".."));
const verifiedCommit = options.get("--commit") || null;
const verifiedAt = options.get("--verified-at") || null;

if (Boolean(verifiedCommit) !== Boolean(verifiedAt)) {
  throw new Error("--commit and --verified-at must be provided together.");
}
if (verifiedCommit && !/^[0-9a-f]{40}$/.test(verifiedCommit)) {
  throw new Error("--commit must be a full, lowercase 40-character Git commit hash.");
}
if (verifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(verifiedAt)) {
  throw new Error("--verified-at must use YYYY-MM-DD.");
}

async function readProductFile(relativePath) {
  if (!verifiedCommit) return readFile(join(productRoot, ...relativePath.split("/")), "utf8");
  const { stdout } = await execFileAsync(
    "git",
    ["show", `${verifiedCommit}:${relativePath}`],
    { cwd: productRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }
  );
  return stdout;
}

function extractSyscalls(source, filename) {
  const context = {};
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename, timeout: 2000 });
  const matrix = context.WebMarsReferenceData?.syscallMatrix;
  if (!Array.isArray(matrix) || matrix.length < 39) {
    throw new Error("Could not extract the webMARS syscall matrix.");
  }
  return JSON.parse(JSON.stringify(matrix));
}

function jsonDocument(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

const productPackage = JSON.parse(await readProductFile("package.json"));
if (productPackage.name !== "webmars") {
  throw new Error(`Expected the webmars package, found ${productPackage.name || "an unnamed package"}.`);
}
if (productPackage.version !== MANUAL.webmarsVersion) {
  throw new Error(`Manual targets webMARS ${MANUAL.webmarsVersion}, but the selected product is ${productPackage.version}.`);
}

const helpReference = JSON.parse(await readProductFile("help/pt/help-reference.json"));
const syscallsSource = await readProductFile("assets/js/reference/syscalls.generated.js");
const syscalls = extractSyscalls(syscallsSource, "assets/js/reference/syscalls.generated.js");
const toolManifest = JSON.parse(await readProductFile("tools/tools.json"));

if (!Array.isArray(helpReference.basicInstructions)
  || !Array.isArray(helpReference.extendedInstructions)
  || !Array.isArray(helpReference.directives)) {
  throw new Error("The help reference does not contain the expected instruction catalogs.");
}
if (!Array.isArray(toolManifest.tools) || toolManifest.tools.length !== 20) {
  throw new Error("The product tool manifest must contain exactly 20 tools.");
}

const documents = {
  helpReference: {
    file: "data/help-reference.json",
    source: "help/pt/help-reference.json",
    value: helpReference,
    counts: {
      basicInstructions: helpReference.basicInstructions.length,
      extendedInstructions: helpReference.extendedInstructions.length,
      directives: helpReference.directives.length
    }
  },
  syscalls: {
    file: "data/syscalls.json",
    source: "assets/js/reference/syscalls.generated.js",
    value: syscalls,
    counts: { entries: syscalls.length }
  },
  toolManifest: {
    file: "data/tool-manifest.json",
    source: "tools/tools.json",
    value: toolManifest,
    counts: { tools: toolManifest.tools.length }
  }
};

await mkdir(join(manualRoot, "data"), { recursive: true });
for (const document of Object.values(documents)) {
  document.serialized = jsonDocument(document.value);
  await writeFile(join(manualRoot, ...document.file.split("/")), document.serialized, "utf8");
}

const manualPackage = JSON.parse(await readFile(join(manualRoot, "package.json"), "utf8"));
const productLock = {
  schemaVersion: 1,
  manual: {
    name: manualPackage.name,
    version: manualPackage.version
  },
  product: {
    name: productPackage.name,
    version: productPackage.version,
    verificationStatus: verifiedCommit ? "verified" : "pending",
    verifiedCommit,
    verifiedAt
  },
  catalogs: Object.fromEntries(Object.entries(documents).map(([name, document]) => [name, {
    file: document.file,
    source: document.source,
    sha256: sha256(document.serialized),
    counts: document.counts
  }]))
};

await writeFile(join(manualRoot, "product-lock.json"), jsonDocument(productLock), "utf8");

console.log(`[manual] Vendored webMARS ${productPackage.version} catalogs.`);
console.log(`[manual] ${helpReference.basicInstructions.length} basic instructions, ${helpReference.extendedInstructions.length} pseudoinstructions, ${helpReference.directives.length} directives, ${syscalls.length} syscalls, ${toolManifest.tools.length} tools.`);
if (verifiedCommit) {
  console.log(`[manual] Verified snapshot: ${verifiedCommit} (${verifiedAt}).`);
} else {
  console.log("[manual] Snapshot is pending verification. Re-run with --commit and --verified-at after the product commit exists.");
}
