#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/production_db_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_db_upgrade_scale_descriptions.sh

Forward-upgrade the live production database to schema version 6 by
adding scale descriptions to the scales table.

This preserves existing production data and updates only scale
reference rows plus schema metadata.
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

current_schema_version="$(
  PGPASSWORD="$POSTGRES_PASSWORD" \
  psql \
    -h "$DB_FORWARD_HOST" \
    -p "$DB_FORWARD_PORT" \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -v ON_ERROR_STOP=1 \
    -tA \
    -c "SELECT schema_version FROM schema_metadata WHERE singleton = TRUE;"
)"

case "$current_schema_version" in
  5|6)
    ;;
  *)
    echo "Unexpected production schema version: $current_schema_version" >&2
    exit 1
    ;;
esac

python3 - "$ROOT_DIR/data/scales/DESCRIPTIONS.json" <<'PY' | env -u DATABASE_URL \
  PGHOST="$DB_FORWARD_HOST" \
  PGPORT="$DB_FORWARD_PORT" \
  PGDATABASE="$POSTGRES_DB" \
  PGUSER="$POSTGRES_USER" \
  PGPASSWORD="$POSTGRES_PASSWORD" \
  PGSSLMODE=disable \
  psql -v ON_ERROR_STOP=1
import json
import sys

descriptions_path = sys.argv[1]
with open(descriptions_path, "r", encoding="utf-8") as handle:
    descriptions = json.load(handle)["descriptions"]


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


print("BEGIN;")
print("""
DO $$
DECLARE
    current_schema_version INTEGER;
BEGIN
    SELECT schema_version
    INTO current_schema_version
    FROM schema_metadata
    WHERE singleton = TRUE;

    IF current_schema_version NOT IN (5, 6) THEN
        RAISE EXCEPTION 'expected production schema version 5 or 6, got %',
            current_schema_version;
    END IF;
END
$$;
""")
print("ALTER TABLE scales ADD COLUMN IF NOT EXISTS description TEXT;")

for name, description in sorted(descriptions.items()):
    print(
        "UPDATE scales "
        f"SET description = {literal(description)} "
        f"WHERE name = {literal(name)};"
    )

print("""
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM scales
        WHERE description IS NULL OR description = ''
    ) THEN
        RAISE EXCEPTION 'scale description upgrade left missing descriptions';
    END IF;
END
$$;

ALTER TABLE scales ALTER COLUMN description SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'scales_description_check'
    ) THEN
        ALTER TABLE scales
        ADD CONSTRAINT scales_description_check
        CHECK (description <> '');
    END IF;
END
$$;

UPDATE schema_metadata
SET schema_version = 6,
    seed_data_format_version = 3
WHERE singleton = TRUE;

COMMIT;
""")
PY

echo "Production scale description upgrade complete."
