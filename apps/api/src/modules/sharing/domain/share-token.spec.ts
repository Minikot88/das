import { describe, expect, it } from 'vitest';
import { createShareToken, hashShareToken } from './share-token.js';

describe('share token', () => {
  it('stores a deterministic hash without exposing the raw capability', () => {
    const created = createShareToken();
    expect(created.rawToken).not.toBe(created.tokenHash);
    expect(created.tokenHash).toBe(hashShareToken(created.rawToken));
    expect(created.rawToken.length).toBeGreaterThanOrEqual(43);
  });
});
