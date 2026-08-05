import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const script = resolve("scripts/validate-auth-environment.mjs");
const complete = {
  APP_DOMAIN: "dash.triup-psu.space",
  APP_URL: "https://dash.triup-psu.space",
  CORS_ALLOWED_ORIGINS: "https://dash.triup-psu.space",
  AUTH_MODE: "external",
  AUTH_EXTERNAL_PROVIDER: "psu-sso",
  AUTH_JWKS_URL: "https://psusso.psu.ac.th/application/o/research-triupact/jwks/",
  AUTH_ISSUER: "https://psusso.psu.ac.th/application/o/research-triupact/",
  AUTH_AUDIENCE: "dashboardmini-test-client",
  AUTH_ALLOWED_ALGORITHMS: "RS256",
  OIDC_AUTHORIZATION_URL: "https://psusso.psu.ac.th/application/o/authorize/",
  OIDC_TOKEN_URL: "https://psusso.psu.ac.th/application/o/token/",
  OIDC_USERINFO_URL: "https://psusso.psu.ac.th/application/o/userinfo/",
  OIDC_CLIENT_ID: "dashboardmini-test-client",
  OIDC_CLIENT_SECRET: "test-client-secret-value-000000000000",
  OIDC_REDIRECT_URI: "https://dash.triup-psu.space/api/auth/callback",
  OIDC_SCOPES: "openid profile email",
  SESSION_SECRET: "test-session-secret-value-000000000000",
  SESSION_COOKIE_NAME: "dashboardmini_session",
  SESSION_COOKIE_SECURE: "true",
  SESSION_COOKIE_HTTP_ONLY: "true",
  SESSION_COOKIE_SAME_SITE: "lax",
  VITE_EXTERNAL_SESSION_REQUIRED_URL: "/api/auth/login",
};

function run(overrides = {}) {
  const names = [
    "AUTH_MODE",
    "APP_DOMAIN",
    "APP_URL",
    "CORS_ALLOWED_ORIGINS",
    "AUTH_EXTERNAL_PROVIDER",
    "AUTH_JWKS_URL",
    "AUTH_ISSUER",
    "AUTH_AUDIENCE",
    "AUTH_ALLOWED_ALGORITHMS",
    "OIDC_AUTHORIZATION_URL",
    "OIDC_TOKEN_URL",
    "OIDC_USERINFO_URL",
    "OIDC_CLIENT_ID",
    "OIDC_CLIENT_SECRET",
    "OIDC_REDIRECT_URI",
    "OIDC_SCOPES",
    "SESSION_SECRET",
    "SESSION_COOKIE_NAME",
    "SESSION_COOKIE_SECURE",
    "SESSION_COOKIE_HTTP_ONLY",
    "SESSION_COOKIE_SAME_SITE",
    "VITE_EXTERNAL_SESSION_REQUIRED_URL",
  ];
  const env = { ...process.env };
  names.forEach((name) => delete env[name]);
  Object.assign(env, complete, overrides);
  return spawnSync(process.execPath, [script], { env, encoding: "utf8" });
}

describe("production external-auth environment gate", () => {
  it("accepts a complete PSU SSO authorization-code contract", () => {
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

  it("binds the audience to the client and callback/CORS to the Dashboard origin", () => {
    expect(run({ AUTH_AUDIENCE: "another-client" }).status).not.toBe(0);
    expect(run({ CORS_ALLOWED_ORIGINS: "*" }).status).not.toBe(0);
    expect(run({ APP_URL: "https://dash.triup-psu.space/path" }).status).not.toBe(0);
    expect(run({ AUTH_ISSUER: "https://dash.triup-psu.space/issuer" }).status).not.toBe(0);
    expect(run({ AUTH_JWKS_URL: "https://dash.triup-psu.space/jwks" }).status).not.toBe(0);
    expect(run({ OIDC_REDIRECT_URI: "https://dash.triup-psu.space/other" }).status).not.toBe(0);
    expect(run({ VITE_EXTERNAL_SESSION_REQUIRED_URL: "https://external.example/login" }).status).not.toBe(0);
  });
});
