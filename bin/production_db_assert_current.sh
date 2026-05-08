#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/production_db_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_db_assert_current.sh

Verify that the live production database has the repo's current schema version
and seed data format version. The production deploy script runs this check so
schema migrations and reference-data seeding cannot be skipped accidentally.
EOF
  production_db_usage_common
}

case "${1:-}" in
  --help|-h)
    usage
    exit 0
    ;;
  "")
    ;;
  *)
    echo "Unknown argument: $1" >&2
    usage
    exit 1
    ;;
esac

expected_versions="$(
  python3 - "$ROOT_DIR/db/postgres/versions.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    versions = json.load(handle)

print(f"{versions['schema_version']}|{versions['data_format_version']}")
PY
)"
expected_schema_version="${expected_versions%%|*}"
expected_seed_data_format_version="${expected_versions##*|}"

production_db_load_context "$ROOT_DIR"
production_db_require_ssh_tunnel
production_db_load_remote_compose_env
trap production_db_cleanup_forward EXIT
production_db_open_forward

actual_versions="$(
  PGPASSWORD="$POSTGRES_PASSWORD" \
  psql \
    -h "$DB_FORWARD_HOST" \
    -p "$DB_FORWARD_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    -tA \
    -F '|' \
    -c "SELECT schema_version, COALESCE(seed_data_format_version, -1) FROM schema_metadata WHERE singleton = TRUE;"
)"

actual_schema_version="${actual_versions%%|*}"
actual_seed_data_format_version="${actual_versions##*|}"

if [[ "$actual_schema_version" != "$expected_schema_version" || "$actual_seed_data_format_version" != "$expected_seed_data_format_version" ]]; then
  cat >&2 <<EOF
Production database is not release-ready.

Expected:
  schema_version:           $expected_schema_version
  seed_data_format_version: $expected_seed_data_format_version

Actual:
  schema_version:           ${actual_schema_version:-missing}
  seed_data_format_version: ${actual_seed_data_format_version:--1}

Run the required database steps, then retry the deploy:
  bash bin/production_db_upgrade_scale_layout_positions.sh
  bash bin/production_db_upgrade_scale_intervals.sh
  bash bin/production_db_upgrade_scale_descriptions.sh
  bash bin/production_db_upgrade_scale_catalog.sh
  bash bin/production_db_seed.sh
EOF
  exit 1
fi

echo "Production database is current: schema $actual_schema_version, seed data format $actual_seed_data_format_version."
