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
    const migration = fs.readFileSync(path.join(repositoryRoot, 'apps/api/prisma/migrations/0001_core/migration.sql'), 'utf8');
    for (const relation of ['bi_projects_ibfk_org', 'datasets_ibfk_project', 'charts_ibfk_dataset', 'bi_dashboards_ibfk_project', 'dashboard_widgets_ibfk_dashboard']) {
      expect(migration).toContain(`CONSTRAINT \`${relation}\``);
    }
  });
});
