#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  npm run debug:prod:game -- <game-id>

Environment variables:
  LOG_TAIL_LINES   Number of recent log lines to fetch (default: 20000)
  REMOTE_DATA_DIR  Remote hand-history directory (default: /opt/poker/data)
EOF
}

if [[ $# -ne 1 ]]; then
  usage
  exit 1
fi

GAME_ID="$1"
if [[ ! "$GAME_ID" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "Invalid game id: $GAME_ID" >&2
  echo "Allowed characters: letters, numbers, underscore, hyphen." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_CONFIG="$REPO_ROOT/config/deploy.yml"

if [[ ! -f "$DEPLOY_CONFIG" ]]; then
  echo "Missing deploy config: $DEPLOY_CONFIG" >&2
  exit 1
fi

SERVICE="$(awk '/^service:[[:space:]]*/ { print $2; exit }' "$DEPLOY_CONFIG")"
WEB_HOST="$(
  awk '
    /^  web:[[:space:]]*$/ {
      getline
      sub(/^[[:space:]]*-[[:space:]]*/, "", $0)
      print
      exit
    }
  ' "$DEPLOY_CONFIG"
)"
SSH_USER="$(
  awk '
    BEGIN { in_ssh = 0 }
    /^ssh:[[:space:]]*$/ { in_ssh = 1; next }
    in_ssh && /^[^[:space:]]/ { in_ssh = 0 }
    in_ssh && /^[[:space:]]*user:[[:space:]]*/ {
      sub(/^[[:space:]]*user:[[:space:]]*/, "", $0)
      print
      exit
    }
  ' "$DEPLOY_CONFIG"
)"
SSH_KEY_RAW="$(
  awk '
    BEGIN { in_ssh = 0; in_keys = 0 }
    /^ssh:[[:space:]]*$/ { in_ssh = 1; next }
    in_ssh && /^[^[:space:]]/ { in_ssh = 0; in_keys = 0 }
    in_ssh && /^[[:space:]]*keys:[[:space:]]*$/ { in_keys = 1; next }
    in_keys && /^[[:space:]]*-[[:space:]]*/ {
      sub(/^[[:space:]]*-[[:space:]]*/, "", $0)
      print
      exit
    }
  ' "$DEPLOY_CONFIG"
)"

if [[ -z "$SERVICE" || -z "$WEB_HOST" || -z "$SSH_USER" || -z "$SSH_KEY_RAW" ]]; then
  echo "Could not parse service/host/ssh settings from $DEPLOY_CONFIG" >&2
  exit 1
fi

SSH_KEY="${SSH_KEY_RAW/#\~/$HOME}"
if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found: $SSH_KEY" >&2
  exit 1
fi

DEBUG_DIR="$REPO_ROOT/debug/$GAME_ID"
mkdir -p "$DEBUG_DIR"

LOG_TAIL_LINES="${LOG_TAIL_LINES:-20000}"
REMOTE_DATA_DIR="${REMOTE_DATA_DIR:-/opt/poker/data}"
REMOTE="$SSH_USER@$WEB_HOST"
SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new)

echo "Downloading production debug data for game '$GAME_ID' into $DEBUG_DIR"

CONTAINER_ID="$(
  ssh "${SSH_OPTS[@]}" "$REMOTE" \
    "docker ps --latest --quiet --filter label=service=$SERVICE --filter label=role=web --filter status=running --filter status=restarting | head -n 1"
)"

LOG_TAIL_FILE="$DEBUG_DIR/app-logs-tail.txt"
LOG_FILTERED_FILE="$DEBUG_DIR/app-logs-game.txt"

if [[ -n "$CONTAINER_ID" ]]; then
  ssh "${SSH_OPTS[@]}" "$REMOTE" \
    "docker logs --timestamps --tail $LOG_TAIL_LINES $CONTAINER_ID 2>&1" \
    >"$LOG_TAIL_FILE"
  grep -F "$GAME_ID" "$LOG_TAIL_FILE" >"$LOG_FILTERED_FILE" || true
else
  echo "No running/restarting web container found for service '$SERVICE'." >"$LOG_TAIL_FILE"
  : >"$LOG_FILTERED_FILE"
fi

HAND_FILES_LIST="$DEBUG_DIR/hand-history-files.txt"
ssh "${SSH_OPTS[@]}" "$REMOTE" \
  "find '$REMOTE_DATA_DIR' -maxdepth 1 -type f \\( -name '$GAME_ID.ohh' -o -name '$GAME_ID.ots' -o -name '$GAME_ID-*.ohh' -o -name '$GAME_ID-*.ots' \\) -print" \
  >"$HAND_FILES_LIST"

if [[ -s "$HAND_FILES_LIST" ]]; then
  while IFS= read -r remote_file; do
    [[ -z "$remote_file" ]] && continue
    scp "${SSH_OPTS[@]}" "$REMOTE:$remote_file" "$DEBUG_DIR/"
  done <"$HAND_FILES_LIST"
else
  echo "No hand history files found for game '$GAME_ID' in $REMOTE_DATA_DIR." >"$HAND_FILES_LIST"
fi

cat >"$DEBUG_DIR/fetch-info.txt" <<EOF
fetched_at_utc: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
game_id: $GAME_ID
service: $SERVICE
host: $WEB_HOST
remote_data_dir: $REMOTE_DATA_DIR
log_tail_lines: $LOG_TAIL_LINES
log_tail_file: $(basename "$LOG_TAIL_FILE")
log_filtered_file: $(basename "$LOG_FILTERED_FILE")
EOF

echo "Done. Files written to: $DEBUG_DIR"
