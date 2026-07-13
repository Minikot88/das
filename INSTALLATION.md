# Installation

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0`.
- npm.
- Git.
- Docker with Compose support (optional).

## Local Development

```bash
git clone <repository-url>
cd dashboard-mini-bi
npm ci
npm run dev
```

Vite prints the local URL. The default environment is frontend-only mock mode.

## Environment

```env
VITE_USE_MOCK=true
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://localhost:3000
VITE_API_TIMEOUT_MS=15000
FRONTEND_HOST=127.0.0.1
FRONTEND_PORT=8080
```

`VITE_*` values are compiled into the frontend; rebuild after changing them. Do not put credentials in Vite environment variables because browser bundles are public to their users.

## Verification

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
git diff --cached --check
git diff --check
git status --short --branch
```

`npm run check` repeats lint, typecheck, tests, build, the full audit, and the production-only audit. The explicit commands above are retained as the authoritative release ledger.

## Production Preview

```bash
npm run build
npm run preview
```

The build output is `dist/`.

## Docker

```bash
docker compose up --build
```

The default binding is `127.0.0.1:8080`. Override the address with `FRONTEND_HOST` and the port with `FRONTEND_PORT`. Do not expose local/demo mode on an untrusted network.

This frontend image serves HTTP only and intentionally returns `503` for `/api/`. For a non-mock deployment, place it behind a separately reviewed same-origin API/HTTPS reverse proxy. Configure HSTS at that TLS-terminating boundary only after every route on the origin is HTTPS; adding HSTS to this HTTP-only image would be misleading.

When a Docker Linux engine is available, smoke-test the runtime with:

```bash
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs --no-color
curl -I http://127.0.0.1:8080/
curl -I http://127.0.0.1:8080/dashboard/example/view
curl -I http://127.0.0.1:8080/assets/<hashed-asset-from-index.html>
curl -i http://127.0.0.1:8080/healthz
curl -i http://127.0.0.1:8080/api/health
docker compose down
```

Use a real `/assets/...` URL emitted by the running `index.html`; its response should include the immutable cache policy. A missing asset is useful only for checking the `404` behavior and cannot prove hashed-asset caching.

## Browser Data

The canonical key is `mini-bi-workspace-v1`. Legacy keys including `mini-bi-v8-workspace` and `mini-bi-projects` are preserved as migration/fallback inputs. Builder drafts and UI state use separate feature-owned keys.

Before clearing site data, export any important local content. Clearing browser storage deletes the only local copy of workspaces and Local shares. Uploaded image object URLs are session-only and do not survive refresh.
