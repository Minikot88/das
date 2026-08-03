#!/usr/bin/env bash
set -euo pipefail

project_root="${DASHBOARDMINI_ROOT:-/home/ubuntu/infra/projects/dashboardmini}"
release_dir="${1:?usage: deploy-native.sh /absolute/path/to/release}"
case "$release_dir" in "$project_root"/releases/*) ;; *) echo 'Release must be inside the project releases directory.' >&2; exit 2;; esac
test -f "$release_dir/package-lock.json"
test -f "$release_dir/apps/api/package-lock.json"
test -r "$project_root/shared/backend.env"

cd "$release_dir"
npm ci
npm --prefix apps/api ci
set -a
# shellcheck disable=SC1090
source "$project_root/shared/backend.env"
set +a
node "$release_dir/scripts/validate-auth-environment.mjs"
npm --prefix apps/api run prisma:generate
VITE_USE_MOCK=false npm run build
npm --prefix apps/api run build

cd apps/api
DATABASE_URL="$MIGRATION_DATABASE_URL" npx prisma migrate deploy
cd "$release_dir"
bash "$release_dir/scripts/apply-database-grants.sh"
bash "$release_dir/scripts/harden-database-owner.sh"

if test -L "$project_root/current"; then
  current_target="$(readlink -f "$project_root/current")"
  ln -sfn "$current_target" "$project_root/previous"
fi
ln -sfn "$release_dir" "$project_root/current"

DASHBOARDMINI_ROOT="$project_root" pm2 startOrReload "$project_root/current/ecosystem.config.cjs" --update-env
if pm2 describe dashboardmini-web >/dev/null 2>&1; then
  pm2 delete dashboardmini-web >/dev/null
fi
pm2 serve "$project_root/current/dist" "${DASHBOARDMINI_WEB_PORT:-4021}" --name dashboardmini-web --spa
pm2 save
"$project_root/current/scripts/verify-native.sh"
