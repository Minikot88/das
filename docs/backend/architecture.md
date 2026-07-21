# Backend architecture

DashboardMiniBi now has a NestJS/Fastify modular-monolith API in `apps/api`. The dependency direction is presentation → application → domain, with Prisma/MariaDB adapters under infrastructure. The browser-facing compatibility controllers keep the existing `/api/*` payloads while canonical controllers use `/api/v1/*` and the common `{ data, requestId, revision? }` envelope.

Implemented production foundations:

- validated runtime configuration and production-only key requirements;
- pluggable authentication provider boundary, signed httpOnly sessions, and development credentials rejected in production;
- organization scoping on repository reads and writes;
- revision conflicts returned as HTTP 409;
- structured error envelopes and request IDs;
- Helmet, CORS, rate limiting, multipart limits, and read-only SQL policy;
- AES-256-GCM secret storage with version metadata;
- Prisma client, immutable migration `0001_core`, controlled seed data, and MariaDB adapter;
- liveness (`/api/v1/health`) and database readiness (`/api/v1/ready`).

The current external authentication interface is intentionally not coupled to a specific identity provider. A production deployment must supply an approved external provider implementation before enabling user traffic; development authentication cannot start in `NODE_ENV=production`.

## Compatibility routes

Existing routes remain available: `/api/auth/*`, `/api/projects`, `/api/dataset*`, `/api/chart-types`, `/api/chart-templates*`, `/api/charts*`, and `/api/dashboards*`. Canonical auth, health, and project endpoints are under `/api/v1`.

The Frontend still owns chart validation/render-configuration logic. Moving that logic server-side is deliberately excluded until a contract-parity fixture suite proves identical output.
