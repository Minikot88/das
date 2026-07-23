# Backend security controls

- Development credentials are rejected in production configuration.
- Sessions are HMAC-signed and stored in `httpOnly`, `SameSite=Strict` cookies.
- Repository queries include organization scope; request headers cannot select an organization.
- Connection secrets use AES-256-GCM and are separated from connection metadata.
- Share tokens are stored as SHA-256 hashes, not raw tokens.
- SQL endpoints accept a single read-only SELECT/CTE statement and reject comments, writes, transactions, and multi-statements.
- HTTP requests use security headers, explicit CORS origins, body/file limits, rate limiting, request IDs, and safe error messages.
- Production requires the database URL, master encryption key, and session signing key.

Open security work before public production:

- implement and independently review the selected external identity-provider adapter;
- add RBAC permission guards to every mutation, beyond authenticated tenant scoping;
- add CSRF tokens if cross-site cookie workflows are introduced;
- configure centralized structured-log shipping and security alert thresholds;
- conduct dependency, SAST, DAST, and penetration testing against the deployed environment;
- rotate development defaults and verify secret-provider integration.
