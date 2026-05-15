import React from "https://esm.sh/react@18";
import { ProgressionCandidateTable } from "./progression_candidate_table.js";
import { ProgressionRowHeader } from "./progression_row_header.js";
import { RowFretboardPreview } from "../fretboard_panel/row_fretboard_preview.js";

export function ProgressionRow({
  activeMode,
  row,
  index,
  tonalCenterOptions,
  positionOptions,
  positionFlowOptions,
  visibleDegreeClasses,
  error,
  layoutScale,
  useThreeNps,
  threeNpsAvailable,
  fretboardOptions,
  onToggleChordPanel,
  onPositionFlowChange,
  onRowChange,
  onClearScale,
  onSelectScale,
}) {
  const selectedCandidate =
    row.candidates.find((candidate) => candidate.scale.id === row.selectedScaleId) || null;

  return React.createElement(
    "section",
    { className: "progression-row-card" },
    React.createElement(
      "div",
      { className: `progression-chord-panel${row.chordPanelOpen ? " is-open" : " is-closed"}` },
      React.createElement(ProgressionRowHeader, {
        row,
        index,
        selectedCandidate,
        positionFlowOptions,
        onToggleChordPanel,
        onPositionFlowChange,
      })
    ),
    row.chordPanelOpen
      ? React.createElement(
          "div",
          { id: `chord-panel-body-${row.id}`, className: "progression-chord-panel-body" },
          React.createElement(
            "div",
            { className: "progressions-controls-row" },
            React.createElement(
              "div",
              { className: "progressions-control-field" },
              React.createElement("label", { htmlFor: `tonal-center-key-${row.id}` }, "Key"),
              React.createElement(
                "select",
                {
                  id: `tonal-center-key-${row.id}`,
                  value: row.tonalCenterKey,
                  onChange: (event) => onRowChange("tonalCenterKey", event.target.value),
                },
                React.createElement("option", { value: "" }, "Select key"),
                tonalCenterOptions.map((center) =>
                  React.createElement("option", { key: center, value: center }, center)
                )
              )
            ),
            React.createElement(
              "div",
              { className: "progressions-control-field progressions-control-field-compact" },
              React.createElement("label", { htmlFor: `tonal-center-minor-${row.id}` }, "Mode"),
              React.createElement(
                "label",
                { className: "mode-switch-option" },
                React.createElement("input", {
                  id: `tonal-center-minor-${row.id}`,
                  type: "checkbox",
                  checked: row.tonalCenterMinor,
                  onChange: (event) => onRowChange("tonalCenterMinor", event.target.checked),
                }),
                React.createElement("span", null, row.tonalCenterMinor ? "Minor" : "Major")
              )
            ),
            React.createElement(
              "div",
              { className: "progressions-control-field" },
              React.createElement("label", { htmlFor: `chord-symbol-${row.id}` }, "Chord"),
              React.createElement("input", {
                id: `chord-symbol-${row.id}`,
                type: "text",
                value: row.chordSymbol,
                placeholder: "Enter chord",
                onChange: (event) => onRowChange("chordSymbol", event.target.value),
              })
            ),
            React.createElement(
              "div",
              { className: "progressions-control-field" },
              React.createElement("label", { htmlFor: `position-${row.id}` }, "Position"),
              React.createElement(
                "select",
                {
                  id: `position-${row.id}`,
                  value: row.positionFlow === "free" ? row.position : row.effectivePosition,
                  disabled: row.positionFlow !== "free",
                  onChange: (event) => onRowChange("position", event.target.value),
                },
                React.createElement("option", { value: "" }, "Select position"),
                positionOptions.map((option) =>
                  React.createElement("option", { key: option.value, value: option.value }, option.label)
                )
              )
            )
          ),
          React.createElement(
            "div",
            { className: "progression-row-results" },
            row.spelling.ok
              ? React.createElement(
                  React.Fragment,
                  null,
                  selectedCandidate
                    ? React.createElement(
                        "div",
                        { className: "progression-selected-summary-grid" },
                        React.createElement(
                          "p",
                          { className: "progression-results-title progression-selected-summary-label progression-selected-summary-label-chord" },
                          "Chord tones"
                        ),
                        React.createElement(
                          "p",
                          { className: "progression-results-title progression-selected-summary-label progression-selected-summary-label-scale" },
                          `Selected scale ${selectedCandidate.rowLabel}`
                        ),
                        React.createElement(
                          "p",
                          { className: "progression-chord-spelling progression-selected-summary-value progression-selected-summary-value-chord" },
                          row.spelling.notes.join("-")
                        ),
                        React.createElement(
                          "div",
                          {
                            className:
                              "progression-selected-scale-value progression-selected-summary-value progression-selected-summary-value-scale",
                          },
                          React.createElement(
                            "p",
                            {
                              className: "progression-chord-spelling progression-selected-scale-spelling",
                              title: `${selectedCandidate.parentScaleLabel} · ${selectedCandidate.matchTypeLabel}`,
                            },
                            visibleSpellingLabel(selectedCandidate.noteDetails, visibleDegreeClasses)
                          )
                        ),
                        React.createElement(
                          "button",
                          {
                            type: "button",
                            className: "secondary-button progression-change-scale-button progression-selected-summary-button",
                            onClick: onClearScale,
                          },
                          "Change scale"
                        )
                      )
                    : React.createElement(
                        "div",
                        { className: "progression-chord-line" },
                        React.createElement(
                          "div",
                          { className: "progression-chord-line-copy" },
                          React.createElement("p", { className: "progression-results-title" }, "Chord tones"),
                          React.createElement("p", { className: "progression-chord-spelling" }, row.spelling.notes.join("-"))
                        )
                      )
                )
              : row.chordSymbol.trim() && row.spelling.error
                ? React.createElement("p", { className: "subhead progression-inline-note" }, row.spelling.error)
                : null,
            row.positionFlow !== "free"
              ? React.createElement(
                  "p",
                  { className: "subhead progression-inline-note" },
                  `Derived position: ${row.effectivePosition} position.`
                )
              : null,
            activeMode === "scales"
              ? React.createElement(
                  "div",
                  { className: "progression-scale-selector-panel" },
                  React.createElement(ProgressionCandidateTable, {
                    row,
                    error,
                    visibleDegreeClasses,
                    onSelectScale,
                  })
                )
              : React.createElement(
                  "p",
                  { className: "subhead progression-inline-note" },
                  "Chord-mode voicing results will live here once the shared chord model is in place."
                )
          )
        )
      : null,
    activeMode === "scales"
      ? React.createElement(
          "div",
          { className: "canvas-wrap progression-row-preview-window" },
          React.createElement(RowFretboardPreview, {
            active: true,
            row,
            selectedCandidate,
            layoutScale,
            visibleDegreeClasses,
            useThreeNps: useThreeNps && threeNpsAvailable,
            options: fretboardOptions,
          })
        )
      : null
  );
}

function visibleSpellingLabel(noteDetails, visibleDegreeClasses) {
  if (!Array.isArray(noteDetails) || noteDetails.length === 0) {
    return "—";
  }
  const filtered = noteDetails
    .filter((detail) => visibleDegreeClasses.has(detail.degreeClass))
    .map((detail) => detail.note);
  return filtered.length > 0 ? filtered.join("-") : "—";
}
