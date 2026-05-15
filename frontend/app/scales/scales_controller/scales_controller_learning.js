import { buildScaleNotes } from "fretboard-layout";
import { LEARNING_NOTE_CHOICE_SET } from "../learning_mode/learning_mode_panel.js";
import {
  accidentalLabel,
  normalizeText,
  noteSelectionMatches,
  randomItem,
  signatureSelectionMatches,
} from "./scales_controller_helpers.js";

function buildLearningScaleNames(learningScaleGroups, learningGroups) {
  const fallbackGroupKey = learningScaleGroups[0]?.key;
  const selectedGroups = learningGroups.length > 0 ? learningGroups : fallbackGroupKey ? [fallbackGroupKey] : [];
  return selectedGroups.flatMap(
    (groupKey) => learningScaleGroups.find((group) => group.key === groupKey)?.entries.map((scale) => scale.name) || []
  );
}

function buildAvailableLearningScales(scales, learningScaleGroups, learningGroups) {
  const names = new Set(buildLearningScaleNames(learningScaleGroups, learningGroups).map(normalizeText));
  return scales.filter((scale) => names.has(normalizeText(scale.name)));
}

function buildAvailableLearningKeys(scale, defaultKeys) {
  if (!scale) {
    return [];
  }
  return defaultKeys.filter((key) => {
    const notes = buildScaleNotes(key, scale).notes;
    return !notes.some((note) => !LEARNING_NOTE_CHOICE_SET.has(note));
  });
}

function buildRandomLearningChallenge({
  scales,
  learningScaleGroups,
  learningGroups,
  defaultKeys,
  cagedShapes,
}) {
  const scale = randomItem(buildAvailableLearningScales(scales, learningScaleGroups, learningGroups));
  const key = randomItem(buildAvailableLearningKeys(scale, defaultKeys));
  const position = randomItem(cagedShapes);
  if (!scale || !key || !position) {
    return null;
  }
  return { scale, key, position };
}

function buildLearningResult({
  learningSignatureCount,
  learningSignatureType,
  learningSelectedNotes,
  noteDetails,
  context,
}) {
  const notes = noteDetails.map((note) => note.note);
  const signedAccidentals = Number(context.signature?.signed_accidentals || 0);
  const signatureCorrect = signatureSelectionMatches(
    learningSignatureCount,
    learningSignatureType,
    signedAccidentals
  );
  const notesCorrect = noteSelectionMatches(learningSelectedNotes, notes);
  const outsideKeySignatureNotes = context.outside_key_signature_notes || [];

  return {
    signatureCorrect,
    notesCorrect,
    signedAccidentals,
    signatureLabel: context.signature?.label || accidentalLabel(signedAccidentals),
    notes,
    outsideKeySignatureNotes,
    message: signatureCorrect && notesCorrect ? "Correct" : "Check the answer",
  };
}

export {
  buildAvailableLearningKeys,
  buildAvailableLearningScales,
  buildLearningResult,
  buildLearningScaleNames,
  buildRandomLearningChallenge,
};
