-- The readiness endpoint verifies that Prisma migrations completed.
-- Runtime roles may inspect migration state but must never modify it.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

DO $$
DECLARE
  runtime_role text;
BEGIN
  FOREACH runtime_role IN ARRAY ARRAY['dashboardmini_app', 'dashboard_app']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = runtime_role) THEN
      EXECUTE format(
        'GRANT SELECT ON TABLE public._prisma_migrations TO %I',
        runtime_role
      );
    END IF;
  END LOOP;
END
$$;

COMMIT;
