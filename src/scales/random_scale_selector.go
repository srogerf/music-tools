package scales

import (
	"fmt"
	"math/rand"
	"strings"
	"time"
)

type RandomScaleSelectorOptions struct {
	// ScaleNames limits the choice to specific scale names/common names.
	// When empty, defaults to Major and Natural Minor.
	ScaleNames []string
	// MaxAccidentals limits the key signature to this many sharps or flats.
	// When zero or negative, defaults to 5.
	MaxAccidentals int
	// Rand provides the randomness source. When nil, a time-seeded RNG is used.
	Rand *rand.Rand
}

type RandomScaleSelection struct {
	Key         string
	Scale       Definition
	Accidentals int
}

func (set DefinitionSet) RandomScaleSelector(options *RandomScaleSelectorOptions) (RandomScaleSelection, error) {
	scaleNames := []string{"Major", "Natural Minor"}
	maxAccidentals := 5
	var rng *rand.Rand

	if options != nil {
		if len(options.ScaleNames) > 0 {
			scaleNames = options.ScaleNames
		}
		if options.MaxAccidentals > 0 {
			maxAccidentals = options.MaxAccidentals
		}
		if options.Rand != nil {
			rng = options.Rand
		}
	}

	if rng == nil {
		rng = rand.New(rand.NewSource(time.Now().UnixNano()))
	}

	scales := make([]Definition, 0, len(scaleNames))
	for _, name := range scaleNames {
		scale, ok := set.ByName(name)
		if !ok {
			return RandomScaleSelection{}, fmt.Errorf("unknown scale: %s", name)
		}
		scales = append(scales, scale)
	}

	if len(scales) == 0 {
		return RandomScaleSelection{}, fmt.Errorf("no scales available for selection")
	}

	scale := scales[rng.Intn(len(scales))]

	keys := keysForScale(scale, maxAccidentals)
	if len(keys) == 0 {
		return RandomScaleSelection{}, fmt.Errorf("no keys available with %d or fewer accidentals", maxAccidentals)
	}

	choice := keys[rng.Intn(len(keys))]
	return RandomScaleSelection{
		Key:         choice.key,
		Scale:       scale,
		Accidentals: choice.accidentals,
	}, nil
}

type keyAccidental struct {
	key         string
	accidentals int
}

var majorKeyAccidentals = []keyAccidental{
	{"C", 0}, {"G", 1}, {"D", 2}, {"A", 3}, {"E", 4}, {"B", 5}, {"F#", 6}, {"C#", 7},
	{"F", 1}, {"Bb", 2}, {"Eb", 3}, {"Ab", 4}, {"Db", 5}, {"Gb", 6}, {"Cb", 7},
}

var minorKeyAccidentals = []keyAccidental{
	{"A", 0}, {"E", 1}, {"B", 2}, {"F#", 3}, {"C#", 4}, {"G#", 5}, {"D#", 6}, {"A#", 7},
	{"D", 1}, {"G", 2}, {"C", 3}, {"F", 4}, {"Bb", 5}, {"Eb", 6}, {"Ab", 7},
}

func keysForScale(scale Definition, maxAccidentals int) []keyAccidental {
	source := majorKeyAccidentals
	if usesMinorSignature(scale) {
		source = minorKeyAccidentals
	}

	keys := make([]keyAccidental, 0, len(source))
	for _, key := range source {
		if key.accidentals <= maxAccidentals {
			keys = append(keys, key)
		}
	}
	return keys
}

func usesMinorSignature(scale Definition) bool {
	name := strings.ToLower(scale.Name)
	common := strings.ToLower(scale.CommonName)

	if strings.Contains(name, "minor") || strings.Contains(common, "minor") {
		return true
	}
	if strings.Contains(common, "aeolian") {
		return true
	}
	return false
}
