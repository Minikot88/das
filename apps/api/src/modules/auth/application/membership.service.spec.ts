import { describe, expect, it, vi } from 'vitest';
import { MembershipService } from './membership.service.js';

function fixture() {
  const prisma: Record<string, any> = {
    userProfile: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([{ id: 'member-1', email: 'member@example.com', displayName: 'Member', status: 'active', disabledAt: null }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
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
  };
  prisma.$transaction = vi.fn().mockImplementation((callback) => callback(prisma));
  const authorization = {
    assertOrganizationAdmin: vi.fn().mockResolvedValue(undefined),
    assertProjectPermission: vi.fn().mockResolvedValue(undefined),
  };
  const service = new MembershipService(prisma as never, authorization as never);
  const admin = { organizationId: 'org-1', userId: 'admin-1', sessionId: 'session-1', roles: ['organization_admin'], csrfTokenHash: 'x' };
  return { service, prisma, authorization, admin };
}

describe('MembershipService admin safety', () => {
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

});
