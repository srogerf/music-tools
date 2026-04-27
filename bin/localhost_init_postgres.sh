#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${1:-}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/localhost_init_postgres.sh [postgres env file]

Ensures a local Postgres role and database exist for the values provided in the
selected env file, such as:
  .private/env/dev/postgres.env
  .private/env/test/postgres.env
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ -n "$CONFIG_FILE" ]]; then
  if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Missing Postgres env file: $CONFIG_FILE" >&2
    exit 1
  fi
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
  set +a
fi

POSTGRES_CLUSTER_PORT="${POSTGRES_CLUSTER_PORT:-5435}"
APP_DATABASE="${APP_DATABASE:-music_tools}"
APP_DATABASE_OWNER="${APP_DATABASE_OWNER:-riffer}"

POSTGRES_CLUSTER_PORT="${PGPORT:-$POSTGRES_CLUSTER_PORT}"
APP_DATABASE="${PGDATABASE:-$APP_DATABASE}"
APP_DATABASE_OWNER="${PGUSER:-$APP_DATABASE_OWNER}"
APP_DATABASE_OWNER_PASSWORD="${PGPASSWORD:-${APP_DATABASE_OWNER_PASSWORD:-}}"

for identifier in "$APP_DATABASE" "$APP_DATABASE_OWNER"; do
  if [[ ! "$identifier" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
    echo "Database names and role names must contain only letters, numbers, and underscores, and cannot start with a number." >&2
    exit 1
  fi
done

if [[ -z "${APP_DATABASE_OWNER_PASSWORD:-}" ]]; then
  echo "Set APP_DATABASE_OWNER_PASSWORD before running this script." >&2
  exit 1
fi

if ! sudo -u postgres psql -p "$POSTGRES_CLUSTER_PORT" -tAc "SELECT 1 FROM pg_roles WHERE rolname = '$APP_DATABASE_OWNER'" | grep -q 1; then
  sudo -u postgres psql \
    -p "$POSTGRES_CLUSTER_PORT" \
    -v app_database_owner="$APP_DATABASE_OWNER" \
    -v app_database_owner_password="$APP_DATABASE_OWNER_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'app_database_owner', :'app_database_owner_password') \gexec
SQL
else
  sudo -u postgres psql \
    -p "$POSTGRES_CLUSTER_PORT" \
    -v app_database_owner="$APP_DATABASE_OWNER" \
    -v app_database_owner_password="$APP_DATABASE_OWNER_PASSWORD" <<'SQL'
SELECT format('ALTER ROLE %I WITH PASSWORD %L', :'app_database_owner', :'app_database_owner_password') \gexec
SQL
fi

if ! sudo -u postgres psql -p "$POSTGRES_CLUSTER_PORT" -tAc "SELECT 1 FROM pg_database WHERE datname = '$APP_DATABASE'" | grep -q 1; then
  sudo -u postgres createdb -p "$POSTGRES_CLUSTER_PORT" -O "$APP_DATABASE_OWNER" "$APP_DATABASE"
fi

sudo -u postgres psql -p "$POSTGRES_CLUSTER_PORT" -d postgres <<SQL
GRANT ALL PRIVILEGES ON DATABASE "$APP_DATABASE" TO "$APP_DATABASE_OWNER";
SQL

echo "Postgres role/database ensured for cluster 16/main on port $POSTGRES_CLUSTER_PORT."
