#!/usr/bin/env bash

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/localhost_server_start.sh [addr] [postgres config] [static dir] [fretboard dir]

Starts the Go server directly from source with optional explicit runtime paths.
This is a low-level local helper; dev_start.sh is the normal source-dev entrypoint.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

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
