# Repository Inventory

Date: 2026-07-21
Branch: `refactor/production-folder-structure`
Baseline commit: `e6f6be1`

## Repository profile

- Package: `dashboard-mini-bi@0.0.0`
- Runtime: frontend-only React 19 SPA built with Vite 8
- Languages: JavaScript/JSX plus TypeScript/TSX in Dashboard Designer V2
- State: Zustand with a canonical local workspace repository and compatibility projections
- Persistence: browser localStorage; no server database, ORM, backend source tree, or database migrations exist
- Rendering: Chart.js, ECharts, Recharts, React Grid Layout
- Tests: Vitest/jsdom, colocated with source; 44 files and 247 tests at baseline
- Deployment: root `Dockerfile`, `docker-compose.yml`, and `nginx.conf`

## Baseline top-level structure

```text
DashboardBi/
├── .github/
├── docs/
├── public/
├── src/
│   ├── api/
│   ├── app/
│   ├── components/
│   ├── contexts/
│   ├── data/
│   ├── deployment/
│   ├── domain/
│   ├── features/
│   ├── hooks/
│   ├── layout/
│   ├── pages/
│   ├── services/
│   ├── store/
│   ├── styles/
│   ├── test/
│   └── utils/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── package.json
├── tsconfig.json
└── vite.config.js
```

Generated or dependency directories `node_modules/`, `dist/`, and `outputs/` are not architecture inputs.

## Entry points and application shell

| Responsibility | Current source |
| --- | --- |
| Browser entry | `src/main.jsx` |
| Root component | `src/App.jsx` |
| Router, route guards, lazy loading | `src/app/AppRoutes.jsx` |
| Authenticated layout | `src/components/layout/Layout.jsx` |
| Header and side layout | `src/layout/AppHeader.jsx`, `src/layout/SidebarRight.jsx` |
| Test bootstrap | `src/test/setup.js` |

## Frontend modules discovered

| Module | Current locations |
| --- | --- |
| Authentication | `src/pages/LoginPage.jsx`, `src/pages/RegisterPage.jsx`, `src/api/authApi.js` |
| Projects/home | `src/pages/HomePage.jsx`, project UI in `src/components/ui/`, `src/api/projectApi.js`, `src/services/projectStorage.js` |
| Datasets | `src/pages/DatasetsPage.jsx`, `src/components/bi/DatasetExplorerModal.jsx`, `src/utils/csvImport.js`, `src/utils/csvImport.worker.js` |
| Charts/builder | `src/features/builder/`, `src/components/charts/`, chart files under `src/utils/`, `src/api/chartApi.js` |
| Dashboards | `src/pages/DashboardCanvasBuilder.jsx`, `src/pages/DashboardPage.jsx`, `src/pages/DashboardDesignerV2/`, `src/components/dashboard/`, `src/components/dashboard-v2/`, `src/hooks/dashboard-v2/` |
| Connections | `src/pages/DatabaseConnectionPage.jsx`, `src/utils/databaseConnectionStorage.js`, `src/data/databaseConnectionDefaults.js` |
| Sharing/read-only | `src/pages/SharePage.jsx`, `src/pages/DashboardPublicPage.jsx`, read-only UI components, `src/utils/dashboardShareUtils.js` |
| Settings | `src/pages/SettingsPage.jsx` |

## Domain and persistence

- `src/domain/workspace/`: canonical schema, selectors, migrations, repository, compatibility projection, fixtures, and tests.
- `src/domain/charts/chartDataContract.js`: chart data-source semantics.
- `src/domain/dashboard/dashboardPersistence.js`: dashboard persistence scheduler semantics.
- `src/domain/shares/localShareContract.js`: local read-only snapshot contract.
- `src/store/useStore.js`: 83.3 KB compatibility/UI store and orchestration hotspot.
- `src/services/projectStorage.js`: 50 KB legacy/canonical persistence bridge.
- `src/utils/storage.js`: local UI/draft storage bridge.

Most domain code was pure, but `workspaceSelectors.js` also contained a React subscription hook and `workspaceRepository.js` contained browser persistence. The refactor separated those adapters into `app/store` and `infrastructure/persistence` without changing their contracts.

## API boundary

`src/api/` contains `client.js`, `authApi.js`, `chartApi.js`, `dashboardApi.js`, and `projectApi.js`. Both mock mode and HTTP mode are intentional. Existing `/api/...` paths are compatibility contracts and will not be merged, versioned, removed, or renamed in this refactor.

## Chart renderers and dataset import

- Chart.js: `src/components/charts/ChartJsRenderer.jsx`
- Legacy renderer facade: `src/components/charts/ChartRenderer.jsx`
- Dashboard Designer V2 ECharts: `src/components/dashboard-v2/components/charts/EChartsRenderer.tsx`
- V2 option/data engine: `src/components/dashboard-v2/utils/`
- CSV parser: `src/utils/csvImport.js`
- CSV worker entry: `src/utils/csvImport.worker.js` (build output proves this is an entry, not dead code)

## Tests

- 44 colocated test files.
- 247 passing tests at baseline.
- Unit, accessibility, persistence, migration, route/read-only, deployment-import, and nginx contract tests are present.
- No E2E browser test runner is configured in `package.json`.

## Infrastructure and configuration

- CI: `.github/workflows/frontend-checks.yml`
- Docker: `Dockerfile`, `docker-compose.yml`
- Static/proxy behavior: `nginx.conf`
- Environment contract: `.env.example`
- Tooling: `vite.config.js`, `tsconfig.json`, `eslint.config.js`
- No backend, database migrations, seeds, backup, or restore scripts exist in this repository.

## Static findings

- 226 JavaScript/TypeScript source files.
- 476 resolved internal imports.
- 0 circular dependency cycles found by static import graph.
- 42 deep relative imports using two or more parent traversals.
- No duplicate file content was found under `src/` by SHA-256.
- Large mixed-responsibility hotspots include `DashboardCanvasBuilder.jsx` (180.5 KB), `useStore.js` (83.3 KB), `DashboardPage.jsx` (72.9 KB), `useDashboardDesignerState.ts` (66.2 KB), and `projectStorage.js` (50 KB).
- CSS is distributed across `src/styles.css`, 23 files in `src/styles/`, and page-specific CSS. It is behavior-sensitive because cascade order is established in `src/main.jsx`.

## Unused candidates, not deletion approvals

Static incoming-import analysis reported these candidates: `src/api/projectApi.js`, `src/components/dashboard-v2/Header.tsx`, `Toolbar.tsx`, `types.ts`, `src/components/ui/Badge.jsx`, `src/hooks/dashboard-v2/useResizablePanel.ts`, `src/layout/SidebarLeft.jsx`, `src/pages/DashboardDesignerV2/index.tsx`, `src/test/setup.js`, `src/utils/chartFamilies/index.js`, and `src/utils/csvImport.worker.js`.

Several are known entry/config/dynamic cases (`setup.js`, worker, lazy directory index). None may be deleted in this refactor. Each requires static search plus build/test/runtime proof in a separate cleanup task.

## Legacy code that remains supported

- `/dashboard-legacy`
- `/dashboard-v2`
- `/builder`
- `/share/:sheetId`
- mock API/data paths
- canonical workspace migration and all legacy localStorage source keys
- connection metadata compatibility key
