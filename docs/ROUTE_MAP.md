# Route Map

Status: pre-implementation route analysis. No routing code was modified.

Primary route source: `src/app/AppRoutes.jsx`

Router shell source: `src/App.jsx`

## Route Table

| Route | Protection | Layout | Component | Product Category | Current Purpose | Redesign Complexity |
| --- | --- | --- | --- | --- | --- | --- |
| `/login` | Public | Auth page only | `src/pages/LoginPage.jsx` | Settings/Auth | Login and demo credential entry. | Medium |
| `/register` | Public | Auth page only | `src/pages/RegisterPage.jsx` | Settings/Auth | Account creation form. | Medium |
| `/share/:sheetId` | Public | Read-only share layout | `src/pages/SharePage.jsx` | Dashboard | Public sheet/dashboard share view. | Medium |
| `/dashboard/:dashboardId/view` | Public | Read-only dashboard layout | `src/pages/DashboardPublicPage.jsx` | Dashboard | Public read-only dashboard view. | Medium |
| `/dashboard/:dashboardId/embed` | Public | Read-only dashboard layout | `src/pages/DashboardPublicPage.jsx` | Dashboard | Embeddable dashboard view. | Medium |
| `/` | Protected | `MainLayout` | `src/pages/HomePage.jsx` | Home, Template | Default authenticated workspace hub. | Medium |
| `/home` | Protected | `MainLayout` | `src/pages/HomePage.jsx` | Home, Template | Explicit workspace hub route. | Medium |
| `/dashboard` | Protected | `MainLayout` | `src/pages/DashboardPage.jsx` | Dashboard | Main dashboard canvas/editor/viewing surface. | Very High |
| `/builder` | Protected | `MainLayout` | `src/pages/Builder.jsx` -> `src/features/builder/BuilderPage.jsx` | Builder | Chart authoring workflow. | Very High |
| `*` | Public redirect | N/A | `Navigate to="/home"` | Home | Fallback route redirects to Home. | Low |

## Route Guards and Layout Behavior

| Mechanism | Source | Behavior | UX Impact |
| --- | --- | --- | --- |
| `ProtectedRoute` | `src/app/AppRoutes.jsx` | Redirects unauthenticated users to `/login`, preserving `location` in state. | Auth flow controls access to Home, Dashboard, and Builder. |
| `Suspense` fallback | `src/app/AppRoutes.jsx` | Shows `Loading workspace...` while lazy pages load. | Loading state is global but visually minimal. |
| `MainLayout` | `src/components/layout/Layout.jsx` | Wraps authenticated routes with app header, left sidebar, main content, and optional right sidebar. | Main shell defines navigation and workspace chrome. |
| Workspace route detection | `src/components/layout/Layout.jsx` | Treats `/dashboard` and `/builder` as workspace routes; hides the generic right sidebar for those routes. | Dashboard and Builder own their own dense workspace panels. |
| Builder body class | `src/components/layout/Layout.jsx` | Adds `builder-route-active` to `body` on `/builder`. | Builder route receives route-specific styling overrides. |

## Navigation Map

| Navigation Surface | Source | Destinations | Notes |
| --- | --- | --- | --- |
| Top app bar nav | `src/layout/AppHeader.jsx` | `/`, `/dashboard`, `/builder` | Duplicates core routes in the app header. |
| Left sidebar nav | `src/layout/SidebarLeft.jsx` | `/`, `/dashboard`, `/builder` | Also includes disabled placeholders for Templates, Datasets, Favorites, Recent, and Settings. |
| Auth links | `src/pages/LoginPage.jsx`, `src/pages/RegisterPage.jsx` | `/login`, `/register` | Switch between public auth routes. |
| Read-only links | `src/components/ui/ReadOnlyDashboardHeader.jsx`, `src/components/ui/ReadOnlyStateCard.jsx` | `/login` and configured fallback links | Public dashboard/share states can point back to sign-in or fallback actions. |
| Programmatic navigation | `HomePage.jsx`, `DashboardPage.jsx`, `BuilderPage.jsx`, `AppHeader.jsx` | Home, Dashboard, Builder, return contexts | Must be preserved during UI-only work. |

## Missing Requested Routes

The transformation brief mentions Dataset Pages, Template Pages, and Settings. These do not currently exist as standalone routes.

| Requested Area | Current Implementation | Current Route Exposure | Approval Needed for Standalone Route? |
| --- | --- | --- | --- |
| Dataset Pages | `DatasetExplorerModal` opened from app header/command palette. | Modal overlay only. | Yes |
| Template Pages | Template gallery embedded in Home; template actions in command palette. | `/home` only. | Yes |
| Settings | Disabled placeholder in sidebar; no page component. | None. | Yes |

## Route-to-Phase Mapping

| Phase | Current Routes / Surfaces | Route Change Required? | Notes |
| --- | --- | --- | --- |
| Phase 1: Design Tokens | Global CSS and primitives | No | Presentation foundation only. |
| Phase 2: Global Layout | `MainLayout`, app shell | No | Preserve route tree. |
| Phase 3: Navigation | App header and sidebar | No, if placeholders remain behavior-identical | Removing/adding destinations requires approval. |
| Phase 4: Home | `/`, `/home` | No | Can redesign current hub in place. |
| Phase 5: Dashboard Canvas | `/dashboard` | No | Must preserve grid, filters, share, and chart interactions. |
| Phase 6: Inspector | Dashboard right panel, generic right sidebar | No, if only visual | New panel state or tabs may require approval. |
| Phase 7: Chart Builder | `/builder` | No | Visual-only if mapping/query/save behavior remains intact. |
| Phase 8: Datasets | `DatasetExplorerModal` | Yes for page route | Modal redesign can happen without route change. |
| Phase 9: Templates | Home gallery and command palette templates | Yes for page route | Gallery redesign inside Home is safe. |
| Phase 10: Tables | Chart/table/query/dataset table-like surfaces | No, if styling only | Sorting/pagination/resize behavior requires approval if not already present. |
| Phase 11: Forms | Auth, modals, builder, filters | No | Styling/labels/helper text only. |
| Phase 12: Responsive | All routed surfaces | No | Must avoid changing layout logic or saved grid coordinates. |

## Route Risk Notes

- The brief's "Do not change routing behavior" conflicts with adding standalone Dataset, Template, or Settings pages. Those areas should be redesigned within existing surfaces unless the user explicitly approves new routes.
- `/dashboard/:dashboardId/view` and `/dashboard/:dashboardId/embed` share the same component. Any public dashboard redesign must test both modes.
- `/` and `/home` render the same Home component. Redesign work should verify both entry points.
- The fallback route redirects to `/home`; changing it would be a routing behavior change.
