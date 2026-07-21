import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(import.meta.dirname, '../../..');

describe('Prisma schema contract', () => {
  it('maps every approved P0 table exactly once', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'docs/database/schema-manifest.json'), 'utf8'));
    const prisma = fs.readFileSync(path.join(repositoryRoot, 'apps/api/prisma/schema.prisma'), 'utf8');
    const mapped = [...prisma.matchAll(/@@map\("([a-z0-9_]+)"\)/g)].map(match => match[1]);
    const expected = manifest.tables.filter((table: { classification: string }) => table.classification === 'P0_CORE').map((table: { name: string }) => table.name).sort();

    expect(mapped.sort()).toEqual(expected);
  });

  it('declares the tenant and core entity foreign-key relations', () => {
    const migration = fs.readFileSync(path.join(repositoryRoot, 'apps/api/prisma/postgres-migrations/0001_postgresql_core/migration.sql'), 'utf8');
    for (const relation of ['bi_projects_organization_id_fkey', 'datasets_project_id_fkey', 'charts_dataset_id_fkey', 'bi_dashboards_project_id_fkey', 'dashboard_widgets_dashboard_id_fkey']) {
      expect(migration).toContain(`CONSTRAINT "${relation}"`);
    }
  });

  it('uses PostgreSQL-native JSONB, timezone-aware timestamps, and signed bigint identities', () => {
    const prisma = fs.readFileSync(path.join(repositoryRoot, 'apps/api/prisma/schema.prisma'), 'utf8');
    const migration = fs.readFileSync(path.join(repositoryRoot, 'apps/api/prisma/postgres-migrations/0001_postgresql_core/migration.sql'), 'utf8');

    expect(prisma).toContain('provider = "postgresql"');
    expect(prisma).not.toMatch(/UnsignedBigInt|LongText|DateTime\(3\)/);
    expect(migration).toContain('JSONB');
    expect(migration).toContain('TIMESTAMPTZ(3)');
    expect(migration).not.toMatch(/AUTO_INCREMENT|UNSIGNED|ENGINE=|`/);
  });
});
