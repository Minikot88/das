# Discovered Issues

Issues listed here are not fixed by the repository-organization refactor unless they prevent a safe move or build.

1. Full `npm run check` fails at `npm audit` because development dependency `brace-expansion <1.1.16` has a high-severity advisory. Production dependencies audit cleanly.
2. Vite reports two JavaScript chunks over 500 kB after minification.
3. Vitest/jsdom reports the expected missing canvas implementation warning.
4. Docker CLI is installed but the Docker Desktop Linux daemon is not running, blocking baseline image/runtime verification.
5. Several source files are very large and mix orchestration concerns. Splitting their business logic would materially increase behavior risk and is deferred.
6. Baseline static analysis reported 11 unused candidates. The final scan reports 17 because module public API files and config/dynamic entries have no ordinary incoming static import. No candidate was deleted; cleanup requires a separate proof cycle.
