import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../../shared/http/api-error.js';
import type { VerifiedExternalClaims } from '../infrastructure/external-token-verifier.js';

export type ProjectScope = {
  projectId: string;
  role: string;
};

export type SessionPrincipal = {
  organizationId: string;
  userId: string;
  sessionId: string;
  roles: string[];
  projectScopes?: ProjectScope[];
  authMode?: 'external' | 'disabled';
};

@Injectable()
export class AuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async authenticateInternalSingleUser(userId: string): Promise<SessionPrincipal> {
    const user = await this.prisma.userProfile.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'active' || user.disabledAt) throw invalidSession();
    return this.resolveDatabasePrincipal(user.organizationId, user.id, 'disabled', 'internal-single-user');
  }

  async resolveExternalIdentity(identity: VerifiedExternalClaims): Promise<SessionPrincipal> {
    const providerKey = externalIdentityProviderKey(identity.provider, identity.issuer);
    const user = await this.prisma.userProfile.findFirst({
      where: {
        organizationId: identity.organizationId,
        externalAuthProvider: providerKey,
        externalUserId: identity.externalUserId,
        status: 'active',
        disabledAt: null,
      },
    });
    if (!user) throw externalIdentityForbidden();
    const sessionId = `external-${stableHash(`${providerKey}\0${identity.externalUserId}`).slice(0, 48)}`;
    return this.resolveDatabasePrincipal(user.organizationId, user.id, 'external', sessionId);
  }

  async me(principal: SessionPrincipal) {
    const user = await this.prisma.userProfile.findUnique({ where: { id: principal.userId } });
    if (!user || user.organizationId !== principal.organizationId || user.status !== 'active' || user.disabledAt) {
      throw invalidSession();
    }
    return {
      id: user.id,
      organizationId: user.organizationId,
      name: user.displayName,
      roles: principal.roles,
      projectScopes: principal.projectScopes,
    };
  }

  private async resolveDatabasePrincipal(
    organizationId: string,
    userId: string,
    authMode: NonNullable<SessionPrincipal['authMode']>,
    sessionId: string,
  ): Promise<SessionPrincipal> {
    const [organizationMembership, projectMemberships] = await Promise.all([
      this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
      }),
      this.prisma.biProjectMember.findMany({
        where: { organizationId, userId },
        select: { projectId: true, role: true },
      }),
    ]);
    if (!organizationMembership) {
      if (authMode === 'external') throw externalIdentityForbidden();
      throw new ApiError(403, 'DISABLED_AUTH_PRINCIPAL_NOT_AUTHORIZED', 'The configured technical principal has no DashboardMiniBi membership.');
    }
    return {
      organizationId,
      userId,
      sessionId,
      roles: [...new Set([organizationMembership.role, ...projectMemberships.map(item => item.role)])],
      projectScopes: projectMemberships.map(item => ({ projectId: item.projectId, role: item.role })),
      authMode,
    };
  }
}

export function externalIdentityProviderKey(provider: string, issuer: string) {
  return `external:${stableHash(`${provider}\0${issuer}`).slice(0, 64)}`;
}

function stableHash(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('base64url');
}

function invalidSession() {
  return new ApiError(401, 'INVALID_SESSION', 'The session is invalid or expired.');
}

function externalIdentityForbidden() {
  return new ApiError(403, 'EXTERNAL_IDENTITY_NOT_AUTHORIZED', 'This external identity has no DashboardMiniBi access.');
}
