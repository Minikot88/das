# UI/UX Audit

Audit date: 2026-06-13  
Project: Dashboard Mini BI  
Scope: Analysis only. No application code was modified.

## 1. Current Design Analysis

### Frontend Architecture

- The application is a React 19 + Vite single page application.
- Routing is centralized in `src/app/AppRoutes.jsx` with lazy-loaded pages and protected routes.
- Primary app routes are:
  - `/home` and `/` for the workspace home.
  - `/dashboard` for the dashboard workspace.
  - `/builder` for chart creation and editing.
  - `/share/:sheetId`, `/dashboard/:dashboardId/view`, and `/dashboard/:dashboardId/embed` for read-only views.
- Global state is handled with Zustand in `src/store/useStore.js`.
- Chart rendering is driven through `ChartRenderer`, `ChartJsRenderer`, chart factory utilities, and chart family/template utilities.
- Dashboard layout uses `react-grid-layout` with responsive breakpoints and chart constraints from `src/utils/layoutUtils.js`.
- Styling is CSS-first with a large layered stylesheet import chain in `src/styles.css`.

### Layout Structure

- `MainLayout` creates a sticky top app bar, left navigation rail, central content area, and a conditional right sidebar.
- Dashboard and builder routes opt into workspace-specific shell classes.
- The dashboard route uses a two-column workspace: main dashboard canvas plus a sticky right inspector rail.
- The builder route uses a three-column workbench: field list, chart mapping/preview/query panels, and settings/save panel.
- The home route uses command-center panels, project cards, KPI-style workspace stats, activity feed, and template gallery.

### Component System

- Shared UI primitives exist for `Button`, `Badge`, `Panel`, `Input`, `EmptyState`, `ProjectCard`, and read-only dashboard pieces.
- Layout primitives exist for `PageContainer`, `PageHeader`, `Toolbar`, `InspectorLayout`, and `WorkspaceLayout`.
- Dashboard components include `DashboardGrid`, `ChartCard`, `CardActions`, `ChartPicker`, share modal, and fullscreen modal.
- Builder components include chart type picker, mapping panel, query mode panel, preview panel, settings panel, save panel, field list, and drop zones.
- There is a good base for a design system, but the implementation is currently split across many overlapping CSS files.

### Dashboard Widgets

- Widgets are rendered as `ChartCard` instances inside a responsive grid.
- Cards support loading, chart metadata, export actions, edit/fullscreen actions, selected state, compact/tiny sizing, and no-header modes.
- KPI charts use a custom `KPIWidget`.
- Chart cards expose row count, chart type, source, and footer metadata.
- Empty canvas and chart error states exist.

### Chart Implementations

- Chart.js is the primary renderer.
- `ChartRenderer` can generate fallback Chart.js configs when a chart has rows but no renderable config.
- `ChartJsRenderer` includes readable color adjustments for light/dark chart surfaces and density-aware compact chart behavior.
- Chart families cover a broad BI catalog: bar, line, area, pie, scatter, heatmap, funnel, gauge, treemap, sankey, radar, map, matrix, rich text, and more.

### Color Usage

- Tokenized core colors are defined in `src/styles/tokens.css`.
- Light and dark themes are supported through CSS variables and `body.dark`.
- Dominant palette is enterprise blue, slate, white, and soft gray with semantic green, amber, red, and sky accents.
- Multiple CSS layers define additional hardcoded blues, violets, glass backgrounds, shadows, and gradients.
- The visual direction is already close to SaaS analytics, but the palette is inconsistent because legacy/polish files override the base system.

### Typography

- Typography tokens exist for 11, 12, 13, 14, 16, 18, 20, 24, and 32 px.
- The font stack includes IBM Plex Sans, Noto Sans Thai, Segoe UI, and sans-serif.
- Many page-level styles use clamp-based display sizes, negative letter spacing, and uppercase micro-labels.
- The dashboard title and builder panels use several competing type scales across CSS layers.

### Responsiveness

- App shell has breakpoints around 1400, 1100, 920, 760, and 520 px.
- Dashboard and builder CSS include many additional breakpoints.
- Mobile navigation uses a hamburger and off-canvas sidebar.
- Builder and dashboard layouts attempt to collapse to one or two columns on smaller screens.
- The responsive approach is present, but the number of overrides raises risk of overflow and inconsistent behavior.

### Accessibility

- Positive patterns:
  - Main content uses `role="main"`.
  - Top navigation has `role="banner"` and nav labels.
  - Loading route fallback uses `role="status"` and `aria-live="polite"`.
  - Forms surface error messages with `role="alert"` in auth flows.
  - Several buttons include `aria-label`.
  - Focus-visible styling exists for shell controls.
- Gaps:
  - Chart canvases need richer text alternatives and data-summary fallbacks.
  - Some interactive dashboard areas rely on click/context menu without full keyboard equivalents.
  - Iconography is partly text initials such as `TM`, `DS`, `FV`, `RC`, which weakens recognition.
  - Several empty/error states are visual cards without explicit live-region behavior.
  - Drag/resizing interactions need keyboard-accessible alternatives or clear non-drag actions.

### Loading, Empty, and Error States

- Loading states exist for route fallback, chart skeletons, share page loading, auth submit states, and builder query running states.
- Empty states exist for project home, dashboard canvas, read-only/share contexts, and chart "No data" metadata.
- Error states exist for auth, chart render errors, unsupported renderers, query errors, validation cards, export failures, and create project validation.
- The states are functional but visually inconsistent and sometimes too generic for executive BI users.

## 2. UX Problems

- The dashboard workspace is feature-rich but dense. Controls for sheets, dashboards, filters, saved charts, command palette, exports, sharing, and inspector compete for attention.
- Primary user journeys are not visually prioritized enough:
  - Open dashboard.
  - Add chart.
  - Edit chart.
  - Share/export.
  - Inspect selected widget.
- The home page mixes executive workspace, project management, recent activity, and templates. It is useful but needs stronger information hierarchy.
- Disabled navigation items labeled "Coming soon" add noise to the primary rail.
- Chart cards repeat metadata in both header and footer, which reduces chart canvas space.
- Dashboard tabs and sheet/dashboard controls may feel like an app inside an app; hierarchy between project, sheet, dashboard, and widget should be clearer.
- Builder workflow has the right functional steps, but its three-column workbench can overwhelm new users without stronger step state and progressive focus.
- Context menu actions are discoverable only through right-click or hidden controls.
- Export/share flows appear advanced, but feedback and success states should feel more deliberate.

## 3. Visual Problems

- CSS layering is too broad. `tokens.css`, `themeModes.css`, `dashboard.css`, `builder.css`, `workspacePolish.css`, `enterprisePolish.css`, `layoutArchitecturePass.css`, and other files overlap heavily.
- The visual language alternates between compact enterprise UI, glassy premium panels, Power BI-like workspace treatments, and older flat cards.
- Border radius is inconsistent: base tokens use 3, 4, and 6 px, while auth/builder/dashboard layers use 10, 12, 14, 16, 18, 20, 24, 26, and 28 px.
- Shadows are sometimes disabled in base components but reintroduced in polish layers, creating uneven elevation.
- Blue is overused as primary, accent, chart fallback, status, selection, canvas highlight, and admin-style chrome.
- Chart fallback colors include bright rose/orange/yellow/blue/purple/green, which can clash with the otherwise professional analytics palette.
- Uppercase micro-labels and tight labels are used heavily, which can make dense areas feel technical rather than executive.
- Some visual icons are text abbreviations instead of symbolic icons, reducing polish.
- Chart cards include accent bars, headers, action controls, footers, metadata, and chart canvas; smaller cards can feel crowded.

## 4. Accessibility Problems

- Chart canvases need accessible names and summaries that explain the insight, not only the visual rendering.
- Data tables are not a prominent fallback for charts, limiting screen reader and keyboard analysis.
- Dashboard drag/resizing is pointer-first. Add, move, resize, and reorder actions need non-pointer alternatives.
- Context menus should be keyboard reachable and announced with correct menu semantics.
- Chart card `tabIndex={0}` makes cards focusable, but focus behavior should map to meaningful keyboard actions.
- Some status cards should use `role="status"` or `aria-live` when they update asynchronously.
- Contrast appears generally good through tokens, but hardcoded soft text and color-mix overrides should be checked systematically.
- Mobile off-canvas navigation should verify focus trapping, escape behavior, and return focus.
- Disabled rail items using `aria-disabled` still need a clear reason and should not create unnecessary tab stops.

## 5. Responsive Problems

- The app has many breakpoints across multiple CSS files. This increases risk that late overrides break earlier responsive behavior.
- Dashboard canvas has large minimum heights, fixed side rails, sticky inspector behavior, and grid interaction. These are hard to use on narrow screens.
- Builder uses a three-column layout with dense controls. The mobile collapse exists but needs a more task-based flow.
- App bar hides controls progressively, but some actions become icon-only or disappear, which may hurt discoverability.
- Grid-based dashboards can become awkward on mobile unless widgets are converted into a readable vertical story.
- Header titles use clamp and negative letter spacing in several places, which can cause cramped text on small screens.
- Tables/data previews and long field names need consistent horizontal overflow handling.

## 6. Dashboard Usability Problems

- Dashboard information hierarchy needs sharper executive framing: top KPI summary, filter context, trend deltas, anomalies, and supporting detail.
- Global filters are present but visually compete with workspace management controls.
- Chart actions are close to the visual content, but card metadata duplicates and footer details consume vertical space.
- Empty dashboard state sends users away to home in some flows, which may be confusing from within `/dashboard`.
- Widget selection state is subtle; selected widget should expose clearer inspector context.
- Chart picker and saved charts should make "add to this dashboard" more prominent.
- Charts should standardize title, subtitle, metric, timeframe, source, and update cadence.
- KPI cards should present value, delta, direction, period, and confidence/source in a consistent pattern.
- Dashboard should support an executive read mode that hides authoring chrome and emphasizes insight consumption.

## 7. Quick Wins

- Consolidate visual tokens into one documented source and reduce hardcoded one-off colors in new UI work.
- Remove duplicate chart footer metadata when the header already communicates chart type, source, and row count.
- Standardize card radius, border, and shadow for dashboard widgets, panels, modals, and project cards.
- Add consistent focus-visible styling for dashboard tabs, widget slots, context menu items, chart action buttons, and builder drop zones.
- Improve chart skeletons with a lighter skeleton shimmer or structured placeholder that matches final chart geometry.
- Replace text abbreviation icons in navigation with consistent iconography.
- Make empty states more action-specific: "Add chart to this dashboard" rather than generic builder navigation.
- Add accessible chart summary text near each chart or in an expandable details region.
- Define one compact mobile dashboard card stack pattern.
- Audit and reduce `!important` overrides in future styling passes.

## 8. High Impact Improvements

- Create a formal Dashboard Mini BI design system based on premium enterprise analytics tokens.
- Rebuild the dashboard workspace hierarchy around:
  - Dashboard title and status.
  - Global filters.
  - KPI strip.
  - Primary visualization grid.
  - Insight/selection inspector.
- Introduce an executive read mode separate from edit mode.
- Normalize chart theming so every chart uses the same grid, axis, tooltip, legend, and palette rules.
- Add a data table/details fallback for every chart.
- Rework builder as a clearer stepper/workbench:
  - Select dataset.
  - Select chart.
  - Map fields.
  - Configure.
  - Preview.
  - Save.
- Establish responsive dashboard behavior:
  - Desktop: authoring canvas.
  - Tablet: two-column analysis layout.
  - Mobile: vertical executive story.
- Add accessibility acceptance criteria to UI work: keyboard, focus, screen reader summaries, contrast, live regions, and reduced motion.
- Create a CSS ownership model so global tokens, primitives, route layouts, and page-specific polish do not fight each other.
