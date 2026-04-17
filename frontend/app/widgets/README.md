# Shared Widgets

Shared UI widgets for the React application live here.

## `SharedFretboard`

`SharedFretboard` is the React wrapper around the generic canvas renderer in `frontend/fretboard/`.
Use it anywhere the app needs to render a fretboard without reimplementing canvas lifecycle logic.

### Props

- `active`
  - When `true`, the widget draws the current board state.
- `className`
  - Wrapper class name. Defaults to `canvas-wrap`.
- `canvasClassName`
  - Optional class name for the `<canvas>` element.
- `options`
  - Base renderer options passed to `createFretboard(...)`.
  - Typical values include `stringCount`, `tuningLabels`, `fretCount`, `boardHeight`, and `hasZeroFret`.
- `draw`
  - Function with signature `(fretboard, canvas) => fretboard`
  - Receives the current renderer instance and canvas and is responsible for drawing the desired layout.
  - If omitted, the widget draws a blank fretboard.

### Example

```js
import React, { useMemo } from "https://esm.sh/react@18";
import { SharedFretboard } from "shared-fretboard";

function ExamplePage({ tuningLabels, trimmedLayout }) {
  const options = useMemo(
    () => ({
      stringCount: tuningLabels.length || 6,
      tuningLabels,
      fretCount: 4,
      boardHeight: 240,
    }),
    [tuningLabels]
  );

  return React.createElement(SharedFretboard, {
    active: true,
    options,
    draw: (fretboard) => {
      fretboard.clear();
      fretboard.drawBlank();

      if (trimmedLayout) {
        fretboard.drawLayout(trimmedLayout);
      }

      return fretboard;
    },
  });
}
```

### Notes

- Use `frontend/fretboard/index.js` when you need the low-level canvas API directly.
- Use `SharedFretboard` for React pages so rendering behavior stays consistent across features.

## `shared-fretboard-layout`

`shared-fretboard-layout` contains generic fretboard-view helpers that are not tied to scales,
chords, or progressions.

Use it for:

- trimming a layout down to the populated fret window
- filtering visible notes based on metadata
- redrawing a trimmed layout on a fretboard instance

Current exports:

- `trimFretboardLayout(layout, positionStart, fretCount)`
- `filterFretboardLayout(trimmedLayout, predicate)`
- `filterFretboardLayoutByDegreeClasses(trimmedLayout, visibleDegreeClasses)`
- `drawTrimmedFretboardLayout(fretboard, canvas, trimmedLayout, options)`

### Example

```js
import React, { useMemo } from "https://esm.sh/react@18";
import { SharedFretboard } from "shared-fretboard";
import {
  drawTrimmedFretboardLayout,
  filterFretboardLayoutByDegreeClasses,
  trimFretboardLayout,
} from "shared-fretboard-layout";

function LayoutExample({ rawLayout, positionStart, fretCount, tuningLabels }) {
  const visibleDegreeClasses = useMemo(() => new Set([1, 3, 5, 7]), []);

  const trimmedLayout = useMemo(
    () => trimFretboardLayout(rawLayout, positionStart, fretCount),
    [rawLayout, positionStart, fretCount]
  );

  const filteredLayout = useMemo(
    () => filterFretboardLayoutByDegreeClasses(trimmedLayout, visibleDegreeClasses),
    [trimmedLayout, visibleDegreeClasses]
  );

  const options = useMemo(
    () => ({
      stringCount: tuningLabels.length || 6,
      tuningLabels,
      fretCount: filteredLayout?.fretCount || 4,
      hasZeroFret: filteredLayout?.positionStart === 0,
    }),
    [filteredLayout, tuningLabels]
  );

  return React.createElement(SharedFretboard, {
    active: true,
    options,
    draw: (fretboard, canvas) =>
      drawTrimmedFretboardLayout(fretboard, canvas, filteredLayout, {
        stringCount: tuningLabels.length || 6,
        tuningLabels,
      }),
  });
}
```

Keep music-theory-specific derivation, such as scale note generation and position computation,
outside this module.
