import { describe, expect, it, vi } from 'vitest';
import { AuthService, externalIdentityProviderKey } from './auth.service.js';

function fixture() {
  const prisma = {
    userProfile: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'user-1',
        organizationId: 'org-1',
        displayName: 'Authorized User',
        status: 'active',
        disabledAt: null,
      }),
      findMany: vi.fn(),
    },
    organizationMember: {
      findUnique: vi.fn().mockResolvedValue({ role: 'member' }),
    },
    biProjectMember: {
      findMany: vi.fn().mockResolvedValue([{ projectId: 'project-1', role: 'editor' }]),
    },
    userRole: {
      findMany: vi.fn().mockResolvedValue([{
        roles: {
          code: 'analyst',
          role_permissions: [
            { permissions: { code: 'datasets.read' } },
            { permissions: { code: 'charts.write' } },
          ],
        },
      }]),
    },
  };
  return { service: new AuthService(prisma as never), prisma };
}

describe('AuthService verified principal mapping', () => {
  it('resolves disabled mode only through an active configured database principal', async () => {
    const { service } = fixture();
    await expect(service.authenticateInternalSingleUser('user-1')).resolves.toEqual({
      organizationId: 'org-1',
      userId: 'user-1',
      sessionId: 'internal-single-user',
      roles: ['member', 'editor', 'analyst'],
      permissions: ['datasets.read', 'charts.write'],
      projectScopes: [{ projectId: 'project-1', role: 'editor' }],
      authMode: 'disabled',
    });
  });

  it('maps external identities by provider, issuer and subject without using email or token roles', async () => {
    const { service, prisma } = fixture();
    prisma.userProfile.findMany.mockResolvedValue([{
      id: 'user-1',
      organizationId: 'org-1',
      status: 'active',
      disabledAt: null,
    }]);
    const identity = {
      provider: 'other-oidc',
      issuer: 'https://identity.example.test',
      externalUserId: 'subject-123',
      organizationId: 'org-1',
      roles: ['organization_admin'],
      scopes: ['*'],
      email: 'must-not-be-used@example.invalid',
    };

    const principal = await service.resolveExternalIdentity(identity);

    expect(prisma.userProfile.findMany).toHaveBeenCalledWith({
      where: {
        externalAuthProvider: externalIdentityProviderKey(identity.provider, identity.issuer),
        externalUserId: 'subject-123',
        status: 'active',
        disabledAt: null,
      },
      take: 2,
    });
    expect(principal.roles).toEqual(['member', 'editor', 'analyst']);
    expect(principal.permissions).toEqual(['datasets.read', 'charts.write']);
    expect(principal.sessionId).not.toContain('subject-123');
  });

  it('rejects an unknown external identity instead of auto-provisioning it', async () => {
    const { service, prisma } = fixture();
    prisma.userProfile.findMany.mockResolvedValue([]);
    await expect(service.resolveExternalIdentity({
      provider: 'other-oidc',
      issuer: 'https://identity.example.test',
      externalUserId: 'unknown',
      organizationId: 'org-1',
      roles: [],
      scopes: [],
    })).rejects.toMatchObject({ status: 403, code: 'EXTERNAL_IDENTITY_NOT_AUTHORIZED' });
  });

  it('rejects principals without an organization membership', async () => {
    const { service, prisma } = fixture();
    prisma.organizationMember.findUnique.mockResolvedValue(null);
    await expect(service.authenticateInternalSingleUser('user-1')).rejects.toMatchObject({
      status: 403,
      code: 'DISABLED_AUTH_PRINCIPAL_NOT_AUTHORIZED',
    });
  });

  it('returns only the profile fields needed by the session UI', async () => {
    const { service } = fixture();
    await expect(service.me({
      organizationId: 'org-1',
      userId: 'user-1',
      sessionId: 'session-1',
      roles: ['member'],
      permissions: ['datasets.read'],
      projectScopes: [],
      authMode: 'external',
    })).resolves.toEqual({
      id: 'user-1',
      organizationId: 'org-1',
      name: 'Authorized User',
      roles: ['member'],
      permissions: ['datasets.read'],
      projectScopes: [],
    });
  });

  it('resolves a PSU SSO subject from database mappings without trusting token organization or roles', async () => {
    const { service, prisma } = fixture();
    prisma.userProfile.findMany.mockResolvedValue([{
      id: 'user-1',
      organizationId: 'org-1',
      status: 'active',
      disabledAt: null,
    }]);
    const identity = {
      provider: 'psu-sso',
      issuer: 'https://psusso.psu.ac.th/application/o/research-triupact/',
      externalUserId: 'stable-psu-subject',
      email: 'display-only@example.invalid',
    };

    await service.resolveExternalIdentity(identity as never);

    const lookup = prisma.userProfile.findMany.mock.calls[0][0];
    expect(lookup.where).toEqual({
      externalAuthProvider: externalIdentityProviderKey(identity.provider, identity.issuer),
      externalUserId: identity.externalUserId,
      status: 'active',
      disabledAt: null,
    });
    expect(lookup.where).not.toHaveProperty('organizationId');
  });

  it('rejects an ambiguous subject mapped into more than one organization', async () => {
    const { service, prisma } = fixture();
    prisma.userProfile.findMany.mockResolvedValue([
      { id: 'user-1', organizationId: 'org-1', status: 'active', disabledAt: null },
      { id: 'user-2', organizationId: 'org-2', status: 'active', disabledAt: null },
    ]);

    await expect(service.resolveExternalIdentity({
      provider: 'psu-sso',
      issuer: 'https://psusso.psu.ac.th/application/o/research-triupact/',
      externalUserId: 'shared-subject',
      roles: [],
      scopes: [],
    })).rejects.toMatchObject({
      status: 403,
      code: 'EXTERNAL_IDENTITY_AMBIGUOUS',
    });
  });
});
