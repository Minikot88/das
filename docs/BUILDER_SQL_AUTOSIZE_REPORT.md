# Builder SQL Autosize Report

Date: 2026-06-15

## Scope

Target screen: `/builder`

Goal: stop the SQL panel from reserving excessive vertical space while preserving existing SQL generation, custom SQL editing, copy/reset actions, and drawer state persistence.

## Files Changed

- `src/features/builder/QueryModePanel.jsx`
- `src/styles/layoutArchitecturePass.css`

## Changes Made

- Added `rows={1}` to the SQL textarea so the editor starts from a compact one-row baseline.
- Forced the SQL editor presentation to:
  - `height: auto`
  - `min-height: 40px`
  - `max-height: 180px`
  - `overflow: auto`
  - `resize: vertical`
- Removed reserved collapsed whitespace by hiding the editor stack when `<details>` is closed.
- Kept collapsed state to only the `SQL ขั้นสูง` summary row.
- Added mobile Builder column overrides so the SQL panel remains full width instead of being squeezed by prior responsive grid rules.

## Verification Metrics

| Viewport | Collapsed SQL Panel | Expanded SQL Panel | Editor Height | Horizontal Overflow |
| --- | ---: | ---: | ---: | --- |
| Desktop 1440x900 | 42px | 179px | 41px | No |
| Tablet 768x900 | 42px | 224px | 41px | No |
| Mobile 375x812 | 42px | 224px | 41px | No |

Notes:

- Expanded panel height varies by viewport because helper text wraps naturally.
- The textarea itself stays compact and scrollable; long SQL content uses internal textarea scrolling up to `180px`.
- Off-canvas navigation nodes still exist on small screens, but the measured document has no horizontal overflow after the mobile override.

## Validation

- `npm run build` passed.
- `npm run lint` passed.
- `npm test` passed.
- Browser console check on `/builder` showed no errors after final reload.

## Known Limitations

- The textarea uses CSS sizing only. It does not dynamically grow line-by-line beyond browser-native textarea behavior, by design, to avoid changing Builder state or SQL editor logic.
