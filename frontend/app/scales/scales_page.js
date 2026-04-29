import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18";
import {
  buildScaleNotes,
  computeFretboardLayout,
  drawScaleLayout,
  filterLayoutByIntervalGroups,
} from "fretboard-layout";
import { CAGED_SHAPES } from "scales-layout";
import { SharedFretboard } from "shared-fretboard";
import { DEFAULT_KEYS, DEFAULT_TUNING_NAME } from "defaults";

const NOTE_GROUPS = [
  { key: "oneFive", label: "1/5", degreeClasses: [1, 5] },
  { key: "threeSeven", label: "3/7", degreeClasses: [3, 7] },
  { key: "twoFourSix", label: "2/4/6", degreeClasses: [2, 4, 6] },
];

const LEARNING_SCALE_GROUPS = {
  majorMinor: {
    label: "Major / minor",
    names: ["Major", "Natural Minor", "Harmonic Minor", "Melodic Minor"],
  },
  modes: {
    label: "Modes",
    names: ["Dorian", "Phrygian", "Lydian", "Mixolydian", "Locrian"],
  },
  pentatonic: {
    label: "Pentatonic",
    names: ["Major Pentatonic", "Minor Pentatonic"],
  },
};

const MAJOR_KEY_SIGNATURES = {
  C: 0,
  G: 1,
  D: 2,
  A: 3,
  E: 4,
  B: 5,
  "F#": 6,
  "C#": 7,
  F: -1,
  Bb: -2,
  Eb: -3,
  Ab: -4,
  Db: -5,
  Gb: -6,
  Cb: -7,
};

const MODE_PARENT_MAJOR_OFFSETS = {
  Major: 0,
  Ionian: 0,
  Dorian: 2,
  Phrygian: 4,
  Lydian: 5,
  Mixolydian: 7,
  "Natural Minor": 9,
  Aeolian: 9,
  Locrian: 11,
};

const KEY_TO_INDEX = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const INDEX_TO_MAJOR_KEY = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const SHARP_SIGNATURE_NOTES = ["F#", "C#", "G#", "D#", "A#", "E#", "B#"];
const FLAT_SIGNATURE_NOTES = ["Bb", "Eb", "Ab", "Db", "Gb", "Cb", "Fb"];
const LEARNING_NOTE_GROUPS = [
  ["C", "B#", "Dbb"],
  ["C#", "Db", "B##"],
  ["D", "Ebb", "C##"],
  ["D#", "Eb", "Fbb"],
  ["E", "Fb", "D##"],
  ["F", "E#", "Gbb"],
  ["F#", "Gb", "E##"],
  ["G", "Abb", "F##"],
  ["G#", "Ab"],
  ["A", "Bbb", "G##"],
  ["A#", "Bb", "Cbb"],
  ["B", "Cb", "A##"],
];
const LEARNING_NOTE_CHOICE_SET = new Set(LEARNING_NOTE_GROUPS.flat());

function scaleOptionLabel(scale) {
  if (!scale.common_name || scale.common_name === scale.name) {
    return scale.name;
  }
  return `${scale.name} (${scale.common_name})`;
}

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
    const detail = data?.error
      ? `Server said: ${data.error}.`
      : `Server returned ${response.status}.`;
    throw new Error(buildLoadError(resourceName, detail));
  }

  return data;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function randomItem(items) {
  if (!items.length) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)];
}

function usesMinorSignature(scale) {
  const name = normalizeText(scale?.name);
  const commonName = normalizeText(scale?.common_name);
  return name.includes("minor") || commonName.includes("minor") || commonName.includes("aeolian");
}

function modalParentMajorKey(key, scale) {
  const rootIndex = KEY_TO_INDEX[key];
  const offset = MODE_PARENT_MAJOR_OFFSETS[scale?.name] ?? MODE_PARENT_MAJOR_OFFSETS[scale?.common_name];
  if (rootIndex === undefined || offset === undefined) {
    return key;
  }
  return INDEX_TO_MAJOR_KEY[(rootIndex - offset + 12) % 12];
}

function relativeMajorKey(key) {
  const rootIndex = KEY_TO_INDEX[key];
  if (rootIndex === undefined) {
    return key;
  }
  return INDEX_TO_MAJOR_KEY[(rootIndex + 3) % 12];
}

function majorSignatureKeyForScale(key, scale) {
  if (usesMinorSignature(scale)) {
    return relativeMajorKey(key);
  }
  return modalParentMajorKey(key, scale);
}

function signedAccidentalsForScale(key, scale) {
  if (!scale) {
    return 0;
  }
  const signatureKey = majorSignatureKeyForScale(key, scale);
  return MAJOR_KEY_SIGNATURES[signatureKey] ?? 0;
}

function signatureNotesForAccidentals(signedAccidentals) {
  const count = Math.abs(signedAccidentals);
  if (signedAccidentals > 0) {
    return SHARP_SIGNATURE_NOTES.slice(0, count);
  }
  if (signedAccidentals < 0) {
    return FLAT_SIGNATURE_NOTES.slice(0, count);
  }
  return [];
}

function keySignatureNoteSet(signedAccidentals) {
  const notesByLetter = {
    C: "C",
    D: "D",
    E: "E",
    F: "F",
    G: "G",
    A: "A",
    B: "B",
  };
  signatureNotesForAccidentals(signedAccidentals).forEach((note) => {
    notesByLetter[note[0]] = note;
  });
  return new Set(Object.values(notesByLetter).map(normalizeNoteName));
}

function notesOutsideKeySignature(scaleNotes, signedAccidentals) {
  const signatureNoteSet = keySignatureNoteSet(signedAccidentals);
  return scaleNotes.filter((note) => !signatureNoteSet.has(normalizeNoteName(note)));
}

function accidentalLabel(signedAccidentals) {
  const count = Math.abs(signedAccidentals);
  if (count === 0) {
    return "No sharps or flats";
  }
  const accidental = signedAccidentals > 0 ? "sharp" : "flat";
  const notes = signatureNotesForAccidentals(signedAccidentals);
  return `${count} ${accidental}${count === 1 ? "" : "s"}: ${notes.join(", ")}`;
}

function signatureSelectionMatches(count, accidentalType, signedAccidentals) {
  const guessedCount = Number(count);
  const expectedCount = Math.abs(signedAccidentals);
  if (guessedCount !== expectedCount) {
    return false;
  }
  if (expectedCount === 0) {
    return true;
  }
  return signedAccidentals > 0 ? accidentalType === "sharp" : accidentalType === "flat";
}

function normalizeNoteName(value) {
  return String(value || "")
    .trim()
    .replace(/\u266f/g, "#")
    .replace(/\u266d/g, "b")
    .replace(/^([a-g])/, (_, note) => note.toUpperCase());
}

function noteSelectionMatches(selectedNotes, expectedNotes) {
  if (selectedNotes.length !== expectedNotes.length) {
    return false;
  }
  const selectedNoteSet = new Set(selectedNotes.map(normalizeNoteName));
  return expectedNotes.every((note) => selectedNoteSet.has(normalizeNoteName(note)));
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

export function ScalesPage({ active, routeState, onRouteChange }) {
  const [scales, setScales] = useState([]);
  const [selectedScaleId, setSelectedScaleId] = useState(1);
  const [selectedKey, setSelectedKey] = useState(routeState?.key || "C");
  const [selectedPosition, setSelectedPosition] = useState(
    CAGED_SHAPES.includes(routeState?.position) ? routeState.position : "E"
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
  const [learningOpen, setLearningOpen] = useState(false);
  const [learningGroup, setLearningGroup] = useState("majorMinor");
  const [learningChallenge, setLearningChallenge] = useState(null);
  const [learningSignatureCount, setLearningSignatureCount] = useState(0);
  const [learningSignatureType, setLearningSignatureType] = useState("sharp");
  const [learningSelectedNotes, setLearningSelectedNotes] = useState([]);
  const [learningResult, setLearningResult] = useState(null);

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
      .catch((err) => {
        setError(err.message);
      });
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
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  useEffect(() => {
    fetchJSON("/api/v1/scales/scale_layouts", "scale layouts")
      .then((data) => {
        setLayoutInstances(data.tunings || []);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  useEffect(() => {
    if (scales.length === 0) {
      return;
    }
    const routeScale = findScaleByRouteValue(scales, routeState?.scale);
    if (routeScale) {
      setSelectedScaleId((current) =>
        routeScale.id === Number(current) ? current : routeScale.id
      );
    }
  }, [routeState?.scale, scales]);

  useEffect(() => {
    if (tunings.length === 0) {
      return;
    }
    const routeTuning = findTuningByRouteValue(tunings, routeState?.tuning);
    if (routeTuning) {
      setSelectedTuningId((current) =>
        routeTuning.id === Number(current) ? current : routeTuning.id
      );
    }
  }, [routeState?.tuning, tunings]);

  useEffect(() => {
    if (routeState?.key && DEFAULT_KEYS.includes(routeState.key)) {
      setSelectedKey((current) => (current === routeState.key ? current : routeState.key));
    }
  }, [routeState?.key]);

  useEffect(() => {
    if (routeState?.position && CAGED_SHAPES.includes(routeState.position)) {
      setSelectedPosition((current) =>
        current === routeState.position ? current : routeState.position
      );
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
  const selectedLayoutInstance = useMemo(
    () => layoutInstances.find((entry) => entry.id === Number(selectedTuningId)),
    [layoutInstances, selectedTuningId]
  );
  const selectedPositionLayout = useMemo(() => {
    if (!selectedLayoutInstance || !selectedScale) {
      return null;
    }
    const scaleLayout = selectedLayoutInstance.scales?.find(
      (scale) => scale.id === selectedScale.id
    );
    const familyCode = useThreeNps ? "3nps" : "standard";
    return (
      scaleLayout?.layout_families?.[familyCode]?.positions?.[selectedPosition] ||
      scaleLayout?.layout_families?.standard?.positions?.[selectedPosition] ||
      scaleLayout?.positions?.[selectedPosition] ||
      null
    );
  }, [selectedLayoutInstance, selectedScale, selectedPosition, useThreeNps]);

  const scaleNoteDetails = useMemo(() => {
    if (!selectedScale) return [];
    return buildScaleNotes(selectedKey, selectedScale).noteDetails;
  }, [selectedScale, selectedKey]);

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

  const drawScaleFretboard = useMemo(() => (fretboard, canvas) => {
    if (shouldBlankForLearning || !selectedScale || tuningStrings.length === 0 || !selectedLayoutInstance) {
      fretboard.clear();
      fretboard.drawBlank(fretboard.options.hasZeroFret);
      return fretboard;
    }

    const positionLayout = selectedPositionLayout;
    if (!positionLayout) {
      fretboard.clear();
      fretboard.drawBlank(fretboard.options.hasZeroFret);
      return fretboard;
    }

    const trimmed = computeFretboardLayout({
      scale: selectedScale,
      key: selectedKey,
      tuningStrings,
      positionLayout,
      positionName: selectedPosition,
      useThreeNps,
    });
    if (!trimmed) {
      fretboard.clear();
      fretboard.drawBlank(fretboard.options.hasZeroFret);
      return fretboard;
    }

    const filtered = filterLayoutByIntervalGroups(trimmed, visibleDegreeClasses);
    return drawScaleLayout(fretboard, canvas, tuningStrings, tuningLabels, filtered);
  }, [
    selectedScale,
    selectedKey,
    selectedPosition,
    tuningStrings,
    tuningLabels,
    selectedLayoutInstance,
    selectedPositionLayout,
    visibleDegreeClasses,
    useThreeNps,
    shouldBlankForLearning,
  ]);

  function updateRouteFromSelection(overrides = {}) {
    if (!onRouteChange) {
      return;
    }
    const scaleName = overrides.scaleName ?? selectedScale?.name;
    const key = overrides.key ?? selectedKey;
    const position = overrides.position ?? selectedPosition;
    const tuningName = overrides.tuningName ?? selectedTuning?.name;
    const threeNps = overrides.threeNps ?? useThreeNps;
    if (!scaleName || !key || !position || !tuningName) {
      return;
    }
    onRouteChange({
      scale: scaleName,
      key,
      position,
      tuning: tuningName,
      threeNps,
    });
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
    setUseThreeNps(nextThreeNps);
    updateRouteFromSelection({ threeNps: nextThreeNps });
  }

  function resetLearningDisplay() {
    setLearningChallenge(null);
    setLearningSignatureCount(0);
    setLearningSignatureType("sharp");
    setLearningSelectedNotes([]);
    setLearningResult(null);
  }

  function handleLearningModeChange(event) {
    resetLearningDisplay();
    setLearningOpen(event.target.checked);
  }

  function learningScaleNames() {
    if (learningGroup === "all") {
      return Object.values(LEARNING_SCALE_GROUPS).flatMap((group) => group.names);
    }
    return LEARNING_SCALE_GROUPS[learningGroup]?.names || LEARNING_SCALE_GROUPS.majorMinor.names;
  }

  function availableLearningScales() {
    const names = new Set(learningScaleNames().map(normalizeText));
    return scales.filter((scale) => names.has(normalizeText(scale.name)));
  }

  function availableLearningKeys(scale) {
    return DEFAULT_KEYS.filter((key) => {
      const notes = buildScaleNotes(key, scale).notes;
      if (notes.some((note) => !LEARNING_NOTE_CHOICE_SET.has(note))) {
        return false;
      }
      return Math.abs(signedAccidentalsForScale(key, scale)) <= 7;
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
      current.includes(note)
        ? current.filter((item) => item !== note)
        : [...current, note]
    );
  }

  function handleLearningCheck() {
    if (!learningChallenge) {
      return;
    }
    const { scale, key, position } = learningChallenge;
    const noteDetails = buildScaleNotes(key, scale).noteDetails;
    const notes = noteDetails.map((note) => note.note);
    const signedAccidentals = signedAccidentalsForScale(key, scale);
    const signatureCorrect = signatureSelectionMatches(
      learningSignatureCount,
      learningSignatureType,
      signedAccidentals
    );
    const notesCorrect = noteSelectionMatches(learningSelectedNotes, notes);
    const outsideKeySignatureNotes = notesOutsideKeySignature(notes, signedAccidentals);

    setSelectedScaleId(scale.id);
    setSelectedKey(key);
    setSelectedPosition(position);
    updateRouteFromSelection({ scaleName: scale.name, key, position });
    setLearningResult({
      signatureCorrect,
      notesCorrect,
      signedAccidentals,
      signatureLabel: accidentalLabel(signedAccidentals),
      notes,
      outsideKeySignatureNotes,
      message: signatureCorrect && notesCorrect ? "Correct" : "Check the answer",
    });
  }

  return React.createElement(
    "section",
    { className: "panel" },
    React.createElement(
      "div",
      { className: "section-intro" },
      React.createElement(
        "div",
        { className: "section-title-row" },
        React.createElement("h2", { className: "section-title" }, "Scales"),
        React.createElement(
          "label",
          { className: "learning-mode-switch", htmlFor: "learning-mode-toggle" },
          React.createElement("span", null, "Learning mode"),
          React.createElement("input", {
            id: "learning-mode-toggle",
            type: "checkbox",
            checked: learningOpen,
            onChange: handleLearningModeChange,
          })
        )
      ),
      React.createElement(
        "p",
        { className: "subhead" },
        "Select a scale and key to highlight notes across the fretboard."
      )
    ),
    learningOpen &&
      React.createElement(
        "section",
        { className: "learning-drawer" },
        React.createElement(
          "div",
          { className: "learning-panel" },
          React.createElement(
            "p",
            { className: "learning-summary" },
            "Pick a scale set, generate a random scale and position, then guess the key signature and scale notes before checking the answer."
          ),
          React.createElement(
            "div",
            { className: "learning-controls" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { htmlFor: "learning-set" }, "Scale set"),
              React.createElement(
                "select",
                {
                  id: "learning-set",
                  value: learningGroup,
                  onChange: (event) => {
                    setLearningGroup(event.target.value);
                    resetLearningDisplay();
                  },
                },
                React.createElement("option", { value: "majorMinor" }, "Major / minor"),
                React.createElement("option", { value: "modes" }, "Modes"),
                React.createElement("option", { value: "pentatonic" }, "Pentatonic"),
                React.createElement("option", { value: "all" }, "All")
              )
            ),
            React.createElement(
              "button",
              {
                type: "button",
                className: "secondary-button",
                onClick: handleRandomLearningScale,
              },
              "Random scale"
            ),
            React.createElement(
              "button",
              {
                type: "button",
                className: "secondary-button",
                onClick: resetLearningDisplay,
              },
              "Reset"
            )
          ),
          learningChallenge &&
            React.createElement(
              "div",
              { className: "learning-challenge" },
              React.createElement(
                "div",
                { className: "learning-target" },
                React.createElement("span", { className: "learning-target-scale" }, `${learningChallenge.key} ${learningChallenge.scale.name}`)
              ),
              React.createElement(
                "div",
                { className: "learning-guess-grid" },
                React.createElement(
                  "div",
                  { className: "signature-picker" },
                  React.createElement("span", { className: "control-label" }, "Key signature"),
                  React.createElement(
                    "div",
                    { className: "signature-picker-row" },
                    React.createElement(
                      "div",
                      { className: "signature-count-field" },
                      React.createElement("label", { htmlFor: "learning-key-signature-count" }, "Accidentals"),
                      React.createElement(
                        "select",
                        {
                          id: "learning-key-signature-count",
                          value: learningSignatureCount,
                          onChange: (event) => setLearningSignatureCount(Number(event.target.value)),
                        },
                        Array.from({ length: 8 }, (_, count) =>
                          React.createElement("option", { key: count, value: count }, `${count}`)
                        )
                      )
                    ),
                    React.createElement(
                      "div",
                      { className: "signature-type-field" },
                      React.createElement("span", { className: "mini-label" }, "Type"),
                      React.createElement(
                        "div",
                        { className: "signature-type-buttons", role: "radiogroup", "aria-label": "Accidental type" },
                        React.createElement(
                          "button",
                          {
                            type: "button",
                            role: "radio",
                            className: `signature-type-button ${
                              learningSignatureType === "sharp" ? "signature-type-selected" : ""
                            }`,
                            "aria-checked": learningSignatureType === "sharp",
                            disabled: Number(learningSignatureCount) === 0,
                            onClick: () => setLearningSignatureType("sharp"),
                          },
                          "Sharps"
                        ),
                        React.createElement(
                          "button",
                          {
                            type: "button",
                            role: "radio",
                            className: `signature-type-button ${
                              learningSignatureType === "flat" ? "signature-type-selected" : ""
                            }`,
                            "aria-checked": learningSignatureType === "flat",
                            disabled: Number(learningSignatureCount) === 0,
                            onClick: () => setLearningSignatureType("flat"),
                          },
                          "Flats"
                        )
                      )
                    )
                  )
                ),
                React.createElement(
                  "div",
                  { className: "learning-position-inline" },
                  React.createElement("span", { className: "mini-label" }, "Position"),
                  React.createElement("span", { className: "learning-position-value" }, learningChallenge.position)
                ),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "primary-button learning-check-button",
                    onClick: handleLearningCheck,
                  },
                  "Check"
                )
              ),
              React.createElement(
                "div",
                { className: "learning-note-picker" },
                React.createElement("label", { id: "learning-notes-label" }, "Scale notes"),
                React.createElement(
                  "div",
                  {
                    className: "learning-note-grid",
                    role: "group",
                    "aria-labelledby": "learning-notes-label",
                  },
                  LEARNING_NOTE_GROUPS.map((group) =>
                    React.createElement(
                      "div",
                      { className: "note-choice-group", key: group.join("-") },
                      group.map((note) =>
                        React.createElement(
                          "button",
                          {
                            key: note,
                            type: "button",
                            className: `note-choice ${
                              learningSelectedNotes.includes(note) ? "note-choice-selected" : ""
                            }`,
                            "aria-pressed": learningSelectedNotes.includes(note),
                            onClick: () => toggleLearningNote(note),
                          },
                          note
                        )
                      )
                    )
                  )
                )
              )
            ),
          learningResult &&
            React.createElement(
              "div",
              { className: "learning-result" },
              React.createElement(
                "div",
                {
                  className: `learning-result-status ${
                    learningResult.signatureCorrect && learningResult.notesCorrect ? "status-valid" : "status-invalid"
                  }`,
                },
                learningResult.message
              ),
              learningResult.signatureLabel &&
                React.createElement(
                  "div",
                  { className: "learning-answer" },
                  React.createElement("span", null, `Key signature: ${learningResult.signatureLabel}`),
                  React.createElement("span", null, `Notes: ${learningResult.notes.join(" ")}`),
                  learningResult.outsideKeySignatureNotes?.length > 0 &&
                    React.createElement(
                      "span",
                      null,
                      `Outside key signature: ${learningResult.outsideKeySignatureNotes.join(" ")}`
                    )
                )
            )
        )
      ),
    React.createElement(
      "div",
      { className: "controls" },
      React.createElement(
        "div",
        null,
        React.createElement("label", { htmlFor: "scale" }, "Scale"),
        React.createElement(
          "select",
          {
            id: "scale",
            value: selectedScaleId,
            onChange: handleScaleChange,
          },
          scales.map((scale) =>
            React.createElement(
              "option",
              { key: scale.id, value: scale.id },
              scaleOptionLabel(scale)
            )
          )
        )
      ),
      React.createElement(
        "div",
        null,
        React.createElement("label", { htmlFor: "key" }, "Key"),
        React.createElement(
          "select",
          {
            id: "key",
            value: selectedKey,
            onChange: handleKeyChange,
          },
          DEFAULT_KEYS.map((key) => React.createElement("option", { key, value: key }, key))
        )
      ),
      React.createElement(
        "div",
        null,
        React.createElement("label", { htmlFor: "position" }, "Position (CAGED)"),
        React.createElement(
          "select",
          {
            id: "position",
            value: selectedPosition,
            onChange: handlePositionChange,
          },
          CAGED_SHAPES.map((shape) =>
            React.createElement("option", { key: shape, value: shape }, shape)
          )
        )
      )
    ),
    error && React.createElement("p", { className: "subhead" }, error),
    React.createElement(
      "div",
      { className: "diagram-row" },
      React.createElement(SharedFretboard, {
        active,
        options: fretboardOptions,
        draw: drawScaleFretboard,
      }),
      React.createElement(
        "div",
        { className: "filter-panel" },
        NOTE_GROUPS.map((group) =>
          React.createElement(
            "label",
            { className: "filter-row", key: group.key },
            React.createElement("input", {
              type: "checkbox",
              checked: visibleGroups[group.key],
              onChange: (event) =>
                setVisibleGroups((current) => ({
                  ...current,
                  [group.key]: event.target.checked,
                })),
            }),
            React.createElement("span", { className: "filter-label" }, group.label)
          )
        ),
        React.createElement("div", { className: "filter-divider", "aria-hidden": "true" }),
        React.createElement(
          "label",
          { className: "filter-row", key: "threeNps" },
          React.createElement("input", {
            type: "checkbox",
            checked: useThreeNps,
            onChange: handleThreeNpsChange,
          }),
          React.createElement("span", { className: "filter-label" }, "3NPS")
        )
      )
    ),
    React.createElement(
      "section",
      { className: "info-bar" },
      React.createElement(
        "table",
        { className: "info-table" },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement("th", { className: "info-label" }, "Scale Notes"),
            React.createElement("th", { className: "info-label" }, "Tuning"),
            React.createElement("th", { className: "info-label validated-label" }, "Validated")
          )
        ),
        React.createElement(
          "tbody",
          null,
          React.createElement(
            "tr",
            null,
            React.createElement(
              "td",
              { className: "info-value" },
              React.createElement(
                "div",
                { className: "note-list" },
                scaleNoteDetails.map((note) =>
                  React.createElement(
                    "span",
                    { className: "note-pill", key: `${note.note}-${note.interval}` },
                    React.createElement("span", { className: "note-name" }, note.note),
                    React.createElement(
                      "span",
                      { className: "note-interval" },
                      note.intervalLabel || `${note.interval} semitones`
                    )
                  )
                )
              )
            ),
            React.createElement(
              "td",
              { className: "info-value" },
              selectedTuning?.name || DEFAULT_TUNING_NAME
            ),
            React.createElement(
              "td",
              {
                className: `info-value validated-cell ${
                  useThreeNps
                    ? "status-generated"
                    : selectedPositionLayout?.validated_manual
                      ? "status-valid"
                      : "status-invalid"
                }`,
              },
              useThreeNps ? "Generated" : `${selectedPositionLayout?.validated_manual ? "✓" : "✕"}`
            )
          )
        )
      )
    )
  );
}
