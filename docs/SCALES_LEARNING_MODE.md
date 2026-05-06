# Scales Learning Mode

Learning mode is an optional exercise panel on the Scales tab. It is off by
default and is enabled with the Learning mode checkbox beside the Scales
heading.

When enabled, the panel lets the user generate a random scale challenge from
one or more selected scale families:

- Major / minor
- Modes
- Pentatonic
- Exotic

The family selector is multi-select. At least one family remains selected so a
random challenge always has a valid scale pool. Each challenge includes a
random key, scale, and CAGED position. The fretboard stays blank until the user
checks the answer.

## Guess Inputs

The user guesses:

- the key signature accidental count
- whether the key signature uses sharps or flats
- the notes in the scale

Scale-note choices are grouped by enharmonic pitch, with common natural
spellings shown first when present. The picker includes double-sharp and
double-flat spellings needed by the current scale definitions.

## Answer Display

After checking, Learning mode:

- marks the answer correct or asks the user to check it
- reveals the key signature and scale notes
- calls out notes outside the underlying key signature when the scale alters
  them, such as melodic minor raising scale degrees 6 and 7
- applies the challenge key, scale, and position to the fretboard display

The outside-key-signature note is informational: those notes can still be
correct scale tones.

## Scale Playback

The Scales tab also includes a playback panel beside the fretboard controls.
It can play the selected scale repeatedly until stopped or until the repeat
limit is reached.

Playback controls:

- play / stop
- optional beat click
- BPM slider
- note-value slider
- volume slider

The beat click follows the same timing grid whether it is audible or muted, so
turning the click on or off does not change scale-note timing.
