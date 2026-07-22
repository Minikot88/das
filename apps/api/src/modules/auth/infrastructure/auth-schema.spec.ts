import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('production authentication database schema', () => {
  it('defines credential, opaque session, recovery, invitation, membership, and audit models', () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');

    for (const model of ['UserCredential', 'AuthSession', 'PasswordResetToken', 'Invitation', 'OrganizationMember', 'AuthenticationAuditLog']) {
      expect(schema).toMatch(new RegExp(`model ${model} \\{`));
    }
    expect(schema).toContain('normalizedEmail');
    expect(schema).toContain('tokenHash');
  });

  it('adds authentication tables in a new PostgreSQL migration without altering the baseline migration', () => {
    const migration = readFileSync('prisma/postgres-migrations/0002_production_auth_rbac/migration.sql', 'utf8');

    for (const table of ['user_credentials', 'auth_sessions', 'password_reset_tokens', 'invitations', 'organization_members', 'authentication_audit_logs']) {
      expect(migration).toContain(`CREATE TABLE "${table}"`);
    }
    expect(migration).toContain('CREATE UNIQUE INDEX "uq_auth_sessions_token_hash"');
    expect(migration).toContain('CREATE UNIQUE INDEX "uq_user_profiles_normalized_email"');
  });

  it('uses index-compatible variable length hashes for opaque token lookups', () => {
    const schema = readFileSync('prisma/schema.prisma', 'utf8');
    const migration = readFileSync('prisma/postgres-migrations/0003_auth_token_hash_index_compatibility/migration.sql', 'utf8');

    expect(schema).toMatch(/tokenHash\s+String\s+@unique\([^\n]+@db\.VarChar\(64\)/);
    for (const table of ['auth_sessions', 'password_reset_tokens', 'invitations', 'dashboard_share_links']) {
      expect(migration).toContain(`ALTER TABLE "${table}" ALTER COLUMN "token_hash" TYPE VARCHAR(64)`);
    }
  });
});
