#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
definitions="${1:-$root/data/scales/DEFINITIONS.json}"
max_accidentals="${2:-5}"

go run "$root/tools/scales" -definitions "$definitions" -random -max-accidentals "$max_accidentals"
