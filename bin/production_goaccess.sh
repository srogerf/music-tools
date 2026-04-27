#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PRODUCTION_ENV_FILE:-$ROOT_DIR/.private/deploy/production.env}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_goaccess.sh

Generates a static GoAccess report on the production host from nginx access
logs, then copies the report back to .private/deploy/goaccess-production.html.

This expects the Bastion SSH tunnel to already be available on localhost:2222.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production env file: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

BASTION_ENV_FILE="${BASTION_ENV_FILE:-$ROOT_DIR/.private/bastion/music-tools.env}"
LOCAL_PRODUCTION_COMPOSE_ENV="${LOCAL_PRODUCTION_COMPOSE_ENV:-$ROOT_DIR/.private/deploy/production.compose.env}"
REMOTE_USER="${REMOTE_USER:-opc}"
REMOTE_RUNTIME_PATH="${REMOTE_RUNTIME_PATH:-/srv/rifferone/app}"
REMOTE_COMPOSE_FILE="${REMOTE_COMPOSE_FILE:-$REMOTE_RUNTIME_PATH/docker-compose.yml}"
REMOTE_COMPOSE_ENV_FILE="${REMOTE_COMPOSE_ENV_FILE:-$REMOTE_RUNTIME_PATH/compose.env}"

if [[ ! -f "$BASTION_ENV_FILE" ]]; then
  echo "Missing Bastion env file: $BASTION_ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$LOCAL_PRODUCTION_COMPOSE_ENV" ]]; then
  echo "Missing production compose env file: $LOCAL_PRODUCTION_COMPOSE_ENV" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$BASTION_ENV_FILE"
# shellcheck disable=SC1090
source "$LOCAL_PRODUCTION_COMPOSE_ENV"

INSTANCE_SSH_KEY="${INSTANCE_SSH_KEY:-${SSH_KEY:-}}"
LOCAL_PORT="${LOCAL_PORT:-2222}"
GOACCESS_REPORT_PATH="${GOACCESS_REPORT_PATH:-/srv/rifferone/reports/goaccess}"
LOCAL_REPORT_PATH="${LOCAL_REPORT_PATH:-$ROOT_DIR/.private/deploy/goaccess-production.html}"

if [[ -z "$INSTANCE_SSH_KEY" ]]; then
  echo "Set INSTANCE_SSH_KEY or SSH_KEY in $BASTION_ENV_FILE." >&2
  exit 1
fi

if ! ssh -i "$INSTANCE_SSH_KEY" \
  -p "$LOCAL_PORT" \
  -o BatchMode=yes \
  -o ConnectTimeout=3 \
  -o StrictHostKeyChecking=accept-new \
  "$REMOTE_USER@localhost" true >/dev/null 2>&1; then
  cat >&2 <<EOF
Production Bastion SSH tunnel is not reachable on localhost:$LOCAL_PORT.

Start the tunnel in another terminal, then rerun this command:

  bash bin/oci_bastion_ssh.sh --no-ssh

If an old Bastion session was left behind after a crash, start a fresh one:

  bash bin/oci_bastion_ssh.sh --no-ssh --new-session
EOF
  exit 1
fi

ssh -i "$INSTANCE_SSH_KEY" -p "$LOCAL_PORT" "$REMOTE_USER@localhost" \
  REMOTE_COMPOSE_FILE="$REMOTE_COMPOSE_FILE" \
  REMOTE_COMPOSE_ENV_FILE="$REMOTE_COMPOSE_ENV_FILE" \
  'bash -s' <<'EOF'
set -euo pipefail
docker compose \
  -f "$REMOTE_COMPOSE_FILE" \
  --env-file "$REMOTE_COMPOSE_ENV_FILE" \
  --profile reports \
  run --rm goaccess
EOF

mkdir -p "$(dirname "$LOCAL_REPORT_PATH")"
scp -i "$INSTANCE_SSH_KEY" -P "$LOCAL_PORT" \
  "$REMOTE_USER@localhost:$GOACCESS_REPORT_PATH/index.html" \
  "$LOCAL_REPORT_PATH"

echo "GoAccess report: $LOCAL_REPORT_PATH"
