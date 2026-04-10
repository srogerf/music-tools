package scales

import "testing"

func TestScaleLayoutsValidate(t *testing.T) {
	defs, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadDefinitions: %v", err)
	}
	if _, err := LoadScaleLayouts("../../data/scales/SCALE_LAYOUTS.json", defs); err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}
}
