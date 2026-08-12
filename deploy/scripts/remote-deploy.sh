#!/usr/bin/env bash
# Runs ON the VPS (invoked over SSH by .github/workflows/deploy.yml, or by
# hand for a manual deploy). Assumes CWD is the `deploy/` directory that was
# just rsynced from the repo (contains docker-compose.yml + this script).
#
# What it does, in order:
#   1. Pull the requested image tag for both containers.
#   2. Run migrations using a one-off container on the NEW api image
#      (before touching the running containers).
#   3. Recreate web+api with `docker compose up -d --wait` (Docker only
#      restarts a container whose image actually changed - the other one
#      keeps running).
#   4. If migrate or the health-gated recreate fails, automatically roll
#      the containers (not the DB - see below) back to the last known-good
#      image tag and exit non-zero so CI still goes red.
#
# Migrations are NOT auto-rolled-back on failure - undoing a migration
# unattended against a shared production database is its own risk (a
# partially-applied migration, or one already read by live traffic). A
# failed migration always stops the deploy before any container is
# touched, so the previous (working) containers are simply left running;
# fix the migration and redeploy.
#
# Usage: ./scripts/remote-deploy.sh <image-tag>

set -euo pipefail

IMAGE_TAG="${1:?Usage: remote-deploy.sh <image-tag>}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_DIR="$DEPLOY_DIR/../.deploy-state"
STATE_FILE="$STATE_DIR/last-good-tag"

cd "$DEPLOY_DIR"
mkdir -p "$STATE_DIR"

log() { printf '\n[deploy] %s\n' "$1"; }

if [ ! -f .env ]; then
  echo "[deploy] ERROR: deploy/.env is missing. Copy deploy/.env.example to" >&2
  echo "         deploy/.env on the server and fill it in once - see deploy/README.md." >&2
  exit 1
fi
if [ ! -f ../.env.production ]; then
  echo "[deploy] ERROR: ../.env.production (web app secrets) is missing - see .env.example" >&2
  echo "         at the repo root and deploy/README.md 'One-time secrets setup'." >&2
  exit 1
fi
if [ ! -f ../apps/api/.env.production ]; then
  echo "[deploy] ERROR: ../apps/api/.env.production (API secrets) is missing - see" >&2
  echo "         apps/api/.env.example and deploy/README.md 'One-time secrets setup'." >&2
  exit 1
fi

PREV_TAG="$(cat "$STATE_FILE" 2>/dev/null || true)"
log "Deploying tag: $IMAGE_TAG (last known-good: ${PREV_TAG:-<none>})"

set_image_tag() {
  local tag="$1"
  if grep -q '^IMAGE_TAG=' .env; then
    sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${tag}/" .env
  else
    echo "IMAGE_TAG=${tag}" >> .env
  fi
}

rollback_containers() {
  if [ -z "$PREV_TAG" ] || [ "$PREV_TAG" = "$IMAGE_TAG" ]; then
    log "No previous known-good tag to roll back to - leaving failed containers as-is for inspection."
    return 1
  fi
  log "Rolling back containers to last known-good tag: $PREV_TAG"
  set_image_tag "$PREV_TAG"
  docker compose pull
  docker compose up -d --wait --wait-timeout 90
  log "Rollback complete - containers restored to $PREV_TAG"
}

set_image_tag "$IMAGE_TAG"

log "Pulling images..."
docker compose pull

log "Running database migrations against the new api image..."
if ! docker compose run --rm --no-deps api npm run db:migrate; then
  echo "[deploy] Migration failed. Containers were NOT touched - the previous" >&2
  echo "         deployment is still running. Fix the migration and redeploy." >&2
  set_image_tag "${PREV_TAG:-$IMAGE_TAG}"
  exit 1
fi

log "Recreating containers and waiting for health checks..."
if ! docker compose up -d --wait --wait-timeout 90; then
  echo "[deploy] New containers failed to become healthy." >&2
  rollback_containers || true
  exit 1
fi

echo "$IMAGE_TAG" > "$STATE_FILE"
log "Deploy successful. Recorded $IMAGE_TAG as last known-good."

# Dangling (untagged) layers only - never removes a tagged image, so a
# previous release's image is still on disk and instantly available if
# rollback.sh needs it later.
docker image prune -f >/dev/null 2>&1 || true
