# Production Database and Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert DashboardMiniBi from local/mock persistence into a test-deployable internal BI system with durable server storage while preserving all existing routes, UI behavior, entity references, and local migration semantics.

**Architecture:** Keep the existing frontend in place and add `apps/api` as a NestJS/Fastify modular monolith. MariaDB is the test/production database target through Prisma; canonical `/api/v1` controllers and thin legacy controllers share the same application services. Frontend transport remains behind repository/API adapters so mock mode and local workspace import remain explicit compatibility paths.

**Tech Stack:** React/Vite, Node.js/TypeScript, NestJS with Fastify adapter, Prisma, MariaDB, Vitest/Jest-compatible Nest tests, Docker Compose, nginx.

## Global Constraints

- Preserve all existing public/protected frontend routes, UI, layout, styling, chart behavior, loading/error/empty states, and workflows.
- Preserve `mini-bi-workspace-v1` and `mini-bi-db-connections`; local data is never deleted automatically.
- Production mode uses HTTP and never falls back to demo data after an API error.
- `organization_id` is the tenant boundary; authorization comes from authenticated server context and database relationships.
- Imported datasets are bounded to approximately 5 MB, 50,000 rows, and 200 columns.
- Secrets are write-only and encrypted with AES-256-GCM for test deployment; database/API/logs never expose plaintext.
- Share tokens are random, stored as SHA-256 hashes, expire/revoke, and resolve immutable snapshots.
- Updates to projects, charts, dashboards/layouts, saved views, and connections enforce optimistic revision checks.
- Demo sales tables are excluded from production migrations unless an explicit development seed flag is enabled.

---

### Task 1: Baseline and approved database artifacts

**Files:**
- Create: `docs/implementation/baseline-results.md`
- Create: `docs/database/database_design_source.xlsx`
- Create: `docs/database/database_design_approved.xlsx`
- Create: `docs/database/schema-manifest.json`
- Create: `docs/database/{tables,columns,relationships,indexes,constraints,enums,implementation-scope,migration-map}.csv`
- Create: `docs/database/{database-review,database-decisions}.md`
- Create: `scripts/database/{validate-data-dictionary,generate-schema-manifest,check-schema-drift}.mjs`

**Interfaces:** Produces the approved P0/P1 table manifest consumed by Prisma/migration validation.

- [ ] Preserve the attached workbook byte-for-byte as the source copy and record its SHA-256.
- [ ] Run structural QA for duplicate identifiers, PK/FK validity, type/nullability consistency, redundant indexes, repeated constraints, and unresolved polymorphic references.
- [ ] Classify every source table as `P0_CORE`, `P1_PRODUCTION_EXTENSION`, `P2_ENTERPRISE_FUTURE`, `SEED_OR_SAMPLE`, or `REJECTED_OR_MERGED`.
- [ ] Generate the approved workbook and machine-readable exports; render every sheet and scan formula errors before export.
- [ ] Run `node scripts/database/validate-data-dictionary.mjs` and expect exit code 0.
- [ ] Commit as `docs: audit and approve database design`.

### Task 2: MariaDB schema and versioned migrations

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/0001_core/migration.sql`
- Create: `apps/api/prisma/seed.ts`
- Create: `apps/api/src/infrastructure/database/prisma.service.ts`
- Test: `apps/api/test/migration.integration.spec.ts`

**Interfaces:** Produces `PrismaService`; schema uses string client IDs for behavior-preserving import and database-generated bigint internal keys only where not public.

- [ ] Write an integration test that migrates an empty MariaDB schema and asserts approved P0 tables/FKs/indexes.
- [ ] Run the migration test and verify it fails before schema creation.
- [ ] Implement the Prisma models and SQL migration from the approved manifest without copying all 1,258 draft indexes.
- [ ] Seed one test organization, development user/profile, minimal roles/permissions, and required chart/data-source catalogs; never seed demo datasets by default.
- [ ] Run migrate/seed twice and verify history/idempotent seed behavior.
- [ ] Commit as `feat: add production database migrations`.

### Task 3: Backend foundation, authentication, and authorization

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/main.ts`
- Create: `apps/api/src/app/{app.module,configuration,request-context,errors}.ts`
- Create: `apps/api/src/modules/auth/**`
- Create: `apps/api/src/modules/organizations/**`
- Test: `apps/api/src/modules/auth/**/*.spec.ts`, `apps/api/test/auth.integration.spec.ts`

**Interfaces:** `AuthProvider.authenticate()`, `AuthContext`, tenant/project guards, canonical response/error envelope, request ID, secure cookie, health and readiness endpoints.

- [ ] Write failing tests for development-auth production rejection, login rate limits, cookie flags, request IDs, tenant isolation, and `/api/v1/health`/`ready`.
- [ ] Implement Fastify security headers, CORS allowlist, body/upload limits, structured redacted logs, validation, and central error mapping.
- [ ] Implement `DevelopmentAuthProvider` only for development/test and fail startup in production when selected.
- [ ] Implement legacy `/api/auth/login` and `/api/auth/register` as adapters to the same auth application service.
- [ ] Run backend unit/integration tests and commit as `feat: implement backend core modules`.

### Task 4: Project, dataset, chart, dashboard, and widget core

**Files:**
- Create: `apps/api/src/modules/{projects,datasets,charts,dashboards,widgets}/**`
- Test: module specs plus `apps/api/test/core-bi.integration.spec.ts`

**Interfaces:** Canonical `/api/v1` CRUD, legacy `/api/projects`, `/api/dataset*`, `/api/charts*`, `/api/dashboards*`; all mutations return revisions and reject stale writes with 409.

- [ ] Write failing cross-tenant/cross-project and revision-conflict tests.
- [ ] Implement project CRUD and project membership checks.
- [ ] Implement streaming CSV import, type inference, batch row inserts, atomic ready/failed transitions, and import errors.
- [ ] Implement validated dataset select/filter/sort/group/aggregate query operations with hard row/cardinality/time limits.
- [ ] Implement chart CRUD/validation and dashboard/widget aggregate writes preserving client IDs and geometry.
- [ ] Run module/full backend tests and commit in `feat: implement dataset import and query` and `feat: implement backend core modules` milestones.

### Task 5: Connections, secrets, query execution, sharing, exports, and storage

**Files:**
- Create: `apps/api/src/modules/{connections,queries,sharing,exports,audit}/**`
- Create: `apps/api/src/infrastructure/{secrets,storage,connectors}/**`
- Test: module specs plus `apps/api/test/security.integration.spec.ts`

**Interfaces:** `SecretStore`, `FileStorage`, one MariaDB/MySQL read-only connector, hashed share capability resolution, persisted export metadata.

- [ ] Write failing tests for AES-GCM round trip/redaction, blocked DDL/DML/multi-statement SQL, unauthorized connection execution, share expiry/revoke, and snapshot immutability.
- [ ] Implement encrypted secret references and never serialize credential material.
- [ ] Implement connector test/discovery/read-only preview with timeout/row limit and audit records.
- [ ] Implement SHA-256 share tokens, snapshot persistence, revoke/expiry/access logs, and export file metadata.
- [ ] Run security/integration tests and commit as `feat: add secure connection and sharing services`.

### Task 6: Frontend HTTP cutover and local workspace import

**Files:**
- Modify: `src/infrastructure/http/client.js`
- Create: `src/infrastructure/persistence/workspace-repository/httpWorkspaceRepository.js`
- Create: `src/infrastructure/persistence/workspace-repository/importLocalWorkspace.js`
- Modify: domain API adapters under `src/modules/*/api`
- Test: repository/API adapter and import tests alongside the modified modules.

**Interfaces:** Local and HTTP repositories expose compatible operations; import endpoint accepts schema version 1, preserves IDs/references or returns an explicit ID map, and never deletes local data.

- [ ] Write failing adapter contract tests for mock/local and HTTP modes.
- [ ] Add HTTP implementations domain-by-domain in the order auth, projects, datasets, charts, dashboards/widgets, connections, sharing, settings.
- [ ] Implement dry-run/import/backup/result flow for `mini-bi-workspace-v1`.
- [ ] Verify production mode never substitutes mock/demo data after API failure.
- [ ] Run frontend lint/typecheck/tests/build and commit as `feat: connect frontend repositories to backend`.

### Task 7: Docker, CI, backup/restore, and runtime verification

**Files:**
- Modify: `docker-compose.yml`, `Dockerfile`, `nginx.conf`, `.env.example`, `.github/workflows/frontend-checks.yml`
- Create: `apps/api/Dockerfile`, `.env.test.example`
- Create: `scripts/database/{backup,restore,verify-backup}.ps1`
- Create: deployment and environment documentation under `docs/deployment`.

**Interfaces:** Compose services `frontend`, `backend`, `database`, `migration`; nginx proxies `/api/` and retains SPA fallback; persistent database/upload/export/backup volumes.

- [ ] Add container health checks, non-root backend runtime, one-shot migration service, and durable volumes.
- [ ] Add CI gates for frontend/backend lint/typecheck/tests/build, workbook validation, schema drift, empty database migration, and Docker build.
- [ ] Backup a populated test database, restore into an empty database, compare migration version/row counts, and run smoke tests.
- [ ] Restart backend/database and verify persisted core flow remains readable.
- [ ] Commit as `ops: add docker deployment and backup restore`.

### Task 8: Final documentation and quality gate

**Files:**
- Create/update all architecture, API, development, deployment, database, and `docs/implementation/final-report.md` documents required by the specification.

**Interfaces:** Documents name exact commands, verified results, remaining credential dependencies, and the next production command.

- [ ] Run frontend and backend lint/typecheck/unit/integration/build gates.
- [ ] Run migrations from an empty database, schema drift, Docker build/deploy, health/ready, E2E core flow, backup, restore, and post-restart smoke tests.
- [ ] Confirm routes and localStorage keys are unchanged and no test is skipped or removed.
- [ ] Record every pass/failure honestly in the final report; do not claim completion for environment-blocked verification.
- [ ] Commit as `docs: add production implementation report`.
