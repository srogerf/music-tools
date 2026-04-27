#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_SERVER_DIR="${BUILD_SERVER_DIR:-$ROOT_DIR/build/test/server}"
SERVER_BINARY="${SERVER_BINARY:-$BUILD_SERVER_DIR/rifferone}"
GOCACHE="${GOCACHE:-$ROOT_DIR/build/cache/go-build}"
export GOCACHE

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/build_server.sh

Builds the Go server artifact used by the test and production image flows.

Environment overrides:
  BUILD_SERVER_DIR  Output directory for the server artifact.
  SERVER_BINARY     Full output path for the built binary.
  CGO_ENABLED       Passed through to go build. Defaults to 0.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

mkdir -p "$BUILD_SERVER_DIR"
mkdir -p "$GOCACHE"

CGO_ENABLED="${CGO_ENABLED:-0}" go build -o "$SERVER_BINARY" "$ROOT_DIR/server"

echo "Server artifact built at $SERVER_BINARY"
