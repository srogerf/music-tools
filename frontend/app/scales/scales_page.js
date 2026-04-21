import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18";
import {
  buildScaleNotes,
  computeFretboardLayout,
  drawScaleLayout,
  filterLayoutByIntervalGroups,
} from "fretboard-layout";
import { CAGED_SHAPES } from "scales-layout";
import { SharedFretboard } from "shared-fretboard";
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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function findScaleByRouteValue(scales, routeValue) {
  const normalized = normalizeText(routeValue);
  if (!normalized) {
    return null;
  }
  return (
    scales.find((scale) => normalizeText(scale.name) === normalized) ||
    scales.find((scale) => normalizeText(scale.common_name) === normalized) ||
    null
  );
}

function findTuningByRouteValue(tunings, routeValue) {
  const normalized = normalizeText(routeValue);
  if (!normalized) {
    return null;
  }
  return tunings.find((tuning) => normalizeText(tuning.name) === normalized) || null;
}

export function ScalesPage({ active, routeState, onRouteChange }) {
  const [scales, setScales] = useState([]);
  const [selectedScaleId, setSelectedScaleId] = useState(1);
  const [selectedKey, setSelectedKey] = useState(routeState?.key || "C");
  const [selectedPosition, setSelectedPosition] = useState(
    CAGED_SHAPES.includes(routeState?.position) ? routeState.position : "E"
  );
  const [tunings, setTunings] = useState([]);
  const [selectedTuningId, setSelectedTuningId] = useState(1);
  const [layoutInstances, setLayoutInstances] = useState([]);
  const [error, setError] = useState("");
  const [visibleGroups, setVisibleGroups] = useState({
    oneFive: true,
    threeSeven: true,
    twoFourSix: true,
  });
  const [useThreeNps, setUseThreeNps] = useState(Boolean(routeState?.threeNps));

  useEffect(() => {
    fetchJSON("/api/v1/scales", "scales")
      .then((data) => {
        const list = data.scales || [];
        setScales(list);
        setSelectedScaleId((current) => {
          if (list.some((scale) => scale.id === Number(current))) {
            return current;
          }
          const routeScale = findScaleByRouteValue(list, routeState?.scale);
          return (routeScale ?? list[0])?.id ?? current;
        });
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
        setSelectedTuningId((current) => {
          if (list.some((tuning) => tuning.id === Number(current))) {
            return current;
          }
          const routeTuning = findTuningByRouteValue(list, routeState?.tuning);
          const standard = list.find((tuning) => tuning.name === DEFAULT_TUNING_NAME);
          return (routeTuning ?? standard ?? list[0])?.id ?? current;
        });
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

  useEffect(() => {
    if (scales.length === 0) {
      return;
    }
    const routeScale = findScaleByRouteValue(scales, routeState?.scale);
    if (routeScale) {
      setSelectedScaleId((current) =>
        routeScale.id === Number(current) ? current : routeScale.id
      );
    }
  }, [routeState?.scale, scales]);

  useEffect(() => {
    if (tunings.length === 0) {
      return;
    }
    const routeTuning = findTuningByRouteValue(tunings, routeState?.tuning);
    if (routeTuning) {
      setSelectedTuningId((current) =>
        routeTuning.id === Number(current) ? current : routeTuning.id
      );
    }
  }, [routeState?.tuning, tunings]);

  useEffect(() => {
    if (routeState?.key && DEFAULT_KEYS.includes(routeState.key)) {
      setSelectedKey((current) => (current === routeState.key ? current : routeState.key));
    }
  }, [routeState?.key]);

  useEffect(() => {
    if (routeState?.position && CAGED_SHAPES.includes(routeState.position)) {
      setSelectedPosition((current) =>
        current === routeState.position ? current : routeState.position
      );
    }
  }, [routeState?.position]);

  useEffect(() => {
    const nextThreeNps = Boolean(routeState?.threeNps);
    setUseThreeNps((current) => (current === nextThreeNps ? current : nextThreeNps));
  }, [routeState?.threeNps]);

  const selectedTuning = useMemo(
    () => tunings.find((tuning) => tuning.id === Number(selectedTuningId)),
    [tunings, selectedTuningId]
  );
  const tuningStrings = selectedTuning?.strings?.length ? selectedTuning.strings : [];
  const tuningLabels = useMemo(() => [...tuningStrings].reverse(), [tuningStrings]);

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
    const familyCode = useThreeNps ? "3nps" : "standard";
    return (
      scaleLayout?.layout_families?.[familyCode]?.positions?.[selectedPosition] ||
      scaleLayout?.layout_families?.standard?.positions?.[selectedPosition] ||
      scaleLayout?.positions?.[selectedPosition] ||
      null
    );
  }, [selectedLayoutInstance, selectedScale, selectedPosition, useThreeNps]);

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

  const fretboardOptions = useMemo(
    () => ({
      fretCount: 4,
      hasZeroFret: false,
      displayAtFret: 1,
      boardHeight: 240,
      fontFamily: "Alegreya Sans",
      showStringNumbers: true,
      stringCount: tuningStrings.length || 6,
      tuningLabels: tuningStrings.length > 0 ? tuningLabels : null,
    }),
    [tuningStrings, tuningLabels]
  );

  const drawScaleFretboard = useMemo(() => (fretboard, canvas) => {
    if (!selectedScale || tuningStrings.length === 0 || !selectedLayoutInstance) {
      fretboard.clear();
      fretboard.drawBlank(fretboard.options.hasZeroFret);
      return fretboard;
    }

    const positionLayout = selectedPositionLayout;
    if (!positionLayout) {
      fretboard.clear();
      fretboard.drawBlank(fretboard.options.hasZeroFret);
      return fretboard;
    }

    const trimmed = computeFretboardLayout({
      scale: selectedScale,
      key: selectedKey,
      tuningStrings,
      positionLayout,
      positionName: selectedPosition,
      useThreeNps,
    });
    if (!trimmed) {
      fretboard.clear();
      fretboard.drawBlank(fretboard.options.hasZeroFret);
      return fretboard;
    }

    const filtered = filterLayoutByIntervalGroups(trimmed, visibleDegreeClasses);
    return drawScaleLayout(fretboard, canvas, tuningStrings, tuningLabels, filtered);
  }, [
    selectedScale,
    selectedKey,
    selectedPosition,
    tuningStrings,
    tuningLabels,
    selectedLayoutInstance,
    selectedPositionLayout,
    visibleDegreeClasses,
    useThreeNps,
  ]);

  useEffect(() => {
    if (!onRouteChange || !selectedScale || !selectedTuning) {
      return;
    }
    onRouteChange({
      scale: selectedScale.name,
      key: selectedKey,
      position: selectedPosition,
      tuning: selectedTuning.name,
      threeNps: useThreeNps,
    });
  }, [
    onRouteChange,
    selectedKey,
    selectedPosition,
    selectedScale,
    selectedTuning,
    useThreeNps,
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
      React.createElement(SharedFretboard, {
        active,
        options: fretboardOptions,
        draw: drawScaleFretboard,
      }),
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
        ),
        React.createElement("div", { className: "filter-divider", "aria-hidden": "true" }),
        React.createElement(
          "label",
          { className: "filter-row", key: "threeNps" },
          React.createElement("input", {
            type: "checkbox",
            checked: useThreeNps,
            onChange: (event) => setUseThreeNps(event.target.checked),
          }),
          React.createElement("span", { className: "filter-label" }, "3NPS")
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
                  useThreeNps
                    ? "status-generated"
                    : selectedPositionLayout?.validated_manual
                      ? "status-valid"
                      : "status-invalid"
                }`,
              },
              useThreeNps ? "Generated" : `${selectedPositionLayout?.validated_manual ? "✓" : "✕"}`
            )
          )
        )
      )
    )
  );
}
