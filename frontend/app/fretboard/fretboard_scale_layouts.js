import {
  drawTrimmedFretboardLayout,
  filterFretboardLayoutByDegreeClasses,
  trimFretboardLayout,
} from "shared-fretboard-layout";
import { buildScaleNotes } from "./fretboard_scale_notes.js";

function derivePerStringFrets({
  startFret,
  fretCount,
  pitchClassSet,
  indexMap,
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

function nearestOctaveShift(baseFret, targetFret) {
  if (!Number.isFinite(targetFret)) {
    return 0;
  }
  let bestShift = 0;
  let bestDistance = Math.abs(baseFret - targetFret);
  for (let octave = -2; octave <= 2; octave += 1) {
    const shift = octave * 12;
    const distance = Math.abs(baseFret + shift - targetFret);
    if (distance < bestDistance) {
      bestShift = shift;
      bestDistance = distance;
    }
  }
  return bestShift;
}

function resolvePositionWindow(positionLayout, layoutRootIndex, targetFret = NaN) {
  let startFret = 0;
  let fretCount = 4;
  let perStringRanges = null;
  let octaveShift = 0;

  if (positionLayout.mode === "split") {
    const ranges = {};
    let minStart = Number.POSITIVE_INFINITY;
    let maxEnd = Number.NEGATIVE_INFINITY;
    let rawMinStart = Number.POSITIVE_INFINITY;
    if (positionLayout.split_ranges?.length) {
      positionLayout.split_ranges.forEach((splitRange) => {
        const start = splitRange.start + layoutRootIndex;
        const span = splitRange.span;
        const end = start + span - 1;
        if (start < rawMinStart) rawMinStart = start;
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
        if (start < rawMinStart) rawMinStart = start;
        ranges[Number(stringIndex)] = { start, span };
        if (start < minStart) minStart = start;
        if (end > maxEnd) maxEnd = end;
      });
    }
    octaveShift = nearestOctaveShift(rawMinStart, targetFret);
    if (octaveShift !== 0) {
      Object.keys(ranges).forEach((stringIndex) => {
        ranges[stringIndex] = {
          ...ranges[stringIndex],
          start: ranges[stringIndex].start + octaveShift,
        };
      });
      minStart += octaveShift;
      maxEnd += octaveShift;
    }
    perStringRanges = ranges;
    startFret = minStart;
    fretCount = maxEnd - minStart + 1;
  } else {
    const rawStart = (positionLayout.start || 0) + layoutRootIndex;
    octaveShift = nearestOctaveShift(rawStart, targetFret);
    startFret = rawStart + octaveShift;
    fretCount = positionLayout.span || 4;
  }

  return { startFret, fretCount, perStringRanges, octaveShift };
}

function computeFretboardLayout({
  scale,
  key,
  tuningStrings,
  positionLayout,
  targetFret,
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

  const { startFret, fretCount, perStringRanges, octaveShift } = resolvePositionWindow(
    positionLayout,
    rootIndex,
    targetFret
  );

  let perStringFrets = null;
  if (positionLayout.per_string_frets) {
    perStringFrets = {};
    let minFret = Number.POSITIVE_INFINITY;
    let maxFret = Number.NEGATIVE_INFINITY;
    Object.entries(positionLayout.per_string_frets).forEach(([stringIndex, frets]) => {
      const shifted = frets.map((fret) => fret + rootIndex + octaveShift);
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
      indexMap,
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

function filterLayoutByIntervalGroups(trimmedLayout, visibleDegreeClasses) {
  return filterFretboardLayoutByDegreeClasses(trimmedLayout, visibleDegreeClasses);
}

function drawScaleLayout(fretboard, canvas, tuningStrings, tuningLabels, trimmedLayout) {
  if (!fretboard || !canvas || tuningStrings.length === 0 || !trimmedLayout) {
    return fretboard;
  }
  return drawTrimmedFretboardLayout(fretboard, canvas, trimmedLayout, {
    stringCount: tuningStrings.length,
    tuningLabels,
  });
}

export {
  computeFretboardLayout,
  drawScaleLayout,
  filterLayoutByIntervalGroups,
};
