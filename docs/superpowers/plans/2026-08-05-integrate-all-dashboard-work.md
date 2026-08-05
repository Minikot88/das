# DashboardMiniBi All-Branch Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve every non-duplicate DashboardMiniBi change outside `main` on one traceable integration branch, resolve conflicts by business requirement, and verify the combined application without pushing, deploying, or modifying production.

**Architecture:** Start from local `main`, protect each included source tip with a backup ref, and merge included branches in dependency order with one merge commit per source branch. Preserve PostgreSQL `dashboard_core` ownership and read-only `scopus`, then retain relationship-aware multi-table queries and finish with fail-closed external JWT/JWKS plus OIDC application sessions.

**Tech Stack:** Git, React 19, Vite, Vitest, TypeScript, NestJS/Fastify, Prisma 7, PostgreSQL, Playwright.

## Global Constraints

- Keep all source and backup branches; do not push, merge to `main`, deploy, apply production migrations, force-push, reset hard, or clean.
- Never resolve a whole conflicted file with `ours` or `theirs`; validate each conflict against database, multi-table, chart, and authentication requirements.
- Production must reject `AUTH_MODE=disabled`; external identity must be verified fail-closed and authorized through database memberships.
- Existing applied migrations are immutable; new migrations must be ordered, unique, and tested only against disposable PostgreSQL.

---

### Task 1: Inventory and Safety References

**Files:**
- Create: `docs/superpowers/plans/2026-08-05-integrate-all-dashboard-work.md`

**Interfaces:**
- Consumes: all local and remote-tracking Git refs.
- Produces: INCLUDE classification, protected source SHAs, and `codex/integrate-all-dashboard-work`.

- [ ] **Step 1: Verify repository state**

Run: `git status --short && git branch -vv && git worktree list`
Expected: clean `main`, no unfinished Git operation, known linked worktrees remain untouched.

- [ ] **Step 2: Classify branch patches**

Run for every ref: `git log --oneline main..<ref>`, `git diff --stat main...<ref>`, and `git cherry -v main <ref>`.
Expected: only branches with unique, relevant, non-backup patches are INCLUDE.

- [ ] **Step 3: Create backup refs and integration branch**

Run: `git branch backup/pre-integration-<source>-<timestamp> <source>` and `git switch -c codex/integrate-all-dashboard-work main`.
Expected: source SHAs remain unchanged and work continues off `main`.

### Task 2: Integrate Database Runtime and Migration Work

**Files:**
- Modify only files touched by `deploy/native-server-staging` merge conflicts.
- Test: `apps/api/prisma/postgres-migration-chain.spec.ts`

**Interfaces:**
- Consumes: PostgreSQL migration chain 0001–0009 and Prisma `dashboard_core` mappings.
- Produces: single PostgreSQL migration source of truth and runtime grants that cannot write `scopus`.

- [ ] **Step 1: Merge the native staging branch**

Run: `git merge --no-ff deploy/native-server-staging`.
Expected: conflicts, if any, are resolved per migration ownership rather than by file-wide side selection.

- [ ] **Step 2: Validate database invariants**

Run focused Prisma schema, migration-chain, schema-manifest, fresh-install, and read-only-source tests.
Expected: `dashboard_core` remains the application schema, `public` contains no business tables, and `scopus` write grants remain absent.

### Task 3: Integrate Multi-table and Chart Work

**Files:**
- Modify only files touched by `codex/multitable-dashboard-v2` merge conflicts.
- Test: relationship graph, structured query, field mapping, designer workflow, and persistence tests.

**Interfaces:**
- Consumes: connector discovery metadata and structured PostgreSQL query API.
- Produces: relationship-aware multi-table selection, validated manual joins, safe limits, mapping, and non-functional-action removal.

- [ ] **Step 1: Merge the multi-table branch**

Run: `git merge --no-ff codex/multitable-dashboard-v2`.
Expected: React Router security commits, join fixes, backend queries, and UI action removal are retained.

- [ ] **Step 2: Run focused verification**

Run relationship graph, structured query, field mapping, axis title, persistence, and route security tests.
Expected: no regression to demo labels, overlapping utility controls, or unsupported actions.

### Task 4: Integrate External Authentication and OIDC

**Files:**
- Modify only files touched by `codex/remove-built-in-auth` merge conflicts.
- Test: auth environment, JWT/JWKS verifier, session guard, OIDC callback, authorization, and browser route tests.

**Interfaces:**
- Consumes: verified provider/issuer/sub identity and database organization/project memberships.
- Produces: `AUTH_MODE=external|disabled`, production-disabled rejection, `/api/session/me`, OIDC application session, and no built-in login UI.

- [ ] **Step 1: Merge the auth branch**

Run: `git merge --no-ff codex/remove-built-in-auth`.
Expected: Git records a merge even though the branch already contains the multi-table ancestry.

- [ ] **Step 2: Validate authentication invariants**

Run auth environment, verifier, guard, OIDC, authorization, and route tests.
Expected: invalid tokens fail closed, forged identity inputs are ignored, no auto-admin exists, and production external configuration is mandatory.

### Task 5: Resolve Integrated Regressions

**Files:**
- Modify: only files demonstrated by failing focused or full tests.
- Test: add or update the smallest regression test that reproduces each confirmed integration failure.

**Interfaces:**
- Consumes: merged database, multi-table, chart, and authentication contracts.
- Produces: one coherent environment/API/UI contract without merge markers or duplicate implementations.

- [ ] **Step 1: Scan for integration residue**

Run: `rg -n '<<<<<<<|=======|>>>>>>>|TODO|FIXME|console\.warn|href="#"|mock|demo'`.
Expected: no merge markers; remaining mock/demo references are test-only or explicitly gated and never presented as production data.

- [ ] **Step 2: Diagnose failures before editing**

Run the smallest reproducible failing test and trace the error to the owning dependency, configuration, or source module.
Expected: each fix has a documented root cause and a focused regression test.

- [ ] **Step 3: Commit regression fixes separately**

Run: `git commit -m "fix: resolve integrated dashboard regressions"` and, when test-only work exists, `git commit -m "test: verify combined dashboard feature set"`.
Expected: merge history remains visible and fixes are reviewable.

### Task 6: Full Verification and Coverage Proof

**Files:**
- No planned source changes.

**Interfaces:**
- Consumes: completed integration branch.
- Produces: fresh frontend, backend, PostgreSQL, browser, security, and patch-coverage evidence.

- [ ] **Step 1: Verify unique commits**

Run: `git cherry codex/integrate-all-dashboard-work <include-branch>` for each INCLUDE branch.
Expected: no `+` patch remains, or every result is explained by ancestry/merge equivalence.

- [ ] **Step 2: Run full automated gates**

Run frontend lint, typecheck, full tests, and build; backend Prisma validate/generate, lint, typecheck, tests, PostgreSQL integration tests, and build.
Expected: all runnable gates pass; environment-blocked integration checks are reported precisely rather than fabricated.

- [ ] **Step 3: Run local browser and security smoke**

Run the application in configured disabled technical-principal mode and exercise Dashboard V2, joins, type overrides, charts, save/reload, layout, invalid JWT, forged identity, cross-project authorization, and `scopus` write rejection.
Expected: no built-in login, console errors, unexpected 404/405/500, or fake controls.

- [ ] **Step 4: Final repository verification**

Run: `git status --short`, `git log --oneline --decorate main..codex/integrate-all-dashboard-work`, and `git diff --check`.
Expected: no unfinished operation or merge markers; only intentional tracked plan/source changes remain.
