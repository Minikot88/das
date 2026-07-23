# DashboardMiniBi database/backend implementation report

Date: 2026-07-21  
Branch: `feat/production-database-backend`

1. **Repository before implementation:** React/Vite local/mock application, frontend-only nginx image, no working backend, ORM, migration, or database container.
2. **Data Dictionary findings:** 19 modules, 152 tables, 2,797 columns, 945 relationship rows, 1,258 index rows, 1,539 constraint rows; 15 polymorphic pseudo-FKs, 168 prefix-index pairs, 135 low-selectivity/audit indexes, and repeated validation tokens.
3. **Decisions resolved:** MariaDB 11.4 LTS, Prisma 7, NestJS/Fastify modular monolith, string public IDs, organization scope, optimistic revisions, soft delete, hashed share tokens, encrypted secrets, and staged schema delivery.
4. **Tables accepted:** P0 core 51 tables.
5. **Tables merged:** 18 draft concepts are represented by core JSON/version/audit structures instead of separate first-release tables.
6. **Tables deferred:** P1 36 and P2 40 tables remain in the approved workbook/manifest for later migrations.
7. **Tables rejected from production seed:** 7 demo-only tables; no implicit demo dataset is seeded.
8. **Database engine/version:** MariaDB 11.4 LTS target.
9. **ORM/migration framework:** Prisma 7.9 with MariaDB driver adapter and forward-only SQL migration.
10. **Migrations created:** `apps/api/prisma/migrations/0001_core/migration.sql` for all 51 P0 tables and explicit foreign keys/indexes.
11. **Backend modules created:** app/config/bootstrap, auth, health, projects, workspace data, query policy, sharing primitives, database and secret infrastructure.
12. **API endpoints created:** canonical health/readiness/auth/projects plus legacy auth/projects/dataset/chart catalog/chart CRUD/dashboard context/widget attachment routes.
13. **Legacy compatibility:** existing `/api/*` paths and payload shapes remain; canonical endpoints use `/api/v1` envelopes and request IDs.
14. **Frontend changes:** no redesign/routes/store keys changed; compose defaults HTTP mode while source development retains explicit mock fallback. nginx now proxies `/api` to Backend.
15. **Security controls:** production env validation, fail-closed external auth placeholder, signed httpOnly cookies, tenant-scoped repositories, revision conflicts, AES-256-GCM secrets, SHA-256 share tokens, read-only SQL validation, Helmet/CORS/rate/body/upload limits, and dependency audits.
16. **Tests performed:** Frontend/unit/deployment tests; Backend environment/domain/security/schema/seed/service/HTTP injection tests; schema dictionary and drift validators.
17. **Test results:** Frontend gate 54 files/274 tests; Backend gate 10 files/23 tests; both builds and dependency audits passed.
18. **Docker results:** compose configuration passes; image build is blocked because Docker Desktop Linux daemon is unavailable.
19. **Deployment results:** not run; no claim of deployed/test-server readiness.
20. **Backup/restore results:** scripts/runbook delivered; live backup/restore rehearsal blocked by unavailable MariaDB runtime.
21. **Known limitations:** CSV server-write import, complete connection execution, persistent share/export APIs, RBAC guards, local-workspace import, object/local file-storage adapter, live integration/E2E, and remaining domain CRUD are not complete.
22. **External dependencies requiring credentials:** selected external identity provider and production secret manager/object storage.
23. **Exact next production command:** after starting Docker Desktop and replacing example secrets, run `docker compose up --build -d`, then verify `/api/v1/ready` and execute the regression/backup-restore runbooks. Do not run this against real data until the external identity adapter and RBAC gates are approved.

Release decision: implementation is a usable database/backend core and integration-environment handoff, **not Definition-of-Done for public production**. See `docs/implementation/final-verification.md` for gate evidence.
