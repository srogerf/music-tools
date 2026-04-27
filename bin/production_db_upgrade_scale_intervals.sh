#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/production_db_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_db_upgrade_scale_intervals.sh

Forward-upgrade the live production database from schema version 3 to 4 by
adding functional scale interval metadata:
  - scale_intervals.degree_class
  - scale_intervals.interval_label

This preserves existing production data and updates only scale interval
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

python3 - "$ROOT_DIR/data/scales/DEFINITIONS.json" <<'PY' | env -u DATABASE_URL \
  PGHOST="$DB_FORWARD_HOST" \
  PGPORT="$DB_FORWARD_PORT" \
  PGDATABASE="$POSTGRES_DB" \
  PGUSER="$POSTGRES_USER" \
  PGPASSWORD="$POSTGRES_PASSWORD" \
  PGSSLMODE=disable \
  psql -v ON_ERROR_STOP=1
import json
import sys

definitions_path = sys.argv[1]
with open(definitions_path, "r", encoding="utf-8") as handle:
    scales = json.load(handle)["scales"]


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


def interval_label(semitones, degree):
    major_or_perfect = {
        1: 0,
        2: 2,
        3: 4,
        4: 5,
        5: 7,
        6: 9,
        7: 11,
    }
    offset = (semitones - major_or_perfect[degree] + 12) % 12
    if offset > 6:
        offset -= 12

    if degree == 1 and offset == 0:
        return "root"
    if offset == 0:
        return str(degree)
    if offset > 0:
        return "#" * offset + str(degree)
    return "b" * abs(offset) + str(degree)


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

    IF current_schema_version NOT IN (3, 4) THEN
        RAISE EXCEPTION 'expected production schema version 3 or 4, got %',
            current_schema_version;
    END IF;
END
$$;
""")
print("ALTER TABLE scale_intervals ADD COLUMN IF NOT EXISTS degree_class SMALLINT;")
print("ALTER TABLE scale_intervals ADD COLUMN IF NOT EXISTS interval_label TEXT;")

for scale in scales:
    intervals = scale["intervals"]
    for ordinal, interval in enumerate(intervals, start=1):
        semitones = interval["semitones"]
        degree = interval["degree"]
        print(
            "UPDATE scale_intervals "
            f"SET degree_class = {degree}, "
            f"interval_label = {literal(interval_label(semitones, degree))} "
            "WHERE scale_id = (SELECT id FROM scales "
            f"WHERE external_id = {scale['id']}) "
            f"AND ordinal = {ordinal};"
        )

print("""
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM scale_intervals
        WHERE degree_class IS NULL OR interval_label IS NULL OR interval_label = ''
    ) THEN
        RAISE EXCEPTION 'scale interval upgrade left missing metadata rows';
    END IF;
END
$$;

ALTER TABLE scale_intervals ALTER COLUMN degree_class SET NOT NULL;
ALTER TABLE scale_intervals ALTER COLUMN interval_label SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'scale_intervals_degree_class_check'
    ) THEN
        ALTER TABLE scale_intervals
        ADD CONSTRAINT scale_intervals_degree_class_check
        CHECK (degree_class BETWEEN 1 AND 7);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'scale_intervals_interval_label_check'
    ) THEN
        ALTER TABLE scale_intervals
        ADD CONSTRAINT scale_intervals_interval_label_check
        CHECK (interval_label <> '');
    END IF;
END
$$;

UPDATE schema_metadata
SET schema_version = 4,
    seed_data_format_version = 2
WHERE singleton = TRUE;

COMMIT;
""")
PY

echo "Production scale interval metadata upgrade complete."
