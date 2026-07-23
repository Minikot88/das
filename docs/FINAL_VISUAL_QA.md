# Final Visual QA

Date: 2026-06-15  
Project: DashboardMiniBi  
Mode: Thai-first release visual QA

## Scope

Scanned these routes across `320`, `375`, `768`, `1024`, `1440`, and `1920` px:

- `/login`
- `/register`
- `/`
- `/dashboard`
- `/builder`
- `/datasets`
- `/settings`
- `/dashboard/:dashboardId/view`
- `/share/:sheetId` missing-link state

## Verification Summary

- Screenshots captured: 54
- Page-level horizontal overflow: 0
- Mojibake / replacement characters / `????`: 0
- Critical overlapping panels: 0 after fixing the mobile right-panel flow
- Build: pass (`npm run build`)
- Lint: pass (`npm run lint`)

## Fixes Applied During QA

- Replaced remaining English UI labels in Home, Dashboard empty state, share/read-only views, widget menus, settings, datasets, and builder picker.
- Repaired corrupted Thai source text in Settings, Datasets, and Builder chart picker.
- Localized visible dashboard filter labels while preserving stored filter values.
- Reworked mobile shell layout so the right workspace panel stacks below content instead of overlapping it.
- Tightened tablet app bar behavior to prevent user controls from overflowing at 1024px.
- Replaced the native English file upload control with Thai visible controls.
- Localized mock dataset display labels, sample month labels, and default builder chart titles/legend labels.

## Screenshot Inventory

Screenshots are stored in `docs/visual-qa-screenshots/`.

| Viewport | Screenshots |
|---|---|
| 320 | `320-login.png`, `320-register.png`, `320-home.png`, `320-dashboard.png`, `320-builder.png`, `320-datasets.png`, `320-settings.png`, `320-public-view.png`, `320-share-missing.png` |
| 375 | `375-login.png`, `375-register.png`, `375-home.png`, `375-dashboard.png`, `375-builder.png`, `375-datasets.png`, `375-settings.png`, `375-public-view.png`, `375-share-missing.png` |
| 768 | `768-login.png`, `768-register.png`, `768-home.png`, `768-dashboard.png`, `768-builder.png`, `768-datasets.png`, `768-settings.png`, `768-public-view.png`, `768-share-missing.png` |
| 1024 | `1024-login.png`, `1024-register.png`, `1024-home.png`, `1024-dashboard.png`, `1024-builder.png`, `1024-datasets.png`, `1024-settings.png`, `1024-public-view.png`, `1024-share-missing.png` |
| 1440 | `1440-login.png`, `1440-register.png`, `1440-home.png`, `1440-dashboard.png`, `1440-builder.png`, `1440-datasets.png`, `1440-settings.png`, `1440-public-view.png`, `1440-share-missing.png` |
| 1920 | `1920-login.png`, `1920-register.png`, `1920-home.png`, `1920-dashboard.png`, `1920-builder.png`, `1920-datasets.png`, `1920-settings.png`, `1920-public-view.png`, `1920-share-missing.png` |

Detailed machine-readable results:

- `docs/visual-qa-results.json`
- `docs/visual-qa-summary.json`

## Remaining Issues

Low: Some intentional technical English remains where it represents product/technical values rather than translatable UI chrome: `Mini BI`, `CSV`, `SQL`, keyboard shortcuts such as `Ctrl + K`, demo credentials, internal schema/table/field keys such as `researchdb`, `sales_performance`, `month`, and route slugs used by the browser.

Low: At 320px, the dataset import card wraps the heading into short stacked lines. It is readable and does not overflow, but a future polish pass could make that block more compact.

Low: The automated clipping detector still flags intentional truncation and scroll containers, especially table headers and schema-tree identifiers. Manual screenshot review did not show broken overlap or hidden primary controls.

## Result

Final QA passes for release-blocking visual defects: no mojibake, no `????`, no page-level horizontal overflow, no panel collision, and no clipped primary controls across the scanned routes and breakpoints.
