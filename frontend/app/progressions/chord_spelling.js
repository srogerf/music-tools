import {
  LETTER_ORDER,
  NATURAL_PITCH,
  noteNameToPitchClass,
  normalizeKey,
} from "../fretboard/fretboard_note_helpers.js";

const BASE_QUALITIES = [
  { prefix: "sus2", name: "sus2", degrees: [{ degree: 1, semitones: 0 }, { degree: 2, semitones: 2 }, { degree: 5, semitones: 7 }] },
  { prefix: "sus4", name: "sus4", degrees: [{ degree: 1, semitones: 0 }, { degree: 4, semitones: 5 }, { degree: 5, semitones: 7 }] },
  { prefix: "dim", name: "dim", degrees: [{ degree: 1, semitones: 0 }, { degree: 3, semitones: 3 }, { degree: 5, semitones: 6 }] },
  { prefix: "aug", name: "aug", degrees: [{ degree: 1, semitones: 0 }, { degree: 3, semitones: 4 }, { degree: 5, semitones: 8 }] },
  { prefix: "maj", name: "maj", degrees: [{ degree: 1, semitones: 0 }, { degree: 3, semitones: 4 }, { degree: 5, semitones: 7 }] },
  { prefix: "min", name: "min", degrees: [{ degree: 1, semitones: 0 }, { degree: 3, semitones: 3 }, { degree: 5, semitones: 7 }] },
  { prefix: "m", name: "min", degrees: [{ degree: 1, semitones: 0 }, { degree: 3, semitones: 3 }, { degree: 5, semitones: 7 }] },
];

const DEFAULT_MAJOR_TRIAD = [{ degree: 1, semitones: 0 }, { degree: 3, semitones: 4 }, { degree: 5, semitones: 7 }];
const ADDITIONS = {
  "6": { degree: 6, semitones: 9 },
  "7": { degree: 7, semitones: 10 },
  "maj7": { degree: 7, semitones: 11 },
  "9": { degree: 2, semitones: 2 },
  "11": { degree: 4, semitones: 5 },
  "13": { degree: 6, semitones: 9 },
};

function parseChordSymbol(symbol) {
  const raw = String(symbol || "").trim();
  if (!raw) {
    return { ok: false, error: "" };
  }

  const match = raw.match(/^([A-Ga-g])([b#]?)(.*)$/);
  if (!match) {
    return { ok: false, error: "Use a root like C, F#, or Bb." };
  }

  const root = normalizeKey(`${match[1].toUpperCase()}${match[2] || ""}`);
  let suffix = match[3] || "";

  let quality = DEFAULT_MAJOR_TRIAD;
  for (const candidate of BASE_QUALITIES) {
    if (suffix.startsWith(candidate.prefix)) {
      quality = candidate.degrees;
      suffix = suffix.slice(candidate.prefix.length);
      break;
    }
  }

  const tones = quality.map((item) => ({ ...item }));

  if (suffix.startsWith("maj7")) {
    upsertDegree(tones, ADDITIONS.maj7);
    suffix = suffix.slice(4);
  } else if (suffix.startsWith("7")) {
    upsertDegree(tones, ADDITIONS["7"]);
    suffix = suffix.slice(1);
  } else if (suffix.startsWith("6")) {
    upsertDegree(tones, ADDITIONS["6"]);
    suffix = suffix.slice(1);
  }

  while (suffix.length > 0) {
    if (suffix.startsWith("b5")) {
      upsertDegree(tones, { degree: 5, semitones: 6 });
      suffix = suffix.slice(2);
      continue;
    }
    if (suffix.startsWith("#5")) {
      upsertDegree(tones, { degree: 5, semitones: 8 });
      suffix = suffix.slice(2);
      continue;
    }
    if (suffix.startsWith("9")) {
      upsertDegree(tones, ADDITIONS["9"]);
      suffix = suffix.slice(1);
      continue;
    }
    if (suffix.startsWith("11")) {
      upsertDegree(tones, ADDITIONS["11"]);
      suffix = suffix.slice(2);
      continue;
    }
    if (suffix.startsWith("13")) {
      upsertDegree(tones, ADDITIONS["13"]);
      suffix = suffix.slice(2);
      continue;
    }
    return { ok: false, error: `Unsupported chord spelling in "${raw}".` };
  }

  const spelledNotes = tones
    .sort((left, right) => left.degree - right.degree || left.semitones - right.semitones)
    .map((tone) => spellChordTone(root, tone.degree, tone.semitones));

  if (spelledNotes.some((note) => !note)) {
    return { ok: false, error: `Couldn't spell "${raw}" yet.` };
  }

  return {
    ok: true,
    root,
    symbol: raw,
    notes: spelledNotes,
  };
}

function upsertDegree(tones, addition) {
  const existingIndex = tones.findIndex((tone) => tone.degree === addition.degree);
  if (existingIndex >= 0) {
    tones[existingIndex] = { ...addition };
    return;
  }
  tones.push({ ...addition });
}

function spellChordTone(root, degree, semitoneOffset) {
  const rootPitch = noteNameToPitchClass(root);
  if (rootPitch === undefined) {
    return "";
  }

  const rootLetter = root[0];
  const rootLetterIndex = LETTER_ORDER.indexOf(rootLetter);
  if (rootLetterIndex < 0) {
    return "";
  }

  const targetLetter = LETTER_ORDER[(rootLetterIndex + degree - 1) % LETTER_ORDER.length];
  const targetNaturalPitch = NATURAL_PITCH[targetLetter];
  const targetPitch = (rootPitch + semitoneOffset) % 12;
  let offset = (targetPitch - targetNaturalPitch + 12) % 12;
  if (offset > 6) {
    offset -= 12;
  }
  if (offset < -2 || offset > 2) {
    return "";
  }

  return `${targetLetter}${accidentalForOffset(offset)}`;
}

function accidentalForOffset(offset) {
  if (offset === -2) return "bb";
  if (offset === -1) return "b";
  if (offset === 0) return "";
  if (offset === 1) return "#";
  if (offset === 2) return "##";
  return "";
}

export { parseChordSymbol };
