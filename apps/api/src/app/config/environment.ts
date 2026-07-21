const REQUIRED_KEY_BYTES = 32;
const DEVELOPMENT_MASTER_KEY = Buffer.alloc(32, 97).toString('base64');
const DEVELOPMENT_SESSION_KEY = Buffer.alloc(32, 98).toString('base64');
const LOG_LEVELS = ['error', 'warn', 'info', 'debug'] as const;

export type RuntimeEnvironment = {
  nodeEnv: 'development' | 'test' | 'production';
  authProvider: 'development' | 'external';
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

export function parseEnvironment(input: NodeJS.ProcessEnv | Record<string, string | undefined>): RuntimeEnvironment {
  const nodeEnv = (input.NODE_ENV || 'development') as RuntimeEnvironment['nodeEnv'];
  const authProvider = (input.AUTH_PROVIDER || 'development') as RuntimeEnvironment['authProvider'];

  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error(`Unsupported NODE_ENV: ${nodeEnv}`);
  if (!['development', 'external'].includes(authProvider)) throw new Error(`Unsupported AUTH_PROVIDER: ${authProvider}`);
  if (nodeEnv === 'production' && authProvider === 'development') {
    throw new Error('Development authentication is forbidden in production');
  }

  if (nodeEnv === 'production' && input.DEBUG === 'true') throw new Error('DEBUG mode is forbidden in production');
  if (nodeEnv === 'production' && input.DEMO_CONNECTOR_ENABLED === 'true') throw new Error('Demo connector is forbidden in production');
  if (nodeEnv === 'production' && input.INCLUDE_DEMO_SEED === 'true') throw new Error('Demo seed is forbidden in production');

  if (nodeEnv === 'production' && !input.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
  if (nodeEnv === 'production' && !input.SECRET_MASTER_KEY) throw new Error('SECRET_MASTER_KEY is required in production');
  if (nodeEnv === 'production' && !input.SESSION_SIGNING_KEY) throw new Error('SESSION_SIGNING_KEY is required in production');

  if (input.DATABASE_URL) {
    let databaseUrl: URL;
    try { databaseUrl = new URL(input.DATABASE_URL); } catch { throw new Error('DATABASE_URL must be a valid PostgreSQL URL'); }
    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) throw new Error('DATABASE_URL must use PostgreSQL');
  }

  const secretMasterKey = input.SECRET_MASTER_KEY;
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

  const sessionSigningKey = input.SESSION_SIGNING_KEY;
  if (sessionSigningKey) {
    const decoded = Buffer.from(sessionSigningKey, 'base64');
    if (decoded.length < 32) throw new Error('SESSION_SIGNING_KEY must decode to at least 32 bytes');
    if (nodeEnv === 'production' && decoded.equals(Buffer.from(DEVELOPMENT_SESSION_KEY, 'base64'))) {
      throw new Error('The development SESSION_SIGNING_KEY is forbidden in production');
    }
  }
  const port = Number(input.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');

  const corsOrigins = parseCorsOrigins(input.CORS_ORIGINS);
  if (nodeEnv === 'production' && !input.CORS_ORIGINS) throw new Error('CORS_ORIGINS is required in production');
  const logLevel = String(input.LOG_LEVEL || 'info') as RuntimeEnvironment['logLevel'];
  if (!LOG_LEVELS.includes(logLevel)) throw new Error(`LOG_LEVEL must be one of: ${LOG_LEVELS.join(', ')}`);

  return {
    nodeEnv,
    authProvider,
    secretMasterKey,
    databaseUrl: input.DATABASE_URL,
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
  };
}
