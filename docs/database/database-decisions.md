# Database Decisions

## Accepted defaults

1. `organization_id` is the tenant boundary. Branch scope is nullable and deferred unless a concrete P1 workflow needs it.
2. MariaDB 11.4 LTS, InnoDB, `utf8mb4`, and `utf8mb4_unicode_ci` are the test/production database baseline.
3. Existing frontend string IDs remain public entity IDs so local workspace import can preserve references. Sequential database IDs are never used as public share capabilities.
4. Authentication is behind `AuthProvider`. Development authentication is allowed only outside production; production refuses to start with it enabled.
5. Test deployment uses AES-256-GCM encrypted secret storage with an environment master key. API responses and logs never include plaintext credentials.
6. Imported rows use one JSON record per row with `(dataset_id, row_number)` indexing for the current 5 MB / 50,000 row / 200 column limits.
7. Unbounded data remains in a live source/warehouse and is accessed through a read-only, bounded connector query.
8. Custom SQL is one read-only statement, parameterized, allowlisted, timed, row-limited, tenant-authorized, and audited.
9. Share links use a random raw token returned once, SHA-256 database hash, immutable snapshot, expiry, revoke, and access logging.
10. Projects, charts, dashboards/layouts, saved views, and connections use optimistic revisions and return HTTP 409 on conflict.
11. Fifteen polymorphic workbook relationships are logical service validations, not foreign keys.
12. Renderer/widget-specific detail tables are merged into aggregate JSON fields plus explicit ownership and reference columns.
13. Local workspace import performs validation, dry-run, backup, ordered import, reference preservation/ID mapping, and result reporting. It never deletes local data automatically.
14. Demo sales tables are development-only and require an explicit seed flag.

## Technology evidence

MariaDB 11.4 is a long-term series maintained until May 2029. Prisma supports self-hosted MariaDB through its MySQL connector with migration support. Exact dependency versions are locked by the backend package lock when installed.
