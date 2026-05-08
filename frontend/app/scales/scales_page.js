import React from "https://esm.sh/react@18";
import { DEFAULT_TUNING_NAME } from "defaults";
import { LearningModePanel } from "./learning_mode/learning_mode_panel.js";
import { FinderModePanel } from "./finder_mode/finder_mode.js";
import { NotePlayer } from "./note_controls/note_player.js";
import { NoteSelector } from "./note_controls/note_selector.js";
import { ScaleSelector } from "./scale_selector/scale_selector.js";
import { FretboardPanel } from "./fretboard_panel/fretboard_panel.js";
import { TabPanel } from "./tab_panel/tab_panel.js";
import { useScalesController } from "./scales_controller/scales_controller.js";

export function ScalesPage({ active, routeState, onRouteChange }) {
  const controller = useScalesController({ routeState, onRouteChange });

  return React.createElement(
    "section",
    { className: "panel" },
    React.createElement(
      "div",
      { className: "section-intro" },
      React.createElement(
        "div",
        { className: "section-title-row" },
        React.createElement("h2", { className: "section-title" }, "Scales"),
        React.createElement(
          "div",
          { className: "learning-mode-switch" },
          React.createElement("span", null, "Mode"),
          React.createElement(
            "div",
            { className: "mode-switch-group", role: "radiogroup", "aria-label": "Scale mode" },
            React.createElement(
              "label",
              { className: "mode-switch-option" },
              React.createElement("input", {
                type: "checkbox",
                checked: controller.activeMode === "learning",
                onChange: controller.handleLearningModeChange,
              }),
              React.createElement("span", null, "Learning")
            ),
            React.createElement(
              "label",
              { className: "mode-switch-option" },
              React.createElement("input", {
                type: "checkbox",
                checked: controller.activeMode === "finder",
                onChange: controller.handleFinderModeChange,
              }),
              React.createElement("span", null, "Finder")
            )
          )
        )
      ),
      React.createElement(
        "p",
        { className: "subhead" },
        "Select a scale and key to highlight notes across the fretboard."
      )
    ),
    React.createElement(LearningModePanel, {
      learningOpen: controller.learningOpen,
      learningScaleGroups: controller.learningScaleGroups,
      learningGroups: controller.learningGroups,
      learningChallenge: controller.learningChallenge,
      learningSignatureCount: controller.learningSignatureCount,
      learningSignatureType: controller.learningSignatureType,
      learningSelectedNotes: controller.learningSelectedNotes,
      learningResult: controller.learningResult,
      onGroupToggle: controller.handleLearningGroupToggle,
      onRandomScale: controller.handleRandomLearningScale,
      onReset: controller.resetLearningDisplay,
      onSignatureCountChange: controller.setLearningSignatureCount,
      onSignatureTypeChange: controller.setLearningSignatureType,
      onToggleNote: controller.toggleLearningNote,
      onCheck: controller.handleLearningCheck,
    }),
    React.createElement(FinderModePanel, {
      finderOpen: controller.finderOpen,
      finderSelectedIntervals: controller.finderSelectedIntervals,
      finderSearchRequested: controller.finderSearchRequested,
      matchingFinderScales: controller.matchingFinderScales,
      finderComprehensive: controller.finderComprehensive,
      onToggleInterval: controller.toggleFinderInterval,
      onSearch: controller.handleFinderSearch,
      onReset: controller.resetFinderDisplay,
      onSelectScale: controller.handleFinderScaleSelect,
      onComprehensiveChange: controller.setFinderComprehensive,
    }),
    React.createElement(ScaleSelector, {
      scaleDropdownGroups: controller.scaleDropdownGroups,
      selectedScaleId: controller.selectedScaleId,
      onScaleChange: controller.handleScaleChange,
      selectedKey: controller.selectedKey,
      onKeyChange: controller.handleKeyChange,
      selectedPosition: controller.selectedPosition,
      onPositionChange: controller.handlePositionChange,
      effectiveUseThreeNps: controller.effectiveUseThreeNps,
      positionOptions: controller.positionOptions,
      defaultKeys: controller.defaultKeys,
    }),
    controller.error && React.createElement("p", { className: "subhead" }, controller.error),
    React.createElement(
      "div",
      { className: "diagram-row" },
      React.createElement(FretboardPanel, {
        active,
        options: controller.fretboardOptions,
        draw: controller.drawScaleFretboard,
      }),
      React.createElement(
        "div",
        { className: "side-panel-stack" },
        React.createElement(NoteSelector, {
          visibleGroups: controller.visibleGroups,
          onVisibleGroupsChange: controller.setVisibleGroups,
          noteGroups: controller.noteGroups,
          threeNpsEnabled: controller.effectiveUseThreeNps,
          threeNpsAvailable: controller.hasThreeNpsLayout,
          onThreeNpsChange: controller.handleThreeNpsChange,
        }),
        React.createElement(NotePlayer, { playback: controller.playback })
      )
    ),
    React.createElement(TabPanel, {
      scaleNoteDetails: controller.scaleNoteDetails,
      selectedTuningName: controller.selectedTuning?.name || DEFAULT_TUNING_NAME,
      validatedManual: Boolean(controller.selectedPositionLayout?.validated_manual),
    })
  );
}
