#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INVENTORY_FILE="${INVENTORY_FILE:-$ROOT_DIR/.private/ansible/hosts.yml}"
BOOTSTRAP_PROXY_URL="${BOOTSTRAP_PROXY_URL:-http://127.0.0.1:3128}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/oci_configure_docker_proxy.sh [--inventory FILE] [--proxy-url URL]

Defaults:
  --inventory .private/ansible/hosts.yml
  --proxy-url http://127.0.0.1:3128

Run this after the Bastion SSH tunnel and reverse proxy tunnel are already up.
It writes the Docker daemon proxy config used for GHCR pulls on the OCI host.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --inventory)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --inventory" >&2
        usage
        exit 1
      fi
      INVENTORY_FILE="$2"
      shift 2
      ;;
    --proxy-url)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --proxy-url" >&2
        usage
        exit 1
      fi
      BOOTSTRAP_PROXY_URL="$2"
      shift 2
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

if [[ "$INVENTORY_FILE" != /* ]]; then
  INVENTORY_FILE="$ROOT_DIR/$INVENTORY_FILE"
fi

if [[ ! -f "$INVENTORY_FILE" ]]; then
  echo "Missing Ansible inventory: $INVENTORY_FILE" >&2
  echo "Copy deploy/cicd/ansible/inventory/hosts.example.yml to .private/ansible/hosts.yml first." >&2
  exit 1
fi

BOOTSTRAP_PROXY_URL="$BOOTSTRAP_PROXY_URL" \
ANSIBLE_CONFIG="$ROOT_DIR/deploy/cicd/ansible/ansible.cfg" \
ansible-playbook \
  -i "$INVENTORY_FILE" \
  "$ROOT_DIR/deploy/cicd/ansible/playbooks/configure_docker_proxy.yml"
