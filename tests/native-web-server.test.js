import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createNativeWebServer } from "../scripts/native-web-server.mjs";

let root;
let server;
let baseUrl;

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "dashboardmini-web-"));
  await mkdir(path.join(root, "assets"));
  await writeFile(path.join(root, "index.html"), "<!doctype html><title>DashboardMiniBi</title>");
  await writeFile(path.join(root, "assets", "app.js"), "console.log('ready')");
  server = createNativeWebServer({ root });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(root, { recursive: true, force: true });
});

describe("native frontend server security boundary", () => {
  it("serves the SPA with CSP and without wildcard CORS", async () => {
    const response = await fetch(`${baseUrl}/dashboard-v2`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("connect-src 'self'");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(await response.text()).toContain("DashboardMiniBi");
  });

  it("does not turn API or missing asset requests into SPA success", async () => {
    expect((await fetch(`${baseUrl}/api/session/me`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/assets/missing.js`)).status).toBe(404);
    expect((await fetch(`${baseUrl}/.env`)).status).toBe(404);
  });

  it("rejects unsafe frame ancestor configuration", () => {
    expect(() => createNativeWebServer({ root, frameAncestors: "*" })).toThrow(/exact HTTPS origins/);
    expect(() => createNativeWebServer({ root, frameAncestors: "http://main.example.invalid" })).toThrow(/exact HTTPS origins/);
  });
});
