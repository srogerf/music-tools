import React from "https://esm.sh/react@18";

export function ProgressionRowHeader({
  row,
  index,
  selectedCandidate,
  positionFlowOptions,
  onToggleChordPanel,
  onPositionFlowChange,
}) {
  const chordTitle = row.chordSymbol.trim() || "New chord";
  const positionBadge = row.effectivePosition ? `${row.effectivePosition} position` : "";

  return React.createElement(
    "div",
    { className: "progression-row-header" },
    React.createElement(
      "div",
      { className: "progression-row-header-left" },
      React.createElement(
        "button",
        {
          type: "button",
          className: "progression-panel-toggle",
          onClick: onToggleChordPanel,
          "aria-expanded": row.chordPanelOpen,
          "aria-controls": `chord-panel-body-${row.id}`,
        },
        React.createElement(
          "span",
          { className: `progression-panel-chevron${row.chordPanelOpen ? " is-open" : ""}`, "aria-hidden": "true" },
          "▾"
        ),
        React.createElement("h3", { className: "progression-row-title" }, `Chord ${index + 1}: ${chordTitle}`)
      ),
      positionBadge
        ? React.createElement("span", { className: "progression-row-position-badge" }, positionBadge)
        : null,
      selectedCandidate?.rowLabel
        ? React.createElement(
            "span",
            { className: "progression-row-scale-badge" },
            selectedCandidate.rowLabel
          )
        : null
    ),
    index > 0
      ? React.createElement(
          "div",
          { className: "learning-mode-switch progression-flow-switch progression-flow-switch-inline" },
          React.createElement("span", null, "Position Flow"),
          React.createElement(
            "div",
            { className: "mode-switch-group", role: "radiogroup", "aria-label": `Position flow for chord ${index + 1}` },
            positionFlowOptions.map((option) =>
              React.createElement(
                "label",
                { key: option.value, className: "mode-switch-option" },
                React.createElement("input", {
                  type: "checkbox",
                  checked: row.positionFlow === option.value,
                  onChange: () => onPositionFlowChange(option.value),
                }),
                React.createElement("span", null, option.label)
              )
            )
          )
        )
      : null
  );
}
