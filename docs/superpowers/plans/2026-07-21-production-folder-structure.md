# Production Folder Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize DashboardMiniBi into a production-grade transitional modular frontend without changing any visible behavior, public route, API contract, storage schema, migration, environment name, or deployment contract.

**Architecture:** Keep the existing single Vite application and `src/main.jsx` entry. Establish `app`, `modules`, `domain`, `shared`, and `infrastructure` boundaries inside `src`, retain `@/*` compatibility, and move existing implementation without splitting business logic. Move colocated tests with source and verify every batch before committing.

**Tech Stack:** React 19, React Router 7, Vite 8, Vitest 4, Zustand 5, JavaScript/TypeScript, ESLint 9, Docker/nginx.

## Global Constraints

- Preserve all UI, routes, route protection, workflows, loading/error/empty states, mock mode, HTTP mode, tests, and legacy features.
- Preserve `mini-bi-workspace-v1`, `mini-bi-db-connections`, all legacy migration source keys, entity semantics, workspace revision, and intentional empty data.
- Preserve every `/api/...` endpoint and its request/response/error/auth behavior.
- Preserve Docker ports, environment names, nginx routes, static paths, and root compatibility files.
- Do not add dependencies, rewrite frameworks, redesign UI, change state management, delete code/tests, or fix unrelated issues.
- Baseline `npm run check` fails only at the development dependency audit; compare post-refactor results against `docs/refactor/baseline-results.md`.

---

### Task 1: Establish application and shared boundaries

**Files:**
- Move: `src/App.jsx` → `src/app/App.jsx`
- Move: `src/app/AppRoutes.jsx` → `src/app/router/AppRoutes.jsx`
- Move: `src/components/layout/` → `src/app/layouts/`
- Move: `src/layout/AppHeader.jsx`, `SidebarLeft.jsx`, `SidebarRight.jsx`, and colocated test → `src/app/layouts/`
- Move: `src/components/common/RouteErrorBoundary.jsx` → `src/app/error-boundaries/RouteErrorBoundary.jsx`
- Move: `src/components/ui/` → `src/shared/components/ui/`
- Move: `src/hooks/useFocusTrap.js`, `useNavigationControls.js` → `src/shared/hooks/`
- Move: `src/utils/i18n.js`, `id.js`, `textEncodingRepair.js`, `themeMode.js` → `src/shared/lib/`
- Move: `src/test/setup.js` → `src/shared/test/setup.js`
- Modify: `src/main.jsx`, `tsconfig.json`, `vite.config.js`, `eslint.config.js`

**Interfaces:**
- Consumes: existing `@/*` alias and unchanged exports.
- Produces: aliases `@app/*`, `@modules/*`, `@domain/*`, `@shared/*`, `@infrastructure/*`; all original exported symbols remain unchanged.

- [ ] Move the listed files with `git mv` without editing implementation bodies.
- [ ] Rewrite internal imports mechanically to their new aliased locations; preserve CSS import order and file extensions where present.
- [ ] Add the five aliases to TypeScript and Vite while retaining `@/*`.
- [ ] Point Vitest `setupFiles` to `./src/shared/test/setup.js` and update ESLint override paths only.
- [ ] Run `npm.cmd run lint`, `npm.cmd run typecheck`, related layout/UI tests, full tests, and `npm.cmd run build`.
- [ ] Run the static import analyzer and require zero cycles and zero unresolved application modules.
- [ ] Commit `refactor: establish application and shared boundaries`.

### Task 2: Organize authentication and project modules

**Files:**
- Move: `src/pages/LoginPage.jsx` and test, `RegisterPage.jsx` → `src/modules/auth/pages/`
- Move: `src/api/authApi.js` → `src/modules/auth/api/authApi.js`
- Create: `src/modules/auth/index.js`
- Move: `src/pages/HomePage.jsx` → `src/modules/projects/pages/HomePage.jsx`
- Move: `src/components/ui/CreateProjectModal.jsx`, `ProjectCard.jsx`, and test → `src/modules/projects/components/`
- Move: `src/api/projectApi.js` → `src/modules/projects/api/projectApi.js`
- Create: `src/modules/projects/index.js`
- Modify: `src/app/router/AppRoutes.jsx` and consuming imports

**Interfaces:**
- Produces: module public page exports consumed by the router; component and API export names remain unchanged.

- [ ] Move sources and tests with `git mv`.
- [ ] Create narrow module public APIs exporting only router pages and cross-module project UI.
- [ ] Update router lazy imports without changing paths or guards.
- [ ] Run auth/project/page tests, then lint, typecheck, full tests, and build.
- [ ] Commit together with Task 3 after both module batches pass, using `refactor: organize core frontend modules`.

### Task 3: Organize datasets, connections, sharing, and settings

**Files:**
- Move: `src/pages/DatasetsPage.jsx` and test → `src/modules/datasets/pages/`
- Move: `src/components/bi/DatasetExplorerModal.jsx` → `src/modules/datasets/components/`
- Move: `src/utils/csvImport.js`, worker, and test → `src/modules/datasets/lib/`
- Move: `src/pages/DatabaseConnectionPage.jsx` → `src/modules/connections/pages/`
- Move: `src/data/databaseConnectionDefaults.js` → `src/modules/connections/config/`
- Move: `src/utils/databaseConnectionStorage.js` and test → `src/modules/connections/persistence/`
- Move: `src/pages/SharePage.jsx`, `DashboardPublicPage.jsx`, and tests → `src/modules/sharing/pages/`
- Move: read-only UI files from `src/components/ui/` → `src/modules/sharing/components/`
- Move: `src/utils/dashboardShareUtils.js`, test, and `shareTokens.js` → `src/modules/sharing/lib/`
- Move: `src/pages/SettingsPage.jsx` and test → `src/modules/settings/pages/`
- Create: one `index.js` public API in each module.

**Interfaces:**
- Preserves: CSV limits, worker URL semantics, connection key, share tokens/snapshots, route page defaults, UI labels.

- [ ] Move each source with its tests and preserve relative worker construction.
- [ ] Update imports and router lazy imports through module public APIs.
- [ ] Run dataset, connection, sharing, settings, storage, and read-only tests.
- [ ] Run lint, typecheck, full tests, build, and import graph checks.
- [ ] Commit `refactor: organize core frontend modules`.

### Task 4: Organize chart builder and chart rendering

**Files:**
- Move: `src/features/builder/` → `src/modules/charts/builder/`
- Move: `src/components/charts/` → `src/modules/charts/components/`
- Move: `src/pages/Builder.jsx` → `src/modules/charts/pages/Builder.jsx`
- Move: chart-specific `src/utils/chart*`, `normalizeChartConfig.js`, `mockSqlEngine.js`, `savedChartsStorage.js`, and tests → `src/modules/charts/` subdirectories by current responsibility.
- Move: `src/api/chartApi.js` → `src/modules/charts/api/chartApi.js`
- Move: `src/data/mockSchema.js`, `templateGalleryCatalog.js` → `src/modules/charts/data/`
- Create: `src/modules/charts/index.js`

**Interfaces:**
- Preserves chart types, renderers, templates, SQL mock behavior, empty data semantics, saved-chart schema, and Builder route.

- [ ] Move complete chart families together so internal registry imports remain coherent.
- [ ] Rewrite imports mechanically; do not rename chart symbols or change registry order.
- [ ] Run all chart, builder, saved chart, and accessibility tests.
- [ ] Run lint, typecheck, full tests, build, and graph checks.
- [ ] Commit `refactor: organize chart module`.

### Task 5: Organize current, V2, and legacy dashboard implementations

**Files:**
- Move: `src/pages/DashboardCanvasBuilder.jsx` and CSS → `src/modules/dashboards/current/`
- Move: `src/pages/DashboardPage.jsx` → `src/modules/dashboards/legacy/pages/`
- Move: `src/components/dashboard/` and `src/features/dashboard/` → `src/modules/dashboards/legacy/`
- Move: `src/pages/DashboardDesignerV2/`, `src/components/dashboard-v2/`, `src/contexts/dashboard-v2/`, `src/hooks/dashboard-v2/` → `src/modules/dashboards/designer-v2/`
- Move: dashboard-specific `src/utils/dashboard*` and `layoutUtils.js` → `src/modules/dashboards/lib/`
- Move: `src/api/dashboardApi.js` → `src/modules/dashboards/api/dashboardApi.js`
- Create: `src/modules/dashboards/index.js`

**Interfaces:**
- Preserves `/dashboard`, `/dashboard-v2`, `/dashboard-legacy`, drag/resize, filters, saved views, presentation, export, and chart-widget references.

- [ ] Move current, V2, and legacy subtrees without implementation edits.
- [ ] Keep route page exports explicit and maintain lazy-loading boundaries.
- [ ] Rewrite imports mechanically and verify no domain imports UI or infrastructure.
- [ ] Run all dashboard, designer, renderer, persistence, and accessibility tests.
- [ ] Run lint, typecheck, full tests, production build, and import graph checks.
- [ ] Commit `refactor: organize dashboard implementations`.

### Task 6: Centralize infrastructure and residual shared utilities

**Files:**
- Move: `src/api/client.js` → `src/infrastructure/http/client.js`
- Move: `src/services/projectStorage.js` and test → `src/infrastructure/persistence/project-storage/`
- Move: `src/utils/storage.js` and storage bridge tests → `src/infrastructure/persistence/workspace-ui/`
- Move: `src/deployment/` → `src/infrastructure/deployment/tests/`
- Move: generic residual `src/utils/` files to `src/shared/lib/` only when used by at least two modules.
- Move: runtime mock data to `src/infrastructure/mock/` while preserving named exports.

**Interfaces:**
- Preserves localStorage values, migrations, HTTP error mapping, timeout, credentials, mock selection, and root deployment files.

- [ ] Move adapters and tests without changing implementation.
- [ ] Keep domain independent of `src/infrastructure` and browser APIs.
- [ ] Run persistence, migration, HTTP consumer, deployment contract, and full test suites.
- [ ] Run lint, typecheck, build, and import graph checks.
- [ ] Commit `refactor: centralize infrastructure adapters`.

### Task 7: Document final architecture and migration map

**Files:**
- Modify: `README.md`
- Create: `docs/architecture/overview.md`, `folder-structure.md`, `dependency-rules.md`
- Create: `docs/development/getting-started.md`, `testing.md`, `environment.md`
- Create: `docs/deployment/test-server.md`
- Create: `docs/refactor/migration-map.md`
- Update: `docs/refactor/dependency-map.md`, `discovered-issues.md`

**Interfaces:**
- Produces exact old-to-new paths and commands matching the final repository.

- [ ] Generate the migration map from `git diff --name-status --find-renames` and verify every moved tracked source appears.
- [ ] Document module ownership, allowed dependency direction, legacy locations, and root deployment compatibility.
- [ ] Document actual npm commands and the existing full-check audit failure separately from code gates.
- [ ] Commit `docs: document modular frontend architecture` after `git diff --check`.

### Task 8: Final regression and deployment verification

**Files:**
- Update: `docs/refactor/baseline-results.md` with post-refactor results without overwriting baseline evidence.

**Interfaces:**
- Produces final evidence for behavior-preserving completion.

- [ ] Run `npm.cmd run lint` and require exit 0.
- [ ] Run `npm.cmd run typecheck` and require exit 0.
- [ ] Run `npm.cmd run test -- --run` and require at least the baseline 44 files and 247 tests with no deleted tests.
- [ ] Run `npm.cmd run build` and compare route/worker chunks and warnings with baseline.
- [ ] Run `npm.cmd run check`; classify only the pre-existing audit issue as baseline if unchanged.
- [ ] Run `npm.cmd run audit:prod` and require 0 production vulnerabilities.
- [ ] Run the import analyzer and require zero cycles, zero unresolved application imports, and fewer than 42 deep relative imports.
- [ ] Verify exact route strings, storage keys, environment names, API paths, and migration file hashes against baseline Git content.
- [ ] Run `docker build` and Compose/health smoke tests if the Docker daemon is available; otherwise record the unchanged environment blocker without claiming deployment passed.
- [ ] Confirm `git status`, commit history, moved-file map, unremoved dead-code candidates, and unresolved risks for the final report.
