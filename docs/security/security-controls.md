# Security controls

| Boundary | Current control |
| --- | --- |
| Startup | typed environment parser; production-required database/key/origin settings; development-key and debug/demo rejection |
| HTTP | 6 MiB body cap, 5,000,000-byte multipart cap, one file, 20 fields, request IDs, Helmet, generic exception filter |
| HTTP path construction | dynamic entity IDs are encoded as individual path segments before same-origin requests |
| CORS | exact HTTP(S) origin allowlist; no wildcard with credentials |
| Rate limiting | 300 requests/minute with trusted-proxy client IP propagation |
| CSV intake | server-side streaming parse, private temporary storage, `.csv` extension/MIME allowlist, path/null-byte rejection, 5 MB, 50,000 rows, 200 columns and cleanup |
| CSV export | quoting plus spreadsheet-formula neutralization for string values |
| SQL | PostgreSQL connector permits one read-only `SELECT`/`WITH`, validates destination/port, rejects write/control/file operations, and enforces timeout/row limit |
| Object access | organization plus owned/member project scope; chart/dataset/dashboard/widget references must remain in one accessible project |
| Secrets | frontend persistence denylist/redaction; URL userinfo/query/fragment stripping; AES-256-GCM primitive for future server secret storage |
| Responses | controlled DTO/controller output, generic unexpected errors, no stack traces, stable code and request ID |
| Frontend rendering | React text escaping, canvas renderers and constrained ECharts colors; no demonstrated raw HTML execution path |
| nginx | non-root port 8080, security headers, body/proxy limits, server tokens off, dotfile/backup/dump/source-map denial |
| Containers | digest-pinned multi-stage images and non-root `nginx`/`node` runtime users; frontend cannot join the internal database network; database has no published host port |
| Backups | operator-confirmed restore, literal paths, atomic non-empty dump, native exit checks and restrictive Windows ACL |
| Dependencies | lockfiles retained; unused runtime dependencies removed; npm audit reports zero known vulnerabilities |
