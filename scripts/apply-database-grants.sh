#!/usr/bin/env bash
set -euo pipefail

database_name="${DASHBOARDMINI_DATABASE_NAME:-dashboardmini}"
runtime_url="${DATABASE_URL:?DATABASE_URL is required}"
runtime_user="$(node -e 'const u=new URL(process.env.DATABASE_URL); process.stdout.write(decodeURIComponent(u.username))')"
case "$runtime_user" in
  ''|*[!a-zA-Z0-9_]*) echo 'DATABASE_URL contains an unsafe runtime role name.' >&2; exit 2 ;;
esac

docker exec server-postgres sh -lc '
  psql --set=ON_ERROR_STOP=1 --username="$POSTGRES_USER" --dbname="$1" --set=runtime_user="$2" <<'"'"'SQL'"'"'
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA dashboard_core TO :"runtime_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA dashboard_core TO :"runtime_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA dashboard_core TO :"runtime_user";

SELECT format('"'"'REVOKE ALL PRIVILEGES ON SCHEMA scopus FROM %I'"'"', :'"'"'runtime_user'"'"')
WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '"'"'scopus'"'"') \gexec
SELECT format('"'"'GRANT USAGE ON SCHEMA scopus TO %I'"'"', :'"'"'runtime_user'"'"')
WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '"'"'scopus'"'"') \gexec
SELECT format('"'"'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA scopus FROM %I'"'"', :'"'"'runtime_user'"'"')
WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '"'"'scopus'"'"') \gexec
SELECT format('"'"'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA scopus FROM %I'"'"', :'"'"'runtime_user'"'"')
WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '"'"'scopus'"'"') \gexec
SELECT format('"'"'GRANT SELECT ON ALL TABLES IN SCHEMA scopus TO %I'"'"', :'"'"'runtime_user'"'"')
WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '"'"'scopus'"'"') \gexec
SELECT format('"'"'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA scopus TO %I'"'"', :'"'"'runtime_user'"'"')
WHERE EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = '"'"'scopus'"'"') \gexec
SQL
' sh "$database_name" "$runtime_user"

echo 'DashboardMiniBi database grants applied.'
