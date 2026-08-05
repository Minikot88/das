# Full-stack deployment

`docker-compose.yml` preserves the existing `frontend` service and port while adding `backend` and `database`. nginx proxies the unchanged same-origin `/api` path to the API.

## Local/test server

1. Copy `.env.example` to `.env`.
2. Replace database passwords and both base64 keys for any shared server.
3. Run `docker compose config` and inspect the resolved configuration.
4. Run `docker compose up --build -d`.
5. Verify `/healthz`, `/api/v1/health`, and `/api/v1/ready`.
6. Exercise session bootstrap, project create, dataset preview, chart save, dashboard widget save, refresh, and share.

Production must set `AUTH_MODE=external` with real issuer, JWKS, audience,
organization and roles/scopes claims. The release validator rejects disabled mode,
placeholder URLs and non-RS algorithms.

## Cutover

The integrated stack requires `VITE_USE_MOCK=false`. External identity is mapped
by provider, issuer, subject and organization; project authorization continues to
come from PostgreSQL memberships.
