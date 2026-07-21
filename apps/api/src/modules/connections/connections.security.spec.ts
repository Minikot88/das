import { describe, expect, it } from 'vitest';
import { isBlockedAddress, validateDestination } from './connections.service.js';

describe('PostgreSQL connector destination policy', () => {
  it.each(['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','0.0.0.0','224.0.0.1','::1','fe80::1','fd00::1'])('blocks non-public destination %s', address => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it('rejects loopback DNS unless explicitly allowlisted', async () => {
    await expect(validateDestination('localhost', 5432, [])).rejects.toMatchObject({ code: 'SSRF_DESTINATION_BLOCKED' });
    await expect(validateDestination('localhost', 5432, ['localhost'])).resolves.toBeUndefined();
  });

  it('rejects ports outside the PostgreSQL allowlist', async () => {
    await expect(validateDestination('localhost', 5433, ['localhost'])).rejects.toMatchObject({ code: 'PORT_NOT_ALLOWED' });
  });
});
