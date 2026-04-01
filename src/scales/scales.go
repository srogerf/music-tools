package scales

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
)

type ScaleType string

const (
	ScaleTypeTriad     ScaleType = "triad"
	ScaleTypeQuadad    ScaleType = "quadad"
	ScaleTypePentation ScaleType = "pentation"
	ScaleTypeDiatonic  ScaleType = "diatonic"
)

type Definition struct {
	Name       string    `json:"name"`
	CommonName string    `json:"common_name"`
	Type       ScaleType `json:"type"`
	Intervals  []int     `json:"intervals"`
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
		if scale.Name == name || scale.CommonName == name {
			return scale, true
		}
	}
	return Definition{}, false
}

// NotesFor returns the note names for a key and scale name/common name.
// The key should be a pitch class like C, Eb, or F#.
func (set DefinitionSet) NotesFor(key string, scaleName string) ([]string, error) {
	scale, ok := set.ByName(scaleName)
	if !ok {
		return nil, fmt.Errorf("unknown scale: %s", scaleName)
	}

	return notesForKeyAndIntervals(key, scale.Intervals)
}

func notesForKeyAndIntervals(key string, intervals []int) ([]string, error) {
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

	notes := make([]string, 0, len(intervals))
	for _, interval := range intervals {
		pitchClass := (root + interval) % 12
		if pitchClass < 0 {
			pitchClass += 12
		}
		notes = append(notes, scaleNames[pitchClass])
	}

	return notes, nil
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
