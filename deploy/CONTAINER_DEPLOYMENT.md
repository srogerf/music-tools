# Container Deployment Direction

This document records the current recommended build and deployment approach if
`music-tools` moves the server and database into containers.

## Recommendation

Use:

- GitHub Actions for CI, image builds, and release orchestration
- OCI Container Registry (OCIR) for storing versioned container images
- one OCI Always Free-friendly `VM.Standard.E2.1.Micro` compute instance as the
  runtime host
- Docker Engine with Docker Compose on that instance to run the long-lived
  runtime containers
- Terraform for infrastructure provisioning only

Avoid adding OCI Kubernetes Engine or Terragrunt at this stage. The stack is
still small enough that those layers would add more complexity than value.

`VM.Standard.A1.Flex` may be worth revisiting later if capacity becomes
available, but the current working production target is the E2 Micro shape.

## Chosen Path

The currently chosen deployment path is:

- use normal local server development for day-to-day feature work
- use local container integration to validate the Docker runtime and migration
  flow
- keep the `rifferOne` application container and `postgres` as long-lived
  runtime containers on the OCI VM
- manage those runtime containers with Docker Compose
- deploy the `rifferOne` container more frequently than the database container
- run schema migrations as a separate deploy step outside the always-on Compose
  stack

This means Compose defines the stable runtime, while migrations remain an
explicit release operation.

## Delivery Process

The current delivery process is intentionally simple:

1. Local server development
2. Local test artifact verification
3. Local container integration
4. Production deployment

### 1. Local Server Development

Use the normal local Go server flow for most feature work.

Goal:

- fast iteration on backend and frontend changes without requiring container
  rebuilds

### 2. Local Container Integration

### 2. Local Test Artifact Verification

Build the pre-container artifacts and run them separately from source dev:

- server binary under `build/test/server/`
- frontend assets under `build/test/frontend/`
- runtime port `8081`
- database name `music_tools_test`

This verifies the files we plan to package before the Docker build step.

### 3. Local Container Integration

Use the local Docker runtime to verify:

- the `rifferOne` image builds
- Compose wiring works
- Postgres persistence works
- migrations run correctly against the containerized database
- application-only redeploys work as expected

This is the main pre-production integration environment for now.

The local integration environment should keep its mutable config and Postgres
data under `.private/`, not in tracked repo paths:

- `.private/container/compose.env`
- `.private/container/local-integration/postgres-data`

The application image packages prebuilt artifacts from `build/test`, so run
`bash bin/build_artifacts.sh` before `docker compose build`.

### 4. Production Deployment

Production uses the OCI VM runtime with Docker Compose for the long-lived
containers and a separate migration step during deploy.

## Future Staging Note

We are not creating a separate staging deployment environment yet.

That remains a possible future addition if we need:

- production-like release rehearsal in OCI
- private environment testing outside a local machine
- a safer promotion step before production rollout

For now, local container integration is the chosen substitute for staging.

## Why This Fits

This approach lines up well with the current repo and infrastructure direction:

- the project already uses GitHub and GitHub Actions
- the OCI Terraform stack already targets a small Always Free-friendly setup
- the app is still a single service plus a database
- a containerized database needs persistent storage, which is easier to manage
  on a VM than on OCI Container Instances

## Runtime Model

Recommended runtime layout:

- one private OCI compute instance in `apps/music-tools`
- the `rifferOne` application runs as a container
- Postgres runs as a container on the same host
- Postgres data is stored on a persistent Docker volume or mounted host path
- the public entry point remains the OCI load balancer
- SSH/admin access remains through OCI Bastion

This keeps the operational model simple while still giving us containerized app
delivery.

## Why Compose Still Fits

Even if `rifferOne` is deployed more often than the database, Compose is still a
good fit because it defines the steady-state runtime in one versioned file:

- `rifferone` Compose service for the `rifferOne` application container
- `postgres`
- shared networking
- persistent database storage
- restart behavior
- environment wiring

It does not require both services to be updated together. We can update only
the `rifferOne` service when needed.

## Production Build And Release Flow

Recommended flow:

1. GitHub Actions runs tests on push and pull request.
2. On merge to `main`, GitHub Actions builds versioned images.
3. GitHub Actions pushes those images to OCIR.
4. A deployment step runs schema migrations against Postgres as a separate
   operation.
5. The private compute instance updates the runtime stack.
6. The instance runs `docker compose pull rifferone` and
   `docker compose up -d rifferone` for normal app deploys.
7. Post-deploy smoke checks verify the app is healthy.

## Migration Strategy

Migrations should not be tied to container startup.

Use this model:

- the Compose stack runs the long-lived runtime containers
- migrations run separately from CI or a release script
- migrations connect to Postgres over the private network endpoint
- the `rifferOne` container is updated only after the migration step succeeds

This keeps schema changes explicit and makes frequent server-only deploys much
safer.

## Image Layout

A good first cut would be:

- `rifferone`
- `music-tools-migrations`
- the official `postgres` image for the database runtime

The current `rifferone` Dockerfile packages:

- `build/test/server/rifferone`
- `build/test/frontend/app/`

We are not planning to generate a custom Postgres image by default.

Why:

- the official Postgres image already covers the normal runtime needs
- our main database-specific concerns are volumes, env vars, backups, and
  migration flow, not image customization
- avoiding a custom DB image reduces maintenance and security-update overhead

We should only add a custom Postgres image later if we truly need baked-in
extensions, custom init behavior, or OS-level packages that cannot be handled
cleanly another way.

## Container Manager Choice

Use Docker as the primary container manager for this deployment path.

Why Docker is the best fit here:

- Docker Compose is the cleanest match for the chosen `rifferOne + postgres`
  runtime model
- the Compose workflow is first-class in Docker
- the deployment commands are straightforward and familiar
- most example CI/CD and VM-hosted deployment flows assume Docker directly

### Podman

Podman is a valid tool, but it is not the best default here.

Reasons:

- Podman is daemonless and attractive operationally, but its Compose workflow is
  still documented as a thin wrapper around an external compose provider
- that adds an extra compatibility layer right where we want the simplest
  possible deploy/update path
- for this repo, Docker Compose is the more direct fit

Podman remains a reasonable future alternative if we later want a rootless or
daemonless runtime and are willing to standardize the deployment flow around it.

### Nomad

Do not use Nomad for this stack right now.

Reasons:

- Nomad is a real workload orchestrator, not just a container runtime
- it solves a larger orchestration problem than this app currently has
- it would add cluster/job-management overhead to a single-VM deployment

Nomad becomes more interesting if we outgrow a single-host Compose-style
deployment and want a scheduler, rolling strategies, and broader workload
placement logic.

## Why Not OCI Container Instances

OCI Container Instances are a good fit for containerized workloads that do not
need Kubernetes, but they are not the best fit here for the database layer.

Reasons:

- the database needs persistent storage and predictable lifecycle handling
- the app already has a clean Always Free-oriented VM path
- keeping both services on one small VM is operationally simpler at this stage
- Container Instances would introduce more deployment and networking decisions
  without solving a current scaling problem

If the app service later becomes separate enough from the database, we can
revisit running only the stateless app in Container Instances.

## Why Not OKE

Do not use Oracle Kubernetes Engine yet.

Reasons:

- too much platform complexity for the current size of the app
- more moving parts than we need for one app and one database
- no clear payoff until we have multiple services, richer scaling needs, or
  team workflows that benefit from Kubernetes

## Why Not Terragrunt

Do not introduce Terragrunt yet.

Reasons:

- current Terraform is still small and readable
- we only have one OCI stack and one app deployment target
- Terragrunt becomes more useful once we have multiple environments or repeated
  stacks

Plain Terraform with the current file split is the better tradeoff for now.

## Deployment Responsibility Split

Keep responsibilities separated like this:

- Terraform:
  - compartments
  - VCN, subnets, gateways, NSGs
  - load balancer
  - compute instance
  - Bastion
- container definitions:
  - Dockerfiles
  - `docker-compose.yml`
  - runtime environment wiring
- CI/CD:
  - test
  - build
  - image publish
  - deploy trigger

This keeps infrastructure provisioning distinct from app rollout.

## Database Guidance

If the database is containerized:

- run it on the same OCI VM as the app at first
- use persistent storage
- back it up separately from the app image
- keep schema migration execution explicit during deploy

Longer term, we can reconsider whether the database should remain in a
container, or move to a managed OCI database service.

## Backup Direction

Recommended first backup strategy:

- regular Postgres dumps or base backups from the VM
- store backups in OCI Object Storage
- keep retention policy outside the running container lifecycle

Container images are not backups. The database volume and exported backups are
the real recovery assets.

## Suggested Next Implementation Steps

1. Add a server `Dockerfile`.
2. Add a `docker-compose.yml` for `rifferOne` and Postgres.
3. Add a migration execution step that runs outside the Compose runtime stack.
4. Add GitHub Actions workflows for image build and publish.
5. Add a VM-side deploy script that updates Compose services.
6. Add backup scripting for Postgres to OCI Object Storage.

## References

This recommendation is based on the current OCI and GitHub documentation
reviewed on April 20, 2026:

- OCI Always Free resources:
  https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm
- OCI Container Registry overview:
  https://docs.oracle.com/en-us/iaas/Content/Registry/Concepts/registryoverview.htm
- OCI Container Instances overview:
  https://docs.oracle.com/en-us/iaas/Content/container-instances/overview-of-container-instances.htm
- OCI Creating a Container Instance:
  https://docs.oracle.com/en-us/iaas/Content/container-instances/creating-a-container-instance.htm
- OCI DevOps build pipelines:
  https://docs.oracle.com/en-us/iaas/Content/devops/using/managing_build_pipelines.htm
- GitHub Actions publishing Docker images:
  https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
