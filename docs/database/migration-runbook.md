# Database migration runbook

## Source of truth

- Approved workbook: `docs/database/database_design_approved.xlsx`
- Machine manifest: `docs/database/schema-manifest.json`
- ORM schema: `apps/api/prisma/schema.prisma`
- Immutable migration: `apps/api/prisma/migrations/0001_core/migration.sql`

Never edit an applied migration. Create a new timestamped migration and review the SQL before deployment.

## Local apply

1. Copy `.env.example` to `.env` and replace local credentials when needed.
2. Start MariaDB: `docker compose up -d database`.
3. Run `npm --prefix apps/api run prisma:generate`.
4. Run `npm --prefix apps/api run prisma:migrate`.
5. Run `npm --prefix apps/api run prisma:seed`.
6. Verify `GET /api/v1/ready` after starting the API.

Seeds are idempotent reference/bootstrap records. Demo datasets are not created unless the explicit seed flag is supplied.

## Rollback

Schema migrations are forward-only. Before deployment, create and verify a backup. For a failed release, roll the application back and apply a reviewed corrective migration. Restore the database only for data-loss/corruption incidents with owner approval.

## Backup and restore

Backup:

`powershell -File infrastructure/database/backup.ps1 -OutputFile D:\backups\dashboard-mini-bi.sql`

Restore (destructive to the target database and requires an explicit switch):

`powershell -File infrastructure/database/restore.ps1 -InputFile D:\backups\dashboard-mini-bi.sql -ConfirmDataReplacement`

Test restore on a disposable database at least once per release cycle and record duration, row counts, and readiness result.
