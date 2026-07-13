# DashboardMiniBi Audit Fix Progress

**Baseline captured:** 2026-07-11T10:24:35+07:00

**Branch at baseline:** `main`, clean, two commits ahead of `origin/main`

**Historical phase marker:** Phase 2 canonical workspace completed under the approved autonomous goal; Phase 3 dataset/CSV/chart correctness was active. Superseded by the independent final acceptance entry below.

**Product behavior changes in Phase 1:** None

## Phase 1 scope

Phase 1 is intentionally limited to:

- fresh baseline verification;
- inspection of the required project surfaces;
- categorization of failures, warnings, and dangerous areas;
- creation of the authoritative eight-phase remediation roadmap.

Phase 1 does not modify source code, configuration, routes, dependencies, localStorage behavior, or the canonical workspace architecture.

## Fresh baseline verification

| Command | Exit | Result | Evidence and classification |
| --- | ---: | --- | --- |
| `git status --short --branch` | 0 | PASS | Worktree was clean at baseline; `main...origin/main [ahead 2]`. The two local commits contain documentation only. |
| `npm ls --depth=0` | 1 | FAIL | `ELSPROBLEMS`: `framer-motion` and `recharts` are missing; TypeScript/typescript-eslint packages, `axe-core`, and `ts-api-utils` are extraneous. Installed Vite is 8.1.4 while the lockfile resolves 8.0.11. This is local dependency-tree drift, not a source fix performed in Phase 1. |
| `npm run lint` | 0 | PASS | ESLint completed with no output. Current config covers JS/JSX only; 44 tracked TS/TSX files remain outside the lint gate. |
| `npm test -- --run` | 0 | PASS | 7 test files and 9 tests passed. Duration 3.53 seconds. Coverage is too narrow for the primary product journeys. |
| `npm run build` | 0 | PASS WITH WARNING | Vite 8.1.4 built 1,859 modules. The build warns about chunks over 500 kB. `ChartPreview` is 869.06 kB raw / 288.85 kB gzip; the main index chunk is 526.29 kB raw / 140.18 kB gzip; global CSS is 825.57 kB raw / 103.61 kB gzip. |
| `npm audit` | 1 | FAIL | Lockfile audit reports 4 development-toolchain vulnerabilities: 2 high, 1 moderate, 1 low. Affected packages are Vite, undici, js-yaml, and `@babel/core`; npm reports fixes are available. |
| `docker compose config --quiet` | 0 | PASS | Compose configuration is syntactically valid with no output. |

## Dependency-state drift

The committed package files and installed modules are not reproducible as currently installed:

| Item | Manifest/lockfile | Current `node_modules` | Consequence |
| --- | --- | --- | --- |
| Vite | `package.json` range `^8.0.11`; lockfile 8.0.11 | 8.1.4 | Build uses a version different from the lockfile audited by npm. |
| `framer-motion` | Direct dependency and locked | Missing | `npm ls` fails; no source import was found in the current inspection. |
| `recharts` | Direct dependency and locked | Missing | `npm ls` fails; no source import was found in the current inspection. |
| TypeScript/typescript-eslint | Not declared or locked | Extraneous packages installed | TS tools exist locally but are not a project gate and must not be treated as configured. |
| `axe-core` | Not declared or locked | Extraneous | Cannot be relied on by tests or CI. |

No `npm install`, `npm ci`, package edit, lockfile edit, dependency removal, or audit fix was performed in Phase 1.

## Repository and runtime-boundary evidence

- 388 tracked files; 202 tracked files under `src/`.
- 44 tracked TS/TSX files and 133 tracked JS/JSX files.
- 7 tracked test files containing the 9 currently passing tests.
- Five explicit public routes: login, register, legacy share, dashboard view, and dashboard embed.
- Nine protected route entries including the index route and Home, current dashboard, current designer, legacy dashboard, legacy builder, connections, datasets, and settings.
- `VITE_USE_MOCK` defaults to mock mode. The repository contains no authored backend or Prisma implementation.
- No tracked database files, database directory, or design workbook are present in the current worktree. Earlier audit evidence about an untracked database package cannot be revalidated from this baseline.
- `.dockerignore` and `tsconfig.json` are absent. `.env.example` exists.

## Persistence and primary-flow findings

### Split workspace graph

- `src/utils/storage.js` persists `mini-bi-v8-workspace` for the Zustand store.
- `src/services/projectStorage.js` persists `mini-bi-projects`, separate active IDs, and compatibility chart/layout keys.
- AppHeader reads project selection from `useStore`.
- HomePage reads current projects from `projectStorage` while also reading legacy project/context data from `useStore` and maintaining a manual revision counter.
- DatasetsPage imports CSV data into `useStore.importedDatasets`.
- Dashboard Designer V2's dataset service always returns cloned demo rows, and the current canvas also loads the demo dataset directly.

This confirms the Phase 2 ownership problem and the broken imported-dataset-to-current-designer path. No migration or compatibility write was changed in Phase 1.

### Dashboard, SQL, and sharing

- DashboardCanvasBuilder persists through `projectStorage`, uses demo rows for chart previews, and creates a share URL ending in `/dashboard?share=local-demo`.
- The generated embed code therefore points to a protected editor route rather than an authorized public snapshot.
- The current designer can persist SQL result state, but canvas rendering still supplies base demo rows; chart-specific replay must be proved in Phase 3.
- Uploaded images use object URLs; durable asset behavior is not established.
- PDF UI explicitly describes a future backend export service.
- SharePage and DashboardPublicPage resolve local Zustand share records/snapshots only.

### CSV correctness

- Duplicate normalized headers are detected only as warnings.
- Rows are converted into objects using duplicate header keys, so later values can overwrite earlier values.
- Parsing splits text into physical lines before parsing records; quoted multiline records are not preserved.
- No file-size, row-count, or column-count limit is enforced by the parser/page.

### Connection profile security

- `createConnectionProfile` stores a full URL and the complete `ssh` object.
- The SSH object includes password and private-key form fields.
- Preview/export/duplicate code uses profile/form structures that can carry these values.
- The primary password value is masked rather than stored directly, but masking does not protect SSH or credential-bearing URLs.

No real connection credentials were entered, copied, exported, or persisted during Phase 1.

## Quality, UX, and deployment findings

- `src/store/useStore.js`: 2,120 lines.
- `src/services/projectStorage.js`: 1,022 lines.
- `src/pages/DashboardCanvasBuilder.jsx`: 3,902 lines.
- `src/pages/DashboardPage.jsx`: 1,793 lines.
- `src/hooks/dashboard-v2/useDashboardDesignerState.ts`: 1,521 lines.
- The project has 25 CSS files totaling 1,143,393 bytes, 6,538 `!important` declarations, and 232 media queries.
- No `prefers-reduced-motion` rule was found.
- `index.html` uses `lang="en"` while the primary UI is Thai and loads an external Google Font.
- Layout provides a global `main`, while DashboardCanvasBuilder, DatasetsPage, and DatabaseConnectionPage render nested `main` elements.
- ECharts initializes a canvas renderer; no chart-level accessible title/description or same-data fallback was found in the renderer inspection.
- Date/number formats, auto-refresh, and default canvas settings are persisted in SettingsPage but are not broadly consumed.
- `.dockerignore` is missing.
- nginx currently sets only X-Content-Type-Options and Referrer-Policy. CSP, Permissions-Policy, explicit cache policy, HSTS guidance, and embed-aware frame policy remain open.

## Dangerous areas - do not edit without focused tests

| File | Current responsibility | Required guardrail before modification |
| --- | --- | --- |
| `src/store/useStore.js` | Auth, projects/sheets/dashboards, charts, shares, imports, settings, filters, views, and UI state | Migration fixtures, state-action tests, active-context tests, and persistence snapshot assertions. |
| `src/services/projectStorage.js` | Current projects, charts, dashboards, compatibility keys, compaction, and recovery | Legacy/current storage fixtures, quota tests, idempotency, and no-key-deletion assertions. |
| `src/pages/DashboardCanvasBuilder.jsx` | Current dashboard state, canvas, widgets, persistence, export, share, and dialogs | Focused save/replay/share tests and browser verification; avoid unrelated refactoring. |
| `src/pages/DashboardPage.jsx` | Rich legacy dashboard filters, views, interactions, share, and export | Parity matrix and regression tests before redirect/removal. |
| `src/hooks/dashboard-v2/useDashboardDesignerState.ts` | Designer state, SQL, chart persistence, templates, history, share, and export | Dataset/chart-contract fixtures and SQL replay tests. |
| `src/utils/databaseConnectionStorage.js` | Local connection-profile serialization | Secret-sentinel redaction tests before any save/duplicate/export changes. |
| `src/utils/csvImport.js` | CSV parsing, inference, validation, worker fallback | Duplicate/quoted/multiline/limit tests written before parser changes. |
| `src/pages/DatabaseConnectionPage.jsx` | Connector form, preview, test simulation, duplicate, export, and copy | Ephemeral-secret and clipboard/export tests; never use real credentials. |
| `src/pages/DatasetsPage.jsx` | CSV import, schema/stats/preview, and local dataset actions | Import-to-designer integration tests and bounded-file behavior. |

## Demo and production boundaries

- Authentication is a client-only mock gate when mock mode is enabled; protected routes do not provide production authorization.
- Connection testing is simulated and does not prove connector reachability or credential safety.
- Sharing is same-browser localStorage behavior and is neither multi-device nor server-authorized.
- No backend API, database connection, migration runner, secret vault, tenant boundary, or production audit log is implemented.
- The absent database package must not be inferred from old reports; Phase 8 needs the actual artifact or an authoritative replacement.

## Documentation conflicts corrected by Phase 1

The two local documentation commits ahead of `origin/main` contain phase maps and designs dated 2026-07-10. Their phase numbering differs from the authoritative objective, and two design files label unapproved architecture as approved. Phase 1 adds supersession notices and records the `useStore` / `mini-bi-v8-workspace` approach only as a Phase 2 candidate.

## Phase progress

| Phase | Status | Gate |
| --- | --- | --- |
| 1 - Baseline and roadmap | Accepted | Baseline, roadmap, final verification, and source-change audit accepted. |
| 2 - Canonical workspace | Approval pending | `docs/phase-2-approval-package.md` prepared; architecture decisions and dependency entry gate require explicit approval. |
| 3 - Dataset/CSV/chart data | Not started | Requires Phase 2 project ownership. |
| 4 - Dashboard durability/share | Not started | Requires Phases 2-3. |
| 5 - Security/deployment | Not started | Requires Phase 2 metadata and Phase 4 embed policy. |
| 6 - TypeScript/dependencies/CI | Not started | Requires stable contracts from Phases 2-5. |
| 7 - UX/accessibility/responsive/styling | Not started | Requires `npm run check` from Phase 6. |
| 8 - Legacy/backend/API/DB readiness | Not started | Requires Phases 2-7 complete. |

## Phase 1 exit criteria

- [x] Fresh baseline verification captured.
- [x] All observed baseline failures and warnings categorized.
- [x] Required configuration, route, store, service, page, deployment, and documentation surfaces inspected.
- [x] Eight-phase finding map and remediation roadmap created.
- [x] Frontend-only, demo-only, and database-artifact boundaries documented.
- [x] Final documentation verification completed.
- [x] Git evidence confirms no source or configuration file changed in Phase 1.

**Ready for Phase 2:** No. Phase 1 can complete as a documentation phase, but Phase 2 must not begin until the dependency tree is reproducible and the canonical schema, migration criteria, validation plan, and rollback strategy receive explicit approval.

## Phase completion verification

The complete command set was rerun at 2026-07-11T10:31:26+07:00 after the documentation changes:

- `npm ls --depth=0`: FAIL with the same missing/extraneous dependency drift recorded above.
- `npm run lint`: PASS.
- `npm test -- --run`: PASS; 7 files and 9 tests.
- `npm run build`: PASS with the same over-500-kB warning and the recorded chart/CSS sizes.
- `npm audit`: FAIL with the same 4 findings (2 high, 1 moderate, 1 low).
- `docker compose config --quiet`: PASS.
- `git status --short --branch`: only the five Phase 1 documentation files are modified/untracked; no source, package, lockfile, configuration, route, storage, or deployment file changed.

The expected failures are intentionally not repaired in Phase 1. They are categorized entry risks for later phases, and they do not invalidate the documentation-only Phase 1 exit criteria.

## Goal continuation - dependency and toolchain entry gate

**Completed:** 2026-07-11T11:33:02+07:00

**Summary:** The approved autonomous frontend goal superseded the prior Phase 2 approval pause. A clean install initially failed because two Vite development servers from this repository held Rolldown's Windows native binding open. Only those repository-specific npm/Vite processes were stopped; the retry succeeded. The lockfile was then refreshed within the existing manifest ranges using `npm audit fix --package-lock-only` without `--force`.

**Files changed:** `package-lock.json`; `docs/superpowers/plans/2026-07-11-production-grade-frontend.md`; this progress record.

**Behavior changed:** No application behavior changed. Vite moved from locked 8.0.11 to 8.1.4, and audited transitive development tooling moved to patched compatible releases. `package.json` and runtime dependency declarations are unchanged.

**Dependency evidence:** `framer-motion` and `recharts` remain declared and installed. Searches of source, tests, configuration, legacy routes, and dynamic imports found no use; removal is deferred until the later dependency/parity evidence gate.

| Command | Exit | Result |
| --- | ---: | --- |
| `npm ci` (first attempt) | 1 | Environmental failure: `EPERM` unlink of the loaded Rolldown native binding. |
| `npm ci` (after stopping only repository Vite processes) | 0 | 355 packages installed; baseline lock reported 4 development findings. |
| `npm ls --depth=0` | 0 | All declared direct dependencies installed; no missing or extraneous packages. |
| `npm audit --omit=dev --json` (baseline lock) | 0 | 0 production vulnerabilities. |
| `npm audit --json` (baseline lock) | 1 | 4 development findings: 2 high, 1 moderate, 1 low. |
| `npm audit fix --package-lock-only` | 0 | Compatible lock refresh; no forced or major update. |
| `npm ci` (refreshed lock) | 0 | 355 packages installed; 0 vulnerabilities. |
| `npm run lint` | 0 | PASS. |
| `npm test -- --run` | 0 | PASS: 7 files, 9 tests. |
| `npm run build` | 0 | PASS: 1,859 modules; known chunk-size warning remains. |
| `npm audit` | 0 | 0 vulnerabilities. |
| `npm audit --omit=dev` | 0 | 0 vulnerabilities. |
| `docker compose config --quiet` | 0 | PASS. |
| `git diff --check` | 0 | PASS. |

**Warnings and risks:** The main bundle remains 526.29 kB raw / 140.18 kB gzip, `ChartPreview` remains 869.06 kB raw / 288.85 kB gzip, and global CSS remains 825.57 kB raw / 103.61 kB gzip. These are measured later-phase performance/CSS risks, not blockers for the canonical migration.

**Migration, compatibility, and security status:** No browser storage key was read, written, migrated, or removed by this dependency phase. Production and development audits are both clean. The canonical migration implementation may start.

## Goal continuation - canonical workspace and repository boundary

**Completed:** 2026-07-11T12:16:09+07:00

**Summary:** Implemented the approved `mini-bi-workspace-v1` document, pure deterministic migration, local repository, rollback/fallback behavior, runtime validation, secret scanning, Sheet aliases, current/Zustand compatibility projections, live selectors, and canonical consumer bridges. Header, Home, projectStorage, Zustand, Datasets, current canvas storage events, and Dashboard Designer V2 now converge on one project-owned graph.

**Primary files:** `src/domain/workspace/*`; `src/services/projectStorage.js`; `src/utils/storage.js`; `src/store/useStore.js`; `src/layout/AppHeader.jsx`; `src/pages/HomePage.jsx`; `src/pages/DashboardCanvasBuilder.jsx`; `src/components/dashboard-v2/services/datasetService.ts`; `src/hooks/dashboard-v2/useDashboardDesignerState.ts`; associated focused tests.

**Behavior changed:** First canonical access dry-runs and validates migration, writes one canonical document, validates readback, then writes the completion marker. Invalid/future/incomplete canonical state stays untouched and uses the legacy fallback reader. Same-tab and cross-tab repository changes are reactive. Imported datasets receive the active project ID and appear live in the current designer with their exact rows and mapped fields. UI/auth state persists separately under `mini-bi-ui-v1`; secret-like UI properties are stripped.

**Data preservation:** Migration tests compare all original source values byte-for-byte. Canonical writes do not rewrite or remove `mini-bi-v8-workspace`, `mini-bi-projects`, active-context keys, or legacy compatibility keys. Quota and corrupted-readback failures do not write a completion marker and retain a usable legacy-derived in-memory snapshot. Manual fallback is tested without deleting the canonical or legacy keys.

**Tests:** 17 test files / 73 tests pass. New coverage includes schema/ownership/secret validation, both source migrations, deterministic conflicts/remaps/fingerprints, corrupted input, active repair, missing references, atomic repository cutover, quota/readback rollback, unsupported versions, reload/idempotency, same/cross-tab events, compatibility projections, current and Zustand persistence facades, active-context synchronization, project-owned imports, live designer datasets, exact imported rows, and explicit unavailable dataset behavior.

| Command | Exit | Result |
| --- | ---: | --- |
| `npm ls --depth=0` | 0 | PASS; exact dependency tree, Vite 8.1.4. |
| `npm run lint` | 0 | PASS. |
| `npm test -- --run` | 0 | PASS; 17 files, 73 tests. |
| `npm run build` | 0 | PASS; 1,864 modules. Main chunk 489.00 kB raw / 127.17 kB gzip. |
| `npm audit` | 0 | 0 vulnerabilities. |
| `npm audit --omit=dev` | 0 | 0 vulnerabilities. |
| `docker compose config --quiet` | 0 | PASS. |
| `git diff --check` | 0 | PASS; Git reports only line-ending conversion notices. |

**Warnings and risks:** `ChartPreview` remains 869.06 kB raw / 288.85 kB gzip and global CSS remains 825.57 kB raw / 103.61 kB gzip. Saved-chart replay, CSV correctness/limits, share honesty, connection secrets, TypeScript gates, UX/accessibility, and browser route verification remain later phases. No backend or database was added.

**Ready for next phase:** Yes. Dataset/CSV/chart contract work can proceed on stable canonical project and dataset identifiers.

## Goal completion - frontend production hardening

**Completed:** 2026-07-11

**Summary:** Finished the remaining frontend-only phases: bounded record-aware CSV import; exact dataset/chart persistence and replay; durable dashboard autosave/recovery; honest same-browser local view/embed snapshots; whitelist-only connection metadata; strict TypeScript/ESLint/CI gates; route semantics, accessibility, responsive, and theme-boundary corrections; nginx container configuration; legacy parity and future HTTP contracts; and final browser/readiness verification.

**Behavior and compatibility:** All supported current and legacy routes remain present. The canonical repository owns durable workspace state while legacy/current facades project compatible shapes. No legacy storage key is deleted or rewritten. Local share routes are explicitly read-only and same-browser. Connector/auth flows remain labeled simulations. No backend, database, schema, API, dependency removal, file move, or architectural mass refactor was introduced.

**Fresh final gate:** `npm ci` PASS; `npm ls --depth=0` PASS; lint PASS; strict typecheck PASS; 25 test files / 120 tests PASS; production build PASS (1,869 modules); aggregate `npm run check` PASS; full and production npm audits both 0; Compose config PASS; `git diff --check` PASS. Docker image execution could not be verified because the local Docker Desktop Linux engine was not running.

**Browser evidence:** Verified unauthenticated redirect, demo login, project creation/selection/refresh, datasets, designer, dashboard add/autosave/refresh, exact KPI local view, control-free embed, missing-token fail-closed state, connections, settings, current/legacy routes, and responsive behavior at 390/768/1024/1280/1440 px. No document-level overflow remained; one-main/heading semantics were corrected. No new post-fix console errors were observed.

**Security and preservation:** Migration fixtures preserve every source value byte-for-byte and test invalid/future/quota rollback without a false completion marker. Secret sentinels cover connection persistence/projections and URL sanitization. Share snapshots are sanitized and project-owned. Browser storage remains local-only and is not represented as server authorization.

**Final integration closure:** Added exact Import -> designer selection/preview -> saved chart -> dashboard placement -> module refresh -> same rows coverage and route-level local view/embed state coverage. The data workflow test exposed a real debounce boundary; import completion now flushes canonical persistence immediately so the repository-backed designer can read the newly imported rows before navigation.

**Measured warnings:** Vite retains the known over-500-kB warning (`ChartPreview` 869.17 kB raw / 288.93 kB gzip). Main JS is 493.88 kB raw / 128.64 kB gzip. Built global CSS is 827.39 kB raw / 103.94 kB gzip. Source CSS is 1,146,242 bytes with 6,549 `!important` declarations and 234 media queries, versus the 1,143,393 / 6,538 / 232 baseline. jsdom emits its expected optional-canvas warning while all tests pass.

**Git:** Index state was preserved. The original six cached documentation paths are still the only staged paths; all implementation changes remain unstaged/untracked. Recommended commit groups are recorded in `docs/FRONTEND_COMPLETION_REPORT.md` only.

**Final report:** `docs/FRONTEND_COMPLETION_REPORT.md`.

## Independent final acceptance — 2026-07-12

**Summary:** Independently re-audited the complete worktree, canonical repository/migration, dataset/chart/dashboard workflows, Local Share/View/Embed boundary, connection security, quality gates, responsive/accessibility behavior, deployment configuration, documentation, artifacts, and Git state. Corrected remaining migration/persistence, readonly/security, accessibility, storage-denial, ECharts, and documentation defects. This entry supersedes the 2026-07-11 readiness claim while retaining all historical command evidence above.

**Behavior corrected:** Migration now rejects malformed nested entities, allocates/remaps collisions safely, correlates its marker/readback, preserves richer source values and intentional empties, converges storage events, and cannot lose committed state through listener failures. Canonical deletions flush pending compatibility autosaves and repair dependent chart references. Saved SQL/chart snapshots replay exact data. Local readonly records validate ownership/expiry/availability and no protected editor URL is presented as public. Connection and SQL projections exclude credentials. Blocked browser storage fails soft. Responsive routes, focus/dialog behavior, headings, keyboard semantics, chart data alternatives, and zero-filter announcements were corrected without adding a backend.

**Fresh automated gate:** 41 test files / 236 tests passed with 0 skipped and 0 failed. Final lint and strict TypeScript passed. Vite built 1,870 modules; global CSS is 827.39 kB raw / 103.94 kB gzip, main JS 501.55 / 130.20, and ChartPreview 870.12 / 289.23. The expected jsdom canvas notice and Vite over-500-kB chunk warning remain documented. Full and production-only npm audits both report zero vulnerabilities.

| Command | Exit | Final result |
| --- | ---: | --- |
| `npm ci` | 0 | 375 packages installed; 376 audited; 0 vulnerabilities. |
| `npm ls --depth=0` | 0 | No missing/extraneous direct dependency. |
| `npm run lint` | 0 | PASS after focused acceptance fix. |
| `npm run typecheck` | 0 | PASS after focused test-type fix. |
| `npm test -- --run` | 0 | 41 files / 236 tests; 0 skipped/failed. |
| `npm run build` | 0 | PASS; 1,870 modules; documented chunk warning. |
| `npm run check` | 0 | PASS including both audits. |
| `npm audit` | 0 | 0 vulnerabilities. |
| `npm audit --omit=dev` | 0 | 0 vulnerabilities. |
| `docker compose config --quiet` | 0 | Configuration valid. |
| `git diff --cached --check` | 0 | Cached patch valid. |
| `git diff --check` | 0 | No whitespace error; LF→CRLF notices only. |
| `git status --short --branch` | 0 | Existing six staged docs plus intentional unstaged/untracked changes; no index mutation. |

**Browser evidence:** Eight authenticated routes across 390/768/1024/1280/1440 px passed 40/40 main/title/focus/overflow checks. Demo login, route guard, project/dataset/designer navigation, Dashboard KPI autosave/refresh, exact `12.8M` readonly View/Embed replay, missing-share fail-closed behavior, connection/settings and current/legacy routes were exercised. Dialog Tab/Escape/focus restoration, mobile legacy inspector, one-main/headings, and the Dashboard V2 accessible chart table were verified. A final reload after the ECharts option correction produced no new browser error or warning.

**Security/artifacts:** Synthetic sentinel tests and release scans found no durable credentials or high-confidence secret, key, certificate, `.env`, database, log, source-map, coverage, build, screenshot, temporary, or editor artifact in the diff. No focused/skipped tests or inline TS/ESLint suppressions remain. Connection testing is explicitly simulated, and Local sharing is explicitly same-browser.

**Docker runtime:** `docker version --format '{{json .Server}}'` exited 1 because `//./pipe/dockerDesktopLinuxEngine` does not exist. No build/up/HTTP/log/health result is fabricated. The exact remaining smoke commands are recorded in `docs/FRONTEND_COMPLETION_REPORT.md` and `INSTALLATION.md`.

**Data and Git preservation:** Original legacy keys remain byte-for-byte unchanged in migration tests; idempotency, rollback/fallback, reference conservation, and secret exclusion are covered. The staged binary-patch fingerprint remains `0506e4dab22996c1560cbff76f0bf0c692663510`, with the original six documentation paths only. The worktree has 66 unstaged tracked paths and 56 untracked files; no staging, commit, push, merge, rebase, reset, clean, or stash action was performed.

**Readiness:** Frontend implementation 94%; full application production readiness 55%. The frontend candidate is conditionally accepted for local/demo operation, pending Docker runtime smoke testing in an environment with a Linux engine. Secure multi-user production operation remains backend/database dependent.

## Final Docker/runtime acceptance closure — 2026-07-12

**Summary:** Closed the remaining Docker/runtime acceptance gate using Docker Desktop 4.77.0 (build 228796), Docker client/server 29.5.3, API 1.54, Compose 5.1.4, and the `desktop-linux` context. This entry supersedes the earlier Docker-unavailable, Docker-pending, conditional-acceptance, and 41-files/236-tests statements while preserving them as historical evidence.

**Regression fixes:** The first clean build exposed `.dockerignore` excluding the workflow required by the image's mandatory check. Focused red/green tests then drove the minimum deployment corrections: retain only `.github/workflows/frontend-checks.yml`, fail closed for exact `/api` and every `/assets/` miss, and align `.env.example` with the same-origin CSP. Runtime persistence later exposed demo chart contracts being mistaken for missing project-owned datasets. A save → Dashboard widget → module-reload test reproduced the exact `unavailable` contract. Canonical repair now preserves demo contracts, recovers already-damaged demo records from their retained config, and keeps genuine unavailable contracts explicit.

**Docker evidence:** The final `docker compose build --no-cache` completed in 60.3 seconds. The `linux/amd64` image is `dashboard-mini-bi-frontend@sha256:78a4a546e796956c8fdb2727b28d3cc7bdb7a46ca076d5d3de59c60fbe4f4e77`, 26,963,711 bytes. The container reached healthy state with restart count 0 on `127.0.0.1:8080`; nginx configuration, HTTP routes, health/API boundary, generated assets, gzip/cache/MIME behavior, security headers, source protection, and runtime filesystem checks passed. Logs contained no critical runtime error. Shutdown removed the project container and network cleanly.

**Browser and persistence evidence:** Production-container checks covered demo authentication, current/legacy navigation, nested-route refresh, readonly View/Embed failure states, connections honesty, desktop/mobile overflow, focus/skip navigation, and reduced motion. Project `Docker Runtime Smoke`, chart `ยอดขายรายเดือน`, its Dashboard widget, save state, and the 288-row demo preview survived rebuild and refresh. The previous data-contract error was absent and final console error/warning logs were empty.

**CSV evidence boundary:** The in-app browser does not support local file upload. Synthetic CSV import is therefore proven by the automated exact-row Import → catalog → Designer → chart → Dashboard → module-reload integration; the runtime browser persistence pass used the built-in synthetic demo dataset. No browser-upload claim is made.

**Final gate:** Every required command exited 0: clean install, dependency tree, lint, strict typecheck, 41 test files / 242 tests, build, aggregate check, full and production audits, Compose config, cached and working-tree diff checks, and Git status. npm reported zero vulnerabilities. Expected notices remain the jsdom optional-canvas message, the measured Vite chunk-size warning, and Windows LF→CRLF conversion notices.

**Data and Git preservation:** Legacy migration keys remain covered by byte-for-byte, rollback, idempotency, ownership, and secret-exclusion tests. The original staged fingerprint and six cached documentation paths remain unchanged. The final worktree inventory contains 66 unstaged tracked paths and 58 untracked files. No staging, commit, push, merge, rebase, reset, clean, or stash action was performed.

**Readiness:** The frontend Docker/runtime acceptance gate is complete and the frontend release candidate is accepted for local/demo operation. Frontend implementation readiness is 96%, static deployment readiness 98%, Docker runtime readiness 98%, and full application production readiness remains 55%. Secure multi-user production operation remains dependent on a future backend and database.

## Final frontend freeze and handoff - 2026-07-13

**Completed freeze work:** Certified the frontend route/workflow inventory; added the feature matrix, backend handoff, Data Dictionary gap analysis and freeze report; corrected the final release-blocking frontend defects found during certification; and kept all new work unstaged.

**Corrected defects:** Settings now disables unsupported future controls instead of persisting misleading no-ops. The source import graph has no cycles. App chrome no longer creates document-level horizontal overflow through viewport-width min guards. Chart.js no longer receives responsive ownership for canvases that React may detach during rapid route transitions.

**Current readiness:** Frontend feature readiness 97%, frontend implementation readiness 97%, local/demo operation readiness 98%, static deployment readiness 98%, Docker runtime readiness 98%, full application production readiness 55%.

**Backend blockers:** No authoritative Data Dictionary was found. Database/backend work still needs tenant/ownership, membership/roles, row and file storage, snapshot retention, share token security, embed restrictions, secret-vault references, audit logging, retention, pagination/filtering/sorting and rate-limit decisions.

**Final gate note:** The authoritative command ledger for this pass is the fresh final gate run after this entry. Expected test target is 44 files / 247 tests.

**Fresh final gate result:** The 2026-07-13 gate exited 0 for clean install, dependency tree, lint, strict typecheck, 44 test files / 247 tests, production build, aggregate check, full audit, production audit, Compose config and both Git diff checks. npm vulnerabilities: 0 full and 0 production. Expected warnings: jsdom optional canvas, Vite over-500-kB chunk warning and Git LF-to-CRLF conversion notices.

**Fresh Docker runtime result:** Clean frontend image build exited 0 with in-image `npm run check` passing 44/247 tests. Container became healthy with restart count 0. HTTP smoke confirmed health, SPA fallback, asset miss 404, `/api` and `/api/status` 503 JSON frontend-only boundary, security headers, immutable JS cache, no source maps and clean stop exit 0.
