# Builder Deep Audit

Target route: `/builder`

## Summary

The Builder is now functionally stable across the core authoring flow. The audit found and fixed three high-impact gaps:

- Table, KPI, and Heatmap were prepared in UI/catalog concepts but were not available as working Builder templates.
- Chart type switching could preserve incompatible fields when templates reused role keys like `x`.
- SQL mode could execute stale generated SQL after switching chart types.

Browser validation passed after fixes across desktop, tablet, and mobile Builder layouts.

## UX Review

| Area | Status | Issue | Severity | Fix Recommendation |
| --- | --- | --- | --- | --- |
| Chart Type Selector | WORKING | Selector supports all requested families after adding Table, KPI, and Heatmap. Visual density was reduced with clearer cards and active states. | Low | Continue grouping advanced families if the template list grows beyond current size. |
| Field Mapping | WORKING | Drag/drop mapping is supported; incompatible carried mappings are now replaced by template defaults on chart switch. | Fixed High | Add click-to-map as a future accessibility improvement. |
| Preview Area | WORKING | Canvas, KPI, Table, and Heatmap previews render. Empty/invalid states are visible. | Fixed High | Add per-chart preview summaries for screen readers in a future accessibility pass. |
| Visual Tab | WORKING | Chart gallery works and has improved hierarchy. | Low | Add favorite/recent chart types later if template count increases. |
| Fields Tab | WORKING | Role drop zones update preview and validation. | Low | Add compatible-field hints inside each drop zone. |
| Format Tab | WORKING | Title, subtitle, legend, palette, axis, grid, line, and bar styling controls apply to preview and saved charts. | Low | Split advanced styling into collapsed groups if the panel grows. |
| Analytics Tab | PARTIAL | Current analytics tab is an informational/preset surface; trend, target, threshold, forecast, and reference-line controls are not yet executable chart settings. | Medium | Implement analytics overlay settings and renderer support in a dedicated analytics sprint. |
| Save Panel | WORKING | Save creates a chart, attaches it to the dashboard, and update mode restores saved charts by `chartId`. | Fixed High | Replace read-only metadata preview with editable name/description when product scope allows. |
| SQL Panel | WORKING | Generated SQL, custom SQL execution, result schema, and SQL preview state work after template switching fixes. | Fixed High | Add SQL result sample preview below the run result. |

## Functional Audit

| Feature | Status | Issue | Severity | Fix Recommendation |
| --- | --- | --- | --- | --- |
| Dataset selection | WORKING | Builder loads the active mock/default dataset and schema into the explorer. | Low | Add multi-dataset switching when dataset routing exists. |
| Field search | WORKING | Search filters schemas, tables, and fields and auto-expands matching nodes. | Low | None. |
| Field mapping | WORKING | Drag/drop field mapping validates field type compatibility and updates preview. | Fixed High | Fixed incompatible mapping preservation during template switch. |
| Chart type switching | WORKING | All chart families switch without stale invalid mappings. | Fixed High | None. |
| Bar | WORKING | Bar templates validate, preview, SQL-generate, save, and restore. | Low | None. |
| Line | WORKING | Line templates validate, preview, SQL-generate, save, and restore. | Low | None. |
| Area | WORKING | Area templates validate, preview, SQL-generate, save, and restore. | Low | None. |
| Pie | WORKING | Pie template validates, previews, SQL-generates, saves, and restores. | Low | None. |
| Donut | WORKING | Doughnut templates validate, preview, SQL-generate, save, and restore. | Low | None. |
| Scatter | WORKING | Scatter templates validate, preview, SQL-generate, save, and restore. | Low | None. |
| Bubble | WORKING | Bubble templates validate, preview, SQL-generate, save, and restore. | Low | None. |
| Table | WORKING | Added saveable Table template and renderer. | Fixed High | Expand table formatting controls later. |
| KPI | WORKING | Added saveable KPI template, aggregate config, and comparison-aware KPI rendering. | Fixed High | Add target/threshold formatting later. |
| Heatmap | WORKING | Added saveable Heatmap template, SQL generation, config, and renderer. | Fixed High | Add color scale controls later. |
| Preview rendering | WORKING | Browser audit confirmed preview output for every family. | Fixed High | None. |
| Chart settings | WORKING | Settings are persisted in saved chart payloads and reflected in preview. | Low | None. |
| Visual settings | WORKING | Chart type cards update selected template and preview. | Low | None. |
| Field settings | WORKING | Mapping roles and validation update with the selected template. | Low | None. |
| Format settings | WORKING | Display and style controls update config generation. | Low | None. |
| Analytics settings | PARTIAL | Analytics tab is present but not executable. | Medium | Build actual overlay controls and renderer integration later. |
| SQL generation | WORKING | SQL generation now supports Table, KPI, Heatmap, and resets correctly on chart switch. | Fixed High | None. |
| Save chart | WORKING | Browser audit saved a chart and confirmed persisted chart count. | Fixed High | None. |
| Update chart | WORKING | Browser audit restored a saved chart by `chartId` and submitted update. | Low | None. |
| Duplicate chart | WORKING | Supported from dashboard/widget actions, not as a Builder-local command. | Low | Add Builder-local duplicate action only if product wants editing workflow shortcuts. |
| Delete chart | WORKING | Supported from dashboard/widget actions and store API, not as a Builder-local command. | Low | Add Builder-local delete action only if product wants chart management inside Builder. |
| Add to dashboard | WORKING | New Builder save calls `addSavedChartToDashboard`. | Low | None. |
| Restore saved chart | WORKING | `?chartId=` edit route restores saved chart state. | Low | None. |
| Builder responsiveness | WORKING | Browser audit passed desktop, tablet, and mobile layouts with no horizontal overflow or panel overlap. | Low | None. |

## Validation Evidence

Generated screenshots:

- `docs/builder-audit-screenshots/desktop-initial.png`
- `docs/builder-audit-screenshots/tablet-initial.png`
- `docs/builder-audit-screenshots/mobile-initial.png`
- `docs/builder-audit-screenshots/desktop-final.png`

Generated browser results:

- `docs/builder-audit-results.json`

Commands:

- `npm run build` - passed
- `npm run lint` - passed
- `npm test` - passed
