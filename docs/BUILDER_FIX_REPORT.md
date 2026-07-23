# Builder Fix Report

## Files Changed

- `src/utils/chartTemplates.js`
- `src/utils/chartCompatibility.js`
- `src/utils/chartFactory.js`
- `src/utils/mockSqlEngine.js`
- `src/features/builder/hooks/useChartBuilder.js`
- `src/features/builder/ChartTypePicker.jsx`
- `src/components/charts/ChartRenderer.jsx`
- `src/components/charts/KPIWidget.jsx`
- `src/styles/charts.css`
- `src/styles/builder.css`
- `BUILDER_AUDIT.md`
- `BUILDER_FIX_REPORT.md`

## Fixes Completed

### 1. Added missing Builder chart families

Added working Builder templates for:

- Table
- KPI
- Heatmap

Each template now has:

- Template metadata
- Role requirements
- Default mappings
- Validation support
- SQL generation support
- Preview/render support
- Save/update support through the existing chart payload flow

### 2. Fixed incompatible mappings after chart type switching

Before:

- Switching between chart families could preserve a field from a previous template when the role key matched.
- Example: Bubble `x = sales` could carry into Mixed `x`, where `x` requires a category/date.
- This broke preview, SQL mode, and save readiness.

After:

- Template switching now checks each carried field against the target role's accepted field types.
- Compatible fields are preserved.
- Incompatible fields fall back to the target template defaults.

### 3. Fixed stale SQL after chart type switching

Before:

- `customSql` could remain from the previous template after switching chart types.
- SQL mode could execute stale SQL against the new mapping.

After:

- Template changes reset custom SQL execution state.
- Generated SQL is rebuilt for the selected template and mapping.
- Table, KPI, and Heatmap now generate valid SQL.

### 4. Added Table and Heatmap renderers

Added lightweight renderers in the chart rendering path:

- Table renderer with sticky header styling.
- Heatmap renderer with row/column grid and intensity-based coloring.

KPI rendering now reads generated `current`/`previous` comparison fields when available.

### 5. Builder UX polish

Improved Builder visual hierarchy:

- Stronger active states for Builder tabs and SQL mode switch.
- Cleaner chart type cards.
- Reduced border noise across panels.
- More readable mapping drop zones.
- Improved SQL editor and preview styling.
- Calmer recommendation cards.

## Verification

Automated checks passed:

- All 31 Builder templates validate and generate configs.
- Generated SQL executes for all Builder templates.
- Browser audit passed for desktop, tablet, and mobile.
- Browser audit confirmed all requested families are present:
  - Bar
  - Line
  - Area
  - Pie
  - Donut
  - Scatter
  - Bubble
  - Table
  - KPI
  - Heatmap

Required commands passed:

- `npm run build`
- `npm run lint`
- `npm test`

## Known Limitation

The Analytics tab remains partial. It presents analytics options but does not yet apply real trend, target, threshold, forecast, or reference-line overlays to rendered charts. This should be handled as a dedicated analytics implementation because it touches chart configuration semantics and renderer behavior.
