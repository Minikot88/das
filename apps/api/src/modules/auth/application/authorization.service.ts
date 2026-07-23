import { Inject, Injectable, Optional } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
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
  constructor(private readonly prisma: PrismaService, @Optional() @Inject(ENVIRONMENT) private readonly environment?: RuntimeEnvironment) {}

  async assertOrganizationAdmin(principal: SessionPrincipal, organizationId: string) {
    if (principal.organizationId !== organizationId) throw notFound();
    if (this.isTestDevelopment(principal)) return;
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: principal.userId } },
    });
    if (membership?.role !== 'organization_admin') throw forbidden();
  }

  async assertProjectPermission(principal: SessionPrincipal, projectId: string, permission: ProjectPermission) {
    if (this.isTestDevelopment(principal)) return;
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

  private isTestDevelopment(principal: SessionPrincipal) {
    return this.environment?.nodeEnv === 'test' && this.environment.authProvider === 'development' && principal.userId === 'user-development';
  }
}

function forbidden() {
  return new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
}

function notFound() {
  return new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
}
