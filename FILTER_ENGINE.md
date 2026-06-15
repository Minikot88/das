# Filter Engine

## Overview

The dashboard filter engine is implemented in `src/utils/dashboardFilters.js`.

It applies local, dashboard-wide filters and interaction state to widget row data before rendering charts.

## Filter State

Default filters:
- `dateRange`: `All dates`
- `department`: `All departments`
- `region`: `All regions`
- `year`: `All years`

Store location:
- `dashboardFilters`

## Interaction State

Interaction state includes:
- `crossFilter`
- `drilldown.path`

Store location:
- `dashboardInteractions`

## Field Detection

The filter engine uses field candidate lists:
- Department: `department`, `category`, `segment`, `channel`
- Region: `region`, `market`, `country`, `territory`
- Year: `year`
- Date: `date`, `createdAt`, `orderDate`

If a widget row does not contain a matching field, that filter does not exclude the row.

## Date Ranges

Supported ranges:
- Last 7 days
- Last 14 days
- Last 30 days
- Last 90 days
- Current quarter
- Year to date
- Last year

Date ranges are evaluated relative to the latest date in the widget row set when a date field exists.

## Cross Filtering

When a supported chart point is clicked:
1. `resolveInteractionPoint` maps the point label to a field/value.
2. `setCrossFilter` stores the interaction.
3. `applyDashboardFiltersToWidget` filters widget rows.
4. active chips show the current interaction.

## Drilldown

Supported hierarchy patterns:
- `year -> quarter -> month -> date`
- `category -> subcategory -> product`

`getNextDrilldownStep` validates the next drill step against the current path.

## Widget Filtering Pipeline

`applyDashboardFiltersToWidget(widget, filters, interactions)`:
1. Extracts source rows from `widget.rows`, `widget.data`, or `widget.config.rows`.
2. Applies dashboard global filters.
3. Applies cross-filter and drilldown interactions.
4. Returns a widget clone with filtered rows in:
   - `rows`
   - `data`
   - `config.rows`
   - `config.queryResult.rows`
5. Adds `filterMeta` counts.

## UI Integration

Dashboard page uses:
- `activeFilterChips`
- `interactionChips`
- filtered widget models
- saved view persistence
- share snapshot context items

## Tests

Covered in:
- `src/utils/dashboardFilters.test.js`
- `src/store/useStore.test.js`
