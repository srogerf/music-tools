package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"sort"
	"strings"

	"music-tools/src/chords"
	"music-tools/src/scales"
)

type definitionsFile struct {
	Scales []scales.Definition `json:"scales"`
}

type chordQuality struct {
	Name       string
	CommonName string
	Intervals  []int
}

func main() {
	definitionsPath := flag.String("definitions", "data/scales/DEFINITIONS.json", "path to scale definitions JSON")
	key := flag.String("key", "", "scale key (e.g. C, Eb, F#)")
	scaleName := flag.String("scale", "", "scale name or common name (e.g. Major, Natural Minor)")
	flag.Parse()

	if *key == "" || *scaleName == "" {
		fmt.Fprintln(os.Stderr, "both -key and -scale are required")
		os.Exit(2)
	}

	defs, set, err := loadDefinitions(*definitionsPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	scale, ok := set.ByName(*scaleName)
	if !ok {
		fmt.Fprintf(os.Stderr, "unknown scale: %s\n", *scaleName)
		os.Exit(1)
	}
	if scale.Type != scales.ScaleTypeDiatonic || len(scale.Intervals) != 7 {
		fmt.Fprintf(os.Stderr, "scale %s is not a seven-note diatonic scale\n", scale.Name)
		os.Exit(1)
	}

	notes, err := set.NotesFor(*key, scale.Name)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	harmonized, err := chords.HarmonizeDiatonicScale(notes, scale.Intervals)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	qualityIndex := quadadQualityIndex(defs.Scales)
	unknown := map[string][]int{}

	fmt.Printf("Harmonized %s %s:\n", *key, scale.Name)
	for _, chord := range harmonized {
		quality, found := qualityIndex[intervalKey(chord.Intervals)]
		if !found {
			unknown[intervalKey(chord.Intervals)] = chord.Intervals
			fmt.Printf("%d: %s (unknown) intervals=%v notes=%s\n",
				chord.Degree, chord.Root, chord.Intervals, strings.Join(chord.Notes, " "))
			continue
		}

		label := quality.Name
		if quality.CommonName != "" {
			label = fmt.Sprintf("%s (%s)", quality.Name, quality.CommonName)
		}

		fmt.Printf("%d: %s %s intervals=%v notes=%s\n",
			chord.Degree, chord.Root, label, chord.Intervals, strings.Join(chord.Notes, " "))
	}

	if len(unknown) == 0 {
		return
	}

	reader := bufio.NewReader(os.Stdin)
	updated := false

	keys := make([]string, 0, len(unknown))
	for key := range unknown {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	for _, key := range keys {
		intervals := unknown[key]
		if !confirmAddIntervals(reader, intervals) {
			continue
		}

		name := prompt(reader, "Name")
		common := prompt(reader, "Common name")
		if strings.TrimSpace(name) == "" {
			fmt.Fprintln(os.Stderr, "skipping: name is required")
			continue
		}

		defs.Scales = append(defs.Scales, scales.Definition{
			Name:       name,
			CommonName: common,
			Type:       scales.ScaleTypeQuadad,
			Intervals:  intervals,
		})
		updated = true
	}

	if updated {
		if err := writeDefinitions(*definitionsPath, defs); err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		fmt.Printf("Updated %s\n", *definitionsPath)
	}
}

func loadDefinitions(path string) (definitionsFile, scales.DefinitionSet, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return definitionsFile{}, scales.DefinitionSet{}, fmt.Errorf("read definitions: %w", err)
	}

	var defs definitionsFile
	if err := json.Unmarshal(data, &defs); err != nil {
		return definitionsFile{}, scales.DefinitionSet{}, fmt.Errorf("parse definitions: %w", err)
	}

	set := scales.DefinitionSet{Scales: defs.Scales}
	return defs, set, nil
}

func writeDefinitions(path string, defs definitionsFile) error {
	data, err := json.MarshalIndent(defs, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal definitions: %w", err)
	}
	data = append(data, '\n')
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return fmt.Errorf("write definitions: %w", err)
	}
	return nil
}

func quadadQualityIndex(defs []scales.Definition) map[string]chordQuality {
	index := make(map[string]chordQuality)
	for _, def := range defs {
		if def.Type != scales.ScaleTypeQuadad {
			continue
		}
		index[intervalKey(def.Intervals)] = chordQuality{
			Name:       def.Name,
			CommonName: def.CommonName,
			Intervals:  def.Intervals,
		}
	}
	return index
}

func intervalKey(intervals []int) string {
	parts := make([]string, 0, len(intervals))
	for _, value := range intervals {
		parts = append(parts, fmt.Sprintf("%d", value))
	}
	return strings.Join(parts, ",")
}

func confirmAddIntervals(reader *bufio.Reader, intervals []int) bool {
	fmt.Printf("New quadad intervals %v not found. Add to definitions? (y/N): ", intervals)
	response, _ := reader.ReadString('\n')
	response = strings.TrimSpace(strings.ToLower(response))
	return response == "y" || response == "yes"
}

func prompt(reader *bufio.Reader, label string) string {
	fmt.Printf("%s: ", label)
	value, _ := reader.ReadString('\n')
	return strings.TrimSpace(value)
}
