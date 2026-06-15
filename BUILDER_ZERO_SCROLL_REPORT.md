# Builder Zero-Scroll UX Report

Date: 2026-06-15

## Scope

Target screen: `/builder`

Goal: reduce scrolling, keep the primary Builder workflow visible, and make chart creation understandable within the first few seconds without changing API contracts, chart logic, state flow, routing, or dataset behavior.

## Files Changed

- `src/features/builder/DropZone.jsx`
- `src/features/builder/QueryModePanel.jsx`
- `src/features/builder/ChartPreviewPanel.jsx`
- `src/styles/builder.css`
- `src/styles/layoutArchitecturePass.css`

## Before vs After

### Before

- Chart type cards used a denser horizontal card layout with less consistent visual rhythm.
- Field mapping still read like form fields instead of clear mapping targets.
- `Category`, `Value`, and `Series` labels were less business-friendly for Thai users.
- SQL advanced controls occupied a visible row and did not remember the user's expanded/collapsed preference.
- At 1280px and 1024px, the right configuration panel could be pushed below the preview area.
- Tall Builder panels stretched the page instead of using internal panel scrolling.

### After

- Chart type cards now use equal-height vertical cards with icon, title, and description hierarchy.
- Field mapping zones now read as compact mapping cards.
- Mapping labels now use Thai BI language:
  - `Category` -> `แกน X`
  - `Value` -> `แกน Y`
  - `Series` -> `กลุ่มข้อมูล`
- Save action remains sticky and visible in the top-right summary bar.
- SQL advanced panel is collapsed by default and remembers expanded state in local storage.
- Desktop Builder layout uses Data | Preview | Config with the preview column taking the largest share.
- Right configuration and data explorer panels scroll internally, keeping the page calmer.
- Preview area remains the dominant center surface while fitting better into laptop-height viewports.

## Scroll Reduction Metrics

Audit used browser viewport heights of 900px for 1920/1440/1280 and 768px for 1024.

| Width | Workflow Bottom | Viewport Height | Primary Workflow Visible | Horizontal Overflow | Notes |
| --- | ---: | ---: | --- | --- | --- |
| 1920 | 889px | 900px | Yes | No | Full workflow visible; SQL starts below viewport while collapsed. |
| 1440 | 889px | 900px | Yes | No | Main workflow visible; only 83px document overflow from collapsed SQL area. |
| 1280 | 801px | 900px | Yes | No | Compact 3-column layout holds; config scrolls internally. |
| 1024 | 763px | 768px | Yes | No | Laptop-width workflow fits; config scrolls internally. |

Notes:

- `SQL ขั้นสูง` remains collapsed at all audited widths.
- The configuration panel intentionally scrolls internally because its accordion content is long.
- Offscreen sidebar nodes are present at 1024 due the existing collapsible navigation model; they do not create document-level horizontal scrolling.

## Screenshots

- `docs/screenshots/builder-zero-scroll/builder-1920.png`
- `docs/screenshots/builder-zero-scroll/builder-1440.png`
- `docs/screenshots/builder-zero-scroll/builder-1280.png`
- `docs/screenshots/builder-zero-scroll/builder-1024.png`

## UX Improvements

- Reduced decision noise by keeping chart type, selected data summary, preview, config entry points, and save action in one first-screen workflow.
- Improved scanability with equal card heights and stable icon/title/description structure.
- Improved field mapping comprehension by replacing technical role labels with Thai BI terms.
- Reduced page scroll by moving long side-panel content into internal panel scroll regions.
- Preserved chart preview priority while preventing the preview from forcing the workflow below the viewport.
- Preserved existing save, chart rendering, field mapping, SQL, dataset, and routing behavior.

## Validation

- `npm run build` passed.
- `npm run lint` passed.
- `npm test` passed.
- Browser console check on `/builder` showed no errors after final reload.
