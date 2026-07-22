import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(path), 'utf8');

describe('native server deployment tooling', () => {
  it('runs only the project API through PM2 with persistent logs and production safeguards', () => {
    const ecosystem = read('ecosystem.config.cjs');
    expect(ecosystem).toContain("name: 'dashboardmini-api'");
    expect(ecosystem).toContain("script: 'dist/main.js'");
    expect(ecosystem).toContain("shared/backend.env");
    expect(ecosystem).toContain('max_memory_restart');
    expect(ecosystem).not.toMatch(/docker|password\s*:/i);
  });

  it('uses immutable release symlinks and verifies health before accepting a deployment', () => {
    const deploy = read('scripts/deploy-native.sh');
    expect(deploy).toContain('releases');
    expect(deploy).toContain('ln -sfn');
    expect(deploy).toContain('prisma migrate deploy');
    expect(deploy).toContain('verify-native.sh');
    expect(deploy).not.toContain('git reset --hard');
    expect(deploy).not.toContain('docker compose');
  });

  it('waits for bounded native startup before declaring health verification failed', () => {
    const verify = read('scripts/verify-native.sh');
    expect(verify).toContain('wait_for_url');
    expect(verify).toContain('for attempt in $(seq 1 30)');
    expect(verify).toContain('sleep 1');
  });

  it('rolls application symlinks back without automatically rolling back the database', () => {
    const rollback = read('scripts/rollback-native.sh');
    expect(rollback).toContain('previous');
    expect(rollback).toContain('ln -sfn');
    expect(rollback).toContain('database migrations are not rolled back');
    expect(rollback).not.toMatch(/migrate reset|drop database/i);
  });

  it('backs up through PostgreSQL native tools and restores only to a temporary database', () => {
    const backup = read('scripts/backup-native.sh');
    const restore = read('scripts/restore-test-native.sh');
    expect(backup).toContain('pg_dump');
    expect(backup).toContain('sha256sum');
    expect(backup).toContain('flock');
    expect(restore).toContain('dashboardmini_restore_');
    expect(restore).toContain('pg_restore');
    expect(restore).toContain('dropdb');
    expect(restore).not.toContain('dropdb dashboardmini');
  });

  it('documents native production variables without real credentials', () => {
    const env = read('.env.native.example');
    expect(env).toContain('APP_ENV=production');
    expect(env).toContain('DEPLOYMENT_ENV=staging');
    expect(env).toContain('AUTH_PROVIDER=database');
    expect(env).toContain('COOKIE_SECURE=true');
    expect(env).toContain('PUBLIC_REGISTRATION_ENABLED=false');
    expect(env).toContain('SMTP_ENABLED=false');
    expect(env).not.toMatch(/postgresql:\/\/[^:]+:[^<\n]+@/);
  });
});
