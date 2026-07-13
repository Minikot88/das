# DashboardMiniBi Admin Guide

## Purpose

This guide is for administrators or release owners evaluating the DashboardMiniBi local/demo frontend release candidate.

## Deployment Model

DashboardMiniBi is a frontend React/Vite application hardened for browser-local evaluation and enterprise-style analytics workflows. Container configuration is prepared, but each release environment must complete its own Docker runtime smoke test.

Default behavior:
- Mock mode enabled.
- Mock authentication.
- Browser localStorage persistence.
- Local-only share records.
- Frontend-only Docker deployment.

## Environment Variables

- `VITE_USE_MOCK`: `true` uses local mock APIs and data. `false` expects a separately implemented and secured API; none is included in this repository.
- `VITE_API_BASE_URL`: API origin used when mock mode is disabled.
- `VITE_API_PROXY_TARGET`: Vite dev proxy target for `/api`.
- `VITE_API_TIMEOUT_MS`: request timeout in milliseconds.
- `FRONTEND_HOST`: Docker bind address; defaults to loopback (`127.0.0.1`).
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

Connection testing in this frontend is simulated. It does not execute a real connector or validate network/database credentials.

## Storage And Recovery

Canonical workspace state is saved under localStorage key `mini-bi-workspace-v1`. The older `mini-bi-v8-workspace` and `mini-bi-projects` values remain unchanged as migration and rollback inputs.

Builder drafts are saved under localStorage key `mini-bi-v8-builder-draft`.

Sanitized connection-profile metadata remains in the feature-owned `mini-bi-db-connections` compatibility key. It is not migrated into the canonical document; credential fields and credential-bearing URLs are rejected or removed before persistence/export.

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
npm ls --depth=0
npm run lint
npm run typecheck
npm test -- --run
npm run build
npm run check
npm audit
npm audit --omit=dev
docker compose config --quiet
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

The default binding is `127.0.0.1:8080`. Change it with `FRONTEND_HOST` and `FRONTEND_PORT`. Keep loopback for local/demo mode.

The image serves HTTP only and does not contain an API. Terminate HTTPS at an outer reverse proxy and configure HSTS there only after the complete origin is HTTPS. `/api/` deliberately returns `503` in the standalone image; disabling mock mode requires a separately implemented and secured same-origin backend proxy.

## Security Notes

Do not treat mock login or local share links as production security. A production deployment needs backend sessions, authorization, durable share records, and server-side data checks before returning dashboard, project, chart, or dataset data.
