# Architecture Overview

DashboardMiniBi is a frontend-only modular monolith built with React and Vite. The repository intentionally remains a single deployable application: there is no backend source tree, database schema, ORM, or server migration set to reorganize.

## Runtime model

The browser application supports mock/local mode and an HTTP adapter mode. Local mode persists the canonical workspace under `mini-bi-workspace-v1` and connection profiles under `mini-bi-db-connections`. Existing legacy workspace migration and compatibility behavior remains in place.

The application is divided into four primary layers:

- `app`: bootstrap, router, layouts, error boundaries, global state wiring, and application-wide UI.
- `modules`: user-facing capabilities owned by auth, projects, datasets, charts, dashboards, connections, sharing, and settings.
- `domain`: browser-independent workspace, chart, dashboard, and sharing rules.
- `shared`: reusable UI, hooks, libraries, styles, and test setup used by multiple modules.
- `infrastructure`: HTTP, browser persistence, mock data adapters, and deployment contract tests.

## Architecture decision

The project uses a transitional domain-oriented structure under `src/` instead of introducing `apps/` and `packages/`. A monorepo would add workspace, build, Docker, and import-boundary risk without a second application or a backend to justify it. This structure gives explicit ownership now and leaves room to extract packages later if real consumers appear.

## Compatibility boundary

The refactor changed locations and import paths only. Public routes, storage keys, API request and response behavior, environment names, Docker ports, nginx routing, workspace migrations, mock mode, and UI behavior are unchanged.

See [Folder Structure](folder-structure.md) and [Dependency Rules](dependency-rules.md).
