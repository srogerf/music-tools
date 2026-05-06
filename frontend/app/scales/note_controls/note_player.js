import React from "https://esm.sh/react@18";

export function NotePlayer({ playback }) {
  return React.createElement(
    "div",
    { className: "playback-panel" },
    React.createElement(
      "div",
      { className: "playback-command-row" },
      React.createElement(
        "button",
        {
          type: "button",
          className: "playback-button",
          onClick: playback.toggle,
        },
        playback.isPlaying ? "Stop" : "Play"
      ),
      React.createElement(
        "label",
        { className: "playback-click", title: "Beat click" },
        React.createElement("input", {
          type: "checkbox",
          checked: playback.clickEnabled,
          onChange: (event) => playback.setClickEnabled(event.target.checked),
        }),
        React.createElement("span", { className: "metronome-icon", "aria-hidden": "true" })
      )
    ),
    React.createElement(
      "label",
      { className: "playback-speed", htmlFor: "scale-playback-bpm" },
      React.createElement("span", null, `Speed ${playback.bpm} BPM`),
      React.createElement("input", {
        id: "scale-playback-bpm",
        type: "range",
        min: "40",
        max: "180",
        step: "1",
        value: playback.bpm,
        onChange: (event) => playback.setBpm(Number(event.target.value)),
      })
    ),
    React.createElement(
      "label",
      { className: "playback-speed", htmlFor: "scale-playback-note-value" },
      React.createElement("span", null, `Note ${playback.noteValueLabel}`),
      React.createElement("input", {
        id: "scale-playback-note-value",
        type: "range",
        min: "0",
        max: String(playback.noteValues.length - 1),
        step: "1",
        value: playback.noteValueIndex,
        onChange: (event) => playback.setNoteValueIndex(Number(event.target.value)),
      })
    ),
    React.createElement(
      "label",
      { className: "playback-speed", htmlFor: "scale-playback-volume" },
      React.createElement("span", null, `Volume ${playback.volume}%`),
      React.createElement("input", {
        id: "scale-playback-volume",
        type: "range",
        min: "0",
        max: "100",
        step: "1",
        value: playback.volume,
        onChange: (event) => playback.setVolume(Number(event.target.value)),
      })
    )
  );
}
