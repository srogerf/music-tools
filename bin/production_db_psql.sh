#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/production_db_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_db_psql.sh [psql args...]

Open psql against the live production database through the Bastion SSH tunnel.
Any extra arguments are passed directly to psql.
EOF
  production_db_usage_common
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

production_db_load_context "$ROOT_DIR"
production_db_require_ssh_tunnel
production_db_load_remote_compose_env
trap production_db_cleanup_forward EXIT
production_db_open_forward

PGPASSWORD="$POSTGRES_PASSWORD" \
psql \
  -h "$DB_FORWARD_HOST" \
  -p "$DB_FORWARD_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  "$@"
