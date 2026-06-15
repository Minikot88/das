# UI Redesign Roadmap

Audit date: 2026-06-13  
Scope: Planning only. No application code was modified.

## Phase A - Quick Improvements

Goal: Improve clarity and consistency without touching business logic, data flow, routing, stores, chart calculations, or dependencies.

| Workstream | Complexity | Effort | Impact |
| --- | --- | --- | --- |
| Normalize dashboard card radius, borders, and low-elevation treatment | Low | 0.5-1 day | High |
| Reduce duplicate metadata in chart cards, especially footer/header repetition | Low | 0.5 day | Medium |
| Improve empty dashboard copy and primary actions | Low | 0.5 day | High |
| Standardize focus-visible states across dashboard tabs, chart cards, menus, and builder drop zones | Medium | 1 day | High |
| Replace text abbreviation nav marks with consistent icon treatment | Medium | 1 day | Medium |
| Make chart loading states visually closer to final chart/card shape | Low | 0.5 day | Medium |
| Document and freeze V2 tokens before implementation | Low | 0.5 day | High |

Recommended first pass:

- Update CSS tokens and component classes only.
- Keep DOM changes minimal and behavior-neutral.
- Do not alter hooks, reducers, chart generation, routing, or API calls.

## Phase B - Layout Modernization

Goal: Establish a cleaner SaaS analytics shell and reduce visual competition between navigation, workspace controls, and data.

| Workstream | Complexity | Effort | Impact |
| --- | --- | --- | --- |
| Simplify app shell hierarchy and spacing | Medium | 1-2 days | High |
| Rationalize left nav groups and disabled coming-soon items | Low | 0.5-1 day | Medium |
| Rework home page into clearer workspace command center | Medium | 1-2 days | High |
| Standardize panel, toolbar, and page header layouts | Medium | 1-2 days | High |
| Reduce overlapping CSS overrides and define ownership boundaries | High | 2-4 days | High |
| Tune dark mode surfaces and contrast | Medium | 1-2 days | Medium |

Target outcome:

- The app feels like one coherent product instead of several styling passes layered together.
- Main routes share consistent spacing, typography, controls, and elevation.
- Workspace management controls are visible but quieter than the data.

## Phase C - Dashboard Upgrade

Goal: Make the dashboard feel like an executive BI workspace with strong insight hierarchy.

| Workstream | Complexity | Effort | Impact |
| --- | --- | --- | --- |
| Create a dashboard header with title, status, updated time, and share/export cluster | Medium | 1-2 days | High |
| Separate global filters from authoring controls | Medium | 1-2 days | High |
| Add a standardized KPI summary strip pattern | Medium | 1-2 days | High |
| Create edit/read visual modes while preserving existing behavior | Medium-High | 2-3 days | High |
| Improve selected widget treatment and inspector relationship | Medium | 1-2 days | Medium |
| Redesign chart picker and saved chart add flow visually | Medium | 1-2 days | Medium |
| Standardize dashboard empty, loading, and error cards | Low-Medium | 1 day | High |

Target outcome:

- Executives can scan key metrics first.
- Analysts can still edit and arrange dashboards.
- Authoring chrome no longer competes with the chart grid.

## Phase D - Data Visualization Upgrade

Goal: Make every chart feel consistent, readable, accessible, and BI-grade.

| Workstream | Complexity | Effort | Impact |
| --- | --- | --- | --- |
| Define one chart palette and apply it consistently through settings/theme defaults | Medium | 1-2 days | High |
| Standardize chart card anatomy across KPI, axis, circular, and specialty charts | Medium | 1-2 days | High |
| Tune Chart.js grid, axis, legend, tooltip, and density defaults | Medium | 1-2 days | High |
| Add accessible chart summary presentation | Medium | 1-2 days | High |
| Add or expose data-table/detail fallback for charts | High | 3-5 days | High |
| Improve KPI widget presentation with delta, period, source, and status hierarchy | Medium | 1-2 days | High |
| Validate tiny, compact, standard, and fullscreen card states | Medium | 1-2 days | Medium |

Target outcome:

- Charts look like a unified analytics system.
- KPI cards become executive-grade.
- Accessibility and exact-value inspection improve.

## Phase E - Mobile Experience

Goal: Convert complex desktop BI workspaces into usable mobile reading and light-management experiences.

| Workstream | Complexity | Effort | Impact |
| --- | --- | --- | --- |
| Define mobile dashboard as a vertical insight feed | High | 2-4 days | High |
| Collapse dashboard controls into predictable top/bottom action areas | Medium | 1-2 days | High |
| Convert chart grid cards into stacked responsive cards | Medium | 1-2 days | High |
| Simplify builder mobile flow into sequential sections | High | 3-5 days | Medium-High |
| Verify app bar, sidebar, modals, and share screens at 360-430 px widths | Medium | 1-2 days | High |
| Audit touch targets and overflow behavior | Medium | 1 day | High |
| Add mobile-specific read mode defaults | Medium | 1-2 days | Medium |

Target outcome:

- Mobile users can read dashboards comfortably.
- Editing remains possible where practical, but does not pretend to be the full desktop grid experience.
- Navigation, modals, and chart cards avoid horizontal overflow and cramped labels.

## Recommended Sequence

1. Complete Phase A to lock visual consistency quickly.
2. Complete the token and CSS ownership cleanup from Phase B before deeper redesign.
3. Upgrade dashboard hierarchy and KPI patterns in Phase C.
4. Standardize chart presentation and accessibility in Phase D.
5. Treat mobile as its own dashboard consumption experience in Phase E.

## Risk Notes

- The CSS surface is large and heavily layered, so visual changes should be small and verified route by route.
- Dashboard grid behavior must not be changed during UI-only work without explicit approval.
- Chart defaults can affect perceived data meaning; palette and visual changes should be reviewed carefully.
- Builder UX changes can accidentally touch workflow logic. Keep initial work to layout, spacing, labels, and presentation classes.
- The missing `ui-ux-pro-max` package should be restored before any implementation that depends on its recommendations.

## Definition of Done for Future UI Implementation

- Same behavior as before.
- Better hierarchy and clarity.
- Consistent tokens and component styling.
- Desktop and mobile layouts verified.
- Hover, focus, active, disabled, loading, empty, and error states checked.
- No logic, state, routing, API, schema, or chart calculation changes unless explicitly approved.
