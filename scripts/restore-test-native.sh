#!/usr/bin/env bash
set -euo pipefail

project_root="${DASHBOARDMINI_ROOT:-/home/ubuntu/infra/projects/dashboardmini}"
archive="${1:?usage: restore-test-native.sh /absolute/path/to/backup.dump}"
case "$archive" in "$project_root"/shared/backups/*.dump) ;; *) echo 'Backup must be inside the project backup directory.' >&2; exit 2;; esac
test -f "$archive.sha256"
(cd "$(dirname "$archive")" && sha256sum --check "$(basename "$archive").sha256" --ignore-missing)

restore_database="dashboardmini_restore_$(date -u +%Y%m%d%H%M%S)_$RANDOM"
container_file="/tmp/$restore_database.dump"
cleanup() {
  docker exec server-postgres sh -lc 'dropdb --if-exists -U "$POSTGRES_USER" "$1"' sh "$restore_database" >/dev/null 2>&1 || true
  docker exec server-postgres rm -f "$container_file" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker exec server-postgres sh -lc 'createdb -U "$POSTGRES_USER" "$1"' sh "$restore_database"
docker cp "$archive" "server-postgres:$container_file" >/dev/null
docker exec server-postgres sh -lc 'pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --no-privileges "$2"' sh "$restore_database" "$container_file"
docker exec server-postgres sh -lc 'psql -v ON_ERROR_STOP=1 -At -U "$POSTGRES_USER" -d "$1" -c "select count(*) from _prisma_migrations; select count(*) from user_profiles; select count(*) from bi_projects;"' sh "$restore_database"
docker exec server-postgres sh -lc 'dropdb -U "$POSTGRES_USER" "$1"' sh "$restore_database"
docker exec server-postgres rm -f "$container_file"
trap - EXIT
echo 'Temporary restore verification passed.'
