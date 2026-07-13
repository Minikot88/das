# DashboardMiniBi

DashboardMiniBi is a frontend-only React/Vite analytics workspace for importing local CSV data, designing charts, arranging dashboards, and opening read-only Local share/embed views.

## Runtime Boundary

The default mode is an explicit local simulation:

- mock authentication;
- canonical `mini-bi-workspace-v1` browser persistence;
- non-destructive migration from legacy workspace keys;
- same-browser read-only share snapshots;
- metadata-only connection profiles with simulated connection tests.

It is production-hardened for local/demo evaluation, not secure multi-user hosting. Local share links are not server authorization. Passwords, tokens, certificates, and private keys are transient and are never persisted or exported.

## Quick Start

Requirements: Node.js `^20.19.0` or `>=22.12.0`, and npm.

```bash
npm ci
npm run dev
```

Mock login: `demo@dataviz.bi` / `demo1234`. Any non-empty credentials may also work in mock mode.

## Quality Gate

```bash
npm run check
```

The aggregate gate runs ESLint, strict TypeScript, Vitest/Testing Library/axe-core tests, the Vite production build, the full dependency audit, and the production-only audit. Individual commands include `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`, `npm audit`, and `npm audit --omit=dev`.

## Docker

```bash
docker compose up --build
```

The frontend listens on `http://127.0.0.1:8080` by default. `FRONTEND_PORT` changes the port; `FRONTEND_HOST` changes the bind address. Keep the loopback default for local/demo data. nginx provides SPA fallback, immutable hashed-asset caching, HTML revalidation, security headers, and a deliberate same-origin frame policy.

The image is HTTP-only and contains no backend. Terminate HTTPS at a trusted outer proxy and set HSTS there only after the whole origin is HTTPS. The bundled nginx rejects `/api/` with `503`; a non-mock deployment requires a separately reviewed same-origin API proxy and server security controls.

## Environment

- `VITE_USE_MOCK`: local/mock API mode; defaults to `true`.
- `VITE_API_BASE_URL`: future API origin when mock mode is disabled.
- `VITE_API_PROXY_TARGET`: Vite development proxy target.
- `VITE_API_TIMEOUT_MS`: frontend request timeout.
- `FRONTEND_HOST`: Docker bind address; defaults to `127.0.0.1`.
- `FRONTEND_PORT`: Docker host port.

Vite reads `VITE_*` variables at build time.

## Documentation

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
