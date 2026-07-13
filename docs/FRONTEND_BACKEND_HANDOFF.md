# Frontend-to-Backend Handoff Contract

Status: frontend contract freeze, 2026-07-13. Everything under **Proposed HTTP** is a design input, not an implemented endpoint. This repository contains no backend, database, ORM, server authentication, remote connector, remote share service or secret vault.

## Frozen frontend boundary

Route components must continue to consume repository/domain operations rather than transport details. The canonical local adapter is `workspaceRepository`, whose stable conceptual interface is:

```text
getSnapshot, getStatus, subscribe,
runMigrationDryRun, migrateIfNeeded, useLegacyFallback,
update, setActiveProject, setActiveDashboard,
upsertProject, upsertDataset, deleteDataset,
upsertChart, deleteChart, upsertDashboard,
upsertShare, resolveShare
```

The compatibility facade in `projectStorage` may remain while the HTTP adapter is introduced, but new route code should target the repository boundary. An HTTP adapter will be asynchronous; optimistic UI requires a request identity, a rollback snapshot and an explicit conflict result.

The frozen ownership graph is:

```text
Workspace
└── Project
    ├── Dataset ── Field[]
    ├── Chart ── dataContract(datasetId | exact snapshot | built-in demo)
    ├── Dashboard ── Widget[] ── chartId?
    └── LocalShare ── readonly Dashboard snapshot
```

Entity IDs and references are stable. The server may normalize timestamps and revisions but must not silently remap IDs, infer a different owner, replace intentional empty data, or substitute unrelated demo rows.

## Common proposed transport contract

```ts
type ApiEnvelope<T> = {
  data: T;
  revision: number;
  requestId: string;
};

type ApiProblem = {
  code: string;
  message: string;
  requestId: string;
  fieldErrors?: Record<string, string>;
  retryable: boolean;
  currentRevision?: number;
};
```

- Mutations send `If-Match: <etag>` or `baseRevision`; success returns a new revision/ETag.
- `400/422` retains the draft and maps field errors; `401` ends the server session; `403` is distinct from not-found; `404/410` is unavailable/expired; `409/412` is a visible revision conflict; `413` is an import/snapshot limit; `429` carries retry delay; network/`5xx` retains the last valid snapshot and permits retry.
- Lists must define cursor pagination, deterministic sort and filters before implementation.
- Every project-owned lookup is authorized on the server; client project IDs are never authorization evidence.

## Resource contracts

### Authentication

- **Frontend entity:** local demo session only; no canonical secret or credential.
- **Current repository/local adapter:** login UI state and protected-route guard; demo credentials are presentation fixtures.
- **Proposed HTTP:** `POST /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/current`, `GET /api/v1/auth/sessions/current`.
- **Request DTO:** `{ email, password }` is write-only over TLS; logout has no body.
- **Response DTO:** `{ user, workspaceSummaries, expiresAt }`; never echo password/token material.
- **Errors:** invalid credentials, locked/disabled account, verification required, rate limited, session expired, unavailable.
- **Ownership/auth:** server session establishes actor; cookie/token strategy is a security decision.
- **Optimistic locking:** not applicable to login; session revocation needs server consistency.
- **Local-to-server migration:** discard demo auth state; do not promote it to a real account.
- **Limitation:** real authentication, reset, MFA and verification are absent.

### Users

- **Frontend entity:** display identity used by header/avatar; no canonical user table model.
- **Current repository/local adapter:** demo identity only.
- **Proposed HTTP:** `GET/PATCH /api/v1/users/me`.
- **Request/response DTO:** patch safe profile fields; response `{ id, email, displayName, avatarUrl, status, revision }`.
- **Errors:** validation, unauthorized, duplicate email, stale revision.
- **Ownership/auth:** self by default; administrative changes require an explicit role.
- **Optimistic locking:** required for profile mutation.
- **Migration:** map local display preferences only after user consent.
- **Limitation:** lifecycle, verification and administrative policy need product/security decisions.

### User preferences

- **Frontend entity:** theme and possibly density; future date/number formats are disabled.
- **Current repository/local adapter:** theme/device storage and safe UI compatibility state.
- **Proposed HTTP:** `GET/PATCH /api/v1/users/me/preferences`.
- **Request/response DTO:** `{ density?, dateFormat?, numberFormat?, locale?, revision }`; theme should remain optional because it is device-local by default.
- **Errors:** unsupported locale/format, validation, stale revision.
- **Ownership/auth:** authenticated user.
- **Optimistic locking:** required if server-synced.
- **Migration:** opt-in merge; device preference wins locally until a sync policy is chosen.
- **Limitation:** scope/inheritance is not a frontend decision.

### Workspaces

- **Frontend entity:** canonical `Workspace` document version 1 with revision, active context and project graph.
- **Current repository/local adapter:** `getSnapshot`, `subscribe`, `update`; LocalStorage key `mini-bi-workspace-v1`.
- **Proposed HTTP:** `GET /api/v1/workspaces/:workspaceId`; granular child endpoints are preferred over whole-document writes.
- **Request/response DTO:** response may mirror the normalized ownership graph or return paged child collections plus `{ id, schemaVersion, revision }`.
- **Errors:** forbidden, missing, unsupported schema, stale revision, migration required.
- **Ownership/auth:** authenticated workspace member.
- **Optimistic locking:** workspace-level ETag for settings; entity revisions for child writes.
- **Migration:** validated import of the local document with an idempotency key and dry-run report.
- **Limitation:** tenant/workspace relationship is unresolved.

### Projects

- **Frontend entity:** `{ id, name, dashboards, ... }` owned by one workspace in the current graph.
- **Current repository/local adapter:** `upsertProject`, `setActiveProject`; facade create/rename/delete operations.
- **Proposed HTTP:** `GET/POST /api/v1/workspaces/:workspaceId/projects`; `GET/PATCH/DELETE /api/v1/projects/:projectId`.
- **Request/response DTO:** create `{ clientId?, name }`; patch `{ name, archived?, baseRevision }`; response normalized `ProjectDto` with counts and revision.
- **Errors:** duplicate/invalid name, forbidden, missing, non-empty delete conflict, stale revision.
- **Ownership/auth:** workspace member; write/delete permissions by role.
- **Optimistic locking:** required.
- **Migration:** preserve local project IDs when collision-free; return an explicit remap manifest otherwise.
- **Limitation:** archive/soft-delete and name uniqueness rules need confirmation.

### Project membership

- **Frontend entity:** none; the local graph assumes a single browser user.
- **Current repository/local adapter:** none.
- **Proposed HTTP:** `GET/POST /api/v1/projects/:projectId/members`; `PATCH/DELETE /api/v1/projects/:projectId/members/:userId`.
- **Request/response DTO:** `{ userId|inviteEmail, role }`; response `{ userId, role, status, revision }`.
- **Errors:** invalid role, already member, last-owner removal, invite expired, forbidden.
- **Ownership/auth:** project owner/admin according to a future role matrix.
- **Optimistic locking:** required for role change/removal.
- **Migration:** no local membership data to migrate.
- **Limitation:** roles, invitations and tenant boundaries are blocked by product/security decisions.

### Datasets

- **Frontend entity:** project-owned dataset with stable ID, name, source metadata, fields, exact rows/preview and status.
- **Current repository/local adapter:** `upsertDataset`, `deleteDataset`, dataset service/selectors.
- **Proposed HTTP:** `GET/POST /api/v1/projects/:projectId/datasets`; `GET/PATCH/DELETE /api/v1/datasets/:datasetId`.
- **Request/response DTO:** create/import result `{ clientId?, name, sourceType, schemaVersion, fieldCount, rowCount, status }`; list returns metadata, not unrestricted rows.
- **Errors:** invalid schema, unsupported source, too large, duplicate, processing failed, missing, dependency conflict, stale revision.
- **Ownership/auth:** project read/write roles; row-level policy is not defined.
- **Optimistic locking:** metadata mutations required; import jobs use idempotency keys.
- **Migration:** decide whether local rows upload, source file re-upload is required, or only metadata migrates.
- **Limitation:** source-file and row-storage strategies are unresolved.

### Dataset fields

- **Frontend entity:** stable field metadata used by mappings: name/key, label, inferred type and role metadata.
- **Current repository/local adapter:** embedded in each dataset; schema normalization/validation.
- **Proposed HTTP:** `GET /api/v1/datasets/:datasetId/fields`; schema-changing writes should be a versioned dataset operation.
- **Request/response DTO:** `{ id|key, name, label, dataType, nullable, ordinal, semanticType?, schemaVersion }`.
- **Errors:** duplicate/invalid name, incompatible type, schema conflict, stale version.
- **Ownership/auth:** inherited from dataset.
- **Optimistic locking:** dataset schema version required.
- **Migration:** retain deterministic normalized keys and report any server rename.
- **Limitation:** authoritative types/nullability/defaults require the Data Dictionary.

### CSV imports

- **Frontend entity:** bounded parser result and dataset candidate.
- **Current repository/local adapter:** `validateCsvFile`, `parseCsvTextAsync`, `createDatasetFromCsv`.
- **Proposed HTTP:** `POST /api/v1/projects/:projectId/dataset-imports`; `GET /api/v1/dataset-imports/:importId`; optional cancel endpoint.
- **Request/response DTO:** multipart file plus `{ name, delimiter?, encoding?, clientDatasetId?, idempotencyKey }`; response `{ importId, status, limits, errors, datasetId? }`.
- **Errors:** encoding/parser/column mismatch, duplicate headers, file/row/column limits, cancelled, storage/quota, forbidden.
- **Ownership/auth:** project write permission.
- **Optimistic locking:** idempotency key rather than entity ETag during creation.
- **Migration:** local synthetic/imported datasets need explicit upload or acceptance as client-origin snapshots.
- **Limitation:** durable source-file retention and malware/content scanning are backend concerns.

### Charts

- **Frontend entity:** project-owned chart specification plus stable `dataContract`.
- **Current repository/local adapter:** `upsertChart`, `deleteChart`, saved-chart compatibility adapter.
- **Proposed HTTP:** `GET/POST /api/v1/projects/:projectId/charts`; `GET/PATCH/DELETE /api/v1/charts/:chartId`.
- **Request/response DTO:** `{ clientId?, name, specVersion, config, mapping, dataContract, baseRevision }`; response validates references and returns revision.
- **Errors:** invalid mapping/type/config, missing field/dataset, unavailable snapshot, forbidden, stale revision.
- **Ownership/auth:** same project as referenced dataset/dashboard.
- **Optimistic locking:** required.
- **Migration:** preserve chart ID/spec/data contract exactly; built-in demo contracts need an explicit import policy.
- **Limitation:** server-supported chart specification/version matrix needs agreement.

### Chart previews and chart data contracts

- **Frontend entity:** preview state and `dataContract` with `dataset`, exact `snapshot`, `sql-result` or explicit built-in demo source.
- **Current repository/local adapter:** `createChartDataContract`, `normalizeChartDataContract`, `resolveChartData`; mock SQL/client engines.
- **Proposed HTTP:** `POST /api/v1/projects/:projectId/chart-previews` and/or `POST /api/v1/charts/:chartId/query`.
- **Request/response DTO:** request `{ chartSpec, datasetId?, datasetSchemaVersion?, filters?, sort?, limit? }`; response `{ fields, rows|resultRef, rowCount, truncated, queryRevision, warnings }`.
- **Errors:** invalid query/mapping, missing field, dataset version conflict, timeout, result too large, rate limit, connector unavailable.
- **Ownership/auth:** authorize every dataset/connection reference.
- **Optimistic locking:** pin dataset/schema/query revision; never silently replay a different dataset.
- **Migration:** exact local snapshots need size/retention policy; reserved-looking row keys must remain untouched.
- **Limitation:** real query execution, quotas and result retention are absent.

### Dashboards

- **Frontend entity:** project-owned dashboard with name, canvas settings, layout and widgets.
- **Current repository/local adapter:** `upsertDashboard`, facade create/rename/delete, `dashboardPersistence` autosave lifecycle.
- **Proposed HTTP:** `GET/POST /api/v1/projects/:projectId/dashboards`; `GET/PATCH/DELETE /api/v1/dashboards/:dashboardId`.
- **Request/response DTO:** create `{ clientId?, name, canvasSettings? }`; patch `{ name, canvasSettings, widgets, baseRevision, requestId }`; response normalized dashboard and revision.
- **Errors:** invalid layout/reference, dependency conflict, forbidden, missing, payload too large, stale revision.
- **Ownership/auth:** project read/write roles.
- **Optimistic locking:** mandatory; no implicit layout merge after conflict.
- **Migration:** preserve dashboard/widget IDs and geometry; session object URLs are excluded.
- **Limitation:** durable asset and collaborative editing policies are absent.

### Widgets

- **Frontend entity:** dashboard-owned widget with stable ID, type, geometry, settings and optional chart reference.
- **Current repository/local adapter:** dashboard aggregate writes plus facade add/update/delete.
- **Proposed HTTP:** widgets may remain a dashboard aggregate; if granular, `/api/v1/dashboards/:dashboardId/widgets` and `/:widgetId`.
- **Request/response DTO:** `{ clientId?, type, geometry, chartId?, settings, baseDashboardRevision }`.
- **Errors:** invalid geometry/type/reference, wrong project, stale dashboard, missing asset.
- **Ownership/auth:** inherited from dashboard/project.
- **Optimistic locking:** dashboard revision required even for granular writes.
- **Migration:** preserve stable IDs and layout order; unresolved references return explicit repair results.
- **Limitation:** image assets require a server asset reference, never a browser object URL.

### Shares and public snapshots

- **Frontend entity:** local share record with token-like ID, project/dashboard ownership, expiry, readonly sanitized snapshot and mode options.
- **Current repository/local adapter:** `upsertShare`, `resolveShare`, `localShareContract`; same-browser only.
- **Proposed HTTP:** `POST /api/v1/dashboards/:dashboardId/shares`; `GET/PATCH/DELETE /api/v1/shares/:shareId`; public resolution at a separate capability endpoint.
- **Request/response DTO:** create `{ expiresAt?, snapshotPolicy, embedOptions?, allowedOrigins? }`; authenticated response returns share metadata and a one-time raw URL/token; public response returns readonly snapshot/capabilities only.
- **Errors:** malformed/expired/revoked, missing snapshot/data, forbidden, ambiguous, stale dashboard, rate limited.
- **Ownership/auth:** create/revoke requires dashboard permission; public access is capability-scoped and never editor authorization.
- **Optimistic locking:** share metadata revision; snapshot pins a dashboard revision.
- **Migration:** do not upload local shares automatically; user must explicitly publish and accept server policy.
- **Limitation:** token hashing, revocation, abuse controls, embed domain restrictions and immutable/revisioned snapshot policy are unresolved.

### Connection metadata

- **Frontend entity:** whitelist-only project/workspace connection profile metadata; no durable secret value.
- **Current repository/local adapter:** `databaseConnectionStorage` sanitize/create/load/upsert/delete; simulated test.
- **Proposed HTTP:** `GET/POST /api/v1/projects/:projectId/connections`; `GET/PATCH/DELETE /api/v1/connections/:connectionId`; `POST .../:id/tests`.
- **Request/response DTO:** safe metadata `{ name, type, host?, port?, database?, options?, secretRef? }`; output always redacted and never returns write-only credentials.
- **Errors:** invalid metadata, secret missing, DNS/TLS/auth/timeout, forbidden, rate limited, stale revision.
- **Ownership/auth:** project admin or dedicated connector role.
- **Optimistic locking:** metadata mutation required.
- **Migration:** migrate safe metadata only; require separate secret enrollment.
- **Limitation:** no real connector execution exists.

### Secret references

- **Frontend entity:** no secret; future opaque `secretRef` only.
- **Current repository/local adapter:** sanitizer rejects password, keys, tokens, credential URLs/SQL; canonical schema scans for secret material.
- **Proposed HTTP:** dedicated write-only vault enrollment/rotation/revoke endpoints, separate from connection metadata.
- **Request/response DTO:** request may contain a credential only over TLS and must never be logged; response `{ secretRef, status, rotatedAt }` only.
- **Errors:** policy violation, invalid credential, vault unavailable, forbidden, rotation conflict.
- **Ownership/auth:** least-privilege connector administrator; access is auditable.
- **Optimistic locking:** rotation version required.
- **Migration:** no local secret is eligible for migration.
- **Limitation:** vault technology, rotation and incident policy are security decisions.

### Settings

- **Frontend entity:** consumed theme/density and disabled future date, number, canvas, header/footer and auto-refresh controls.
- **Current repository/local adapter:** device/theme storage and safe UI state; unsupported settings do not persist misleading no-ops.
- **Proposed HTTP:** user preferences endpoint plus workspace/project/dashboard settings endpoints only after ownership is decided.
- **Request/response DTO:** typed partial settings with scope, schemaVersion and revision.
- **Errors:** invalid scope/value, unsupported setting, forbidden, stale revision.
- **Ownership/auth:** depends on scope; dashboard/workspace writes need roles.
- **Optimistic locking:** required for non-device scopes.
- **Migration:** theme remains device-local by default; all other mappings require an explicit ownership table.
- **Limitation:** inheritance and refresh semantics are unresolved.

### Audit events

- **Frontend entity:** none durable; UI actions are not a trustworthy server audit log.
- **Current repository/local adapter:** no authoritative audit adapter.
- **Proposed HTTP:** server-generated audit events; read endpoint such as `GET /api/v1/projects/:projectId/audit-events` only if product-approved.
- **Request/response DTO:** server records `{ id, actorId, workspaceId, projectId, entityType, entityId, action, requestId, result, occurredAt, metadata }`.
- **Errors:** read forbidden, retention window exceeded, pagination invalid.
- **Ownership/auth:** restricted auditor/admin role.
- **Optimistic locking:** append-only; not client mutable.
- **Migration:** local UI history is not imported as authoritative audit evidence.
- **Limitation:** event catalog, retention, privacy and export policy need decisions; secrets/raw datasets must never be logged.

## Backend decision register

| Decision | Classification | Frozen frontend evidence / required decision |
| --- | --- | --- |
| User vs Workspace vs Project ownership | Proposed but needs confirmation | Frontend freezes Project ownership for datasets/charts/dashboards/shares; User/Workspace ownership is not authoritative. |
| Tenant model | Blocked by product/business decision | Choose tenant = workspace/organization or another model. |
| Project membership and roles | Blocked by product/business decision | No local membership model; define role/action matrix. |
| Primary-key strategy | Backend implementation detail | Frontend requires stable opaque IDs and explicit collision remap during import. |
| Soft-delete/archive strategy | Blocked by product/business decision | Frontend currently performs local deletion/repair; server retention is unknown. |
| Optimistic locking/version | Decided by current Frontend contract | Entity revision or ETag, conflict on stale write; never silent merge. |
| Dataset source-file storage | Blocked by missing Data Dictionary | Define object storage, checksum, retention and access. |
| Dataset row-storage strategy | Blocked by missing Data Dictionary | Define database/object/columnar/query-engine policy and limits. |
| Dataset schema versioning | Proposed but needs confirmation | Frontend requires a pinned schema version for chart replay. |
| Chart specification versioning | Proposed but needs confirmation | Preserve `dataContract`; define supported `specVersion` migrations. |
| Chart result snapshot policy | Blocked by product/business decision | Define exactness, maximum size, retention and encryption. |
| Dashboard/widget layout schema | Decided by current Frontend contract | Stable dashboard/widget IDs and geometry; server validates same-project references. |
| Share token hashing | Backend implementation detail | Store a hash, return raw capability only when issued; exact algorithm/security review pending. |
| Share expiry/revocation | Blocked by product/business decision | Define defaults, maximum lifetime and revoke semantics. |
| Embed domain restrictions | Blocked by security decision | Define allowlist, CSP and frame policy. |
| Connection secret references | Decided by current Frontend contract | Browser stores only safe metadata/opaque reference; vault implementation is backend detail. |
| Audit logs | Blocked by product/security decision | Define event catalog, access and retention. |
| Data retention | Blocked by product/legal decision | Define dataset, snapshot, share, audit and deleted-record retention. |
| Local-to-server migration | Proposed but needs confirmation | Dry-run, validate, idempotency key, explicit remap report, never migrate demo auth/secrets/local shares automatically. |
| API error contract | Decided by current Frontend contract | `ApiProblem`, request ID, field errors, retryable flag and explicit conflict/current revision. |
| Pagination/filter/sort | Backend implementation detail | Must be deterministic and specified before list endpoints ship. |
| Rate limiting/abuse prevention | Blocked by security decision | Required for auth, imports, previews, public shares and connector tests. |

## Migration acceptance requirements

1. Accept a versioned, validated local export only after a dry-run report.
2. Require an idempotency key and retain a server-side import result.
3. Preserve stable IDs when safe; collisions produce a deterministic, reviewable remap manifest.
4. Revalidate ownership and all references on the server.
5. Preserve intentional empty datasets and exact legitimate row keys.
6. Never import demo authentication, browser object URLs, local share capabilities or credential material.
7. Do not mark migration complete until validated server readback matches the accepted import.
8. Keep the local document available until the user explicitly confirms cutover/cleanup.

## Handoff conclusion

The frontend domain, validation rules, ownership edges, error semantics and repository boundary are stable enough to design a Data Dictionary and HTTP adapter. Backend implementation is not ready to start until tenant/membership, dataset storage, retention, public-sharing security, audit and secret-vault decisions are approved against an authoritative Data Dictionary.
