
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "organizations" (
    "id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "external_user_id" VARCHAR(191) NOT NULL,
    "external_auth_provider" VARCHAR(80) NOT NULL,
    "email" VARCHAR(191) NOT NULL,
    "display_name" VARCHAR(180) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" VARCHAR(64) NOT NULL,
    "role_id" VARCHAR(64) NOT NULL,
    "permission_id" VARCHAR(64) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "role_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_projects" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "owner_user_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "bi_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_project_members" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "role" VARCHAR(32) NOT NULL DEFAULT 'viewer',

    CONSTRAINT "bi_project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_sheets" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "bi_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_contexts" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "active_project_id" VARCHAR(64),
    "active_sheet_id" VARCHAR(64),
    "active_dashboard_id" VARCHAR(64),
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspace_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bi_dashboards" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "sheet_id" VARCHAR(64),
    "name" VARCHAR(180) NOT NULL,
    "canvas_settings_json" JSONB,
    "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "bi_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_versions" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "dashboard_id" VARCHAR(64) NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "created_by" VARCHAR(64),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_widgets" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "dashboard_id" VARCHAR(64) NOT NULL,
    "chart_id" VARCHAR(64),
    "type" VARCHAR(40) NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "z_index" INTEGER NOT NULL DEFAULT 0,
    "config_json" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_views" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "dashboard_id" VARCHAR(64),
    "user_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "state_json" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_types" (
    "id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "renderer" VARCHAR(40) NOT NULL,
    "metadata_json" JSONB,

    CONSTRAINT "chart_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_type_requirements" (
    "id" VARCHAR(64) NOT NULL,
    "chart_type_id" VARCHAR(64) NOT NULL,
    "slot" VARCHAR(80) NOT NULL,
    "min_fields" INTEGER NOT NULL DEFAULT 0,
    "max_fields" INTEGER,
    "rules_json" JSONB,

    CONSTRAINT "chart_type_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_templates" (
    "id" VARCHAR(64) NOT NULL,
    "chart_type_id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "default_mapping_json" JSONB,
    "default_settings_json" JSONB,

    CONSTRAINT "chart_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charts" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "dataset_id" VARCHAR(64),
    "chart_type_id" VARCHAR(64),
    "name" VARCHAR(180) NOT NULL,
    "engine" VARCHAR(40) NOT NULL DEFAULT 'chartjs',
    "mapping_json" JSONB,
    "settings_json" JSONB,
    "filters_json" JSONB,
    "config_json" JSONB,
    "query_definition_json" JSONB,
    "data_contract_json" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "charts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_versions" (
    "id" VARCHAR(64) NOT NULL,
    "chart_id" VARCHAR(64) NOT NULL,
    "revision" INTEGER NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chart_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_source_types" (
    "id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "implementation" VARCHAR(40) NOT NULL DEFAULT 'not_implemented',
    "capabilities_json" JSONB,

    CONSTRAINT "data_source_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_source_connections" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "type_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "metadata_json" JSONB,
    "status" VARCHAR(32) NOT NULL DEFAULT 'untested',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "data_source_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_source_secret_references" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "connection_id" VARCHAR(64) NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "encrypted_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotated_at" TIMESTAMPTZ(3),

    CONSTRAINT "data_source_secret_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_source_test_runs" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "connection_id" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "duration_ms" INTEGER,
    "error_code" VARCHAR(80),
    "safe_message" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_source_test_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_source_schemas" (
    "id" VARCHAR(64) NOT NULL,
    "connection_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "discovered_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_source_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_source_tables" (
    "id" VARCHAR(64) NOT NULL,
    "connection_id" VARCHAR(64) NOT NULL,
    "schema_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "table_type" VARCHAR(40) NOT NULL,

    CONSTRAINT "data_source_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_source_columns" (
    "id" VARCHAR(64) NOT NULL,
    "table_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "data_type" VARCHAR(100) NOT NULL,
    "nullable" BOOLEAN NOT NULL DEFAULT true,
    "ordinal" INTEGER NOT NULL,

    CONSTRAINT "data_source_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "datasets" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "source_type" VARCHAR(40) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'processing',
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "field_count" INTEGER NOT NULL DEFAULT 0,
    "source_file_id" VARCHAR(64),
    "statistics_json" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_versions" (
    "id" VARCHAR(64) NOT NULL,
    "dataset_id" VARCHAR(64) NOT NULL,
    "version" INTEGER NOT NULL,
    "schema_json" JSONB NOT NULL,
    "row_count" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_fields" (
    "id" VARCHAR(64) NOT NULL,
    "dataset_id" VARCHAR(64) NOT NULL,
    "field_key" VARCHAR(191) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "label" VARCHAR(191),
    "data_type" VARCHAR(40) NOT NULL,
    "nullable" BOOLEAN NOT NULL DEFAULT true,
    "ordinal" INTEGER NOT NULL,
    "semantic_type" VARCHAR(80),

    CONSTRAINT "dataset_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_rows" (
    "id" BIGSERIAL NOT NULL,
    "dataset_id" VARCHAR(64) NOT NULL,
    "row_number" INTEGER NOT NULL,
    "row_json" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_statistics" (
    "id" VARCHAR(64) NOT NULL,
    "dataset_id" VARCHAR(64) NOT NULL,
    "field_id" VARCHAR(64),
    "statistic" VARCHAR(80) NOT NULL,
    "value_json" JSONB,
    "computed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_validation_results" (
    "id" VARCHAR(64) NOT NULL,
    "dataset_id" VARCHAR(64) NOT NULL,
    "field_id" VARCHAR(64),
    "severity" VARCHAR(20) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "details_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_validation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "dataset_id" VARCHAR(64),
    "file_id" VARCHAR(64),
    "idempotency_key" VARCHAR(128) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "processed_rows" INTEGER NOT NULL DEFAULT 0,
    "total_rows" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_job_rows" (
    "id" BIGSERIAL NOT NULL,
    "import_id" VARCHAR(64) NOT NULL,
    "row_number" INTEGER NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "error_code" VARCHAR(80),

    CONSTRAINT "import_job_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_errors" (
    "id" BIGSERIAL NOT NULL,
    "import_id" VARCHAR(64) NOT NULL,
    "row_number" INTEGER,
    "column_name" VARCHAR(191),
    "code" VARCHAR(80) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sql_queries" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "connection_id" VARCHAR(64),
    "dataset_id" VARCHAR(64),
    "name" VARCHAR(180) NOT NULL,
    "sql_text" TEXT NOT NULL,
    "parameters_json" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sql_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sql_query_runs" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "query_id" VARCHAR(64),
    "connection_id" VARCHAR(64),
    "dataset_id" VARCHAR(64),
    "sql_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "duration_ms" INTEGER,
    "row_count" INTEGER,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sql_query_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sql_query_results" (
    "id" VARCHAR(64) NOT NULL,
    "run_id" VARCHAR(64) NOT NULL,
    "row_count" INTEGER NOT NULL,
    "truncated" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sql_query_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sql_query_result_columns" (
    "id" VARCHAR(64) NOT NULL,
    "result_id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(191) NOT NULL,
    "data_type" VARCHAR(80) NOT NULL,
    "ordinal" INTEGER NOT NULL,

    CONSTRAINT "sql_query_result_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sql_query_result_rows" (
    "id" BIGSERIAL NOT NULL,
    "result_id" VARCHAR(64) NOT NULL,
    "row_number" INTEGER NOT NULL,
    "row_json" JSONB NOT NULL,

    CONSTRAINT "sql_query_result_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_share_links" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "dashboard_id" VARCHAR(64) NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "allowed_origins" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(3),
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_share_snapshots" (
    "id" VARCHAR(64) NOT NULL,
    "share_id" VARCHAR(64) NOT NULL,
    "dashboard_revision" INTEGER NOT NULL,
    "snapshot_json" JSONB NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_share_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_share_access_logs" (
    "id" BIGSERIAL NOT NULL,
    "share_id" VARCHAR(64) NOT NULL,
    "request_id" VARCHAR(64) NOT NULL,
    "origin" VARCHAR(255),
    "user_agent" VARCHAR(500),
    "outcome" VARCHAR(32) NOT NULL,
    "accessed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dashboard_share_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "embed_settings" (
    "id" VARCHAR(64) NOT NULL,
    "share_id" VARCHAR(64) NOT NULL,
    "show_header" BOOLEAN NOT NULL DEFAULT false,
    "theme" VARCHAR(20) NOT NULL DEFAULT 'auto',
    "options_json" JSONB,

    CONSTRAINT "embed_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64) NOT NULL,
    "requested_by" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(40) NOT NULL,
    "entity_id" VARCHAR(64) NOT NULL,
    "format" VARCHAR(20) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'pending',
    "options_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_files" (
    "id" VARCHAR(64) NOT NULL,
    "export_id" VARCHAR(64) NOT NULL,
    "file_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(64) NOT NULL,
    "locale" VARCHAR(20) NOT NULL DEFAULT 'th',
    "theme" VARCHAR(20) NOT NULL DEFAULT 'system',
    "density" VARCHAR(20) NOT NULL DEFAULT 'comfortable',
    "date_format" VARCHAR(40) NOT NULL DEFAULT 'MMM d, yyyy',
    "number_format" VARCHAR(40) NOT NULL DEFAULT 'compact',
    "preferences_json" JSONB,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" VARCHAR(64) NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64),
    "owner_user_id" VARCHAR(64) NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "storage_key" VARCHAR(500) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(120) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "checksum" CHAR(64) NOT NULL,
    "retention_until" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" VARCHAR(64) NOT NULL,
    "project_id" VARCHAR(64),
    "actor_user_id" VARCHAR(64),
    "request_id" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(80),
    "entity_id" VARCHAR(64),
    "action" VARCHAR(120) NOT NULL,
    "outcome" VARCHAR(32) NOT NULL,
    "metadata_json" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" VARCHAR(64),
    "request_id" VARCHAR(64) NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "safe_message" VARCHAR(500) NOT NULL,
    "metadata_json" JSONB,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_request_logs" (
    "id" BIGSERIAL NOT NULL,
    "organization_id" VARCHAR(64),
    "user_id" VARCHAR(64),
    "request_id" VARCHAR(64) NOT NULL,
    "method" VARCHAR(12) NOT NULL,
    "path" VARCHAR(500) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE INDEX "idx_user_profiles_org_email" ON "user_profiles"("organization_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_profiles_external" ON "user_profiles"("organization_id", "external_auth_provider", "external_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_roles_org_code" ON "roles"("organization_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "idx_role_permissions_permission" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_role_permissions" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_role" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_roles" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "idx_bi_projects_org_updated" ON "bi_projects"("organization_id", "updated_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_bi_projects_org_name" ON "bi_projects"("organization_id", "name");

-- CreateIndex
CREATE INDEX "idx_bi_project_members_org_user" ON "bi_project_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_bi_project_members" ON "bi_project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_bi_sheets_project_position" ON "bi_sheets"("project_id", "position", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_bi_sheets_project_name" ON "bi_sheets"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_workspace_contexts_org_user" ON "workspace_contexts"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_bi_dashboards_project_updated" ON "bi_dashboards"("project_id", "updated_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_dashboard_versions_revision" ON "dashboard_versions"("dashboard_id", "revision");

-- CreateIndex
CREATE INDEX "idx_dashboard_widgets_order" ON "dashboard_widgets"("dashboard_id", "z_index", "id");

-- CreateIndex
CREATE INDEX "idx_dashboard_widgets_chart" ON "dashboard_widgets"("chart_id");

-- CreateIndex
CREATE INDEX "idx_saved_views_project_user" ON "saved_views"("project_id", "user_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "chart_types_code_key" ON "chart_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_chart_type_requirements_slot" ON "chart_type_requirements"("chart_type_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "chart_templates_code_key" ON "chart_templates"("code");

-- CreateIndex
CREATE INDEX "idx_chart_templates_type" ON "chart_templates"("chart_type_id");

-- CreateIndex
CREATE INDEX "idx_charts_project_updated" ON "charts"("project_id", "updated_at", "id");

-- CreateIndex
CREATE INDEX "idx_charts_dataset" ON "charts"("dataset_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_chart_versions_revision" ON "chart_versions"("chart_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "data_source_types_code_key" ON "data_source_types"("code");

-- CreateIndex
CREATE INDEX "idx_data_source_connections_project" ON "data_source_connections"("project_id", "updated_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_data_source_secret_connection" ON "data_source_secret_references"("connection_id");

-- CreateIndex
CREATE INDEX "idx_data_source_test_runs_connection" ON "data_source_test_runs"("connection_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_data_source_schemas" ON "data_source_schemas"("connection_id", "name");

-- CreateIndex
CREATE INDEX "idx_data_source_tables_connection" ON "data_source_tables"("connection_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_data_source_tables" ON "data_source_tables"("schema_id", "name");

-- CreateIndex
CREATE INDEX "idx_data_source_columns_order" ON "data_source_columns"("table_id", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "uq_data_source_columns" ON "data_source_columns"("table_id", "name");

-- CreateIndex
CREATE INDEX "idx_datasets_project_updated" ON "datasets"("project_id", "updated_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_dataset_versions" ON "dataset_versions"("dataset_id", "version");

-- CreateIndex
CREATE INDEX "idx_dataset_fields_order" ON "dataset_fields"("dataset_id", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "uq_dataset_fields_key" ON "dataset_fields"("dataset_id", "field_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_dataset_rows_number" ON "dataset_rows"("dataset_id", "row_number");

-- CreateIndex
CREATE INDEX "idx_dataset_statistics_field" ON "dataset_statistics"("dataset_id", "field_id");

-- CreateIndex
CREATE INDEX "idx_dataset_validation_severity" ON "dataset_validation_results"("dataset_id", "severity");

-- CreateIndex
CREATE INDEX "idx_import_jobs_project" ON "import_jobs"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_import_jobs_idempotency" ON "import_jobs"("organization_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_import_job_rows" ON "import_job_rows"("import_id", "row_number");

-- CreateIndex
CREATE INDEX "idx_import_errors_row" ON "import_errors"("import_id", "row_number");

-- CreateIndex
CREATE INDEX "idx_sql_queries_project" ON "sql_queries"("project_id", "updated_at");

-- CreateIndex
CREATE INDEX "idx_sql_query_runs_project" ON "sql_query_runs"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "sql_query_results_run_id_key" ON "sql_query_results"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sql_query_result_columns" ON "sql_query_result_columns"("result_id", "ordinal");

-- CreateIndex
CREATE UNIQUE INDEX "uq_sql_query_result_rows" ON "sql_query_result_rows"("result_id", "row_number");

-- CreateIndex
CREATE UNIQUE INDEX "dashboard_share_links_token_hash_key" ON "dashboard_share_links"("token_hash");

-- CreateIndex
CREATE INDEX "idx_dashboard_share_links_dashboard" ON "dashboard_share_links"("dashboard_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_dashboard_share_snapshots_share" ON "dashboard_share_snapshots"("share_id");

-- CreateIndex
CREATE INDEX "idx_dashboard_share_access_logs_share" ON "dashboard_share_access_logs"("share_id", "accessed_at");

-- CreateIndex
CREATE UNIQUE INDEX "embed_settings_share_id_key" ON "embed_settings"("share_id");

-- CreateIndex
CREATE INDEX "idx_export_jobs_project" ON "export_jobs"("project_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_export_files" ON "export_files"("export_id", "file_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_preferences_org_user" ON "user_preferences"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");

-- CreateIndex
CREATE INDEX "idx_files_scope" ON "files"("organization_id", "project_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_org_time" ON "audit_logs"("organization_id", "occurred_at", "id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("organization_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_error_logs_time" ON "error_logs"("occurred_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "api_request_logs_request_id_key" ON "api_request_logs"("request_id");

-- CreateIndex
CREATE INDEX "idx_api_request_logs_org_time" ON "api_request_logs"("organization_id", "occurred_at", "id");

-- Physical foreign keys retained from the approved P0/Core relationship graph.
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bi_projects" ADD CONSTRAINT "bi_projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bi_projects" ADD CONSTRAINT "bi_projects_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bi_project_members" ADD CONSTRAINT "bi_project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bi_project_members" ADD CONSTRAINT "bi_project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bi_sheets" ADD CONSTRAINT "bi_sheets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_contexts" ADD CONSTRAINT "workspace_contexts_active_project_id_fkey" FOREIGN KEY ("active_project_id") REFERENCES "bi_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workspace_contexts" ADD CONSTRAINT "workspace_contexts_active_sheet_id_fkey" FOREIGN KEY ("active_sheet_id") REFERENCES "bi_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bi_dashboards" ADD CONSTRAINT "bi_dashboards_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bi_dashboards" ADD CONSTRAINT "bi_dashboards_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "bi_sheets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workspace_contexts" ADD CONSTRAINT "workspace_contexts_active_dashboard_id_fkey" FOREIGN KEY ("active_dashboard_id") REFERENCES "bi_dashboards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dashboard_versions" ADD CONSTRAINT "dashboard_versions_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "bi_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "bi_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_chart_id_fkey" FOREIGN KEY ("chart_id") REFERENCES "charts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "bi_dashboards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "saved_views" ADD CONSTRAINT "saved_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chart_type_requirements" ADD CONSTRAINT "chart_type_requirements_chart_type_id_fkey" FOREIGN KEY ("chart_type_id") REFERENCES "chart_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chart_templates" ADD CONSTRAINT "chart_templates_chart_type_id_fkey" FOREIGN KEY ("chart_type_id") REFERENCES "chart_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "charts" ADD CONSTRAINT "charts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "charts" ADD CONSTRAINT "charts_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "charts" ADD CONSTRAINT "charts_chart_type_id_fkey" FOREIGN KEY ("chart_type_id") REFERENCES "chart_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "chart_versions" ADD CONSTRAINT "chart_versions_chart_id_fkey" FOREIGN KEY ("chart_id") REFERENCES "charts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_source_connections" ADD CONSTRAINT "data_source_connections_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_source_connections" ADD CONSTRAINT "data_source_connections_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "data_source_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_source_secret_references" ADD CONSTRAINT "data_source_secret_references_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "data_source_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_source_test_runs" ADD CONSTRAINT "data_source_test_runs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "data_source_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_source_schemas" ADD CONSTRAINT "data_source_schemas_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "data_source_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_source_tables" ADD CONSTRAINT "data_source_tables_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "data_source_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_source_tables" ADD CONSTRAINT "data_source_tables_schema_id_fkey" FOREIGN KEY ("schema_id") REFERENCES "data_source_schemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "data_source_columns" ADD CONSTRAINT "data_source_columns_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "data_source_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dataset_versions" ADD CONSTRAINT "dataset_versions_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dataset_fields" ADD CONSTRAINT "dataset_fields_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dataset_rows" ADD CONSTRAINT "dataset_rows_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dataset_statistics" ADD CONSTRAINT "dataset_statistics_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dataset_statistics" ADD CONSTRAINT "dataset_statistics_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "dataset_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dataset_validation_results" ADD CONSTRAINT "dataset_validation_results_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dataset_validation_results" ADD CONSTRAINT "dataset_validation_results_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "dataset_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "import_job_rows" ADD CONSTRAINT "import_job_rows_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_errors" ADD CONSTRAINT "import_errors_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sql_queries" ADD CONSTRAINT "sql_queries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sql_queries" ADD CONSTRAINT "sql_queries_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "data_source_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sql_queries" ADD CONSTRAINT "sql_queries_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sql_query_runs" ADD CONSTRAINT "sql_query_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sql_query_runs" ADD CONSTRAINT "sql_query_runs_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "sql_queries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sql_query_runs" ADD CONSTRAINT "sql_query_runs_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "data_source_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sql_query_runs" ADD CONSTRAINT "sql_query_runs_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sql_query_results" ADD CONSTRAINT "sql_query_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "sql_query_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sql_query_result_columns" ADD CONSTRAINT "sql_query_result_columns_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "sql_query_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sql_query_result_rows" ADD CONSTRAINT "sql_query_result_rows_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "sql_query_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_share_links" ADD CONSTRAINT "dashboard_share_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_share_links" ADD CONSTRAINT "dashboard_share_links_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "bi_dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_share_snapshots" ADD CONSTRAINT "dashboard_share_snapshots_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "dashboard_share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "dashboard_share_access_logs" ADD CONSTRAINT "dashboard_share_access_logs_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "dashboard_share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "embed_settings" ADD CONSTRAINT "embed_settings_share_id_fkey" FOREIGN KEY ("share_id") REFERENCES "dashboard_share_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_files" ADD CONSTRAINT "export_files_export_id_fkey" FOREIGN KEY ("export_id") REFERENCES "export_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_files" ADD CONSTRAINT "export_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "files" ADD CONSTRAINT "files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "bi_projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PostgreSQL-specific indexes used by bounded dataset row queries.
CREATE INDEX "idx_dataset_rows_dataset_cursor" ON "dataset_rows" ("dataset_id", "id");
CREATE INDEX "idx_dataset_rows_row_json_gin" ON "dataset_rows" USING GIN ("row_json" jsonb_path_ops);

