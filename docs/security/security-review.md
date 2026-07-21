# Security review

## Scope and method

This pass reviewed frontend persistence/rendering/export boundaries, backend HTTP/configuration/error/object-access boundaries, database and backup tooling, Docker/nginx, dependency manifests and the currently implemented connector surface. Static searches were correlated with entrypoints, framework registration, tests and production builds. Findings were fixed only where a reachable source-to-sink path was established.

## Findings fixed

| Finding | Resolution |
| --- | --- |
| Opaque URL fragments retained connector/share secrets | URL fragments are removed before local persistence or readonly snapshot creation |
| CSV spreadsheet formula injection | string cells beginning with `=`, `+`, `-`, or `@` are neutralized at export only |
| CSV filename/MIME/null-byte/field-length gaps | local CSV intake validates filename, extension, MIME, size, null bytes, rows, columns and field length |
| Same-organization cross-project access | Project CRUD and workspace chart/dataset/dashboard/widget paths enforce owned/member project IDs and same-project references |
| ECharts persisted CSS/resource injection | chart color inputs are constrained to safe color token formats with trusted fallback colors |
| Global rate-limit bucket behind nginx | nginx forwards client address headers and Fastify trusts only loopback/link-local/private proxy peers |
| Weak production configuration defaults | production rejects development keys, debug, demo connector/seed, wildcard/invalid CORS and invalid operational limits |
| Alternate Base64 development-key bypass | production compares decoded key bytes, so whitespace/non-canonical encodings cannot bypass the known-key block |
| Plain database backup handling | backup is atomic, checks command/empty output, applies restrictive Windows ACLs and restore checks native exit status |
| Container/proxy exposure | app containers run non-root; nginx limits bodies/timeouts and denies dotfiles, dumps, backups and source maps |
| Flat Compose network | frontend/API and API/database use separate networks; the database network is internal |
| Dynamic API path-segment traversal | frontend API adapters percent-encode every entity ID before interpolating it into a request path |

## Existing controls confirmed

- AES-256-GCM secret primitive uses a 32-byte key, random 96-bit IV and authenticated tag.
- Unexpected backend errors return stable generic responses with request IDs, without stack/SQL/path/environment data.
- CORS uses exact configured origins with credentials; wildcard origins are rejected.
- HTTP/multipart, CSV row/column and query-policy boundaries are bounded.
- Raw SQL is not executed in the current workspace endpoint; the lexical read-only guard still rejects multi-statement, DDL/DML and transaction controls.
- Share bearer tokens use 256 bits of cryptographic randomness and only their SHA-256 hashes are intended for persistence.
- npm full and production audits returned zero known vulnerabilities during this pass.

## Scope qualification

The real external identity provider, real database connector execution and server-side file import pipeline do not exist yet. Controls for those execution paths cannot be represented as operationally complete. See `authentication-deferred.md` and `remaining-risks.md`.

The review also identified two deferred compatibility risks: the unguarded development-shaped `/api/v1/auth/me` response and weaker recursive credential redaction in legacy/fallback browser persistence. Neither is promoted as a fixed control; both are recorded as release/cleanup work in `remaining-risks.md`.
