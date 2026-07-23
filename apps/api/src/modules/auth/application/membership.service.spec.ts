import { describe, expect, it, vi } from 'vitest';
import { hashOpaqueToken, verifyPassword } from '../domain/auth-security.js';
import { MembershipService } from './membership.service.js';

function fixture() {
  const mail = { sendInvitation: vi.fn().mockResolvedValue(undefined), sendPasswordReset: vi.fn().mockResolvedValue(undefined) };
  const invitation = {
    id: 'invite-1', organizationId: 'org-1', projectId: 'project-1', email: 'New.User@example.com',
    normalizedEmail: 'new.user@example.com', role: 'editor', tokenHash: hashOpaqueToken('invite-token'),
    expiresAt: new Date(Date.now() + 60_000), acceptedAt: null, revokedAt: null, createdBy: 'admin-1', createdAt: new Date(),
  };
  const prisma: Record<string, any> = {
    invitation: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      findUnique: vi.fn().mockResolvedValue(invitation),
      findMany: vi.fn().mockResolvedValue([{ ...invitation, tokenHash: 'must-not-leak' }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    userProfile: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([{ id: 'member-1', email: 'member@example.com', displayName: 'Member', status: 'active', disabledAt: null }]),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    userCredential: { create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)) },
    organizationMember: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      findUnique: vi.fn().mockResolvedValue({ role: 'organization_admin' }),
      count: vi.fn().mockResolvedValue(1),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([{ userId: 'member-1', role: 'member', createdAt: new Date() }]),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-1', ownerUserId: 'owner-1' }) },
    biProjectMember: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([{ userId: 'member-1', role: 'viewer' }]),
      findUnique: vi.fn().mockResolvedValue({ userId: 'member-1', role: 'viewer' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    authSession: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    passwordResetToken: { updateMany: vi.fn().mockResolvedValue({ count: 1 }), create: vi.fn().mockImplementation(({ data }) => Promise.resolve(data)) },
  };
  prisma.$transaction = vi.fn().mockImplementation((callback) => callback(prisma));
  const authorization = {
    assertOrganizationAdmin: vi.fn().mockResolvedValue(undefined),
    assertProjectPermission: vi.fn().mockResolvedValue(undefined),
  };
  const service = new MembershipService(prisma as never, authorization as never, { invitationTimeoutSeconds: 604_800, passwordResetTimeoutSeconds: 900 } as never, mail);
  const admin = { organizationId: 'org-1', userId: 'admin-1', sessionId: 'session-1', roles: ['organization_admin'], csrfTokenHash: 'x' };
  return { service, prisma, authorization, invitation, admin, mail };
}

describe('MembershipService invitations and admin safety', () => {
  it('creates a one-time invitation and stores only its hash', async () => {
    const { service, prisma, admin, mail } = fixture();
    const result = await service.createInvitation(admin, 'org-1', { email: ' New.User@Example.com ', role: 'editor', projectId: 'project-1' });
    const stored = prisma.invitation.create.mock.calls[0][0].data;

    expect(Buffer.from(result.token, 'base64url')).toHaveLength(32);
    expect(stored.normalizedEmail).toBe('new.user@example.com');
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(stored)).not.toContain(result.token);
    expect(mail.sendInvitation).toHaveBeenCalledWith('New.User@Example.com', result.token);
  });

  it('lists invitations without token hashes', async () => {
    const { service, admin } = fixture();
    const invitations = await service.listInvitations(admin, 'org-1');
    expect(JSON.stringify(invitations)).not.toContain('must-not-leak');
    expect(invitations).toEqual([expect.objectContaining({ id: 'invite-1', email: 'New.User@example.com' })]);
  });

  it('accepts an invitation once and creates credential and memberships atomically', async () => {
    const { service, prisma } = fixture();
    const result = await service.acceptInvitation('invite-token', 'New User', 'a secure invited passphrase');

    expect(result).toMatchObject({ email: 'New.User@example.com', organizationId: 'org-1' });
    const credential = prisma.userCredential.create.mock.calls[0][0].data;
    await expect(verifyPassword(credential.passwordHash, 'a secure invited passphrase')).resolves.toBe(true);
    expect(prisma.organizationMember.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: 'member' }) }));
    expect(prisma.biProjectMember.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ role: 'editor' }) }));
    expect(prisma.invitation.updateMany).toHaveBeenCalledWith({ where: { id: 'invite-1', acceptedAt: null, revokedAt: null }, data: { acceptedAt: expect.any(Date) } });
  });

  it('rejects replayed or expired invitations', async () => {
    const { service, prisma, invitation } = fixture();
    prisma.invitation.findUnique.mockResolvedValue({ ...invitation, acceptedAt: new Date() });
    await expect(service.acceptInvitation('invite-token', 'New User', 'a secure invited passphrase')).rejects.toMatchObject({ status: 400, code: 'INVALID_INVITATION' });
  });

  it('prevents downgrading the last organization admin and revokes sessions after other role changes', async () => {
    const { service, prisma, admin } = fixture();
    await expect(service.updateOrganizationMember(admin, 'org-1', 'admin-1', 'member')).rejects.toMatchObject({ status: 409, code: 'LAST_ORGANIZATION_ADMIN' });

    prisma.organizationMember.count.mockResolvedValue(2);
    await expect(service.updateOrganizationMember(admin, 'org-1', 'admin-1', 'member')).resolves.toEqual({ success: true });
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({ where: { userId: 'admin-1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });

  it('lists organization members without credential or session material', async () => {
    const { service, admin } = fixture();
    const members = await service.listOrganizationMembers(admin, 'org-1');
    expect(members).toEqual([expect.objectContaining({ id: 'member-1', email: 'member@example.com', role: 'member' })]);
    expect(JSON.stringify(members)).not.toMatch(/password|token|secret/i);
  });

  it('manages project membership through the project-owner permission boundary', async () => {
    const { service, prisma, admin, authorization } = fixture();
    prisma.userProfile.findUnique.mockResolvedValue({ id: 'member-1', organizationId: 'org-1' });

    await service.setProjectMember(admin, 'project-1', 'member-1', 'editor');
    expect(authorization.assertProjectPermission).toHaveBeenCalledWith(admin, 'project-1', 'manage_members');
    expect(prisma.biProjectMember.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { role: 'editor' } }));
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({ where: { userId: 'member-1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });

  it('prevents removing the immutable project owner membership', async () => {
    const { service, admin } = fixture();
    await expect(service.removeProjectMember(admin, 'project-1', 'owner-1')).rejects.toMatchObject({ status: 409, code: 'PROJECT_OWNER_REQUIRED' });
  });

  it('disables a member and revokes every active session', async () => {
    const { service, prisma, admin } = fixture();
    prisma.organizationMember.findUnique.mockResolvedValue({ role: 'member' });
    await expect(service.setUserStatus(admin, 'org-1', 'member-1', 'disabled')).resolves.toEqual({ success: true });
    expect(prisma.userProfile.updateMany).toHaveBeenCalledWith({ where: { id: 'member-1', organizationId: 'org-1' }, data: { status: 'disabled', disabledAt: expect.any(Date) } });
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({ where: { userId: 'member-1', revokedAt: null }, data: { revokedAt: expect.any(Date) } });
  });

  it('lets an administrator create a one-time reset link without exposing its database hash', async () => {
    const { service, prisma, admin } = fixture();
    prisma.userProfile.findUnique.mockResolvedValue({ id: 'member-1', organizationId: 'org-1', status: 'active', disabledAt: null });
    const result = await service.createPasswordReset(admin, 'org-1', 'member-1');
    expect(Buffer.from(result.token, 'base64url')).toHaveLength(32);
    expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({ data: expect.objectContaining({ tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) }) });
    expect(JSON.stringify(prisma.passwordResetToken.create.mock.calls[0])).not.toContain(result.token);
  });
});
