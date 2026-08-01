-- These two records were created by deployment smoke/API cutover automation.
-- Exact IDs and names are both required so this cleanup cannot match a user
-- project with a similar display name.
BEGIN;
SET LOCAL lock_timeout = '10s';

DELETE FROM dashboard_core.bi_projects
WHERE (id, name) IN (
  ('project-b61473bc-0148-4a30-adcc-7e549f1baa37', 'Native Deployment Smoke'),
  ('project-84b5919d-3e87-4092-beeb-6726c9c1ac22', 'E2E API Cutover')
);

COMMIT;
