# Fretboard Canvas Module

Generic, framework-agnostic fretboard renderer for an HTML canvas.

If you are working inside the React application, prefer the shared wrapper documented in
`frontend/app/widgets/README.md`. Use this module directly when you need low-level canvas access.

## Usage

```js
import { createFretboard } from "./fretboard/index.js";

const canvas = document.getElementById("fretboard");
const fb = createFretboard(canvas, {
  fretCount: 6,
  stringCount: 6,
});

fb.clear();
fb.drawBlank();

// Draw a backend layout response
fetch("/api/layouts?key=C&scale=maj&tuning=standard&position=C")
  .then((r) => r.json())
  .then((layout) => {
    fb.drawLayout(layout);
  });
```

## API

- `createFretboard(canvas, options)`
  - `clear()`
  - `drawBlank()`
  - `drawLayout(layoutOrResponse, positionStartOverride)`
  - `drawNote(stringNumber, fretNumber, note)`
  - `labelFrets(startLabel)`

## Options

- `origin`: `{ x, y }`
- `fretGap`: number
- `stringInset`: number
- `stringCount`: number
- `fretCount`: number
- `boardHeight`: number
- `displayAtFret`: number
- `intervalColors`: string[]
- `intervalNames`: string[]
- `fontFamily`: string
- `fontSize`: string
- `showStringNumbers`: boolean
