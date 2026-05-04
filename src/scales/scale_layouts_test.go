package scales

import (
	"fmt"
	"strings"
	"testing"

	"music-tools/src/tuning"
)

func TestScaleLayoutsValidate(t *testing.T) {
	defs, tunings, err := loadTestScaleLayoutInputs()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings); err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}
}

func loadTestScaleLayoutInputs() (DefinitionSet, tuning.DefinitionSet, error) {
	defs, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		return DefinitionSet{}, tuning.DefinitionSet{}, fmt.Errorf("LoadDefinitions: %w", err)
	}
	tunings, err := tuning.LoadDefinitions("../../data/tunings/DEFINITIONS.json")
	if err != nil {
		return DefinitionSet{}, tuning.DefinitionSet{}, fmt.Errorf("LoadTuningDefinitions: %w", err)
	}
	return defs, tunings, nil
}

func TestScaleLayoutsRejectStandardOnlyPositionCodes(t *testing.T) {
	defs, tunings, err := loadTestScaleLayoutInputs()
	if err != nil {
		t.Fatal(err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	for tuningIndex := range layouts.Tunings {
		for scaleIndex := range layouts.Tunings[tuningIndex].Scales {
			scale := &layouts.Tunings[tuningIndex].Scales[scaleIndex]
			if scale.Name != "Major" {
				continue
			}
			family := scale.LayoutFamilies[DefaultScaleLayoutFamilyCode]
			family.Positions["A2"] = family.Positions["A"]
			scale.LayoutFamilies[DefaultScaleLayoutFamilyCode] = family
		}
	}

	err = validateScaleLayouts(layouts, defs)
	if err == nil || !strings.Contains(err.Error(), "standard position must be one of C, A, G, E, D") {
		t.Fatalf("expected standard position-code validation error, got %v", err)
	}
}

func TestScaleLayoutsRejectThreeNpsDegreeBreak(t *testing.T) {
	defs, tunings, err := loadTestScaleLayoutInputs()
	if err != nil {
		t.Fatal(err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	for tuningIndex := range layouts.Tunings {
		for scaleIndex := range layouts.Tunings[tuningIndex].Scales {
			scale := &layouts.Tunings[tuningIndex].Scales[scaleIndex]
			if scale.Name != "Major" {
				continue
			}
			family := scale.LayoutFamilies["3nps"]
			position := family.Positions["G"]
			position.PerStringFrets["2"][0] = 7
			family.Positions["G"] = position
			scale.LayoutFamilies["3nps"] = family
		}
	}

	err = validateScaleLayouts(layouts, defs)
	if err == nil || !strings.Contains(err.Error(), "3nps degree continuity breaks") {
		t.Fatalf("expected 3nps degree-continuity validation error, got %v", err)
	}
}

func TestMinorBluesEPositionMatchesVisibleMinorPentatonicBox(t *testing.T) {
	defs, tunings, err := loadTestScaleLayoutInputs()
	if err != nil {
		t.Fatal(err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	var bluesPosition *ScaleLayoutPosition
	for tuningIndex := range layouts.Tunings {
		for scaleIndex := range layouts.Tunings[tuningIndex].Scales {
			scale := &layouts.Tunings[tuningIndex].Scales[scaleIndex]
			if scale.Name != "Minor Blues" {
				continue
			}
			family := scale.LayoutFamilies[DefaultScaleLayoutFamilyCode]
			position := family.Positions["E"]
			bluesPosition = &position
		}
	}

	if bluesPosition == nil {
		t.Fatalf("expected Minor Blues E position")
	}
	if bluesPosition.Start != 8 || bluesPosition.Span != 4 {
		t.Fatalf("expected Minor Blues E position to display frets 8-11, got start %d span %d", bluesPosition.Start, bluesPosition.Span)
	}
}

func TestMinorBluesAPositionMovesOuterBlueNoteToSecondString(t *testing.T) {
	defs, tunings, err := loadTestScaleLayoutInputs()
	if err != nil {
		t.Fatal(err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	var bluesPosition *ScaleLayoutPosition
	for tuningIndex := range layouts.Tunings {
		for scaleIndex := range layouts.Tunings[tuningIndex].Scales {
			scale := &layouts.Tunings[tuningIndex].Scales[scaleIndex]
			if scale.Name != "Minor Blues" {
				continue
			}
			family := scale.LayoutFamilies[DefaultScaleLayoutFamilyCode]
			position := family.Positions["A"]
			bluesPosition = &position
		}
	}

	if bluesPosition == nil {
		t.Fatalf("expected Minor Blues A position")
	}
	if bluesPosition.Start != 3 || bluesPosition.Span != 5 {
		t.Fatalf("expected Minor Blues A position to display frets 3-7, got start %d span %d", bluesPosition.Start, bluesPosition.Span)
	}
	expectedFrets := map[string][]int{
		"0": {3, 6},
		"1": {3, 6},
		"2": {3, 4, 5},
		"3": {3, 5},
		"4": {4, 6, 7},
		"5": {3, 6},
	}
	for stringIndex, expected := range expectedFrets {
		actual := bluesPosition.PerStringFrets[stringIndex]
		if len(actual) != len(expected) {
			t.Fatalf("expected Minor Blues A string %s frets %v, got %v", stringIndex, expected, actual)
		}
		for i := range expected {
			if actual[i] != expected[i] {
				t.Fatalf("expected Minor Blues A string %s frets %v, got %v", stringIndex, expected, actual)
			}
		}
	}
}

func TestMinorBluesDPositionMovesBlueNotesToOuterStrings(t *testing.T) {
	defs, tunings, err := loadTestScaleLayoutInputs()
	if err != nil {
		t.Fatal(err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	var bluesPosition *ScaleLayoutPosition
	for tuningIndex := range layouts.Tunings {
		for scaleIndex := range layouts.Tunings[tuningIndex].Scales {
			scale := &layouts.Tunings[tuningIndex].Scales[scaleIndex]
			if scale.Name != "Minor Blues" {
				continue
			}
			family := scale.LayoutFamilies[DefaultScaleLayoutFamilyCode]
			position := family.Positions["D"]
			bluesPosition = &position
		}
	}

	if bluesPosition == nil {
		t.Fatalf("expected Minor Blues D position")
	}
	if bluesPosition.Start != 9 || bluesPosition.Span != 6 {
		t.Fatalf("expected Minor Blues D position to display frets 9-14, got start %d span %d", bluesPosition.Start, bluesPosition.Span)
	}
	expectedFrets := map[string][]int{
		"0": {11, 13, 14},
		"1": {10, 13},
		"2": {10, 13},
		"3": {10, 11, 12},
		"4": {11, 13},
		"5": {11, 13, 14},
	}
	for stringIndex, expected := range expectedFrets {
		actual := bluesPosition.PerStringFrets[stringIndex]
		if len(actual) != len(expected) {
			t.Fatalf("expected Minor Blues D string %s frets %v, got %v", stringIndex, expected, actual)
		}
		for i := range expected {
			if actual[i] != expected[i] {
				t.Fatalf("expected Minor Blues D string %s frets %v, got %v", stringIndex, expected, actual)
			}
		}
	}
}

func TestMajorBluesUsesMajorPentatonicBoxesWithBlueNoteExtensions(t *testing.T) {
	defs, tunings, err := loadTestScaleLayoutInputs()
	if err != nil {
		t.Fatal(err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	expected := map[string]ScaleLayoutPosition{
		"A": {Start: 2, Span: 5},
		"C": {Start: 0, Span: 5},
		"E": {Start: 7, Span: 5},
		"D": {Start: 9, Span: 5},
		"G": {Start: 4, Span: 5},
	}
	found := map[string]ScaleLayoutPosition{}
	for tuningIndex := range layouts.Tunings {
		for scaleIndex := range layouts.Tunings[tuningIndex].Scales {
			scale := &layouts.Tunings[tuningIndex].Scales[scaleIndex]
			if scale.Name != "Major Blues" {
				continue
			}
			family := scale.LayoutFamilies[DefaultScaleLayoutFamilyCode]
			found = family.Positions
		}
	}

	if len(found) == 0 {
		t.Fatalf("expected Major Blues positions")
	}
	for positionName, expectedPosition := range expected {
		position := found[positionName]
		if position.Start != expectedPosition.Start || position.Span != expectedPosition.Span {
			t.Fatalf("expected Major Blues %s position start %d span %d, got start %d span %d", positionName, expectedPosition.Start, expectedPosition.Span, position.Start, position.Span)
		}
	}
}

func TestMajorBluesEPositionIncludesHighStringBlueNote(t *testing.T) {
	defs, tunings, err := loadTestScaleLayoutInputs()
	if err != nil {
		t.Fatal(err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	var bluesPosition *ScaleLayoutPosition
	for tuningIndex := range layouts.Tunings {
		for scaleIndex := range layouts.Tunings[tuningIndex].Scales {
			scale := &layouts.Tunings[tuningIndex].Scales[scaleIndex]
			if scale.Name != "Major Blues" {
				continue
			}
			family := scale.LayoutFamilies[DefaultScaleLayoutFamilyCode]
			position := family.Positions["E"]
			bluesPosition = &position
		}
	}

	if bluesPosition == nil {
		t.Fatalf("expected Major Blues E position")
	}
	expectedFrets := map[string][]int{
		"0": {8, 10, 11},
		"1": {7, 10},
		"2": {7, 10},
		"3": {7, 8, 9},
		"4": {8, 10},
		"5": {8, 10, 11},
	}
	for stringIndex, expected := range expectedFrets {
		actual := bluesPosition.PerStringFrets[stringIndex]
		if len(actual) != len(expected) {
			t.Fatalf("expected Major Blues E string %s frets %v, got %v", stringIndex, expected, actual)
		}
		for i := range expected {
			if actual[i] != expected[i] {
				t.Fatalf("expected Major Blues E string %s frets %v, got %v", stringIndex, expected, actual)
			}
		}
	}
}

func TestMajorBluesGPositionMovesBlueNoteToThirdString(t *testing.T) {
	defs, tunings, err := loadTestScaleLayoutInputs()
	if err != nil {
		t.Fatal(err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	var bluesPosition *ScaleLayoutPosition
	for tuningIndex := range layouts.Tunings {
		for scaleIndex := range layouts.Tunings[tuningIndex].Scales {
			scale := &layouts.Tunings[tuningIndex].Scales[scaleIndex]
			if scale.Name != "Major Blues" {
				continue
			}
			family := scale.LayoutFamilies[DefaultScaleLayoutFamilyCode]
			position := family.Positions["G"]
			bluesPosition = &position
		}
	}

	if bluesPosition == nil {
		t.Fatalf("expected Major Blues G position")
	}
	expectedFrets := map[string][]int{
		"0": {5, 8},
		"1": {5, 6, 7},
		"2": {5, 7},
		"3": {5, 7, 8},
		"4": {5, 8},
		"5": {5, 8},
	}
	for stringIndex, expected := range expectedFrets {
		actual := bluesPosition.PerStringFrets[stringIndex]
		if len(actual) != len(expected) {
			t.Fatalf("expected Major Blues G string %s frets %v, got %v", stringIndex, expected, actual)
		}
		for i := range expected {
			if actual[i] != expected[i] {
				t.Fatalf("expected Major Blues G string %s frets %v, got %v", stringIndex, expected, actual)
			}
		}
	}
}

func TestSelectedScalePositionsHaveNotesOnEveryString(t *testing.T) {
	defs, tunings, err := loadTestScaleLayoutInputs()
	if err != nil {
		t.Fatal(err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	definitionsByID := map[int]Definition{}
	for _, definition := range defs.Scales {
		definitionsByID[definition.ID] = definition
	}

	for _, tuning := range layouts.Tunings {
		if tuning.Name != "Standard" {
			continue
		}
		noteIndex := noteIndexMap()
		openIndexes := make([]int, 0, len(tuning.Strings))
		for _, openNote := range tuning.Strings {
			openIndexes = append(openIndexes, noteIndex[openNote])
		}

		checkedScales := map[string]struct{}{
			"Major Blues":           {},
			"Minor Blues":           {},
			"Double Harmonic Major": {},
		}
		for _, scale := range tuning.Scales {
			if _, ok := checkedScales[scale.Name]; !ok {
				continue
			}
			definition, ok := definitionsByID[scale.ID]
			if !ok {
				t.Fatalf("missing definition for %s", scale.Name)
			}
			pitchClasses := map[int]struct{}{}
			for _, interval := range definition.Intervals {
				pitchClasses[interval.Semitones%12] = struct{}{}
			}

			family := scale.LayoutFamilies[DefaultScaleLayoutFamilyCode]
			for _, positionName := range defaultScaleLayoutOrder {
				position, ok := family.Positions[positionName]
				if !ok {
					t.Fatalf("expected %s %s position", scale.Name, positionName)
				}
				for stringIndex, openIndex := range openIndexes {
					found := false
					for _, fret := range positionFretsForString(position, stringIndex) {
						if _, ok := pitchClasses[(openIndex+fret)%12]; ok {
							found = true
							break
						}
					}
					if !found {
						t.Fatalf("expected %s %s position to have at least one note on string %d", scale.Name, positionName, stringIndex+1)
					}
				}
			}
		}
	}
}

func TestScaleLayoutsRangeCompletenessReport(t *testing.T) {
	defs, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadDefinitions: %v", err)
	}
	tunings, err := tuning.LoadDefinitions("../../data/tunings/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadTuningDefinitions: %v", err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	issues := RangeCompletenessReport(layouts, defs)
	if len(issues) == 0 {
		t.Log("range completeness report: no issues found")
		return
	}

	t.Logf("range completeness report (%d issues):\n- %s", len(issues), strings.Join(issues, "\n- "))
}

func TestScaleLayoutsShapeCorrectnessReport(t *testing.T) {
	defs, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadDefinitions: %v", err)
	}
	tunings, err := tuning.LoadDefinitions("../../data/tunings/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadTuningDefinitions: %v", err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	issues := ShapeCorrectnessReport(layouts, defs)
	if len(issues) == 0 {
		t.Log("shape correctness report: no issues found")
		return
	}

	t.Logf("shape correctness report (%d issues):\n- %s", len(issues), strings.Join(issues, "\n- "))
}
