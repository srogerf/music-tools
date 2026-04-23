#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_ENV_FILE="${LOCAL_INTEGRATION_ENV_FILE:-$ROOT_DIR/.private/container/compose.env}"
TEMP_CONFIG_FILE="$(mktemp)"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/local_integration_seed.sh

Rebuilds and seeds the Docker Compose local integration database by connecting
through the host-mapped Postgres port.
EOF
}

cleanup() {
  rm -f "$TEMP_CONFIG_FILE"
}
trap cleanup EXIT

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ ! -f "$COMPOSE_ENV_FILE" ]]; then
  echo "Missing local integration compose env: $COMPOSE_ENV_FILE" >&2
  echo "Run bash bin/local_integration_start.sh first." >&2
  exit 1
fi

get_env_value() {
  local key="$1"
  grep -E "^[[:space:]]*${key}[[:space:]]*=" "$COMPOSE_ENV_FILE" | tail -n 1 | cut -d= -f2-
}

POSTGRES_DB="$(get_env_value POSTGRES_DB)"
POSTGRES_USER="$(get_env_value POSTGRES_USER)"
POSTGRES_PASSWORD="$(get_env_value POSTGRES_PASSWORD)"

if [[ -z "$POSTGRES_DB" || -z "$POSTGRES_USER" || -z "$POSTGRES_PASSWORD" ]]; then
  echo "compose env must define POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD." >&2
  exit 1
fi

cat >"$TEMP_CONFIG_FILE" <<EOF
PGHOST=127.0.0.1
PGPORT=5432
PGDATABASE=$POSTGRES_DB
PGUSER=$POSTGRES_USER
PGPASSWORD=$POSTGRES_PASSWORD
PGSSLMODE=disable
EOF

POSTGRES_CONFIG="$TEMP_CONFIG_FILE" bash "$ROOT_DIR/db/postgres/rebuild_schema.sh" --env test
POSTGRES_CONFIG="$TEMP_CONFIG_FILE" bash "$ROOT_DIR/db/postgres/reset_and_seed.sh" --env test

echo "Local integration database rebuilt and seeded."
