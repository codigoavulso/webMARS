import { createReadStream } from "node:fs";
import { readFile, stat, realpath } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { BUILD_ID_PATTERN, BUILD_MANIFEST, isPublicReleasePath } from "./package-release.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const host = process.env.HOST || "127.0.0.1";
const portArgumentIndex = process.argv.indexOf("--port");
const rawPort = portArgumentIndex >= 0 ? process.argv[portArgumentIndex + 1] : process.env.PORT;
const normalizedPort = String(rawPort || "8080").trim();
const port = /^\d+$/.test(normalizedPort) ? Number(normalizedPort) : Number.NaN;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`[serve] Invalid port: ${rawPort}`);
  process.exit(1);
}

const mimeTypes = new Map([
  [".asm", "text/plain; charset=utf-8"],
  [".c", "text/plain; charset=utf-8"],
  [".c0", "text/plain; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".s", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"]
]);

function sendText(response, status, message) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

export function resolveRequestPath(requestUrl, root = projectRoot) {
  const requestPath = decodeURIComponent(new URL(requestUrl || "/", "http://localhost").pathname);
  const relativePath = requestPath.replace(/^[/\\]+/, "") || "index.html";
  const target = resolve(root, relativePath);
  if (target !== root && !target.startsWith(`${root}${sep}`)) return null;
  if (relativePath.split(/[/\\]/).some((part) => part.startsWith("."))) return null;
  return target;
}

export async function resolvePublicFile(target, root = projectRoot) {
  let fileStats = await stat(target);
  if (fileStats.isDirectory()) target = resolve(target, "index.html");
  if (!isPublicReleasePath(relative(root, target))) return null;
  const actual = await realpath(target);
  const actualRoot = await realpath(root);
  if (!actual.startsWith(`${actualRoot}${sep}`) || !isPublicReleasePath(relative(actualRoot, actual))) return null;
  fileStats = await stat(actual);
  return fileStats.isFile() ? { target: actual, fileStats } : null;
}

export function isStableAppRoute(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl || "/", "http://localhost").pathname);
  return /^\/(?:e\/[a-z0-9][a-z0-9-]{0,79}|p\/[a-z0-9]+(?:-[a-z0-9]+)*(?:@[1-9]\d*)?)\/?$/.test(pathname);
}

async function readArtifactId(root) {
  try {
    const file = await resolvePublicFile(resolve(root, BUILD_MANIFEST), root);
    return file ? JSON.parse(await readFile(file.target, "utf8")).id : null;
  } catch {
    return null;
  }
}

async function serveRequest(request, response, documentRoot) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendText(response, 405, "Method not allowed");
    return;
  }

  let root;
  try {
    // Resolve an active-release symlink once. Every subsequent lookup for
    // this request uses that same release even if the symlink moves.
    root = await realpath(documentRoot);
  } catch {
    sendText(response, 404, "Not found");
    return;
  }

  let target;
  try {
    target = isStableAppRoute(request.url)
      ? resolve(root, "index.html")
      : resolveRequestPath(request.url, root);
  } catch {
    sendText(response, 400, "Invalid request path");
    return;
  }

  if (!target) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    const publicFile = await resolvePublicFile(target, root);
    if (!publicFile) { sendText(response, 403, "Forbidden"); return; }
    ({ target } = publicFile);
    const { fileStats } = publicFile;
    const path = relative(root, target).replaceAll(sep, "/");
    const build = new URL(request.url, "http://localhost").searchParams.get("b") || "";
    const versionedPath = path === "webmars-config.js" || /^(?:assets|examples|help|libs|tools)\//.test(path);
    if (versionedPath && BUILD_ID_PATTERN.test(build)) {
      if (build !== await readArtifactId(root)) {
        sendText(response, 404, "Build resource unavailable");
        return;
      }
      response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }

    response.writeHead(200, {
      "Content-Length": fileStats.size,
      "Content-Type": mimeTypes.get(extname(target).toLowerCase()) || "application/octet-stream"
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    const stream = createReadStream(target);
    stream.on("error", () => response.destroy());
    stream.pipe(response);
  } catch {
    sendText(response, 404, "Not found");
  }
}

export function createStaticServer(root = projectRoot) {
  const documentRoot = resolve(root);
  return createServer((request, response) => serveRequest(request, response, documentRoot));
}

const rootArgumentIndex = process.argv.indexOf("--root");
const rawRoot = rootArgumentIndex < 0 ? projectRoot : process.argv[rootArgumentIndex + 1];
if (!rawRoot || rawRoot.startsWith("--")) {
  console.error("[serve] --root requires a deployment directory.");
  process.exit(1);
}
export const server = createStaticServer(rawRoot);
server.on("error", (error) => {
  console.error(`[serve] ${error.message}`);
  process.exitCode = 1;
});

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(port, host, () => {
    console.log(`[serve] webMARS: http://${host}:${port}`);
  });
}
