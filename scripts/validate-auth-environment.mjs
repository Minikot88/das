const required = [
  "APP_DOMAIN",
  "APP_URL",
  "CORS_ALLOWED_ORIGINS",
  "AUTH_MODE",
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

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(`Missing production authentication environment: ${missing.join(", ")}`);
}
if (process.env.AUTH_MODE !== "external") {
  throw new Error("Production authentication requires AUTH_MODE=external");
}
if (process.env.AUTH_EXTERNAL_PROVIDER !== "psu-sso") {
  throw new Error("AUTH_EXTERNAL_PROVIDER must be psu-sso");
}
if (process.env.AUTH_ALLOWED_ALGORITHMS !== "RS256") {
  throw new Error("AUTH_ALLOWED_ALGORITHMS must be RS256");
}

const expectedEndpoints = {
  AUTH_ISSUER: "https://psusso.psu.ac.th/application/o/research-triupact/",
  AUTH_JWKS_URL: "https://psusso.psu.ac.th/application/o/research-triupact/jwks/",
  OIDC_AUTHORIZATION_URL: "https://psusso.psu.ac.th/application/o/authorize/",
  OIDC_TOKEN_URL: "https://psusso.psu.ac.th/application/o/token/",
  OIDC_USERINFO_URL: "https://psusso.psu.ac.th/application/o/userinfo/",
};
for (const [name, expected] of Object.entries(expectedEndpoints)) {
  let url;
  try {
    url = new URL(process.env[name]);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL`);
  }
  if (url.protocol !== "https:" || url.href !== expected) {
    throw new Error(`${name} must match the verified PSU SSO endpoint`);
  }
}

const publicUrl = new URL(process.env.APP_URL);
if (
  publicUrl.protocol !== "https:"
  || publicUrl.origin !== process.env.APP_URL
  || publicUrl.host !== process.env.APP_DOMAIN
) {
  throw new Error("APP_URL must be the exact HTTPS origin matching APP_DOMAIN");
}
if (process.env.CORS_ALLOWED_ORIGINS !== publicUrl.origin) {
  throw new Error("CORS_ALLOWED_ORIGINS must contain only APP_URL");
}
if (
  process.env.OIDC_REDIRECT_URI
  !== `${publicUrl.origin}/api/auth/callback`
) {
  throw new Error("OIDC_REDIRECT_URI must exactly match the Dashboard callback URL");
}
if (process.env.AUTH_AUDIENCE !== process.env.OIDC_CLIENT_ID) {
  throw new Error("AUTH_AUDIENCE must exactly match OIDC_CLIENT_ID");
}
if (!process.env.OIDC_SCOPES.split(/\s+/).includes("openid")) {
  throw new Error("OIDC_SCOPES must include openid");
}
if (process.env.VITE_EXTERNAL_SESSION_REQUIRED_URL !== "/api/auth/login") {
  throw new Error("VITE_EXTERNAL_SESSION_REQUIRED_URL must be /api/auth/login");
}
if (
  process.env.SESSION_COOKIE_SECURE !== "true"
  || process.env.SESSION_COOKIE_HTTP_ONLY !== "true"
  || process.env.SESSION_COOKIE_SAME_SITE.toLowerCase() !== "lax"
) {
  throw new Error("Production session cookies must be Secure, HttpOnly, and SameSite=Lax");
}
if (process.env.SESSION_COOKIE_NAME !== "dashboardmini_session") {
  throw new Error("SESSION_COOKIE_NAME must be dashboardmini_session");
}
for (const name of ["OIDC_CLIENT_ID", "OIDC_CLIENT_SECRET", "SESSION_SECRET"]) {
  const value = process.env[name];
  if (
    value.length < 32 && name !== "OIDC_CLIENT_ID"
    || /placeholder|change[-_]?me|example|<|>/i.test(value)
  ) {
    throw new Error(`${name} is missing or invalid`);
  }
}

console.log("Production PSU SSO environment is complete.");
