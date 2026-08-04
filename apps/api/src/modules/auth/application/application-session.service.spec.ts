import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { ApplicationSessionService } from './application-session.service.js';

const principal = {
  organizationId: 'org-1',
  userId: 'user-1',
  sessionId: 'identity-resolution',
  roles: ['member'],
  projectScopes: [{ projectId: 'project-1', role: 'editor' }],
  authMode: 'external' as const,
};

function fixture() {
  const prisma = {
    authSession: {
      create: vi.fn().mockResolvedValue({ id: 'session-1' }),
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const auth = {
    resolveApplicationSession: vi.fn().mockResolvedValue({
      ...principal,
      sessionId: 'session-1',
    }),
  };
  const environment = {
    sessionCookieMaxAgeSeconds: 3_600,
  };
  return {
    service: new ApplicationSessionService(prisma as never, auth as never, environment as never),
    prisma,
    auth,
  };
}

describe('ApplicationSessionService', () => {
  it('stores only hashes for opaque session and CSRF tokens', async () => {
    const { service, prisma } = fixture();

    const created = await service.create(principal);

    expect(created.sessionToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(created.csrfToken).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    const stored = prisma.authSession.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(createHash('sha256').update(created.sessionToken).digest('hex'));
    expect(stored.csrfTokenHash).toBe(createHash('sha256').update(created.csrfToken).digest('hex'));
    expect(JSON.stringify(stored)).not.toContain(created.sessionToken);
    expect(JSON.stringify(stored)).not.toContain(created.csrfToken);
  });

  it('authenticates an active application session and reloads authorization from the database', async () => {
    const { service, prisma, auth } = fixture();
    const now = new Date();
    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-1',
      organizationId: 'org-1',
      userId: 'user-1',
      revokedAt: null,
      idleExpiresAt: new Date(now.getTime() + 60_000),
      absoluteExpiresAt: new Date(now.getTime() + 120_000),
      lastSeenAt: now,
    });

    await expect(service.authenticate('opaque_session_token_12345678901234567890'))
      .resolves.toMatchObject({ userId: 'user-1', organizationId: 'org-1', sessionId: 'session-1' });
    expect(auth.resolveApplicationSession).toHaveBeenCalledWith({
      organizationId: 'org-1',
      userId: 'user-1',
      sessionId: 'session-1',
    });
  });

  it('rejects expired sessions', async () => {
    const { service, prisma } = fixture();
    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-1',
      organizationId: 'org-1',
      userId: 'user-1',
      revokedAt: null,
      idleExpiresAt: new Date(Date.now() - 1),
      absoluteExpiresAt: new Date(Date.now() + 60_000),
      lastSeenAt: new Date(),
    });

    await expect(service.authenticate('opaque_session_token_12345678901234567890'))
      .rejects.toMatchObject({ status: 401, code: 'INVALID_SESSION' });
  });

  it('validates a supplied CSRF token against the server-side session hash', async () => {
    const { service, prisma } = fixture();
    const now = new Date();
    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-1',
      organizationId: 'org-1',
      userId: 'user-1',
      csrfTokenHash: createHash('sha256').update('csrf_token_123456789012345678901234567890').digest('hex'),
      revokedAt: null,
      idleExpiresAt: new Date(now.getTime() + 60_000),
      absoluteExpiresAt: new Date(now.getTime() + 120_000),
      lastSeenAt: now,
    });

    await expect(service.authenticate(
      'opaque_session_token_12345678901234567890',
      'forged_csrf_token_1234567890123456789012',
    )).rejects.toMatchObject({ status: 403, code: 'CSRF_TOKEN_INVALID' });
  });

  it('requires the matching CSRF token before revoking a session', async () => {
    const { service, prisma } = fixture();
    const sessionToken = 'opaque_session_token_12345678901234567890';
    const csrfToken = 'csrf_token_123456789012345678901234567890';
    prisma.authSession.findUnique.mockResolvedValue({
      id: 'session-1',
      csrfTokenHash: createHash('sha256').update(csrfToken).digest('hex'),
      revokedAt: null,
    });

    await expect(service.logout(sessionToken, 'wrong_csrf_token_12345678901234567890'))
      .rejects.toMatchObject({ status: 403, code: 'CSRF_TOKEN_INVALID' });
    await expect(service.logout(sessionToken, csrfToken)).resolves.toBeUndefined();
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
