#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${TEST_RUNTIME_ENV:-$ROOT_DIR/.private/env/test/runtime.env}"

if [[ ! -f "$ENV_FILE" || ! -f "$ROOT_DIR/.private/env/test/postgres.env" ]]; then
  bash "$ROOT_DIR/bin/init_local_envs.sh"
fi

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

TEST_ADDR="${TEST_ADDR:-:8081}"
TEST_STATIC_DIR="${TEST_STATIC_DIR:-build/test/frontend/app}"
TEST_FRETBOARD_DIR="${TEST_FRETBOARD_DIR:-}"
TEST_SERVER_BINARY="${TEST_SERVER_BINARY:-build/test/server/rifferone}"
TEST_POSTGRES_CONFIG="${TEST_POSTGRES_CONFIG:-.private/env/test/postgres.env}"

if [[ ! -x "$ROOT_DIR/$TEST_SERVER_BINARY" ]]; then
  echo "Missing test server artifact: $ROOT_DIR/$TEST_SERVER_BINARY" >&2
  echo "Run bash bin/build_artifacts.sh first." >&2
  exit 1
fi

if [[ ! -d "$ROOT_DIR/$TEST_STATIC_DIR" ]]; then
  echo "Missing test frontend artifact: $ROOT_DIR/$TEST_STATIC_DIR" >&2
  echo "Run bash bin/build_artifacts.sh first." >&2
  exit 1
fi

if [[ ! -f "$ROOT_DIR/$TEST_POSTGRES_CONFIG" ]]; then
  echo "Missing test Postgres config: $ROOT_DIR/$TEST_POSTGRES_CONFIG" >&2
  echo "Edit .private/env/test/postgres.env with real local database values." >&2
  exit 1
fi

server_args=(
  -addr "$TEST_ADDR"
  -postgres-config "$ROOT_DIR/$TEST_POSTGRES_CONFIG"
  -static-dir "$ROOT_DIR/$TEST_STATIC_DIR"
)

if [[ -n "$TEST_FRETBOARD_DIR" ]]; then
  server_args+=(-fretboard-dir "$ROOT_DIR/$TEST_FRETBOARD_DIR")
else
  server_args+=(-fretboard-dir "")
fi

exec "$ROOT_DIR/$TEST_SERVER_BINARY" "${server_args[@]}"
