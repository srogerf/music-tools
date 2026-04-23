#!/usr/bin/env bash
set -euo pipefail

INSTALL_DOCKER="true"
INSTALL_TERRAFORM="true"
INSTALL_OCI_CLI="true"
ENABLE_SERVICES="true"
ASSUME_YES="false"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/localhost_bootstrap_env.sh [options]

Bootstraps an Ubuntu/Debian workstation for local music-tools development and
deployment operations.

Options:
  --yes                 Pass -y to apt install commands.
  --no-docker           Skip Docker Engine and Compose plugin setup.
  --no-terraform        Skip HashiCorp Terraform setup.
  --no-oci-cli          Skip OCI CLI setup through pipx.
  --no-enable-services  Install packages but do not enable local services.
  --help                Show this help.

Installs/checks:
  git, curl, jq, unzip, build tools
  Go, Node.js/npm
  PostgreSQL client/server
  Ansible
  tinyproxy for Bastion proxy tunneling
  Docker Engine and Docker Compose plugin
  Terraform
  OCI CLI
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y)
      ASSUME_YES="true"
      shift
      ;;
    --no-docker)
      INSTALL_DOCKER="false"
      shift
      ;;
    --no-terraform)
      INSTALL_TERRAFORM="false"
      shift
      ;;
    --no-oci-cli)
      INSTALL_OCI_CLI="false"
      shift
      ;;
    --no-enable-services)
      ENABLE_SERVICES="false"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -r /etc/os-release ]]; then
  echo "Cannot detect OS. This bootstrap script currently supports Ubuntu/Debian." >&2
  exit 1
fi

# shellcheck disable=SC1091
source /etc/os-release

if [[ "${ID:-}" != "ubuntu" && "${ID:-}" != "debian" && "${ID_LIKE:-}" != *"debian"* ]]; then
  echo "Unsupported OS: ${PRETTY_NAME:-unknown}." >&2
  echo "This script currently supports Ubuntu/Debian-style apt hosts." >&2
  exit 1
fi

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required to install system packages." >&2
  exit 1
fi

APT_YES=()
if [[ "$ASSUME_YES" == "true" ]]; then
  APT_YES=(-y)
fi

apt_install() {
  sudo apt-get install "${APT_YES[@]}" "$@"
}

ensure_apt_keyring_dir() {
  sudo install -m 0755 -d /etc/apt/keyrings
}

add_docker_repo() {
  if [[ -f /etc/apt/sources.list.d/docker.list ]]; then
    return
  fi

  ensure_apt_keyring_dir
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" \
    | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  local codename="${VERSION_CODENAME:-}"
  if [[ -z "$codename" ]]; then
    codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  fi

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${ID} ${codename} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
}

add_hashicorp_repo() {
  if [[ -f /etc/apt/sources.list.d/hashicorp.list ]]; then
    return
  fi

  ensure_apt_keyring_dir
  curl -fsSL https://apt.releases.hashicorp.com/gpg \
    | sudo gpg --dearmor -o /etc/apt/keyrings/hashicorp-archive-keyring.gpg

  local codename="${VERSION_CODENAME:-}"
  if [[ -z "$codename" ]]; then
    codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  fi

  echo "deb [signed-by=/etc/apt/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com ${codename} main" \
    | sudo tee /etc/apt/sources.list.d/hashicorp.list >/dev/null
}

echo "Updating apt package indexes..."
sudo apt-get update

echo "Installing base development packages..."
apt_install \
  ansible \
  build-essential \
  ca-certificates \
  curl \
  git \
  gnupg \
  golang-go \
  jq \
  nodejs \
  npm \
  openssh-client \
  postgresql \
  postgresql-client \
  python3-pip \
  pipx \
  tinyproxy \
  unzip

if [[ "$INSTALL_DOCKER" == "true" ]]; then
  echo "Installing Docker Engine and Compose plugin from Docker's apt repository..."
  add_docker_repo
  sudo apt-get update
  apt_install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  if [[ "$ENABLE_SERVICES" == "true" ]]; then
    sudo systemctl enable --now docker
  fi

  if getent group docker >/dev/null 2>&1; then
    sudo usermod -aG docker "$USER"
  fi
fi

if [[ "$INSTALL_TERRAFORM" == "true" ]]; then
  echo "Installing Terraform from HashiCorp's apt repository..."
  add_hashicorp_repo
  sudo apt-get update
  apt_install terraform
fi

if [[ "$INSTALL_OCI_CLI" == "true" ]]; then
  echo "Installing OCI CLI with pipx..."
  pipx ensurepath
  if pipx list 2>/dev/null | grep -q '^package oci-cli '; then
    pipx upgrade oci-cli
  else
    pipx install oci-cli
  fi
fi

if [[ "$ENABLE_SERVICES" == "true" ]]; then
  echo "Enabling local services used by this project..."
  sudo systemctl enable --now postgresql
  sudo systemctl enable --now tinyproxy
fi

echo
echo "Bootstrap complete."
echo "You may need to log out and back in before Docker group membership applies."
echo "Recommended next project commands:"
echo "  bash bin/localhost_init_envs.sh"
echo "  bash bin/localhost_init_postgres.sh .private/env/dev/postgres.env"
echo "  bash bin/dev_seed.sh"
echo "  bash bin/dev_start.sh"
