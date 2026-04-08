package main

import (
	"flag"
	"fmt"
	"math/rand"
	"os"
	"strings"
	"time"

	"music-tools/src/key_signatures"
)

func main() {
	maxAccidentals := flag.Int("max-accidentals", 5, "maximum number of sharps or flats allowed (0-7)")
	keySignaturesPath := flag.String("key-signatures", "", "path to key signatures JSON")
	flag.Parse()

	if *maxAccidentals < 0 || *maxAccidentals > 7 {
		fmt.Fprintln(os.Stderr, "max-accidentals must be between 0 and 7")
		os.Exit(2)
	}

	keyPath := resolvePath(*keySignaturesPath, "data/scales/KEY_SIGNATURES.json", "../../data/scales/KEY_SIGNATURES.json")
	keySignatures, err := key_signatures.LoadKeySignatures(keyPath)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	scale, err := keySignatures.RandomKeySignature(*maxAccidentals, rng)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	fmt.Printf("%s %s (%s)\n", scale.Key, scale.Mode, accidentalLabel(scale.SignedAccidentals))
}

func accidentalLabel(signed int) string {
	count := scalesAbs(signed)
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

func scalesAbs(value int) int {
	if value < 0 {
		return -value
	}
	return value
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
