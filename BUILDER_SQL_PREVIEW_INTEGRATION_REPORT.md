# Builder SQL Preview Integration Report

## Scope

Target screen: `/builder`

Goal: move SQL from a floating/separate placement into the chart preview card so it feels attached to the previewed visualization.

## Files Changed

- `src/features/builder/BuilderPage.jsx`
- `src/features/builder/ChartPreviewPanel.jsx`
- `src/features/builder/QueryModePanel.jsx`
- `src/styles/layoutArchitecturePass.css`

## Before

- SQL opened through a floating drawer-style control.
- SQL placement felt detached from the chart preview.
- Floating CSS remained in the builder cascade and could affect tablet/mobile placement.
- SQL UI could feel like a separate tool instead of supporting the active preview.

## After

- `QueryModePanel` is rendered inside `ChartPreviewPanel`.
- SQL appears directly below the chart preview frame.
- Default state is collapsed and only shows `SQL ขั้นสูง`.
- Expanded state shows the generated/custom SQL editor plus SQL actions.
- Floating SQL drawer/backdrop placement has been removed from the active builder CSS.
- SQL editor uses auto-height behavior:
  - `min-height: 40px`
  - `max-height: 180px`
  - `overflow: auto`
  - `resize: vertical`

## UX Improvements

- SQL now reads as preview metadata for the current chart instead of a separate page-level feature.
- Reduced page chrome by removing floating SQL placement.
- Collapsed SQL no longer inflates page height.
- Expanded SQL stays within the preview card surface with a subtle divider.
- Desktop, tablet, and mobile layouts use normal document flow, reducing overlap risk.

## Behavior Preservation

- Existing SQL values are still sourced from `generatedSql` / `customSql`.
- Existing mode switch behavior is preserved when editing SQL.
- Existing reset behavior remains available.
- Existing copy behavior remains available.
- No API, routing, dataset, chart generation, dashboard persistence, or store logic was changed.

## Validation

- Static selector check: no active `sql-drawer`, `sql-launcher`, fixed SQL placement, or direct page-level SQL placement remains in builder UI files.
- `npm run build`: passed
- `npm run lint`: passed
- `npm test`: passed

## Known Limitations

- Browser visual verification was not run because the declared local Browser skill path was unavailable in this environment.
- The implementation was verified through code inspection and automated build/lint/test.
