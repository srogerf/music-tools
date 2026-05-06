package scales

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

type noteCaseFixture struct {
	Key                         string   `json:"key"`
	Scale                       string   `json:"scale"`
	ExpectedNotes               []string `json:"expected_notes"`
	ExpectedSignature           string   `json:"expected_signature"`
	ExpectedOutsideKeySignature []string `json:"expected_outside_key_signature"`
}

func loadNoteCaseFixtures(t *testing.T) []noteCaseFixture {
	t.Helper()

	path := filepath.Join("testdata", "note_cases.json")
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read note cases: %v", err)
	}

	var fixtures []noteCaseFixture
	if err := json.Unmarshal(data, &fixtures); err != nil {
		t.Fatalf("parse note cases: %v", err)
	}
	return fixtures
}

func TestNoteCasesSpellExpectedNotes(t *testing.T) {
	set, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("load definitions: %v", err)
	}

	for _, fixture := range loadNoteCaseFixtures(t) {
		notes, err := set.NotesFor(fixture.Key, fixture.Scale)
		if err != nil {
			t.Fatalf("notes for %s %s: %v", fixture.Key, fixture.Scale, err)
		}

		if len(notes) != len(fixture.ExpectedNotes) {
			t.Fatalf("%s %s: expected %d notes, got %d", fixture.Key, fixture.Scale, len(fixture.ExpectedNotes), len(notes))
		}
		for i, note := range fixture.ExpectedNotes {
			if notes[i] != note {
				t.Fatalf("%s %s note %d: expected %s, got %s", fixture.Key, fixture.Scale, i, note, notes[i])
			}
		}
	}
}
