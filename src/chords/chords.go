package chords

import "fmt"

// SeventhFromDiatonicScale returns the root, third, fifth, and seventh notes
// from a seven-note diatonic scale.
func SeventhFromDiatonicScale(scale []string) ([]string, error) {
	if len(scale) != 7 {
		return nil, fmt.Errorf("expected 7 notes in scale, got %d", len(scale))
	}

	return []string{scale[0], scale[2], scale[4], scale[6]}, nil
}

type DiatonicSeventhChord struct {
	Degree    int
	Root      string
	Notes     []string
	Intervals []int
}

// HarmonizeDiatonicScale builds seventh chords for each degree of a
// seven-note diatonic scale.
func HarmonizeDiatonicScale(scaleNotes []string, scaleIntervals []int) ([]DiatonicSeventhChord, error) {
	if len(scaleNotes) != 7 {
		return nil, fmt.Errorf("expected 7 notes in scale, got %d", len(scaleNotes))
	}
	if len(scaleIntervals) != 7 {
		return nil, fmt.Errorf("expected 7 intervals in scale, got %d", len(scaleIntervals))
	}

	chords := make([]DiatonicSeventhChord, 0, 7)
	for degree := 0; degree < 7; degree++ {
		notes := []string{
			scaleNotes[degree],
			scaleNotes[(degree+2)%7],
			scaleNotes[(degree+4)%7],
			scaleNotes[(degree+6)%7],
		}

		intervals := diatonicChordIntervals(scaleIntervals, degree)
		chords = append(chords, DiatonicSeventhChord{
			Degree:    degree + 1,
			Root:      scaleNotes[degree],
			Notes:     notes,
			Intervals: intervals,
		})
	}

	return chords, nil
}

func diatonicChordIntervals(scaleIntervals []int, degree int) []int {
	root := scaleIntervals[degree]
	indices := []int{degree, (degree + 2) % 7, (degree + 4) % 7, (degree + 6) % 7}
	intervals := make([]int, 0, len(indices))

	for _, idx := range indices {
		value := scaleIntervals[idx] - root
		if idx < degree {
			value += 12
		}
		if value < 0 {
			value += 12
		}
		intervals = append(intervals, value)
	}

	return intervals
}
