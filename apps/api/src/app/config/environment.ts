const REQUIRED_KEY_BYTES = 32;
const DEVELOPMENT_MASTER_KEY = Buffer.alloc(32, 97).toString('base64');
const DEVELOPMENT_SESSION_KEY = Buffer.alloc(32, 98).toString('base64');
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

export type RuntimeEnvironment = {
  nodeEnv: 'development' | 'test' | 'production';
  authProvider: 'database' | 'development' | 'external';
  secretMasterKey?: string;
  databaseUrl?: string;
  developmentAuthEmail?: string;
  developmentAuthPassword?: string;
  sessionSigningKey?: string;
  corsOrigins: string[];
  port: number;
  fileStoragePath: string;
  maxUploadSize: number;
  queryTimeoutMs: number;
  queryRowLimit: number;
  databasePoolMax: number;
  logLevel: typeof LOG_LEVELS[number];
  connectorNetworkAllowlist: string[];
  cookieSecure: boolean;
  publicRegistrationEnabled: boolean;
  sessionIdleTimeoutSeconds: number;
  sessionAbsoluteTimeoutSeconds: number;
  passwordResetTimeoutSeconds: number;
  invitationTimeoutSeconds: number;
  appDomain?: string;
  appUrl?: string;
  cookieSecret?: string;
  csrfSecret?: string;
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
  const authProvider = (input.AUTH_PROVIDER || 'development') as RuntimeEnvironment['authProvider'];
  const databaseUrlValue = input.DATABASE_URL;
  const secretMasterKeyValue = input.SECRET_ENCRYPTION_KEY || input.SECRET_MASTER_KEY;
  const sessionSigningKeyValue = input.SESSION_SECRET || input.SESSION_SIGNING_KEY;
  const corsOriginsValue = input.CORS_ALLOWED_ORIGINS || input.CORS_ORIGINS;

  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error(`Unsupported NODE_ENV: ${nodeEnv}`);
  if (!['database', 'development', 'external'].includes(authProvider)) throw new Error(`Unsupported AUTH_PROVIDER: ${authProvider}`);
  if (nodeEnv === 'production' && authProvider === 'development') {
    throw new Error('Development authentication is forbidden in production');
  }

  if (nodeEnv === 'production' && input.DEBUG === 'true') throw new Error('DEBUG mode is forbidden in production');
  if (nodeEnv === 'production' && input.DEMO_CONNECTOR_ENABLED === 'true') throw new Error('Demo connector is forbidden in production');
  if (nodeEnv === 'production' && input.INCLUDE_DEMO_SEED === 'true') throw new Error('Demo seed is forbidden in production');

  if (nodeEnv === 'production' && !databaseUrlValue) throw new Error('DATABASE_URL is required in production');
  if (nodeEnv === 'production' && !secretMasterKeyValue) throw new Error('SECRET_MASTER_KEY or SECRET_ENCRYPTION_KEY is required in production');
  if (nodeEnv === 'production' && !sessionSigningKeyValue) throw new Error('SESSION_SIGNING_KEY or SESSION_SECRET is required in production');

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

  const sessionSigningKey = sessionSigningKeyValue;
  if (sessionSigningKey) {
    const decoded = Buffer.from(sessionSigningKey, 'base64');
    if (decoded.length < 32) throw new Error('SESSION_SIGNING_KEY must decode to at least 32 bytes');
    if (nodeEnv === 'production' && decoded.equals(Buffer.from(DEVELOPMENT_SESSION_KEY, 'base64'))) {
      throw new Error('The development SESSION_SIGNING_KEY is forbidden in production');
    }
  }
  const port = Number(input.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');

  const corsOrigins = parseCorsOrigins(corsOriginsValue);
  if (nodeEnv === 'production' && !corsOriginsValue) throw new Error('CORS_ORIGINS or CORS_ALLOWED_ORIGINS is required in production');
  const logLevel = String(input.LOG_LEVEL || 'info') as RuntimeEnvironment['logLevel'];
  if (!LOG_LEVELS.includes(logLevel)) throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}`);

  const cookieSecure = parseBoolean('COOKIE_SECURE', input.COOKIE_SECURE, nodeEnv === 'production');
  const publicRegistrationEnabled = parseBoolean('PUBLIC_REGISTRATION_ENABLED', input.PUBLIC_REGISTRATION_ENABLED, false);
  if (nodeEnv === 'production' && !cookieSecure) throw new Error('Secure cookie is required in production');
  if (nodeEnv === 'production' && publicRegistrationEnabled) throw new Error('Public registration is forbidden by the production default policy');
  const appDomain = input.APP_DOMAIN?.trim();
  const appUrl = input.APP_URL?.trim();
  const cookieSecret = input.COOKIE_SECRET;
  const csrfSecret = input.CSRF_SECRET;
  if (nodeEnv === 'production' && !appDomain) throw new Error('APP_DOMAIN is required in production');
  if (appDomain && !/^[a-z0-9.-]+(?::\d+)?$/i.test(appDomain)) throw new Error('APP_DOMAIN must be a hostname with an optional port');
  if (nodeEnv === 'production' && !appUrl) throw new Error('APP_URL is required in production');
  if (appUrl) {
    let parsed: URL;
    try { parsed = new URL(appUrl); } catch { throw new Error('APP_URL must be a valid URL'); }
    if (nodeEnv === 'production' && parsed.protocol !== 'https:') throw new Error('APP_URL must use HTTPS in production');
    if (appDomain && parsed.host !== appDomain) throw new Error('APP_URL host must match APP_DOMAIN');
  }
  if (nodeEnv === 'production') {
    assertSecret('COOKIE_SECRET', cookieSecret);
    assertSecret('CSRF_SECRET', csrfSecret);
    if (new Set([sessionSigningKey, cookieSecret, csrfSecret, secretMasterKey]).size !== 4) throw new Error('Production secrets must be independent');
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
  const sessionIdleTimeoutSeconds = parseBoundedInteger('SESSION_IDLE_TIMEOUT_SECONDS', input.SESSION_IDLE_TIMEOUT_SECONDS, 1_800, 300, 86_400);
  const sessionAbsoluteTimeoutSeconds = parseBoundedInteger('SESSION_ABSOLUTE_TIMEOUT_SECONDS', input.SESSION_ABSOLUTE_TIMEOUT_SECONDS, 604_800, 3_600, 2_592_000);
  if (sessionAbsoluteTimeoutSeconds <= sessionIdleTimeoutSeconds) throw new Error('SESSION_ABSOLUTE_TIMEOUT_SECONDS must exceed SESSION_IDLE_TIMEOUT_SECONDS');

  return {
    nodeEnv,
    authProvider,
    secretMasterKey,
    databaseUrl: databaseUrlValue,
    developmentAuthEmail: input.DEVELOPMENT_AUTH_EMAIL,
    developmentAuthPassword: input.DEVELOPMENT_AUTH_PASSWORD,
    sessionSigningKey,
    corsOrigins,
    port,
    fileStoragePath: String(input.FILE_STORAGE_PATH || '/data/uploads'),
    maxUploadSize: parseBoundedInteger('MAX_UPLOAD_SIZE', input.MAX_UPLOAD_SIZE, 5_000_000, 1, 6 * 1024 * 1024),
    queryTimeoutMs: parseBoundedInteger('QUERY_TIMEOUT', input.QUERY_TIMEOUT, 30_000, 100, 120_000),
    queryRowLimit: parseBoundedInteger('QUERY_ROW_LIMIT', input.QUERY_ROW_LIMIT, 50_000, 1, 50_000),
    databasePoolMax: parseBoundedInteger('DATABASE_POOL_MAX', input.DATABASE_POOL_MAX, 10, 1, 50),
    logLevel,
    connectorNetworkAllowlist: String(input.CONNECTOR_NETWORK_ALLOWLIST || '').split(',').map(value => value.trim()).filter(Boolean),
    cookieSecure,
    publicRegistrationEnabled,
    sessionIdleTimeoutSeconds,
    sessionAbsoluteTimeoutSeconds,
    passwordResetTimeoutSeconds: parseBoundedInteger('PASSWORD_RESET_TIMEOUT_SECONDS', input.PASSWORD_RESET_TIMEOUT_SECONDS, 900, 300, 86_400),
    invitationTimeoutSeconds: parseBoundedInteger('INVITATION_TIMEOUT_SECONDS', input.INVITATION_TIMEOUT_SECONDS, 604_800, 900, 2_592_000),
    appDomain,
    appUrl,
    cookieSecret,
    csrfSecret,
    smtp: { enabled: smtpEnabled, host: input.SMTP_HOST, port: smtpPort, user: input.SMTP_USER, password: input.SMTP_PASSWORD, from: input.SMTP_FROM, secure: smtpSecure },
    metricsEnabled,
    metricsToken,
  };
}

function assertSecret(name: string, value: string | undefined) {
  if (!value || Buffer.byteLength(value) < 32) throw new Error(`${name} must contain at least 32 bytes`);
  if (/change[_-]?me|example|default/i.test(value)) throw new Error(`${name} cannot use a placeholder value in production`);
}
