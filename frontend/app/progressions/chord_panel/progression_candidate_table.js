import React from "https://esm.sh/react@18";

export function ProgressionCandidateTable({
  row,
  error,
  visibleDegreeClasses,
  onSelectScale,
}) {
  if (error) {
    return React.createElement("p", { className: "subhead progression-inline-note" }, error);
  }
  if (!row.chordSymbol.trim()) {
    return React.createElement("p", { className: "subhead progression-inline-note" }, "Enter a chord symbol to drive scale ranking.");
  }
  if (!row.spelling.ok) {
    return React.createElement("p", { className: "subhead progression-inline-note" }, "Fix the chord spelling to see candidate scales.");
  }

  const tonalFitLabel = row.tonalFits.length > 0
    ? `Also fits tonal-center scales: ${row.tonalFits.join(", ")}.`
    : "No direct tonal-center scale fits yet for this chord.";

  if (row.candidates.length === 0) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement("p", { className: "subhead progression-inline-note" }, tonalFitLabel),
      React.createElement("p", { className: "subhead progression-inline-note" }, "No matching scales yet for this chord and tonal center.")
    );
  }

  const selectedCandidate = row.candidates.find((candidate) => candidate.scale.id === row.selectedScaleId) || null;
  if (selectedCandidate) {
    return null;
  }

  return React.createElement(
    React.Fragment,
    null,
    React.createElement("p", { className: "subhead progression-inline-note" }, tonalFitLabel),
    React.createElement("p", { className: "progression-results-title" }, "Candidate scales"),
    React.createElement(
      "div",
      { className: "progression-candidate-table" },
      React.createElement(
        "div",
        { className: "progression-candidate-table-header" },
        React.createElement("span", null, "Candidate scale"),
        React.createElement("span", null, "Spelling"),
        React.createElement("span", null, "Parent scale"),
        React.createElement("span", null, "Match type")
      ),
      row.candidates.map((candidate) =>
        React.createElement(
          "div",
          { key: `${row.id}-${candidate.scale.id}` },
          React.createElement(
            "button",
            {
              type: "button",
              className: "progression-candidate-row progression-candidate-button",
              onClick: () => onSelectScale(candidate.scale.id),
            },
            React.createElement("span", { className: "progression-candidate-label" }, candidate.rowLabel),
            React.createElement(
              "span",
              { className: "progression-candidate-spelling" },
              visibleSpellingLabel(candidate.noteDetails, visibleDegreeClasses)
            ),
            React.createElement(
              "span",
              { className: "progression-candidate-parent" },
              React.createElement("span", { className: "progression-candidate-context" }, candidate.parentScaleLabel || "—"),
              candidate.parentScaleNoteDetails?.length
                ? React.createElement(
                    "span",
                    { className: "progression-candidate-parent-spelling" },
                    visibleSpellingLabel(candidate.parentScaleNoteDetails, visibleDegreeClasses)
                  )
                : null
            ),
            React.createElement(
              "span",
              { className: "progression-candidate-match" },
              React.createElement("span", { className: "progression-candidate-context" }, candidate.matchTypeLabel || "—"),
              candidate.descriptionLabel
                ? React.createElement(
                    "span",
                    {
                      className: "progression-candidate-tooltip-wrap",
                      tabIndex: 0,
                    },
                    React.createElement("span", { className: "progression-candidate-tooltip-trigger", "aria-hidden": "true" }, "?"),
                    React.createElement("span", { className: "progression-candidate-tooltip" }, candidate.descriptionLabel)
                  )
                : null
            )
          )
        )
      )
    )
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
