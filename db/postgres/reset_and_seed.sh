#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEFAULT_CONFIG_FILE="$ROOT_DIR/conf/postgres.env"
EXAMPLE_CONFIG_FILE="$ROOT_DIR/conf/postgres.env.example"
CONFIG_FILE="${POSTGRES_CONFIG:-$DEFAULT_CONFIG_FILE}"

if [[ -f "$CONFIG_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a
elif [[ "$CONFIG_FILE" == "$DEFAULT_CONFIG_FILE" && -f "$EXAMPLE_CONFIG_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$EXAMPLE_CONFIG_FILE"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -z "${PGHOST:-}" || -z "${PGPORT:-}" || -z "${PGDATABASE:-}" || -z "${PGUSER:-}" || -z "${PGPASSWORD:-}" ]]; then
    echo "Set DATABASE_URL or provide PGHOST, PGPORT, PGDATABASE, PGUSER, and PGPASSWORD via $CONFIG_FILE" >&2
    exit 1
  fi
  DATABASE_URL="postgres://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}"
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/drop_schema.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/schema.sql"
python3 "$SCRIPT_DIR/seed_data.py" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
