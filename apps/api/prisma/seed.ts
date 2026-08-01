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
const seed = buildSeedData();
for (const chartType of seed.chartTypes) await prisma.chartType.upsert({ where: { id: chartType.id }, create: chartType, update: { name: chartType.name, renderer: chartType.renderer } });
for (const sourceType of seed.dataSourceTypes) await prisma.dataSourceType.upsert({ where: { id: sourceType.id }, create: sourceType, update: { name: sourceType.name, implementation: sourceType.implementation } });

await prisma.$disconnect();
