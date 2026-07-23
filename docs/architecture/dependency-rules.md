# Dependency Rules

## Allowed direction

```text
main -> app -> modules -> domain/shared
                    \-> infrastructure
infrastructure -> domain/shared
```

`domain` is the stable inner layer. It must not import React, route components, HTTP clients, localStorage, sessionStorage, or infrastructure implementations.

## Module boundaries

Use the configured aliases:

- `@app/*`
- `@modules/*`
- `@domain/*`
- `@shared/*`
- `@infrastructure/*`

The compatibility alias `@/*` remains available so external or older imports do not break, but new code should use the layer alias that states ownership. Avoid deep relative paths. Cross-module production imports use capability-specific files under the target module's `public/` directory. Each root `index.js` remains the complete module entry for application composition and re-exports those narrow surfaces; internal module code avoids importing the wide barrel so chart/dashboard dependencies do not create cycles or collapse lazy chunks. Do not add barrels to every directory.

Module-specific API adapters and persistence remain inside the owning module. Generic HTTP transport and workspace persistence implementations belong in infrastructure. Shared UI must not acquire module business rules.

## Transitional compatibility exceptions

The current Zustand workspace store and reusable page-layout primitives remain under `app` because they are existing compatibility/orchestration hotspots. Feature modules still consume these adapters, and `shared/lib/i18n.js` still reads the application store. Reversing those dependencies safely requires separating store actions/selectors and layout primitives from their current implementation, which is a behavior-sensitive follow-up rather than a file move. New dependencies must not expand these exceptions.

## Enforcement

`npm run lint`, `npm run typecheck`, production build, Vitest, and `src/infrastructure/deployment/tests/importGraph.test.js` provide the current automated checks. The import-graph test resolves every configured alias and enforces zero circular dependencies, zero unresolved internal imports, zero deep relative imports, narrow cross-module public imports, and domain independence from React/application/infrastructure adapters.
