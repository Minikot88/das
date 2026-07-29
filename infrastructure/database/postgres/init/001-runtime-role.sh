#!/bin/sh
set -eu

case "${POSTGRES_RUNTIME_USER:-}" in
  ''|*[!a-zA-Z0-9_]*) echo "POSTGRES_RUNTIME_USER must be a simple PostgreSQL identifier" >&2; exit 1 ;;
esac

if [ -z "${POSTGRES_RUNTIME_PASSWORD:-}" ]; then
  echo "POSTGRES_RUNTIME_PASSWORD is required" >&2
  exit 1
fi

psql --set=ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=db_name="$POSTGRES_DB" --set=runtime_user="$POSTGRES_RUNTIME_USER" --set=runtime_password="$POSTGRES_RUNTIME_PASSWORD" <<-'SQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'runtime_user',
  :'runtime_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'runtime_user')
\gexec

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db_name" TO :"runtime_user";
GRANT USAGE ON SCHEMA public TO :"runtime_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"runtime_user";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"runtime_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"runtime_user";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO :"runtime_user";
SQL
