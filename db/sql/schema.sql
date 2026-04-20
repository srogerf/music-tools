BEGIN;

CREATE TABLE schema_metadata (
    singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
    schema_version INTEGER NOT NULL,
    seed_data_format_version INTEGER
);

INSERT INTO schema_metadata (singleton, schema_version, seed_data_format_version)
VALUES (TRUE, 3, NULL);

CREATE TABLE scale_types (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE
);

CREATE TABLE scales (
    id BIGSERIAL PRIMARY KEY,
    external_id BIGINT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    common_name TEXT NOT NULL,
    scale_type_id BIGINT NOT NULL REFERENCES scale_types(id),
    UNIQUE (name),
    UNIQUE (common_name, scale_type_id)
);

CREATE TABLE scale_intervals (
    scale_id BIGINT NOT NULL REFERENCES scales(id) ON DELETE CASCADE,
    ordinal SMALLINT NOT NULL,
    semitones SMALLINT NOT NULL,
    PRIMARY KEY (scale_id, ordinal),
    CHECK (ordinal >= 1),
    CHECK (semitones >= 0 AND semitones <= 24)
);

CREATE TABLE key_signature_groups (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE
);

CREATE TABLE key_signatures (
    id BIGSERIAL PRIMARY KEY,
    key_signature_group_id BIGINT NOT NULL REFERENCES key_signature_groups(id),
    key_name TEXT NOT NULL,
    accidentals SMALLINT NOT NULL,
    UNIQUE (key_signature_group_id, key_name),
    CHECK (accidentals BETWEEN -7 AND 7)
);

CREATE TABLE tunings (
    id BIGSERIAL PRIMARY KEY,
    external_id BIGINT NOT NULL UNIQUE,
    name TEXT NOT NULL UNIQUE,
    string_count SMALLINT NOT NULL,
    CHECK (string_count BETWEEN 1 AND 9)
);

CREATE TABLE tuning_strings (
    tuning_id BIGINT NOT NULL REFERENCES tunings(id) ON DELETE CASCADE,
    string_number SMALLINT NOT NULL,
    note_name TEXT NOT NULL,
    PRIMARY KEY (tuning_id, string_number),
    CHECK (string_number >= 1)
);

CREATE TABLE scale_layouts (
    id BIGSERIAL PRIMARY KEY,
    scale_id BIGINT NOT NULL REFERENCES scales(id) ON DELETE CASCADE,
    tuning_id BIGINT NOT NULL REFERENCES tunings(id) ON DELETE CASCADE,
    family_code TEXT NOT NULL,
    UNIQUE (scale_id, tuning_id, family_code),
    CHECK (family_code IN ('standard', '3nps'))
);

CREATE TABLE scale_layout_positions (
    id BIGSERIAL PRIMARY KEY,
    scale_layout_id BIGINT NOT NULL REFERENCES scale_layouts(id) ON DELETE CASCADE,
    position_code TEXT NOT NULL,
    mode TEXT NOT NULL,
    start_fret SMALLINT,
    fret_span SMALLINT,
    validated_manual BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (scale_layout_id, position_code),
    CHECK (position_code IN ('C', 'A', 'G', 'E', 'D')),
    CHECK (mode IN ('range', 'split')),
    CHECK (
        (mode = 'range' AND start_fret IS NOT NULL AND fret_span IS NOT NULL)
        OR (mode = 'split')
    ),
    CHECK (start_fret IS NULL OR start_fret >= 0),
    CHECK (fret_span IS NULL OR fret_span >= 1)
);

CREATE TABLE scale_layout_position_split_ranges (
    id BIGSERIAL PRIMARY KEY,
    scale_layout_position_id BIGINT NOT NULL REFERENCES scale_layout_positions(id) ON DELETE CASCADE,
    ordinal SMALLINT NOT NULL,
    start_fret SMALLINT NOT NULL,
    fret_span SMALLINT NOT NULL,
    UNIQUE (scale_layout_position_id, ordinal),
    CHECK (ordinal >= 1),
    CHECK (start_fret >= 0),
    CHECK (fret_span >= 1)
);

CREATE TABLE scale_layout_position_split_range_strings (
    split_range_id BIGINT NOT NULL REFERENCES scale_layout_position_split_ranges(id) ON DELETE CASCADE,
    string_index_zero_based SMALLINT NOT NULL,
    PRIMARY KEY (split_range_id, string_index_zero_based),
    CHECK (string_index_zero_based >= 0)
);

CREATE TABLE scale_layout_position_string_frets (
    scale_layout_position_id BIGINT NOT NULL REFERENCES scale_layout_positions(id) ON DELETE CASCADE,
    string_index_zero_based SMALLINT NOT NULL,
    fret SMALLINT NOT NULL,
    PRIMARY KEY (scale_layout_position_id, string_index_zero_based, fret),
    CHECK (string_index_zero_based >= 0),
    CHECK (fret >= 0)
);

CREATE INDEX idx_scale_intervals_scale_id
    ON scale_intervals (scale_id);

CREATE INDEX idx_key_signatures_group_id
    ON key_signatures (key_signature_group_id);

CREATE INDEX idx_tuning_strings_tuning_id
    ON tuning_strings (tuning_id);

CREATE INDEX idx_scale_layouts_scale_id
    ON scale_layouts (scale_id);

CREATE INDEX idx_scale_layouts_tuning_id
    ON scale_layouts (tuning_id);

CREATE INDEX idx_scale_layout_positions_layout_id
    ON scale_layout_positions (scale_layout_id);

CREATE INDEX idx_scale_layout_position_split_ranges_position_id
    ON scale_layout_position_split_ranges (scale_layout_position_id);

CREATE INDEX idx_scale_layout_position_string_frets_position_id
    ON scale_layout_position_string_frets (scale_layout_position_id);

COMMIT;
