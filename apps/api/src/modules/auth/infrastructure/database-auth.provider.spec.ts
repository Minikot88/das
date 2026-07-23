import { beforeAll, describe, expect, it, vi } from 'vitest';
import { hashPassword } from '../domain/auth-security.js';
import { DatabaseAuthProvider } from './database-auth.provider.js';

let passwordHash: string;
beforeAll(async () => { passwordHash = await hashPassword('correct horse battery staple'); });

function fixture(overrides: Record<string, unknown> = {}) {
  const user = {
    id: 'user-1', organizationId: 'org-1', email: 'User@Example.com', normalizedEmail: 'user@example.com',
    displayName: 'Example User', status: 'active', disabledAt: null, ...overrides,
  };
  const prisma = {
    userProfile: { findUnique: vi.fn().mockResolvedValue(user) },
    userCredential: {
      findUnique: vi.fn().mockResolvedValue({ userId: user.id, passwordHash, failedLoginCount: 0, lockedUntil: null }),
      update: vi.fn().mockResolvedValue({}),
    },
    organizationMember: { findUnique: vi.fn().mockResolvedValue({ role: 'organization_admin' }) },
    biProjectMember: { findMany: vi.fn().mockResolvedValue([{ role: 'project_owner' }]) },
  };
  return { provider: new DatabaseAuthProvider(prisma as never), prisma };
}

describe('DatabaseAuthProvider', () => {
  it('authenticates normalized email with Argon2id and returns only a safe profile', async () => {
    const { provider, prisma } = fixture();
    const user = await provider.authenticate('  USER@example.com ', 'correct horse battery staple');

    expect(prisma.userProfile.findUnique).toHaveBeenCalledWith({ where: { normalizedEmail: 'user@example.com' } });
    expect(user).toEqual({
      id: 'user-1', organizationId: 'org-1', email: 'User@Example.com', name: 'Example User',
      roles: ['organization_admin', 'project_owner'],
    });
    expect(JSON.stringify(user)).not.toContain(passwordHash);
  });

  it.each([
    ['wrong password', 'wrong password value', {}],
    ['unknown email', 'correct horse battery staple', { missing: true }],
    ['disabled account', 'correct horse battery staple', { disabledAt: new Date() }],
  ] as const)('returns the same generic error for %s', async (_case, password, options) => {
    const { provider, prisma } = fixture(options);
    if ('missing' in options && options.missing) prisma.userProfile.findUnique.mockResolvedValue(null);

    await expect(provider.authenticate('user@example.com', password)).rejects.toMatchObject({
      status: 401, code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.',
    });
  });

  it('temporarily locks repeated failures without exposing lockout state', async () => {
    const { provider, prisma } = fixture();
    prisma.userCredential.findUnique.mockResolvedValue({ userId: 'user-1', passwordHash, failedLoginCount: 4, lockedUntil: null });

    await expect(provider.authenticate('user@example.com', 'wrong password value')).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(prisma.userCredential.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'user-1' },
      data: expect.objectContaining({ failedLoginCount: 5, lockedUntil: expect.any(Date) }),
    }));
  });
});
