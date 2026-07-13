# DashboardMiniBi Production-Grade Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to execute this plan inline and sequentially. This repository must not use subagents, commits, staging, pushes, merges, rebases, tags, releases, or pull requests for this goal.

**Goal:** Deliver a production-grade, frontend-only DashboardMiniBi application for reliable local/demo operation, with data-safe migration, durable BI workflows, responsive accessible UX, reproducible quality gates, and honest future-backend boundaries.

**Architecture:** Introduce `mini-bi-workspace-v1` as the only canonical domain document behind a local repository, while leaving every legacy browser key byte-for-byte unchanged and retaining compatibility adapters. Build dataset, chart, dashboard, share, settings, and safe connection-metadata behavior on that project-owned graph, then establish static/automated/browser gates and document a future HTTP adapter without implementing a server.

**Tech Stack:** React 19, React Router 7, Zustand 5 compatibility state, JavaScript/JSDoc plus targeted TypeScript, Vite 8, Vitest, Testing Library, ECharts, Chart.js, React Grid Layout, CSS, Docker, nginx.

## Global Constraints

- Keep the repository frontend-only; do not implement a backend, database, ORM, server auth, remote storage, remote sharing, or server migration.
- Preserve `mini-bi-v8-workspace`, `mini-bi-projects`, active-context keys, compatibility chart/layout keys, share keys, and all unknown source keys unchanged.
- Reject invalid canonical JSON and unsupported future schema versions without overwriting them.
- Never persist, export, copy, preview, log, snapshot, or place passwords, tokens, private keys, SSH passwords, or credential-bearing URLs in generated content.
- Preserve current behavior until a focused test proves the replacement; do not delete legacy routes before a parity decision.
- Do not stage, commit, push, merge, rebase, tag, release, or create a pull request.
- Protect the six documentation files staged before implementation and preserve unrelated user changes.
- Update `docs/audit-fix-progress.md` after each completed phase with files, behavior, tests, commands, exit codes, warnings, risks, migration status, compatibility status, and security status.

---

### Task 1: Reproducible dependency baseline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Verify: `vite.config.js`, `eslint.config.js`

**Interfaces:**
- Produces: a lockfile that installs the exact declared direct dependency tree and contains patched Vite/tooling transitive packages without a forced or major upgrade.

- [x] Run `npm ci`, `npm ls --depth=0`, `npm audit --json`, and `npm audit --omit=dev --json`; record exit codes and the exact dependency drift.
- [x] Search source, tests, config, legacy routes, and dynamic imports for `framer-motion` and `recharts`; retain them for this task unless all evidence proves they are unused and later removal has a separate test gate.
- [x] Run `npm audit fix --package-lock-only` without `--force`, inspect the manifest/lock diff, and accept only compatible patch/minor toolchain changes.
- [x] Run `npm ci` again, then require `npm ls --depth=0`, lint, tests, build, full audit, and production audit to pass before Task 2.

### Task 2: Canonical schema, normalization, and validation

**Files:**
- Create: `src/domain/workspace/workspaceSchema.js`
- Create: `src/domain/workspace/workspaceSchema.test.js`
- Create: `src/domain/workspace/__fixtures__/workspaceFixtures.js`

**Interfaces:**
- Produces: `WORKSPACE_SCHEMA_VERSION`, `CANONICAL_WORKSPACE_KEY`, `MIGRATION_MARKER_KEY`, `createEmptyWorkspace(clock)`, `normalizeWorkspaceDocument(value, options)`, `validateWorkspaceDocument(value)`, `cloneWorkspace(value)`, `scanForSecretMaterial(value)`.

- [x] Write failing tests for schema version 1, explicit active context, project ownership, Sheet compatibility aliases, invalid ownership, invalid references, duplicate IDs, unsupported versions, and secret-sentinel rejection.
- [x] Run `npm test -- --run src/domain/workspace/workspaceSchema.test.js` and confirm failures identify the missing exports.
- [x] Implement focused runtime validation and normalization with deterministic defaulting; validators must return structured `{ valid, errors, warnings }` results and must never mutate input.
- [x] Rerun the focused test and the existing suite.

### Task 3: Pure deterministic legacy migration

**Files:**
- Create: `src/domain/workspace/workspaceMigrations.js`
- Create: `src/domain/workspace/workspaceMigrations.test.js`
- Modify: `src/domain/workspace/__fixtures__/workspaceFixtures.js`

**Interfaces:**
- Consumes: schema helpers from Task 2.
- Produces: `readLegacySourceValues(storage)`, `createMigrationCandidate(sourceValues, options)`, `validateMigrationCandidate(candidate)`, `fingerprintSourceValue(raw)`, and deterministic provenance/conflict/reference reports.

- [x] Add failing fixtures/tests for Zustand-only, projectStorage-only, both without conflicts, field conflicts, incompatible ID collisions, duplicates, corrupted JSON, missing references, active mismatch, imported datasets, charts, dashboards, widgets, shares, incomplete marker, unsupported future canonical data, quota/write sentinel, secret sentinel, and repeated migration.
- [x] Assert stable entity counts, deterministic remapped IDs, field-level precedence, source provenance, Sheet aliases, consistent active context, no unrelated demo substitution, and byte-equivalent output for identical input/fixed clock.
- [x] Implement pure parsers, entity converters, deterministic `~zustand` / `~project-storage` remapping, ID-map reference repair, and secret-field omission.
- [x] Rerun migration tests twice and compare serialized candidates.

### Task 4: Local repository, cutover, rollback, and events

**Files:**
- Create: `src/domain/workspace/workspaceRepository.js`
- Create: `src/domain/workspace/workspaceRepository.test.js`
- Create: `src/domain/workspace/workspaceSelectors.js`
- Create: `src/domain/workspace/workspaceSelectors.test.jsx`

**Interfaces:**
- Produces: `createLocalWorkspaceRepository({ storage, eventTarget, clock })`, singleton `workspaceRepository`, `getSnapshot`, `getStatus`, `subscribe`, `update`, entity CRUD, `runMigrationDryRun`, `migrateIfNeeded`, `useLegacyFallback`, `handleStorageEvent`, pure selectors, and `useWorkspaceSelector` based on `useSyncExternalStore`.

- [x] Write failing tests for dry-run/no-write, write/re-read validation, completion marker ordering, quota and serialization failure, last-valid in-memory state, fallback reader, invalid/future canonical preservation, same-tab notification, cross-tab valid update, invalid storage event rejection, reload persistence, and legacy-key byte preservation.
- [x] Implement one validated canonical `setItem` per update, revision increments, immutable snapshots, health/status errors, marker-after-validation behavior, and non-destructive fallback.
- [x] Run repository/selector tests plus `git diff --check`.

### Task 5: Compatibility facades and canonical consumers

**Files:**
- Create: `src/domain/workspace/workspaceCompatibility.js`
- Create: `src/domain/workspace/workspaceCompatibility.test.js`
- Modify: `src/services/projectStorage.js`
- Create: `src/services/projectStorage.test.js`
- Modify: `src/utils/storage.js`
- Modify: `src/store/useStore.js`
- Modify: `src/store/useStore.test.js`
- Modify: `src/utils/savedChartsStorage.js`
- Modify: `src/api/projectApi.js`
- Modify: `src/api/chartApi.js`
- Modify: `src/api/dashboardApi.js`

**Interfaces:**
- Produces: canonical-to-legacy project/sheet/chart/dashboard projections; existing public `projectStorage`, Zustand, saved-chart, and mock API signatures remain callable while domain writes delegate to the repository.

- [x] Protect existing action behavior with failing canonical/fallback facade tests before changing either large store.
- [x] Convert projectStorage to a canonical-backed facade while preserving named exports and compatibility-key behavior; remove destructive compaction from canonical failure handling.
- [x] Delegate scoped Zustand project/dataset/chart/dashboard/share/settings actions while retaining auth/UI/filter/view state.
- [x] Assert raw canonical localStorage access occurs only in the repository and approved UI-only keys stay local to their owners.

### Task 6: Active project, dataset import, and designer catalog journey

**Files:**
- Modify: `src/layout/AppHeader.jsx`
- Modify: `src/pages/HomePage.jsx`
- Modify: `src/pages/DatasetsPage.jsx`
- Modify: `src/components/dashboard-v2/services/datasetService.ts`
- Create: `src/components/dashboard-v2/services/datasetService.test.ts`
- Modify: `src/pages/DashboardDesignerV2/index.tsx`
- Modify: `src/hooks/dashboard-v2/useDashboardDesignerState.ts`
- Create: `src/domain/workspace/workspaceJourney.test.jsx`

**Interfaces:**
- Produces: Header/Home project selectors with identical active context; dataset service APIs that return active-project datasets and explicit built-in demo datasets without cloning demo rows for imported IDs.

- [x] Write failing tests for active-project parity, imported dataset project ownership, refresh survival, exact fields/rows, catalog visibility, selection, and chart ownership identifiers.
- [x] Replace mixed/manual revision reads with repository selectors and retain UI-only designer drafts.
- [x] Run focused journey tests, all tests, lint, and build.

### Task 7: Standards-correct bounded CSV import

**Files:**
- Modify: `src/utils/csvImport.js`
- Modify: `src/utils/csvImport.worker.js`
- Modify: `src/utils/csvImport.test.js`
- Modify: `src/pages/DatasetsPage.jsx`

**Interfaces:**
- Produces: `CSV_IMPORT_LIMITS`, record-aware `parseCsvText(text, options)`, async worker parity, deterministic duplicate header names (`name`, `name_2`, ...), structured limit/row errors, and project-owned stable dataset IDs.

- [x] Add failing cases for BOM, commas, escaped quotes, multiline quoted records, blank lines, empty values, semicolon/tab detection, duplicate normalized headers, unequal row widths, inference, file bytes, rows, columns, cancellation, and worker parity.
- [x] Implement a record scanner rather than physical-line splitting; reject unterminated quotes and enforce all limits before creating a canonical dataset.
- [x] Surface concise Thai import errors and warnings without silently overwriting cells.

### Task 8: Chart data contracts and replay

**Files:**
- Create: `src/domain/charts/chartDataContract.js`
- Create: `src/domain/charts/chartDataContract.test.js`
- Modify: `src/utils/savedChartsStorage.js`
- Modify: `src/hooks/dashboard-v2/useDashboardDesignerState.ts`
- Modify: `src/pages/DashboardCanvasBuilder.jsx`
- Modify: `src/components/dashboard-v2/components/charts/ChartPreview.tsx`
- Modify: `src/components/charts/ChartRenderer.jsx`

**Interfaces:**
- Produces: `normalizeChartDataContract`, `resolveChartRows(workspace, chart)`, `validateChartConfiguration`, and explicit `{ status: "ready" | "empty" | "unavailable" | "invalid", rows, fields, message }` replay results.

- [x] Write failing tests for dataset, local SQL result snapshot, explicit demo, unavailable, removed dataset, missing field, empty dataset, invalid mapping, aggregation, sort, filter, format, edit, duplicate, delete, and dependent-widget references.
- [x] Remove unrelated demo-row substitution; render actionable missing/unavailable states.
- [x] Add an integration test for Import -> Select -> Configure -> Preview -> Save -> Dashboard -> Refresh -> Same Data.

### Task 9: Dashboard durability and asset lifecycle

**Files:**
- Create: `src/domain/dashboard/dashboardPersistence.js`
- Create: `src/domain/dashboard/dashboardPersistence.test.js`
- Modify: `src/pages/DashboardCanvasBuilder.jsx`
- Modify: `src/pages/DashboardCanvasBuilder.css`

**Interfaces:**
- Produces: deterministic layout normalization, controlled autosave scheduler with flush/cancel/status, dirty-state guard helpers, recoverable save state, and explicit session-only image asset metadata with object-URL revocation.

- [x] Write failing tests for debounced save, explicit flush, navigation/unload warning, refresh persistence, save failure/retry, widget ownership, deterministic layout, delete confirmation, undo/redo persistence, and object URL cleanup.
- [x] Integrate save status and error recovery without expanding repository responsibility into the page.
- [x] Ensure image widgets cannot claim durable persistence when their asset is session-only.

### Task 10: Honest local share/view/embed behavior

**Files:**
- Create: `src/domain/shares/localShareContract.js`
- Create: `src/domain/shares/localShareContract.test.js`
- Modify: `src/pages/DashboardCanvasBuilder.jsx`
- Modify: `src/components/dashboard/DashboardShareModal.jsx`
- Modify: `src/pages/SharePage.jsx`
- Modify: `src/pages/DashboardPublicPage.jsx`
- Modify: `src/utils/dashboardShareUtils.js`
- Modify: `src/utils/dashboardShareUtils.test.js`
- Modify: `src/app/AppRoutes.jsx`

**Interfaces:**
- Produces: validated `local-readonly` snapshots, local view/embed URL generation, ownership checks, invalid/expired/missing states, and disabled/labeled backend-required publishing controls.

- [x] Add route/component tests for valid, invalid, missing, expired, readonly, embed header, protected editor, refresh, legacy compatibility, and secret-free snapshots (component/contract tests plus protected-route browser verification).
- [x] Remove links that point at protected editor routes and call them public; show same-browser limitations beside copy actions.
- [x] Assert readonly/embed routes expose no editing controls.

### Task 11: Connection secret safety and demo boundaries

**Files:**
- Modify: `src/utils/databaseConnectionStorage.js`
- Create: `src/utils/databaseConnectionStorage.test.js`
- Modify: `src/pages/DatabaseConnectionPage.jsx`
- Modify: `src/pages/LoginPage.jsx`
- Modify: `src/pages/RegisterPage.jsx`

**Interfaces:**
- Produces: `sanitizeConnectionMetadata`, `sanitizeConnectionUrl`, `containsCredentialMaterial`, whitelist-only persistence, secret-free preview/export/copy/duplicate payloads, and transient secret form state.

- [x] Add synthetic sentinel tests for create/edit/save/load/duplicate/preview/simulation/export/copy/delete and scan storage, canonical JSON, URLs, clipboard payloads, exports, logs, and snapshots.
- [x] Reject or strip userinfo/query credentials from URLs and exclude nested SSH/private-key/token/SSL secret fields.
- [x] Label connector tests and authentication as local simulations, never real security.

### Task 12: TypeScript, ESLint, tests, and CI gate

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tsconfig.json`
- Modify: `eslint.config.js`
- Create: `.github/workflows/frontend-checks.yml`
- Modify: `src/test/setup.js`

**Interfaces:**
- Produces: scripts `typecheck`, `audit:prod`, and aggregate `check`; TS-aware ESLint for tracked TS/TSX; deterministic CI commands using `npm ci`.

- [x] Add compatible TypeScript, typescript-eslint, and axe tooling; configure `noEmit`, DOM/Vite types, JS interop, and targeted excludes only for generated output.
- [x] Fix surfaced TS and lint errors without blanket `any`, project-wide disables, or broad ignores.
- [x] Require `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`, and `npm audit --omit=dev` within `npm run check`.

### Task 13: Maintainability extraction and direct-storage cleanup

**Files:**
- Modify: `src/store/useStore.js`
- Modify: `src/services/projectStorage.js`
- Modify: `src/pages/DashboardCanvasBuilder.jsx`
- Modify: `src/hooks/dashboard-v2/useDashboardDesignerState.ts`
- Create focused modules beside each extracted responsibility.

**Interfaces:**
- Produces: route pages/hooks composed from tested selectors, persistence services, dialogs, toolbar components, validators, chart adapters, and layout helpers; no direct canonical storage access outside the repository.

- [x] Use coverage/import/route evidence before deleting code; protect each extraction with the existing focused tests.
- [x] Extract only responsibilities touched by Tasks 5-11; avoid mass renaming, architecture moves, and formatting-only diffs.
- [x] Run the aggregate gate after each large-file extraction.

### Task 14: Responsive UX, accessibility, and CSS ownership

**Files:**
- Modify: `index.html`
- Modify: `src/components/layout/Layout.jsx`
- Modify: route components and existing CSS files under `src/styles/`
- Modify: dashboard/designer route CSS
- Add accessibility tests beside affected components.

**Interfaces:**
- Produces: Thai document language, one main landmark, logical headings, labeled controls, focus-safe dialogs, reduced-motion rules, accessible status/error announcements, chart descriptions/table fallback where practical, measured canvas fit, and consistent route states.

- [x] Inventory every supported route at 390, 768, 1024, 1280, and 1440+ px; record overflow, hierarchy, focus, contrast, touch target, loading, empty, error, disabled, and save-state issues.
- [x] Make behavior-neutral CSS/markup changes within existing token/style ownership; do not add another broad override layer.
- [x] Add automated semantic/focus/axe checks where stable and manually verify keyboard, focus restoration, Escape, reduced motion, and chart context.
- [x] Measure CSS bytes and `!important` count before/after; remove overrides only when route visual checks pass.

### Task 15: Frontend deployment, legacy parity, and future HTTP contracts

**Files:**
- Create: `.dockerignore`
- Modify: `Dockerfile`
- Create: `nginx.conf`
- Modify: `docker-compose.yml`
- Create: `docs/LEGACY_ROUTE_PARITY.md`
- Create: `docs/FUTURE_HTTP_ADAPTER_CONTRACT.md`
- Modify: `README.md`, `ARCHITECTURE.md`, `STATE_MANAGEMENT.md`, `INSTALLATION.md`, `TESTING_NOTES.md`, `docs/ROUTE_MAP.md`

**Interfaces:**
- Produces: reproducible container build; SPA fallback; immutable hashed-asset caching; HTML revalidation; MIME, nosniff, referrer, permissions, CSP, and deliberate embed frame policy; documented async future repository/DTO/error/auth/audit contracts without server code.

- [x] Build a current-vs-legacy matrix for routes, project ownership, datasets, charts, widgets, filters, sharing, exports, settings, persistence, responsive behavior, accessibility, and recovery.
- [x] Retain compatibility or add only evidence-backed redirects/deprecation copy; do not delete unique legacy capability.
- [x] Document missing Data Dictionary and map known frontend contracts without inventing database tables.
- [x] Validate `docker compose config --quiet`; image/runtime smoke testing was attempted and recorded as externally blocked because Docker Desktop's Linux engine was unavailable.

### Task 16: Clean final gate, browser verification, and readiness record

**Files:**
- Modify: `docs/audit-fix-progress.md`
- Create: `docs/FRONTEND_COMPLETION_REPORT.md`

**Interfaces:**
- Produces: evidence-backed readiness scorecard, exact verification results, residual risks, browser matrix, data-preservation proof, Git state, and recommended future commit groups/messages.

- [x] Run from a clean install: `npm ci`, `npm ls --depth=0`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`, `npm run check`, `npm audit`, `npm audit --omit=dev`, `docker compose config --quiet`, `git diff --check`, and `git status --short --branch`.
- [x] Capture exit codes, test counts, warnings, bundle/CSS sizes, audit counts, and any environment-only limitation.
- [x] Browser-check login, register, Home, project creation/selection/refresh, datasets/import/preview, designer/save/replay, dashboard/add/save/refresh, local share/view/embed, connections, settings, current/legacy routes, invalid/empty states, keyboard/focus/reduced motion, and migration/rollback at the required viewports; use focused automated fixtures for destructive parser/storage matrices.
- [x] Compare every original storage source value before/after migration fixtures and confirm no secrets or silent deletion.
- [x] Report staged, unstaged, and untracked files without changing index state; recommend logical commit groups and messages only.
