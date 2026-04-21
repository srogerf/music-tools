#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.private/bastion/music-tools.env}"
REMOTE_USER="${REMOTE_USER:-opc}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/oci_bastion_ssh.sh [--env-file FILE] [--user USER] [--no-ssh] [--new-session]

Defaults:
  --env-file .private/bastion/music-tools.env
  --user opc

The env file should define:
  BASTION_ID
  INSTANCE_ID
  PRIVATE_IP
  REGION
  BASTION_SSH_KEY
  BASTION_SSH_PUB
  INSTANCE_SSH_KEY
  LOCAL_PORT
  BASTION_SESSION_TTL
  BASTION_SESSION_DISPLAY_NAME
EOF
}

RUN_SSH="true"
FORCE_NEW_SESSION="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --env-file" >&2
        usage
        exit 1
      fi
      ENV_FILE="$2"
      shift 2
      ;;
    --user)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --user" >&2
        usage
        exit 1
      fi
      REMOTE_USER="$2"
      shift 2
      ;;
    --no-ssh)
      RUN_SSH="false"
      shift
      ;;
    --new-session)
      FORCE_NEW_SESSION="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$ENV_FILE" != /* ]]; then
  ENV_FILE="$ROOT_DIR/$ENV_FILE"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing Bastion env file: $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

BASTION_SSH_KEY="${BASTION_SSH_KEY:-${SSH_KEY:-}}"
BASTION_SSH_PUB="${BASTION_SSH_PUB:-${SSH_PUB:-}}"
INSTANCE_SSH_KEY="${INSTANCE_SSH_KEY:-${SSH_KEY:-}}"
BASTION_HOST="${BASTION_HOST:-host.bastion.${REGION:-us-phoenix-1}.oci.oraclecloud.com}"

required_vars=(
  BASTION_ID
  INSTANCE_ID
  PRIVATE_IP
  BASTION_SSH_KEY
  BASTION_SSH_PUB
  INSTANCE_SSH_KEY
  LOCAL_PORT
  BASTION_SESSION_TTL
  BASTION_SESSION_DISPLAY_NAME
)

for required_var in "${required_vars[@]}"; do
  if [[ -z "${!required_var:-}" ]]; then
    echo "Missing required env value: $required_var in $ENV_FILE" >&2
    exit 1
  fi
done

if [[ ! -f "$BASTION_SSH_KEY" ]]; then
  echo "Missing Bastion SSH private key: $BASTION_SSH_KEY" >&2
  exit 1
fi

if [[ ! -f "$BASTION_SSH_PUB" ]]; then
  echo "Missing Bastion SSH public key: $BASTION_SSH_PUB" >&2
  exit 1
fi

if [[ ! -f "$INSTANCE_SSH_KEY" ]]; then
  echo "Missing instance SSH private key: $INSTANCE_SSH_KEY" >&2
  exit 1
fi

SESSION_ID=""

if [[ "$FORCE_NEW_SESSION" != "true" ]]; then
  echo "Looking for an active Bastion session named $BASTION_SESSION_DISPLAY_NAME..."
  SESSION_ID=$(SUPPRESS_LABEL_WARNING=True ~/bin/oci bastion session list \
    --bastion-id "$BASTION_ID" \
    --display-name "$BASTION_SESSION_DISPLAY_NAME" \
    --session-lifecycle-state ACTIVE \
    --sort-by timeCreated \
    --sort-order DESC \
    --limit 1 \
    --query 'data[0].id' \
    --raw-output 2>/dev/null || true)
fi

if [[ -z "$SESSION_ID" || "$SESSION_ID" == "null" ]]; then
  echo "Creating Bastion port-forwarding session for $PRIVATE_IP:22..."
  WORK_REQUEST_ID=$(SUPPRESS_LABEL_WARNING=True ~/bin/oci bastion session create-port-forwarding \
    --bastion-id "$BASTION_ID" \
    --display-name "$BASTION_SESSION_DISPLAY_NAME" \
    --key-type PUB \
    --target-resource-id "$INSTANCE_ID" \
    --target-private-ip "$PRIVATE_IP" \
    --target-port 22 \
    --ssh-public-key-file "$BASTION_SSH_PUB" \
    --session-ttl "$BASTION_SESSION_TTL" \
    --wait-for-state SUCCEEDED \
    --query 'data.id' \
    --raw-output)

  for _ in {1..10}; do
    SESSION_ID=$(SUPPRESS_LABEL_WARNING=True ~/bin/oci bastion work-request get \
      --work-request-id "$WORK_REQUEST_ID" \
      --query 'data.resources[0].identifier' \
      --raw-output 2>/dev/null || true)

    if [[ -n "$SESSION_ID" && "$SESSION_ID" != "null" ]]; then
      break
    fi
    sleep 3
  done

  if [[ -z "$SESSION_ID" || "$SESSION_ID" == "null" ]]; then
    echo "Could not find the Bastion session created by work request $WORK_REQUEST_ID." >&2
    exit 1
  fi
else
  echo "Reusing active Bastion session: $SESSION_ID"
fi

echo "Opening local tunnel on 127.0.0.1:$LOCAL_PORT..."

ssh -i "$BASTION_SSH_KEY" \
  -N \
  -L "${LOCAL_PORT}:${PRIVATE_IP}:22" \
  -p 22 \
  "$SESSION_ID@$BASTION_HOST" &

TUNNEL_PID="$!"

cleanup() {
  if kill -0 "$TUNNEL_PID" >/dev/null 2>&1; then
    kill "$TUNNEL_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

sleep 3

if [[ "$RUN_SSH" != "true" ]]; then
  echo "Tunnel running with PID $TUNNEL_PID."
  echo "Connect with: ssh -i \"$INSTANCE_SSH_KEY\" -p \"$LOCAL_PORT\" \"$REMOTE_USER@localhost\""
  wait "$TUNNEL_PID"
fi

ssh -i "$INSTANCE_SSH_KEY" -p "$LOCAL_PORT" "$REMOTE_USER@localhost"
