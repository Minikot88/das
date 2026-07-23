# Entry-point map

Public frontend routes: `/login`, `/register`, `/share/:sheetId`, `/dashboard/:dashboardId/view`, `/dashboard/:dashboardId/embed`.

Protected frontend routes: `/`, `/home`, `/dashboard`, `/dashboard-v2`, `/dashboard-legacy`, `/builder`, `/connections`, `/datasets`, `/settings`.

Backend canonical roots: `/api/v1/health`, `/api/v1/ready`, `/api/v1/auth`, `/api/v1/projects`.

Legacy compatibility roots: `/api/auth`, `/api/projects`, `/api/dataset`, `/api/chart-types`, `/api/chart-templates`, `/api/charts`, `/api/dashboards`.

Non-import registrations that must be retained include React lazy routes, Nest decorators/controllers, the CSV Worker URL, Prisma migration/seed commands, Docker COPY paths and nginx `/api` proxy locations.
