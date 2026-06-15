# Accessibility Audit

## Scope

This audit reviews keyboard navigation, focus management, screen reader support, color contrast risk, and semantic structure. No application code was modified.

Key files reviewed:
- `src/app/AppRoutes.jsx`
- `src/components/layout/Layout.jsx`
- `src/layout/AppHeader.jsx`
- `src/layout/SidebarLeft.jsx`
- `src/pages/DashboardPage.jsx`
- `src/features/builder/BuilderPage.jsx`
- `src/components/bi/CommandPaletteModal.jsx`
- `src/components/bi/DatasetExplorerModal.jsx`
- `src/components/dashboard/DashboardShareModal.jsx`
- `src/components/ui/CreateProjectModal.jsx`
- `src/components/ui/EnterpriseDataTable.jsx`
- `src/styles/tokens.css`

## Strengths

- Main app content uses `main` landmark in `src/components/layout/Layout.jsx`.
- Lazy route fallback uses `role="status"` and `aria-live="polite"`.
- Many icon-only controls include `aria-label`.
- Dashboard inspector and builder use tablist/tab semantics in several places.
- Auth errors use `role="alert"`.
- Empty and error chart states render readable text, not canvas-only output.
- Inputs in auth, dashboard filters, table filtering, and settings mostly have labels or `aria-label`.

## Critical Issues

### 1. Dialog Focus Is Not Trapped Or Restored
- Location: `src/components/bi/CommandPaletteModal.jsx`, `src/components/bi/DatasetExplorerModal.jsx`, `src/components/dashboard/DashboardShareModal.jsx`, `src/components/ui/CreateProjectModal.jsx`
- Current behavior: some dialogs focus the search input or support Escape, but focus can move behind dialogs and focus is not consistently restored to the invoking button.
- Impact: keyboard and screen-reader users can lose place or interact with obscured page controls.
- Required work:
  - Create one modal behavior standard.
  - Trap focus while open.
  - Restore focus to trigger on close.
  - Ensure Escape closes every modal.
  - Add labelled title via `aria-labelledby`.

### 2. Overlay Containers Use `aria-hidden` While Containing Dialogs
- Location: `src/components/bi/CommandPaletteModal.jsx`, `src/components/bi/DatasetExplorerModal.jsx`
- Current behavior: the overlay wrapper has `aria-hidden="true"` and contains the dialog.
- Impact: screen readers may hide the dialog subtree or announce it inconsistently.
- Required work: remove `aria-hidden` from dialog ancestors; hide only decorative/backdrop-only elements.

### 3. Drag And Drop Builder Interactions Need Keyboard Equivalents
- Location: `src/features/builder/BuilderPage.jsx`, `src/features/builder/FieldList.jsx`, `src/features/builder/DropZone.jsx`
- Current behavior: field mapping supports drag data transfer; click/keyboard alternatives are not complete for assigning fields into mapping zones.
- Impact: keyboard-only users may be unable to complete chart authoring efficiently.
- Required work: provide keyboard-select field then assign-to-zone commands, or buttons/menus for field assignment.

## High Issues

### 1. Complex Chart Canvas Content Lacks Screen Reader Summaries
- Location: `src/components/charts/ChartJsRenderer.jsx`, `src/components/dashboard/ChartCard.jsx`
- Current behavior: charts render to canvas with visual labels; textual summary is limited to surrounding card metadata.
- Impact: screen-reader users cannot perceive chart trends, categories, values, or selected data points.
- Required work:
  - Add accessible chart descriptions.
  - Provide data table fallback or summary per chart.
  - Announce cross-filter/drilldown updates.

### 2. Presentation Mode Dialog Does Not Manage Initial Focus
- Location: `src/pages/DashboardPage.jsx`
- Current behavior: presentation mode opens a fixed `role="dialog"` overlay and supports Escape, but does not explicitly move focus to the overlay or Exit button.
- Impact: keyboard users may remain focused on hidden dashboard controls.
- Required work: focus the Exit button or presentation container on open and return focus on close.

### 3. Tab Components Are Missing Full Keyboard Tablist Behavior
- Location: dashboard inspector, builder tabs, share modal tabs
- Current behavior: tabs are buttons with `role="tab"` in some areas, but arrow-key navigation, `aria-controls`, and panel ids are inconsistent.
- Impact: screen-reader and keyboard users do not get expected tab behavior.
- Required work: standardize tabs with roving focus and linked panels.

### 4. Table Sorting State Is Not Announced Semantically
- Location: `src/components/ui/EnterpriseDataTable.jsx`
- Current behavior: header buttons show "Asc", "Desc", or "Sort" as visible text.
- Impact: screen readers may not announce active sort using standard table semantics.
- Required work: add `aria-sort` on `th` and clearer sort button labels.

## Medium Issues

### 1. Color Contrast Needs Automated Verification
- Location: `src/styles/tokens.css`, `src/styles/*.css`
- Current behavior: token colors are generally reasonable, but many `color-mix`, translucent surfaces, warning/danger soft states, and hardcoded colors exist.
- Impact: some combinations may fail WCAG AA, especially in dark mode and small caption text.
- Required work: run automated contrast checks across light/dark modes and key states.

### 2. Disabled Navigation Placeholders Are Rendered As Spans
- Location: `src/layout/SidebarLeft.jsx`
- Current behavior: disabled items use `span` with `aria-disabled="true"`.
- Impact: acceptable for non-interactive placeholders, but users may not understand unavailable routes.
- Required work: keep placeholders out of tab order and ensure copy states "Coming soon" or remove from production navigation.

### 3. Command Palette Active Item Is Visual Only
- Location: `src/components/bi/CommandPaletteModal.jsx`
- Current behavior: highlighted item gets `is-active` class, but input does not expose active descendant semantics.
- Impact: screen readers may not know which command arrow keys select.
- Required work: use combobox/listbox pattern with `aria-activedescendant`.

### 4. Dataset Explorer Placeholder Cards May Confuse Assistive Tech
- Location: `src/components/bi/DatasetExplorerModal.jsx`
- Current behavior: placeholder dataset cards are static `article` elements labelled "Placeholder".
- Impact: low functional risk, but production users may perceive them as available datasets.
- Required work: ensure placeholder copy is explicit or remove from production mode.

## Low Issues

### 1. Decorative Close Buttons Use "x"
- Location: multiple modals
- Current behavior: close buttons have labels in some cases but visible text is `x`.
- Impact: minor polish issue.
- Required work: use a consistent close icon/button component with accessible label.

### 2. Mixed Headings Inside Dense Panels
- Location: dashboard, builder, datasets pages
- Current behavior: semantic heading order is mostly readable but may skip levels inside panels.
- Impact: low but worth checking with screen-reader outline.
- Required work: audit heading order route by route.

## Keyboard Navigation Checklist

Must pass before production:
- Open and close every modal with keyboard only.
- Tab cannot escape open modals.
- Escape closes command palette, dataset explorer, share modal, create project modal, and presentation mode.
- Focus returns to the button/input that opened the modal.
- Builder field mapping can be completed without drag/drop.
- Dashboard tabs, inspector tabs, and builder tabs support arrow keys.
- Data table sort, filtering, pagination, and column visibility are keyboard accessible.
- Share/export actions announce success/failure.

## Screen Reader Checklist

Must pass before production:
- Route changes announce meaningful page titles/headings.
- Charts expose textual summaries or data table alternatives.
- Loading, error, empty, and save/export states are announced.
- Public dashboard read-only mode is announced as read-only.
- Active filters, cross-filtering, and drilldown breadcrumbs are announced.

## Recommended Priority

1. Critical: modal focus trap and overlay semantics.
2. Critical: keyboard alternatives for builder field mapping.
3. High: chart summaries/data-table fallback.
4. High: tab keyboard behavior.
5. Medium: automated contrast checks.
