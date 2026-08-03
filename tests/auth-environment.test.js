import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const script = resolve("scripts/validate-auth-environment.mjs");
const complete = {
  AUTH_MODE: "external",
  AUTH_EXTERNAL_PROVIDER: "main-website",
  AUTH_JWKS_URL: "https://identity.triup-psu.space/.well-known/jwks.json",
  AUTH_ISSUER: "https://identity.triup-psu.space",
  AUTH_AUDIENCE: "dashboardmini",
  AUTH_ALLOWED_ALGORITHMS: "RS256",
  AUTH_ORGANIZATION_CLAIM: "org_id",
  AUTH_ROLES_CLAIM: "roles",
  VITE_EXTERNAL_SESSION_REQUIRED_URL: "https://triup-psu.space/session-required",
};

function run(overrides = {}) {
  const names = [
    "AUTH_MODE",
    "AUTH_EXTERNAL_PROVIDER",
    "AUTH_JWKS_URL",
    "AUTH_ISSUER",
    "AUTH_AUDIENCE",
    "AUTH_ALLOWED_ALGORITHMS",
    "AUTH_ORGANIZATION_CLAIM",
    "AUTH_ROLES_CLAIM",
    "AUTH_SCOPES_CLAIM",
    "VITE_EXTERNAL_SESSION_REQUIRED_URL",
  ];
  const env = { ...process.env };
  names.forEach((name) => delete env[name]);
  Object.assign(env, complete, overrides);
  return spawnSync(process.execPath, [script], { env, encoding: "utf8" });
}

describe("production external-auth environment gate", () => {
  it("accepts a complete asymmetric JWT/JWKS contract", () => {
    expect(run().status).toBe(0);
  });

  it("reports only missing environment names", () => {
    const result = run({ AUTH_JWKS_URL: "" });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("AUTH_JWKS_URL");
    expect(result.stderr).not.toContain(complete.AUTH_ISSUER);
  });

  it("rejects disabled mode, symmetric algorithms, and placeholder URLs", () => {
    expect(run({ AUTH_MODE: "disabled" }).status).not.toBe(0);
    expect(run({ AUTH_ALLOWED_ALGORITHMS: "HS256" }).status).not.toBe(0);
    expect(run({ AUTH_JWKS_URL: "https://placeholder.example/jwks" }).status).not.toBe(0);
  });
});
