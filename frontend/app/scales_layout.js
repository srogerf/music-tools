export const CAGED_SHAPES = ["C", "A", "G", "E", "D"];

export const CAGED_BASE_STARTS = {
  // Base start frets for key of C (4-fret boxes).
  // Other keys transpose this start by the key interval.
  C: 0,
  A: 2,
  G: 4,
  E: 7,
  D: 8,
};

export const CAGED_MIN_SPANS = {
  C: 4,
  A: 5,
  G: 5,
  E: 5,
  D: 6,
};

export const CAGED_ROOT_OFFSETS = {
  // Offsets within the shape window where roots must appear.
  // String indices (0 = low E) are documented for reference only.
  // C: A string offset 3, B string offset 1
  // A: A string offset 1, G string offset 3
  // G: low E offset 0, D offset 3
  // E: low E offset 1, D offset 3
  // D: D offset 0, B offset 3
  C: [1, 3],
  A: [1, 3],
  G: [0, 3],
  E: [1, 3],
  D: [0, 3],
};

export const CAGED_SPLIT_RANGES = {
  // Key-of-C split ranges; other keys transpose by rootIndex.
  D: {
    perString: {
      0: { start: 8, span: 5 }, // low E
      1: { start: 8, span: 5 }, // A
      2: { start: 8, span: 5 }, // D
      3: { start: 8, span: 5 }, // G
      4: { start: 10, span: 4 }, // B
      5: { start: 10, span: 4 }, // high E
    },
  },
};
