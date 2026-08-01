BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

-- Managed source identifiers are deterministic and organization scoped.
-- User-created connections must never be able to impersonate one and inherit
-- its runtime-environment secret reference.
ALTER TABLE dashboard_core.data_source_connections
  ADD CONSTRAINT ck_data_source_connections_managed_identity
  CHECK (
    id NOT LIKE 'source-scopus-%'
    OR (
      id = 'source-scopus-' || md5(organization_id)
      AND project_id IS NULL
      AND type_id = 'source-type-postgresql'
      AND name = 'Scopus'
      AND read_only = true
      AND metadata_json @> '{"allowedSchemas":["scopus"]}'::jsonb
    )
  );

COMMIT;
