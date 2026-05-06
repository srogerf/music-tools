const MAJOR_KEY_SIGNATURES = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  "F#": 6,
  "C#": 7,
  F: -1,
  Bb: -2,
  Eb: -3,
  Ab: -4,
  Db: -5,
  Gb: -6,
  Cb: -7,
};

const MODE_PARENT_MAJOR_OFFSETS = {
  Major: 0,
  Ionian: 0,
  Dorian: 2,
  Phrygian: 4,
  Lydian: 5,
  Mixolydian: 7,
  "Natural Minor": 9,
  Aeolian: 9,
  Locrian: 11,
};

const KEY_TO_INDEX = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const INDEX_TO_MAJOR_KEY = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SHARP_SIGNATURE_NOTES = ["F#", "C#", "G#", "D#", "A#", "E#", "B#"];
const FLAT_SIGNATURE_NOTES = ["Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"];
const LETTER_ORDER = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

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

function usesMinorSignature(scale) {
  const name = normalizeText(scale?.name);
  const commonName = normalizeText(scale?.common_name);
  return name.includes("minor") || commonName.includes("minor") || commonName.includes("aeolian");
}

function modalParentMajorKey(key, scale) {
  const rootIndex = KEY_TO_INDEX[key];
  const offset = MODE_PARENT_MAJOR_OFFSETS[scale?.name] ?? MODE_PARENT_MAJOR_OFFSETS[scale?.common_name];
  if (rootIndex === undefined || offset === undefined) {
    return key;
  }
  return INDEX_TO_MAJOR_KEY[(rootIndex - offset + 12) % 12];
}

function relativeMajorKey(key) {
  const rootIndex = KEY_TO_INDEX[key];
  if (rootIndex === undefined) {
    return key;
  }
  return INDEX_TO_MAJOR_KEY[(rootIndex + 3) % 12];
}

function majorSignatureKeyForScale(key, scale) {
  if (usesMinorSignature(scale)) {
    return relativeMajorKey(key);
  }
  return modalParentMajorKey(key, scale);
}

function signedAccidentalsForScale(key, scale) {
  if (!scale) {
    return 0;
  }
  const signatureKey = majorSignatureKeyForScale(key, scale);
  return MAJOR_KEY_SIGNATURES[signatureKey] ?? 0;
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

function keySignatureNoteSet(signedAccidentals) {
  const notesByLetter = { C: "C", D: "D", E: "E", F: "F", G: "G", A: "A", B: "B" };
  signatureNotesForAccidentals(signedAccidentals).forEach((note) => {
    notesByLetter[note[0]] = note;
  });
  return new Set(Object.values(notesByLetter).map(normalizeNoteName));
}

function notesOutsideKeySignature(scaleNotes, signedAccidentals) {
  const signatureNoteSet = keySignatureNoteSet(signedAccidentals);
  return scaleNotes.filter((note) => !signatureNoteSet.has(normalizeNoteName(note)));
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
  keySignatureNoteSet,
  majorSignatureKeyForScale,
  noteSelectionMatches,
  notesOutsideKeySignature,
  normalizeNoteName,
  normalizeText,
  signatureNotesForAccidentals,
  signatureSelectionMatches,
  signedAccidentalsForScale,
};
