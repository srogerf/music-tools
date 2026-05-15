import { computeFretboardLayout } from "./fretboard_layout.js";
import { noteNameToPitchClass } from "./fretboard_note_helpers.js";
import { normalizeNoteName } from "../music/note_logic.js";
import { CAGED_SHAPES, POSITION_LABELS } from "../scales/scales_layout.js";

const POSITION_ANCHOR_STRING = {
  C: 5,
  A: 5,
  G: 6,
  E: 6,
  D: 4,
};

const STANDARD_TUNING_OPEN_PITCH = {
  6: 4,
  5: 9,
  4: 2,
};

const POSITION_DEFAULT_TARGET_FRET = {
  C: 3,
  A: 5,
  G: 7,
  E: 5,
  D: 10,
};

const STANDARD_POSITION_OPTIONS = CAGED_SHAPES.map((code) => ({
  value: code,
  label: `${POSITION_LABELS[code] || code} position`,
}));

function resolveCandidatePositionLayout(scale, position, useThreeNps) {
  if (!scale || !position) {
    return null;
  }
  const familyCode = useThreeNps ? "3nps" : "standard";
  return (
    scale?.layout_families?.[familyCode]?.positions?.[position] ||
    scale?.layout_families?.standard?.positions?.[position] ||
    scale?.positions?.[position] ||
    null
  );
}

function normalizePositionLayout(positionLayout) {
  if (!positionLayout) {
    return null;
  }
  const normalized = { ...positionLayout };
  delete normalized.per_string_frets;
  return normalized;
}

function computeScaleLayoutWindow({ scale, layoutScale, key, position, useThreeNps, tuningStrings }) {
  const targetFret = anchorFretForPosition(key, position);
  const positionLayout = normalizePositionLayout(
    resolveCandidatePositionLayout(layoutScale, position, useThreeNps)
  );
  if (!positionLayout) {
    return null;
  }
  const trimmed = computeFretboardLayout({
    scale,
    key,
    tuningStrings,
    positionLayout,
    targetFret,
  });
  if (!trimmed || !Number.isFinite(trimmed.positionStart) || !Number.isFinite(trimmed.fretCount)) {
    return null;
  }
  const start = trimmed.positionStart;
  const end = trimmed.positionStart + trimmed.fretCount - 1;
  return {
    start,
    end,
    center: start + (end - start) / 2,
  };
}

function windowOverlap(left, right) {
  return Math.max(0, Math.min(left.end, right.end) - Math.max(left.start, right.start) + 1);
}

function anchorFretForPosition(root, position) {
  return anchorFretNear(root, position, POSITION_DEFAULT_TARGET_FRET[position] ?? 7);
}

function anchorFretNear(root, position, targetFret) {
  const stringNumber = POSITION_ANCHOR_STRING[position];
  const openPitch = STANDARD_TUNING_OPEN_PITCH[stringNumber];
  const rootPitch = noteNameToPitchClass(normalizeNoteName(root));
  if (!Number.isFinite(openPitch) || !Number.isFinite(rootPitch)) {
    return NaN;
  }

  const baseFret = (rootPitch - openPitch + 120) % 12;
  let bestFret = baseFret;
  let bestDistance = Math.abs(baseFret - targetFret);

  for (let octave = -2; octave <= 3; octave += 1) {
    const candidateFret = baseFret + octave * 12;
    if (candidateFret < 0 || candidateFret > 24) {
      continue;
    }
    const distance = Math.abs(candidateFret - targetFret);
    if (distance < bestDistance) {
      bestFret = candidateFret;
      bestDistance = distance;
    }
  }

  return bestFret;
}

function chooseNearestPosition(root, previousAnchorFret, positionOptions = STANDARD_POSITION_OPTIONS) {
  let best = {
    position: positionOptions[0]?.value || CAGED_SHAPES[0],
    anchorFret: previousAnchorFret,
    distance: Number.POSITIVE_INFINITY,
  };

  for (const option of positionOptions) {
    const anchorFret = anchorFretNear(root, option.value, previousAnchorFret);
    if (!Number.isFinite(anchorFret)) {
      continue;
    }
    const distance = Math.abs(anchorFret - previousAnchorFret);
    if (distance < best.distance) {
      best = {
        position: option.value,
        anchorFret,
        distance,
      };
    }
  }

  return { position: best.position, anchorFret: best.anchorFret };
}

function shiftPositionCode(position, step, positionSequence = CAGED_SHAPES) {
  const currentIndex = positionSequence.indexOf(position);
  if (currentIndex === -1) {
    return position || positionSequence[0] || "";
  }
  const nextIndex = (currentIndex + step + positionSequence.length) % positionSequence.length;
  return positionSequence[nextIndex];
}

function chooseOverlappingPosition(getWindow, previousWindow, positionOptions = STANDARD_POSITION_OPTIONS) {
  let best = null;
  for (const option of positionOptions) {
    const window = getWindow(option.value);
    if (!window) {
      continue;
    }
    const overlap = windowOverlap(previousWindow, window);
    const centerDistance = Math.abs(previousWindow.center - window.center);
    if (
      !best ||
      overlap > best.overlap ||
      (overlap === best.overlap && centerDistance < best.centerDistance)
    ) {
      best = {
        position: option.value,
        anchorFret: window.center,
        overlap,
        centerDistance,
      };
    }
  }
  return best ? { position: best.position, anchorFret: best.anchorFret } : null;
}

function chooseShiftedAvailablePosition(basePosition, step, getWindow, positionSequence = CAGED_SHAPES) {
  const baseWindow = getWindow(basePosition);
  if (baseWindow) {
    const directionalCandidates = [];
    for (const position of positionSequence) {
      if (position === basePosition) {
        continue;
      }
      const window = getWindow(position);
      if (!window) {
        continue;
      }
      const delta = window.center - baseWindow.center;
      if ((step > 0 && delta > 0) || (step < 0 && delta < 0)) {
        directionalCandidates.push({
          position,
          anchorFret: window.center,
          distance: Math.abs(delta),
        });
      }
    }
    directionalCandidates.sort((left, right) => left.distance - right.distance);
    if (directionalCandidates.length > 0) {
      return {
        position: directionalCandidates[0].position,
        anchorFret: directionalCandidates[0].anchorFret,
      };
    }
  }

  const startIndex = positionSequence.indexOf(basePosition);
  if (startIndex === -1) {
    return null;
  }
  for (let offset = 1; offset < positionSequence.length; offset += 1) {
    const index = (startIndex + step * offset + positionSequence.length * 4) % positionSequence.length;
    const position = positionSequence[index];
    const window = getWindow(position);
    if (window) {
      return { position, anchorFret: window.center };
    }
  }
  return null;
}

export {
  STANDARD_POSITION_OPTIONS,
  CAGED_SHAPES,
  resolveCandidatePositionLayout,
  normalizePositionLayout,
  computeScaleLayoutWindow,
  windowOverlap,
  anchorFretForPosition,
  anchorFretNear,
  chooseNearestPosition,
  shiftPositionCode,
  chooseOverlappingPosition,
  chooseShiftedAvailablePosition,
};
