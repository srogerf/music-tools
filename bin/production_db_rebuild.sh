#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/production_db_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_db_rebuild.sh

Rebuild the live production schema through the Bastion SSH tunnel using the
deployed OCI host compose env as the source of truth for DB credentials.
EOF
  production_db_usage_common
}

case "${1:-}" in
  --help|-h)
    usage
    exit 0
    ;;
  "")
    ;;
  *)
    echo "Unknown argument: $1" >&2
    usage
    exit 1
    ;;
esac

production_db_load_context "$ROOT_DIR"
production_db_require_ssh_tunnel
production_db_load_remote_compose_env
trap production_db_cleanup_forward EXIT
production_db_open_forward

env -u DATABASE_URL \
  POSTGRES_CONFIG=/dev/null \
  PGHOST="$DB_FORWARD_HOST" \
  PGPORT="$DB_FORWARD_PORT" \
  PGDATABASE="$POSTGRES_DB" \
  PGUSER="$POSTGRES_USER" \
  PGPASSWORD="$POSTGRES_PASSWORD" \
  bash "$ROOT_DIR/db/postgres/rebuild_schema.sh" --override-production-failsafe
