# Merged duplicates

CSV escaping/export assembly previously existed independently in the legacy dashboard and Dashboard Designer V2. Both now delegate to `src/shared/lib/csvExport.js` while preserving each caller's existing header-quoting behavior.

The shared implementation also neutralizes spreadsheet formula prefixes for string cells at the export boundary. Imported and displayed dataset values are unchanged.

Commit: `d8b53c8`. Verification: shared CSV unit tests, Dashboard Designer tests, 56-file full suite and production build.
