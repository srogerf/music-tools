package postgres

import (
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

func repoRoot(t *testing.T) string {
	t.Helper()
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	return filepath.Clean(filepath.Join(wd, "..", ".."))
}

func runSeedData(t *testing.T) string {
	t.Helper()
	root := repoRoot(t)
	cmd := exec.Command("python3", "db/postgres/seed_data.py")
	cmd.Dir = root
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("run seed_data.py: %v\n%s", err, string(out))
	}
	return string(out)
}

func splitRangeSQL(scaleID int, positionCode string, ordinal int, startFret int, fretSpan int) string {
	return fmt.Sprintf(
		"INSERT INTO scale_layout_position_split_ranges (scale_layout_position_id, ordinal, start_fret, fret_span) VALUES ((SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = %d) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1) AND family_code = 'standard') AND position_code = '%s'), %d, %d, %d);",
		scaleID,
		positionCode,
		ordinal,
		startFret,
		fretSpan,
	)
}

func splitRangeStringSQL(scaleID int, positionCode string, ordinal int, stringIndex int) string {
	return fmt.Sprintf(
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = %d) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1) AND family_code = 'standard') AND position_code = '%s') AND ordinal = %d), %d);",
		scaleID,
		positionCode,
		ordinal,
		stringIndex,
	)
}

func TestSeedDataGeneratesTransactionWrappedSQL(t *testing.T) {
	out := runSeedData(t)
	if !strings.HasPrefix(out, "BEGIN;\n") {
		t.Fatalf("expected seed output to start with BEGIN; got: %q", out[:min(40, len(out))])
	}
	if !strings.HasSuffix(strings.TrimSpace(out), "COMMIT;") {
		t.Fatalf("expected seed output to end with COMMIT;")
	}
}

func TestSeedDataChecksSchemaVersionCompatibility(t *testing.T) {
	out := runSeedData(t)

	checks := []string{
		"FROM schema_metadata",
		"seed data format version % does not support schema version %",
		"UPDATE schema_metadata SET seed_data_format_version = 1 WHERE singleton = TRUE;",
	}

	for _, needle := range checks {
		if !strings.Contains(out, needle) {
			t.Fatalf("expected seed output to contain %q", needle)
		}
	}
}

func TestSeedDataIncludesMajorDSplitRanges(t *testing.T) {
	out := runSeedData(t)

	expected := []string{
		"INSERT INTO scale_layout_position_split_ranges (scale_layout_position_id, ordinal, start_fret, fret_span) VALUES ((SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1) AND family_code = 'standard') AND position_code = 'D'), 1, 8, 5);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1) AND family_code = 'standard') AND position_code = 'D') AND ordinal = 1), 0);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1) AND family_code = 'standard') AND position_code = 'D') AND ordinal = 1), 1);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1) AND family_code = 'standard') AND position_code = 'D') AND ordinal = 1), 2);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1) AND family_code = 'standard') AND position_code = 'D') AND ordinal = 1), 3);",
		"INSERT INTO scale_layout_position_split_ranges (scale_layout_position_id, ordinal, start_fret, fret_span) VALUES ((SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1) AND family_code = 'standard') AND position_code = 'D'), 2, 10, 4);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1) AND family_code = 'standard') AND position_code = 'D') AND ordinal = 2), 4);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1) AND family_code = 'standard') AND position_code = 'D') AND ordinal = 2), 5);",
	}

	for _, needle := range expected {
		if !strings.Contains(out, needle) {
			t.Fatalf("expected seed output to contain:\n%s", needle)
		}
	}
}

func TestSeedDataConvertsPerStringWindowsToSplitRanges(t *testing.T) {
	out := runSeedData(t)

	expected := []string{
		splitRangeSQL(8, "D", 1, 8, 5),
		splitRangeStringSQL(8, "D", 1, 0),
		splitRangeStringSQL(8, "D", 1, 3),
		splitRangeSQL(8, "D", 2, 9, 5),
		splitRangeStringSQL(8, "D", 2, 4),
		splitRangeStringSQL(8, "D", 2, 5),
		splitRangeSQL(9, "D", 1, 8, 5),
		splitRangeStringSQL(9, "D", 1, 0),
		splitRangeStringSQL(9, "D", 1, 3),
		splitRangeSQL(9, "D", 2, 10, 4),
		splitRangeStringSQL(9, "D", 2, 4),
		splitRangeStringSQL(9, "D", 2, 5),
	}

	for _, needle := range expected {
		if !strings.Contains(out, needle) {
			t.Fatalf("expected seed output to contain:\n%s", needle)
		}
	}
}

func TestSchemaDefinesSplitLayoutTables(t *testing.T) {
	root := repoRoot(t)
	data, err := os.ReadFile(filepath.Join(root, "db", "sql", "schema.sql"))
	if err != nil {
		t.Fatalf("read schema.sql: %v", err)
	}
	text := string(data)
	checks := []string{
		"CREATE TABLE schema_metadata",
		"INSERT INTO schema_metadata (singleton, schema_version, seed_data_format_version)",
		"CREATE TABLE scale_layout_positions",
		"CREATE TABLE scale_layout_position_split_ranges",
		"CREATE TABLE scale_layout_position_split_range_strings",
		"CREATE TABLE scale_layout_position_string_frets",
		"family_code TEXT NOT NULL",
		"CHECK (family_code IN ('standard', '3nps'))",
		"CHECK (mode IN ('range', 'split'))",
	}
	for _, needle := range checks {
		if !strings.Contains(text, needle) {
			t.Fatalf("expected schema.sql to contain %q", needle)
		}
	}
}

func TestClearDataPreservesSchemaAndClearsSeedVersion(t *testing.T) {
	root := repoRoot(t)
	data, err := os.ReadFile(filepath.Join(root, "db", "sql", "clear_data.sql"))
	if err != nil {
		t.Fatalf("read clear_data.sql: %v", err)
	}
	text := string(data)
	checks := []string{
		"UPDATE schema_metadata",
		"SET seed_data_format_version = NULL",
		"TRUNCATE TABLE",
		"RESTART IDENTITY CASCADE",
	}
	for _, needle := range checks {
		if !strings.Contains(text, needle) {
			t.Fatalf("expected clear_data.sql to contain %q", needle)
		}
	}
	if strings.Contains(text, "DROP TABLE") {
		t.Fatalf("expected clear_data.sql not to drop tables")
	}
}

func TestResetAndSeedRequiresExistingSchema(t *testing.T) {
	root := repoRoot(t)
	data, err := os.ReadFile(filepath.Join(root, "db", "postgres", "reset_and_seed.sh"))
	if err != nil {
		t.Fatalf("read reset_and_seed.sh: %v", err)
	}
	text := string(data)
	checks := []string{
		"Usage: bash db/postgres/reset_and_seed.sh --env test",
		"--override-production-failsafe",
		"Refusing clear-and-reseed with production-default behavior.",
		"Use --env test for non-production, or --override-production-failsafe only for first-time production bootstrap seed.",
		"to_regclass('public.schema_metadata')",
		"Run 'bash db/postgres/rebuild_schema.sh' before reset_and_seed.sh.",
	}
	for _, needle := range checks {
		if !strings.Contains(text, needle) {
			t.Fatalf("expected reset_and_seed.sh to contain %q", needle)
		}
	}
}

func TestRebuildSchemaHasEnvironmentFailsafes(t *testing.T) {
	root := repoRoot(t)
	data, err := os.ReadFile(filepath.Join(root, "db", "postgres", "rebuild_schema.sh"))
	if err != nil {
		t.Fatalf("read rebuild_schema.sh: %v", err)
	}
	text := string(data)
	checks := []string{
		"Usage: bash db/postgres/rebuild_schema.sh --env test",
		"--override-production-failsafe",
		"Refusing destructive schema rebuild with production-default behavior.",
		"Use --env test for non-production, or --override-production-failsafe only for first-time production bootstrap.",
	}
	for _, needle := range checks {
		if !strings.Contains(text, needle) {
			t.Fatalf("expected rebuild_schema.sh to contain %q", needle)
		}
	}
}

func TestSchemaVersionMatchesVersionsFile(t *testing.T) {
	root := repoRoot(t)

	versionData, err := os.ReadFile(filepath.Join(root, "db", "postgres", "versions.json"))
	if err != nil {
		t.Fatalf("read versions.json: %v", err)
	}
	var versions struct {
		SchemaVersion int `json:"schema_version"`
	}
	if err := json.Unmarshal(versionData, &versions); err != nil {
		t.Fatalf("parse versions.json: %v", err)
	}

	schemaData, err := os.ReadFile(filepath.Join(root, "db", "sql", "schema.sql"))
	if err != nil {
		t.Fatalf("read schema.sql: %v", err)
	}
	expected := "VALUES (TRUE, " + strconv.Itoa(versions.SchemaVersion) + ", NULL);"
	if !strings.Contains(string(schemaData), expected) {
		t.Fatalf("expected schema.sql to stamp schema version %d", versions.SchemaVersion)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
