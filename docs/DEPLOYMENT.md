# Deployment

This document is the top-level deployment index for `music-tools`.

## Current Direction

The project currently has three separate deployment concerns:

- database lifecycle and safety rules
- infrastructure provisioning
- application build and rollout

Each concern now has its own more focused document.

## Canonical Deployment Docs

- Database deployment:
  `docs/DEPLOY_DATABASE.md`
- Container build and rollout direction:
  `deploy/CONTAINER_DEPLOYMENT.md`
- Deploy directory layout:
  `deploy/README.md`
- OCI infrastructure starter:
  `deploy/infrastructure/oci/README.md`

## Current Operational Facts

- The backend reads its source-of-truth layout data from Postgres.
- The frontend is served by the Go server.
- Canonical SQL lives under `db/sql/`.
- Postgres helper scripts live under `db/postgres/`.
- GitHub Actions CI already runs `go test ./...` on pushes and pull requests.

## Important Rule

Do not use the local schema rebuild or reset-and-seed flows in production.

The local database helpers are for:

- local development
- test environments
- CI bootstrap

Production database changes must follow the rules in
`docs/DEPLOY_DATABASE.md`.

## Near-Term Direction

The currently preferred application deployment direction is:

- local server development for normal feature work
- local dev runtime on port `8080` using source assets and `music_tools_dev`
- local container integration for runtime validation
- local test artifact runtime on port `8081` using built/staged assets and
  `music_tools_test`
- GitHub Actions for CI and image build
- OCI Container Registry for published images
- one OCI Always Free-friendly compute instance as the runtime host
- Docker Compose on that host for the server and database containers
- Bastion-based private host access and Bastion-proxy host bootstrap, not NAT,
  for the default OCI path

That design is documented in `deploy/CONTAINER_DEPLOYMENT.md`.

We may add a separate staging deployment environment later, but it is not part
of the current operating model.
