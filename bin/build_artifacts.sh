#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/bin/build_frontend.sh"
bash "$ROOT_DIR/bin/build_server.sh"

echo "Test artifacts are ready under $ROOT_DIR/build/test"
