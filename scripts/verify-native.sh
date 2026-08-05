#!/usr/bin/env bash
set -euo pipefail

project_root="${DASHBOARDMINI_ROOT:-/home/ubuntu/infra/projects/dashboardmini}"
api_port="${DASHBOARDMINI_API_PORT:-4020}"
web_port="${DASHBOARDMINI_WEB_PORT:-4021}"

wait_for_url() {
  local url="$1"
  for attempt in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 3 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

test -L "$project_root/current"
test -r "$project_root/shared/backend.env"
test "$(stat -c '%a' "$project_root/shared/backend.env")" = "600"
wait_for_url "http://127.0.0.1:${api_port}/api/v1/health"
wait_for_url "http://127.0.0.1:${api_port}/api/v1/ready"
wait_for_url "http://127.0.0.1:${web_port}/"
web_headers="$(curl --silent --show-error --head --max-time 3 "http://127.0.0.1:${web_port}/")"
grep -qi '^content-security-policy:' <<< "$web_headers"
if grep -qi '^access-control-allow-origin:' <<< "$web_headers"; then
  echo 'Native web service must not emit CORS headers.' >&2
  exit 1
fi
if find -L "$project_root/current/dist" -type f -name '*.map' -print -quit | grep -q .; then
  echo 'Public frontend source maps are forbidden.' >&2
  exit 1
fi
pm2 describe dashboardmini-api >/dev/null
pm2 describe dashboardmini-web >/dev/null
echo 'Native health verification passed.'
