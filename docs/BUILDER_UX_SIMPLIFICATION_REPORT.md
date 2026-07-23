# Builder UX Simplification Report

## Scope

Simplified `/builder` for business users by reducing hero/marketing content, improving guided workflow visibility, making chart selection more visual, widening the data panel, collapsing SQL by default, and moving save metadata into a persistent footer-style workflow.

## Files Changed

- `src/features/builder/BuilderPage.jsx`
- `src/features/builder/ChartTypePicker.jsx`
- `src/features/builder/ChartSettingsPanel.jsx`
- `src/features/builder/ChartSavePanel.jsx`
- `src/features/builder/QueryModePanel.jsx`
- `src/features/builder/hooks/useChartBuilder.js`
- `src/styles/builder.css`

## Before vs After

| Area | Before | After |
| --- | --- | --- |
| Header | Large hero/marketing copy consumed vertical space. | Compact toolbar with current chart context and workflow progress. |
| Workflow | Users had to infer the build sequence from panels. | Progress steps: เลือกรูปแบบกราฟ, เลือกข้อมูล, ปรับแต่ง, วิเคราะห์, บันทึก. |
| Chart selector | Text-heavy cards with small tokens. | Visual thumbnail cards with title and description. |
| Data panel | Narrow at desktop, long fields were harder to scan. | Wider desktop panel and safer long-name wrapping. |
| Format panel | Mixed settings in broad groups. | Accordion sections: สี, ตัวอักษร, แกน X, แกน Y, Legend, Tooltip, Grid. |
| SQL panel | Always visible and visually competed with preview. | Collapsed by default under `SQL ขั้นสูง`. |
| Save panel | Read-only metadata preview. | Editable chart name, description, folder, and tags with sticky save actions. |
| Responsive | Tablet was crowded in prior versions. | Desktop 3-column, tablet Data + Preview with Builder below, mobile single-column flow. |

## UX Improvements

- Reduced first-screen complexity by removing the marketing-style Builder hero.
- Made the next action clearer with a guided progress model.
- Improved discoverability of chart types with recognizable mini-previews.
- Kept advanced SQL available without consuming vertical space by default.
- Made save metadata visible and editable at the point of completion.
- Removed nested panel chrome inside the right Builder tab content to reduce visual noise.

## Screenshots

- `docs/screenshots/builder-finalization/builder-320.png`
- `docs/screenshots/builder-finalization/builder-375.png`
- `docs/screenshots/builder-finalization/builder-768.png`
- `docs/screenshots/builder-finalization/builder-1024.png`
- `docs/screenshots/builder-finalization/builder-1280.png`
- `docs/screenshots/builder-finalization/builder-1440.png`
- `docs/screenshots/builder-finalization/builder-1920.png`
- `docs/screenshots/builder-finalization/builder-analytics-enabled-1280.png`

## Responsive Validation

| Width | Result |
| --- | --- |
| 320 | No horizontal overflow, clipping, or panel overlap. |
| 375 | No horizontal overflow, clipping, or panel overlap. |
| 768 | Format tab checked; no horizontal overflow, clipping, or panel overlap. |
| 1024 | Analytics tab checked; no horizontal overflow, clipping, or panel overlap. |
| 1280 | Analytics tab checked; no horizontal overflow, clipping, or panel overlap. |
| 1440 | No horizontal overflow, clipping, or panel overlap. |
| 1920 | No horizontal overflow, clipping, or panel overlap. |

## Known Limitations

- The mobile workflow is responsive and single-column, but it does not yet hide inactive workflow panels as a full stepper wizard.
- Save metadata fields persist through settings; they are not separate backend fields.

## Verification

- Browser check found and fixed a sticky save-panel overlap.
- Final browser sweep reported no horizontal overflow, no clipped labels, no sibling panel overlap, and no console errors.
- `npm run build`, `npm run lint`, and `npm test` passed.
