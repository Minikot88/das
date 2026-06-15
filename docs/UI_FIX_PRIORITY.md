# UI Fix Priority

Purpose: convert the consistency audit into an implementation order that supports the Modern Enterprise BI Platform direction while respecting the repository guardrails.

Rule: UI-only by default. Do not change business logic, state management, data flow, routing, API contracts, stores, reducers, chart calculations, query logic, dependencies, or file structure without explicit approval.

## Priority Model

| Priority | Meaning | Typical Scope |
| --- | --- | --- |
| P0 | Foundation needed before broad redesign | Tokens, cascade cleanup, shared visual contracts |
| P1 | Highest visible product impact | Dashboard Home and Dashboard Canvas surfaces |
| P2 | BI trust and insight quality | KPI, charts, tables, data states |
| P3 | Authoring productivity | Chart Builder and field mapping experience |
| P4 | Cross-product consistency | Navigation, modals, drawers, forms |
| P5 | Polish and accessibility | Focus, empty/loading/error states, copy, icon cleanup |

## Recommended Sequencing

### P0. Stabilize Visual Foundation

| Item | Issue | Files/Areas | Action | Complexity | Impact | Approval Risk |
| --- | --- | --- | --- | --- | --- | --- |
| P0.1 | CSS cascade has too many competing late overrides | `src/styles.css`, `src/styles/*.css` | Map visual ownership by route and reduce new work to scoped selectors using V2 tokens. Avoid deleting existing CSS until each route is verified. | High | Critical | Low if presentation-only |
| P0.2 | Design-system tokens are documented but not consistently used | `tokens.css`, route CSS | Introduce or align `--ds-*` aliases in CSS usage before larger screen edits. | Medium | High | Low |
| P0.3 | Radius and shadow systems drift by route | cards, panels, modals, popovers | Normalize new edits to V2 radius/shadow values and mark old exceptions for later cleanup. | Medium | High | Low |
| P0.4 | Responsive breakpoints are fragmented | dashboard, builder, home, layout CSS | Define a shared responsive target: desktop 4 columns, tablet 2, mobile 1. Apply per screen during approved phases. | Medium | High | Low |

Deliverable:

- A short implementation note or CSS ownership map before broad cross-route cleanup.

### P1. Dashboard Home and Dashboard Canvas

| Item | Issue | Files/Areas | Action | Complexity | Impact | Approval Risk |
| --- | --- | --- | --- | --- | --- | --- |
| P1.1 | Dashboard Home uses local visual tokens and custom classes | `HomePage.jsx`, Home styles | Reconcile Home styles with V2 tokens while preserving current behavior. | Medium | High | Low |
| P1.2 | Project cards need a shared enterprise card anatomy | `ProjectCard.jsx`, Home project grid styles | Standardize card header, metadata, action row, hover, and empty/new-project states. | Medium | High | Low |
| P1.3 | Dashboard Canvas mixes edit/view hierarchy | `DashboardPage.jsx`, dashboard styles, workspace polish | Create premium dashboard header, filter bar, tabs, and view/edit visual separation. | High | Critical | Medium if grid behavior is touched |
| P1.4 | Inspector/right rail is dense and persistent | `SidebarRight.jsx`, dashboard styles | Make visual treatment calmer and mode-aware. Collapsing behavior requires approval if not already present. | Medium | High | Medium |
| P1.5 | Dashboard mobile relies on forced CSS overrides | dashboard grid/workspace styles | Improve mobile stacking visually without changing grid state or layout calculations. | Medium | High | Medium |

Deliverable:

- Phase-specific `BEFORE_AFTER.md`, changed files, UX explanation, and screenshots when available.

### P2. KPI Cards, Charts, and Data Tables

| Item | Issue | Files/Areas | Action | Complexity | Impact | Approval Risk |
| --- | --- | --- | --- | --- | --- | --- |
| P2.1 | KPI cards need executive hierarchy | `KPIWidget.jsx`, `charts.css`, dashboard card styles | Align KPI value typography, trend color, caption, hover, and empty/error states. | Medium | High | Low |
| P2.2 | Chart palette differs from V2 | `chartPalette.js`, `ChartRenderer.jsx`, chart theme styles | Align visual palette and chart theme defaults with V2. Do not change data mapping or calculations. | Medium | High | Medium |
| P2.3 | Chart cards duplicate or hide metadata | `ChartCard.jsx`, dashboard/workspace CSS | Simplify card anatomy to title, description/context, chart, actions. Avoid `display:none !important` as a design strategy. | Medium | High | Low |
| P2.4 | Loading/error/empty chart states vary | `ChartSkeleton.jsx`, `ChartErrorBoundary.jsx`, chart status styles | Standardize state cards with one visual pattern. | Low | Medium | Low |
| P2.5 | Enterprise table system is missing | query results, chart table wrappers, dataset explorer | Add a shared visual table style: sticky header, row hover, density, numeric alignment, horizontal overflow. | High | Critical | Medium if markup/component structure changes |

Stop condition:

- If table fallback or chart theme work requires changing chart data generation, query behavior, or calculations, stop for approval.

### P3. Chart Builder

| Item | Issue | Files/Areas | Action | Complexity | Impact | Approval Risk |
| --- | --- | --- | --- | --- | --- | --- |
| P3.1 | Builder panels are visually dense | `BuilderPage.jsx`, builder CSS | Modernize explorer, mapping, settings, and preview surfaces with V2 spacing and typography. | High | High | Low |
| P3.2 | Field mapping cards need clearer hierarchy | `ChartMappingPanel.jsx`, `DropZone.jsx`, `FieldList.jsx` | Redesign card/list presentation without changing drag/drop or mapping logic. | High | High | Medium if drag/drop DOM changes affect behavior |
| P3.3 | Settings need accordion-like visual grouping | `ChartSettingsPanel.jsx`, builder CSS | Improve grouping, labels, inputs, and toggles. | Medium | High | Medium if accordion state is new |
| P3.4 | Chart selector cards drift from shared card/button system | `ChartTypePicker.jsx`, builder CSS | Align chart selector cards to V2 cards, badges, and hover/focus states. | Medium | Medium | Low |
| P3.5 | Save experience needs stronger visual hierarchy | `ChartSavePanel.jsx`, builder CSS | Clarify primary action, validation, and status styling. | Low | Medium | Low |

Stop condition:

- If redesign requires changing hook behavior, drag/drop state, chart compatibility checks, or save logic, stop for approval.

### P4. Navigation, Modals, Drawers, and Forms

| Item | Issue | Files/Areas | Action | Complexity | Impact | Approval Risk |
| --- | --- | --- | --- | --- | --- | --- |
| P4.1 | Navigation contains disabled/noisy destinations | `SidebarLeft.jsx`, layout CSS | Visually de-emphasize coming-soon items or move them to a quieter section. | Medium | High | Medium if destinations are removed |
| P4.2 | App shell controls have inconsistent density | `AppHeader.jsx`, `Layout.jsx`, sidebar styles | Align app header, sidebar, and route chrome to V2 tokens. | Medium | High | Low |
| P4.3 | Modal styles are scattered | `CreateProjectModal.jsx`, share/dataset/command/fullscreen modals, CSS | Establish one modal visual system: 12 px radius, shadow, title, close, actions, focus style. | Medium | High | Low |
| P4.4 | Drawer/inspector styles are not unified | `SidebarRight.jsx`, dashboard/builder side panels | Use consistent rail width, spacing, section headers, and collapsed/empty visuals. | Medium | Medium | Medium if collapse behavior changes |
| P4.5 | Inputs/forms bypass shared primitive | auth, builder, modal, search inputs | Align visual style to shared input tokens while preserving component behavior. | Medium | High | Low |

Stop condition:

- If navigation cleanup changes routes, removes accessible destinations, changes modal lifecycle, or adds state, stop for approval.

### P5. Polish, Accessibility, and Public Views

| Item | Issue | Files/Areas | Action | Complexity | Impact | Approval Risk |
| --- | --- | --- | --- | --- | --- | --- |
| P5.1 | Focus states vary | buttons, inputs, menus, cards | Apply consistent `--ds-shadow-focus` treatment to interactive controls. | Low | Medium | Low |
| P5.2 | Icon style is inconsistent | navigation, action buttons, badges | Prefer familiar icons or consistent symbolic marks, with accessible names. | Medium | Medium | Low unless dependencies are added |
| P5.3 | Empty/loading/error states vary | shared state components, chart states, dashboard states | Standardize visual state pattern. | Low | Medium | Low |
| P5.4 | Public/read-only dashboards need polish | `SharePage.jsx`, `DashboardPublicPage.jsx`, read-only UI components | Align shared dashboard presentation with workspace card/header/chart tokens. | Medium | Medium | Low |
| P5.5 | Microcopy varies between admin and SaaS tone | labels, empty states, helper text | Make copy concise, executive, and action-oriented. | Low | Medium | Low |
| P5.6 | Dark mode parity is uncertain | dark selectors, `themeModes.css` | Tokenize dark surfaces and reduce route-specific overrides. | Medium | Medium | Low |

## First Fix Batch Recommendation

Start with a controlled Dashboard Home follow-up only if the user approves:

1. Replace Home-local color/radius/shadow declarations with V2-compatible aliases where possible.
2. Normalize Home project cards, KPI cards, recent activity, and template gallery to one card contract.
3. Verify desktop, tablet, and mobile Home layout.
4. Document changed files and before/after impact.

Then move to Dashboard Canvas:

1. Dashboard header and toolbar visual hierarchy.
2. Filter bar styling.
3. Dashboard tabs.
4. Chart card anatomy.
5. Inspector visual density.
6. Mobile stacking.

## Items That Need Explicit Approval Before Implementation

- Removing or hiding navigational destinations if it changes reachable routes.
- Adding true accordion/collapse behavior if no current state exists.
- Changing dashboard grid layout calculations or widget coordinates.
- Changing chart palette in a way that affects saved chart settings rather than only default visual theme.
- Adding table fallback behavior if it changes chart rendering logic or data transformation.
- Introducing new dependencies, including icon libraries, table libraries, or chart plugins.

## Phase Handoff Checklist

Use this checklist for every implementation phase:

- Confirm scope is presentation-only.
- Preserve API calls, routing, state management, stores, hooks, chart data sources, and calculations.
- Prefer CSS, tokens, class usage, and behavior-neutral markup changes.
- Keep DOM changes minimal and verify interactions still work.
- Check desktop, tablet, and mobile.
- Check hover, focus, active, disabled, loading, empty, and error states when present.
- Check readable contrast and overflow.
- Confirm no console errors were introduced when screenshots or browser verification are available.
- Create the requested before/after document for the phase.

## Success Metrics

| Metric | Target |
| --- | --- |
| Visual consistency | Shared tokens and components produce predictable UI across Home, Dashboard, Builder, and Share |
| Dashboard clarity | Primary insight first, actions second, metadata last |
| BI trust | Charts use consistent palette, labeling, states, and table support |
| Responsiveness | Desktop 4-column, tablet 2-column, mobile 1-column patterns where applicable |
| Accessibility | Interactive controls, modals, charts, and state messages have consistent accessible treatment |
| Maintainability | Fewer new `!important` rules and fewer route-local palettes |

## Recommended Stop Point

Stop after this documentation pass. The next step should be user approval for the first implementation batch, with a narrow target and no logic changes.
