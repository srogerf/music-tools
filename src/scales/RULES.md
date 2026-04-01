# Scales Module Rules

These rules apply to code under `src/scales`.

- Language: Go.
- Package name: `scales` (matches directory name).
- Core responsibility: define and manage scale metadata (name, common name, intervals, and type).
- Interval definitions must be stored in data files under `data/scales/`.
- Interval definitions must be absolute semitone offsets from the root (e.g., major scale: `[0,2,4,5,7,9,11]`).
- Avoid CLI or server code in this module; it should be reusable library logic.
