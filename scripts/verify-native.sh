#!/usr/bin/env bash
set -euo pipefail

project_root="${DASHBOARDMINI_ROOT:-/home/ubuntu/infra/projects/dashboardmini}"
api_port="${DASHBOARDMINI_API_PORT:-4020}"
web_port="${DASHBOARDMINI_WEB_PORT:-4021}"

test -L "$project_root/current"
test -r "$project_root/shared/backend.env"
test "$(stat -c '%a' "$project_root/shared/backend.env")" = "600"
curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:${api_port}/api/v1/health" >/dev/null
curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:${api_port}/api/v1/ready" >/dev/null
curl --fail --silent --show-error --max-time 10 "http://127.0.0.1:${web_port}/" >/dev/null
if find -L "$project_root/current/dist" -type f -name '*.map' -print -quit | grep -q .; then
  echo 'Public frontend source maps are forbidden.' >&2
  exit 1
fi
pm2 describe dashboardmini-api >/dev/null
pm2 describe dashboardmini-web >/dev/null
echo 'Native health verification passed.'
