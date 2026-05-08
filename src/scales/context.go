package scales

import (
	"fmt"
	"strings"
)

type SignatureContext struct {
	Key               string   `json:"key"`
	SignedAccidentals int      `json:"signed_accidentals"`
	Notes             []string `json:"notes"`
	Label             string   `json:"label"`
}

type ParentContext struct {
	Family          string `json:"family"`
	ModeNumber      int    `json:"mode_number"`
	ModeLabel       string `json:"mode_label"`
	ParentRoot      string `json:"parent_root"`
	ParentScaleName string `json:"parent_scale_name"`
}

type Context struct {
	ScaleID                  int              `json:"scale_id"`
	ScaleName                string           `json:"scale_name"`
	Key                      string           `json:"key"`
	Notes                    []string         `json:"notes"`
	Signature                SignatureContext `json:"signature"`
	Parent                   ParentContext    `json:"parent"`
	OutsideKeySignatureNotes []string         `json:"outside_key_signature_notes"`
}

var majorKeySignatureAccidentals = map[string]int{
	"C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7,
	"F": -1, "Bb": -2, "Eb": -3, "Ab": -4, "Db": -5, "Gb": -6, "Cb": -7,
}

var signatureSharpNotes = []string{"F#", "C#", "G#", "D#", "A#", "E#", "B#"}
var signatureFlatNotes = []string{"Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"}

func (set DefinitionSet) ContextForScale(id int, key string) (Context, error) {
	scale, ok := set.ByID(id)
	if !ok {
		return Context{}, fmt.Errorf("scale not found")
	}
	notes, err := set.NotesFor(key, scale.Name)
	if err != nil {
		return Context{}, err
	}

	parent := buildParentContext(set, scale, key)
	signature := buildSignatureContext(scale, key, parent)

	return Context{
		ScaleID:                  scale.ID,
		ScaleName:                scale.Name,
		Key:                      key,
		Notes:                    notes,
		Signature:                signature,
		Parent:                   parent,
		OutsideKeySignatureNotes: notesOutsideKeySignature(notes, signature.SignedAccidentals),
	}, nil
}

func buildParentContext(set DefinitionSet, scale Definition, key string) ParentContext {
	parent := ParentContext{
		Family:     scale.ParentFamily,
		ModeNumber: scale.ParentModeNumber,
		ModeLabel:  scale.ParentModeLabel,
	}
	if strings.TrimSpace(scale.ParentFamily) == "" || scale.ParentModeNumber < 1 {
		return parent
	}

	parentScale, ok := set.ByName(scale.ParentFamily)
	if !ok {
		return parent
	}
	parent.ParentScaleName = parentScale.Name

	modeIndex := scale.ParentModeNumber - 1
	if modeIndex < 0 || modeIndex >= len(parentScale.Intervals) {
		return parent
	}

	parentRoot, ok := transposePitchClass(key, -parentScale.Intervals[modeIndex].Semitones, shouldUseFlats(key))
	if ok {
		parent.ParentRoot = parentRoot
	}
	return parent
}

func buildSignatureContext(scale Definition, key string, parent ParentContext) SignatureContext {
	signatureKey := majorSignatureKeyForScale(scale, key, parent)
	signedAccidentals := majorKeySignatureAccidentals[signatureKey]
	return SignatureContext{
		Key:               signatureKey,
		SignedAccidentals: signedAccidentals,
		Notes:             signatureNotesForAccidentals(signedAccidentals),
		Label:             accidentalLabel(signedAccidentals),
	}
}

func majorSignatureKeyForScale(scale Definition, key string, parent ParentContext) string {
	parentFamily := strings.TrimSpace(parent.Family)
	switch parentFamily {
	case "Major":
		if parent.ParentRoot != "" {
			return parent.ParentRoot
		}
	case "Harmonic Minor", "Melodic Minor":
		if parent.ParentRoot != "" {
			return relativeMajorKey(parent.ParentRoot)
		}
	}

	if usesMinorSignatureContext(scale) {
		return relativeMajorKey(key)
	}

	return key
}

func usesMinorSignatureContext(scale Definition) bool {
	name := strings.ToLower(scale.Name)
	commonName := strings.ToLower(scale.CommonName)
	return strings.Contains(name, "minor") || strings.Contains(commonName, "minor") || strings.Contains(commonName, "aeolian")
}

func relativeMajorKey(key string) string {
	relative, ok := transposePitchClass(key, 3, true)
	if !ok {
		return key
	}
	return relative
}

func transposePitchClass(key string, semitoneOffset int, preferFlats bool) (string, bool) {
	normalized := normalizeKey(key)
	sharpIndex := map[string]int{
		"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6,
		"G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11,
	}
	flatIndex := map[string]int{
		"C": 0, "Db": 1, "D": 2, "Eb": 3, "E": 4, "F": 5, "Gb": 6,
		"G": 7, "Ab": 8, "A": 9, "Bb": 10, "B": 11, "Cb": 11,
	}
	sharpNames := []string{"C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"}
	flatNames := []string{"C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"}

	index, ok := sharpIndex[normalized]
	if !ok {
		index, ok = flatIndex[normalized]
	}
	if !ok {
		return "", false
	}

	nextIndex := (index + semitoneOffset) % 12
	if nextIndex < 0 {
		nextIndex += 12
	}
	if preferFlats {
		return flatNames[nextIndex], true
	}
	return sharpNames[nextIndex], true
}

func signatureNotesForAccidentals(signedAccidentals int) []string {
	count := signedAccidentals
	if count < 0 {
		count = -count
	}
	if signedAccidentals > 0 {
		return append([]string{}, signatureSharpNotes[:count]...)
	}
	if signedAccidentals < 0 {
		return append([]string{}, signatureFlatNotes[:count]...)
	}
	return []string{}
}

func accidentalLabel(signedAccidentals int) string {
	count := signedAccidentals
	if count < 0 {
		count = -count
	}
	if count == 0 {
		return "No sharps or flats"
	}
	accidental := "sharp"
	if signedAccidentals < 0 {
		accidental = "flat"
	}
	return fmt.Sprintf("%d %s%s: %s", count, accidental, pluralSuffix(count), strings.Join(signatureNotesForAccidentals(signedAccidentals), ", "))
}

func pluralSuffix(count int) string {
	if count == 1 {
		return ""
	}
	return "s"
}

func notesOutsideKeySignature(scaleNotes []string, signedAccidentals int) []string {
	signatureNoteSet := keySignatureNoteSet(signedAccidentals)
	outside := make([]string, 0)
	for _, note := range scaleNotes {
		normalized := normalizeKeySignatureNote(note)
		if _, ok := signatureNoteSet[normalized]; ok {
			continue
		}
		outside = append(outside, note)
	}
	return outside
}

func keySignatureNoteSet(signedAccidentals int) map[string]struct{} {
	notesByLetter := map[string]string{
		"A": "A",
		"B": "B",
		"C": "C",
		"D": "D",
		"E": "E",
		"F": "F",
		"G": "G",
	}
	for _, note := range signatureNotesForAccidentals(signedAccidentals) {
		notesByLetter[note[:1]] = normalizeKeySignatureNote(note)
	}
	set := map[string]struct{}{}
	for _, note := range notesByLetter {
		set[note] = struct{}{}
	}
	return set
}

func normalizeKeySignatureNote(note string) string {
	return normalizeKey(strings.ReplaceAll(strings.ReplaceAll(note, "♯", "#"), "♭", "b"))
}
