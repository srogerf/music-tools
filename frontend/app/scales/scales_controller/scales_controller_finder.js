function buildMatchingFinderScales({
  finderSearchRequested,
  finderSearchIntervals,
  scales,
  layoutInstances,
  finderComprehensive,
}) {
  if (!finderSearchRequested || finderSearchIntervals.length === 0) {
    return { withLayout: [], withoutLayout: [] };
  }
  const matches = scales.filter((scale) => {
    const scaleIntervals = (scale.intervals || [])
      .map((interval) => (typeof interval === "number" ? interval : interval?.semitones))
      .filter((interval) => Number.isFinite(interval));
    const scaleSet = new Set(scaleIntervals);
    return finderSearchIntervals.every((interval) => scaleSet.has(interval));
  });
  const withLayout = [];
  const withoutLayout = [];
  matches.forEach((scale) => {
    const hasLayout = Boolean(
      layoutInstances
        .find((entry) => entry.scales?.some((item) => item.id === scale.id))
        ?.scales?.find((item) => item.id === scale.id)?.layout_families?.standard?.positions
    );
    if (hasLayout) {
      withLayout.push(scale);
    } else if (finderComprehensive) {
      withoutLayout.push(scale);
    }
  });
  return { withLayout, withoutLayout };
}

export { buildMatchingFinderScales };
