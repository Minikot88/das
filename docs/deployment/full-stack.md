# Full-stack deployment

`docker-compose.yml` preserves the existing `frontend` service and port while adding `backend` and `database`. nginx proxies the unchanged same-origin `/api` path to the API.

## Local/test server

1. Copy `.env.example` to `.env`.
2. Replace database passwords and both base64 keys for any shared server.
3. Run `docker compose config` and inspect the resolved configuration.
4. Run `docker compose up --build -d`.
5. Verify `/healthz`, `/api/v1/health`, and `/api/v1/ready`.
6. Exercise login, project create, dataset empty state/import, chart save, dashboard widget save, refresh, share, and logout.

The checked-in credentials and keys are local-development defaults only. Production must set `NODE_ENV=production`, `AUTH_PROVIDER=external`, a TLS-facing origin, unique secrets, and a reviewed external authentication adapter. Do not publish the development-auth compose defaults.

## Cutover

The default source development mode remains local/mock unless `VITE_USE_MOCK=false` is supplied. The compose deployment now defaults to HTTP mode. This preserves offline/local fallback while making the integrated stack exercise real persistence.

Roll out in stages: internal test server, controlled real-account cohort, then default HTTP mode. Keep the two localStorage keys unchanged during the transition; they are not silently migrated or deleted.
