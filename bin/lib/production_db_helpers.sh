#!/usr/bin/env bash

production_db_usage_common() {
  cat >&2 <<'EOF'
Common defaults:
  production env file: .private/deploy/production.env
  Bastion SSH tunnel:   localhost:2222
  temp DB forward:      localhost:55432 -> OCI host 127.0.0.1:5432

These wrappers expect the Bastion SSH tunnel to already be up, for example:
  bash bin/oci_bastion_ssh.sh --new-session --no-ssh
EOF
}

production_db_load_context() {
  local root_dir="$1"
  PRODUCTION_ENV_FILE="${PRODUCTION_ENV_FILE:-$root_dir/.private/deploy/production.env}"

  if [[ ! -f "$PRODUCTION_ENV_FILE" ]]; then
    echo "Missing production env file: $PRODUCTION_ENV_FILE" >&2
    exit 1
  fi

  # shellcheck disable=SC1090
  source "$PRODUCTION_ENV_FILE"

  BASTION_ENV_FILE="${BASTION_ENV_FILE:-$root_dir/.private/bastion/music-tools.env}"
  REMOTE_USER="${REMOTE_USER:-opc}"
  REMOTE_COMPOSE_ENV_FILE="${REMOTE_COMPOSE_ENV_FILE:-/srv/rifferone/app/compose.env}"

  if [[ ! -f "$BASTION_ENV_FILE" ]]; then
    echo "Missing Bastion env file: $BASTION_ENV_FILE" >&2
    exit 1
  fi

  # shellcheck disable=SC1090
  source "$BASTION_ENV_FILE"

  INSTANCE_SSH_KEY="${INSTANCE_SSH_KEY:-${SSH_KEY:-}}"
  LOCAL_PORT="${LOCAL_PORT:-2222}"
  DB_FORWARD_HOST="${DB_FORWARD_HOST:-127.0.0.1}"
  DB_FORWARD_PORT="${DB_FORWARD_PORT:-55432}"
  REMOTE_DB_HOST="${REMOTE_DB_HOST:-127.0.0.1}"
  REMOTE_DB_PORT="${REMOTE_DB_PORT:-5432}"

  if [[ -z "$INSTANCE_SSH_KEY" || ! -f "$INSTANCE_SSH_KEY" ]]; then
    echo "Missing instance SSH private key: ${INSTANCE_SSH_KEY:-unset}" >&2
    exit 1
  fi
}

production_db_ssh() {
  ssh -i "$INSTANCE_SSH_KEY" \
    -p "$LOCAL_PORT" \
    -o BatchMode=yes \
    -o ConnectTimeout=5 \
    -o StrictHostKeyChecking=accept-new \
    "$REMOTE_USER@localhost" "$@"
}

production_db_require_ssh_tunnel() {
  if ! production_db_ssh true >/dev/null 2>&1; then
    echo "Bastion SSH tunnel is not ready on localhost:$LOCAL_PORT." >&2
    echo "Start it first with: bash bin/oci_bastion_ssh.sh --new-session --no-ssh" >&2
    exit 1
  fi
}

production_db_load_remote_compose_env() {
  local remote_env

  remote_env="$(
    production_db_ssh \
      "grep -E '^(POSTGRES_DB|POSTGRES_USER|POSTGRES_PASSWORD)=' '$REMOTE_COMPOSE_ENV_FILE'"
  )"

  if [[ -z "$remote_env" ]]; then
    echo "Could not read POSTGRES_* values from $REMOTE_COMPOSE_ENV_FILE on the OCI host." >&2
    exit 1
  fi

  local tmp_env
  tmp_env="$(mktemp)"
  printf '%s\n' "$remote_env" >"$tmp_env"
  # shellcheck disable=SC1090
  source "$tmp_env"
  rm -f "$tmp_env"

  if [[ -z "${POSTGRES_DB:-}" || -z "${POSTGRES_USER:-}" || -z "${POSTGRES_PASSWORD:-}" ]]; then
    echo "Remote compose env did not contain all required POSTGRES_* values." >&2
    exit 1
  fi
}

production_db_open_forward() {
  ssh -i "$INSTANCE_SSH_KEY" \
    -p "$LOCAL_PORT" \
    -N \
    -o ExitOnForwardFailure=yes \
    -o StrictHostKeyChecking=accept-new \
    -L "${DB_FORWARD_HOST}:${DB_FORWARD_PORT}:${REMOTE_DB_HOST}:${REMOTE_DB_PORT}" \
    "$REMOTE_USER@localhost" &
  DB_FORWARD_PID="$!"

  for _ in {1..20}; do
    if timeout 1 bash -c "</dev/tcp/$DB_FORWARD_HOST/$DB_FORWARD_PORT" >/dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "$DB_FORWARD_PID" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  echo "Database port forward did not become ready on $DB_FORWARD_HOST:$DB_FORWARD_PORT." >&2
  exit 1
}

production_db_cleanup_forward() {
  if [[ -n "${DB_FORWARD_PID:-}" ]] && kill -0 "$DB_FORWARD_PID" >/dev/null 2>&1; then
    kill "$DB_FORWARD_PID" >/dev/null 2>&1 || true
  fi
}

production_db_print_target() {
  cat >&2 <<EOF
Production DB target:
  host:     $DB_FORWARD_HOST
  port:     $DB_FORWARD_PORT
  database: $POSTGRES_DB
  user:     $POSTGRES_USER
EOF
}
