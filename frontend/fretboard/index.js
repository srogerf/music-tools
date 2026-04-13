// Generic fretboard drawing module (canvas-based).
// This module is framework-agnostic and can be used from any UI layer.

const DEFAULT_INTERVAL_COLORS = [
  "#E72F2C", // unison
  "#DC5F48",
  "#D7804A", // maj2
  "#D7AC4D",
  "#FAF132", // maj3
  "#83BC45", // p4
  "#5DB353",
  "#60BC7A", // p5
  "#65C39F",
  "#68C8C7", // maj6
  "#4EAFD9",
  "#527BC2", // maj7
  "#3C48A1"  // octave
];

const DEFAULT_INTERVAL_NAMES = [
  "root",
  "m2",
  "M2",
  "m3",
  "M3",
  "p4",
  "tri",
  "p5",
  "m6",
  "M6",
  "b7",
  "7"
];

const DEFAULT_OPTIONS = {
  origin: { x: 40, y: 20 },
  fretGap: 120,
  stringInset: 30,
  stringCount: 6,
  fretCount: 6,
  hasZeroFret: false,
  boardHeight: 300,
  displayAtFret: 2,
  intervalColors: DEFAULT_INTERVAL_COLORS,
  intervalNames: DEFAULT_INTERVAL_NAMES,
  fontFamily: "Arial",
  fontSize: "14px",
  showStringNumbers: true,
  tuningLabels: null,
};

function mergeOptions(overrides) {
  return { ...DEFAULT_OPTIONS, ...(overrides || {}) };
}

function getBoardSize(options) {
  return {
    w: (options.fretCount * options.fretGap) + (options.fretGap / 2),
    h: options.boardHeight,
  };
}

function getCanvasSize(options, size) {
  const leftPadding = Math.max(options.origin.x + 8, 56);
  const rightPadding = 20;
  const topPadding = options.origin.y + 16;
  const bottomPadding = 24;
  return {
    width: leftPadding + size.w + rightPadding,
    height: topPadding + size.h + bottomPadding,
  };
}

export function createFretboard(canvas, optionsOverride) {
  if (!canvas) {
    throw new Error("createFretboard: canvas is required");
  }

  const options = mergeOptions(optionsOverride);
  const size = getBoardSize(options);
  const canvasSize = getCanvasSize(options, size);
  canvas.width = canvasSize.width;
  canvas.height = canvasSize.height;
  const ctx = canvas.getContext("2d");

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawText(text, x, y) {
    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.font = `${options.fontSize} ${options.fontFamily}`;
    ctx.textAlign = "left";
    ctx.strokeText(text, x, y);
    ctx.restore();
  }

  function drawCenteredText(text, x, y) {
    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.font = `${options.fontSize} ${options.fontFamily}`;
    ctx.textAlign = "center";
    ctx.strokeText(text, x, y);
    ctx.restore();
  }

  function getStringVertical(stringNumber) {
    const spacing = (size.h - (2 * options.stringInset)) / (options.stringCount - 1);
    return options.origin.y + spacing * (stringNumber - 1) + options.stringInset;
  }

  function drawGuitar() {
    ctx.fillStyle = "#dedede";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    const rawPath = `M${options.origin.x} ${options.origin.y}h${size.w} v${size.h} H${options.origin.x} Z`;
    const svgPath = new Path2D(rawPath);
    ctx.stroke(svgPath);
  }

  function drawNut() {
    ctx.fillStyle = "#5f4a32";
    ctx.fillRect(options.origin.x - 4, options.origin.y, 8, size.h);
  }

  function drawFret(x, y, width, length) {
    const curve = 10;
    const rawPath = `M${x - width / 2} ${y}`
      + ` Q${x} ${y - curve} ${x + width / 2} ${y}`
      + ` V${length}`
      + ` Q${x} ${length + curve} ${x - width / 2} ${length}`
      + " Z";
    const svgPath = new Path2D(rawPath);
    ctx.fillStyle = "#dedede";
    ctx.fill(svgPath);
    ctx.stroke(svgPath);
  }

  function drawFrets() {
    const startWire = options.hasZeroFret ? 1 : 0;
    const endWire = options.hasZeroFret ? options.fretCount - 1 : options.fretCount;
    for (let f = startWire; f <= endWire; f++) {
      drawFret((f * options.fretGap) + options.origin.x, options.origin.y, 10, size.h + options.origin.y);
    }
  }

  function drawString(x, y, length, weight) {
    const rawPath = `M${x} ${y} h${length}`;
    const svgPath = new Path2D(rawPath);
    ctx.lineWidth = weight;
    ctx.stroke(svgPath);
  }

  function drawStrings() {
    const spacing = (size.h - (2 * options.stringInset)) / (options.stringCount - 1);
    for (let s = 0; s < options.stringCount; s++) {
      const stringOrigin = {
        x: options.origin.x,
        y: options.origin.y + (spacing * s) + options.stringInset,
      };
      drawString(stringOrigin.x, stringOrigin.y, size.w, s);
      if (options.showStringNumbers) {
        drawText(String(s + 1), stringOrigin.x - 15, stringOrigin.y + 5);
      }
      if (options.tuningLabels && options.tuningLabels[s]) {
        drawText(String(options.tuningLabels[s]), stringOrigin.x - 35, stringOrigin.y + 5);
      }
    }
  }

  function getColumnCenter(columnIndex, hasZeroFret) {
    if (hasZeroFret) {
      return columnIndex === 0
        ? options.origin.x
        : options.origin.x + (options.fretGap * columnIndex) - (options.fretGap / 2);
    }
    return options.origin.x + (columnIndex * options.fretGap) + (options.fretGap / 2);
  }

  function labelFret(label, columnIndex, hasZeroFret) {
    const x = getColumnCenter(columnIndex, hasZeroFret);
    const y = options.origin.y - 8;
    drawCenteredText(String(label), x, y);
  }

  function labelFrets(startLabel, fretLabels) {
    const hasZeroFret = Array.isArray(fretLabels) && fretLabels.length > 0
      ? fretLabels[0] === 0
      : parseInt(startLabel, 10) === 0;

    if (Array.isArray(fretLabels) && fretLabels.length > 0) {
      fretLabels.forEach((label, index) => {
        labelFret(label, index, hasZeroFret);
      });
      return;
    }

    const base = parseInt(startLabel, 10);
    for (let f = 0; f < options.fretCount; f++) {
      labelFret(f + base, f, hasZeroFret);
    }
  }

  function drawBlank(showNut = false) {
    drawGuitar();
    if (showNut) {
      drawNut();
    }
    drawFrets();
    drawStrings();
  }

  function drawNoteAt(stringNumber, x, note) {
    const y = getStringVertical(stringNumber);

    const interval = note.Interval;
    ctx.fillStyle = options.intervalColors[interval] || "#000000";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fill();

    if (interval === 0) {
      ctx.strokeStyle = options.intervalColors[interval] || "#000000";
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, 2 * Math.PI);
      ctx.stroke();
    }

    const intervalLabel = note.IntervalLabel || options.intervalNames[interval];
    const noteLabel = note.Note;
    if (intervalLabel || noteLabel) {
      const label = intervalLabel && noteLabel ? `${intervalLabel} (${noteLabel})` : (intervalLabel || noteLabel);
      drawText(label, x + 11, y + 15);
    }
  }

  function drawNote(stringNumber, columnIndex, note, hasZeroFret) {
    const x = getColumnCenter(columnIndex, hasZeroFret);
    drawNoteAt(stringNumber, x, note);
  }

  // Accepts backend layout format: { Layout: { "0": [StringNote], ... }, PositionStart: int }
  // or a direct layout map/array with provided positionStart.
  function drawLayout(layoutInput, positionStartOverride) {
    if (!layoutInput) {
      return;
    }

    let layout = layoutInput;
    let positionStart = positionStartOverride;
    let fretLabels = null;

    if (layoutInput.Layout) {
      layout = layoutInput.Layout;
      positionStart = layoutInput.PositionStart;
      fretLabels = layoutInput.FretLabels || null;
    }

    if (typeof positionStart === "number") {
      labelFrets(positionStart, fretLabels);
    }

    const hasZeroFret = Array.isArray(fretLabels) && fretLabels.length > 0
      ? fretLabels[0] === 0
      : positionStart === 0;

    for (const stringIndex in layout) {
      const stringNotes = layout[stringIndex];
      for (let i = 0; i < stringNotes.length; i++) {
        const note = stringNotes[i];
        if (note && note.Present) {
          const stringNumber = options.stringCount - parseInt(stringIndex, 10);
          drawNote(stringNumber, i, note, hasZeroFret);
        }
      }
    }
  }

  return {
    clear,
    drawBlank,
    drawLayout,
    drawNote,
    labelFrets,
    options,
    size,
  };
}
