#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

copy_if_missing() {
  local source_file="$1"
  local target_file="$2"

  mkdir -p "$(dirname "$target_file")"
  if [[ ! -f "$target_file" ]]; then
    cp "$source_file" "$target_file"
    echo "Created $target_file from $source_file"
  fi
}

copy_if_missing "$ROOT_DIR/env/dev/postgres.env.example" "$ROOT_DIR/.private/env/dev/postgres.env"
copy_if_missing "$ROOT_DIR/env/dev/runtime.env.example" "$ROOT_DIR/.private/env/dev/runtime.env"
copy_if_missing "$ROOT_DIR/env/test/postgres.env.example" "$ROOT_DIR/.private/env/test/postgres.env"
copy_if_missing "$ROOT_DIR/env/test/runtime.env.example" "$ROOT_DIR/.private/env/test/runtime.env"
