const REQUIRED_KEY_BYTES = 32;

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
};

export function parseEnvironment(input: NodeJS.ProcessEnv | Record<string, string | undefined>): RuntimeEnvironment {
  const nodeEnv = (input.NODE_ENV || 'development') as RuntimeEnvironment['nodeEnv'];
  const authProvider = (input.AUTH_PROVIDER || 'development') as RuntimeEnvironment['authProvider'];

  if (!['development', 'test', 'production'].includes(nodeEnv)) throw new Error(`Unsupported NODE_ENV: ${nodeEnv}`);
  if (!['development', 'external'].includes(authProvider)) throw new Error(`Unsupported AUTH_PROVIDER: ${authProvider}`);
  if (nodeEnv === 'production' && authProvider === 'development') {
    throw new Error('Development authentication is forbidden in production');
  }

  if (nodeEnv === 'production' && !input.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
  if (nodeEnv === 'production' && !input.SECRET_MASTER_KEY) throw new Error('SECRET_MASTER_KEY is required in production');
  if (nodeEnv === 'production' && !input.SESSION_SIGNING_KEY) throw new Error('SESSION_SIGNING_KEY is required in production');

  const secretMasterKey = input.SECRET_MASTER_KEY;
  if (secretMasterKey) {
    let decoded: Buffer;
    try {
      decoded = Buffer.from(secretMasterKey, 'base64');
    } catch {
      throw new Error('SECRET_MASTER_KEY must be base64 encoded');
    }
    if (decoded.length !== REQUIRED_KEY_BYTES) throw new Error('SECRET_MASTER_KEY must decode to exactly 32 bytes');
  }

  const sessionSigningKey = input.SESSION_SIGNING_KEY;
  if (sessionSigningKey && Buffer.from(sessionSigningKey, 'base64').length < 32) {
    throw new Error('SESSION_SIGNING_KEY must decode to at least 32 bytes');
  }
  const port = Number(input.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port');

  return {
    nodeEnv,
    authProvider,
    secretMasterKey,
    databaseUrl: input.DATABASE_URL,
    developmentAuthEmail: input.DEVELOPMENT_AUTH_EMAIL,
    developmentAuthPassword: input.DEVELOPMENT_AUTH_PASSWORD,
    sessionSigningKey,
    corsOrigins: String(input.CORS_ORIGINS || 'http://localhost:8080').split(',').map(value => value.trim()).filter(Boolean),
    port,
  };
}
