import { beforeAll, describe, expect, it, vi } from 'vitest';
import { hashOpaqueToken, hashPassword, verifyPassword } from '../domain/auth-security.js';
import { AccountService } from './account.service.js';

let currentHash: string;
beforeAll(async () => { currentHash = await hashPassword('current password phrase'); });

function fixture() {
  const profile = { id: 'user-1', organizationId: 'org-1', email: 'user@example.com', displayName: 'Example User', status: 'active', disabledAt: null };
  const prisma: Record<string, any> = {
    userProfile: { findUnique: vi.fn().mockResolvedValue(profile) },
    userCredential: {
      findUnique: vi.fn().mockResolvedValue({ userId: 'user-1', passwordHash: currentHash }),
      update: vi.fn().mockResolvedValue({}),
    },
    authSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    passwordResetToken: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    authenticationAuditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  prisma.$transaction = vi.fn().mockImplementation((callback) => callback(prisma));
  const mail = { sendPasswordReset: vi.fn().mockResolvedValue(undefined) };
  const service = new AccountService(prisma as never, { passwordResetTimeoutSeconds: 900 } as never, mail as never);
  const principal = { organizationId: 'org-1', userId: 'user-1', sessionId: 'session-1', roles: [], csrfTokenHash: 'x' };
  return { service, prisma, mail, profile, principal };
}

describe('AccountService password security', () => {
  it('changes a password with Argon2id and revokes every existing session', async () => {
    const { service, prisma, principal } = fixture();
    await expect(service.changePassword(principal, 'current password phrase', 'a completely new passphrase')).resolves.toEqual({ success: true });

    const update = prisma.userCredential.update.mock.calls[0][0].data;
    await expect(verifyPassword(update.passwordHash, 'a completely new passphrase')).resolves.toBe(true);
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({ where: { userId: 'user-1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });

  it('rejects an incorrect current password without changing credentials', async () => {
    const { service, prisma, principal } = fixture();
    await expect(service.changePassword(principal, 'wrong current password', 'a completely new passphrase')).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect(prisma.userCredential.update).not.toHaveBeenCalled();
  });

  it('returns the same forgot-password response for known and unknown emails', async () => {
    const known = fixture();
    const unknown = fixture();
    unknown.prisma.userProfile.findUnique.mockResolvedValue(null);

    const knownResult = await known.service.forgotPassword('user@example.com', { requestId: 'request-1' });
    const unknownResult = await unknown.service.forgotPassword('missing@example.com', { requestId: 'request-2' });
    expect(knownResult).toEqual({ accepted: true });
    expect(unknownResult).toEqual(knownResult);
    expect(known.prisma.passwordResetToken.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }) }));
    expect(unknown.prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(JSON.stringify(knownResult)).not.toMatch(/token|user@example/i);
  });

  it('consumes a reset token once and revokes sessions', async () => {
    const { service, prisma, profile } = fixture();
    const token = 'one-time-reset-token';
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1', userId: 'user-1', tokenHash: hashOpaqueToken(token), expiresAt: new Date(Date.now() + 60_000),
      usedAt: null, revokedAt: null,
    });

    await expect(service.resetPassword(token, 'a reset password passphrase')).resolves.toEqual({ success: true });
    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'reset-1', usedAt: null, revokedAt: null }, data: { usedAt: expect.any(Date) },
    });
    expect(prisma.userCredential.update).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: profile.id } }));
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({ where: { userId: profile.id, revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });

  it('rejects replayed or expired reset tokens', async () => {
    const { service, prisma } = fixture();
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1', userId: 'user-1', expiresAt: new Date(Date.now() - 1), usedAt: new Date(), revokedAt: null,
    });
    await expect(service.resetPassword('replayed-token', 'a reset password passphrase')).rejects.toMatchObject({ status: 400, code: 'INVALID_RESET_TOKEN' });
  });
});
