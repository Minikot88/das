# UI Implementation Plan

Created: 2026-06-13  
Source reports:

- `docs/UI_UX_AUDIT.md`
- `docs/UI_UX_PRO_MAX_FINDINGS.md`
- `docs/DESIGN_SYSTEM_V2.md`
- `docs/UI_REDESIGN_ROADMAP.md`

Scope: Planning only. No application code has been modified.

## Implementation Guardrails

This plan assumes UI-only implementation unless explicitly approved otherwise.

Allowed:

- CSS, tokens, spacing, typography, colors, borders, shadows, layout styling.
- Presentation-only className adjustments.
- Behavior-neutral markup cleanup where needed for visual hierarchy.
- Microcopy and labels.
- Responsive styling.
- Loading, empty, disabled, hover, focus, and active visual states.

Not allowed without approval:

- Routing changes.
- Store/state changes.
- API or data contract changes.
- Chart calculation/query changes.
- Dashboard grid behavior changes.
- Dependency changes.
- File structure refactors.
- Business logic changes.

If a requested improvement requires logic or data changes, stop and request approval before implementation.

## Priority Order

1. Dashboard Home
2. KPI Cards
3. Charts
4. Data Tables
5. Navigation
6. Mobile Layout

## Phase 0 - Foundation Lock

Goal: Make the following phases safer by defining the visual system before touching route-level UI.

Likely files:

- `src/styles/tokens.css`
- `src/styles/components.css`
- `src/styles/layout.css`
- `src/styles/dashboard.css`
- `src/styles/charts.css`
- `src/styles/workspacePolish.css`
- `src/styles/enterprisePolish.css`

Tasks:

- Map existing CSS variables to the V2 design tokens.
- Standardize card radius around 6-8 px.
- Standardize dashboard borders and subtle elevation.
- Define shared focus ring, hover, active, disabled, loading, empty, and error visuals.
- Avoid broad CSS rewrites; patch only the tokens and selectors needed by the priority phases.

Acceptance checks:

- Existing routes still render.
- No change to routing, stores, chart generation, query logic, or API calls.
- Light and dark themes remain usable.
- No new dependency introduced.

Complexity: Medium  
Effort: 1 day  
Impact: High

## Phase 1 - Dashboard Home

Goal: Make the home/workspace entry feel like a clear executive command center rather than a mixed collection of projects, activity, and templates.

Likely files:

- `src/pages/HomePage.jsx`
- `src/components/ui/ProjectCard.jsx`
- `src/components/ui/Panel.jsx`
- `src/components/ui/EmptyState.jsx`
- `src/styles/workspacePolish.css`
- `src/styles/homeWorkspaceCompact.css`
- `src/styles/components.css`

UI tasks:

- Strengthen the first viewport hierarchy: workspace title, current context, primary actions, and summary metrics.
- Convert home stats into a consistent KPI-style strip using V2 spacing and typography.
- Reduce visual competition between recent activity, project cards, and template gallery.
- Improve project card scannability: title, dashboard count, last updated, active context, and primary action.
- Improve the empty project state with a stronger primary action and clearer explanation.
- Align home panels with the V2 surface, border, radius, and shadow rules.
- Keep template gallery presentation secondary unless the active user intent is creating from a template.

Constraints:

- Do not change project sorting logic.
- Do not change create/open/delete/rename behavior.
- Do not change template selection behavior.
- Keep DOM edits minimal and behavior-neutral.

Acceptance checks:

- Home renders correctly with zero projects, one project, and multiple projects.
- Primary actions remain clickable and unchanged.
- Project cards do not overflow at desktop or mobile widths.
- Empty state is visually clear and action-oriented.
- Focus states remain visible for buttons and project actions.

Complexity: Medium  
Effort: 1-2 days  
Impact: High

## Phase 2 - KPI Cards

Goal: Standardize KPI presentation for executive BI: value, label, delta, comparison period, source, and status.

Likely files:

- `src/components/charts/KPIWidget.jsx`
- `src/components/dashboard/ChartCard.jsx`
- `src/styles/charts.css`
- `src/styles/dashboard.css`
- `src/styles/workspacePolish.css`

UI tasks:

- Redesign KPI card visual hierarchy:
  - Top label/status.
  - Large metric value.
  - Metric title.
  - Delta with direction.
  - Comparison period.
  - Source/update metadata.
- Replace corrupted trend symbols with presentation-safe indicators only if this is treated as display text cleanup; otherwise stop for approval.
- Use semantic color only for trend direction and status.
- Add compact and tiny KPI styling so KPI widgets remain readable in small grid slots.
- Align KPI card radius, border, padding, and typography with V2 tokens.
- Reduce redundant chart card chrome around KPI widgets where it harms readability.

Constraints:

- Do not change KPI calculation logic.
- Do not alter how rows are selected or formatted beyond presentation/microcopy.
- Do not change chart type detection.

Acceptance checks:

- KPI card is readable in standard, compact, tiny, and fullscreen contexts.
- Positive, negative, flat, and no-row states are visually distinct.
- Text does not overlap or clip.
- Color is not the only indicator of trend direction.
- Existing KPI data output remains unchanged.

Complexity: Medium  
Effort: 1-2 days  
Impact: High

## Phase 3 - Charts

Goal: Make chart cards and chart rendering feel consistent, premium, and BI-grade while preserving chart data behavior.

Likely files:

- `src/components/dashboard/ChartCard.jsx`
- `src/components/dashboard/CardActions.jsx`
- `src/components/charts/ChartRenderer.jsx`
- `src/components/charts/ChartJsRenderer.jsx`
- `src/components/charts/ChartSkeleton.jsx`
- `src/components/charts/ChartErrorBoundary.jsx`
- `src/utils/chartPalette.js`
- `src/styles/charts.css`
- `src/styles/dashboard.css`

UI tasks:

- Standardize chart card anatomy:
  - Header: title, timeframe/source summary, actions.
  - Body: chart canvas with adequate breathing room.
  - Footer: only when it provides unique information.
- Reduce duplicate metadata between chart header and footer.
- Apply V2 chart palette rules for new presentation defaults where this can be done without changing chart semantics.
- Tune visual density for tiny, compact, standard, and fullscreen chart cards.
- Improve loading skeletons to resemble final chart geometry.
- Improve error and unsupported renderer states with clearer visual hierarchy.
- Make chart action controls visually quieter until hover/focus.
- Ensure selected chart state is visible but not heavy.

Potential approval checkpoint:

- Any change to Chart.js option generation, fallback chart config, palette assignment logic, or chart factory behavior may affect rendered meaning. Ask before modifying those logic paths.

Constraints:

- Do not change chart data mapping.
- Do not change chart calculations or query results.
- Do not change export behavior.
- Do not change drag/resize behavior.

Acceptance checks:

- Bar, line, area, pie/doughnut, scatter, and KPI examples remain readable.
- Loading, no data, unsupported renderer, and render error states are styled consistently.
- Chart cards do not overflow in compact grid cells.
- Chart actions remain keyboard-focusable.
- Chart output remains behaviorally unchanged.

Complexity: Medium-High  
Effort: 2-3 days  
Impact: High

## Phase 4 - Data Tables

Goal: Establish table styling and chart-detail table patterns so users can inspect exact values and screen readers have a better non-canvas path.

Likely files:

- `src/features/builder/QueryModePanel.jsx`
- `src/features/builder/FieldList.jsx`
- `src/components/bi/DatasetExplorerModal.jsx`
- `src/components/dashboard/ChartCard.jsx`
- `src/styles/builder.css`
- `src/styles/components.css`
- `src/styles/charts.css`

UI tasks:

- Define a reusable visual table style:
  - Compact row height.
  - Sticky header where already scrollable.
  - Right-aligned numeric cells.
  - Muted metadata.
  - Empty/loading/error states inside table frames.
- Improve builder query result/data preview table presentation if present.
- Improve dataset explorer table/list density and readability.
- Plan chart detail table affordance, but do not implement new behavior unless approved.
- Add visual rules for horizontal overflow and long column names.

Potential approval checkpoint:

- Adding a new chart data table fallback inside every chart card likely requires component structure and possibly state/interaction decisions. Treat that as a separate approved implementation step.

Constraints:

- Do not change query execution.
- Do not transform table data.
- Do not add sorting/filtering/pagination behavior unless approved.
- Do not alter dataset explorer logic.

Acceptance checks:

- Tables remain readable with long headers and numeric values.
- Horizontal overflow is controlled.
- Empty/error/loading table states are visually clear.
- Keyboard focus remains visible on interactive table controls.

Complexity: Medium  
Effort: 1-2 days for styling, 3-5 days if approved chart fallback behavior is added  
Impact: High

## Phase 5 - Navigation

Goal: Reduce navigation noise and make the app shell feel like a polished SaaS analytics product.

Likely files:

- `src/layout/AppHeader.jsx`
- `src/layout/SidebarLeft.jsx`
- `src/layout/SidebarRight.jsx`
- `src/components/layout/Layout.jsx`
- `src/styles/layout.css`
- `src/styles/themeModes.css`
- `src/styles/workspacePolish.css`

UI tasks:

- Tighten top app bar spacing, labels, and action hierarchy.
- Make left navigation active states clearer and calmer.
- De-emphasize disabled coming-soon items visually.
- Replace text abbreviation icon styling with a more consistent icon-like treatment, without adding dependencies.
- Improve sidebar collapsed state readability.
- Align app bar, sidebar, and inspector surfaces with V2 tokens.
- Improve focus-visible states for all shell controls.

Potential approval checkpoint:

- Removing nav items, changing destinations, or changing route behavior requires approval.

Constraints:

- Do not change route definitions.
- Do not change active route logic.
- Do not add an icon dependency.
- Do not alter sidebar state management.

Acceptance checks:

- Active route is obvious.
- Disabled items are not visually dominant.
- Collapsed and expanded sidebar states both work.
- Mobile menu still opens and closes as before.
- Header controls do not overlap at common desktop widths.

Complexity: Medium  
Effort: 1-2 days  
Impact: Medium-High

## Phase 6 - Mobile Layout

Goal: Make mobile a readable analytics experience, not a cramped desktop canvas.

Likely files:

- `src/styles/layout.css`
- `src/styles/dashboard.css`
- `src/styles/charts.css`
- `src/styles/builder.css`
- `src/styles/homeWorkspaceCompact.css`
- `src/styles/workspacePolish.css`
- `src/pages/HomePage.jsx`
- `src/pages/DashboardPage.jsx`
- `src/components/dashboard/DashboardGrid.jsx`
- `src/components/dashboard/ChartCard.jsx`

UI tasks:

- Define mobile dashboard as a vertical insight feed using CSS presentation where possible.
- Stack chart cards with stable spacing and readable titles.
- Tune app bar and sidebar mobile breakpoints.
- Make home project cards and KPI stats stack cleanly.
- Make dashboard tabs horizontally scrollable with clear active state.
- Ensure chart action buttons remain reachable without crowding.
- Improve modal sizing for share, fullscreen, create project, command palette, and dataset explorer.
- Add responsive overflow rules for long dashboard, sheet, project, and chart names.

Potential approval checkpoint:

- Changing `react-grid-layout` behavior, breakpoints, or layout generation is not UI-only. Ask before editing layout utilities or grid behavior.

Constraints:

- Prefer CSS-only responsive changes first.
- Do not change grid layout algorithms.
- Do not change dashboard widget persistence.
- Do not alter builder workflow state.

Acceptance checks:

- Verify 360, 390, 430, 768, 1024, 1440 px widths.
- No horizontal page overflow on mobile.
- Touch targets are at least 36-40 px where possible.
- Text does not overlap controls.
- Chart cards are readable in a single-column stack.
- Off-canvas navigation remains usable.

Complexity: High  
Effort: 3-5 days  
Impact: High

## Recommended Implementation Sequence

1. Phase 0: Foundation Lock.
2. Phase 1: Dashboard Home.
3. Phase 2: KPI Cards.
4. Phase 3: Charts.
5. Phase 4: Data Tables.
6. Phase 5: Navigation.
7. Phase 6: Mobile Layout.

Reasoning:

- Dashboard Home establishes the product tone and reuses core card/panel patterns.
- KPI Cards are high-impact and smaller in scope than all charts.
- Charts build on KPI/card patterns and need careful verification.
- Data Tables should follow chart styling so detail views feel related.
- Navigation can be polished after main content hierarchy is clear.
- Mobile should be last because it depends on final desktop component density and hierarchy.

## Verification Plan

For every implementation phase:

- Run the app locally.
- Check `/home`, `/dashboard`, `/builder`, `/share/:sheetId`, and public dashboard views where available.
- Check light and dark modes.
- Check desktop and mobile widths.
- Check hover, focus, active, disabled, loading, empty, and error states.
- Confirm no console errors were introduced.
- Confirm no data behavior changed.

Suggested commands:

```bash
npm run build
npm run lint
```

Visual QA targets:

- Desktop: 1440 x 900.
- Large desktop: 1680 x 1050.
- Tablet: 768 x 1024.
- Mobile: 390 x 844.
- Narrow mobile: 360 x 800.

## Stop Conditions

Stop and request approval if implementation requires:

- Editing `src/store/useStore.js`.
- Editing API modules.
- Editing chart factory/query/calculation logic.
- Editing dashboard layout persistence or grid algorithms.
- Adding dependencies.
- Moving or renaming files.
- Changing route definitions.
- Adding new feature behavior beyond presentation.

## Expected Outcome

After this plan is implemented, Dashboard Mini BI should feel like a cohesive premium analytics product:

- Dashboard Home becomes a clear command center.
- KPI cards become executive-grade and scannable.
- Charts gain consistent BI styling and cleaner card anatomy.
- Tables become readable and ready for exact-value inspection.
- Navigation becomes calmer and more professional.
- Mobile becomes a readable dashboard experience instead of a compressed desktop UI.
