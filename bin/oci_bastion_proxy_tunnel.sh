#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.private/bastion/music-tools.env}"
REMOTE_USER="${REMOTE_USER:-opc}"
LOCAL_PROXY_HOST="${LOCAL_PROXY_HOST:-127.0.0.1}"
LOCAL_PROXY_PORT="${LOCAL_PROXY_PORT:-8888}"
REMOTE_PROXY_PORT="${REMOTE_PROXY_PORT:-3128}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/oci_bastion_proxy_tunnel.sh [--env-file FILE] [--user USER] [--local-proxy-port PORT] [--remote-proxy-port PORT] [--new-session]

Defaults:
  --env-file .private/bastion/music-tools.env
  --user opc
  --local-proxy-port 8888
  --remote-proxy-port 3128

This opens:
  1. local SSH to the private instance through OCI Bastion
  2. remote 127.0.0.1:REMOTE_PROXY_PORT on the instance back to a local HTTP proxy

Run a local HTTP proxy first, for example tinyproxy on 127.0.0.1:8888.
Then use this on the remote host or with Ansible:
  http://127.0.0.1:REMOTE_PROXY_PORT
EOF
}

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
    --local-proxy-port)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --local-proxy-port" >&2
        usage
        exit 1
      fi
      LOCAL_PROXY_PORT="$2"
      shift 2
      ;;
    --remote-proxy-port)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --remote-proxy-port" >&2
        usage
        exit 1
      fi
      REMOTE_PROXY_PORT="$2"
      shift 2
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

INSTANCE_SSH_KEY="${INSTANCE_SSH_KEY:-${SSH_KEY:-}}"
LOCAL_PORT="${LOCAL_PORT:-2222}"

if [[ -z "$INSTANCE_SSH_KEY" || ! -f "$INSTANCE_SSH_KEY" ]]; then
  echo "Missing instance SSH private key: ${INSTANCE_SSH_KEY:-unset}" >&2
  exit 1
fi

if ! timeout 2 bash -c "</dev/tcp/$LOCAL_PROXY_HOST/$LOCAL_PROXY_PORT" >/dev/null 2>&1; then
  echo "No local HTTP proxy is listening on $LOCAL_PROXY_HOST:$LOCAL_PROXY_PORT." >&2
  echo "Start one first, then rerun this script." >&2
  exit 1
fi

echo "Checking OCI Bastion SSH tunnel..."
bastion_args=(
  --env-file "$ENV_FILE"
  --user "$REMOTE_USER"
  --no-ssh
)

if [[ "$FORCE_NEW_SESSION" == "true" ]]; then
  bastion_args+=(--new-session)
fi

BASTION_TUNNEL_PID=""
STARTED_BASTION_TUNNEL="false"

cleanup() {
  if [[ "$STARTED_BASTION_TUNNEL" == "true" ]] && kill -0 "$BASTION_TUNNEL_PID" >/dev/null 2>&1; then
    kill "$BASTION_TUNNEL_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

ssh_ready() {
  ssh -i "$INSTANCE_SSH_KEY" \
    -p "$LOCAL_PORT" \
    -o BatchMode=yes \
    -o ConnectTimeout=3 \
    -o StrictHostKeyChecking=accept-new \
    "$REMOTE_USER@localhost" true >/dev/null 2>&1
}

if ssh_ready; then
  echo "Reusing existing OCI Bastion SSH tunnel on localhost:$LOCAL_PORT."
else
  bash "$ROOT_DIR/bin/oci_bastion_ssh.sh" "${bastion_args[@]}" &
  BASTION_TUNNEL_PID="$!"
  STARTED_BASTION_TUNNEL="true"

  for _ in {1..20}; do
    if ssh_ready; then
      break
    fi
    sleep 1
  done

  if ! ssh_ready; then
    echo "OCI Bastion SSH tunnel did not become ready on localhost:$LOCAL_PORT." >&2
    echo "Retry with: bash bin/oci_bastion_proxy_tunnel.sh --new-session" >&2
    exit 1
  fi
fi

echo "Opening reverse proxy tunnel."
echo "Remote proxy URL: http://127.0.0.1:$REMOTE_PROXY_PORT"
echo "For Ansible, run with: BOOTSTRAP_PROXY_URL=http://127.0.0.1:$REMOTE_PROXY_PORT"

ssh -i "$INSTANCE_SSH_KEY" \
  -p "$LOCAL_PORT" \
  -N \
  -o ExitOnForwardFailure=yes \
  -R "127.0.0.1:${REMOTE_PROXY_PORT}:${LOCAL_PROXY_HOST}:${LOCAL_PROXY_PORT}" \
  "$REMOTE_USER@localhost"
