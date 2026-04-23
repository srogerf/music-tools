#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_FRONTEND_DIR="${BUILD_FRONTEND_DIR:-$ROOT_DIR/build/test/frontend}"

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "Missing frontend dependencies. Run npm install before building frontend artifacts." >&2
  exit 1
fi

rm -rf "$BUILD_FRONTEND_DIR"
mkdir -p "$BUILD_FRONTEND_DIR"

npm run build:frontend -- --outDir "$BUILD_FRONTEND_DIR/app"

echo "Frontend production artifact built at $BUILD_FRONTEND_DIR/app"
