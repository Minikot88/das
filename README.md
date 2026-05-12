# Dashboard Mini BI

Dashboard Mini BI is a frontend-only React/Vite analytics workspace for building charts, arranging dashboards, exporting dashboard images, and opening read-only public or embedded dashboard views.

The current app runs in explicit mock mode by default. Mock mode uses local demo data, localStorage persistence, and mock authentication for local evaluation. It is not real production authentication.

## Requirements

- Node.js 20 or newer
- npm
- Docker, optional

## Install

```bash
npm ci
```

## Run Locally

```bash
npm run dev
```

Open the URL printed by Vite. The default `.env.example` keeps `VITE_USE_MOCK=true`, so no backend is required.

## Build

```bash
npm run build
```

Preview the built app:

```bash
npm run preview
```

## Docker

The Docker setup is frontend-only and serves the built SPA with nginx.

```bash
cp .env.example .env
docker compose up --build
```

The default host port is `8080`, configurable with `FRONTEND_PORT`.

Vite reads `VITE_*` values at build time. When changing `VITE_USE_MOCK`, `VITE_API_BASE_URL`, or `VITE_API_TIMEOUT_MS` for Docker, rebuild the image with `docker compose up --build`. Runtime container environment changes alone will not update an already-built SPA.

## Environment Variables

- `VITE_USE_MOCK`: `true` for local demo mode, `false` to call a real API.
- `VITE_API_BASE_URL`: API origin used when mock mode is disabled.
- `VITE_API_PROXY_TARGET`: Vite dev proxy target for `/api` when no API base URL is set.
- `VITE_API_TIMEOUT_MS`: frontend request timeout in milliseconds.
- `FRONTEND_PORT`: Docker host port for the nginx frontend container.

## Mock Auth Limitation

Mock authentication only gates routes inside this browser session and localStorage workspace. It does not provide server-side security, shared-user isolation, password verification, or durable public share authorization.

Public/share links in mock mode are also local browser records. They are useful for previewing the read-only UI, but they are not a production access-control mechanism and cannot protect data across users or devices.

Before production, connect a real backend with session/token validation, server-side authorization, durable share-link records, and server-side checks before returning any dashboard, chart, project, or user data.

## Production Checklist

- Implement a real backend for auth, projects, charts, dashboards, and share links.
- Store secrets outside source control and deployment defaults.
- Add server-side authorization checks for every dashboard/chart route.
- Use HTTPS and secure cookie/session settings.
- Run `npm run lint`, `npm run build`, and `npm audit` in CI.
- Add automated tests for auth guards, chart lifecycle, dashboard layout, and share/embed views.
