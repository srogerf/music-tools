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
import { DEFAULT_KEYS, DEFAULT_TUNING_NAME } from "defaults";
import {
  LEARNING_NOTE_CHOICE_SET,
} from "../learning_mode/learning_mode_panel.js";
import { useScalePlayback } from "../../playback/scale_playback.js";
import {
  NOTE_GROUPS,
  accidentalLabel,
  findScaleByRouteValue,
  findTuningByRouteValue,
  groupedLearningOptions,
  groupedScaleOptions,
  noteSelectionMatches,
  positionOptionsForMode,
  randomItem,
  normalizeText,
  signatureSelectionMatches,
} from "./scales_controller_helpers.js";

function buildLoadError(resourceName, detail) {
  const suffix = detail ? ` ${detail}` : "";
  return `Couldn't load ${resourceName}.${suffix} Make sure the backend is running and the database has been seeded.`;
}

async function fetchJSON(url, resourceName) {
  let response;
  try {
    response = await fetch(url, { cache: "no-store" });
  } catch (error) {
    throw new Error(buildLoadError(resourceName, "The server couldn't be reached."));
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    const detail = data?.error ? `Server said: ${data.error}.` : `Server returned ${response.status}.`;
    throw new Error(buildLoadError(resourceName, detail));
  }

  return data;
}

function scaleContextCacheKey(scaleId, key) {
  return `${scaleId}:${key}`;
}

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

  useEffect(() => {
    fetchJSON("/api/v1/scales", "scales")
      .then((data) => {
        const list = data.scales || [];
        setScales(list);
        setSelectedScaleId((current) => {
          const routeScale = findScaleByRouteValue(list, routeState?.scale);
          if (routeScale) {
            return routeScale.id;
          }
          if (list.some((scale) => scale.id === Number(current))) {
            return current;
          }
          return list[0]?.id ?? current;
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    fetchJSON("/api/v1/tunings", "tunings")
      .then((data) => {
        const list = data.tunings || [];
        setTunings(list);
        setSelectedTuningId((current) => {
          const routeTuning = findTuningByRouteValue(list, routeState?.tuning);
          if (routeTuning) {
            return routeTuning.id;
          }
          if (list.some((tuning) => tuning.id === Number(current))) {
            return current;
          }
          const standard = list.find((tuning) => tuning.name === DEFAULT_TUNING_NAME);
          return (standard ?? list[0])?.id ?? current;
        });
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    fetchJSON("/api/v1/scales/scale_layouts", "scale layouts")
      .then((data) => setLayoutInstances(data.tunings || []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (scales.length === 0) return;
    const routeScale = findScaleByRouteValue(scales, routeState?.scale);
    if (routeScale) {
      setSelectedScaleId((current) => (routeScale.id === Number(current) ? current : routeScale.id));
    }
  }, [routeState?.scale, scales]);

  useEffect(() => {
    if (tunings.length === 0) return;
    const routeTuning = findTuningByRouteValue(tunings, routeState?.tuning);
    if (routeTuning) {
      setSelectedTuningId((current) => (routeTuning.id === Number(current) ? current : routeTuning.id));
    }
  }, [routeState?.tuning, tunings]);

  useEffect(() => {
    if (routeState?.key && DEFAULT_KEYS.includes(routeState.key)) {
      setSelectedKey((current) => (current === routeState.key ? current : routeState.key));
    }
  }, [routeState?.key]);

  useEffect(() => {
    if (routeState?.position && [...CAGED_SHAPES, ...THREE_NPS_SHAPES].includes(routeState.position)) {
      setSelectedPosition((current) => (current === routeState.position ? current : routeState.position));
    }
  }, [routeState?.position]);

  useEffect(() => {
    const nextThreeNps = Boolean(routeState?.threeNps);
    setUseThreeNps((current) => (current === nextThreeNps ? current : nextThreeNps));
  }, [routeState?.threeNps]);

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
    const scaleName = overrides.scaleName ?? selectedScale?.name;
    const key = overrides.key ?? selectedKey;
    const position = overrides.position ?? selectedPosition;
    const tuningName = overrides.tuningName ?? selectedTuning?.name;
    const threeNps = overrides.threeNps ?? effectiveUseThreeNps;
    if (!scaleName || !key || !position || !tuningName) return;
    onRouteChange({
      scale: scaleName,
      key,
      position,
      tuning: tuningName,
      threeNps,
    });
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

  function learningScaleNames() {
    const fallbackGroupKey = learningScaleGroups[0]?.key;
    const selectedGroups = learningGroups.length > 0 ? learningGroups : fallbackGroupKey ? [fallbackGroupKey] : [];
    return selectedGroups.flatMap(
      (groupKey) => learningScaleGroups.find((group) => group.key === groupKey)?.entries.map((scale) => scale.name) || []
    );
  }

  function handleLearningGroupToggle(groupKey) {
    const isSelected = learningGroups.includes(groupKey);
    if (isSelected && learningGroups.length === 1) return;
    const nextGroups = isSelected
      ? learningGroups.filter((item) => item !== groupKey)
      : [...learningGroups, groupKey];
    setLearningGroups(nextGroups);
    resetLearningDisplay();
  }

  function availableLearningScales() {
    const names = new Set(learningScaleNames().map(normalizeText));
    return scales.filter((scale) => names.has(normalizeText(scale.name)));
  }

  function availableLearningKeys(scale) {
    return DEFAULT_KEYS.filter((key) => {
      const notes = buildScaleNotes(key, scale).notes;
      return !notes.some((note) => !LEARNING_NOTE_CHOICE_SET.has(note));
    });
  }

  function handleRandomLearningScale() {
    const scale = randomItem(availableLearningScales());
    const key = randomItem(availableLearningKeys(scale));
    const position = randomItem(CAGED_SHAPES);
    if (!scale || !key || !position) {
      setLearningResult({
        signatureCorrect: false,
        notesCorrect: false,
        message: "No scale data is available for this learning set yet.",
      });
      return;
    }

    setLearningChallenge({ scale, key, position });
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

  const matchingFinderScales = useMemo(() => {
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
  }, [finderSearchIntervals, finderSearchRequested, scales, layoutInstances, finderComprehensive]);

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
    const notes = noteDetails.map((note) => note.note);
    const context = await fetchScaleContext(scale.id, key);
    if (!context) {
      setLearningResult({
        signatureCorrect: false,
        notesCorrect: false,
        message: "Couldn't load scale context for this learning challenge.",
      });
      return;
    }

    const signedAccidentals = Number(context.signature?.signed_accidentals || 0);
    const signatureCorrect = signatureSelectionMatches(
      learningSignatureCount,
      learningSignatureType,
      signedAccidentals
    );
    const notesCorrect = noteSelectionMatches(learningSelectedNotes, notes);
    const outsideKeySignatureNotes = context.outside_key_signature_notes || [];

    setSelectedScaleId(scale.id);
    setSelectedKey(key);
    setSelectedPosition(position);
    updateRouteFromSelection({ scaleName: scale.name, key, position });
    setLearningResult({
      signatureCorrect,
      notesCorrect,
      signedAccidentals,
      signatureLabel: context.signature?.label || accidentalLabel(signedAccidentals),
      notes,
      outsideKeySignatureNotes,
      message: signatureCorrect && notesCorrect ? "Correct" : "Check the answer",
    });
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
