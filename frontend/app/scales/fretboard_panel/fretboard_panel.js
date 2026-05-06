import React from "https://esm.sh/react@18";
import { SharedFretboard } from "shared-fretboard";

export function FretboardPanel({ active, options, draw }) {
  return React.createElement(SharedFretboard, {
    active,
    options,
    draw,
  });
}
