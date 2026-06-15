# Design System V2

Target experience: Modern SaaS Analytics Dashboard, Enterprise BI Dashboard, Executive KPI Dashboard  
Style direction: Clean, modern, premium, light glassmorphism, professional  
Scope: Documentation only. No application code was modified.

## Design Principles

- Prioritize data clarity over decoration.
- Make executive decisions fast: value, delta, context, risk, action.
- Keep authoring controls available but visually secondary to insights.
- Use light glass surfaces sparingly for premium depth, not heavy blur effects.
- Prefer consistent density, predictable spacing, and quiet interaction states.
- Preserve behavior while improving presentation.

## Color Tokens

### Core Surfaces

| Token | Value | Use |
| --- | --- | --- |
| `--ds-bg-page` | `#f5f7fb` | App background |
| `--ds-bg-canvas` | `#eef3f8` | Dashboard canvas/grid area |
| `--ds-surface` | `#ffffff` | Cards, panels, forms |
| `--ds-surface-soft` | `#f8fafc` | Subtle nested areas |
| `--ds-surface-glass` | `rgba(255, 255, 255, 0.78)` | Premium light glass panels |
| `--ds-surface-raised` | `#ffffff` | Modals and floating menus |

### Text

| Token | Value | Use |
| --- | --- | --- |
| `--ds-text-strong` | `#0f172a` | Titles, KPI values |
| `--ds-text` | `#1e293b` | Body text |
| `--ds-text-muted` | `#64748b` | Secondary metadata |
| `--ds-text-soft` | `#94a3b8` | Hints, disabled labels |
| `--ds-text-inverse` | `#ffffff` | Text on dark/accent backgrounds |

### Brand and Data Accents

| Token | Value | Use |
| --- | --- | --- |
| `--ds-primary` | `#2563eb` | Primary actions, active state |
| `--ds-primary-hover` | `#1d4ed8` | Primary hover |
| `--ds-primary-soft` | `rgba(37, 99, 235, 0.10)` | Selected surfaces |
| `--ds-cyan` | `#0891b2` | Secondary data accent |
| `--ds-teal` | `#0f766e` | Positive/supporting data |
| `--ds-violet` | `#6366f1` | Comparison series |
| `--ds-rose` | `#be123c` | Alerting series |

### Semantic

| Token | Value | Use |
| --- | --- | --- |
| `--ds-success` | `#16a34a` | Positive status |
| `--ds-warning` | `#d97706` | Warning status |
| `--ds-danger` | `#dc2626` | Error/destructive |
| `--ds-info` | `#0284c7` | Informational |
| `--ds-success-soft` | `rgba(22, 163, 74, 0.10)` | Success chip background |
| `--ds-warning-soft` | `rgba(217, 119, 6, 0.12)` | Warning chip background |
| `--ds-danger-soft` | `rgba(220, 38, 38, 0.10)` | Error chip background |
| `--ds-info-soft` | `rgba(2, 132, 199, 0.10)` | Info chip background |

### Borders

| Token | Value | Use |
| --- | --- | --- |
| `--ds-border-subtle` | `#e2e8f0` | Standard card borders |
| `--ds-border` | `#cbd5e1` | Inputs, panels |
| `--ds-border-strong` | `#94a3b8` | Hover, active outlines |
| `--ds-border-focus` | `#2563eb` | Focus-visible border |

### Chart Palette

Use this order for BI charts:

1. `#2563eb` blue
2. `#0f766e` teal
3. `#6366f1` violet
4. `#d97706` amber
5. `#be123c` rose
6. `#0891b2` cyan
7. `#64748b` slate
8. `#16a34a` green

Rules:

- Use blue for the primary metric only.
- Use semantic colors only when the meaning is semantic.
- Avoid rainbow palettes for executive dashboards.
- Use muted grid lines and strong labels.
- Ensure each series has sufficient contrast against white and dark surfaces.

## Typography Scale

| Token | Size | Line Height | Weight | Use |
| --- | --- | --- | --- | --- |
| `--ds-font-2xs` | 10px | 1.2 | 700 | Eyebrows, compact labels |
| `--ds-font-xs` | 11px | 1.3 | 600 | Chips, metadata |
| `--ds-font-sm` | 12px | 1.4 | 500-600 | Controls, table text |
| `--ds-font-md` | 14px | 1.5 | 400-600 | Body and forms |
| `--ds-font-lg` | 16px | 1.45 | 600 | Card titles |
| `--ds-font-xl` | 20px | 1.3 | 700 | Section titles |
| `--ds-font-2xl` | 24px | 1.2 | 700 | Page titles |
| `--ds-font-3xl` | 32px | 1.12 | 700 | Dashboard title |
| `--ds-font-kpi` | 36px | 1.0 | 750 | KPI values |

Guidelines:

- Use letter spacing `0` for normal text.
- Uppercase labels may use `0.04em` to `0.08em`, but only for metadata.
- Avoid negative letter spacing inside compact panels and cards.
- KPI values should use tabular numerals where available.

## Spacing Scale

| Token | Value | Use |
| --- | --- | --- |
| `--ds-space-0` | 0 | Reset |
| `--ds-space-1` | 4px | Tight internal gaps |
| `--ds-space-2` | 8px | Control/icon gaps |
| `--ds-space-3` | 12px | Compact card padding |
| `--ds-space-4` | 16px | Standard card padding |
| `--ds-space-5` | 20px | Section spacing |
| `--ds-space-6` | 24px | Page panel padding |
| `--ds-space-7` | 32px | Large page gaps |
| `--ds-space-8` | 40px | Major sections |

Guidelines:

- Use 8 px grid alignment.
- Dashboard cards should use 12-16 px internal padding.
- Page bands should use 20-24 px padding on desktop and 12-16 px on mobile.
- Do not nest cards inside cards unless the inner element is a repeated data item or modal content.

## Border Radius System

| Token | Value | Use |
| --- | --- | --- |
| `--ds-radius-none` | 0 | Flush containers |
| `--ds-radius-sm` | 4px | Inputs, small controls |
| `--ds-radius-md` | 6px | Buttons, tabs, chips |
| `--ds-radius-lg` | 8px | Cards and panels |
| `--ds-radius-xl` | 12px | Modals and premium surfaces only |
| `--ds-radius-pill` | 999px | Pills and avatars |

Guidelines:

- Default card radius should be 8 px or less.
- Use 12 px only for modals, floating menus, and large glass panels.
- Avoid mixing many radii on the same screen.

## Shadow System

| Token | Value | Use |
| --- | --- | --- |
| `--ds-shadow-none` | `none` | Dense dashboard panels |
| `--ds-shadow-xs` | `0 1px 2px rgba(15, 23, 42, 0.04)` | Subtle card separation |
| `--ds-shadow-sm` | `0 8px 20px rgba(15, 23, 42, 0.06)` | Hover/raised controls |
| `--ds-shadow-md` | `0 16px 36px rgba(15, 23, 42, 0.10)` | Popovers, menus |
| `--ds-shadow-lg` | `0 24px 64px rgba(15, 23, 42, 0.18)` | Modals |
| `--ds-shadow-focus` | `0 0 0 3px rgba(37, 99, 235, 0.16)` | Focus |

Guidelines:

- Use borders for normal dashboard structure.
- Use shadows for floating elements and active hover states.
- Glassmorphism should combine a subtle border, very light shadow, and low blur.

## Component Guidelines

### Buttons

- Primary: one per action group.
- Secondary: normal dashboard operations.
- Ghost: low-priority toolbar actions.
- Destructive: text and border use danger color; avoid full red fills except confirmation.
- Icon buttons must have an accessible label and tooltip for unfamiliar actions.

### Cards and Panels

- Use cards for repeated items: projects, KPI metrics, charts, templates.
- Use unframed sections for page-level layout.
- Card header should contain title, subtitle/metadata, and actions.
- Avoid duplicate metadata in card footer unless the footer provides new information.

### Forms

- Labels always visible.
- Error text should be adjacent to the field and announced when possible.
- Use 36-40 px control height for dense BI UI.
- Preserve clear disabled and loading states.

### Navigation

- Primary nav should include only active or meaningful destinations.
- Coming-soon items should be moved to a secondary roadmap/help area or visually de-emphasized.
- Use icons instead of text abbreviation marks where practical.

### Modals and Menus

- Modals require title, close button, escape handling, focus management, and clear primary action.
- Menus should support keyboard navigation and correct menu semantics.

## Dashboard Guidelines

### Desktop Layout

Recommended hierarchy:

1. App shell navigation.
2. Dashboard header with title, status, owner/source, updated time.
3. Global filter bar.
4. KPI summary strip.
5. Main chart grid.
6. Right inspector/insights rail.

### Modes

- Edit mode: show grid, drag handles, selection outlines, add/edit controls.
- Read mode: hide authoring chrome, emphasize insights and chart readability.
- Share mode: show read-only badge, source, update date, and export/share affordances.

### KPI Cards

Each KPI card should include:

- Metric label.
- Current value.
- Delta and direction.
- Comparison period.
- Optional sparkline.
- Source/update metadata.
- Status if attention is needed.

### Dashboard Empty State

Empty dashboard state should include:

- Clear title.
- Short explanation.
- Primary action: add chart.
- Secondary action: open saved charts or templates.
- Optional preview illustration made from simple dashboard blocks.

## Table Guidelines

- Tables should support compact density by default.
- Header row should be sticky in scrollable panels.
- Numeric values align right; text aligns left.
- Use tabular numerals for metrics.
- Provide empty, loading, and error states inside the table frame.
- Use row hover only where rows are interactive.
- Preserve horizontal scroll for wide datasets, but keep key columns visible where possible.
- Include a visible result count and active filter summary.

## Chart Guidelines

### Chart Card Anatomy

- Header: title, subtitle/timeframe, actions.
- Body: chart with sufficient breathing room.
- Footer: only if needed for source/update/status.
- Details: accessible summary and optional data table.

### Chart Styling

- Axis labels: 10-12 px, muted slate.
- Grid lines: subtle, low contrast.
- Tooltip: high contrast, compact, includes series and value.
- Legend: bottom or right depending on chart width; hide or simplify on tiny cards.
- Title inside chart canvas should generally be off if the card already has a title.

### Data Density

- Tiny card: hide legend and nonessential axis titles.
- Compact card: reduce tick count and legend padding.
- Standard card: show full labels when possible.
- Fullscreen: restore complete legend, axis titles, and data labels if useful.

### Accessibility

- Every chart should have an accessible summary.
- Provide a table/details fallback for screen readers and precise values.
- Do not rely on color alone for semantic meaning.
- Use pattern, label, or text support for positive/negative states.

## Glassmorphism-Light Rules

- Use only on top-level premium surfaces, auth panels, modals, and optional dashboard command panels.
- Background: `rgba(255,255,255,0.72-0.84)`.
- Border: `1px solid rgba(203,213,225,0.70)`.
- Backdrop blur: 8-12 px.
- Shadow: subtle only.
- Do not use glass on every chart card; it reduces data clarity.
