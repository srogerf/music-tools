BEGIN;

DROP TABLE IF EXISTS scale_layout_position_string_frets CASCADE;
DROP TABLE IF EXISTS scale_layout_position_split_range_strings CASCADE;
DROP TABLE IF EXISTS scale_layout_position_split_ranges CASCADE;
DROP TABLE IF EXISTS scale_layout_positions CASCADE;
DROP TABLE IF EXISTS scale_layouts CASCADE;
DROP TABLE IF EXISTS tuning_strings CASCADE;
DROP TABLE IF EXISTS tunings CASCADE;
DROP TABLE IF EXISTS key_signatures CASCADE;
DROP TABLE IF EXISTS key_signature_groups CASCADE;
DROP TABLE IF EXISTS scale_intervals CASCADE;
DROP TABLE IF EXISTS scales CASCADE;
DROP TABLE IF EXISTS scale_types CASCADE;

COMMIT;
