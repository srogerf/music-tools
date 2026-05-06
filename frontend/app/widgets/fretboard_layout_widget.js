import React, { useMemo } from "https://esm.sh/react@18";
import { SharedFretboard } from "shared-fretboard";
import {
  drawTrimmedFretboardLayout,
  filterFretboardLayoutByDegreeClasses,
  trimFretboardLayout,
} from "shared-fretboard-layout";

export function SharedFretboardLayout({
  active = true,
  className = "canvas-wrap",
  canvasClassName = "",
  layout,
  positionStart = 0,
  fretCount = 4,
  visibleDegreeClasses = null,
  options,
}) {
  const trimmedLayout = useMemo(
    () => {
      if (!layout) {
        return null;
      }
      if (layout.layout && Array.isArray(layout.layout["0"])) {
        return layout;
      }
      return trimFretboardLayout(layout, positionStart, fretCount);
    },
    [layout, positionStart, fretCount]
  );
  const filteredLayout = useMemo(() => {
    if (!trimmedLayout) {
      return null;
    }
    if (!visibleDegreeClasses) {
      return trimmedLayout;
    }
    return filterFretboardLayoutByDegreeClasses(trimmedLayout, visibleDegreeClasses);
  }, [trimmedLayout, visibleDegreeClasses]);

  const draw = useMemo(
    () => (fretboard, canvas) =>
      drawTrimmedFretboardLayout(fretboard, canvas, filteredLayout, options),
    [filteredLayout, options]
  );

  const nextOptions = useMemo(
    () => ({
      ...options,
      fretCount: filteredLayout?.fretCount || options?.fretCount || fretCount,
      hasZeroFret:
        filteredLayout?.positionStart === 0 || Boolean(options?.hasZeroFret),
    }),
    [filteredLayout, options, fretCount]
  );

  return React.createElement(SharedFretboard, {
    active,
    className,
    canvasClassName,
    options: nextOptions,
    draw,
  });
}
