# UI Consistency Report

Scope: pages, components, layouts, widgets, modals, drawers, tables, forms, and charts in `src`.

Baseline: `docs/DESIGN_SYSTEM_V2.md`.

Status: audit only. No application code was changed.

## Executive Summary

DashboardMiniBi has a strong functional foundation and several useful UI primitives, but the visual system is fragmented across many global CSS layers. The largest consistency risk is not one isolated component; it is the cascade. `src/styles.css` imports base tokens and then a long chain of route-specific polish files that redefine surfaces, typography, radii, colors, and responsive behavior.

The current UI can be modernized safely, but implementation should start by stabilizing visual ownership before redesigning more screens. Otherwise each phase will fight older overrides and produce inconsistent results across Dashboard Home, Dashboard Canvas, Chart Builder, shared views, and auth pages.

## Severity Summary

| Severity | Count | Theme |
| --- | ---: | --- |
| Critical | 4 | CSS ownership, chart trust, responsive fragility, BI table gap |
| High | 8 | colors, typography, cards, buttons, modals, navigation, forms, accessibility |
| Medium | 8 | spacing drift, shadows, loading/empty states, dark mode, route outliers |
| Low | 6 | copy polish, icon consistency, scrollbars, decoration, metadata, minor density |

## Critical Issues

### C1. CSS Cascade Prevents Design-System Consistency

Evidence:

- `src/styles.css` imports `tokens.css`, then many large route and polish stylesheets: `workspacePolish.css`, `homeWorkspaceCompact.css`, `builderDocs.css`, `themeModes.css`, `dashboardSquareTiles.css`, `enterprisePolish.css`, and `layoutArchitecturePass.css`.
- `workspacePolish.css`, `builder.css`, `builderDocs.css`, `dashboard.css`, and `themeModes.css` contain many `!important` overrides.
- Dashboard and builder rules override shared surfaces such as chart cards, sidebars, buttons, modal boxes, grid items, and chart renderers.

Impact:

- The same component can look different depending on import order and route context.
- Future UI phases can regress silently because late CSS files override shared component classes.
- Design tokens from `DESIGN_SYSTEM_V2.md` are documented but not the single source of visual truth.

Design-system violation:

- Component guidelines require predictable cards, controls, modals, and dashboard surfaces.
- Current cascade makes those contracts unreliable.

### C2. Chart Presentation Does Not Yet Meet Enterprise BI Consistency

Evidence:

- `src/components/charts/ChartRenderer.jsx` uses `FALLBACK_COLORS = ["#fb7185", "#fdba74", "#fde68a", "#60a5fa", "#a78bfa", "#34d399"]`, which differs from the V2 chart palette order.
- `src/components/charts/ChartJsRenderer.jsx` and `src/utils/chartTheme.js` use hardcoded chart background and title colors such as `#ffffff` and `#0f172a`.
- `src/components/dashboard/ChartCard.jsx` exposes chart metadata in multiple areas, while `workspacePolish.css` hides some chart card metadata and controls with `display: none !important`.
- KPI trend symbols in `src/components/charts/KPIWidget.jsx` should be verified for clean, readable glyph output across encoding and font rendering.

Impact:

- Charts can feel like separate products rather than one BI platform.
- Duplicated or hidden metadata reduces trust and makes chart behavior harder to reason about.
- Palette drift weakens executive-dashboard readability.

Design-system violation:

- Chart guidelines require restrained palettes, muted grids, strong labels, and no duplicate legends or metadata.

### C3. Responsive Behavior Is Fragmented and Fragile

Evidence:

- Breakpoints are spread across many files, including 1500, 1400, 1320, 1300, 1280, 1279, 1260, 1200, 1180, 1120, 1100, 1024, 980, 920, 768, 760, 640, 520, 420, 390, 375, and 320 px patterns.
- `workspacePolish.css` uses `!important` layout overrides for dashboard workspace, chart cards, builder panes, and mobile stacking.
- Some responsive fixes force grid or chart behavior at CSS level instead of following a documented desktop/tablet/mobile layout model.

Impact:

- Mobile and tablet behavior is hard to predict.
- Dashboard canvas and builder panes can break when one route-level polish file changes.
- The requested desktop 4-column, tablet 2-column, mobile 1-column rhythm is not consistently expressed.

Design-system violation:

- Dashboard and mobile guidelines require readable charts and predictable column behavior.

### C4. BI Table System Is Missing or Underpowered

Evidence:

- The design system asks for sticky headers, row hover, density options, numeric alignment, and horizontal overflow for dense data.
- The source scan shows chart table wrappers and query/result areas, but no unified table component or shared table style contract.
- Exact-value and table fallback presentation is not as mature as chart/card presentation.

Impact:

- Enterprise BI users need tabular inspection to validate chart insights.
- Without a table system, every query/result/table-like surface will continue to drift.

Design-system violation:

- Table guidelines are not implemented consistently across the product.

## High Issues

### H1. Hardcoded Colors and Route-Local Palettes

Evidence:

- Hardcoded colors appear across `auth.css`, `builder.css`, `builderDocs.css`, `dashboard.css`, `workspacePolish.css`, `layoutArchitecturePass.css`, `themeModes.css`, chart utilities, and chart components.
- `workspacePolish.css` introduces Power BI-like variables such as `--pbi-blue`.
- `builderDocs.css` and Dashboard Home V2 styles introduce local token families instead of using global `--ds-*` aliases.

Impact:

- Brand color, semantic status, chart palette, dark mode, and focus states drift between routes.

Expected standard:

- Use `--ds-primary`, semantic tokens, surface tokens, text tokens, border tokens, and chart palette tokens as the first choice.

### H2. Typography Scale Is Not Aligned to V2

Evidence:

- Many styles use `clamp()` for headings and KPI values, including auth, dashboard, builder, and chart surfaces.
- Negative letter spacing appears in dashboard titles, auth hero headings, KPI values, and polish files.
- Builder and compact workspace styles use 7, 9, 10, and 11 px text in multiple places.

Impact:

- Dense UI becomes harder to scan.
- Page hierarchy varies between Home, Dashboard, Builder, and Auth.

Expected standard:

- H1 36, H2 28, H3 22, body 14, caption 12.
- Normal letter spacing should be `0`; uppercase metadata can use modest tracking.

### H3. Card Radius, Borders, and Elevation Are Inconsistent

Evidence:

- Card and panel radii include 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, and 28 px across CSS files.
- Some cards use heavy gradients and shadows; others are flat with nested borders.
- Dashboard and builder areas frequently use bordered cards inside bordered cards.

Impact:

- The interface reads as assembled from multiple design systems.
- Nested borders add noise and reduce the premium SaaS feel.

Expected standard:

- Cards and panels use 8 px or less.
- 12 px is reserved for modals, floating menus, and large premium surfaces.
- Use soft shadow for hover/raised state, not as constant decoration.

### H4. Button and Control Styles Are Fragmented

Evidence:

- `src/components/ui/Button.jsx` defines variants, but many screens use custom classes: auth buttons, dashboard toolbar buttons, sidebar buttons, share modal tabs, builder buttons, chart picker items, and Home quick-action buttons.
- Heights range from compact 28-30 px controls to larger 44-46 px buttons.
- Some controls rely on text abbreviations or custom icon-like labels.

Impact:

- Button hierarchy is inconsistent: primary, secondary, and ghost actions do not always read correctly.
- Hit area and focus styling vary by route.

Expected standard:

- Shared primary, secondary, ghost, and danger patterns.
- 36-40 px dense BI controls unless a larger mobile target is needed.

### H5. Modal and Drawer Styling Is Not Unified

Evidence:

- Modal styles are scattered across dashboard, workspace polish, BI components, and UI components.
- `DashboardShareModal.jsx`, `DatasetExplorerModal.jsx`, `CommandPaletteModal.jsx`, `DashboardFullscreenModal.jsx`, `CreateProjectModal.jsx`, and the dashboard rename modal use different classes and surface treatment.
- Some modal surfaces use 24 px radius, while V2 reserves 12 px for modals and premium floating surfaces.

Impact:

- Dialogs feel inconsistent and can weaken trust for share/save/delete flows.
- Keyboard and focus visuals are harder to standardize.

Expected standard:

- One modal surface system: title, close button, focus-visible state, primary action, secondary action, 12 px radius, and `--ds-shadow-lg`.

### H6. Navigation Contains Visual Noise and Inconsistent Icons

Evidence:

- `SidebarLeft.jsx` includes disabled coming-soon destinations such as templates, datasets, favorites, recent, and settings.
- Several navigation marks are two-letter text abbreviations rather than familiar icons.
- App header, left sidebar, dashboard tabs, and builder navigation use separate styles.

Impact:

- Primary navigation does not focus only on meaningful destinations.
- Disabled roadmap items compete with usable actions.

Expected standard:

- Active destinations first; roadmap/help items secondary.
- Use recognizable icons or consistent symbolic marks.

### H7. Form Styling Is Inconsistent

Evidence:

- `src/components/ui/Input.jsx` exists, but auth pages, dashboard modals, share modal, builder controls, dataset search, and query controls use custom input classes.
- Input heights, borders, focus rings, labels, helper text, and errors vary.

Impact:

- Form-heavy flows feel less polished than the redesigned Home surface.
- Error and loading states do not have a uniform visual language.

Expected standard:

- Visible labels, adjacent error text, 36-40 px control height for BI UI, consistent focus ring, clear disabled/loading state.

### H8. Accessibility Patterns Are Present but Incomplete

Evidence:

- Positives: several pages use accessible labels, `role="main"`, loading states, and auth error announcements.
- Gaps: chart alternatives, modal labelling consistency, keyboard menu semantics, chart card focus behavior, and disabled navigation treatment need route-wide review.

Impact:

- Keyboard and assistive-technology users may receive inconsistent context, especially in chart-heavy and modal-heavy workflows.

Expected standard:

- Every modal has a labelled title and close button.
- Every icon button has an accessible name.
- Charts have a readable title, description, and fallback or summary when possible.

## Medium Issues

### M1. Spacing Does Not Follow a Stable 8 px Rhythm

Evidence:

- CSS uses many intermediate values: 5, 6, 7, 9, 10, 12, 14, 18, 20, and 22 px.
- Builder and compact workspace surfaces are especially dense.

Impact:

- Panels feel cramped in some routes and overly padded in others.

Recommended correction:

- Normalize route surfaces to 8, 16, 24, 32, 48, and 64 px for layout; keep 4 or 12 px only for tight internal control details where V2 allows it.

### M2. Shadow System Is Not Consistent

Evidence:

- Some components rely on no shadow, some on heavy blur shadows, and some on route-specific gradients.

Impact:

- Elevation does not consistently indicate interactivity or hierarchy.

Recommended correction:

- Use `--ds-shadow-xs` for normal cards, `--ds-shadow-sm` for hover, `--ds-shadow-md` for popovers, and `--ds-shadow-lg` for modals.

### M3. Loading, Empty, and Error States Need Shared Visual Treatment

Evidence:

- `EmptyState.jsx`, chart status cards, auth loading/error, dashboard empty states, builder empty/drop states, and read-only share states each have separate styling.

Impact:

- Non-happy paths feel less cohesive than primary dashboard screens.

Recommended correction:

- Create one visual state pattern with icon area, title, body, and action row.

### M4. Auth Pages Are a Visual Outlier

Evidence:

- Auth styles use larger hero typography, stronger decoration, different buttons, and custom inputs.

Impact:

- The transition from auth to BI workspace feels like a product switch.

Recommended correction:

- Keep auth expressive but align tokens, typography, inputs, and buttons with V2.

### M5. Builder Density Is Too High for a Premium SaaS Experience

Evidence:

- Builder CSS contains many 9-11 px captions, dense grids, compact buttons, multiple panels, and repeated card-like field selectors.

Impact:

- The chart builder can feel powerful but visually busy.

Recommended correction:

- Move toward modern explorer panel, field mapping cards, accordion settings, and a calmer preview area as described in the roadmap.

### M6. Dashboard Canvas Uses Mixed Editing and Viewing Signals

Evidence:

- Dashboard chart cards, sidebars, tabs, toolbar, selection state, metadata, and inspector styles are spread across multiple CSS files.

Impact:

- View mode and edit mode do not always have a clean visual separation.

Recommended correction:

- Create separate visual modes for executive viewing and editing/customization.

### M7. Dark Mode Overrides Are Broad

Evidence:

- `themeModes.css` and dark selectors in route CSS override many surfaces with route-specific rules and `!important`.

Impact:

- Dark mode parity is difficult to maintain and can diverge from light mode improvements.

Recommended correction:

- Tokenize dark mode through global semantic aliases, then reduce component-level dark overrides.

### M8. Public/Read-Only Views Need Alignment With App UI

Evidence:

- `SharePage.jsx`, `DashboardPublicPage.jsx`, and read-only frame/header/state components use their own visual treatment.

Impact:

- Shared dashboards can feel less premium than the workspace that created them.

Recommended correction:

- Apply the same chart card, dashboard header, empty state, and surface tokens to read-only views.

## Low Issues

### L1. Metadata Ordering Is Inconsistent

Some cards place type/source/rows near the header, others place it in footers or badges. Metadata should be last unless it changes the user's decision.

### L2. Coming-Soon Labels Compete With Primary Workflows

Disabled navigation and placeholder states should move to a roadmap/help area or become much quieter.

### L3. Decorative Gradients Are Overused in Some Areas

Gradients appear in auth, builder, chart placeholders, and Home surfaces. V2 supports light glassmorphism, but gradients should not dominate operational screens.

### L4. Scrollbar and Overflow Styling Is Not Unified

Scrollable sidebars, picker panels, tables, and chart wrappers use different overflow treatments.

### L5. Icon Style Is Inconsistent

Some buttons use text abbreviations, some use symbols, and some use text-only controls. The system should prefer familiar icons with labels/tooltips.

### L6. Microcopy Tone Varies

Labels range from internal/admin language to polished SaaS language. The enterprise BI direction should use clear, executive, action-oriented copy.

## Area-by-Area Findings

### Pages

| Area | Findings | Severity |
| --- | --- | --- |
| Home | Newer dashboard treatment improves hierarchy, but local home tokens and custom button/card classes add another visual island. | Medium |
| Dashboard Canvas | Most affected by cascade, mixed chart metadata, sidebar density, and responsive overrides. | Critical |
| Chart Builder | Powerful but dense; large CSS file contains many local colors, radii, micro text, and custom controls. | High |
| Login/Register | Strong visual identity but not aligned with workspace controls and typography scale. | Medium |
| Share/Public | Needs stronger alignment with chart cards, empty states, and dashboard header system. | Medium |

### Components

| Area | Findings | Severity |
| --- | --- | --- |
| UI primitives | `Button`, `Input`, `Panel`, `Badge`, `EmptyState`, and `SectionHeader` exist, but many routes bypass them. | High |
| Project cards | Improved Home presentation, but project-card styling should be reconciled with shared card tokens. | Medium |
| Dashboard cards | Chart cards have duplicate/hidden metadata patterns and route overrides. | Critical |
| Chart picker | Custom card/list controls diverge from buttons, cards, and form controls. | High |
| Read-only frames | Need token alignment and table/empty/error consistency. | Medium |

### Layouts and Navigation

| Area | Findings | Severity |
| --- | --- | --- |
| App shell | Header, sidebar, right rail, dashboard tabs, and builder panels use separate visual systems. | High |
| Left sidebar | Disabled items and text abbreviations add noise. | High |
| Right sidebar/inspector | Useful but dense; should be collapsible and mode-aware in later phases. | High |
| Responsive shell | Breakpoints and CSS overrides are fragmented. | Critical |

### Widgets and Charts

| Area | Findings | Severity |
| --- | --- | --- |
| KPI widget | Needs final typography, semantic trend color, clean glyph rendering, and consistent card anatomy. | High |
| Chart renderer | Palette and chart theme defaults are not fully aligned with V2. | Critical |
| Chart card | Duplicate metadata and hidden controls create inconsistency. | Critical |
| Chart skeleton/error | Needs shared loading/error state styling. | Medium |

### Modals, Drawers, and Menus

| Area | Findings | Severity |
| --- | --- | --- |
| Create project modal | Should align to shared modal surface and form styles. | High |
| Share modal | Custom tabs, cards, and modal radius differ from V2. | High |
| Dataset explorer modal | Needs unified modal, table/list, and search control treatment. | High |
| Command palette | Needs shared overlay/menu semantics and visual system. | Medium |
| Fullscreen modal | Should align with dashboard header/chart card tokens. | Medium |

### Tables and Forms

| Area | Findings | Severity |
| --- | --- | --- |
| Tables | No unified enterprise table system is evident. | Critical |
| Inputs | Multiple raw/custom input systems bypass `Input.jsx`. | High |
| Query/result controls | Need consistent dense control and data table styling. | High |
| Search fields | Need shared height, focus, icon, and placeholder treatment. | Medium |

## Design-System Violation Matrix

| Category | Current Pattern | V2 Target | Severity |
| --- | --- | --- | --- |
| Spacing | Mixed 5/6/7/9/10/12/14/18/20/22 values | 8 px rhythm, documented exceptions only | Medium |
| Typography | Clamp sizes, negative tracking, micro text | H1 36, H2 28, H3 22, body 14, caption 12 | High |
| Color | Hardcoded route palettes | `--ds-*` tokens and BI chart palette | High |
| Buttons | Many custom button classes | Primary/secondary/ghost/danger variants | High |
| Cards | Mixed radius, shadows, nested borders | 8 px cards, soft shadow, less nesting | High |
| Modals | Scattered modal styles, mixed radii | One 12 px modal system | High |
| Tables | No shared BI table contract | Sticky header, hover, density, numeric alignment | Critical |
| Charts | Palette drift, duplicate metadata, hidden controls | Clear title/description/chart, muted clutter | Critical |
| Responsive | Many breakpoints and forced overrides | Desktop 4, tablet 2, mobile 1 | Critical |
| Accessibility | Partial labels and states | Consistent modal, menu, chart, button semantics | High |

## Audit Conclusion

The next implementation phase should not start with broad visual edits across every component. The safest path is to create a small presentation-only foundation first: token aliases, shared component style contracts, and route-specific cleanup rules. Then apply them screen by screen in the approved order: Dashboard Home, KPI cards, charts, data tables, navigation, and mobile layout.

Any change that alters chart data, state, routing, API calls, calculations, or grid layout behavior must be stopped and separately approved.
