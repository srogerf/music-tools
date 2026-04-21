#!/usr/bin/env bash

if [ -z "${BASH_VERSION:-}" ]; then
  exec /usr/bin/env bash "$0" "$@"
fi

set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
addr="${1:-:8080}"
postgres_config="${2:-$root/.private/conf/postgres.env}"

go run "$root/server" \
  -addr "$addr" \
  -postgres-config "$postgres_config"
