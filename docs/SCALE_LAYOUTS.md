# Scale Layouts

This document describes the current scale-layout model and records the design
direction we should use when exploring 3-notes-per-string (3NPS) support.

## Current Source Of Truth

- Scale layout data is still the source of truth.
- Layout files live in `data/scales/layouts/`.
- Each scale has its own file.
- Layouts are grouped by tuning, then by named position.
- The backend loads these files into `ScaleLayoutScale.Positions`, which is a
  `map[string]ScaleLayoutPosition`.
- The frontend renders whichever position object the API returns for the
  selected tuning, scale, and position.

This means layout selection can be frontend-driven, but the actual fret choices
should remain data-driven unless we explicitly decide to generate a family of
layouts algorithmically.

## Current Position Model

Each position currently uses this shape:

```json
{
  "mode": "range | split",
  "start": 0,
  "span": 4,
  "per_string": {
    "0": { "start": 8, "span": 5 }
  },
  "split_ranges": [
    { "strings": [0, 1, 2, 3], "start": 8, "span": 5 }
  ],
  "per_string_frets": {
    "0": [8, 10, 12]
  },
  "validated_manual": true
}
```

In practice:

- `range` means one shared `start` + `span` window for every string.
- `split` means different strings can use different windows.
- `per_string` is a direct per-string window map.
- `split_ranges` is a grouped form of split windows.
- `per_string_frets` is the most explicit representation and is used when a
  range-based definition would create duplicates or miss notes.

## Current Frontend Algorithm

The current rendering flow is:

1. Fetch layouts from `/api/v1/scales/scale_layouts`.
2. Pick one tuning, one scale, and one named position.
3. Build the spelled scale notes for the selected key.
4. Transpose the position window by the key root index.
5. Resolve a visible fret window:
   - `range`: use `start + rootIndex` and `span`
   - `split`: transpose each split range, then use the min start and max end
6. Decide which exact frets are allowed:
   - if `per_string_frets` is present, use it directly
   - else if the layout uses split ranges, derive the visible scale frets that
     fall inside each string's allowed window
   - else allow all scale notes inside the shared range
7. Build the rendered layout and trim it to the populated fret window.

Relevant code:

- `src/scales/scale_layouts.go`
- `frontend/app/scales/fretboard_layout.js`
- `frontend/app/scales/scales_page.js`

## Current Constraints

The important existing rules still apply:

- Layout data is the source of truth.
- We prefer the smallest data representation that works.
- Displayed pitches must appear once and only once in the layout run.
- Manually validated layouts should not be changed automatically.
- CAGED root definitions and locked major reference shapes should be preserved
  unless explicitly changed.

See `docs/CONSTRAINTS.md` for the full constraint set.

## Relationship Between CAGED And 3NPS

3NPS patterns are not the same thing as classic CAGED boxes:

- CAGED is organized around recognizable chord-shape regions.
- 3NPS is organized around putting exactly three notes on each string.
- 3NPS patterns often drift upward as you move from string 6 to string 1, so
  they commonly behave like split layouts.
- Some existing layouts already overlap this idea. The current major `D`
  position is effectively a split pattern and is close to a 3NPS-style shape.

So the unification goal is not "make 3NPS behave exactly like CAGED." The more
useful goal is:

- keep the familiar position names as anchors
- let a user switch between a CAGED-oriented rendering and a 3NPS-oriented
  rendering for the same scale/tuning area

## Recommended Direction

Keep one layout system, but support two layout families within it:

- standard positions: the current CAGED-oriented layouts
- 3NPS positions: alternate layouts for the same tuning and scale

Why this is the best fit:

- It keeps layout data as the source of truth, which matches our existing
  constraints.
- It avoids trying to derive 3NPS purely in the frontend from incomplete
  CAGED windows.
- It lets the frontend own the visual toggle without making the frontend the
  authority on fret selection.
- It avoids overloading one position definition with two incompatible note
  density rules.

## 3NPS Rules

If we add 3NPS layouts, they should follow all existing scale-layout rules, plus:

- exactly 3 plotted notes on every string in the pattern
- no duplicated pitches within the intended displayed run
- the pattern should still be data-defined per tuning and scale
- split ranges should be expected, not treated as an edge case

This argues for dedicated 3NPS validation in the backend test suite rather than
frontend-only enforcement.

## Frontend Role

The frontend should own:

- the toggle or checkbox for enabling 3NPS
- the selection of which layout family to render
- the presentation of the resulting pattern

The frontend should not be the sole source of truth for generating 3NPS fret
choices if we want those layouts to be stable, testable, and shareable through
the API.

## UI Direction

The current idea fits the existing scales page well:

- keep the current interval-group checkboxes
- add a `3NPS` checkbox below the `2/4/6` entry
- when enabled, switch the selected layout family from standard to 3NPS
- if a 3NPS layout is missing for the selected scale/tuning/position, fall back
  gracefully to the standard layout or disable the toggle for that case

## Actual 3NPS Spec

This section defines the concrete direction we should use if we move 3NPS from
frontend experimentation into authoritative layout data.

### Decision

3NPS should be stored as a second layout family in the backend data model, as
an option for each existing anchor shape.

It should not be:

- a frontend-only generated view
- a hidden alternate interpretation of the existing standard positions
- a separate top-level API resource

The standard and 3NPS families should both live under the existing
scale-layout resource, but as distinct stored families.

That means:

- each anchor shape (`C`, `A`, `G`, `E`, `D`) has a `standard` option
- each anchor shape can also have a `3nps` option
- the frontend toggle selects which family for the selected shape to render

### Family Model

The family should live at the `scale_layouts` level, not the individual
position level.

Reason:

- a family applies to the whole tuning + scale combination
- each family contains its own `C/A/G/E/D` position set
- the current uniqueness rule on `(scale_id, tuning_id)` is too narrow for this

Recommended schema direction:

- add `family_code` to `scale_layouts`
- unique key becomes `(scale_id, tuning_id, family_code)`
- `family_code` initially allows:
  - `standard`
  - `3nps`

If we want stricter normalization later, this can become a lookup table, but a
text/code column is enough to start.

### Position Model For 3NPS

3NPS positions should continue to use the existing position codes:

- `C`
- `A`
- `G`
- `E`
- `D`

These remain anchor names, not claims that the resulting pattern is a classic
CAGED box. Each of these shapes should support two layout options:

- `standard`
- `3nps`

Each 3NPS position should still use `ScaleLayoutPosition`, but with stricter
rules than standard positions.

### Required Data For 3NPS Positions

For 3NPS positions:

- `per_string_frets` should be required
- `mode` should still be present
- `split_ranges` should usually be present
- `validated_manual` should continue to work the same way

Reason:

- exact fret choices are the real source of truth for 3NPS
- range-only definitions are too loose for "exactly 3 notes per string"
- split windows are still useful for display framing and transposition

So for 3NPS, `per_string_frets` becomes the authoritative note map, and
`split_ranges` becomes the authoritative display window.

### 3NPS JSON Shape

A 3NPS position should look like this:

```json
{
  "mode": "split",
  "split_ranges": [
    { "start": 7, "span": 5, "strings": [0, 1] },
    { "start": 9, "span": 5, "strings": [2, 3] },
    { "start": 10, "span": 5, "strings": [4, 5] }
  ],
  "per_string_frets": {
    "0": [7, 9, 10],
    "1": [7, 9, 10],
    "2": [9, 10, 12],
    "3": [9, 10, 12],
    "4": [10, 12, 14],
    "5": [10, 12, 14]
  },
  "validated_manual": true
}
```

Notes:

- the exact frets above are only an example shape, not a final major-scale
  definition
- `split_ranges` group strings for display, but `per_string_frets` determines
  exactly which notes are plotted

### DB Mapping For 3NPS

The current tables already support most of the position payload:

- `scale_layout_positions`
- `scale_layout_position_split_ranges`
- `scale_layout_position_split_range_strings`
- `scale_layout_position_string_frets`

The missing piece is the family dimension on `scale_layouts`.

That means the minimal DB change is:

1. add `family_code` to `scale_layouts`
2. backfill existing rows to `standard`
3. replace the unique constraint on `(scale_id, tuning_id)` with one on
   `(scale_id, tuning_id, family_code)`
4. update seed/import logic to write one row per family

### API Shape

The API should return both families explicitly.

Recommended shape:

- each tuning still contains `scales`
- each scale contains layout families
- each family contains its own `positions`

Conceptually:

```json
{
  "id": 1,
  "name": "Major",
  "type": "diatonic",
  "layout_families": {
    "standard": {
      "positions": { "C": {}, "A": {}, "G": {}, "E": {}, "D": {} }
    },
    "3nps": {
      "positions": { "C": {}, "A": {}, "G": {}, "E": {}, "D": {} }
    }
  }
}
```

Why this shape:

- it keeps family selection explicit
- it avoids ambiguous mixed position maps
- it scales better if we later add other layout families

### Validation Rules For 3NPS

3NPS needs extra backend validation beyond the current standard layout checks.

For any `3nps` position:

- every string must have exactly 3 frets in `per_string_frets`
- all plotted frets must belong to the scale
- the rendered pitch run must still satisfy the no-duplicates / no-missing
  rules for the intended layout
- `split_ranges` must cover every plotted fret
- the overall pattern should be monotonic or near-monotonic upward from string
  6 to string 1

The last rule should begin as report-only if we are not yet sure how strict to
be musically.

### Initial Scope

The first real stored 3NPS rollout should be narrow:

1. standard tuning only
2. major scale first
3. all five anchor positions
4. manually authored data, not generated data

After that, we can expand to additional scales where 3NPS layouts are useful.

### Recommendation For Authoring

When authoring 3NPS layouts:

- define the exact frets first
- derive the split display ranges from those frets
- mark positions as manually validated once they are reviewed

This is the opposite of our normal "smallest range first" preference, and that
is intentional. For 3NPS, exact frets matter more than compact implicit ranges.
