# DashboardMiniBi User Guide

## Overview

DashboardMiniBi is a local-first enterprise analytics workspace for creating projects, importing CSV data, building charts, arranging dashboards, applying filters, saving views, and exporting or presenting dashboard snapshots.

The default release runs in mock/local mode. Data, settings, saved views, imported CSV datasets, dashboards, charts, and share records are stored in the browser localStorage for the current browser profile.

## Main Areas

- Home: workspace hub for projects, recent dashboards, activity, quick actions, and templates.
- Dashboard: BI canvas for arranging widgets, filtering data, saving views, sharing, exporting, and presentation mode.
- Builder: professional chart authoring workspace with data explorer, chart type selection, field mapping, formatting, analytics placeholders, preview, and save.
- Datasets: local data catalog for CSV import, validation, schema, statistics, and table preview.
- Settings: local preferences for theme, density, date/number formats, and dashboard defaults.

## Getting Started

1. Start the app with `npm run dev`.
2. Open the Vite URL in a browser.
3. Sign in using mock credentials, for example `demo@dataviz.bi` and `demo1234`.
4. Open Home to choose or create a workspace.
5. Open Dashboard or Builder from the navigation.

## Projects And Workspaces

Projects organize sheets, dashboards, and charts.

Common actions:
- Create a project from Home.
- Switch projects from the header project selector.
- Open Dashboard to work in the active project context.
- Use the sidebar and workspace header to understand the current project, sheet, and dashboard.

## Command Palette

Open the command palette with `Ctrl+K` or the Palette button in the header.

Use it to:
- Navigate to Home, Dashboard, or Builder.
- Open the dataset explorer.
- Start from template gallery actions.

## Search

The header search opens the command palette. It is command search, not a full-text content search across all dashboard data.

## Local Persistence

The app stores workspace data locally in browser localStorage.

Important notes:
- Data is browser/profile specific.
- Clearing browser storage removes local work.
- Local share links work only where the share record exists in localStorage.
- A storage warning appears if the browser blocks or fails local persistence.

## Accessibility Notes

Supported keyboard basics:
- `Tab` and `Shift+Tab` move through controls.
- `Escape` closes supported modals and presentation mode.
- `Ctrl+K` opens command palette.
- Tables expose sortable headers and filter inputs.

Chart cards include screen-reader summaries with chart title, type, source, and row count.

## Troubleshooting

If the app opens an error recovery screen:
- Use Reload to retry the current route.
- If the issue continues, clear localStorage or open a private browser profile for a clean workspace.

If exports fail:
- Try a smaller dashboard or lower browser zoom.
- Very large dashboards can exceed browser canvas memory limits.

If imported CSV data disappears:
- Confirm browser storage was not cleared.
- Confirm localStorage is available in the current browser mode.
