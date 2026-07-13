# Future HTTP Adapter Contract

Status: design contract only. This repository does not implement a backend, database, server authentication, remote query execution, or remote sharing.

## Repository Boundary

The UI should continue to consume a repository with the same conceptual operations as the local workspace repository:

- read a versioned workspace snapshot;
- subscribe or refresh after a successful mutation;
- update project, dataset, chart, dashboard, widget, share, settings, and safe connection metadata;
- report validation, conflict, authorization, quota, and availability failures without destructive fallback;
- preserve stable entity IDs and project/dashboard ownership.

An HTTP adapter should be asynchronous and must not expose transport details to route components. Optimistic changes require an explicit rollback snapshot and request identity.

## Suggested DTO Envelope

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
};
```

Workspace DTOs should follow the validated `mini-bi-workspace-v1` ownership graph. The server may normalize timestamps and revisions, but must not silently remap IDs or substitute demo data.

## Concurrency

- Send the last known revision or ETag with every mutation.
- Return a conflict response when the base revision is stale.
- Provide the current server revision separately from the rejected client payload.
- Never merge dashboards, layouts, or chart mappings implicitly on the client after a conflict.

## Authentication and Authorization

- Replace mock authentication with secure server sessions or short-lived tokens.
- Authorize every project-owned entity on the server before returning it.
- A share token must resolve to a server-owned immutable or revisioned snapshot with expiry and revocation.
- Read-only/embed endpoints must never reuse editor authorization or return edit capabilities.

## Secrets

- Browser payloads contain safe connection metadata and `secretRef: null` or a future opaque reference only.
- Passwords, access tokens, private keys, SSH passwords, client keys, certificates, and credential-bearing URLs must not be logged, echoed, cached, exported, or returned in DTOs.
- Secret creation/rotation requires a dedicated vault-backed endpoint and write-only request fields.

## Error Mapping

| HTTP class | UI state |
| --- | --- |
| 400/422 | Validated field error; retain the draft. |
| 401 | End the authenticated session and preserve only safe local UI state. |
| 403 | Permission-denied state; do not imply missing data. |
| 404 | Missing/unavailable entity state. |
| 409/412 | Revision conflict with reload/compare choice. |
| 413 | Dataset or snapshot limit error. |
| 429 | Retryable throttling state with server delay. |
| 5xx/network | Recoverable error with retry; retain last valid snapshot. |

## Audit Events

Server implementations should record actor, project, entity type/ID, action, request ID, result, and timestamp. Audit records must contain field names or hashes where needed, never raw dataset exports or secrets.

## Data Dictionary Gap

No Data Dictionary was provided or found. Database schemas, tables, indexes, retention policies, tenancy keys, and migration SQL are intentionally unspecified until an authoritative backend model exists.
