# Builder Auto Grid Layout Report

Date: 2026-06-16

## Scope

Target screen: `/builder`

This sprint converted the Builder surface from a stacked center-column layout into an auto-balancing grid layout. The work is presentation-only and preserves existing Builder state, chart preview, SQL editing, dataset binding, save behavior, and routing.

## Files Changed

- `src/features/builder/BuilderPage.jsx`
- `src/styles/layoutArchitecturePass.css`

## Changes Completed

### SQL Moved Out of Preview Flow

`QueryModePanel` was moved out of the center preview column and placed after the main Builder grid.

The same props and callbacks are preserved:

- `queryMode`
- `generatedSql`
- `customSql`
- `queryStatus`
- `queryError`
- `queryResult`
- `onChangeMode`
- `onChangeSql`
- `onRunSql`
- `onResetSql`

### Auto Grid Layout

Desktop Builder now uses CSS Grid with:

```css
minmax(260px, 320px) 1fr minmax(280px, 340px)
```

The main grid areas are:

- Dataset
- Preview workflow
- Config

SQL is placed below the grid as a full-width panel with:

```css
grid-column: 1 / -1;
```

### Auto Height Rules

Dataset:

- Uses internal overflow when the panel exceeds available viewport height.

Preview:

- Uses natural height.
- Maintains a `400px` minimum on desktop/tablet.
- Maintains a `360px` minimum on mobile.

Config:

- Uses internal overflow.
- Does not stretch the full page height unnecessarily.

SQL:

- Full-width below the Builder grid.
- `min-height: 40px`
- `max-height: 220px`
- `overflow: auto`
- `resize: vertical` remains available on the editor.

## Responsive Behavior

### 1920px

Three-column grid:

- Dataset
- Preview
- Config

Measured columns:

- `320px 920px 340px`

SQL appears below the grid and remains visible.

### 1440px

Two-column grid:

- Dataset + Preview
- Config below

Measured columns:

- `320px 818px`

SQL remains below the full Builder grid and is not hidden.

### 1280px

Two-column grid:

- Dataset + Preview
- Config below

Measured columns:

- `320px 698px`

No horizontal overflow or clipping detected.

### 1024px

Single-column flow:

- Dataset
- Mapping and Preview
- Config
- SQL

No horizontal overflow or clipping detected.

### 768px

Wizard-style single-column flow.

No horizontal overflow or clipping detected.

### 375px and 320px

Mobile single-column flow.

No horizontal overflow, clipped Builder panels, hidden SQL, or panel overlap detected.

## Browser Validation

Validated widths:

- 1920x900
- 1440x900
- 1280x900
- 1024x900
- 768x900
- 375x812
- 320x812

Results:

- Horizontal overflow: none
- Clipped Builder panels: none
- Hidden SQL panel: none
- SQL below Builder grid: yes
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

- This sprint intentionally did not change Builder logic, query generation, dataset handling, chart rendering, save behavior, or route behavior.
- At smaller widths, SQL correctly remains below the full Builder flow. This keeps the advanced SQL panel out of the preview flow, but it still follows Dataset, Mapping, Preview, and Config in document order.
