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
  "AUTH_ORGANIZATION_CLAIM",
  "VITE_EXTERNAL_SESSION_REQUIRED_URL",
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (!process.env.AUTH_ROLES_CLAIM?.trim() && !process.env.AUTH_SCOPES_CLAIM?.trim()) {
  missing.push("AUTH_ROLES_CLAIM or AUTH_SCOPES_CLAIM");
}
if (missing.length) {
  throw new Error(`Missing production authentication environment: ${missing.join(", ")}`);
}
if (process.env.AUTH_MODE !== "external") {
  throw new Error("Production authentication requires AUTH_MODE=external");
}
if (process.env.AUTH_EXTERNAL_PROVIDER !== "triup-main-website") {
  throw new Error("AUTH_EXTERNAL_PROVIDER must be triup-main-website");
}
if (!String(process.env.AUTH_ALLOWED_ALGORITHMS).split(",").map((value) => value.trim()).filter(Boolean).every((value) => /^RS(256|384|512)$/.test(value))) {
  throw new Error("AUTH_ALLOWED_ALGORITHMS must contain only asymmetric RS algorithms");
}
for (const name of ["AUTH_JWKS_URL", "AUTH_ISSUER", "VITE_EXTERNAL_SESSION_REQUIRED_URL"]) {
  const raw = process.env[name];
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL`);
  }
  if (url.protocol !== "https:" || /placeholder|change[-_]?me|example\.com|<|>/i.test(raw)) {
    throw new Error(`${name} must be a non-placeholder HTTPS URL`);
  }
}
for (const name of ["AUTH_EXTERNAL_PROVIDER", "AUTH_AUDIENCE", "AUTH_ORGANIZATION_CLAIM"]) {
  if (/placeholder|change[-_]?me|<|>/i.test(process.env[name])) {
    throw new Error(`${name} must not use a placeholder value`);
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
if (process.env.AUTH_AUDIENCE !== publicUrl.origin) {
  throw new Error("AUTH_AUDIENCE must exactly match APP_URL");
}
if (process.env.CORS_ALLOWED_ORIGINS !== publicUrl.origin) {
  throw new Error("CORS_ALLOWED_ORIGINS must contain only APP_URL");
}
for (const name of ["AUTH_JWKS_URL", "AUTH_ISSUER", "VITE_EXTERNAL_SESSION_REQUIRED_URL"]) {
  if (new URL(process.env[name]).origin === publicUrl.origin) {
    throw new Error(`${name} must belong to the external identity provider, not DashboardMiniBi`);
  }
}
console.log("Production authentication environment is complete.");
