# Dependency Map

Date: 2026-07-21

## Baseline graph

The baseline graph contains 226 source files, 476 resolved internal import edges, and no static circular dependency. The scan resolves relative imports and the existing `@/*` alias. CSS `?raw` imports in tests are Vite resource imports, not missing application modules.

```text
main.jsx
└── App.jsx
    ├── app/AppRoutes.jsx
    │   ├── pages/*
    │   ├── components/layout/Layout.jsx
    │   └── store/useStore.js
    ├── store/useStore.js
    └── utils/themeMode.js

pages/features/components
├── store/useStore.js
├── api/*
├── services/projectStorage.js
├── domain/*
└── utils/*

store/useStore.js
├── domain/workspace/*
├── domain/shares/*
├── utils/storage.js
├── utils/layoutUtils.js
└── data/mockData.js
```

## Import hotspots

| File | Incoming imports |
| --- | ---: |
| `src/store/useStore.js` | 35 |
| `src/domain/workspace/workspaceRepository.js` | 23 |
| `src/services/projectStorage.js` | 22 |
| `src/components/dashboard-v2/theme.ts` | 18 |
| `src/domain/workspace/workspaceSchema.js` | 14 |
| `src/utils/savedChartsStorage.js` | 13 |
| `src/utils/storage.js` | 13 |
| `src/components/dashboard-v2/services/datasetService.ts` | 12 |

These files require compatibility imports or tightly controlled moves. Splitting their business logic is out of scope for a location-only refactor.

## Deep relative imports

42 imports cross two or more parent directories. Concentrations occur in:

- `src/components/dashboard-v2/components/charts/`
- `src/features/builder/hooks/useChartBuilder.js`
- `src/components/layout/Layout.jsx`
- `src/components/dashboard/`

The refactor will replace these with the existing `@/*` alias or a small set of added boundary aliases. It will not create barrels for every directory.

## Target dependency direction

```text
main
→ app
→ modules
→ domain
→ shared

app/modules
→ infrastructure adapters

domain
↛ React
↛ router
↛ HTTP
↛ localStorage
```

Infrastructure may import domain contracts and implement persistence/HTTP behavior. Domain must not import infrastructure. Cross-module imports must use a module public API where one is introduced; internal imports within one large module may remain direct and aliased to minimize behavior risk.

## Public compatibility boundaries

- Route strings remain in the router with unchanged URLs and protection.
- `mini-bi-workspace-v1` and `mini-bi-db-connections` remain byte/semantic contracts.
- Legacy localStorage keys and migration source reads remain unchanged.
- `/api/...` endpoints and mock/HTTP selection remain unchanged.
- `src/main.jsx` remains the Vite entry.
- Root Docker, Compose, and nginx paths remain usable even if documented under an infrastructure index.

## Final graph

After the move and public-boundary hardening, the graph contains 244 JavaScript/TypeScript source files. Automated static analysis reports:

- 0 circular dependency cycles;
- 0 unresolved internal imports;
- 0 deep relative imports, reduced from 42;
- no React, application adapter, infrastructure adapter, or browser storage dependency in production domain files;
- no production cross-module import that bypasses the target module's capability-specific `public/` surface.

The increased file count comes from module public APIs, capability-specific public entries, and the extracted React workspace selector adapter; no test or behavior implementation was removed.
