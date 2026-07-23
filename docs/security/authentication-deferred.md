# Authentication explicitly deferred

This cleanup does not implement or expand real login, registration, OAuth/OIDC, SSO, MFA, session management or complete RBAC.

## Current state

- Frontend `/login` and `/register` behavior and mock mode are preserved.
- The development backend provider is a fixed internal/test adapter and is rejected when `NODE_ENV=production`.
- The external provider is an interface placeholder that fails closed with `AUTH_PROVIDER_NOT_CONFIGURED`.
- Project/workspace services accept a `RequestPrincipal` boundary so a future provider can supply organization/user identity.
- Current HMAC session tokens are deterministic and have no expiry, nonce or server-side revocation. Logout clears only the current browser cookie.
- `GET /api/v1/auth/me` is currently an unguarded development compatibility endpoint that returns a fixed owner-shaped identity without validating a session. No first-party frontend caller was found and protected backend routes still require the session guard, but this endpoint must not be treated as authentication proof.

## Temporary boundary

Until a real identity provider and expiring/revocable sessions are implemented, the system classification is:

`Internal/Test Deployment Only`

It must not be exposed directly to the public Internet or treated as a multi-tenant authentication boundary.

## Required before public release

- approved identity provider and account lifecycle;
- expiring, rotating, revocable sessions bound to organization identity;
- replace or guard `/api/v1/auth/me` so its response is derived from the validated principal, with unauthenticated and production-provider integration tests;
- CSRF/session replay validation for the selected strategy;
- role/permission policy layered on the existing project isolation checks;
- end-to-end multi-user authorization and audit tests;
- production secret manager and key-rotation runbook.
