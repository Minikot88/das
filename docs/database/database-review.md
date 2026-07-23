# Database Design Review

## Source and scope

The attached `database_design.xlsx` is preserved unchanged as `database_design_source.xlsx` (SHA-256 `A18A90308C43C5C069957853974ECE9FF36B54CC733DF210C280C11ABE5514EB`). It contains 19 modules, 152 tables, 2,797 column rows, 945 relationship rows, 1,258 indexes, 1,539 constraints, 183 enum/status rows, and 304 draft DDL statements.

The workbook's 92% figure measures documentation coverage, not production verification. Its own README records that no MySQL/MariaDB dry-run had been performed.

## Structural QA results

- No duplicate table names, duplicate columns within a table, missing primary keys, invalid snake_case identifiers, or reserved identifiers were found.
- The 930 physical FK rows resolve to existing columns with matching type and required/nullability semantics.
- Fifteen `POLY-*` rows point to `multiple_entity_tables.id` and use compound pseudo-column names such as `reference_table/reference_id`. They are logical application relationships, not valid physical foreign keys.
- 168 index pairs have a left-prefix relationship and require query-based reduction.
- 135 single-column status/audit indexes are low-selectivity or blanket audit-reference indexes. They are excluded unless a scoped query pattern demonstrates value.
- 1,469 Data Dictionary rows repeat validation tokens such as `NOT NULL; PRIMARY KEY` three times. The Approved workbook deduplicates these tokens.
- Fifteen original open questions are resolved by the decision register supplied in the implementation brief; database dry-run remains pending until the migration milestone.

## Production scope decision

The 152-table draft is intentionally not implemented wholesale:

| Classification | Tables | Treatment |
| --- | ---: | --- |
| P0 Core | 51 | Required by current frontend or production/security boundary |
| P1 Production Extension | 36 | Design retained; migration deferred until a corresponding workflow is implemented |
| P2 Enterprise Future | 40 | Documentation only; no service/API now |
| Rejected or merged | 18 | Consolidated into current aggregate JSON/reference columns or shared audit tables |
| Development sample | 7 | Excluded from production; explicit development seed flag only |

The P0 count is a design inventory. The migration may consolidate source-table concepts further where `migration-map.csv` names the approved target, while preserving current public entity semantics.

## Index and constraint policy

Approved indexes retain primary/unique keys, physical FK support, and tenant-scoped list/query patterns. Blanket indexes on every audit column and redundant left-prefix indexes are not automatically migrated. Query-driven indexes for dataset pagination, project lists, dashboard/widget ordering, share token lookup, audit timelines, and connector/query runs are added explicitly in migrations.

Constraints enforce tenant ownership, physical references, unique business keys, revision non-negativity, widget geometry, share expiry/revocation consistency, and bounded row identifiers where supported by MariaDB 11.4. Polymorphic ownership and cross-project references are validated in application services.

## Approved artifacts

- `database_design_approved.xlsx` includes table/column approval metadata and six implementation sheets.
- `schema-manifest.json` is the review manifest for automated validation and drift checks.
- CSV exports provide machine-readable tables, columns, physical relationships, reduced approved indexes, constraints, enums, scope, and migration mapping.
- `scripts/database/validate-data-dictionary.mjs` validates static consistency without requiring Excel.

Database verification fields remain `NO` until the MariaDB empty-schema migration, seed, and schema drift checks pass.
