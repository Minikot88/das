-- CreateTable
CREATE TABLE `organizations` (
    `id` VARCHAR(64) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `organizations_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `external_user_id` VARCHAR(191) NOT NULL,
    `external_auth_provider` VARCHAR(80) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `display_name` VARCHAR(180) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_user_profiles_org_email`(`organization_id`, `email`),
    UNIQUE INDEX `uq_user_profiles_external`(`organization_id`, `external_auth_provider`, `external_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `uq_roles_org_code`(`organization_id`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(64) NOT NULL,
    `code` VARCHAR(120) NOT NULL,
    `description` VARCHAR(255) NULL,

    UNIQUE INDEX `permissions_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` VARCHAR(64) NOT NULL,
    `role_id` VARCHAR(64) NOT NULL,
    `permission_id` VARCHAR(64) NOT NULL,

    INDEX `idx_role_permissions_permission`(`permission_id`),
    UNIQUE INDEX `uq_role_permissions`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_roles` (
    `id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `role_id` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_user_roles_role`(`role_id`),
    UNIQUE INDEX `uq_user_roles`(`user_id`, `role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bi_projects` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `owner_user_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `idx_bi_projects_org_updated`(`organization_id`, `updated_at`, `id`),
    UNIQUE INDEX `uq_bi_projects_org_name`(`organization_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bi_project_members` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `role` VARCHAR(32) NOT NULL DEFAULT 'viewer',

    INDEX `idx_bi_project_members_org_user`(`organization_id`, `user_id`),
    UNIQUE INDEX `uq_bi_project_members`(`project_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bi_sheets` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_bi_sheets_project_position`(`project_id`, `position`, `id`),
    UNIQUE INDEX `uq_bi_sheets_project_name`(`project_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workspace_contexts` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `active_project_id` VARCHAR(64) NULL,
    `active_sheet_id` VARCHAR(64) NULL,
    `active_dashboard_id` VARCHAR(64) NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_workspace_contexts_org_user`(`organization_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bi_dashboards` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `sheet_id` VARCHAR(64) NULL,
    `name` VARCHAR(180) NOT NULL,
    `canvas_settings_json` JSON NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `idx_bi_dashboards_project_updated`(`project_id`, `updated_at`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_versions` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `dashboard_id` VARCHAR(64) NOT NULL,
    `revision` INTEGER NOT NULL,
    `snapshot_json` JSON NOT NULL,
    `created_by` VARCHAR(64) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_dashboard_versions_revision`(`dashboard_id`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_widgets` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `dashboard_id` VARCHAR(64) NOT NULL,
    `chart_id` VARCHAR(64) NULL,
    `type` VARCHAR(40) NOT NULL,
    `x` INTEGER NOT NULL,
    `y` INTEGER NOT NULL,
    `width` INTEGER NOT NULL,
    `height` INTEGER NOT NULL,
    `z_index` INTEGER NOT NULL DEFAULT 0,
    `config_json` JSON NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_dashboard_widgets_order`(`dashboard_id`, `z_index`, `id`),
    INDEX `idx_dashboard_widgets_chart`(`chart_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_views` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `dashboard_id` VARCHAR(64) NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `state_json` JSON NOT NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_saved_views_project_user`(`project_id`, `user_id`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chart_types` (
    `id` VARCHAR(64) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `renderer` VARCHAR(40) NOT NULL,
    `metadata_json` JSON NULL,

    UNIQUE INDEX `chart_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chart_type_requirements` (
    `id` VARCHAR(64) NOT NULL,
    `chart_type_id` VARCHAR(64) NOT NULL,
    `slot` VARCHAR(80) NOT NULL,
    `min_fields` INTEGER NOT NULL DEFAULT 0,
    `max_fields` INTEGER NULL,
    `rules_json` JSON NULL,

    UNIQUE INDEX `uq_chart_type_requirements_slot`(`chart_type_id`, `slot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chart_templates` (
    `id` VARCHAR(64) NOT NULL,
    `chart_type_id` VARCHAR(64) NOT NULL,
    `code` VARCHAR(100) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `default_mapping_json` JSON NULL,
    `default_settings_json` JSON NULL,

    UNIQUE INDEX `chart_templates_code_key`(`code`),
    INDEX `idx_chart_templates_type`(`chart_type_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `charts` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `dataset_id` VARCHAR(64) NULL,
    `chart_type_id` VARCHAR(64) NULL,
    `name` VARCHAR(180) NOT NULL,
    `engine` VARCHAR(40) NOT NULL DEFAULT 'chartjs',
    `mapping_json` JSON NULL,
    `settings_json` JSON NULL,
    `filters_json` JSON NULL,
    `config_json` JSON NULL,
    `query_definition_json` JSON NULL,
    `data_contract_json` JSON NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `idx_charts_project_updated`(`project_id`, `updated_at`, `id`),
    INDEX `idx_charts_dataset`(`dataset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chart_versions` (
    `id` VARCHAR(64) NOT NULL,
    `chart_id` VARCHAR(64) NOT NULL,
    `revision` INTEGER NOT NULL,
    `snapshot_json` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_chart_versions_revision`(`chart_id`, `revision`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_source_types` (
    `id` VARCHAR(64) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `implementation` VARCHAR(40) NOT NULL DEFAULT 'not_implemented',
    `capabilities_json` JSON NULL,

    UNIQUE INDEX `data_source_types_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_source_connections` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `type_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `metadata_json` JSON NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'untested',
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `idx_data_source_connections_project`(`project_id`, `updated_at`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_source_secret_references` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `connection_id` VARCHAR(64) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `key_version` INTEGER NOT NULL DEFAULT 1,
    `encrypted_json` LONGTEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `rotated_at` DATETIME(3) NULL,

    UNIQUE INDEX `uq_data_source_secret_connection`(`connection_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_source_test_runs` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `connection_id` VARCHAR(64) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `duration_ms` INTEGER NULL,
    `error_code` VARCHAR(80) NULL,
    `safe_message` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_data_source_test_runs_connection`(`connection_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_source_schemas` (
    `id` VARCHAR(64) NOT NULL,
    `connection_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `discovered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_data_source_schemas`(`connection_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_source_tables` (
    `id` VARCHAR(64) NOT NULL,
    `connection_id` VARCHAR(64) NOT NULL,
    `schema_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `table_type` VARCHAR(40) NOT NULL,

    INDEX `idx_data_source_tables_connection`(`connection_id`),
    UNIQUE INDEX `uq_data_source_tables`(`schema_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `data_source_columns` (
    `id` VARCHAR(64) NOT NULL,
    `table_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `data_type` VARCHAR(100) NOT NULL,
    `nullable` BOOLEAN NOT NULL DEFAULT true,
    `ordinal` INTEGER NOT NULL,

    INDEX `idx_data_source_columns_order`(`table_id`, `ordinal`),
    UNIQUE INDEX `uq_data_source_columns`(`table_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `datasets` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(180) NOT NULL,
    `source_type` VARCHAR(40) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'processing',
    `row_count` INTEGER NOT NULL DEFAULT 0,
    `field_count` INTEGER NOT NULL DEFAULT 0,
    `source_file_id` VARCHAR(64) NULL,
    `statistics_json` JSON NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `idx_datasets_project_updated`(`project_id`, `updated_at`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dataset_versions` (
    `id` VARCHAR(64) NOT NULL,
    `dataset_id` VARCHAR(64) NOT NULL,
    `version` INTEGER NOT NULL,
    `schema_json` JSON NOT NULL,
    `row_count` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_dataset_versions`(`dataset_id`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dataset_fields` (
    `id` VARCHAR(64) NOT NULL,
    `dataset_id` VARCHAR(64) NOT NULL,
    `field_key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `data_type` VARCHAR(40) NOT NULL,
    `nullable` BOOLEAN NOT NULL DEFAULT true,
    `ordinal` INTEGER NOT NULL,
    `semantic_type` VARCHAR(80) NULL,

    INDEX `idx_dataset_fields_order`(`dataset_id`, `ordinal`),
    UNIQUE INDEX `uq_dataset_fields_key`(`dataset_id`, `field_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dataset_rows` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `dataset_id` VARCHAR(64) NOT NULL,
    `row_number` INTEGER NOT NULL,
    `row_json` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_dataset_rows_number`(`dataset_id`, `row_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dataset_statistics` (
    `id` VARCHAR(64) NOT NULL,
    `dataset_id` VARCHAR(64) NOT NULL,
    `field_id` VARCHAR(64) NULL,
    `statistic` VARCHAR(80) NOT NULL,
    `value_json` JSON NULL,
    `computed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_dataset_statistics_field`(`dataset_id`, `field_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dataset_validation_results` (
    `id` VARCHAR(64) NOT NULL,
    `dataset_id` VARCHAR(64) NOT NULL,
    `field_id` VARCHAR(64) NULL,
    `severity` VARCHAR(20) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `details_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_dataset_validation_severity`(`dataset_id`, `severity`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_jobs` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `dataset_id` VARCHAR(64) NULL,
    `file_id` VARCHAR(64) NULL,
    `idempotency_key` VARCHAR(128) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
    `processed_rows` INTEGER NOT NULL DEFAULT 0,
    `total_rows` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `idx_import_jobs_project`(`project_id`, `created_at`),
    UNIQUE INDEX `uq_import_jobs_idempotency`(`organization_id`, `idempotency_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_job_rows` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `import_id` VARCHAR(64) NOT NULL,
    `row_number` INTEGER NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `error_code` VARCHAR(80) NULL,

    UNIQUE INDEX `uq_import_job_rows`(`import_id`, `row_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `import_errors` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `import_id` VARCHAR(64) NOT NULL,
    `row_number` INTEGER NULL,
    `column_name` VARCHAR(191) NULL,
    `code` VARCHAR(80) NOT NULL,
    `message` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_import_errors_row`(`import_id`, `row_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sql_queries` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `connection_id` VARCHAR(64) NULL,
    `dataset_id` VARCHAR(64) NULL,
    `name` VARCHAR(180) NOT NULL,
    `sql_text` LONGTEXT NOT NULL,
    `parameters_json` JSON NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `idx_sql_queries_project`(`project_id`, `updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sql_query_runs` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `query_id` VARCHAR(64) NULL,
    `connection_id` VARCHAR(64) NULL,
    `dataset_id` VARCHAR(64) NULL,
    `sql_hash` CHAR(64) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `duration_ms` INTEGER NULL,
    `row_count` INTEGER NULL,
    `truncated` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_sql_query_runs_project`(`project_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sql_query_results` (
    `id` VARCHAR(64) NOT NULL,
    `run_id` VARCHAR(64) NOT NULL,
    `row_count` INTEGER NOT NULL,
    `truncated` BOOLEAN NOT NULL DEFAULT false,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sql_query_results_run_id_key`(`run_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sql_query_result_columns` (
    `id` VARCHAR(64) NOT NULL,
    `result_id` VARCHAR(64) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `data_type` VARCHAR(80) NOT NULL,
    `ordinal` INTEGER NOT NULL,

    UNIQUE INDEX `uq_sql_query_result_columns`(`result_id`, `ordinal`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sql_query_result_rows` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `result_id` VARCHAR(64) NOT NULL,
    `row_number` INTEGER NOT NULL,
    `row_json` JSON NOT NULL,

    UNIQUE INDEX `uq_sql_query_result_rows`(`result_id`, `row_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_share_links` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `dashboard_id` VARCHAR(64) NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `allowed_origins` JSON NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NULL,
    `revoked_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `dashboard_share_links_token_hash_key`(`token_hash`),
    INDEX `idx_dashboard_share_links_dashboard`(`dashboard_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_share_snapshots` (
    `id` VARCHAR(64) NOT NULL,
    `share_id` VARCHAR(64) NOT NULL,
    `dashboard_revision` INTEGER NOT NULL,
    `snapshot_json` JSON NOT NULL,
    `checksum` CHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_dashboard_share_snapshots_share`(`share_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dashboard_share_access_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `share_id` VARCHAR(64) NOT NULL,
    `request_id` VARCHAR(64) NOT NULL,
    `origin` VARCHAR(255) NULL,
    `user_agent` VARCHAR(500) NULL,
    `outcome` VARCHAR(32) NOT NULL,
    `accessed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_dashboard_share_access_logs_share`(`share_id`, `accessed_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `embed_settings` (
    `id` VARCHAR(64) NOT NULL,
    `share_id` VARCHAR(64) NOT NULL,
    `show_header` BOOLEAN NOT NULL DEFAULT false,
    `theme` VARCHAR(20) NOT NULL DEFAULT 'auto',
    `options_json` JSON NULL,

    UNIQUE INDEX `embed_settings_share_id_key`(`share_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `export_jobs` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NOT NULL,
    `requested_by` VARCHAR(64) NOT NULL,
    `entity_type` VARCHAR(40) NOT NULL,
    `entity_id` VARCHAR(64) NOT NULL,
    `format` VARCHAR(20) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
    `options_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_at` DATETIME(3) NULL,

    INDEX `idx_export_jobs_project`(`project_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `export_files` (
    `id` VARCHAR(64) NOT NULL,
    `export_id` VARCHAR(64) NOT NULL,
    `file_id` VARCHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_export_files`(`export_id`, `file_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_preferences` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `user_id` VARCHAR(64) NOT NULL,
    `locale` VARCHAR(20) NOT NULL DEFAULT 'th',
    `theme` VARCHAR(20) NOT NULL DEFAULT 'system',
    `density` VARCHAR(20) NOT NULL DEFAULT 'comfortable',
    `date_format` VARCHAR(40) NOT NULL DEFAULT 'MMM d, yyyy',
    `number_format` VARCHAR(40) NOT NULL DEFAULT 'compact',
    `preferences_json` JSON NULL,
    `revision` INTEGER NOT NULL DEFAULT 0,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `uq_user_preferences_org_user`(`organization_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` VARCHAR(64) NOT NULL,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NULL,
    `owner_user_id` VARCHAR(64) NOT NULL,
    `provider` VARCHAR(40) NOT NULL,
    `storage_key` VARCHAR(500) NOT NULL,
    `filename` VARCHAR(255) NOT NULL,
    `mime_type` VARCHAR(120) NOT NULL,
    `size_bytes` BIGINT UNSIGNED NOT NULL,
    `checksum` CHAR(64) NOT NULL,
    `retention_until` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `files_storage_key_key`(`storage_key`),
    INDEX `idx_files_scope`(`organization_id`, `project_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `organization_id` VARCHAR(64) NOT NULL,
    `project_id` VARCHAR(64) NULL,
    `actor_user_id` VARCHAR(64) NULL,
    `request_id` VARCHAR(64) NOT NULL,
    `entity_type` VARCHAR(80) NULL,
    `entity_id` VARCHAR(64) NULL,
    `action` VARCHAR(120) NOT NULL,
    `outcome` VARCHAR(32) NOT NULL,
    `metadata_json` JSON NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_audit_logs_org_time`(`organization_id`, `occurred_at`, `id`),
    INDEX `idx_audit_logs_entity`(`organization_id`, `entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `error_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `organization_id` VARCHAR(64) NULL,
    `request_id` VARCHAR(64) NOT NULL,
    `code` VARCHAR(80) NOT NULL,
    `safe_message` VARCHAR(500) NOT NULL,
    `metadata_json` JSON NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_error_logs_time`(`occurred_at`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_request_logs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `organization_id` VARCHAR(64) NULL,
    `user_id` VARCHAR(64) NULL,
    `request_id` VARCHAR(64) NOT NULL,
    `method` VARCHAR(12) NOT NULL,
    `path` VARCHAR(500) NOT NULL,
    `status_code` INTEGER NOT NULL,
    `duration_ms` INTEGER NOT NULL,
    `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `api_request_logs_request_id_key`(`request_id`),
    INDEX `idx_api_request_logs_org_time`(`organization_id`, `occurred_at`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Production ownership and reference constraints are named explicitly so
-- migration verification can distinguish tenant boundaries from logical links.
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_ibfk_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `roles` ADD CONSTRAINT `roles_ibfk_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_ibfk_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_ibfk_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_ibfk_user` FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_ibfk_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `bi_projects` ADD CONSTRAINT `bi_projects_ibfk_org` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `bi_projects` ADD CONSTRAINT `bi_projects_ibfk_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `user_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `bi_project_members` ADD CONSTRAINT `bi_project_members_ibfk_project` FOREIGN KEY (`project_id`) REFERENCES `bi_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `bi_project_members` ADD CONSTRAINT `bi_project_members_ibfk_user` FOREIGN KEY (`user_id`) REFERENCES `user_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `bi_sheets` ADD CONSTRAINT `bi_sheets_ibfk_project` FOREIGN KEY (`project_id`) REFERENCES `bi_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `bi_dashboards` ADD CONSTRAINT `bi_dashboards_ibfk_project` FOREIGN KEY (`project_id`) REFERENCES `bi_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `bi_dashboards` ADD CONSTRAINT `bi_dashboards_ibfk_sheet` FOREIGN KEY (`sheet_id`) REFERENCES `bi_sheets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `dashboard_versions` ADD CONSTRAINT `dashboard_versions_ibfk_dashboard` FOREIGN KEY (`dashboard_id`) REFERENCES `bi_dashboards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dashboard_widgets` ADD CONSTRAINT `dashboard_widgets_ibfk_dashboard` FOREIGN KEY (`dashboard_id`) REFERENCES `bi_dashboards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `saved_views` ADD CONSTRAINT `saved_views_ibfk_project` FOREIGN KEY (`project_id`) REFERENCES `bi_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `chart_type_requirements` ADD CONSTRAINT `chart_type_requirements_ibfk_type` FOREIGN KEY (`chart_type_id`) REFERENCES `chart_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `chart_templates` ADD CONSTRAINT `chart_templates_ibfk_type` FOREIGN KEY (`chart_type_id`) REFERENCES `chart_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `datasets` ADD CONSTRAINT `datasets_ibfk_project` FOREIGN KEY (`project_id`) REFERENCES `bi_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dataset_versions` ADD CONSTRAINT `dataset_versions_ibfk_dataset` FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dataset_fields` ADD CONSTRAINT `dataset_fields_ibfk_dataset` FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dataset_rows` ADD CONSTRAINT `dataset_rows_ibfk_dataset` FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dataset_statistics` ADD CONSTRAINT `dataset_statistics_ibfk_dataset` FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dataset_validation_results` ADD CONSTRAINT `dataset_validation_ibfk_dataset` FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `charts` ADD CONSTRAINT `charts_ibfk_project` FOREIGN KEY (`project_id`) REFERENCES `bi_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `charts` ADD CONSTRAINT `charts_ibfk_dataset` FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `chart_versions` ADD CONSTRAINT `chart_versions_ibfk_chart` FOREIGN KEY (`chart_id`) REFERENCES `charts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dashboard_widgets` ADD CONSTRAINT `dashboard_widgets_ibfk_chart` FOREIGN KEY (`chart_id`) REFERENCES `charts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `data_source_connections` ADD CONSTRAINT `connections_ibfk_project` FOREIGN KEY (`project_id`) REFERENCES `bi_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `data_source_connections` ADD CONSTRAINT `connections_ibfk_type` FOREIGN KEY (`type_id`) REFERENCES `data_source_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `data_source_secret_references` ADD CONSTRAINT `connection_secrets_ibfk_connection` FOREIGN KEY (`connection_id`) REFERENCES `data_source_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `data_source_test_runs` ADD CONSTRAINT `connection_tests_ibfk_connection` FOREIGN KEY (`connection_id`) REFERENCES `data_source_connections`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `sql_query_runs` ADD CONSTRAINT `query_runs_ibfk_project` FOREIGN KEY (`project_id`) REFERENCES `bi_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `sql_query_results` ADD CONSTRAINT `query_results_ibfk_run` FOREIGN KEY (`run_id`) REFERENCES `sql_query_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dashboard_share_links` ADD CONSTRAINT `share_links_ibfk_dashboard` FOREIGN KEY (`dashboard_id`) REFERENCES `bi_dashboards`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dashboard_share_snapshots` ADD CONSTRAINT `share_snapshots_ibfk_share` FOREIGN KEY (`share_id`) REFERENCES `dashboard_share_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `dashboard_share_access_logs` ADD CONSTRAINT `share_access_ibfk_share` FOREIGN KEY (`share_id`) REFERENCES `dashboard_share_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `embed_settings` ADD CONSTRAINT `embed_settings_ibfk_share` FOREIGN KEY (`share_id`) REFERENCES `dashboard_share_links`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `export_files` ADD CONSTRAINT `export_files_ibfk_export` FOREIGN KEY (`export_id`) REFERENCES `export_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `export_files` ADD CONSTRAINT `export_files_ibfk_file` FOREIGN KEY (`file_id`) REFERENCES `files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
