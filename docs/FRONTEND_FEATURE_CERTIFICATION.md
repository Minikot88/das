# Frontend Feature Certification

Certification date: 2026-07-13  
Scope: the static frontend and its documented same-browser local/demo adapters. No backend or database is included.

## Result vocabulary

- **Verified** — supported behavior has automated and/or production-container browser evidence.
- **Verified with documented local/demo limitation** — behavior is complete for the declared local scope but is not a remote or multi-user service.
- **Blocked by future Backend** — the UI boundary exists, but secure production behavior cannot exist without a server.
- **Defect found and corrected** — certification reproduced a defect, added a regression test, and verified the correction.
- **Not supported and correctly hidden/disabled** — the frontend does not imply that a missing capability works.

## Feature matrix

| Feature | Route/module | Status | Automated test | Runtime evidence | Local/demo limitation | Backend dependency | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Demo login | `/login`; `LoginPage` | Verified with documented local/demo limitation | `LoginPage.test.jsx` | Direct load, focused credential form, demo-fill login | Browser-local simulated identity | Real authentication/session service | Protected target was restored after login. |
| Registration presentation | `/register`; `RegisterPage` | Verified with documented local/demo limitation | route/build gates | Direct load at five widths | No account is created remotely | User registration and verification | Honest demo entry point. |
| Protected-route redirect | `ProtectedRoute`, `loginRedirect` | Verified with documented local/demo limitation | `LoginPage.test.jsx` | Logged out, opened `/datasets`, reached `/login`, logged in, returned to `/datasets` | Guard trusts local demo state | Server session and authorization | Wildcard redirect is separately certified. |
| Home/workspace overview | `/`, `/home`; `HomePage` | Verified | selectors/store tests | Correct heading, one `main`, active project `Docker Runtime Smoke` | Counts come from local workspace | Remote workspace summary | Direct navigation and refresh pass. |
| Project creation | `HomePage`, `projectStorage.createProject` | Verified with documented local/demo limitation | repository, facade, bridge tests | Existing created project remained selectable after rebuild/refresh | Same browser only | Project API and membership | Stable project IDs and active repair are covered. |
| Project selection and active context | `AppHeader`, selectors, repository | Verified | selector, repository, store-bridge tests | Same active project shown on Home, Dashboard, Settings | Same browser profile | Server user/workspace preference | Same-tab and cross-tab updates covered. |
| Project rename/delete and dependent repair | `projectStorage` facade | Verified | `projectStorage.test.js`, repository tests | Browser workspace remained coherent after navigation | Local confirmation/UI only | Authorization, archive/delete policy | Pending compatibility writes flush before destructive changes. |
| Canonical workspace reload | `workspaceRepository` | Verified | 31 repository tests | State survived route refresh and container rebuild | LocalStorage adapter | Server repository | Canonical key is `mini-bi-workspace-v1`. |
| Legacy migration | `workspaceMigrations` | Verified | 27 migration tests plus compatibility tests | Current and retained legacy routes read the same context | Source keys remain local | Import endpoint/migration job | Deterministic, idempotent, dry-runnable, marker after validated readback. |
| Migration rollback/fallback | repository/migrations | Verified | invalid, future, quota, corrupted-readback tests | Fail-soft UI remains usable | Local fallback only | Transactional server migration | Invalid/future canonical documents are not overwritten. |
| Dataset catalog | `/datasets`; `DatasetsPage` | Verified | `DatasetsPage.test.jsx`, dataset service tests | Correct heading, active context, one `main`, no overflow | Catalog is local | Dataset list API | Empty catalog is usable. |
| CSV validation and parsing | `csvImport` | Verified | 13 parser/integration tests | Native picker not automated; synthetic import path is proven | Browser parsing/worker | Upload job and object storage | BOM, CRLF/LF, quotes, multiline, delimiters, duplicates, limits, cancellation covered. |
| CSV dataset creation | `createDatasetFromCsv` | Verified | CSV and end-to-end repository tests | Dataset integration is proven synthetically | Same-browser durable metadata/rows | Import API, source file retention | Stable ID, fields, schema and exact rows are retained. |
| Dataset deletion/dependent repair | repository/store bridge | Verified | repository and chart-contract tests | Missing-data states render explicitly | Local graph repair | Server cascade/restrict policy | Intentional empty datasets remain distinct from missing data. |
| Current chart Designer | `/dashboard-v2`; `DashboardDesignerV2` | Verified | designer-state, dataset-service, chart option tests | Direct load, one `main`, no overflow/error | Local/demo data engines | Preview/query API | Project-owned datasets update live. |
| Dataset and field mapping | designer state, `FieldMapping` | Verified | designer-state and accessibility tests | Designer loaded with current workspace context | Local schema | Server schema/query validation | Keyboard semantics and missing fields covered. |
| Chart validation/configuration | chart requirements/compatibility | Verified | chart-data contract and option-builder tests | Invalid/unavailable states do not substitute unrelated data | Local chart generation | Server validation/query planning | Dimensions, measures, aggregation, sort/filter/format contracts persist. |
| Chart preview | Chart.js/ECharts renderers | Defect found and corrected | `ChartJsRenderer.test.jsx`, ECharts tests | 18 rapid route transitions and complete route pass produced zero console errors | Client-side rendering | Optional server preview service | Chart.js internal responsive observer was disabled; component owns resize lifecycle. |
| Chart save/edit/duplicate/delete | saved-chart storage and designer | Verified | saved-chart and designer tests | Saved chart rendered on Dashboard after refresh/rebuild | Same-browser repository | Chart CRUD API | Exact `dataContract` survives normalization. |
| Exact chart data replay | `chartDataContract` | Verified | 11 contract tests plus saved-chart tests | Existing 288-row demo chart rendered after rebuild | Built-in demo resolver is explicit | Dataset/query execution | Real snapshots and reserved-looking row keys remain intact. |
| Legacy Builder | `/builder`; `BuilderPage` | Verified with documented local/demo limitation | route/build/import-graph gates | Direct load, heading, one `main`, no overflow/error at five widths | Retained compatibility surface | Same future chart APIs | Not the primary Designer. |
| Current Dashboard canvas | `/dashboard`; `DashboardCanvasBuilder` | Verified | dashboard persistence and integration tests | Existing dashboard and widget loaded; no runtime error/overflow | Local canvas | Dashboard/widget APIs | Primary dashboard route. |
| Dashboard create/add widget/layout | canvas + `projectStorage` | Verified | repository, persistence, layout tests | One saved chart widget rendered on active dashboard | Same-browser state | Dashboard/widget CRUD | Widget references remain project/dashboard owned. |
| Dashboard autosave/status/retry | `dashboardPersistence` | Verified | 7 lifecycle tests | Browser showed `บันทึกแล้ว`; refresh retained widget | Local durable write | Optimistic server write | Debounce, flush, cancel, retry, unload warning and failure status covered. |
| Dashboard deletion races | repository/facades | Verified | deletion and pending-write tests | No stale entity appeared during certification | Local write queue | Server transaction/concurrency | Pending writes cannot recreate deleted graph entities. |
| Session image widgets | `dashboardPersistence` | Verified with documented local/demo limitation | session-asset tests | No durable server-asset claim | Object URLs are session-only | Asset upload/storage service | Session URLs are removed before durable persistence. |
| Legacy Dashboard | `/dashboard-legacy`; `DashboardPage` | Verified with documented local/demo limitation | route/build/accessibility gates | Direct load, correct legacy heading, no overflow/error | Retained compatibility route | Same dashboard APIs | Not silently removed or redirected. |
| Local Share creation | Dashboard share dialog; `localShareContract` | Verified with documented local/demo limitation | 7 share-contract tests | Generated local readonly and embed URLs from the active dashboard | Same browser/profile only | Share/snapshot service | Copy explicitly says it is not public. |
| Share redirect | `/share/:sheetId`; `SharePage` | Verified with documented local/demo limitation | 3 page tests | Missing token reached usable not-found state | Local alias compatibility | Share resolver API | Loading resolves fail-closed. |
| Readonly View | `/dashboard/:id/view`; `DashboardPublicPage` | Verified with documented local/demo limitation | 8 public-page tests | Valid link loaded correct dashboard, no edit controls, survived refresh | Local snapshot | Public snapshot authorization | Ownership, expiry, malformed/missing/ambiguous records covered. |
| Headerless Embed | `/dashboard/:id/embed`; public page | Verified with documented local/demo limitation | public-page and share-dialog tests | Valid `header=0` URL had no app header or editing controls | Same-browser iframe only | Embed policy/domain allowlist | Protected editor URL is rejected as a share target. |
| Invalid/missing share states | share/public pages | Verified | page and contract tests | Missing share/view/embed showed `ไม่พบแดชบอร์ด`, one `main`, no overflow | Local record lookup | Server 404/410 mapping | Missing, malformed, expired, unavailable-data paths fail closed. |
| Connection profile metadata | `/connections`; connection storage | Verified with documented local/demo limitation | 6 sentinel/redaction tests | Route loaded with honest simulated connector state | Metadata only; test is simulated | Connector execution service | Create/edit/save/load/duplicate/delete paths use a whitelist. |
| Connection secret exclusion | `databaseConnectionStorage` | Verified | synthetic password/key/token/URL/SQL sentinels | No runtime feature presents a real connection as successful | No vault | Secret reference/vault | Credential-bearing URL query/fragment and embedded credentials are removed. |
| Settings theme | `/settings`; `SettingsPage`, `themeMode` | Verified | `SettingsPage.test.jsx` | Theme control enabled | Device-local | Optional user preference sync | Consumed immediately by UI. |
| Settings density | `/settings`; workspace UI state | Verified | `SettingsPage.test.jsx` | Density control enabled | Browser/workspace UI preference | Optional user preference sync | Consumed by presentation. |
| Future date format | `/settings` | Not supported and correctly hidden/disabled | `SettingsPage.test.jsx` | Disabled with exact unavailable explanation | None | Locale/preference contract | No misleading no-op persistence. |
| Future number format | `/settings` | Not supported and correctly hidden/disabled | `SettingsPage.test.jsx` | Disabled with exact unavailable explanation | None | Locale/preference contract | No consumer exists yet. |
| Future canvas preset/header/footer/refresh settings | `/settings` | Not supported and correctly hidden/disabled | `SettingsPage.test.jsx` | Four controls disabled with unavailable explanation | None | Workspace/dashboard settings APIs | Six unconsumed controls total are disabled. |
| Not-found route | `*` in `AppRoutes` | Verified | route/build gates | Unknown route replaced with `/home`; one `main`, correct heading | Frontend routing | None | Public invalid-record states remain explicit rather than wildcarded. |
| Route error/loading boundary | `RouteErrorBoundary`, `Suspense` | Verified | build and route tests | All lazy routes loaded without fatal error | Client recovery | HTTP error mapping later | Route-specific empty/error cards remain usable. |
| Responsive app shell | layout and CSS | Defect found and corrected | `enterpriseBiRedesign.responsive.test.js` | 15 routes × 390/768/1024/1280/1440: zero document overflow | N/A | None | `100vw/100dvw` scrollbar-gutter overflow was removed. |
| Main/heading/skip/focus semantics | layout and pages | Verified | layout and component accessibility tests | One `main` per route; protected pages focus main; auth focuses input | N/A | None | `lang=th`; skip link present. |
| Dialog keyboard behavior | modal components | Verified | fullscreen/share/accessibility tests | Share dialog was operable by named controls | N/A | None | Initial focus, trap, Escape and restoration are covered where applicable. |
| Accessible chart equivalents | chart cards/renderers | Verified | chart accessibility tests | Dashboard chart rendered without browser error | N/A | None | Data-table alternatives and zero-row announcements covered. |
| Static deployment boundary | Docker/nginx | Verified | 9 nginx config tests | `/healthz` 200, SPA routes 200, asset miss 404, `/api*` 503 JSON | Static frontend image | Real API upstream | CSP/cache/MIME/source-map checks pass. |
| Import dependency graph | all `src` JS/TS modules | Defect found and corrected | `importGraph.test.js` | Production build and route loads pass | N/A | None | Two cycles removed; 224 source modules are checked. |

## Cross-cutting route evidence

The production container was inspected at 390, 768, 1024, 1280 and 1440 pixels. The 15-route matrix covered auth, current, legacy, protected, public readonly/embed, invalid-record and wildcard paths. Every route produced one `main`, a route-appropriate heading, no document-level horizontal overflow, and no fatal console error. Auth fields or the protected `main` received initial focus. A clean production tab then repeated all 15 routes and 18 rapid chart-bearing route transitions with zero console errors.

## Settings ownership freeze

| Setting | Current owner | Current status | Future sync decision |
| --- | --- | --- | --- |
| Theme | Browser/device | Enabled and consumed | Remain local by default; server user preference is optional. |
| Density | Browser/workspace UI compatibility state | Enabled and consumed | Candidate user preference; server ownership needs confirmation. |
| Date format | Future user preference | Disabled | Define locale/date DTO before enabling. |
| Number format | Future user preference | Disabled | Define locale/currency DTO before enabling. |
| Default canvas preset | Future workspace/project preference | Disabled | Ownership needs product decision. |
| Widget headers/footers | Future dashboard/workspace preference | Disabled | Scope and inheritance need product decision. |
| Auto refresh | Future dashboard setting | Disabled | Requires backend refresh/query semantics. |

## Certification conclusion

All supported frontend capabilities are certified for the stated local/demo scope. No critical frontend defect remains. Capabilities requiring secure identity, tenant authorization, remote persistence, public sharing, real connectors, durable assets or server query execution remain explicitly backend-dependent and are not represented as implemented.
