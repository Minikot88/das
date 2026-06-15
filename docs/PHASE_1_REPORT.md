# Phase 1-3 Report: Design Tokens, Global Layout, Navigation

Status: implemented through Phase 3 and stopped.

Scope approved:

- Phase 1: Design Tokens
- Phase 2: Global Layout
- Phase 3: Navigation

Guardrails observed:

- No API contracts changed.
- No routing behavior changed.
- No dashboard canvas logic changed.
- No chart builder logic changed.
- No inspector/widget logic changed.
- No store/reducer/action logic changed.

## Files Changed

| File | Purpose |
| --- | --- |
| `src/styles/tokens.css` | Added centralized enterprise BI design-system aliases for colors, spacing, radius, typography, shadows, z-index, focus, and motion. |
| `src/styles/theme.css` | Added global heading scale alignment and softer scrollbar treatment. |
| `src/styles/layout.css` | Modernized app shell spacing, header sizing, top navigation, sidebar spacing, icon containers, active states, and focus-ready layout styling. |
| `src/styles/enterprisePolish.css` | Updated final cascade overrides so the late enterprise layer preserves the new header/sidebar spacing and control rhythm. |
| `src/layout/AppHeader.jsx` | Added consistent top-nav icons, fixed `/home` active-state alias, and cleaned shell metadata separators. |
| `src/layout/SidebarLeft.jsx` | Replaced two-letter nav marks with consistent inline SVG icons and fixed `/home` active-state alias. |
| `docs/PHASE_1_REPORT.md` | This implementation report. |

## Token Structure

Added or aligned token families:

- Colors:
  - `--ds-bg-page`
  - `--ds-bg-canvas`
  - `--ds-surface`
  - `--ds-surface-soft`
  - `--ds-surface-glass`
  - `--ds-text-*`
  - `--ds-primary`
  - `--ds-success`
  - `--ds-warning`
  - `--ds-danger`
  - `--ds-info`
  - `--ds-border-*`

- Spacing:
  - Preserved existing `--space-*` aliases.
  - Added enterprise 8px rhythm aliases from `--ds-space-1` through `--ds-space-6`.

- Radius:
  - Aligned global radius aliases to the approved 8 / 12 / 16 system.
  - Added `--ds-radius-sm`, `--ds-radius-md`, `--ds-radius-lg`, and `--ds-radius-pill`.

- Typography:
  - Added `--font-size-10`, `--font-size-22`, `--font-size-28`, and `--font-size-36`.
  - Added `--ds-font-h1`, `--ds-font-h2`, `--ds-font-h3`, `--ds-font-body`, and `--ds-font-caption`.
  - Global H1/H2/H3 now align to the requested 36 / 28 / 22 hierarchy.

- Shadows and focus:
  - Added `--ds-shadow-*` aliases.
  - Aligned focus ring to `--ds-shadow-focus`.

- Motion and z-index:
  - Added `--ease-enterprise`.
  - Added `--z-toast` and `--z-command`.

## Layout Improvements

- Increased main content rhythm from compact shell padding to a roomier enterprise workspace rhythm.
- Header is now a clearer 64px command surface at desktop width.
- App background gained a soft data-platform depth treatment using existing tokens.
- Header controls use more consistent 40px hit areas.
- Top search uses a wider, calmer enterprise command/search shape.
- App shell keeps route behavior unchanged while improving the visual hierarchy around the existing pages.

## Navigation Improvements

- Sidebar no longer relies on two-letter text blocks for navigation icons.
- Top navigation and sidebar now share a consistent inline SVG icon language.
- Active state now correctly highlights Home on both `/` and `/home`.
- Sidebar expanded spacing is more breathable.
- Sidebar collapsed mode keeps icon-only affordances.
- Hover states are softer and less border-heavy.
- Active states use subtle surface elevation and a primary accent.
- Coming-soon items remain disabled placeholders; no new routes were added.

## Screens Updated

Directly affected by global shell/navigation changes:

- Home (`/`, `/home`)
- Dashboard shell around `/dashboard`
- Builder shell around `/builder`
- Authenticated global layout

Not directly modified:

- Dashboard Canvas implementation
- Dashboard widgets
- Chart rendering logic
- Chart Builder behavior
- Inspector behavior
- API or store logic

## Before vs After Summary

Before:

- Design tokens existed but did not expose a complete enterprise BI alias set.
- Several styles referenced missing or narrow tokens such as `--font-size-10`.
- Header and sidebar were compact and visually dense.
- Navigation icons used text abbreviations like `HM`, `DB`, and `BL`.
- `/home` did not receive the same active navigation state as `/`.

After:

- Centralized `--ds-*` tokens define the approved visual system while preserving legacy aliases.
- Header and sidebar have a calmer enterprise platform rhythm.
- Top and side navigation use consistent icons.
- Active and hover states are clearer and less noisy.
- `/home` and `/` now map to the same Home active state without changing routes.

## Risks

- The app still has late legacy CSS layers that override portions of the design system. This phase updated the most relevant shell overrides, but more cleanup should happen in later approved phases.
- The global radius token change can affect surfaces beyond the shell because legacy styles use `--radius-*` aliases broadly.
- The working tree contains many unrelated pre-existing uncommitted changes outside this phase, so committing only this phase is not safe without a separate cleanup decision.

## Verification

Commands:

- `npm run build` passed.
- `npm run lint` passed.

Browser sanity check:

- Verified `/home` at desktop viewport.
- Header height: 64px.
- Sidebar width: 248px.
- Top nav icons present: 3.
- Sidebar icons present: 8.
- Active Home state present for `/home`.
- Browser console errors: none.
