# Scales Tool

CLI for listing and looking up scale definitions.

## Usage
```bash
go run . --list
go run . --name "Harmonic Minor"
go run .
```

## Flags
- `--definitions`: path to scale definitions JSON (default: `../../data/scales/DEFINITIONS.json`).
- `--list`: list all scales.
- `--name`: lookup by name or common name.
