import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const ROOT = resolve(import.meta.dirname, "..", "..");
const EXPIRY = "2026-08-28";
const EXPECTED_VERSION = "7.18.2";
const ADVISORY = "GHSA-qwww-vcr4-c8h2";

function fail(message) {
  throw new Error(`[${ADVISORY}] ${message}`);
}

if (new Date(`${EXPIRY}T23:59:59Z`) < new Date()) {
  fail(`temporary RSC-mode exception expired on ${EXPIRY}; review the official advisory before continuing.`);
}

const packageJson = JSON.parse(readFileSync(resolve(ROOT, "package.json"), "utf8"));
if (packageJson.dependencies?.["react-router-dom"] !== EXPECTED_VERSION) {
  fail(`react-router-dom must remain pinned to ${EXPECTED_VERSION}; found ${packageJson.dependencies?.["react-router-dom"] ?? "missing"}.`);
}

const lockfile = JSON.parse(readFileSync(resolve(ROOT, "package-lock.json"), "utf8"));
for (const packageName of ["react-router", "react-router-dom"]) {
  const installedVersion = lockfile.packages?.[`node_modules/${packageName}`]?.version;
  if (installedVersion !== EXPECTED_VERSION) {
    fail(`${packageName} must resolve to ${EXPECTED_VERSION}; found ${installedVersion ?? "missing"}.`);
  }
}

const appSource = readFileSync(resolve(ROOT, "src/app/App.jsx"), "utf8");
const routesSource = readFileSync(resolve(ROOT, "src/app/router/AppRoutes.jsx"), "utf8");
if (!appSource.includes("<BrowserRouter>")) {
  fail("the application must use BrowserRouter declarative mode.");
}

const forbiddenRouterApis = [
  "createBrowserRouter",
  "RouterProvider",
  "unstable_RSC",
  "unstableRSC",
  "react-router/unstable-rsc",
];
for (const api of forbiddenRouterApis) {
  if (`${appSource}\n${routesSource}`.includes(api)) {
    fail(`found ${api}; the RSC-only exception is no longer valid.`);
  }
}

if (/\b(loader|action)\s*:/.test(routesSource)) {
  fail("found a data-router loader/action definition; review the exception.");
}

console.log(`${ADVISORY}: BrowserRouter declarative mode verified; unstable RSC APIs are absent (expires ${EXPIRY}).`);
