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

## `SharedFretboardLayout`

`SharedFretboardLayout` is the higher-level wrapper for trimmed fretboard
layouts. It combines layout trimming, optional degree-class filtering, and the
shared canvas renderer in one component.

### Props

- `active`
  - When `true`, the widget draws the current board state.
- `className`
  - Wrapper class name. Defaults to `canvas-wrap`.
- `canvasClassName`
  - Optional class name for the `<canvas>` element.
- `layout`
  - The raw layout object to trim and draw.
- `positionStart`
  - The first fret number represented by the layout.
- `fretCount`
  - The width of the layout before trimming.
- `visibleDegreeClasses`
  - Optional `Set` of degree classes to keep visible.
- `options`
  - Base renderer options passed to `createFretboard(...)`.

### Example

```js
import React, { useMemo } from "https://esm.sh/react@18";
import { SharedFretboardLayout } from "shared-fretboard-layout-widget";

function ExamplePage({ layout, tuningLabels }) {
  const options = useMemo(
    () => ({
      stringCount: tuningLabels.length || 6,
      tuningLabels,
    }),
    [tuningLabels]
  );

  return React.createElement(SharedFretboardLayout, {
    active: true,
    layout,
    positionStart: 3,
    fretCount: 5,
    visibleDegreeClasses: new Set([1, 3, 5, 7]),
    options,
  });
}
```

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
