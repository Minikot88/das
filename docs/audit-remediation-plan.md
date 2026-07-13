# DashboardMiniBi Audit Remediation Plan

**Status:** Authoritative phase roadmap

**Effective date:** 2026-07-11

**Scope owner:** Frontend stabilization before backend API and database integration

## Authority and phase discipline

This document is the execution roadmap for the current audit-remediation goal. It supersedes the phase ordering in `docs/GOAL_MODE_IMPLEMENTATION_PLAN.md` and the approval labels in the 2026-07-10 design drafts. Those files remain useful historical inputs, but they are not implementation authorization.

Only one phase may be active at a time. A later phase may start only when the current phase has:

1. completed its stated deliverables;
2. run every applicable verification command;
3. documented failures, warnings, and residual risk;
4. stated whether the next phase is safe to start.

Phase 1 changes documentation only. It does not approve or implement a workspace migration.

## Non-negotiable invariants

- Preserve existing browser data and legacy routes until a tested migration, parity check, or safe redirect exists.
- Never persist, copy, export, preview, log, or place real credentials or private key material in a URL.
- Keep the application frontend-only through Phase 8 unless backend implementation is explicitly requested.
- Do not treat localStorage authentication, sharing, connector tests, or access controls as production security.
- Keep changes small and reviewable; add tests before or alongside behavior changes.
- Do not remove dependencies, legacy code, CSS, or storage keys based only on an import search.
- Treat the database schema package as an external design artifact unless it is present, tracked, reproducible, and wired to an authored backend.

## Current product boundary

DashboardMiniBi is a React 19 and Vite 8 frontend prototype. The route tree contains public login, registration, local share, view, and embed routes plus protected Home, dashboard, chart designer, legacy dashboard/builder, connections, datasets, and settings routes.

There is no authored backend or Prisma implementation in the current worktree. `VITE_USE_MOCK` defaults to mock mode. Browser persistence, demo auth, local share snapshots, and simulated connection tests are local prototype behavior.

The current repository contains no tracked `database/` files and no `database/` directory. Earlier audit evidence referred to an untracked database package; that package is not available in the 2026-07-11 baseline and cannot be verified or treated as runtime infrastructure.

## Audit finding register

| ID | Finding | Primary phase | Dependencies and completion evidence |
| --- | --- | --- | --- |
| A-01 | Zustand `mini-bi-v8-workspace` and `projectStorage` `mini-bi-projects` are incompatible workspace graphs. | Phase 2 | Requires approved schema, fixtures for both stores, idempotent migration, active-context parity, rollback, and data-count/reference tests. |
| A-02 | Connection profiles can serialize SSH passwords, private keys, and credential-bearing URLs. | Phase 5 | Requires whitelist serialization and tests covering save, load, duplicate, preview, export, and copy. |
| A-03 | Current share/embed actions use misleading editor/local links rather than an honest public contract. | Phase 4 | Depends on Phase 2 ownership; requires explicit local-demo behavior or disabled backend-required controls plus public-route tests. |
| A-04 | Saved SQL charts can replay with unrelated demo rows and fields. | Phase 3 | Depends on Phase 2 ownership; requires chart-specific data contracts and dashboard replay tests. |
| A-05 | CSV duplicate normalized headers can overwrite values; limits and multiline behavior are incomplete. | Phase 3 | Requires parser tests for duplicates, quoting, multiline records, file/row/column limits, and user-facing errors. |
| A-06 | Forty-four tracked TS/TSX files are not covered by a TypeScript compiler gate or ESLint. | Phase 6 | Requires TypeScript, tsconfig, typescript-eslint, `typecheck`, and `check` scripts. |
| A-07 | The locked development toolchain has four audit findings. | Phase 6 | Requires reproducible install first, safe patch updates, regenerated lockfile, and a fresh audit. |
| A-08 | Dashboard changes and uploaded image URLs are not reliably durable. | Phase 4 | Depends on Phase 2 repository; requires autosave/dirty-state and asset-lifecycle tests. |
| A-09 | Canvas fit is hardcoded and the 1440 x 900 workspace is unusable at narrow widths. | Phase 7 | Depends on stable dashboard behavior; requires measured fit and 390 px runtime checks. |
| A-10 | Landmarks, headings, chart alternatives, dialog focus, keyboard operation, language, contrast, and motion support are incomplete. | Phase 7 | Requires semantic, focus, accessibility, and manual route verification. |
| A-11 | Seven test files and nine tests do not cover primary product journeys. | Phases 2-7; gate owner Phase 6 | Each behavior phase adds focused tests; Phase 6 adds the aggregate gate and CI readiness. |
| A-12 | Docker context and nginx response hardening are incomplete. | Phase 5 | Requires `.dockerignore`, header/cache policy, Compose validation, and documented HTTPS/embed constraints. |
| A-13 | Current and legacy dashboards/builders remain parallel products with inverted feature parity. | Phase 8 | Depends on Phases 2-7; requires a parity matrix, canonical route decision, and safe deprecation plan. |
| A-14 | Styling depends on 25 CSS files, 6,538 `!important` declarations, and accumulated overrides. | Phase 7 | Requires visual regression checks and token/cascade ownership before deleting styles. |
| A-15 | Several settings are persisted but not consumed, and theme behavior diverges. | Phase 7 | Requires behavior inventory, honest UI states, and theme/settings tests. |
| A-16 | Dataset and secondary layouts have weak hierarchy and inefficient long pages. | Phase 7 | Depends on stable dataset contracts; requires responsive and interaction review without data-flow changes. |
| A-17 | Bundle size is concentrated in charts and global CSS. | Phases 6 and 8 | Phase 6 establishes budgets and dependency evidence; Phase 8 resolves engine/path consolidation after parity is known. |
| A-18 | README, architecture, testing, and version metadata describe older product states. | Phase 8 | Depends on final canonical path and contracts; Phase 1 only establishes this roadmap. |
| A-19 | The previously audited 152-table database package was untracked/disconnected and is now absent. | Phase 8 | Requires artifact reintroduction or authoritative source, checksums, migration ledger, backend validation, and staging dry run. |
| A-20 | Dead code, scaffolding, hidden blocks, and historical assets obscure ownership. | Phase 8 | Requires coverage/import evidence, parity approval, and small removal commits. |
| A-21 | CI, observability, and quality budgets are absent. | Phases 6 and 8 | Phase 6 owns CI/check gates; Phase 8 documents production telemetry and backend ownership. |
| A-22 | External fonts, favicon wiring, and reduced-motion support need final polish. | Phase 7 | Requires privacy/asset decision, correct favicon reference, and reduced-motion verification. |

## Eight-phase execution roadmap

### Phase 1 - Baseline verification and tracked remediation plan

**Goal:** Establish a reproducible evidence baseline without changing product behavior.

**Deliverables:**

- `docs/audit-fix-progress.md`;
- this eight-phase roadmap;
- exact pass/fail output for git status, dependency tree, lint, tests, build, audit, and Compose;
- categorized known issues and dangerous-file guardrails;
- explicit frontend-only, demo-only, and database-artifact boundaries.

**Exit gate:** Documentation exists, all baseline results are categorized, and source/configuration behavior is unchanged.

### Phase 2 - Canonical workspace and domain model

**Goal:** Make Project -> Dataset -> Chart -> Dashboard -> Share one project-owned graph.

**Owned findings:** A-01 and the Phase 2 portion of A-11.

**Approval package:** `docs/phase-2-approval-package.md`

The approval package recommends a new canonical key/repository after comparing
rollback safety. The `useStore` / `mini-bi-v8-workspace` promotion below
remains a retained alternative, not an approved implementation.

**Entry dependencies:**

- Phase 1 complete;
- reproducible dependency installation restored so `npm ls --depth=0` passes;
- explicit approval of the canonical schema and physical storage cutover;
- synthetic, secret-free fixtures for both legacy storage models;
- inventory of every storage key and every consumer;
- decided conflict, reference-repair, quota, rollback, and cross-tab policies.

**Required proof:**

- migration from Zustand-only and projectStorage-only fixtures;
- mixed-source merge and deterministic conflict tests;
- idempotency and unchanged-old-key tests;
- Header/Home active-project parity;
- imported dataset visibility under the active project;
- chart, dashboard, widget, and share ownership/reference validation;
- legacy route/key compatibility.

#### Candidate design: promote `useStore` / `mini-bi-v8-workspace`

This is a candidate only. It is not approved for implementation.

Why it remains a candidate:

- `useStore` already owns the richer sheet/dashboard hierarchy, imported datasets, settings, local shares, auth state, and legacy routes;
- AppHeader already selects projects from `useStore`;
- promoting it could reduce the number of consumers that must be converted.

Open dependencies and decisions:

- decide whether sheets remain canonical entities or become compatibility aliases;
- separate domain persistence from the 2,120-line UI store through a repository/service boundary;
- decide whether the physical key remains `mini-bi-v8-workspace` with a new internal version or a new key is used for safer cutover;
- define project ownership for currently global datasets, charts, shares, and settings;
- define how current canvas/designer records from `mini-bi-projects` merge without losing richer widget/chart data;
- define same-tab subscriptions and cross-tab storage events;
- prevent connection secret material from entering any migration fixture or canonical record.

Migration criteria:

1. Migration is pure and dry-runnable before any write.
2. Unknown future versions and invalid canonical JSON are never overwritten.
3. Old keys remain byte-for-byte unchanged until parity is proven.
4. Stable IDs are preserved; unavoidable collisions use deterministic IDs and recorded provenance.
5. No unique project, dataset, chart, dashboard, widget, or valid share is removed because another source lacks it.
6. Missing references remain explicit warnings/fallback states, not silent demo-data substitutions.
7. A migration marker is written only after the validated canonical document is committed successfully.
8. Re-running with identical inputs produces identical entity counts, IDs, ownership, and active context.

Validation requirements:

- before/after entity counts and reference-integrity report;
- active project/dashboard consistency across Header, Home, datasets, canvas, designer, and readonly views;
- storage quota/write-failure tests;
- corrupted-source and unsupported-version tests;
- migration fixtures containing synthetic secret sentinels to prove whitelist-only metadata;
- browser smoke tests for current and legacy routes after cutover.

Rollback strategy required before approval:

- retain all source keys and their raw values;
- do not perform in-place irreversible transformation;
- keep a tested adapter/cutover switch so the prior reader can be restored;
- on validation or write failure, keep the last valid in-memory snapshot and continue reading the previous source;
- define how a partially written migration marker is detected and ignored;
- document whether rollback restores the old `mini-bi-v8-workspace` value or abandons a separate candidate key;
- prohibit cleanup of legacy keys until a later parity phase explicitly approves it.

The historical `docs/superpowers/specs/2026-07-10-canonical-workspace-design.md` proposes a different new-key architecture. It remains an alternative design input and does not override this approval gate.

### Phase 3 - Dataset import, CSV correctness, and chart data contracts

**Goal:** Make Import CSV -> select dataset -> build chart -> save -> add to dashboard render the chart's own data.

**Owned findings:** A-04, A-05, and Phase 3 journey tests from A-11.

**Dependencies:** Approved Phase 2 ownership and repository identifiers.

**Exit gate:** Duplicate headers cannot silently overwrite data; bounded parsing is tested; imported datasets appear in the current designer; saved SQL charts replay their own result/query contract; missing datasets show an explicit fallback.

### Phase 4 - Dashboard durability, share/embed honesty, and public readiness

**Goal:** Prevent ordinary editing loss and make local/public behavior truthful.

**Owned findings:** A-03, A-08, and Phase 4 journey tests from A-11.

**Dependencies:** Phase 2 repository and Phase 3 chart data contract.

**Exit gate:** Autosave or dirty-state protection is tested; temporary asset URLs are lifecycle-safe or explicitly session-only; current share controls no longer point at protected editor URLs; local demo limitations and future publish APIs are explicit.

### Phase 5 - Connection-secret safety, demo auth boundaries, and deployment hardening

**Goal:** Ensure secrets never enter persistence/export/copy paths and harden deployment defaults.

**Owned findings:** A-02, A-12, and security-related Phase 5 tests from A-11.

**Dependencies:** Canonical connection metadata decision from Phase 2 and share/embed frame policy from Phase 4.

**Exit gate:** Whitelist/redaction tests cover all profile operations; secret inputs are ephemeral; demo auth is labeled; `.dockerignore`, cache rules, CSP/frame policy, and safe headers are documented and verified.

### Phase 6 - TypeScript, dependency, test, and CI gates

**Goal:** Make TS/TSX typechecked and make one aggregate check command authoritative.

**Owned findings:** A-06, A-07, CI/testing portions of A-11/A-21, and measurement portions of A-17.

**Dependencies:** Stable behavior contracts from Phases 2-5.

**Exit gate:** `typecheck`, TS-aware ESLint, `check`, and CI readiness exist and pass; dependency tree is reproducible; audit is clean or each residual advisory has a documented, time-bounded exception; unused dependencies are removed only after proof.

### Phase 7 - UX, accessibility, responsive behavior, settings, and styling

**Goal:** Make all current routes usable, accessible, responsive, and visually honest.

**Owned findings:** A-09, A-10, A-14, A-15, A-16, A-22, and UX portions of A-11/A-17.

**Dependencies:** `npm run check` from Phase 6 and stable data/dashboard behavior.

**Exit gate:** Correct language/landmarks/headings; accessible chart metadata or fallback; focus and keyboard safety; measured/mobile canvas behavior; settings/theme honesty; reduced motion; no new global override layer; desktop/mobile route checks pass.

### Phase 8 - Legacy consolidation and backend API/database readiness

**Goal:** Select one product path and produce the contracts needed to begin backend work without building that backend.

**Owned findings:** A-13, A-18, A-19, A-20, backend/observability portion of A-21, and final A-17 engine consolidation.

**Dependencies:** Phases 2-7 complete and verified.

**Exit gate:** Current-vs-legacy parity matrix and safe route/deprecation decision exist; local/HTTP adapter switch point is clear; API contract covers auth, workspace, data, charts, dashboards, shares, connections, settings, and audit logs; database ownership and vault references are mapped; database artifacts are classified; final full verification and readiness report are complete.

## Verification protocol

Run after every applicable phase:

```powershell
git status
npm ls --depth=0
npm run lint
npm test -- --run
npm run build
npm audit
docker compose config --quiet
```

After Phase 6 introduces the scripts:

```powershell
npm run typecheck
npm run check
```

Every phase report must contain:

- summary;
- files changed;
- tests added or updated;
- exact commands and results;
- remaining risks/blockers;
- an explicit ready-for-next-phase decision.
