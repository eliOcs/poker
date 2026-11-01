#!/usr/bin/env bash
# Uploads a compact bot blueprint (.nrc) to the production data volume, next
# to any others. Point BOT_BLUEPRINT_PATH in config/deploy.yml at the new file
# name and deploy to switch; switch back the same way to roll back.
set -euo pipefail

if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "Usage: npm run upload:blueprint -- <path/to/blueprint.nrc>" >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_CONFIG="$REPO_ROOT/config/deploy.yml"
HOST="$(awk '/^  web:/ { getline; sub(/^[[:space:]]*-[[:space:]]*/, ""); print; exit }' "$DEPLOY_CONFIG")"
SSH_USER="$(awk '/^ssh:/ { in_ssh = 1; next } in_ssh && /user:/ { print $2; exit }' "$DEPLOY_CONFIG")"
SSH_KEY="$(awk '/^ssh:/ { in_ssh = 1; next } in_ssh && /^ *- / { sub(/^ *- */, ""); print; exit }' "$DEPLOY_CONFIG")"
SSH_KEY="${SSH_KEY/#\~/$HOME}"
REMOTE_DIR="/opt/poker/data/engine"

# The volume belongs to the container's user, so the remote side writes with
# sudo. The container only reads blueprints. --copy-links sends the file a
# symlink points to; without it rsync skips the link and still exits 0.
rsync --progress --partial --copy-links --chmod=D755,F644 \
  -e "ssh -i $SSH_KEY" \
  --rsync-path="sudo mkdir -p $REMOTE_DIR && sudo rsync" \
  "$1" "$SSH_USER@$HOST:$REMOTE_DIR/"

echo "Uploaded to $HOST:$REMOTE_DIR/$(basename "$1")"
echo "Inside the container: /app/data/engine/$(basename "$1")"
