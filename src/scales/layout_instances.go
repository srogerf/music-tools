package scales

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
)

type LayoutInstanceSet struct {
	Tunings []LayoutTuningInstance `json:"tunings"`
}

type LayoutTuningInstance struct {
	ID          int                   `json:"id"`
	Name        string                `json:"name"`
	StringCount int                   `json:"string_count"`
	Strings     []string              `json:"strings"`
	Scales      []LayoutScaleInstance `json:"scales"`
}

type LayoutScaleInstance struct {
	ID        int                       `json:"id"`
	Name      string                    `json:"name"`
	Type      ScaleType                 `json:"type"`
	Positions map[string]LayoutPosition `json:"positions"`
}

type LayoutPosition struct {
	Mode           string               `json:"mode"`
	Start          int                  `json:"start"`
	Span           int                  `json:"span"`
	PerString      map[string]FretRange `json:"per_string"`
	PerStringFrets map[string][]int     `json:"per_string_frets"`
	Validated      bool                 `json:"validated_manual"`
}

func LoadLayoutInstances(path string, definitions DefinitionSet) (LayoutInstanceSet, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return LayoutInstanceSet{}, fmt.Errorf("read layout instances: %w", err)
	}

	var set LayoutInstanceSet
	if err := json.Unmarshal(data, &set); err != nil {
		return LayoutInstanceSet{}, fmt.Errorf("parse layout instances: %w", err)
	}

	if err := validateLayoutInstances(set, definitions); err != nil {
		return LayoutInstanceSet{}, err
	}

	return set, nil
}

func (set LayoutInstanceSet) ByTuningID(id int) (LayoutTuningInstance, bool) {
	for _, tuning := range set.Tunings {
		if tuning.ID == id {
			return tuning, true
		}
	}
	return LayoutTuningInstance{}, false
}

func validateLayoutInstances(set LayoutInstanceSet, definitions DefinitionSet) error {
	scaleByID := map[int]Definition{}
	for _, scale := range definitions.Scales {
		scaleByID[scale.ID] = scale
	}

	var issues []string
	for _, tuning := range set.Tunings {
		if tuning.ID <= 0 {
			issues = append(issues, "layout tuning id must be positive")
			continue
		}
		if tuning.Name == "" {
			issues = append(issues, "layout tuning name is required")
			continue
		}
		if tuning.StringCount < 1 || tuning.StringCount > 9 {
			issues = append(issues, fmt.Sprintf("layout tuning %s string_count must be between 1 and 9", tuning.Name))
			continue
		}
		if len(tuning.Strings) != tuning.StringCount {
			issues = append(issues, fmt.Sprintf("layout tuning %s must have %d strings", tuning.Name, tuning.StringCount))
			continue
		}

		octaves, err := standardOctavesForTuning(tuning)
		if err != nil {
			issues = append(issues, err.Error())
			continue
		}

		for _, scale := range tuning.Scales {
			definition, ok := scaleByID[scale.ID]
			if !ok {
				issues = append(issues, fmt.Sprintf("layout scale id %d not found in definitions", scale.ID))
				continue
			}
			if definition.Type != scale.Type {
				issues = append(issues, fmt.Sprintf("layout scale %s type mismatch: %s != %s", scale.Name, definition.Type, scale.Type))
				continue
			}

			for positionName, position := range scale.Positions {
				positionIssues := validateLayoutPosition(tuning, octaves, definition, scale.Name, positionName, position)
				if len(positionIssues) > 0 {
					issues = append(issues, positionIssues...)
				}
			}
		}
	}

	if len(issues) > 0 {
		return fmt.Errorf("layout validation failed:\n- %s", strings.Join(issues, "\n- "))
	}

	return nil
}

func validateLayoutPosition(
	tuning LayoutTuningInstance,
	octaves []int,
	scale Definition,
	scaleName string,
	positionName string,
	position LayoutPosition,
) []string {
	var issues []string
	if position.Mode != "range" && position.Mode != "split" {
		return []string{fmt.Sprintf("layout %s/%s/%s mode must be range or split", tuning.Name, scaleName, positionName)}
	}

	noteIndex := noteIndexMap()
	scalePitchClasses := map[int]struct{}{}
	for _, interval := range scale.Intervals {
		scalePitchClasses[(interval%12+12)%12] = struct{}{}
	}

	minPitch := int(^uint(0) >> 1)
	maxPitch := -minPitch - 1

	pitchCounts := map[int]int{}
	pitchLocations := map[int][2]int{}
	for stringIndex, openNote := range tuning.Strings {
		baseIndex, ok := noteIndex[openNote]
		if !ok {
			issues = append(issues, fmt.Sprintf("layout %s/%s/%s unknown tuning note %s", tuning.Name, scaleName, positionName, openNote))
			continue
		}
		basePitch := (octaves[stringIndex] * 12) + baseIndex

		frets := positionFretsForString(position, stringIndex)
		for _, fret := range frets {
			pitch := basePitch + fret
			if pitch < minPitch {
				minPitch = pitch
			}
			if pitch > maxPitch {
				maxPitch = pitch
			}
			if _, ok := scalePitchClasses[pitch%12]; ok {
				pitchCounts[pitch]++
				if pitchCounts[pitch] == 1 {
					pitchLocations[pitch] = [2]int{stringIndex, fret}
				}
			}
		}
	}

	if minPitch > maxPitch {
		return []string{fmt.Sprintf("layout %s/%s/%s has no frets", tuning.Name, scaleName, positionName)}
	}

	expected := map[int]struct{}{}
	for pitch := minPitch; pitch <= maxPitch; pitch++ {
		if _, ok := scalePitchClasses[pitch%12]; ok {
			expected[pitch] = struct{}{}
		}
	}

	for pitch, count := range pitchCounts {
		if count > 1 {
			first := pitchLocations[pitch]
			issues = append(issues, fmt.Sprintf(
				"layout %s/%s/%s repeats pitch %s (first at string %d fret %d)",
				tuning.Name,
				scaleName,
				positionName,
				pitchName(pitch),
				first[0]+1,
				first[1],
			))
		}
		if _, ok := expected[pitch]; !ok {
			issues = append(issues, fmt.Sprintf(
				"layout %s/%s/%s includes unexpected pitch %s",
				tuning.Name,
				scaleName,
				positionName,
				pitchName(pitch),
			))
		}
	}

	if len(pitchCounts) != len(expected) {
		missing := missingPitchNames(expected, pitchCounts)
		issues = append(issues, fmt.Sprintf(
			"layout %s/%s/%s missing %d pitches (%s)",
			tuning.Name,
			scaleName,
			positionName,
			len(expected)-len(pitchCounts),
			strings.Join(missing, ", "),
		))
	}

	return issues
}

func positionRangeForString(position LayoutPosition, stringIndex int) (int, int) {
	if position.Mode == "split" {
		if entry, ok := position.PerString[fmt.Sprintf("%d", stringIndex)]; ok {
			return entry.Start, entry.Start + entry.Span - 1
		}
	}
	return position.Start, position.Start + position.Span - 1
}

func positionFretsForString(position LayoutPosition, stringIndex int) []int {
	if len(position.PerStringFrets) > 0 {
		if frets, ok := position.PerStringFrets[fmt.Sprintf("%d", stringIndex)]; ok {
			return frets
		}
	}
	start, end := positionRangeForString(position, stringIndex)
	frets := make([]int, 0, end-start+1)
	for fret := start; fret <= end; fret++ {
		frets = append(frets, fret)
	}
	return frets
}

func standardOctavesForTuning(tuning LayoutTuningInstance) ([]int, error) {
	if tuning.Name != "Standard" || tuning.StringCount != 6 {
		return nil, fmt.Errorf("layout tuning %s requires octave data", tuning.Name)
	}
	return []int{2, 2, 3, 3, 3, 4}, nil
}

func noteIndexMap() map[string]int {
	return map[string]int{
		"C": 0, "C#": 1, "Db": 1,
		"D": 2, "D#": 3, "Eb": 3,
		"E": 4,
		"F": 5, "F#": 6, "Gb": 6,
		"G": 7, "G#": 8, "Ab": 8,
		"A": 9, "A#": 10, "Bb": 10,
		"B": 11, "Cb": 11,
	}
}

func pitchName(pitch int) string {
	noteNames := []string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}
	name := noteNames[pitch%12]
	octave := pitch/12 - 1
	return fmt.Sprintf("%s%d", name, octave)
}

func missingPitchNames(expected map[int]struct{}, present map[int]int) []string {
	var missing []string
	for pitch := range expected {
		if present[pitch] == 0 {
			missing = append(missing, pitchName(pitch))
		}
	}
	sort.Strings(missing)
	return missing
}
