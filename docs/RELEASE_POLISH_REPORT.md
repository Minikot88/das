# Release Polish Report

## Completed

### Thai-first localization

Converted the main UI from English-first labels to Thai-first labels across navigation, dashboard, builder, datasets, settings, tables, modals, and shared i18n strings.

### Encoding cleanup

Removed source corruption patterns from active app files and replaced damaged chart picker glyphs with stable ASCII labels.

### Responsive polish

Added final responsive overrides for the dashboard inspector and builder workflow:

- Desktop inspector remains a right-side properties panel
- Tablet inspector collapses inline
- Mobile inspector becomes a drawer
- Builder changes from 3 columns to 2 columns to a single guided workflow

### Visual polish

Reduced visual heaviness through softer borders, lighter shadows, wider spacing, and more forgiving mobile stacks on dashboard and builder surfaces.

## Files Changed In This Sprint

- `src/utils/i18n.js`
- `src/utils/storage.js`
- `src/layout/AppHeader.jsx`
- `src/layout/SidebarLeft.jsx`
- `src/layout/SidebarRight.jsx`
- `src/pages/DashboardPage.jsx`
- `src/pages/DatasetsPage.jsx`
- `src/pages/SettingsPage.jsx`
- `src/components/bi/CommandPaletteModal.jsx`
- `src/components/bi/DatasetExplorerModal.jsx`
- `src/components/dashboard/DashboardShareModal.jsx`
- `src/components/ui/EnterpriseDataTable.jsx`
- `src/features/builder/BuilderPage.jsx`
- `src/features/builder/ChartMappingPanel.jsx`
- `src/features/builder/ChartPreviewPanel.jsx`
- `src/features/builder/ChartSavePanel.jsx`
- `src/features/builder/ChartSettingsPanel.jsx`
- `src/features/builder/ChartTypePicker.jsx`
- `src/features/builder/DropZone.jsx`
- `src/features/builder/FieldList.jsx`
- `src/features/builder/QueryModePanel.jsx`
- `src/styles/builder.css`
- `src/styles/workspacePolish.css`
- `src/components/ui/EnterpriseDataTable.test.jsx`
- `src/components/bi/CommandPaletteModal.test.jsx`

## Verification

```text
npm run build  passed
npm run lint   passed
npm test       passed
```

## Known Limitations

- User-generated names, field names, SQL keywords, and chart template metadata remain as stored data.
- Screenshot inventory was not regenerated in this sprint.
- Some lower-priority historical report files remain English because this sprint targeted production app UI and final release reports.

