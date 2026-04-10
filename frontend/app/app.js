import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18";
import { createRoot } from "https://esm.sh/react-dom@18/client";
import { createFretboard } from "/fretboard/index.js";
import { CAGED_SHAPES } from "/scales_layout.js";
import { DEFAULT_KEYS, DEFAULT_TUNING_NAME } from "/defaults.js";

const SHARP_SCALE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_SCALE = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SHARP_INDEX = Object.fromEntries(SHARP_SCALE.map((note, i) => [note, i]));
const FLAT_INDEX = Object.fromEntries(FLAT_SCALE.map((note, i) => [note, i]));

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
  perStringFrets,
  tuningStrings,
}) {
  const layout = {};
  const openIndexes = tuningStrings.map((note) => indexMap[note]);

  for (let stringIndex = 0; stringIndex < tuningStrings.length; stringIndex += 1) {
    const notes = [];
    const openIndex = openIndexes[stringIndex];
    const allowedFrets = perStringFrets?.[stringIndex] ? new Set(perStringFrets[stringIndex]) : null;
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
      if (allowedFrets && !allowedFrets.has(actualFret)) {
        notes.push({ Present: false });
        continue;
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

function App() {
  const [scales, setScales] = useState([]);
  const [selectedScaleId, setSelectedScaleId] = useState(1);
  const [selectedKey, setSelectedKey] = useState("C");
  const [selectedPosition, setSelectedPosition] = useState("E");
  const [tunings, setTunings] = useState([]);
  const [selectedTuningId, setSelectedTuningId] = useState(1);
  const [layoutInstances, setLayoutInstances] = useState([]);
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
    fetch("/api/v1/tunings")
      .then((res) => res.json())
      .then((data) => {
        const list = data.tunings || [];
        setTunings(list);
        if (list.length > 0) {
          const standard = list.find((tuning) => tuning.name === DEFAULT_TUNING_NAME);
          setSelectedTuningId((standard ?? list[0]).id);
        }
      })
      .catch((err) => {
        setError(`Failed to load tunings: ${err.message}`);
      });
  }, []);

  useEffect(() => {
    fetch("/api/v1/scales/layouts/instances")
      .then((res) => res.json())
      .then((data) => {
        setLayoutInstances(data.tunings || []);
      })
      .catch((err) => {
        setError(`Failed to load layout instances: ${err.message}`);
      });
  }, []);

  const selectedTuning = useMemo(
    () => tunings.find((tuning) => tuning.id === Number(selectedTuningId)),
    [tunings, selectedTuningId]
  );
  const tuningStrings = selectedTuning?.strings?.length ? selectedTuning.strings : [];
  const tuningLabels = [...tuningStrings].reverse();

  useEffect(() => {
    if (!canvasRef.current || tuningStrings.length === 0) return;
    const nextStringCount = tuningStrings.length;
    const nextLabels = tuningLabels;
    if (
      !fretboardRef.current ||
      fretboardRef.current.options.stringCount !== nextStringCount
    ) {
      fretboardRef.current = createFretboard(canvasRef.current, {
        fretCount: 4,
        displayAtFret: 1,
        boardHeight: 240,
        fontFamily: "Alegreya Sans",
        showStringNumbers: true,
        stringCount: nextStringCount,
        tuningLabels: nextLabels,
      });
      return;
    }
    fretboardRef.current.options.tuningLabels = nextLabels;
  }, [tuningStrings, tuningLabels]);

  const selectedScale = useMemo(
    () => scales.find((scale) => scale.id === Number(selectedScaleId)),
    [scales, selectedScaleId]
  );
  const selectedLayoutInstance = useMemo(
    () => layoutInstances.find((entry) => entry.id === Number(selectedTuningId)),
    [layoutInstances, selectedTuningId]
  );
  const selectedPositionLayout = useMemo(() => {
    if (!selectedLayoutInstance || !selectedScale) {
      return null;
    }
    const scaleLayout = selectedLayoutInstance.scales?.find(
      (scale) => scale.id === selectedScale.id
    );
    return scaleLayout?.positions?.[selectedPosition] || null;
  }, [selectedLayoutInstance, selectedScale, selectedPosition]);

  const scaleNotes = useMemo(() => {
    if (!selectedScale) return [];
    return buildScaleNotes(selectedKey, selectedScale.intervals).notes;
  }, [selectedScale, selectedKey]);

  useEffect(() => {
    if (
      !fretboardRef.current ||
      !selectedScale ||
      tuningStrings.length === 0 ||
      !selectedLayoutInstance
    ) {
      return;
    }

    const { rootIndex, noteSet, intervalMap, noteNames, indexMap } = buildScaleNotes(
      selectedKey,
      selectedScale.intervals
    );
    const layoutRootIndex = rootIndex;

    const positionLayout = selectedPositionLayout;
    if (!positionLayout) {
      return;
    }

    let startFret = 0;
    let fretCount = 4;
    let perStringRanges = null;

    if (positionLayout.mode === "split") {
      const ranges = {};
      let minStart = Number.POSITIVE_INFINITY;
      let maxEnd = Number.NEGATIVE_INFINITY;
      Object.entries(positionLayout.per_string || {}).forEach(([stringIndex, range]) => {
        const start = range.start + layoutRootIndex;
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
      startFret = (positionLayout.start || 0) + layoutRootIndex;
      fretCount = positionLayout.span || 4;
    }

    let perStringFrets = null;
    if (positionLayout.per_string_frets) {
      perStringFrets = {};
      let minFret = Number.POSITIVE_INFINITY;
      let maxFret = Number.NEGATIVE_INFINITY;
      Object.entries(positionLayout.per_string_frets).forEach(([stringIndex, frets]) => {
        const shifted = frets.map((fret) => fret + layoutRootIndex);
        perStringFrets[Number(stringIndex)] = shifted;
        for (const fret of shifted) {
          if (fret < minFret) minFret = fret;
          if (fret > maxFret) maxFret = fret;
        }
      });
      if (minFret < Number.POSITIVE_INFINITY && maxFret > Number.NEGATIVE_INFINITY) {
        startFret = minFret;
        fretCount = maxFret - minFret + 1;
      }
    }
    const positionStart = startFret;

    if (fretboardRef.current.options.fretCount !== fretCount) {
      fretboardRef.current = createFretboard(canvasRef.current, {
        ...fretboardRef.current.options,
        stringCount: tuningStrings.length,
        fretCount,
        tuningLabels,
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
      perStringFrets,
      tuningStrings,
    });

    fretboardRef.current.clear();
    fretboardRef.current.drawBlank();
    fretboardRef.current.drawLayout({ Layout: layout, PositionStart: positionStart });
  }, [
    selectedScale,
    selectedKey,
    selectedPosition,
    tuningStrings,
    tuningLabels,
    selectedLayoutInstance,
    selectedPositionLayout,
  ]);

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
            DEFAULT_KEYS.map((key) => React.createElement("option", { key, value: key }, key))
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
        "section",
        { className: "info-bar" },
        React.createElement(
          "table",
          { className: "info-table" },
          React.createElement(
            "thead",
            null,
              React.createElement(
              "tr",
              null,
              React.createElement("th", { className: "info-label" }, "Scale Notes"),
              React.createElement("th", { className: "info-label" }, "Tuning"),
              React.createElement("th", { className: "info-label validated-label" }, "Validated")
            )
          ),
          React.createElement(
            "tbody",
            null,
            React.createElement(
              "tr",
              null,
              React.createElement(
                "td",
                { className: "info-value" },
                React.createElement(
                  "div",
                  { className: "note-list" },
                  scaleNotes.map((note) =>
                    React.createElement("span", { className: "note-pill", key: note }, note)
                  )
                )
              ),
              React.createElement(
                "td",
                { className: "info-value" },
                selectedTuning?.name || DEFAULT_TUNING_NAME
              ),
              React.createElement(
                "td",
                {
                  className: `info-value validated-cell ${
                    selectedPositionLayout?.validated_manual ? "status-valid" : "status-invalid"
                  }`,
                },
                `${selectedPositionLayout?.validated_manual ? "✓" : "✕"}`
              )
            )
          )
        )
      )
    )
  );
}

const root = createRoot(document.getElementById("root"));
root.render(React.createElement(App));
