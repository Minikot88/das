import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export type EncryptedSecret = {
  algorithm: 'aes-256-gcm';
  iv: string;
  authTag: string;
  ciphertext: string;
  version: 1;
};

export interface SecretStore {
  seal(value: Record<string, unknown>): Promise<EncryptedSecret>;
  open(value: EncryptedSecret): Promise<Record<string, unknown>>;
}

export class EncryptedSecretStore implements SecretStore {
  private readonly key: Buffer;

  constructor(base64MasterKey: string) {
    this.key = Buffer.from(base64MasterKey, 'base64');
    if (this.key.length !== 32) throw new Error('Secret master key must decode to exactly 32 bytes.');
  }

  async seal(value: Record<string, unknown>): Promise<EncryptedSecret> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return {
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
      version: 1,
    };
  }

  async open(value: EncryptedSecret): Promise<Record<string, unknown>> {
    if (value.algorithm !== 'aes-256-gcm' || value.version !== 1) throw new Error('Unsupported encrypted secret format.');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(value.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(value.authTag, 'base64'));
    const plaintext = Buffer.concat([decipher.update(Buffer.from(value.ciphertext, 'base64')), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8')) as Record<string, unknown>;
  }
}
