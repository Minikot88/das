import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../../shared/http/api-error.js';
import type { AuthenticatedUser, AuthProvider } from '../application/auth-provider.js';
import { hashPassword, normalizeEmail, verifyPassword } from '../domain/auth-security.js';

const FAILURE_LIMIT = 5;
const LOCKOUT_MILLISECONDS = 15 * 60 * 1000;

@Injectable()
export class DatabaseAuthProvider implements AuthProvider {
  private readonly dummyHash = hashPassword(randomBytes(32).toString('base64url'));

  constructor(private readonly prisma: PrismaService) {}

  async authenticate(email: string, password: string): Promise<AuthenticatedUser> {
    const normalizedEmail = normalizeEmail(email);
    const user = normalizedEmail
      ? await this.prisma.userProfile.findUnique({ where: { normalizedEmail } })
      : null;
    const credential = user
      ? await this.prisma.userCredential.findUnique({ where: { userId: user.id } })
      : null;
    const passwordHash = credential?.passwordHash || await this.dummyHash;
    const passwordMatches = await verifyPassword(passwordHash, password);
    const now = new Date();
    const locked = Boolean(credential?.lockedUntil && credential.lockedUntil > now);

    if (!user || !credential || !passwordMatches || locked || user.status !== 'active' || user.disabledAt) {
      if (user && credential && !locked) {
        const failedLoginCount = credential.failedLoginCount + 1;
        await this.prisma.userCredential.update({
          where: { userId: user.id },
          data: {
            failedLoginCount,
            lockedUntil: failedLoginCount >= FAILURE_LIMIT ? new Date(now.getTime() + LOCKOUT_MILLISECONDS) : null,
          },
        });
      }
      throw invalidCredentials();
    }

    if (credential.failedLoginCount || credential.lockedUntil) {
      await this.prisma.userCredential.update({ where: { userId: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
    }
    const [organizationMembership, projectMemberships] = await Promise.all([
      this.prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: user.organizationId, userId: user.id } },
      }),
      this.prisma.biProjectMember.findMany({
        where: { organizationId: user.organizationId, userId: user.id },
        select: { role: true },
      }),
    ]);
    const roles = [...new Set([
      ...(organizationMembership?.role ? [organizationMembership.role] : []),
      ...projectMemberships.map(item => item.role),
    ])];
    return { id: user.id, organizationId: user.organizationId, email: user.email, name: user.displayName, roles };
  }
}

function invalidCredentials() {
  return new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
}
