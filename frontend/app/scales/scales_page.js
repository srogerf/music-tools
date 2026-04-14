import React, { useEffect, useMemo, useRef, useState } from "https://esm.sh/react@18";
import { createFretboard } from "fretboard";
import {
  buildScaleNotes,
  computeFretboardLayout,
  drawScaleLayout,
  filterLayoutByIntervalGroups,
} from "fretboard-layout";
import { CAGED_SHAPES } from "scales-layout";
import { DEFAULT_KEYS, DEFAULT_TUNING_NAME } from "defaults";

const NOTE_GROUPS = [
  { key: "oneFive", label: "1/5", degreeClasses: [1, 5] },
  { key: "threeSeven", label: "3/7", degreeClasses: [3, 7] },
  { key: "twoFourSix", label: "2/4/6", degreeClasses: [2, 4, 6] },
];

function scaleOptionLabel(scale) {
  if (!scale.common_name || scale.common_name === scale.name) {
    return scale.name;
  }
  return `${scale.name} (${scale.common_name})`;
}

function buildLoadError(resourceName, detail) {
  const suffix = detail ? ` ${detail}` : "";
  return `Couldn't load ${resourceName}.${suffix} Make sure the backend is running and the database has been seeded.`;
}

async function fetchJSON(url, resourceName) {
  let response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    throw new Error(buildLoadError(resourceName, "The server couldn't be reached."));
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.error
      ? `Server said: ${data.error}.`
      : `Server returned ${response.status}.`;
    throw new Error(buildLoadError(resourceName, detail));
  }

  return data;
}

export function ScalesPage({ active }) {
  const [scales, setScales] = useState([]);
  const [selectedScaleId, setSelectedScaleId] = useState(1);
  const [selectedKey, setSelectedKey] = useState("C");
  const [selectedPosition, setSelectedPosition] = useState("E");
  const [tunings, setTunings] = useState([]);
  const [selectedTuningId, setSelectedTuningId] = useState(1);
  const [layoutInstances, setLayoutInstances] = useState([]);
  const [error, setError] = useState("");
  const [visibleGroups, setVisibleGroups] = useState({
    oneFive: true,
    threeSeven: true,
    twoFourSix: true,
  });

  const canvasRef = useRef(null);
  const fretboardRef = useRef(null);

  useEffect(() => {
    fetchJSON("/api/v1/scales", "scales")
      .then((data) => {
        const list = data.scales || [];
        setScales(list);
        if (list.length > 0) {
          setSelectedScaleId(list[0].id);
        }
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  useEffect(() => {
    fetchJSON("/api/v1/tunings", "tunings")
      .then((data) => {
        const list = data.tunings || [];
        setTunings(list);
        if (list.length > 0) {
          const standard = list.find((tuning) => tuning.name === DEFAULT_TUNING_NAME);
          setSelectedTuningId((standard ?? list[0]).id);
        }
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  useEffect(() => {
    fetchJSON("/api/v1/scales/scale_layouts", "scale layouts")
      .then((data) => {
        setLayoutInstances(data.tunings || []);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  const selectedTuning = useMemo(
    () => tunings.find((tuning) => tuning.id === Number(selectedTuningId)),
    [tunings, selectedTuningId]
  );
  const tuningStrings = selectedTuning?.strings?.length ? selectedTuning.strings : [];
  const tuningLabels = [...tuningStrings].reverse();

  useEffect(() => {
    if (!active || !canvasRef.current || tuningStrings.length === 0) return;
    const nextStringCount = tuningStrings.length;
    const nextLabels = tuningLabels;
    if (
      !fretboardRef.current ||
      fretboardRef.current.canvas !== canvasRef.current ||
      fretboardRef.current.options.stringCount !== nextStringCount
    ) {
      fretboardRef.current = createFretboard(canvasRef.current, {
        fretCount: 4,
        hasZeroFret: false,
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
  }, [active, tuningStrings, tuningLabels]);

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
    return buildScaleNotes(selectedKey, selectedScale).notes;
  }, [selectedScale, selectedKey]);

  const visibleDegreeClasses = useMemo(() => {
    const values = new Set();
    NOTE_GROUPS.forEach((group) => {
      if (visibleGroups[group.key]) {
        group.degreeClasses.forEach((degreeClass) => values.add(degreeClass));
      }
    });
    return values;
  }, [visibleGroups]);

  useEffect(() => {
    if (!active) {
      return;
    }
    if (
      !fretboardRef.current ||
      !selectedScale ||
      tuningStrings.length === 0 ||
      !selectedLayoutInstance
    ) {
      return;
    }

    const positionLayout = selectedPositionLayout;
    if (!positionLayout) {
      fretboardRef.current.clear();
      fretboardRef.current.drawBlank();
      return;
    }

    const trimmed = computeFretboardLayout({
      scale: selectedScale,
      key: selectedKey,
      tuningStrings,
      positionLayout,
    });
    if (!trimmed) {
      fretboardRef.current.clear();
      fretboardRef.current.drawBlank();
      return;
    }

    const filtered = filterLayoutByIntervalGroups(trimmed, visibleDegreeClasses);

    fretboardRef.current = drawScaleLayout(
      fretboardRef.current,
      canvasRef.current,
      tuningStrings,
      tuningLabels,
      filtered
    );
  }, [
    selectedScale,
    selectedKey,
    selectedPosition,
    active,
    tuningStrings,
    tuningLabels,
    selectedLayoutInstance,
    selectedPositionLayout,
    visibleDegreeClasses,
  ]);

  return React.createElement(
    "section",
    { className: "panel" },
    React.createElement(
      "div",
      { className: "section-intro" },
      React.createElement("h2", { className: "section-title" }, "Scales"),
      React.createElement(
        "p",
        { className: "subhead" },
        "Select a scale and key to highlight notes across the fretboard."
      )
    ),
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
              scaleOptionLabel(scale)
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
      { className: "diagram-row" },
      React.createElement(
        "div",
        { className: "canvas-wrap" },
        React.createElement("canvas", { ref: canvasRef })
      ),
      React.createElement(
        "div",
        { className: "filter-panel" },
        NOTE_GROUPS.map((group) =>
          React.createElement(
            "label",
            { className: "filter-row", key: group.key },
            React.createElement("input", {
              type: "checkbox",
              checked: visibleGroups[group.key],
              onChange: (event) =>
                setVisibleGroups((current) => ({
                  ...current,
                  [group.key]: event.target.checked,
                })),
            }),
            React.createElement("span", { className: "filter-label" }, group.label)
          )
        )
      )
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
  );
}
