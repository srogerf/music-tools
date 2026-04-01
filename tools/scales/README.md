# Scales Tool

CLI for listing and looking up scale definitions.

## Usage
```bash
go run ./tools/scales --list
go run ./tools/scales --name "Harmonic Minor"
go run ./tools/scales
```

## Flags
- `--definitions`: path to scale definitions JSON (default: `../../data/scales/DEFINITIONS.json`).
- `--list`: list all scales.
- `--name`: lookup by name or common name.
