# DashboardMiniBi Admin Guide

## Purpose

This guide is for administrators or release owners running DashboardMiniBi v1.0 as a local-first analytics workspace.

## Deployment Model

DashboardMiniBi is a frontend React/Vite application. The v1.0 release is feature-complete for local evaluation and local enterprise-style analytics workflows.

Default behavior:
- Mock mode enabled.
- Mock authentication.
- Browser localStorage persistence.
- Local-only share records.
- Frontend-only Docker deployment.

## Environment Variables

- `VITE_USE_MOCK`: `true` uses local mock APIs and data. `false` calls configured API endpoints.
- `VITE_API_BASE_URL`: API origin used when mock mode is disabled.
- `VITE_API_PROXY_TARGET`: Vite dev proxy target for `/api`.
- `VITE_API_TIMEOUT_MS`: request timeout in milliseconds.
- `FRONTEND_PORT`: Docker host port.

Vite reads `VITE_*` variables at build time. Rebuild when changing them.

## Local Mode Limits

Mock/local mode does not provide:
- Real authentication.
- Server-side authorization.
- Shared multi-user persistence.
- Durable share links across devices.
- Server-backed datasets or refresh jobs.

Use local mode for evaluation, demos, and browser-local workflows.

## Storage And Recovery

Workspace state is saved under localStorage key `mini-bi-v8-workspace`.

Builder drafts are saved under localStorage key `mini-bi-v8-builder-draft`.

Recovery behavior:
- Invalid JSON falls back to safe defaults.
- Dataset metadata can be repaired from local rows.
- Storage write/read failures show a warning banner.
- Route render failures show a recovery state with reload.

Admin actions:
- To reset the workspace, clear browser localStorage for the app origin.
- To preserve data before reset, use browser devtools to export the localStorage value.

## Verification Commands

Run before release:

```bash
npm ci
npm run lint
npm test
npm run build
npm audit
```

Expected:
- Lint passes.
- Tests pass.
- Build passes.
- Audit reports zero vulnerabilities.

## Docker

Build and run:

```bash
cp .env.example .env
docker compose up --build
```

Default app port is `8080` unless `FRONTEND_PORT` is changed.

## Security Notes

Do not treat mock login or local share links as production security. A production deployment needs backend sessions, authorization, durable share records, and server-side data checks before returning dashboard, project, chart, or dataset data.
