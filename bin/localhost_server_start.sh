#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
addr="${1:-:8080}"
postgres_config="${2:-$root/.private/conf/postgres.env}"
static_dir="${3:-$root/frontend/app}"
fretboard_dir="${4:-$root/frontend/fretboard}"

go run "$root/server" \
  -addr "$addr" \
  -postgres-config "$postgres_config" \
  -static-dir "$static_dir" \
  -fretboard-dir "$fretboard_dir"
