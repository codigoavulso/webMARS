import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const manualRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const root = resolve(manualRoot, "dist");
const rootPrefix = `${root}${sep}`;
const host = process.env.HOST || "127.0.0.1";
const portIndex = process.argv.indexOf("--port");
const rawPort = portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || "8090";
const port = /^\d+$/.test(String(rawPort)) ? Number(rawPort) : Number.NaN;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid port: ${rawPort}`);
}

const mime = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"]
]);

function send(response, status, message) {
  response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  response.end(message);
}

createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method || "")) {
    response.setHeader("Allow", "GET, HEAD");
    send(response, 405, "Method not allowed");
    return;
  }
  let target;
  try {
    const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    const relativePath = pathname.replace(/^[/\\]+/, "") || "index.html";
    target = resolve(root, relativePath);
  } catch {
    send(response, 400, "Invalid path");
    return;
  }
  if (target !== root && !target.startsWith(rootPrefix)) {
    send(response, 403, "Forbidden");
    return;
  }
  try {
    let info = await stat(target);
    if (info.isDirectory()) {
      target = resolve(target, "index.html");
      info = await stat(target);
    }
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Length": info.size,
      "Content-Type": mime.get(extname(target).toLowerCase()) || "application/octet-stream",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(target).pipe(response);
  } catch {
    send(response, 404, "Not found");
  }
}).listen(port, host, () => console.log(`[manual] http://${host}:${port}`));
