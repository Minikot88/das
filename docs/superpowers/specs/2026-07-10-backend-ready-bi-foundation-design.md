# Backend-ready BI Foundation Design

**Status:** Historical design input - not approved for implementation
**Date:** 2026-07-10
**Project:** DashboardMiniBi

> Execution is governed by `docs/audit-remediation-plan.md`. The architecture
> and phase boundaries below predate the authoritative 2026-07-11 Phase 1-8
> objective and are retained only as design context.

## Purpose

Evolve DashboardMiniBi from a frontend-only prototype into a stable local-first BI foundation that can adopt a Node.js + Express + MySQL/MariaDB backend without replacing its frontend domain again. Delivery is strictly phase-gated: Phase 1 through Phase 8 run in order, and each phase must pass its verification gate before the next phase starts.

## Evidence and baseline

- Primary audit: `outputs/dashboard-mini-bi-complete-project-audit-2026-07-10.html`.
- Current routes are declared in `src/app/AppRoutes.jsx`.
- Current persistence is split between `mini-bi-v8-workspace` and `mini-bi-projects`, with additional designer/share/connection keys.
- Baseline on 2026-07-10: `npm ls`, lint, 9 tests, build, and Docker Compose config pass.
- `npm audit --audit-level=moderate` fails with two high, one moderate, and one low development-toolchain findings.
- The production build warns that `ChartPreview` is 869.09 kB minified and global CSS is 825.57 kB.
- `database/`, spreadsheet sources, and the audit output are user-owned untracked artifacts and must not be silently rewritten, removed, or included in unrelated commits.

## Selected approach

Use a new versioned canonical workspace repository with compatibility adapters. This is the selected approach in `2026-07-10-canonical-workspace-design.md` and is safer than promoting either the Zustand UI store or `projectStorage` as the long-term domain boundary.

The product contract is:

```text
Home -> Dataset -> Chart -> Dashboard -> Publish/Share
```

Each step must disclose whether it is local demo behavior, an available read-only local behavior, or backend-required behavior.

## Architecture

1. A canonical workspace owns Project, Dataset, Chart, Dashboard, Widget, Share metadata, Settings, and secret-free Connection metadata.
2. Legacy localStorage keys remain readable through idempotent migrations and compatibility facades.
3. UI routes consume repository/service contracts rather than persistence shapes.
4. Chart data contracts bind every saved chart to a dataset, deterministic query, or immutable result snapshot.
5. Public/share routes never reuse protected editor URLs and never imply server authorization in local mode.
6. Connection secrets stay ephemeral in the browser. Persisted/exported structures contain safe metadata and future vault reference placeholders only.
7. Mock and HTTP adapters expose equivalent endpoint-shaped operations so local demo mode remains functional.

## Phase boundaries

- Phase 1 records the baseline and adds safety tests without deep behavior changes.
- Phase 2 implements the canonical repository and legacy migration.
- Phase 3 removes secret persistence and establishes honest share/publish behavior.
- Phase 4 fixes CSV, SQL result, dataset, and dashboard replay correctness.
- Phase 5 fixes save durability, assets, responsive fit, settings, themes, and dialog presentation.
- Phase 6 creates TypeScript, lint, test, accessibility, dependency, and aggregate quality gates.
- Phase 7 consolidates legacy paths, CSS/theme ownership, bundle risk, deployment, and documentation.
- Phase 8 defines backend/API/DB ownership and adapters; a backend scaffold is optional and must not weaken auth or secret handling.

## Error and migration policy

- Unknown future canonical schema versions are read-only errors; they are never overwritten.
- Migration is whitelist-based, idempotent, and records conflicts/provenance.
- Invalid or missing dataset/chart snapshots produce explicit user-facing states instead of falling back to unrelated demo rows.
- Storage quota or serialization failure is surfaced and does not destroy the last valid snapshot.
- Legacy keys are not deleted until equivalent behavior is tested or redirected.

## Testing strategy

- Unit tests: migrations, redaction, CSV parser/limits, SQL aliases, chart data contracts, fit calculation, formatting, and API adapters.
- Integration tests: app boot, route protection/loading, canonical selection, import-to-dashboard journey, share/public behavior, settings, and durability.
- Static gates: TypeScript, ESLint for JS/JSX/TS/TSX, dependency audit, production build, and Docker Compose validation.
- Accessibility: automated axe checks where feasible plus keyboard/focus smoke tests and semantic source review.
- Runtime verification: desktop and narrow viewport checks with the in-app browser after behavior and layout phases.

## Safety constraints

- No real secret may be persisted, exported, copied, logged, placed in preview config, or embedded in a credential-bearing URL.
- No broad major dependency upgrade unless a verified security/toolchain requirement forces it.
- No database migration execution against a non-ephemeral environment.
- No production auth shortcut, insecure public token, or client-side claim of tenant isolation.
- Existing user changes and untracked database/audit artifacts remain intact.

## Completion contract

The goal is complete only when all 22 audit roadmap items are fixed, safely disabled, tested, or explicitly assigned to backend work; Phase 1–8 verification documents exist; `npm run check` and `npm run build` pass; no unresolved high audit finding remains without a safe documented exception; and the local primary journey reaches either a working safe read-only view or an honest backend-required state.
