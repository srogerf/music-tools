#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_SERVER_DIR="${BUILD_SERVER_DIR:-$ROOT_DIR/build/test/server}"
SERVER_BINARY="${SERVER_BINARY:-$BUILD_SERVER_DIR/rifferone}"
GOCACHE="${GOCACHE:-$ROOT_DIR/build/cache/go-build}"
export GOCACHE

mkdir -p "$BUILD_SERVER_DIR"
mkdir -p "$GOCACHE"

CGO_ENABLED="${CGO_ENABLED:-0}" go build -o "$SERVER_BINARY" "$ROOT_DIR/server"

echo "Server artifact built at $SERVER_BINARY"
