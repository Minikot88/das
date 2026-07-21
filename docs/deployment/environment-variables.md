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
| `VITE_USE_MOCK` | build | `false` for server persistence; local source default remains mock |
| `VITE_API_BASE_URL` | build | API base; blank uses same origin |
| `VITE_API_TIMEOUT_MS` | build | Browser request timeout |

The values in example files are non-secret local fixtures. Production secrets must come from the deployment secret provider and must never be committed.
