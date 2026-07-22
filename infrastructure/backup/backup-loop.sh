#!/bin/sh
set -eu
umask 077

require() { eval "value=\${$1:-}"; [ -n "$value" ] || { echo "$1 is required" >&2; exit 1; }; }
for name in DATABASE_URL BACKUP_STORAGE_ENDPOINT BACKUP_STORAGE_BUCKET BACKUP_STORAGE_ACCESS_KEY BACKUP_STORAGE_SECRET_KEY; do require "$name"; done

# Prisma accepts `schema=`, but PostgreSQL native clients do not. Remove only that
# adapter-specific option and preserve every other connection parameter.
backup_database_url="$(printf '%s' "$DATABASE_URL" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//')"

retention="${BACKUP_RETENTION_DAYS:-30}"
interval="${BACKUP_INTERVAL_SECONDS:-86400}"
case "$retention:$interval" in *[!0-9:]*|:*|*:) echo "Backup retention and interval must be positive integers" >&2; exit 1;; esac

export AWS_ACCESS_KEY_ID="$BACKUP_STORAGE_ACCESS_KEY"
export AWS_SECRET_ACCESS_KEY="$BACKUP_STORAGE_SECRET_KEY"
export AWS_DEFAULT_REGION="${BACKUP_STORAGE_REGION:-us-east-1}"
export AWS_EC2_METADATA_DISABLED=true
aws_s3() { aws --endpoint-url "$BACKUP_STORAGE_ENDPOINT" "$@"; }
aws_s3 s3api head-bucket --bucket "$BACKUP_STORAGE_BUCKET" >/dev/null 2>&1 \
  || aws_s3 s3api create-bucket --bucket "$BACKUP_STORAGE_BUCKET" >/dev/null

run_backup() {
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  work="$(mktemp -d /work/backup.XXXXXX)"
  trap 'rm -rf "$work"' EXIT INT TERM
  pg_dump --dbname="$backup_database_url" --format=custom --no-owner --no-privileges --file="$work/database.dump"
  tar -czf "$work/files.tar.gz" -C /data uploads exports
  migration_count="$(psql "$backup_database_url" -Atc 'SELECT count(*) FROM _prisma_migrations')"
  db_checksum="$(sha256sum "$work/database.dump" | cut -d' ' -f1)"
  files_checksum="$(sha256sum "$work/files.tar.gz" | cut -d' ' -f1)"
  printf '{"createdAt":"%s","migrationCount":%s,"databaseSha256":"%s","filesSha256":"%s"}\n' "$stamp" "$migration_count" "$db_checksum" "$files_checksum" > "$work/manifest.json"
  prefix="dashboard-mini-bi/$stamp"
  aws_s3 s3 cp "$work/database.dump" "s3://$BACKUP_STORAGE_BUCKET/$prefix/database.dump" --only-show-errors
  aws_s3 s3 cp "$work/files.tar.gz" "s3://$BACKUP_STORAGE_BUCKET/$prefix/files.tar.gz" --only-show-errors
  aws_s3 s3 cp "$work/manifest.json" "s3://$BACKUP_STORAGE_BUCKET/$prefix/manifest.json" --only-show-errors
  aws_s3 s3api head-object --bucket "$BACKUP_STORAGE_BUCKET" --key "$prefix/manifest.json" >/dev/null
  cutoff="$(python3 -c "from datetime import datetime,timedelta,timezone; print((datetime.now(timezone.utc)-timedelta(days=int('$retention'))).strftime('%Y%m%dT%H%M%SZ'))")"
  for old_prefix in $(aws_s3 s3api list-objects-v2 --bucket "$BACKUP_STORAGE_BUCKET" --prefix dashboard-mini-bi/ --query 'Contents[].Key' --output text | tr '\t' '\n' | cut -d/ -f2 | sort -u); do
    if [ "$old_prefix" != "None" ] && [ "$old_prefix" \< "$cutoff" ]; then
      aws_s3 s3 rm "s3://$BACKUP_STORAGE_BUCKET/dashboard-mini-bi/$old_prefix/" --recursive --only-show-errors
    fi
  done
  rm -rf "$work"
  trap - EXIT INT TERM
  echo "backup_completed timestamp=$stamp migration_count=$migration_count"
}

if [ "${BACKUP_RUN_ONCE:-false}" = "true" ]; then run_backup; exit 0; fi
while :; do run_backup; sleep "$interval"; done
