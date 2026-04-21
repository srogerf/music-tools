# Architecture

This document describes the current repo structure and the intended ownership of
the main top-level directories.

## Current Shape

`music-tools` is organized as:

- Go library code under `src/`
- small Go CLIs under `tools/`
- API and server code under `api/` and `server/`
- browser UI under `frontend/`
- static reference data under `data/`
- database schema, seed, and helper scripts under `db/`
- deployment assets under `deploy/`
- project guidance under `docs/`

## Top-Level Directory Roles

- `src/`
  - Reusable internal library code.
  - No CLI entry points here.
  - See `src/STRUCTURE.md` for more detail.
- `tools/`
  - One Go CLI per directory.
  - Each tool should remain small, self-contained, and documented.
- `api/`
  - API handlers and OpenAPI definitions.
- `server/`
  - The runnable Go server that exposes the app and APIs.
- `frontend/`
  - Frontend code for the browser-based fretboard UI.
- `data/`
  - Canonical static data such as scale definitions, tuning definitions, and
    layout files.
- `db/`
  - SQL files, schema/version metadata, and Postgres helper scripts.
  - Canonical SQL lives in `db/sql/`.
  - Runnable Postgres helpers live in `db/postgres/`.
- `deploy/`
  - Infrastructure, container, and CI/CD deployment assets.
- `docs/`
  - Project-level design notes, constraints, and operating guidance.

## Design Rules

- Keep reusable domain logic in `src/`.
- Keep operational entry points out of `src/`.
- Keep provider-specific infrastructure under `deploy/infrastructure/`.
- Keep container packaging assets under `deploy/container/`.
- Keep CI/CD automation under `deploy/cicd/`.
- Prefer one authoritative doc for each topic, and use short pointer docs when
  a local note is helpful near the code.

## Related Docs

- `src/STRUCTURE.md`
- `docs/CONSTRAINTS.md`
- `docs/SCALE_LAYOUTS.md`
- `docs/DEPLOYMENT.md`
- `docs/DEPLOY_DATABASE.md`
- `deploy/README.md`
