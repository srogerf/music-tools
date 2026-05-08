#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/production_db_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_db_seed.sh

Seed the live production database only when the managed tables are empty.
This command does not clear or reseed existing live data. Production reference
data changes must be applied through controlled forward migrations, not
reset-and-seed.
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

production_db_load_context "$ROOT_DIR"
production_db_require_ssh_tunnel
production_db_load_remote_compose_env
trap production_db_cleanup_forward EXIT
production_db_open_forward

echo "Production seed: checking managed tables..."
managed_row_count="$(
  PGPASSWORD="$POSTGRES_PASSWORD" \
  psql \
    -h "$DB_FORWARD_HOST" \
    -p "$DB_FORWARD_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    -tA \
    -c "SELECT (
          (SELECT count(*) FROM scales)
        + (SELECT count(*) FROM scale_types)
        + (SELECT count(*) FROM scale_layouts)
        + (SELECT count(*) FROM scale_layout_positions)
        + (SELECT count(*) FROM scale_layout_position_split_ranges)
        + (SELECT count(*) FROM scale_layout_position_split_range_strings)
        + (SELECT count(*) FROM scale_intervals)
        + (SELECT count(*) FROM key_signature_groups)
        + (SELECT count(*) FROM key_signatures)
        + (SELECT count(*) FROM tunings)
        + (SELECT count(*) FROM tuning_strings)
      );"
)"

if [[ "$managed_row_count" != "0" ]]; then
  echo "Refusing to seed production because managed tables already contain data ($managed_row_count rows)." >&2
  echo "Production seeding is only allowed for an empty managed schema." >&2
  exit 1
fi

echo "Production seed: streaming reference data..."
SECONDS=0
env -u DATABASE_URL \
  POSTGRES_CONFIG=/dev/null \
  PGHOST="$DB_FORWARD_HOST" \
  PGPORT="$DB_FORWARD_PORT" \
  PGDATABASE="$POSTGRES_DB" \
  PGUSER="$POSTGRES_USER" \
  PGPASSWORD="$POSTGRES_PASSWORD" \
  bash -c 'python3 "$1" | PGPASSWORD="$PGPASSWORD" psql -q -v ON_ERROR_STOP=1 -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"' _ \
    "$ROOT_DIR/db/postgres/seed_data.py"

echo "Production seed: completed in ${SECONDS}s."
echo "Production database seeded from empty managed tables."
