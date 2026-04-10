package scales

import (
	"testing"

	"music-tools/src/tuning"
)

func TestScaleLayoutsValidate(t *testing.T) {
	defs, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadDefinitions: %v", err)
	}
	tunings, err := tuning.LoadDefinitions("../../data/tunings/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadTuningDefinitions: %v", err)
	}
	if _, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings); err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}
}
