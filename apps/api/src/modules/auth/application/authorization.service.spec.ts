import { describe, expect, it, vi } from 'vitest';
import { AuthorizationService } from './authorization.service.js';

function fixture(projectRole: string | null, organizationRole = 'member', projectOrganizationId = 'org-1') {
  const prisma = {
    biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: projectOrganizationId, ownerUserId: 'owner-1' }) },
    organizationMember: { findUnique: vi.fn().mockResolvedValue({ role: organizationRole }) },
    biProjectMember: { findUnique: vi.fn().mockResolvedValue(projectRole ? { role: projectRole } : null) },
  };
  const service = new AuthorizationService(prisma as never);
  const principal = { organizationId: 'org-1', userId: 'user-1', sessionId: 'session-1', roles: [], csrfTokenHash: 'x' };
  return { service, principal, prisma };
}

describe('AuthorizationService deny-by-default RBAC', () => {
  it('allows an organization admin to manage organization and project resources', async () => {
    const { service, principal } = fixture(null, 'organization_admin');
    await expect(service.assertOrganizationAdmin(principal, 'org-1')).resolves.toBeUndefined();
    await expect(service.assertProjectPermission(principal, 'project-1', 'manage_members')).resolves.toBeUndefined();
  });

  it('allows project owners to manage membership and content', async () => {
    const { service, principal } = fixture('project_owner');
    await expect(service.assertProjectPermission(principal, 'project-1', 'manage_members')).resolves.toBeUndefined();
    await expect(service.assertProjectPermission(principal, 'project-1', 'write')).resolves.toBeUndefined();
  });

  it('allows editors to write but rejects membership management', async () => {
    const { service, principal } = fixture('editor');
    await expect(service.assertProjectPermission(principal, 'project-1', 'write')).resolves.toBeUndefined();
    await expect(service.assertProjectPermission(principal, 'project-1', 'manage_members')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });

  it('allows viewers to read and rejects writes, connections, and shares', async () => {
    const { service, principal } = fixture('viewer');
    await expect(service.assertProjectPermission(principal, 'project-1', 'read')).resolves.toBeUndefined();
    for (const permission of ['write', 'connection', 'share'] as const) {
      await expect(service.assertProjectPermission(principal, 'project-1', permission)).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    }
  });

  it('does not reveal cross-organization projects', async () => {
    const { service, principal } = fixture('project_owner', 'organization_admin', 'org-2');
    await expect(service.assertProjectPermission(principal, 'project-1', 'read')).rejects.toMatchObject({ status: 404, code: 'PROJECT_NOT_FOUND' });
  });

  it('denies users without an explicit membership', async () => {
    const { service, principal } = fixture(null);
    await expect(service.assertProjectPermission(principal, 'project-1', 'read')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });
});
