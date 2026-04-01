package main

import (
	"errors"
	"flag"
	"fmt"
	"math/rand"
	"os"
	"time"
)

type Scale struct {
	Key               string
	Mode              string
	SignedAccidentals int // sharps positive, flats negative
}

func main() {
	maxAccidentals := flag.Int("max-accidentals", 5, "maximum number of sharps or flats allowed (0-7)")
	flag.Parse()

	if *maxAccidentals < 0 || *maxAccidentals > 7 {
		fmt.Fprintln(os.Stderr, "max-accidentals must be between 0 and 7")
		os.Exit(2)
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	scale, err := pickScale(*maxAccidentals, rng)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	fmt.Printf("%s %s (%s)\n", scale.Key, scale.Mode, accidentalLabel(scale.SignedAccidentals))
}

func pickScale(maxAccidentals int, rng *rand.Rand) (Scale, error) {
	var candidates []Scale
	for _, scale := range allScales() {
		if abs(scale.SignedAccidentals) <= maxAccidentals {
			candidates = append(candidates, scale)
		}
	}

	if len(candidates) == 0 {
		return Scale{}, errors.New("no scales available with the given accidental limit")
	}

	return candidates[rng.Intn(len(candidates))], nil
}

func accidentalLabel(signed int) string {
	count := abs(signed)
	if count == 0 {
		return "0 accidentals"
	}

	noun := "sharps"
	if signed < 0 {
		noun = "flats"
	}
	if count == 1 {
		noun = noun[:len(noun)-1]
	}

	return fmt.Sprintf("%d %s", count, noun)
}

func abs(value int) int {
	if value < 0 {
		return -value
	}
	return value
}

func allScales() []Scale {
	return []Scale{
		// Major keys
		{Key: "C", Mode: "major", SignedAccidentals: 0},
		{Key: "G", Mode: "major", SignedAccidentals: 1},
		{Key: "D", Mode: "major", SignedAccidentals: 2},
		{Key: "A", Mode: "major", SignedAccidentals: 3},
		{Key: "E", Mode: "major", SignedAccidentals: 4},
		{Key: "B", Mode: "major", SignedAccidentals: 5},
		{Key: "F#", Mode: "major", SignedAccidentals: 6},
		{Key: "C#", Mode: "major", SignedAccidentals: 7},
		{Key: "F", Mode: "major", SignedAccidentals: -1},
		{Key: "Bb", Mode: "major", SignedAccidentals: -2},
		{Key: "Eb", Mode: "major", SignedAccidentals: -3},
		{Key: "Ab", Mode: "major", SignedAccidentals: -4},
		{Key: "Db", Mode: "major", SignedAccidentals: -5},
		{Key: "Gb", Mode: "major", SignedAccidentals: -6},
		{Key: "Cb", Mode: "major", SignedAccidentals: -7},
		// Minor keys
		{Key: "A", Mode: "minor", SignedAccidentals: 0},
		{Key: "E", Mode: "minor", SignedAccidentals: 1},
		{Key: "B", Mode: "minor", SignedAccidentals: 2},
		{Key: "F#", Mode: "minor", SignedAccidentals: 3},
		{Key: "C#", Mode: "minor", SignedAccidentals: 4},
		{Key: "G#", Mode: "minor", SignedAccidentals: 5},
		{Key: "D#", Mode: "minor", SignedAccidentals: 6},
		{Key: "A#", Mode: "minor", SignedAccidentals: 7},
		{Key: "D", Mode: "minor", SignedAccidentals: -1},
		{Key: "G", Mode: "minor", SignedAccidentals: -2},
		{Key: "C", Mode: "minor", SignedAccidentals: -3},
		{Key: "F", Mode: "minor", SignedAccidentals: -4},
		{Key: "Bb", Mode: "minor", SignedAccidentals: -5},
		{Key: "Eb", Mode: "minor", SignedAccidentals: -6},
		{Key: "Ab", Mode: "minor", SignedAccidentals: -7},
	}
}
