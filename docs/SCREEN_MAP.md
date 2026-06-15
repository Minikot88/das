# Screen Map

Status: pre-implementation inventory. No page code was modified.

Local capture target: `http://127.0.0.1:5187`

Screenshot inventory folder: `docs/screenshots-inventory`

## Screenshot Inventory

| ID | Route / Surface | File | Category | Viewport | Notes |
| --- | --- | --- | --- | --- | --- |
| `login-desktop` | `/login` | `docs/screenshots-inventory/01-login-desktop.png` | Settings/Auth | Desktop | Unauthenticated login route. |
| `register-desktop` | `/register` | `docs/screenshots-inventory/02-register-desktop.png` | Settings/Auth | Desktop | Unauthenticated account creation route. |
| `dashboard-after-login` | `/dashboard` | `docs/screenshots-inventory/03-dashboard-after-login.png` | Dashboard | Desktop | Default post-login destination. |
| `home-desktop` | `/home` | `docs/screenshots-inventory/04-home-desktop.png` | Home, Template | Desktop | Executive workspace hub with project cards, KPI summary, template gallery, and activity. |
| `builder-desktop` | `/builder` | `docs/screenshots-inventory/05-builder-desktop.png` | Builder | Desktop | Professional chart builder route with explorer, mapping, preview, settings, and save areas. |
| `dashboard-desktop` | `/dashboard` | `docs/screenshots-inventory/06-dashboard-desktop.png` | Dashboard | Desktop | Dashboard canvas, filter ribbon, tabs, empty canvas, and inspector. |
| `share-missing` | `/share/missing-share-id` | `docs/screenshots-inventory/09-share-missing.png` | Dashboard | Desktop | Public share route empty/error state. |
| `dashboard-public-view` | `/dashboard/dash-1/view` | `docs/screenshots-inventory/10-dashboard-public-view.png` | Dashboard | Desktop | Public read-only dashboard route. |
| `dashboard-public-embed` | `/dashboard/dash-1/embed` | `docs/screenshots-inventory/11-dashboard-public-embed.png` | Dashboard | Desktop | Embeddable dashboard route. |
| `home-mobile` | `/home` | `docs/screenshots-inventory/12-home-mobile.png` | Home, Template | Mobile 390x844 | Mobile workspace hub capture. |
| `dashboard-mobile` | `/dashboard` | `docs/screenshots-inventory/13-dashboard-mobile.png` | Dashboard | Mobile 390x844 | Mobile dashboard canvas capture. |

## Screen Category Map

| Product Category | Current Screen / Surface | Current Route | Primary Source Files | Redesign Complexity | Notes |
| --- | --- | --- | --- | --- | --- |
| Home | Executive Workspace Hub | `/`, `/home` | `src/pages/HomePage.jsx`, `src/components/ui/ProjectCard.jsx`, `src/components/ui/CreateProjectModal.jsx`, `src/data/templateGalleryCatalog.js` | Medium | Already contains KPI overview, project cards, template gallery, recent activity, and quick actions. Needs global token alignment and card cleanup. |
| Dashboard | Dashboard Canvas | `/dashboard` | `src/pages/DashboardPage.jsx`, `src/components/dashboard/DashboardGrid.jsx`, `src/components/dashboard/ChartCard.jsx`, `src/layout/SidebarRight.jsx` | Very High | Largest screen. Contains command bar, filter ribbon, tabs, grid canvas, empty state, share/export, fullscreen, chart picker, context menu, and inspector. |
| Builder | Chart Builder | `/builder` | `src/pages/Builder.jsx`, `src/features/builder/BuilderPage.jsx`, builder feature panels | Very High | Complex authoring surface with explorer, visualization selector, fields/mapping, SQL/query mode, formatting/settings, preview, and save. |
| Dataset | Dataset Explorer Modal | Global modal, opened from app header/command palette | `src/components/bi/DatasetExplorerModal.jsx`, `src/data/mockData.js`, `src/data/mockSchema.js` | High | Not a standalone route today. Maps to requested Dataset Pages scope but currently implemented as a modal/catalog surface. |
| Template | Template Gallery | `/home`, command palette actions | `src/pages/HomePage.jsx`, `src/data/templateGalleryCatalog.js`, `src/layout/AppHeader.jsx` | Medium | Not a standalone route today. Existing gallery is embedded on Home and template actions can prefill Builder. |
| Settings | Auth, theme, disabled Settings nav placeholder | `/login`, `/register`, shell controls | `src/pages/LoginPage.jsx`, `src/pages/RegisterPage.jsx`, `src/layout/SidebarLeft.jsx`, `src/layout/AppHeader.jsx` | Medium | No real settings route today. Current settings-like surfaces are auth, theme toggle, locale state, project switcher, and a disabled nav item. |

## Screens and States

### Home

Current surfaces:

- Executive command-center hero.
- KPI summary cards: total projects, dashboards, recent activity, favorites.
- Project card grid with active project and create project card.
- Template library gallery.
- Recent activity cards.
- Create project modal.
- Empty state when no projects exist.

Primary redesign risks:

- Home uses custom project-card/template/activity card classes that should be reconciled with global card tokens.
- Template gallery is currently embedded in Home, so creating a separate Template route would require routing approval.

Complexity: Medium.

### Dashboard

Current surfaces:

- App shell with left navigation and top app bar.
- Dashboard workspace header and toolbar.
- Global filter ribbon with preset controls.
- Sheet and dashboard tab rows.
- Canvas with `react-grid-layout`.
- Empty canvas state.
- Right inspector/properties panel.
- Chart picker modal.
- Share/export modal.
- Fullscreen chart modal.
- Rename widget modal.
- Context menu.
- Command palette and dataset explorer modal entry points.

Primary redesign risks:

- Grid layout and widget positions are behavior-sensitive and must not be changed without approval.
- Inspector collapse exists locally in Dashboard, but broader tabbed Properties/Visual/Data/Interaction panel behavior may require state changes if expanded beyond styling.
- Filters are currently local UI state in `DashboardPage.jsx`; saved presets and clear-all behavior must remain behavior-identical unless approved.

Complexity: Very High.

### Builder

Current surfaces:

- Page header.
- Data explorer tree.
- Chart type picker.
- Mapping panel/drop zones.
- Preview panel.
- Query mode panel.
- Chart settings panel.
- Save panel.
- Builder draft/navigation context.

Primary redesign risks:

- Drag/drop mapping, chart validation, query mode, and save behavior are logic-sensitive.
- Accordion settings can be styled visually, but adding open/closed behavior would require state changes and approval.

Complexity: Very High.

### Dataset

Current surfaces:

- Dataset explorer modal.
- Dataset cards.
- Schema/field list.
- Sample data/table preview area.
- Metadata summary.

Primary redesign risks:

- A full Dataset Page does not exist as a route.
- Turning the modal into a routed data catalog would change routing behavior and requires explicit approval.

Complexity: High.

### Template

Current surfaces:

- Home template gallery.
- Template entries in command palette.
- Builder prefill context for template selection.

Primary redesign risks:

- Marketplace-style gallery can be improved inside Home today.
- A standalone marketplace route would change routing behavior and requires explicit approval.

Complexity: Medium.

### Settings

Current surfaces:

- Disabled Settings nav placeholder.
- App header theme toggle.
- Project switcher.
- Login and register routes.

Primary redesign risks:

- No active settings page exists.
- Adding a route or settings state would require approval.

Complexity: Medium.

## Redesign Complexity Summary

| Category | Complexity | Reason |
| --- | --- | --- |
| Home | Medium | Mostly presentation work; logic already supports the requested hub structure. |
| Dashboard | Very High | Large interactive surface with grid, filters, modals, sharing, tabs, and inspector. |
| Builder | Very High | Authoring workflow depends on hooks, drag/drop, query mode, chart validation, and save logic. |
| Dataset | High | Current implementation is modal-only; page transformation would need routing approval. |
| Template | Medium | Existing gallery can be redesigned; standalone marketplace route needs approval. |
| Settings | Medium | Placeholder only; real settings page is out of current routing scope. |

## Screenshot Notes

- Screenshots were captured through the existing UI using mock login credentials.
- The app was running locally on port `5187` because earlier Vite ports were occupied.
- Protected route captures were taken after authenticating through the current login form.
- No screenshots imply approval to change routing, data flow, or state behavior.
