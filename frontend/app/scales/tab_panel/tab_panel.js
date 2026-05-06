import React from "https://esm.sh/react@18";

export function TabPanel({ scaleNoteDetails, selectedTuningName, validatedManual }) {
  return React.createElement(
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
              scaleNoteDetails.map((note) =>
                React.createElement(
                  "span",
                  { className: "note-pill", key: `${note.note}-${note.interval}` },
                  React.createElement("span", { className: "note-name" }, note.note),
                  React.createElement(
                    "span",
                    { className: "note-interval" },
                    note.intervalLabel || `${note.interval} semitones`
                  )
                )
              )
            )
          ),
          React.createElement("td", { className: "info-value" }, selectedTuningName),
          React.createElement(
            "td",
            {
              className: `info-value validated-cell ${validatedManual ? "status-valid" : "status-invalid"}`,
            },
            `${validatedManual ? "✓" : "✕"}`
          )
        )
      )
    )
  );
}
