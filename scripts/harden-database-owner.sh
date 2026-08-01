#!/usr/bin/env bash
set -euo pipefail

database_name="${DASHBOARDMINI_DATABASE_NAME:-dashboardmini}"
migration_url="${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL is required}"
runtime_url="${DATABASE_URL:?DATABASE_URL is required}"

migration_user="$(
  MIGRATION_DATABASE_URL="$migration_url" node -e \
    'const u = new URL(process.env.MIGRATION_DATABASE_URL); process.stdout.write(decodeURIComponent(u.username))'
)"
runtime_user="$(
  DATABASE_URL="$runtime_url" node -e \
    'const u = new URL(process.env.DATABASE_URL); process.stdout.write(decodeURIComponent(u.username))'
)"

case "$database_name" in
  ''|*[!a-zA-Z0-9_]*) echo 'DASHBOARDMINI_DATABASE_NAME must be a simple PostgreSQL identifier.' >&2; exit 2 ;;
esac
case "$migration_user" in
  ''|*[!a-zA-Z0-9_]*) echo 'MIGRATION_DATABASE_URL contains an unsafe migration role name.' >&2; exit 2 ;;
  postgres|serveruser) echo 'Refusing to alter a shared PostgreSQL administration role.' >&2; exit 2 ;;
esac
case "$runtime_user" in
  ''|*[!a-zA-Z0-9_]*) echo 'DATABASE_URL contains an unsafe runtime role name.' >&2; exit 2 ;;
esac
if [[ "$migration_user" == "$runtime_user" ]]; then
  echo 'Migration and runtime roles must be separate before owner hardening.' >&2
  exit 2
fi

docker exec server-postgres sh -lc '
  psql --set=ON_ERROR_STOP=1 --username="$POSTGRES_USER" --dbname="$1" \
    --set=database_name="$1" --set=migration_user="$2" <<'"'"'SQL'"'"'
SELECT EXISTS (
  SELECT 1
  FROM pg_database database
  JOIN pg_roles owner ON owner.oid = database.datdba
  WHERE database.datname = :'"'"'database_name'"'"'
    AND owner.rolname = :'"'"'migration_user'"'"'
) AS owner_matches \gset

\if :owner_matches
SELECT format(
  '"'"'ALTER ROLE %I NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION'"'"',
  :'"'"'migration_user'"'"'
) \gexec
\else
\warn '"'"'Refusing owner hardening: migration role does not own the target database.'"'"'
\quit 3
\endif
SQL
' sh "$database_name" "$migration_user"

echo 'DashboardMiniBi database owner privileges hardened.'
