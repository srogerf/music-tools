package scales

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type ScaleType string

const (
	ScaleTypeTriad      ScaleType = "triad"
	ScaleTypeQuadad     ScaleType = "quadad"
	ScaleTypePentatonic ScaleType = "pentatonic"
	ScaleTypeDiatonic   ScaleType = "diatonic"
	ScaleTypeExotic     ScaleType = "exotic"
)

type Definition struct {
	ID         int             `json:"id"`
	Name       string          `json:"name"`
	CommonName string          `json:"common_name"`
	Type       ScaleType       `json:"type"`
	Intervals  []ScaleInterval `json:"intervals"`
}

type ScaleInterval struct {
	Semitones int `json:"semitones"`
	Degree    int `json:"degree"`
}

type DefinitionSet struct {
	Scales []Definition `json:"scales"`
}

func LoadDefinitions(path string) (DefinitionSet, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return DefinitionSet{}, fmt.Errorf("read definitions: %w", err)
	}

	var set DefinitionSet
	if err := json.Unmarshal(data, &set); err != nil {
		return DefinitionSet{}, fmt.Errorf("parse definitions: %w", err)
	}

	return set, nil
}

func (set DefinitionSet) ByName(name string) (Definition, bool) {
	for _, scale := range set.Scales {
		if strings.EqualFold(scale.Name, name) || strings.EqualFold(scale.CommonName, name) {
			return scale, true
		}
	}
	return Definition{}, false
}

func (set DefinitionSet) ByID(id int) (Definition, bool) {
	for _, scale := range set.Scales {
		if scale.ID == id {
			return scale, true
		}
	}
	return Definition{}, false
}

func (scale Definition) SemitoneIntervals() []int {
	intervals := make([]int, 0, len(scale.Intervals))
	for _, interval := range scale.Intervals {
		intervals = append(intervals, interval.Semitones)
	}
	return intervals
}

// NotesFor returns the note names for a key and scale name/common name.
// The key should be a pitch class like C, Eb, or F#.
func (set DefinitionSet) NotesFor(key string, scaleName string) ([]string, error) {
	scale, ok := set.ByName(scaleName)
	if !ok {
		return nil, fmt.Errorf("unknown scale: %s", scaleName)
	}

	return notesForKeyAndScale(key, scale)
}

func notesForKeyAndScale(key string, scale Definition) ([]string, error) {
	normalized := normalizeKey(key)
	if normalized == "" {
		return nil, fmt.Errorf("invalid key: %s", key)
	}

	sharpScale := []string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}
	flatScale := []string{"C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"}

	sharpIndex := map[string]int{
		"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6,
		"G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11,
	}
	flatIndex := map[string]int{
		"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "Gb": 6,
		"G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11, "Cb": 11,
	}

	useFlats := shouldUseFlats(normalized)
	indexMap := sharpIndex
	scaleNames := sharpScale
	if useFlats {
		indexMap = flatIndex
		scaleNames = flatScale
	}

	root, ok := indexMap[normalized]
	if !ok {
		return nil, fmt.Errorf("unsupported key: %s", key)
	}

	if notes, ok := notesForDegreeClasses(normalized, root, scale); ok {
		return notes, nil
	}

	notes := make([]string, 0, len(scale.Intervals))
	for _, interval := range scale.Intervals {
		pitchClass := (root + interval.Semitones) % 12
		if pitchClass < 0 {
			pitchClass += 12
		}
		notes = append(notes, scaleNames[pitchClass])
	}

	return notes, nil
}

func notesForDegreeClasses(key string, root int, scale Definition) ([]string, bool) {
	rootLetter := key[:1]
	rootLetterIndex := -1
	for i, letter := range letterOrder {
		if letter == rootLetter {
			rootLetterIndex = i
			break
		}
	}
	if rootLetterIndex == -1 {
		return nil, false
	}

	notes := make([]string, 0, len(scale.Intervals))
	for _, interval := range scale.Intervals {
		degreeClass := interval.Degree
		if degreeClass < 1 || degreeClass > 7 {
			return nil, false
		}
		letter := letterOrder[(rootLetterIndex+degreeClass-1)%len(letterOrder)]
		targetPitch := (root + interval.Semitones) % 12
		if targetPitch < 0 {
			targetPitch += 12
		}
		offset := (targetPitch - naturalPitch[letter] + 12) % 12
		if offset > 6 {
			offset -= 12
		}
		accidental, ok := accidentalForOffset(offset)
		if !ok {
			return nil, false
		}
		notes = append(notes, letter+accidental)
	}

	return notes, true
}

var letterOrder = []string{"C", "D", "E", "F", "G", "A", "B"}

var naturalPitch = map[string]int{
	"C": 0,
	"D": 2,
	"E": 4,
	"F": 5,
	"G": 7,
	"A": 9,
	"B": 11,
}

func accidentalForOffset(offset int) (string, bool) {
	switch offset {
	case -2:
		return "bb", true
	case -1:
		return "b", true
	case 0:
		return "", true
	case 1:
		return "#", true
	case 2:
		return "##", true
	default:
		return "", false
	}
}

func normalizeKey(key string) string {
	trimmed := strings.TrimSpace(key)
	if trimmed == "" {
		return ""
	}

	lower := strings.ToLower(trimmed)
	runes := []rune(lower)
	if len(runes) == 0 {
		return ""
	}

	runes[0] = []rune(strings.ToUpper(string(runes[0])))[0]
	return string(runes)
}

func shouldUseFlats(key string) bool {
	if strings.Contains(key, "b") {
		return true
	}
	if strings.Contains(key, "#") {
		return false
	}

	switch key {
	case "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb":
		return true
	default:
		return false
	}
}
