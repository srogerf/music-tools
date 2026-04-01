# Scale Selector

Selects a random music scale.

Behavior:
- Chooses a random scale that is either major or minor.
- Defaults to scales with no more than 5 sharps or flats.
- The accidental limit can be overridden by a flag that indicates how many sharps or flats are allowed.

Usage:
```bash
go run . --max-accidentals 5
```
