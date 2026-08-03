import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../../shared/http/api-error.js';
import type { SessionPrincipal } from './auth.service.js';

export type ProjectPermission = 'read' | 'write' | 'manage_members' | 'connection' | 'share' | 'export';

const PROJECT_PERMISSIONS: Record<string, ReadonlySet<ProjectPermission>> = {
  project_owner: new Set(['read', 'write', 'manage_members', 'connection', 'share', 'export']),
  editor: new Set(['read', 'write', 'export']),
  viewer: new Set(['read', 'export']),
};

@Injectable()
export class AuthorizationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async assertOrganizationAdmin(principal: SessionPrincipal, organizationId: string) {
    if (principal.organizationId !== organizationId) throw notFound();
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: principal.userId } },
    });
    if (membership?.role !== 'organization_admin') throw forbidden();
  }

  async assertProjectPermission(principal: SessionPrincipal, projectId: string, permission: ProjectPermission) {
    const project = await this.prisma.biProject.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project || project.organizationId !== principal.organizationId) throw notFound();
    const organizationMembership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: principal.organizationId, userId: principal.userId } },
    });
    if (organizationMembership?.role === 'organization_admin') return;
    const projectMembership = await this.prisma.biProjectMember.findUnique({
      where: { projectId_userId: { projectId, userId: principal.userId } },
    });
    const role = project.ownerUserId === principal.userId ? 'project_owner' : projectMembership?.role;
    if (!role || !PROJECT_PERMISSIONS[role]?.has(permission)) throw forbidden();
  }
}

function forbidden() {
  return new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
}

function notFound() {
  return new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
}
