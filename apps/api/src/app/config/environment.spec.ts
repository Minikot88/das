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
});
