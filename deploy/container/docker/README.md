# Docker Runtime

This directory contains the current Docker-based container runtime definition
for `music-tools`.

## Files

- `rifferOne/Dockerfile`
  - builds the application image
- `docker-compose.yml`
  - defines the long-lived runtime services
- `compose.env.example`
  - example runtime configuration for local or VM deployment

## Current Runtime Model

- `rifferOne` is the application container
- `postgres` uses the official Postgres image
- Postgres data lives on the VM host, outside the container filesystem
- migrations are not part of the always-on Compose stack
- Postgres is published only on `127.0.0.1:5432` on the host by default

## Intended Use

This Docker setup is currently meant for:

- local container integration testing
- the production runtime model

It is not tied to a separate staging deployment environment at this time.

## Postgres Data Path

The Compose file defaults the Postgres host data path to:

- `/srv/rifferone/postgres-data`

Create it on the host before first start:

```bash
sudo mkdir -p /srv/rifferone/postgres-data
sudo chown -R 999:999 /srv/rifferone/postgres-data
```

If you want a different path, set `POSTGRES_DATA_PATH` in
`.private/container/compose.env`.

## Postgres Port Exposure

The Compose file binds Postgres to:

- `127.0.0.1:5432`

That keeps the database reachable from the host for explicit migration or admin
commands without exposing it broadly on the VM network interface.

## Usage

1. Copy `compose.env.example` to `.private/container/compose.env`.
2. Fill in the real database password and any port overrides.
3. Start the runtime stack:

```bash
docker compose -f deploy/container/docker/docker-compose.yml --env-file .private/container/compose.env up -d
```

For normal application-only updates:

```bash
docker compose -f deploy/container/docker/docker-compose.yml --env-file .private/container/compose.env pull rifferone
docker compose -f deploy/container/docker/docker-compose.yml --env-file .private/container/compose.env up -d rifferone
```

## Migration Note

Migrations should run separately from the always-on Compose runtime.

The current repo does not yet include a migration runner container or deploy
script. That should be added as a separate step in CI or release automation.
