import {
  drawTrimmedFretboardLayout,
  filterFretboardLayoutByDegreeClasses,
  trimFretboardLayout,
} from "shared-fretboard-layout";
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

const ROOT_STRINGS_BY_POSITION = {
  C: [1, 4],
  A: [1, 3],
  G: [0, 2, 5],
  E: [0, 2, 5],
  D: [2, 4],
};

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

export function buildScaleNotes(key, scale) {
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

function derivePerStringFrets({
  startFret,
  fretCount,
  pitchClassSet,
  noteNames,
  indexMap,
  displayNameMap,
  perStringRanges,
  tuningStrings,
}) {
  if (!perStringRanges) {
    return null;
  }

  const openIndexes = tuningStrings.map((note) => indexMap[note]);
  const derived = {};

  for (let stringIndex = 0; stringIndex < tuningStrings.length; stringIndex += 1) {
    const range = perStringRanges[stringIndex];
    if (!range) {
      continue;
    }
    const rangeEnd = range.start + range.span - 1;
    for (let i = 0; i < fretCount; i += 1) {
      const actualFret = startFret + i;
      if (actualFret < range.start || actualFret > rangeEnd) {
        continue;
      }
      const pitchClass = (openIndexes[stringIndex] + actualFret) % 12;
      if (!pitchClassSet.has(pitchClass)) {
        continue;
      }
      const key = String(stringIndex);
      if (!derived[key]) {
        derived[key] = [];
      }
      derived[key].push(actualFret);
    }
  }

  return Object.keys(derived).length > 0 ? derived : null;
}

function buildLayout({
  startFret,
  fretCount,
  pitchClassSet,
  intervalMap,
  degreeClassMap,
  intervalLabelMap,
  noteNames,
  indexMap,
  displayNameMap,
  perStringRanges,
  perStringFrets,
  tuningStrings,
}) {
  const layout = {};
  const openIndexes = tuningStrings.map((note) => indexMap[note]);

  for (let stringIndex = 0; stringIndex < tuningStrings.length; stringIndex += 1) {
    const notes = [];
    const openIndex = openIndexes[stringIndex];
    const hasPerStringFrets = !!perStringFrets;
    const hasExplicitFrets =
      perStringFrets && Object.prototype.hasOwnProperty.call(perStringFrets, stringIndex);
    const allowedFrets = hasExplicitFrets ? new Set(perStringFrets[stringIndex]) : null;
    for (let i = 0; i < fretCount; i += 1) {
      const actualFret = startFret + i;
      if (perStringRanges) {
        const range = perStringRanges[stringIndex];
        if (!range) {
          notes.push({ Present: false });
          continue;
        }
        const rangeEnd = range.start + range.span - 1;
        if (actualFret < range.start || actualFret > rangeEnd) {
          notes.push({ Present: false });
          continue;
        }
      }
      if (hasPerStringFrets && !hasExplicitFrets) {
        notes.push({ Present: false });
        continue;
      }
      if (allowedFrets && !allowedFrets.has(actualFret)) {
        notes.push({ Present: false });
        continue;
      }

      const pitchClass = (openIndex + actualFret) % 12;
      if (pitchClassSet.has(pitchClass)) {
        notes.push({
          Present: true,
          Note: displayNameMap.get(pitchClass) || noteNames[pitchClass],
          Interval: intervalMap.get(pitchClass) ?? 0,
          DegreeClass: degreeClassMap.get(pitchClass) ?? null,
          IntervalLabel: intervalLabelMap.get(pitchClass) || "",
        });
      } else {
        notes.push({ Present: false });
      }
    }
    layout[String(stringIndex)] = notes;
  }

  return layout;
}

function resolvePositionWindow(positionLayout, layoutRootIndex) {
  let startFret = 0;
  let fretCount = 4;
  let perStringRanges = null;

  if (positionLayout.mode === "split") {
    const ranges = {};
    let minStart = Number.POSITIVE_INFINITY;
    let maxEnd = Number.NEGATIVE_INFINITY;
    if (positionLayout.split_ranges?.length) {
      positionLayout.split_ranges.forEach((splitRange) => {
        const start = splitRange.start + layoutRootIndex;
        const span = splitRange.span;
        const end = start + span - 1;
        (splitRange.strings || []).forEach((stringIndex) => {
          ranges[Number(stringIndex)] = { start, span };
        });
        if (start < minStart) minStart = start;
        if (end > maxEnd) maxEnd = end;
      });
    } else {
      Object.entries(positionLayout.per_string || {}).forEach(([stringIndex, range]) => {
        const start = range.start + layoutRootIndex;
        const span = range.span;
        const end = start + span - 1;
        ranges[Number(stringIndex)] = { start, span };
        if (start < minStart) minStart = start;
        if (end > maxEnd) maxEnd = end;
      });
    }
    perStringRanges = ranges;
    startFret = minStart;
    fretCount = maxEnd - minStart + 1;
  } else {
    startFret = (positionLayout.start || 0) + layoutRootIndex;
    fretCount = positionLayout.span || 4;
  }

  return { startFret, fretCount, perStringRanges };
}

export function computeFretboardLayout({
  scale,
  key,
  tuningStrings,
  positionLayout,
}) {
  if (!scale || tuningStrings.length === 0 || !positionLayout) {
    return null;
  }

  const {
    rootIndex,
    pitchClassSet,
    intervalMap,
    displayNameMap,
    degreeClassMap,
    intervalLabelMap,
    noteNames,
    indexMap,
  } = buildScaleNotes(key, scale);

  const { startFret, fretCount, perStringRanges } = resolvePositionWindow(positionLayout, rootIndex);

  let perStringFrets = null;
  if (positionLayout.per_string_frets) {
    perStringFrets = {};
    let minFret = Number.POSITIVE_INFINITY;
    let maxFret = Number.NEGATIVE_INFINITY;
    Object.entries(positionLayout.per_string_frets).forEach(([stringIndex, frets]) => {
      const shifted = frets.map((fret) => fret + rootIndex);
      perStringFrets[Number(stringIndex)] = shifted;
      for (const fret of shifted) {
        if (fret < minFret) minFret = fret;
        if (fret > maxFret) maxFret = fret;
      }
    });
    if (minFret < Number.POSITIVE_INFINITY && maxFret > Number.NEGATIVE_INFINITY) {
      const hasPerStringRanges = perStringRanges && Object.keys(perStringRanges).length > 0;
      return trimFretboardLayout(
        buildLayout({
          startFret: minFret,
          fretCount: maxFret - minFret + 1,
          pitchClassSet,
          intervalMap,
          degreeClassMap,
          intervalLabelMap,
          noteNames,
          indexMap,
          displayNameMap,
          perStringRanges: hasPerStringRanges ? perStringRanges : null,
          perStringFrets,
          tuningStrings,
        }),
        minFret,
        maxFret - minFret + 1
      );
    }
  }

  if (
    positionLayout.mode === "split" &&
    Array.isArray(positionLayout.split_ranges) &&
    positionLayout.split_ranges.length > 0
  ) {
    perStringFrets = derivePerStringFrets({
      startFret,
      fretCount,
      pitchClassSet,
      noteNames,
      indexMap,
      displayNameMap,
      perStringRanges,
      tuningStrings,
    });
  }

  return trimFretboardLayout(
    buildLayout({
      startFret,
      fretCount,
      pitchClassSet,
      intervalMap,
      degreeClassMap,
      intervalLabelMap,
      noteNames,
      indexMap,
      displayNameMap,
      perStringRanges,
      perStringFrets,
      tuningStrings,
    }),
    startFret,
    fretCount
  );
}

export function filterLayoutByIntervalGroups(trimmedLayout, visibleDegreeClasses) {
  return filterFretboardLayoutByDegreeClasses(trimmedLayout, visibleDegreeClasses);
}

export function drawScaleLayout(fretboard, canvas, tuningStrings, tuningLabels, trimmedLayout) {
  if (!fretboard || !canvas || tuningStrings.length === 0 || !trimmedLayout) {
    return fretboard;
  }
  return drawTrimmedFretboardLayout(fretboard, canvas, trimmedLayout, {
    stringCount: tuningStrings.length,
    tuningLabels,
  });
}
