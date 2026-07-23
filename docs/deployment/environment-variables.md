# Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | yes | `development`, `test`, or `production` |
| `AUTH_PROVIDER` | yes | `development` or an external adapter; development is rejected in production |
| `DATABASE_URL` | production | MariaDB connection URL used by Prisma |
| `SECRET_MASTER_KEY` | production | Base64-encoded 32-byte AES key for connection secrets |
| `SESSION_SIGNING_KEY` | production | Base64 key of at least 32 bytes for session signatures |
| `DEVELOPMENT_AUTH_EMAIL` | development/test | Local credential email |
| `DEVELOPMENT_AUTH_PASSWORD` | development/test | Local credential password |
| `CORS_ORIGINS` | yes | Comma-separated exact browser origins |
| `PORT` | no | API port, default 3000 |
| `FILE_STORAGE_PATH` | no | Private upload storage root, default `/data/uploads` |
| `MAX_UPLOAD_SIZE` | no | Multipart file limit in bytes, default 5,000,000 and capped below the 6 MiB HTTP limit |
| `QUERY_TIMEOUT` | no | Future connector query timeout in milliseconds, validated now; default 30,000 |
| `QUERY_ROW_LIMIT` | no | Maximum query result rows, default and hard cap 50,000 |
| `LOG_LEVEL` | no | `error`, `warn`, `info`, or `debug`; default `info` |
| `CONNECTOR_NETWORK_ALLOWLIST` | no | Comma-separated explicit connector networks/hosts; empty denies future outbound connector use |
| `DEBUG` | no | Must remain `false` in production |
| `DEMO_CONNECTOR_ENABLED` | no | Must remain `false` in production |
| `INCLUDE_DEMO_SEED` | no | Must remain `false` in production |
| `VITE_USE_MOCK` | build | `false` for server persistence; local source default remains mock |
| `VITE_API_BASE_URL` | build | API base; blank uses same origin |
| `VITE_API_TIMEOUT_MS` | build | Browser request timeout |

The values in example files are non-secret local fixtures. Production secrets must come from the deployment secret provider and must never be committed.
