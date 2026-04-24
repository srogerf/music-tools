# Development Environment

This document describes the source-asset local development environment.

## Purpose

- fast iteration on backend and frontend changes
- easy debugging without rebuilding container artifacts
- separate database from test and production-like flows

## Layout

- server runtime:
  - Go source run directly with `go run`
- frontend assets:
  - source files from `frontend/app`
- fretboard assets:
  - source files from `frontend/fretboard`
- database:
  - shared local Postgres cluster with a dedicated development database and user
- private config:
  - `.private/env/dev/runtime.env`
  - `.private/env/dev/postgres.env`

## Default Shape

- default port:
  - `8080`
- database role and database:
  - dedicated development role
  - dedicated development database
- Postgres cluster:
  - shared local cluster, not a separate Postgres server per environment

## Setup

Initialize local env files:

```bash
bash bin/localhost_init_envs.sh
```

Ensure the local Postgres role and database exist:

```bash
bash bin/localhost_init_postgres.sh .private/env/dev/postgres.env
```

Seed development data:

```bash
bash bin/dev_seed.sh
```

Start the development server:

```bash
bash bin/dev_start.sh
```

## Design Notes

- development serves source assets directly rather than the bundled Vite output
- this keeps frontend changes visible without rebuilding test artifacts
- the backend still reads application data from Postgres
- development and test share the same local Postgres cluster, but not the same
  database or role

## Issues We Have Seen

- browser caching can make the development server appear to serve bundled test
  assets after switching between environments on the same localhost ports
- stale browser HTML can request `/assets/...` paths that only exist in the
  bundled test build
- missing or stopped local Postgres causes API-backed pages to fail even if the
  static shell loads

## Debugging Checklist

- confirm the dev server is the process bound to the expected port
- confirm `.private/env/dev/runtime.env` still points to `frontend/app`
- inspect `frontend/app/index.html`
  - it should contain the import map and `/app.js`
- if the browser requests `/assets/...`, hard refresh first
- confirm the development database exists and is seeded
- confirm the dev server can reach Postgres

## Things To Watch

- do not point dev at `build/test/frontend/app` unless you intentionally want
  test-artifact behavior
- do not reuse production credentials locally
- keep development debugging fast; this environment should stay source-first
