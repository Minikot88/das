# DashboardMiniBi v1.0 Release Notes

## Release Summary

DashboardMiniBi v1.0 is a feature-complete local enterprise analytics platform for project workspaces, chart authoring, dashboard design, local CSV datasets, dashboard filtering, saved views, exports, sharing previews, and presentation mode.

This release is frontend-only by default and runs in mock/local mode for evaluation and local workflows.

## Highlights

- Executive workspace Home.
- Modern dashboard canvas with filters, tabs, inspector, and responsive layout.
- Professional chart builder with data explorer, visual picker, fields, format, analytics panel, preview, and save.
- CSV dataset import, validation, schema, stats, and table preview.
- Global filters, cross-filtering, drilldown, and saved views.
- Dashboard PNG, JPG, and PDF export.
- Local read-only share and embed views.
- Presentation mode.
- Settings for theme, density, formats, and dashboard preferences.
- Accessibility hardening for modals and chart summaries.
- Performance hardening for table rendering and CSV parsing.
- Reliability hardening for storage errors, route crashes, and malformed dataset recovery.
- Automated test baseline with Vitest and React Testing Library.

## Quality Gates

Current release commands:

```bash
npm run lint
npm test
npm run build
npm audit
```

Last verified hardening status:
- Lint passed.
- Tests passed: 7 files, 9 tests.
- Build passed.
- Audit reported 0 vulnerabilities.

## Breaking Changes

None expected for the local v1.0 frontend workflow.

## Dependency Updates

- Added Vitest, React Testing Library, jest-dom, user-event, and jsdom for testing.
- Updated `react-router-dom` to a patched version after audit findings.

## Known Limitations

- Mock authentication is not production security.
- Local share links are browser-local records.
- No backend, database, or server authorization is included.
- Large CSV files may exceed browser localStorage quota.
- Export uses browser canvas rendering and may fail for very large dashboards.
- Full browser E2E coverage is not yet included.

## Upgrade Notes

The local workspace schema uses `mini-bi-v8-workspace`. Existing local data should be normalized where possible. If local data is corrupted beyond recovery, clear localStorage for the app origin.
