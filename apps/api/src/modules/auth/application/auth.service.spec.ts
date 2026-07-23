import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';

const environment = {
  sessionIdleTimeoutSeconds: 1_800,
  sessionAbsoluteTimeoutSeconds: 86_400,
  passwordResetTimeoutSeconds: 900,
  invitationTimeoutSeconds: 604_800,
} as never;

function fixture() {
  const user = { id: 'user-1', organizationId: 'org-1', email: 'user@example.com', name: 'User', roles: ['organization_admin'] };
  const provider = { authenticate: vi.fn().mockResolvedValue(user) };
  const prisma = {
    authSession: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    userProfile: { findUnique: vi.fn().mockResolvedValue({ id: 'user-1', organizationId: 'org-1', status: 'active', disabledAt: null }) },
    organizationMember: { findUnique: vi.fn().mockResolvedValue({ role: 'organization_admin' }) },
    biProjectMember: { findMany: vi.fn().mockResolvedValue([{ role: 'project_owner' }]) },
    authenticationAuditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  return { service: new AuthService(provider as never, environment, prisma as never), provider, prisma, user };
}

describe('AuthService database sessions', () => {
  it('creates a random opaque session and persists only token hashes', async () => {
    const { service, prisma } = fixture();
    const result = await service.login('USER@example.com', 'correct horse battery staple', {
      requestId: 'request-1', ipAddress: '203.0.113.10', userAgent: 'test-browser',
    });
    const stored = prisma.authSession.create.mock.calls[0][0].data;

    expect(Buffer.from(result.sessionToken, 'base64url')).toHaveLength(32);
    expect(Buffer.from(result.csrfToken, 'base64url')).toHaveLength(32);
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.csrfTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(result.sessionToken);
    expect(JSON.stringify(stored)).not.toContain(result.csrfToken);
    expect(stored.absoluteExpiresAt.getTime() - stored.createdAt.getTime()).toBe(86_400_000);
  });

  it('resolves active sessions with live roles and extends only the idle expiry', async () => {
    const { service, prisma } = fixture();
    const now = new Date();
    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-1', userId: 'user-1', organizationId: 'org-1', csrfTokenHash: 'a'.repeat(64), revokedAt: null,
      idleExpiresAt: new Date(now.getTime() + 60_000), absoluteExpiresAt: new Date(now.getTime() + 3_600_000),
    });

    await expect(service.authenticateSession('opaque-token')).resolves.toMatchObject({
      organizationId: 'org-1', userId: 'user-1', sessionId: 'session-1',
      roles: ['organization_admin', 'project_owner'], csrfTokenHash: 'a'.repeat(64),
    });
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'session-1', revokedAt: null }),
      data: expect.objectContaining({ lastSeenAt: expect.any(Date), idleExpiresAt: expect.any(Date) }),
    }));
  });

  it.each([
    { revokedAt: new Date(), idleExpiresAt: new Date(Date.now() + 60_000), absoluteExpiresAt: new Date(Date.now() + 60_000) },
    { revokedAt: null, idleExpiresAt: new Date(Date.now() - 1), absoluteExpiresAt: new Date(Date.now() + 60_000) },
    { revokedAt: null, idleExpiresAt: new Date(Date.now() + 60_000), absoluteExpiresAt: new Date(Date.now() - 1) },
  ])('rejects revoked or expired sessions', async (expiry) => {
    const { service, prisma } = fixture();
    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-1', userId: 'user-1', organizationId: 'org-1', csrfTokenHash: 'a'.repeat(64), ...expiry,
    });
    await expect(service.authenticateSession('opaque-token')).rejects.toMatchObject({ status: 401, code: 'INVALID_SESSION' });
  });

  it('revokes the current or all user sessions server-side', async () => {
    const { service, prisma } = fixture();
    await service.logout('session-1', 'user-1');
    await service.logoutAll('user-1');
    expect(prisma.authSession.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'session-1', userId: 'user-1', revokedAt: null }, data: { revokedAt: expect.any(Date) },
    });
    expect(prisma.authSession.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 'user-1', revokedAt: null }, data: { revokedAt: expect.any(Date) },
    });
  });

  it('returns a safe current profile and safe session metadata', async () => {
    const { service, prisma } = fixture();
    prisma.userProfile.findUnique.mockResolvedValue({
      id: 'user-1', organizationId: 'org-1', email: 'user@example.com', displayName: 'User', status: 'active',
      normalizedEmail: 'user@example.com', disabledAt: null,
    });
    prisma.authSession.findMany.mockResolvedValue([{
      id: 'session-1', createdAt: new Date('2026-01-01T00:00:00Z'), lastSeenAt: new Date('2026-01-01T01:00:00Z'),
      absoluteExpiresAt: new Date('2026-01-08T00:00:00Z'), userAgentHash: 'agent-hash', ipHash: 'ip-hash',
      tokenHash: 'must-not-leak', csrfTokenHash: 'must-not-leak',
    }]);
    const principal = { organizationId: 'org-1', userId: 'user-1', sessionId: 'session-1', roles: ['organization_admin'], csrfTokenHash: 'x' };

    const me = await service.me(principal);
    const sessions = await service.listSessions(principal);
    expect(me).toEqual({ id: 'user-1', organizationId: 'org-1', email: 'user@example.com', name: 'User', roles: ['organization_admin'] });
    expect(sessions).toEqual([expect.objectContaining({ id: 'session-1', current: true })]);
    expect(JSON.stringify({ me, sessions })).not.toContain('must-not-leak');
  });

  it('revokes only a session owned by the current user', async () => {
    const { service, prisma } = fixture();
    const principal = { organizationId: 'org-1', userId: 'user-1', sessionId: 'session-current', roles: [], csrfTokenHash: 'x' };
    prisma.authSession.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.revokeSession(principal, 'foreign-session')).rejects.toMatchObject({ status: 404, code: 'SESSION_NOT_FOUND' });
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'foreign-session', userId: 'user-1', revokedAt: null }, data: { revokedAt: expect.any(Date) },
    });
  });
});
