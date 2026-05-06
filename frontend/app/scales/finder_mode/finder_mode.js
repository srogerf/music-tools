import React from "https://esm.sh/react@18";

const FINDER_INTERVALS = [
  { semitones: 0, label: "Root" },
  { semitones: 1, label: "m2" },
  { semitones: 2, label: "M2" },
  { semitones: 3, label: "m3" },
  { semitones: 4, label: "M3" },
  { semitones: 5, label: "P4" },
  { semitones: 6, label: "TT" },
  { semitones: 7, label: "P5" },
  { semitones: 8, label: "m6" },
  { semitones: 9, label: "M6" },
  { semitones: 10, label: "m7" },
  { semitones: 11, label: "M7" },
];

function scaleIntervalLabels(scale) {
  return (scale.intervals || [])
    .map((interval) => (typeof interval === "number" ? interval : interval?.semitones))
    .filter((interval) => Number.isFinite(interval))
    .map((interval) => FINDER_INTERVALS.find((item) => item.semitones === interval)?.label || String(interval));
}

export function FinderModePanel({
  finderOpen,
  finderSelectedIntervals,
  finderSearchRequested,
  matchingFinderScales,
  onToggleInterval,
  onSearch,
  onReset,
  onSelectScale,
}) {
  if (!finderOpen) {
    return null;
  }

  return React.createElement(
    "section",
    { className: "learning-drawer" },
    React.createElement(
      "div",
      { className: "learning-panel" },
      React.createElement(
        "p",
        { className: "learning-summary finder-summary" },
        "Choose a set of intervals to search, then see which scales match."
      ),
      React.createElement(
        "div",
        { className: "finder-controls" },
        React.createElement("span", { className: "control-label control-label-inline" }, "Intervals"),
        React.createElement(
          "div",
          { className: "learning-note-picker finder-interval-picker" },
          React.createElement(
            "div",
            {
              className: "learning-note-grid finder-interval-grid",
              role: "group",
              "aria-label": "Finder intervals",
            },
            FINDER_INTERVALS.map((interval) =>
              React.createElement(
                "button",
                {
                  key: interval.semitones,
                  type: "button",
                  className: `note-choice ${
                    finderSelectedIntervals.includes(interval.semitones) ? "note-choice-selected" : ""
                  }`,
                  "aria-pressed": finderSelectedIntervals.includes(interval.semitones),
                  onClick: () => onToggleInterval(interval.semitones),
                },
                interval.label
              )
            )
          )
        ),
        React.createElement(
          "button",
          {
            type: "button",
            className: "secondary-button",
            disabled: finderSelectedIntervals.length === 0,
            onClick: onSearch,
          },
          "Search"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            className: "secondary-button",
            onClick: onReset,
          },
          "Reset"
        )
      ),
      finderSearchRequested &&
        React.createElement(
          "div",
          { className: "finder-results-section" },
          React.createElement(
            "div",
            { className: "finder-results-header" },
            React.createElement("span", { className: "control-label control-label-inline" }, "Matches")
          ),
          React.createElement(
            "div",
            { className: "learning-result" },
            matchingFinderScales.length > 0
              ? matchingFinderScales.map((scale) =>
                  React.createElement(
                    "button",
                    {
                      key: scale.id,
                      type: "button",
                      className: "learning-answer finder-result-row",
                      onClick: () => onSelectScale(scale),
                    },
                    React.createElement("span", null, scale.name),
                    React.createElement("span", null, scaleIntervalLabels(scale).join(" - "))
                  )
                )
              : React.createElement(
                  "div",
                  { className: "learning-result-status status-invalid" },
                  "No matching scales"
                )
          )
        )
    )
  );
}
