import { describe, expect, it } from 'vitest';
import { parseEnvironment } from './environment.js';

describe('parseEnvironment', () => {
  const productionBase = {
    NODE_ENV: 'production', AUTH_PROVIDER: 'database', DATABASE_URL: 'postgresql://app:secret@postgres/app',
    APP_DOMAIN: 'dashboard.example.test', APP_URL: 'https://dashboard.example.test',
    CORS_ALLOWED_ORIGINS: 'https://dashboard.example.test',
    SECRET_ENCRYPTION_KEY: Buffer.alloc(32, 99).toString('base64'),
    SESSION_SECRET: Buffer.alloc(32, 100).toString('base64'),
    COOKIE_SECRET: Buffer.alloc(32, 101).toString('base64'),
    CSRF_SECRET: Buffer.alloc(32, 102).toString('base64'),
    COOKIE_SECURE: 'true', PUBLIC_REGISTRATION_ENABLED: 'false',
  };

  it('rejects development authentication in production', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production', AUTH_PROVIDER: 'development' })).toThrow(
      'Development authentication is forbidden in production',
    );
  });

  it('configures bounded database sessions and secure production cookies', () => {
    const testEnvironment = parseEnvironment({
      NODE_ENV: 'test', AUTH_PROVIDER: 'database', SESSION_IDLE_TIMEOUT_SECONDS: '1800',
      SESSION_ABSOLUTE_TIMEOUT_SECONDS: '86400', COOKIE_SECURE: 'false',
    });
    expect(testEnvironment.sessionIdleTimeoutSeconds).toBe(1800);
    expect(testEnvironment.sessionAbsoluteTimeoutSeconds).toBe(86400);
    expect(testEnvironment.cookieSecure).toBe(false);

    const production = {
      NODE_ENV: 'production', AUTH_PROVIDER: 'database', DATABASE_URL: 'postgresql://app:secret@postgres/app',
      CORS_ORIGINS: 'https://dashboard.example.test', SECRET_MASTER_KEY: Buffer.alloc(32, 99).toString('base64'),
      SESSION_SIGNING_KEY: Buffer.alloc(32, 100).toString('base64'),
    };
    expect(() => parseEnvironment({ ...production, COOKIE_SECURE: 'false' })).toThrow(/secure cookie/i);
    expect(() => parseEnvironment({ ...production, COOKIE_SECURE: 'true', PUBLIC_REGISTRATION_ENABLED: 'true' })).toThrow(/public registration/i);
  });

  it('requires a 32-byte secret master key', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'test', AUTH_PROVIDER: 'development', SECRET_MASTER_KEY: 'short' })).toThrow(
      'SECRET_MASTER_KEY',
    );
  });

  it('requires database and cryptographic keys in production', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production', AUTH_PROVIDER: 'external' })).toThrow('DATABASE_URL');
  });

  it('rejects example cryptographic keys and permissive runtime flags in production', () => {
    const base = {
      NODE_ENV: 'production', AUTH_PROVIDER: 'external', DATABASE_URL: 'postgresql://app:secret@postgres/app',
      CORS_ORIGINS: 'https://dashboard.example.test', FILE_STORAGE_PATH: '/data/uploads',
      SECRET_MASTER_KEY: Buffer.alloc(32, 97).toString('base64'),
      SESSION_SIGNING_KEY: Buffer.alloc(32, 98).toString('base64'),
    };
    expect(() => parseEnvironment(base)).toThrow(/development SECRET_MASTER_KEY/i);
    expect(() => parseEnvironment({ ...base, SECRET_MASTER_KEY: `${base.SECRET_MASTER_KEY}\n` }))
      .toThrow(/development SECRET_MASTER_KEY/i);
    expect(() => parseEnvironment({
      ...base,
      SECRET_MASTER_KEY: Buffer.alloc(32, 99).toString('base64'),
      SESSION_SIGNING_KEY: `${base.SESSION_SIGNING_KEY}\n`,
    })).toThrow(/development SESSION_SIGNING_KEY/i);
    expect(() => parseEnvironment({ ...base, SECRET_MASTER_KEY: Buffer.alloc(32, 99).toString('base64'), DEBUG: 'true' }))
      .toThrow(/DEBUG/i);
    expect(() => parseEnvironment({ ...base, SECRET_MASTER_KEY: Buffer.alloc(32, 99).toString('base64'), DEMO_CONNECTOR_ENABLED: 'true' }))
      .toThrow(/demo connector/i);
  });

  it('validates origins and operational limits', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'test', DATABASE_URL: 'mysql://app:secret@database/app' })).toThrow(/PostgreSQL/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', CORS_ORIGINS: '*' })).toThrow(/CORS/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', MAX_UPLOAD_SIZE: '999999999' })).toThrow(/MAX_UPLOAD_SIZE/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', QUERY_ROW_LIMIT: '0' })).toThrow(/QUERY_ROW_LIMIT/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', LOG_LEVEL: 'trace-all' })).toThrow(/LOG_LEVEL/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', DATABASE_POOL_MAX: '1000' })).toThrow(/DATABASE_POOL_MAX/i);
  });

  it('requires an HTTPS application identity and independent production secrets', () => {
    expect(() => parseEnvironment({ ...productionBase, APP_DOMAIN: undefined })).toThrow(/APP_DOMAIN/i);
    expect(() => parseEnvironment({ ...productionBase, APP_URL: 'http://dashboard.example.test' })).toThrow(/APP_URL.*HTTPS/i);
    expect(() => parseEnvironment({ ...productionBase, COOKIE_SECRET: 'short' })).toThrow(/COOKIE_SECRET/i);
    expect(() => parseEnvironment({ ...productionBase, CSRF_SECRET: productionBase.SESSION_SECRET })).toThrow(/independent/i);
    expect(() => parseEnvironment({ ...productionBase, COOKIE_SECRET: 'CHANGE_ME_WITH_AT_LEAST_32_RANDOM_BYTES' })).toThrow(/placeholder/i);
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
