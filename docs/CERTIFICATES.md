# Certificates

This document captures the current TLS certificate direction for
`music-tools`.

## Current Decision

For the current hostnames:

- `www.riffexchange.com`
- `music.riffexchange.com`

the preferred short-term certificate path is the existing commercial SAN
certificate rather than a new wildcard certificate.

Reasoning:

- only two hostnames are currently needed
- a wildcard certificate would add cost and flexibility we are not yet using
- the existing Namecheap/Sectigo path is familiar and operationally simpler for
  this environment
- the OCI production host is private, which makes the fully automated
  Let’s Encrypt path less attractive right now

## Browser Trust

A normal public Namecheap/Sectigo certificate should be trusted by modern
browsers as long as:

- the certificate is valid and not expired
- the hostnames match the SANs on the certificate
- the full certificate chain is installed correctly
- the server presents the correct certificate for the requested host

## Why Not Wildcard Right Now

Wildcard certificates are useful when we expect many subdomains or frequent
hostname changes.

That is not the current need. We only need a small fixed set of names, so a SAN
certificate is the better fit.

Wildcard can be revisited later if the domain layout grows.

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

Certificate deployment should be handled with Ansible, not Terraform and not
image builds.

Recommended responsibility split:

- Terraform:
  - infrastructure only
- Ansible:
  - copy certificate and key files to the host
  - install proxy config
  - restart or reload the reverse proxy
- shell wrappers:
  - operator entrypoints for repeatable deployment tasks

This matches the current repo direction where Ansible owns host configuration
and runtime preparation.

## Let’s Encrypt Note

Let’s Encrypt is still a valid option in the future.

Important distinction:

- `http-01` needs a reachable web path
- `dns-01` can be performed from an operator or development machine that can
  update DNS

So Let’s Encrypt would not necessarily require outbound internet access from
the private OCI host itself.

Even so, for the current two-host setup, the existing SAN certificate remains
the simpler operational choice.

## Next Steps

- add reverse proxy runtime design for `80` and `443`
- add proxy container configuration to the production Compose runtime
- add Ansible tasks/playbooks for certificate deployment
- add a renewal/install runbook for the commercial certificate path
