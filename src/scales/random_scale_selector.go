package scales

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"music-tools/src/key_signatures"
	"music-tools/src/util"
)

type RandomScaleSelectorOptions struct {
	// ScaleNames limits the choice to specific scale names/common names.
	// When empty, defaults to Major and Natural Minor.
	ScaleNames []string
	// MaxAccidentals limits the key signature to this many sharps or flats.
	// When zero or negative, defaults to 5.
	MaxAccidentals int
	// KeySignatures provides key signature definitions for selection.
	KeySignatures *key_signatures.KeySignatureSet
	// Rand provides the randomness source. When nil, a time-seeded RNG is used.
	Rand *rand.Rand
}

type RandomScaleSelection struct {
	Key         string
	Scale       Definition
	Accidentals int
}

type RandomScaleSelectionWithNotes struct {
	Key         string
	Scale       Definition
	Accidentals int
	Notes       []string
}

func (set DefinitionSet) RandomScaleSelector(options *RandomScaleSelectorOptions) (RandomScaleSelection, error) {
	scaleNames := []string{"Major", "Natural Minor"}
	maxAccidentals := 5
	var rng *rand.Rand
	var keySignatures *key_signatures.KeySignatureSet

	if options != nil {
		if len(options.ScaleNames) > 0 {
			scaleNames = options.ScaleNames
		}
		if options.MaxAccidentals > 0 {
			maxAccidentals = options.MaxAccidentals
		}
		if options.KeySignatures != nil {
			keySignatures = options.KeySignatures
		}
		if options.Rand != nil {
			rng = options.Rand
		}
	}

	if rng == nil {
		rng = rand.New(rand.NewSource(time.Now().UnixNano()))
	}
	if keySignatures == nil {
		return RandomScaleSelection{}, fmt.Errorf("key signatures are required")
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

	keys := keysForScale(scale, maxAccidentals, keySignatures)
	if len(keys) == 0 {
		return RandomScaleSelection{}, fmt.Errorf("no keys available with %d or fewer accidentals", maxAccidentals)
	}

	choice := keys[rng.Intn(len(keys))]
	return RandomScaleSelection{
		Key:         choice.key,
		Scale:       scale,
		Accidentals: util.Abs(choice.accidentals),
	}, nil
}

// RandomScaleWithNotes returns a random scale selection alongside note names.
func (set DefinitionSet) RandomScaleWithNotes(options *RandomScaleSelectorOptions) (RandomScaleSelectionWithNotes, error) {
	selection, err := set.RandomScaleSelector(options)
	if err != nil {
		return RandomScaleSelectionWithNotes{}, err
	}

	notes, err := set.NotesFor(selection.Key, selection.Scale.Name)
	if err != nil {
		return RandomScaleSelectionWithNotes{}, err
	}

	return RandomScaleSelectionWithNotes{
		Key:         selection.Key,
		Scale:       selection.Scale,
		Accidentals: selection.Accidentals,
		Notes:       notes,
	}, nil
}

type keyAccidental struct {
	key         string
	accidentals int
}

func keysForScale(scale Definition, maxAccidentals int, keySignatures *key_signatures.KeySignatureSet) []keyAccidental {
	source := keySignatures.Major
	if usesMinorSignature(scale) {
		source = keySignatures.Minor
	}

	keys := make([]keyAccidental, 0, len(source))
	for _, key := range source {
		if util.Abs(key.Accidentals) <= maxAccidentals {
			keys = append(keys, keyAccidental{key: key.Key, accidentals: key.Accidentals})
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
