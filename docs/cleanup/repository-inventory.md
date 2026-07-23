# Repository inventory

## Runtime entry points

- Frontend: `index.html` → `src/main.jsx` → app providers/router
- Worker: `src/modules/datasets/lib/csvImport.worker.js`
- Backend: `apps/api/src/main.ts` → Nest/Fastify bootstrap
- Database: Prisma schema, `0001_core` migration, controlled seed
- Deployment: root Dockerfile/nginx plus API Dockerfile and Compose services `frontend`, `backend`, `migration`, `database`

## Product areas

- Frontend app/router/layout/error boundary
- Auth mock/HTTP adapters and unchanged login/register pages
- Projects/workspace persistence and migrations
- Dataset CSV parsing/import/preview
- Chart Builder, Chart.js/ECharts renderers and catalog
- Current, V2 and legacy dashboard routes
- Widget layout/filter/presentation/export
- Public share/view/embed
- Connection profile UI and safe local metadata persistence
- Settings/theme/i18n
- Backend auth boundary, projects, workspace data, queries, sharing primitives, secrets and database infrastructure

## Supporting areas

- 54 root-discovered test files and 10 API test files
- Database dictionary/approval/drift scripts and artifacts
- CI, Docker, nginx, backup/restore and deployment docs
- Generated Prisma client and `dist` are ignored build outputs

Approved migrations, database design artifacts, legacy routes, compatibility controllers, mock mode, workers, connector catalog entries and backup/restore scripts are retention-protected.
