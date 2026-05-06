import React from "https://esm.sh/react@18";

export const LEARNING_SCALE_GROUPS = {
  majorMinor: {
    label: "Major / minor",
    names: ["Major", "Natural Minor", "Harmonic Minor", "Melodic Minor"],
  },
  modes: {
    label: "Modes",
    names: ["Dorian", "Phrygian", "Lydian", "Mixolydian", "Locrian"],
  },
  pentatonic: {
    label: "Pentatonic",
    names: ["Major Pentatonic", "Minor Pentatonic", "Major Blues", "Minor Blues"],
  },
  exotic: {
    label: "Exotic",
    names: ["Double Harmonic Major"],
  },
};

export const LEARNING_NOTE_GROUPS = [
  ["C", "B#", "Dbb"],
  ["C#", "Db", "B##"],
  ["D", "Ebb", "C##"],
  ["D#", "Eb", "Fbb"],
  ["E", "Fb", "D##"],
  ["F", "E#", "Gbb"],
  ["F#", "Gb", "E##"],
  ["G", "Abb", "F##"],
  ["G#", "Ab"],
  ["A", "Bbb", "G##"],
  ["A#", "Bb", "Cbb"],
  ["B", "Cb", "A##"],
];

export const LEARNING_NOTE_CHOICE_SET = new Set(LEARNING_NOTE_GROUPS.flat());

export function LearningModePanel({
  learningOpen,
  learningGroups,
  learningChallenge,
  learningSignatureCount,
  learningSignatureType,
  learningSelectedNotes,
  learningResult,
  onGroupToggle,
  onRandomScale,
  onReset,
  onSignatureCountChange,
  onSignatureTypeChange,
  onToggleNote,
  onCheck,
}) {
  if (!learningOpen) {
    return null;
  }

  return React.createElement(
    "section",
    { className: "learning-drawer" },
    React.createElement(
      "div",
      { className: "learning-panel" },
      React.createElement(
        "p",
        { className: "learning-summary" },
        "Pick a scale set, generate a random scale and position, then guess the key signature and scale notes before checking the answer."
      ),
      React.createElement(
        "div",
        { className: "learning-controls" },
        React.createElement(
          "div",
          { className: "learning-family-picker" },
          React.createElement("span", { className: "control-label control-label-inline" }, "Scale set"),
          React.createElement(
            "div",
            { className: "learning-family-list", role: "group", "aria-label": "Learning scale sets" },
            Object.entries(LEARNING_SCALE_GROUPS).map(([groupKey, group]) =>
              React.createElement(
                "label",
                { key: groupKey, className: "learning-family-choice", htmlFor: `learning-family-${groupKey}` },
                React.createElement("input", {
                  id: `learning-family-${groupKey}`,
                  type: "checkbox",
                  checked: learningGroups.includes(groupKey),
                  onChange: () => onGroupToggle(groupKey),
                }),
                React.createElement("span", null, group.label)
              )
            )
          )
        ),
        React.createElement(
          "button",
          {
            type: "button",
            className: "secondary-button",
            onClick: onRandomScale,
          },
          "Random scale"
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
      learningChallenge &&
        React.createElement(
          "div",
          { className: "learning-challenge" },
          React.createElement(
            "div",
            { className: "learning-target" },
            React.createElement(
              "span",
              { className: "learning-target-scale" },
              `${learningChallenge.key} ${learningChallenge.scale.name}`
            )
          ),
          React.createElement(
            "div",
            { className: "learning-guess-grid" },
            React.createElement(
              "div",
              { className: "signature-picker" },
              React.createElement("span", { className: "control-label" }, "Key signature"),
              React.createElement(
                "div",
                { className: "signature-picker-row" },
                React.createElement(
                  "div",
                  { className: "signature-count-field" },
                  React.createElement("label", { htmlFor: "learning-key-signature-count" }, "Accidentals"),
                  React.createElement(
                    "select",
                    {
                      id: "learning-key-signature-count",
                      value: learningSignatureCount,
                      onChange: (event) => onSignatureCountChange(Number(event.target.value)),
                    },
                    Array.from({ length: 8 }, (_, count) =>
                      React.createElement("option", { key: count, value: count }, `${count}`)
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "signature-type-field" },
                  React.createElement("span", { className: "mini-label" }, "Type"),
                  React.createElement(
                    "div",
                    { className: "signature-type-buttons", role: "radiogroup", "aria-label": "Accidental type" },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        role: "radio",
                        className: `signature-type-button ${
                          learningSignatureType === "sharp" ? "signature-type-selected" : ""
                        }`,
                        "aria-checked": learningSignatureType === "sharp",
                        disabled: Number(learningSignatureCount) === 0,
                        onClick: () => onSignatureTypeChange("sharp"),
                      },
                      "Sharps"
                    ),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        role: "radio",
                        className: `signature-type-button ${
                          learningSignatureType === "flat" ? "signature-type-selected" : ""
                        }`,
                        "aria-checked": learningSignatureType === "flat",
                        disabled: Number(learningSignatureCount) === 0,
                        onClick: () => onSignatureTypeChange("flat"),
                      },
                      "Flats"
                    )
                  )
                )
              )
            ),
            React.createElement(
              "div",
              { className: "learning-position-inline" },
              React.createElement("span", { className: "mini-label" }, "Position"),
              React.createElement("span", { className: "learning-position-value" }, learningChallenge.position)
            ),
            React.createElement(
              "button",
              {
                type: "button",
                className: "primary-button learning-check-button",
                onClick: onCheck,
              },
              "Check"
            )
          ),
          React.createElement(
            "div",
            { className: "learning-note-picker" },
            React.createElement("label", { id: "learning-notes-label" }, "Scale notes"),
            React.createElement(
              "div",
              {
                className: "learning-note-grid",
                role: "group",
                "aria-labelledby": "learning-notes-label",
              },
              LEARNING_NOTE_GROUPS.map((group) =>
                React.createElement(
                  "div",
                  { className: "note-choice-group", key: group.join("-") },
                  group.map((note) =>
                    React.createElement(
                      "button",
                      {
                        key: note,
                        type: "button",
                        className: `note-choice ${
                          learningSelectedNotes.includes(note) ? "note-choice-selected" : ""
                        }`,
                        "aria-pressed": learningSelectedNotes.includes(note),
                        onClick: () => onToggleNote(note),
                      },
                      note
                    )
                  )
                )
              )
            )
          )
        ),
      learningResult &&
        React.createElement(
          "div",
          { className: "learning-result" },
          React.createElement(
            "div",
            {
              className: `learning-result-status ${
                learningResult.signatureCorrect && learningResult.notesCorrect ? "status-valid" : "status-invalid"
              }`,
            },
            learningResult.message
          ),
          learningResult.signatureLabel &&
            React.createElement(
              "div",
              { className: "learning-answer" },
              React.createElement("span", null, `Key signature: ${learningResult.signatureLabel}`),
              React.createElement("span", null, `Notes: ${learningResult.notes.join(" ")}`),
              learningResult.outsideKeySignatureNotes?.length > 0 &&
                React.createElement(
                  "span",
                  null,
                  `Outside key signature: ${learningResult.outsideKeySignatureNotes.join(" ")}`
                )
            )
        )
    )
  );
}
