# DashboardMiniBi

DashboardMiniBi is a frontend-only React/Vite enterprise analytics workspace for building charts, arranging dashboards, importing local CSV datasets, applying dashboard filters, saving views, exporting dashboard snapshots, and opening read-only local share/embed views.

Version: v1.0 release candidate.

## What Is Included

- Executive workspace Home.
- Dashboard canvas with widgets, tabs, filters, saved views, sharing, export, and presentation mode.
- Professional chart Builder.
- Local CSV Datasets page.
- Settings for local preferences.
- Local read-only public/embed dashboard views.
- Vitest and React Testing Library baseline tests.
- Local storage reliability handling and route error recovery.

## Default Mode

The app runs in explicit mock/local mode by default.

Mock/local mode uses:
- demo data
- mock authentication
- browser localStorage persistence
- local-only share records

Mock login is not production authentication. Local share links are not server-backed access-control.

## Quick Start

```bash
npm ci
npm run dev
```

Open the URL printed by Vite.

Mock login:
- Email: `demo@dataviz.bi`
- Password: `demo1234`

Any non-empty mock credentials may also work in local mode.

## Quality Commands

```bash
npm run lint
npm test
npm run build
npm audit
```

## Documentation

User and admin docs:
- [USER_GUIDE.md](USER_GUIDE.md)
- [ADMIN_GUIDE.md](ADMIN_GUIDE.md)
- [DATASET_GUIDE.md](DATASET_GUIDE.md)
- [DASHBOARD_GUIDE.md](DASHBOARD_GUIDE.md)
- [RELEASE_NOTES_v1.0.md](RELEASE_NOTES_v1.0.md)

Architecture docs:
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [COMPONENT_ARCHITECTURE.md](COMPONENT_ARCHITECTURE.md)
- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md)
- [FILTER_ENGINE.md](FILTER_ENGINE.md)
- [EXPORT_SYSTEM.md](EXPORT_SYSTEM.md)

Developer docs:
- [INSTALLATION.md](INSTALLATION.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [TESTING_NOTES.md](TESTING_NOTES.md)

Release docs:
- [CLEANUP_REPORT.md](CLEANUP_REPORT.md)
- [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)

Historical design, audit, sprint, and screenshot reports are in [docs/](docs/).

## Requirements

- Node.js 20 or newer.
- npm.
- Docker optional.

## Environment Variables

- `VITE_USE_MOCK`: `true` for local demo mode, `false` to call API endpoints.
- `VITE_API_BASE_URL`: API origin used when mock mode is disabled.
- `VITE_API_PROXY_TARGET`: Vite dev proxy target for `/api`.
- `VITE_API_TIMEOUT_MS`: frontend request timeout in milliseconds.
- `FRONTEND_PORT`: Docker host port.

Vite reads `VITE_*` values at build time. Rebuild after changing them.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Default port: `8080`, configurable with `FRONTEND_PORT`.

## Production Boundary

DashboardMiniBi v1.0 is production-hardened for local/frontend release candidate evaluation, not for secure multi-user server deployment.

Before server-backed production use, provide:
- real authentication and sessions
- server-side authorization
- durable project/chart/dashboard persistence
- durable share-link records
- backend dataset/query execution
- server-side checks before returning any user data
