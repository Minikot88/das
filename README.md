# DashboardMiniBi

DashboardMiniBi is a React/Vite and NestJS/PostgreSQL analytics workspace for live datasets, chart design, dashboards, and read-only share/embed views.

## Runtime Boundary

Authentication is server-authoritative. Local/test may use `AUTH_MODE=disabled` with
an existing configured technical principal. Production requires `AUTH_MODE=external`
and the backend-managed PSU SSO OIDC authorization-code flow. The browser receives
only an opaque application-session cookie and never persists or decodes provider tokens.

## Quick Start

Requirements: Node.js `^20.19.0` or `>=22.12.0`, and npm.

```bash
npm ci
npm run dev
```

There is no built-in login or registration screen.

## Quality Gate

```bash
npm run check
```

The aggregate gate runs ESLint, strict TypeScript, Vitest/Testing Library/axe-core tests, the Vite production build, the full dependency audit, and the production-only audit. Individual commands include `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`, `npm audit`, and `npm audit --omit=dev`.

## Docker

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

The local override enables `AUTH_MODE=disabled`; set `INTERNAL_SINGLE_USER_ID`
to an existing authorized technical principal before starting the stack.

The frontend listens on `http://127.0.0.1:8080` by default. `FRONTEND_PORT` changes the port; `FRONTEND_HOST` changes the bind address. Keep the loopback default for local/demo data. nginx provides SPA fallback, immutable hashed-asset caching, HTML revalidation, security headers, and a deliberate same-origin frame policy.

The image is HTTP-only and contains no backend. Terminate HTTPS at a trusted outer proxy and set HSTS there only after the whole origin is HTTPS. The bundled nginx rejects `/api/` with `503`; a non-mock deployment requires a separately reviewed same-origin API proxy and server security controls.

## Environment

- `VITE_USE_MOCK`: must be `false` for the integrated API-backed stack.
- `VITE_API_BASE_URL`: API origin; blank uses same origin.
- `VITE_API_PROXY_TARGET`: Vite development proxy target.
- `VITE_API_TIMEOUT_MS`: frontend request timeout.
- `VITE_EXTERNAL_SESSION_REQUIRED_URL`: same-origin PSU SSO login endpoint; production requires `/api/auth/login`.
- `FRONTEND_HOST`: Docker bind address; defaults to `127.0.0.1`.
- `FRONTEND_PORT`: Docker host port.

Vite reads `VITE_*` variables at build time.

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [Folder structure](docs/architecture/folder-structure.md)
- [Dependency rules](docs/architecture/dependency-rules.md)
- [Development setup](docs/development/getting-started.md)
- [Testing](docs/development/testing.md)
- [Environment](docs/development/environment.md)
- [Test server deployment](docs/deployment/test-server.md)
- [Refactor migration map](docs/refactor/migration-map.md)
- [Architecture](ARCHITECTURE.md)
- [State management](STATE_MANAGEMENT.md)
- [Installation](INSTALLATION.md)
- [Testing notes](TESTING_NOTES.md)
- [User guide](USER_GUIDE.md)
- [Dataset guide](DATASET_GUIDE.md)
- [Dashboard guide](DASHBOARD_GUIDE.md)
- [Legacy route parity](docs/LEGACY_ROUTE_PARITY.md)
- [Future HTTP adapter contract](docs/FUTURE_HTTP_ADAPTER_CONTRACT.md)

No Data Dictionary is present in the repository. Backend schemas and database tables are intentionally not inferred.
