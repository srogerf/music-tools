# Docker Runtime

This directory contains the current Docker-based container runtime definition
for `music-tools`.

## Files

- `rifferOne/Dockerfile`
  - packages prebuilt server/frontend artifacts into the application image
- `docker-compose.yml`
  - defines the long-lived runtime services
- `compose.env.example`
  - example runtime configuration for local or VM deployment

## Current Runtime Model

- `rifferOne` is the application container
- `postgres` uses the official Postgres image
- for local integration, Postgres data lives under `.private/container/`
- for production, Postgres data should live on a managed host path such as
  `/srv/rifferone/postgres-data`
- migrations are not part of the always-on Compose stack
- Postgres is published only on `127.0.0.1:5432` on the host by default

## Intended Use

This Docker setup is currently meant for:

- local container integration testing
- the production runtime model

It is not tied to a separate staging deployment environment at this time.

Before building or running the container, build and verify the local test
artifacts:

```bash
npm install
bash bin/build_artifacts.sh
bash bin/test_start.sh
```

That gives us a pre-container check of the server binary and Vite frontend
bundle. The Dockerfile expects these files:

- `build/test/server/rifferone`
- `build/test/frontend/app/`

## Local Integration Environment

The local Docker Compose stack is the local integration environment.

It keeps runtime config and Postgres data under `.private/`:

- `.private/container/compose.env`
- `.private/container/local-integration/postgres-data`

The helper script resolves the Postgres data path to an absolute repo-root
path before invoking Compose.

Recommended start command:

```bash
bash bin/local_integration_start.sh
```

If Docker daemon access is not ready yet, run:

```bash
bash bin/check_docker_access.sh
```

Recommended stop command:

```bash
bash bin/local_integration_stop.sh
```

Seed the local integration database:

```bash
bash bin/local_integration_seed.sh
```

## Postgres Data Path

For the local integration environment, the Compose file defaults the Postgres
host data path to:

- `.private/container/local-integration/postgres-data`

The helper script creates it automatically. If you want a different path, set
`POSTGRES_DATA_PATH` in `.private/container/compose.env`.

For a production VM deployment, override it to a host-managed path such as:

```bash
sudo mkdir -p /srv/rifferone/postgres-data
sudo chown -R 999:999 /srv/rifferone/postgres-data
```

## Postgres Port Exposure

The Compose file binds Postgres to:

- `127.0.0.1:5432`

That keeps the database reachable from the host for explicit migration or admin
commands without exposing it broadly on the VM network interface.

## Usage

1. Copy `compose.env.example` to `.private/container/compose.env`.
2. Fill in the real database password and any port overrides.
3. Start the local integration environment:

```bash
bash bin/local_integration_start.sh
```

For normal application-only updates:

```bash
docker compose -f deploy/container/docker/docker-compose.yml --env-file .private/container/compose.env build rifferone
docker compose -f deploy/container/docker/docker-compose.yml --env-file .private/container/compose.env pull rifferone
docker compose -f deploy/container/docker/docker-compose.yml --env-file .private/container/compose.env up -d rifferone
```

## Migration Note

Migrations should run separately from the always-on Compose runtime.

The current repo does not yet include a migration runner container or deploy
script. That should be added as a separate step in CI or release automation.
