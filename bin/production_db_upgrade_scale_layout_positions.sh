#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/production_db_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_db_upgrade_scale_layout_positions.sh

Forward-upgrade the live production database from schema version 4 to 5 by
allowing the 3NPS A2 and D2 scale layout position codes.

This preserves existing production data and clears the seed data version only
when moving from schema version 4 to 5, so production_db_seed.sh must be run
after this migration before the normal production deploy can continue.
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

PGPASSWORD="$POSTGRES_PASSWORD" \
psql \
  -h "$DB_FORWARD_HOST" \
  -p "$DB_FORWARD_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DO $$
DECLARE
    current_schema_version INTEGER;
BEGIN
    SELECT schema_version
    INTO current_schema_version
    FROM schema_metadata
    WHERE singleton = TRUE;

    IF current_schema_version NOT IN (4, 5) THEN
        RAISE EXCEPTION 'expected production schema version 4 or 5, got %',
            current_schema_version;
    END IF;
END
$$;

ALTER TABLE scale_layout_positions
DROP CONSTRAINT IF EXISTS scale_layout_positions_position_code_check;

ALTER TABLE scale_layout_positions
ADD CONSTRAINT scale_layout_positions_position_code_check
CHECK (position_code IN ('C', 'A', 'A2', 'G', 'E', 'D', 'D2'));

UPDATE schema_metadata
SET schema_version = 5,
    seed_data_format_version = CASE
        WHEN schema_version = 4 THEN NULL
        ELSE seed_data_format_version
    END
WHERE singleton = TRUE;

COMMIT;
SQL

echo "Production scale layout position schema upgrade complete."
echo "Next required step: bash bin/production_db_seed.sh"
