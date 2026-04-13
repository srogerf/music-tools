# Constraints

This file records the agreed constraints for scale layout work so they can be
reused in future sessions.

## Scale Layout Data

- Scale layouts are defined in data, not derived live as the source of truth.
- The current scale layout data lives in `data/scales/layouts/`.
- Layouts are organized by tuning, scale, and position.
- Each scale should have its own file named after the scale.
- Layout files should reference tunings by name only.
- String count and string notes should come from `data/tunings/DEFINITIONS.json`.
- Layouts may use either:
  - a simple range: `start` + `span`
  - a split range: `per_string`
- Layouts may also use `per_string_frets` to explicitly control shown notes.
- Prefer the least data needed to draw the scale correctly.
- Use plain `start` + `span` first when it is sufficient.
- Use `per_string` only when a split range is actually needed.
- Use `per_string_frets` only when simpler range definitions cannot represent the layout correctly.

## Note Spelling Rules

- For diatonic scales, each letter name A-G should appear once and only once in the spelled scale.
- Diatonic note spelling should follow the scale context, so `C Dorian` is `C D Eb F G A Bb`, not `C D D# F G A A#`.
- We should separate pitch-class matching from displayed note naming so the right enharmonic spellings can be shown without changing pitch logic.

## Validation Rules

- Every note in the displayed pitch run must appear once and only once.
- If a layout shows two octaves, it should show all 15 notes in that run.
- Notes must not be duplicated in the layout pattern.
- If a layout does not satisfy the rule, validation must fail.
- Validation must run in tests so data or algorithm changes cannot silently break layouts.
- Validation currently assumes standard tuning octave placement only.
- Range completeness now also has a report-only test pass that highlights layouts where a nearby range or shifted split would capture more notes than the current definition.
- Report-only range findings are for review and tuning; they do not fail the test suite yet.

## Manual Validation

- Layout positions can be marked with `validated_manual`.
- A manually validated layout is considered locked and should not be changed automatically.
- The frontend should indicate whether a layout is manually validated.

## CAGED Position Rules

- The selected position should match the intended CAGED shape.
- The pattern does not need to start on the root note.
- We prefer compact patterns, but may exceed 4 frets when needed.
- Simple ranges and split ranges are both valid ways to express a position.

## Root Definitions

These root-string definitions were explicitly agreed and should be preserved:

- C shape: roots on 5th and 2nd strings
- A shape: roots on 5th and 3rd strings
- G shape: roots on 6th, 4th, and 1st strings
- E shape: roots on 6th, 4th, and 1st strings
- D shape: roots on 4th and 2nd strings

## Locked Major Scale Shapes

Unless explicitly changed by the user, these major-shape references are locked:

- C shape: frets 0-3
- A shape: frets 2-6
- G shape: frets 4-8
- E shape: frets 7-10
- D shape: split range
  - strings 6-3: frets 8-12
  - strings 2-1: frets 10-13

## Tuning Rules

- Tunings are defined by API/backend data, not hardcoded in the frontend.
- Tunings are also the single source of truth for string definitions used by layouts.
- The system supports 1-9 strings, defaulting conceptually to 6.
- Standard tuning is the only tuning currently in active use.
- The frontend should fetch tuning definitions from the API.
- The default tuning should be Standard when present.

## API Naming

- The layout API resource is `scale_layouts`.
- The scale layout data is stored under `data/scales/layouts/`.
- Go naming should use `ScaleLayout...` terminology consistently.
