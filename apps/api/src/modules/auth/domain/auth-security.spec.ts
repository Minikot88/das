import { describe, expect, it } from 'vitest';
import {
  hashOpaqueToken,
  hashPassword,
  issueOpaqueToken,
  normalizeEmail,
  validatePasswordPolicy,
  verifyPassword,
} from './auth-security.js';

describe('production authentication primitives', () => {
  it('normalizes email consistently', () => {
    expect(normalizeEmail('  User.Name@Example.COM  ')).toBe('user.name@example.com');
  });

  it('enforces a passphrase-friendly password policy without trimming', () => {
    expect(() => validatePasswordPolicy('correct horse battery staple', 'person@example.com', 'Person')).not.toThrow();
    expect(() => validatePasswordPolicy('too short', 'person@example.com', 'Person')).toThrowError(/at least 12/i);
    expect(() => validatePasswordPolicy('person@example.com', 'person@example.com', 'Person')).toThrowError(/email/i);
    expect(() => validatePasswordPolicy('PersonPerson', 'person@example.com', 'Person')).toThrowError(/profile/i);
  });

  it('hashes passwords with Argon2id and verifies the exact input', async () => {
    const password = '  a long passphrase with spaces  ';
    const hash = await hashPassword(password);

    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    await expect(verifyPassword(hash, password.trim())).resolves.toBe(false);
  });

  it('issues unique 256-bit opaque tokens and stores only deterministic SHA-256 hashes', () => {
    const first = issueOpaqueToken();
    const second = issueOpaqueToken();

    expect(Buffer.from(first.token, 'base64url')).toHaveLength(32);
    expect(first.token).not.toBe(second.token);
    expect(first.tokenHash).toBe(hashOpaqueToken(first.token));
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tokenHash).not.toContain(first.token);
  });
});
