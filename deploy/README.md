# Deploy

This directory contains deployment-related assets organized by responsibility.

Additional deployment design notes can live at the top of `deploy/` when they
apply across more than one subdirectory.

Current top-level deployment notes:

- [CONTAINER_DEPLOYMENT.md](CONTAINER_DEPLOYMENT.md)
- [infrastructure/oci/README.md](infrastructure/oci/README.md)
- [cicd/ansible/README.md](cicd/ansible/README.md)

## Structure

- `infrastructure/`
  - Cloud infrastructure creation and provisioning.
  - Store provider-specific infrastructure definitions here.
  - Example providers: `aws/`, `gcp/`, `azure/`, `digitalocean/`
- `container/`
  - Containerization files and related build assets.
  - Store container-type-specific definitions here.
  - Example types: `docker/`, `podman/`
- `cicd/`
  - Deployment automation and configuration management assets.
  - Store tool-specific deployment definitions here.
  - Example tools: `ansible/`, `chef/`

Create a subdirectory under each section for the specific provider or tool being used.

## Current Direction

- Infrastructure currently lives under `deploy/infrastructure/oci/`.
- Container rollout direction is documented in `deploy/CONTAINER_DEPLOYMENT.md`.
- OCI host bootstrap automation lives under `deploy/cicd/ansible/`.
- This directory should prefer one focused doc per concern rather than
  repeating the same deployment guidance in multiple places.
