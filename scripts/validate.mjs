import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const commands = [
  ["scripts/check-static.mjs"],
  [
    "--test",
    "tests/core-regression.test.mjs",
    "tests/runtime-regression.test.mjs",
    "tests/runtime-isa-regression.test.mjs",
    "tests/runtime-memory-invariants.test.mjs",
    "tests/runtime-interrupt-regression.test.mjs",
    "tests/benchmark-regression.test.mjs",
    "tests/runtime-stop-regression.test.mjs",
    "tests/c-compiler-regression.test.mjs",
    "tests/tool-runtime-regression.test.mjs",
    "tests/examples-catalog-regression.test.mjs",
    "tests/help-documentation-regression.test.mjs",
    "tests/release-readiness.test.mjs"
  ]
];

for (const args of commands) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8"
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("[validate] Build checks and tests passed.");
