#!/usr/bin/env bash
set -euo pipefail

project_root="${DASHBOARDMINI_ROOT:-/home/ubuntu/infra/projects/dashboardmini}"
backup_root="$project_root/shared/backups"
retention_days="${BACKUP_RETENTION_DAYS:-14}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$backup_root/dashboardmini-$timestamp.dump"
manifest="$backup_root/dashboardmini-$timestamp.manifest"
container_file="/tmp/dashboardmini-$timestamp.dump"

umask 077
mkdir -p "$backup_root"
chmod 700 "$backup_root"
exec 9>"$backup_root/.backup.lock"
flock -n 9 || { echo 'A DashboardMiniBi backup is already running.' >&2; exit 1; }
cleanup() { docker exec server-postgres rm -f "$container_file" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker exec server-postgres sh -lc 'exec pg_dump -U "$POSTGRES_USER" -d dashboardmini --format=custom --no-owner --no-privileges --file="$1"' sh "$container_file"
docker cp "server-postgres:$container_file" "$archive" >/dev/null
docker exec server-postgres rm -f "$container_file"
trap - EXIT

{
  printf 'created_at_utc=%s\n' "$timestamp"
  printf 'database=dashboardmini\n'
  printf 'migration_count='
  docker exec server-postgres sh -lc 'psql -At -U "$POSTGRES_USER" -d dashboardmini -c "select count(*) from public._prisma_migrations where finished_at is not null and rolled_back_at is null"'
  printf 'storage_files_sha256\n'
  for directory in storage uploads exports; do
    if test -d "$project_root/shared/$directory"; then
      find "$project_root/shared/$directory" -type f -print0 | sort -z | xargs -0 -r sha256sum
    fi
  done
} >"$manifest"
sha256sum "$archive" "$manifest" >"$archive.sha256"
chmod 600 "$archive" "$manifest" "$archive.sha256"
find "$backup_root" -maxdepth 1 -type f -name 'dashboardmini-*' -mtime "+$retention_days" -delete
printf '%s\n' "$archive"
