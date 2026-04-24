# Local Integration Environment

This document describes the local Docker Compose integration environment.

## Purpose

- validate the container runtime locally
- confirm the application image works with Postgres under Compose
- rehearse a production-like runtime before touching the remote host

## Layout

- runtime:
  - Docker Compose
- services:
  - application container
  - official Postgres container
- mutable private state:
  - `.private/container/compose.env`
  - `.private/container/local-integration/postgres-data/`
- image input:
  - application image built from the verified `build/test` artifacts

## Default Shape

- application port:
  - local host port from `.private/container/compose.env`
- database port:
  - `127.0.0.1:5432`
- Postgres data path:
  - `.private/container/local-integration/postgres-data`

## Setup

Check Docker access if needed:

```bash
bash bin/localhost_docker_access_check.sh
```

Start the environment:

```bash
bash bin/local_integration_start.sh
```

Seed the database:

```bash
bash bin/local_integration_seed.sh
```

Stop the environment:

```bash
bash bin/local_integration_stop.sh
```

## Design Notes

- this environment is the closest local match to the production runtime model
- the application image packages the test artifacts rather than building inside
  the image
- Postgres data is intentionally kept under `.private/`
- the environment is meant for integration validation, not fast frontend
  iteration

## Issues We Have Seen

- Docker daemon access can fail when the user is not in the Docker group or has
  not started a new session
- a fresh local integration Postgres volume starts empty until schema and seed
  data are applied
- port confusion between dev, test, and local integration can make the wrong
  environment appear broken

## Debugging Checklist

- confirm Docker daemon access works
- confirm the compose env file points to the intended host port
- inspect running containers with `docker ps`
- verify Postgres data exists under the expected private path
- if the UI comes up with empty data, confirm the schema and seed step ran
- verify the application is serving the bundled frontend, not source assets

## Things To Watch

- local integration is intentionally not the same as development
- keep the private container state out of tracked files
- if this environment works, image/runtime issues on the remote host are more
  likely to be deployment-path problems than application build problems
