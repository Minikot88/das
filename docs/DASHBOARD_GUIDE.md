# DashboardMiniBi Dashboard Guide

## Overview

The Dashboard workspace is the main BI canvas for arranging charts, applying filters, saving views, exporting snapshots, sharing local read-only views, and presenting dashboards.

## Dashboard Workspace

Key areas:
- Header: dashboard title, workspace context, metadata, and primary actions.
- Filter ribbon: date, department, region, year, active chips, presets, and clear actions.
- Tabs: switch between dashboards in the active sheet.
- Canvas: drag, resize, select, inspect, and view widgets.
- Inspector: properties, visual, data, and interaction panels.

## Creating Dashboards

Use dashboard tabs to create and switch dashboards. Each dashboard belongs to the active sheet and project.

## Adding Charts

Options:
- Open Builder to create a new chart.
- Browse saved charts from the dashboard.
- Save a chart from Builder into the active dashboard.

## Widget Management

Supported:
- Select widgets.
- Drag and resize widgets.
- Edit charts through Builder.
- Duplicate dashboards and charts where available.
- Remove widgets.
- Export chart data or image from widget actions where available.

## Global Filters

Available global filters:
- Date.
- Department.
- Region.
- Year.

Filter state propagates across dashboard widgets using the existing local filter engine.

Use active chips to understand current filter context. Clear filters to return to the full local dataset view.

## Cross Filtering

Click supported chart data points to propagate a dashboard-level interaction filter. Active interaction chips show the current cross-filter state.

## Drilldown

Supported hierarchy patterns:
- year -> quarter -> month -> date
- category -> subcategory -> product

Use drilldown breadcrumbs to trim or clear drilldown state.

## Saved Views

Saved views persist locally and include:
- Active filters.
- Interaction state.
- Dashboard layout.
- Active dashboard context.

Users can create, rename, delete, and load saved views.

## Sharing

The share modal creates local read-only URLs and embed URLs.

Important:
- Share records are local browser records.
- Links are not durable across devices unless the localStorage record exists there.
- Links are read-only UI views, not production authorization.

## Export

Dashboard export supports:
- PNG.
- JPG.
- PDF.

Exports use the current dashboard visual state, filters, interactions, charts, and tables.

Known limit: very large dashboards can exceed browser canvas memory.

## Presentation Mode

Presentation mode:
- Opens a fullscreen dashboard view.
- Hides navigation and builder controls.
- Shows widgets only with compact context.
- Exits with `Escape` or the Exit button.

## Recovery

If a dashboard fails to load:
- The dashboard hook fails closed to an empty widget list.
- Route-level errors show a recovery screen.
- Missing share tokens show an unavailable public view.
