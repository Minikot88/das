# Phase 2 Canonical Workspace Approval Package

**Status:** Proposed - implementation is not authorized

**Prepared:** 2026-07-11

**Authority:** `docs/audit-remediation-plan.md` and the accepted Phase 1 baseline

## Executive recommendation

Create a new versioned canonical workspace document under a repository boundary and migrate both existing workspace sources into it. Use the richer `useStore` records as the preferred source for imported datasets, settings, local shares, sheet aliases, and legacy-only state; use `projectStorage` as the preferred source for current projects, dashboards/widgets, ECharts chart records, and current active IDs.

The recommended physical key is a new `mini-bi-workspace-v1` key. Both old graphs remain unchanged and readable. This is safer than rewriting `mini-bi-v8-workspace` in place because a failed cutover can ignore/remove the new key and immediately return to the untouched readers. It is safer than promoting `projectStorage` because that model does not own the current imported datasets, settings, shares, or legacy sheet relationships.

The previously proposed `useStore` / `mini-bi-v8-workspace` promotion remains a candidate. It is not the recommendation in this package because the physical in-place cutover and rollback mechanism are not yet proven.

No source code, package file, lockfile, configuration, dependency, or persistence behavior is changed by this approval package.

## 1. Exact Phase 2 scope

### In scope

1. Define a versioned frontend domain for:
   - Project;
   - Dataset;
   - Chart;
   - Dashboard;
   - DashboardWidget;
   - local read-only ShareSnapshot;
   - workspace Settings;
   - secret-free ConnectionProfileMetadata as a contract only.
2. Add a synchronous local repository with runtime validation, revisioning, subscriptions, and atomic localStorage writes.
3. Add pure migrations from:
   - `mini-bi-v8-workspace`;
   - `mini-bi-projects`;
   - active project/dashboard keys;
   - chart/layout compatibility keys only when the two primary graphs do not already contain the record.
4. Preserve every original key unchanged.
5. Convert `src/services/projectStorage.js` and workspace-related `useStore` actions into compatibility adapters over the canonical repository.
6. Make the shell, Home, Datasets, current canvas/designer, legacy dashboard/builder, and read-only share pages resolve the same active project graph.
7. Make an imported CSV dataset project-owned, visible in the dataset catalog, and selectable by the current designer.
8. Preserve existing local share behavior while changing only its read source; do not add publish, access, revoke, expiry, embed authorization, or cross-device behavior.
9. Add migration, repository, selector, compatibility, route-context, dataset-visibility, saved-chart, and refresh-persistence tests.

### Explicitly out of scope

- Backend services, HTTP persistence, database queries, ORM/schema work, or server sessions.
- Authentication behavior, credentials, roles, permissions, or route-protection changes.
- New sharing/publishing behavior or security claims.
- Connection form/storage changes or reading/migrating `mini-bi-db-connections`.
- CSV duplicate-header, multiline, or limit fixes.
- SQL result/replay correctness beyond preserving the records that already exist.
- Dashboard autosave, image persistence, PDF service, or responsive UX changes.
- TypeScript/ESLint project setup, dependency removal, major upgrades, or CI implementation.
- Legacy route or storage-key deletion.

### Entry gates

Phase 2 implementation may start only when all of the following are explicitly approved or proven:

- [x] Phase 1 documentation accepted.
- [ ] Recommended physical key and cutover strategy approved.
- [ ] Canonical schema ownership and sheet-alias decision approved.
- [ ] Dependency tree made reproducible in a separate dependency-only change.
- [ ] `npm ls --depth=0` passes from a clean install.
- [ ] Audit remediation timing approved.
- [ ] Synthetic fixtures cover both workspace sources and contain no real credentials.
- [ ] Every persistence key is classified as canonical input, compatibility-only, UI-only, or excluded.
- [ ] Migration precedence, collision, reference-repair, quota, recovery, and rollback rules approved.
- [ ] Phase 2 test matrix and browser smoke routes approved.

### Exit gates

Phase 2 is complete only when:

1. Header and Home display and change the same active project.
2. Every canonical dataset, chart, dashboard, widget, and share belongs to one valid project.
3. Both primary legacy graphs migrate safely and idempotently.
4. All original localStorage keys remain byte-for-byte unchanged.
5. Current and legacy route adapters read the same canonical active context.
6. CSV import creates a project-owned dataset that survives refresh and appears in Datasets and Dashboard Designer V2.
7. A saved chart survives refresh and remains attached to the same project and dataset identifier.
8. SharePage and DashboardPublicPage resolve the same existing local snapshots as before; no new sharing capability is introduced.
9. Invalid/corrupted records surface recovery warnings without overwriting the source.
10. Dependency tree, lint, tests, build, audit decision, and browser smoke checks are documented.
11. Rollback to the legacy readers is exercised successfully against synthetic migration fixtures.

## 2. Existing stores and persistence keys

### Store comparison

| Area | Zustand `useStore` | `projectStorage` | Phase 2 implication |
| --- | --- | --- | --- |
| Physical source | `mini-bi-v8-workspace` through `src/utils/storage.js` | `mini-bi-projects` plus active/compatibility keys | Both are migration sources; neither remains an independent writer after cutover. |
| Hierarchy | Project -> Sheet -> Dashboard; global charts/datasets/shares/settings | Project -> Dashboard with project charts/dataset metadata | Canonical graph is Project-owned; legacy sheets become aliases unless sheet ownership is explicitly approved. |
| Reactivity | Zustand subscriptions | Synchronous reads plus manual revision/localStorage events | Canonical repository uses `useSyncExternalStore` and storage events. |
| Auth/UI | Auth, theme, locale, filters, views, UI state | None | Auth/UI state stays in Zustand; only workspace mutations delegate. |
| Imported CSV | Global `importedDatasets` with rows/fields | Project dataset metadata exists but is not the current import target | Zustand dataset records receive canonical project ownership. |
| Charts | Global legacy/Chart.js records | Project-scoped current ECharts/designer records | Merge by ID with projectStorage field precedence and legacy gap filling. |
| Dashboards | Sheet dashboards, legacy filters/views/interactions | Current canvas widgets/layout/settings | Current canvas structure wins on collision; unique legacy dashboards/widgets remain. |
| Shares | Local share links/snapshots | Current default share UI does not publish a valid snapshot | Preserve Zustand local snapshots; only read ownership changes. |
| Error handling | Storage health and text repair | Quota compaction, memory fallback, recovery messages | Canonical repository must combine validation/health without destructive compaction. |
| Size/complexity | `src/store/useStore.js`: 2,120 lines | `src/services/projectStorage.js`: 1,022 lines | Neither file is acceptable as the long-term repository implementation. |

### Persistence-key inventory

| Key | Current owner/content | Current consumers | Phase 2 classification |
| --- | --- | --- | --- |
| `mini-bi-v8-workspace` | Zustand snapshot: projects/sheets/dashboards, charts, imported datasets, shares, settings, auth/UI | `useStore`, shell, legacy routes, datasets, settings, public views | Primary migration source; preserve unchanged. Auth/UI fields are not copied into the canonical domain except approved settings. |
| `mini-bi-v8-builder-draft` | Legacy builder draft | Legacy Builder | Compatibility/UI-only; preserve and exclude from canonical document. |
| `mini-bi-projects` | Current projects, dashboards/widgets, charts, compact dataset metadata | Home, current canvas, designer, savedCharts facade | Primary migration source; preserve unchanged. |
| `mini-bi-active-project-id` | Current active project | Home, canvas, designer, AppHeader navigation helper | Migration input and compatibility output; preserve. |
| `mini-bi-active-dashboard-id` | Current active dashboard | Canvas/designer/navigation | Migration input and compatibility output; preserve. |
| `mini-bi-storage-version` | projectStorage repair/version marker | projectStorage | Compatibility-only; preserve. |
| `dashboard-v2-saved-charts` | Current/legacy saved-chart compatibility list | projectStorage/savedCharts compatibility | Fallback migration input only when primary graphs lack a chart; preserve. |
| `dashboard-v2-chart-config` | Latest designer config/draft | Designer hook, savedCharts compatibility | Draft/compatibility; preserve, do not automatically promote as a saved chart. |
| `dashboard-v2-sql-saved-queries` | Demo SQL query library | Designer hook | UI/tool state; preserve, exclude from canonical graph in Phase 2. |
| `dashboard-canvas-layout-v1` | Legacy/current layout fallback | Canvas and projectStorage compatibility | Fallback migration input only; preserve. |
| `dashboard-canvas-panel-state` | Canvas panel visibility/width state | Current canvas | UI-only; preserve, exclude. |
| `mini-bi-theme` | Theme preference | themeMode/app shell | Settings migration input; continue compatibility writing until settings cutover is proven. |
| `mini-bi-db-connections` | Connection profile data, including unsafe fields | Connections page/storage | Explicitly excluded. Phase 2 defines only an empty secret-free metadata contract and does not read or rewrite this key. |
| `mini-bi.datasource.expandedNodes` | Legacy builder tree expansion | FieldList | UI-only; preserve, exclude. |
| `dashboard-v2-demo-hint-*` | Dismissed demo hints | Dashboard-v2 DemoHint | UI-only dynamic prefix; preserve, exclude. |
| `mini-bi-navigation-history-v1` | sessionStorage navigation history | useNavigationControls | Session/UI-only; preserve, exclude. |

### Route and feature dependency matrix

| Route/surface | Current source | Features depending on it | Phase 2 treatment |
| --- | --- | --- | --- |
| App root and protected-route gate | `useStore` | Theme and mock-auth gate | Auth unchanged; theme/settings compatibility only. |
| AppHeader | `useStore` for displayed project; projectStorage for current designer navigation context | Project selector, active sheet/dashboard, auth/theme, ribbon navigation | Display and navigation context use one canonical selector; auth/theme stay Zustand UI state. |
| Main Layout, SidebarLeft, SidebarRight | `useStore` | Density, sidebar state, active project/sheet/dashboard | Workspace selectors delegate to canonical repository; UI layout state remains Zustand. |
| `/login`, `/register` | authApi -> `useStore` | Demo authentication | No Phase 2 change. |
| `/`, `/home` | Mixed `projectStorage` plus legacy `useStore` context | Current project cards, dashboards, template navigation, recent context | Remove dual-source/manual revision logic; canonical selectors/actions only. |
| `/datasets` | `useStore.importedDatasets` | CSV import, schema, stats, preview/delete | Import into active canonical project; parser behavior unchanged. |
| `/dashboard` | projectStorage, savedCharts facade, layout/panel keys, demo dataset | Current canvas, widgets, saved charts, layout/save | Existing facade becomes canonical-backed; UI keys and demo/chart behavior remain until later phases. |
| `/dashboard-v2` | projectStorage, savedCharts facade, designer keys, demo dataset service | Current chart designer, SQL demo, save/export/share UI | Active context, dataset catalog, and saved-chart ownership use repository; SQL/share behavior unchanged. |
| `/dashboard-legacy` | `useStore` | Legacy dashboards, filters, interactions, views, export/share | Keep route and UI actions; workspace mutations delegate through compatibility adapter. |
| `/builder` | `useStore`, builder draft, field-tree key | Legacy Chart.js builder | Keep route and draft behavior; saved workspace mutations use canonical adapter. |
| `/settings` | `useStore` plus `mini-bi-theme` | Theme, density, date/number/canvas preferences | UI unchanged; settings persistence mirrors canonical workspace settings after validation. |
| `/share/:sheetId` | `useStore` projects/charts/shareLinks | Existing same-browser readonly sheet share | Behavior-neutral canonical read with legacy sheet aliases. |
| `/dashboard/:id/view`, `/embed` | `useStore` projects/charts/share snapshot | Existing local dashboard readonly/embed rendering | Behavior-neutral canonical read; no publish/auth/access changes. |
| `/connections` | `mini-bi-db-connections` | Demo profiles/test/preview/export/duplicate | Excluded from Phase 2 implementation. |
| Mock project/chart/dashboard APIs | `useStore` | Local API-shaped operations | Delegate workspace operations to repository; method behavior remains local and synchronous. |

### Non-route consumer map

| Module | Current dependency | Feature ownership in Phase 2 |
| --- | --- | --- |
| `src/App.jsx` | `useStore.theme` | Theme UI state remains Zustand; no workspace mutation. |
| `src/app/AppRoutes.jsx` | `useStore.isAuthenticated` | Mock route gate remains unchanged. |
| `src/components/layout/Layout.jsx` | `useStore` theme, density, sidebar/mobile state | UI state remains Zustand; active workspace comes from canonical selectors where needed. |
| `src/layout/AppHeader.jsx` | Both stores | Canonical active context; auth/theme remain Zustand. |
| `src/layout/SidebarLeft.jsx`, `SidebarRight.jsx` | `useStore` active context and UI | Canonical workspace context through adapter; UI state remains Zustand. |
| `src/components/dashboard/CardActions.jsx` | `useStore` chart actions | Chart mutations delegate to canonical repository through compatibility actions. |
| `src/utils/i18n.js` | `useStore.locale` | Locale remains Zustand UI/settings state and is mirrored in canonical settings. |
| `src/api/authApi.js` | `useStore` | Explicitly unchanged. |
| `src/api/projectApi.js`, `chartApi.js`, `dashboardApi.js` | `useStore` | Local workspace operations delegate to canonical repository. |
| `src/utils/savedChartsStorage.js` | `projectStorage` facade | Canonical project/chart ownership; compatibility keys remain derived outputs. |
| `src/hooks/dashboard-v2/useDashboardDesignerState.ts` | projectStorage and savedCharts facades | Canonical project, dataset, and chart identifiers; designer UI/SQL state remains local. |

## 3. Architecture options

| Option | Benefits | Risks | Decision |
| --- | --- | --- | --- |
| **A. New canonical repository/key with adapters** | Old keys untouched; atomic cutover; simplest rollback; pure migration; backend-ready seam; avoids selecting a 1,000-2,000-line service as architecture | Temporary third key during migration; adapters must be complete before cutover | **Recommended** |
| **B. Promote `useStore` / `mini-bi-v8-workspace` in place** | Richest existing behavior; fewer legacy consumers to convert; AppHeader/Datasets already use it | UI/auth/domain coupling; global entities need ownership; in-place rewrite complicates rollback; current canvas/designer shapes need conversion | Retained candidate; requires explicit rollback/backup design before approval |
| **C. Promote `projectStorage` / `mini-bi-projects`** | Current Home/canvas/designer already use it; project-scoped charts/dashboards | Imported datasets, settings, shares, sheets, filters/views, and legacy routes are missing or incompatible; service already owns compaction/compatibility concerns | Not recommended |
| **D. Continue dual writing both graphs** | Small initial edits | Split-brain remains; write ordering and failure handling are ambiguous; future backend seam remains absent | Rejected |

### Why Option A is safer

- It never overwrites either recovery source.
- Runtime validation can reject a bad canonical document without damaging existing records.
- The migration can be tested as a pure function before storage is touched.
- Rollback is a reader/cutover decision rather than an in-place data restoration.
- `useStore` can retain auth/UI responsibilities without remaining the domain repository.
- `projectStorage` can retain its public function signatures while ceasing to own a second graph.
- A future HTTP repository can replace the local repository without rewriting route components around localStorage shapes.

## 4. Versioned canonical schema

The implementation should use runtime-validated JavaScript plus JSDoc in Phase 2. Adding TypeScript configuration or dependencies remains Phase 6 work. Existing TS/TSX consumers may import the JavaScript repository.

```ts
interface WorkspaceDocumentV1 {
  schemaVersion: 1;
  revision: number;
  active: {
    projectId: string;
    dashboardId: string | null;
  };
  projects: WorkspaceProject[];
  settings: WorkspaceSettings;
  migration: WorkspaceMigrationMetadata;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceProject {
  id: string;
  name: string;
  datasets: WorkspaceDataset[];
  charts: WorkspaceChart[];
  dashboards: WorkspaceDashboard[];
  shares: WorkspaceShareSnapshot[];
  connectionProfiles: ConnectionProfileMetadata[];
  legacySheetAliases: LegacySheetAlias[];
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceDataset {
  id: string;
  projectId: string;
  name: string;
  source: string;
  fields: WorkspaceField[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  columnCount: number;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceChart {
  id: string;
  projectId: string;
  datasetId: string | null;
  name: string;
  title: string;
  chartType: string;
  engine: "echarts" | "chartjs" | "unknown";
  config: Record<string, unknown>;
  dataContract: {
    sourceType: "dataset" | "sql-result" | "snapshot" | "demo" | "unknown";
    datasetId: string | null;
    fields: WorkspaceField[];
    rows: Array<Record<string, unknown>>;
    queryText?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceDashboard {
  id: string;
  projectId: string;
  name: string;
  widgets: WorkspaceDashboardWidget[];
  canvasSettings: Record<string, unknown>;
  legacySheetId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceDashboardWidget {
  id: string;
  projectId: string;
  dashboardId: string;
  kind: "chart" | "kpi" | "table" | "text" | "image" | "filter" | "shape" | "divider" | "button" | "unknown";
  chartId: string | null;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
    zIndex: number;
  };
  presentation: Record<string, unknown>;
  chartSnapshot: Record<string, unknown> | null;
  assetRef: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceShareSnapshot {
  id: string;
  projectId: string;
  dashboardId: string;
  legacySheetId: string | null;
  mode: "local-readonly";
  snapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface WorkspaceSettings {
  theme: "light" | "dark" | "system";
  locale: string;
  density: "compact" | "comfortable" | "spacious";
  dateFormat: string;
  numberFormat: string;
  dashboardPreferences: Record<string, unknown>;
}

interface ConnectionProfileMetadata {
  id: string;
  projectId: string;
  name: string;
  type: string;
  hasPassword: boolean;
  secretRef: null;
  vaultSecretId: null;
}

interface WorkspaceMigrationMetadata {
  completedAt: string;
  sourceKeys: string[];
  sourceFingerprints: Record<string, string>;
  conflicts: WorkspaceMigrationConflict[];
  warnings: string[];
}
```

Phase 2 leaves `connectionProfiles` empty. It does not read the unsafe connection key. Phase 5 will define whitelist serialization and safe metadata migration.

### Repository boundary

Expected public contract:

```ts
interface WorkspaceRepository {
  getSnapshot(): WorkspaceDocumentV1;
  subscribe(listener: () => void): () => void;
  update(mutator: (current: WorkspaceDocumentV1) => WorkspaceDocumentV1): WorkspaceDocumentV1;
  setActiveProject(projectId: string, preferredDashboardId?: string): WorkspaceProject;
  setActiveDashboard(dashboardId: string): WorkspaceDashboard;
  upsertProject(project: WorkspaceProject): WorkspaceProject;
  upsertDataset(projectId: string, dataset: WorkspaceDataset): WorkspaceDataset;
  deleteDataset(projectId: string, datasetId: string): void;
  upsertChart(projectId: string, chart: WorkspaceChart): WorkspaceChart;
  deleteChart(projectId: string, chartId: string): void;
  upsertDashboard(projectId: string, dashboard: WorkspaceDashboard): WorkspaceDashboard;
  upsertShare(projectId: string, share: WorkspaceShareSnapshot): WorkspaceShareSnapshot;
  resolveShare(shareId: string): WorkspaceShareSnapshot | null;
}
```

Boundary rules:

- Route components and hooks do not access workspace localStorage keys directly.
- Repository writes validate a complete new document and perform one `setItem`.
- Snapshot objects are immutable to consumers.
- Same-tab updates notify subscribers; cross-tab `storage` events reload only validated documents.
- `useWorkspaceSelector(selector)` is implemented with `useSyncExternalStore`.
- A future HTTP repository is Phase 8 work; Phase 2 remains synchronous and local.

## 5. Migration, conflict, rollback, and recovery

### Boot and cutover sequence

1. Read `mini-bi-workspace-v1`.
2. If it is valid version 1, use it and do not re-import old keys.
3. If absent, read all approved migration inputs without writing.
4. Parse and normalize each source independently.
5. Convert both primary graphs into canonical partial projects.
6. Add compatibility-key records only when a primary graph does not already contain them.
7. Merge with deterministic type-specific rules.
8. Repair active IDs and references without deleting entities.
9. Validate schema, ownership, referential integrity, entity counts, and secret-field exclusion.
10. Persist the canonical document once.
11. Re-read and validate the written value.
12. Enable canonical readers only after the write/read validation succeeds.
13. Leave every old key unchanged.

### Source precedence

- Projects with different IDs remain separate.
- Same-ID projects merge collections by stable entity ID.
- Meaningful project names beat generated defaults; unresolved meaningful-name conflicts are recorded.
- Zustand wins settings, locale, imported-dataset rows/fields, local share snapshots, legacy sheet aliases, and unique legacy-only entities.
- projectStorage wins current dashboard canvas/widget structure, current ECharts chart structure, project-scoped metadata, and valid current active IDs.
- Missing fields are filled from the alternate source.
- No entity disappears merely because the other source lacks it.

### Deterministic conflicts

- Structurally compatible same-ID entities merge using the documented field precedence.
- Structurally incompatible same-ID entities are retained with stable suffixes derived from source, such as `~zustand` and `~project-storage`; timestamps or random values are not used.
- References are rewritten through an explicit old-to-new ID map.
- Every field-level winner records entity type, original ID, field, source names, and chosen source.
- Conflict records never include full rows, secrets, private keys, tokens, or complete entity payloads.

### Idempotency

- Migration is a pure function of parsed source values.
- Stable IDs and deterministic suffixes make repeated results byte-equivalent apart from an injected fixed clock used by tests.
- A valid canonical document prevents automatic re-import.
- Source fingerprints are stored for audit/recovery but do not trigger background merges.
- Compatibility writes after cutover are derived from canonical state and are never re-read as new canonical entities.

### Preservation and rollback

- Original keys are never removed or rewritten in Phase 2.
- Canonical mode is enabled behind one internal adapter/cutover switch.
- Before cutover, both legacy and canonical readers run against fixtures and their entity counts/active context are compared.
- Rollback disables canonical mode and ignores/removes only `mini-bi-workspace-v1`.
- Rollback never reconstructs old data because the original values remain intact.
- Legacy key deletion is prohibited until Phase 8 parity approval.

### Recovery

- Invalid canonical JSON or an unknown schema version is not overwritten.
- The app builds a read-only in-memory recovery snapshot from valid legacy sources and exposes a storage-health warning.
- A failed write keeps the last valid in-memory snapshot and old storage values.
- A failed re-read/validation disables cutover and reports migration incomplete.
- Quota handling does not delete user entities or source keys.
- Missing dataset/chart references remain explicit `null` references plus warnings; unrelated demo rows are never substituted by migration.

## 6. Expected modules, routes, files, and tests

### New domain files

| File | Responsibility |
| --- | --- |
| `src/domain/workspace/workspaceSchema.js` | JSDoc contracts, schema version, runtime validators, safe cloning. |
| `src/domain/workspace/workspaceMigrations.js` | Pure parsers, converters, deterministic merge, reference repair, provenance. |
| `src/domain/workspace/workspaceRepository.js` | Local/in-memory storage adapter, atomic writes, revisions, subscriptions, recovery. |
| `src/domain/workspace/workspaceSelectors.js` | Pure selectors and `useWorkspaceSelector`. |
| `src/domain/workspace/workspaceCompatibility.js` | Canonical-to-Zustand/projectStorage conversion without a second graph. |
| `src/domain/workspace/__fixtures__/workspaceFixtures.js` | Synthetic legacy/canonical fixtures with sentinel, non-secret fields. |

### Existing files expected to change

| File | Expected Phase 2 change |
| --- | --- |
| `src/utils/storage.js` | Preserve UI/auth persistence while delegating canonical workspace projection; retain old key behavior. |
| `src/store/useStore.js` | Keep auth/UI/legacy actions; delegate workspace reads/mutations through compatibility layer. |
| `src/services/projectStorage.js` | Retain public API but become a canonical repository facade; stop owning `mini-bi-projects` as an independent graph after cutover. |
| `src/utils/savedChartsStorage.js` | Resolve/upsert charts through canonical project ownership. |
| `src/layout/AppHeader.jsx` | Use canonical active-project/dashboard selectors for display and navigation context. |
| `src/pages/HomePage.jsx` | Remove mixed-store/manual revision logic and use canonical selectors/actions. |
| `src/pages/DatasetsPage.jsx` | Import/delete datasets under the canonical active project. Parser behavior remains unchanged. |
| `src/components/dashboard-v2/services/datasetService.ts` | Add canonical project datasets to the catalog while retaining explicit demo fallback. |
| `src/pages/DashboardDesignerV2/index.tsx` | Resolve canonical active project/dashboard and selected dataset. |
| `src/hooks/dashboard-v2/useDashboardDesignerState.ts` | Persist canonical chart ownership/data identifiers; SQL semantics unchanged. |
| `src/pages/DashboardCanvasBuilder.jsx` | Subscribe to canonical context through facade and verify saved chart/dashboard ownership; no durability/share changes. |
| `src/pages/DashboardPage.jsx` | Use compatibility adapter for workspace actions; feature behavior unchanged. |
| `src/features/builder/BuilderPage.jsx` | Use compatibility adapter for active context and saves; builder draft unchanged. |
| `src/layout/SidebarRight.jsx` | Canonical active project/dashboard context. |
| `src/layout/SidebarLeft.jsx` | Canonical context if this component remains mounted; no removal. |
| `src/pages/SharePage.jsx` | Behavior-neutral canonical snapshot resolution with sheet aliases. |
| `src/pages/DashboardPublicPage.jsx` | Behavior-neutral canonical dashboard/share resolution. |
| `src/api/projectApi.js` | Local adapter delegates to repository. |
| `src/api/chartApi.js` | Local adapter delegates to repository. |
| `src/api/dashboardApi.js` | Local adapter delegates to repository. |

Files intentionally not changed: auth API/client behavior, Login/Register, DatabaseConnectionPage/storage, CSV parser/worker, Docker/deployment, Settings UI behavior, package files, and backend/database artifacts.

### Test files

Expected new tests:

- `src/domain/workspace/workspaceMigrations.test.js`;
- `src/domain/workspace/workspaceRepository.test.js`;
- `src/domain/workspace/workspaceSelectors.test.jsx`;
- `src/domain/workspace/workspaceCompatibility.test.js`;
- `src/domain/workspace/workspaceJourney.test.jsx`;
- `src/components/dashboard-v2/services/datasetService.test.ts`;
- `src/services/projectStorage.test.js`.

Expected existing tests to extend:

- `src/store/useStore.test.js`;
- `src/utils/storage.test.js`;
- `src/utils/dashboardShareUtils.test.js` only for read-parity fixtures, not new sharing behavior.

## 7. Dependency reproducibility remediation

### Current evidence

- `npm ls --depth=0` fails.
- Declared and locked `framer-motion` and `recharts` are missing from `node_modules`.
- TypeScript/typescript-eslint packages, `axe-core`, and `ts-api-utils` are installed but undeclared/extraneous.
- `package-lock.json` resolves Vite 8.0.11; installed Vite is 8.1.4.
- The installed tree already contains patched `@babel/core` 7.29.7, `js-yaml` 4.3.0, `undici` 7.28.0, and Vite 8.1.4, but those values are not reproducible from the current lockfile.

### Recommended pre-implementation dependency change

Handle dependency repair as a separate, explicitly approved dependency-only change before Phase 2 source work:

1. Reproduce the committed state in a disposable clean checkout with `npm ci`.
2. Record `npm ls`, audit, lint, tests, and build from the committed lockfile.
3. Run `npm audit fix --dry-run --json`; reject any forced or major update.
4. Refresh only the lockfile/direct dev-tool range needed to resolve Vite and its audited transitive development chains.
5. Keep `framer-motion` and `recharts` declared and installed for Phase 2; removal remains Phase 6 work despite no current source imports.
6. Do not add the extraneous TypeScript/typescript-eslint/axe packages to the manifest in Phase 2. A clean `npm ci` removes them.
7. Run `npm ci` again from the proposed lockfile.
8. Require `npm ls --depth=0`, lint, 9+ tests, build, full audit, and `npm audit --omit=dev` to pass before workspace source edits.
9. Review lockfile diff to confirm no runtime dependency or major version changed.

This plan changes no dependency now. It requires separate approval because a lockfile refresh can change build tooling even when application source is untouched.

## 8. Four npm audit findings

`npm audit --omit=dev --json` currently reports zero production dependency vulnerabilities. All four findings are in development-toolchain chains.

| Package/finding | Current locked risk | Observed patched installed version | Proposed treatment | Application-behavior risk |
| --- | --- | --- | --- | --- |
| Vite: Windows path/UNC dev-server issues | High; locked 8.0.11 is within vulnerable 8.0.0-8.0.15 | 8.1.4 | Update reproducible lock to a non-vulnerable Vite 8.x, no major upgrade | Medium: affects dev server and bundling; requires full build and route smoke test |
| undici via jsdom | High; lock resolves a vulnerable 7.x | 7.28.0 | Refresh jsdom transitive lock to undici >=7.28.0 | Low to application runtime; medium to tests |
| js-yaml via ESLint | Moderate; vulnerable <=4.1.1 | 4.3.0 | Refresh ESLint transitive lock to >4.1.1 | Low; lint/config parsing only |
| `@babel/core` via lint/build tooling | Low; vulnerable <=7.29.0 | 7.29.7 | Refresh transitive lock to >7.29.0 | Low to runtime; compilation/lint verification required |

Prohibited remediation:

- `npm audit fix --force`;
- major React, Router, MUI, ECharts, Chart.js, Vite, or test-framework upgrade;
- removal of direct dependencies in the same change;
- treating the currently installed but uncommitted node_modules versions as proof of reproducibility.

## 9. Validation criteria

### Dependency and static gates

- Clean `npm ci` succeeds.
- `npm ls --depth=0` exits 0 with no missing/extraneous packages.
- `npm audit` exits 0 after an approved dependency-only patch, or Phase 2 remains blocked.
- `npm audit --omit=dev` remains at zero.
- `npm run lint`, `npm test -- --run`, and `npm run build` pass.
- Build chunk changes are compared with the accepted baseline.

### Migration and persistence

- Zustand-only, projectStorage-only, mixed, corrupted, unknown-version, quota-failure, and collision fixtures.
- Entity counts, IDs, project ownership, references, active context, source fingerprints, conflicts, and warnings asserted.
- Original keys compared byte-for-byte before and after migration.
- Second migration run produces the same canonical result.
- Page remount and full reload restore canonical project, dashboard, dataset, chart, and local share records.
- Cross-tab storage event accepts only a valid canonical document.

### Active project and routes

- AppHeader and Home return the same active project before and after selection.
- Current canvas/designer and legacy dashboard/builder resolve the same project/dashboard context.
- Invalid stored active IDs repair deterministically.
- Public share/view/embed fixtures resolve the same existing local snapshots as before.
- Connections and authentication behavior are unchanged.

### CSV import and dataset catalog

- Existing CSV parser fixture is imported through DatasetsPage without changing parser semantics.
- Imported dataset receives the active canonical project ID.
- Dataset appears after refresh in DatasetsPage and Dashboard Designer V2's datasource list.
- Dataset rows/fields are preserved exactly.
- Deletion updates the canonical project; missing-chart fallback behavior is deferred to Phase 3 and must not substitute demo rows silently.

### Chart designer and saved charts

- Selecting a canonical imported dataset exposes its fields and rows to the current designer.
- Saving a chart records canonical project ID and dataset ID.
- Saved chart appears in the current canvas chart library.
- Refresh preserves chart identity, ownership, config, and dataset reference.
- Existing legacy Chart.js records remain readable through the compatibility adapter.
- SQL replay semantics are not changed or claimed fixed in Phase 2.

### Browser smoke routes

Run desktop and representative narrow-width read/interaction checks for:

- `/home`;
- `/datasets`;
- `/dashboard-v2`;
- `/dashboard`;
- `/dashboard-legacy`;
- `/builder`;
- an existing local `/share/:sheetId` fixture;
- existing dashboard view/embed fixtures.

## 10. Risks, rollback gates, and approval decisions

### Highest risks

1. Same-ID records may be semantically different across stores.
2. Large dataset rows may exceed localStorage quota when copied into a new full document.
3. Compatibility writers may create feedback loops or stale duplicate keys.
4. Current and legacy chart engines store incompatible configuration/data shapes.
5. Global Zustand charts/datasets/shares need deterministic project ownership.
6. Sheet removal from the canonical graph may break legacy routes unless aliases are complete.
7. Invalid/missing references may currently be masked by demo data.
8. Dependency repair can change bundler/test output before workspace work begins.

### Rollback gates

- No source cutover before pure migration and byte-preservation tests pass.
- No canonical write before full-document validation and quota preflight.
- No route cutover until old/new selectors match on synthetic fixtures.
- No compatibility write enabled until loop/idempotency tests pass.
- No legacy key cleanup in Phase 2.
- No dependency or audit change mixed with workspace source changes.
- Any entity-count loss, unresolved reference deletion, source-key mutation, secret-field copy, refresh loss, or route-context divergence stops the phase and restores legacy readers.

### Decisions requiring explicit approval

| Decision | Recommended approval | Alternative |
| --- | --- | --- |
| Physical canonical key | New `mini-bi-workspace-v1` key | In-place `mini-bi-v8-workspace` promotion only with a separately approved backup/restore mechanism |
| Logical source precedence | Zustand for datasets/settings/shares/legacy aliases; projectStorage for current dashboards/charts/active IDs | Promote one whole existing graph and accept larger conversion risk |
| Sheet model | Canonical dashboards plus `legacySheetAliases` | Keep sheets canonical, increasing backend/domain complexity |
| Implementation language | Runtime-validated JS/JSDoc until Phase 6 | Add TypeScript gates early as a separate approved prerequisite |
| Connection profiles | Empty metadata contract; do not read `mini-bi-db-connections` | Whitelist migration deferred to Phase 5 |
| Share handling | Behavior-neutral read cutover only | Any publish/access change deferred to Phase 4 |
| Dependency repair | Separate lockfile/toolchain-only approval before source work | `npm ci` current vulnerable lock and carry audit failures to Phase 6 |
| Cutover | Internal adapter switch after parity tests | Big-bang removal of old readers, not recommended |

## Approval requested

Approval of this package authorizes planning and implementation of Phase 2 only after the dependency-only entry gate is completed. It does not authorize backend work, auth changes, new sharing behavior, connection-secret migration, source-key deletion, or later phases.

The approver should explicitly confirm or revise the eight decisions above before Phase 2 source changes begin.
