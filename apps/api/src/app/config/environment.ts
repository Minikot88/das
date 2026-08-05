const REQUIRED_KEY_BYTES = 32;
const DEVELOPMENT_MASTER_KEY = Buffer.alloc(32, 97).toString('base64');
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

export type RuntimeEnvironment = {
  nodeEnv: 'development' | 'test' | 'production';
  authMode: 'external' | 'disabled';
  authExternalProvider: string;
  authJwksUrl?: string;
  authIssuer?: string;
  authAudience?: string;
  authAllowedAlgorithms: string[];
  authClockSkewSeconds: number;
  authOrganizationClaim: string;
  authRolesClaim: string;
  authScopesClaim: string;
  oidcAuthorizationUrl?: string;
  oidcTokenUrl?: string;
  oidcUserinfoUrl?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  oidcRedirectUri?: string;
  oidcScopes: string[];
  sessionSecret?: string;
  sessionCookieName: string;
  sessionCookieMaxAgeSeconds: number;
  sessionCookieSecure: boolean;
  sessionCookieHttpOnly: boolean;
  sessionCookieSameSite: 'lax';
  internalSingleUserId?: string;
  secretMasterKey?: string;
  databaseUrl?: string;
  corsOrigins: string[];
  port: number;
  fileStoragePath: string;
  maxUploadSize: number;
  queryTimeoutMs: number;
  queryRowLimit: number;
  databasePoolMax: number;
  logLevel: typeof LOG_LEVELS[number];
  connectorNetworkAllowlist: string[];
  externalSourceSchemas: string[];
  appDomain?: string;
  appUrl?: string;
  smtp: {
    enabled: boolean;
    host?: string;
    port: number;
    user?: string;
    password?: string;
    from?: string;
    secure: boolean;
  };
  metricsEnabled: boolean;
  metricsToken?: string;
};

function parseBoundedInteger(name: string, rawValue: string | undefined, fallback: number, minimum: number, maximum: number) {
  const value = Number(rawValue ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  return value;
}

function parseCorsOrigins(rawValue: string | undefined) {
  const origins = String(rawValue || 'http://localhost:8080').split(',').map(value => value.trim()).filter(Boolean);
  if (!origins.length || origins.includes('*')) throw new Error('CORS_ORIGINS must contain exact HTTP(S) origins and cannot use *');
  for (const origin of origins) {
    let url: URL;
    try { url = new URL(origin); } catch { throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}`); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`CORS_ORIGINS must contain exact HTTP(S) origins: ${origin}`);
    }
  }
  return origins;
}

function parseBoolean(name: string, rawValue: string | undefined, fallback: boolean) {
  if (rawValue === undefined) return fallback;
  if (rawValue === 'true') return true;
  if (rawValue === 'false') return false;
  throw new Error(`${name} must be true or false`);
}

export function parseEnvironment(input: NodeJS.ProcessEnv | Record<string, string | undefined>): RuntimeEnvironment {
  const nodeEnv = (input.APP_ENV || input.NODE_ENV || 'development') as RuntimeEnvironment['nodeEnv'];
  const authMode = (input.AUTH_MODE || 'disabled') as RuntimeEnvironment['authMode'];
  const internalSingleUserId = input.INTERNAL_SINGLE_USER_ID?.trim();
  const databaseUrlValue = input.DATABASE_URL;
  const secretMasterKeyValue = input.SECRET_ENCRYPTION_KEY || input.SECRET_MASTER_KEY;
  const corsOriginsValue = input.CORS_ALLOWED_ORIGINS || input.CORS_ORIGINS;

  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error(`Unsupported NODE_ENV: ${nodeEnv}`);
  if (!['external', 'disabled'].includes(authMode)) throw new Error(`Unsupported AUTH_MODE: ${authMode}`);
  if (nodeEnv === 'production' && authMode === 'disabled') throw new Error('AUTH_MODE=disabled is forbidden in production');
  const authExternalProvider = String(input.AUTH_EXTERNAL_PROVIDER || (nodeEnv === 'production' ? '' : 'psu-sso')).trim();
  const authJwksUrl = input.AUTH_JWKS_URL?.trim();
  const authIssuer = input.AUTH_ISSUER?.trim();
  const authAudience = input.AUTH_AUDIENCE?.trim() || (nodeEnv === 'production' ? undefined : 'https://dash.triup-psu.space');
  const authAllowedAlgorithms = String(input.AUTH_ALLOWED_ALGORITHMS || (nodeEnv === 'production' ? '' : 'RS256')).split(',').map(value => value.trim()).filter(Boolean);
  const authClockSkewSeconds = parseBoundedInteger('AUTH_CLOCK_SKEW_SECONDS', input.AUTH_CLOCK_SKEW_SECONDS, 60, 0, 300);
  const oidcAuthorizationUrl = input.OIDC_AUTHORIZATION_URL?.trim();
  const oidcTokenUrl = input.OIDC_TOKEN_URL?.trim();
  const oidcUserinfoUrl = input.OIDC_USERINFO_URL?.trim();
  const oidcClientId = input.OIDC_CLIENT_ID?.trim();
  const oidcClientSecret = input.OIDC_CLIENT_SECRET?.trim();
  const oidcRedirectUri = input.OIDC_REDIRECT_URI?.trim();
  const oidcScopes = String(input.OIDC_SCOPES || 'openid profile email').split(/\s+/).map(value => value.trim()).filter(Boolean);
  const sessionSecret = input.SESSION_SECRET?.trim();
  const sessionCookieName = String(input.SESSION_COOKIE_NAME || 'dashboardmini_session').trim();
  const sessionCookieMaxAgeSeconds = parseBoundedInteger('SESSION_COOKIE_MAX_AGE_SECONDS', input.SESSION_COOKIE_MAX_AGE_SECONDS, 3_600, 300, 28_800);
  const sessionCookieSecure = parseBoolean('SESSION_COOKIE_SECURE', input.SESSION_COOKIE_SECURE, nodeEnv === 'production');
  const sessionCookieHttpOnly = parseBoolean('SESSION_COOKIE_HTTP_ONLY', input.SESSION_COOKIE_HTTP_ONLY, true);
  const sessionCookieSameSite = String(input.SESSION_COOKIE_SAME_SITE || 'lax').trim().toLowerCase();
  if (authMode === 'external' && (
    !authExternalProvider
    || !authJwksUrl
    || !authIssuer
    || !authAudience
    || !authAllowedAlgorithms.length
    || !oidcAuthorizationUrl
    || !oidcTokenUrl
    || !oidcClientId
    || !oidcClientSecret
    || !oidcRedirectUri
    || !sessionSecret
  )) {
    throw new Error('External authentication requires the PSU SSO issuer, JWKS, OIDC client, redirect URI, and application session configuration');
  }
  if (authMode === 'external' && authAllowedAlgorithms.some(value => !/^RS(256|384|512)$/.test(value))) throw new Error('AUTH_ALLOWED_ALGORITHMS must contain only allowed asymmetric RS algorithms');
  if (authJwksUrl) {
    let url: URL;
    try { url = new URL(authJwksUrl); } catch { throw new Error('AUTH_JWKS_URL must be a valid URL'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('AUTH_JWKS_URL must use HTTP(S)');
    if (nodeEnv === 'production' && url.protocol !== 'https:') throw new Error('AUTH_JWKS_URL must use HTTPS in production');
  }
  if (authIssuer) {
    let url: URL;
    try { url = new URL(authIssuer); } catch { throw new Error('AUTH_ISSUER must be a valid URL'); }
    if (nodeEnv === 'production' && (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)) {
      throw new Error('AUTH_ISSUER must be a credential-free HTTPS URL in production');
    }
  }
  for (const [name, value] of [
    ['OIDC_AUTHORIZATION_URL', oidcAuthorizationUrl],
    ['OIDC_TOKEN_URL', oidcTokenUrl],
    ['OIDC_USERINFO_URL', oidcUserinfoUrl],
    ['OIDC_REDIRECT_URI', oidcRedirectUri],
  ] as const) {
    if (!value) continue;
    let url: URL;
    try { url = new URL(value); } catch { throw new Error(`${name} must be a valid URL`); }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) throw new Error(`${name} must be a credential-free HTTP(S) URL`);
    if (nodeEnv === 'production' && url.protocol !== 'https:') throw new Error(`${name} must use HTTPS in production`);
  }
  if (authMode === 'external' && !oidcScopes.includes('openid')) throw new Error('OIDC_SCOPES must include openid');
  if (oidcClientId && (!/^[\x21-\x7e]{1,255}$/.test(oidcClientId) || /placeholder|change[-_]?me|<|>/i.test(oidcClientId))) {
    throw new Error('OIDC_CLIENT_ID must be a non-placeholder client identifier');
  }
  if (authMode === 'external' && oidcClientSecret) assertSecret('OIDC_CLIENT_SECRET', oidcClientSecret);
  if (authMode === 'external' && sessionSecret) assertSecret('SESSION_SECRET', sessionSecret);
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(sessionCookieName)) throw new Error('SESSION_COOKIE_NAME must be a valid cookie name');
  if (!sessionCookieHttpOnly) throw new Error('SESSION_COOKIE_HTTP_ONLY must be true');
  if (sessionCookieSameSite !== 'lax') throw new Error('SESSION_COOKIE_SAME_SITE must be lax');
  if (nodeEnv === 'production' && !sessionCookieSecure) throw new Error('SESSION_COOKIE_SECURE must be true in production');
  if (nodeEnv === 'production' && authIssuer && /example|placeholder|change[-_]?me/i.test(authIssuer)) throw new Error('AUTH_ISSUER cannot use a placeholder value in production');
  for (const [name, value] of [
    ['AUTH_ORGANIZATION_CLAIM', input.AUTH_ORGANIZATION_CLAIM || 'org_id'],
    ['AUTH_ROLES_CLAIM', input.AUTH_ROLES_CLAIM || 'roles'],
    ['AUTH_SCOPES_CLAIM', input.AUTH_SCOPES_CLAIM || 'scopes'],
  ]) {
    if (!/^[A-Za-z_][A-Za-z0-9_.-]{0,79}$/.test(value)) throw new Error(`${name} must be a valid JWT claim name`);
  }
  if (nodeEnv === 'production' && internalSingleUserId) throw new Error('INTERNAL_SINGLE_USER_ID is forbidden in production');

  if (nodeEnv === 'production' && input.DEBUG === 'true') throw new Error('DEBUG mode is forbidden in production');
  if (nodeEnv === 'production' && input.DEMO_CONNECTOR_ENABLED === 'true') throw new Error('Demo connector is forbidden in production');
  if (nodeEnv === 'production' && (input.INCLUDE_DEMO_SEED === 'true' || input.ENABLE_DEMO_SEED === 'true')) {
    throw new Error('Demo seed is forbidden in production');
  }

  if (nodeEnv === 'production' && !databaseUrlValue) throw new Error('DATABASE_URL is required in production');
  if (nodeEnv === 'production' && !secretMasterKeyValue) throw new Error('SECRET_MASTER_KEY or SECRET_ENCRYPTION_KEY is required in production');

  if (databaseUrlValue) {
    let databaseUrl: URL;
    try { databaseUrl = new URL(databaseUrlValue); } catch { throw new Error('DATABASE_URL must be a valid PostgreSQL URL'); }
    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) throw new Error('DATABASE_URL must use PostgreSQL');
  }

  const secretMasterKey = secretMasterKeyValue;
  if (secretMasterKey) {
    let decoded: Buffer;
    try {
      decoded = Buffer.from(secretMasterKey, 'base64');
    } catch {
      throw new Error('SECRET_MASTER_KEY must be base64 encoded');
    }
    if (decoded.length !== REQUIRED_KEY_BYTES) throw new Error('SECRET_MASTER_KEY must decode to exactly 32 bytes');
    if (nodeEnv === 'production' && decoded.equals(Buffer.from(DEVELOPMENT_MASTER_KEY, 'base64'))) {
      throw new Error('The development SECRET_MASTER_KEY is forbidden in production');
    }
  }

  const port = Number(input.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');

  const corsOrigins = parseCorsOrigins(corsOriginsValue);
  if (nodeEnv === 'production' && !corsOriginsValue) throw new Error('CORS_ORIGINS or CORS_ALLOWED_ORIGINS is required in production');
  const logLevel = String(input.LOG_LEVEL || 'info') as RuntimeEnvironment['logLevel'];
  if (!LOG_LEVELS.includes(logLevel)) throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}`);

  const appDomain = input.APP_DOMAIN?.trim();
  const appUrl = input.APP_URL?.trim();
  if (nodeEnv === 'production' && !appDomain) throw new Error('APP_DOMAIN is required in production');
  if (appDomain && !/^[a-z0-9.-]+(?::\d+)?$/i.test(appDomain)) throw new Error('APP_DOMAIN must be a hostname with an optional port');
  if (nodeEnv === 'production' && !appUrl) throw new Error('APP_URL is required in production');
  let parsedAppUrl: URL | undefined;
  if (appUrl) {
    try { parsedAppUrl = new URL(appUrl); } catch { throw new Error('APP_URL must be a valid URL'); }
    if (nodeEnv === 'production' && parsedAppUrl.protocol !== 'https:') throw new Error('APP_URL must use HTTPS in production');
    if (parsedAppUrl.pathname !== '/' || parsedAppUrl.search || parsedAppUrl.hash || parsedAppUrl.username || parsedAppUrl.password) {
      throw new Error('APP_URL must be an exact origin without credentials, path, query, or fragment');
    }
    if (appDomain && parsedAppUrl.host !== appDomain) throw new Error('APP_URL host must match APP_DOMAIN');
  }
  if (nodeEnv === 'production' && parsedAppUrl) {
    if (authMode === 'external' && authExternalProvider !== 'psu-sso') throw new Error('AUTH_EXTERNAL_PROVIDER must be psu-sso in production');
    if (authAudience !== oidcClientId) throw new Error('AUTH_AUDIENCE must exactly match OIDC_CLIENT_ID');
    if (oidcRedirectUri !== `${parsedAppUrl.origin}/api/auth/callback`) throw new Error('OIDC_REDIRECT_URI must exactly match the Dashboard callback URL');
    if (corsOrigins.length !== 1 || corsOrigins[0] !== parsedAppUrl.origin) throw new Error('CORS_ALLOWED_ORIGINS must contain only the APP_URL origin');
    if (authIssuer && new URL(authIssuer).origin === parsedAppUrl.origin) throw new Error('AUTH_ISSUER must be issued by the external identity provider, not DashboardMiniBi');
    if (authJwksUrl && new URL(authJwksUrl).origin === parsedAppUrl.origin) throw new Error('AUTH_JWKS_URL must belong to the external identity provider, not DashboardMiniBi');
  }
  const smtpEnabled = parseBoolean('SMTP_ENABLED', input.SMTP_ENABLED, false);
  const smtpSecure = parseBoolean('SMTP_SECURE', input.SMTP_SECURE, false);
  const smtpPort = parseBoundedInteger('SMTP_PORT', input.SMTP_PORT, smtpSecure ? 465 : 587, 1, 65_535);
  if (smtpEnabled) {
    for (const name of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM'] as const) {
      if (!input[name]?.trim()) throw new Error(`${name} is required when SMTP_ENABLED is true`);
    }
    if (/\r|\n/.test(input.SMTP_FROM || '')) throw new Error('SMTP_FROM cannot contain newline characters');
  }
  const metricsEnabled = parseBoolean('METRICS_ENABLED', input.METRICS_ENABLED, false);
  const metricsToken = input.METRICS_TOKEN;
  if (nodeEnv === 'production' && metricsEnabled) assertSecret('METRICS_TOKEN', metricsToken);
  return {
    nodeEnv,
    authMode,
    authExternalProvider,
    authJwksUrl,
    authIssuer,
    authAudience,
    authAllowedAlgorithms,
    authClockSkewSeconds,
    authOrganizationClaim: String(input.AUTH_ORGANIZATION_CLAIM || 'org_id'),
    authRolesClaim: String(input.AUTH_ROLES_CLAIM || 'roles'),
    authScopesClaim: String(input.AUTH_SCOPES_CLAIM || 'scopes'),
    oidcAuthorizationUrl,
    oidcTokenUrl,
    oidcUserinfoUrl,
    oidcClientId,
    oidcClientSecret,
    oidcRedirectUri,
    oidcScopes,
    sessionSecret,
    sessionCookieName,
    sessionCookieMaxAgeSeconds,
    sessionCookieSecure,
    sessionCookieHttpOnly,
    sessionCookieSameSite,
    internalSingleUserId,
    secretMasterKey,
    databaseUrl: databaseUrlValue,
    corsOrigins,
    port,
    fileStoragePath: String(input.FILE_STORAGE_PATH || '/data/uploads'),
    maxUploadSize: parseBoundedInteger('MAX_UPLOAD_SIZE', input.MAX_UPLOAD_SIZE, 5_000_000, 1, 6 * 1024 * 1024),
    queryTimeoutMs: parseBoundedInteger('QUERY_TIMEOUT', input.QUERY_TIMEOUT, 30_000, 100, 120_000),
    queryRowLimit: parseBoundedInteger('QUERY_ROW_LIMIT', input.QUERY_ROW_LIMIT, 50_000, 1, 50_000),
    databasePoolMax: parseBoundedInteger('DATABASE_POOL_MAX', input.DATABASE_POOL_MAX, 10, 1, 50),
    logLevel,
    connectorNetworkAllowlist: String(input.CONNECTOR_NETWORK_ALLOWLIST || '').split(',').map(value => value.trim()).filter(Boolean),
    externalSourceSchemas: String(input.EXTERNAL_SOURCE_SCHEMAS || 'scopus').split(',').map(value => value.trim().toLowerCase()).filter(value => /^[a-z_][a-z0-9_]*$/.test(value) && !['public', 'pg_catalog', 'information_schema'].includes(value)),
    appDomain,
    appUrl,
    smtp: { enabled: smtpEnabled, host: input.SMTP_HOST, port: smtpPort, user: input.SMTP_USER, password: input.SMTP_PASSWORD, from: input.SMTP_FROM, secure: smtpSecure },
    metricsEnabled,
    metricsToken,
  };
}

function assertSecret(name: string, value: string | undefined) {
  if (!value || Buffer.byteLength(value) < 32) throw new Error(`${name} must contain at least 32 bytes`);
  if (/change[_-]?me|example|default/i.test(value)) throw new Error(`${name} cannot use a placeholder value in production`);
}
