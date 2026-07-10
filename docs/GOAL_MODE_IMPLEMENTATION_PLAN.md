# DashboardMiniBi Goal Mode Implementation Plan

> **For agentic workers:** Execute inline and sequentially. Use test-first changes for behavior, verify each phase, and do not start a later phase until `docs/PHASE_N_VERIFICATION.md` says it is safe to continue.

**Goal:** Turn DashboardMiniBi into a stable, backend-ready BI product foundation while preserving local/demo behavior and legacy data readability.

**Architecture:** Introduce a versioned canonical workspace repository with legacy adapters, then harden security, data correctness, durability, quality gates, deployment, and backend contracts around that single graph. Keep local mock mode as a first-class adapter and defer production auth, tenancy, vault, and public authorization to the backend contract.

**Tech stack:** React 19, React Router 7, Zustand 5 compatibility layer, Vite 8, Vitest, Testing Library, TypeScript, ESLint, Chart.js, ECharts, React Grid Layout, Docker/nginx, future Node.js + Express + MySQL/MariaDB.

## Global constraints

- Work Phase 1 through Phase 8 in order.
- Preserve existing demo/local behavior and legacy localStorage records.
- Never persist or export passwords, private keys, tokens, or credential-bearing URLs.
- Prefer patch/minor dependency updates; justify any major update.
- Do not delete legacy code before tests or safe redirects prove parity.
- Use Thai for user-facing progress; keep code and contracts in English.
- Preserve unrelated user changes and all pre-existing untracked artifacts.

## Baseline recorded before edits

| Command | Result on 2026-07-10 |
| --- | --- |
| `npm ls --depth=0` | PASS |
| `npm run lint` | PASS; JS/JSX only |
| `npm test -- --run` | PASS; 7 files, 9 tests |
| `npm run build` | PASS; 869.09 kB `ChartPreview` warning |
| `npm audit --audit-level=moderate` | FAIL; 2 high, 1 moderate, 1 low |
| `docker compose config --quiet` | PASS |

## Audit roadmap 1-22 mapping

- [ ] 1. Two incompatible workspace/domain stores — Phase 2
- [ ] 2. Connection profiles serialize SSH password/private key/full URL — Phase 3
- [ ] 3. Default share/embed actions point to protected editor URLs — Phase 3
- [ ] 4. Saved SQL charts replay with unrelated demo rows/fields — Phase 4
- [ ] 5. CSV duplicate headers, missing limits, and missing multiline support — Phase 4
- [ ] 6. TS/TSX files are not type-checked or linted — Phase 6
- [ ] 7. Development toolchain audit findings — Phase 6
- [ ] 8. Dashboard save and uploaded-image behavior is not durable — Phase 5
- [ ] 9. Canvas fit is hardcoded and narrow screens are unusable — Phase 5
- [ ] 10. Core accessibility contracts are incomplete — Phase 6
- [ ] 11. Tests do not cover product journeys — Phases 1, 2, 3, 4, 5, and 6
- [ ] 12. Deployment context and response hardening are incomplete — Phase 7
- [ ] 13. Current and legacy dashboard/builder paths are parallel products — Phase 7
- [ ] 14. Styling is governed by override accumulation — Phase 7
- [ ] 15. Settings are inert and themes diverge — Phase 5
- [ ] 16. Dataset and secondary layout hierarchy is inefficient — Phase 7
- [ ] 17. Bundle size is concentrated in chart/CSS infrastructure — Phase 7
- [ ] 18. Documentation/version metadata describes legacy architecture — Phases 1 and 7
- [ ] 19. The 152-table database package is untracked and disconnected — Phase 8
- [ ] 20. Dead code and scaffolding obscure ownership — Phase 7
- [ ] 21. CI, observability, and quality budgets are absent — Phases 6 and 7
- [ ] 22. Final platform polish is incomplete — Phases 5, 6, and 7

## Phase 1 — Baseline, safety harness, and product contract

**Files:** create `docs/AUDIT_REMEDIATION_CHECKLIST.md`, `docs/PHASE_1_VERIFICATION.md`; update this plan; add route/app/storage/auth/project-loading tests near the owned modules.

- [ ] Document every protected/public route and current persistence flow.
- [ ] Record the canonical Home -> Dataset -> Chart -> Dashboard -> Publish/Share contract.
- [ ] Add tests for app boot, lazy route loading, demo auth protection, storage save/load, and primary local project loading.
- [ ] Run all global verification commands and record exact results.

## Phase 2 — Canonical workspace and persistence

**Files:** create `src/domain/workspace/*`; convert `src/services/projectStorage.js` and selected Zustand actions into compatibility facades; update AppHeader, Home, Datasets, designer, canvas, and read-only consumers; create migration/integration tests and `docs/PHASE_2_VERIFICATION.md`.

- [ ] Test migrations from `mini-bi-v8-workspace` and `mini-bi-projects` before implementing converters.
- [ ] Implement `WorkspaceDocument` schema version 1 and a synchronous local repository with subscriptions.
- [ ] Implement idempotent merge, active selection, reference repair, and compatibility writers.
- [ ] Test and implement imported dataset -> chart -> dashboard visibility.
- [ ] Verify legacy routes/keys remain readable.

## Phase 3 — Security, secrets, share, and publish

**Files:** update connection storage/page and share controls/routes; add redaction/share tests; create `docs/PUBLISH_SHARE_CONTRACT.md` and `docs/PHASE_3_VERIFICATION.md`.

- [ ] Write failing tests proving secret-like input never survives save/load/duplicate/preview/export/copy.
- [ ] Implement whitelist serialization and credential-bearing URL redaction.
- [ ] Add demo/vault explanatory copy.
- [ ] Replace editor-link sharing with a consistent local read-only snapshot or explicit backend-required disabled state.
- [ ] Document auth, tenant, immutable snapshot, embed, expiry, and revoke responsibilities.

## Phase 4 — Dataset, CSV, SQL, and chart correctness

**Files:** update CSV parser/worker/page, dataset service, designer save contract, canvas rendering, and tests; create `docs/PHASE_4_VERIFICATION.md`.

- [ ] Write failing tests for duplicate normalized headers, multiline records, size/row/column limits, and clear errors.
- [ ] Implement deterministic duplicate policy and bounded standards-compliant parsing without silent corruption.
- [ ] Write failing tests for SQL aliases, saved result snapshots, dashboard replay, missing sources, and dataset deletion impact.
- [ ] Bind charts to canonical datasets or chart-specific snapshots and render explicit missing-source states.

## Phase 5 — Dashboard durability, responsive UX, settings, and assets

**Files:** update canvas/presentation CSS and settings/theme integration; add pure fit/durability/format tests; create `docs/PHASE_5_VERIFICATION.md`.

- [ ] Test and implement debounced autosave/dirty state and unload/navigation protection where needed.
- [ ] Revoke temporary object URLs and store only durable safe references or label upload session-only.
- [ ] Test and implement measured canvas fit plus narrow/mobile view-only behavior.
- [ ] Keep empty states inside the visible viewport.
- [ ] Wire supported settings; remove or mark unavailable settings that cannot be honest locally.
- [ ] Derive MUI designer theme from app theme and replace native prompts/confirms where practical.

## Phase 6 — TypeScript, linting, tests, accessibility, and security gates

**Files:** update package/lock/config/index/layout/components/tests; add `tsconfig.json`, accessibility tests, aggregate scripts, and `docs/PHASE_6_VERIFICATION.md`.

- [ ] Add TypeScript and TS/TSX ESLint coverage; fix all surfaced errors.
- [ ] Expand integration tests for the canonical journey, share state, redaction, settings, and fit.
- [ ] Fix language, landmarks, headings, accessible chart summaries, focus, keyboard paths, contrast, and reduced motion.
- [ ] Patch Vite/toolchain findings without broad major upgrades.
- [ ] Add `typecheck`, `audit`, and `check` scripts and make `npm run check` authoritative.

## Phase 7 — Consolidation, performance, CSS, dependencies, deployment, and docs

**Files:** add parity/bundle docs; update routes, CSS/tokens/theme, proven dead imports/dependencies, Docker/nginx config, README and architecture docs; create `docs/PHASE_7_VERIFICATION.md`.

- [ ] Build parity matrices and select/label canonical and legacy paths.
- [ ] Prove dead code/dependencies with import searches and tests before removal.
- [ ] Establish one token source, reduce global overrides/imports, and connect MUI theme.
- [ ] Split/lazy-load chart/catalog work where safe and document bundle budgets with before/after output.
- [ ] Add `.dockerignore`, caching, CSP/frame policy, Permissions-Policy, and environment-appropriate HSTS guidance.
- [ ] Update all architecture/state/component/testing/audit documentation.

## Phase 8 — Backend/API/DB readiness

**Files:** create the five required readiness/contract documents; update API adapters/types/mocks; classify and validate database artifacts; optionally create a minimal backend scaffold only if Phases 1-7 are green; create `docs/PHASE_8_VERIFICATION.md`.

- [ ] Classify `database/` and spreadsheet sources using repository evidence.
- [ ] Define Express endpoint groups, DTO validation, auth/RBAC/tenancy, vault, audit, upload, share, and entity ownership.
- [ ] Map the canonical workspace to MySQL/MariaDB entities.
- [ ] Define checksums, migration ledger, staging dry-run, rollback, tenant ownership, and polymorphic validation.
- [ ] Make mock/HTTP API operations equivalent without breaking local mode.
- [ ] Run the global gates and verify all required documents exist.

## Per-phase verification protocol

Run, using actual package scripts:

```powershell
npm ls --depth=0
npm run lint
npm test -- --run
npm run build
npm audit --audit-level=moderate
docker compose config --quiet
```

From Phase 6 onward also run:

```powershell
npm run typecheck
npm run check
```

Every `docs/PHASE_N_VERIFICATION.md` records summary, files, tests, exact commands/results, risks, and a safe-to-continue decision.

