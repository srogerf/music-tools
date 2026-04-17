[![CI](https://github.com/srogerf/music-tools/actions/workflows/ci.yml/badge.svg)](https://github.com/srogerf/music-tools/actions/workflows/ci.yml)

# music-tools

`music-tools` is a collection of music theory and fretboard tools with a Go backend and a browser-based frontend.

## What Is Here

- Go packages for scales, chords, tuning, and related music logic
- A frontend for interactive fretboard-based exploration
- Static data and layout definitions used by the app
- Deployment planning and infrastructure notes under `deploy/`

## Development

Run the test suite locally with:

```bash
go test ./...
```

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Deployment](DEPLOYMENT.md)
- [Deploy Directory](deploy/README.md)
