#!/usr/bin/env python3

import glob
import json
import os
import sys
from typing import Any


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def read_json(*parts: str) -> Any:
    path = os.path.join(ROOT, *parts)
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def read_versions() -> dict[str, Any]:
    return read_json("db", "postgres", "versions.json")


def sql_literal(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value).replace("'", "''")
    return "'" + text + "'"


def print_insert(statement: str) -> None:
    print(statement.rstrip() + ";")


def progress(message: str) -> None:
    print(f"-- {message}", file=sys.stderr, flush=True)


def interval_label(semitones: int, degree: int) -> str:
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


def load_layout_files() -> list[dict[str, Any]]:
    paths = sorted(glob.glob(os.path.join(ROOT, "data", "scales", "layouts", "*.json")))
    layouts = []
    for path in paths:
        with open(path, "r", encoding="utf-8") as handle:
            layouts.append(json.load(handle))
    return layouts


def split_ranges_for_position(position: dict[str, Any]) -> list[dict[str, Any]]:
    split_ranges = position.get("split_ranges") or []
    if split_ranges:
        return split_ranges

    per_string = position.get("per_string") or {}
    grouped_ranges: dict[tuple[int, int], list[int]] = {}
    for string_index_text, fret_range in sorted(per_string.items(), key=lambda item: int(item[0])):
        key = (int(fret_range["start"]), int(fret_range["span"]))
        grouped_ranges.setdefault(key, []).append(int(string_index_text))

    return [
        {"start": start, "span": span, "strings": strings}
        for (start, span), strings in grouped_ranges.items()
    ]


def main() -> None:
    versions = read_versions()
    schema_version = int(versions["schema_version"])
    data_format_version = int(versions["data_format_version"])
    supported_schema_versions = [
        int(version) for version in versions["seed_supported_schema_versions"]
    ]

    scales = read_json("data", "scales", "DEFINITIONS.json")["scales"]
    scale_metadata = read_json("data", "scales", "METADATA.json")["scales"]
    scale_descriptions = read_json("data", "scales", "DESCRIPTIONS.json")["descriptions"]
    key_signatures = read_json("data", "scales", "KEY_SIGNATURES.json")
    tunings = read_json("data", "tunings", "DEFINITIONS.json")["tunings"]
    layout_files = load_layout_files()

    scale_names = {scale["name"] for scale in scales}
    metadata_names = set(scale_metadata.keys())
    description_names = set(scale_descriptions.keys())
    missing_metadata = sorted(scale_names - metadata_names)
    unknown_metadata = sorted(metadata_names - scale_names)
    missing_descriptions = sorted(scale_names - description_names)
    unknown_descriptions = sorted(description_names - scale_names)
    if missing_metadata:
        raise SystemExit(
            "Missing metadata for scales: " + ", ".join(missing_metadata)
        )
    if unknown_metadata:
        raise SystemExit(
            "Metadata exists for unknown scales: " + ", ".join(unknown_metadata)
        )
    if missing_descriptions:
        raise SystemExit(
            "Missing descriptions for scales: " + ", ".join(missing_descriptions)
        )
    if unknown_descriptions:
        raise SystemExit(
            "Descriptions exist for unknown scales: " + ", ".join(unknown_descriptions)
        )

    print("BEGIN;")

    progress("seeding schema metadata")
    supported_schema_versions_sql = ", ".join(str(version) for version in supported_schema_versions)
    print(
        f"""DO $seed$
DECLARE
    actual_schema_version INTEGER;
BEGIN
    SELECT schema_version
    INTO actual_schema_version
    FROM schema_metadata
    WHERE singleton = TRUE;

    IF actual_schema_version IS NULL THEN
        RAISE EXCEPTION 'schema_metadata is missing schema_version';
    END IF;

    IF actual_schema_version NOT IN ({supported_schema_versions_sql}) THEN
        RAISE EXCEPTION 'seed data format version % does not support schema version %',
            {data_format_version}, actual_schema_version;
    END IF;
END
$seed$;"""
    )

    print_insert(
        "UPDATE schema_metadata "
        f"SET seed_data_format_version = {data_format_version} "
        "WHERE singleton = TRUE"
    )

    progress("seeding scale types")
    scale_types = sorted({scale["type"] for scale in scales})
    for scale_type in scale_types:
        print_insert(
            f"INSERT INTO scale_types (code) VALUES ({sql_literal(scale_type)})"
        )

    progress("seeding scales and intervals")
    for scale in scales:
        metadata = scale_metadata[scale["name"]]
        print_insert(
            "INSERT INTO scales (external_id, name, common_name, musical_name, description, aliases, parent_family, parent_mode_number, latent, scale_type_id) "
            f"VALUES ({scale['id']}, {sql_literal(scale['name'])}, {sql_literal(metadata.get('common_name') or scale['common_name'])}, "
            f"{sql_literal(metadata.get('musical_name'))}, "
            f"{sql_literal(scale_descriptions[scale['name']])}, "
            f"{sql_literal(json.dumps(metadata.get('aliases', [])))}::jsonb, "
            f"{sql_literal(metadata.get('parent_family'))}, "
            f"{sql_literal(metadata.get('parent_mode_number'))}, "
            f"{sql_literal(bool(metadata.get('latent', False)))}, "
            f"(SELECT id FROM scale_types WHERE code = {sql_literal(scale['type'])}))"
        )
        for ordinal, interval in enumerate(scale["intervals"], start=1):
            semitones = interval["semitones"]
            degree_class = interval["degree"]
            print_insert(
                "INSERT INTO scale_intervals (scale_id, ordinal, semitones, degree_class, interval_label) "
                "VALUES ("
                f"(SELECT id FROM scales WHERE external_id = {scale['id']}), "
                f"{ordinal}, {semitones}, {degree_class}, {sql_literal(interval_label(semitones, degree_class))})"
            )

    progress("seeding key signatures")
    for group_code in sorted(key_signatures.keys()):
        print_insert(
            f"INSERT INTO key_signature_groups (code) VALUES ({sql_literal(group_code)})"
        )
        for item in key_signatures[group_code]:
            print_insert(
                "INSERT INTO key_signatures (key_signature_group_id, key_name, accidentals) "
                f"VALUES ((SELECT id FROM key_signature_groups WHERE code = {sql_literal(group_code)}), "
                f"{sql_literal(item['key'])}, {item['accidentals']})"
            )

    progress("seeding tunings")
    tuning_ids_by_name: dict[str, int] = {}
    for tuning in tunings:
        tuning_ids_by_name[tuning["name"]] = tuning["id"]
        print_insert(
            "INSERT INTO tunings (external_id, name, string_count) "
            f"VALUES ({tuning['id']}, {sql_literal(tuning['name'])}, {tuning['string_count']})"
        )
        for string_number, note_name in enumerate(tuning["strings"], start=1):
            print_insert(
                "INSERT INTO tuning_strings (tuning_id, string_number, note_name) "
                "VALUES ("
                f"(SELECT id FROM tunings WHERE external_id = {tuning['id']}), "
                f"{string_number}, {sql_literal(note_name)})"
            )

    progress("seeding layouts")
    for layout_file in layout_files:
        scale_id = layout_file["id"]
        for layout in layout_file["layouts"]:
            tuning_name = layout["tuning"]
            family_code = layout.get("family_code") or "standard"
            if tuning_name not in tuning_ids_by_name:
                raise SystemExit(f"Unknown tuning in layout file: {tuning_name}")
            tuning_id = tuning_ids_by_name[tuning_name]

            print_insert(
                "INSERT INTO scale_layouts (scale_id, tuning_id, family_code) "
                "VALUES ("
                f"(SELECT id FROM scales WHERE external_id = {scale_id}), "
                f"(SELECT id FROM tunings WHERE external_id = {tuning_id}), "
                f"{sql_literal(family_code)})"
            )

            for position_code in sorted(layout["positions"].keys()):
                position = layout["positions"][position_code]
                mode = position["mode"]
                start_fret = position.get("start")
                fret_span = position.get("span")
                validated_manual = position.get("validated_manual", False)

                print_insert(
                    "INSERT INTO scale_layout_positions "
                    "(scale_layout_id, position_code, mode, start_fret, fret_span, validated_manual) "
                    "VALUES ("
                    "(SELECT id FROM scale_layouts WHERE "
                    f"scale_id = (SELECT id FROM scales WHERE external_id = {scale_id}) "
                    f"AND tuning_id = (SELECT id FROM tunings WHERE external_id = {tuning_id}) "
                    f"AND family_code = {sql_literal(family_code)}), "
                    f"{sql_literal(position_code)}, "
                    f"{sql_literal(mode)}, "
                    f"{sql_literal(start_fret if mode != 'split' else None)}, "
                    f"{sql_literal(fret_span if mode != 'split' else None)}, "
                    f"{sql_literal(validated_manual)})"
                )

                for ordinal, split_range in enumerate(split_ranges_for_position(position), start=1):
                    print_insert(
                        "INSERT INTO scale_layout_position_split_ranges "
                        "(scale_layout_position_id, ordinal, start_fret, fret_span) "
                        "VALUES ("
                        "(SELECT id FROM scale_layout_positions "
                        "WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE "
                        f"scale_id = (SELECT id FROM scales WHERE external_id = {scale_id}) "
                        f"AND tuning_id = (SELECT id FROM tunings WHERE external_id = {tuning_id}) "
                        f"AND family_code = {sql_literal(family_code)}) "
                        f"AND position_code = {sql_literal(position_code)}), "
                        f"{ordinal}, {split_range['start']}, {split_range['span']})"
                    )

                    for string_index in split_range.get("strings", []):
                        print_insert(
                            "INSERT INTO scale_layout_position_split_range_strings "
                            "(split_range_id, string_index_zero_based) "
                            "VALUES ("
                            "(SELECT id FROM scale_layout_position_split_ranges "
                            "WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions "
                            "WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE "
                            f"scale_id = (SELECT id FROM scales WHERE external_id = {scale_id}) "
                            f"AND tuning_id = (SELECT id FROM tunings WHERE external_id = {tuning_id}) "
                            f"AND family_code = {sql_literal(family_code)}) "
                            f"AND position_code = {sql_literal(position_code)}) "
                            f"AND ordinal = {ordinal}), "
                            f"{string_index})"
                        )

                per_string_frets = position.get("per_string_frets") or {}
                for string_index_text in sorted(per_string_frets.keys(), key=int):
                    for fret in per_string_frets[string_index_text]:
                        print_insert(
                            "INSERT INTO scale_layout_position_string_frets "
                            "(scale_layout_position_id, string_index_zero_based, fret) "
                            "VALUES ("
                            "(SELECT id FROM scale_layout_positions "
                            "WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE "
                            f"scale_id = (SELECT id FROM scales WHERE external_id = {scale_id}) "
                            f"AND tuning_id = (SELECT id FROM tunings WHERE external_id = {tuning_id}) "
                            f"AND family_code = {sql_literal(family_code)}) "
                            f"AND position_code = {sql_literal(position_code)}), "
                            f"{int(string_index_text)}, {fret})"
                        )

    print("COMMIT;")


if __name__ == "__main__":
    main()
