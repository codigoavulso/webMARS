import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureResultDirectory, writeJsonReport } from "./mini-c-suite-utils.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");

const suites = [
  { id: "subset-matrix", script: join(repoRoot, "web", "scripts", "mini-c-subset-matrix.mjs"), report: "mini-c-subset-matrix.json" },
  { id: "intrinsics-regression", script: join(repoRoot, "web", "scripts", "mini-c-intrinsics-regression.mjs"), report: "mini-c-intrinsics-regression.json" }
];

let hasFailure = false;
const runResults = [];

for (const suite of suites) {
  const started = Date.now();
  const child = spawnSync(process.execPath, [suite.script], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  const status = Number.isFinite(child.status) ? child.status : 1;
  const ok = status === 0;
  if (!ok) hasFailure = true;
  runResults.push({
    id: suite.id,
    ok,
    status,
    durationMs: Date.now() - started,
    report: suite.report
  });
}

ensureResultDirectory();
const combined = {
  suite: "mini-c-release-matrix",
  generatedAt: new Date().toISOString(),
  allPassed: !hasFailure,
  suites: runResults
};

for (const suite of suites) {
  try {
    const text = readFileSync(join(repoRoot, "test-results", suite.report), "utf8");
    combined[suite.id] = JSON.parse(text);
  } catch {
    combined[suite.id] = null;
  }
}

const outputPath = writeJsonReport("mini-c-release-matrix.json", combined);
console.log(`[mini-c-release] report: ${outputPath}`);
if (hasFailure) process.exitCode = 1;

