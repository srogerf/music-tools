#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_MODE="production"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/build_frontend.sh [--debug]

Builds the frontend artifact with Vite.

Options:
  --debug   Build a readable debug artifact with sourcemaps and without minification.
  --help    Show this help.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --debug)
      BUILD_MODE="debug"
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

if [[ -n "${BUILD_FRONTEND_DIR:-}" ]]; then
  BUILD_FRONTEND_DIR="$(realpath -m "$BUILD_FRONTEND_DIR")"
elif [[ "$BUILD_MODE" == "debug" ]]; then
  BUILD_FRONTEND_DIR="$ROOT_DIR/build/test/frontend-debug"
else
  BUILD_FRONTEND_DIR="$ROOT_DIR/build/test/frontend"
fi

if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "Missing frontend dependencies. Run npm install before building frontend artifacts." >&2
  exit 1
fi

rm -rf "$BUILD_FRONTEND_DIR"
mkdir -p "$BUILD_FRONTEND_DIR"

if [[ "$BUILD_MODE" == "debug" ]]; then
  npm run build:frontend -- --mode debug --outDir "$BUILD_FRONTEND_DIR/app"
  echo "Frontend debug artifact built at $BUILD_FRONTEND_DIR/app"
else
  npm run build:frontend -- --mode production --outDir "$BUILD_FRONTEND_DIR/app"
  echo "Frontend production artifact built at $BUILD_FRONTEND_DIR/app"
fi
