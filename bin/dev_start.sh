#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${DEV_RUNTIME_ENV:-$ROOT_DIR/.private/env/dev/runtime.env}"

if [[ ! -f "$ENV_FILE" || ! -f "$ROOT_DIR/.private/env/dev/postgres.env" ]]; then
  bash "$ROOT_DIR/bin/localhost_init_envs.sh"
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

DEV_ADDR="${DEV_ADDR:-:8080}"
DEV_STATIC_DIR="${DEV_STATIC_DIR:-frontend/app}"
DEV_FRETBOARD_DIR="${DEV_FRETBOARD_DIR:-frontend/fretboard}"
DEV_POSTGRES_CONFIG="${DEV_POSTGRES_CONFIG:-.private/env/dev/postgres.env}"

if [[ ! -f "$ROOT_DIR/$DEV_POSTGRES_CONFIG" ]]; then
  echo "Missing dev Postgres config: $ROOT_DIR/$DEV_POSTGRES_CONFIG" >&2
  echo "Edit .private/env/dev/postgres.env with real local database values." >&2
  exit 1
fi

exec go run "$ROOT_DIR/server" \
  -addr "$DEV_ADDR" \
  -postgres-config "$ROOT_DIR/$DEV_POSTGRES_CONFIG" \
  -static-dir "$ROOT_DIR/$DEV_STATIC_DIR" \
  -fretboard-dir "$ROOT_DIR/$DEV_FRETBOARD_DIR"
