# Files retained after dead-code analysis

Knip findings are leads, not deletion proof. The following classes were retained deliberately:

- `public/theme-init.js`: loaded directly by `index.html` before the application bundle.
- `apps/api/src/main.ts`: backend process entrypoint.
- Prisma config/seed and API Vitest config: command-discovered configuration and database tooling.
- Data dictionary and schema scripts: approval, provenance and drift-verification tooling.
- Module root `index.js` files and `projectApi.js`: documented compatibility/public API surfaces, including HTTP/mock mode.
- Workers, route pages, Nest controllers/providers and chart-family registration files: dynamically or framework registered.
- Existing migrations, seed fixtures, backup/restore scripts, legacy dashboards and mock mode: explicitly retention-protected by scope.
- `outputs/data_dictionary_build/*`: provenance is not yet sufficient to classify generated evidence as disposable.

Unused named exports inside otherwise live modules were retained unless their public-contract risk could be disproved.
