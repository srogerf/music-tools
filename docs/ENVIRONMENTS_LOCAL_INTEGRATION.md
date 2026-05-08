# Local Integration Environment

This document describes the local Docker Compose integration environment.

## Purpose

- validate the container runtime locally
- confirm the application image works with Postgres under Compose
- rehearse a production-like runtime before touching the remote host
- rehearse database schema and reference-data upgrade paths before running them
  against production

## Layout

- runtime:
  - Docker Compose
- services:
  - nginx reverse proxy container
  - application container
  - official Postgres container
- mutable private state:
  - `.private/container/compose.env`
  - `.private/container/local-integration/postgres-data/`
  - `.private/container/local-integration/logs/nginx/`
  - `.private/container/local-integration/reports/`
- image input:
  - application image built from the verified `build/test` artifacts

## Default Shape

- public HTTP port:
  - local host port from `.private/container/compose.env`
  - nginx listens on this port and proxies to the application container on
    internal port `8080`
- request throttling:
  - nginx applies the same per-IP request and connection limits used by
    production
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

When a release changes database schema versions, seed-data versions, or
production upgrade wrappers, use local integration as the rehearsal
environment first:

```bash
bash bin/local_integration_start.sh
bash bin/local_integration_seed.sh
```

Then verify the app comes up correctly against that upgraded data before
touching production.

Stop the environment:

```bash
bash bin/local_integration_stop.sh
```

Generate a GoAccess report from nginx access logs:

```bash
bash bin/local_integration_goaccess.sh
```

## Design Notes

- this environment is the closest local match to the production runtime model
- the application image packages the test artifacts rather than building inside
  the image
- nginx owns the public local HTTP port so local integration matches the
  intended production reverse proxy shape
- nginx mounts a root config as well as a server config so rate-limit zones can
  be tested locally before production
- GoAccess reads nginx's standard `combined` access log and writes a static
  report under `.private/container/local-integration/reports/`
- Postgres data is intentionally kept under `.private/`
- the environment is meant for integration validation, not fast frontend
  iteration
- this is the correct place to catch schema-version and seed-version path
  issues before production release work

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
- if a DB upgrade path has not been rehearsed in local integration, it is not
  ready for production
