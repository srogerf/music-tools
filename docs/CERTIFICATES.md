# Certificates

This document captures the current TLS certificate direction for
`music-tools`.

## Current Decision

For the first hostname:

- `www.riffexchange.com`

the preferred certificate path is Let’s Encrypt with DNS-01 validation from
the operator/control machine, then copying the issued certificate material to
the production host over the Bastion path.

Reasoning:

- the OCI production host is private
- DNS-01 does not require the production host to serve the ACME challenge
- DNS-01 can be performed from a local/control machine that can update DNS
- DNS API credentials do not need to live on the production host
- certificate files can be copied to host-managed runtime paths after issue or
  renewal

## Browser Trust

A normal public Let’s Encrypt certificate should be trusted by modern browsers
as long as:

- the certificate is valid and not expired
- the hostnames match the SANs on the certificate
- the full certificate chain is installed correctly
- the server presents the correct certificate for the requested host

## Why DNS-01

The chosen validation path is DNS-01.

This means the ACME client proves domain control by creating a DNS TXT record
for the challenge. The ACME client should run on the operator/control machine,
not on the production OCI host.

Benefits:

- works even when the production host is private
- avoids exposing ACME challenge file handling in nginx
- supports wildcard certificates later if the hostname plan grows
- keeps DNS automation credentials off the production host

DNS provider decision:

- DNS is managed in GoDaddy.
- Existing GoDaddy API code lives in `../dynamic-ip-updater`.
- That code already uses the production API base URL
  `https://api.godaddy.com`.
- It authenticates with the `Authorization: sso-key KEY:SECRET` header.
- Reuse the same credential shape for certificate automation.
- Keep any certificate helper out of music-related source paths. Certificate
  issue, renewal, and deployment code belongs under deployment/build tooling.

If DNS automation is not available, manual DNS-01 can still work for initial
issuance, but renewal should not depend on manual TXT updates long term.

## Why Not Bake Certs Into Images

Certificates should not be built into the Go image or into a custom nginx
image.

Reasons:

- certificates renew independently of application builds
- rebuilding images for every certificate refresh adds unnecessary release work
- certificate private keys are runtime secrets, not build artifacts
- keeping the application image generic is a cleaner deployment model

## Intended TLS Layout

The intended production TLS layout is:

- `rifferone` container stays HTTP-only on internal port `8080`
- a reverse proxy container handles ports `80` and `443`
- the reverse proxy terminates TLS
- the reverse proxy forwards to `rifferone:8080`

That means the Go container does not own certificate lifecycle concerns.

## Reverse Proxy Direction

The expected next step is to add a reverse proxy container such as `nginx`
in front of the Go app.

The preferred model is:

- use a standard proxy image
- mount in the proxy config
- mount in the certificate and private key
- avoid building certificate material into the container image

Example host-managed runtime paths:

- `/srv/rifferone/nginx/`
- `/srv/rifferone/certs/fullchain.pem`
- `/srv/rifferone/certs/privkey.pem`

## Certificate Deployment Direction

Certificate issue/renewal should happen from the operator/control machine.
Certificate deployment to the host should be handled by a repeatable shell
wrapper or Ansible, not Terraform and not image builds.

Recommended responsibility split:

- Terraform:
  - infrastructure only
- local ACME client:
  - request or renew the certificate using DNS-01
  - write certificate files to a private local path
- Ansible or shell wrapper:
  - copy certificate and key files to the host
  - install proxy config
  - restart or reload the reverse proxy
- shell wrappers:
  - operator entrypoints for repeatable deployment tasks

This matches the current repo direction where Ansible owns host configuration
and runtime preparation.

## Let’s Encrypt DNS-01 Plan

Planned flow:

1. Run an ACME client on the operator/control machine.
2. Validate `www.riffexchange.com` with DNS-01.
3. Store issued material in a private local path.
4. Copy `fullchain.pem` and `privkey.pem` to the production host:
   - `/srv/rifferone/certs/fullchain.pem`
   - `/srv/rifferone/certs/privkey.pem`
5. Mount `/srv/rifferone/certs` into nginx as read-only.
6. Add an nginx `443 ssl` server using the mounted files.
7. Enable the OCI load balancer `443` passthrough path only after the host is
   confirmed to serve TLS on `443`.
8. Add renewal automation that repeats issue/renew, copy, and nginx reload.

Do not enable HSTS until HTTPS is deployed and stable.

## GoDaddy Automation Direction

Start with `lego` using its GoDaddy DNS provider. This avoids maintaining an
ACME client in this repo while still using the same GoDaddy account and API
credentials already proven by `../dynamic-ip-updater`.

Expected private environment variables:

- `GODADDY_API_KEY`
- `GODADDY_API_SECRET`

The existing `../dynamic-ip-updater/src/godaddy.go` implementation is the
reference for any custom DNS helper we decide to write later. It already has
the request format needed to read and write DNS records through GoDaddy.

If we write a repo-local certificate helper, place it under a deployment or
build-oriented path, not under the music application code. Preferred starting
locations:

- `deploy/certificates/`
- `deploy/build/`
- `bin/` as a thin operator wrapper only

Initial target:

- domain: `riffexchange.com`
- certificate hostname: `www.riffexchange.com`
- DNS challenge record: `_acme-challenge.www`

## HTTP-01 Non-Goal

HTTP-01 is not the planned path right now.

Reasons:

- it requires public HTTP challenge handling on the production route
- it adds nginx challenge-path behavior that DNS-01 avoids
- it does not support wildcard certificates if they become useful later

## Next Steps

- add a private local environment file for GoDaddy API credentials
- add certificate helper code under `deploy/certificates/` if `lego` alone is
  not enough
- add a local/control-machine wrapper around `lego`
- add a private local certificate output path
- add a wrapper to copy cert files over Bastion to `/srv/rifferone/certs`
- add nginx `443 ssl` config and cert mounts
- enable OCI load balancer `443` passthrough after host TLS is verified
- add renewal and nginx reload automation
