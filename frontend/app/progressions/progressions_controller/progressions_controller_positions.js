import {
  CAGED_SHAPES,
  STANDARD_POSITION_OPTIONS,
  computeScaleLayoutWindow,
  anchorFretForPosition,
  anchorFretNear,
  chooseNearestPosition,
  shiftPositionCode,
  chooseOverlappingPosition,
  chooseShiftedAvailablePosition,
} from "../../fretboard/position_layout_helpers.js";
import { STANDARD_TUNING_STRINGS } from "./progressions_controller_constants.js";

const POSITION_OPTIONS = STANDARD_POSITION_OPTIONS;

function normalizeChordSymbolInput(value) {
  const text = String(value || "");
  return text.replace(/(^|\/)([a-g])([b#]?)/g, (_match, prefix, letter, accidental) => {
    return `${prefix}${letter.toUpperCase()}${accidental || ""}`;
  });
}

function deriveRowPosition(row, previousRow, options = {}) {
  const { layoutScalesById = new Map(), useThreeNps = false } = options;
  if (
    row.positionFlow === "free" ||
    !row.spelling?.ok ||
    !previousRow?.spelling?.ok ||
    !previousRow?.spelling?.root
  ) {
    if (!row.position) {
      return {
        position: "",
        anchorFret: null,
      };
    }
    return {
      position: row.position,
      anchorFret: anchorFretForPosition(row.spelling?.root || "C", row.position),
    };
  }

  const previousAnchorFret = Number.isFinite(previousRow.effectiveAnchorFret)
    ? previousRow.effectiveAnchorFret
    : anchorFretForPosition(
        previousRow.spelling?.root || "C",
        previousRow.effectivePosition || previousRow.position || "C"
      );

  const previousWindow = layoutWindowForRow(previousRow, layoutScalesById, useThreeNps);
  const currentCandidate =
    row.candidates?.find((candidate) => candidate.scale.id === row.selectedScaleId) || null;
  const currentLayoutScale = currentCandidate ? layoutScalesById.get(currentCandidate.scale.id) || null : null;

  if (previousWindow && currentCandidate && currentLayoutScale) {
    const sameChoice = deriveOverlappingPositionChoice(
      currentCandidate,
      currentLayoutScale,
      row,
      previousWindow,
      useThreeNps
    );
    if (sameChoice) {
      if (row.positionFlow === "same_position") {
        return sameChoice;
      }
      if (row.positionFlow === "ascending" || row.positionFlow === "descending") {
        const shifted = shiftToAvailablePosition(
          currentCandidate,
          currentLayoutScale,
          row,
          sameChoice.position,
          row.positionFlow === "ascending" ? 1 : -1,
          useThreeNps
        );
        if (shifted) {
          return shifted;
        }
      }
      return sameChoice;
    }
  }

  const sameChoice = deriveSamePositionChoice(row.spelling.root, previousAnchorFret);
  if (row.positionFlow === "same_position") {
    return sameChoice;
  }
  if (row.positionFlow === "ascending" || row.positionFlow === "descending") {
    const shiftedPosition = shiftPositionCode(
      sameChoice.position,
      row.positionFlow === "ascending" ? 1 : -1
    );
    return {
      position: shiftedPosition,
      anchorFret: anchorFretNear(row.spelling.root, shiftedPosition, sameChoice.anchorFret),
    };
  }
  return sameChoice;
}

function deriveSamePositionChoice(root, previousAnchorFret) {
  return chooseNearestPosition(root, previousAnchorFret, POSITION_OPTIONS);
}

function layoutWindowForRow(row, layoutScalesById, useThreeNps) {
  const selectedCandidate =
    row.candidates?.find((candidate) => candidate.scale.id === row.selectedScaleId) || null;
  const layoutScale = selectedCandidate ? layoutScalesById.get(selectedCandidate.scale.id) || null : null;
  if (!selectedCandidate || !layoutScale) {
    return null;
  }
  return computeLayoutWindowForCandidate(
    selectedCandidate,
    layoutScale,
    row,
    row.effectivePosition || row.position,
    useThreeNps
  );
}

function deriveOverlappingPositionChoice(candidate, layoutScale, row, previousWindow, useThreeNps) {
  return chooseOverlappingPosition(
    (position) => computeLayoutWindowForCandidate(candidate, layoutScale, row, position, useThreeNps),
    previousWindow,
    POSITION_OPTIONS
  );
}

function shiftToAvailablePosition(candidate, layoutScale, row, basePosition, step, useThreeNps) {
  return chooseShiftedAvailablePosition(
    basePosition,
    step,
    (position) => computeLayoutWindowForCandidate(candidate, layoutScale, row, position, useThreeNps),
    CAGED_SHAPES
  );
}

function computeLayoutWindowForCandidate(candidate, layoutScale, row, position, useThreeNps) {
  const windowModel = positionWindowModel(candidate, row);
  return computeScaleLayoutWindow({
    scale: windowModel.scale,
    layoutScale,
    key: windowModel.key,
    position,
    useThreeNps,
    tuningStrings: STANDARD_TUNING_STRINGS,
  });
}

function positionWindowModel(candidate, row) {
  return {
    scale: candidate.displayScale || candidate.scale,
    key: candidate.displayRoot || row.spelling?.root || "C",
  };
}

export {
  POSITION_OPTIONS,
  deriveRowPosition,
  normalizeChordSymbolInput,
};
