#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
scale="${1:-Major}"
key="${2:-C}"

go run "$root/tools/harmonize_scale" -scale "$scale" -key "$key"
