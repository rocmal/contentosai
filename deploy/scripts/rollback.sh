#!/usr/bin/env bash
# Manual rollback helper - runs ON the VPS from inside deploy/.
#
# Only swaps the running containers back to an already-built image tag; it
# deliberately does NOT run migrations (a rollback moves application code
# backwards, not the database - see the migration note in remote-deploy.sh).
# If the tag being rolled back to predates a migration that already ran,
# that's fine: sequelize tracks applied migrations in the
# `sequelize_migrations` table and running old code against newer-but-
# compatible schema is the normal rollback story. If a rollback needs a
# genuine schema down-migration, do that by hand and deliberately - never
# scripted/unattended.
#
# Usage:
#   ./scripts/rollback.sh              # roll back to the last known-good tag
#   ./scripts/rollback.sh <image-tag>  # roll back to a specific tag/SHA

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
STATE_FILE="$DEPLOY_DIR/../.deploy-state/last-good-tag"

cd "$DEPLOY_DIR"

TARGET_TAG="${1:-}"
if [ -z "$TARGET_TAG" ]; then
  TARGET_TAG="$(cat "$STATE_FILE" 2>/dev/null || true)"
  if [ -z "$TARGET_TAG" ]; then
    echo "[rollback] No tag given and no last-good-tag on record. Pass one explicitly:" >&2
    echo "           ./scripts/rollback.sh <image-tag>" >&2
    exit 1
  fi
fi

echo "[rollback] Rolling back to: $TARGET_TAG"

if grep -q '^IMAGE_TAG=' .env; then
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${TARGET_TAG}/" .env
else
  echo "IMAGE_TAG=${TARGET_TAG}" >> .env
fi

docker compose pull
docker compose up -d --wait --wait-timeout 90

echo "$TARGET_TAG" > "$STATE_FILE"
echo "[rollback] Done. Running: $TARGET_TAG"
