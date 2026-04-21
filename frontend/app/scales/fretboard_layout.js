import {
  drawTrimmedFretboardLayout,
  filterFretboardLayoutByDegreeClasses,
  trimFretboardLayout,
} from "shared-fretboard-layout";

const ROOT_STRINGS_BY_POSITION = {
  C: [1, 4],
  A: [1, 3],
  G: [0, 2, 5],
  E: [0, 2, 5],
  D: [2, 4],
};

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

const SHARP_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_SCALE = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SHARP_INDEX = Object.fromEntries(SHARP_SCALE.map((note, i) => [note, i]));
const FLAT_INDEX = Object.fromEntries(FLAT_SCALE.map((note, i) => [note, i]));
const NOTE_INDEX = { ...SHARP_INDEX, ...FLAT_INDEX };
const LETTER_ORDER = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

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

function buildDiatonicNotes(normalizedKey, rootIndex, scale) {
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
    const targetPitch = (rootIndex + scale.intervals[degree]) % 12;
    const letter = LETTER_ORDER[(rootLetterIndex + degree) % LETTER_ORDER.length];
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
  if (scale.type === "diatonic" && Array.isArray(scale.intervals) && scale.intervals.length === 7) {
    notes = buildDiatonicNotes(normalized, rootIndex, scale);
  }
  if (!notes) {
    notes = scale.intervals.map((interval) => noteNames[(rootIndex + interval) % 12]);
  }

  const pitchClassSet = new Set();
  const intervalMap = new Map();
  const displayNameMap = new Map();
  const degreeClassMap = new Map();
  const intervalLabelMap = new Map();
  scale.intervals.forEach((interval, degree) => {
    const pitchClass = (rootIndex + interval) % 12;
    pitchClassSet.add(pitchClass);
    intervalMap.set(pitchClass, interval);
    const noteName = notes[degree];
    displayNameMap.set(pitchClass, noteName);
    const degreeClass = degreeClassForNote(normalized, noteName) ?? (degree + 1);
    degreeClassMap.set(pitchClass, degreeClass);
    intervalLabelMap.set(pitchClass, intervalLabelForNote(normalized, noteName));
  });

  return {
    rootIndex,
    notes,
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

function collectScaleFretsForString(openIndex, pitchClassSet, maxFret) {
  const frets = [];
  for (let fret = 0; fret <= maxFret; fret += 1) {
    const pitchClass = (openIndex + fret) % 12;
    if (pitchClassSet.has(pitchClass)) {
      frets.push(fret);
    }
  }
  return frets;
}

function buildThreeNpsCandidates(frets) {
  const candidates = [];
  for (let i = 0; i <= frets.length - 3; i += 1) {
    const group = frets.slice(i, i + 3);
    const span = group[2] - group[0];
    if (span <= 6) {
      candidates.push(group);
    }
  }
  return candidates;
}

function candidateContainsRoot(candidate, openIndex, rootIndex) {
  return candidate.some((fret) => (openIndex + fret) % 12 === rootIndex);
}

function selectThreeNpsGroups({
  anchorStarts,
  anchorEnds,
  openIndexes,
  pitchClassSet,
  rootIndex,
  positionName,
}) {
  const perStringFrets = {};
  const rootStrings = new Set(ROOT_STRINGS_BY_POSITION[positionName] || []);
  let previousStart = null;
  const maxAnchorEnd = Math.max(...anchorEnds);
  const searchMaxFret = Math.max(18, maxAnchorEnd + 8);

  for (let stringIndex = 0; stringIndex < openIndexes.length; stringIndex += 1) {
    const openIndex = openIndexes[stringIndex];
    const scaleFrets = collectScaleFretsForString(openIndex, pitchClassSet, searchMaxFret);
    const candidates = buildThreeNpsCandidates(scaleFrets);
    if (candidates.length === 0) {
      return null;
    }

    const anchorStart = anchorStarts[stringIndex];
    const anchorEnd = anchorEnds[stringIndex];
    let bestCandidate = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      let score =
        Math.abs(candidate[0] - anchorStart) * 2 +
        Math.abs(candidate[2] - anchorEnd);

      if (previousStart !== null) {
        const delta = candidate[0] - previousStart;
        if (delta < 0) {
          score += 30 + Math.abs(delta) * 5;
        } else {
          score += delta;
          if (delta > 5) {
            score += (delta - 5) * 2;
          }
        }
      }

      if (rootStrings.has(stringIndex) && candidateContainsRoot(candidate, openIndex, rootIndex)) {
        score -= 8;
      }

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    if (!bestCandidate) {
      return null;
    }

    perStringFrets[stringIndex] = bestCandidate;
    previousStart = bestCandidate[0];
  }

  return perStringFrets;
}

function computeThreeNpsLayout({
  rootIndex,
  pitchClassSet,
  intervalMap,
  displayNameMap,
  degreeClassMap,
  intervalLabelMap,
  noteNames,
  indexMap,
  tuningStrings,
  positionLayout,
  positionName,
}) {
  const openIndexes = tuningStrings.map((note) => indexMap[note]);
  const { startFret, fretCount, perStringRanges } = resolvePositionWindow(positionLayout, rootIndex);
  const anchorStarts = [];
  const anchorEnds = [];

  for (let stringIndex = 0; stringIndex < tuningStrings.length; stringIndex += 1) {
    const range = perStringRanges?.[stringIndex];
    const anchorStart = range?.start ?? startFret;
    const anchorSpan = range?.span ?? fretCount;
    anchorStarts.push(anchorStart);
    anchorEnds.push(anchorStart + anchorSpan - 1);
  }

  const perStringFrets = selectThreeNpsGroups({
    anchorStarts,
    anchorEnds,
    openIndexes,
    pitchClassSet,
    rootIndex,
    positionName,
  });
  if (!perStringFrets) {
    return null;
  }

  let minFret = Number.POSITIVE_INFINITY;
  let maxFret = Number.NEGATIVE_INFINITY;
  Object.values(perStringFrets).forEach((frets) => {
    frets.forEach((fret) => {
      if (fret < minFret) minFret = fret;
      if (fret > maxFret) maxFret = fret;
    });
  });
  if (minFret === Number.POSITIVE_INFINITY || maxFret === Number.NEGATIVE_INFINITY) {
    return null;
  }

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
      perStringRanges: null,
      perStringFrets,
      tuningStrings,
    }),
    minFret,
    maxFret - minFret + 1
  );
}

export function computeFretboardLayout({
  scale,
  key,
  tuningStrings,
  positionLayout,
  positionName,
  useThreeNps = false,
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
  } = buildScaleNotes(
    key,
    scale
  );
  const layoutRootIndex = rootIndex;
  if (useThreeNps) {
    const generated = computeThreeNpsLayout({
      rootIndex,
      pitchClassSet,
      intervalMap,
      displayNameMap,
      degreeClassMap,
      intervalLabelMap,
      noteNames,
      indexMap,
      tuningStrings,
      positionLayout,
      positionName,
    });
    if (generated) {
      return generated;
    }
  }

  const { startFret, fretCount, perStringRanges } = resolvePositionWindow(
    positionLayout,
    layoutRootIndex
  );

  let perStringFrets = null;
  if (positionLayout.per_string_frets) {
    perStringFrets = {};
    let minFret = Number.POSITIVE_INFINITY;
    let maxFret = Number.NEGATIVE_INFINITY;
    Object.entries(positionLayout.per_string_frets).forEach(([stringIndex, frets]) => {
      const shifted = frets.map((fret) => fret + layoutRootIndex);
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
  } else if (
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
