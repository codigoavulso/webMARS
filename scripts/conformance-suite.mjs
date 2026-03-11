import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const runnerPath = resolve(__dirname, "differential-mars-vs-web.mjs");

const child = spawn(
  process.execPath,
  [runnerPath, "--output", "web/test-results/conformance-suite.json", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    cwd: resolve(__dirname, "..", "..")
  }
);

child.on("exit", (code) => {
  process.exitCode = Number.isFinite(code) ? code : 1;
});
