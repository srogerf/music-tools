const DEFAULT_ROW = {
  id: 1,
  tonalCenterKey: "",
  tonalCenterMinor: true,
  chordSymbol: "",
  position: "",
  positionFlow: "free",
  selectedScaleId: null,
  chordPanelOpen: true,
};

const DEFAULT_VISIBLE_GROUPS = {
  oneFive: true,
  threeSeven: true,
  twoFourSix: true,
};

const MAJOR_TONAL_CENTER_KEYS = [
  "A",
  "Ab",
  "A#",
  "Bb",
  "B",
  "Cb",
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
];

const MINOR_TONAL_CENTER_KEYS = [
  "A",
  "Ab",
  "A#",
  "Bb",
  "B",
  "C",
  "C#",
  "Db",
  "D",
  "D#",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "G#",
];

const POSITION_FLOW_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "same_position", label: "Same" },
  { value: "ascending", label: "Ascending" },
  { value: "descending", label: "Descending" },
];

const STANDARD_TUNING_STRINGS = ["E", "A", "D", "G", "B", "E"];
const STANDARD_TUNING_LABELS = [...STANDARD_TUNING_STRINGS].reverse();
const STANDARD_TUNING_NAME = "Standard";

export {
  DEFAULT_ROW,
  DEFAULT_VISIBLE_GROUPS,
  MAJOR_TONAL_CENTER_KEYS,
  MINOR_TONAL_CENTER_KEYS,
  POSITION_FLOW_OPTIONS,
  STANDARD_TUNING_LABELS,
  STANDARD_TUNING_NAME,
  STANDARD_TUNING_STRINGS,
};
