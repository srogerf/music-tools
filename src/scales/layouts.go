package scales

import (
	"encoding/json"
	"fmt"
	"os"
)

type LayoutSet struct {
	Layouts []LayoutDefinition `json:"layouts"`
}

type LayoutDefinition struct {
	Type  ScaleType   `json:"type"`
	CAGED CAGEDLayout `json:"caged"`
}

type CAGEDLayout struct {
	Shapes      []string                   `json:"shapes"`
	BaseStarts  map[string]int             `json:"base_starts"`
	MinSpans    map[string]int             `json:"min_spans"`
	RootOffsets map[string][]int           `json:"root_offsets"`
	SplitRanges map[string]CAGEDSplitRange `json:"split_ranges"`
}

type CAGEDSplitRange struct {
	PerString map[string]FretRange `json:"per_string"`
}

type FretRange struct {
	Start int `json:"start"`
	Span  int `json:"span"`
}

func LoadLayouts(path string) (LayoutSet, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return LayoutSet{}, fmt.Errorf("read layouts: %w", err)
	}

	var set LayoutSet
	if err := json.Unmarshal(data, &set); err != nil {
		return LayoutSet{}, fmt.Errorf("parse layouts: %w", err)
	}

	return set, nil
}

func (set LayoutSet) ByType(scaleType ScaleType) (LayoutDefinition, bool) {
	for _, layout := range set.Layouts {
		if layout.Type == scaleType {
			return layout, true
		}
	}
	return LayoutDefinition{}, false
}
