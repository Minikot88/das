# DashboardMiniBi Architecture

## Overview

DashboardMiniBi is a frontend-only React 19/Vite 8 SPA. React Router owns routes, `mini-bi-workspace-v1` is the canonical local domain document, Zustand projects compatibility/UI state, and Chart.js/ECharts plus React Grid Layout render analytical views.

## Entry And Routes

- `src/main.jsx` mounts the app.
- `src/app/AppRoutes.jsx` owns lazy routes, public read-only routes, protected routes, and error boundaries.
- `src/components/layout/Layout.jsx` provides the authenticated shell and its single main landmark.
- Current and legacy route parity is documented in `docs/LEGACY_ROUTE_PARITY.md`.

Public routes: `/login`, `/register`, `/share/:sheetId`, `/dashboard/:dashboardId/view`, and `/dashboard/:dashboardId/embed`.

Protected routes: `/`, `/home`, `/dashboard`, `/dashboard-v2`, `/dashboard-legacy`, `/builder`, `/connections`, `/datasets`, and `/settings`.

## Canonical Workspace

`src/domain/workspace/` defines schema validation, pure migration, selectors, compatibility projections, and the local repository.

- Canonical key: `mini-bi-workspace-v1`.
- Completion marker: `mini-bi-workspace-v1-migration-complete`.
- Project-owned entities: datasets, charts, dashboards/widgets, and shares. The schema reserves `connectionProfiles` for a future reviewed cutover, but migration leaves it empty.
- Workspace-owned settings and active project/dashboard context.
- Sheet IDs remain compatibility aliases rather than canonical entities.

Migration leaves all legacy source bytes unchanged. Invalid or unsupported future canonical documents are never overwritten. Writes validate after serialization, increment revision, notify same-tab subscribers, and retain the last valid snapshot on failure.

## Data Workflows

- CSV import is record-aware and bounded to 5 MB, 50,000 rows, and 200 columns.
- Saved charts declare a dataset, SQL-result snapshot, or explicit demo data contract.
- Missing/empty/invalid sources produce explicit states and never unrelated demo substitution.
- Dashboard Canvas uses a tested debounced save scheduler with flush, retry, unload warning, and session-only image metadata.
- Local shares are validated, secret-free `local-readonly` snapshots for the same browser profile.
- Connection profiles persist whitelisted metadata in the feature-owned `mini-bi-db-connections` compatibility key. Secrets remain transient form state; canonical `connectionProfiles` is reserved and currently unpopulated.

## API Boundary

`src/api/` retains mock/local wrappers. A future HTTP adapter must preserve repository ownership and validation semantics; see `docs/FUTURE_HTTP_ADAPTER_CONTRACT.md`. No backend, database, ORM, remote query runner, or real authentication is implemented here.

## Quality And Deployment

`npm run check` runs ESLint, strict TypeScript, tests, build, the full dependency audit, and the production-only audit. `.github/workflows/frontend-checks.yml` repeats this from `npm ci`. The Dockerfile and Compose configuration use digest-pinned Node 22 and nginx images and configure static serving with SPA fallback, cache policy, CSP, and other security headers; runtime behavior must still be smoke-tested on an available Linux container engine.

No Data Dictionary was found; this document does not invent server tables or persistence schemas.
