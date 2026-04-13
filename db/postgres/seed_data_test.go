package postgres

import (
	"os"
	"os/exec"
	"path/filepath"
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

func TestSeedDataGeneratesTransactionWrappedSQL(t *testing.T) {
	out := runSeedData(t)
	if !strings.HasPrefix(out, "BEGIN;\n") {
		t.Fatalf("expected seed output to start with BEGIN; got: %q", out[:min(40, len(out))])
	}
	if !strings.HasSuffix(strings.TrimSpace(out), "COMMIT;") {
		t.Fatalf("expected seed output to end with COMMIT;")
	}
}

func TestSeedDataIncludesMajorDSplitRanges(t *testing.T) {
	out := runSeedData(t)

	expected := []string{
		"INSERT INTO scale_layout_position_split_ranges (scale_layout_position_id, ordinal, start_fret, fret_span) VALUES ((SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1)) AND position_code = 'D'), 1, 8, 5);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1)) AND position_code = 'D') AND ordinal = 1), 0);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1)) AND position_code = 'D') AND ordinal = 1), 1);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1)) AND position_code = 'D') AND ordinal = 1), 2);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1)) AND position_code = 'D') AND ordinal = 1), 3);",
		"INSERT INTO scale_layout_position_split_ranges (scale_layout_position_id, ordinal, start_fret, fret_span) VALUES ((SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1)) AND position_code = 'D'), 2, 10, 4);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1)) AND position_code = 'D') AND ordinal = 2), 4);",
		"INSERT INTO scale_layout_position_split_range_strings (split_range_id, string_index_zero_based) VALUES ((SELECT id FROM scale_layout_position_split_ranges WHERE scale_layout_position_id = (SELECT id FROM scale_layout_positions WHERE scale_layout_id = (SELECT id FROM scale_layouts WHERE scale_id = (SELECT id FROM scales WHERE external_id = 1) AND tuning_id = (SELECT id FROM tunings WHERE external_id = 1)) AND position_code = 'D') AND ordinal = 2), 5);",
	}

	for _, needle := range expected {
		if !strings.Contains(out, needle) {
			t.Fatalf("expected seed output to contain:\n%s", needle)
		}
	}
}

func TestSchemaDefinesSplitLayoutTables(t *testing.T) {
	root := repoRoot(t)
	data, err := os.ReadFile(filepath.Join(root, "db", "postgres", "schema.sql"))
	if err != nil {
		t.Fatalf("read schema.sql: %v", err)
	}
	text := string(data)
	checks := []string{
		"CREATE TABLE scale_layout_positions",
		"CREATE TABLE scale_layout_position_split_ranges",
		"CREATE TABLE scale_layout_position_split_range_strings",
		"CREATE TABLE scale_layout_position_string_frets",
		"CHECK (mode IN ('range', 'split'))",
	}
	for _, needle := range checks {
		if !strings.Contains(text, needle) {
			t.Fatalf("expected schema.sql to contain %q", needle)
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
