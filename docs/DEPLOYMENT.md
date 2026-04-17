# Deployment

This document records the current deployment direction for `music-tools`.

## Current State

- The backend now reads its source-of-truth data from Postgres.
- The local database can be initialized and seeded with:
  - `bin/local_init_postgres.sh`
  - `bash db/postgres/reset_and_seed.sh`
- The frontend is served by the Go server.
- GitHub Actions CI already runs `go test ./...` on pushes and pull requests.

## Recommended CI/CD Direction

The preferred deployment approach is:

1. Run CI on every push and pull request.
2. Run `go test ./...`.
3. Start a temporary Postgres service in CI.
4. Apply schema and seed data to the CI database.
5. Run API smoke checks against the seeded database.
6. Build a single deployable backend artifact or container.
7. Deploy automatically on merge to `main`.

## Recommended Tooling

- GitHub Actions for CI/CD
- Docker for packaging
- Postgres as a separately managed service
- Versioned SQL migrations for production schema changes

## Production Deployment Model

- Deploy the Go server as the main application artifact.
- Keep Postgres external to the app container/process.
- Use environment-based configuration for database access.
- Run migrations before switching production traffic to a new release.
- Run smoke checks after deploy.

Suggested smoke-check endpoints:

- `/`
- `/api/v1/scales`
- `/api/v1/tunings`
- `/api/v1/scales/scale_layouts`

## Important Rule

Do not use the local reset-and-seed flow in production.

`db/postgres/reset_and_seed.sh` is for:

- local development
- test environments
- CI bootstrap

Production should use:

- forward-only migrations
- controlled reference-data updates

## Future Work

When deployment work resumes, likely next steps are:

1. Add a `Dockerfile`
2. Expand CI to include Postgres bootstrap and API smoke checks
3. Add a GitHub Actions deploy workflow
4. Add a proper migration flow separate from reset/seed
5. Add a health endpoint
