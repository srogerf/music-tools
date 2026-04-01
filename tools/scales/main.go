package main

import (
	"flag"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"

	"music-tools/src/scales"
)

func main() {
	definitionsPath := flag.String("definitions", "", "path to scale definitions JSON")
	list := flag.Bool("list", false, "list all available scales")
	name := flag.String("name", "", "lookup a scale by name or common name")
	random := flag.Bool("random", false, "pick a random scale and print the notes")
	maxAccidentals := flag.Int("max-accidentals", 5, "maximum number of accidentals for random selection (0-7)")
	flag.Parse()

	path := *definitionsPath
	if path == "" {
		candidates := []string{
			"data/scales/DEFINITIONS.json",
			"../../data/scales/DEFINITIONS.json",
		}
		for _, candidate := range candidates {
			if _, err := os.Stat(candidate); err == nil {
				path = candidate
				break
			}
		}
		if path == "" {
			path = "data/scales/DEFINITIONS.json"
		}
	}

	set, err := scales.LoadDefinitions(path)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	switch {
	case *random:
		selection, err := set.RandomScaleSelector(&scales.RandomScaleSelectorOptions{
			MaxAccidentals: *maxAccidentals,
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

func printScale(scale scales.Definition) {
	fmt.Printf("%s (%s) - %s\n", scale.Name, scale.CommonName, scale.Type)
	fmt.Printf("intervals: %v\n", scale.Intervals)
}
