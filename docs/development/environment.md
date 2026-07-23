# Environment

Copy `.env.example` when local overrides are required. Preserve these names and meanings:

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_USE_MOCK` | Select local/mock adapters | `true` |
| `VITE_API_BASE_URL` | API base path in HTTP mode | empty |
| `VITE_API_PROXY_TARGET` | Vite development proxy target | `http://localhost:3000` |
| `VITE_API_TIMEOUT_MS` | HTTP request timeout | `15000` |
| `FRONTEND_HOST` | Docker host binding | `127.0.0.1` |
| `FRONTEND_PORT` | Docker host port | `8080` |

`VITE_*` values are embedded at build time. Do not put secrets in frontend environment variables. The standalone image is frontend-only and nginx deliberately returns `503` for `/api` until a separately reviewed backend proxy is supplied.
