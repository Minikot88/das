# Functional Completion Audit

Date: 2026-06-14

Scope: Full application scan for incomplete, placeholder, disabled, mock, partial, broken, or missing functionality after visual Phases 1-6.

Status legend:

- COMPLETE: Works end-to-end in the current application scope.
- PARTIAL: Works in a limited, local, demo, or narrow scope.
- PLACEHOLDER: UI exists but is not functionally wired.
- BROKEN: Feature is present but likely fails or gives misleading behavior.
- MISSING: Expected feature is not implemented or not routed.

## Executive Summary

DashboardMiniBi has a functional local BI prototype core: project/workspace management, dashboard tabs, widget placement, chart creation, chart editing, Chart.js preview/rendering, local persistence, widget rename/duplicate/delete, CSV/PNG/JPG export, command palette navigation, and local share/embed viewers.

The main completion gap is enterprise readiness. Many premium BI affordances are now visible in the UI but remain demo-scoped or unwired: Datasets, Templates, Favorites, Recent, Settings, global filters, cross-filtering, drilldown, analytics overlays, table widgets, PDF export, import, saved views, production sharing, and real dataset management. APIs default to mock mode, and dataset/schema/query execution use mock data unless `VITE_USE_MOCK=false` and compatible backend endpoints exist.

## Feature Audit

| Feature | Location | Status | Impact | Required Work |
|---|---|---:|---|---|
| Auth: login | `src/pages/LoginPage.jsx`, `src/api/authApi.js`, `src/store/useStore.js` | PARTIAL | Users can enter the app locally, but auth defaults to mock/local store behavior. | Wire to production auth/session APIs, token/session refresh, failure states, logout invalidation, and protected-route server verification. |
| Auth: registration | `src/pages/RegisterPage.jsx`, `src/api/authApi.js` | PARTIAL | Registration can support demo entry but is not enterprise account provisioning. | Add backend registration, validation, invite/org flows, email verification, and duplicate account handling. |
| Password reset | Auth pages | MISSING | Standard login recovery is unavailable. | Add forgot-password route, request/reset flows, and confirmation states. |
| Protected routing | `src/app/AppRoutes.jsx` | COMPLETE | Main app routes are guarded by store authentication. | For production, pair with server/session validation. |
| Route coverage: Home | `/`, `/home`, `HomePage.jsx` | COMPLETE | Workspace hub is routable and functional for local projects. | No immediate functional work beyond production data integration. |
| Route coverage: Dashboard | `/dashboard`, `DashboardPage.jsx` | COMPLETE | Main dashboard canvas is routable and functional. | No route changes needed. |
| Route coverage: Builder | `/builder`, `BuilderPage.jsx` | COMPLETE | Chart builder is routable and functional. | No route changes needed. |
| Route coverage: Datasets | Sidebar Library | MISSING | Sidebar exposes Datasets as coming soon, but no page/route exists. | Add `/datasets` catalog route, dataset list, detail, schema, preview, import/connectors, and permissions. |
| Route coverage: Templates | Sidebar Library, Home template section | PARTIAL | Home template cards can prefill builder, but no marketplace/catalog route exists. | Add `/templates` gallery with search, categories, preview, and use-template flow. |
| Route coverage: Favorites | Sidebar Personal | MISSING | Favorites is exposed as coming soon but cannot be opened. | Add favorites model, route, persistence, and favorite/unfavorite actions. |
| Route coverage: Recent | Sidebar Personal | PARTIAL | Recent projects are tracked locally, but there is no Recent page. | Add route/view for recent projects, dashboards, charts, and activity. |
| Route coverage: Settings | Sidebar Settings | MISSING | Settings is exposed as coming soon but unavailable. | Add settings route for profile, workspace, appearance, data, sharing, and keyboard shortcuts. |
| Unknown route fallback | `AppRoutes.jsx` | COMPLETE | Unknown paths redirect to Home. | No required work. |
| Workspace/project creation | `HomePage.jsx`, `CreateProjectModal`, `projectApi.js`, store | COMPLETE | Users can create projects locally and move to dashboard. | Backend persistence required for multi-user production. |
| Project rename/delete | `ProjectCard.jsx`, store | COMPLETE | Local project management works. | Add server persistence, confirmation policies, and permission checks for production. |
| Project sorting | `HomePage.jsx` | COMPLETE | Recent/Active/A-Z sorting works locally. | Add search/filter if needed. |
| Home KPI overview | `HomePage.jsx` | PARTIAL | Counts are computed for projects/dashboards/recent/favorites; favorite count has no functional favorite control on project cards. | Add project/dashboard favorite actions and real recent activity source. |
| Recent activity feed | `HomePage.jsx` | PLACEHOLDER | Activity cards show static sample events. | Replace with real audit/activity events from workspace state or backend. |
| Template gallery on Home | `HomePage.jsx`, `templateGalleryCatalog.js` | PARTIAL | Template cards launch Builder with prefilled template IDs. Cards still label template metadata as placeholder. | Add true template preview, categories, metadata, and gallery route. |
| Dashboard creation | `DashboardPage.jsx`, store `createDashboard` | COMPLETE | Users can create dashboards in the active sheet. | Add backend persistence and permission checks. |
| Dashboard rename | `DashboardPage.jsx`, store `renameDashboard` | COMPLETE | Inline/context rename works. | Add backend persistence and conflict handling. |
| Dashboard duplication | `DashboardPage.jsx`, store `duplicateDashboard` | COMPLETE | Current dashboard can be duplicated locally. | Add server persistence and large-dashboard progress/error handling. |
| Dashboard deletion | `DashboardPage.jsx`, store `removeDashboard` | COMPLETE | Dashboards can be deleted with local state updates. | Add confirmation copy, permission checks, and backend persistence. |
| Sheet management | Store `createSheet`, `renameSheet`, `removeSheet`, `duplicateSheet` | PARTIAL | Store supports sheets, but current primary UI focuses on dashboard tabs. | Expose full sheet controls consistently or hide unsupported actions. |
| Dashboard canvas drag/drop/resize | `DashboardGrid.jsx`, `react-grid-layout`, store `updateLayout` | COMPLETE | Widget layout editing and persistence work locally. | Add backend persistence and conflict resolution for production. |
| Canvas size presets | `DashboardPage.jsx`, store `updateDashboardCanvasSize` | COMPLETE | Auto, presentation, square, A4, and custom canvas sizing are wired. | Add saved responsive presets per dashboard if needed. |
| Empty dashboard state | `DashboardPage.jsx` | COMPLETE | Empty canvas offers New Chart and Browse Charts. | No required functional work. |
| Widget add from saved charts | `ChartPicker.jsx`, `dashboardApi.addSavedChartToDashboard` | COMPLETE | Saved charts can be attached to the active dashboard. | Add search/filter/pagination for larger chart libraries. |
| Widget rename | `CardActions.jsx`, `DashboardPage.jsx`, store `renameChartWidget` | COMPLETE | Widget title override works. | Add backend persistence. |
| Widget duplicate | `CardActions.jsx`, `DashboardPage.jsx`, store `duplicateChart` | COMPLETE | Duplicate creates a copied saved chart and adjacent layout item. | Add backend persistence and duplicate progress/error handling. |
| Widget delete/remove | `CardActions.jsx`, `DashboardPage.jsx`, store `removeChart` | COMPLETE | Removes widget instance from dashboard layout. | Add undo and backend persistence. |
| Saved chart delete | Store `deleteChart`, `chartApi.deleteChart` | PARTIAL | Store action exists and removes chart from all layouts, but not broadly exposed in UI. | Add chart library management UI with delete confirmation. |
| Widget edit chart | `CardActions.jsx`, `DashboardPage.jsx`, `BuilderPage.jsx` | COMPLETE | Existing chart opens in builder and updates saved chart. | Add conflict handling if used with backend. |
| Widget fullscreen/focus | `DashboardFullscreenModal.jsx`, `CardActions.jsx`, `DashboardPage.jsx` | COMPLETE | Selected widget can be opened in fullscreen modal. | Add keyboard shortcut and browser fullscreen API if desired. |
| Widget export CSV | `DashboardPage.jsx`, `CardActions.jsx` | COMPLETE | Exports available chart rows as CSV. | Add column ordering, formatted values, and export permissions. |
| Widget export PNG | `DashboardPage.jsx`, `CardActions.jsx` | COMPLETE | Exports canvas/chart image when rendered. | Add error reporting for unsupported/offscreen nodes and consistent scaling. |
| Dashboard export PNG/JPG | `DashboardShareModal.jsx`, `dashboardShareUtils.js` | COMPLETE | Dashboard capture exports image from hidden export surface. | Add progress UI and test for large dashboards. |
| Export PDF | App-wide | MISSING | Power BI/Tableau style PDF export is unavailable. | Add PDF generation for dashboards/widgets with page size, orientation, and download/share options. |
| Export data package | App-wide | MISSING | No packaged export/import workflow. | Add dashboard/chart JSON export and safe import validation. |
| Import | App-wide | MISSING | No CSV, JSON, dashboard, or dataset import flow. | Add import entry points, validation, preview, and persistence. |
| Dashboard share link | `DashboardShareModal.jsx`, `DashboardPublicPage.jsx`, store share links | PARTIAL | Share/embed links work only against local store share records. | Implement server-created share records, access controls, expiry, revocation, analytics, and public data loading. |
| Legacy sheet share route | `/share/:sheetId`, `SharePage.jsx` | PARTIAL | Read-only sheet share can render local share records, but is separate from dashboard share flow. | Consolidate share models and clarify whether sheet sharing remains supported. |
| Embed iframe code | `DashboardShareModal.jsx`, `DashboardPublicPage.jsx` | PARTIAL | Iframe code generation works locally with share ID validation against local state. | Back it with public endpoint, CSP/embed policy, access checks, and token lifecycle. |
| Dashboard public viewer | `DashboardPublicPage.jsx` | PARTIAL | View/embed render read-only dashboard from local app state. | Add backend public fetch by token and harden no-auth data exposure. |
| Share copy-to-clipboard | `DashboardShareModal.jsx` | COMPLETE | Clipboard copy uses modern API with fallback. | Replace legacy `execCommand` fallback eventually. |
| Global filters ribbon | `DashboardPage.jsx` | PLACEHOLDER | Date/Department/Region/Year controls update local UI state only; charts are not filtered. | Connect filters to query execution, chart config/data filtering, and dashboard refresh lifecycle. |
| Active filter chips | `DashboardPage.jsx` | PLACEHOLDER | Chips reflect local UI values but do not affect data. | Wire chips to real filter model and removable chips. |
| Clear filters | `DashboardPage.jsx` | PLACEHOLDER | Clears local UI filter values only. | Clear persisted/global data filters and re-query visuals. |
| Filter presets | `DashboardPage.jsx`, store also has `filterPresets` | PARTIAL | Dashboard page has local preset state; store has a separate filter preset model not used by the new ribbon. | Unify dashboard filter presets with store/backend persistence and apply presets to chart data. |
| Store-level filters | `useStore.js` | PARTIAL | Generic filters and presets exist in store, but current dashboard uses separate local `globalFilters`. | Consolidate into one authoritative filter model. |
| Cross-filtering | `SidebarRight.jsx` | PLACEHOLDER | Inspector presents cross-filter toggles as visual previews only. | Add chart click events, filter propagation, selected data points, and clear interaction state. |
| Drilldown | `SidebarRight.jsx`, fullscreen props | PLACEHOLDER | Inspector shows drilldown option; no connected drilldown hierarchy or click behavior found. | Add drilldown field hierarchy, chart event handlers, breadcrumb state, and query updates. |
| Dashboard interactions/actions | `SidebarRight.jsx` | PLACEHOLDER | Interactions tab describes actions but has no functional controls. | Implement interaction model for drilldown, filter, links/actions, and visual-to-visual behavior. |
| Refresh dashboard | `DashboardPage.jsx` | PARTIAL | Refresh action appears to notify/re-render local state; no data re-fetch in mock mode. | Wire refresh to dataset/chart query reload and backend invalidation. |
| Widget library | `SidebarRight.jsx` | PLACEHOLDER | Library cards and search exist, but items do not create widgets from the panel. | Add drag/add behavior for chart, KPI, table, text, image, filter, divider widgets. |
| Widget library search | `SidebarRight.jsx` | COMPLETE | Search filters visible library cards. | Pair with functional add/drag behavior. |
| Inspector: Properties tab | `SidebarRight.jsx` | PARTIAL | Shows selected widget metadata and can select/remove widgets through callbacks. Most property controls are preview-only. | Wire title, description, visibility, layout fields to widget state with persistence. |
| Inspector: Visual tab | `SidebarRight.jsx` | PLACEHOLDER | Color/typography/legend/axis controls are static preview toggles. | Connect settings to selected chart config and rerender/save. |
| Inspector: Data tab | `SidebarRight.jsx` | PLACEHOLDER | Field/mapping information is read-only and not editable. | Add editable field mappings, dataset source info, measures/dimensions management. |
| Inspector: Interactions tab | `SidebarRight.jsx` | PLACEHOLDER | Drilldown/filter/cross-filter controls are UI-only. | Implement interaction settings and chart event handling. |
| Inspector collapsible behavior | `DashboardPage.jsx`, `SidebarRight.jsx` | COMPLETE | Panel can be collapsed in the dashboard layout. | Add persisted width/resizable behavior if required. |
| Inspector resizable width | `SidebarRight.jsx` | MISSING | Required default/resizable width behavior is not implemented functionally. | Add resize handle, min/max width, persistence, and responsive fallbacks. |
| Chart builder load | `useChartBuilder.js`, `chartApi.js` | COMPLETE | Loads dataset, schema, templates, and editing chart state. | Production needs backend parity for endpoints. |
| Chart builder draft persistence | `useChartBuilder.js`, `storage.js` | COMPLETE | Drafts are saved/restored locally for matching context. | Add draft expiration or server drafts for collaboration. |
| Chart type gallery | `ChartTypePicker.jsx`, `chartTemplates.js` | COMPLETE | Chart.js template gallery supports bar, line, area, pie/doughnut, polar, radar, scatter, bubble, mixed. | Add missing enterprise visual types if required. |
| Table chart type | `ChartTypePicker.jsx`, `chartTemplates.js`, `ChartRenderer.jsx` | MISSING | UI icon map includes table, but actual Chart.js templates do not include table. | Add table visual template and renderer with sorting/pagination/density. |
| KPI chart type | `ChartRenderer.jsx`, `KPIWidget.jsx` | PARTIAL | KPI renderer exists, but builder template catalog does not expose a KPI template. | Add KPI builder template, mapping roles, and dashboard KPI widget flow. |
| Heatmap chart type | `ChartTypePicker.jsx`, chart catalog families | MISSING | UI icon map references heatmap, but builder templates do not implement heatmap. | Add heatmap template and renderer or hide unsupported type. |
| Advanced chart catalog families | `src/utils/chartFamilies/*`, `chartCatalog.js` | PARTIAL | Metadata catalog includes many support levels, but builder uses `chartJsTemplates`. | Decide supported catalog surface and implement renderers for advertised families. |
| Field search | `FieldList.jsx` | COMPLETE | Field/table search works in builder explorer. | Add large-schema indexing if needed. |
| Field drag/drop mapping | `FieldList.jsx`, `DropZone.jsx`, `ChartMappingPanel.jsx` | COMPLETE | Fields can be dragged into compatible roles and removed. | Add accessible keyboard mapping controls. |
| Field compatibility validation | `chartCompatibility.js`, `useChartBuilder.js` | COMPLETE | Roles validate against schema field types. | Add richer validation for data shape/cardinality. |
| Visual query mode | `useChartBuilder.js`, `mockSqlEngine.js` | COMPLETE | Visual mappings generate SQL in mock mode. | Backend SQL preview required in production. |
| SQL mode | `QueryModePanel.jsx`, `mockSqlEngine.js` | PARTIAL | SQL can run in mock mode for supported SELECT patterns. | Implement real query execution, permissions, limits, parameterization, and query history. |
| SQL parser capability | `mockSqlEngine.js` | PARTIAL | Supports a limited SELECT syntax in mock mode. | Treat as demo-only or replace with backend SQL engine. |
| Chart preview | `ChartPreviewPanel.jsx`, `ChartRenderer.jsx` | COMPLETE | Valid mappings produce preview configs and render. | Add loading skeleton for long backend queries. |
| Chart save/create | `ChartSavePanel.jsx`, `useChartBuilder.js`, `chartApi.createChart` | COMPLETE | Saves chart locally and attaches it to dashboard. | Backend persistence required for production. |
| Chart update/edit | `useChartBuilder.js`, `chartApi.updateChart` | COMPLETE | Editing chart ID updates existing saved chart. | Add conflict handling and rollback if backend save fails. |
| Chart save metadata fields | `ChartSavePanel.jsx` | PLACEHOLDER | Description, folder, and tags are read-only display values. | Make fields editable and persist name, description, folder, tags, ownership, and lineage. |
| Chart recommendations | `BuilderPage.jsx` | PLACEHOLDER | Recommendations are static guidance cards. | Add real recommendations based on schema, selected fields, and chart compatibility. |
| Builder Analytics tab | `BuilderPage.jsx` | PLACEHOLDER | Trend, Target, Threshold, Forecast, Reference Line cards are preview-only. | Implement analytics overlays and settings persisted into chart config. |
| Builder cancel/back | `BuilderPage.jsx` | COMPLETE | Returns to dashboard context without saving. | Add unsaved-change confirmation. |
| Dataset modal | `DatasetExplorerModal.jsx` | PARTIAL | Modal shows active mock dataset, searchable fields, and sample rows. | Replace mock-only cards with real dataset catalog and selectable dataset state. |
| Dataset card selection | `DatasetExplorerModal.jsx` | PLACEHOLDER | Planned datasets are displayed as placeholders and cannot be selected. | Implement dataset selection, connect to builder/dashboard, and handle unavailable sources. |
| Dataset preview | `DatasetExplorerModal.jsx` | PARTIAL | Shows first five rows/four columns of mock data only. | Add full preview table with pagination, sorting, column resize, filtering, and loading/error states. |
| Dataset schema explorer | `FieldList.jsx`, `DatasetExplorerModal.jsx` | PARTIAL | Builder schema explorer works for mock schema; modal schema is mock-only. | Add backend schema discovery, multiple datasets/tables, refresh, and metadata. |
| Dataset import/upload | App-wide | MISSING | No file/data import workflow exists. | Add CSV/Excel/JSON upload, database connectors, mapping, validation, and persistence. |
| Dataset browsing page | App-wide | MISSING | No catalog page exists. | Add Datasets route with search, metadata panel, schema explorer, and preview. |
| Data tables | App-wide | MISSING | No reusable enterprise table feature with sticky header/density/pagination/sorting/resize is implemented for app data. | Build table component and wire it into dataset previews, chart libraries, and table visual widgets. |
| Modal consistency | Multiple components | PARTIAL | Create project, rename widget, dataset explorer, share, command palette exist and function. | Add focus trapping, consistent footer actions, and missing modal flows for import/export/settings. |
| Create project modal | `CreateProjectModal.jsx`, `HomePage.jsx` | COMPLETE | Creates projects through project API/store. | Add backend validation. |
| Rename widget modal | `DashboardPage.jsx` | COMPLETE | Saves title override. | Add accessible focus trap and undo if needed. |
| Command palette | `AppHeader.jsx`, `DashboardPage.jsx`, `CommandPaletteModal.jsx` | PARTIAL | Ctrl+K opens searchable commands; navigation/template actions work; dataset explorer command is custom-handled. | Make palette global, add all commands, action availability, command IDs, and keyboard shortcuts beyond palette search. |
| Global search | `AppHeader.jsx` | PLACEHOLDER | Header search opens command palette but does not search dashboards/charts/datasets directly. | Implement global indexed search results with navigation and previews. |
| Search in Dashboard | Command palette/filter UI | PARTIAL | Command palette and widget library search exist; no dashboard object search. | Add dashboard/widget/chart search and quick jump. |
| Keyboard shortcuts | `AppHeader.jsx`, `DashboardPage.jsx` | PARTIAL | Ctrl/Cmd+K works. Displayed D/C shortcut hints are not global hotkeys. | Add shortcut registry, settings/help modal, and keyboard navigation for dashboard/builder actions. |
| Theme toggle | `AppHeader.jsx`, store | COMPLETE | Light/dark toggling persists locally. | Add user/workspace setting persistence for production. |
| Language/locale | Store `locale`, i18n utility | PARTIAL | Locale state and some Thai labels exist, but language switcher is not broadly exposed/complete. | Add settings UI and complete translations. |
| Favorites | `SidebarRight.jsx`, Home counts | PARTIAL | Dashboard favorites state exists locally in DashboardPage and inspector; project favorites count references `isFavorite` but no project favorite action found. | Add real favorite model across projects/dashboards/charts and expose routes. |
| Recent items | Store `recentProjectIds`, Dashboard local recent dashboards | PARTIAL | Recent projects are tracked; dashboard recent is local component state. | Persist and expose recent dashboards/charts/activity globally. |
| Settings | Sidebar | MISSING | No settings page or forms exist. | Build settings areas for user, workspace, data, sharing, theme, keyboard shortcuts. |
| Notifications/toasts | `DashboardNotice` | PARTIAL | Dashboard has local notice system. | Add app-wide notification/toast service and error reporting. |
| Loading states | `RouteFallback`, builder loading, share loading | PARTIAL | Some routes/panels show loading states. | Add skeletons for datasets, dashboard reload, chart query execution, table preview, and public sharing. |
| Error states | Builder, Chart renderer, Share pages | PARTIAL | Several local error states exist. | Add consistent app-wide error boundaries, retry actions, and backend error messages. |
| Responsive layout | CSS/layout components, DashboardGrid | PARTIAL | Responsive shells and grid behavior exist, but complex BI panels are not fully workflow-optimized on mobile. | Test all pages, add mobile-specific builder/dashboard workflows, panel drawers, and touch controls. |
| Accessibility: keyboard/focus | Multiple components | PARTIAL | Basic labels and roles exist; some custom modals lack full focus trap and complete ARIA/tab handling. | Add modal focus traps, roving tabs where needed, visible focus review, and keyboard alternatives for drag/drop. |
| API production mode | `client.js`, `chartApi.js`, `projectApi.js`, `dashboardApi.js`, `authApi.js` | PARTIAL | API clients support non-mock endpoints, but app defaults to mock and assumes endpoint contract availability. | Define backend contract, add environment setup, robust errors, and endpoint parity. |
| Local persistence | `storage.js`, store | COMPLETE | Workspace, builder drafts, share links, filters, theme persist locally. | Add migrations/versioning tests and backend sync when production mode is active. |
| Collaboration/multi-user | App-wide | MISSING | No comments, presence, permissions, or server sync are present. | Add workspace roles, locking/conflicts, audit log, sharing permissions, and collaboration indicators. |

## Power BI Style Capability Summary

| Capability | Status | Notes |
|---|---:|---|
| Dashboard authoring | PARTIAL | Strong local canvas authoring, but production persistence, filter wiring, and interactions are incomplete. |
| Widget management | PARTIAL | Add/rename/edit/duplicate/remove/export works for saved charts; widget library and non-chart widgets are placeholders. |
| Chart creation | COMPLETE | Works with mock dataset and Chart.js templates. |
| Chart editing | COMPLETE | Existing charts open in Builder and can be updated. |
| Chart duplication | COMPLETE | Duplicates chart records and layout items locally. |
| Chart templates | PARTIAL | Builder templates exist for Chart.js families; marketplace/gallery and advertised advanced types are incomplete. |
| Dataset browsing | PARTIAL | Mock dataset explorer exists; no real dataset catalog. |
| Dataset preview | PARTIAL | Static mock preview only. |
| Field search | COMPLETE | Builder and dataset modal field search work. |
| Export PNG | COMPLETE | Widget/dashboard image export exists. |
| Export PDF | MISSING | Not implemented. |
| Export CSV | COMPLETE | Widget CSV export exists. |
| Saved views | MISSING | No saved dashboard views/bookmarks. |
| Filter presets | PARTIAL | UI/local/store pieces exist but are not unified or data-connected. |
| Global filters | PLACEHOLDER | Controls do not filter chart data. |
| Cross filtering | PLACEHOLDER | Inspector previews only. |
| Drilldown | PLACEHOLDER | No functional hierarchy/click-through behavior. |
| Fullscreen mode | COMPLETE | Widget fullscreen modal works. |
| Responsive mode | PARTIAL | Responsive UI exists; dedicated responsive authoring/view mode is incomplete. |
| Keyboard shortcuts | PARTIAL | Ctrl/Cmd+K palette exists; full shortcut system missing. |

## Highest Risk Functional Gaps

1. Global filter UI is visible but does not affect chart data.
2. Dataset and template library navigation is exposed but routes are missing or demo-scoped.
3. Public sharing and embed links depend on local store share records, not durable server records.
4. Inspector Visual/Data/Interactions tabs look like controls but mostly do not mutate widget/chart behavior.
5. Advanced BI capabilities like drilldown, cross-filtering, analytics overlays, PDF export, saved views, and table widgets are missing or placeholders.
6. The application defaults to mock API/data mode, so production completeness depends on backend endpoint parity that is not demonstrated in the frontend.

