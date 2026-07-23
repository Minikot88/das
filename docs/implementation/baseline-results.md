# Production Database and Backend Baseline

- Date: 2026-07-21 (Asia/Bangkok)
- Branch: `feat/production-database-backend`
- Starting commit: `e5f0623 refactor: enforce module dependency boundaries`
- Node.js: `v24.18.0`
- npm: `11.16.0`
- Package manager state: `npm install` completed with no dependency changes

## Repository state

- Frontend: Vite 8 + React 19 single-page application.
- Backend: not implemented. There is no server entry point, ORM schema, migration history, database container, server authentication, connector executor, secret store, or durable sharing service.
- Persistence: canonical local workspace stored under `mini-bi-workspace-v1`; connection metadata stored under `mini-bi-db-connections`.
- Deployment: one nginx frontend container. `/api` returns an explicit `503` placeholder.
- Database design sources: repository `data_dictionary.xlsx` contains 104 tables; the attached authoritative draft `database_design.xlsx` contains 152 tables and is preserved as `docs/database/database_design_source.xlsx`.

## Quality gate before implementation

| Gate | Result |
| --- | --- |
| `npm.cmd run lint` | PASS |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd test -- --run` | PASS — 44 files, 251 tests |
| `npm.cmd run build` | PASS |
| `npm.cmd audit --omit=dev` | PASS — 0 production vulnerabilities |
| `npm.cmd audit` | FAIL — 1 high dev/transitive advisory in `brace-expansion <1.1.16` |
| `npm.cmd run check` | FAIL only at the full dependency audit after lint/typecheck/test/build pass |

## Existing warnings

- jsdom reports that `HTMLCanvasElement.getContext()` is not implemented without the optional canvas package.
- Vite warns that `index` (~501.51 kB) and `ChartPreview` (~870.11 kB) exceed the 500 kB chunk threshold.
- The full dependency audit reports `GHSA-3jxr-9vmj-r5cp`; production-only audit is clean.
- The first PowerShell invocation of `npm` was blocked by local execution policy for `npm.ps1`; all recorded results use `npm.cmd`.

These are baseline conditions and are not attributed to the database/backend implementation.
