const SHARP_SIGNATURE_NOTES = ["F#", "C#", "G#", "D#", "A#", "E#", "B#"];
const FLAT_SIGNATURE_NOTES = ["Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeNoteName(value) {
  return String(value || "")
    .trim()
    .replace(/\u266f/g, "#")
    .replace(/\u266d/g, "b")
    .replace(/^([a-g])/, (_, note) => note.toUpperCase());
}

function signatureNotesForAccidentals(signedAccidentals) {
  const count = Math.abs(signedAccidentals);
  if (signedAccidentals > 0) {
    return SHARP_SIGNATURE_NOTES.slice(0, count);
  }
  if (signedAccidentals < 0) {
    return FLAT_SIGNATURE_NOTES.slice(0, count);
  }
  return [];
}

function accidentalLabel(signedAccidentals) {
  const count = Math.abs(signedAccidentals);
  if (count === 0) {
    return "No sharps or flats";
  }
  const accidental = signedAccidentals > 0 ? "sharp" : "flat";
  const notes = signatureNotesForAccidentals(signedAccidentals);
  return `${count} ${accidental}${count === 1 ? "" : "s"}: ${notes.join(", ")}`;
}

function signatureSelectionMatches(count, accidentalType, signedAccidentals) {
  const guessedCount = Number(count);
  const expectedCount = Math.abs(signedAccidentals);
  if (guessedCount !== expectedCount) {
    return false;
  }
  if (expectedCount === 0) {
    return true;
  }
  return signedAccidentals > 0 ? accidentalType === "sharp" : accidentalType === "flat";
}

function noteSelectionMatches(selectedNotes, expectedNotes) {
  if (selectedNotes.length !== expectedNotes.length) {
    return false;
  }
  const selectedNoteSet = new Set(selectedNotes.map(normalizeNoteName));
  return expectedNotes.every((note) => selectedNoteSet.has(normalizeNoteName(note)));
}

export {
  accidentalLabel,
  noteSelectionMatches,
  normalizeNoteName,
  normalizeText,
  signatureNotesForAccidentals,
  signatureSelectionMatches,
};
