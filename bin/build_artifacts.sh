#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/build_artifacts.sh

Builds the pre-container test artifacts:
  - frontend bundle under build/test/frontend/
  - server binary under build/test/server/
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

bash "$ROOT_DIR/bin/build_frontend.sh"
bash "$ROOT_DIR/bin/build_server.sh"

echo "Test artifacts are ready under $ROOT_DIR/build/test"
