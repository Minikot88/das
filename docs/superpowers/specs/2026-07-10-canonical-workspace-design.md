# Canonical Workspace and Migration Design

**Status:** Historical alternative candidate - not approved for implementation
**Date:** 2026-07-10
**Project:** DashboardMiniBi

> Execution is governed by `docs/audit-remediation-plan.md`. This draft proposes
> a new `mini-bi-workspace-v1` key, while the current Phase 2 candidate promotes
> `useStore` / `mini-bi-v8-workspace`. Neither approach may be implemented
> until dependencies, migration criteria, validation requirements, and rollback
> strategy are explicitly approved.

## 1. Purpose

DashboardMiniBi currently has two incompatible browser-persisted workspace graphs:

- `mini-bi-v8-workspace`, owned by `src/store/useStore.js` through `src/utils/storage.js`;
- `mini-bi-projects`, owned by `src/services/projectStorage.js`, plus designer and canvas compatibility keys.

The split is visible in the product: the header and legacy/local-share surfaces can select a different project from Home, the current canvas, and Dashboard Designer V2. Imported CSV datasets live in Zustand while the current designer reads a demo dataset service.

Phase 2 establishes one canonical frontend domain and repository without deleting either legacy record. It migrates both models, gives the scoped consumers one active-project source, and leaves compatibility adapters for legacy routes until later parity work.

## 2. Goals

Phase 2 must:

1. Define one versioned domain for Project, Dataset, Chart, Dashboard, DashboardWidget, ShareSnapshot, Settings, and safe ConnectionProfile metadata.
2. Migrate usable records from both legacy persistence models without silently dropping user data.
3. Make Header, Home, Datasets, the current canvas/designer, SharePage, and DashboardPublicPage use the same canonical repository.
4. Preserve old localStorage keys and legacy read behavior.
5. Prove migration, idempotency, active-project consistency, and imported-dataset visibility with automated tests.
6. Isolate duplicate state behind adapters rather than deleting legacy code before parity is proven.

## 3. Non-goals

Phase 2 will not:

- delete or clear any legacy localStorage key;
- remove the legacy dashboard, builder, chart engine, or share route;
- change CSV parsing, duplicate-header policy, or import limits;
- finalize SQL replay/result snapshot semantics;
- implement dashboard autosave or durable uploaded assets;
- claim local share links are secure or multi-device;
- connect to a real API, backend, database, or secret vault;
- add TypeScript compiler/lint gates or dependency upgrades;
- perform broad UI, responsive, or styling work.

Those outcomes remain assigned to the later user-specified phases. The canonical schema includes the identifiers and optional contracts those phases require, but Phase 2 does not implement their behavior.

## 4. Considered Approaches

### 4.1 New canonical repository with compatibility adapters — selected

Create a versioned domain under `src/domain/workspace/`, migrate both old sources into a new key, and make `projectStorage` plus scoped Zustand actions delegate to it.

Advantages:

- neither old model is privileged as the long-term architecture;
- migration and merge logic are pure and testable;
- current consumers can move incrementally through a stable interface;
- later HTTP repository work has a clear seam;
- legacy records remain recoverable.

Cost:

- requires explicit converters for both existing shapes;
- same-tab reactivity and compatibility writes must be designed carefully;
- some legacy state remains temporarily duplicated.

### 4.2 Promote `mini-bi-projects`

This is close to the current canvas/designer shape, but it lacks settings, shares, legacy sheet relationships, and reliable imported-dataset ownership. Extending it in place would mix migration, compatibility, and canonical ownership inside an already 1,022-line service.

### 4.3 Promote the Zustand workspace

This preserves the legacy dashboard model but keeps a 2,120-line UI store as the persistence boundary and forces the current canvas/designer back into the sheet-based/global-chart shape. It also makes a future local/HTTP repository switch harder.

## 5. Canonical Storage

### 5.1 Key and version

The canonical browser key will be:

```text
mini-bi-workspace-v1
```

The stored document has `schemaVersion: 1`. Repository code must reject an unknown future version rather than downgrading or overwriting it.

### 5.2 Legacy keys retained

The migration reads but does not remove:

- `mini-bi-v8-workspace`;
- `mini-bi-v8-builder-draft`;
- `mini-bi-projects`;
- `mini-bi-active-project-id`;
- `mini-bi-active-dashboard-id`;
- `dashboard-v2-saved-charts`;
- `dashboard-v2-chart-config`;
- `dashboard-v2-sql-saved-queries`;
- `dashboard-canvas-layout-v1`;
- `dashboard-canvas-panel-state`;
- `mini-bi-db-connections`.

Compatibility writes are allowed only through named adapters and must not become an independent source of truth.
Implementation must not remove these keys in Phase 2.

## 6. Canonical Domain

The types live in `src/domain/workspace/types.ts`.

### 6.1 WorkspaceDocument

```ts
export interface WorkspaceDocument {
  schemaVersion: 1;
  revision: number;
  projects: WorkspaceProject[];
  activeProjectId: string;
  activeDashboardId: string | null;
  settings: WorkspaceSettings;
  migration: WorkspaceMigrationMetadata;
  createdAt: string;
  updatedAt: string;
}
```

`revision` increases on every successful canonical write. It supports subscriptions now and optimistic concurrency in a future HTTP adapter.

### 6.2 WorkspaceProject

```ts
export interface WorkspaceProject {
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
```

Sheets are not a canonical entity. Each migrated sheet becomes alias metadata pointing to the dashboards that formerly belonged to it. This keeps `/share/:sheetId`, legacy builder context, and later safe redirects possible without retaining sheet ownership in the new graph.

### 6.3 WorkspaceDataset

```ts
export interface WorkspaceDataset {
  id: string;
  projectId: string;
  name: string;
  source: string;
  fields: WorkspaceField[];
  rows: Array<Record<string, unknown>>;
  rowCount: number;
  columnCount: number;
  validation: DatasetValidation;
  createdAt: string;
  updatedAt: string;
}
```

Phase 2 preserves existing rows and fields. Phase 3 will add CSV limits and strengthen the parser without changing dataset identity or project ownership.

### 6.4 WorkspaceChart and data contract

```ts
export interface WorkspaceChart {
  id: string;
  projectId: string;
  datasetId: string | null;
  name: string;
  title: string;
  chartType: string;
  engine: "echarts" | "chartjs" | "unknown";
  config: Record<string, unknown>;
  dataContract: ChartDataContract | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChartDataContract {
  sourceType: "dataset" | "sql-result" | "snapshot" | "demo";
  datasetId: string | null;
  fields: WorkspaceField[];
  rows: Array<Record<string, unknown>>;
  query?: {
    text: string;
    dialect: "demo-sql";
  };
}
```

Phase 2 migrates existing chart rows/query-result fields when present. Phase 3 decides when an SQL result snapshot is authoritative and fixes replay behavior.

### 6.5 WorkspaceDashboard and WorkspaceDashboardWidget

```ts
export interface WorkspaceDashboard {
  id: string;
  projectId: string;
  name: string;
  widgets: WorkspaceDashboardWidget[];
  canvasSettings: WorkspaceCanvasSettings;
  theme: "light" | "dark";
  legacySheetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDashboardWidget {
  id: string;
  projectId: string;
  dashboardId: string;
  kind: "chart" | "text" | "image" | "shape";
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
```

`assetRef` is only a future-safe reference. Phase 2 does not persist blob URLs or introduce an asset store. Phase 4 defines the local prototype asset policy.

### 6.6 WorkspaceShareSnapshot

```ts
export interface WorkspaceShareSnapshot {
  id: string;
  projectId: string;
  dashboardId: string;
  legacySheetId: string | null;
  mode: "local-readonly";
  access: "link";
  snapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

The type deliberately says `local-readonly`; it does not model production authorization. Phase 4 adds the backend-ready publish/revoke/access/embed API contract.

### 6.7 WorkspaceSettings

`WorkspaceSettings` preserves the existing app settings, theme, density, locale, and dashboard preferences. It is workspace-level rather than project-level because the current settings UI behaves as a local user/workspace preference surface.

### 6.8 ConnectionProfileMetadata

```ts
export interface ConnectionProfileMetadata {
  id: string;
  projectId: string;
  name: string;
  type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  authType: string;
  hasPassword: boolean;
  secretRef: null;
  vaultSecretId: null;
  createdAt: string;
  updatedAt: string;
}
```

Migration is whitelist-only. It never copies password, SSH password, SSH private key, SSL client key/private material, token, or a URL containing credentials. The unsafe legacy key remains untouched until the dedicated security phase sanitizes it in place.

### 6.9 Supporting value types

```ts
export type WorkspaceFieldType = "text" | "number" | "date" | "boolean" | "unknown";

export interface WorkspaceField {
  id: string;
  name: string;
  label: string;
  type: WorkspaceFieldType;
}

export interface DatasetValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WorkspaceCanvasSettings {
  width: number;
  height: number;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
}

export interface LegacySheetAlias {
  sheetId: string;
  name: string;
  dashboardIds: string[];
}

export interface WorkspaceMigrationConflict {
  entityType: "project" | "dataset" | "chart" | "dashboard" | "widget" | "share";
  entityId: string;
  field: string;
  sources: string[];
  chosenSource: string;
}
```

### 6.10 Migration metadata

```ts
export interface WorkspaceMigrationMetadata {
  completedAt: string;
  sourceKeys: string[];
  conflicts: WorkspaceMigrationConflict[];
  warnings: string[];
}
```

Conflict entries contain entity type, ID, field, source names, and chosen source. They never contain raw secret values or entire entity payloads.

## 7. Repository Boundary

### 7.1 Files

- `src/domain/workspace/types.ts` — stable domain contracts only.
- `src/domain/workspace/workspaceMigrations.ts` — pure parsers, converters, merge policy, validation, and provenance.
- `src/domain/workspace/workspaceRepository.ts` — localStorage/in-memory persistence, atomic updates, revisioning, and subscriptions.
- `src/domain/workspace/workspaceSelectors.ts` — pure project/dataset/chart/dashboard/share selectors and the React subscription hook.
- `src/domain/workspace/workspaceCompatibility.ts` — conversion to/from legacy Zustand and `projectStorage` shapes.

### 7.2 Synchronous interface

The local prototype currently depends on synchronous access. The repository exposes:

```ts
getSnapshot(): WorkspaceDocument;
subscribe(listener: () => void): () => void;
update(mutator: (current: WorkspaceDocument) => WorkspaceDocument): WorkspaceDocument;
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
```

The future HTTP adapter will implement an asynchronous boundary in Phase 8. Phase 2 does not pretend the synchronous local interface is a server API.

### 7.3 React subscriptions

`useWorkspaceSelector(selector)` uses `useSyncExternalStore`. Repository writes notify same-tab listeners; browser `storage` events notify other tabs. AppHeader and Home therefore render the same `activeProjectId` and project object without manual revision counters.

## 8. Migration and Merge Policy

### 8.1 Boot sequence

1. Read `mini-bi-workspace-v1`.
2. If it is valid schema version 1, normalize it and use it without re-merging old keys.
3. If it is absent, parse both primary legacy sources and relevant compatibility keys without writing.
4. Convert each source into partial canonical projects.
5. Merge by stable entity ID using the type-specific rules below.
6. Validate references and active IDs.
7. Persist the complete canonical document once.
8. Leave every old key unchanged.

### 8.2 Invalid canonical data

If the canonical key exists but is invalid JSON or an unsupported schema:

- do not overwrite it;
- build a recoverable in-memory view from valid legacy records;
- expose a storage recovery warning;
- do not claim migration completion.

This avoids converting a recoverable corruption into permanent data loss.

### 8.3 Project merge

Projects with different IDs remain separate. Projects with the same ID merge.

Name precedence:

1. prefer a non-empty, non-default name over `My Project`, `Mini BI Workspace`, or generated defaults;
2. when both names are meaningful and different, prefer the `mini-bi-projects` name because it owns the current Home/canvas path;
3. record the alternate source/name as a conflict without storing duplicate project payloads.

Collections are unions by entity ID.

### 8.4 Entity merge

- Dataset collision: prefer the Zustand imported-dataset rows/fields because that is the active CSV import source; fill missing metadata from `projectStorage`.
- Chart collision: prefer the `projectStorage`/designer structure; fill missing engine, rows, query result, legacy Chart.js configuration, and timestamps from Zustand.
- Dashboard collision: prefer the current `projectStorage` canvas structure; add non-duplicated legacy layout/chart references as widgets when they are otherwise absent.
- Share collision: prefer Zustand because it owns the current local share records.
- Settings: use normalized Zustand settings/theme/locale.
- Connection metadata: migrate only safe whitelisted fields; assign records without an explicit project to the resolved active project.

No entity is removed because another source lacks it.

### 8.5 Active selection

Active project precedence:

1. valid `mini-bi-active-project-id`;
2. valid Zustand `activeProjectId`;
3. first canonical project.

Active dashboard precedence within that project:

1. valid `mini-bi-active-dashboard-id`;
2. valid Zustand `activeDashboardId`;
3. the dashboard referenced by the active legacy sheet;
4. first canonical dashboard.

### 8.6 Reference repair

- A chart with a missing dataset remains stored with `datasetId: null` plus a migration warning.
- A widget with a missing chart retains its snapshot when available; otherwise it remains as a missing-reference widget for later fallback UI.
- A share with an invalid project/dashboard is retained only in migration warnings, not exposed as a resolvable public snapshot.
- Duplicate IDs are deterministically suffixed with their source only when two structurally distinct entities cannot safely merge.

### 8.7 Idempotency

Running migration repeatedly with the same inputs produces the same IDs, ownership, active selection, and entity counts. Once a valid canonical record exists, old keys are compatibility inputs only and are not automatically re-imported.

## 9. Compatibility Strategy

### 9.1 `projectStorage`

`src/services/projectStorage.js` remains at its current import path but becomes a facade over the canonical repository. Existing functions such as `getProjects`, `getActiveProject`, `upsertChart`, and `upsertDashboard` convert canonical records to the shapes expected by the current canvas/designer.

The facade may continue writing designer/layout compatibility keys required by unconverted legacy consumers. It may not own a second project graph.

### 9.2 Zustand

`src/store/useStore.js` continues to own UI/auth state and legacy route actions. Its persisted workspace projection is generated from the canonical document, and scoped workspace mutations delegate to canonical repository operations.

Legacy-only sheet actions remain compatibility operations. They write canonical dashboards plus sheet alias metadata, then produce the old Zustand shape for legacy screens. They are not removed in Phase 2.

### 9.3 Consumer cutover

| Consumer | Phase 2 source |
| --- | --- |
| `src/layout/AppHeader.jsx` | Canonical project list and active selection; Zustand remains for auth/theme UI |
| `src/pages/HomePage.jsx` | Canonical selector/repository only; remove manual dual-source revision logic |
| `src/pages/DatasetsPage.jsx` | Active canonical project's datasets |
| `src/pages/DashboardCanvasBuilder.jsx` | Existing `projectStorage` imports, now backed by canonical repository |
| `src/pages/DashboardDesignerV2/index.tsx` | Canonical active project/dashboard through the facade/selectors |
| `src/hooks/dashboard-v2/useDashboardDesignerState.ts` | Canonical chart/dataset ownership through repository-backed services |
| `src/pages/DashboardPublicPage.jsx` | Canonical share resolution and snapshot |
| `src/pages/SharePage.jsx` | Canonical share resolution using `legacySheetId` aliases |

### 9.4 Dataset service

The dashboard-v2 dataset service reads canonical datasets for the active project and retains the built-in demo dataset as an explicit fallback. Phase 2 proves visibility and identity. Phase 3 replaces demo-only behavior that blocks imported rows and strengthens the chart data contract.

## 10. Persistence and Error Handling

- Canonical writes serialize a complete validated document and call `localStorage.setItem` once.
- Write failure keeps the last valid snapshot in memory, marks storage health unhealthy, and leaves the old canonical/legacy values untouched.
- Repository mutators clone or return new structures; consumers cannot mutate the cached snapshot in place.
- Quota handling never deletes datasets, charts, dashboards, or legacy keys automatically.
- Corrupted legacy JSON is ignored per source and reported in migration warnings; other valid sources still migrate.
- Text-encoding repair reuses the existing repair utilities before canonical normalization.
- Storage events with the canonical key refresh the snapshot only after validation.

## 11. Test Design

### 11.1 Migration fixtures

Add synthetic fixtures that contain no real credentials:

- a Zustand workspace with projects, sheets, dashboard layout, global charts, imported dataset, settings, and local shares;
- a `projectStorage` list with projects, dashboards/widgets, charts, and datasets;
- overlapping IDs with different names and partial records;
- corrupted JSON and unknown schema versions;
- a connection record containing obvious synthetic sentinel secret fields to prove whitelist-only metadata migration.

### 11.2 Required tests

1. Zustand-only migration preserves project, dashboard, chart, dataset, share, settings, active selection, and sheet aliases.
2. `projectStorage`-only migration preserves project-scoped datasets/charts/dashboards/widgets and active IDs.
3. Merge-by-ID produces the documented type-specific winners while retaining every unique entity.
4. Repeated migration is idempotent.
5. Old keys remain unchanged after successful canonical migration.
6. Invalid canonical JSON is not overwritten and yields an in-memory recovery snapshot.
7. Header and Home selectors return the same active project after selection changes.
8. An imported dataset written through the repository appears in the active project's dataset selector and Dashboard Designer datasource list.
9. Canonical share resolution supports dashboard shares and legacy sheet aliases.
10. Missing dataset/chart references remain representable and produce migration warnings rather than entity deletion.
11. Connection metadata migration contains no password, private key, client key, token, credential URL, or raw SSH/SSL secret field.

### 11.3 Existing regression gate

All existing tests must continue to pass. The Phase 2 completion run uses the full project gate specified by the goal, including `git status`, dependency tree, lint, tests, build, audit, and Compose. Typecheck/check remain unavailable until the user-specified TypeScript phase.

## 12. Delivery Sequence

Implementation will be split into reviewable steps:

1. Add domain types, pure migrations, fixtures, and failing migration tests.
2. Add repository persistence/subscription behavior and tests.
3. Convert `projectStorage` into a compatibility facade.
4. Bridge scoped Zustand workspace actions and persistence.
5. Cut AppHeader and Home to canonical selectors; test active-project consistency.
6. Cut Datasets and the designer dataset service; test imported-dataset visibility.
7. Cut SharePage and DashboardPublicPage to canonical resolution.
8. Verify current canvas/designer compatibility and update progress documentation.

No step deletes legacy keys or routes.

## 13. Acceptance Criteria

Phase 2 is complete only when:

- Header and Home render the same active project and change together;
- every canonical Dataset, Chart, DashboardWidget, Dashboard, and ShareSnapshot belongs to one project;
- both legacy persistence models migrate safely and idempotently;
- imported datasets appear under the canonical active project and in the current designer's datasource inventory;
- current canvas/designer reads and writes pass through the canonical repository;
- local share viewers resolve the canonical project graph;
- legacy records remain present and compatibility tests pass;
- no secret material is copied into the canonical connection metadata;
- all Phase 2 tests and the full verification gate produce documented results.

## 14. Downstream Contracts

Phase 3 may strengthen CSV and chart data behavior without changing IDs or ownership.
Phase 4 may add asset persistence and publish/share API abstractions without changing dashboard/share ownership.
Phase 5 sanitizes unsafe legacy connection storage and hardens deployment.
Phase 6 adds TypeScript/lint/check/CI gates.
Phase 7 changes UX/accessibility/responsive behavior without creating another data source.
Phase 8 supplies local/HTTP adapters and final backend/API/database readiness documentation.
