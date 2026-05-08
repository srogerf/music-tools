import React from "https://esm.sh/react@18";
import { scaleOptionLabel } from "../scales_controller/scales_controller_helpers.js";

export function ScaleSelector({
  scaleDropdownGroups,
  selectedScaleId,
  onScaleChange,
  selectedKey,
  onKeyChange,
  selectedPosition,
  onPositionChange,
  effectiveUseThreeNps,
  positionOptions,
  defaultKeys,
}) {
  const visibleGroups = scaleDropdownGroups
    .map((group) => ({
      ...group,
      entries: (group.entries || []).filter((scale) => !scale?.latent),
    }))
    .filter((group) => group.entries.length > 0);

  return React.createElement(
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
          onChange: onScaleChange,
        },
        visibleGroups.map((group) =>
          React.createElement(
            "optgroup",
            { key: group.label, label: group.label },
            group.entries.map((scale) =>
              React.createElement(
                "option",
                { key: scale.id, value: scale.id },
                scaleOptionLabel(scale)
              )
            )
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
          onChange: onKeyChange,
        },
        defaultKeys.map((key) => React.createElement("option", { key, value: key }, key))
      )
    ),
    React.createElement(
      "div",
      null,
      React.createElement("label", { htmlFor: "position" }, effectiveUseThreeNps ? "Position (3NPS)" : "Position (CAGED)"),
      React.createElement(
        "select",
        {
          id: "position",
          value: selectedPosition,
          onChange: onPositionChange,
        },
        positionOptions.map((option) =>
          React.createElement("option", { key: option.code, value: option.code }, option.label)
        )
      )
    )
  );
}
