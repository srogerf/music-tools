package tuning

import (
	"encoding/json"
	"fmt"
	"os"
)

const (
	minStrings = 1
	maxStrings = 9
)

type Definition struct {
	ID          int      `json:"id"`
	Name        string   `json:"name"`
	StringCount int      `json:"string_count"`
	Strings     []string `json:"strings"`
}

type DefinitionSet struct {
	Tunings []Definition `json:"tunings"`
}

func LoadDefinitions(path string) (DefinitionSet, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return DefinitionSet{}, fmt.Errorf("read tunings: %w", err)
	}

	var set DefinitionSet
	if err := json.Unmarshal(data, &set); err != nil {
		return DefinitionSet{}, fmt.Errorf("parse tunings: %w", err)
	}

	if err := validateSet(set); err != nil {
		return DefinitionSet{}, err
	}

	return set, nil
}

func (set DefinitionSet) ByID(id int) (Definition, bool) {
	for _, tuning := range set.Tunings {
		if tuning.ID == id {
			return tuning, true
		}
	}
	return Definition{}, false
}

func (set DefinitionSet) ByName(name string) (Definition, bool) {
	for _, tuning := range set.Tunings {
		if tuning.Name == name {
			return tuning, true
		}
	}
	return Definition{}, false
}

func validateSet(set DefinitionSet) error {
	seen := map[int]struct{}{}
	for _, tuning := range set.Tunings {
		if tuning.ID <= 0 {
			return fmt.Errorf("tuning id must be positive")
		}
		if _, ok := seen[tuning.ID]; ok {
			return fmt.Errorf("duplicate tuning id: %d", tuning.ID)
		}
		seen[tuning.ID] = struct{}{}

		if tuning.Name == "" {
			return fmt.Errorf("tuning name is required")
		}
		if tuning.StringCount < minStrings || tuning.StringCount > maxStrings {
			return fmt.Errorf("tuning %s string_count must be between %d and %d", tuning.Name, minStrings, maxStrings)
		}
		if len(tuning.Strings) != tuning.StringCount {
			return fmt.Errorf("tuning %s must have %d strings", tuning.Name, tuning.StringCount)
		}
	}

	return nil
}
