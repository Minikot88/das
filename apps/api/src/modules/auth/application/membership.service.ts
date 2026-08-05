import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../../shared/http/api-error.js';
import type { SessionPrincipal } from './auth.service.js';
import { AuthorizationService } from './authorization.service.js';

const ORGANIZATION_ROLES = new Set(['organization_admin', 'member']);
const PROJECT_ROLES = new Set(['project_owner', 'editor', 'viewer']);

@Injectable()
export class MembershipService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
  ) {}

  async updateOrganizationMember(principal: SessionPrincipal, organizationId: string, userId: string, role: string) {
    await this.authorization.assertOrganizationAdmin(principal, organizationId);
    if (!ORGANIZATION_ROLES.has(role)) throw invalidRole();
    const current = await this.prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
    if (!current) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member was not found.');
    if (current.role === 'organization_admin' && role !== 'organization_admin') {
      const adminCount = await this.prisma.organizationMember.count({ where: { organizationId, role: 'organization_admin' } });
      if (adminCount <= 1) throw new ApiError(409, 'LAST_ORGANIZATION_ADMIN', 'The last organization admin cannot be removed or downgraded.');
    }
    await this.prisma.$transaction(async tx => {
      await tx.organizationMember.updateMany({ where: { organizationId, userId }, data: { role } });
      await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    return { success: true };
  }

  async listOrganizationMembers(principal: SessionPrincipal, organizationId: string) {
    await this.authorization.assertOrganizationAdmin(principal, organizationId);
    const memberships = await this.prisma.organizationMember.findMany({
      where: { organizationId }, orderBy: [{ createdAt: 'asc' }, { userId: 'asc' }],
    });
    const profiles = await this.prisma.userProfile.findMany({ where: { id: { in: memberships.map(item => item.userId) }, organizationId } });
    const profileById = new Map(profiles.map(profile => [profile.id, profile]));
    return memberships.flatMap(membership => {
      const profile = profileById.get(membership.userId);
      return profile ? [{
        id: profile.id,
        email: profile.email,
        name: profile.displayName,
        status: profile.status,
        disabledAt: profile.disabledAt,
        role: membership.role,
        createdAt: membership.createdAt,
      }] : [];
    });
  }

  async removeOrganizationMember(principal: SessionPrincipal, organizationId: string, userId: string) {
    await this.authorization.assertOrganizationAdmin(principal, organizationId);
    const current = await this.prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
    if (!current) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member was not found.');
    if (current.role === 'organization_admin') {
      const adminCount = await this.prisma.organizationMember.count({ where: { organizationId, role: 'organization_admin' } });
      if (adminCount <= 1) throw new ApiError(409, 'LAST_ORGANIZATION_ADMIN', 'The last organization admin cannot be removed or downgraded.');
    }
    await this.prisma.$transaction(async tx => {
      await tx.organizationMember.deleteMany({ where: { organizationId, userId } });
      await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    return { success: true };
  }

  async setUserStatus(principal: SessionPrincipal, organizationId: string, userId: string, status: string) {
    await this.authorization.assertOrganizationAdmin(principal, organizationId);
    if (!['active', 'disabled'].includes(status)) throw new ApiError(422, 'INVALID_USER_STATUS', 'The requested user status is invalid.');
    const membership = await this.prisma.organizationMember.findUnique({ where: { organizationId_userId: { organizationId, userId } } });
    if (!membership) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member was not found.');
    if (status === 'disabled' && membership.role === 'organization_admin') {
      const adminCount = await this.prisma.organizationMember.count({ where: { organizationId, role: 'organization_admin' } });
      if (adminCount <= 1) throw new ApiError(409, 'LAST_ORGANIZATION_ADMIN', 'The last organization admin cannot be disabled.');
    }
    const now = new Date();
    await this.prisma.$transaction(async tx => {
      const updated = await tx.userProfile.updateMany({ where: { id: userId, organizationId }, data: { status, disabledAt: status === 'disabled' ? now : null } });
      if (updated.count !== 1) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member was not found.');
      await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    });
    return { success: true };
  }

  async listProjectMembers(principal: SessionPrincipal, projectId: string) {
    await this.authorization.assertProjectPermission(principal, projectId, 'manage_members');
    const project = await this.prisma.biProject.findFirst({ where: { id: projectId, organizationId: principal.organizationId, deletedAt: null } });
    if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
    const memberships = await this.prisma.biProjectMember.findMany({ where: { projectId }, orderBy: [{ userId: 'asc' }] });
    const profiles = await this.prisma.userProfile.findMany({ where: { id: { in: memberships.map(item => item.userId) }, organizationId: principal.organizationId } });
    const profileById = new Map(profiles.map(profile => [profile.id, profile]));
    return memberships.flatMap(membership => {
      const profile = profileById.get(membership.userId);
      return profile ? [{ id: profile.id, email: profile.email, name: profile.displayName, status: profile.status, role: membership.role }] : [];
    });
  }

  async setProjectMember(principal: SessionPrincipal, projectId: string, userId: string, role: string) {
    await this.authorization.assertProjectPermission(principal, projectId, 'manage_members');
    if (!PROJECT_ROLES.has(role)) throw invalidRole();
    const [project, profile] = await Promise.all([
      this.prisma.biProject.findFirst({ where: { id: projectId, organizationId: principal.organizationId, deletedAt: null } }),
      this.prisma.userProfile.findUnique({ where: { id: userId } }),
    ]);
    if (!project || !profile || profile.organizationId !== principal.organizationId) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member was not found.');
    if (project.ownerUserId === userId && role !== 'project_owner') throw new ApiError(409, 'PROJECT_OWNER_REQUIRED', 'The project owner role cannot be removed.');
    await this.prisma.$transaction(async tx => {
      await tx.biProjectMember.upsert({
        where: { projectId_userId: { projectId, userId } },
        create: { id: `member-${randomUUID()}`, organizationId: principal.organizationId, projectId, userId, role },
        update: { role },
      });
      await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    });
    return { success: true };
  }

  async removeProjectMember(principal: SessionPrincipal, projectId: string, userId: string) {
    await this.authorization.assertProjectPermission(principal, projectId, 'manage_members');
    const project = await this.prisma.biProject.findFirst({ where: { id: projectId, organizationId: principal.organizationId, deletedAt: null } });
    if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
    if (project.ownerUserId === userId) throw new ApiError(409, 'PROJECT_OWNER_REQUIRED', 'The project owner role cannot be removed.');
    const removed = await this.prisma.biProjectMember.deleteMany({ where: { projectId, userId } });
    if (removed.count !== 1) throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member was not found.');
    await this.prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { success: true };
  }
}

function invalidRole() {
  return new ApiError(422, 'INVALID_ROLE', 'The requested role is invalid.');
}
