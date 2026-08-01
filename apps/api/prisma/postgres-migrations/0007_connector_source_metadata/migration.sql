BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

ALTER TABLE dashboard_core.data_source_connections
  ALTER COLUMN project_id DROP NOT NULL,
  ADD COLUMN host varchar(255),
  ADD COLUMN port integer,
  ADD COLUMN database_name varchar(191),
  ADD COLUMN connection_options_json jsonb,
  ADD COLUMN mode varchar(20) NOT NULL DEFAULT 'live',
  ADD COLUMN read_only boolean NOT NULL DEFAULT true,
  ADD CONSTRAINT ck_data_source_connections_port
    CHECK (port IS NULL OR port BETWEEN 1 AND 65535),
  ADD CONSTRAINT ck_data_source_connections_mode
    CHECK (mode IN ('live', 'snapshot'));

CREATE INDEX idx_data_source_connections_org_status
  ON dashboard_core.data_source_connections (organization_id, status, updated_at, id);

ALTER TABLE dashboard_core.data_source_secret_references
  ADD COLUMN secret_ref varchar(255),
  ALTER COLUMN encrypted_json DROP NOT NULL,
  ADD CONSTRAINT ck_data_source_secret_material
    CHECK (secret_ref IS NOT NULL OR encrypted_json IS NOT NULL);

ALTER TABLE dashboard_core.data_source_schemas
  ADD COLUMN read_only boolean NOT NULL DEFAULT true,
  ADD COLUMN table_policy_json jsonb,
  ADD COLUMN refreshed_at timestamptz(3) NOT NULL DEFAULT now();

ALTER TABLE dashboard_core.data_source_tables
  ADD COLUMN estimated_rows bigint,
  ADD COLUMN metadata_json jsonb,
  ADD COLUMN refreshed_at timestamptz(3) NOT NULL DEFAULT now();

ALTER TABLE dashboard_core.data_source_columns
  ADD COLUMN primary_key boolean NOT NULL DEFAULT false,
  ADD COLUMN foreign_key boolean NOT NULL DEFAULT false,
  ADD COLUMN refreshed_at timestamptz(3) NOT NULL DEFAULT now();

CREATE TABLE dashboard_core.data_source_relationships (
  id varchar(64) PRIMARY KEY,
  connection_id varchar(64) NOT NULL,
  constraint_name varchar(191) NOT NULL,
  left_schema varchar(191) NOT NULL,
  left_table varchar(191) NOT NULL,
  left_column varchar(191) NOT NULL,
  right_schema varchar(191) NOT NULL,
  right_table varchar(191) NOT NULL,
  right_column varchar(191) NOT NULL,
  relationship_type varchar(40) NOT NULL DEFAULT 'foreign_key',
  refreshed_at timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT data_source_relationships_connection_id_fkey
    FOREIGN KEY (connection_id)
    REFERENCES dashboard_core.data_source_connections(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_data_source_relationships_constraint
    UNIQUE (connection_id, constraint_name, left_column)
);

CREATE INDEX idx_data_source_relationships_left
  ON dashboard_core.data_source_relationships (connection_id, left_schema, left_table);
CREATE INDEX idx_data_source_relationships_right
  ON dashboard_core.data_source_relationships (connection_id, right_schema, right_table);

ALTER TABLE dashboard_core.datasets
  ADD COLUMN data_source_id varchar(64),
  ADD COLUMN source_mode varchar(20) NOT NULL DEFAULT 'imported',
  ADD CONSTRAINT ck_datasets_source_mode
    CHECK (source_mode IN ('imported', 'live', 'snapshot')),
  ADD CONSTRAINT datasets_data_source_id_fkey
    FOREIGN KEY (data_source_id)
    REFERENCES dashboard_core.data_source_connections(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE dashboard_core.datasets
SET source_mode = CASE
  WHEN source_type = 'postgres_schema' THEN 'live'
  WHEN source_type IN ('snapshot', 'cached_result') THEN 'snapshot'
  ELSE 'imported'
END;

CREATE INDEX idx_datasets_source_updated
  ON dashboard_core.datasets (data_source_id, updated_at, id);

INSERT INTO dashboard_core.data_source_types
  (id, code, name, implementation, capabilities_json)
VALUES
  ('source-type-postgresql', 'postgresql', 'PostgreSQL', 'available',
    '{"structuredQuery":true,"relationships":true,"live":true}'::jsonb),
  ('source-type-mysql', 'mysql', 'MySQL', 'not_implemented', '{"structuredQuery":false}'::jsonb),
  ('source-type-mariadb', 'mariadb', 'MariaDB', 'not_implemented', '{"structuredQuery":false}'::jsonb),
  ('source-type-sqlserver', 'sqlserver', 'SQL Server', 'not_implemented', '{"structuredQuery":false}'::jsonb),
  ('source-type-oracle', 'oracle', 'Oracle', 'not_implemented', '{"structuredQuery":false}'::jsonb),
  ('source-type-sqlite', 'sqlite', 'SQLite', 'not_implemented', '{"structuredQuery":false}'::jsonb),
  ('source-type-mongodb', 'mongodb', 'MongoDB', 'not_implemented', '{"structuredQuery":false}'::jsonb),
  ('source-type-csv', 'csv', 'CSV', 'available', '{"imported":true,"live":false}'::jsonb)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    implementation = EXCLUDED.implementation,
    capabilities_json = EXCLUDED.capabilities_json;

-- Register the existing Scopus schema as an organization-scoped PostgreSQL
-- live source. The secret is resolved from the runtime DATABASE_URL and is
-- never copied into application tables.
INSERT INTO dashboard_core.data_source_connections (
  id, organization_id, project_id, type_id, name, host, port, database_name,
  connection_options_json, mode, read_only, metadata_json, status, revision,
  created_at, updated_at
)
SELECT
  'source-scopus-' || md5(o.id),
  o.id,
  NULL,
  'source-type-postgresql',
  'Scopus',
  NULL,
  5432,
  current_database(),
  '{"credentialSource":"runtime_database_url"}'::jsonb,
  'live',
  true,
  '{"allowedSchemas":["scopus"]}'::jsonb,
  'ready',
  1,
  now(),
  now()
FROM dashboard_core.organizations o
WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'scopus')
ON CONFLICT (id) DO NOTHING;

INSERT INTO dashboard_core.data_source_secret_references (
  id, organization_id, connection_id, provider, secret_ref, key_version,
  encrypted_json, created_at
)
SELECT
  'secret-scopus-' || md5(c.organization_id),
  c.organization_id,
  c.id,
  'runtime_environment',
  'DATABASE_URL',
  1,
  NULL,
  now()
FROM dashboard_core.data_source_connections c
WHERE c.id LIKE 'source-scopus-%'
ON CONFLICT (connection_id) DO NOTHING;

INSERT INTO dashboard_core.data_source_schemas (
  id, connection_id, name, read_only, table_policy_json, discovered_at, refreshed_at
)
SELECT
  'source-schema-' || md5(c.id || ':scopus'),
  c.id,
  'scopus',
  true,
  '{"mode":"all"}'::jsonb,
  now(),
  now()
FROM dashboard_core.data_source_connections c
WHERE c.id LIKE 'source-scopus-%'
ON CONFLICT (connection_id, name) DO UPDATE
SET read_only = true, table_policy_json = EXCLUDED.table_policy_json, refreshed_at = now();

INSERT INTO dashboard_core.data_source_tables (
  id, connection_id, schema_id, name, table_type, estimated_rows, metadata_json, refreshed_at
)
SELECT
  'source-table-' || md5(s.connection_id || ':scopus:' || cls.relname),
  s.connection_id,
  s.id,
  cls.relname,
  CASE cls.relkind WHEN 'v' THEN 'view' WHEN 'm' THEN 'materialized_view' ELSE 'table' END,
  greatest(cls.reltuples::bigint, 0),
  jsonb_build_object('relationKind', cls.relkind::text),
  now()
FROM dashboard_core.data_source_schemas s
JOIN pg_namespace ns ON ns.nspname = s.name
JOIN pg_class cls ON cls.relnamespace = ns.oid AND cls.relkind IN ('r', 'p', 'v', 'm')
WHERE s.name = 'scopus'
ON CONFLICT (schema_id, name) DO UPDATE
SET table_type = EXCLUDED.table_type,
    estimated_rows = EXCLUDED.estimated_rows,
    metadata_json = EXCLUDED.metadata_json,
    refreshed_at = now();

INSERT INTO dashboard_core.data_source_columns (
  id, table_id, name, data_type, nullable, ordinal, primary_key, foreign_key, refreshed_at
)
SELECT
  'source-column-' || md5(t.id || ':' || att.attname),
  t.id,
  att.attname,
  format_type(att.atttypid, att.atttypmod),
  NOT att.attnotnull,
  att.attnum,
  EXISTS (
    SELECT 1 FROM pg_index idx
    WHERE idx.indrelid = cls.oid AND idx.indisprimary AND att.attnum = ANY(idx.indkey)
  ),
  EXISTS (
    SELECT 1 FROM pg_constraint con
    WHERE con.conrelid = cls.oid AND con.contype = 'f' AND att.attnum = ANY(con.conkey)
  ),
  now()
FROM dashboard_core.data_source_tables t
JOIN dashboard_core.data_source_schemas s ON s.id = t.schema_id
JOIN pg_namespace ns ON ns.nspname = s.name
JOIN pg_class cls ON cls.relnamespace = ns.oid AND cls.relname = t.name
JOIN pg_attribute att ON att.attrelid = cls.oid AND att.attnum > 0 AND NOT att.attisdropped
WHERE s.name = 'scopus'
ON CONFLICT (table_id, name) DO UPDATE
SET data_type = EXCLUDED.data_type,
    nullable = EXCLUDED.nullable,
    ordinal = EXCLUDED.ordinal,
    primary_key = EXCLUDED.primary_key,
    foreign_key = EXCLUDED.foreign_key,
    refreshed_at = now();

INSERT INTO dashboard_core.data_source_relationships (
  id, connection_id, constraint_name, left_schema, left_table, left_column,
  right_schema, right_table, right_column, relationship_type, refreshed_at
)
SELECT
  'source-relation-' || md5(s.connection_id || ':' || con.conname || ':' || child_att.attname),
  s.connection_id,
  con.conname,
  child_ns.nspname,
  child.relname,
  child_att.attname,
  parent_ns.nspname,
  parent.relname,
  parent_att.attname,
  'foreign_key',
  now()
FROM dashboard_core.data_source_schemas s
JOIN pg_namespace child_ns ON child_ns.nspname = s.name
JOIN pg_class child ON child.relnamespace = child_ns.oid
JOIN pg_constraint con ON con.conrelid = child.oid AND con.contype = 'f'
JOIN pg_class parent ON parent.oid = con.confrelid
JOIN pg_namespace parent_ns ON parent_ns.oid = parent.relnamespace
JOIN LATERAL unnest(con.conkey, con.confkey)
  WITH ORDINALITY keys(child_attnum, parent_attnum, ordinality) ON true
JOIN pg_attribute child_att
  ON child_att.attrelid = child.oid AND child_att.attnum = keys.child_attnum
JOIN pg_attribute parent_att
  ON parent_att.attrelid = parent.oid AND parent_att.attnum = keys.parent_attnum
WHERE s.name = 'scopus'
ON CONFLICT (connection_id, constraint_name, left_column) DO UPDATE
SET right_schema = EXCLUDED.right_schema,
    right_table = EXCLUDED.right_table,
    right_column = EXCLUDED.right_column,
    refreshed_at = now();

COMMIT;
