# DashboardMiniBi Dataset Guide

## Overview

The Datasets area provides a local data catalog for the built-in demo dataset and locally imported CSV files.

Dataset capabilities:
- CSV upload.
- Preview.
- Validation.
- Column mapping metadata.
- Schema cards.
- Column statistics.
- Enterprise table preview with filtering, sorting, pagination, density modes, sticky header styling, and column visibility.

## Built-In Dataset

The app includes a mock sales dataset used by the dashboard and chart builder.

Files:
- `src/data/mockData.js`
- `src/data/mockSchema.js`

This dataset is available in mock/local mode without any backend.

## CSV Import Workflow

1. Open Datasets.
2. Select a `.csv` file.
3. Review detected rows, columns, warnings, and errors.
4. Edit the dataset name if needed.
5. Import the dataset.
6. Inspect schema, statistics, and preview rows.

## CSV Parsing

The parser supports:
- Comma, semicolon, and tab delimiter detection.
- Quoted values.
- Duplicate column warnings.
- Type inference for number, date, and category/text fields.
- UTF-8 BOM stripping.

Parsing uses a Web Worker when available and falls back to an asynchronous main-thread parser path if workers are unavailable.

## Type Inference

Field types are inferred from sample values:
- `number`: most sample values are numeric.
- `date`: most sample values parse as dates.
- `category`: default for non-numeric, non-date values.
- `text`: fallback for empty samples.

## Local Storage

Imported datasets are stored in browser localStorage. Large CSV files can exceed browser quota.

Recommended local release limits:
- Keep CSV files small enough for browser-local workflows.
- Avoid importing very large raw extracts.
- Prefer aggregated or sampled datasets for local demos.

## Recovery

If malformed imported dataset metadata is found, the app attempts to recover fields from row keys and adds a validation warning.

If localStorage is unavailable or quota is exceeded, the app shows a storage warning banner.

## Known Limits

- Imported datasets are local to the browser profile.
- No backend connectors are included in v1.0.
- No scheduled refresh is included in v1.0.
- Dataset sharing is not server-backed.
