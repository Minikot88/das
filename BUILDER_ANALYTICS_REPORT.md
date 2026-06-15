# Builder Analytics Report

## Scope

Completed the Analytics tab for `/builder` while preserving API contracts, dataset execution, dashboard persistence, global filters, cross-filtering, drilldown, and export behavior.

## Files Changed

- `src/features/builder/ChartAnalyticsPanel.jsx`
- `src/features/builder/BuilderPage.jsx`
- `src/features/builder/hooks/useChartBuilder.js`
- `src/components/charts/ChartJsRenderer.jsx`
- `src/utils/chartFactory.js`
- `src/utils/chartTheme.js`
- `src/features/builder/ChartSettingsPanel.jsx`
- `src/features/builder/ChartSavePanel.jsx`
- `src/styles/builder.css`

## Features Completed

| Feature | Status | Notes |
| --- | --- | --- |
| Trend line | WORKING | Adds linear trend overlay datasets for bar, line, area, and scatter charts. |
| Target line | WORKING | Adds numeric target lines with custom label and color through the Chart.js overlay plugin. |
| Threshold bands | WORKING | Adds green/yellow/red value bands with configurable range starts. |
| Reference line | WORKING | Supports static value and dynamic average reference line modes. |
| Forecast | WORKING | Adds simple moving-average projected values for bar, line, and area charts. |
| Unsupported chart handling | WORKING | Analytics options are hidden for unsupported chart families. |
| Live preview | WORKING | Analytics settings flow into the existing preview config path. |
| Save and restore | WORKING | Analytics config is persisted inside existing chart settings without changing API contracts. |
| Tooltip toggle | WORKING | Format panel tooltip setting is honored by Chart.js options. |

## Implementation Notes

- Analytics settings are stored under `settings.analytics`.
- Chart.js overlay rendering uses the `builderAnalytics` plugin in `ChartJsRenderer`.
- Trend and forecast use additional line datasets so they participate in the existing preview/render path.
- Target, threshold, and reference overlays use plugin options at `options.plugins.builderAnalytics`.
- Horizontal bar overlays now use the value axis correctly.

## Screenshots

- `docs/screenshots/builder-finalization/builder-1024.png`
- `docs/screenshots/builder-finalization/builder-1280.png`
- `docs/screenshots/builder-finalization/builder-analytics-enabled-1280.png`

## Known Limitations

- Forecast is intentionally simple moving average, not a statistical forecasting model.
- Threshold color opacity is currently system-defined; the UI exposes custom ranges first.
- Advanced analytics are limited to chart families with compatible cartesian value axes.

## Verification

- `npm run build` passed.
- `npm run lint` passed.
- `npm test` passed.
- Browser smoke test confirmed Analytics tab renders five accordion sections and SQL is collapsed by default.
