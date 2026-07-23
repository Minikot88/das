import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../infrastructure/database/generated/prisma/client.js';
import { hashPassword, normalizeEmail, validatePasswordPolicy } from '../modules/auth/domain/auth-security.js';

const email = String(process.env.ACCOUNT_EMAIL || '');
const password = String(process.env.ACCOUNT_PASSWORD || '');
const normalizedEmail = normalizeEmail(email);

if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('ACCOUNT_EMAIL must be a valid email address.');
validatePasswordPolicy(password, email, '');
if (process.env.NODE_ENV === 'production' && /^(password|admin|changeme|example|demo)/i.test(password)) {
  throw new Error('Example or default passwords are forbidden in production.');
}

const adapter = new PrismaPg({ connectionString: String(process.env.DATABASE_URL || ''), max: 2 });
const prisma = new PrismaClient({ adapter });

try {
  const profile = await prisma.userProfile.findUnique({ where: { normalizedEmail } });
  if (!profile) throw new Error('No account exists for this email address.');
  if (profile.status !== 'active' || profile.disabledAt) throw new Error('The account is not active.');

  const now = new Date();
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async tx => {
    await tx.userCredential.update({
      where: { userId: profile.id },
      data: { passwordHash, passwordChangedAt: now, failedLoginCount: 0, lockedUntil: null },
    });
    await tx.authSession.updateMany({ where: { userId: profile.id, revokedAt: null }, data: { revokedAt: now } });
    await tx.passwordResetToken.updateMany({
      where: { userId: profile.id, usedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.authenticationAuditLog.create({
      data: {
        organizationId: profile.organizationId,
        userId: profile.id,
        requestId: `admin-password-reset-${randomUUID()}`,
        event: 'password_reset_by_admin',
        outcome: 'accepted',
      },
    });
  });
  process.stdout.write(`Password reset complete for ${normalizedEmail}.\n`);
} finally {
  await prisma.$disconnect();
}
