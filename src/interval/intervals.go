package interval

import "fmt"

var shortNameToSemitones = map[string]int{
	"P1": 0,
	"m2": 1,
	"M2": 2,
	"m3": 3,
	"M3": 4,
	"P4": 5,
	"TT": 6,
	"P5": 7,
	"m6": 8,
	"M6": 9,
	"m7": 10,
	"M7": 11,
	"P8": 12,
}

// Name returns the common interval name and short name for a semitone offset.
// Supported offsets are 0-12. The bool return is false when the value is unknown.
func Name(semitones int) (string, string, bool) {
	switch semitones {
	case 0:
		return "unison", "P1", true
	case 1:
		return "minor second", "m2", true
	case 2:
		return "major second", "M2", true
	case 3:
		return "minor third", "m3", true
	case 4:
		return "major third", "M3", true
	case 5:
		return "perfect fourth", "P4", true
	case 6:
		return "tritone", "TT", true
	case 7:
		return "perfect fifth", "P5", true
	case 8:
		return "minor sixth", "m6", true
	case 9:
		return "major sixth", "M6", true
	case 10:
		return "minor seventh", "m7", true
	case 11:
		return "major seventh", "M7", true
	case 12:
		return "octave", "P8", true
	default:
		return "", "", false
	}
}

// MustName is a convenience helper that panics for unknown semitone values.
func MustName(semitones int) (string, string) {
	name, short, ok := Name(semitones)
	if !ok {
		panic(fmt.Sprintf("unknown interval: %d", semitones))
	}
	return name, short
}

// SemitonesForShortName returns the semitone offset for a short interval name.
// The bool return is false when the short name is unknown.
func SemitonesForShortName(short string) (int, bool) {
	semitones, ok := shortNameToSemitones[short]
	return semitones, ok
}
