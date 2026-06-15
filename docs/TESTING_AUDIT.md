# Testing Audit

## Scope

This audit reviews automated and manual test readiness for the local enterprise analytics platform. No application code was modified.

Reviewed:
- `package.json`
- `eslint.config.js`
- `TESTING_NOTES.md`
- `README.md`
- Critical app routes and components under `src/`

## Current Test Posture

Automated:
- `npm run lint`
- `npm run build`

Manual:
- `TESTING_NOTES.md` covers auth guard, mock login, failed login/register, project creation failure, dashboard loading, chart delete cleanup, public share token, embed route, Thai text, build/security checks.

Missing:
- Unit test runner.
- React component/integration test runner.
- E2E/browser test runner.
- Accessibility test automation.
- Performance regression tests.
- Storage corruption/recovery tests.
- Export/share snapshot tests.

## Critical Issues

### 1. No Automated Unit Or Integration Test Framework
- Location: `package.json`
- Evidence: no `test`, `test:unit`, `test:e2e`, or coverage scripts.
- Impact: core business flows can regress silently.
- Required work:
  - Add unit tests for utilities and store actions.
  - Add integration tests for dashboard/builder/dataset flows.
  - Add coverage thresholds for critical utilities.

### 2. No E2E Coverage For Critical User Journeys
- Location: app-wide
- Impact: end-to-end flows such as CSV import to chart creation to dashboard export are not protected.
- Required work: add browser tests for the critical flow matrix below.

### 3. No Accessibility Regression Testing
- Location: app-wide
- Impact: modal, keyboard, contrast, and screen-reader regressions are likely as UI evolves.
- Required work:
  - Add automated axe checks for each route.
  - Add keyboard-only tests for modals, navigation, builder mapping, and table controls.

## High Issues

### 1. Store Persistence Has No Corruption/Quota Tests
- Location: `src/store/useStore.js`, `src/utils/storage.js`
- Risk: localStorage corruption, schema drift, and quota failures are production-critical for a local-first app.
- Required tests:
  - Invalid JSON returns safe initial state.
  - Legacy workspace shape normalizes.
  - Missing active project/sheet/dashboard falls back safely.
  - Quota write failure surfaces expected behavior.

### 2. Dashboard Interactions Need Regression Tests
- Location: `src/pages/DashboardPage.jsx`, `src/utils/dashboardFilters.js`
- Required tests:
  - Global filters update all widgets.
  - Clear all resets filters/interactions.
  - Cross-filtering propagates to other widgets.
  - Drilldown breadcrumb trims correctly.
  - Saved view saves, renames, deletes, and loads filter/layout state.

### 3. Export And Share Need Browser Tests
- Location: `src/utils/dashboardShareUtils.js`, `src/components/dashboard/DashboardShareModal.jsx`, `src/pages/DashboardPublicPage.jsx`
- Required tests:
  - PNG/JPG/PDF buttons are disabled for empty dashboard.
  - Export failure shows warning.
  - Share link includes token.
  - Shared view opens read-only snapshot.
  - Invalid/missing share token shows unavailable state.

### 4. Builder Flow Needs Integration Tests
- Location: `src/features/builder/*`, `src/features/builder/hooks/useChartBuilder.js`
- Required tests:
  - Select chart type.
  - Map required fields.
  - Validation errors block save.
  - Save creates dashboard widget.
  - Edit existing chart updates existing widget.
  - Cancel returns to dashboard without mutation.

## Medium Issues

### 1. CSV Import Tests Are Missing
- Location: `src/utils/csvImport.js`, `src/pages/DatasetsPage.jsx`
- Required tests:
  - Empty CSV validation.
  - Quoted delimiters.
  - Duplicate headers warning.
  - Numeric/date/category inference.
  - Imported dataset persistence.
  - Delete imported dataset fallback.

### 2. Enterprise Table Tests Are Missing
- Location: `src/components/ui/EnterpriseDataTable.jsx`
- Required tests:
  - Search filters rows.
  - Sort toggles ascending/descending.
  - Pagination boundaries.
  - Column visibility.
  - Empty state.
  - `aria-sort` once added.

### 3. Theme/Density Settings Tests Are Missing
- Location: `src/pages/SettingsPage.jsx`, `src/components/layout/Layout.jsx`
- Required tests:
  - Theme persists and applies `body.dark`.
  - Density persists and applies density body class.
  - Dashboard preferences persist.

### 4. Public/Embed View Tests Are Missing
- Location: `src/pages/DashboardPublicPage.jsx`, `src/pages/SharePage.jsx`
- Required tests:
  - Public view header behavior.
  - Embed header query option.
  - Read-only grid disables drag/resize/actions.

## Low Issues

### 1. Manual Testing Notes Are Useful But Not Versioned To Features
- Location: `TESTING_NOTES.md`
- Risk: manual test checklist may lag behind feature growth.
- Required work: keep manual checks as exploratory supplement, not the main release gate.

### 2. No Documented Browser Matrix
- Location: docs
- Required work: define supported browsers and viewport matrix.

## Critical User Flow Test Matrix

P0 automated flows:
- Mock login -> dashboard redirect -> dashboard renders.
- Create project -> create dashboard -> add chart -> refresh -> widget persists.
- Builder create chart -> save to dashboard -> edit chart -> update persists.
- Global filter -> widget data changes -> clear filters.
- Cross-filter -> drilldown breadcrumb -> clear interactions.
- Saved view create -> load -> rename -> delete.
- CSV upload -> preview -> import -> dataset appears -> table filters/sorts.
- Share link create -> public view opens read-only.
- Export PNG/JPG/PDF action does not crash and handles empty dashboard.
- Corrupted localStorage -> app recovers to safe state.

P1 automated flows:
- Settings theme/density/date/number preferences persist.
- Presentation mode opens, hides navigation, exits with Escape.
- Dashboard layout drag/resize persists.
- Chart delete cleans dashboard references.
- Public embed route respects header/theme/size query options.

P2 automated flows:
- Command palette search and keyboard activation.
- Dataset explorer search.
- Mobile navigation open/close.
- Keyboard-only modal traversal.

## Recommended Tooling Plan

Suggested categories:
- Unit: utility and store tests.
- Component: React Testing Library style tests for table, modals, settings, builder panels.
- E2E: Playwright or equivalent browser tests for critical flows.
- Accessibility: axe checks plus manual keyboard screen-reader pass.
- Performance: scripted data fixtures and browser timing assertions for large datasets/dashboards.

## Release Gate Recommendation

Minimum before production readiness:
- `npm run lint`
- `npm run build`
- Unit tests for storage, CSV import, dashboard filters, share token utilities.
- E2E smoke tests for login, dashboard, builder save, CSV import, share view.
- Accessibility smoke tests for all routes and modal focus behavior.
