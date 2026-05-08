package scales

import "testing"

func TestEnrichDefinitionsAddsCatalogMetadata(t *testing.T) {
	set := DefinitionSet{
		Scales: []Definition{
			{Name: "Major", CatalogGroupCode: "major_minor", CatalogGroupLabel: "Major / Minor", CatalogGroupOrder: 10},
			{Name: "Locrian #6", ParentFamily: "Harmonic Minor", ParentModeNumber: 2},
		},
	}

	EnrichDefinitions(&set)

	if set.Scales[0].CatalogGroupCode != "major_minor" {
		t.Fatalf("Major catalog_group_code = %q, want major_minor", set.Scales[0].CatalogGroupCode)
	}
	if set.Scales[1].ParentModeLabel != "Harmonic Minor Mode 2" {
		t.Fatalf("Locrian #6 parent_mode_label = %q, want Harmonic Minor Mode 2", set.Scales[1].ParentModeLabel)
	}
}

func TestContextForScaleHarmonicMinorMode(t *testing.T) {
	set := DefinitionSet{
		Scales: []Definition{
			{
				ID:        1,
				Name:      "Harmonic Minor",
				Type:      ScaleTypeDiatonic,
				Intervals: []ScaleInterval{{Semitones: 0, Degree: 1}, {Semitones: 2, Degree: 2}, {Semitones: 3, Degree: 3}, {Semitones: 5, Degree: 4}, {Semitones: 7, Degree: 5}, {Semitones: 8, Degree: 6}, {Semitones: 11, Degree: 7}},
			},
			{
				ID:               2,
				Name:             "Locrian #6",
				ParentFamily:     "Harmonic Minor",
				ParentModeNumber: 2,
				Type:             ScaleTypeDiatonic,
				Intervals:        []ScaleInterval{{Semitones: 0, Degree: 1}, {Semitones: 1, Degree: 2}, {Semitones: 3, Degree: 3}, {Semitones: 5, Degree: 4}, {Semitones: 6, Degree: 5}, {Semitones: 9, Degree: 6}, {Semitones: 10, Degree: 7}},
			},
		},
	}
	EnrichDefinitions(&set)

	context, err := set.ContextForScale(2, "A")
	if err != nil {
		t.Fatalf("ContextForScale() error = %v", err)
	}
	if context.Parent.ParentRoot != "G" {
		t.Fatalf("parent_root = %q, want G", context.Parent.ParentRoot)
	}
	if context.Signature.Key != "Bb" {
		t.Fatalf("signature.key = %q, want Bb", context.Signature.Key)
	}
	if context.Signature.SignedAccidentals != -2 {
		t.Fatalf("signature.signed_accidentals = %d, want -2", context.Signature.SignedAccidentals)
	}
}
