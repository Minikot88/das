# Component Map

Status: pre-implementation component analysis. No component code was modified.

Scope: pages, layout, UI primitives, dashboard components, chart components, builder components, BI modals, and data utilities that directly affect screens.

## Product Area Map

| Product Area | Primary Components | Supporting Components / Utilities | Complexity | UI Notes |
| --- | --- | --- | --- | --- |
| Home | `HomePage`, `ProjectCard`, `CreateProjectModal` | `PageContainer`, `PageHeader`, `Toolbar`, `Panel`, `SectionHeader`, `Badge`, `Button`, `EmptyState`, `TEMPLATE_GALLERY_CATALOG` | Medium | Current Home already approximates the requested workspace hub but uses custom card variants and embedded template/activity sections. |
| Dashboard | `DashboardPage`, `DashboardGrid`, `ChartCard`, `SidebarRight` | `ChartPicker`, `DashboardShareModal`, `DashboardFullscreenModal`, `CommandPaletteModal`, `DatasetExplorerModal`, `useDashboard`, `dashboardWorkspace`, `dashboardShareUtils`, `layoutUtils` | Very High | Highest-risk UI area because visual changes sit near grid layout, widget state, sharing, and filter interactions. |
| Builder | `BuilderPage`, `ChartTypePicker`, `ChartMappingPanel`, `DropZone`, `FieldList`, `ChartPreviewPanel`, `QueryModePanel`, `ChartSettingsPanel`, `ChartSavePanel` | `useChartBuilder`, `chartTemplates`, `chartCatalog`, `chartCompatibility`, `chartFactory`, `mockSqlEngine`, `normalizeChartConfig` | Very High | Needs professional BI builder redesign while preserving drag/drop, query, validation, preview, and save behavior. |
| Dataset | `DatasetExplorerModal` | `mockData`, `mockSchema`, app header command actions | High | Currently modal-only. Has catalog/schema/table-preview responsibilities but no route. |
| Template | Home template cards, command palette template actions | `TEMPLATE_GALLERY_CATALOG`, `createBuilderContextForDashboard` | Medium | Current template gallery is a Home section, not a marketplace page. |
| Settings/Auth | `LoginPage`, `RegisterPage`, theme toggle, project switcher, disabled settings nav | `authApi`, `useStore`, `AppHeader`, `SidebarLeft` | Medium | No real settings page exists; auth pages are visual outliers. |

## Layout and Shell Components

| Component | File | Used By | Current Responsibility | Redesign Complexity |
| --- | --- | --- | --- | --- |
| `App` | `src/App.jsx` | Root | Wraps `AppRoutes` in `BrowserRouter`. | Low |
| `AppRoutes` | `src/app/AppRoutes.jsx` | Root | Defines route tree, route guard, lazy route fallback. | Low for visual, high if routing changes |
| `MainLayout` | `src/components/layout/Layout.jsx` | Protected routes | App shell, header, sidebars, main region, route body classes. | High |
| `PageContainer` | `src/components/layout/Layout.jsx` | Pages | Shared page wrapper. | Low |
| `PageHeader` | `src/components/layout/Layout.jsx` | Pages | Shared page heading/action structure. | Medium |
| `Toolbar` | `src/components/layout/Layout.jsx` | Pages | Shared action/status row. | Medium |
| `InspectorLayout` | `src/components/layout/Layout.jsx` | Potential/right panels | Generic inspector aside wrapper. | Medium |
| `WorkspaceLayout` | `src/components/layout/Layout.jsx` | Potential workspace pages | Two/three-column layout helper. | Medium |
| `AppHeader` | `src/layout/AppHeader.jsx` | `MainLayout` | Top app bar, search, command palette, dataset modal trigger, project switcher, theme, user. | High |
| `SidebarLeft` | `src/layout/SidebarLeft.jsx` | `MainLayout` | Primary nav, workspace context, disabled placeholders. | High |
| `SidebarRight` | `src/layout/SidebarRight.jsx`, `DashboardPage.jsx` | Home shell and Dashboard | Workspace overview, stats, selected widget, widget library. | High |

## UI Primitives

| Component | File | Current Usage | Redesign Need |
| --- | --- | --- | --- |
| `Button` | `src/components/ui/Button.jsx` | Some Home/page actions | Expand adoption; many screens bypass with custom classes. |
| `Input` | `src/components/ui/Input.jsx` | Limited | Expand visual alignment; many forms use raw inputs. |
| `Panel` | `src/components/ui/Panel.jsx` | Home and layout sections | Align radius/shadow/border tokens. |
| `Badge` | `src/components/ui/Badge.jsx` | Home and status chips | Align semantic and neutral tones. |
| `EmptyState` | `src/components/ui/EmptyState.jsx` | Home and generic empty states | Upgrade to premium empty-state system. |
| `ProjectCard` | `src/components/ui/ProjectCard.jsx` | Home project grid | Convert to enterprise workspace card pattern. |
| `CreateProjectModal` | `src/components/ui/CreateProjectModal.jsx` | Home | Align to shared modal header/content/footer contract. |
| `SectionHeader` | `src/components/ui/SectionHeader.jsx` | Home sections | Align typography and action placement. |
| `ReadOnlyDashboardHeader` | `src/components/ui/ReadOnlyDashboardHeader.jsx` | Public views | Align public dashboard presentation. |
| `ReadOnlyChartFrame` | `src/components/ui/ReadOnlyChartFrame.jsx` | Share/public views | Align read-only chart cards. |
| `ReadOnlyStateCard` | `src/components/ui/ReadOnlyStateCard.jsx` | Public empty/error states | Align premium state pattern. |

## Dashboard Components

| Component / Local Unit | File | Current Responsibility | Complexity | Guardrail Notes |
| --- | --- | --- | --- | --- |
| `DashboardPage` | `src/pages/DashboardPage.jsx` | Dashboard workspace, filters, tabs, canvas, modals, command actions, share/export, inspector state. | Very High | Do not alter state, dashboard structure, filters, share behavior, routing, or chart data. |
| `DashboardNotice` | `src/pages/DashboardPage.jsx` | Toast/notice state. | Low | Visual styling only. |
| `RenameWidgetModal` | `src/pages/DashboardPage.jsx` | Widget rename dialog. | Medium | Do not change rename action behavior. |
| `WorkspaceTab` | `src/pages/DashboardPage.jsx` | Sheet/dashboard tab button and inline rename. | High | Inline edit behavior must remain identical. |
| `ContextMenu` | `src/pages/DashboardPage.jsx` | Dashboard/widget context menu. | Medium | Preserve actions and keyboard dismissal. |
| `EmptyCanvasState` | `src/pages/DashboardPage.jsx` | Dashboard empty state. | Medium | Can visually upgrade; actions must remain. |
| `DashboardGrid` | `src/components/dashboard/DashboardGrid.jsx` | `react-grid-layout` wrapper and widget cards. | Very High | Do not change saved layout coordinates or drag/resize behavior without approval. |
| `ChartCard` | `src/components/dashboard/ChartCard.jsx` | Widget card shell, title/meta/actions, renderer. | High | UI-only metadata/card cleanup is safe; renderer inputs must remain. |
| `CardActions` | `src/components/dashboard/CardActions.jsx` | Widget action menus. | Medium | Preserve action callbacks. |
| `ChartPicker` | `src/components/dashboard/ChartPicker.jsx` | Saved chart selection modal. | High | Selection behavior must remain. |
| `DashboardShareModal` | `src/components/dashboard/DashboardShareModal.jsx` | Share/export/embed tools. | High | Do not change generated URL/embed/export behavior. |
| `DashboardFullscreenModal` | `src/components/dashboard/DashboardFullscreenModal.jsx` | Fullscreen widget preview. | Medium | Visual shell only. |

## Chart Components and Utilities

| Component / Utility | File | Current Responsibility | Complexity | Redesign Notes |
| --- | --- | --- | --- | --- |
| `ChartRenderer` | `src/components/charts/ChartRenderer.jsx` | Chooses KPI, Chart.js, fallback/status renderers. | High | Palette and visual states can be styled; data mapping must not change. |
| `ChartJsRenderer` | `src/components/charts/ChartJsRenderer.jsx` | Canvas renderer and Chart.js lifecycle. | High | Avoid logic changes unless explicitly approved. |
| `KPIWidget` | `src/components/charts/KPIWidget.jsx` | KPI/stat visual widget. | Medium | High-impact UI target; preserve computed values and source data. |
| `ChartSkeleton` | `src/components/charts/ChartSkeleton.jsx` | Chart loading placeholder. | Low | Upgrade to skeleton system. |
| `ChartErrorBoundary` | `src/components/charts/ChartErrorBoundary.jsx` | Chart error fallback. | Low | Align with premium error-state pattern. |
| `chartPalette` | `src/utils/chartPalette.js` | Chart color palettes. | Medium | Align defaults carefully; changing saved chart settings may require approval. |
| `chartTheme` | `src/utils/chartTheme.js` | Chart theme options. | Medium | Visual-only defaults are possible, but renderer behavior must be tested. |
| `chartFactory` | `src/utils/chartFactory.js` | Builds chart configs and datasets. | Very High | Treat as logic. Avoid unless explicitly approved. |
| `chartCatalog` / `chartFamilies` | `src/utils/chartCatalog.js`, `src/utils/chartFamilies/*` | Chart metadata/catalog. | High | Do not change chart definitions unless approved. |

## Builder Components

| Component | File | Current Responsibility | Complexity | Guardrail Notes |
| --- | --- | --- | --- | --- |
| `BuilderPage` | `src/features/builder/BuilderPage.jsx` | Builder layout and panel composition. | Very High | Can visually rearrange only if behavior-neutral. |
| `FieldList` | `src/features/builder/FieldList.jsx` | Database/schema/table/field explorer tree. | High | Preserve drag source and expansion behavior. |
| `DropZone` | `src/features/builder/DropZone.jsx` | Mapping target/drop area. | High | Preserve drag/drop handlers. |
| `ChartTypePicker` | `src/features/builder/ChartTypePicker.jsx` | Visualization selection. | Medium | Card styling safe; selection behavior must remain. |
| `ChartMappingPanel` | `src/features/builder/ChartMappingPanel.jsx` | Field roles/mapping. | High | Preserve mapping callbacks. |
| `ChartPreviewPanel` | `src/features/builder/ChartPreviewPanel.jsx` | Preview and validation display. | Medium | Visual treatment safe. |
| `QueryModePanel` | `src/features/builder/QueryModePanel.jsx` | Visual/SQL query controls and result state. | High | Query behavior and SQL execution must remain. |
| `ChartSettingsPanel` | `src/features/builder/ChartSettingsPanel.jsx` | Formatting/settings controls. | High | Accordion behavior would require approval if new state is introduced. |
| `ChartSavePanel` | `src/features/builder/ChartSavePanel.jsx` | Save action and chart metadata. | Medium | Preserve save callbacks. |
| `useChartBuilder` | `src/features/builder/hooks/useChartBuilder.js` | Builder state, validation, preview config, save logic. | Very High | Logic-sensitive. Avoid for UI-only phases unless explicitly approved. |

## BI Modals and Overlays

| Component | File | Current Responsibility | Category | Complexity |
| --- | --- | --- | --- | --- |
| `CommandPaletteModal` | `src/components/bi/CommandPaletteModal.jsx` | Global command/action search. | Navigation, Dataset, Template | Medium |
| `DatasetExplorerModal` | `src/components/bi/DatasetExplorerModal.jsx` | Dataset catalog/schema/sample preview overlay. | Dataset | High |
| `CreateProjectModal` | `src/components/ui/CreateProjectModal.jsx` | Project creation. | Home | Medium |
| `DashboardShareModal` | `src/components/dashboard/DashboardShareModal.jsx` | Share/export/embed. | Dashboard | High |
| `DashboardFullscreenModal` | `src/components/dashboard/DashboardFullscreenModal.jsx` | Fullscreen chart preview. | Dashboard | Medium |
| `RenameWidgetModal` | `src/pages/DashboardPage.jsx` | Widget rename. | Dashboard | Medium |
| `ChartPicker` | `src/components/dashboard/ChartPicker.jsx` | Saved chart picker. | Dashboard | High |
| `ContextMenu` | `src/pages/DashboardPage.jsx` | Dashboard/widget right-click menu. | Dashboard | Medium |

## Tables, Forms, Filters, and Panels

| Surface | Current Components | Current Status | Transformation Risk |
| --- | --- | --- | --- |
| Tables | Dataset explorer sample/table-like preview, chart table wrapper, query result surfaces | No unified enterprise table component found. | High if adding sorting, pagination, density, or resize behavior. Styling-only is safe. |
| Forms | Auth forms, create project, rename widget, share/export settings, builder settings, filters, search | Multiple raw/custom form systems. | Medium; preserve validation and submit handlers. |
| Filters | Dashboard filter ribbon and presets | Local Dashboard UI state. | Medium; chips/clear-all/save preset visuals can be styled, new behavior needs approval. |
| Right panels | `SidebarRight`, builder settings/save panels, dashboard inspector | Multiple panel models. | High; tabbed/collapsible behavior may be stateful. |
| Empty states | `EmptyState`, `EmptyCanvasState`, read-only state cards, chart error/status | Fragmented visual language. | Low to Medium; visual alignment safe. |
| Loading states | `RouteFallback`, `ChartSkeleton`, loading buttons | Minimal shared skeleton system. | Low; styling safe. |

## Implementation Guardrails by Component Type

| Type | Safe UI Changes | Stop for Approval |
| --- | --- | --- |
| Page components | Class names, presentation-only markup grouping, headings/copy, spacing, visual hierarchy | Route changes, data flow changes, new stateful behavior |
| Layout components | Shell styling, spacing, focus states, responsive presentation | Route guard changes, navigation destination changes, sidebar state changes |
| Dashboard grid | Card chrome, empty state styling, visible focus/hover | Grid algorithm, widget coordinates, drag/resize behavior |
| Charts | Card shell, palette defaults, labels, loading/error visuals | Dataset transformation, calculations, chart factory behavior |
| Builder | Panel styling, card styling, labels, helper text | Hook changes, query mode, drag/drop behavior, save logic |
| Modals | Header/content/footer layout, radius/shadow, button hierarchy | Open/close lifecycle, transmitted data, generated links/export behavior |
| Tables | Styling existing tabular surfaces | New sorting/pagination/resize logic |
| Forms | Labels, helper text, validation visuals, spacing | Validation rules, submit handlers, API payloads |

## Recommended Phase Ownership

| Phase | Primary Component Owners |
| --- | --- |
| Phase 1: Design Tokens | CSS tokens, UI primitives, global component classes |
| Phase 2: Global Layout | `MainLayout`, `AppHeader`, `SidebarLeft`, `SidebarRight` |
| Phase 3: Navigation | `AppHeader`, `SidebarLeft`, `CommandPaletteModal` |
| Phase 4: Home | `HomePage`, `ProjectCard`, `CreateProjectModal`, `SectionHeader`, `Panel` |
| Phase 5: Dashboard Canvas | `DashboardPage`, `DashboardGrid`, `ChartCard`, `ChartPicker`, filter ribbon/tabs |
| Phase 6: Inspector | `SidebarRight`, dashboard inspector sections |
| Phase 7: Chart Builder | Builder feature components, builder CSS |
| Phase 8: Datasets | `DatasetExplorerModal` unless new route is approved |
| Phase 9: Templates | Home template gallery and command palette template actions unless new route is approved |
| Phase 10: Tables | Dataset/query/chart table-like surfaces |
| Phase 11: Forms | Auth, modals, builder settings, filters |
| Phase 12: Responsive | Home, Dashboard, Builder, public views, app shell |

## Summary

The current component architecture can support a phased enterprise BI transformation, but the scope must stay screen-by-screen and behavior-neutral. The most important precondition is visual-system ownership: shared tokens and component contracts should be established before broad route-specific cleanup.
