import {
  accidentalLabel,
  noteSelectionMatches,
  normalizeNoteName,
  normalizeText,
  signatureSelectionMatches,
} from "../../music/note_logic.js";

const NOTE_GROUPS = [
  { key: "oneFive", label: "1/5", degreeClasses: [1, 5] },
  { key: "threeSeven", label: "3/7", degreeClasses: [3, 7] },
  { key: "twoFourSix", label: "2/4/6", degreeClasses: [2, 4, 6] },
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
  return scale?.parent_mode_label?.trim() || "";
}

function groupedScaleOptions(scales) {
  const visibleScales = scales.filter((scale) => !scale.latent);
  const groupsByCode = new Map();
  visibleScales.forEach((scale) => {
    const code = scale.catalog_group_code || "ungrouped";
    if (!groupsByCode.has(code)) {
      groupsByCode.set(code, {
        code,
        label: scale.catalog_group_label || "Other",
        order: Number(scale.catalog_group_order || 999),
        entries: [],
      });
    }
    groupsByCode.get(code).entries.push(scale);
  });

  return [...groupsByCode.values()]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((group) => ({
      code: group.code,
      label: group.label,
      entries: [...group.entries].sort((a, b) => scaleOptionLabel(a).localeCompare(scaleOptionLabel(b))),
    }));
}

function groupedLearningOptions(scales) {
  return groupedScaleOptions(scales).map((group) => ({
    key: group.code,
    label: group.label,
    entries: group.entries,
  }));
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
  scaleOptionLabel,
  scaleMusicalName,
  scaleParentModeLabel,
  groupedScaleOptions,
  groupedLearningOptions,
  normalizeText,
  randomItem,
  accidentalLabel,
  signatureSelectionMatches,
  noteSelectionMatches,
  findScaleByRouteValue,
  findTuningByRouteValue,
  positionOptionsForMode,
  normalizeNoteName,
};
