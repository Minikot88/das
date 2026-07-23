# Visual Bugfix Report

## Scope

Fixed the reported visual defects from `FINAL_VISUAL_QA.md` without changing business logic, state management, routing, API calls, chart data sources, persistence, or widget behavior.

## Bugs Fixed

### 1. Dashboard active tab underline

**Issue:** A blue active-tab underline could visually span beyond the active Dashboard tab.

**Fix:** Constrained the active pseudo-element to the active tab box only.

- `.dashboard-workspace-tab.is-active` now provides a local positioning context and clips the underline.
- `.dashboard-workspace-tab.is-active::after` uses tab-local `left` and `right` offsets.
- `.dashboard-tab.is-active::after` is constrained with `width: auto` and a tab-relative max width.

### 2. Builder recommendations overlapping SQL panel

**Issue:** Recommendation cards could collide with the SQL/query panel.

**Fix:** Forced the recommendation and query panels back into normal document flow.

- Removed collision risk from absolute/offset positioning with scoped static-position overrides.
- Reset margins and transforms for recommendation cards, recommendation panel, and query panel.
- Kept recommendation cards inside a normal responsive CSS grid.

### 3. Builder responsive layout crowding

**Issue:** Tablet widths were too crowded and could collapse into an awkward layout.

**Fix:** Added deterministic Builder layout breakpoints.

- Desktop: `Data | Preview | Builder`
- Tablet: `Data | Preview`, with Builder below
- Mobile: single-column step workflow

## Files Changed

- `src/styles/layoutArchitecturePass.css`
- `src/styles/builder.css`
- `VISUAL_BUGFIX_REPORT.md`

## Validation Results

Automated visual measurements were captured for Dashboard and Builder at the requested viewport widths.

| Width | Dashboard overflow | Active underline | Builder overflow | Builder overlap | Builder layout |
| --- | --- | --- | --- | --- | --- |
| 320 | Pass | Pass | Pass | Pass | 1 column |
| 375 | Pass | Pass | Pass | Pass | 1 column |
| 768 | Pass | Pass | Pass | Pass | Data + Preview, Builder below |
| 1024 | Pass | Pass | Pass | Pass | Data + Preview, Builder below |
| 1280 | Pass | Pass | Pass | Pass | 3 columns |
| 1440 | Pass | Pass | Pass | Pass | 3 columns |
| 1920 | Pass | Pass | Pass | Pass | 3 columns |

## Screenshot Inventory

Screenshots were generated in `docs/visual-bugfix-screenshots/`.

- `320-dashboard.png`
- `320-builder.png`
- `375-dashboard.png`
- `375-builder.png`
- `768-dashboard.png`
- `768-builder.png`
- `1024-dashboard.png`
- `1024-builder.png`
- `1280-dashboard.png`
- `1280-builder.png`
- `1440-dashboard.png`
- `1440-builder.png`
- `1920-dashboard.png`
- `1920-builder.png`

Detailed measurement output:

- `docs/visual-bugfix-results.json`

## Verification Commands

All required commands passed after the final CSS changes.

- `npm run build` - passed
- `npm run lint` - passed
- `npm test` - passed

## Remaining Issues

No remaining issues were detected for the reported defects:

- No full-width active underline.
- No Builder recommendation/query overlap.
- No horizontal page overflow at the tested widths.
- No tablet Builder crowding in the measured layout.
