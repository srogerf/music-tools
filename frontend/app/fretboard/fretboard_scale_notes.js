import {
  accidentalForOffset,
  degreeClassForNote,
  intervalLabelForDefinition,
  intervalLabelForNote,
  intervalLabelForScale,
  noteNameToPitchClass,
  normalizeKey,
  shouldUseFlats,
  FLAT_INDEX,
  FLAT_SCALE,
  LETTER_ORDER,
  NATURAL_PITCH,
  NOTE_INDEX,
  SHARP_INDEX,
  SHARP_SCALE,
} from "./fretboard_note_helpers.js";

function buildDiatonicNotes(normalizedKey, rootIndex, scale) {
  const degreeClasses = scale.intervals.map((_, degree) => degree + 1);
  return buildNotesForDegreeClasses(normalizedKey, rootIndex, scale, degreeClasses);
}

function intervalSemitones(interval) {
  return typeof interval === "number" ? interval : interval?.semitones;
}

function intervalDegree(interval, fallback) {
  return typeof interval === "object" && Number.isFinite(interval?.degree)
    ? interval.degree
    : fallback;
}

function pentatonicDegreeClasses(scale) {
  if (!scale || scale.type !== "pentatonic" || !Array.isArray(scale.intervals) || scale.intervals.length !== 5) {
    return null;
  }

  const signature = scale.intervals
    .map((interval) => intervalSemitones(interval))
    .join(",");

  const signatures = {
    "0,2,4,7,9": [1, 2, 3, 5, 6],
    "0,2,5,7,10": [1, 2, 4, 5, 7],
    "0,3,5,8,10": [1, 3, 4, 6, 7],
    "0,2,5,7,9": [1, 2, 4, 5, 6],
  };

  return signatures[signature] || null;
}

function buildNotesForDegreeClasses(normalizedKey, rootIndex, scale, degreeClasses) {
  const match = normalizedKey.match(/^([A-G])([b#]?)$/);
  if (!match) {
    return null;
  }

  const [, rootLetter] = match;
  const rootLetterIndex = LETTER_ORDER.indexOf(rootLetter);
  if (rootLetterIndex === -1) {
    return null;
  }

  const notes = [];
  for (let degree = 0; degree < scale.intervals.length; degree += 1) {
    const semitones = intervalSemitones(scale.intervals[degree]);
    if (!Number.isFinite(semitones)) {
      return null;
    }
    const targetPitch = (rootIndex + semitones) % 12;
    const degreeClass = degreeClasses[degree];
    if (!degreeClass) {
      return null;
    }
    const letter = LETTER_ORDER[(rootLetterIndex + degreeClass - 1) % LETTER_ORDER.length];
    let offset = (targetPitch - NATURAL_PITCH[letter] + 12) % 12;
    if (offset > 6) {
      offset -= 12;
    }
    const accidental = accidentalForOffset(offset);
    if (accidental === null) {
      return null;
    }
    notes.push(`${letter}${accidental}`);
  }
  return notes;
}

function buildScaleNotes(key, scale) {
  const normalized = normalizeKey(key);
  const useFlats = shouldUseFlats(normalized);
  const noteNames = useFlats ? FLAT_SCALE : SHARP_SCALE;
  const indexMap = useFlats ? FLAT_INDEX : SHARP_INDEX;
  const rootIndex = NOTE_INDEX[normalized];
  if (rootIndex === undefined || !scale) {
    return {
      rootIndex: 0,
      notes: [],
      noteDetails: [],
      pitchClassSet: new Set(),
      intervalMap: new Map(),
      displayNameMap: new Map(),
      degreeClassMap: new Map(),
      intervalLabelMap: new Map(),
      noteNames,
      indexMap,
    };
  }

  let notes = null;
  const definitionDegreeClasses =
    pentatonicDegreeClasses(scale) ||
    scale.intervals.map((interval, degree) => intervalDegree(interval, degree + 1));
  if (scale.type === "diatonic" && Array.isArray(scale.intervals) && scale.intervals.length === 7) {
    notes = buildNotesForDegreeClasses(normalized, rootIndex, scale, definitionDegreeClasses)
      || buildDiatonicNotes(normalized, rootIndex, scale);
  }
  if (!notes) {
    notes = buildNotesForDegreeClasses(normalized, rootIndex, scale, definitionDegreeClasses);
  }
  if (!notes) {
    notes = scale.intervals.map((interval) => noteNames[(rootIndex + intervalSemitones(interval)) % 12]);
  }

  const pitchClassSet = new Set();
  const intervalMap = new Map();
  const displayNameMap = new Map();
  const degreeClassMap = new Map();
  const intervalLabelMap = new Map();
  const noteDetails = [];
  scale.intervals.forEach((interval, degree) => {
    const semitones = intervalSemitones(interval);
    const pitchClass = (rootIndex + semitones) % 12;
    pitchClassSet.add(pitchClass);
    intervalMap.set(pitchClass, semitones);
    const noteName = notes[degree];
    displayNameMap.set(pitchClass, noteName);
    const degreeClass = definitionDegreeClasses[degree] ?? degreeClassForNote(normalized, noteName) ?? (degree + 1);
    degreeClassMap.set(pitchClass, degreeClass);
    const intervalLabel =
      intervalLabelForScale(interval, scale.intervals.length, degree) ||
      intervalLabelForDefinition(interval) ||
      intervalLabelForNote(normalized, noteName);
    intervalLabelMap.set(pitchClass, intervalLabel);
    noteDetails.push({
      note: noteName,
      interval: semitones,
      intervalLabel,
      degreeClass,
    });
  });

  return {
    rootIndex,
    notes,
    noteDetails,
    pitchClassSet,
    intervalMap,
    displayNameMap,
    degreeClassMap,
    intervalLabelMap,
    noteNames,
    indexMap,
  };
}

export {
  buildScaleNotes,
  intervalDegree,
  intervalSemitones,
  noteNameToPitchClass,
};
