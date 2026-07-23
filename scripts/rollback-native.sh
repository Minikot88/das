#!/usr/bin/env bash
set -euo pipefail

project_root="${DASHBOARDMINI_ROOT:-/home/ubuntu/infra/projects/dashboardmini}"
test -L "$project_root/current"
test -L "$project_root/previous"
current_target="$(readlink -f "$project_root/current")"
previous_target="$(readlink -f "$project_root/previous")"
case "$previous_target" in "$project_root"/releases/*) ;; *) echo 'Invalid previous release target.' >&2; exit 2;; esac

ln -sfn "$previous_target" "$project_root/current"
ln -sfn "$current_target" "$project_root/previous"
DASHBOARDMINI_ROOT="$project_root" pm2 startOrReload "$project_root/current/ecosystem.config.cjs" --update-env
pm2 restart dashboardmini-web --update-env
"$project_root/current/scripts/verify-native.sh"
echo 'Application rollback completed; database migrations are not rolled back automatically.'
