# Progressions Roadmap

This is a local planning note for progression and chord work on the
Progressions tab. It captures the current thinking so we can iterate without
forcing the full design up front.

## Product Direction

- Progression work belongs on the Progressions tab, not inside the Scales tab.
- The Progressions tab should have a `Scales` / `Chords` mode switch with a
  look and feel similar to the mode switch on the Scales page.
- Start with scale-selection work driven by chord tones, then expand into
  richer chord and progression tooling.
- Prefer an iterative build over trying to solve every chord spelling and every
  guitar voicing at once.

## Tonal Centers

- The app should allow an explicit tonal center instead of assuming one from
  shared pitch material alone.
- Different sections can share the same key signature material but still have
  different tonal centers.
- Example: an `F# minor` verse and an `A major` chorus may use the same notes
  while establishing different centers.
- The model should therefore allow the user to select or change tonal center
  per section or span of a progression.

## Progression Model

- A progression should not be only a flat list of chords.
- We likely need:
  - a progression container
  - one or more sections or spans
  - a tonal center for each section
  - an ordered list of chords within each section
- A practical first interaction could be:
  - enter tonal center
  - enter a chord
  - add more chords
  - optionally start a new tonal-center span

## Current Interaction Direction

- The primary flow is progression-first, not just one isolated chord lookup.
- For each progression row, the user should be able to choose:
  - tonal center
  - chord symbol
  - position
- The app should return a ranked list of candidate scales for that row's chord.
- Ranking should prefer scales that are closest to the selected tonal center
  before offering farther but still chord-compatible options.
- After the user chooses a scale, draw that scale on the fretboard and
  highlight the active chord tones inside it.
- The user should then be able to optionally add another row below and repeat
  the same flow for the next chord in the progression.

Example interaction:

- choose tonal center `G minor`
- enter chord `Am7b5`
- choose position
- review ranked scale options
- choose one and draw it with the `A C Eb G` chord tones highlighted
- optionally add the next row for `D7`
- optionally add the next row for `Gm7`

## Scale Matching Direction

- Reuse the same basic search idea as the current Scales finder.
- Populate the finder from chord tones rather than manually selected interval
  buttons.
- Show matching scales for the current selected chord first.
- Allow multiple chord rows in one progression so the user can evaluate each
  chord against the same tonal-center span.
- Rank results from closest to the supplied tonal center to farthest.
- "Closest" should mean the scale best supports the chosen tonal flow before we
  offer remoter but still chord-compatible color choices.
- Each result should show both:
  - the chord-focused scale name
  - the parent or tonal-center relationship when relevant

Example result shape:

- `A Locrian #6`
- `from G harmonic minor`
- `fits chord: Am7b5`
- `fits center: G minor`

Ranking examples:

- Over `Am7b5` with tonal center `G minor`, it is reasonable to surface
  `G natural minor`, `G harmonic minor`, and `G melodic minor` relationships
  before remoter options.
- Over `D7` with tonal center `G minor`, it is reasonable to surface
  `G harmonic minor` and `G melodic minor` before broader dominant-compatible
  collections such as `D major`, `D harmonic major`, or `D minor bebop`.
- Those broader choices can still appear, but they should rank below the scales
  that preserve the active minor tonal flow.

## Naming Direction

- We should support both chord-root naming and parent-key naming for the same
  note set.
- Example: over `Am7b5` in a `G minor` context, we may want to show:
  - `A Locrian #6`
  - `from G harmonic minor`
- The chord-root name should be primary when the user is looking at a specific
  chord.
- The parent or modal-source label should provide context without replacing the
  tonal center.

## Harmony Notes

- For `Am7b5 - D7 - Gm7`, the tonal center is `G minor`.
- `G natural minor` does not cover the dominant chord cleanly because `D7`
  requires `F#`.
- `G harmonic minor` is the clean parent collection for that progression:
  `G A Bb C D Eb F#`
- `A Locrian #6` is useful as a chord-scale description over `Am7b5`, but
  `G harmonic minor` is the clearer progression-level label.
- For the `D7` chord in that same tonal flow, `G harmonic minor` and
  `G melodic minor` should rank ahead of less center-related matches because
  they reinforce the active `G minor` cadence.
- A later progression such as `Cm7 - F7 - Bbmaj7` may reuse much of the same
  note material while establishing a different tonal center.
- In that case, the section should be able to use tonal center `Bb major` even
  if some note material overlaps with a nearby `G minor` section.

## Chord Model

- Do not try to hardcode every possible chord spelling as separate static data.
- Prefer a rule-driven chord model:
  - root
  - base quality
  - optional suspension or omission behavior
  - optional seventh
  - optional extensions
  - optional alterations

Potential base qualities:

- `maj`
- `min`
- `dim`
- `aug`
- `sus2`
- `sus4`

Potential upper-structure layers:

- sevenths: none, `6`, `7`, `maj7`
- extensions: `9`, `11`, `13`
- alterations: `b5`, `#5`, `b9`, `#9`, `#11`, `b13`
- later omissions if needed: `no3`, `no5`

## Fretboard Direction

- Near term: generate chord tones and show them on the existing fretboard.
- Medium term: add practical chord layouts or voicing families for common chord
  types.
- Long term: support more curated guitar-realistic voicing libraries.
- We may still want generated or stored chord-layout data, but that should not
  block the first progression-aware scale search.

## Suggested First Scope

1. Add a progression-row specification with tonal center, chord symbol, and
   position.
2. Build a rule-based chord parser and chord-tone generator.
3. Feed those chord tones into a finder-style scale search.
4. Rank results by tonal-center closeness before remoter compatible scales.
5. Show results with both chord-focused and parent-key labels.
6. Render the selected scale on the fretboard with the active chord tones
   highlighted.
7. Allow the user to add the next row below and repeat the same flow.

## First Milestone Plan

The first milestone should focus on a solid shared chord model before we build
full progression editing or chord-layout data.

Goal:

- Parse a practical first set of chord symbols.
- Generate the chord tones in shared code.
- Make those tones available to the Progressions tab scale-matching workflow.
- Keep the first version centered on one tonal center plus one active chord row
  at a time, while allowing the next row to be added below.

### Milestone Boundary

Include:

- one explicit tonal-center input
- one chord-symbol input
- one position selector
- parsing for common triads and seventh chords
- support for a small first set of suspensions, extensions, and alterations
- chord-tone generation from parsed chord data
- scale matching driven by generated chord tones
- ranking that prefers scales aligned with the chosen tonal center
- result labels that can show both chord-root and parent-key context
- fretboard rendering that highlights the chord tones inside the chosen scale
- row-by-row repetition so a user can build a sequence such as
  `Am7b5 - D7 - Gm7`

Do not include yet:

- complex multi-section progression editing
- chord playback
- stored chord-layout families
- every possible altered or omitted chord spelling
- complex slash-chord or polychord support

### Proposed Shared Model

The shared chord model should live in `src/`, not only in `frontend/`.

Recommended starting shape:

- `ChordRoot`
- `ChordQuality`
- `ChordSeventh`
- `ChordExtensionSet`
- `ChordAlterationSet`
- `ParsedChordSymbol`
- `ChordToneResult`

Suggested responsibilities:

- parsing: chord symbol string -> `ParsedChordSymbol`
- normalization: aliases and shorthand -> canonical internal form
- tone generation: parsed chord -> spelled chord tones plus interval metadata
- matching: chord tones -> candidate scale matches

### First Supported Chord Surface

Start narrower than the full eventual chord grammar.

Roots:

- natural roots
- sharps and flats

Base qualities:

- major
- minor
- diminished
- augmented
- sus2
- sus4

Seventh layer:

- none
- `6`
- `7`
- `maj7`

First-pass extensions and alterations:

- `9`
- `11`
- `13`
- `b5`
- `#5`

Example first-pass symbols:

- `C`
- `Cm`
- `Cdim`
- `Caug`
- `Csus2`
- `Csus4`
- `C7`
- `Cm7`
- `Cmaj7`
- `Cm7b5`
- `C7#5`
- `C9`

Defer for later:

- slash chords
- `b9`, `#9`, `#11`, `b13`
- `add9`, `add11`, `add13`
- omissions such as `no3`
- compound or ambiguous shorthand

### Scale Matching Rules

The first version should not try to infer the whole harmonic story.

Instead:

- take one parsed chord
- generate its chord tones
- search scales that contain all of those tones
- rank exact practical matches before broader superset matches
- if a tonal center is supplied, show parent-key context for each result

Useful result fields:

- chord-focused scale name
- parent scale name
- parent scale root
- relationship to supplied tonal center
- matched chord tones
- extra available color tones

### UI Shape For Milestone One

Keep this inside the Progressions tab as a focused first flow rather than
trying to ship a full arranger/editor immediately.

Suggested first UI:

- `Scales` / `Chords` mode switch styled similarly to the Scales-page mode
  switch
- one progression row with:
  - tonal-center selector
  - chord-symbol text input
  - position selector
  - parse / update action
- candidate scale results list for that row
- fretboard display for the selected result
- add-next-row action below the current row

The selected result should show:

- chord tones clearly highlighted
- optional lighter display for remaining scale tones
- the primary label as the chord-root scale name
- the parent-key source as supporting text

### Data And Architecture Notes

- Shared chord logic belongs in `src/`.
- Any temporary CLI helper for testing chord parsing can live in `tools/`.
- The frontend should consume parsed or generated results rather than becoming
  the only source of chord theory logic.
- If we later persist chord-layout families, they should follow the same
  data-backed philosophy as scale layouts.

### Suggested File Areas

- `src/chords/`
- `src/interval/`
- `frontend/app/progressions/`
- optional helper under `tools/`

Possible initial package split:

- `src/chords/parse.go`
- `src/chords/types.go`
- `src/chords/tones.go`
- `src/chords/match_scales.go`

### Testing Plan

The first milestone should include focused tests before UI polish.

Test categories:

- chord symbol parsing
- canonical normalization
- chord-tone generation
- enharmonic spelling behavior
- scale-match correctness for common examples

Anchor examples:

- `Am7b5` in `G minor`
- `D7` in `G minor`
- `Gm7` in `G minor`
- `Cmaj7`
- `Csus4`
- `C7#5`

### Success Criteria

We can call milestone one successful when:

- a user can enter a tonal center, chord symbol, and position
- the app parses the chord reliably
- the chord tones are generated from shared code
- matching scales are returned, ranked, and displayed
- at least one result can be rendered on the current fretboard flow
- the selected scale rendering clearly highlights the active chord tones
- the result labels clearly distinguish chord-root naming from parent-key
  context
- the user can add a next row and repeat the flow for the next chord

## Open Questions

- Should the first row UI stay as a simple repeated-row model at first, with
  explicit named spans added later?
- Should tonal-center closeness begin as a hand-tuned ranking model before we
  formalize it further?
- How should we rank matches when multiple scales fit the chord but imply
  different progression-level centers?
- When we add chord layouts, should we store canonical guitar shapes in data or
  generate them from interval rules plus fretboard constraints?
