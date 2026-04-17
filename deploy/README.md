# Deploy

This directory contains deployment-related assets organized by responsibility.

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
