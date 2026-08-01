import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('dashboard_core database architecture', () => {
  let database: Client;

  beforeAll(async () => {
    database = new Client({ connectionString: process.env.DATABASE_URL });
    await database.connect();
  });

  afterAll(async () => database?.end());

  it('keeps all application business tables out of public', async () => {
    const result = await database.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name <> '_prisma_migrations'
      ORDER BY table_name
    `);
    expect(result.rows).toEqual([]);
  });

  it('retains the complete application model in dashboard_core', async () => {
    const result = await database.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM information_schema.tables
      WHERE table_schema = 'dashboard_core'
        AND table_type = 'BASE TABLE'
    `);
    expect(result.rows[0]?.count).toBe('58');
  });

  it('keeps Scopus read-only and unchanged', async () => {
    const counts = await database.query<{ table_count: string }>(`
      SELECT count(*)::text AS table_count
      FROM pg_tables
      WHERE schemaname = 'scopus'
    `);
    expect(counts.rows[0]?.table_count).toBe('21');

    const privileges = await database.query<{ can_write: boolean }>(`
      SELECT has_schema_privilege('dashboardmini_app', 'scopus', 'CREATE')
        OR EXISTS (
          SELECT 1
          FROM information_schema.role_table_grants
          WHERE grantee = 'dashboardmini_app'
            AND table_schema = 'scopus'
            AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
        ) AS can_write
    `);
    expect(privileges.rows[0]?.can_write).toBe(false);
  });

  it('has no invalid application constraints', async () => {
    const invalid = await database.query<{ count: string }>(`
      SELECT count(*)::text AS count
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'dashboard_core' AND NOT c.convalidated
    `);
    expect(invalid.rows[0]?.count).toBe('0');
  });
});
