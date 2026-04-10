package scales

import "testing"

func TestLayoutInstancesValidate(t *testing.T) {
	defs, err := LoadDefinitions("../../data/scales/DEFINITIONS.json")
	if err != nil {
		t.Fatalf("LoadDefinitions: %v", err)
	}
	if _, err := LoadLayoutInstances("../../data/scales/LAYOUT_INSTANCES.json", defs); err != nil {
		t.Fatalf("LoadLayoutInstances: %v", err)
	}
}
