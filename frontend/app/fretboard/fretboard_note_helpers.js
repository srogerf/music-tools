const SHARP_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_SCALE = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SHARP_INDEX = Object.fromEntries(SHARP_SCALE.map((note, i) => [note, i]));
const FLAT_INDEX = Object.fromEntries(FLAT_SCALE.map((note, i) => [note, i]));
const NOTE_INDEX = { ...SHARP_INDEX, ...FLAT_INDEX };
const LETTER_ORDER = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function shouldUseFlats(key) {
  if (key.includes("b")) return true;
  if (key.includes("#")) return false;
  return ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"].includes(key);
}

function normalizeKey(key) {
  if (!key) return "";
  const trimmed = key.trim();
  if (!trimmed) return "";
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function accidentalForOffset(offset) {
  if (offset === -2) return "bb";
  if (offset === -1) return "b";
  if (offset === 0) return "";
  if (offset === 1) return "#";
  if (offset === 2) return "##";
  return null;
}

function noteNameToPitchClass(noteName) {
  if (!noteName) {
    return undefined;
  }
  const match = noteName.match(/^([A-G])(bb|##|b|#)?$/);
  if (!match) {
    return NOTE_INDEX[noteName];
  }
  const [, letter, accidental = ""] = match;
  let pitch = NATURAL_PITCH[letter];
  if (pitch === undefined) {
    return undefined;
  }
  if (accidental === "b") pitch -= 1;
  if (accidental === "bb") pitch -= 2;
  if (accidental === "#") pitch += 1;
  if (accidental === "##") pitch += 2;
  return (pitch + 120) % 12;
}

function degreeClassForNote(rootName, noteName) {
  if (!rootName || !noteName) {
    return null;
  }
  const rootLetter = rootName[0];
  const noteLetter = noteName[0];
  const rootLetterIndex = LETTER_ORDER.indexOf(rootLetter);
  const noteLetterIndex = LETTER_ORDER.indexOf(noteLetter);
  if (rootLetterIndex === -1 || noteLetterIndex === -1) {
    return null;
  }
  return ((noteLetterIndex - rootLetterIndex + LETTER_ORDER.length) % LETTER_ORDER.length) + 1;
}

function intervalLabelForNote(rootName, noteName) {
  if (noteNameToPitchClass(rootName) === undefined || !noteName) {
    return "";
  }

  const degreeClass = degreeClassForNote(rootName, noteName);
  if (!degreeClass) {
    return "";
  }

  const targetPitch = noteNameToPitchClass(noteName);
  if (targetPitch === undefined) {
    return "";
  }

  const rootLetter = rootName[0];
  const rootLetterIndex = LETTER_ORDER.indexOf(rootLetter);
  const expectedLetter = LETTER_ORDER[(rootLetterIndex + degreeClass - 1) % LETTER_ORDER.length];
  const naturalPitch = NATURAL_PITCH[expectedLetter];
  let offset = (targetPitch - naturalPitch + 12) % 12;
  if (offset > 6) {
    offset -= 12;
  }

  if (degreeClass === 1) {
    return offset === 0 ? "root" : `${offset > 0 ? "#".repeat(offset) : "b".repeat(-offset)}1`;
  }

  if (degreeClass === 4 || degreeClass === 5) {
    if (offset === 0) {
      return `p${degreeClass}`;
    }
    if (offset > 0) {
      return `${"#".repeat(offset)}${degreeClass}`;
    }
    return `${"b".repeat(-offset)}${degreeClass}`;
  }

  if (degreeClass === 7) {
    if (offset === 0) {
      return "7";
    }
    if (offset === -1) {
      return "b7";
    }
    if (offset > 0) {
      return `${"#".repeat(offset)}7`;
    }
    return `${"b".repeat(-offset)}7`;
  }

  if (degreeClass === 2 || degreeClass === 3 || degreeClass === 6) {
    if (offset === 0) {
      return `M${degreeClass}`;
    }
    if (offset === -1) {
      return `m${degreeClass}`;
    }
    if (offset > 0) {
      return `${"#".repeat(offset)}${degreeClass}`;
    }
    return `${"b".repeat(-offset)}${degreeClass}`;
  }

  return String(degreeClass);
}

function intervalLabelForDefinition(interval) {
  const semitones = typeof interval === "number" ? interval : interval?.semitones;
  const degreeClass =
    typeof interval === "object" && Number.isFinite(interval?.degree) ? interval.degree : null;
  if (!Number.isFinite(semitones) || !degreeClass) {
    return "";
  }

  const base = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 }[degreeClass];
  if (base === undefined) {
    return "";
  }

  let offset = (semitones - base + 12) % 12;
  if (offset > 6) {
    offset -= 12;
  }

  if (degreeClass === 1 && offset === 0) {
    return "root";
  }
  if (offset === 0) {
    return String(degreeClass);
  }
  if (offset > 0) {
    return `${"#".repeat(offset)}${degreeClass}`;
  }
  return `${"b".repeat(-offset)}${degreeClass}`;
}

export {
  SHARP_SCALE,
  FLAT_SCALE,
  SHARP_INDEX,
  FLAT_INDEX,
  NOTE_INDEX,
  LETTER_ORDER,
  NATURAL_PITCH,
  shouldUseFlats,
  normalizeKey,
  accidentalForOffset,
  noteNameToPitchClass,
  degreeClassForNote,
  intervalLabelForNote,
  intervalLabelForDefinition,
};
