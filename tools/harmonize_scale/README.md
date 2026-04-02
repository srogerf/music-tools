# Harmonize Scale

Generate a harmonized list of seventh chords for a seven-note diatonic scale.

## Usage
```bash
go run ./tools/harmonize_scale --key C --scale Major
```

## Notes
- Uses quadad definitions in `data/scales/DEFINITIONS.json` to label chord quality.
- If a chord's interval set is unknown, the tool can prompt you to add a new quadad definition.
