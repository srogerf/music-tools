#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_DIR="$ROOT_DIR/deploy/container/docker"
ENV_FILE="${LOCAL_INTEGRATION_ENV_FILE:-$ROOT_DIR/.private/container/compose.env}"
DEFAULT_DATA_PATH="$ROOT_DIR/.private/container/local-integration/postgres-data"
DEFAULT_NGINX_LOG_PATH="$ROOT_DIR/.private/container/local-integration/logs/nginx"
DEFAULT_GOACCESS_REPORT_PATH="$ROOT_DIR/.private/container/local-integration/reports"

# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/shell_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/local_integration_start.sh

Builds the pre-container artifacts, ensures the private local integration
environment exists, then builds and starts the Docker Compose stack.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

bash "$ROOT_DIR/bin/localhost_docker_access_check.sh"

mkdir -p "$ROOT_DIR/.private/container/local-integration"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT_DIR/deploy/container/docker/compose.env.example" "$ENV_FILE"
  echo "Created $ENV_FILE from example. Edit POSTGRES_PASSWORD before first real use." >&2
fi

if ! grep -Eq '^[[:space:]]*POSTGRES_DATA_PATH[[:space:]]*=' "$ENV_FILE"; then
  printf '\nPOSTGRES_DATA_PATH=%s\n' "$DEFAULT_DATA_PATH" >>"$ENV_FILE"
fi
if ! grep -Eq '^[[:space:]]*NGINX_LOG_PATH[[:space:]]*=' "$ENV_FILE"; then
  printf 'NGINX_LOG_PATH=%s\n' "$DEFAULT_NGINX_LOG_PATH" >>"$ENV_FILE"
fi
if ! grep -Eq '^[[:space:]]*GOACCESS_REPORT_PATH[[:space:]]*=' "$ENV_FILE"; then
  printf 'GOACCESS_REPORT_PATH=%s\n' "$DEFAULT_GOACCESS_REPORT_PATH" >>"$ENV_FILE"
fi

POSTGRES_DATA_PATH="$(env_file_path_value "$ENV_FILE" POSTGRES_DATA_PATH "$DEFAULT_DATA_PATH" "$COMPOSE_DIR")"
NGINX_LOG_PATH="$(env_file_path_value "$ENV_FILE" NGINX_LOG_PATH "$DEFAULT_NGINX_LOG_PATH" "$COMPOSE_DIR")"
GOACCESS_REPORT_PATH="$(env_file_path_value "$ENV_FILE" GOACCESS_REPORT_PATH "$DEFAULT_GOACCESS_REPORT_PATH" "$COMPOSE_DIR")"

mkdir -p "$POSTGRES_DATA_PATH"
mkdir -p "$NGINX_LOG_PATH" "$GOACCESS_REPORT_PATH"

bash "$ROOT_DIR/bin/build_artifacts.sh"

POSTGRES_DATA_PATH="$POSTGRES_DATA_PATH" \
NGINX_LOG_PATH="$NGINX_LOG_PATH" \
GOACCESS_REPORT_PATH="$GOACCESS_REPORT_PATH" \
docker compose \
  -f "$ROOT_DIR/deploy/container/docker/docker-compose.yml" \
  --env-file "$ENV_FILE" \
  build

POSTGRES_DATA_PATH="$POSTGRES_DATA_PATH" \
NGINX_LOG_PATH="$NGINX_LOG_PATH" \
GOACCESS_REPORT_PATH="$GOACCESS_REPORT_PATH" \
docker compose \
  -f "$ROOT_DIR/deploy/container/docker/docker-compose.yml" \
  --env-file "$ENV_FILE" \
  up -d

echo "Local integration environment is running."
echo "Compose env: $ENV_FILE"
echo "Postgres data: $POSTGRES_DATA_PATH"
echo "nginx logs: $NGINX_LOG_PATH"
echo "GoAccess reports: $GOACCESS_REPORT_PATH"
