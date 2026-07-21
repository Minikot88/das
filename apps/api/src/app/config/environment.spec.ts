import { describe, expect, it } from 'vitest';
import { parseEnvironment } from './environment.js';

describe('parseEnvironment', () => {
  it('rejects development authentication in production', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production', AUTH_PROVIDER: 'development' })).toThrow(
      'Development authentication is forbidden in production',
    );
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
      NODE_ENV: 'production', AUTH_PROVIDER: 'external', DATABASE_URL: 'mysql://app:secret@database/app',
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
    expect(() => parseEnvironment({ NODE_ENV: 'test', CORS_ORIGINS: '*' })).toThrow(/CORS/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', MAX_UPLOAD_SIZE: '999999999' })).toThrow(/MAX_UPLOAD_SIZE/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', QUERY_ROW_LIMIT: '0' })).toThrow(/QUERY_ROW_LIMIT/i);
    expect(() => parseEnvironment({ NODE_ENV: 'test', LOG_LEVEL: 'trace-all' })).toThrow(/LOG_LEVEL/i);
  });
});
