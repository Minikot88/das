# Data Dictionary to Frontend Gap Analysis

Assessment date: 2026-07-13  
Result: **authoritative Data Dictionary not found or verifiable**.

This document records the search evidence and the exact questions that must be resolved. It does not invent database tables, columns, types, constraints, migrations or business rules.

## Search evidence

The following locations and patterns were inspected:

- Repository root: `C:\git\DashboardMiniBi\dashboard-mini-bi`.
- Parent project tree: `C:\git\DashboardMiniBi`.
- Repository documentation including README, architecture, state-management, testing, route, installation, administration, acceptance, remediation, phase-2 and future HTTP contract documents.
- `prisma\` and `nest-backend\` remnants; neither contains an authored schema/model that can serve as an authority.
- Spreadsheet/data-document candidates: `*.xlsx`, `*.xls`, `*.ods`, `*.csv`, `*.tsv` under the parent project tree; none is an authoritative Data Dictionary.
- Filename/content searches for `data dictionary`, `data_dictionary`, `dictionary`, `ERD`, `entity`, `column`, `nullability`, `schema`, and Thai equivalents.

Only documents stating that a Data Dictionary is missing were found. No owner, version, approval status, canonical entity list, field definitions, database schema or signed-off mapping source was available. A sibling code copy and ignored backend remnants do not qualify as authoritative evidence.

## Provisional gap matrix

Because no authority exists, every proposed database field remains **TBD**. Frontend types below describe the currently validated client contract only.

| Data Dictionary entity | Frontend canonical entity | Frontend field/contract | Expected API field | Proposed database field | Type/nullability/default | Ownership | Validation/sensitivity/audit | Mapping status | Conflict or missing decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Workspace/Tenant | `Workspace` | `schemaVersion`, `revision`, `active`, project graph | `workspace.id`, `revision` | TBD | DD required | Tenant/workspace TBD | Revisioned; audit mutations | Blocked | Tenant meaning and active-context persistence are unknown. |
| User | Demo identity only | display/email presentation | `user.id`, `email`, profile | TBD | DD required | User | PII; verification and audit policy required | Missing | No authoritative user lifecycle. |
| UserPreference | UI state | theme, density; future locale formats disabled | scoped preferences | TBD | DD required | User/device/workspace TBD | Enumerated values; privacy scope | Blocked | Which settings sync and inheritance rules. |
| Project | `Project` | stable `id`, `name`, timestamps/child ownership | `project.*`, `revision` | TBD | DD required | Workspace currently implied | Name validation; mutation audit | Partial frontend contract only | Membership, uniqueness, archive/delete policy. |
| ProjectMember | none | none | user/project/role/status | TBD | DD required | Tenant/project | Authorization-critical; full audit | Missing | Roles, invites, last-owner rule. |
| Dataset | `Dataset` | `id`, `projectId`, name, source metadata, fields, rows/preview, status | dataset metadata and revision | TBD | DD required | Project (frozen frontend) | Size/schema limits; rows may be sensitive | Partial frontend contract only | Row store, source-file store, retention, classification. |
| DatasetField | embedded field | stable key/name, label, inferred type, ordinal/role metadata | field/schema version | TBD | DD required | Dataset | Duplicate-normalized-name rules; schema audit | Partial frontend contract only | Authoritative data types, nullability, defaults, semantic types. |
| DatasetImport | parser result | file metadata, parser limits, candidate dataset | import job/status/errors | TBD | DD required | Project | File/row/column limits; content scanning | Missing server model | Upload retention, encoding policy, idempotency. |
| Chart | `Chart` | `id`, `projectId`, name, config, mapping, `dataContract` | chart spec/revision | TBD | DD required | Project (frozen frontend) | Reference validation; mutation audit | Partial frontend contract only | Spec version, supported engines, deletion/archive policy. |
| ChartDataContract | embedded chart contract | source type, dataset ID or exact rows/fields/query text | query/snapshot reference | TBD | DD required | Chart/project | Exact replay; query text may be sensitive | Partial frontend contract only | Snapshot size, retention, encryption and query audit. |
| ChartPreview/QueryResult | transient/exact snapshot | fields, rows, query text, availability | result/resultRef | TBD | DD required | Project/dataset | Rate/size limits; data classification | Missing server model | Whether results are stored, cached or recomputed. |
| Dashboard | `Dashboard` | `id`, `projectId`, name, canvas settings, widget aggregate | dashboard/revision | TBD | DD required | Project (frozen frontend) | Layout/reference validation; mutation audit | Partial frontend contract only | Archive/delete, collaborative edit and revision granularity. |
| Widget | embedded widget | stable ID, dashboard owner, type, geometry, settings, chart reference | widget or dashboard aggregate | TBD | DD required | Dashboard (frozen frontend) | Same-project references; asset validation | Partial frontend contract only | Aggregate vs table model; asset handling. |
| Asset | session object URL only | no durable asset entity | asset reference/upload | TBD | DD required | Project/dashboard TBD | Content type/size/scanning; sensitive files | Missing | Storage provider, lifecycle, signed access. |
| Share | `LocalShare` | stable local ID, project/dashboard IDs, expiry, readonly snapshot | share metadata/capability URL | TBD | DD required | Dashboard/project | Security-critical; issue/revoke audit | Local-only contract | Token hash, expiry defaults, revocation, rate limits. |
| PublicSnapshot | embedded sanitized snapshot | dashboard snapshot and availability | immutable/revisioned public DTO | TBD | DD required | Share/dashboard | Data disclosure classification; access audit | Local-only contract | Snapshot policy and permitted data. |
| EmbedPolicy | query option only | `header=0`, readonly mode | allowed origins/options | TBD | DD required | Share/project TBD | CSP/frame policy, abuse prevention | Missing | Domain allowlist and capability scope. |
| ConnectionMetadata | local safe profile | whitelist metadata, no secret values | connection metadata + opaque `secretRef` | TBD | DD required | Project/workspace TBD | Sensitive metadata; mutation/test audit | Partial frontend contract only | Scope, connector fields, retention. |
| SecretReference | none/opaque future ref | raw secret forbidden | write-only enrollment, opaque ref | TBD | DD required | Connection/project | Highest sensitivity; vault and rotation audit | Missing | Vault, encryption, rotation, access policy. |
| Setting | consumed/disabled controls | theme/density and future settings | scoped settings DTO | TBD | DD required | Device/user/workspace/project/dashboard TBD | Enum/scope validation; audit non-device changes | Blocked | Ownership and inheritance. |
| AuditEvent | none authoritative | no server audit entity | append-only audit event | TBD | DD required | Tenant/workspace/project | Sensitive metadata; immutable/retained | Missing | Event catalog, access and retention. |

## Exact information required before database design

### Identity, tenancy and authorization

- Authoritative tenant concept and whether a Workspace is the tenant.
- User lifecycle, identity provider/session strategy and PII classification.
- Project membership roles and an action-by-role authorization matrix.
- Ownership rules for projects, datasets, charts, dashboards, shares, connections and settings.
- Cross-tenant isolation requirements and administrative support access.

### Keys, lifecycle and concurrency

- Primary-key format and whether client-generated IDs may be retained.
- Uniqueness constraints and case/locale rules for names.
- Soft-delete, archive, restore, cascade/restrict and orphan-repair rules.
- Revision/ETag granularity and conflict policy.
- Created/updated/deleted actor/timestamp requirements.

### Dataset and file model

- Source-file storage provider, checksum, content scanning, encryption and retention.
- Row-storage/query strategy and supported data volume/latency limits.
- Field type system, nullability, defaults, precision/scale, timezone and locale handling.
- Dataset and schema versioning, re-import/replacement semantics and lineage.
- Preview sampling, row-level access and sensitive-data classification/redaction.

### Chart, Dashboard and asset model

- Chart specification version and supported renderer/query features.
- Result snapshot storage, maximum size, retention, exactness and recomputation policy.
- Dashboard/widget aggregate versus separate persistence model.
- Durable image/file asset ownership, lifecycle and access URLs.
- Collaborative edit expectations and conflict granularity.

### Sharing and connectors

- Share token entropy/hash/storage, default/max expiry, revocation and disclosure policy.
- Public snapshot immutability/versioning and permitted dataset content.
- Embed domain restrictions, CSP/frame policy, throttling and abuse handling.
- Connection ownership and safe connector-specific metadata definitions.
- Secret vault, opaque reference format, rotation, test-execution isolation and audit requirements.

### Operations and compliance

- Audit event catalog, metadata allowlist, retention and reviewer access.
- Retention/deletion policy for datasets, files, snapshots, shares, secrets and logs.
- Pagination/filter/sort conventions and API limits.
- Rate limits and idempotency requirements.
- Backup, restore, regional residency and legal/privacy obligations.
- Local-to-server import approval, remap and rollback rules.

## Affected readiness

| Area | Readiness | Effect of missing authority |
| --- | ---: | --- |
| Canonical frontend domain | 96% | The validated client graph is stable, but it is not a database authority. |
| Data Dictionary validation | 10% | Search and gap inventory are complete; field-by-field validation cannot begin without the source document. |
| Database ERD/design | 25% | Candidate entities are known; keys, constraints, tenancy, storage and retention are unresolved. |
| REST API design | 72% | Repository operations, DTO envelopes and error semantics are proposed; resource fields/security depend on the dictionary. |
| Backend implementation plan | 45% | Workstreams can be sequenced, but estimates and schema tasks are premature. |
| Backend implementation | 20% | Starting persistence/auth/share/connector code now would invent business and security rules. |

## Required handoff artifact

Provide a versioned, owner-approved Data Dictionary with, at minimum:

```text
document owner, version, approval date,
tenant and entity definitions,
field name and business definition,
data type/length/precision,
nullability and default,
primary/foreign/unique/index rules,
ownership and authorization scope,
sensitivity classification,
validation/enumerations,
retention/deletion behavior,
audit requirement,
API name or mapping note
```

Once supplied, the next phase should validate it against the canonical frontend schema and the proposed HTTP contracts before creating an ERD or implementation plan.

## Decision

The missing Data Dictionary is not a frontend failure. The frontend is frozen with a documented handoff blocker: database and backend implementation must not begin until the authoritative dictionary and the ownership/storage/security decisions above are approved.
