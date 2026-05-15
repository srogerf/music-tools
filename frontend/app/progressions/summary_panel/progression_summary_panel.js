import React from "https://esm.sh/react@18";

export function ProgressionSummaryPanel({
  comprehensive,
  onComprehensiveChange,
  progressionSummary,
  selectedSavedProgressionId,
  onSelectedSavedProgressionIdChange,
  savedProgressions,
  onNew,
  onLoad,
  onSave,
  saveStatus,
}) {
  return React.createElement(
    "div",
    { className: "progression-summary-card" },
    React.createElement(
      "div",
      { className: "finder-summary-row" },
      React.createElement("p", { className: "control-label-inline progression-summary-label" }, "Progression"),
      React.createElement(
        "label",
        { className: "learning-family-choice finder-comprehensive-choice" },
        React.createElement("input", {
          type: "checkbox",
          checked: comprehensive,
          onChange: onComprehensiveChange,
        }),
        React.createElement("span", null, "Comprehensive")
      )
    ),
    React.createElement("p", { className: "progression-summary-text" }, progressionSummary),
    React.createElement(
      "div",
      { className: "progression-save-controls" },
      React.createElement(
        "div",
        { className: "progression-save-picker" },
        React.createElement("label", { htmlFor: "saved-progression-select", className: "mini-label" }, "Saved"),
        React.createElement(
          "select",
          {
            id: "saved-progression-select",
            value: selectedSavedProgressionId,
            onChange: (event) => onSelectedSavedProgressionIdChange(event.target.value),
          },
          React.createElement("option", { value: "" }, savedProgressions.length ? "Select saved progression" : "No saved progressions"),
          savedProgressions.map((entry) =>
            React.createElement("option", { key: entry.id, value: entry.id }, entry.name)
          )
        )
      ),
      React.createElement(
        "div",
        { className: "progression-save-actions" },
        React.createElement(
          "button",
          { type: "button", className: "secondary-button", onClick: onNew },
          "New"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            className: "secondary-button",
            onClick: () => onLoad(selectedSavedProgressionId),
            disabled: !selectedSavedProgressionId,
          },
          "Load"
        ),
        React.createElement(
          "button",
          { type: "button", className: "primary-button", onClick: onSave },
          "Save"
        )
      )
    ),
    saveStatus
      ? React.createElement("p", { className: "progression-save-status" }, saveStatus)
      : null,
    React.createElement(
      "p",
      { className: "subhead progression-inline-note" },
      "Saved progressions are local for now, but the saved model already preserves row, scale, position, and flow state for later user-aware storage."
    ),
    React.createElement(
      "p",
      { className: "subhead progression-inline-note" },
      "Matching follows this order: exact tonal-center matches first, then tonal-center scales that fit the chord, then broader chord-compatible colors."
    )
  );
}
