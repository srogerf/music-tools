const PROGRESSION_STORAGE_KEY = "music-tools.progressions.v1";

function createProgressionRow(defaultRow, id, overrides = {}) {
  return {
    ...defaultRow,
    id,
    ...overrides,
  };
}

function createDefaultRows(defaultRow) {
  return [createProgressionRow(defaultRow, 1)];
}

function sanitizeSavedRows(rows, options = {}) {
  const { defaultRow, allowedPositionFlows = [] } = options;
  if (!defaultRow) {
    throw new Error("sanitizeSavedRows requires a defaultRow option.");
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return createDefaultRows(defaultRow);
  }
  return rows.map((row, index) =>
    createProgressionRow(defaultRow, index + 1, {
      tonalCenterKey: String(row?.tonalCenterKey || "").trim(),
      tonalCenterMinor: row?.tonalCenterMinor !== false,
      chordSymbol: String(row?.chordSymbol || "").trim(),
      position: String(row?.position || "").trim(),
      positionFlow: allowedPositionFlows.includes(row?.positionFlow) ? row.positionFlow : "free",
      selectedScaleId: Number.isFinite(row?.selectedScaleId) ? row.selectedScaleId : null,
      chordPanelOpen: row?.chordPanelOpen !== false,
    })
  );
}

function readSavedProgressions() {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry) => entry && typeof entry === "object" && entry.id && entry.name);
  } catch (_error) {
    return [];
  }
}

function writeSavedProgressions(entries) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(entries));
}

function savedProgressionPayload({ id, name, activeMode, rows, comprehensive, useThreeNps, visibleGroups }) {
  return {
    id,
    name,
    version: 1,
    scope: "private_local",
    ownerRef: "local-user",
    savedAt: new Date().toISOString(),
    progression: {
      activeMode,
      comprehensive,
      useThreeNps,
      visibleGroups,
      rows: rows.map((row) => ({
        tonalCenterKey: row.tonalCenterKey,
        tonalCenterMinor: row.tonalCenterMinor,
        chordSymbol: row.chordSymbol,
        position: row.position,
        positionFlow: row.positionFlow,
        selectedScaleId: row.selectedScaleId,
        chordPanelOpen: row.chordPanelOpen,
      })),
    },
  };
}

export {
  createProgressionRow,
  createDefaultRows,
  sanitizeSavedRows,
  readSavedProgressions,
  writeSavedProgressions,
  savedProgressionPayload,
};
