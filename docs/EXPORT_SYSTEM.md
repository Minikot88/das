# Export System

## Overview

DashboardMiniBi supports local browser export for dashboard snapshots and chart-level exports.

Dashboard export utilities live in:
- `src/utils/dashboardShareUtils.js`

Dashboard export UI lives in:
- `src/components/dashboard/DashboardShareModal.jsx`
- `src/pages/DashboardPage.jsx`

## Supported Dashboard Formats

- PNG
- JPG
- PDF

Exports capture the current dashboard visual state, including:
- dashboard title
- workspace context
- current timestamp
- filters
- interactions
- charts
- tables
- current widget state

## Export Pipeline

1. DashboardPage renders a hidden export surface.
2. `dashboardShareUtils` clones the export DOM node.
3. Nodes marked `data-export-ignore="true"` are removed.
4. Canvas state is copied into image elements.
5. CSS rules are collected from readable stylesheets.
6. The cloned DOM is serialized into an SVG `foreignObject`.
7. The SVG is drawn into a canvas.
8. PNG/JPG use `canvas.toDataURL`.
9. PDF embeds a JPEG snapshot into a single-page PDF byte stream.

## File Naming

`sanitizeFileName` converts dashboard names into safe lowercase filenames.

Example:
- `Executive Dashboard 2026!`
- `executive-dashboard-2026`

## Share And Embed

Share utilities also build:
- read-only dashboard view URLs
- embed URLs
- iframe embed code
- view options from query params

Public views:
- `/dashboard/:dashboardId/view`
- `/dashboard/:dashboardId/embed`

Share records are local browser records stored in the Zustand workspace snapshot.

## Limitations

- Export depends on browser canvas support.
- Very large dashboards may exceed browser memory or canvas size limits.
- PDF export is a visual snapshot, not selectable semantic PDF text.
- Cross-origin stylesheets may be skipped if the browser blocks stylesheet rule access.
- Local share links are not production access-control.

## Tests

Covered in:
- `src/utils/dashboardShareUtils.test.js`

Browser-level download tests are recommended for future E2E coverage.
