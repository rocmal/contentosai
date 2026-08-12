#!/usr/bin/env bash
# One-time bootstrap - run ONCE on the VPS as lumoosr, after the root-only
# steps in deploy/README.md ("One-time root/admin setup") are done.
# Safe to re-run: every step is idempotent / skips what already exists.
#
# What this does NOT do (needs root - see deploy/README.md instead):
#   - add lumoosr to the docker group
#   - MySQL/Redis bind-address + firewall changes for the docker bridge
#   - Apache mod_proxy / vhost include setup
#
# Usage: ./setup-vps.sh [deploy-path]
# Default deploy-path: /home/lumoosr/apps/contentosai

set -euo pipefail

DEPLOY_PATH="${1:-/home/lumoosr/apps/contentosai}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[setup] Target directory: $DEPLOY_PATH"

if ! docker ps >/dev/null 2>&1; then
  echo "[setup] ERROR: current user cannot run 'docker ps'. This means the" >&2
  echo "        one-time root command to add this user to the docker group" >&2
  echo "        hasn't been run yet (or you haven't logged out/in since). See" >&2
  echo "        deploy/README.md, 'One-time root/admin setup' -> step 1." >&2
  exit 1
fi
echo "[setup] docker access OK."

if ! docker compose version >/dev/null 2>&1; then
  echo "[setup] ERROR: 'docker compose' (v2 plugin) not found. Ask an admin to" >&2
  echo "        install it alongside the Docker Engine package." >&2
  exit 1
fi
echo "[setup] docker compose OK ($(docker compose version --short))."

mkdir -p "$DEPLOY_PATH/deploy" "$DEPLOY_PATH/apps/api" "$DEPLOY_PATH/.deploy-state"
echo "[setup] Directory layout ready under $DEPLOY_PATH."

# First run only: seed deploy/.env from the example so `docker compose`
# has something to read before the very first CI deploy rsyncs real files
# in. CI never overwrites this file (see .github/workflows/deploy.yml -
# rsync excludes .env explicitly).
if [ ! -f "$DEPLOY_PATH/deploy/.env" ]; then
  if [ -f "$SCRIPT_DIR/../.env.example" ]; then
    cp "$SCRIPT_DIR/../.env.example" "$DEPLOY_PATH/deploy/.env"
    echo "[setup] Created $DEPLOY_PATH/deploy/.env from deploy/.env.example - defaults are fine to start."
  fi
else
  echo "[setup] $DEPLOY_PATH/deploy/.env already exists - left untouched."
fi

for f in "$DEPLOY_PATH/.env.production" "$DEPLOY_PATH/apps/api/.env.production"; do
  if [ ! -f "$f" ]; then
    echo "[setup] MISSING: $f"
    echo "         Create it by hand (scp/paste real secrets in) before the first deploy -"
    echo "         see deploy/README.md 'One-time secrets setup'. Templates:"
    echo "           repo root:    .env.example"
    echo "           apps/api:     apps/api/.env.example"
  else
    echo "[setup] Found: $f"
  fi
done

echo "[setup] Done. Next: run a deploy (push to main, or trigger the"
echo "        'Deploy' workflow manually), or run 'docker compose up -d --wait'"
echo "        by hand from $DEPLOY_PATH/deploy once the .env.production files above exist."
