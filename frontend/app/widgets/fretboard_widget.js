import React, { useEffect, useMemo, useRef } from "https://esm.sh/react@18";
import { createFretboard } from "fretboard";

function normalizeOptions(options) {
  return {
    fretCount: 4,
    hasZeroFret: false,
    displayAtFret: 1,
    boardHeight: 240,
    fontFamily: "Alegreya Sans",
    showStringNumbers: true,
    stringCount: 6,
    tuningLabels: null,
    ...(options || {}),
  };
}

export function SharedFretboard({
  active = true,
  className = "canvas-wrap",
  canvasClassName = "",
  options,
  draw,
}) {
  const canvasRef = useRef(null);
  const fretboardRef = useRef(null);
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);
  const optionsSignature = JSON.stringify(normalizedOptions);

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    fretboardRef.current = createFretboard(canvasRef.current, normalizedOptions);
  }, [optionsSignature, normalizedOptions]);

  useEffect(() => {
    if (!active || !fretboardRef.current || !canvasRef.current) {
      return;
    }

    const current = fretboardRef.current;
    if (typeof draw !== "function") {
      current.clear();
      current.drawBlank(current.options.hasZeroFret);
      return;
    }

    const nextFretboard = draw(current, canvasRef.current);
    fretboardRef.current = nextFretboard || current;
  }, [active, draw, optionsSignature]);

  return React.createElement(
    "div",
    { className },
    React.createElement("canvas", {
      className: canvasClassName,
      ref: canvasRef,
    })
  );
}
