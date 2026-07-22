import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../infrastructure/database/generated/prisma/client.js';
import { hashPassword, normalizeEmail, validatePasswordPolicy } from '../modules/auth/domain/auth-security.js';

const email = String(process.env.ADMIN_EMAIL || '');
const password = String(process.env.ADMIN_PASSWORD || '');
const displayName = String(process.env.ADMIN_DISPLAY_NAME || 'Administrator').trim();
const normalizedEmail = normalizeEmail(email);
if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('ADMIN_EMAIL must be a valid email address.');
validatePasswordPolicy(password, email, displayName);
if (process.env.NODE_ENV === 'production' && /^(password|admin|changeme|example|demo)/i.test(password)) {
  throw new Error('Example or default passwords are forbidden in production.');
}
const adapter = new PrismaPg({ connectionString: String(process.env.DATABASE_URL || ''), max: 2 });
const prisma = new PrismaClient({ adapter });
try {
  if (await prisma.userProfile.findUnique({ where: { normalizedEmail } })) throw new Error('An administrator with this email already exists.');
  const organization = await prisma.organization.findFirst({ where: { status: 'active' }, orderBy: { createdAt: 'asc' } })
    ?? await prisma.organization.create({ data: { id: `org-${randomUUID()}`, code: 'DEFAULT', name: 'Default Organization' } });
  const userId = `user-${randomUUID()}`;
  const passwordHash = await hashPassword(password);
  const projects = await prisma.biProject.findMany({ where: { organizationId: organization.id, deletedAt: null }, select: { id: true } });
  await prisma.$transaction(async tx => {
    await tx.userProfile.create({ data: { id: userId, organizationId: organization.id, externalUserId: userId, externalAuthProvider: 'password', email, normalizedEmail, displayName, status: 'active', emailVerifiedAt: new Date() } });
    await tx.userCredential.create({ data: { id: `credential-${randomUUID()}`, userId, passwordHash, passwordChangedAt: new Date() } });
    await tx.organizationMember.create({ data: { id: `org-member-${randomUUID()}`, organizationId: organization.id, userId, role: 'organization_admin' } });
    for (const project of projects) await tx.biProjectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId } },
      create: { id: `member-${randomUUID()}`, organizationId: organization.id, projectId: project.id, userId, role: 'project_owner' },
      update: { role: 'project_owner' },
    });
  });
  process.stdout.write(`Administrator created: ${normalizedEmail}\n`);
} finally {
  await prisma.$disconnect();
}
