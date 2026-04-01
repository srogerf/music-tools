package main

import (
	"flag"
	"fmt"
	"math/rand"
	"os"
	"time"

	"scales"
)

func main() {
	definitionsPath := flag.String("definitions", "../../data/scales/DEFINITIONS.json", "path to scale definitions JSON")
	list := flag.Bool("list", false, "list all available scales")
	name := flag.String("name", "", "lookup a scale by name or common name")
	flag.Parse()

	set, err := scales.LoadDefinitions(*definitionsPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	switch {
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
