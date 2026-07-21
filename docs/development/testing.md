# Testing

Vitest runs in jsdom with setup from `src/shared/test/setup.js`. Tests stay next to their source or in the owning layer; deployment contract tests live under `src/infrastructure/deployment/tests`.

```bash
npm test -- --run
npm run test:watch
npm test -- --run src/modules/datasets
```

The reorganization baseline and final suite contain 44 test files and 247 tests. No test was deleted, skipped, or changed merely to weaken an assertion. jsdom prints the existing `HTMLCanvasElement.getContext()` warning during the full suite; it does not fail the tests.

For a file move, run the related tests first, then lint, typecheck, the full suite, and the production build. Manual regression flows remain necessary for interactions without automated end-to-end coverage.
