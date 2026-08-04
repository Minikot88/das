# External authentication boundary

DashboardMiniBi no longer implements login, registration, or password recovery.

## Current state

- Frontend `/login` and `/register` retire into `/dashboard-v2`.
- Development/test may use `AUTH_MODE=disabled` with an existing configured technical principal; production rejects disabled mode.
- Production uses PSU SSO OIDC Authorization Code + PKCE and verifies ID tokens through the configured JWKS endpoint.
- Identity mapping uses provider, issuer and subject; email and token roles do not grant application access.
- The browser receives only a Secure, HttpOnly opaque application-session cookie.
- `GET /api/session/me` is derived from the verified principal and database membership.
- Project/workspace authorization remains enforced by organization membership, project membership and ownership.

## Trust boundary

PSU SSO owns authentication and token issuance. DashboardMiniBi exchanges the
authorization code on the backend and never creates an account or administrator
from token claims.

## Required before public release

- registered production OIDC client, callback URI and authorized PSU test identity;
- authenticated browser E2E through PSU SSO;
- production secret management and JWKS rotation monitoring.
