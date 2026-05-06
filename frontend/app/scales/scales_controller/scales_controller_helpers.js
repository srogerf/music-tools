import {
  accidentalLabel,
  noteSelectionMatches,
  notesOutsideKeySignature,
  normalizeNoteName,
  normalizeText,
  signatureSelectionMatches,
  signedAccidentalsForScale,
} from "../../music/note_logic.js";

const NOTE_GROUPS = [
  { key: "oneFive", label: "1/5", degreeClasses: [1, 5] },
  { key: "threeSeven", label: "3/7", degreeClasses: [3, 7] },
  { key: "twoFourSix", label: "2/4/6", degreeClasses: [2, 4, 6] },
];

const SCALE_DROPDOWN_GROUPS = [
  {
    label: "Major / Minor",
    names: ["Major", "Natural Minor", "Harmonic Minor", "Melodic Minor"],
  },
  {
    label: "Modes",
    names: ["Dorian", "Phrygian", "Lydian", "Mixolydian", "Locrian"],
  },
  {
    label: "Pentatonic",
    names: ["Major Pentatonic", "Minor Pentatonic", "Major Blues", "Minor Blues"],
  },
  {
    label: "Exotic",
    names: ["Double Harmonic Major"],
  },
];

const SCALE_OPTION_LABEL_OVERRIDES = {
  Dorian: "Dorian (minor)",
  Phrygian: "Phrygian (minor)",
  Lydian: "Lydian (major)",
  Mixolydian: "Mixolydian (major)",
  Locrian: "Locrian (diminished)",
};

function scaleOptionLabel(scale) {
  if (SCALE_OPTION_LABEL_OVERRIDES[scale.name]) {
    return SCALE_OPTION_LABEL_OVERRIDES[scale.name];
  }
  if (!scale.common_name || scale.common_name === scale.name) {
    return scale.name;
  }
  return `${scale.name} (${scale.common_name})`;
}

function groupedScaleOptions(scales) {
  const byName = new Map(scales.map((scale) => [scale.name, scale]));
  const used = new Set();
  const groups = SCALE_DROPDOWN_GROUPS.map((group) => {
    const entries = group.names.map((name) => byName.get(name)).filter(Boolean);
    entries.forEach((scale) => used.add(scale.id));
    return { label: group.label, entries };
  }).filter((group) => group.entries.length > 0);

  const otherEntries = scales.filter((scale) => !used.has(scale.id));
  if (otherEntries.length > 0) {
    groups.push({ label: "Other", entries: otherEntries });
  }
  return groups;
}

function randomItem(items) {
  if (!items.length) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)];
}

function findScaleByRouteValue(scales, routeValue) {
  const normalized = normalizeText(routeValue);
  if (!normalized) {
    return null;
  }
  return (
    scales.find((scale) => normalizeText(scale.name) === normalized) ||
    scales.find((scale) => normalizeText(scale.common_name) === normalized) ||
    null
  );
}

function findTuningByRouteValue(tunings, routeValue) {
  const normalized = normalizeText(routeValue);
  if (!normalized) {
    return null;
  }
  return tunings.find((tuning) => normalizeText(tuning.name) === normalized) || null;
}

function positionOptionsForMode(useThreeNps, cagedShapes, threeNpsShapes, positionLabels, threeNpsPositionLabels) {
  const codes = useThreeNps ? threeNpsShapes : cagedShapes;
  const labels = useThreeNps ? threeNpsPositionLabels : positionLabels;
  return codes.map((code) => ({ code, label: labels[code] || code }));
}

export {
  NOTE_GROUPS,
  SCALE_DROPDOWN_GROUPS,
  scaleOptionLabel,
  groupedScaleOptions,
  normalizeText,
  randomItem,
  signedAccidentalsForScale,
  notesOutsideKeySignature,
  accidentalLabel,
  signatureSelectionMatches,
  noteSelectionMatches,
  findScaleByRouteValue,
  findTuningByRouteValue,
  positionOptionsForMode,
  normalizeNoteName,
};
