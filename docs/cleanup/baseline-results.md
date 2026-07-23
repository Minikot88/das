# Cleanup baseline results

Date: 2026-07-21
Branch base: `e49498c` on `feat/production-database-backend`
Cleanup branch: `refactor/repository-cleanup-security`

- Tracked files: 600
- Source-like files: 329
- Source-like lines: 90,182
- Root dependencies: 16 runtime, 17 development
- API dependencies: 17 runtime, 5 development
- Frontend gate: passed — 54 files / 274 tests, lint, typecheck, build, and both audits (0 vulnerabilities)
- Backend gate: passed — 10 files / 23 tests, typecheck/lint and build
- Build warnings: jsdom canvas not implemented; Vite chunks about 501.51 kB and 870.11 kB
- Docker compose config: valid
- Docker build: baseline blocked because `dockerDesktopLinuxEngine` is not running
- Static dead-code probe: Knip reported 22 file candidates, 2 dependency candidates, and many export candidates; API findings are contaminated by the nested package not being configured as a Knip workspace and are not deletion evidence.
- Empty untracked directories observed: `.agents`, `src/modules/charts/builder/builder`, and `src/modules/charts/components/charts`.

No file is removed solely from this baseline output.
