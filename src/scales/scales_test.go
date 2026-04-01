package scales

import "testing"

func TestLoadDefinitions(t *testing.T) {
	set, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("load definitions: %v", err)
	}

	if len(set.Scales) == 0 {
		t.Fatalf("expected scales, got none")
	}
}

func TestByName(t *testing.T) {
	set, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("load definitions: %v", err)
	}

	scale, ok := set.ByName("Harmonic Minor")
	if !ok {
		t.Fatalf("expected to find Harmonic Minor")
	}

	if scale.Type != ScaleTypeDiatonic {
		t.Fatalf("expected diatonic type, got %s", scale.Type)
	}
}

func TestNotesForEMajor(t *testing.T) {
	set, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("load definitions: %v", err)
	}

	notes, err := set.NotesFor("E", "Major")
	if err != nil {
		t.Fatalf("notes for E major: %v", err)
	}

	expected := []string{"E", "F#", "G#", "A", "B", "C#", "D#"}
	if len(notes) != len(expected) {
		t.Fatalf("expected %d notes, got %d", len(expected), len(notes))
	}

	for i, note := range expected {
		if notes[i] != note {
			t.Fatalf("note %d: expected %s, got %s", i, note, notes[i])
		}
	}
}
