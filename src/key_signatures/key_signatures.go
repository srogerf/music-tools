package key_signatures

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"time"

	"music-tools/src/util"
)

type KeySignature struct {
	Key         string `json:"key"`
	Accidentals int    `json:"accidentals"`
}

type KeySignatureSet struct {
	Major []KeySignature `json:"major"`
	Minor []KeySignature `json:"minor"`
}

type KeySignatureSelection struct {
	Key               string
	Mode              string
	SignedAccidentals int
}

func LoadKeySignatures(path string) (KeySignatureSet, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return KeySignatureSet{}, fmt.Errorf("read key signatures: %w", err)
	}

	var set KeySignatureSet
	if err := json.Unmarshal(data, &set); err != nil {
		return KeySignatureSet{}, fmt.Errorf("parse key signatures: %w", err)
	}

	return set, nil
}

func (set KeySignatureSet) RandomKeySignature(maxAccidentals int, rng *rand.Rand) (KeySignatureSelection, error) {
	if rng == nil {
		rng = rand.New(rand.NewSource(time.Now().UnixNano()))
	}

	type candidate struct {
		key         string
		mode        string
		accidentals int
	}

	candidates := make([]candidate, 0, len(set.Major)+len(set.Minor))
	for _, key := range set.Major {
		if util.Abs(key.Accidentals) <= maxAccidentals {
			candidates = append(candidates, candidate{key: key.Key, mode: "major", accidentals: key.Accidentals})
		}
	}
	for _, key := range set.Minor {
		if util.Abs(key.Accidentals) <= maxAccidentals {
			candidates = append(candidates, candidate{key: key.Key, mode: "minor", accidentals: key.Accidentals})
		}
	}

	if len(candidates) == 0 {
		return KeySignatureSelection{}, fmt.Errorf("no scales available with the given accidental limit")
	}

	choice := candidates[rng.Intn(len(candidates))]
	return KeySignatureSelection{
		Key:               choice.key,
		Mode:              choice.mode,
		SignedAccidentals: choice.accidentals,
	}, nil
}
