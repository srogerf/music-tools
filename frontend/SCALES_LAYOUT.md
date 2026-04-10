# Scale Layout Rules

This document records the fretboard layout rules used by the React UI.

## Goals

- Keep each CAGED shape stable across keys.
- Include all scale tones within the displayed window.
- Prefer compact windows, but allow expanding when a full scale requires it.
- Support split windows when a shape spans two ranges.
- Each pitch within the displayed window must appear exactly once.

## Data Sources

The available shape names for the frontend selector live in `frontend/app/scales_layout.js`:

- `CAGED_SHAPES`: The list of available shapes.
- `CAGED_BASE_STARTS`: Base start frets for the key of C.
- `CAGED_MIN_SPANS`: Minimum fret span per shape.
- `CAGED_ROOT_OFFSETS`: Required root offsets within the window.
- `CAGED_SPLIT_RANGES`: Per-string windows for split shapes.

The actual layout data (per tuning/scale/position) lives in:

- `data/scales/layouts/`

Each scale has its own file. Prefer the smallest layout representation that works:

- use `start` + `span` for simple ranges
- use `per_string` only for true split layouts
- use `per_string_frets` only when simpler definitions are not enough

## Algorithm

1. Compute the scale notes for the selected key.
2. Compute the key interval (`rootIndex`) from the chromatic scale.
3. Determine whether the selected shape has a split range in `CAGED_SPLIT_RANGES`.

If the shape is split:

- Transpose each per-string range by the selected key interval.
- The overall display range is the min start to max end across strings.
- Each string only draws notes that fall inside its specific per-string range.

If the shape is not split:

- Start fret = `CAGED_BASE_STARTS[shape] + key interval`.
- Minimum span = `CAGED_MIN_SPANS[shape]`.
- Required root offsets = `CAGED_ROOT_OFFSETS[shape]`.
- Choose the smallest span (up to 12 frets) that includes all scale tones.

## Validation Rule

For each layout position, every pitch within the displayed window must appear
exactly once. The validator will fail if a pitch is missing or repeated. Use
`per_string_frets` in `data/scales/layouts/` to enforce this when ranges
alone would cause duplicates.

## Shape Notes

Key of C reference ranges as agreed:

- C shape: frets 0–3
- A shape: frets 2–6 (5-fret span)
- G shape: frets 4–8 (5-fret span)
- E shape: frets 7–10 (4-fret span)
- D shape: split range
  - strings 6–3: frets 8–12
  - strings 2–1: frets 10–13

To adjust shapes, edit the relevant file in `data/scales/layouts/` and update this doc if the rules change.
