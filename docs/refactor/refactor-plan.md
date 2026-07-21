# Behavior-Preserving Repository Reorganization Plan

Date: 2026-07-21

Status: implemented incrementally on `refactor/production-folder-structure`; final verification results are recorded in `baseline-results.md` and the delivery report.

## Architecture decision

Use a transitional, domain-oriented modular monolith inside the existing `src/` tree. Do not convert to `apps/packages` because the repository contains only one frontend application and no backend implementation. A monorepo conversion would change build/deployment ownership without a current use case.

Alternatives considered:

1. **Transitional `src/` modular architecture (selected):** lowest build/deployment risk; supports module boundaries now and future extraction later.
2. **Immediate `apps/web` monorepo:** clean eventual topology but high import, Docker, Vite, CI, and deployment churn with no backend package to justify it.
3. **Alias-only cleanup:** lowest immediate churn but leaves mixed responsibilities and does not meet the requested ownership boundaries.

## Target structure based on existing code

```text
src/
├── app/
│   ├── App.jsx
│   ├── router/
│   ├── layouts/
│   └── error-boundaries/
├── modules/
│   ├── auth/
│   ├── projects/
│   ├── datasets/
│   ├── charts/
│   ├── dashboards/
│   ├── connections/
│   ├── sharing/
│   └── settings/
├── domain/
│   ├── workspace/
│   ├── charts/
│   ├── dashboard/
│   └── shares/
├── shared/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── styles/
│   └── test/
├── infrastructure/
│   ├── http/
│   ├── persistence/
│   └── deployment/
└── main.jsx
```

Only directories backed by real files will be created. Existing `src/domain/` is retained rather than rewritten.

## Incremental phases

1. Establish aliases and app/shared boundaries while retaining `@/*` compatibility.
2. Move authentication and project/home files with module public exports.
3. Move dataset import, preview, and worker files without changing limits or empty-state behavior.
4. Move chart builder/rendering files as a single coordinated boundary.
5. Move dashboard current, V2, and legacy files into explicit subdirectories; preserve all three routes.
6. Move connections, sharing, settings, HTTP, and persistence adapters.
7. Move deployment contract tests and document root compatibility infrastructure.
8. Update architecture, development, deployment, and migration documentation.

After each phase run lint, typecheck, related tests, full tests, and production build. Commit only after fresh verification. `npm run check` is expected to retain its documented baseline audit failure unless the user separately authorizes dependency remediation.

## Safety rules

- Use `git mv` so history remains traceable.
- Move colocated tests with source.
- Prefer mechanical import rewrites; do not rename exported symbols.
- Keep `@/*` alias for compatibility and add only `@app`, `@modules`, `@domain`, `@shared`, and `@infrastructure`.
- Do not delete unused candidates.
- Do not alter CSS content or import order.
- Do not alter route strings, API paths, environment names, localStorage keys, workspace schemas, migrations, or fixtures.
- Record discovered bugs without fixing them.

## Commit sequence

1. `docs: inventory repository and baseline`
2. `refactor: establish application and shared boundaries`
3. `refactor: organize frontend feature modules`
4. `refactor: centralize infrastructure adapters`
5. `docs: document modular frontend architecture`
