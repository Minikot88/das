import { describe, expect, it } from 'vitest';
import { parseEnvironment } from './environment.js';

describe('parseEnvironment', () => {
  const productionBase = {
    NODE_ENV: 'production', AUTH_MODE: 'external', AUTH_EXTERNAL_PROVIDER: 'main-website',
    AUTH_JWKS_URL: 'https://identity.triup-psu.space/.well-known/jwks.json',
    AUTH_ISSUER: 'https://identity.triup-psu.space', AUTH_AUDIENCE: 'dashboardmini',
    AUTH_ALLOWED_ALGORITHMS: 'RS256', DATABASE_URL: 'postgresql://app:secret@postgres/app',
    APP_DOMAIN: 'dashboard.example.test', APP_URL: 'https://dashboard.example.test',
    CORS_ALLOWED_ORIGINS: 'https://dashboard.example.test',
    SECRET_ENCRYPTION_KEY: Buffer.alloc(32, 99).toString('base64'),
  };

  it('rejects disabled authentication in production', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production', AUTH_MODE: 'disabled' })).toThrow(
      'AUTH_MODE=disabled is forbidden in production',
    );
  });

  it('requires a 32-byte secret master key', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'test', AUTH_MODE: 'disabled', SECRET_MASTER_KEY: 'short' })).toThrow(
      'SECRET_MASTER_KEY',
    );
  });

  it('requires database and cryptographic keys in production', () => {
    expect(() => parseEnvironment({
      NODE_ENV: 'production',
      AUTH_MODE: 'external',
      AUTH_EXTERNAL_PROVIDER: 'main-website',
      AUTH_JWKS_URL: 'https://identity.triup-psu.space/.well-known/jwks.json',
      AUTH_ISSUER: 'https://identity.triup-psu.space',
      AUTH_AUDIENCE: 'dashboardmini',
      AUTH_ALLOWED_ALGORITHMS: 'RS256',
    })).toThrow('DATABASE_URL');
  });

  it('rejects example cryptographic keys and permissive runtime flags in production', () => {
    const base = {
      ...productionBase,
      SECRET_ENCRYPTION_KEY: undefined,
      CORS_ORIGINS: 'https://dashboard.example.test', FILE_STORAGE_PATH: '/data/uploads',
      SECRET_MASTER_KEY: Buffer.alloc(32, 97).toString('base64'),
    };
    expect(() => parseEnvironment(base)).toThrow(/development SECRET_MASTER_KEY/i);
    expect(() => parseEnvironment({ ...base, SECRET_MASTER_KEY: `${base.SECRET_MASTER_KEY}\n` }))
      .toThrow(/development SECRET_MASTER_KEY/i);
    expect(() => parseEnvironment({ ...base, SECRET_MASTER_KEY: Buffer.alloc(32, 99).toString('base64'), DEBUG: 'true' }))
      .toThrow(/DEBUG/i);
    expect(() => parseEnvironment({ ...base, SECRET_MASTER_KEY: Buffer.alloc(32, 99).toString('base64'), DEMO_CONNECTOR_ENABLED: 'true' }))
      .toThrow(/demo connector/i);
  });

  it('forbids every supported demo-seed flag in production', () => {
    for (const key of ['INCLUDE_DEMO_SEED', 'ENABLE_DEMO_SEED']) {
      expect(() => parseEnvironment({ ...productionBase, [key]: 'true' })).toThrow(/demo seed/i);
    }
  });

  it('validates origins and operational limits', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'test', DATABASE_URL: 'mysql://app:secret@database/app' })).toThrow(/PostgreSQL/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', CORS_ORIGINS: '*' })).toThrow(/CORS/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', MAX_UPLOAD_SIZE: '999999999' })).toThrow(/MAX_UPLOAD_SIZE/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', QUERY_ROW_LIMIT: '0' })).toThrow(/QUERY_ROW_LIMIT/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', LOG_LEVEL: 'trace-all' })).toThrow(/LOG_LEVEL/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', DATABASE_POOL_MAX: '1000' })).toThrow(/DATABASE_POOL_MAX/i);
  });

  it('requires a complete asymmetric external authentication contract', () => {
    const base = { ...productionBase };
    for (const name of ['AUTH_EXTERNAL_PROVIDER', 'AUTH_JWKS_URL', 'AUTH_ISSUER', 'AUTH_AUDIENCE', 'AUTH_ALLOWED_ALGORITHMS'] as const) {
      expect(() => parseEnvironment({ ...base, [name]: undefined })).toThrow(/External authentication requires/);
    }
    expect(() => parseEnvironment({ ...base, AUTH_ALLOWED_ALGORITHMS: 'HS256' })).toThrow(/asymmetric RS algorithms/i);
    expect(() => parseEnvironment({ ...base, AUTH_JWKS_URL: 'http://identity.triup-psu.space/jwks' })).toThrow(/HTTPS/i);
    expect(() => parseEnvironment({ ...base, AUTH_ISSUER: 'https://placeholder.example' })).toThrow(/placeholder/i);
  });

  it('requires an HTTPS application identity', () => {
    expect(() => parseEnvironment({ ...productionBase, APP_DOMAIN: undefined })).toThrow(/APP_DOMAIN/i);
    expect(() => parseEnvironment({ ...productionBase, APP_URL: 'http://dashboard.example.test' })).toThrow(/APP_URL.*HTTPS/i);
  });

  it('requires complete SMTP configuration when SMTP delivery is enabled', () => {
    expect(() => parseEnvironment({ ...productionBase, SMTP_ENABLED: 'true' })).toThrow(/SMTP_HOST/i);
    const configured = parseEnvironment({
      ...productionBase, SMTP_ENABLED: 'true', SMTP_HOST: 'mail.example.test', SMTP_PORT: '587',
      SMTP_USER: 'mailer', SMTP_PASSWORD: 'mail-secret-value', SMTP_FROM: 'Dashboard BI <noreply@example.test>',
      SMTP_SECURE: 'false',
    });
    expect(configured.smtp).toMatchObject({ enabled: true, host: 'mail.example.test', port: 587, secure: false });
  });

  it('requires a non-placeholder metrics token when production metrics are enabled', () => {
    expect(() => parseEnvironment({ ...productionBase, METRICS_ENABLED: 'true' })).toThrow(/METRICS_TOKEN/i);
  });
});
