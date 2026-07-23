import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/infrastructure/database/generated/prisma/client.js';
import { buildSeedData } from './seed-data.js';

const connectionString = process.env.DATABASE_URL || '';
const adapter = new PrismaPg({
  connectionString,
  max: 2,
  idleTimeoutMillis: 10_000,
  statement_timeout: 30_000,
});
const prisma = new PrismaClient({ adapter });
const seed = buildSeedData({ includeDemoSales: process.env.ENABLE_DEMO_SEED === 'true' });

await prisma.organization.upsert({ where: { id: seed.organization.id }, create: seed.organization, update: { name: seed.organization.name } });
await prisma.userProfile.upsert({ where: { id: seed.user.id }, create: seed.user, update: { displayName: seed.user.displayName } });
for (const role of seed.roles) await prisma.role.upsert({ where: { id: role.id }, create: role, update: { name: role.name } });
for (const permission of seed.permissions) await prisma.permission.upsert({ where: { id: permission.id }, create: permission, update: {} });
for (const role of seed.roles) {
  for (const permission of seed.permissions) {
    const id = `${role.id}-${permission.id}`;
    await prisma.rolePermission.upsert({ where: { id }, create: { id, roleId: role.id, permissionId: permission.id }, update: {} });
  }
}
await prisma.userRole.upsert({ where: { id: 'user-role-development-owner' }, create: { id: 'user-role-development-owner', userId: seed.user.id, roleId: 'role-owner' }, update: {} });
for (const chartType of seed.chartTypes) await prisma.chartType.upsert({ where: { id: chartType.id }, create: chartType, update: { name: chartType.name, renderer: chartType.renderer } });
for (const sourceType of seed.dataSourceTypes) await prisma.dataSourceType.upsert({ where: { id: sourceType.id }, create: sourceType, update: { name: sourceType.name, implementation: sourceType.implementation } });

await prisma.$disconnect();
