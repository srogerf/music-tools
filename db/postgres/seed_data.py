#!/usr/bin/env python3

import glob
import json
import os
from typing import Any


ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def read_json(*parts: str) -> Any:
    path = os.path.join(ROOT, *parts)
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


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


def load_layout_files() -> list[dict[str, Any]]:
    paths = sorted(glob.glob(os.path.join(ROOT, "data", "scales", "layouts", "*.json")))
    layouts = []
    for path in paths:
        with open(path, "r", encoding="utf-8") as handle:
            layouts.append(json.load(handle))
    return layouts


def main() -> None:
    scales = read_json("data", "scales", "DEFINITIONS.json")["scales"]
    key_signatures = read_json("data", "scales", "KEY_SIGNATURES.json")
    tunings = read_json("data", "tunings", "DEFINITIONS.json")["tunings"]
    layout_files = load_layout_files()

    print("BEGIN;")

    scale_types = sorted({scale["type"] for scale in scales})
    for scale_type in scale_types:
        print_insert(
            f"INSERT INTO scale_types (code) VALUES ({sql_literal(scale_type)})"
        )

    for scale in scales:
        print_insert(
            "INSERT INTO scales (external_id, name, common_name, scale_type_id) "
            f"VALUES ({scale['id']}, {sql_literal(scale['name'])}, {sql_literal(scale['common_name'])}, "
            f"(SELECT id FROM scale_types WHERE code = {sql_literal(scale['type'])}))"
        )
        for ordinal, semitones in enumerate(scale["intervals"], start=1):
            print_insert(
                "INSERT INTO scale_intervals (scale_id, ordinal, semitones) "
                "VALUES ("
                f"(SELECT id FROM scales WHERE external_id = {scale['id']}), "
                f"{ordinal}, {semitones})"
            )

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

    for layout_file in layout_files:
        scale_id = layout_file["id"]
        for layout in layout_file["layouts"]:
            tuning_name = layout["tuning"]
            if tuning_name not in tuning_ids_by_name:
                raise SystemExit(f"Unknown tuning in layout file: {tuning_name}")
            tuning_id = tuning_ids_by_name[tuning_name]

            print_insert(
                "INSERT INTO scale_layouts (scale_id, tuning_id) "
                "VALUES ("
                f"(SELECT id FROM scales WHERE external_id = {scale_id}), "
                f"(SELECT id FROM tunings WHERE external_id = {tuning_id}))"
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
                    f"AND tuning_id = (SELECT id FROM tunings WHERE external_id = {tuning_id})), "
                    f"{sql_literal(position_code)}, "
                    f"{sql_literal(mode)}, "
                    f"{sql_literal(start_fret if mode != 'split' else None)}, "
                    f"{sql_literal(fret_span if mode != 'split' else None)}, "
                    f"{sql_literal(validated_manual)})"
                )

                for ordinal, split_range in enumerate(position.get("split_ranges") or [], start=1):
                    print_insert(
                        "INSERT INTO scale_layout_position_split_ranges "
                        "(scale_layout_position_id, ordinal, start_fret, fret_span) "
                        "VALUES ("
                        "(SELECT id FROM scale_layout_positions "
                        "WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE "
                        f"scale_id = (SELECT id FROM scales WHERE external_id = {scale_id}) "
                        f"AND tuning_id = (SELECT id FROM tunings WHERE external_id = {tuning_id})) "
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
                            f"AND tuning_id = (SELECT id FROM tunings WHERE external_id = {tuning_id})) "
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
                            f"AND tuning_id = (SELECT id FROM tunings WHERE external_id = {tuning_id})) "
                            f"AND position_code = {sql_literal(position_code)}), "
                            f"{int(string_index_text)}, {fret})"
                        )

    print("COMMIT;")


if __name__ == "__main__":
    main()
