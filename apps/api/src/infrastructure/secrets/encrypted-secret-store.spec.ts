import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EncryptedSecretStore } from './encrypted-secret-store.js';

describe('EncryptedSecretStore', () => {
  it('round-trips AES-GCM ciphertext without persisting plaintext', async () => {
    const store = new EncryptedSecretStore(randomBytes(32).toString('base64'));
    const encrypted = await store.seal({ password: 'top-secret' });
    expect(JSON.stringify(encrypted)).not.toContain('top-secret');
    await expect(store.open(encrypted)).resolves.toEqual({ password: 'top-secret' });
  });

  it('rejects tampered ciphertext', async () => {
    const store = new EncryptedSecretStore(randomBytes(32).toString('base64'));
    const encrypted = await store.seal({ password: 'top-secret' });
    encrypted.ciphertext = `${encrypted.ciphertext.slice(0, -2)}AA`;
    await expect(store.open(encrypted)).rejects.toThrow();
  });
});
