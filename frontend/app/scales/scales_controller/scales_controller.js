import { useEffect, useMemo, useState } from "https://esm.sh/react@18";
import {
  buildScaleNotes,
  computeFretboardLayout,
  drawScaleLayout,
  filterLayoutByIntervalGroups,
} from "fretboard-layout";
import {
  CAGED_SHAPES,
  POSITION_LABELS,
  THREE_NPS_POSITION_LABELS,
  THREE_NPS_SHAPES,
} from "scales-layout";
import { DEFAULT_KEYS } from "defaults";
import {
  buildMatchingFinderScales,
} from "./scales_controller_finder.js";
import {
  useLoadScaleCatalog,
  useLoadScaleLayouts,
  useLoadTunings,
} from "./scales_controller_data.js";
import {
  buildLearningResult,
  buildRandomLearningChallenge,
} from "./scales_controller_learning.js";
import { useScalePlayback } from "../../playback/scale_playback.js";
import {
  buildSelectionRouteState,
  scaleContextCacheKey,
} from "./scales_controller_route.js";
import {
  useSyncRouteKey,
  useSyncRoutePosition,
  useSyncRouteScale,
  useSyncRouteThreeNps,
  useSyncRouteTuning,
} from "./scales_controller_route_sync.js";
import {
  NOTE_GROUPS,
  groupedLearningOptions,
  groupedScaleOptions,
  positionOptionsForMode,
} from "./scales_controller_helpers.js";

export function useScalesController({ routeState, onRouteChange }) {
  const [scales, setScales] = useState([]);
  const [selectedScaleId, setSelectedScaleId] = useState(1);
  const [selectedKey, setSelectedKey] = useState(routeState?.key || "C");
  const [selectedPosition, setSelectedPosition] = useState(
    [...CAGED_SHAPES, ...THREE_NPS_SHAPES].includes(routeState?.position) ? routeState.position : "E"
  );
  const [tunings, setTunings] = useState([]);
  const [selectedTuningId, setSelectedTuningId] = useState(1);
  const [layoutInstances, setLayoutInstances] = useState([]);
  const [error, setError] = useState("");
  const [visibleGroups, setVisibleGroups] = useState({
    oneFive: true,
    threeSeven: true,
    twoFourSix: true,
  });
  const [useThreeNps, setUseThreeNps] = useState(Boolean(routeState?.threeNps));
  const [activeMode, setActiveMode] = useState("");
  const [learningGroups, setLearningGroups] = useState(["majorMinor"]);
  const [learningChallenge, setLearningChallenge] = useState(null);
  const [learningSignatureCount, setLearningSignatureCount] = useState(0);
  const [learningSignatureType, setLearningSignatureType] = useState("sharp");
  const [learningSelectedNotes, setLearningSelectedNotes] = useState([]);
  const [learningResult, setLearningResult] = useState(null);
  const [finderSelectedIntervals, setFinderSelectedIntervals] = useState([]);
  const [finderSearchIntervals, setFinderSearchIntervals] = useState([]);
  const [finderSearchRequested, setFinderSearchRequested] = useState(false);
  const [finderComprehensive, setFinderComprehensive] = useState(false);
  const [scaleContexts, setScaleContexts] = useState({});

  useLoadScaleCatalog({ routeState, setScales, setSelectedScaleId, setError });
  useLoadTunings({ routeState, setTunings, setSelectedTuningId, setError });
  useLoadScaleLayouts({ setLayoutInstances, setError });
  useSyncRouteScale({ routeState, scales, setSelectedScaleId });
  useSyncRouteTuning({ routeState, tunings, setSelectedTuningId });
  useSyncRouteKey({ routeState, setSelectedKey });
  useSyncRoutePosition({ routeState, setSelectedPosition });
  useSyncRouteThreeNps({ routeState, setUseThreeNps });

  const selectedTuning = useMemo(
    () => tunings.find((tuning) => tuning.id === Number(selectedTuningId)),
    [tunings, selectedTuningId]
  );
  const tuningStrings = selectedTuning?.strings?.length ? selectedTuning.strings : [];
  const tuningLabels = useMemo(() => [...tuningStrings].reverse(), [tuningStrings]);

  const selectedScale = useMemo(
    () => scales.find((scale) => scale.id === Number(selectedScaleId)),
    [scales, selectedScaleId]
  );
  const scaleDropdownGroups = useMemo(() => groupedScaleOptions(scales), [scales]);
  const learningScaleGroups = useMemo(() => groupedLearningOptions(scales), [scales]);
  const selectedLayoutInstance = useMemo(
    () => layoutInstances.find((entry) => entry.id === Number(selectedTuningId)),
    [layoutInstances, selectedTuningId]
  );
  const selectedScaleLayout = useMemo(() => {
    if (!selectedLayoutInstance || !selectedScale) return null;
    return selectedLayoutInstance.scales?.find((scale) => scale.id === selectedScale.id) || null;
  }, [selectedLayoutInstance, selectedScale]);

  const hasThreeNpsLayout = Boolean(selectedScaleLayout?.layout_families?.["3nps"]?.positions);
  const effectiveUseThreeNps = useThreeNps && hasThreeNpsLayout;
  const positionOptions = useMemo(
    () =>
      positionOptionsForMode(
        effectiveUseThreeNps,
        CAGED_SHAPES,
        THREE_NPS_SHAPES,
        POSITION_LABELS,
        THREE_NPS_POSITION_LABELS
      ),
    [effectiveUseThreeNps]
  );
  const positionCodes = useMemo(() => positionOptions.map((option) => option.code), [positionOptions]);

  useEffect(() => {
    if (positionCodes.includes(selectedPosition)) return;
    const nextPosition = positionCodes[0] || "E";
    setSelectedPosition(nextPosition);
    updateRouteFromSelection({ position: nextPosition });
  }, [positionCodes, selectedPosition]);

  const selectedPositionLayout = useMemo(() => {
    if (!selectedScaleLayout) return null;
    const familyCode = effectiveUseThreeNps ? "3nps" : "standard";
    return (
      selectedScaleLayout?.layout_families?.[familyCode]?.positions?.[selectedPosition] ||
      selectedScaleLayout?.layout_families?.standard?.positions?.[selectedPosition] ||
      selectedScaleLayout?.positions?.[selectedPosition] ||
      null
    );
  }, [selectedScaleLayout, selectedPosition, effectiveUseThreeNps]);

  const scaleNoteDetails = useMemo(() => {
    if (!selectedScale) return [];
    return buildScaleNotes(selectedKey, selectedScale).noteDetails;
  }, [selectedScale, selectedKey]);

  const selectedScaleContext = useMemo(() => {
    if (!selectedScale?.id || !selectedKey) return null;
    return scaleContexts[`${selectedScale.id}:${selectedKey}`] || null;
  }, [scaleContexts, selectedScale, selectedKey]);

  const playback = useScalePlayback({ selectedScale, selectedKey });
  const learningOpen = activeMode === "learning";
  const finderOpen = activeMode === "finder";
  const shouldBlankForLearning = learningOpen && (!learningChallenge || !learningResult);

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
      stringCount: tuningStrings.length || 6,
      tuningLabels: tuningStrings.length > 0 ? tuningLabels : null,
    }),
    [tuningStrings, tuningLabels]
  );

  const drawScaleFretboard = useMemo(
    () => (fretboard, canvas) => {
      if (shouldBlankForLearning || !selectedScale || tuningStrings.length === 0 || !selectedLayoutInstance) {
        fretboard.clear();
        fretboard.drawBlank(fretboard.options.hasZeroFret);
        return fretboard;
      }

      if (!selectedPositionLayout) {
        fretboard.clear();
        fretboard.drawBlank(fretboard.options.hasZeroFret);
        return fretboard;
      }

      const trimmed = computeFretboardLayout({
        scale: selectedScale,
        key: selectedKey,
        tuningStrings,
        positionLayout: selectedPositionLayout,
      });
      if (!trimmed) {
        fretboard.clear();
        fretboard.drawBlank(fretboard.options.hasZeroFret);
        return fretboard;
      }

      const filtered = filterLayoutByIntervalGroups(trimmed, visibleDegreeClasses);
      return drawScaleLayout(fretboard, canvas, tuningStrings, tuningLabels, filtered);
    },
    [
      shouldBlankForLearning,
      selectedScale,
      selectedKey,
      selectedPosition,
      tuningStrings,
      tuningLabels,
      selectedLayoutInstance,
      selectedPositionLayout,
      visibleDegreeClasses,
      effectiveUseThreeNps,
    ]
  );

  function updateRouteFromSelection(overrides = {}) {
    if (!onRouteChange) return;
    const nextRouteState = buildSelectionRouteState({
      selectedScale,
      selectedKey,
      selectedPosition,
      selectedTuning,
      effectiveUseThreeNps,
      overrides,
    });
    if (!nextRouteState) return;
    onRouteChange(nextRouteState);
  }

  async function fetchScaleContext(scaleId, key) {
    if (!scaleId || !key) {
      return null;
    }

    const cacheKey = scaleContextCacheKey(scaleId, key);
    if (scaleContexts[cacheKey]) {
      return scaleContexts[cacheKey];
    }

    const context = await fetchJSON(
      `/api/v1/scales/${scaleId}/context?key=${encodeURIComponent(key)}`,
      "scale context"
    );
    setScaleContexts((current) => ({ ...current, [cacheKey]: context }));
    return context;
  }

  function handleScaleChange(event) {
    const nextScaleId = Number(event.target.value);
    const nextScale = scales.find((scale) => scale.id === nextScaleId);
    setSelectedScaleId(nextScaleId);
    updateRouteFromSelection({ scaleName: nextScale?.name });
  }

  function handleKeyChange(event) {
    const nextKey = event.target.value;
    setSelectedKey(nextKey);
    updateRouteFromSelection({ key: nextKey });
  }

  function handlePositionChange(event) {
    const nextPosition = event.target.value;
    setSelectedPosition(nextPosition);
    updateRouteFromSelection({ position: nextPosition });
  }

  function handleThreeNpsChange(event) {
    const nextThreeNps = event.target.checked;
    const nextPositionOptions = positionOptionsForMode(
      nextThreeNps,
      CAGED_SHAPES,
      THREE_NPS_SHAPES,
      POSITION_LABELS,
      THREE_NPS_POSITION_LABELS
    );
    const nextPositionCodes = nextPositionOptions.map((option) => option.code);
    const nextPosition = nextPositionCodes.includes(selectedPosition)
      ? selectedPosition
      : nextPositionCodes[0] || selectedPosition;
    setUseThreeNps(nextThreeNps);
    setSelectedPosition(nextPosition);
    updateRouteFromSelection({ threeNps: nextThreeNps, position: nextPosition });
  }

  function resetLearningDisplay() {
    setLearningChallenge(null);
    setLearningSignatureCount(0);
    setLearningSignatureType("sharp");
    setLearningSelectedNotes([]);
    setLearningResult(null);
  }

  function handleLearningModeChange(event) {
    if (event.target.checked) {
      setActiveMode((current) => {
        if (current === "learning") {
          resetLearningDisplay();
          return "";
        }
        resetFinderDisplay();
        return "learning";
      });
      return;
    }
    resetLearningDisplay();
    setActiveMode("");
  }

  function handleFinderModeChange(event) {
    if (event.target.checked) {
      setActiveMode((current) => {
        if (current === "finder") {
          resetFinderDisplay();
          return "";
        }
        resetLearningDisplay();
        return "finder";
      });
      return;
    }
    resetFinderDisplay();
    setActiveMode("");
  }

  useEffect(() => {
    if (!selectedScale?.id || !selectedKey) return;
    fetchScaleContext(selectedScale.id, selectedKey).catch(() => {});
  }, [selectedScale?.id, selectedKey]);

  useEffect(() => {
    if (learningScaleGroups.length === 0) return;
    setLearningGroups((current) => {
      if (current.length > 0 && current.every((groupKey) => learningScaleGroups.some((group) => group.key === groupKey))) {
        return current;
      }
      return [learningScaleGroups[0].key];
    });
  }, [learningScaleGroups]);

  function handleLearningGroupToggle(groupKey) {
    const isSelected = learningGroups.includes(groupKey);
    if (isSelected && learningGroups.length === 1) return;
    const nextGroups = isSelected
      ? learningGroups.filter((item) => item !== groupKey)
      : [...learningGroups, groupKey];
    setLearningGroups(nextGroups);
    resetLearningDisplay();
  }

  function handleRandomLearningScale() {
    const challenge = buildRandomLearningChallenge({
      scales,
      learningScaleGroups,
      learningGroups,
      defaultKeys: DEFAULT_KEYS,
      cagedShapes: CAGED_SHAPES,
    });
    if (!challenge) {
      setLearningResult({
        signatureCorrect: false,
        notesCorrect: false,
        message: "No scale data is available for this learning set yet.",
      });
      return;
    }

    setLearningChallenge(challenge);
    setLearningSignatureCount(0);
    setLearningSignatureType("sharp");
    setLearningSelectedNotes([]);
    setLearningResult(null);
  }

  function toggleLearningNote(note) {
    setLearningSelectedNotes((current) =>
      current.includes(note) ? current.filter((item) => item !== note) : [...current, note]
    );
  }

  function toggleFinderInterval(interval) {
    setFinderSelectedIntervals((current) =>
      current.includes(interval) ? current.filter((item) => item !== interval) : [...current, interval]
    );
  }

  const matchingFinderScales = useMemo(
    () =>
      buildMatchingFinderScales({
        finderSearchRequested,
        finderSearchIntervals,
        scales,
        layoutInstances,
        finderComprehensive,
      }),
    [finderSearchIntervals, finderSearchRequested, scales, layoutInstances, finderComprehensive]
  );

  function handleFinderSearch() {
    setFinderSearchIntervals(finderSelectedIntervals);
    setFinderSearchRequested(true);
  }

  function handleFinderScaleSelect(scale) {
    if (!scale) return;
    setSelectedScaleId(scale.id);
    updateRouteFromSelection({ scaleName: scale.name });
  }

  function resetFinderDisplay() {
    setFinderSelectedIntervals([]);
    setFinderSearchIntervals([]);
    setFinderSearchRequested(false);
    setFinderComprehensive(false);
  }

  async function handleLearningCheck() {
    if (!learningChallenge) return;
    const { scale, key, position } = learningChallenge;
    const noteDetails = buildScaleNotes(key, scale).noteDetails;
    const context = await fetchScaleContext(scale.id, key);
    if (!context) {
      setLearningResult({
        signatureCorrect: false,
        notesCorrect: false,
        message: "Couldn't load scale context for this learning challenge.",
      });
      return;
    }

    setSelectedScaleId(scale.id);
    setSelectedKey(key);
    setSelectedPosition(position);
    updateRouteFromSelection({ scaleName: scale.name, key, position });
    setLearningResult(
      buildLearningResult({
        learningSignatureCount,
        learningSignatureType,
        learningSelectedNotes,
        noteDetails,
        context,
      })
    );
  }

  return {
    error,
    scales,
    selectedScale,
    selectedScaleId,
    selectedKey,
    selectedPosition,
    tunings,
    selectedTuning,
    selectedTuningId,
    tuningStrings,
    tuningLabels,
    layoutInstances,
    selectedLayoutInstance,
    selectedScaleLayout,
    selectedPositionLayout,
    noteGroups: NOTE_GROUPS,
    scaleDropdownGroups,
    positionOptions,
    positionCodes,
    hasThreeNpsLayout,
    effectiveUseThreeNps,
    defaultKeys: DEFAULT_KEYS,
    visibleGroups,
    setVisibleGroups,
    scaleNoteDetails,
    selectedScaleContext,
    playback,
    fretboardOptions,
    drawScaleFretboard,
    learningOpen,
    learningScaleGroups,
    learningGroups,
    learningChallenge,
    learningSignatureCount,
    learningSignatureType,
    learningSelectedNotes,
    learningResult,
    activeMode,
    finderOpen,
    finderSelectedIntervals,
    finderSearchRequested,
    matchingFinderScales,
    finderComprehensive,
    handleScaleChange,
    handleKeyChange,
    handlePositionChange,
    handleThreeNpsChange,
    handleLearningModeChange,
    handleFinderModeChange,
    handleLearningGroupToggle,
    handleRandomLearningScale,
    resetLearningDisplay,
    resetFinderDisplay,
    handleFinderSearch,
    handleFinderScaleSelect,
    handleLearningCheck,
    toggleLearningNote,
    toggleFinderInterval,
    setFinderComprehensive,
    setLearningSignatureCount,
    setLearningSignatureType,
    setSelectedScaleId,
    setSelectedKey,
    setSelectedPosition,
  };
}
