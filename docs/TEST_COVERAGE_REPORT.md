# Test Coverage Report

## Test Infrastructure

Added:
- Vitest
- React Testing Library
- `@testing-library/jest-dom`
- `@testing-library/user-event`
- jsdom

Commands:
- `npm test` runs `vitest run`.
- `npm run test:watch` runs interactive Vitest watch mode.

## Current Results

Latest run:
- Test files: 7 passed.
- Tests: 9 passed.
- Build: passed.
- Lint: passed.
- Dependency audit: 0 vulnerabilities.

## Covered Areas

### Dashboard Creation / Save / Load
- File: `src/store/useStore.test.js`
- Coverage:
  - Creates a project and dashboard.
  - Saves a chart to the active dashboard context.
  - Creates and loads a saved view.
  - Verifies interaction state is restored.

### Cross Filtering
- File: `src/utils/dashboardFilters.test.js`
- Coverage:
  - Applies global dashboard filters.
  - Applies cross-filter state.
  - Verifies filtered row counts.

### Drilldown
- File: `src/utils/dashboardFilters.test.js`, `src/store/useStore.test.js`
- Coverage:
  - Resolves a chart data point into an interaction field/value.
  - Produces a drilldown step.
  - Persists and reloads drilldown state through saved views.

### CSV Import
- File: `src/utils/csvImport.test.js`
- Coverage:
  - Parses quoted CSV fields.
  - Infers numeric fields.
  - Creates imported dataset records.
  - Exercises async parser API.

### Export / Share
- File: `src/utils/dashboardShareUtils.test.js`
- Coverage:
  - Builds local dashboard share URLs.
  - Builds embed iframe code.
  - Resolves public/embed view options.
  - Sanitizes export filenames.

### Enterprise Data Table
- File: `src/components/ui/EnterpriseDataTable.test.jsx`
- Coverage:
  - Filters rows.
  - Sorts columns.
  - Verifies visible row result.
  - Verifies `aria-sort` state.

### Accessibility
- File: `src/components/bi/CommandPaletteModal.test.jsx`
- Coverage:
  - Command palette focuses search input.
  - Keyboard Enter activates highlighted command.
  - Close callback is called after activation.

### Reliability
- File: `src/utils/storage.test.js`
- Coverage:
  - Storage write failure updates storage health.
  - Storage failure notifies subscribers.

## Remaining Gaps

High priority:
- Full Playwright E2E tests for login, dashboard authoring, builder save, public share, and export flows.
- Browser-level tests for PNG/JPG/PDF downloads.
- Keyboard-only tests for all modal tab loops and builder field mapping.
- Large dataset performance regression tests.
- Route error boundary rendering tests.
- Public dashboard read-only behavior tests.

Medium priority:
- Settings persistence tests.
- Dataset page import workflow component test.
- Dashboard presentation mode keyboard exit test.
- Chart card screen-reader summary test.
- Corrupted localStorage read recovery test.

## Recommended Next Test Expansion

1. Add browser E2E smoke suite.
2. Add accessibility checks with axe for each route.
3. Add large CSV and large dashboard performance fixtures.
4. Add tests for route-level recovery boundaries.
5. Add export download mocks for image/PDF paths.
