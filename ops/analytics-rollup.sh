#!/usr/bin/env bash
set -Eeuo pipefail

deploy_root="${1:-}"

if [[ -z "$deploy_root" || "$deploy_root" != /* || "$deploy_root" == "/" ]]; then
  echo "usage: $0 /absolute/deploy/root" >&2
  exit 64
fi

deploy_env="$deploy_root/shared/deploy.env"
runtime_env="$deploy_root/shared/.env.production"

if [[ ! -f "$deploy_env" || ! -f "$runtime_env" ]]; then
  echo "deployment or runtime environment file is missing" >&2
  exit 1
fi

set -a
# Both files are operator-owned and must use shell-compatible KEY='value'
# syntax. They are never copied into a release artifact. Source deploy.env
# last so the workflow-owned local port cannot be shadowed accidentally.
source "$runtime_env"
source "$deploy_env"
set +a

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET is not configured" >&2
  exit 1
fi

curl \
  --fail \
  --silent \
  --show-error \
  --connect-timeout 3 \
  --max-time 60 \
  --retry 2 \
  -H "Authorization: Bearer $CRON_SECRET" \
  "http://127.0.0.1:${APP_PORT}/api/analytics/rollup"
printf '\n'
