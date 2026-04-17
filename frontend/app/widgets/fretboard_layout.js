import { createFretboard } from "fretboard";

export function trimFretboardLayout(layout, positionStart, fretCount) {
  let firstPopulatedIndex = -1;
  let lastPopulatedIndex = -1;

  for (let fretIndex = 0; fretIndex < fretCount; fretIndex += 1) {
    const populated = Object.values(layout).some(
      (stringNotes) => stringNotes[fretIndex] && stringNotes[fretIndex].Present
    );
    if (populated) {
      if (firstPopulatedIndex === -1) {
        firstPopulatedIndex = fretIndex;
      }
      lastPopulatedIndex = fretIndex;
    }
  }

  if (firstPopulatedIndex === -1) {
    return { layout, positionStart, fretCount, fretLabels: null };
  }

  if (firstPopulatedIndex === 0 && lastPopulatedIndex === fretCount - 1) {
    return {
      layout,
      positionStart,
      fretCount,
      fretLabels: Array.from({ length: fretCount }, (_, index) => positionStart + index),
    };
  }

  const trimmedLayout = {};
  Object.entries(layout).forEach(([stringIndex, stringNotes]) => {
    trimmedLayout[stringIndex] = stringNotes.slice(firstPopulatedIndex, lastPopulatedIndex + 1);
  });

  const trimmedFretCount = lastPopulatedIndex - firstPopulatedIndex + 1;
  return {
    layout: trimmedLayout,
    positionStart: positionStart + firstPopulatedIndex,
    fretCount: trimmedFretCount,
    fretLabels: Array.from(
      { length: trimmedFretCount },
      (_, index) => positionStart + firstPopulatedIndex + index
    ),
  };
}

export function filterFretboardLayout(trimmedLayout, predicate) {
  if (!trimmedLayout) {
    return null;
  }

  const filteredLayout = {};
  Object.entries(trimmedLayout.layout).forEach(([stringIndex, notes]) => {
    filteredLayout[stringIndex] = notes.map((note) => {
      if (!note?.Present) {
        return note;
      }
      if (predicate(note, stringIndex)) {
        return note;
      }
      return { Present: false };
    });
  });

  return {
    ...trimmedLayout,
    layout: filteredLayout,
  };
}

export function filterFretboardLayoutByDegreeClasses(trimmedLayout, visibleDegreeClasses) {
  return filterFretboardLayout(
    trimmedLayout,
    (note) => visibleDegreeClasses.has(note.DegreeClass)
  );
}

export function drawTrimmedFretboardLayout(fretboard, canvas, trimmedLayout, options = {}) {
  if (!fretboard || !canvas || !trimmedLayout) {
    return fretboard;
  }

  const stringCount = options.stringCount ?? fretboard.options.stringCount;
  const tuningLabels = options.tuningLabels ?? fretboard.options.tuningLabels;
  const showOpenFret = Array.isArray(trimmedLayout.fretLabels)
    ? trimmedLayout.fretLabels.includes(0)
    : trimmedLayout.positionStart === 0;

  let nextFretboard = fretboard;
  if (
    fretboard.options.fretCount !== trimmedLayout.fretCount ||
    fretboard.options.hasZeroFret !== showOpenFret ||
    fretboard.options.stringCount !== stringCount
  ) {
    nextFretboard = createFretboard(canvas, {
      ...fretboard.options,
      stringCount,
      fretCount: trimmedLayout.fretCount,
      hasZeroFret: showOpenFret,
      tuningLabels,
    });
  } else {
    nextFretboard.options.tuningLabels = tuningLabels;
  }

  nextFretboard.clear();
  nextFretboard.drawBlank(showOpenFret);
  nextFretboard.drawLayout({
    Layout: trimmedLayout.layout,
    PositionStart: trimmedLayout.positionStart,
    FretLabels: trimmedLayout.fretLabels,
  });
  return nextFretboard;
}
