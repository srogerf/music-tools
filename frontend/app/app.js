import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import { createFretboard } from "/fretboard/index.js";
import {
  CAGED_BASE_STARTS,
  CAGED_MIN_SPANS,
  CAGED_ROOT_OFFSETS,
  CAGED_SHAPES,
  CAGED_SPLIT_RANGES,
} from "/scales_layout.js";

const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const SHARP_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_SCALE = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SHARP_INDEX = Object.fromEntries(SHARP_SCALE.map((note, i) => [note, i]));
const FLAT_INDEX = Object.fromEntries(FLAT_SCALE.map((note, i) => [note, i]));
const STANDARD_TUNING = ["E", "A", "D", "G", "B", "E"]; // low to high

function shouldUseFlats(key) {
  if (key.includes("b")) return true;
  if (key.includes("#")) return false;
  return ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"].includes(key);
}

function normalizeKey(key) {
  if (!key) return "";
  const trimmed = key.trim();
  if (!trimmed) return "";
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function buildScaleNotes(key, intervals) {
  const normalized = normalizeKey(key);
  const useFlats = shouldUseFlats(normalized);
  const noteNames = useFlats ? FLAT_SCALE : SHARP_SCALE;
  const indexMap = useFlats ? FLAT_INDEX : SHARP_INDEX;
  const rootIndex = indexMap[normalized];
  if (rootIndex === undefined) {
    return { rootIndex: 0, notes: [], noteSet: new Set(), intervalMap: new Map() };
  }

  const notes = intervals.map((interval) => noteNames[(rootIndex + interval) % 12]);
  const noteSet = new Set(notes);
  const intervalMap = new Map();
  intervals.forEach((interval) => {
    intervalMap.set((rootIndex + interval) % 12, interval);
  });

  return { rootIndex, notes, noteSet, intervalMap, noteNames, indexMap };
}

function buildLayout({
  startFret,
  fretCount,
  noteSet,
  intervalMap,
  noteNames,
  indexMap,
  perStringRanges,
}) {
  const layout = {};
  const openIndexes = STANDARD_TUNING.map((note) => indexMap[note]);

  for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex += 1) {
    const notes = [];
    const openIndex = openIndexes[stringIndex];
    for (let i = 0; i < fretCount; i += 1) {
      const actualFret = startFret + i;
      if (perStringRanges && perStringRanges[stringIndex]) {
        const range = perStringRanges[stringIndex];
        const rangeEnd = range.start + range.span - 1;
        if (actualFret < range.start || actualFret > rangeEnd) {
          notes.push({ Present: false });
          continue;
        }
      }

      const pitchClass = (openIndex + actualFret) % 12;
      if (noteSet.has(noteNames[pitchClass])) {
        notes.push({
          Present: true,
          Note: noteNames[pitchClass],
          Interval: intervalMap.get(pitchClass) ?? 0,
        });
      } else {
        notes.push({ Present: false });
      }
    }
    layout[String(stringIndex)] = notes;
  }

  return layout;
}

function buildLayoutNotes({ startFret, fretCount, noteSet, noteNames, indexMap }) {
  const openIndexes = STANDARD_TUNING.map((note) => indexMap[note]);
  const notesInWindow = new Set();

  for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex += 1) {
    const openIndex = openIndexes[stringIndex];
    for (let i = 0; i < fretCount; i += 1) {
      const pitchClass = (openIndex + startFret + i) % 12;
      const name = noteNames[pitchClass];
      if (noteSet.has(name)) {
        notesInWindow.add(name);
      }
    }
  }

  return notesInWindow;
}

function chooseFretCountForWindow(startFret, noteSet, noteNames, indexMap, minSpan, rootOffsets) {
  const maxFretSpan = 12;
  const requiredSpan = rootOffsets && rootOffsets.length > 0 ? Math.max(...rootOffsets) + 1 : 4;
  const startSpan = Math.max(4, minSpan || 4, requiredSpan);
  for (let span = startSpan; span <= maxFretSpan; span += 1) {
    const covered = buildLayoutNotes({
      startFret,
      fretCount: span,
      noteSet,
      noteNames,
      indexMap,
    });
    if (covered.size === noteSet.size) {
      return span;
    }
  }
  return startSpan;
}

function App() {
  const [scales, setScales] = useState([]);
  const [selectedScaleId, setSelectedScaleId] = useState(1);
  const [selectedKey, setSelectedKey] = useState("C");
  const [selectedPosition, setSelectedPosition] = useState("E");
  const [error, setError] = useState("");

  const canvasRef = useRef(null);
  const fretboardRef = useRef(null);

  useEffect(() => {
    fetch("/api/v1/scales")
      .then((res) => res.json())
      .then((data) => {
        const list = data.scales || [];
        setScales(list);
        if (list.length > 0) {
          setSelectedScaleId(list[0].id);
        }
      })
      .catch((err) => {
        setError(`Failed to load scales: ${err.message}`);
      });
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (!fretboardRef.current) {
      fretboardRef.current = createFretboard(canvasRef.current, {
        fretCount: 4,
        displayAtFret: 1,
        boardHeight: 240,
        fontFamily: "Alegreya Sans",
        showStringNumbers: true,
        tuningLabels: ["E", "B", "G", "D", "A", "E"],
      });
    }
  }, []);

  const selectedScale = useMemo(
    () => scales.find((scale) => scale.id === Number(selectedScaleId)),
    [scales, selectedScaleId]
  );

  const scaleNotes = useMemo(() => {
    if (!selectedScale) return [];
    return buildScaleNotes(selectedKey, selectedScale.intervals).notes;
  }, [selectedScale, selectedKey]);

  useEffect(() => {
    if (!fretboardRef.current || !selectedScale) return;

    const { rootIndex, noteSet, intervalMap, noteNames, indexMap } = buildScaleNotes(
      selectedKey,
      selectedScale.intervals
    );

    const split = CAGED_SPLIT_RANGES[selectedPosition];
    let startFret = 0;
    let fretCount = 4;
    let perStringRanges = null;

    if (split) {
      const ranges = {};
      let minStart = Number.POSITIVE_INFINITY;
      let maxEnd = Number.NEGATIVE_INFINITY;
      Object.entries(split.perString).forEach(([stringIndex, range]) => {
        const start = range.start + rootIndex;
        const span = range.span;
        const end = start + span - 1;
        ranges[Number(stringIndex)] = { start, span };
        if (start < minStart) minStart = start;
        if (end > maxEnd) maxEnd = end;
      });
      perStringRanges = ranges;
      startFret = minStart;
      fretCount = maxEnd - minStart + 1;
    } else {
      const baseStart = CAGED_BASE_STARTS[selectedPosition] ?? CAGED_BASE_STARTS.E;
      startFret = baseStart + rootIndex;
      const minSpan = CAGED_MIN_SPANS[selectedPosition] ?? 4;
      const rootOffsets = CAGED_ROOT_OFFSETS[selectedPosition] ?? [];
      fretCount = chooseFretCountForWindow(
        startFret,
        noteSet,
        noteNames,
        indexMap,
        minSpan,
        rootOffsets
      );
    }
    const positionStart = startFret;

    if (fretboardRef.current.options.fretCount !== fretCount) {
      fretboardRef.current = createFretboard(canvasRef.current, {
        ...fretboardRef.current.options,
        fretCount,
      });
    }

    const layout = buildLayout({
      startFret,
      fretCount,
      noteSet,
      intervalMap,
      noteNames,
      indexMap,
      perStringRanges,
    });

    fretboardRef.current.clear();
    fretboardRef.current.drawBlank();
    fretboardRef.current.drawLayout({ Layout: layout, PositionStart: positionStart });
  }, [selectedScale, selectedKey, selectedPosition]);

  return React.createElement(
    "main",
    null,
    React.createElement(
      "header",
      null,
      React.createElement(
        "div",
        null,
        React.createElement("h1", null, "Rifferone"),
        React.createElement(
          "p",
          { className: "subhead" },
          "Select a scale and key to highlight notes across the fretboard."
        )
      )
    ),
    React.createElement(
      "section",
      { className: "panel" },
      React.createElement(
        "div",
        { className: "controls" },
        React.createElement(
          "div",
          null,
          React.createElement("label", { htmlFor: "scale" }, "Scale"),
          React.createElement(
            "select",
            {
              id: "scale",
              value: selectedScaleId,
              onChange: (event) => setSelectedScaleId(event.target.value),
            },
            scales.map((scale) =>
              React.createElement(
                "option",
                { key: scale.id, value: scale.id },
                `${scale.name} (${scale.common_name})`
              )
            )
          )
        ),
        React.createElement(
          "div",
          null,
          React.createElement("label", { htmlFor: "key" }, "Key"),
          React.createElement(
            "select",
            {
              id: "key",
              value: selectedKey,
              onChange: (event) => setSelectedKey(event.target.value),
            },
            KEYS.map((key) => React.createElement("option", { key, value: key }, key))
          )
        ),
        React.createElement(
          "div",
          null,
          React.createElement("label", { htmlFor: "position" }, "Position (CAGED)"),
          React.createElement(
            "select",
            {
              id: "position",
              value: selectedPosition,
              onChange: (event) => setSelectedPosition(event.target.value),
            },
            CAGED_SHAPES.map((shape) =>
              React.createElement("option", { key: shape, value: shape }, shape)
            )
          )
        )
      ),
      error && React.createElement("p", { className: "subhead" }, error),
      React.createElement(
        "div",
        { className: "canvas-wrap" },
        React.createElement("canvas", { ref: canvasRef, width: 900, height: 320 })
      ),
      React.createElement(
        "div",
        { className: "note-list" },
        scaleNotes.map((note) => React.createElement("span", { className: "note-pill", key: note }, note))
      )
    )
  );
}

const root = createRoot(document.getElementById("root"));
root.render(React.createElement(App));
