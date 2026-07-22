import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../../shared/http/api-error.js';
import { hashOpaqueToken, hashPassword, issueOpaqueToken, normalizeEmail, validatePasswordPolicy } from '../domain/auth-security.js';
import type { SessionPrincipal } from './auth.service.js';
import { AuthorizationService } from './authorization.service.js';

const ORGANIZATION_ROLES = new Set(['organization_admin', 'member']);
const PROJECT_ROLES = new Set(['project_owner', 'editor', 'viewer']);

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
  ) {}

  async createInvitation(principal: SessionPrincipal, organizationId: string, input: { email?: string; role?: string; projectId?: string }) {
    await this.authorization.assertOrganizationAdmin(principal, organizationId);
    const normalizedEmail = normalizeEmail(String(input.email || ''));
    if (!normalizedEmail || !normalizedEmail.includes('@')) throw new ApiError(422, 'VALIDATION_ERROR', 'A valid email is required.');
    const projectId = input.projectId ? String(input.projectId) : null;
    const role = String(input.role || (projectId ? 'viewer' : 'member'));
    if (projectId) {
      await this.authorization.assertProjectPermission(principal, projectId, 'manage_members');
      if (!PROJECT_ROLES.has(role)) throw invalidRole();
    } else if (!ORGANIZATION_ROLES.has(role)) throw invalidRole();
    const issued = issueOpaqueToken();
    const now = new Date();
    const invitation = await this.prisma.invitation.create({
      data: {
        id: `invitation-${randomUUID()}`,
        organizationId,
        projectId,
        email: String(input.email || '').trim(),
        normalizedEmail,
        role,
        tokenHash: issued.tokenHash,
        expiresAt: new Date(now.getTime() + this.environment.invitationTimeoutSeconds * 1_000),
        createdBy: principal.userId,
        createdAt: now,
      },
    });
    return { ...safeInvitation(invitation), token: issued.token };
  }

  async listInvitations(principal: SessionPrincipal, organizationId: string) {
    await this.authorization.assertOrganizationAdmin(principal, organizationId);
    const invitations = await this.prisma.invitation.findMany({ where: { organizationId }, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }] });
    return invitations.map(safeInvitation);
  }

  async revokeInvitation(principal: SessionPrincipal, organizationId: string, invitationId: string) {
    await this.authorization.assertOrganizationAdmin(principal, organizationId);
    const result = await this.prisma.invitation.updateMany({
      where: { id: invitationId, organizationId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) throw new ApiError(404, 'INVITATION_NOT_FOUND', 'Invitation was not found.');
    return { success: true };
  }

  async acceptInvitation(token: string, displayName: string, password: string) {
    const invitation = token ? await this.prisma.invitation.findUnique({ where: { tokenHash: hashOpaqueToken(token) } }) : null;
    const now = new Date();
    if (!invitation || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= now) throw invalidInvitation();
    const name = String(displayName || '').trim();
    if (!name) throw new ApiError(422, 'VALIDATION_ERROR', 'Display name is required.');
    if (await this.prisma.userProfile.findUnique({ where: { normalizedEmail: invitation.normalizedEmail } })) {
      throw new ApiError(409, 'ACCOUNT_EXISTS', 'An account already exists for this email.');
    }
    validatePasswordPolicy(password, invitation.email, name);
    const passwordHash = await hashPassword(password);
    const userId = `user-${randomUUID()}`;
    await this.prisma.$transaction(async tx => {
      const consumed = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, revokedAt: null },
        data: { acceptedAt: now },
      });
      if (consumed.count !== 1) throw invalidInvitation();
      await tx.userProfile.create({
        data: {
          id: userId,
          organizationId: invitation.organizationId,
          externalUserId: userId,
          externalAuthProvider: 'password',
          email: invitation.email,
          normalizedEmail: invitation.normalizedEmail,
          displayName: name,
          status: 'active',
          emailVerifiedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });
      await tx.userCredential.create({
        data: { id: `credential-${randomUUID()}`, userId, passwordHash, passwordChangedAt: now, createdAt: now, updatedAt: now },
      });
      await tx.organizationMember.create({
        data: {
          id: `org-member-${randomUUID()}`,
          organizationId: invitation.organizationId,
          userId,
          role: invitation.projectId ? 'member' : invitation.role,
          createdAt: now,
          updatedAt: now,
        },
      });
      if (invitation.projectId) {
        await tx.biProjectMember.upsert({
          where: { projectId_userId: { projectId: invitation.projectId, userId } },
          create: { id: `member-${randomUUID()}`, organizationId: invitation.organizationId, projectId: invitation.projectId, userId, role: invitation.role },
          update: { role: invitation.role },
        });
      }
    });
    return { id: userId, organizationId: invitation.organizationId, email: invitation.email, name, roles: [invitation.projectId ? invitation.role : invitation.role] };
  }

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

  async createPasswordReset(principal: SessionPrincipal, organizationId: string, userId: string) {
    await this.authorization.assertOrganizationAdmin(principal, organizationId);
    const profile = await this.prisma.userProfile.findUnique({ where: { id: userId } });
    if (!profile || profile.organizationId !== organizationId || profile.status !== 'active' || profile.disabledAt) {
      throw new ApiError(404, 'MEMBER_NOT_FOUND', 'Member was not found.');
    }
    const issued = issueOpaqueToken();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.environment.passwordResetTimeoutSeconds * 1_000);
    await this.prisma.$transaction(async tx => {
      await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null, revokedAt: null }, data: { revokedAt: now } });
      await tx.passwordResetToken.create({ data: { id: `reset-${randomUUID()}`, userId, tokenHash: issued.tokenHash, expiresAt, createdAt: now } });
    });
    return { token: issued.token, expiresAt };
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

function safeInvitation(invitation: Record<string, any>) {
  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    projectId: invitation.projectId,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
    createdAt: invitation.createdAt,
  };
}

function invalidInvitation() {
  return new ApiError(400, 'INVALID_INVITATION', 'The invitation is invalid or expired.');
}

function invalidRole() {
  return new ApiError(422, 'INVALID_ROLE', 'The requested role is invalid.');
}
