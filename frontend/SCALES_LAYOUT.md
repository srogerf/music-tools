# Scale Layout Rules

This document records the fretboard layout rules used by the React UI.

## Goals

- Keep each CAGED shape stable across keys.
- Include all scale tones within the displayed window.
- Prefer compact windows, but allow expanding when a full scale requires it.
- Support split windows when a shape spans two ranges.

## Data Sources

The layout data lives in `frontend/app/scales_layout.js`:

- `CAGED_SHAPES`: The list of available shapes.
- `CAGED_BASE_STARTS`: Base start frets for the key of C.
- `CAGED_MIN_SPANS`: Minimum fret span per shape.
- `CAGED_ROOT_OFFSETS`: Required root offsets within the window.
- `CAGED_SPLIT_RANGES`: Per-string windows for split shapes.

## Algorithm

1. Compute the scale notes for the selected key.
2. Compute the key interval (`rootIndex`) from the chromatic scale.
3. Determine whether the selected shape has a split range in `CAGED_SPLIT_RANGES`.

If the shape is split:

- Transpose each per-string range by `rootIndex`.
- The overall display range is the min start to max end across strings.
- Each string only draws notes that fall inside its specific per-string range.

If the shape is not split:

- Start fret = `CAGED_BASE_STARTS[shape] + rootIndex`.
- Minimum span = `CAGED_MIN_SPANS[shape]`.
- Required root offsets = `CAGED_ROOT_OFFSETS[shape]`.
- Choose the smallest span (up to 12 frets) that includes all scale tones.

## Shape Notes

Key of C reference ranges as agreed:

- C shape: frets 0–3
- A shape: frets 2–5
- G shape: frets 4–8 (5-fret span)
- E shape: frets 7–10
- D shape: split range
  - strings 6–3: frets 8–12
  - strings 2–1: frets 10–13

To adjust shapes, edit `frontend/app/scales_layout.js` and update this doc if the rules change.
