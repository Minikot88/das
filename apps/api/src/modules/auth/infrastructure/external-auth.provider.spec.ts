import { describe, expect, it } from 'vitest';
import { ExternalAuthProvider } from './external-auth.provider.js';

describe('ExternalAuthProvider', () => {
  it('fails closed until an approved identity adapter is configured', async () => {
    await expect(new ExternalAuthProvider().authenticate('user@example.com', 'secret')).rejects.toMatchObject({ status: 503, code: 'AUTH_PROVIDER_NOT_CONFIGURED' });
  });
});
