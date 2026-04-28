#!/usr/bin/env bash

repo_root_from_script() {
  local script_path="$1"
  cd "$(dirname "$script_path")/.." && pwd
}

env_file_value() {
  local env_file="$1"
  local key="$2"

  grep -E "^[[:space:]]*${key}[[:space:]]*=" "$env_file" | tail -n 1 | cut -d= -f2- || true
}

resolve_path_from_dir() {
  local base_dir="$1"
  local path_value="$2"

  if [[ "$path_value" == /* ]]; then
    printf '%s\n' "$path_value"
  else
    realpath -m "$base_dir/$path_value"
  fi
}

env_file_path_value() {
  local env_file="$1"
  local key="$2"
  local default_value="$3"
  local base_dir="$4"
  local value

  value="$(env_file_value "$env_file" "$key")"
  if [[ -z "$value" ]]; then
    value="$default_value"
  fi
  resolve_path_from_dir "$base_dir" "$value"
}
