# Production Environment

This document describes the current production deployment model.

## Purpose

- run the containerized application on a private cloud host
- keep the steady-state runtime simple
- separate host bootstrap, image publication, and deploy operations

## Layout

- infrastructure:
  - private compute instance
  - Bastion access path
  - public load balancer
- runtime:
  - Docker Compose on the compute instance
- services:
  - nginx reverse proxy container
  - application container
  - official Postgres container
  - optional GoAccess report container
- image source:
  - GitHub Container Registry
- private config:
  - `.private/deploy/production.env`
  - `.private/deploy/production.compose.env`
  - `.private/bastion/music-tools.env`

## Default Shape

- public entry point:
  - load balancer on port `80`
  - nginx owns host port `80` and proxies to the application container on
    internal port `8080`
- instance runtime path:
  - host-managed application directory
- Postgres data path:
  - host-managed persistent directory
- nginx logs:
  - host-managed path from production compose env
- GoAccess reports:
  - host-managed path from production compose env
- image pull path:
  - GHCR through the Bastion-assisted proxy path

## Setup

Typical release wrappers:

```bash
bash bin/production_image_build.sh --tag sha-<git-sha>
bash bin/production_image_push.sh --tag sha-<git-sha>
bash bin/production_deploy.sh --tag sha-<git-sha>
```

Generate and copy back a private GoAccess report:

```bash
bash bin/production_goaccess.sh
```

Tunnel order:

```bash
bash bin/oci_bastion_ssh.sh --new-session --no-ssh
bash bin/oci_bastion_proxy_tunnel.sh
```

Current deployment prerequisites:

- OCI infrastructure applied
- host bootstrap completed
- Bastion SSH tunnel available
- Bastion reverse proxy tunnel available
- production compose env points to a valid image tag

## Design Notes

- production keeps the host in a private subnet
- GHCR is used for image storage and publication
- image pulls currently depend on a Bastion-assisted proxy path because the host
  does not have general NAT egress
- the runtime is intentionally Docker Compose rather than a larger orchestrator
- database migrations are a separate concern and are not yet fully wired into
  the release flow
- GoAccess is available as an operator report against nginx access logs; it is
  not exposed publicly by default

## Issues We Have Seen

- GHCR authentication and image pull worked only after Docker itself was given
  explicit daemon proxy configuration in `/etc/docker/daemon.json`
- shell-level proxy variables were not enough for Docker daemon registry access
- Bastion and reverse-proxy tunnels can become stale or conflict on reused local
  ports
- the deployment path is more fragile than local integration because it depends
  on OCI, Bastion, proxying, GHCR, Docker, and the remote host all lining up
- wrong image tags in the remote compose env can look like registry or auth
  failures
- browser and CLI output can accidentally expose tokens during traced runs

## Debugging Checklist

- confirm the load balancer and host port mapping still agree on port `80`
- confirm `rifferone-nginx` is the container publishing host port `80`
- confirm the Bastion SSH tunnel is active before deployment
- confirm the reverse proxy tunnel is active before deployment
- confirm the remote host can `curl https://ghcr.io/v2/` when proxy variables
  are set
- confirm `/etc/docker/daemon.json` still points Docker at the remote proxy URL
- confirm Docker on the remote host can `docker login ghcr.io`
- confirm the remote compose env references an image tag that actually exists
- inspect Docker Compose status on the host after pull and startup

## Things To Watch

- keep pull and push tokens separate where practical
- rotate tokens immediately if they appear in terminal traces
- avoid relying on port `443` until the TLS path is intentionally implemented
- prefer generic design notes in shared docs; keep real IPs, tokens, and host
  specifics under `.private/`
