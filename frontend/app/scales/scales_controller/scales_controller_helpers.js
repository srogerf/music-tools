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
    label: "Major Modes",
    names: ["Dorian", "Phrygian", "Lydian", "Mixolydian", "Locrian"],
  },
  {
    label: "Pentatonic",
    names: ["Major Pentatonic", "Minor Pentatonic", "Major Blues", "Minor Blues"],
  },
  {
    label: "Pentatonic Modes",
    names: ["Suspended Pentatonic", "Blues Minor", "Blues Major"],
  },
  {
    label: "Harmonic Minor Modes",
    names: ["Locrian #6", "Ionian #5", "Dorian #4", "Phrygian Dominant", "Lydian #2", "Ultra-Locrian"],
  },
  {
    label: "Melodic Minor Modes",
    names: ["Dorian b2", "Lydian Augmented", "Lydian Dominant", "Mixolydian b6", "Locrian #2", "Altered Scale"],
  },
  {
    label: "Exotic",
    names: ["Double Harmonic Major", "Hungarian Minor", "Neapolitan Major", "Neapolitan Minor", "Harmonic Major", "Enigmatic", "Persian"],
  },
  {
    label: "Synthetic",
    names: ["Whole Tone", "Whole-Half Diminished Scale", "Half-Whole Diminished Scale", "Chromatic", "Augmented Scale"],
  },
];

function scaleOptionLabel(scale) {
  if (!scale?.name && !scale?.common_name) {
    return "";
  }
  const commonName = scale.common_name || scale.name;
  const musicalName = scaleMusicalName(scale);
  if (!musicalName || normalizeText(commonName) === normalizeText(musicalName)) {
    return commonName;
  }
  return `${commonName} (${musicalName})`;
}

function scaleMusicalName(scale) {
  const directMusicalName = scale?.musical_name?.trim();
  if (directMusicalName) {
    return directMusicalName;
  }
  return scaleParentModeLabel(scale);
}

function scaleParentModeLabel(scale) {
  const family = scale?.parent_family?.trim();
  const number = Number(scale?.parent_mode_number || 0);
  if (!family || number < 1) {
    return "";
  }
  return `${family} Mode ${number}`;
}

function groupedScaleOptions(scales) {
  const visibleScales = scales.filter((scale) => !scale.latent);
  const byName = new Map(visibleScales.map((scale) => [scale.name, scale]));
  const used = new Set();
  const groups = SCALE_DROPDOWN_GROUPS.map((group) => {
    const entries = group.names.map((name) => byName.get(name)).filter(Boolean);
    entries.forEach((scale) => used.add(scale.id));
    return { label: group.label, entries };
  }).filter((group) => group.entries.length > 0);

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
    scales.find((scale) => normalizeText(scale.musical_name) === normalized) ||
    scales.find((scale) => normalizeText(scaleParentModeLabel(scale)) === normalized) ||
    scales.find((scale) => (scale.aliases || []).some((alias) => normalizeText(alias) === normalized)) ||
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
  scaleMusicalName,
  scaleParentModeLabel,
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
