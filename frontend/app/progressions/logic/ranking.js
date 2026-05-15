import { buildScaleNotes } from "fretboard-layout";
import { normalizeNoteName } from "../../music/note_logic.js";
import { scaleOptionLabel } from "../../scales/scales_controller/scales_controller_helpers.js";
import {
  FLAT_SCALE,
  SHARP_SCALE,
  degreeClassForNote,
  noteNameToPitchClass,
  shouldUseFlats,
} from "../../fretboard/fretboard_note_helpers.js";

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

function tonalCenterRoot(value) {
  if (value && typeof value === "object") {
    return String(value.tonalCenterKey || "").trim();
  }
  const match = String(value || "").trim().match(/^([A-G][b#]?)[ ]+(major|minor)$/i);
  return match?.[1] || "";
}

function parseTonalCenter(value, scales) {
  const root =
    value && typeof value === "object"
      ? String(value.tonalCenterKey || "").trim()
      : tonalCenterRoot(value);
  const quality =
    value && typeof value === "object" ? (value.tonalCenterMinor ? "minor" : "major") : "major";
  if (!root) {
    return { root: "", quality, collections: [] };
  }
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

function buildCenterSupportScales(chordPitchSet, tonalCenterRootValue, scales, comprehensive) {
  if (!tonalCenterRootValue) {
    return [];
  }

  return scales
    .filter((scale) => comprehensive || !scale?.latent)
    .filter((scale) => scale?.name !== "Chromatic")
    .map((scale) => {
      try {
        const scaleNotes = buildScaleNotes(tonalCenterRootValue, scale);
        const notes = scaleNotes.notes || [];
        const noteSet = new Set(notes.map(normalizeNoteName));
        const pitchSet = buildPitchClassSet(notes);
        if (![...chordPitchSet].every((pitch) => pitchSet.has(pitch))) {
          return null;
        }
        return {
          scale,
          label: `${tonalCenterRootValue} ${scaleOptionLabel(scale)}`,
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
    if (!right.has(value)) {
      return false;
    }
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

export {
  buildCandidateScales,
  tonalCenterRoot,
};
