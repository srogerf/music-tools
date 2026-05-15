import { useEffect, useMemo, useState } from "https://esm.sh/react@18";
import { fetchJSON } from "../../shared/api/client.js";
import {
  createDefaultRows,
  createProgressionRow,
  readSavedProgressions,
  sanitizeSavedRows,
  savedProgressionPayload,
  writeSavedProgressions,
} from "../storage/progressions_storage.js";
import { buildCandidateScales } from "../logic/ranking.js";
import { NOTE_GROUPS } from "../../scales/scales_controller/scales_controller_helpers.js";
import {
  DEFAULT_ROW,
  DEFAULT_VISIBLE_GROUPS,
  MAJOR_TONAL_CENTER_KEYS,
  MINOR_TONAL_CENTER_KEYS,
  POSITION_FLOW_OPTIONS,
  STANDARD_TUNING_LABELS,
  STANDARD_TUNING_NAME,
  STANDARD_TUNING_STRINGS,
} from "./progressions_controller_constants.js";
import {
  buildLoadedVisibleGroups,
  buildSavePayloadEntries,
  resetVisibleGroups,
} from "./progressions_controller_persistence.js";
import {
  POSITION_OPTIONS,
  deriveRowPosition,
  normalizeChordSymbolInput,
} from "./progressions_controller_positions.js";
import { parseChordSymbol } from "../chord_spelling.js";

export function useProgressionsController() {
  const [activeMode, setActiveMode] = useState("scales");
  const [rows, setRows] = useState(() => createDefaultRows(DEFAULT_ROW));
  const [scales, setScales] = useState([]);
  const [layoutTunings, setLayoutTunings] = useState([]);
  const [error, setError] = useState("");
  const [comprehensive, setComprehensive] = useState(false);
  const [useThreeNps, setUseThreeNps] = useState(false);
  const [visibleGroups, setVisibleGroups] = useState(resetVisibleGroups);
  const [savedProgressions, setSavedProgressions] = useState([]);
  const [selectedSavedProgressionId, setSelectedSavedProgressionId] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    Promise.all([
      fetchJSON("/api/v1/scales", "scales"),
      fetchJSON("/api/v1/scales/scale_layouts", "scale layouts"),
    ])
      .then(([scalesData, layoutsData]) => {
        setScales(scalesData.scales || []);
        setLayoutTunings(layoutsData.tunings || []);
      })
      .catch((loadError) => setError(loadError.message || "Couldn't load scales."));
  }, []);

  useEffect(() => {
    setSavedProgressions(readSavedProgressions());
  }, []);

  const standardLayoutTuning = useMemo(
    () => layoutTunings.find((tuning) => tuning.name === STANDARD_TUNING_NAME) || null,
    [layoutTunings]
  );

  const layoutScalesById = useMemo(() => {
    const values = new Map();
    (standardLayoutTuning?.scales || []).forEach((scale) => {
      values.set(scale.id, scale);
    });
    return values;
  }, [standardLayoutTuning]);

  const rowsWithSpelling = useMemo(
    () =>
      rows.reduce((items, row) => {
        const spelling = parseChordSymbol(row.chordSymbol);
        const previous = items[items.length - 1] || null;
        const candidateData = buildCandidateScales({
          scales,
          tonalCenter: row,
          chordInfo: spelling,
          comprehensive,
        });
        const derived = deriveRowPosition(
          {
            ...row,
            spelling,
            ...candidateData,
          },
          previous,
          {
            layoutScalesById,
            useThreeNps,
          }
        );
        items.push({
          ...row,
          spelling,
          effectivePosition: derived.position,
          effectiveAnchorFret: derived.anchorFret,
          ...candidateData,
        });
        return items;
      }, []),
    [rows, scales, comprehensive, layoutScalesById, useThreeNps]
  );

  const progressionSummary = useMemo(
    () =>
      rowsWithSpelling.map((row) => row.chordSymbol.trim()).filter(Boolean).join(" - ")
      || "Add a chord to start the progression.",
    [rowsWithSpelling]
  );

  const visibleDegreeClasses = useMemo(() => {
    const values = new Set();
    NOTE_GROUPS.forEach((group) => {
      if (visibleGroups[group.key]) {
        group.degreeClasses.forEach((degreeClass) => values.add(degreeClass));
      }
    });
    return values;
  }, [visibleGroups]);

  const fretboardOptions = useMemo(
    () => ({
      fretCount: 4,
      hasZeroFret: false,
      displayAtFret: 1,
      boardHeight: 240,
      fontFamily: "Alegreya Sans",
      showStringNumbers: true,
      stringCount: STANDARD_TUNING_STRINGS.length,
      tuningLabels: STANDARD_TUNING_LABELS,
    }),
    []
  );

  const threeNpsAvailable = useMemo(
    () =>
      rowsWithSpelling.some((row) => {
        const selectedCandidate = row.candidates.find((candidate) => candidate.scale.id === row.selectedScaleId) || null;
        if (!selectedCandidate) return false;
        const layoutScale = layoutScalesById.get(selectedCandidate.scale.id);
        return Boolean(layoutScale?.layout_families?.["3nps"]?.positions);
      }),
    [rowsWithSpelling, layoutScalesById]
  );

  function updateRow(rowId, field, value) {
    const normalizedValue = field === "chordSymbol" ? normalizeChordSymbolInput(value) : value;
    setRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: normalizedValue,
              ...(field === "tonalCenterKey" || field === "tonalCenterMinor" || field === "chordSymbol"
                ? { selectedScaleId: null }
                : {}),
            }
          : row
      )
    );
  }

  function selectRowScale(rowId, scaleId) {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, selectedScaleId: scaleId } : row))
    );
  }

  function toggleChordPanel(rowId) {
    setRows((current) =>
      current.map((row) =>
        row.id === rowId ? { ...row, chordPanelOpen: !row.chordPanelOpen } : row
      )
    );
  }

  function clearRowScale(rowId) {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, selectedScaleId: null } : row))
    );
  }

  function addRow() {
    setRows((current) => {
      const previous = current[current.length - 1] || DEFAULT_ROW;
      return [
        ...current,
        createProgressionRow(DEFAULT_ROW, current.length + 1, {
          tonalCenterKey: previous.tonalCenterKey,
          tonalCenterMinor: previous.tonalCenterMinor,
          chordSymbol: "",
          position: "",
          positionFlow: previous.positionFlow,
          selectedScaleId: null,
          chordPanelOpen: true,
        }),
      ];
    });
  }

  function resetProgression() {
    setRows(createDefaultRows(DEFAULT_ROW));
    setActiveMode("scales");
    setComprehensive(false);
    setUseThreeNps(false);
    setVisibleGroups(resetVisibleGroups());
    setSelectedSavedProgressionId("");
    setSaveStatus("Started a new progression.");
  }

  function loadSavedProgression(savedId) {
    const saved = savedProgressions.find((entry) => entry.id === savedId);
    if (!saved?.progression) {
      return;
    }
    const progression = saved.progression;
    setRows(
      sanitizeSavedRows(progression.rows, {
        defaultRow: DEFAULT_ROW,
        allowedPositionFlows: POSITION_FLOW_OPTIONS.map((option) => option.value),
      })
    );
    setActiveMode(progression.activeMode === "chords" ? "chords" : "scales");
    setComprehensive(Boolean(progression.comprehensive));
    setUseThreeNps(Boolean(progression.useThreeNps));
    setVisibleGroups(buildLoadedVisibleGroups(progression.visibleGroups));
    setSelectedSavedProgressionId(saved.id);
    setSaveStatus(`Loaded ${saved.name}.`);
  }

  function saveProgression() {
    const existing = savedProgressions.find((entry) => entry.id === selectedSavedProgressionId) || null;
    const suggestedName =
      existing?.name ||
      (progressionSummary !== "Add a chord to start the progression." ? progressionSummary : "");
    const rawName = window.prompt("Save progression as", suggestedName);
    if (rawName === null) {
      return;
    }
    const name = rawName.trim();
    if (!name) {
      setSaveStatus("Save cancelled: add a progression name.");
      return;
    }
    const id = existing?.id || `progression-${Date.now()}`;
    const payload = savedProgressionPayload({
      id,
      name,
      activeMode,
      rows,
      comprehensive,
      useThreeNps,
      visibleGroups,
    });
    const nextSaved = buildSavePayloadEntries(savedProgressions, payload, id);
    writeSavedProgressions(nextSaved);
    setSavedProgressions(nextSaved);
    setSelectedSavedProgressionId(id);
    setSaveStatus(`Saved ${name} locally.`);
  }

  function tonalCenterOptionsForRow(row) {
    return row.tonalCenterMinor ? MINOR_TONAL_CENTER_KEYS : MAJOR_TONAL_CENTER_KEYS;
  }

  return {
    activeMode,
    setActiveMode,
    rowsWithSpelling,
    error,
    comprehensive,
    setComprehensive,
    useThreeNps,
    setUseThreeNps,
    visibleGroups,
    setVisibleGroups,
    savedProgressions,
    selectedSavedProgressionId,
    setSelectedSavedProgressionId,
    saveStatus,
    layoutScalesById,
    progressionSummary,
    visibleDegreeClasses,
    fretboardOptions,
    threeNpsAvailable,
    updateRow,
    selectRowScale,
    toggleChordPanel,
    clearRowScale,
    addRow,
    resetProgression,
    loadSavedProgression,
    saveProgression,
    tonalCenterOptionsForRow,
    noteGroups: NOTE_GROUPS,
    positionOptions: POSITION_OPTIONS,
    positionFlowOptions: POSITION_FLOW_OPTIONS,
  };
}
