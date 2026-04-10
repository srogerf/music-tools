# Src Structure

This document defines the organization rules for code under `src/`.

## Purpose
`src/` holds reusable internal code that does not belong to tools, servers, or frontend apps. Go code here is part of the repository's root Go module (`go.mod` at the repo root).

## Guidelines
- Each subdirectory under `src/` must include a `README.md` describing its purpose and ownership.
- Keep code focused on reusable logic; avoid entry points or executables here. Go `main` packages live under `tools/` or other app directories.
- Prefer small, cohesive packages with clear boundaries.

## Domain Areas
- `src/scales/`: defines and manages scales, including intervals, scale name, and common name.
  - Include a type describing the scale grouping (e.g., triad, quadad, pentatonic, diatonic).
  - Data is stored in definition files under `data/` (eventually migrates to a database).
  - Language: Go (imported as `music-tools/src/scales` within this repo).
- `src/chords/`: defines chords as a series of notes played simultaneously.
- `src/measures/`: defines measures with a time signature, key signature, and a series of notes and chords.
- `src/time_signatures/`: time signature definitions.
- `src/key_signatures/`: key signature definitions.
- `src/notes/`: notes and any special effects applied to them (subject to change).
- `src/interval/`: interval naming helpers (common and short names).
