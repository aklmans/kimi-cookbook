#!/usr/bin/env bash
set -Eeuo pipefail

die() {
  echo "deploy: $*" >&2
  exit 1
}

deploy_root="${1:-}"
release="${2:-}"
app_name="${3:-}"
app_port="${4:-}"
health_path="${5:-/api/health}"
keep_releases="${6:-5}"

[[ "$deploy_root" == /* && "$deploy_root" != "/" && ${#deploy_root} -gt 5 ]] ||
  die "DEPLOY_PATH must be a safe absolute path"
[[ "$deploy_root" =~ ^[A-Za-z0-9._/-]+$ ]] ||
  die "DEPLOY_PATH contains unsupported characters"
[[ "$release" =~ ^[0-9a-f]{40}$ ]] || die "release must be a full git SHA"
[[ "$app_name" =~ ^[A-Za-z0-9._-]+$ ]] || die "invalid PM2 app name"
[[ "$app_port" =~ ^[0-9]{2,5}$ ]] || die "invalid application port"
(( app_port >= 1024 && app_port <= 65535 )) ||
  die "application port must be between 1024 and 65535"
[[ "$health_path" =~ ^/[A-Za-z0-9._/-]*$ ]] || die "invalid health path"
[[ "$keep_releases" =~ ^[0-9]+$ ]] || die "KEEP_RELEASES must be numeric"
(( keep_releases >= 3 && keep_releases <= 20 )) ||
  die "KEEP_RELEASES must be between 3 and 20"

[[ "$(uname -m)" == "x86_64" ]] ||
  die "this workflow builds native dependencies for x86_64; use an x64 server or matching self-hosted runner"

releases_dir="$deploy_root/releases"
incoming_dir="$deploy_root/incoming"
shared_dir="$deploy_root/shared"
release_dir="$releases_dir/$release"
staged_release="$incoming_dir/$release"
current_link="$deploy_root/current"
runtime_env="$shared_dir/.env.production"

mkdir -p "$releases_dir" "$incoming_dir" "$shared_dir/data"
chmod 700 "$shared_dir"

if [[ ! -f "$runtime_env" ]]; then
  die "$runtime_env is missing; create it before the first deployment"
fi
chmod 600 "$runtime_env"

set -a
# Actions generates this server-side runtime copy atomically from repository
# Secrets. Shell-safe assignments keep manual restarts and PM2 recovery
# independent from the short-lived GitHub runner.
source "$runtime_env"
set +a

# Source the operator environment before checking binaries so a BaoTa-managed
# Node installation can expose its bin directory through PATH here.
for command in curl node pm2; do
  command -v "$command" >/dev/null 2>&1 || die "$command is not installed or not on PATH"
done

analytics_secret="${ANALYTICS_SECRET:-}"
cron_secret="${CRON_SECRET:-}"
[[ ${#analytics_secret} -ge 32 ]] ||
  die "ANALYTICS_SECRET must contain at least 32 characters"
[[ ${#cron_secret} -ge 32 ]] ||
  die "CRON_SECRET must contain at least 32 characters"
[[ "$analytics_secret" != "$cron_secret" ]] ||
  die "ANALYTICS_SECRET and CRON_SECRET must be different"

if [[ ! -d "$release_dir" ]]; then
  [[ -d "$staged_release" ]] || die "staged release not found: $staged_release"
  [[ -f "$staged_release/server.js" ]] || die "standalone server.js is missing"
  [[ -f "$staged_release/ecosystem.config.cjs" ]] ||
    die "PM2 ecosystem config is missing"
  [[ "$(<"$staged_release/RELEASE")" == "$release" ]] ||
    die "staged release SHA does not match"
  mv "$staged_release" "$release_dir"
else
  [[ -f "$release_dir/server.js" ]] || die "existing release is incomplete"
  if [[ -d "$staged_release" ]]; then
    rm -rf -- "$staged_release"
  fi
fi

# The app defaults to ./data/analytics.db. Point every immutable release at the
# same durable directory so a symlink switch never replaces production data.
if [[ -e "$release_dir/data" || -L "$release_dir/data" ]]; then
  [[ -L "$release_dir/data" ]] || die "release data path is not a symlink"
else
  ln -s "$shared_dir/data" "$release_dir/data"
fi

# Next can load this file itself, while the shell export above makes the same
# values available to PM2. The symlink also makes manual starts predictable.
if [[ -e "$release_dir/.env.production" || -L "$release_dir/.env.production" ]]; then
  [[ -L "$release_dir/.env.production" ]] ||
    die "release .env.production path is not a symlink"
else
  ln -s "$runtime_env" "$release_dir/.env.production"
fi

previous_release=""
if [[ -L "$current_link" ]]; then
  previous_release="$(readlink -f "$current_link" || true)"
fi

switch_current() {
  local target="$1"
  local next_link="$deploy_root/.current.$$"
  rm -f -- "$next_link"
  ln -s "$target" "$next_link"
  mv -Tf "$next_link" "$current_link"
}

start_release() {
  local target="$1"
  local version
  version="$(basename "$target")"
  export APP_NAME="$app_name"
  export APP_PORT="$app_port"
  export RELEASE_DIR="$target"
  export DEPLOYMENT_VERSION="$version"
  pm2 startOrReload "$target/ecosystem.config.cjs" \
    --env production \
    --update-env
}

healthy_release() {
  local expected="$1"
  local body=""
  local attempt
  for attempt in {1..15}; do
    if body="$(curl --fail --silent --show-error \
      --connect-timeout 2 --max-time 5 \
      "http://127.0.0.1:${app_port}${health_path}" 2>/dev/null)" &&
      [[ "$body" == *"\"version\":\"${expected}\""* ]]; then
      return 0
    fi
    sleep 2
  done
  return 1
}

switch_current "$release_dir"
start_release "$release_dir"

if ! healthy_release "$release"; then
  echo "deploy: health check failed for $release; rolling back" >&2
  pm2 logs "$app_name" --lines 80 --nostream || true

  if [[ -n "$previous_release" && -d "$previous_release" &&
        -f "$previous_release/ecosystem.config.cjs" ]]; then
    switch_current "$previous_release"
    start_release "$previous_release"
    previous_version="$(basename "$previous_release")"
    healthy_release "$previous_version" ||
      die "new release failed and rollback health check also failed"
    pm2 save
    die "release $release failed; rolled back to $previous_version"
  fi

  pm2 delete "$app_name" || true
  rm -f -- "$current_link"
  die "first release failed its health check; no rollback was available"
fi

cat >"$shared_dir/deploy.env" <<EOF
APP_NAME='$app_name'
APP_PORT='$app_port'
DEPLOY_ROOT='$deploy_root'
EOF
chmod 600 "$shared_dir/deploy.env"

pm2 save

# Keep recent immutable releases for fast manual rollback. Every deletion is
# constrained to a full-SHA directory under releases/; current is never pruned.
current_release="$(readlink -f "$current_link")"
release_count=0
while read -r _ candidate; do
  [[ -n "$candidate" ]] || continue
  release_count=$((release_count + 1))
  if (( release_count > keep_releases )) && [[ "$candidate" != "$current_release" ]]; then
    candidate_name="$(basename "$candidate")"
    if [[ "$candidate" == "$releases_dir/"* &&
          "$candidate_name" =~ ^[0-9a-f]{40}$ ]]; then
      rm -rf -- "$candidate"
    fi
  fi
done < <(find "$releases_dir" -mindepth 1 -maxdepth 1 -type d \
  -name '[0-9a-f]*' -printf '%T@ %p\n' | sort -nr)

echo "deploy: release $release is healthy on 127.0.0.1:$app_port"
