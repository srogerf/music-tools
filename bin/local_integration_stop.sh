#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${LOCAL_INTEGRATION_ENV_FILE:-$ROOT_DIR/.private/container/compose.env}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/local_integration_stop.sh

Stops the Docker Compose local integration environment. Data under
.private/container/local-integration/ is preserved.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

docker compose \
  -f "$ROOT_DIR/deploy/container/docker/docker-compose.yml" \
  --env-file "$ENV_FILE" \
  down
