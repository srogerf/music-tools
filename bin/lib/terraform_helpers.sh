#!/usr/bin/env bash

resolve_repo_path() {
  local root_dir="$1"
  local fallback_dir="$2"
  local path_value="$3"

  if [[ "$path_value" == /* ]]; then
    printf '%s\n' "$path_value"
  elif [[ -f "$root_dir/$path_value" ]]; then
    printf '%s\n' "$root_dir/$path_value"
  else
    printf '%s\n' "$fallback_dir/$path_value"
  fi
}

resolve_output_path() {
  local root_dir="$1"
  local path_value="$2"

  if [[ "$path_value" == /* ]]; then
    printf '%s\n' "$path_value"
  else
    printf '%s\n' "$root_dir/$path_value"
  fi
}

require_tfvars_file() {
  local tfvars_path="$1"
  local copy_hint="$2"

  if [[ ! -f "$tfvars_path" ]]; then
    echo "Missing tfvars file: $tfvars_path" >&2
    echo "$copy_hint" >&2
    exit 1
  fi
}

require_tfvars_values() {
  local tfvars_path="$1"
  shift

  local required_var
  for required_var in "$@"; do
    if ! grep -Eq "^[[:space:]]*${required_var}[[:space:]]*=" "$tfvars_path"; then
      echo "Missing required tfvars value: $required_var in $tfvars_path" >&2
      echo "Terraform prompts missing variables interactively, which can accidentally put values like 'yes' into the wrong field." >&2
      exit 1
    fi
  done
}

reject_placeholder_tfvars_values() {
  local tfvars_path="$1"
  local message="$2"
  shift 2

  local required_var
  local value
  for required_var in "$@"; do
    value="$(grep -E "^[[:space:]]*${required_var}[[:space:]]*=" "$tfvars_path" | tail -n 1 | cut -d= -f2-)"
    if [[ "$value" =~ \.\.\. || "${value,,}" =~ example || "${value,,}" =~ replace ]]; then
      echo "The tfvars value for $required_var appears to be a placeholder." >&2
      echo "$message" >&2
      exit 1
    fi
  done
}
