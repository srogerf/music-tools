import React from "https://esm.sh/react@18";
import { NoteSelector } from "../shared/note_controls/note_selector.js";
import { ProgressionRow } from "./chord_panel/progression_row.js";
import {
  useProgressionsController,
} from "./progressions_controller/use_progressions_controller.js";
import { ProgressionSummaryPanel } from "./summary_panel/progression_summary_panel.js";

export function ProgressionsPage() {
  const controller = useProgressionsController();

  return React.createElement(
    "section",
    { className: "panel" },
    React.createElement(
      "div",
      { className: "section-intro" },
      React.createElement(
        "div",
        { className: "section-title-row" },
        React.createElement("h2", { className: "section-title" }, "Progressions"),
        React.createElement(
          "div",
          { className: "learning-mode-switch" },
          React.createElement("span", null, "Mode"),
          React.createElement(
            "div",
            { className: "mode-switch-group", role: "radiogroup", "aria-label": "Progression mode" },
            React.createElement(
              "label",
              { className: "mode-switch-option" },
              React.createElement("input", {
                type: "checkbox",
                checked: controller.activeMode === "scales",
                onChange: () => controller.setActiveMode("scales"),
              }),
              React.createElement("span", null, "Scales")
            ),
            React.createElement(
              "label",
              { className: "mode-switch-option" },
              React.createElement("input", {
                type: "checkbox",
                checked: controller.activeMode === "chords",
                onChange: () => controller.setActiveMode("chords"),
              }),
              React.createElement("span", null, "Chords")
            )
          )
        )
      ),
      React.createElement(
        "p",
        { className: "subhead" },
        controller.activeMode === "scales"
          ? "Choose a tonal center, chord, and position to rank candidate scales and compare them row by row."
          : "Chord-mode voicing and progression tools are next, but the shared row flow starts here."
      ),
      React.createElement(
        "ul",
        { className: "progression-intro-notes" },
        React.createElement("li", null, "Chord compatibility decides what can appear."),
        React.createElement("li", null, "Tonal center decides what should rank first."),
        React.createElement("li", null, "Later chords can keep the same center or move to a new one.")
      )
    ),
    React.createElement(
      "div",
      { className: "progressions-layout" },
      React.createElement(
        "div",
        { className: "progressions-main" },
        React.createElement(ProgressionSummaryPanel, {
          comprehensive: controller.comprehensive,
          onComprehensiveChange: () => controller.setComprehensive(!controller.comprehensive),
          progressionSummary: controller.progressionSummary,
          selectedSavedProgressionId: controller.selectedSavedProgressionId,
          onSelectedSavedProgressionIdChange: controller.setSelectedSavedProgressionId,
          savedProgressions: controller.savedProgressions,
          onNew: controller.resetProgression,
          onLoad: controller.loadSavedProgression,
          onSave: controller.saveProgression,
          saveStatus: controller.saveStatus,
        }),
        controller.rowsWithSpelling.map((row, index) => {
          const tonalCenterOptions = controller.tonalCenterOptionsForRow(row);
          return React.createElement(ProgressionRow, {
            key: row.id,
            activeMode: controller.activeMode,
            row,
            index,
            tonalCenterOptions,
            positionOptions: controller.positionOptions,
            positionFlowOptions: controller.positionFlowOptions,
            visibleDegreeClasses: controller.visibleDegreeClasses,
            error: controller.error,
            layoutScale:
              row.selectedScaleId
                ? controller.layoutScalesById.get(row.selectedScaleId) || null
                : null,
            useThreeNps: controller.useThreeNps,
            threeNpsAvailable: controller.threeNpsAvailable,
            fretboardOptions: controller.fretboardOptions,
            onToggleChordPanel: () => controller.toggleChordPanel(row.id),
            onPositionFlowChange: (value) => controller.updateRow(row.id, "positionFlow", value),
            onRowChange: (field, value) => controller.updateRow(row.id, field, value),
            onClearScale: () => controller.clearRowScale(row.id),
            onSelectScale: (scaleId) => controller.selectRowScale(row.id, scaleId),
          });
        }),
        React.createElement(
          "div",
          { className: "progression-actions" },
          React.createElement(
            "button",
            {
              type: "button",
              className: "secondary-button",
              onClick: controller.addRow,
            },
            "Add Next Row"
          )
        )
      ),
      React.createElement(
        "aside",
        { className: "progressions-side-panel" },
        React.createElement(
          "div",
          { className: "side-panel-stack" },
            React.createElement(NoteSelector, {
              visibleGroups: controller.visibleGroups,
              onVisibleGroupsChange: controller.setVisibleGroups,
              noteGroups: controller.noteGroups,
              threeNpsEnabled: controller.useThreeNps,
              onThreeNpsChange: () => controller.setUseThreeNps((current) => !current),
              threeNpsAvailable: controller.threeNpsAvailable,
              showThreeNps: true,
            })
          )
      )
    )
  );
}
