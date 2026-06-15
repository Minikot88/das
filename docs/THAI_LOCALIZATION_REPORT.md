# Thai Localization Report

## Scope

Thai-first release polish was applied to the primary product surfaces:

- Global navigation, top header, command palette, workspace labels
- Dashboard canvas header, toolbar, filters, saved views, export/share modal, presentation mode
- Inspector panel tabs, sections, widget library, field/data/interaction labels
- Chart Builder shell, data explorer, chart picker, mapping, format, query, preview, and save panel
- Dataset catalog, CSV import workflow, schema/statistics panels, enterprise table
- Settings page, project creation modal strings via i18n, auth/home/share/chart i18n dictionaries

## Encoding Audit

The corrupted Thai translation object in `src/utils/i18n.js` was replaced with a clean Thai override dictionary and an English fallback for rare untranslated keys. Runtime mojibake detection remains available, but source mojibake literals were removed from active code paths.

Fixed source-level encoding issues:

- Replaced corrupted Thai literals in `src/utils/i18n.js`
- Replaced damaged chart picker glyphs in `src/features/builder/ChartTypePicker.jsx`
- Replaced literal mojibake detector characters with Unicode-safe detection in `src/utils/storage.js`

Audit command result:

```text
rg corrupted-character patterns src docs
No matches
```

## Remaining English

Some chart template names, technical SQL labels, dataset field names, and stored project/chart names may still appear in English because they are data values, identifiers, or user-generated content. These were not translated to preserve behavior and saved data.

## Verification

- `npm run build` passed
- `npm run lint` passed
- `npm test` passed

