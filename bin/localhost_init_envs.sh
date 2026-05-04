#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/localhost_init_envs.sh

Copies missing example env files into .private/env/dev/ and .private/env/test/
for local development and test usage.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

copy_if_missing() {
  local source_file="$1"
  local target_file="$2"

  mkdir -p "$(dirname "$target_file")"
  if [[ ! -f "$target_file" ]]; then
    cp "$source_file" "$target_file"
    echo "Created $target_file from $source_file"
  fi
}

append_if_missing() {
  local target_file="$1"
  local key="$2"
  local value="$3"

  if ! grep -Eq "^[[:space:]]*${key}[[:space:]]*=" "$target_file"; then
    printf '%s=%s\n' "$key" "$value" >>"$target_file"
    echo "Added $key to $target_file"
  fi
}

copy_if_missing "$ROOT_DIR/env/dev/postgres.env.example" "$ROOT_DIR/.private/env/dev/postgres.env"
copy_if_missing "$ROOT_DIR/env/dev/runtime.env.example" "$ROOT_DIR/.private/env/dev/runtime.env"
copy_if_missing "$ROOT_DIR/env/test/postgres.env.example" "$ROOT_DIR/.private/env/test/postgres.env"
copy_if_missing "$ROOT_DIR/env/test/runtime.env.example" "$ROOT_DIR/.private/env/test/runtime.env"

append_if_missing "$ROOT_DIR/.private/env/dev/runtime.env" "DEV_ENVIRONMENT_LABEL" "Dev"
append_if_missing "$ROOT_DIR/.private/env/test/runtime.env" "TEST_ENVIRONMENT_LABEL" "Test"
