import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../../shared/http/api-error.js';
import { hashOpaqueToken, hashPassword, issueOpaqueToken, normalizeEmail, validatePasswordPolicy, verifyPassword } from '../domain/auth-security.js';
import type { SessionPrincipal } from './auth.service.js';
import { MAIL_PROVIDER, type MailProvider } from './mail-provider.js';

type AuditContext = { requestId: string; ipAddress?: string };

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider,
  ) {}

  async changePassword(principal: SessionPrincipal, currentPassword: string, newPassword: string) {
    const [profile, credential] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { id: principal.userId } }),
      this.prisma.userCredential.findUnique({ where: { userId: principal.userId } }),
    ]);
    if (!profile || !credential || !await verifyPassword(credential.passwordHash, currentPassword)) throw invalidCredentials();
    validatePasswordPolicy(newPassword, profile.email, profile.displayName);
    const passwordHash = await hashPassword(newPassword);
    const now = new Date();
    await this.prisma.$transaction(async tx => {
      await tx.userCredential.update({
        where: { userId: profile.id },
        data: { passwordHash, passwordChangedAt: now, failedLoginCount: 0, lockedUntil: null },
      });
      await tx.authSession.updateMany({ where: { userId: profile.id, revokedAt: null }, data: { revokedAt: now } });
    });
    return { success: true };
  }

  async forgotPassword(email: string, context: AuditContext) {
    const normalizedEmail = normalizeEmail(email);
    const profile = normalizedEmail ? await this.prisma.userProfile.findUnique({ where: { normalizedEmail } }) : null;
    if (profile && profile.status === 'active' && !profile.disabledAt) {
      const issued = issueOpaqueToken();
      const now = new Date();
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: profile.id, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      await this.prisma.passwordResetToken.create({
        data: {
          id: `reset-${randomUUID()}`,
          userId: profile.id,
          tokenHash: issued.tokenHash,
          expiresAt: new Date(now.getTime() + this.environment.passwordResetTimeoutSeconds * 1_000),
          createdAt: now,
        },
      });
      await this.mail.sendPasswordReset(profile.email, issued.token);
    }
    await this.audit('password_reset_requested', 'accepted', context, profile?.organizationId, profile?.id);
    return { accepted: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = token ? await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashOpaqueToken(token) } }) : null;
    const now = new Date();
    if (!reset || reset.usedAt || reset.revokedAt || reset.expiresAt <= now) throw invalidResetToken();
    const profile = await this.prisma.userProfile.findUnique({ where: { id: reset.userId } });
    if (!profile || profile.status !== 'active' || profile.disabledAt) throw invalidResetToken();
    validatePasswordPolicy(newPassword, profile.email, profile.displayName);
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction(async tx => {
      const consumed = await tx.passwordResetToken.updateMany({
        where: { id: reset.id, usedAt: null, revokedAt: null },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) throw invalidResetToken();
      await tx.userCredential.update({
        where: { userId: profile.id },
        data: { passwordHash, passwordChangedAt: now, failedLoginCount: 0, lockedUntil: null },
      });
      await tx.authSession.updateMany({ where: { userId: profile.id, revokedAt: null }, data: { revokedAt: now } });
    });
    return { success: true };
  }

  private async audit(event: string, outcome: string, context: AuditContext, organizationId?: string, userId?: string) {
    await this.prisma.authenticationAuditLog.create({
      data: { organizationId, userId, requestId: context.requestId, event, outcome },
    }).catch(() => undefined);
  }
}

function invalidCredentials() {
  return new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
}

function invalidResetToken() {
  return new ApiError(400, 'INVALID_RESET_TOKEN', 'The password reset link is invalid or expired.');
}
