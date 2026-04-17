## Overview
This repository hosts a collection of small, focused command-line tools under `tools/`.
Each tool lives in its own subdirectory and is implemented in Go, with optional shell wrappers where helpful.

## Structure
- `src/`: top-level directory for code.
- `tools/<tool_name>/`: command-line tools, one tool per directory, self-contained. Prefer Python or Go.
- `lib/`: shared logic used by tools and servers. Go.
- `api/`: API definitions and Swagger/OpenAPI specs.
- `server/`: server code to run APIs/services. Go.
- `frontend/`: frontend code (React or TypeScript).
- `test/`: tests for the repository.
- `data/`: static data and database schemas.

Each tool should include:
- `main.go` as the CLI entry point.
- participation in the repository's root `go.mod` unless there is a clear reason to split it into its own module.
- `README.md` describing purpose, flags, and usage.

## src/ Structure
The `src/` directory is reserved for core code that does not belong to tools, servers, or frontend apps.
- Each subdirectory under `src/` should contain a `README.md` that defines its purpose and ownership.
- Keep `src/` focused on reusable, internal code rather than entry points or executables.
See `../src/STRUCTURE.md` for details.

## CLI Design
- Keep interfaces simple and discoverable.
- Use Go's `flag` package unless there is a clear need for a richer parser.
- Provide sensible defaults and clear error messages.

## Musical Domain Rules
- For scale-related tools, include major and minor scales.
- Minor variants include natural, harmonic, and melodic minors where relevant.
- Default accidental limits should be conservative, but configurable via flags.

## Quality
- Prefer deterministic logic with small, testable functions.
- Keep dependencies minimal; standard library first.
- Aim for readable, well-documented code with concise comments only when needed.
