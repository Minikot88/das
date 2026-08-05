import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../../shared/http/api-error.js';
import { AuthService, type SessionPrincipal } from './auth.service.js';

@Injectable()
export class ApplicationSessionService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
  ) {}

  async create(principal: SessionPrincipal): Promise<{ sessionToken: string; csrfToken: string }> {
    const now = new Date();
    const sessionToken = randomToken();
    const csrfToken = randomToken();
    const expiresAt = new Date(now.getTime() + this.environment.sessionCookieMaxAgeSeconds * 1_000);
    await this.prisma.authSession.create({
      data: {
        id: `ses_${randomBytes(18).toString('base64url')}`,
        organizationId: principal.organizationId,
        userId: principal.userId,
        tokenHash: hash(sessionToken),
        csrfTokenHash: hash(csrfToken),
        idleExpiresAt: expiresAt,
        absoluteExpiresAt: expiresAt,
        lastSeenAt: now,
      },
    });
    return { sessionToken, csrfToken };
  }

  async authenticate(token: string, csrfToken?: string): Promise<SessionPrincipal> {
    if (!validToken(token)) throw invalidSession();
    const record = await this.prisma.authSession.findUnique({ where: { tokenHash: hash(token) } });
    const now = new Date();
    if (
      !record
      || record.revokedAt
      || record.idleExpiresAt.getTime() <= now.getTime()
      || record.absoluteExpiresAt.getTime() <= now.getTime()
    ) {
      throw invalidSession();
    }
    if (
      csrfToken !== undefined
      && (!validToken(csrfToken) || !hashEquals(record.csrfTokenHash, hash(csrfToken)))
    ) {
      throw csrfInvalid();
    }
    if (now.getTime() - record.lastSeenAt.getTime() >= 60_000) {
      const idleExpiresAt = new Date(Math.min(
        record.absoluteExpiresAt.getTime(),
        now.getTime() + this.environment.sessionCookieMaxAgeSeconds * 1_000,
      ));
      await this.prisma.authSession.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { lastSeenAt: now, idleExpiresAt },
      });
    }
    return this.auth.resolveApplicationSession({
      organizationId: record.organizationId,
      userId: record.userId,
      sessionId: record.id,
    });
  }

  async logout(token: string, csrfToken: string): Promise<void> {
    if (!validToken(token) || !validToken(csrfToken)) throw csrfInvalid();
    const record = await this.prisma.authSession.findUnique({ where: { tokenHash: hash(token) } });
    if (!record || record.revokedAt) return;
    if (!hashEquals(record.csrfTokenHash, hash(csrfToken))) throw csrfInvalid();
    await this.prisma.authSession.updateMany({
      where: { id: record.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

function randomToken() {
  return randomBytes(32).toString('base64url');
}

function validToken(value: string) {
  return /^[A-Za-z0-9_-]{40,512}$/.test(value);
}

function hash(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hashEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function invalidSession() {
  return new ApiError(401, 'INVALID_SESSION', 'The session is invalid or expired.');
}

function csrfInvalid() {
  return new ApiError(403, 'CSRF_TOKEN_INVALID', 'The request could not be verified.');
}
