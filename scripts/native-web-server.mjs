import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

export function createNativeWebServer({
  root = path.resolve(process.cwd(), "dist"),
  frameAncestors = process.env.EMBED_ALLOWED_ORIGINS || "'self'",
} = {}) {
  const publicRoot = path.resolve(root);
  const ancestors = validateFrameAncestors(frameAncestors);
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "frame-src 'self'",
    `frame-ancestors ${ancestors}`,
    "form-action 'self'",
  ].join("; ");

  return createServer(async (request, response) => {
    setSecurityHeaders(response, contentSecurityPolicy);
    if (!["GET", "HEAD"].includes(request.method || "")) {
      response.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
      response.end("Method not allowed\n");
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
    } catch {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Bad request\n");
      return;
    }
    if (pathname === "/healthz") {
      response.writeHead(200, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : "ok\n");
      return;
    }
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      response.writeHead(404, { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : JSON.stringify({ error: "API route not found on web service" }));
      return;
    }
    if (isSensitivePath(pathname)) {
      response.writeHead(404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" });
      response.end();
      return;
    }

    const requestedFile = safeResolve(publicRoot, pathname === "/" ? "/index.html" : pathname);
    const assetRequest = pathname.startsWith("/assets/");
    if (requestedFile && await isFile(requestedFile)) {
      sendFile(request, response, requestedFile, assetRequest);
      return;
    }
    if (assetRequest) {
      response.writeHead(404, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" });
      response.end();
      return;
    }
    const indexFile = path.join(publicRoot, "index.html");
    if (!await isFile(indexFile)) {
      response.writeHead(503, { "Cache-Control": "no-store", "Content-Type": "text/plain; charset=utf-8" });
      response.end("Frontend build unavailable\n");
      return;
    }
    sendFile(request, response, indexFile, false);
  });
}

function validateFrameAncestors(rawValue) {
  const tokens = String(rawValue).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length || tokens.length > 10) throw new Error("EMBED_ALLOWED_ORIGINS must contain 1-10 exact origins");
  for (const token of tokens) {
    if (token === "'self'" || token === "'none'") continue;
    let url;
    try {
      url = new URL(token);
    } catch {
      throw new Error("EMBED_ALLOWED_ORIGINS must contain only 'self', 'none', or exact HTTPS origins");
    }
    if (url.protocol !== "https:" || url.origin !== token) {
      throw new Error("EMBED_ALLOWED_ORIGINS must contain only 'self', 'none', or exact HTTPS origins");
    }
  }
  if (tokens.includes("'none'") && tokens.length > 1) throw new Error("'none' cannot be combined with other frame ancestors");
  return tokens.join(" ");
}

function setSecurityHeaders(response, contentSecurityPolicy) {
  response.setHeader("Content-Security-Policy", contentSecurityPolicy);
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
}

function isSensitivePath(pathname) {
  return pathname.split("/").some((part) => part.startsWith("."))
    || /\.(?:bak|old|tmp|sql|dump|env|map)$/i.test(pathname);
}

function safeResolve(root, pathname) {
  const resolved = path.resolve(root, `.${pathname}`);
  return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}

async function isFile(file) {
  if (!file) return false;
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

function sendFile(request, response, file, immutable) {
  response.writeHead(200, {
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-store, max-age=0",
    "Content-Type": MIME_TYPES.get(path.extname(file).toLowerCase()) || "application/octet-stream",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(file).on("error", () => response.destroy()).pipe(response);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  const port = Number(process.env.DASHBOARDMINI_WEB_PORT || 4021);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("DASHBOARDMINI_WEB_PORT must be a valid port");
  const releaseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const server = createNativeWebServer({ root: path.join(releaseRoot, "dist") });
  server.listen(port, "0.0.0.0");
}
