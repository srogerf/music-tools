#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PRODUCTION_ENV_FILE:-$ROOT_DIR/.private/deploy/production.env}"
IMAGE_TAG_OVERRIDE=""

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_deploy.sh [--tag TAG]

Deploys the selected GHCR image tag to the OCI production host.

This script expects:
  1. the Bastion SSH tunnel to already be available on localhost:2222
  2. the remote proxy tunnel to already be available on the OCI host at 127.0.0.1:3128

Defaults:
  --env-file via PRODUCTION_ENV_FILE or .private/deploy/production.env
  tag from IMAGE_TAG or the image reference in .private/deploy/production.compose.env
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      IMAGE_TAG_OVERRIDE="${2:-}"
      shift 2
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

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production env file: $ENV_FILE" >&2
  echo "Copy deploy/cicd/production.env.example to .private/deploy/production.env and fill it in." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

GHCR_IMAGE_REPO="${GHCR_IMAGE_REPO:-ghcr.io/srogerf/music-tools/rifferone}"
GHCR_USER="${GHCR_USER:-}"
GHCR_TOKEN="${GHCR_TOKEN:-}"
BASTION_ENV_FILE="${BASTION_ENV_FILE:-$ROOT_DIR/.private/bastion/music-tools.env}"
LOCAL_PRODUCTION_COMPOSE_ENV="${LOCAL_PRODUCTION_COMPOSE_ENV:-$ROOT_DIR/.private/deploy/production.compose.env}"
REMOTE_USER="${REMOTE_USER:-opc}"
REMOTE_RUNTIME_PATH="${REMOTE_RUNTIME_PATH:-/srv/rifferone/app}"
REMOTE_COMPOSE_FILE="${REMOTE_COMPOSE_FILE:-$REMOTE_RUNTIME_PATH/docker-compose.yml}"
REMOTE_COMPOSE_ENV_FILE="${REMOTE_COMPOSE_ENV_FILE:-$REMOTE_RUNTIME_PATH/compose.env}"
REMOTE_PROXY_URL="${REMOTE_PROXY_URL:-http://127.0.0.1:3128}"
REMOTE_PROXY_HOST="${REMOTE_PROXY_HOST:-127.0.0.1}"
REMOTE_PROXY_PORT="${REMOTE_PROXY_PORT:-3128}"
REMOTE_STAGE_DIR="${REMOTE_STAGE_DIR:-/home/${REMOTE_USER}/tmp/rifferone-deploy}"

if [[ ! -f "$BASTION_ENV_FILE" ]]; then
  echo "Missing Bastion env file: $BASTION_ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$LOCAL_PRODUCTION_COMPOSE_ENV" ]]; then
  echo "Missing production compose env file: $LOCAL_PRODUCTION_COMPOSE_ENV" >&2
  echo "Copy deploy/container/docker/compose.production.env.example to .private/deploy/production.compose.env and fill it in." >&2
  exit 1
fi

if [[ -z "$GHCR_USER" || -z "$GHCR_TOKEN" ]]; then
  echo "Set GHCR_USER and GHCR_TOKEN in $ENV_FILE before deploying." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$BASTION_ENV_FILE"

INSTANCE_SSH_KEY="${INSTANCE_SSH_KEY:-${SSH_KEY:-}}"
LOCAL_PORT="${LOCAL_PORT:-2222}"
IMAGE_TAG="${IMAGE_TAG_OVERRIDE:-${IMAGE_TAG:-}}"
TEMP_COMPOSE_ENV="$(mktemp)"

cleanup() {
  rm -f "$TEMP_COMPOSE_ENV"
}
trap cleanup EXIT

cp "$LOCAL_PRODUCTION_COMPOSE_ENV" "$TEMP_COMPOSE_ENV"

if [[ -n "$IMAGE_TAG" ]]; then
  if grep -Eq '^[[:space:]]*RIFFERONE_IMAGE=' "$TEMP_COMPOSE_ENV"; then
    sed -i "s|^[[:space:]]*RIFFERONE_IMAGE=.*|RIFFERONE_IMAGE=${GHCR_IMAGE_REPO}:${IMAGE_TAG}|" "$TEMP_COMPOSE_ENV"
  else
    printf '\nRIFFERONE_IMAGE=%s:%s\n' "$GHCR_IMAGE_REPO" "$IMAGE_TAG" >>"$TEMP_COMPOSE_ENV"
  fi
fi

for _ in {1..30}; do
  if ssh -i "$INSTANCE_SSH_KEY" \
    -p "$LOCAL_PORT" \
    -o BatchMode=yes \
    -o ConnectTimeout=3 \
    -o StrictHostKeyChecking=accept-new \
    "$REMOTE_USER@localhost" true >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! ssh -i "$INSTANCE_SSH_KEY" \
  -p "$LOCAL_PORT" \
  -o BatchMode=yes \
  -o ConnectTimeout=3 \
  -o StrictHostKeyChecking=accept-new \
  "$REMOTE_USER@localhost" true >/dev/null 2>&1; then
  echo "Bastion SSH tunnel is not ready on localhost:$LOCAL_PORT." >&2
  echo "Start it first with: bash bin/oci_bastion_ssh.sh --new-session --no-ssh" >&2
  exit 1
fi

if ! ssh -i "$INSTANCE_SSH_KEY" \
  -p "$LOCAL_PORT" \
  -o ConnectTimeout=5 \
  -o StrictHostKeyChecking=accept-new \
  "$REMOTE_USER@localhost" \
  "bash -lc 'timeout 2 bash -c \"</dev/tcp/$REMOTE_PROXY_HOST/$REMOTE_PROXY_PORT\" >/dev/null 2>&1'" >/dev/null 2>&1; then
  echo "Remote proxy is not reachable at $REMOTE_PROXY_HOST:$REMOTE_PROXY_PORT on the OCI host." >&2
  echo "Start it first with: bash bin/oci_bastion_proxy_tunnel.sh" >&2
  exit 1
fi

ssh -i "$INSTANCE_SSH_KEY" -p "$LOCAL_PORT" "$REMOTE_USER@localhost" "mkdir -p '$REMOTE_STAGE_DIR'"

scp -i "$INSTANCE_SSH_KEY" -P "$LOCAL_PORT" \
  "$ROOT_DIR/deploy/container/docker/docker-compose.production.yml" \
  "$REMOTE_USER@localhost:$REMOTE_STAGE_DIR/docker-compose.yml"

scp -i "$INSTANCE_SSH_KEY" -P "$LOCAL_PORT" \
  "$TEMP_COMPOSE_ENV" \
  "$REMOTE_USER@localhost:$REMOTE_STAGE_DIR/compose.env"

ssh -i "$INSTANCE_SSH_KEY" -p "$LOCAL_PORT" "$REMOTE_USER@localhost" \
  GHCR_USER="$GHCR_USER" \
  GHCR_TOKEN="$GHCR_TOKEN" \
  REMOTE_PROXY_URL="$REMOTE_PROXY_URL" \
  REMOTE_RUNTIME_PATH="$REMOTE_RUNTIME_PATH" \
  REMOTE_COMPOSE_FILE="$REMOTE_COMPOSE_FILE" \
  REMOTE_COMPOSE_ENV_FILE="$REMOTE_COMPOSE_ENV_FILE" \
  REMOTE_STAGE_DIR="$REMOTE_STAGE_DIR" \
  'bash -s' <<'EOF'
set -euo pipefail
sudo mkdir -p "$REMOTE_RUNTIME_PATH"
sudo mv "$REMOTE_STAGE_DIR/docker-compose.yml" "$REMOTE_COMPOSE_FILE"
sudo mv "$REMOTE_STAGE_DIR/compose.env" "$REMOTE_COMPOSE_ENV_FILE"

sudo mkdir -p /etc/docker
docker_proxy_config="$(mktemp)"
cat >"$docker_proxy_config" <<PROXYEOF
{
  "proxies": {
    "http-proxy": "$REMOTE_PROXY_URL",
    "https-proxy": "$REMOTE_PROXY_URL",
    "no-proxy": "127.0.0.1,localhost,::1"
  }
}
PROXYEOF

if ! sudo cmp -s "$docker_proxy_config" /etc/docker/daemon.json; then
  sudo mv "$docker_proxy_config" /etc/docker/daemon.json
else
  rm -f "$docker_proxy_config"
fi

sudo systemctl daemon-reload
sudo systemctl restart docker

for _ in {1..20}; do
  if docker info >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

export HTTPS_PROXY="$REMOTE_PROXY_URL"
export HTTP_PROXY="$REMOTE_PROXY_URL"
ghcr_status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 https://ghcr.io/v2/ || true)"
if [[ "$ghcr_status" != "200" && "$ghcr_status" != "401" ]]; then
  echo "GHCR preflight failed with status: ${ghcr_status:-unknown}" >&2
  exit 1
fi
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker compose -f "$REMOTE_COMPOSE_FILE" --env-file "$REMOTE_COMPOSE_ENV_FILE" pull rifferone
docker compose -f "$REMOTE_COMPOSE_FILE" --env-file "$REMOTE_COMPOSE_ENV_FILE" up -d rifferone
EOF

echo "Production deploy complete."
