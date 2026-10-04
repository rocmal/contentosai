#!/usr/bin/env bash
# Runs ON the VPS (invoked over SSH by .github/workflows/deploy.yml). Reads
# KEY=VALUE lines from stdin and upserts each into ../apps/api/.env.production,
# so vendor keys can be managed from GitHub (Settings -> Secrets and variables
# -> Actions) instead of editing the file by hand on the server.
#
# - Only keys present on stdin are touched; every other line in the file is
#   left exactly as it is. The workflow sends only non-empty values, so an
#   unset GitHub secret never blanks a key that was set by hand on the server.
# - Values are never echoed.
# - Only plain NAME=value lines with an UPPER_SNAKE_CASE name are accepted.
#
# Usage: ./scripts/apply-managed-env.sh < payload

set -euo pipefail
umask 077

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$SCRIPT_DIR/../../apps/api/.env.production"

if [ ! -f "$TARGET" ]; then
  echo "[managed-env] ERROR: $TARGET is missing - create it once by hand (deploy/README.md)." >&2
  exit 1
fi

WORK="$(mktemp)"
trap 'rm -f "$WORK"' EXIT
cp "$TARGET" "$WORK"

applied=0
while IFS= read -r line || [ -n "$line" ]; do
  [ -z "$line" ] && continue
  key="${line%%=*}"
  if [[ ! "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] || [[ "$line" != *=* ]]; then
    echo "[managed-env] skipping a malformed line" >&2
    continue
  fi
  grep -v -- "^${key}=" "$WORK" > "$WORK.next" || true
  printf '%s\n' "$line" >> "$WORK.next"
  mv "$WORK.next" "$WORK"
  echo "[managed-env] set $key"
  applied=$((applied + 1))
done

# Keep the original inode/permissions (the container reads this via env_file).
cat "$WORK" > "$TARGET"
echo "[managed-env] $applied key(s) applied"
