#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
SQL_DIR="$ROOT_DIR/db/sql"
DEFAULT_CONFIG_FILE="$ROOT_DIR/.private/conf/postgres.env"
EXAMPLE_CONFIG_FILE="$ROOT_DIR/conf/postgres.env.example"
CONFIG_FILE="${POSTGRES_CONFIG:-$DEFAULT_CONFIG_FILE}"
ENVIRONMENT="production"
OVERRIDE_PRODUCTION_FAILSAFE="false"

usage() {
  cat >&2 <<'EOF'
Usage: bash db/postgres/rebuild_schema.sh --env test
   or: bash db/postgres/rebuild_schema.sh --override-production-failsafe

Rules:
  --env test                     Required for destructive non-production rebuilds
  --override-production-failsafe Required for first-time production bootstrap

Without --env test, production is assumed.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --env" >&2
        usage
        exit 1
      fi
      ENVIRONMENT="$2"
      shift 2
      ;;
    --override-production-failsafe)
      OVERRIDE_PRODUCTION_FAILSAFE="true"
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

if [[ "$ENVIRONMENT" != "test" && "$ENVIRONMENT" != "production" ]]; then
  echo "Unsupported environment: $ENVIRONMENT" >&2
  usage
  exit 1
fi

if [[ "$ENVIRONMENT" == "test" && "$OVERRIDE_PRODUCTION_FAILSAFE" == "true" ]]; then
  echo "Do not combine --env test with --override-production-failsafe." >&2
  exit 1
fi

if [[ "$ENVIRONMENT" == "production" && "$OVERRIDE_PRODUCTION_FAILSAFE" != "true" ]]; then
  echo "Refusing destructive schema rebuild with production-default behavior." >&2
  echo "Use --env test for non-production, or --override-production-failsafe only for first-time production bootstrap." >&2
  exit 1
fi

if [[ -f "$CONFIG_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -z "${PGHOST:-}" || -z "${PGPORT:-}" || -z "${PGDATABASE:-}" || -z "${PGUSER:-}" || -z "${PGPASSWORD:-}" ]]; then
    echo "Set DATABASE_URL or provide PGHOST, PGPORT, PGDATABASE, PGUSER, and PGPASSWORD via $CONFIG_FILE" >&2
    echo "You can copy $EXAMPLE_CONFIG_FILE to $DEFAULT_CONFIG_FILE and fill in real local values." >&2
    exit 1
  fi
  PSQL_TARGET=(-h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE")
else
  PSQL_TARGET=("$DATABASE_URL")
fi

echo "Target database environment: $ENVIRONMENT"

psql "${PSQL_TARGET[@]}" -v ON_ERROR_STOP=1 -f "$SQL_DIR/drop_schema.sql"
psql "${PSQL_TARGET[@]}" -v ON_ERROR_STOP=1 -f "$SQL_DIR/schema.sql"
