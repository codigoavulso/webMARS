import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function resolveNpmTestCommand({
  platform = process.platform,
  execPath = process.execPath,
  npmExecPath = process.env.npm_execpath
} = {}) {
  // `npm run` exposes its JavaScript entry point. Running that entry point with
  // Node avoids the Windows `spawnSync("npm.cmd", ...)` EINVAL failure without
  // invoking a command shell or interpolating arguments.
  if (typeof npmExecPath === "string" && npmExecPath.trim()) {
    return { command: execPath, args: [npmExecPath, "test"] };
  }

  // Direct `node scripts/validate.mjs` invocations do not carry npm_execpath.
  // The Windows fallback uses one fixed command line; no external input is
  // interpolated into it. POSIX systems can execute the npm launcher directly.
  return platform === "win32"
    ? { command: "cmd.exe", args: ["/d", "/s", "/c", "npm.cmd test"] }
    : { command: "npm", args: ["test"] };
}

function runValidation() {
  const commands = [
    { command: process.execPath, args: ["scripts/check-static.mjs"] },
    resolveNpmTestCommand()
  ];

  for (const { command, args } of commands) {
    const result = spawnSync(command, args, {
      cwd: projectRoot,
      encoding: "utf8"
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) process.exit(result.status ?? 1);
  }

  console.log("[validate] Build checks and tests passed.");
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) runValidation();

export { resolveNpmTestCommand, runValidation };
