# DashboardMiniBi Frontend Freeze and Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Independently certify the complete supported frontend, correct any release-blocking frontend defect, freeze the frontend contracts, and deliver the Data Dictionary/Backend handoff package without implementing a Backend or changing the existing Git index.

**Architecture:** Treat `mini-bi-workspace-v1` and the workspace repository as the canonical local domain boundary. Certification combines source inspection, focused automated tests, browser evidence, deployment checks, and explicit local/demo limitations; proposed HTTP contracts remain documentation only.

**Tech Stack:** React 19, React Router, Zustand, JavaScript/TypeScript, Vitest, Testing Library, Vite, nginx, Docker Compose, PowerShell.

## Global Constraints

- Work only in `C:\git\DashboardMiniBi\dashboard-mini-bi`.
- Do not implement a Backend, Database, ORM, migration, server route, real authentication, remote sharing, or real connector execution.
- Do not add, remove, or change dependencies.
- Do not run `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git clean`, `git stash`, tag, release, or pull-request commands.
- Preserve the six-path staged index and staged fingerprint `0506e4dab22996c1560cbff76f0bf0c692663510` exactly.
- Keep all new work unstaged and preserve unrelated user-authored changes.
- Use TDD for every production-code correction and run the failing regression test before implementation.
- Do not run Docker runtime verification unless a deployment/runtime file changes or a runtime-relevant defect is corrected.

---

### Task 1: Establish the authoritative certification baseline

**Files:**
- Read: `src/app/AppRoutes.jsx`
- Read: `package.json`
- Read: `vite.config.js`
- Read: `eslint.config.js`
- Read: `tsconfig.json`
- Read: `.github/workflows/ci.yml`
- Read: `Dockerfile`
- Read: `docker-compose.yml`
- Read: `nginx.conf`
- Read: `docs/FRONTEND_COMPLETION_REPORT.md`
- Read: `docs/FRONTEND_FINAL_ACCEPTANCE_REPORT.md`
- Read: `docs/audit-fix-progress.md`
- Read: `docs/audit-remediation-plan.md`
- Read: `docs/phase-2-approval-package.md`

**Interfaces:**
- Consumes: current working tree and existing staged index.
- Produces: route inventory, test inventory, Git invariant, and verification command inventory used by every later task.

- [x] **Step 1: Capture Git state without mutating it**

  Run:

  ```powershell
  git status --short --branch
  git diff --cached --stat
  git diff --cached --check
  git diff --stat
  git diff --check
  git diff --cached --binary | git hash-object --stdin
  ```

  Expected: branch `main`, six existing staged documentation paths, fingerprint `0506e4dab22996c1560cbff76f0bf0c692663510`, and no diff-check errors.

- [x] **Step 2: Read the existing acceptance, architecture, state, route, testing, deployment, and adapter-contract documentation**

  Record contradictions as gaps; do not treat prior prose as proof when current source or runtime evidence differs.

- [x] **Step 3: Inventory registered routes and automated tests**

  Run:

  ```powershell
  rg -n "path=|Route path|Navigate" src/app/AppRoutes.jsx
  rg --files src | Where-Object { $_ -match '(test|spec)\.(js|jsx|ts|tsx)$' }
  ```

  Expected: every public, protected, current, embed, and legacy route appears in the route inventory; baseline test-file count is 41 before freeze-specific regression tests.

### Task 2: Correct misleading no-op settings with TDD

**Files:**
- Create: `src/pages/SettingsPage.test.jsx`
- Modify: `src/pages/SettingsPage.jsx`

**Interfaces:**
- Consumes: `useStore((state) => state.appSettings)` and `updateAppSettings`.
- Produces: an honest Settings UI in which Theme and Density remain functional while six unconsumed future settings are disabled, labeled unavailable, and cannot write updates.

- [x] **Step 1: Write the failing feature-honesty tests**

  The regression asserts:

  ```jsx
  expect(screen.getByLabelText("ธีม")).toBeEnabled();
  expect(screen.getByLabelText("ความหนาแน่น")).toBeEnabled();
  expect(screen.getByLabelText("รูปแบบวันที่")).toBeDisabled();
  expect(screen.getAllByText("ยังไม่พร้อมใช้งาน — รอการเชื่อมต่อกับระบบจริง")).toHaveLength(6);
  ```

- [x] **Step 2: Run the focused test and verify RED**

  Run: `npm test -- --run src/pages/SettingsPage.test.jsx`

  Expected: two failures proving the controls were enabled and persisted a date-format change.

- [x] **Step 3: Implement the minimal behavior-honesty correction**

  Add optional `disabled` handling to the local select/toggle presentation components, label disabled controls with the exact future-setting note, remove write handlers from unconsumed settings, and leave Theme/Density behavior unchanged.

- [x] **Step 4: Run the focused test and verify GREEN**

  Run: `npm test -- --run src/pages/SettingsPage.test.jsx`

  Expected: one test file and two tests pass with exit code 0.

### Task 3: Certify domain, persistence, CSV, chart, Dashboard, share, and connection contracts

**Files:**
- Read: `src/domain/workspace/**`
- Read: `src/domain/charts/**`
- Read: `src/domain/dashboard/**`
- Read: `src/domain/shares/**`
- Read: `src/utils/csvImport.js`
- Read: `src/utils/csvImport.worker.js`
- Read: `src/utils/databaseConnectionStorage.js`
- Read: `src/utils/savedChartsStorage.js`
- Read: `src/services/projectStorage.js`
- Read: `src/store/useStore.js`
- Read: all corresponding `*.test.*` files.

**Interfaces:**
- Consumes: canonical workspace schema/repository, compatibility bridge, local adapters, and tests.
- Produces: evidence rows for every supported action, negative state, local/demo limitation, and future Backend dependency.

- [ ] **Step 1: Prove workspace invariants**

  Run focused tests for workspace schema, repository, migrations, compatibility, selectors, store bridge, project storage, and storage availability. Confirm deterministic/idempotent/dry-run migration, collision remapping, validated writes, cross-tab updates, active-context repair, and secret exclusion.

- [ ] **Step 2: Prove CSV and Dataset behavior**

  Run `src/utils/csvImport.test.js`, `src/pages/DatasetsPage.test.jsx`, and `src/components/dashboard-v2/services/datasetService.test.ts`. Map every parser limit and malformed/empty case in the feature matrix.

- [ ] **Step 3: Prove chart replay and Designer contracts**

  Run chart data-contract, ECharts option, renderer accessibility, designer-state, field mapping, and saved-chart storage tests. Confirm snapshot precedence, demo recovery, missing-data honesty, reserved row-key preservation, and exact canonical replay.

- [ ] **Step 4: Prove Dashboard persistence and deletion-race protection**

  Run dashboard persistence and public/read-only tests. Inspect debounce, flush, retry, navigation/unload warning, object-URL handling, entity deletion, and pending-autosave guards.

- [ ] **Step 5: Prove Local Share/View/Embed boundaries**

  Run local-share, share dialog, share page, public Dashboard, and share utility tests. Confirm token/expiry/ownership/snapshot validation, readonly enforcement, headerless embed, ambiguity handling, and same-browser-only wording.

- [ ] **Step 6: Prove connection metadata and secret safety**

  Run connection storage tests using synthetic secret sentinels. Inspect create/edit/load/duplicate/preview/test/copy/export/delete/migration paths and record simulated-only connector behavior.

### Task 4: Certify route, responsive, UX, and accessibility runtime behavior

**Files:**
- Read: every route component registered in `src/app/AppRoutes.jsx`
- Read: `src/components/layout/Layout.jsx`
- Read: route-specific accessibility tests and responsive contract tests.
- Modify only if a reproducible release blocker is found, with a failing test first.

**Interfaces:**
- Consumes: built frontend or previously verified unchanged Docker image, browser storage state, and route matrix.
- Produces: route-by-route load/direct-navigation/refresh/guard/landmark/heading/overflow/focus/console evidence at 390, 768, 1024, 1280, and 1440 CSS pixels.

- [ ] **Step 1: Run automated route/accessibility/responsive tests**

  Run all `*.accessibility.test.*`, `DashboardPublicPage.test.jsx`, `SharePage.test.jsx`, `LoginPage.test.jsx`, and `enterpriseBiRedesign.responsive.test.js`.

- [ ] **Step 2: Inspect critical routes with browser tooling**

  Verify `/login`, `/register`, `/home`, `/datasets`, `/dashboard-v2`, `/dashboard`, `/dashboard-legacy`, `/builder`, `/connections`, `/settings`, `/share/:sheetId`, `/dashboard/:dashboardId/view`, `/dashboard/:dashboardId/embed`, invalid records, wildcard redirect, and protected-route redirect.

- [ ] **Step 3: Record viewport and interaction evidence**

  At each required width record landmark count, heading/title, document overflow, focus visibility, readonly controls, loading/empty/error recovery, and fatal console errors. Use the same canonical workspace fixture for refresh-persistence checks.

### Task 5: Assess Data Dictionary and Backend design decisions

**Files:**
- Search: `C:\git\DashboardMiniBi\**`
- Create: `docs/DATA_DICTIONARY_FRONTEND_GAP_ANALYSIS.md`
- Create: `docs/FRONTEND_BACKEND_HANDOFF.md`

**Interfaces:**
- Consumes: canonical frontend entities, repository methods, existing future adapter contract, and verified Data Dictionary search results.
- Produces: proposed DTO/API inventory, ownership/security/migration requirements, and explicit DB-design blockers without implementation files.

- [x] **Step 1: Search for an authoritative Data Dictionary**

  Search filename/content and structured candidates (`*.xlsx`, `*.xls`, `*.ods`, `*.csv`, schema, migration, Prisma, DTO, SQL) under the repository and parent project directory. Record that no authoritative dictionary exists; `prisma/` is empty and ignored `nest-backend/` contains no authored schema/source files.

- [ ] **Step 2: Map every frontend resource to a proposed HTTP contract**

  Include authentication, users, preferences, workspaces, projects, memberships, datasets, fields, CSV imports, charts, previews, data contracts, dashboards, widgets, shares, snapshots, connection metadata, secret references, settings, and audit events. For each include method, route, request/response DTO, errors, ownership, authorization, optimistic locking, migration, and limitation.

- [ ] **Step 3: Classify all 22 backend-readiness decisions**

  Use only: decided by current Frontend contract; proposed but needs confirmation; blocked by missing Data Dictionary; blocked by product/business decision; Backend implementation detail.

### Task 6: Produce feature certification and freeze reports

**Files:**
- Create: `docs/FRONTEND_FEATURE_CERTIFICATION.md`
- Create: `docs/FRONTEND_FREEZE_REPORT.md`
- Update: `docs/FRONTEND_COMPLETION_REPORT.md`
- Update: `docs/FRONTEND_FINAL_ACCEPTANCE_REPORT.md`
- Update: `docs/audit-fix-progress.md`

**Interfaces:**
- Consumes: Tasks 1–5 evidence and final gate outputs.
- Produces: complete feature matrix, readiness scores with evidence/gaps/impact, freeze decision, technical-debt classification, and exact Backend/DB blockers.

- [ ] **Step 1: Write one feature-matrix row per route, workflow, error state, and negative boundary**

  Use only the required status values: `Verified`, `Verified with documented local/demo limitation`, `Blocked by future Backend`, `Defect found and corrected`, and `Not supported and correctly hidden/disabled`.

- [ ] **Step 2: Write the stable domain/repository freeze and readiness scorecards**

  Include every frontend and handoff score requested by the objective; each score must state evidence, remaining gap, and impact.

- [ ] **Step 3: Append evidence-led updates to existing reports**

  Preserve historical results, label the 2026-07-13 freeze pass distinctly, update totals from authoritative test output, and avoid rewriting unrelated prior evidence.

### Task 7: Run final quality gates and prove Git invariants

**Files:**
- Update final command tables in: `docs/FRONTEND_FREEZE_REPORT.md`
- Update final command summaries in the three existing reports.

**Interfaces:**
- Consumes: completed unstaged source/tests/docs.
- Produces: authoritative exit codes, test totals, warnings, bundle sizes, vulnerability totals, and unchanged staged-index proof.

- [ ] **Step 1: Run the required commands independently and retain complete output**

  ```powershell
  npm ci
  npm ls --depth=0
  npm run lint
  npm run typecheck
  npm test -- --run
  npm run build
  npm run check
  npm audit
  npm audit --omit=dev
  docker compose config --quiet
  git diff --cached --check
  git diff --check
  git status --short --branch
  ```

- [ ] **Step 2: Record exit code, result, warnings, counts, and bundle sizes for every command**

  Do not hide npm deprecation/audit warnings, Vite chunk-size warnings, line-ending warnings, or test stderr. If a repository-owned frontend failure occurs, return to the relevant focused task and use systematic debugging plus TDD.

- [ ] **Step 3: Recompute and compare the staged fingerprint**

  Run:

  ```powershell
  git diff --cached --binary | git hash-object --stdin
  git diff --cached --name-only
  ```

  Expected: fingerprint `0506e4dab22996c1560cbff76f0bf0c692663510` and the original six staged paths, with every freeze change remaining unstaged.

### Task 8: Complete the freeze decision and handoff

**Files:**
- Read: all four new deliverables and three updated reports.

**Interfaces:**
- Consumes: requirement-by-requirement completion audit and current authoritative evidence.
- Produces: the exact final response format and final readiness decision.

- [ ] **Step 1: Audit every objective section against a file, test, command, or runtime evidence source**

  Treat missing or indirect evidence as incomplete. Confirm no critical frontend defect remains and every supported feature has a certification row.

- [ ] **Step 2: Apply the decision rules**

  Use `Frontend frozen with documented handoff blockers` when the frontend passes but the absent Data Dictionary and unresolved tenant/storage/security/business decisions block DB/backend implementation design details.

- [ ] **Step 3: Return the exact requested report format**

  End exactly with `Ready to begin Data Dictionary and Backend design: Yes` only if the frontend is frozen, the handoff package is complete, final gates pass, and the next design phase can proceed without implementing Backend/Database in this goal.

## Self-Review

- Spec coverage: Tasks 1–8 cover Git safety, feature/routes, workspace/migration, CSV/Dataset, Designer/chart, Dashboard, Share/View/Embed, connections, settings, UX/accessibility, cleanliness/tooling, deployment, handoff contracts, Data Dictionary, all 22 decision areas, scorecards, final gates, reports, and the exact final response.
- Placeholder scan: the plan contains no `TBD`, implementation placeholder, or unspecified test command.
- Type/interface consistency: canonical key, staged fingerprint, Settings consumer boundary, report paths, status values, and final decision wording match the objective and current source.
- Execution mode: inline continuation is mandatory for this goal; multi-agent/subagent execution and all Git write operations are intentionally omitted by higher-priority instructions.
