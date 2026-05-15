import {
  DEFAULT_VISIBLE_GROUPS,
} from "./progressions_controller_constants.js";

function resetVisibleGroups() {
  return { ...DEFAULT_VISIBLE_GROUPS };
}

function buildLoadedVisibleGroups(visibleGroups) {
  return {
    oneFive: visibleGroups?.oneFive !== false,
    threeSeven: visibleGroups?.threeSeven !== false,
    twoFourSix: visibleGroups?.twoFourSix !== false,
  };
}

function buildSavePayloadEntries(savedProgressions, payload, id) {
  const existing = savedProgressions.find((entry) => entry.id === id) || null;
  return existing
    ? savedProgressions.map((entry) => (entry.id === id ? payload : entry))
    : [payload, ...savedProgressions];
}

export {
  buildLoadedVisibleGroups,
  buildSavePayloadEntries,
  resetVisibleGroups,
};
