# DashboardMiniBi Final Frontend Acceptance Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:systematic-debugging` for every failure, `superpowers:test-driven-development` for every code correction, and `superpowers:verification-before-completion` before the final decision. Parallel agents may audit independent domains read-only; the primary agent owns all edits and final verification.

**Goal:** Independently prove or correct the frontend release candidate against the 2026-07-12 acceptance specification, while preserving all browser data and the existing six-file Git index exactly.

**Architecture:** Treat the current worktree, generated production build, local browser behavior, and fresh command output as authoritative. Audit the canonical repository, compatibility facades, data workflows, readonly/security boundaries, quality gates, UX/accessibility, and static deployment separately; fix evidence-backed defects through focused regression tests, then publish one fact/limitation-separated acceptance report.

**Tech Stack:** React 19, React Router 7, Zustand 5, JavaScript/TypeScript, Vite 8, Vitest/Testing Library/axe-core, ECharts/Chart.js, CSS, Docker Compose, nginx, PowerShell, Git read-only inspection.

## Global Constraints

- Do not implement a backend, database, ORM, server authentication, remote persistence, remote sharing, or real connector execution.
- Do not request or use real credentials; synthetic sentinels only.
- Do not run `git add`, `commit`, `push`, `merge`, `rebase`, `reset`, `clean`, `stash`, tag/release, or PR commands.
- Preserve the initial staged patch fingerprint `0506e4dab22996c1560cbff76f0bf0c692663510` and its six paths.
- Preserve every legacy browser key byte-for-byte and never overwrite invalid/future canonical data.
- Keep fixes focused; use failing regression evidence before production-code corrections.
- Do not report Docker runtime as verified unless the actual container lifecycle and HTTP checks execute successfully.

---

### Task 1: Baseline, documentation, and complete diff audit

**Files:**
- Read: `docs/FRONTEND_COMPLETION_REPORT.md`
- Read: `docs/audit-fix-progress.md`
- Read: `docs/audit-remediation-plan.md`
- Read: `docs/phase-2-approval-package.md`
- Read: repository documentation, package/configuration, source, tests, deployment files
- Create: this plan

**Interfaces:**
- Produces: immutable index fingerprint, changed-file classification, requirement-to-evidence matrix, and a list of contradictions or unsupported claims.

- [x] Capture `git status --short --branch`, cached/working-tree stats and checks, and the staged binary-patch fingerprint before edits.
- [x] Read every required document and configuration without rewriting historical command evidence.
- [x] Classify every staged, unstaged, and untracked path; identify accidental/generated/secret/debug artifacts and unrelated changes.
- [x] Search for skipped/focused tests, TypeScript/ESLint suppressions, unsafe `any`, debug logging, stale TODOs, direct canonical storage access, hardcoded machine paths, and suspicious credentials.

### Task 2: Reproducible dependencies and static quality gates

**Files:**
- Verify: `package.json`, `package-lock.json`, `vite.config.js`, `vitest.config.js`, `tsconfig.json`, `eslint.config.js`
- Verify: `.github/workflows/frontend-checks.yml`

**Interfaces:**
- Produces: clean installed tree and exact exit-code evidence for dependencies, lint, typecheck, tests, build, and audits.

- [x] Run `npm ci`, then `npm ls --depth=0`, `npm audit`, and `npm audit --omit=dev`; inspect any drift rather than forcing fixes.
- [x] Run lint, strict typecheck, complete tests, and production build; record test counts and bundle warnings/sizes.
- [x] Compare local authoritative commands with CI ordering, lockfile use, and exit-code propagation.
- [x] For each failure, trace the root cause with systematic debugging, add a focused failing test when behavior is affected, implement the smallest reliable correction, and rerun the focused gate.

### Task 3: Persistence, migration, CSV, chart, and dashboard acceptance

**Files:**
- Verify: `src/domain/workspace/`
- Verify: `src/services/projectStorage.js`, `src/utils/storage.js`, `src/store/useStore.js`
- Verify: `src/utils/csvImport.js`, `src/utils/csvImport.worker.js`, `src/pages/DatasetsPage.jsx`
- Verify: `src/domain/charts/`, saved-chart/designer/canvas modules
- Verify: `src/domain/dashboard/`, `src/pages/DashboardCanvasBuilder.jsx`

**Interfaces:**
- Produces: independent proof of non-destructive/idempotent migration, project ownership/reference integrity, exact dataset/chart replay, and dashboard recovery behavior.

- [x] Audit schema, migration, repository marker/write/readback/fallback/events, compatibility projections, active context, and legacy routes against every acceptance invariant.
- [x] Run focused workspace/migration/repository/compatibility tests and add missing fixtures for any unproven invariant.
- [x] Exercise BOM/quotes/multiline/delimiters/duplicates/limits/cancellation and the import-to-refresh dataset flow.
- [x] Exercise Import -> Designer -> Preview -> Save -> Dashboard -> Refresh -> exact-data replay, including empty/missing/invalid/deleted sources and dependent-widget deletion.
- [x] Exercise autosave debounce/flush/error/retry/unload/navigation/layout/asset cleanup and verify object URLs remain session-only.

### Task 4: Readonly sharing and connection security acceptance

**Files:**
- Verify: `src/domain/shares/`, `src/pages/SharePage.jsx`, `src/pages/DashboardPublicPage.jsx`, share UI/utilities
- Verify: `src/utils/databaseConnectionStorage.js`, `src/pages/DatabaseConnectionPage.jsx`

**Interfaces:**
- Produces: token/ownership/expiry/read-only evidence and proof that synthetic credentials never reach persistence or generated projections.

- [x] Test valid, malformed, missing, mismatched, expired, legacy, view, and embed states; verify editor controls/shortcuts are absent and same-browser limitations are visible.
- [x] Run synthetic sentinel create/edit/save/load/duplicate/preview/simulation/copy/export/delete/canonical tests.
- [x] Scan localStorage-shaped fixtures, canonical JSON, snapshots, clipboard/export/URL/log projections, code, docs, and artifacts without printing any real secret value.
- [x] Correct misleading production-security, public-sharing, or real-connection copy wherever source and UI disagree.

### Task 5: Browser UX, responsive, and accessibility acceptance

**Files:**
- Verify: `src/app/AppRoutes.jsx`, all route pages/layouts/dialogs, existing CSS, `index.html`
- Test: existing accessibility test files plus focused tests beside corrected components

**Interfaces:**
- Produces: route/viewport matrix, interaction evidence, console/runtime evidence, and critical/serious accessibility disposition.

- [x] Start the repository Vite app on an unused loopback port and verify login/register, route guard, Home, datasets, designer, dashboard, sharing, connections, settings, and legacy routes.
- [x] Check 390, 768, 1024, 1280, and 1440 px for document overflow, clipping, wrapping, readable hierarchy, context, states, and touch targets.
- [x] Inspect landmarks/headings, skip link, labels/names, keyboard navigation, dialog focus trap/restoration/Escape, status announcements, non-color status, reduced motion, chart description/data fallback, and console errors.
- [x] Fix critical/serious defects with focused tests and rerun both automated and manual checks.

### Task 6: Static deployment and Docker runtime

**Files:**
- Verify: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `nginx.conf`, `INSTALLATION.md`

**Interfaces:**
- Produces: configuration result plus either real container/HTTP evidence or an exact external-environment limitation and remaining commands.

- [x] Run `docker compose config --quiet` and inspect build context, SPA fallback, MIME, cache, CSP, permissions/referrer/frame policies, healthcheck, and HTTPS/HSTS guidance.
- [x] Probe the Docker Linux engine; if available run no-cache build, detached up, ps/logs, HTTP route/header/cache/leakage checks, then `docker compose down`.
- [x] If unavailable, capture the exact command/error category and preserve the full smoke-test command sequence for the user.

### Task 7: Artifact scan, final gate, and acceptance report

**Files:**
- Modify: `docs/FRONTEND_COMPLETION_REPORT.md`
- Modify: `docs/audit-fix-progress.md`

**Interfaces:**
- Produces: fact-separated readiness ratings, command ledger, defects/fixes, data-preservation proof, Git state, residual limitations, and manual commit grouping.

- [x] Scan for `.env`, credentials, key blocks, credential URLs, build/coverage/debug/temp/editor artifacts, source maps, screenshots, and absolute user-machine paths.
- [x] Run the exact final command list from the acceptance specification and record exit codes, counts, sizes, audits, and warnings.
- [x] Re-run all five required Git state/check commands and compare the staged patch fingerprint and six cached paths to the baseline.
- [x] Update reports without altering historical evidence; distinguish automated, browser, configuration, runtime, unverified, and backend-dependent claims.
- [x] Apply verification-before-completion and publish the exact requested final response structure only after all achievable evidence is complete.
