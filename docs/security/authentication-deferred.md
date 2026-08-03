# External authentication boundary

DashboardMiniBi no longer implements login, registration, password recovery, or cookie sessions.

## Current state

- Frontend `/login` and `/register` retire into `/dashboard-v2`.
- Development/test may use `AUTH_MODE=disabled` with an existing configured technical principal; production rejects disabled mode.
- Production verifies asymmetric Bearer JWTs through a configured JWKS endpoint and fails closed when configuration or verification is invalid.
- Identity mapping uses provider, issuer, subject and organization; email and token roles do not grant application access.
- `GET /api/session/me` is derived from the verified principal and database membership.
- Project/workspace authorization remains enforced by organization membership, project membership and ownership.

## Temporary boundary

The main website owns login, logout, account recovery and token issuance.
DashboardMiniBi accepts only verified Bearer JWTs and never creates an account or
administrator from token claims.

## Required before public release

- production issuer, JWKS, audience and claim contract supplied by the main website;
- external-session browser E2E with a non-production identity fixture;
- production secret management and JWKS rotation monitoring.
