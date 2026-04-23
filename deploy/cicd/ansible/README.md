# Ansible Deployment Bootstrap

This directory contains Ansible automation for preparing the OCI compute host
that runs the Docker Compose production runtime.

## Scope

The current playbook bootstraps the host only. It does not deploy application
containers yet.

It installs and configures:

- Docker Engine
- Docker Compose plugin
- Git
- Firewalld
- `/srv/rifferone/app`
- `/srv/rifferone/postgres-data`
- Docker group membership for `opc`

## Network Requirement

The OCI app instance is in a private subnet and the Terraform stack currently
does not create a NAT gateway.

That means package installation needs an outbound path. The current supported
bootstrap path is to route package downloads through a local proxy over the
Bastion SSH tunnel.

Do not assume NAT Gateway is available or part of the normal production path.
If we later choose a paid or alternate bootstrap path, that should be treated
as an explicit exception, not the default workflow.

## Bastion Proxy Tunnel

The Bastion proxy path keeps the OCI instance private and avoids NAT Gateway.
It needs local project tooling and a local HTTP proxy on your workstation.

Local project tooling:

```bash
bash bin/localhost_bootstrap_env.sh
bash bin/localhost_init_envs.sh
```

At minimum, the local control machine needs:

- Ansible
- OCI CLI
- OpenSSH client
- tinyproxy or another local HTTP proxy
- the private Ansible inventory at `.private/ansible/hosts.yml`
- the Bastion env file at `.private/bastion/music-tools.env`

On Ubuntu, `tinyproxy` is a small HTTP proxy option:

```bash
sudo apt install tinyproxy
sudo systemctl enable --now tinyproxy
```

Then start the reverse proxy tunnel in one terminal. The helper defaults to
local `127.0.0.1:8888` for tinyproxy and remote `127.0.0.1:3128` on the OCI
host:

```bash
bash bin/oci_bastion_proxy_tunnel.sh
```

That creates this path:

```text
OCI private host 127.0.0.1:3128 -> SSH reverse tunnel -> local 127.0.0.1:8888 -> internet
```

Run Ansible from another terminal with the remote proxy URL:

```bash
BOOTSTRAP_PROXY_URL=http://127.0.0.1:3128 \
ANSIBLE_CONFIG=deploy/cicd/ansible/ansible.cfg \
ansible-playbook \
  -i .private/ansible/hosts.yml \
  deploy/cicd/ansible/playbooks/bootstrap_docker_host.yml
```

Stop the proxy tunnel with `Ctrl-C` after bootstrap completes.

## Oracle Linux Repo Preparation

When bootstrapping through the Bastion proxy path, Oracle Linux package
installation can look hung because `dnf` waits on repos that are slow,
unavailable, or not needed for this host bootstrap.

Observed blockers:

- regional OCI yum mirror URLs such as `yum.us-phoenix-1.oci.oraclecloud.com`
  timed out through the reverse proxy
- `ol10_ksplice` timed out and is not needed for Docker bootstrap
- `ol10_oci_included` returned missing metadata from the public mirror and is
  not needed for Docker bootstrap
- unrelated enabled repos can add long metadata refresh delays

The Ansible bootstrap now prepares repos before package installation:

- rewrites Oracle repo base URLs from the regional OCI mirror to
  `https://yum.oracle.com/repo` when `BOOTSTRAP_PROXY_URL` is set
- disables Ksplice during bootstrap
- disables the OCI included repo during proxied bootstrap
- installs packages with explicit `disablerepo` and `enablerepo` lists

You can run just the repo preparation and verification step before the full
bootstrap:

```bash
bash bin/oci_prepare_host_repos.sh
```

Then run the full host bootstrap:

```bash
BOOTSTRAP_PROXY_URL=http://127.0.0.1:3128 \
ANSIBLE_CONFIG=deploy/cicd/ansible/ansible.cfg \
ansible-playbook \
  -i .private/ansible/hosts.yml \
  deploy/cicd/ansible/playbooks/bootstrap_docker_host.yml
```

## Local Control Machine Setup

Install Ansible on the machine where you run the playbook:

```bash
python3 -m pip install --user ansible
```

## Inventory Setup

Copy the example inventory into `.private/` and edit the SSH key path if needed:

```bash
mkdir -p .private/ansible
cp deploy/cicd/ansible/inventory/hosts.example.yml .private/ansible/hosts.yml
```

For normal SSH-only access, start the OCI Bastion tunnel in one terminal:

```bash
bash bin/oci_bastion_ssh.sh --no-ssh
```

Run the playbook from another terminal:

```bash
ANSIBLE_CONFIG=deploy/cicd/ansible/ansible.cfg \
ansible-playbook \
  -i .private/ansible/hosts.yml \
  deploy/cicd/ansible/playbooks/bootstrap_docker_host.yml
```

Reconnect the SSH session after the playbook completes so `opc` picks up Docker
group membership.

If SSH host-key checking blocks the first run, connect once through the tunnel
with `ssh -p 2222 opc@127.0.0.1` and accept the host key before running
Ansible again.

## Verification

After reconnecting through Bastion:

```bash
docker --version
docker compose version
docker ps
```

The Postgres data directory should exist at:

```bash
sudo ls -ld /srv/rifferone/postgres-data
```

## Notes

- This playbook uses Docker's RHEL package repository because our chosen runtime
  path is Docker Compose.
- If `BOOTSTRAP_PROXY_URL` is set, package install tasks use it for outbound
  HTTP and HTTPS access.
- If `BOOTSTRAP_PROXY_URL` is set, the playbook also rewrites Oracle Linux repo
  URLs from the regional OCI yum mirror to the public `yum.oracle.com` mirror
  because the regional mirror can time out through the reverse proxy path.
- If `BOOTSTRAP_PROXY_URL` is set, the playbook disables the OCI included repo
  during bootstrap because it is not needed for Docker installation and may not
  have public mirror metadata for the selected Oracle Linux version.
- The playbook disables Oracle's Ksplice repo during bootstrap because the
  regional Ksplice mirror can time out through the Bastion proxy path and is not
  needed for Docker installation.
- Package installation tasks explicitly enable only the repos they need so
  unrelated Oracle repos do not slow or block the bootstrap.
- Oracle Linux also supports Podman through `container-tools`, but that is not
  the current production runtime choice.
- Keep real inventory, SSH keys, and host-specific values under `.private/`.
- The steady-state production network path is private subnet plus Bastion, not
  private subnet plus NAT.
