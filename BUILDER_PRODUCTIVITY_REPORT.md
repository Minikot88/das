# Builder Productivity Optimization Report

Date: 2026-06-16

## Scope

Target screen: `/builder`

This sprint optimized the Builder for productivity, not only responsiveness. The goal was to keep the primary workflow visible in one viewport on desktop sizes while preserving chart generation, dataset binding, SQL editing, preview rendering, save behavior, routing, and API behavior.

## Files Changed

- `src/features/builder/FieldList.jsx`
- `src/features/builder/QueryModePanel.jsx`
- `src/features/builder/ChartSettingsPanel.jsx`
- `src/features/builder/ChartAnalyticsPanel.jsx`
- `src/features/builder/BuilderPage.jsx`
- `src/styles/layoutArchitecturePass.css`

## Productivity Changes

### Dataset Panel

Added a compact Recommended Fields area:

- Shows the top 6 fields from the selected table.
- Fields remain draggable.
- Mapped fields retain active visual state.
- Added Show All Fields / Show Top Fields control.
- Long table field lists are collapsed to the first 8 fields until expanded.

### Config Panel

Converted Config to productivity accordion behavior:

- Uses native grouped `<details name="builder-config-accordion">`.
- Only one section is expanded at a time in supporting browsers.
- Keeps the right panel compact and internally scrollable.

Sections covered:

- Format
- Colors
- Axis
- Tooltip
- Legend
- Analytics

### Preview Area

Increased the effective preview priority by:

- Keeping Dataset and Config as side panels.
- Reducing chrome around Builder sections.
- Compacting chart selector cards at desktop productivity widths.
- Preserving a large preview area in the center column.

Preview behavior:

- 1920 desktop: 420px preview height.
- 1440 and 1280 compact desktop: approximately 340px preview height to keep the workflow in the first viewport.

### SQL Experience

Removed SQL from page flow.

Replaced the inline SQL panel with:

- Fixed SQL button.
- Drawer modal for advanced SQL.
- Copy SQL and Reset SQL controls inside the drawer.

The SQL button no longer increases page height.

## Scroll Audit

Measured with browser viewport height `900px`.

| Viewport | Before This Sprint | After | Primary Workflow |
| --- | ---: | ---: | --- |
| 1920x900 | 1.00x scroll ratio | 1.00x | Fits first viewport |
| 1440x900 | 1.81x scroll ratio | 1.01x | Fits first viewport |
| 1280x900 | 1.87x scroll ratio | 1.01x | Fits first viewport |

Notes:

- `1440` and `1280` retain a tiny document scroll buffer from shell/page chrome, but Dataset, Preview, Config, and SQL button are visible in the first viewport.
- No horizontal overflow was detected.
- No clipping was detected.
- SQL drawer is closed by default and does not affect page height.

## Viewport Usage

### 1920x900

- Dataset, Preview, and Config remain in a three-column layout.
- Primary workflow bottom: `888px`.
- Page scroll ratio: `1.00`.

### 1440x900

- Compact three-column productivity layout.
- Primary workflow bottom: `898px`.
- Page scroll ratio: `1.01`.

### 1280x900

- Compact three-column productivity layout.
- Primary workflow bottom: `898px`.
- Page scroll ratio: `1.01`.

## Before vs After

Before:

- SQL panel added height below the Builder grid.
- 1440 and 1280 layouts pushed Config below the main workflow.
- Long dataset field lists consumed too much vertical space.
- Chart selector cards pushed mapping and preview too far down.

After:

- SQL is launched from a fixed button and opens in a drawer.
- Desktop productivity widths keep Dataset, Preview, and Config visible together.
- Recommended fields reduce field selection time.
- Long field lists are collapsed until the user requests all fields.
- Config uses one-open-section accordion behavior.
- Primary Builder workflow fits the first viewport on tested desktop sizes.

## Validation

Browser audit:

- 1920x900
- 1440x900
- 1280x900

Results:

- Horizontal overflow: none
- Clipping: none
- SQL drawer open by default: no
- Recommended fields visible: yes
- Config open accordion count: 1
- Console errors: none

## Command Verification

Passed:

```bash
npm run build
npm run lint
npm test
```

Test result:

- 7 test files passed
- 9 tests passed

## Known Limitations

- The one-open accordion behavior uses the native `details[name]` browser behavior. Browsers without support may allow more than one section to remain open.
- The 1440 and 1280 page still report a tiny scroll ratio of `1.01` due to surrounding shell chrome, but the primary workflow itself is visible in the first viewport.
