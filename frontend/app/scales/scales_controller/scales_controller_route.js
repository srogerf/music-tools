function scaleContextCacheKey(scaleId, key) {
  return `${scaleId}:${key}`;
}

function buildSelectionRouteState({
  selectedScale,
  selectedKey,
  selectedPosition,
  selectedTuning,
  effectiveUseThreeNps,
  overrides = {},
}) {
  const scaleName = overrides.scaleName ?? selectedScale?.name;
  const key = overrides.key ?? selectedKey;
  const position = overrides.position ?? selectedPosition;
  const tuningName = overrides.tuningName ?? selectedTuning?.name;
  const threeNps = overrides.threeNps ?? effectiveUseThreeNps;
  if (!scaleName || !key || !position || !tuningName) {
    return null;
  }
  return {
    scale: scaleName,
    key,
    position,
    tuning: tuningName,
    threeNps,
  };
}

export { buildSelectionRouteState, scaleContextCacheKey };
