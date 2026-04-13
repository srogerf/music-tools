package scales

import (
	"strings"
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

func TestScaleLayoutsRangeCompletenessReport(t *testing.T) {
	defs, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadDefinitions: %v", err)
	}
	tunings, err := tuning.LoadDefinitions("../../data/tunings/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadTuningDefinitions: %v", err)
	}
	layouts, err := LoadScaleLayouts("../../data/scales/layouts", defs, tunings)
	if err != nil {
		t.Fatalf("LoadScaleLayouts: %v", err)
	}

	issues := RangeCompletenessReport(layouts, defs)
	if len(issues) == 0 {
		t.Log("range completeness report: no issues found")
		return
	}

	t.Logf("range completeness report (%d issues):\n- %s", len(issues), strings.Join(issues, "\n- "))
}
