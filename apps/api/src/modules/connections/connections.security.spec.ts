import { randomBytes } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import { ConnectionsController } from './connections.controller.js';
import { ConnectionsService, isBlockedAddress, validateDestination } from './connections.service.js';

describe('PostgreSQL connector destination policy', () => {
  it('uses HTTP 200 for read-only connection actions', () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, ConnectionsController.prototype.testCredentials)).toBe(200);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, ConnectionsController.prototype.test)).toBe(200);
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, ConnectionsController.prototype.query)).toBe(200);
  });

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

  it('does not let clients choose reserved connection identifiers', async () => {
    const createdConnection = vi.fn(async ({ data }) => data);
    const createdSecret = vi.fn(async ({ data }) => data);
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1' }) },
      dataSourceType: { findUnique: vi.fn().mockResolvedValue({ id: 'source-type-postgresql' }) },
      $transaction: vi.fn(async callback => callback({
        dataSourceConnection: { create: createdConnection },
        dataSourceSecretReference: { create: createdSecret },
      })),
    };
    const service = new ConnectionsService(prisma as never, {
      secretMasterKey: randomBytes(32).toString('base64'),
      connectorNetworkAllowlist: ['localhost'],
    } as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never);

    await service.create({ organizationId: 'org-1', userId: 'user-1' }, {
      id: 'source-scopus-attacker-controlled',
      projectId: 'project-1',
      name: 'PostgreSQL',
      host: 'localhost',
      port: 5432,
      database: 'analytics',
      user: 'reader',
      password: 'secret-value',
    });

    const storedId = createdConnection.mock.calls[0][0].data.id;
    expect(storedId).toMatch(/^connection-[0-9a-f-]{36}$/);
    expect(storedId).not.toBe('source-scopus-attacker-controlled');
    expect(JSON.stringify(createdSecret.mock.calls[0][0].data)).not.toContain('secret-value');
  });
});
