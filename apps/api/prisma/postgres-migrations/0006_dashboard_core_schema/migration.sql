-- Move only DashboardMiniBi-owned business objects. Prisma migration history
-- remains in public so migrate deploy keeps its existing history table.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

CREATE SCHEMA IF NOT EXISTS dashboard_core AUTHORIZATION CURRENT_USER;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

ALTER TABLE public.api_request_logs SET SCHEMA dashboard_core;
ALTER TABLE public.audit_logs SET SCHEMA dashboard_core;
ALTER TABLE public.auth_sessions SET SCHEMA dashboard_core;
ALTER TABLE public.authentication_audit_logs SET SCHEMA dashboard_core;
ALTER TABLE public.bi_dashboards SET SCHEMA dashboard_core;
ALTER TABLE public.bi_project_members SET SCHEMA dashboard_core;
ALTER TABLE public.bi_projects SET SCHEMA dashboard_core;
ALTER TABLE public.bi_sheets SET SCHEMA dashboard_core;
ALTER TABLE public.chart_templates SET SCHEMA dashboard_core;
ALTER TABLE public.chart_type_requirements SET SCHEMA dashboard_core;
ALTER TABLE public.chart_types SET SCHEMA dashboard_core;
ALTER TABLE public.chart_versions SET SCHEMA dashboard_core;
ALTER TABLE public.charts SET SCHEMA dashboard_core;
ALTER TABLE public.dashboard_share_access_logs SET SCHEMA dashboard_core;
ALTER TABLE public.dashboard_share_links SET SCHEMA dashboard_core;
ALTER TABLE public.dashboard_share_snapshots SET SCHEMA dashboard_core;
ALTER TABLE public.dashboard_versions SET SCHEMA dashboard_core;
ALTER TABLE public.dashboard_widgets SET SCHEMA dashboard_core;
ALTER TABLE public.data_source_columns SET SCHEMA dashboard_core;
ALTER TABLE public.data_source_connections SET SCHEMA dashboard_core;
ALTER TABLE public.data_source_schemas SET SCHEMA dashboard_core;
ALTER TABLE public.data_source_secret_references SET SCHEMA dashboard_core;
ALTER TABLE public.data_source_tables SET SCHEMA dashboard_core;
ALTER TABLE public.data_source_test_runs SET SCHEMA dashboard_core;
ALTER TABLE public.data_source_types SET SCHEMA dashboard_core;
ALTER TABLE public.dataset_fields SET SCHEMA dashboard_core;
ALTER TABLE public.dataset_rows SET SCHEMA dashboard_core;
ALTER TABLE public.dataset_statistics SET SCHEMA dashboard_core;
ALTER TABLE public.dataset_validation_results SET SCHEMA dashboard_core;
ALTER TABLE public.dataset_versions SET SCHEMA dashboard_core;
ALTER TABLE public.datasets SET SCHEMA dashboard_core;
ALTER TABLE public.embed_settings SET SCHEMA dashboard_core;
ALTER TABLE public.error_logs SET SCHEMA dashboard_core;
ALTER TABLE public.export_files SET SCHEMA dashboard_core;
ALTER TABLE public.export_jobs SET SCHEMA dashboard_core;
ALTER TABLE public.files SET SCHEMA dashboard_core;
ALTER TABLE public.import_errors SET SCHEMA dashboard_core;
ALTER TABLE public.import_job_rows SET SCHEMA dashboard_core;
ALTER TABLE public.import_jobs SET SCHEMA dashboard_core;
ALTER TABLE public.invitations SET SCHEMA dashboard_core;
ALTER TABLE public.organization_members SET SCHEMA dashboard_core;
ALTER TABLE public.organizations SET SCHEMA dashboard_core;
ALTER TABLE public.password_reset_tokens SET SCHEMA dashboard_core;
ALTER TABLE public.permissions SET SCHEMA dashboard_core;
ALTER TABLE public.role_permissions SET SCHEMA dashboard_core;
ALTER TABLE public.roles SET SCHEMA dashboard_core;
ALTER TABLE public.saved_views SET SCHEMA dashboard_core;
ALTER TABLE public.sql_queries SET SCHEMA dashboard_core;
ALTER TABLE public.sql_query_result_columns SET SCHEMA dashboard_core;
ALTER TABLE public.sql_query_result_rows SET SCHEMA dashboard_core;
ALTER TABLE public.sql_query_results SET SCHEMA dashboard_core;
ALTER TABLE public.sql_query_runs SET SCHEMA dashboard_core;
ALTER TABLE public.user_credentials SET SCHEMA dashboard_core;
ALTER TABLE public.user_preferences SET SCHEMA dashboard_core;
ALTER TABLE public.user_profiles SET SCHEMA dashboard_core;
ALTER TABLE public.user_roles SET SCHEMA dashboard_core;
ALTER TABLE public.workspace_contexts SET SCHEMA dashboard_core;

DO $$
DECLARE
  runtime_role text;
BEGIN
  FOREACH runtime_role IN ARRAY ARRAY['dashboardmini_app', 'dashboard_app']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_role) THEN
      EXECUTE format('GRANT USAGE ON SCHEMA dashboard_core TO %I', runtime_role);
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA dashboard_core TO %I',
        runtime_role
      );
      EXECUTE format(
        'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA dashboard_core TO %I',
        runtime_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA dashboard_core GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
        runtime_role
      );
      EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA dashboard_core GRANT USAGE, SELECT ON SEQUENCES TO %I',
        runtime_role
      );
    END IF;
  END LOOP;
END
$$;

COMMIT;
