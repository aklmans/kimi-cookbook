# Deployment

This site deploys to a single self-hosted Linux server from GitHub Actions.
This document is the operator-independent overview; the maintainer's exact
hosting runbook is intentionally kept private.

## Pipeline shape

Every push to `main` (or a manual `workflow_dispatch`) runs
`.github/workflows/deploy.yml`:

1. Quality gates — `npm test`, `npm run lint`, `npx tsc --noEmit`,
   `npm run build`.
2. Build a standalone release (Next.js `output: "standalone"`) and stamp it
   with the commit SHA as `DEPLOYMENT_VERSION`.
3. Generate a SHA256 manifest, rsync the release to the server into
   `releases/<sha>` (hard-link dedup against the live one), and sync the
   runtime environment (`shared/.env.production` written from GitHub
   secrets).
4. Verify the bundle (SHA256 + Next build-time `deploymentId` match the
   commit), atomically switch a `current` symlink, and restart PM2 with
   `delete + start` — then assert via `pm2 jlist` that the process really
   runs from the new release directory.
5. Health-check locally (`/api/health` must report runtime, release, and
   build SHAs all equal), then publicly: canonical + cache-busted HTML must
   carry the same `data-dpl-id`. On failure, roll back to the previous
   release automatically.

`ops/deploy-release.sh` performs steps 4–5; it doubles as the manual
rollback tool:

```bash
bash ops/deploy-release.sh /path/to/deploy-root <full-git-sha> <pm2-app> <port> /api/health 5
```

## Server requirements

- Linux x86_64, Node.js 22, PM2, and any reverse proxy (nginx shown in
  examples).
- A non-root deploy user that owns the deploy directory and the PM2
  processes.
- SSH access for the workflow (key-pinned `known_hosts`).

## GitHub configuration

Repository **Actions secrets**: `DEPLOY_SSH_PRIVATE_KEY`,
`DEPLOY_KNOWN_HOSTS`, `ANALYTICS_SECRET` (32+ chars), `CRON_SECRET`
(32+ chars, different), plus `DATABASE_URL` / `DATABASE_AUTH_TOKEN` for a
remote analytics backend. Repository **variables**: `DEPLOY_HOST`,
`DEPLOY_USER`, `DEPLOY_PATH`, `NEXT_PUBLIC_SITE_URL`, `RUNTIME_PATH`
(optional), giscus IDs, `ANALYTICS_RETENTION_DAYS` (optional).

## Analytics database

`DATABASE_URL` picks one of three backends (unset = local SQLite persisted
under `shared/data`):

- `mysql://user:password@127.0.0.1:3306/dbname` — MySQL / MariaDB
  (credentials in the URL; `DATABASE_AUTH_TOKEN` must NOT be set);
- `libsql://your-db.turso.io` + `DATABASE_AUTH_TOKEN` — Turso (both
  required together).

The deploy preflights credentials before touching production (libsql from
the runner; private MySQL through an SSH local-forward).

## Reverse proxy requirements

Whatever terminates TLS in front of Node must NOT cache HTML: Next serves
prerendered pages with `s-maxage=31536000`, and there is no deploy-level
purge, so any shared cache would serve stale pages after a release.
Disable `proxy_cache` explicitly on the proxying `location /` (the
`ops/nginx-cache-doctor.mjs` audit checks a full `nginx -T` dump for this
class of mistake), and leave asset caching to Next's own immutable
`/_next/static` headers.

## Rollback

Releases are immutable and the last N (default 5) are kept. Roll back by
re-pointing `current` at an older `releases/<sha>` with
`ops/deploy-release.sh` (same health checks apply, with automatic restore
if the target fails to boot).
