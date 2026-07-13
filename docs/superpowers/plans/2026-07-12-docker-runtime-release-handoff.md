# Docker Runtime Verification and Release Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the production Docker image, nginx runtime, browser workflows, and local persistence end to end, correct any repository-owned deployment defects, preserve the existing Git index exactly, and publish the final release handoff.

**Architecture:** Build the existing multi-stage Dockerfile through Compose, serve only Vite `dist/` from digest-pinned nginx, validate the runtime from HTTP, browser, and container-filesystem perspectives, then rerun the repository quality gate. Runtime evidence is appended to existing historical reports; no backend, database, remote sharing, or real connector execution is introduced.

**Tech Stack:** Docker Desktop Linux engine, Docker Compose, Node.js 22 Alpine, nginx Alpine, React 19, Vite 8, PowerShell, curl.exe, in-app Browser, Git read-only inspection.

## Global Constraints

- Do not run `git add`, commit, push, merge, rebase, reset, clean, stash, tags, releases, or pull-request commands.
- Preserve the six-file staged index and fingerprint `0506e4dab22996c1560cbff76f0bf0c692663510` unless the freshly captured baseline proves a different user-owned state.
- Use only loopback HTTP and synthetic local/demo data; never enter real credentials or real user data.
- Do not implement a backend, database, API health service, server authentication, remote persistence, or real connector execution.
- Do not prune Docker globally, delete unrelated images/volumes, or stop unrelated containers.
- Correct repository-owned failures with focused regression evidence and rerun affected gates.

---

### Task 1: Immutable baseline and environment

**Files:**
- Read: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `nginx.conf`, `.env.example`
- Read: `docs/FRONTEND_COMPLETION_REPORT.md`, `docs/audit-fix-progress.md`
- Modify: this plan only for checkbox tracking

**Interfaces:**
- Produces: exact staged paths/fingerprint, worktree inventory, Docker versions/context/engine availability.

- [ ] Run `git status --short --branch`, both diff stats, both diff checks, cached path listing, and cached binary-patch hashing.
- [ ] Run `docker version`, `docker info`, `docker context show`, and `docker compose version`.
- [ ] If the Linux engine is unavailable, capture the exact external error, complete non-runtime review, keep conditional acceptance, and request only that Docker Desktop Linux containers be started.

### Task 2: Clean image build and build-context audit

**Files:**
- Verify: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `package.json`, `package-lock.json`
- Modify only if evidence requires: the same deployment files and focused tests

**Interfaces:**
- Consumes: available Linux Docker engine.
- Produces: reproducible production image built with `npm ci`, Vite production output, image ID/digest/size, warning inventory.

- [ ] Run `docker compose down --remove-orphans` without volumes or global cleanup.
- [ ] Run `docker compose build --no-cache` and capture elapsed time, stages, dependency/audit output, Vite sizes, and warnings.
- [ ] Inspect Compose-resolved image/service configuration and image history for unexpected build-context leakage.
- [ ] If the build fails because of repository code/configuration, reproduce narrowly, write a focused verifier/test, implement the smallest fix, and rebuild from no cache.

### Task 3: Runtime service, filesystem, and HTTP matrix

**Files:**
- Verify: `nginx.conf`, `docker-compose.yml`, generated `/usr/share/nginx/html`
- Modify only if evidence requires: `nginx.conf`, `Dockerfile`, `.dockerignore`, deployment tests/docs

**Interfaces:**
- Consumes: successful image.
- Produces: healthy/stable container, filesystem artifact inventory, route/header/cache/MIME/source-protection matrix.

- [ ] Run `docker compose up -d`, `docker compose ps`, and `docker compose logs --no-color`; wait only for the configured healthcheck.
- [ ] Inspect the final container for `.git`, `.env`, keys, tests, coverage, docs, source maps, Node dependencies/caches, writable unexpected paths, and raw source.
- [ ] Request `/`, `/home`, `/datasets`, `/dashboard-v2`, View, Embed, `/healthz`, `/api/health`, and `/src/main.jsx` with exact status/content type.
- [ ] Extract every emitted JS/CSS asset from root HTML and verify success, MIME, immutable caching, compression behavior, and absent source maps.
- [ ] Verify HTML revalidation/no-cache, missing asset 404 without SPA HTML, CSP, nosniff, referrer, permissions, frame policy, and absence of misleading HSTS.
- [ ] Fix and rebuild any repository-owned runtime defect, then rerun the complete matrix.

### Task 4: Container-served browser acceptance and persistence

**Files:**
- Verify: existing routes and local-storage persistence modules
- Modify only if evidence requires: focused frontend source/test files

**Interfaces:**
- Consumes: stable loopback container URL.
- Produces: browser console/network, route, responsive/accessibility, and Project → CSV → Designer → Chart → Dashboard → refresh evidence.

- [ ] Open `http://127.0.0.1:8080/` with the in-app Browser and use only documented synthetic demo authentication/data.
- [ ] Verify root/nested-route refresh, Home, Datasets, Designer, Dashboard, View, Embed, connection-simulation label, console, loaded assets, visible focus, skip link, and reduced-motion availability.
- [ ] Set approximately 390 px width and prove no document overflow or inaccessible primary controls, then reset the viewport.
- [ ] Import a small synthetic CSV, verify catalog/Designer, save a chart, add it to a Dashboard, wait for saved status, reload, and verify identical project/data/chart/widget output.
- [ ] Verify Local View/Embed remain readonly and headerless where configured, and inspect only app-generated local storage values needed for the migration-preservation assertion.
- [ ] If browser automation cannot reach a specific workflow, record the exact limitation and use the strongest component/integration/runtime evidence without overstating coverage.

### Task 5: Shutdown, final quality gate, and Git invariants

**Files:**
- Verify: entire repository and Docker project

**Interfaces:**
- Produces: clean runtime teardown, final command ledger, unchanged index fingerprint.

- [ ] Capture final container logs/status, run `docker compose down --remove-orphans`, and prove no project container remains.
- [ ] Run `npm ci`, `npm ls --depth=0`, lint, typecheck, all tests, build, aggregate check, both audits, and Compose config.
- [ ] Run both Git diff checks, status, cached/working stats, cached paths, and cached binary-patch hash.
- [ ] Scan final changed/untracked tree for secrets, focused/skipped tests, suppressions, and accidental runtime/build artifacts.

### Task 6: Evidence reports and handoff

**Files:**
- Modify: `docs/FRONTEND_COMPLETION_REPORT.md`
- Modify: `docs/audit-fix-progress.md`
- Create or modify: `docs/FRONTEND_FINAL_ACCEPTANCE_REPORT.md` if present/needed
- Modify: this plan

**Interfaces:**
- Consumes: all fresh Docker, browser, command, and Git evidence.
- Produces: final accepted/conditional/not-accepted decision and manual commit grouping.

- [ ] Append, without rewriting historical evidence, Docker environment/build/image/container/HTTP/assets/headers/browser/persistence/filesystem/log/shutdown results.
- [ ] Distinguish automated, browser, configuration-only, runtime, external, and backend-dependent evidence.
- [ ] List staged, unstaged, and untracked groups; confirm no index mutation, commit, or push.
- [ ] Apply verification-before-completion and publish the exact `Frontend Docker Runtime and Release Handoff` response structure.
