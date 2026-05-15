import React from "https://esm.sh/react@18";
import { SharedFretboard } from "shared-fretboard";
import { tonalCenterRoot } from "../logic/ranking.js";
import {
  computeFretboardLayout,
  drawScaleLayout,
  filterLayoutByIntervalGroups,
} from "../../fretboard/fretboard_layout.js";
import {
  resolveCandidatePositionLayout,
  normalizePositionLayout,
} from "../../fretboard/position_layout_helpers.js";
import {
  STANDARD_TUNING_LABELS,
  STANDARD_TUNING_STRINGS,
} from "../progressions_controller/progressions_controller_constants.js";

export function RowFretboardPreview({
  active,
  row,
  selectedCandidate,
  layoutScale,
  visibleDegreeClasses,
  useThreeNps,
  options,
}) {
  if (!selectedCandidate) {
    return React.createElement("div", { className: "progression-preview-content" });
  }

  const draw = (fretboard, canvas) => {
    const positionLayout = normalizePositionLayout(
      resolveCandidatePositionLayout(layoutScale, row.effectivePosition, useThreeNps)
    );
    if (!positionLayout) {
      fretboard.clear();
      fretboard.drawBlank(fretboard.options.hasZeroFret);
      return fretboard;
    }

    const trimmed = computeFretboardLayout({
      scale: selectedCandidate.displayScale || selectedCandidate.scale,
      key: selectedCandidate.displayRoot || row.spelling?.root || tonalCenterRoot(row),
      tuningStrings: STANDARD_TUNING_STRINGS,
      positionLayout,
      targetFret: row.effectiveAnchorFret,
      positionName: row.effectivePosition,
      useThreeNps,
    });
    if (!trimmed) {
      fretboard.clear();
      fretboard.drawBlank(fretboard.options.hasZeroFret);
      return fretboard;
    }

    const filtered = filterLayoutByIntervalGroups(trimmed, visibleDegreeClasses);
    return drawScaleLayout(fretboard, canvas, STANDARD_TUNING_STRINGS, STANDARD_TUNING_LABELS, filtered);
  };

  return React.createElement(
    "div",
    { className: "progression-preview-content" },
    React.createElement(SharedFretboard, {
      active,
      options,
      draw,
    })
  );
}
