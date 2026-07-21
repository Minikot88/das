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

The compatibility alias `@/*` remains available so external or older imports do not break, but new code should use the layer alias that states ownership. Avoid deep relative paths. Import another module through its `index.js` public API when an export is intended for cross-module use. Do not add barrels to every directory.

Module-specific API adapters and persistence remain inside the owning module. Generic HTTP transport and workspace persistence implementations belong in infrastructure. Shared UI must not acquire module business rules.

## Enforcement

`npm run lint`, `npm run typecheck`, production build, Vitest, and `src/infrastructure/deployment/tests/importGraph.test.js` provide the current automated checks. Static analysis performed during the reorganization found zero circular dependencies, zero unresolved internal imports, and zero deep relative imports.
