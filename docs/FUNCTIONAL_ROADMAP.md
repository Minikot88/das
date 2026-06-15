# Functional Completion Roadmap

Date: 2026-06-14

Goal: Move DashboardMiniBi from a polished local BI prototype toward a functionally complete enterprise analytics platform.

## P0 Critical

These items prevent the app from being honestly usable as an enterprise BI platform.

| Priority | Workstream | Current Gap | Target Outcome | Dependencies |
|---|---|---|---|---|
| P0 | Global filter execution | Dashboard filter ribbon is UI-only. | Date, Department, Region, Year, chips, presets, and Clear All alter chart data/query results consistently. | Unified filter model, chart query refresh, dataset field mapping. |
| P0 | Real dataset catalog foundation | Datasets route is missing; dataset modal is mock-only. | Add Datasets page with searchable dataset list, schema explorer, metadata panel, and paginated preview. | Backend dataset endpoints or expanded local dataset model. |
| P0 | Production share/embed model | Share/embed links are local store records. | Server-backed share tokens with validation, public fetch, expiry/revocation, and safe read-only rendering. | Backend share API, permissions model. |
| P0 | Placeholder navigation cleanup | Sidebar exposes Datasets, Templates, Favorites, Recent, Settings as disabled coming soon. | Either implement routes or remove/feature-flag disabled navigation for production credibility. | Route decisions and product scope. |
| P0 | Inspector control honesty | Visual/Data/Interactions tabs show controls that do not function. | Wire controls to selected widget/chart state or mark them as read-only summaries. | Chart settings model, interaction model, persistence. |
| P0 | Backend/mock mode boundary | App defaults to mock data/auth/API. | Clear demo/production mode behavior with robust backend endpoint contracts and error states. | API contract definition and environment configuration. |

## P1 High

These create the core Power BI-style authoring and consumption experience.

| Priority | Workstream | Current Gap | Target Outcome | Dependencies |
|---|---|---|---|---|
| P1 | Widget library functionality | Widget library cards are presentation-only. | Add/drag chart, KPI, table, text, image, filter, divider widgets from the library. | Widget schema, renderer registry, dashboard layout updates. |
| P1 | Non-chart widgets | Table/KPI/filter/text/image/divider widgets are missing or partial. | First-class widget types with edit/remove/duplicate/export behavior. | Widget library, renderers, store persistence. |
| P1 | Data table system | No enterprise table component with sticky header, sorting, pagination, density, resize. | Reusable table powering dataset preview, table widget, and chart data views. | Table component, data model, accessibility. |
| P1 | PDF export | PDF export is missing. | Dashboard and widget PDF export with page size/orientation and multi-page support. | Image/export utilities, layout sizing. |
| P1 | Drilldown | Drilldown toggle is placeholder. | Click chart elements to navigate hierarchy with breadcrumbs and reset. | Chart event handlers, hierarchy settings, query/filter updates. |
| P1 | Cross-filtering | Cross-filter UI is placeholder. | Chart selections filter other visuals and show active interaction state. | Interaction model, chart event handlers, filter execution. |
| P1 | Saved views/bookmarks | Saved views are missing. | Save dashboard view state including filters, canvas/view mode, active tab, and selected widgets. | Unified filter model, persistence. |
| P1 | Filter preset persistence | Current presets are split between local component state and store. | Durable filter presets per dashboard with apply, rename, delete, and share behavior. | Filter model consolidation. |
| P1 | Template marketplace route | Home has template cards only. | `/templates` route with categories, search, preview, and apply-to-builder/dashboard flows. | Template metadata and builder context. |
| P1 | Chart metadata save | Description/folder/tags are read-only in save panel. | Editable persisted metadata for chart library organization. | Store/API chart metadata fields. |
| P1 | Settings page | Settings nav is missing. | Profile, workspace, appearance, sharing, data, shortcuts, and demo/production settings. | Settings route and persistence. |

## P2 Medium

These improve scale, discoverability, and professional workflow quality.

| Priority | Workstream | Current Gap | Target Outcome | Dependencies |
|---|---|---|---|---|
| P2 | Global search | Header search opens command palette but does not search entities. | Search projects, dashboards, charts, datasets, fields, templates, and commands. | Search index over local/backend entities. |
| P2 | Command palette completion | Palette covers a few actions and templates. | Complete action registry with context-aware commands, disabled reasons, and shortcuts. | Shortcut registry, route/action catalog. |
| P2 | Keyboard shortcuts | Only Ctrl/Cmd+K is truly implemented. | Shortcut help/settings, dashboard actions, builder actions, modal navigation, and conflict handling. | Command registry and accessibility review. |
| P2 | Advanced chart types | Builder supports Chart.js families but not table, heatmap, enterprise catalog variants. | Add missing table/KPI/heatmap and clarify supported advanced chart catalog. | Renderer registry and chart factory work. |
| P2 | Chart recommendations | Recommendations are static. | Suggest chart types and mappings based on field types, cardinality, and data profile. | Dataset profiling and compatibility scoring. |
| P2 | SQL query workflow | Mock SQL supports limited SELECT only. | Production query editor with validation, limits, error details, and result schema preview. | Backend query endpoint and permissions. |
| P2 | Import workflows | No import exists. | CSV/JSON/dashboard import with validation, preview, conflict handling, and rollback. | Dataset/catalog and validation models. |
| P2 | Recent/favorites pages | Recent/favorites are partial local state. | Dedicated pages with projects, dashboards, charts, and templates. | Entity metadata and persistence. |
| P2 | Loading/error system | Loading/error states are uneven. | Consistent skeletons, retry states, and app-wide notification/error boundary patterns. | Design system components. |
| P2 | Responsive authoring workflow | Responsive CSS exists, but mobile dashboard/builder workflows are not complete. | Mobile/tablet panel drawers, touch-friendly grid, and simplified builder workflow. | UX validation and layout testing. |

## P3 Nice To Have

These deepen enterprise polish once core flows are real.

| Priority | Workstream | Current Gap | Target Outcome | Dependencies |
|---|---|---|---|---|
| P3 | Analytics overlays | Trend/target/threshold/forecast/reference line are placeholders. | Persisted visual analytics overlays with formatting and legend support. | Chart settings model and renderer support. |
| P3 | Collaboration | No multi-user collaboration. | Comments, presence, activity, ownership, and audit history. | Auth, backend, permissions. |
| P3 | Version history | No dashboard/chart versioning. | Restore previous dashboard/chart states and compare changes. | Backend snapshots. |
| P3 | Scheduled exports | No scheduled delivery. | Email/slack-style scheduled PDF/PNG/CSV exports. | Export backend, notifications. |
| P3 | Data lineage | Dataset/chart lineage is minimal. | Show source dataset, fields, transformations, and dependent dashboards. | Dataset metadata and chart mappings. |
| P3 | Admin governance | Admin panel missing. | Workspace roles, sharing policies, data access, audit logs. | Auth/permissions. |
| P3 | Marketplace polish | Template gallery is basic. | Ratings, ownership, previews, screenshots, duplication, and category analytics. | Template route and metadata. |

## Suggested Delivery Sequence

1. Consolidate dashboard filters into one store-backed model and wire them into chart data refresh.
2. Build the Datasets route and replace mock-only dataset explorer data with a real catalog abstraction.
3. Implement server-backed share/embed tokens or explicitly gate sharing as demo-only.
4. Wire Inspector Properties/Visual/Data controls to selected widget/chart state.
5. Implement widget library add/drag behavior and first-class KPI/table/text/filter widgets.
6. Add PDF export and reusable enterprise table component.
7. Complete command palette, global search, shortcuts, and settings.
8. Add drilldown, cross-filtering, saved views, and analytics overlays.

## Acceptance Criteria For Functional Completion

- Exposed navigation either opens a real route or is hidden behind an explicit feature flag.
- Every visible control changes persistent state, triggers a real action, or is clearly read-only.
- Dashboard filters alter rendered chart data and are represented in share/export/saved-view states.
- Dataset browsing is no longer hardcoded to `mockData.js`.
- Share/embed links work after reload and outside the creator's local browser state.
- Export PNG, JPG, PDF, and CSV have predictable output, errors, and disabled states.
- Builder save metadata is editable and persisted.
- Inspector settings can update the selected widget without changing unrelated business logic.
- Keyboard-only users can navigate key workflows without relying on drag/drop.

