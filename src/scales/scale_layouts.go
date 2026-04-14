package scales

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"music-tools/src/tuning"
)

var defaultScaleLayoutOrder = []string{"C", "A", "G", "E", "D"}

type ScaleLayoutSet struct {
	Tunings []ScaleLayoutTuning `json:"tunings"`
}

type ScaleLayoutTuning struct {
	ID          int                `json:"id"`
	Name        string             `json:"name"`
	StringCount int                `json:"string_count"`
	Strings     []string           `json:"strings"`
	Scales      []ScaleLayoutScale `json:"scales"`
}

type ScaleLayoutScale struct {
	ID        int                            `json:"id"`
	Name      string                         `json:"name"`
	Type      ScaleType                      `json:"type"`
	Positions map[string]ScaleLayoutPosition `json:"positions"`
}

type FretRange struct {
	Start int `json:"start"`
	Span  int `json:"span"`
}

type ScaleLayoutPosition struct {
	Mode           string               `json:"mode"`
	Start          int                  `json:"start"`
	Span           int                  `json:"span"`
	PerString      map[string]FretRange `json:"per_string"`
	SplitRanges    []SplitRange         `json:"split_ranges"`
	PerStringFrets map[string][]int     `json:"per_string_frets"`
	Validated      bool                 `json:"validated_manual"`
}

type SplitRange struct {
	Strings []int `json:"strings"`
	Start   int   `json:"start"`
	Span    int   `json:"span"`
}

func LoadScaleLayouts(path string, definitions DefinitionSet, tunings tuning.DefinitionSet) (ScaleLayoutSet, error) {
	info, err := os.Stat(path)
	if err != nil {
		return ScaleLayoutSet{}, fmt.Errorf("stat scale layouts: %w", err)
	}

	var set ScaleLayoutSet
	if info.IsDir() {
		set, err = loadScaleLayoutDirectory(path, tunings)
	} else {
		set, err = loadLegacyScaleLayoutFile(path, tunings)
	}
	if err != nil {
		return ScaleLayoutSet{}, err
	}

	seedMissingScaleLayouts(&set, definitions)
	materializeGeneratedFrets(&set, definitions)

	if err := validateScaleLayouts(set, definitions); err != nil {
		return ScaleLayoutSet{}, err
	}

	return set, nil
}

type scaleLayoutFile struct {
	ID      int                     `json:"id"`
	Name    string                  `json:"name"`
	Type    ScaleType               `json:"type"`
	Layouts []scaleLayoutFileLayout `json:"layouts"`
}

type scaleLayoutFileLayout struct {
	Tuning    string                         `json:"tuning"`
	Positions map[string]ScaleLayoutPosition `json:"positions"`
}

func loadScaleLayoutDirectory(path string, tuningSet tuning.DefinitionSet) (ScaleLayoutSet, error) {
	entries, err := os.ReadDir(path)
	if err != nil {
		return ScaleLayoutSet{}, fmt.Errorf("read scale layout directory: %w", err)
	}

	set := newScaleLayoutSetFromTunings(tuningSet)
	tuningsByID := map[int]*ScaleLayoutTuning{}
	for i := range set.Tunings {
		tuningsByID[set.Tunings[i].ID] = &set.Tunings[i]
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(strings.ToLower(entry.Name()), ".json") {
			continue
		}

		fullPath := filepath.Join(path, entry.Name())
		layoutFile, err := readScaleLayoutFile(fullPath)
		if err != nil {
			return ScaleLayoutSet{}, err
		}

		for _, layoutData := range layoutFile.Layouts {
			tuningDef, ok := tuningSet.ByName(layoutData.Tuning)
			if !ok {
				return ScaleLayoutSet{}, fmt.Errorf("unknown tuning %q in %s", layoutData.Tuning, fullPath)
			}

			tuning, ok := tuningsByID[tuningDef.ID]
			if !ok {
				return ScaleLayoutSet{}, fmt.Errorf("missing tuning %q in resolved layout set", layoutData.Tuning)
			}

			tuning.Scales = append(tuning.Scales, ScaleLayoutScale{
				ID:        layoutFile.ID,
				Name:      layoutFile.Name,
				Type:      layoutFile.Type,
				Positions: layoutData.Positions,
			})
		}
	}

	for i := range set.Tunings {
		tuning := &set.Tunings[i]
		sort.Slice(tuning.Scales, func(i, j int) bool {
			return tuning.Scales[i].ID < tuning.Scales[j].ID
		})
	}

	return set, nil
}

func loadLegacyScaleLayoutFile(path string, _ tuning.DefinitionSet) (ScaleLayoutSet, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return ScaleLayoutSet{}, fmt.Errorf("read scale layouts: %w", err)
	}

	var set ScaleLayoutSet
	if err := json.Unmarshal(data, &set); err != nil {
		return ScaleLayoutSet{}, fmt.Errorf("parse scale layouts: %w", err)
	}

	return set, nil
}

func readScaleLayoutFile(path string) (scaleLayoutFile, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return scaleLayoutFile{}, fmt.Errorf("read scale layout file %s: %w", path, err)
	}

	var file scaleLayoutFile
	if err := json.Unmarshal(data, &file); err != nil {
		return scaleLayoutFile{}, fmt.Errorf("parse scale layout file %s: %w", path, err)
	}
	return file, nil
}

func newScaleLayoutSetFromTunings(tuningSet tuning.DefinitionSet) ScaleLayoutSet {
	set := ScaleLayoutSet{Tunings: make([]ScaleLayoutTuning, 0, len(tuningSet.Tunings))}
	for _, tuningDef := range tuningSet.Tunings {
		set.Tunings = append(set.Tunings, ScaleLayoutTuning{
			ID:          tuningDef.ID,
			Name:        tuningDef.Name,
			StringCount: tuningDef.StringCount,
			Strings:     append([]string(nil), tuningDef.Strings...),
			Scales:      []ScaleLayoutScale{},
		})
	}
	sort.Slice(set.Tunings, func(i, j int) bool {
		return set.Tunings[i].ID < set.Tunings[j].ID
	})
	return set
}

func (set ScaleLayoutSet) ByTuningID(id int) (ScaleLayoutTuning, bool) {
	for _, tuning := range set.Tunings {
		if tuning.ID == id {
			return tuning, true
		}
	}
	return ScaleLayoutTuning{}, false
}

func seedMissingScaleLayouts(set *ScaleLayoutSet, definitions DefinitionSet) {
	for tuningIndex := range set.Tunings {
		tuning := &set.Tunings[tuningIndex]
		templatePositions := templatePositionsForTuning(*tuning)
		if len(templatePositions) == 0 {
			continue
		}

		existingByID := make(map[int]*ScaleLayoutScale, len(tuning.Scales))
		for scaleIndex := range tuning.Scales {
			existingByID[tuning.Scales[scaleIndex].ID] = &tuning.Scales[scaleIndex]
		}

		for _, definition := range definitions.Scales {
			if existing := existingByID[definition.ID]; existing != nil {
				if existing.Positions == nil {
					existing.Positions = map[string]ScaleLayoutPosition{}
				}
				for _, shape := range defaultScaleLayoutOrder {
					if _, ok := existing.Positions[shape]; ok {
						continue
					}
					template, ok := templatePositions[shape]
					if !ok {
						continue
					}
					existing.Positions[shape] = generateScaleLayoutPosition(*tuning, definition, template)
				}
				continue
			}

			positions := make(map[string]ScaleLayoutPosition, len(templatePositions))
			for _, shape := range defaultScaleLayoutOrder {
				template, ok := templatePositions[shape]
				if !ok {
					continue
				}
				positions[shape] = generateScaleLayoutPosition(*tuning, definition, template)
			}

			tuning.Scales = append(tuning.Scales, ScaleLayoutScale{
				ID:        definition.ID,
				Name:      definition.Name,
				Type:      definition.Type,
				Positions: positions,
			})
		}

		sort.Slice(tuning.Scales, func(i, j int) bool {
			return tuning.Scales[i].ID < tuning.Scales[j].ID
		})
	}
}

func materializeGeneratedFrets(set *ScaleLayoutSet, definitions DefinitionSet) {
	scaleByID := map[int]Definition{}
	for _, definition := range definitions.Scales {
		scaleByID[definition.ID] = definition
	}

	for tuningIndex := range set.Tunings {
		tuning := &set.Tunings[tuningIndex]
		for scaleIndex := range tuning.Scales {
			scale := &tuning.Scales[scaleIndex]
			definition, ok := scaleByID[scale.ID]
			if !ok {
				continue
			}
			for positionName, position := range scale.Positions {
				if position.Validated || len(position.PerStringFrets) > 0 {
					continue
				}
				generated := generateScaleLayoutPosition(*tuning, definition, position)
				if len(generated.PerStringFrets) == 0 {
					continue
				}
				position.PerStringFrets = generated.PerStringFrets
				scale.Positions[positionName] = position
			}
		}
	}
}

func MaterializeScaleLayoutFrets(set *ScaleLayoutSet, definitions DefinitionSet) {
	scaleByID := map[int]Definition{}
	for _, definition := range definitions.Scales {
		scaleByID[definition.ID] = definition
	}

	for tuningIndex := range set.Tunings {
		tuning := &set.Tunings[tuningIndex]
		for scaleIndex := range tuning.Scales {
			scale := &tuning.Scales[scaleIndex]
			definition, ok := scaleByID[scale.ID]
			if !ok {
				continue
			}
			for positionName, position := range scale.Positions {
				if len(position.PerStringFrets) > 0 {
					continue
				}
				generated := generateScaleLayoutPosition(*tuning, definition, position)
				if len(generated.PerStringFrets) == 0 {
					continue
				}
				position.PerStringFrets = generated.PerStringFrets
				scale.Positions[positionName] = position
			}
		}
	}
}

func templatePositionsForTuning(tuning ScaleLayoutTuning) map[string]ScaleLayoutPosition {
	for _, scale := range tuning.Scales {
		if scale.Name == "Major" {
			templates := make(map[string]ScaleLayoutPosition, len(scale.Positions))
			for name, position := range scale.Positions {
				templates[name] = ScaleLayoutPosition{
					Mode:        position.Mode,
					Start:       position.Start,
					Span:        position.Span,
					PerString:   clonePerStringRanges(position.PerString),
					SplitRanges: cloneSplitRanges(position.SplitRanges),
				}
			}
			return templates
		}
	}
	return nil
}

func clonePerStringRanges(source map[string]FretRange) map[string]FretRange {
	if len(source) == 0 {
		return nil
	}
	cloned := make(map[string]FretRange, len(source))
	for key, value := range source {
		cloned[key] = value
	}
	return cloned
}

func cloneSplitRanges(source []SplitRange) []SplitRange {
	if len(source) == 0 {
		return nil
	}
	cloned := make([]SplitRange, len(source))
	for i, value := range source {
		cloned[i] = SplitRange{
			Strings: append([]int(nil), value.Strings...),
			Start:   value.Start,
			Span:    value.Span,
		}
	}
	return cloned
}

type pitchCandidate struct {
	stringIndex int
	fret        int
}

func generateScaleLayoutPosition(tuning ScaleLayoutTuning, definition Definition, template ScaleLayoutPosition) ScaleLayoutPosition {
	position := ScaleLayoutPosition{
		Mode:        template.Mode,
		Start:       template.Start,
		Span:        template.Span,
		PerString:   clonePerStringRanges(template.PerString),
		SplitRanges: cloneSplitRanges(template.SplitRanges),
	}

	octaves, err := standardOctavesForTuning(tuning)
	if err != nil {
		return position
	}

	noteIndex := noteIndexMap()
	scalePitchClasses := map[int]struct{}{}
	for _, interval := range definition.Intervals {
		scalePitchClasses[(interval%12+12)%12] = struct{}{}
	}

	candidatesByPitch := map[int][]pitchCandidate{}
	var availablePitches []int
	seenPitches := map[int]struct{}{}

	for stringIndex, openNote := range tuning.Strings {
		baseIndex, ok := noteIndex[openNote]
		if !ok {
			continue
		}
		basePitch := octaves[stringIndex]*12 + baseIndex
		start, end := positionRangeForString(position, stringIndex)
		for fret := start; fret <= end; fret++ {
			pitch := basePitch + fret
			if _, ok := scalePitchClasses[pitch%12]; !ok {
				continue
			}
			candidatesByPitch[pitch] = append(candidatesByPitch[pitch], pitchCandidate{
				stringIndex: stringIndex,
				fret:        fret,
			})
			if _, ok := seenPitches[pitch]; !ok {
				seenPitches[pitch] = struct{}{}
				availablePitches = append(availablePitches, pitch)
			}
		}
	}

	sort.Ints(availablePitches)
	run := longestContinuousPitchRun(availablePitches, scalePitchClasses)
	if len(run) == 0 {
		return position
	}

	perStringFrets := map[string][]int{}
	for _, pitch := range run {
		candidates := candidatesByPitch[pitch]
		if len(candidates) == 0 {
			continue
		}
		chosen := candidates[0]
		for _, candidate := range candidates[1:] {
			if candidate.fret < chosen.fret || (candidate.fret == chosen.fret && candidate.stringIndex > chosen.stringIndex) {
				chosen = candidate
			}
		}
		key := fmt.Sprintf("%d", chosen.stringIndex)
		perStringFrets[key] = append(perStringFrets[key], chosen.fret)
	}

	for key := range perStringFrets {
		sort.Ints(perStringFrets[key])
	}
	position.PerStringFrets = perStringFrets
	return position
}

func longestContinuousPitchRun(availablePitches []int, scalePitchClasses map[int]struct{}) []int {
	if len(availablePitches) == 0 {
		return nil
	}

	bestStart := 0
	bestEnd := 0
	currentStart := 0

	for i := 1; i < len(availablePitches); i++ {
		if hasMissingScalePitchBetween(availablePitches[i-1], availablePitches[i], scalePitchClasses) {
			if i-currentStart > bestEnd-bestStart {
				bestStart = currentStart
				bestEnd = i
			}
			currentStart = i
		}
	}

	if len(availablePitches)-currentStart > bestEnd-bestStart {
		bestStart = currentStart
		bestEnd = len(availablePitches)
	}

	return availablePitches[bestStart:bestEnd]
}

func hasMissingScalePitchBetween(a, b int, scalePitchClasses map[int]struct{}) bool {
	for pitch := a + 1; pitch < b; pitch++ {
		if _, ok := scalePitchClasses[pitch%12]; ok {
			return true
		}
	}
	return false
}

func RangeCompletenessReport(set ScaleLayoutSet, definitions DefinitionSet) []string {
	scaleByID := map[int]Definition{}
	for _, scale := range definitions.Scales {
		scaleByID[scale.ID] = scale
	}

	var issues []string
	for _, tuning := range set.Tunings {
		octaves, err := standardOctavesForTuning(tuning)
		if err != nil {
			continue
		}

		for _, scale := range tuning.Scales {
			definition, ok := scaleByID[scale.ID]
			if !ok {
				continue
			}
			for positionName, position := range scale.Positions {
				if issue := rangeCompletenessIssue(tuning, octaves, definition, scale.Name, positionName, position); issue != "" {
					issues = append(issues, issue)
				}
			}
		}
	}

	sort.Strings(issues)
	return issues
}

func ShapeCorrectnessReport(set ScaleLayoutSet, definitions DefinitionSet) []string {
	scaleByID := map[int]Definition{}
	for _, scale := range definitions.Scales {
		scaleByID[scale.ID] = scale
	}

	var issues []string
	for _, tuning := range set.Tunings {
		octaves, err := standardOctavesForTuning(tuning)
		if err != nil {
			continue
		}

		for _, scale := range tuning.Scales {
			definition, ok := scaleByID[scale.ID]
			if !ok {
				continue
			}
			for positionName, position := range scale.Positions {
				issues = append(issues, shapeRootIssues(tuning, octaves, definition, scale.Name, positionName, position)...)
				if scale.Name == "Major" {
					if issue := lockedMajorShapeIssue(tuning, scale.Name, positionName, position); issue != "" {
						issues = append(issues, issue)
					}
				}
			}
		}
	}

	sort.Strings(issues)
	return issues
}

func shapeRootIssues(
	tuning ScaleLayoutTuning,
	octaves []int,
	scale Definition,
	scaleName string,
	positionName string,
	position ScaleLayoutPosition,
) []string {
	requiredStringsByPosition := map[string][]int{
		"C": {1, 4},
		"A": {2, 4},
		"G": {0, 2, 5},
		"E": {0, 2, 5},
		"D": {1, 3},
	}
	requiredStrings, ok := requiredStringsByPosition[positionName]
	if !ok {
		return nil
	}

	noteIndex := noteIndexMap()
	rootPitchClass := 0
	if len(scale.Intervals) > 0 {
		rootPitchClass = ((scale.Intervals[0] % 12) + 12) % 12
	}

	var issues []string
	for _, stringIndex := range requiredStrings {
		if stringIndex < 0 || stringIndex >= len(tuning.Strings) {
			continue
		}
		openIndex, ok := noteIndex[tuning.Strings[stringIndex]]
		if !ok {
			continue
		}
		basePitch := (octaves[stringIndex] * 12) + openIndex
		hasRoot := false
		for _, fret := range positionFretsForString(position, stringIndex) {
			if (basePitch+fret)%12 == rootPitchClass {
				hasRoot = true
				break
			}
		}
		if !hasRoot {
			issues = append(issues, fmt.Sprintf(
				"layout %s/%s/%s may miss expected root on string %d",
				tuning.Name,
				scaleName,
				positionName,
				stringIndex+1,
			))
		}
	}
	return issues
}

func lockedMajorShapeIssue(tuning ScaleLayoutTuning, scaleName string, positionName string, position ScaleLayoutPosition) string {
	expectedRanges := map[string]ScaleLayoutPosition{
		"C": {Mode: "range", Start: 0, Span: 4},
		"A": {Mode: "range", Start: 2, Span: 5},
		"G": {Mode: "range", Start: 4, Span: 5},
		"E": {Mode: "range", Start: 7, Span: 4},
	}
	if expected, ok := expectedRanges[positionName]; ok {
		if position.Mode != expected.Mode || position.Start != expected.Start || position.Span != expected.Span {
			return fmt.Sprintf(
				"layout %s/%s/%s differs from locked major range: expected %d-%d",
				tuning.Name,
				scaleName,
				positionName,
				expected.Start,
				expected.Start+expected.Span-1,
			)
		}
		return ""
	}

	if positionName != "D" {
		return ""
	}
	if position.Mode != "split" || len(position.SplitRanges) != 2 {
		return fmt.Sprintf("layout %s/%s/%s differs from locked major split", tuning.Name, scaleName, positionName)
	}
	first := position.SplitRanges[0]
	second := position.SplitRanges[1]
	if first.Start != 8 || first.Span != 5 || !equalIntSlices(first.Strings, []int{0, 1, 2, 3}) {
		return fmt.Sprintf("layout %s/%s/%s differs from locked major split", tuning.Name, scaleName, positionName)
	}
	if second.Start != 10 || second.Span != 4 || !equalIntSlices(second.Strings, []int{4, 5}) {
		return fmt.Sprintf("layout %s/%s/%s differs from locked major split", tuning.Name, scaleName, positionName)
	}
	return ""
}

func equalIntSlices(a, b []int) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func rangeCompletenessIssue(
	tuning ScaleLayoutTuning,
	octaves []int,
	scale Definition,
	scaleName string,
	positionName string,
	position ScaleLayoutPosition,
) string {
	currentCount := generatedPitchCount(tuning, scale, position)
	bestPosition, bestCount, ok := bestNearbyPosition(tuning, octaves, scale, position)
	if !ok || bestCount <= currentCount {
		return ""
	}

	lockedSuffix := ""
	if position.Validated {
		lockedSuffix = " [validated_manual]"
	}

	return fmt.Sprintf(
		"layout %s/%s/%s may be range-incomplete: current captures %d pitches, nearby %s captures %d%s",
		tuning.Name,
		scaleName,
		positionName,
		currentCount,
		positionSummary(bestPosition),
		bestCount,
		lockedSuffix,
	)
}

func generatedPitchCount(tuning ScaleLayoutTuning, definition Definition, position ScaleLayoutPosition) int {
	generated := generateScaleLayoutPosition(tuning, definition, position)
	noteIndex := noteIndexMap()
	octaves, err := standardOctavesForTuning(tuning)
	if err != nil {
		return 0
	}

	pitchCounts := map[int]struct{}{}
	for stringIndex, openNote := range tuning.Strings {
		baseIndex, ok := noteIndex[openNote]
		if !ok {
			continue
		}
		basePitch := (octaves[stringIndex] * 12) + baseIndex
		for _, fret := range positionFretsForString(generated, stringIndex) {
			pitchCounts[basePitch+fret] = struct{}{}
		}
	}
	return len(pitchCounts)
}

func bestNearbyPosition(tuning ScaleLayoutTuning, octaves []int, definition Definition, position ScaleLayoutPosition) (ScaleLayoutPosition, int, bool) {
	_ = octaves
	currentCount := generatedPitchCount(tuning, definition, position)
	bestPosition := position
	bestCount := currentCount
	found := false

	if position.Mode == "range" {
		for start := 0; start <= 15; start++ {
			candidate := position
			candidate.Start = start
			candidate.PerStringFrets = nil
			count := generatedPitchCount(tuning, definition, candidate)
			if count > bestCount || (!found && count == bestCount && start == position.Start) {
				bestPosition = candidate
				bestCount = count
				found = true
			}
		}
		return bestPosition, bestCount, found
	}

	if position.Mode == "split" && len(position.SplitRanges) > 0 {
		minStart := position.SplitRanges[0].Start
		for _, splitRange := range position.SplitRanges[1:] {
			if splitRange.Start < minStart {
				minStart = splitRange.Start
			}
		}
		for shiftedMin := 0; shiftedMin <= 15; shiftedMin++ {
			delta := shiftedMin - minStart
			candidate := position
			candidate.PerStringFrets = nil
			candidate.SplitRanges = cloneSplitRanges(position.SplitRanges)
			for i := range candidate.SplitRanges {
				candidate.SplitRanges[i].Start += delta
			}
			count := generatedPitchCount(tuning, definition, candidate)
			if count > bestCount || (!found && count == bestCount && delta == 0) {
				bestPosition = candidate
				bestCount = count
				found = true
			}
		}
	}

	return bestPosition, bestCount, found
}

func positionSummary(position ScaleLayoutPosition) string {
	if position.Mode == "range" {
		return fmt.Sprintf("range %d-%d", position.Start, position.Start+position.Span-1)
	}
	if position.Mode == "split" {
		parts := make([]string, 0, len(position.SplitRanges))
		for _, splitRange := range position.SplitRanges {
			parts = append(parts, fmt.Sprintf("strings %v %d-%d", splitRange.Strings, splitRange.Start, splitRange.Start+splitRange.Span-1))
		}
		return "split " + strings.Join(parts, "; ")
	}
	return position.Mode
}

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

			for positionName, position := range scale.Positions {
				positionIssues := validateScaleLayoutPosition(tuning, octaves, definition, scale.Name, positionName, position)
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

func validateScaleLayoutPosition(
	tuning ScaleLayoutTuning,
	octaves []int,
	scale Definition,
	scaleName string,
	positionName string,
	position ScaleLayoutPosition,
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

func positionRangeForString(position ScaleLayoutPosition, stringIndex int) (int, int) {
	if position.Mode == "split" {
		for _, splitRange := range position.SplitRanges {
			for _, idx := range splitRange.Strings {
				if idx == stringIndex {
					return splitRange.Start, splitRange.Start + splitRange.Span - 1
				}
			}
		}
		if entry, ok := position.PerString[fmt.Sprintf("%d", stringIndex)]; ok {
			return entry.Start, entry.Start + entry.Span - 1
		}
	}
	return position.Start, position.Start + position.Span - 1
}

func positionFretsForString(position ScaleLayoutPosition, stringIndex int) []int {
	if len(position.PerStringFrets) > 0 {
		if frets, ok := position.PerStringFrets[fmt.Sprintf("%d", stringIndex)]; ok {
			return frets
		}
		return nil
	}
	start, end := positionRangeForString(position, stringIndex)
	frets := make([]int, 0, end-start+1)
	for fret := start; fret <= end; fret++ {
		frets = append(frets, fret)
	}
	return frets
}

func standardOctavesForTuning(tuning ScaleLayoutTuning) ([]int, error) {
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
