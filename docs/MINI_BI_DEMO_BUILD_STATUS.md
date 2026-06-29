# Mini BI Demo Build Status

Status date: June 27, 2026

## 1. Project Overview

Mini BI is a frontend demo build of a business intelligence dashboard builder. The current demo supports chart creation, dashboard layout, demo SQL, local save/load, export, share mock flows, and responsive UI behavior.

The build is suitable for client-facing product demonstration of the core workflow:

- Create a chart from demo data.
- Save the chart as a reusable asset.
- Place saved charts and widgets on a dashboard canvas.
- Save and restore the dashboard layout locally.
- Export demo outputs.
- Open share/public mock views.

This is not a production backend build yet. Persistence and integrations are demo/local-first.

## 2. Current Route Roles

| Route | Role |
| --- | --- |
| `/home` | Workspace Hub |
| `/dashboard` | Dashboard Canvas Builder |
| `/dashboard-v2` | Chart Designer |
| `/dashboard-legacy` | Legacy Dashboard |
| `/builder` | Legacy Builder |
| `/datasets` | Dataset Management |
| `/settings` | Settings |
| `/login` | Login |
| `/register` | Register |
| `/share/:sheetId` | Share Page |
| `/dashboard/:dashboardId/view` | Public View |
| `/dashboard/:dashboardId/embed` | Embed View |

## 3. App Shell

The application uses a global Word-style Ribbon AppShell for authenticated app pages.

Current desktop shell sizing:

- Topbar height: `46px`
- Main navigation height: `36px`
- Ribbon height: `54px`
- Total app shell height: `136px`

Mobile shell behavior:

- Compact mobile header: `44px`
- Full ribbon is hidden on mobile.
- Mobile navigation is handled through the compact header and drawer.

Ribbon tabs:

- หน้าหลัก
- แดชบอร์ด
- สร้างกราฟ
- ข้อมูล
- เครื่องมือ
- ตั้งค่า

Full workspace pages such as `/dashboard` and `/dashboard-v2` use the remaining viewport height after the AppShell.

## 4. Dashboard Canvas Builder

Route: `/dashboard`

Current capabilities:

- Add saved chart.
- Add KPI widget.
- Add table widget.
- Add text widget.
- Add image placeholder.
- Add filter placeholder.
- Drag widgets on the canvas.
- Resize widgets.
- Save dashboard layout locally.
- Reload and restore saved layout.
- Preview mode.
- Export JSON.
- Export PNG demo.
- Share mock dialog.
- Dashboard templates.

Local storage key:

- `dashboard-canvas-layout-v1`

Known note:

- PDF export currently opens a mock/coming soon modal.

## 5. Chart Designer

Route: `/dashboard-v2`

Current capabilities:

- Apache ECharts rendering.
- Chart registry.
- Chart option builder.
- Field mapping.
- Templates.
- Presets.
- Theme presets.
- Demo SQL mode.
- More Mapping popover.
- Save chart.
- Export JSON.
- Export CSV.
- Export PNG.
- Share mock dialog.
- Presentation mode.

Local storage keys:

- `dashboard-v2-chart-config`
- `dashboard-v2-saved-charts`
- `dashboard-v2-sql-saved-queries`

The Chart Designer creates reusable chart assets. The Dashboard Canvas Builder references saved chart assets and manages widget layout.

## 6. Supported Charts

The current demo chart library includes:

- Bar
- Horizontal Bar
- Stacked Bar
- Line
- Area
- Multi Line
- Stacked Area
- Combo
- Pie
- Donut
- Scatter
- Bubble
- KPI
- Table
- Pivot
- Gauge
- Heatmap
- Treemap
- Funnel
- Radar
- Waterfall
- Sunburst
- Sankey
- Candlestick
- Boxplot
- Calendar Heatmap
- Graph Network
- Parallel Coordinates
- Progress Ring

## 7. Demo Data / SQL

The demo uses a frontend-only demo dataset. No backend database is connected yet.

SQL demo mode currently supports:

- `SELECT`
- `WHERE`
- `GROUP BY`
- `ORDER BY`
- `LIMIT`
- `SUM`
- `AVG`
- `MIN`
- `MAX`
- `COUNT`

Unsupported in the current demo:

- `JOIN`
- `UNION`
- `HAVING`
- Subqueries
- Real MySQL execution

The SQL panel is intended to demonstrate query workflow and dataset handoff without connecting to a real database.

## 8. Save / Storage

The demo uses browser `localStorage` for local persistence.

Current keys:

- `dashboard-v2-chart-config`
- `dashboard-v2-saved-charts`
- `dashboard-v2-sql-saved-queries`
- `dashboard-canvas-layout-v1`

This storage is demo/local persistence only. It is not a production persistence layer, and data is scoped to the current browser profile.

## 9. Export / Share

Current export/share behavior:

- Export JSON works.
- Export CSV works in Chart Designer.
- Export PNG works as demo export.
- PDF export is mock/coming soon.
- Share link flow is mock/local.
- Public view and embed routes show friendly states when no valid share data exists.

There is no backend share service yet.

## 10. QA Summary

Latest QA status:

- `npm run lint` passed.
- `npm run build` passed.
- Vite chunk-size warning remains.
- Main routes tested.
- Desktop and mobile viewports tested.
- No horizontal overflow detected in tested routes.
- No runtime console errors detected in smoke checks.
- Navigation back/forward passed in prior navigation QA.
- Overlay cleanup passed in prior QA.
- AppShell normalized across app-shell pages.

Routes covered in the latest QA cycle:

- `/home`
- `/dashboard`
- `/dashboard-v2`
- `/dashboard-legacy`
- `/builder`
- `/datasets`
- `/settings`
- `/login`
- `/register`
- `/share/sheet-1`
- `/dashboard/dash-1/view`
- `/dashboard/dash-1/embed`
- `/non-existing-route`

Viewports covered:

- `1728x1124`
- `1440x900`
- `1366x768`
- `1024x768`
- `768x900`
- `480x860`

## 11. Known Limitations

The current demo build is not production-ready in these areas:

- No backend/API.
- No MySQL connection.
- No production authentication.
- No permissions/RBAC.
- No real share backend.
- No production PDF export.
- Demo SQL is frontend-only.
- Persistence is localStorage-only.
- Vite chunk-size warning still exists.

## 12. Recommended Next Phase

Recommended implementation path:

1. Phase 1: Backend API Contract
2. Phase 2: Node.js + Express + MySQL
3. Phase 3: Real dataset connection
4. Phase 4: Dashboard/chart persistence API
5. Phase 5: Auth/workspace/permissions
6. Phase 6: Production export service
7. Phase 7: Deployment hardening

The next phase should start by freezing API contracts for workspaces, datasets, visual assets, dashboards, widgets, users, roles, and sharing. After the API contract is stable, backend persistence and authentication can be implemented without changing the demo route roles.
