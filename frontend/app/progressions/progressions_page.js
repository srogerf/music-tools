import React, { useEffect, useMemo, useState } from "https://esm.sh/react@18";
import { buildScaleNotes } from "fretboard-layout";
import { SharedFretboard } from "shared-fretboard";
import { normalizeNoteName } from "../music/note_logic.js";
import { NoteSelector } from "../scales/note_controls/note_selector.js";
import { NOTE_GROUPS, scaleOptionLabel } from "../scales/scales_controller/scales_controller_helpers.js";
import {
  computeFretboardLayout,
  drawScaleLayout,
  filterLayoutByIntervalGroups,
} from "../fretboard/fretboard_layout.js";
import {
  FLAT_SCALE,
  SHARP_SCALE,
  degreeClassForNote,
  noteNameToPitchClass,
  shouldUseFlats,
} from "../fretboard/fretboard_note_helpers.js";
import { parseChordSymbol } from "./chord_spelling.js";

const DEFAULT_ROW = {
  id: 1,
  tonalCenter: "G minor",
  chordSymbol: "Am7b5",
  position: "A",
  positionFlow: "free",
  selectedScaleId: null,
  chordPanelOpen: true,
};

const TONAL_CENTERS = [
  "C major",
  "G major",
  "D major",
  "A major",
  "F major",
  "Bb major",
  "A minor",
  "E minor",
  "D minor",
  "G minor",
];

const POSITION_OPTIONS = [
  { value: "C", label: "C position" },
  { value: "A", label: "A position" },
  { value: "G", label: "G position" },
  { value: "E", label: "E position" },
  { value: "D", label: "D position" },
];

const POSITION_FLOW_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "same_position", label: "Same" },
  { value: "ascending", label: "Ascending" },
  { value: "descending", label: "Descending" },
];

const POSITION_SEQUENCE = ["C", "A", "G", "E", "D"];
const STANDARD_TUNING_STRINGS = ["E", "A", "D", "G", "B", "E"];
const STANDARD_TUNING_LABELS = [...STANDARD_TUNING_STRINGS].reverse();
const STANDARD_TUNING_NAME = "Standard";

const RowFretboardPreview = function RowFretboardPreview({
  active,
  row,
  selectedCandidate,
  layoutScale,
  visibleDegreeClasses,
  useThreeNps,
  options,
}) {
  if (!selectedCandidate) {
    return React.createElement(
      "div",
      { className: "progression-preview-content" },
      React.createElement(
        "p",
        { className: "subhead progression-inline-note" },
        "Select a scale for this chord to show its fretboard."
      )
    );
  }

  const draw = (fretboard, canvas) => {
    const positionLayout = progressionPositionLayout(
      resolveCandidatePositionLayout(layoutScale, row.effectivePosition, useThreeNps),
      useThreeNps
    );
    if (!positionLayout) {
      fretboard.clear();
      fretboard.drawBlank(fretboard.options.hasZeroFret);
      return fretboard;
    }

    const trimmed = computeFretboardLayout({
      scale: selectedCandidate.displayScale || selectedCandidate.scale,
      key: selectedCandidate.displayRoot || row.spelling?.root || tonalCenterRoot(row.tonalCenter),
      tuningStrings: STANDARD_TUNING_STRINGS,
      positionLayout,
      positionName: row.effectivePosition,
      useThreeNps,
    });
    if (!trimmed) {
      fretboard.clear();
      fretboard.drawBlank(fretboard.options.hasZeroFret);
      return fretboard;
    }

    const filtered = filterLayoutByIntervalGroups(trimmed, visibleDegreeClasses);
    return drawScaleLayout(fretboard, canvas, STANDARD_TUNING_STRINGS, STANDARD_TUNING_LABELS, filtered);
  };

  return React.createElement(
    "div",
    { className: "progression-preview-content" },
    React.createElement(SharedFretboard, {
      active,
      options,
      draw,
    })
  );
};

const POSITION_ANCHOR_STRING = {
  C: 5,
  A: 5,
  G: 6,
  E: 6,
  D: 4,
};

const STANDARD_TUNING_OPEN_PITCH = {
  6: 4,
  5: 9,
  4: 2,
};

export function ProgressionsPage() {
  const [activeMode, setActiveMode] = useState("scales");
  const [rows, setRows] = useState([DEFAULT_ROW]);
  const [scales, setScales] = useState([]);
  const [layoutTunings, setLayoutTunings] = useState([]);
  const [error, setError] = useState("");
  const [comprehensive, setComprehensive] = useState(false);
  const [useThreeNps, setUseThreeNps] = useState(false);
  const [visibleGroups, setVisibleGroups] = useState({
    oneFive: true,
    threeSeven: true,
    twoFourSix: true,
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/scales", { cache: "no-store" }).then((response) =>
        response.json().then((data) => ({ ok: response.ok, data, kind: "scales" }))
      ),
      fetch("/api/v1/scales/scale_layouts", { cache: "no-store" }).then((response) =>
        response.json().then((data) => ({ ok: response.ok, data, kind: "layouts" }))
      ),
    ])
      .then((results) => {
        const scalesResult = results.find((item) => item.kind === "scales");
        const layoutsResult = results.find((item) => item.kind === "layouts");
        if (!scalesResult?.ok) {
          throw new Error(scalesResult?.data?.error || "Couldn't load scales.");
        }
        if (!layoutsResult?.ok) {
          throw new Error(layoutsResult?.data?.error || "Couldn't load scale layouts.");
        }
        setScales(scalesResult.data.scales || []);
        setLayoutTunings(layoutsResult.data.tunings || []);
      })
      .catch((loadError) => setError(loadError.message || "Couldn't load scales."));
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
          tonalCenter: row.tonalCenter,
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
    () => rowsWithSpelling.map((row) => row.chordSymbol.trim()).filter(Boolean).join(" - ") || "Add a chord to start the progression.",
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
              ...(field === "tonalCenter" || field === "chordSymbol" ? { selectedScaleId: null } : {}),
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
      const last = current[current.length - 1] || DEFAULT_ROW;
      return [
        ...current,
        {
          id: current.length + 1,
          tonalCenter: last.tonalCenter,
          chordSymbol: "",
          position: last.position,
          positionFlow: last.positionFlow,
          selectedScaleId: null,
          chordPanelOpen: true,
        },
      ];
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
        React.createElement("h2", { className: "section-title" }, "Progressions"),
        React.createElement(
          "div",
          { className: "learning-mode-switch" },
          React.createElement("span", null, "Mode"),
          React.createElement(
            "div",
            { className: "mode-switch-group", role: "radiogroup", "aria-label": "Progression mode" },
            React.createElement(
              "label",
              { className: "mode-switch-option" },
              React.createElement("input", {
                type: "checkbox",
                checked: activeMode === "scales",
                onChange: () => setActiveMode("scales"),
              }),
              React.createElement("span", null, "Scales")
            ),
            React.createElement(
              "label",
              { className: "mode-switch-option" },
              React.createElement("input", {
                type: "checkbox",
                checked: activeMode === "chords",
                onChange: () => setActiveMode("chords"),
              }),
              React.createElement("span", null, "Chords")
            )
          )
        )
      ),
      React.createElement(
        "p",
        { className: "subhead" },
        activeMode === "scales"
          ? "Choose a tonal center, chord, and position to rank candidate scales and compare them row by row."
          : "Chord-mode voicing and progression tools are next, but the shared row flow starts here."
      ),
      React.createElement(
        "ul",
        { className: "progression-intro-notes" },
        React.createElement("li", null, "Chord compatibility decides what can appear."),
        React.createElement("li", null, "Tonal center decides what should rank first."),
        React.createElement("li", null, "Later chords can keep the same center or move to a new one.")
      )
    ),
    React.createElement(
      "div",
      { className: "progressions-layout" },
      React.createElement(
        "div",
        { className: "progressions-main" },
        React.createElement(
          "div",
          { className: "progression-summary-card" },
          React.createElement(
            "div",
            { className: "finder-summary-row" },
            React.createElement("p", { className: "control-label-inline progression-summary-label" }, "Progression"),
            React.createElement(
              "label",
              { className: "learning-family-choice finder-comprehensive-choice" },
              React.createElement("input", {
                type: "checkbox",
                checked: comprehensive,
                onChange: () => setComprehensive(!comprehensive),
              }),
              React.createElement("span", null, "Comprehensive")
            )
          ),
          React.createElement("p", { className: "progression-summary-text" }, progressionSummary),
          React.createElement(
            "p",
            { className: "subhead progression-inline-note" },
            "Matching follows this order: exact tonal-center matches first, then tonal-center scales that fit the chord, then broader chord-compatible colors."
          )
        ),
        rowsWithSpelling.map((row, index) => {
          const selectedCandidate =
            row.candidates.find((candidate) => candidate.scale.id === row.selectedScaleId) || null;
          const chordTitle = row.chordSymbol.trim() || "New chord";
          const headerScaleLabel = selectedCandidate?.rowLabel ? ` ${selectedCandidate.rowLabel}` : "";
          return React.createElement(
            "section",
            { key: row.id, className: "progression-row-card" },
            React.createElement(
              "div",
              { className: `progression-chord-panel${row.chordPanelOpen ? " is-open" : " is-closed"}` },
              React.createElement(
                "div",
                { className: "progression-row-header" },
                React.createElement(
                  "div",
                  { className: "progression-row-header-left" },
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "progression-panel-toggle",
                      onClick: () => toggleChordPanel(row.id),
                      "aria-expanded": row.chordPanelOpen,
                      "aria-controls": `chord-panel-body-${row.id}`,
                    },
                    React.createElement(
                      "span",
                      { className: `progression-panel-chevron${row.chordPanelOpen ? " is-open" : ""}`, "aria-hidden": "true" },
                      "▾"
                    ),
                    React.createElement("h3", { className: "progression-row-title" }, `Chord ${index + 1}: ${chordTitle}`)
                  ),
                  React.createElement(
                    "span",
                    { className: "progression-row-position-badge" },
                    `${row.effectivePosition} position`
                  ),
                  selectedCandidate?.rowLabel
                    ? React.createElement(
                        "span",
                        { className: "progression-row-scale-badge" },
                        headerScaleLabel.trim()
                      )
                    : null
                ),
                React.createElement(
                  "div",
                  { className: "learning-mode-switch progression-flow-switch progression-flow-switch-inline" },
                  React.createElement("span", null, "Position Flow"),
                  React.createElement(
                    "div",
                    { className: "mode-switch-group", role: "radiogroup", "aria-label": `Position flow for chord ${index + 1}` },
                    POSITION_FLOW_OPTIONS.map((option) =>
                      React.createElement(
                        "label",
                        { key: option.value, className: "mode-switch-option" },
                        React.createElement("input", {
                          type: "checkbox",
                          checked: row.positionFlow === option.value,
                          onChange: () => updateRow(row.id, "positionFlow", option.value),
                        }),
                        React.createElement("span", null, option.label)
                      )
                    )
                  )
                )
              )
            ),
            row.chordPanelOpen
              ? React.createElement(
                  "div",
                  { id: `chord-panel-body-${row.id}`, className: "progression-chord-panel-body" },
                  React.createElement(
                    "div",
                    { className: "progressions-controls-row" },
                    React.createElement(
                      "div",
                      { className: "progressions-control-field" },
                      React.createElement("label", { htmlFor: `tonal-center-${row.id}` }, "Tonal Center"),
                      React.createElement(
                        "select",
                        {
                          id: `tonal-center-${row.id}`,
                          value: row.tonalCenter,
                          onChange: (event) => updateRow(row.id, "tonalCenter", event.target.value),
                        },
                        TONAL_CENTERS.map((center) =>
                          React.createElement("option", { key: center, value: center }, center)
                        )
                      )
                    ),
                    React.createElement(
                      "div",
                      { className: "progressions-control-field" },
                      React.createElement("label", { htmlFor: `chord-symbol-${row.id}` }, "Chord"),
                      React.createElement("input", {
                        id: `chord-symbol-${row.id}`,
                        type: "text",
                        value: row.chordSymbol,
                        placeholder: "Am7b5",
                        onChange: (event) => updateRow(row.id, "chordSymbol", event.target.value),
                      })
                    ),
                    React.createElement(
                      "div",
                      { className: "progressions-control-field" },
                      React.createElement("label", { htmlFor: `position-${row.id}` }, "Position"),
                      React.createElement(
                        "select",
                        {
                          id: `position-${row.id}`,
                          value: row.effectivePosition,
                          disabled: row.positionFlow !== "free",
                          onChange: (event) => updateRow(row.id, "position", event.target.value),
                        },
                        POSITION_OPTIONS.map((option) =>
                          React.createElement("option", { key: option.value, value: option.value }, option.label)
                        )
                      )
                    )
                  ),
                  React.createElement(
                    "div",
                    { className: "progression-row-results" },
                    row.spelling.ok
                      ? React.createElement(
                          React.Fragment,
                          null,
                          selectedCandidate
                            ? React.createElement(
                                "div",
                                { className: "progression-selected-summary-grid" },
                                React.createElement(
                                  "p",
                                  { className: "progression-results-title progression-selected-summary-label progression-selected-summary-label-chord" },
                                  "Chord tones"
                                ),
                                React.createElement(
                                  "p",
                                  { className: "progression-results-title progression-selected-summary-label progression-selected-summary-label-scale" },
                                  `Selected scale ${selectedCandidate.rowLabel}`
                                ),
                                React.createElement(
                                  "p",
                                  { className: "progression-chord-spelling progression-selected-summary-value progression-selected-summary-value-chord" },
                                  row.spelling.notes.join("-")
                                ),
                                React.createElement(
                                  "div",
                                  {
                                    className:
                                      "progression-selected-scale-value progression-selected-summary-value progression-selected-summary-value-scale",
                                  },
                                  React.createElement(
                                    "p",
                                    {
                                      className: "progression-chord-spelling progression-selected-scale-spelling",
                                      title: `${selectedCandidate.parentScaleLabel} · ${selectedCandidate.matchTypeLabel}`,
                                    },
                                    visibleSpellingLabel(selectedCandidate.noteDetails, visibleDegreeClasses)
                                  )
                                ),
                                React.createElement(
                                  "button",
                                  {
                                    type: "button",
                                    className: "secondary-button progression-change-scale-button progression-selected-summary-button",
                                    onClick: () => clearRowScale(row.id),
                                  },
                                  "Change scale"
                                )
                              )
                            : React.createElement(
                                "div",
                                { className: "progression-chord-line" },
                                React.createElement(
                                  "div",
                                  { className: "progression-chord-line-copy" },
                                  React.createElement("p", { className: "progression-results-title" }, "Chord tones"),
                                  React.createElement("p", { className: "progression-chord-spelling" }, row.spelling.notes.join("-"))
                                )
                              )
                        )
                      : React.createElement("p", { className: "subhead progression-inline-note" }, row.spelling.error),
                    row.positionFlow !== "free"
                      ? React.createElement(
                          "p",
                          { className: "subhead progression-inline-note" },
                          `Derived position: ${row.effectivePosition} position.`
                        )
                      : null,
                    activeMode === "scales"
                      ? React.createElement(
                          "div",
                          { className: "progression-scale-selector-panel" },
                          renderCandidateScales(row, error, visibleDegreeClasses, {
                            onSelectScale: (scaleId) => selectRowScale(row.id, scaleId),
                          })
                        )
                      : React.createElement(
                          "p",
                          { className: "subhead progression-inline-note" },
                          "Chord-mode voicing results will live here once the shared chord model is in place."
                        )
                  )
                )
              : null,
            activeMode === "scales"
              ? React.createElement(
                  "div",
                  { className: "canvas-wrap progression-row-preview-window" },
                  React.createElement(RowFretboardPreview, {
                    active: true,
                    row,
                    selectedCandidate,
                    layoutScale: selectedCandidate ? layoutScalesById.get(selectedCandidate.scale.id) || null : null,
                    visibleDegreeClasses,
                    useThreeNps: useThreeNps && threeNpsAvailable,
                    options: fretboardOptions,
                  })
                )
              : null
          );
        }),
        React.createElement(
          "div",
          { className: "progression-actions" },
          React.createElement(
            "button",
            {
              type: "button",
              className: "secondary-button",
              onClick: addRow,
            },
            "Add Next Row"
          )
        )
      ),
      React.createElement(
        "aside",
        { className: "progressions-side-panel" },
        React.createElement(
          "div",
          { className: "side-panel-stack" },
            React.createElement(NoteSelector, {
              visibleGroups,
              onVisibleGroupsChange: setVisibleGroups,
              noteGroups: NOTE_GROUPS,
              threeNpsEnabled: useThreeNps,
              onThreeNpsChange: () => setUseThreeNps((current) => !current),
              threeNpsAvailable,
              showThreeNps: true,
            })
          )
      )
    )
  );
}

function renderCandidateScales(row, error, visibleDegreeClasses, actions) {
  if (error) {
    return React.createElement("p", { className: "subhead progression-inline-note" }, error);
  }
  if (!row.chordSymbol.trim()) {
    return React.createElement("p", { className: "subhead progression-inline-note" }, "Enter a chord symbol to drive scale ranking.");
  }
  if (!row.spelling.ok) {
    return React.createElement("p", { className: "subhead progression-inline-note" }, "Fix the chord spelling to see candidate scales.");
  }
  const tonalFitLabel = row.tonalFits.length > 0
    ? `Also fits tonal-center scales: ${row.tonalFits.join(", ")}.`
    : "No direct tonal-center scale fits yet for this chord.";
  if (row.candidates.length === 0) {
    return React.createElement(
      React.Fragment,
      null,
      React.createElement("p", { className: "subhead progression-inline-note" }, tonalFitLabel),
      React.createElement("p", { className: "subhead progression-inline-note" }, "No matching scales yet for this chord and tonal center.")
    );
  }

  const selectedCandidate = row.candidates.find((candidate) => candidate.scale.id === row.selectedScaleId) || null;
  if (selectedCandidate) {
    return null;
  }

  return React.createElement(
    React.Fragment,
    null,
    React.createElement("p", { className: "subhead progression-inline-note" }, tonalFitLabel),
    React.createElement("p", { className: "progression-results-title" }, "Candidate scales"),
    React.createElement(
      "div",
      { className: "progression-candidate-table" },
      React.createElement(
        "div",
        { className: "progression-candidate-table-header" },
        React.createElement("span", null, "Candidate scale"),
        React.createElement("span", null, "Spelling"),
        React.createElement("span", null, "Parent scale"),
        React.createElement("span", null, "Match type")
      ),
      row.candidates.map((candidate) =>
        React.createElement(
          "div",
          { key: `${row.id}-${candidate.scale.id}` },
          React.createElement(
            "button",
            {
              type: "button",
              className: "progression-candidate-row progression-candidate-button",
              onClick: () => actions.onSelectScale(candidate.scale.id),
            },
            React.createElement("span", { className: "progression-candidate-label" }, candidate.rowLabel),
            React.createElement(
              "span",
              { className: "progression-candidate-spelling" },
              visibleSpellingLabel(candidate.noteDetails, visibleDegreeClasses)
            ),
            React.createElement(
              "span",
              { className: "progression-candidate-parent" },
              React.createElement("span", { className: "progression-candidate-context" }, candidate.parentScaleLabel || "—"),
              candidate.parentScaleNoteDetails?.length
                ? React.createElement(
                    "span",
                    { className: "progression-candidate-parent-spelling" },
                    visibleSpellingLabel(candidate.parentScaleNoteDetails, visibleDegreeClasses)
                  )
                : null
            ),
            React.createElement(
              "span",
              { className: "progression-candidate-match" },
              React.createElement("span", { className: "progression-candidate-context" }, candidate.matchTypeLabel || "—"),
              candidate.descriptionLabel
                ? React.createElement(
                    "span",
                    {
                      className: "progression-candidate-tooltip-wrap",
                      tabIndex: 0,
                    },
                    React.createElement("span", { className: "progression-candidate-tooltip-trigger", "aria-hidden": "true" }, "?"),
                    React.createElement("span", { className: "progression-candidate-tooltip" }, candidate.descriptionLabel)
                  )
                : null
            )
          )
        )
      )
    )
  );
}

function buildCandidateScales({ scales, tonalCenter, chordInfo, comprehensive }) {
  if (!Array.isArray(scales) || scales.length === 0 || !chordInfo?.ok) {
    return { candidates: [], tonalFits: [] };
  }

  const tonalContext = parseTonalCenter(tonalCenter, scales);
  const chordPitchSet = buildPitchClassSet(chordInfo.notes);
  const chordSupportingCollections = buildCenterSupportScales(
    chordPitchSet,
    tonalContext.root,
    scales,
    comprehensive
  );
  const tonalFits = chordSupportingCollections.map((collection) => collection.label);
  const candidates = chordSupportingCollections.map((collection) => {
    const centerMatch = tonalContext.collections.find(
      (preferred) => sameNoteSets(preferred.noteSet, collection.noteSet)
    );
    const sourceParent = buildSourceParent(collection.scale, tonalContext.root, scales);
    const familyFit = classifyFamilyFit(collection, tonalContext);
    const displayModel =
      buildChordPerspectiveModel(collection.scale, tonalContext.root, chordInfo.root) || null;

    return {
      scale: collection.scale,
      rowLabel: collection.label,
      spellingLabel: displayModel?.spelling || collection.spelling,
      noteDetails: displayModel?.noteDetails || collection.noteDetails,
      displayScale: displayModel?.scale || collection.scale,
      displayRoot: displayModel?.root || chordInfo.root,
      parentScaleLabel: centerMatch ? collection.label : sourceParent.label || collection.label,
      parentScaleSpelling: centerMatch ? collection.spelling : sourceParent.spelling || collection.spelling,
      parentScaleNoteDetails: centerMatch ? collection.noteDetails : sourceParent.noteDetails || collection.noteDetails,
      matchTypeLabel: buildMatchTypeLabel(centerMatch, familyFit),
      descriptionLabel: centerMatch
        ? `same notes as ${collection.label}`
        : sourceParent.label
          ? `contains the chord tones; source parent ${sourceParent.label}`
          : "contains the chord tones",
      score: scoreSupportCandidate(collection, centerMatch, familyFit),
    };
  });

  return {
    candidates: candidates.sort((left, right) =>
      left.score - right.score || left.rowLabel.localeCompare(right.rowLabel)
    ),
    tonalFits,
  };
}

function buildChordPerspectiveModel(scale, parentRoot, chordRoot) {
  if (!scale || !parentRoot || !chordRoot) {
    return null;
  }

  let parentScaleNotes;
  try {
    parentScaleNotes = buildScaleNotes(parentRoot, scale);
  } catch (_error) {
    return null;
  }

  const parentNotes = parentScaleNotes?.notes || [];
  const chordPitch = noteNameToPitchClass(normalizeNoteName(chordRoot));
  if (!parentNotes.length || !Number.isFinite(chordPitch)) {
    return null;
  }

  const rootNoteIndex = parentNotes.findIndex(
    (note) => noteNameToPitchClass(normalizeNoteName(note)) === chordPitch
  );
  if (rootNoteIndex === -1) {
    return null;
  }

  const rotatedNotes = rotateFromIndex(parentNotes, rootNoteIndex);
  const intervals = rotatedNotes
    .map((note) => {
      const notePitch = noteNameToPitchClass(normalizeNoteName(note));
      const degree = degreeClassForNote(chordRoot, note);
      if (!Number.isFinite(notePitch) || !Number.isFinite(degree)) {
        return null;
      }
      return {
        semitones: (notePitch - chordPitch + 12) % 12,
        degree,
      };
    })
    .filter(Boolean);

  if (intervals.length !== rotatedNotes.length) {
    return null;
  }

  const displayScale = {
    ...scale,
    intervals,
  };

  try {
    const displayScaleNotes = buildScaleNotes(chordRoot, displayScale);
    return {
      scale: displayScale,
      root: chordRoot,
      spelling: (displayScaleNotes.notes || []).join("-"),
      noteDetails: displayScaleNotes.noteDetails || [],
    };
  } catch (_error) {
    return null;
  }
}

function rotateFromIndex(values, startIndex) {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }
  return [...values.slice(startIndex), ...values.slice(0, startIndex)];
}

function resolveCandidatePositionLayout(scale, position, useThreeNps) {
  if (!scale || !position) {
    return null;
  }
  const familyCode = useThreeNps ? "3nps" : "standard";
  return (
    scale?.layout_families?.[familyCode]?.positions?.[position] ||
    scale?.layout_families?.standard?.positions?.[position] ||
    scale?.positions?.[position] ||
    null
  );
}

function progressionPositionLayout(positionLayout, useThreeNps = false) {
  if (!positionLayout) {
    return null;
  }
  const normalized = { ...positionLayout };
  delete normalized.per_string_frets;
  return normalized;
}

function tonalCenterRoot(value) {
  const match = String(value || "").trim().match(/^([A-G][b#]?)[ ]+(major|minor)$/i);
  return match?.[1] || "C";
}

function parseTonalCenter(value, scales) {
  const trimmed = String(value || "").trim();
  const match = trimmed.match(/^([A-G][b#]?)[ ]+(major|minor)$/i);
  if (!match) {
    return { root: "C", quality: "major", collections: [] };
  }

  const root = match[1];
  const quality = match[2].toLowerCase();
  const preferredScaleNames =
    quality === "minor"
      ? ["Natural Minor", "Harmonic Minor", "Melodic Minor"]
      : ["Major"];

  const collections = preferredScaleNames
    .map((name, index) => {
      const scale = scales.find((item) => item.name === name);
      if (!scale) return null;
      try {
        const notes = buildScaleNotes(root, scale).notes || [];
        return {
          scale,
          rank: index,
          noteSet: new Set(notes.map(normalizeNoteName)),
        };
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean);

  return { root, quality, collections };
}

function buildCenterSupportScales(chordPitchSet, tonalCenterRoot, scales, comprehensive) {
  if (!tonalCenterRoot) {
    return [];
  }

  return scales
    .filter((scale) => comprehensive || !scale?.latent)
    .filter((scale) => scale?.name !== "Chromatic")
    .map((scale) => {
      try {
        const scaleNotes = buildScaleNotes(tonalCenterRoot, scale);
        const notes = scaleNotes.notes || [];
        const noteSet = new Set(notes.map(normalizeNoteName));
        const pitchSet = buildPitchClassSet(notes);
        if (![...chordPitchSet].every((pitch) => pitchSet.has(pitch))) {
          return null;
        }
        return {
          scale,
          label: `${tonalCenterRoot} ${scaleOptionLabel(scale)}`,
          spelling: notes.join("-"),
          noteDetails: scaleNotes.noteDetails || [],
          noteSet,
          pitchSet,
          noteCount: notes.length,
        };
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((left, right) =>
      Number(left.scale?.latent) - Number(right.scale?.latent) ||
      left.noteCount - right.noteCount ||
      scaleOptionLabel(left.scale).localeCompare(scaleOptionLabel(right.scale))
    );
}

function buildSourceParent(scale, root, scales) {
  if (!scale?.parent_family || !Number.isFinite(scale?.parent_mode_number) || scale.parent_mode_number < 1) {
    return { label: "", spelling: "", root: "" };
  }

  const familyScale = scales.find((item) => item.name === scale.parent_family);
  const modeInterval = familyScale?.intervals?.[scale.parent_mode_number - 1];
  const semitones = Number(modeInterval?.semitones);
  if (!familyScale || !Number.isFinite(semitones)) {
    return { label: "", spelling: "", root: "" };
  }

  const parentRoot = transposeNote(root, -semitones, shouldUseFlats(root));
  if (!parentRoot) {
    return { label: "", spelling: "", root: "" };
  }

  let spelling = "";
  try {
    const scaleNotes = buildScaleNotes(parentRoot, familyScale);
    spelling = (scaleNotes.notes || []).join("-");
    return {
      label: `${parentRoot} ${familyScale.name}`,
      spelling,
      noteDetails: scaleNotes.noteDetails || [],
      root: parentRoot,
    };
  } catch (_error) {
    spelling = "";
  }

  return {
    label: `${parentRoot} ${familyScale.name}`,
    spelling,
    noteDetails: [],
    root: parentRoot,
  };
}

function transposeNote(noteName, semitoneOffset, useFlats = false) {
  const pitch = noteNameToPitchClass(noteName);
  if (!Number.isFinite(pitch)) {
    return "";
  }
  const scale = useFlats ? FLAT_SCALE : SHARP_SCALE;
  return scale[(pitch + semitoneOffset + 120) % 12] || "";
}

function sameNoteSets(left, right) {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
}

function buildPitchClassSet(notes) {
  const values = new Set();
  for (const note of notes || []) {
    const pitch = noteNameToPitchClass(normalizeNoteName(note));
    if (Number.isFinite(pitch)) {
      values.add(pitch);
    }
  }
  return values;
}

function visibleSpellingLabel(noteDetails, visibleDegreeClasses) {
  if (!Array.isArray(noteDetails) || noteDetails.length === 0) {
    return "—";
  }
  const filtered = noteDetails
    .filter((detail) => visibleDegreeClasses.has(detail.degreeClass))
    .map((detail) => detail.note);
  return filtered.length > 0 ? filtered.join("-") : "—";
}

function normalizeChordSymbolInput(value) {
  const text = String(value || "");
  return text.replace(/(^|\/)([a-g])([b#]?)/g, (_match, prefix, letter, accidental) => {
    return `${prefix}${letter.toUpperCase()}${accidental || ""}`;
  });
}

function positionFlowLabel(value) {
  const match = POSITION_FLOW_OPTIONS.find((option) => option.value === value);
  return match?.label || "Free";
}

function deriveRowPosition(row, previousRow, options = {}) {
  const { layoutScalesById = new Map(), useThreeNps = false } = options;
  if (
    row.positionFlow === "free" ||
    !row.spelling?.ok ||
    !previousRow?.spelling?.ok ||
    !previousRow?.spelling?.root
  ) {
    return {
      position: row.position || "C",
      anchorFret: anchorFretForPosition(row.spelling?.root || "C", row.position || "C"),
    };
  }

  const previousAnchorFret = Number.isFinite(previousRow.effectiveAnchorFret)
    ? previousRow.effectiveAnchorFret
    : anchorFretForPosition(
        previousRow.spelling?.root || "C",
        previousRow.effectivePosition || previousRow.position || "C"
      );

  const previousWindow = layoutWindowForRow(previousRow, layoutScalesById, useThreeNps);
  const currentCandidate =
    row.candidates?.find((candidate) => candidate.scale.id === row.selectedScaleId) || null;
  const currentLayoutScale = currentCandidate ? layoutScalesById.get(currentCandidate.scale.id) || null : null;

  if (previousWindow && currentCandidate && currentLayoutScale) {
    const sameChoice = deriveOverlappingPositionChoice(
      currentCandidate,
      currentLayoutScale,
      row,
      previousWindow,
      useThreeNps
    );
    if (sameChoice) {
      if (row.positionFlow === "same_position") {
        return sameChoice;
      }
      if (row.positionFlow === "ascending" || row.positionFlow === "descending") {
        const shifted = shiftToAvailablePosition(
          currentCandidate,
          currentLayoutScale,
          row,
          sameChoice.position,
          row.positionFlow === "ascending" ? 1 : -1,
          useThreeNps
        );
        if (shifted) {
          return shifted;
        }
      }
      return sameChoice;
    }
  }

  const sameChoice = deriveSamePositionChoice(row.spelling.root, previousAnchorFret);
  if (row.positionFlow === "same_position") {
    return sameChoice;
  }
  if (row.positionFlow === "ascending" || row.positionFlow === "descending") {
    const shiftedPosition = shiftPositionCode(
      sameChoice.position,
      row.positionFlow === "ascending" ? 1 : -1
    );
    return {
      position: shiftedPosition,
      anchorFret: anchorFretNear(row.spelling.root, shiftedPosition, sameChoice.anchorFret),
    };
  }
  return sameChoice;
}

function deriveSamePositionChoice(root, previousAnchorFret) {
  let best = {
    position: "C",
    anchorFret: previousAnchorFret,
    distance: Number.POSITIVE_INFINITY,
  };

  for (const option of POSITION_OPTIONS) {
    const anchorFret = anchorFretNear(root, option.value, previousAnchorFret);
    if (!Number.isFinite(anchorFret)) {
      continue;
    }
    const distance = Math.abs(anchorFret - previousAnchorFret);
    if (distance < best.distance) {
      best = {
        position: option.value,
        anchorFret,
        distance,
      };
    }
  }

  return { position: best.position, anchorFret: best.anchorFret };
}

function shiftPositionCode(position, step) {
  const currentIndex = POSITION_SEQUENCE.indexOf(position);
  if (currentIndex === -1) {
    return position || "C";
  }
  const nextIndex = (currentIndex + step + POSITION_SEQUENCE.length) % POSITION_SEQUENCE.length;
  return POSITION_SEQUENCE[nextIndex];
}

function layoutWindowForRow(row, layoutScalesById, useThreeNps) {
  const selectedCandidate =
    row.candidates?.find((candidate) => candidate.scale.id === row.selectedScaleId) || null;
  const layoutScale = selectedCandidate ? layoutScalesById.get(selectedCandidate.scale.id) || null : null;
  if (!selectedCandidate || !layoutScale) {
    return null;
  }
  return computeLayoutWindowForCandidate(
    selectedCandidate,
    layoutScale,
    row,
    row.effectivePosition || row.position,
    useThreeNps
  );
}

function deriveOverlappingPositionChoice(candidate, layoutScale, row, previousWindow, useThreeNps) {
  let best = null;
  for (const option of POSITION_OPTIONS) {
    const window = computeLayoutWindowForCandidate(candidate, layoutScale, row, option.value, useThreeNps);
    if (!window) {
      continue;
    }
    const overlap = windowOverlap(previousWindow, window);
    const centerDistance = Math.abs(previousWindow.center - window.center);
    if (
      !best ||
      overlap > best.overlap ||
      (overlap === best.overlap && centerDistance < best.centerDistance)
    ) {
      best = {
        position: option.value,
        anchorFret: window.center,
        overlap,
        centerDistance,
      };
    }
  }
  return best ? { position: best.position, anchorFret: best.anchorFret } : null;
}

function shiftToAvailablePosition(candidate, layoutScale, row, basePosition, step, useThreeNps) {
  const startIndex = POSITION_SEQUENCE.indexOf(basePosition);
  if (startIndex === -1) {
    return null;
  }
  for (let offset = 1; offset < POSITION_SEQUENCE.length; offset += 1) {
    const index = (startIndex + step * offset + POSITION_SEQUENCE.length * 4) % POSITION_SEQUENCE.length;
    const position = POSITION_SEQUENCE[index];
    const window = computeLayoutWindowForCandidate(candidate, layoutScale, row, position, useThreeNps);
    if (window) {
      return { position, anchorFret: window.center };
    }
  }
  return null;
}

function computeLayoutWindowForCandidate(candidate, layoutScale, row, position, useThreeNps) {
  const windowModel = positionWindowModel(candidate, row, useThreeNps);
  return computeLayoutWindow(windowModel.scale, layoutScale, windowModel.key, position, useThreeNps);
}

function positionWindowModel(candidate, row, useThreeNps) {
  return {
    scale: candidate.displayScale || candidate.scale,
    key: candidate.displayRoot || row.spelling?.root || tonalCenterRoot(row.tonalCenter),
  };
}

function computeLayoutWindow(scale, layoutScale, displayRoot, position, useThreeNps) {
  const positionLayout = progressionPositionLayout(
    resolveCandidatePositionLayout(layoutScale, position, useThreeNps),
    useThreeNps
  );
  if (!positionLayout) {
    return null;
  }
  const trimmed = computeFretboardLayout({
    scale,
    key: displayRoot,
    tuningStrings: STANDARD_TUNING_STRINGS,
    positionLayout,
  });
  if (!trimmed || !Number.isFinite(trimmed.positionStart) || !Number.isFinite(trimmed.fretCount)) {
    return null;
  }
  const start = trimmed.positionStart;
  const end = trimmed.positionStart + trimmed.fretCount - 1;
  return {
    start,
    end,
    center: start + (end - start) / 2,
  };
}

function windowOverlap(left, right) {
  return Math.max(0, Math.min(left.end, right.end) - Math.max(left.start, right.start) + 1);
}

function anchorFretForPosition(root, position) {
  return anchorFretNear(root, position, 12);
}

function anchorFretNear(root, position, targetFret) {
  const stringNumber = POSITION_ANCHOR_STRING[position];
  const openPitch = STANDARD_TUNING_OPEN_PITCH[stringNumber];
  const rootPitch = noteNameToPitchClass(normalizeNoteName(root));
  if (!Number.isFinite(openPitch) || !Number.isFinite(rootPitch)) {
    return NaN;
  }

  const baseFret = (rootPitch - openPitch + 120) % 12;
  let bestFret = baseFret;
  let bestDistance = Math.abs(baseFret - targetFret);

  for (let octave = -2; octave <= 3; octave += 1) {
    const candidateFret = baseFret + octave * 12;
    if (candidateFret < 0 || candidateFret > 24) {
      continue;
    }
    const distance = Math.abs(candidateFret - targetFret);
    if (distance < bestDistance) {
      bestFret = candidateFret;
      bestDistance = distance;
    }
  }

  return bestFret;
}

function classifyFamilyFit(collection, tonalContext) {
  const rootPitch = noteNameToPitchClass(normalizeNoteName(tonalContext.root));
  if (!Number.isFinite(rootPitch)) {
    return "neutral_family";
  }

  const hasMinorThird = collection.pitchSet.has((rootPitch + 3) % 12);
  const hasMajorThird = collection.pitchSet.has((rootPitch + 4) % 12);

  if (tonalContext.quality === "minor") {
    if (hasMinorThird) return "same_family";
    if (hasMajorThird) return "diff_family";
    return "neutral_family";
  }

  if (hasMajorThird) return "same_family";
  if (hasMinorThird) return "diff_family";
  return "neutral_family";
}

function buildMatchTypeLabel(centerMatch, familyFit) {
  if (centerMatch) {
    if (familyFit === "same_family") return "Exact · same family";
    if (familyFit === "diff_family") return "Exact · diff family";
    return "Exact match";
  }
  if (familyFit === "same_family") return "Contains notes · same family";
  if (familyFit === "diff_family") return "Contains notes · diff family";
  return "Contains notes";
}

function scoreSupportCandidate(collection, centerMatch, familyFit) {
  if (centerMatch) {
    return familyRank(familyFit) + centerMatch.rank;
  }
  const latentPenalty = collection.scale?.latent ? 100 : 0;
  return 10 + familyRank(familyFit) + latentPenalty + Math.max(0, collection.noteCount - 4);
}

function familyRank(familyFit) {
  if (familyFit === "same_family") return 0;
  if (familyFit === "neutral_family") return 3;
  if (familyFit === "diff_family") return 6;
  return 9;
}
