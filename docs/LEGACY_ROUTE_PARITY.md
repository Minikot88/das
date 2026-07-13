# Legacy Route Parity

This matrix records why the current and legacy surfaces remain available. No legacy route was deleted during the frontend hardening work.

| Capability | Current surface | Legacy/compatibility surface | Decision |
| --- | --- | --- | --- |
| Workspace hub | `/home` and `/` | Legacy project/sheet projection | Current route retained; compatibility projection remains readable. |
| Dashboard canvas | `/dashboard` | `/dashboard-legacy` | Both retained because the legacy screen still contains distinct sheet/grid workflows. |
| Chart authoring | `/dashboard-v2` | `/builder` | Both retained; saved chart and active-context adapters keep IDs compatible. |
| Datasets | `/datasets` | Imported dataset records in the v8 workspace | Current catalog reads canonical project-owned rows; legacy records are migrated non-destructively. |
| Local share | `/dashboard/:id/view`, `/dashboard/:id/embed` | `/share/:sheetId` | Both retained. All are local read-only views, not server-public authorization. |
| Settings | `/settings` | v8 app settings | Canonical settings project to the compatibility store. |
| Connections | `/connections` | `mini-bi-db-connections` metadata | Metadata only; credentials are never migrated or persisted. |

## Compatibility Rules

- `mini-bi-workspace-v1` is the canonical domain document.
- Legacy keys remain byte-for-byte unchanged during migration and are fallback inputs, not dual-write targets.
- Sheet IDs survive as aliases to canonical dashboards.
- Invalid or future-version canonical documents are not overwritten.
- Missing charts, datasets, shares, and widget references render explicit unavailable states; they are not replaced with unrelated demo data.
- A route may be removed only after a separate parity review proves it has no unique behavior or data.

## Known Boundary

The repository contains no Data Dictionary. This parity record therefore describes observed frontend entities and storage contracts only; it does not infer database tables or server ownership.
