# Component Architecture

## Component Layers

DashboardMiniBi uses four broad component layers:

1. Layout components.
2. Page components.
3. Domain components.
4. UI primitives.

## Layout Components

Files:
- `src/components/layout/Layout.jsx`
- `src/layout/AppHeader.jsx`
- `src/layout/SidebarLeft.jsx`
- `src/layout/SidebarRight.jsx`

Responsibilities:
- Page shell.
- Navigation.
- Workspace context.
- Theme and density body classes.
- Command palette and dataset explorer entry points.
- Storage health alert.

## Page Components

Files:
- `src/pages/HomePage.jsx`
- `src/pages/DashboardPage.jsx`
- `src/pages/Builder.jsx`
- `src/pages/DatasetsPage.jsx`
- `src/pages/SettingsPage.jsx`
- `src/pages/DashboardPublicPage.jsx`
- `src/pages/SharePage.jsx`
- `src/pages/LoginPage.jsx`
- `src/pages/RegisterPage.jsx`

Responsibilities:
- Route-level composition.
- Store selection.
- User workflow orchestration.
- Passing data to domain components.

## Dashboard Components

Files:
- `src/components/dashboard/DashboardGrid.jsx`
- `src/components/dashboard/ChartCard.jsx`
- `src/components/dashboard/CardActions.jsx`
- `src/components/dashboard/ChartPicker.jsx`
- `src/components/dashboard/DashboardShareModal.jsx`
- `src/components/dashboard/DashboardFullscreenModal.jsx`

Responsibilities:
- Canvas grid.
- Widget rendering.
- Widget action menus.
- Chart selection.
- Share/export modal.
- Fullscreen visual view.

## Builder Components

Files:
- `src/features/builder/BuilderPage.jsx`
- `src/features/builder/hooks/useChartBuilder.js`
- `src/features/builder/FieldList.jsx`
- `src/features/builder/ChartTypePicker.jsx`
- `src/features/builder/ChartMappingPanel.jsx`
- `src/features/builder/ChartSettingsPanel.jsx`
- `src/features/builder/ChartPreviewPanel.jsx`
- `src/features/builder/ChartSavePanel.jsx`
- `src/features/builder/QueryModePanel.jsx`
- `src/features/builder/DropZone.jsx`

Responsibilities:
- Dataset/schema exploration.
- Visual chart type selection.
- Field mapping.
- SQL query preview.
- Chart settings.
- Preview rendering.
- Chart save/update.

## Chart Components

Files:
- `src/components/charts/ChartRenderer.jsx`
- `src/components/charts/ChartJsRenderer.jsx`
- `src/components/charts/KPIWidget.jsx`
- `src/components/charts/ChartSkeleton.jsx`
- `src/components/charts/ChartErrorBoundary.jsx`

Responsibilities:
- Convert chart model/config into rendered visuals.
- Manage Chart.js canvas lifecycle.
- Provide fallback render states.
- Provide chart accessibility summaries through `ChartCard`.

## BI Utility Modals

Files:
- `src/components/bi/CommandPaletteModal.jsx`
- `src/components/bi/DatasetExplorerModal.jsx`

Responsibilities:
- Command search.
- Dataset schema/sample inspection.
- Focus-trapped dialog behavior.

## UI Primitives

Files:
- `src/components/ui/Button.jsx`
- `src/components/ui/Input.jsx`
- `src/components/ui/Panel.jsx`
- `src/components/ui/Badge.jsx`
- `src/components/ui/EmptyState.jsx`
- `src/components/ui/ProjectCard.jsx`
- `src/components/ui/EnterpriseDataTable.jsx`
- `src/components/ui/CreateProjectModal.jsx`

Responsibilities:
- Shared surface patterns.
- Form controls.
- Reusable data table.
- Common empty/modal/card patterns.

## Cross-Cutting Hooks

- `src/hooks/useFocusTrap.js`: dialog focus management and return focus.
- `src/features/dashboard/hooks/useDashboard.js`: dashboard widget loading.
- `src/features/builder/hooks/useChartBuilder.js`: builder state machine.
