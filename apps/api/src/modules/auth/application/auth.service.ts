import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../../shared/http/api-error.js';
import { hashOpaqueToken, issueOpaqueToken, normalizeEmail } from '../domain/auth-security.js';
import { AUTH_PROVIDER, type AuthProvider } from './auth-provider.js';

export type LoginContext = {
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  existingSessionToken?: string;
};

export type SessionPrincipal = {
  organizationId: string;
  userId: string;
  sessionId: string;
  roles: string[];
  csrfTokenHash: string;
};

@Injectable()
export class AuthService {
  private readonly testSessions = new Map<string, { id: string; user: Awaited<ReturnType<AuthProvider['authenticate']>>; csrfTokenHash: string; idleExpiresAt: Date; absoluteExpiresAt: Date; revokedAt: Date | null; createdAt: Date; lastSeenAt: Date }>();
  constructor(
    @Inject(AUTH_PROVIDER) private readonly provider: AuthProvider,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
    private readonly prisma: PrismaService,
  ) {}

  async login(email: string, password: string, context: LoginContext) {
    const normalizedEmail = normalizeEmail(email);
    try {
      const user = await this.provider.authenticate(normalizedEmail, password);
      if (context.existingSessionToken) await this.revokeByToken(context.existingSessionToken);
      const session = issueOpaqueToken();
      const csrf = issueOpaqueToken();
      const createdAt = new Date();
      const idleExpiresAt = new Date(createdAt.getTime() + this.environment.sessionIdleTimeoutSeconds * 1_000);
      const absoluteExpiresAt = new Date(createdAt.getTime() + this.environment.sessionAbsoluteTimeoutSeconds * 1_000);
      const sessionId = `session-${randomUUID()}`;
      if (this.isTestDevelopment) this.testSessions.set(session.tokenHash, { id: sessionId, user, csrfTokenHash: csrf.tokenHash, idleExpiresAt, absoluteExpiresAt, revokedAt: null, createdAt, lastSeenAt: createdAt });
      else await this.prisma.authSession.create({
        data: {
          id: sessionId,
          organizationId: user.organizationId,
          userId: user.id,
          tokenHash: session.tokenHash,
          csrfTokenHash: csrf.tokenHash,
          idleExpiresAt,
          absoluteExpiresAt,
          lastSeenAt: createdAt,
          ipHash: optionalHash(context.ipAddress),
          userAgentHash: optionalHash(context.userAgent),
          createdAt,
        },
      });
      await this.audit('login', 'succeeded', context, user.organizationId, user.id, normalizedEmail);
      return { user, sessionToken: session.token, csrfToken: csrf.token, sessionExpiresAt: absoluteExpiresAt };
    } catch (error) {
      await this.audit('login', 'failed', context, undefined, undefined, normalizedEmail);
      throw error;
    }
  }

  async authenticateSession(token: string): Promise<SessionPrincipal> {
    if (!token) throw invalidSession();
    if (this.isTestDevelopment) {
      const key = hashOpaqueToken(token);
      const session = this.testSessions.get(key);
      const now = new Date();
      if (!session || session.revokedAt || session.idleExpiresAt <= now || session.absoluteExpiresAt <= now) throw invalidSession();
      session.lastSeenAt = now;
      session.idleExpiresAt = new Date(Math.min(session.absoluteExpiresAt.getTime(), now.getTime() + this.environment.sessionIdleTimeoutSeconds * 1_000));
      return { organizationId: session.user.organizationId, userId: session.user.id, sessionId: session.id, roles: session.user.roles, csrfTokenHash: session.csrfTokenHash };
    }
    const now = new Date();
    const session = await this.prisma.authSession.findUnique({ where: { tokenHash: hashOpaqueToken(token) } });
    if (!session || session.revokedAt || session.idleExpiresAt <= now || session.absoluteExpiresAt <= now) {
      if (session && !session.revokedAt) {
        await this.prisma.authSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: now } });
      }
      throw invalidSession();
    }
    const user = await this.prisma.userProfile.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'active' || user.disabledAt || user.organizationId !== session.organizationId) {
      await this.prisma.authSession.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: now } });
      throw invalidSession();
    }
    const [organizationMembership, projectMemberships] = await Promise.all([
      this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: session.organizationId, userId: session.userId } },
      }),
      this.prisma.biProjectMember.findMany({
        where: { organizationId: session.organizationId, userId: session.userId },
        select: { role: true },
      }),
    ]);
    const idleExpiresAt = new Date(Math.min(
      session.absoluteExpiresAt.getTime(),
      now.getTime() + this.environment.sessionIdleTimeoutSeconds * 1_000,
    ));
    const refreshed = await this.prisma.authSession.updateMany({
      where: { id: session.id, revokedAt: null, idleExpiresAt: { gt: now }, absoluteExpiresAt: { gt: now } },
      data: { lastSeenAt: now, idleExpiresAt },
    });
    if (refreshed.count !== 1) throw invalidSession();
    return {
      organizationId: session.organizationId,
      userId: session.userId,
      sessionId: session.id,
      csrfTokenHash: session.csrfTokenHash,
      roles: [...new Set([
        ...(organizationMembership?.role ? [organizationMembership.role] : []),
        ...projectMemberships.map(item => item.role),
      ])],
    };
  }

  async logout(sessionId: string, userId: string) {
    if (this.isTestDevelopment) {
      for (const session of this.testSessions.values()) if (session.id === sessionId && session.user.id === userId) session.revokedAt = new Date();
    } else {
      await this.prisma.authSession.updateMany({ where: { id: sessionId, userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return { success: true };
  }

  async logoutAll(userId: string) {
    if (this.isTestDevelopment) {
      for (const session of this.testSessions.values()) if (session.user.id === userId) session.revokedAt = new Date();
    } else {
      await this.prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return { success: true };
  }

  async me(principal: SessionPrincipal) {
    if (this.isTestDevelopment) {
      const session = [...this.testSessions.values()].find(item => item.id === principal.sessionId && !item.revokedAt);
      if (!session) throw invalidSession();
      return session.user;
    }
    const user = await this.prisma.userProfile.findUnique({ where: { id: principal.userId } });
    if (!user || user.organizationId !== principal.organizationId || user.status !== 'active' || user.disabledAt) throw invalidSession();
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      name: user.displayName,
      roles: principal.roles,
    };
  }

  async listSessions(principal: SessionPrincipal) {
    if (this.isTestDevelopment) return [...this.testSessions.values()].filter(item => item.user.id === principal.userId && !item.revokedAt).map(item => ({ id: item.id, createdAt: item.createdAt, lastSeenAt: item.lastSeenAt, absoluteExpiresAt: item.absoluteExpiresAt, userAgentHash: null, ipHash: null, current: item.id === principal.sessionId }));
    const sessions = await this.prisma.authSession.findMany({
      where: { userId: principal.userId, revokedAt: null, absoluteExpiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, lastSeenAt: true, absoluteExpiresAt: true, userAgentHash: true, ipHash: true },
      orderBy: [{ lastSeenAt: 'desc' }, { id: 'asc' }],
    });
    return sessions.map(session => ({
      id: session.id,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      absoluteExpiresAt: session.absoluteExpiresAt,
      userAgentHash: session.userAgentHash,
      ipHash: session.ipHash,
      current: session.id === principal.sessionId,
    }));
  }

  async revokeSession(principal: SessionPrincipal, sessionId: string) {
    if (this.isTestDevelopment) {
      const session = [...this.testSessions.values()].find(item => item.id === sessionId && item.user.id === principal.userId && !item.revokedAt);
      if (!session) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session was not found.');
      session.revokedAt = new Date();
      return { success: true, current: sessionId === principal.sessionId };
    }
    const result = await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId: principal.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session was not found.');
    return { success: true, current: sessionId === principal.sessionId };
  }

  private async revokeByToken(token: string) {
    if (this.isTestDevelopment) {
      const session = this.testSessions.get(hashOpaqueToken(token));
      if (session) session.revokedAt = new Date();
    } else await this.prisma.authSession.updateMany({ where: { tokenHash: hashOpaqueToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private get isTestDevelopment() { return this.environment.nodeEnv === 'test' && this.environment.authProvider === 'development'; }

  private async audit(event: string, outcome: string, context: LoginContext, organizationId?: string, userId?: string, normalizedEmail?: string) {
    await this.prisma.authenticationAuditLog.create({
      data: {
        organizationId,
        userId,
        requestId: context.requestId,
        event,
        outcome,
        ipHash: optionalHash(context.ipAddress),
        metadataJson: normalizedEmail ? { normalizedEmailHash: optionalHash(normalizedEmail) } : undefined,
      },
    }).catch(() => undefined);
  }
}

function optionalHash(value?: string) {
  return value ? createHash('sha256').update(value, 'utf8').digest('hex') : null;
}

function invalidSession() {
  return new ApiError(401, 'INVALID_SESSION', 'The session is invalid or expired.');
}
