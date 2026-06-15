# State Management

## Overview

DashboardMiniBi uses Zustand as the primary client state store. The main store is `src/store/useStore.js`.

## State Categories

Workspace:
- `projects`
- `activeProjectId`
- `activeSheetId`
- `activeDashboardId`

Charts:
- `charts`
- chart save/update/delete actions
- dashboard placement actions

Filters:
- `filters`
- `dashboardFilters`
- `filterPresets`

Interactions:
- `dashboardInteractions`
- cross-filter state
- drilldown path

Views:
- `savedViews`

Datasets:
- `importedDatasets`

Sharing:
- `shareLinks`

Preferences:
- `theme`
- `locale`
- `appSettings`
- `sidebarCollapsed`
- `kpiBarVisible`

UI:
- selected widget by dashboard
- recent project ids
- last opened context
- mobile menu state
- builder navigation context

## Persistence

Persistence is handled by `src/utils/storage.js`.

Workspace state is saved to localStorage as a normalized snapshot.

Autosave:
- `queueWorkspaceSave` debounces workspace saves.
- `flushWorkspaceSave` writes immediately.

Storage health:
- read/write failures update a storage health object.
- `AppHeader` subscribes to storage health and shows a warning banner.

## Migration And Normalization

The store performs normalization for:
- legacy sheet-only workspace shape
- duplicate project/sheet/dashboard ids
- missing active dashboard references
- chart records
- app settings
- dashboard filters
- dashboard interactions
- imported datasets

Malformed imported dataset metadata can be repaired from row keys.

## Key Actions

Project actions:
- create, rename, delete, set active, duplicate sheet.

Dashboard actions:
- create, rename, remove, duplicate, set active, update layout, update canvas size.

Chart actions:
- save chart, save chart to dashboard context, update chart, duplicate chart, delete chart, add saved chart to dashboard.

Filter actions:
- set dashboard filters
- reset dashboard filters
- save/apply filter presets

Interaction actions:
- set/clear cross filter
- push/trim drilldown path
- clear dashboard interactions

Saved views:
- create
- rename
- delete
- load

Settings:
- update app settings
- toggle theme
- set language

Sharing:
- get or create dashboard share link
- update dashboard share snapshot
- resolve share link

## Testing

Store coverage exists in `src/store/useStore.test.js` for dashboard creation, chart save, saved view load, cross-filter restore, and drilldown restore.
