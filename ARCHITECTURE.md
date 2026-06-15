# DashboardMiniBi Architecture

## Overview

DashboardMiniBi is a React/Vite single-page application. It is frontend-only by default and uses mock/local APIs, Zustand state, localStorage persistence, Chart.js rendering, React Grid Layout, and browser-native export APIs.

## Runtime Stack

- React 19.
- Vite 8.
- React Router 7.
- Zustand 5.
- Chart.js 4.
- React Grid Layout.
- Vitest and React Testing Library.

## Application Entry

- `src/main.jsx`: mounts the React app.
- `src/App.jsx`: top-level app wrapper.
- `src/app/AppRoutes.jsx`: route registration, lazy loading, protected routes, and route error boundaries.

## Routes

Public routes:
- `/login`
- `/register`
- `/share/:sheetId`
- `/dashboard/:dashboardId/view`
- `/dashboard/:dashboardId/embed`

Protected routes:
- `/`
- `/home`
- `/dashboard`
- `/builder`
- `/datasets`
- `/settings`

Unknown routes redirect to `/home`.

## Layout

Main layout:
- `src/components/layout/Layout.jsx`
- `src/layout/AppHeader.jsx`
- `src/layout/SidebarLeft.jsx`
- `src/layout/SidebarRight.jsx`

Workspace routes such as Dashboard and Builder use specialized in-page layouts and hide the global right sidebar.

## Data Model

Primary local state:
- projects
- sheets
- dashboards
- layout items
- charts
- filters
- dashboard interactions
- saved views
- imported datasets
- settings
- share links
- UI state

Persistence:
- Workspace key: `mini-bi-v8-workspace`
- Builder draft key: `mini-bi-v8-builder-draft`

## API Layer

Files:
- `src/api/client.js`
- `src/api/authApi.js`
- `src/api/projectApi.js`
- `src/api/chartApi.js`
- `src/api/dashboardApi.js`

In mock mode, API wrappers call the local store and mock data. In non-mock mode, requests go through `apiRequest`.

## Rendering

Chart rendering:
- `src/components/charts/ChartRenderer.jsx`
- `src/components/charts/ChartJsRenderer.jsx`
- `src/components/charts/KPIWidget.jsx`
- `src/components/charts/ChartErrorBoundary.jsx`

Dashboard rendering:
- `src/components/dashboard/DashboardGrid.jsx`
- `src/components/dashboard/ChartCard.jsx`

## Error Handling

- Chart-level errors render chart status cards.
- Route-level errors render `RouteErrorBoundary`.
- Dashboard load failures fail closed to an empty widget list.
- Storage failures publish a storage health state and show an alert banner.

## Testing

Test setup:
- `src/test/setup.js`
- `*.test.js`
- `*.test.jsx`

Command:

```bash
npm test
```

## Build Output

Production build:

```bash
npm run build
```

Output directory: `dist/`
