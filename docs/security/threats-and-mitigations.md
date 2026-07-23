# Threats and mitigations

| Threat | Mitigation/status |
| --- | --- |
| Cross-project IDOR/reference swapping | enforced through owned/member project IDs and same-project dataset/chart/dashboard checks |
| Stored secret in localStorage/share snapshot | app-owned secret keys and credential URLs are redacted; URL fragments are removed |
| Spreadsheet command execution from exported data | formula-leading string values are prefixed with an apostrophe at CSV export |
| Malicious local CSV | filename, MIME, size, null byte, dimensions and field size are validated before/while parsing |
| Persistent chart CSS/resource injection | only constrained hex/rgb/hsl/transparent tokens reach ECharts color sinks |
| Oversized/slow proxy requests | nginx and Fastify size limits plus bounded proxy timeouts |
| Rate-limit denial through shared proxy IP | proxy address chain is forwarded and only private proxy peers are trusted |
| Same-origin endpoint traversal through crafted entity ID | every dynamic client API path segment is percent-encoded; regression coverage includes slash, backslash, query, fragment and pre-encoded input |
| Error/secret disclosure | generic unexpected error response, request ID and explicit serialization boundaries |
| Public/database-container exposure | database has no host port; its internal network is joined only by backend/migration; application uses a dedicated non-root database user |
| Backup disclosure | restrictive ACL and encrypted/access-controlled destination requirement; external at-rest encryption remains operational |
| SSRF/network pivot | no real outbound connector exists; explicit connector allowlist defaults empty; runtime DNS/IP enforcement is release-blocking before connector enablement |
| Session replay | deferred by explicit scope; deployment remains internal/test only |
| Static unauthenticated `/auth/me` identity | no first-party consumer found and protected APIs remain guarded; endpoint must be guarded/replaced with real principal derivation before public use |
| Secret-shaped values in legacy fallback storage | canonical snapshots redact recursively; compatibility storage hardening is deferred until its real credential-bearing input path is confirmed |
