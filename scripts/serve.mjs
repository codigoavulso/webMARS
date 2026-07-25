import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const rootPrefix = `${projectRoot}${sep}`;
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
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".s", "text/plain; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"]
]);

function sendText(response, status, message) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

function resolveRequestPath(requestUrl) {
  const requestPath = decodeURIComponent(new URL(requestUrl || "/", "http://localhost").pathname);
  const relativePath = requestPath.replace(/^[/\\]+/, "") || "index.html";
  const target = resolve(projectRoot, relativePath);
  if (target !== projectRoot && !target.startsWith(rootPrefix)) return null;
  return target;
}

const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    sendText(response, 405, "Method not allowed");
    return;
  }

  let target;
  try {
    target = resolveRequestPath(request.url);
  } catch {
    sendText(response, 400, "Invalid request path");
    return;
  }

  if (!target) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    let fileStats = await stat(target);
    if (fileStats.isDirectory()) {
      target = resolve(target, "index.html");
      if (target !== projectRoot && !target.startsWith(rootPrefix)) {
        sendText(response, 403, "Forbidden");
        return;
      }
      fileStats = await stat(target);
    }
    if (!fileStats.isFile()) throw new Error("Not a file");

    response.writeHead(200, {
      "Content-Length": fileStats.size,
      "Content-Type": mimeTypes.get(extname(target).toLowerCase()) || "application/octet-stream"
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    createReadStream(target).pipe(response);
  } catch {
    sendText(response, 404, "Not found");
  }
});

server.on("error", (error) => {
  console.error(`[serve] ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`[serve] webMARS: http://${host}:${port}`);
});
