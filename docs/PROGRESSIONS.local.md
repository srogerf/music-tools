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

### Matching Priority

The matching and ranking logic should follow these steps in order:

1. The candidate scale must contain the full chord.
2. Exact tonal-center pitch-set matches rank first.
3. After exact matches, show tonal-center scales that fully support the chord,
   even if the candidate row is not the same named root-based scale.
4. After those, allow chord-root candidates whose full pitch set maps cleanly
   back to the selected tonal center.
5. After those, allow broader chord-compatible colors and remoter collections.

This preserves an important distinction:

- `candidate scale` answers: what is this scale called from the chord root?
- `parent scale` answers: which selected tonal-center scale supports this chord
  or this color?

Examples:

- Over `Am7b5` in `G minor`, `G Harmonic Minor` should be available as a parent
  scale because the chord belongs to that tonal-center collection, even if the
  candidate row is shown as `A Locrian #6`.
- If a candidate and a tonal-center scale are the exact same pitch set, that
  exact same-note-set relationship should outrank looser support relationships.
- If a tonal-center scale contains all the chord tones but not the candidate's
  full note set, it should still be shown as a valid tonal-center support
  result, but not mislabeled as an exact pitch-set match.

### Theory Basis

This rule set follows a practical chord-scale approach:

- start with full chord-tone containment
- then prefer exact pitch-set agreement with the chosen tonal center
- then allow tonal-center support scales that contain the chord
- then allow remoter colors

In minor `ii-V-i` situations, the tonal center should act as a strong prior.
For example, harmonic minor should rank strongly as a progression-level parent
collection when it supports the active chord, even if the row also offers other
modal or color-based labels.

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

## Position Continuity

- The Progressions tab should support a progression-level neck-area concept,
  not only an isolated per-row position selector.
- A user should be able to keep successive chord-scale choices in roughly the
  same part of the neck instead of re-centering every row independently.
- This can be expressed as either:
  - `Lock position`
  - or `Suggest position`
- `Lock position` means later rows should strongly prefer shapes and layouts in
  the same fret region as the current row.
- `Suggest position` means later rows may still move, but should first offer
  options that preserve local neck continuity.

Example:

- If `Am7b5` is chosen in `A position`, that implies a fret region roughly
  around the `A-shape` area for that chord scale.
- For the next row `D7`, staying in the same area may imply a different shape
  label, such as a `D-shape`, if that keeps the notes in the same region.
- For `Gm7`, the best continuation may return to an `A-shape` or move to a
  nearby `G-shape`, depending on which choice keeps the line localized.

Important implication:

- `position` should not be interpreted only as a static CAGED letter attached
  to each row.
- We also need a notion of `fret region continuity` across rows.
- So the progression engine should distinguish:
  - symbolic layout family or shape name
  - actual fret window or neck area

Recommended rule:

1. Choose the chord scale for the current row.
2. Determine the active fret region from the selected layout.
3. For the next row, rank candidate layouts by:
   - same or overlapping fret region first
   - nearby region second
   - remote region later
4. Allow the shape name to change if that preserves the musical area on the
   neck.

This means a later row may legitimately change from `A position` to `D
position` while still honoring a locked or suggested neck area.

UI direction:

- Add a progression-level control such as:
  - `Position flow: Free / Same / Ascending / Descending`
- `Position flow` should be separate from the row-level `position` selector.
- In `Free` mode, the row-level `position` selector stays editable and acts as
  a direct manual choice.
- `Same` is the lock behavior:
  - keep later rows in the same local fret region when possible
  - allow shape labels to change if needed to stay in that area
- `Ascending` means later rows should favor staying in the same area first,
  then moving up the neck rather than down.
- `Descending` means later rows should favor staying in the same area first,
  then moving down the neck rather than up.
- In non-`Free` modes, the row-level `position` selector should be locked and
  derived from the selected scale/layout result instead of being edited
  manually.

This is preferable to a vague `Suggest` label because it expresses actual
directional movement on the guitar neck.

Possible later extension:

- if needed, we could also expose explicit directional nudges such as:
  - `Up one position`
  - `Down one position`
- but that likely belongs after the broader flow modes above are working well.

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

## Current Status Snapshot

This section captures what is actually implemented now in the frontend, what
is working well enough to iterate on, and what is still provisional.

### Implemented Now

- The Progressions tab exists as a real scaffold, not just a placeholder.
- The tab has a `Scales` / `Chords` switch with the same overall feel as the
  Scales page.
- The current practical flow is per-row and the rows are labeled:
  - `Chord 1`
  - `Chord 2`
  - and so on
- Each chord row currently supports:
  - tonal center
  - chord symbol
  - position
  - per-row `Position flow`
- A chord row can produce a candidate scale list, allow one scale to be
  selected, then collapse down to a selected-scale summary state.
- There is an `Add Next Row` flow so a progression can be built downward one
  chord at a time.

### Current Matching And Ranking Behavior

- Matching is currently chord-tone driven.
- The chord symbol is parsed in the frontend and its chord tones are spelled
  directly in the row UI.
- Candidate matching uses pitch-class containment so enharmonic equivalents
  can still match.
- `Chromatic` is intentionally excluded from the Progressions candidate pool
  because it does not add useful value in this view.
- The `Comprehensive` checkbox is available on the Progressions summary card.
- `Comprehensive` controls whether latent scales are included in the candidate
  pool.
- Current ranking direction is:
  - exact tonal-center support first
  - then tonal-center scales that contain the chord notes
  - then broader same-center colors
- The current result labeling distinguishes family fit inside the chosen tonal
  center, so same-family minor-center results can sort ahead of major-leaning
  reinterpretations in examples such as `G minor`.

### Current Candidate Presentation

- The candidate list is currently centered on the chosen tonal center rather
  than only on chord-root reinterpretation names.
- The candidate table currently uses:
  - `Candidate scale`
  - `Spelling`
  - `Parent scale`
  - `Match type`
- `Parent scale` is intended to reference the selected tonal center rather
  than only the scale's original modal source.
- `Match type` is intentionally simpler than a long explanation and currently
  uses labels such as:
  - `Exact`
  - `Contains notes`
  - with same-family / different-family context layered into the label
- Richer explanation is shown as hover text instead of a permanently open
  explanatory box.

### Current Selected-Scale Row Direction

- Once a scale is selected, the candidate list is hidden for that row.
- The row then becomes a compact comparison between:
  - `Chord tones`
  - `Selected scale <name>`
- The intended visual format is:
  - chord label on the left
  - selected-scale label on the right
  - chord notes directly under the chord label
  - selected-scale notes directly under the selected-scale label
  - `Change scale` as the action on the right
- This selected-summary layout is still being tuned and is one of the active
  polish areas right now.

### Current Position-Flow Behavior

- `Position flow` is now per row, not progression-global.
- The current modes are:
  - `Free`
  - `Same`
  - `Ascending`
  - `Descending`
- `Free` keeps the row `position` selector manually editable.
- Non-`Free` modes derive the effective position from the previous row and the
  current selected flow.
- The intended behavior is:
  - `Same`: stay in the same local neck area when possible
  - `Ascending`: prefer the same area first, then move upward
  - `Descending`: prefer the same area first, then move downward
- This logic is implemented as a first-pass anchor-fret heuristic rather than
  a final layout-aware engine.
- The user example to preserve is:
  - `Am7b5` in `E`
  - then `D7` in `C`
  - then `Gm7`
  - with descending expected to move that last row toward `E`

### Fretboard Preview Status

- The fretboard preview currently lives under each chord card.
- The intended next behavior is that the selected scale will draw there with
  the active chord tones highlighted.
- At the moment this area is still a preview placeholder rather than the final
  progression-aware fretboard rendering.

### Theory And Architecture Status

- The current chord parser and spelling helper are frontend-first and
  intentionally limited.
- This is useful for UI iteration, but it is not yet the final architecture.
- The durable goal still stands:
  - shared chord parsing in `src/`
  - shared chord-tone generation in `src/`
  - frontend consuming shared results rather than owning all theory logic
- The current frontend implementation should therefore be treated as a proving
  ground for UI and ranking behavior, not the final theory source of truth.

### Immediate Known Gaps

- The selected-summary layout is still being refined visually.
- Position-flow behavior is better than before, but still heuristic and not
  yet tied to real chosen scale layouts.
- The chord parser is not yet the shared `src/` implementation.
- The final fretboard rendering for selected progression scales is not yet in
  place.
- Candidate naming, parent-scale language, and match-type language may still
  need more musical tuning as we keep comparing Progressions against the
  Scales finder.

## Open Questions

- Should the first row UI stay as a simple repeated-row model at first, with
  explicit named spans added later?
- Should tonal-center closeness begin as a hand-tuned ranking model before we
  formalize it further?
- How should we rank matches when multiple scales fit the chord but imply
  different progression-level centers?
- When we add chord layouts, should we store canonical guitar shapes in data or
  generate them from interval rules plus fretboard constraints?

## Users And Saved Progressions

- Saved progressions should support two visibility classes:
  - `public`
  - `private`
- `Public` progressions are curated/shared progressions owned by the app.
- `Private` progressions are owned by an individual user and only visible to
  that user.
- The first implementation target is private personal use, with later
  monetization possible if server/storage usage grows enough to require cost
  recovery.

### User Model

- Do not expose account creation in the API or GUI.
- Only allow users to be created directly in the database by an operator.
- The app may later support login for pre-created users, but not signup.
- Keep the initial user model minimal:
  - `id`
  - `username`
  - `password_hash` or equivalent credential field
  - `active`
  - timestamps

### Saved Progression Model

- Store enough state to fully regenerate the progression UI without guessing.
- A saved progression record should include at least:
  - progression title or label
  - owner user id for private progressions
  - visibility (`public` or `private`)
  - optional description/notes
  - timestamps
- Each saved progression row should include at least:
  - row order
  - tonal center
  - chord symbol
  - selected scale id
  - selected scale label if needed for historical stability
  - manual/base position
  - effective position
  - position flow
- Consider also storing view state that affects exact reconstruction:
  - note filter group choices
  - `Comprehensive` on/off
  - `3NPS` on/off
- The goal is that a saved progression can reopen to the same layout and
  selection state the user last chose.

### Database Safety Rules

- User and saved-progression tables must be treated as application data, not
  seed/reference data.
- Do not put user accounts or saved progressions into reseed scripts.
- Do not let production seed/upgrade flows erase or recreate user progression
  data if it already exists.
- Production DB upgrades for this area should be forward-only additive
  migrations.
- Reference-data seeding for scales/layouts must remain separate from user data
  persistence.

## Repo Strategy

- A private fork of the current public repo is useful if we want a safe place
  to continue proprietary feature work without immediately changing the public
  upstream.
- A private fork is better for:
  - experimentation
  - staging private feature development
  - keeping the public repo unchanged for now
- A fully private repo is better if the main active product direction is
  becoming proprietary and we no longer want the primary upstream to stay
  public.
- Current leaning:
  - a private fork is a lower-risk first move
  - a full move to private can be reconsidered once saved progressions,
    accounts, and richer paid/private functionality become central
