# Production Readiness Audit

## Scope

This audit reviews DashboardMiniBi as a feature-complete local enterprise analytics platform. It does not recommend adding auth, backend services, or new product features. It focuses on production readiness for the current local-first app model.

Reviewed areas:
- Routes and layout shell: `src/app/AppRoutes.jsx`, `src/components/layout/Layout.jsx`, `src/layout/AppHeader.jsx`, `src/layout/SidebarLeft.jsx`
- Dashboard workspace: `src/pages/DashboardPage.jsx`, `src/components/dashboard/*`
- Builder workspace: `src/features/builder/*`
- Datasets and settings: `src/pages/DatasetsPage.jsx`, `src/pages/SettingsPage.jsx`
- Local persistence and sharing: `src/store/useStore.js`, `src/utils/storage.js`, `src/utils/dashboardShareUtils.js`
- Existing documentation: `README.md`, `TESTING_NOTES.md`, `docs/*`

## Executive Summary

The app is production-like from a user-flow and UI surface perspective, but not production-ready from an operational quality perspective. The biggest readiness gaps are automated test coverage, large-data performance controls, accessibility hardening for dialogs and complex widgets, and visible recovery paths for local storage/API failures.

The app has meaningful foundations already: lazy-loaded routes, chart error boundaries, explicit mock-mode caveats, local persistence normalization, read-only public views, CSV import validation, and manual testing notes. However, the current quality gate is still mostly manual plus `npm run lint` and `npm run build`.

## Critical Issues

### 1. No Automated Test Runner Or CI-Grade Regression Suite
- Location: `package.json`, `TESTING_NOTES.md`
- Evidence: scripts include `dev`, `build`, `lint`, and `preview`; no unit, integration, accessibility, or E2E test command exists.
- Impact: dashboard authoring, saved views, filters, sharing, CSV import, and builder behavior can regress without detection.
- Required work: add a test runner plan and coverage targets before release; prioritize critical flows listed in `docs/TESTING_AUDIT.md`.

### 2. Client-Side Large Dataset Processing Can Freeze The UI
- Location: `src/components/ui/EnterpriseDataTable.jsx`, `src/pages/DatasetsPage.jsx`, `src/utils/csvImport.js`
- Evidence: CSV parsing, type inference, stats, global filtering, sorting, and pagination are all synchronous on the main thread.
- Impact: large CSV files or high-row datasets can block rendering, delay input, and crash lower-memory devices.
- Required work: set explicit row/file limits, add worker-based parsing/aggregation, and virtualize table rows before production-scale usage.

### 3. Dialog Focus Management Is Not Production-Grade
- Location: `src/components/bi/CommandPaletteModal.jsx`, `src/components/bi/DatasetExplorerModal.jsx`, `src/components/dashboard/DashboardShareModal.jsx`, `src/components/ui/CreateProjectModal.jsx`
- Evidence: dialogs use `role="dialog"` in several places, but focus trapping, return focus, consistent Escape handling, and correct overlay semantics are incomplete.
- Impact: keyboard and screen-reader users can lose context or tab behind modals.
- Required work: standardize a modal primitive with focus trap, labelled title, inert background behavior, Escape close, and return focus.

## High Issues

### 1. Local Storage Failures Are Silently Ignored
- Location: `src/utils/storage.js`
- Evidence: `writeJson`, `clearBuilderDraft`, and storage read/repair paths swallow errors without user-visible recovery.
- Impact: quota errors, private browsing restrictions, or corrupted workspace data can cause unexplained data loss or missing saves.
- Required work: expose storage health state, show recovery messaging, and provide export/reset workspace actions in documentation.

### 2. Dashboard And Builder Error Boundaries Are Too Narrow
- Location: `src/components/charts/ChartErrorBoundary.jsx`, dashboard/builder pages
- Evidence: chart rendering has an error boundary, but page-level dashboard/builder/datasets boundaries are not present.
- Impact: a non-chart render exception can blank an entire route.
- Required work: add route-level or workspace-level error boundaries around Dashboard, Builder, Datasets, and Settings.

### 3. Share Links Are Local-Only And Must Be Labelled As Such In-App
- Location: `README.md`, `src/store/useStore.js`, `src/pages/DashboardPublicPage.jsx`
- Evidence: README documents local-only share links; UI can still look like production sharing.
- Impact: users may believe links are secure, durable, or cross-device.
- Required work: keep UI copy explicit: "local read-only preview link" and document limitations in a user guide.

### 4. Global Search And Command Palette Are Partial
- Location: `src/layout/AppHeader.jsx`, `src/components/bi/CommandPaletteModal.jsx`
- Evidence: appbar search opens command palette but does not perform full content search across dashboards/datasets/charts.
- Impact: enterprise users may overestimate search completeness.
- Required work: document current behavior clearly; do not market as global search until implemented.

### 5. Chart Export Pipeline Has Memory Risk
- Location: `src/utils/dashboardShareUtils.js`
- Evidence: export clones DOM, inlines styles, renders SVG foreignObject into canvas, then data URLs/PDF bytes.
- Impact: large dashboards may exceed canvas/browser memory limits.
- Required work: add documented export size limits and failure messaging; consider chunking only if export scale becomes required.

## Medium Issues

### 1. Offline Behavior Exists But Is Not Surfaced
- Location: `src/utils/storage.js`, `README.md`
- Evidence: app runs locally with localStorage, but no visible offline/online state or storage persistence status exists.
- Impact: users cannot tell whether data is safely saved locally.
- Required work: document local persistence model and add operational troubleshooting guidance.

### 2. Missing Dataset And Broken Reference Recovery Is Partial
- Location: `src/store/useStore.js`, `src/features/dashboard/hooks/useDashboard.js`, dashboard widgets
- Evidence: chart deletion cleans references in store, but missing imported datasets, stale saved views, and broken share snapshots need explicit recovery states.
- Impact: imported dataset deletion or storage mutation can produce confusing empty widgets or unavailable public views.
- Required work: document broken-reference states and add tests around cleanup behavior.

### 3. Manual Docs Are Split Across Many Reports
- Location: `docs/*`, `README.md`, `TESTING_NOTES.md`
- Evidence: design, implementation, sprint, and audit docs exist, but no consolidated user/admin guide exists.
- Impact: production handoff will be hard for support/admin users.
- Required work: create user guide, admin guide, dataset guide, and builder guide from existing reports.

### 4. API Failure UX Is Inconsistent
- Location: `src/api/client.js`, pages using store/API wrappers
- Evidence: API client normalizes timeout and HTTP errors, but screens vary in how errors are shown.
- Impact: users may not know whether to retry, reload, or recover locally.
- Required work: standardize route-level failure states and retry language.

## Low Issues

### 1. Placeholder Navigation Still Exists
- Location: `src/layout/SidebarLeft.jsx`
- Evidence: Templates, Favorites, and Recent are disabled placeholders.
- Impact: acceptable for local platform if clearly labelled, but not production-polished.
- Required work: document as intentionally unavailable or remove from production navigation.

### 2. Mixed Language Copy
- Location: auth/public/share flows, `README.md`, UI labels
- Evidence: English and Thai labels coexist in some screens.
- Impact: acceptable for a bilingual demo, but inconsistent for production deployment.
- Required work: define target locale strategy and audit copy.

### 3. Build Artifacts Are Present Locally
- Location: `dist/`
- Evidence: generated build output exists in the workspace.
- Impact: not a runtime risk, but can create review noise if committed unintentionally.
- Required work: keep build output out of source commits unless deployment flow requires it.

## Reliability Readiness

Strengths:
- Chart render failures degrade to a chart status card.
- API client handles timeout and HTTP error messages.
- Local storage read failures do not crash app startup.
- Store normalization repairs some legacy/malformed workspace shape.
- Public dashboard route handles unavailable share records.

Gaps:
- Storage failure is invisible.
- Page-level crash boundaries are absent.
- No automated corrupted-local-storage tests.
- No automated broken-reference tests.
- No visible retry affordance for dashboard load failure in `useDashboard`.

## Documentation Readiness

Existing:
- `README.md` explains mock mode, local share limitations, env vars, and production checklist.
- `TESTING_NOTES.md` provides manual smoke checks.
- Sprint and design reports provide implementation context.

Missing:
- User guide for dashboard creation, filters, saved views, sharing, exports, presentation mode.
- Admin guide for local mode, env vars, deployment, data persistence, and reset/recovery.
- Dataset guide for CSV import limits, validation, inferred types, and local storage behavior.
- Builder guide for chart selection, mapping, formatting, editing, and save behavior.

## Recommended Release Gate

Do not treat the app as production-ready until:
- A minimal automated test suite exists for critical flows.
- Modal focus management is standardized.
- Large dataset limits and worker/virtualization strategy are defined.
- Storage failure and corrupted workspace recovery are visible and documented.
- User/admin/dataset/builder guides are consolidated.
