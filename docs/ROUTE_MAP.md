# Route Map

Primary source: `src/app/AppRoutes.jsx`.

| Route | Access | Component | Purpose |
| --- | --- | --- | --- |
| `/login` | Public | `LoginPage` | Local/mock sign-in. |
| `/register` | Public | `RegisterPage` | Local/mock account simulation. |
| `/share/:sheetId` | Public read-only | `SharePage` | Legacy Sheet-alias Local share compatibility. |
| `/dashboard/:dashboardId/view` | Public read-only | `DashboardPublicPage` | Token-required Local dashboard view. |
| `/dashboard/:dashboardId/embed` | Public read-only | `DashboardPublicPage` | Token-required Local same-origin embed view. |
| `/`, `/home` | Protected shell | `HomePage` | Project workspace hub. |
| `/dashboard` | Protected shell | `DashboardCanvasBuilder` | Current durable dashboard canvas. |
| `/dashboard-v2` | Protected shell | `DashboardDesignerV2` | Current chart designer. |
| `/dashboard-legacy` | Protected shell | `DashboardPage` | Legacy dashboard/sheet surface retained for parity. |
| `/builder` | Protected shell | `Builder` | Legacy/alternate chart builder retained for parity. |
| `/connections` | Protected shell | `DatabaseConnectionPage` | Metadata-only connection simulation. |
| `/datasets` | Protected shell | `DatasetsPage` | Project-owned local dataset catalog/import. |
| `/settings` | Protected shell | `SettingsPage` | Local workspace preferences. |
| `*` | Redirect | `/home` | Unknown-route fallback; protection applies at destination. |

## Guard And Layout Behavior

- `ProtectedRoute` redirects unauthenticated users to `/login` and preserves the attempted location.
- Public share/view/embed routes are read-only and expose no editor controls.
- Local share records must exist in the same browser profile and match the requested dashboard.
- `MainLayout` supplies one main landmark and a skip link; dense workspace routes own their internal labeled sections.
- Lazy routes render a global loading status and all route elements have an error boundary.

## Compatibility Decision

No current or legacy route is removed. `/dashboard-legacy`, `/builder`, and `/share/:sheetId` remain until an evidence-backed parity review proves their unique behavior and data are covered. See `LEGACY_ROUTE_PARITY.md`.
