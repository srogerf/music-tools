package scales

import (
	"math/rand"
	"testing"
)

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

func TestRandomScaleSelectorDefaults(t *testing.T) {
	set, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("load definitions: %v", err)
	}

	rng := rand.New(rand.NewSource(42))
	selection, err := set.RandomScaleSelector(&RandomScaleSelectorOptions{
		Rand: rng,
	})
	if err != nil {
		t.Fatalf("random scale selector: %v", err)
	}

	if selection.Key == "" {
		t.Fatalf("expected a key to be selected")
	}

	if selection.Scale.Name != "Major" && selection.Scale.Name != "Natural Minor" {
		t.Fatalf("expected major or natural minor, got %s", selection.Scale.Name)
	}

	if selection.Accidentals > 5 {
		t.Fatalf("expected 5 or fewer accidentals, got %d", selection.Accidentals)
	}

	notes, err := set.NotesFor(selection.Key, selection.Scale.Name)
	if err != nil {
		t.Fatalf("notes for %s %s: %v", selection.Key, selection.Scale.Name, err)
	}

	if len(notes) != len(selection.Scale.Intervals) {
		t.Fatalf("expected %d notes, got %d", len(selection.Scale.Intervals), len(notes))
	}
}
