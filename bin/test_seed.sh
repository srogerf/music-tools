#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
POSTGRES_CONFIG="${POSTGRES_CONFIG:-$ROOT_DIR/.private/env/test/postgres.env}"
export POSTGRES_CONFIG

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/test_seed.sh

Rebuilds and seeds the local test database using
.private/env/test/postgres.env by default.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ ! -f "$POSTGRES_CONFIG" ]]; then
  bash "$ROOT_DIR/bin/localhost_init_envs.sh"
fi

if [[ ! -f "$POSTGRES_CONFIG" ]]; then
  echo "Missing test Postgres config: $POSTGRES_CONFIG" >&2
  exit 1
fi

bash "$ROOT_DIR/db/postgres/rebuild_schema.sh" --env test
bash "$ROOT_DIR/db/postgres/reset_and_seed.sh" --env test
