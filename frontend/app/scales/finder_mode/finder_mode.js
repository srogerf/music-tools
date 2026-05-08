import React from "https://esm.sh/react@18";
import { scaleOptionLabel } from "../scales_controller/scales_controller_helpers.js";
import { intervalLabelForScale } from "../../fretboard/fretboard_note_helpers.js";

const FINDER_INTERVALS = [
  { semitones: 0, label: "root" },
  { semitones: 1, label: "b2" },
  { semitones: 2, label: "2" },
  { semitones: 3, label: "b3" },
  { semitones: 4, label: "3" },
  { semitones: 5, label: "4" },
  { semitones: 6, label: "#4/b5" },
  { semitones: 7, label: "5" },
  { semitones: 8, label: "b6" },
  { semitones: 9, label: "6" },
  { semitones: 10, label: "b7" },
  { semitones: 11, label: "7" },
];

function scaleIntervalLabels(scale) {
  const scaleLength = (scale.intervals || []).length;
  return (scale.intervals || []).map((interval, degreeIndex) =>
    intervalLabelForScale(interval, scaleLength, degreeIndex + 1)
  );
}

function scaleHoverDescription(scale) {
  const lines = [scaleOptionLabel(scale)];
  if (scale?.description) {
    lines.push(scale.description);
  }
  if ((scale?.aliases || []).length > 0) {
    lines.push(`Also known as: ${scale.aliases.join(", ")}`);
  }
  return lines.join("\n");
}

export function FinderModePanel({
  finderOpen,
  finderSelectedIntervals,
  finderSearchRequested,
  matchingFinderScales,
  finderComprehensive,
  onToggleInterval,
  onSearch,
  onReset,
  onSelectScale,
  onComprehensiveChange,
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
        "div",
        { className: "finder-summary-row" },
        React.createElement(
          "p",
          { className: "learning-summary finder-summary" },
          "Choose a set of intervals to search, then see which scales match."
        ),
        React.createElement(
          "label",
          { className: "learning-family-choice finder-comprehensive-choice" },
          React.createElement("input", {
            type: "checkbox",
            checked: finderComprehensive,
            onChange: () => onComprehensiveChange(!finderComprehensive),
          }),
          React.createElement("span", null, "Comprehensive")
        )
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
            matchingFinderScales.withLayout.length > 0
              ? matchingFinderScales.withLayout.map((scale) =>
                  React.createElement(
                    "button",
                    {
                      key: scale.id,
                      type: "button",
                      className: "learning-answer finder-result-row",
                      title: scaleHoverDescription(scale),
                      onClick: () => onSelectScale(scale),
                    },
                    React.createElement("span", null, scaleOptionLabel(scale)),
                    React.createElement("span", null, scaleIntervalLabels(scale).join(" - "))
                  )
                )
              : React.createElement(
                  "div",
                  { className: "learning-result-status status-invalid" },
                  "No matching scales"
                )
          )
        ),
      finderComprehensive &&
        finderSearchRequested &&
        matchingFinderScales.withoutLayout.length > 0 &&
        React.createElement(
          "div",
          { className: "finder-results-section finder-results-no-layout" },
          React.createElement(
            "div",
            { className: "finder-results-header" },
            React.createElement("span", { className: "control-label control-label-inline" }, "No layout")
          ),
          React.createElement(
            "div",
            { className: "learning-result" },
            matchingFinderScales.withoutLayout.map((scale) =>
              React.createElement(
                "div",
                {
                  key: scale.id,
                  className: "learning-answer finder-result-row finder-result-no-layout",
                  role: "button",
                  "aria-disabled": true,
                  title: scaleHoverDescription(scale),
                },
                React.createElement("span", null, scaleOptionLabel(scale)),
                React.createElement("span", null, scaleIntervalLabels(scale).join(" - "))
              )
            )
          )
        )
    )
  );
}
