package scales

import (
	"math/rand"
	"testing"

	"music-tools/src/key_signatures"
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

func TestDefinitionsIncludeFunctionalIntervals(t *testing.T) {
	set, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("load definitions: %v", err)
	}

	for _, scale := range set.Scales {
		for i, interval := range scale.Intervals {
			if interval.Degree < 1 || interval.Degree > 12 {
				t.Fatalf("%s interval %d degree must be 1-12, got %d", scale.Name, i, interval.Degree)
			}
		}
	}

	scale, ok := set.ByName("Minor Pentatonic")
	if !ok {
		t.Fatalf("expected to find Minor Pentatonic")
	}
	expected := []ScaleInterval{
		{Semitones: 0, Degree: 1},
		{Semitones: 3, Degree: 3},
		{Semitones: 5, Degree: 4},
		{Semitones: 7, Degree: 5},
		{Semitones: 10, Degree: 7},
	}
	for i, interval := range expected {
		if scale.Intervals[i] != interval {
			t.Fatalf("minor pentatonic interval %d: expected %+v, got %+v", i, interval, scale.Intervals[i])
		}
	}

	blues, ok := set.ByName("Minor Blues")
	if !ok {
		t.Fatalf("expected to find Minor Blues")
	}
	expected = []ScaleInterval{
		{Semitones: 0, Degree: 1},
		{Semitones: 3, Degree: 3},
		{Semitones: 5, Degree: 4},
		{Semitones: 6, Degree: 5},
		{Semitones: 7, Degree: 5},
		{Semitones: 10, Degree: 7},
	}
	for i, interval := range expected {
		if blues.Intervals[i] != interval {
			t.Fatalf("minor blues interval %d: expected %+v, got %+v", i, interval, blues.Intervals[i])
		}
	}

	blues, ok = set.ByName("Major Blues")
	if !ok {
		t.Fatalf("expected to find Major Blues")
	}
	expected = []ScaleInterval{
		{Semitones: 0, Degree: 1},
		{Semitones: 2, Degree: 2},
		{Semitones: 3, Degree: 3},
		{Semitones: 4, Degree: 3},
		{Semitones: 7, Degree: 5},
		{Semitones: 9, Degree: 6},
	}
	for i, interval := range expected {
		if blues.Intervals[i] != interval {
			t.Fatalf("major blues interval %d: expected %+v, got %+v", i, interval, blues.Intervals[i])
		}
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

	scale, ok = set.ByName("Half-diminished")
	if !ok {
		t.Fatalf("expected to find Locrian #2 by alias")
	}
	if scale.Name != "Locrian #2" {
		t.Fatalf("expected Locrian #2, got %s", scale.Name)
	}
	if scale.CommonName != "Half-diminished" {
		t.Fatalf("expected common name Half-diminished, got %s", scale.CommonName)
	}

	scale, ok = set.ByName("Ionian")
	if !ok {
		t.Fatalf("expected to find Major by musical name")
	}
	if scale.Name != "Major" {
		t.Fatalf("expected Major, got %s", scale.Name)
	}

	scale, ok = set.ByName("Pentatonic Mode 2")
	if !ok {
		t.Fatalf("expected to find Suspended Pentatonic by parent mode label")
	}
	if scale.Name != "Suspended Pentatonic" {
		t.Fatalf("expected Suspended Pentatonic, got %s", scale.Name)
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

func TestNotesForCMinorPentatonicUsesFlatDegrees(t *testing.T) {
	set, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("load definitions: %v", err)
	}

	notes, err := set.NotesFor("C", "Minor Pentatonic")
	if err != nil {
		t.Fatalf("notes for C minor pentatonic: %v", err)
	}

	expected := []string{"C", "Eb", "F", "G", "Bb"}
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
	keySignatures, err := key_signatures.LoadKeySignatures("../../data/scales/KEY_SIGNATURES.json")
	if err != nil {
		t.Fatalf("load key signatures: %v", err)
	}

	rng := rand.New(rand.NewSource(42))
	selection, err := set.RandomScaleSelector(&RandomScaleSelectorOptions{
		Rand:          rng,
		KeySignatures: &keySignatures,
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
