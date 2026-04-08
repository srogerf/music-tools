package main

import (
	"flag"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"

	"music-tools/src/key_signatures"
	"music-tools/src/scales"
)

func main() {
	definitionsPath := flag.String("definitions", "", "path to scale definitions JSON")
	keySignaturesPath := flag.String("key-signatures", "", "path to key signatures JSON")
	list := flag.Bool("list", false, "list all available scales")
	name := flag.String("name", "", "lookup a scale by name or common name")
	random := flag.Bool("random", false, "pick a random scale and print the notes")
	maxAccidentals := flag.Int("max-accidentals", 5, "maximum number of accidentals for random selection (0-7)")
	flag.Parse()

	path := resolvePath(*definitionsPath, "data/scales/DEFINITIONS.json", "../../data/scales/DEFINITIONS.json")
	keyPath := resolvePath(*keySignaturesPath, "data/scales/KEY_SIGNATURES.json", "../../data/scales/KEY_SIGNATURES.json")

	set, err := scales.LoadDefinitions(path)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	keySignatures, err := key_signatures.LoadKeySignatures(keyPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	switch {
	case *random:
		selection, err := set.RandomScaleSelector(&scales.RandomScaleSelectorOptions{
			MaxAccidentals: *maxAccidentals,
			KeySignatures:  &keySignatures,
			Rand:           rand.New(rand.NewSource(time.Now().UnixNano())),
		})
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}

		notes, err := set.NotesFor(selection.Key, selection.Scale.Name)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}

		fmt.Printf("%s %s (%d accidentals)\n", selection.Key, selection.Scale.Name, selection.Accidentals)
		fmt.Printf("notes: %s\n", strings.Join(notes, " "))
	case *name != "":
		scale, ok := set.ByName(*name)
		if !ok {
			fmt.Fprintf(os.Stderr, "scale not found: %s\n", *name)
			os.Exit(1)
		}
		printScale(scale)
	case *list:
		for _, scale := range set.Scales {
			printScale(scale)
		}
	default:
		rng := rand.New(rand.NewSource(time.Now().UnixNano()))
		scale := set.Scales[rng.Intn(len(set.Scales))]
		printScale(scale)
	}
}

func resolvePath(override string, primary string, fallback string) string {
	if strings.TrimSpace(override) != "" {
		return override
	}
	candidates := []string{primary, fallback}
	for _, candidate := range candidates {
		if _, err := os.Stat(candidate); err == nil {
			return candidate
		}
	}
	return primary
}

func printScale(scale scales.Definition) {
	fmt.Printf("%s (%s) - %s\n", scale.Name, scale.CommonName, scale.Type)
	fmt.Printf("intervals: %v\n", scale.Intervals)
}
