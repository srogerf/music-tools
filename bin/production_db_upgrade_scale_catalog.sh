#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/production_db_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_db_upgrade_scale_catalog.sh

Forward-upgrade the live production database to schema version 8 by
adding scale catalog naming columns and synchronizing scale reference
rows from the repo's scale definitions, metadata, and descriptions.

This preserves production data outside the controlled scale reference
tables.
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
  7|8)
    ;;
  *)
    echo "Unexpected production schema version: $current_schema_version" >&2
    exit 1
    ;;
esac

python3 - "$ROOT_DIR/data/scales/DEFINITIONS.json" "$ROOT_DIR/data/scales/METADATA.json" "$ROOT_DIR/data/scales/DESCRIPTIONS.json" <<'PY' | env -u DATABASE_URL \
  PGHOST="$DB_FORWARD_HOST" \
  PGPORT="$DB_FORWARD_PORT" \
  PGDATABASE="$POSTGRES_DB" \
  PGUSER="$POSTGRES_USER" \
  PGPASSWORD="$POSTGRES_PASSWORD" \
  PGSSLMODE=disable \
  psql -v ON_ERROR_STOP=1
import json
import sys

definitions_path, metadata_path, descriptions_path = sys.argv[1:4]
with open(definitions_path, "r", encoding="utf-8") as handle:
    scales = json.load(handle)["scales"]
with open(metadata_path, "r", encoding="utf-8") as handle:
    metadata = json.load(handle)["scales"]
with open(descriptions_path, "r", encoding="utf-8") as handle:
    descriptions = json.load(handle)["descriptions"]


def literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
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
    if degree not in major_or_perfect:
        return str(degree)
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

    IF current_schema_version NOT IN (7, 8) THEN
        RAISE EXCEPTION 'expected production schema version 7 or 8, got %',
            current_schema_version;
    END IF;
END
$$;
""")
print("ALTER TABLE scales ADD COLUMN IF NOT EXISTS musical_name TEXT;")
print("ALTER TABLE scales ADD COLUMN IF NOT EXISTS aliases JSONB NOT NULL DEFAULT '[]'::jsonb;")
print("ALTER TABLE scales ADD COLUMN IF NOT EXISTS parent_family TEXT;")
print("ALTER TABLE scales ADD COLUMN IF NOT EXISTS parent_mode_number SMALLINT;")
print("ALTER TABLE scales ADD COLUMN IF NOT EXISTS latent BOOLEAN NOT NULL DEFAULT FALSE;")
print("""
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scales_aliases_check'
    ) THEN
        ALTER TABLE scales
        ADD CONSTRAINT scales_aliases_check
        CHECK (jsonb_typeof(aliases) = 'array');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scales_parent_mode_number_check'
    ) THEN
        ALTER TABLE scales
        ADD CONSTRAINT scales_parent_mode_number_check
        CHECK (parent_mode_number IS NULL OR parent_mode_number >= 1);
    END IF;
END
$$;
""")

scale_types = sorted({scale["type"] for scale in scales})
for scale_type in scale_types:
    print(
        "INSERT INTO scale_types (code) "
        f"VALUES ({literal(scale_type)}) "
        "ON CONFLICT (code) DO NOTHING;"
    )

for scale in scales:
    item = metadata[scale["name"]]
    description = descriptions[scale["name"]]
    aliases = json.dumps(item.get("aliases", []))
    common_name = item.get("common_name") or scale["common_name"]
    musical_name = item.get("musical_name")
    parent_family = item.get("parent_family")
    parent_mode_number = item.get("parent_mode_number")
    latent = bool(item.get("latent", False))

    print(
        "INSERT INTO scales (external_id, name, common_name, musical_name, description, aliases, parent_family, parent_mode_number, latent, scale_type_id) "
        "VALUES ("
        f"{scale['id']}, "
        f"{literal(scale['name'])}, "
        f"{literal(common_name)}, "
        f"{literal(musical_name)}, "
        f"{literal(description)}, "
        f"{literal(aliases)}::jsonb, "
        f"{literal(parent_family)}, "
        f"{literal(parent_mode_number)}, "
        f"{literal(latent)}, "
        f"(SELECT id FROM scale_types WHERE code = {literal(scale['type'])})"
        ") "
        "ON CONFLICT (external_id) DO UPDATE SET "
        "name = EXCLUDED.name, "
        "common_name = EXCLUDED.common_name, "
        "musical_name = EXCLUDED.musical_name, "
        "description = EXCLUDED.description, "
        "aliases = EXCLUDED.aliases, "
        "parent_family = EXCLUDED.parent_family, "
        "parent_mode_number = EXCLUDED.parent_mode_number, "
        "latent = EXCLUDED.latent, "
        "scale_type_id = EXCLUDED.scale_type_id;"
    )

    print(f"DELETE FROM scale_intervals WHERE scale_id = (SELECT id FROM scales WHERE external_id = {scale['id']});")
    for ordinal, interval in enumerate(scale["intervals"], start=1):
        semitones = interval["semitones"]
        degree = interval["degree"]
        print(
            "INSERT INTO scale_intervals (scale_id, ordinal, semitones, degree_class, interval_label) "
            "VALUES ("
            f"(SELECT id FROM scales WHERE external_id = {scale['id']}), "
            f"{ordinal}, {semitones}, {degree}, {literal(interval_label(semitones, degree))}"
            ");"
        )

print("""
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM scales
        WHERE description IS NULL OR description = '' OR aliases IS NULL
    ) THEN
        RAISE EXCEPTION 'scale catalog upgrade left missing scale metadata';
    END IF;
END
$$;

UPDATE schema_metadata
SET schema_version = 8,
    seed_data_format_version = 5
WHERE singleton = TRUE;

COMMIT;
""")
PY

echo "Production scale catalog upgrade complete."
