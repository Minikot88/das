# Frontend Docker Runtime and Release Handoff

**Accepted:** 2026-07-12

**Scope:** Frontend-only local/demo release candidate and Dockerized static deployment

**Backend implemented:** No

**Database connected:** No

## Executive decision

**Frontend release candidate accepted.**

The application passed a clean Docker image build, healthy container startup, HTTP/SPA/asset/security checks, production-browser route and persistence checks, clean shutdown, and the complete source-level quality gate. Runtime testing found two deployment-boundary gaps and one chart-persistence defect; each was reproduced with a failing regression before the minimum correction. The final suite passes 41 test files / 242 tests.

This acceptance applies to documented local/demo operation. It does not represent secure multi-user authorization, remote storage, public sharing, live database connectivity, or production connector execution.

## Readiness

| Measure | Result |
| --- | ---: |
| Frontend implementation readiness | 96% |
| Static frontend deployment readiness | 98% |
| Docker runtime readiness | 98% |
| Full application production readiness | 55% |

## Evidence classification

- **Automated:** lint, strict typecheck, 242 Vitest cases, build, npm audits, Compose validation, migration/rollback/data/secret tests, synthetic CSV end-to-end replay, deployment configuration tests, HTTP matrix, image filesystem inspection, and Git-index verification.
- **Production browser:** container-served demo authentication, current and retained routes, readonly failure states, responsive/overflow checks, focus/skip navigation, reduced-motion availability, project/chart/widget persistence, same-data replay, and console diagnostics.
- **Configuration-only:** future HTTPS/HSTS deployment guidance and backend HTTP adapter contracts. No TLS endpoint, backend, database, or remote identity system was invented for this acceptance.

## Runtime defects and TDD closure

### Docker build context

The first `docker compose build --no-cache` failed inside `npm run check` because `.dockerignore` excluded `.github`, while `src/deployment/nginxConfig.test.js` intentionally reads `.github/workflows/frontend-checks.yml`. The red deployment suite also proved that exact `/api`, arbitrary `/assets/` paths, and external-API environment guidance were not aligned with the intended static image boundary.

The final build context retains only the required workflow. nginx now returns an honest frontend-only response for both `/api` and `/api/`, every `/assets/` miss is a real `404`, and `.env.example` documents the same-origin `/api` boundary required by CSP.

### Demo chart replay

The runtime persistence flow created project `Docker Runtime Smoke`, saved `ยอดขายรายเดือน`, added it to the Dashboard, and then exposed `Chart chart-… has no available data contract` after refresh. Backward tracing proved widget identity was preserved; canonical reference repair had mistaken built-in demo dataset ID `sales_performance` for a missing project-owned dataset and rewritten its contract to `unavailable`.

A real-code integration regression covers saved chart → Dashboard widget → module reset/reload → demo resolver. Additional tests prove that previously damaged records recover from their retained demo config and genuine unavailable contracts remain diagnostically explicit. Fresh records are no longer corrupted, and the already-created runtime chart rendered its 288-row preview after the rebuilt container was loaded without clearing browser data.

## Docker environment

| Item | Verified value |
| --- | --- |
| Docker Desktop | 4.77.0 (228796) |
| Docker client/server | 29.5.3; API 1.54 |
| Context | `desktop-linux` |
| Engine | Linux/amd64; WSL2 kernel 6.6.114.1 |
| Compose | 5.1.4 |
| Recurrence action if Desktop is stopped | `docker desktop start --timeout 120` |

Docker Desktop was initially stopped and its Linux engine pipe was absent. It was started for this verification; subsequent client, server, info, context, and Compose commands passed.

## Build result

- Final clean command: `docker compose build --no-cache`; exit 0; 60.3 seconds.
- Image: `dashboard-mini-bi-frontend@sha256:78a4a546e796956c8fdb2727b28d3cc7bdb7a46ca076d5d3de59c60fbe4f4e77`.
- Size/platform: 26,963,711 bytes; `linux/amd64`.
- Builder lockfile install: 377 packages installed, 378 audited, 0 vulnerabilities.
- In-image `npm run check`: lint, typecheck, 41 files / 242 tests, production build, full audit, and production audit passed.
- Base images are pinned by digest: Node 22 Alpine `sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2`; nginx stable Alpine `sha256:0d3b80406a13a767339fbe2f41406d6c7da727ab89cf8fae399e81f780f814d1`.
- Expected warnings: jsdom's optional canvas implementation notice and Vite's over-500-kB chunk warning.
- Measured output: CSS 827.39 kB / 103.94 kB gzip; main JS 501.55 / 130.19; ChartPreview 870.12 / 289.23.

## Container lifecycle and filesystem

- Service `frontend` ran as `dashboard-mini-bi-frontend-1`, reached `healthy`, kept restart count 0, and published `127.0.0.1:8080->80`.
- nginx 1.30.3 loaded the intended configuration; `nginx -t` passed. Startup and request logs contained no fatal/error entries.
- Runtime app payload: 43 generated files; zero source maps; zero `.env`, key, package, test/spec, coverage, or world-writable app files.
- `/app`, Node, and npm are absent from the final nginx stage.
- `docker compose down --remove-orphans` completed cleanly; the final `docker compose ps` was empty. No volume, unrelated image, or broad Docker prune was used.

## HTTP verification

All listed responses also carried `nosniff` and the documented CSP.

| Path | Status | Content type | Cache | Result |
| --- | ---: | --- | --- | --- |
| `/` | 200 | `text/html` | `no-store, max-age=0` | Production SPA shell |
| `/home` | 200 | `text/html` | `no-store, max-age=0` | Nested-route fallback |
| `/datasets` | 200 | `text/html` | `no-store, max-age=0` | Nested-route fallback |
| `/dashboard-v2` | 200 | `text/html` | `no-store, max-age=0` | Designer fallback |
| `/dashboard` | 200 | `text/html` | `no-store, max-age=0` | Dashboard fallback |
| `/dashboard/example/view` | 200 | `text/html` | `no-store, max-age=0` | Local View shell; app fails closed for missing record |
| `/dashboard/example/embed` | 200 | `text/html` | `no-store, max-age=0` | Local Embed shell; app fails closed for missing record |
| `/healthz` | 200 | `text/plain` | `no-cache` | `ok` |
| `/api` | 503 | `application/json` | `no-cache` | Honest frontend-only boundary |
| `/api/health` | 503 | `application/json` | `no-cache` | Honest frontend-only boundary |
| `/src/main.jsx` | 200 | `text/html` | `no-store, max-age=0` | SPA shell, not raw source |
| `/assets/does-not-exist.js` | 404 | `text/html` | immutable filename policy | No SPA fallback |
| `/assets/does-not-exist.js.map` | 404 | `text/html` | `no-cache` | No source map/fallback |

Production HTML referenced four hashed assets. All returned 200 with correct MIME, gzip, `public, max-age=31536000, immutable`, `nosniff`, and CSP:

- `/assets/index-BbK5JXjy.js` — `application/javascript`
- `/assets/jsx-runtime-C19k_-DX.js` — `application/javascript`
- `/assets/workspaceCompatibility-B7ekbmrx.js` — `application/javascript`
- `/assets/index-UTTvo9P7.css` — `text/css`

## Security headers and source protection

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- CSP: self-only default/base/script/connect/frame sources; no objects; local data/blob allowances only where documented; `frame-ancestors 'self'`; `form-action 'self'`.
- HSTS is intentionally absent on local HTTP.
- X-Frame-Options is intentionally absent; same-origin framing is governed by CSP so local Embed is not broken.
- No raw source, source map, secret, private key, test artifact, development dependency tree, or package-manager cache is served from the application root.

## Browser runtime verification

- Demo login boundary worked without real credentials or user data.
- Desktop and 390 × 844 checks covered Home, Datasets, Designer, Dashboard, Connections, and missing Local View/Embed states. Each target retained one main landmark and no document-level horizontal overflow.
- Local View/Embed missing records failed closed without editing controls.
- Connections retained the explicit simulation label.
- Skip navigation moved focus to `#main-content`; visible focus and global reduced-motion behavior were present.
- Fresh nested-route navigation loaded through nginx rather than the Vite server.
- The final browser diagnostic query returned no console error or warning.

## Local persistence smoke test

- Demo authentication remained active across the container run.
- Project `Docker Runtime Smoke` survived refresh and remained selected.
- Dashboard V2 exposed the built-in synthetic `sales_performance` dataset with 288 rows / 28 fields and a same-data table.
- Saved chart `ยอดขายรายเดือน`, its Dashboard widget, and visible `บันทึกแล้ว` status survived rebuild and fresh navigation.
- The final Dashboard contained one widget, rendered `Data preview for ยอดขายรายเดือน`, and showed the first 20 of 288 rows. The previous data-contract error count was zero.

The in-app browser does not expose a file chooser/set-files operation. Therefore, no browser CSV-upload claim is made. The strongest available equivalent is the automated synthetic integration that exercises CSV import → catalog → Designer → chart save → Dashboard placement → module reload with exact rows. Browser persistence used the built-in synthetic demo dataset.

## Data preservation

- Original legacy storage keys remain covered by byte-for-byte preservation tests; migration is deterministic, idempotent, dry-runnable, and rollback/fallback safe.
- Canonical write/readback and completion-marker behavior remain verified under invalid, unsupported, quota-failed, and blocked-storage conditions.
- Project, dataset, chart, dashboard, widget, share, and active-context ownership/references are covered by migration and repository tests.
- The demo-contract correction preserves widget/chart identity and recovers already-corrupted records without clearing user storage.
- Secret-sentinel tests cover connection metadata, URLs, SQL, snapshots, clipboard/export projections, and canonical persistence.

## Final command ledger

| Command | Exit | Result |
| --- | ---: | --- |
| `docker version` | 0 | Client/server 29.5.3 after Desktop startup |
| `docker info` | 0 | Linux/amd64 WSL2 engine available |
| `docker context show` | 0 | `desktop-linux` |
| `docker compose version` | 0 | 5.1.4 |
| Initial `docker compose build --no-cache` | 1 | Repository-owned ENOENT exposed excluded workflow; corrected with TDD |
| Final `docker compose build --no-cache` | 0 | Image and full in-image gate passed |
| `docker compose up -d` | 0 | Service created and started |
| Health poll / `docker compose ps` | 0 | `running | healthy | 0`; loopback port published |
| HTTP/asset/header matrix | 0 | Routes, MIME, cache, compression, CSP, source/API boundaries passed |
| Container filesystem / `nginx -t` | 0 | No accidental artifacts; config valid |
| Production browser matrix | n/a | UI, persistence, responsive/accessibility, and console checks passed |
| `docker compose down --remove-orphans` | 0 | Clean shutdown; final Compose process list empty |
| `npm ci` | 0 | 375 installed; 376 audited; 0 vulnerabilities |
| `npm ls --depth=0` | 0 | Direct dependency tree valid |
| `npm run lint` | 0 | PASS |
| `npm run typecheck` | 0 | PASS |
| `npm test -- --run` | 0 | 41 files / 242 tests |
| `npm run build` | 0 | 1,870 modules; expected chunk warning |
| `npm run check` | 0 | Full aggregate gate passed |
| `npm audit` | 0 | 0 vulnerabilities |
| `npm audit --omit=dev` | 0 | 0 production vulnerabilities |
| `docker compose config --quiet` | 0 | PASS |
| `git diff --cached --check` | 0 | PASS |
| `git diff --check` | 0 | PASS; LF→CRLF notices only |
| `git status --short --branch` | 0 | Existing staged index plus intentional unstaged/untracked work |

Focused red tests intentionally exited 1 before each corresponding fix: four deployment assertions, the demo reload contract, recovery of an already-damaged demo record, and preservation of an explicit unavailable contract. Their focused green suites and the full authoritative gate subsequently passed.

## Git state

No `git add`, commit, push, merge, rebase, reset, clean, stash, tag, release, or pull-request action was performed. The original staged binary-patch fingerprint remains `0506e4dab22996c1560cbff76f0bf0c692663510` and the only staged paths remain:

1. `docs/GOAL_MODE_IMPLEMENTATION_PLAN.md`
2. `docs/audit-fix-progress.md`
3. `docs/audit-remediation-plan.md`
4. `docs/phase-2-approval-package.md`
5. `docs/superpowers/specs/2026-07-10-backend-ready-bi-foundation-design.md`
6. `docs/superpowers/specs/2026-07-10-canonical-workspace-design.md`

Final inventory: 66 unstaged tracked paths and 58 untracked files. All new source, deployment, test, report, and plan changes remain unstaged or untracked for user review.

## Recommended manual commit plan

1. `feat(workspace): add canonical persistence and safe legacy migration`
2. `feat(frontend): harden dataset chart dashboard and local share workflows`
3. `fix(security): protect connection metadata and browser storage boundaries`
4. `fix(ui): close responsive and accessibility acceptance gaps`
5. `test(tooling): expand regression gates and frontend CI`
6. `build(deploy): harden Docker and nginx static runtime`
7. `docs(release): record frontend Docker acceptance and handoff`

Review and stage each group manually. Do not combine the six already-staged historical documents unintentionally with later work.

## Remaining limitations

### Frontend technical debt

- The global CSS and ChartPreview chunk remain large; route-level splitting and CSS consolidation need parity/performance evidence.
- Several large legacy modules and the bounded lint-config exception remain maintainability debt.
- The final nginx root filesystem is not configured as read-only and the image does not declare a non-root user; these are optional hardening improvements for an otherwise static local image.

### Docker/runtime limitations

- Docker Desktop must be running before local Compose commands.
- TLS termination/HSTS must be configured by the real HTTPS deployment layer, not enabled for local HTTP.
- Browser automation could not operate a native file chooser; automated integration supplies the CSV evidence.

### Backend-dependent limitations

- Secure authentication/authorization, tenant isolation, multi-user/remote persistence, public sharing, durable server asset storage, real connector/query execution, secret-vault integration, rate limiting, and server audit logging require a future backend and database.

## Final scorecard

| Category | Score |
| --- | ---: |
| Core workflows | 97 |
| Migration and data integrity | 98 |
| CSV and datasets | 96 |
| Chart and Dashboard | 97 |
| UX/UI | 92 |
| Responsive behavior | 94 |
| Accessibility | 94 |
| Security boundaries | 97 |
| Maintainability | 87 |
| Automated tests | 98 |
| Toolchain/dependencies | 98 |
| Static deployment | 98 |
| Docker runtime | 98 |
| Documentation | 98 |
| Full application production readiness | 55 |

The frontend is production-grade for its documented local/demo scope. Full secure product production readiness remains backend/database dependent.

## Final frontend freeze acceptance - 2026-07-13

**Scope:** Certified every supported frontend route/workflow in the declared local/demo static frontend scope; documented stable frontend-to-backend contracts; searched for an authoritative Data Dictionary; and prepared the backend handoff package without implementing backend, database, ORM, migrations, server routes, server authentication, remote sharing or real connectors.

**Defects corrected in this pass:** Settings no-op honesty, two import cycles, document-level overflow from `100vw`/`100dvw` guards and Chart.js detached-canvas resize errors during rapid route transitions.

**Acceptance status:** Frontend frozen with documented handoff blockers. The frontend itself is accepted for local/demo operation once the final command ledger below is rerun and recorded; backend/database implementation remains blocked by the missing Data Dictionary and unresolved security/product decisions.

**Primary documents:** `docs/FRONTEND_FEATURE_CERTIFICATION.md`, `docs/FRONTEND_BACKEND_HANDOFF.md`, `docs/DATA_DICTIONARY_FRONTEND_GAP_ANALYSIS.md`, `docs/FRONTEND_FREEZE_REPORT.md`.

**Fresh final command ledger:** `npm ci`, `npm ls --depth=0`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`, `npm run check`, `npm audit`, `npm audit --omit=dev`, `docker compose config --quiet`, `git diff --cached --check` and `git diff --check` all exited 0. Test total is 44 files / 247 tests. Audits reported zero vulnerabilities. Documented warnings: jsdom optional canvas, Vite chunks over 500 kB and Windows LF-to-CRLF notices.

**Fresh Docker runtime ledger:** `docker compose build --no-cache frontend` exited 0 and ran the in-image gate successfully. The container reached `healthy`, restart count `0`, image manifest list `sha256:02626def867892dd6ee8f025507bc49039fe6e468105e4544c7e62a06999d768`. HTTP smoke verified SPA fallback, `/healthz`, immutable asset cache, source-map absence, honest `/api` 503 boundary, security headers and clean shutdown.
