import React from "https://esm.sh/react@18";

export function NoteSelector({ visibleGroups, onVisibleGroupsChange, noteGroups, threeNpsEnabled, onThreeNpsChange, threeNpsAvailable }) {
  return React.createElement(
    "div",
    { className: "filter-panel" },
    noteGroups.map((group) =>
      React.createElement(
        "label",
        { className: "filter-row", key: group.key },
        React.createElement("input", {
          type: "checkbox",
          checked: visibleGroups[group.key],
          onChange: (event) =>
            onVisibleGroupsChange((current) => ({
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
        checked: threeNpsEnabled,
        disabled: !threeNpsAvailable,
        onChange: onThreeNpsChange,
      }),
      React.createElement(
        "span",
        { className: `filter-label ${threeNpsAvailable ? "" : "filter-label-disabled"}` },
        "3NPS"
      )
    )
  );
}
