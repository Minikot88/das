# Performance Audit

## Scope

This audit reviews rendering cost, large dataset behavior, large dashboards, memory usage, and re-render risk. No application code was modified.

Key files reviewed:
- `src/components/ui/EnterpriseDataTable.jsx`
- `src/pages/DatasetsPage.jsx`
- `src/utils/csvImport.js`
- `src/pages/DashboardPage.jsx`
- `src/components/dashboard/DashboardGrid.jsx`
- `src/components/charts/ChartJsRenderer.jsx`
- `src/utils/dashboardShareUtils.js`
- `src/store/useStore.js`

## Critical Issues

### 1. Enterprise Data Table Is Not Virtualized
- Location: `src/components/ui/EnterpriseDataTable.jsx`
- Current behavior: filters every row, sorts all filtered rows, slices the current page, and renders normal table markup.
- Risk: 50k+ rows can cause slow filtering/sorting and high memory churn; 100k+ rows can freeze the UI depending on device.
- Impact: large datasets, imported CSV preview, and data catalog pages.
- Required work:
  - Add row virtualization or explicit row caps.
  - Debounce search input.
  - Move expensive sort/filter operations to a worker or indexed data model.
  - Add performance tests with 10k, 50k, and 100k row fixtures.

### 2. CSV Import Is Fully Synchronous
- Location: `src/utils/csvImport.js`, `src/pages/DatasetsPage.jsx`
- Current behavior: file text is read, parsed, typed, validated, and stored in one main-thread path.
- Risk: large CSV files block the main thread and can exceed localStorage quota once persisted.
- Impact: upload, preview, validate, map columns, and import workflow.
- Required work:
  - Define max file size and max row count.
  - Stream or workerize parsing.
  - Warn before importing large files.
  - Avoid storing huge datasets directly in localStorage.

## High Issues

### 1. Chart.js Instances Recreate Frequently
- Location: `src/components/charts/ChartJsRenderer.jsx`
- Current behavior: `useLayoutEffect` destroys and recreates Chart.js whenever dependencies such as `chart`, `resolvedConfig`, or callback props change.
- Risk: dashboards with many widgets can pay repeated canvas teardown/rebuild cost on filter, interaction, layout, or state changes.
- Impact: large dashboards, cross-filtering, saved view load, presentation mode.
- Required work:
  - Stabilize callback props and chart/config identities where possible.
  - Prefer Chart.js data/options update paths for same chart type.
  - Profile with 20, 50, and 100 widgets.

### 2. Dashboard Filtering Maps Every Widget On Each Filter Change
- Location: `src/pages/DashboardPage.jsx`, `src/utils/dashboardFilters.js`
- Current behavior: dashboard widgets are mapped into filtered widget models via `useMemo`.
- Risk: okay for small dashboards, but large widget lists with large row arrays can duplicate work and memory.
- Impact: global filters, cross-filtering, drilldown, saved views, share snapshots.
- Required work:
  - Add dataset-level indexes for common dimensions.
  - Cache filtered results by widget id and filter signature.
  - Cap row payloads passed into chart widgets.

### 3. Export Pipeline Can Allocate Large Canvases And Data URLs
- Location: `src/utils/dashboardShareUtils.js`
- Current behavior: DOM is cloned, CSS is inlined, canvas states are copied, then rendered through SVG foreignObject to canvas and data URL/PDF bytes.
- Risk: memory spikes on large dashboards, high device pixel ratios, or many charts.
- Impact: PNG, JPG, PDF snapshot export.
- Required work:
  - Set export pixel limits.
  - Show graceful "dashboard too large to export" errors.
  - Use lower pixel ratio for large dashboards.
  - Document browser-specific limitations.

### 4. Zustand Selectors Are Numerous And Can Trigger Broad Re-Renders
- Location: `src/pages/DashboardPage.jsx`, `src/layout/AppHeader.jsx`, `src/layout/SidebarLeft.jsx`
- Current behavior: components select many store slices separately and derive rich arrays in render scope.
- Risk: unrelated store changes can cause expensive route-level recalculations.
- Impact: dashboard editing, app header, workspace sidebars.
- Required work:
  - Profile store updates during dashboard drag/drop, filter change, and save.
  - Memoize derived selectors outside large components when needed.
  - Consider shallow selectors for grouped state.

## Medium Issues

### 1. React Grid Layout Rendering Cost Grows With Widget Count
- Location: `src/components/dashboard/DashboardGrid.jsx`
- Current behavior: every widget is rendered inside `ResponsiveGridLayout`; no viewport culling.
- Risk: large dashboards pay cost for offscreen widgets.
- Required work:
  - Establish supported widget count.
  - Profile drag/resize with 25, 50, and 100 widgets.
  - Consider dashboard sections/pages before virtualizing canvas widgets.

### 2. Dataset Statistics Recompute On Full Preview Rows
- Location: `src/pages/DatasetsPage.jsx`
- Current behavior: `createColumnStats` scans all preview rows and all active fields.
- Risk: expensive for wide/high-row datasets.
- Required work:
  - Compute stats on a sample for preview.
  - Cache stats at import time for local datasets.
  - Defer full profiling to a background step.

### 3. Command Palette Filters All Actions On Each Keystroke
- Location: `src/components/bi/CommandPaletteModal.jsx`
- Current behavior: simple in-memory action filtering.
- Risk: low today, but grows if every chart/dashboard/dataset becomes searchable.
- Required work:
  - Debounce or index actions if the action list grows beyond a few hundred.

### 4. CSS Payload Is Large
- Location: `src/styles/*.css`
- Current behavior: many global styles and legacy pass styles are loaded.
- Risk: initial CSS parse cost and cascade complexity.
- Required work:
  - Audit duplicate legacy CSS after product stabilization.
  - Keep this as cleanup only, not a feature sprint.

## Low Issues

### 1. Lazy Route Loading Is Good But Fallback Is Generic
- Location: `src/app/AppRoutes.jsx`
- Current behavior: route components are lazy-loaded with a single "Loading workspace..." fallback.
- Risk: low; user experience only.
- Required work: keep fallback accessible and maybe route-specific later.

### 2. Chart Resize Handling Has Defensive Guards
- Location: `src/components/charts/ChartJsRenderer.jsx`
- Current behavior: ResizeObserver and requestAnimationFrame resize with ownerDocument guard.
- Risk: low; currently positive, but should be covered by tests.

## Performance Test Matrix

Required before production-scale claims:
- 10k, 50k, 100k row CSV import.
- 25, 50, 100 widget dashboard render.
- 20 chart dashboard cross-filter interaction.
- Dashboard export at desktop, tablet, and high-DPI sizes.
- Saved view load with large dashboard layout.
- Public view load from large share snapshot.

## Recommended Priority

1. Critical: row/file limits and automated performance fixtures.
2. Critical: virtualized/worker path for large data.
3. High: chart render profiling and update optimization.
4. High: export memory guardrails.
5. Medium: CSS cleanup and derived selector profiling.
