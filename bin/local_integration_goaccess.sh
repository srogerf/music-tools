#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${LOCAL_INTEGRATION_ENV_FILE:-$ROOT_DIR/.private/container/compose.env}"
COMPOSE_FILE="$ROOT_DIR/deploy/container/docker/docker-compose.yml"
COMPOSE_DIR="$ROOT_DIR/deploy/container/docker"
DEFAULT_NGINX_LOG_PATH="$ROOT_DIR/.private/container/local-integration/logs/nginx"
DEFAULT_GOACCESS_REPORT_PATH="$ROOT_DIR/.private/container/local-integration/reports"

# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/shell_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/local_integration_goaccess.sh

Generates a static GoAccess HTML report from the local integration nginx
access log. Start local integration first, then visit a few pages before
running this command.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing local integration env file: $ENV_FILE" >&2
  echo "Run bash bin/local_integration_start.sh first." >&2
  exit 1
fi

NGINX_LOG_PATH="$(env_file_path_value "$ENV_FILE" NGINX_LOG_PATH "$DEFAULT_NGINX_LOG_PATH" "$COMPOSE_DIR")"
GOACCESS_REPORT_PATH="$(env_file_path_value "$ENV_FILE" GOACCESS_REPORT_PATH "$DEFAULT_GOACCESS_REPORT_PATH" "$COMPOSE_DIR")"

if [[ ! -s "$NGINX_LOG_PATH/access.log" ]]; then
  echo "No nginx access log entries found at $NGINX_LOG_PATH/access.log" >&2
  echo "Start local integration and hit the app before generating a report." >&2
  exit 1
fi

mkdir -p "$GOACCESS_REPORT_PATH"

NGINX_LOG_PATH="$NGINX_LOG_PATH" \
GOACCESS_REPORT_PATH="$GOACCESS_REPORT_PATH" \
docker compose \
  -f "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  --profile reports \
  run --rm goaccess

echo "GoAccess report: $GOACCESS_REPORT_PATH/index.html"
