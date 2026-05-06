# Test Environment

This document describes the pre-container artifact test environment.

## Purpose

- verify the exact server and frontend artifacts that will be packaged
- catch issues that do not appear in source-asset development
- separate artifact validation from full container integration

## Layout

- server runtime:
  - prebuilt binary under `build/test/server/`
- frontend assets:
  - bundled Vite output under `build/test/frontend/app/`
- optional debug frontend output:
  - `build/test/frontend-debug/app/`
- database:
  - shared local Postgres cluster with a dedicated test database and user
- private config:
  - `.private/env/test/runtime.env`
  - `.private/env/test/postgres.env`

## Default Shape

- default port:
  - `8081`
- server artifact:
  - `build/test/server/rifferone`
- frontend artifact:
  - `build/test/frontend/app`

## Setup

Install frontend dependencies once:

```bash
npm install
```

Ensure the local Postgres role and database exist:

```bash
bash bin/localhost_init_postgres.sh .private/env/test/postgres.env
```

Build artifacts:

```bash
bash bin/build_artifacts.sh
```

Seed test data:

```bash
bash bin/test_seed.sh
```

Run the test server:

```bash
bash bin/test_start.sh
```

Smoke check:

```bash
bash bin/test_smoke.sh
```

Optional readable frontend artifact:

```bash
bash bin/build_frontend.sh --debug
```

## Design Notes

- the default test frontend build is compressed and closer to release shape
- the debug frontend build exists for inspecting bundled output without
  minification
- test is still local and lightweight; it is not a staging deployment
- test validates artifacts before Docker packaging

## Issues We Have Seen

- expected source files can appear missing because the test server only serves
  bundled assets
- confusion between development and test ports can make it look like the wrong
  UI is being served
- if the test database is not seeded, the bundled app loads but API-backed
  pages fail

## Debugging Checklist

- confirm the test server is bound to the expected port
- inspect `build/test/frontend/app/index.html`
  - it should reference `/assets/...`
- confirm the binary exists at `build/test/server/rifferone`
- confirm the test database exists and is seeded
- use `bash bin/test_smoke.sh` before moving on to container work

## Things To Watch

- keep development and test databases separate
- do not assume a successful artifact build means the container runtime is
  correct
- use the debug build when bundle readability matters
