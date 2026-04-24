#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/localhost_docker_access_check.sh

Checks whether the current shell user can talk to the Docker daemon.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI is not installed or not on PATH." >&2
  echo "Run bash bin/localhost_bootstrap_env.sh or install Docker first." >&2
  exit 1
fi

if docker info >/dev/null 2>&1; then
  echo "Docker daemon access OK."
  exit 0
fi

echo "Cannot access the Docker daemon from the current shell." >&2
echo "Common fixes:" >&2
echo "  sudo systemctl enable --now docker" >&2
echo "  sudo usermod -aG docker \"$USER\"" >&2
echo "  log out and back in, or run: newgrp docker" >&2
echo "Then retry: docker ps" >&2
exit 1
