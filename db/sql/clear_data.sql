BEGIN;

UPDATE schema_metadata
SET seed_data_format_version = NULL
WHERE singleton = TRUE;

TRUNCATE TABLE
    scale_layout_position_string_frets,
    scale_layout_position_split_range_strings,
    scale_layout_position_split_ranges,
    scale_layout_positions,
    scale_layouts,
    tuning_strings,
    tunings,
    key_signatures,
    key_signature_groups,
    scale_intervals,
    scales,
    scale_types
RESTART IDENTITY CASCADE;

COMMIT;
