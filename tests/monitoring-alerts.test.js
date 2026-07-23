import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const alerts = readFileSync(resolve('infrastructure/monitoring/alerts.yml'), 'utf8');
const prometheus = readFileSync(resolve('infrastructure/monitoring/prometheus.yml'), 'utf8');
const productionCompose = readFileSync(resolve('docker-compose.production.yml'), 'utf8');
const backupLoop = readFileSync(resolve('infrastructure/backup/backup-loop.sh'), 'utf8');

describe('production monitoring alerts', () => {
  it.each([
    'DashboardBackendDown',
    'DashboardDatabaseDown',
    'DashboardBackupFailed',
    'DashboardHighErrorRate',
    'DashboardHighP95Latency',
  ])('defines the %s alert', alertName => {
    expect(alerts).toContain(`alert: ${alertName}`);
  });

  it('collects backup outcomes through an internal Pushgateway', () => {
    expect(productionCompose).toContain('pushgateway:');
    expect(prometheus).toContain('job_name: backup-status');
    expect(backupLoop).toContain('dashboard_backup_last_success_timestamp_seconds');
    expect(backupLoop).toContain('dashboard_backup_last_run_success');
    expect(backupLoop).toContain('--post-file="$metrics_file"');
  });
});
