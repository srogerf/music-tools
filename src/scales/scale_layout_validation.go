package scales

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
)

func validateScaleLayouts(set ScaleLayoutSet, definitions DefinitionSet) error {
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

			forEachScaleLayoutFamily(&scale, func(familyCode string, family *ScaleLayoutFamily) {
				for positionName, position := range family.Positions {
					positionIssues := validateScaleLayoutPosition(tuning, octaves, definition, scale.Name, familyCode, positionName, position)
					if len(positionIssues) > 0 {
						issues = append(issues, positionIssues...)
					}
				}
			})
		}
	}

	if len(issues) > 0 {
		return fmt.Errorf("layout validation failed:\n- %s", strings.Join(issues, "\n- "))
	}

	return nil
}

func validateScaleLayoutPosition(
	tuning ScaleLayoutTuning,
	octaves []int,
	scale Definition,
	scaleName string,
	familyCode string,
	positionName string,
	position ScaleLayoutPosition,
) []string {
	var issues []string
	if position.Mode != "range" && position.Mode != "split" {
		return []string{fmt.Sprintf("layout %s/%s/%s/%s mode must be range or split", tuning.Name, scaleName, familyCode, positionName)}
	}

	noteIndex := noteIndexMap()
	scalePitchClasses := map[int]struct{}{}
	for _, interval := range scale.Intervals {
		scalePitchClasses[(interval.Semitones%12+12)%12] = struct{}{}
	}

	minPitch := int(^uint(0) >> 1)
	maxPitch := -minPitch - 1

	pitchCounts := map[int]int{}
	pitchLocations := map[int][2]int{}
	for stringIndex, openNote := range tuning.Strings {
		baseIndex, ok := noteIndex[openNote]
		if !ok {
			issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s unknown tuning note %s", tuning.Name, scaleName, familyCode, positionName, openNote))
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
		return []string{fmt.Sprintf("layout %s/%s/%s/%s has no frets", tuning.Name, scaleName, familyCode, positionName)}
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
				"layout %s/%s/%s/%s repeats pitch %s (first at string %d fret %d)",
				tuning.Name,
				scaleName,
				familyCode,
				positionName,
				pitchName(pitch),
				first[0]+1,
				first[1],
			))
		}
		if _, ok := expected[pitch]; !ok {
			issues = append(issues, fmt.Sprintf(
				"layout %s/%s/%s/%s includes unexpected pitch %s",
				tuning.Name,
				scaleName,
				familyCode,
				positionName,
				pitchName(pitch),
			))
		}
	}

	if len(pitchCounts) != len(expected) {
		missing := missingPitchNames(expected, pitchCounts)
		issues = append(issues, fmt.Sprintf(
			"layout %s/%s/%s/%s missing %d pitches (%s)",
			tuning.Name,
			scaleName,
			familyCode,
			positionName,
			len(expected)-len(pitchCounts),
			strings.Join(missing, ", "),
		))
	}

	switch familyCode {
	case DefaultScaleLayoutFamilyCode:
		issues = append(issues, validateStandardScaleLayoutPosition(tuning, scaleName, familyCode, positionName)...)
	case "3nps":
		issues = append(issues, validateThreeNpsScaleLayoutPosition(tuning, octaves, scale, scaleName, familyCode, positionName, position)...)
	default:
		issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s has unsupported layout family", tuning.Name, scaleName, familyCode, positionName))
	}

	return issues
}

func validateStandardScaleLayoutPosition(
	tuning ScaleLayoutTuning,
	scaleName string,
	familyCode string,
	positionName string,
) []string {
	if _, ok := standardScaleLayoutPositions[positionName]; ok {
		return nil
	}
	return []string{fmt.Sprintf("layout %s/%s/%s/%s standard position must be one of C, A, G, E, D", tuning.Name, scaleName, familyCode, positionName)}
}

func validateThreeNpsScaleLayoutPosition(
	tuning ScaleLayoutTuning,
	octaves []int,
	scale Definition,
	scaleName string,
	familyCode string,
	positionName string,
	position ScaleLayoutPosition,
) []string {
	var issues []string
	if _, ok := threeNpsScaleLayoutPositions[positionName]; !ok {
		issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps position must be one of C, A, A2, G, E, D, D2", tuning.Name, scaleName, familyCode, positionName))
	}
	if scale.Type != ScaleTypeDiatonic || len(scale.Intervals) != 7 {
		issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps requires a seven-note diatonic scale", tuning.Name, scaleName, familyCode, positionName))
	}
	if position.Mode != "split" {
		issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps mode must be split", tuning.Name, scaleName, familyCode, positionName))
	}
	if len(position.PerStringFrets) != tuning.StringCount {
		issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps must define per_string_frets for every string", tuning.Name, scaleName, familyCode, positionName))
	}

	noteIndex := noteIndexMap()
	scalePitchClassDegrees := map[int]int{}
	for index, interval := range scale.Intervals {
		scalePitchClassDegrees[(interval.Semitones%12+12)%12] = index + 1
	}

	var previousPitch *int
	var previousDegree int
	for stringIndex, openNote := range tuning.Strings {
		frets := position.PerStringFrets[fmt.Sprintf("%d", stringIndex)]
		if len(frets) != 3 {
			issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps string %d must have exactly 3 frets", tuning.Name, scaleName, familyCode, positionName, stringIndex+1))
		}
		if !sort.IntsAreSorted(frets) {
			issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps string %d frets must be sorted ascending", tuning.Name, scaleName, familyCode, positionName, stringIndex+1))
		}

		openIndex, ok := noteIndex[openNote]
		if !ok || stringIndex >= len(octaves) {
			continue
		}
		basePitch := (octaves[stringIndex] * 12) + openIndex
		for _, fret := range frets {
			pitch := basePitch + fret
			degree, ok := scalePitchClassDegrees[((pitch%12)+12)%12]
			if !ok {
				issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps string %d fret %d is outside the scale", tuning.Name, scaleName, familyCode, positionName, stringIndex+1, fret))
				continue
			}
			if previousPitch != nil {
				if pitch <= *previousPitch {
					issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps pitches must ascend strictly", tuning.Name, scaleName, familyCode, positionName))
				}
				expectedDegree := previousDegree + 1
				if expectedDegree > len(scale.Intervals) {
					expectedDegree = 1
				}
				if degree != expectedDegree {
					issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps degree continuity breaks: expected degree %d, got degree %d at string %d fret %d", tuning.Name, scaleName, familyCode, positionName, expectedDegree, degree, stringIndex+1, fret))
				}
			}
			previousPitch = &pitch
			previousDegree = degree
		}
	}

	for stringIndex, frets := range position.PerStringFrets {
		if _, err := strconv.Atoi(stringIndex); err != nil {
			issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps has invalid string index %q", tuning.Name, scaleName, familyCode, positionName, stringIndex))
			continue
		}
		for _, fret := range frets {
			if !positionSplitRangesCoverFret(position, stringIndex, fret) {
				issues = append(issues, fmt.Sprintf("layout %s/%s/%s/%s 3nps string %s fret %d is outside split_ranges", tuning.Name, scaleName, familyCode, positionName, stringIndex, fret))
			}
		}
	}

	return issues
}

func positionSplitRangesCoverFret(position ScaleLayoutPosition, stringIndexText string, fret int) bool {
	stringIndex, err := strconv.Atoi(stringIndexText)
	if err != nil {
		return false
	}
	for _, splitRange := range position.SplitRanges {
		foundString := false
		for _, idx := range splitRange.Strings {
			if idx == stringIndex {
				foundString = true
				break
			}
		}
		if !foundString {
			continue
		}
		if fret >= splitRange.Start && fret <= splitRange.Start+splitRange.Span-1 {
			return true
		}
	}
	return false
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
