#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NAT_DIR="$ROOT_DIR/deploy/infrastructure/oci/bootstrap-nat"
STATE_FILE="${STATE_FILE:-$ROOT_DIR/.private/terraform/oci-bootstrap-nat.tfstate}"
PLAN_FILE="${PLAN_FILE:-$ROOT_DIR/.private/terraform/oci-bootstrap-nat-destroy.tfplan}"

# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/terraform_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/oci_bootstrap_nat_destroy_apply.sh [--state-file FILE] [--plan-file FILE] [terraform apply args...]

Defaults:
  --state-file .private/terraform/oci-bootstrap-nat.tfstate
  --plan-file .private/terraform/oci-bootstrap-nat-destroy.tfplan
EOF
}

extra_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --state-file)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --state-file" >&2
        usage
        exit 1
      fi
      STATE_FILE="$2"
      shift 2
      ;;
    --plan-file)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --plan-file" >&2
        usage
        exit 1
      fi
      PLAN_FILE="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      extra_args+=("$1")
      shift
      ;;
  esac
done

STATE_PATH="$(resolve_output_path "$ROOT_DIR" "$STATE_FILE")"
PLAN_PATH="$(resolve_output_path "$ROOT_DIR" "$PLAN_FILE")"

if [[ ! -f "$STATE_PATH" ]]; then
  echo "Missing Terraform state: $STATE_PATH" >&2
  echo "There is no local bootstrap NAT state to destroy." >&2
  exit 1
fi

if [[ ! -f "$PLAN_PATH" ]]; then
  echo "Missing saved Terraform destroy plan: $PLAN_PATH" >&2
  echo "Run bash bin/oci_bootstrap_nat_destroy_plan.sh before applying." >&2
  exit 1
fi

terraform -chdir="$NAT_DIR" init
terraform -chdir="$NAT_DIR" apply -state="$STATE_PATH" "${extra_args[@]}" "$PLAN_PATH"
