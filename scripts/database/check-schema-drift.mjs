import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifest = JSON.parse(await fs.readFile(path.join(root, 'docs', 'database', 'schema-manifest.json'), 'utf8'));
const prismaPath = path.join(root, 'apps', 'api', 'prisma', 'schema.prisma');
const prisma = await fs.readFile(prismaPath, 'utf8').catch(() => '');

if (!prisma) {
  console.error(`Prisma schema is missing: ${prismaPath}`);
  process.exit(1);
}

const mappedTables = new Set([...prisma.matchAll(/@@map\("([a-z0-9_]+)"\)/g)].map(match => match[1]));
const expected = manifest.tables.filter(table => table.classification === 'P0_CORE').map(table => table.name);
const missing = expected.filter(table => !mappedTables.has(table));
const unexpected = [...mappedTables].filter(table => !expected.includes(table) && table !== '_prisma_migrations');

if (missing.length || unexpected.length) {
  console.error(JSON.stringify({ drift: true, missing, unexpected }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ drift: false, p0Tables: expected.length }, null, 2));
