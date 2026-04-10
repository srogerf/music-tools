package tuning

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDefinitions(t *testing.T) {
	set, err := LoadDefinitions("../../data/tunings/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadDefinitions: %v", err)
	}
	if len(set.Tunings) == 0 {
		t.Fatalf("expected tunings, got none")
	}

	standard, ok := set.ByID(1)
	if !ok {
		t.Fatalf("expected tuning id 1")
	}
	if standard.Name != "Standard" {
		t.Fatalf("expected Standard name, got %q", standard.Name)
	}
	if standard.StringCount != 6 {
		t.Fatalf("expected 6 strings, got %d", standard.StringCount)
	}
	if len(standard.Strings) != 6 {
		t.Fatalf("expected 6 string notes, got %d", len(standard.Strings))
	}
}

func TestByID(t *testing.T) {
	set, err := LoadDefinitions("../../data/tunings/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadDefinitions: %v", err)
	}

	if _, ok := set.ByID(999); ok {
		t.Fatalf("expected missing id to return false")
	}
}

func TestLoadDefinitionsValidation(t *testing.T) {
	cases := []struct {
		name    string
		json    string
		wantErr bool
	}{
		{
			name: "missing name",
			json: `{"tunings":[{"id":1,"name":"","string_count":6,"strings":["E","A","D","G","B","E"]}]}`,
			wantErr: true,
		},
		{
			name: "string count mismatch",
			json: `{"tunings":[{"id":1,"name":"Standard","string_count":5,"strings":["E","A","D","G","B","E"]}]}`,
			wantErr: true,
		},
		{
			name: "invalid string count",
			json: `{"tunings":[{"id":1,"name":"Standard","string_count":0,"strings":[]}]}`,
			wantErr: true,
		},
		{
			name: "duplicate id",
			json: `{"tunings":[{"id":1,"name":"Standard","string_count":6,"strings":["E","A","D","G","B","E"]},{"id":1,"name":"Alt","string_count":6,"strings":["E","A","D","G","B","E"]}]}`,
			wantErr: true,
		},
		{
			name: "valid",
			json: `{"tunings":[{"id":1,"name":"Standard","string_count":6,"strings":["E","A","D","G","B","E"]}]}`,
			wantErr: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			path := writeTempJSON(t, tc.json)
			_, err := LoadDefinitions(path)
			if tc.wantErr && err == nil {
				t.Fatalf("expected error, got nil")
			}
			if !tc.wantErr && err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
		})
	}
}

func writeTempJSON(t *testing.T, contents string) string {
	t.Helper()
	dir := t.TempDir()
	path := filepath.Join(dir, "tunings.json")
	if err := os.WriteFile(path, []byte(contents), 0o600); err != nil {
		t.Fatalf("write temp json: %v", err)
	}
	return path
}
