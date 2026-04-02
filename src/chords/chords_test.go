package chords

import "testing"

func TestSeventhFromDiatonicScale(t *testing.T) {
	scale := []string{"C", "D", "E", "F", "G", "A", "B"}
	chord, err := SeventhFromDiatonicScale(scale)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	expected := []string{"C", "E", "G", "B"}
	if len(chord) != len(expected) {
		t.Fatalf("expected %d notes, got %d", len(expected), len(chord))
	}
	for i, note := range expected {
		if chord[i] != note {
			t.Fatalf("expected note %q at %d, got %q", note, i, chord[i])
		}
	}
}

func TestSeventhFromDiatonicScaleRejectsWrongLength(t *testing.T) {
	_, err := SeventhFromDiatonicScale([]string{"C", "D", "E"})
	if err == nil {
		t.Fatal("expected error for non-diatonic scale length")
	}
}

func TestHarmonizeDiatonicScaleMajor(t *testing.T) {
	scale := []string{"C", "D", "E", "F", "G", "A", "B"}
	intervals := []int{0, 2, 4, 5, 7, 9, 11}

	chords, err := HarmonizeDiatonicScale(scale, intervals)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(chords) != 7 {
		t.Fatalf("expected 7 chords, got %d", len(chords))
	}

	expectedIntervals := [][]int{
		{0, 4, 7, 11},
		{0, 3, 7, 10},
		{0, 3, 7, 10},
		{0, 4, 7, 11},
		{0, 4, 7, 10},
		{0, 3, 7, 10},
		{0, 3, 6, 10},
	}

	for i, chord := range chords {
		if chord.Degree != i+1 {
			t.Fatalf("expected degree %d, got %d", i+1, chord.Degree)
		}
		intervals := chord.Intervals
		expected := expectedIntervals[i]
		if len(intervals) != len(expected) {
			t.Fatalf("expected %d intervals, got %d", len(expected), len(intervals))
		}
		for j, value := range expected {
			if intervals[j] != value {
				t.Fatalf("degree %d interval %d expected %d, got %d", i+1, j, value, intervals[j])
			}
		}
	}
}

func TestHarmonizeDiatonicScaleRejectsWrongLength(t *testing.T) {
	_, err := HarmonizeDiatonicScale([]string{"C"}, []int{0, 2, 4, 5, 7, 9, 11})
	if err == nil {
		t.Fatal("expected error for invalid note length")
	}

	_, err = HarmonizeDiatonicScale([]string{"C", "D", "E", "F", "G", "A", "B"}, []int{0, 2, 4})
	if err == nil {
		t.Fatal("expected error for invalid interval length")
	}
}
