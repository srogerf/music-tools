#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NAT_DIR="$ROOT_DIR/deploy/infrastructure/oci/bootstrap-nat"
TFVARS_FILE="${TFVARS_FILE:-$ROOT_DIR/.private/oci/bootstrap-nat.tfvars}"
STATE_FILE="${STATE_FILE:-$ROOT_DIR/.private/terraform/oci-bootstrap-nat.tfstate}"
PLAN_FILE="${PLAN_FILE:-$ROOT_DIR/.private/terraform/oci-bootstrap-nat.tfplan}"

# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/terraform_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/oci_bootstrap_nat_plan.sh [--var-file FILE] [--state-file FILE] [--plan-file FILE] [terraform plan args...]

Defaults:
  --var-file .private/oci/bootstrap-nat.tfvars
  --state-file .private/terraform/oci-bootstrap-nat.tfstate
  --plan-file .private/terraform/oci-bootstrap-nat.tfplan

Examples:
  bash bin/oci_bootstrap_nat_plan.sh
  bash bin/oci_bootstrap_nat_plan.sh --var-file .private/oci/bootstrap-nat.test.tfvars
EOF
}

extra_args=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --var-file)
      if [[ $# -lt 2 ]]; then
        echo "Missing value for --var-file" >&2
        usage
        exit 1
      fi
      TFVARS_FILE="$2"
      shift 2
      ;;
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
    -out|-out=*)
      echo "Use --plan-file instead of Terraform's -out option." >&2
      usage
      exit 1
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

TFVARS_PATH="$(resolve_repo_path "$ROOT_DIR" "$NAT_DIR" "$TFVARS_FILE")"
require_tfvars_file "$TFVARS_PATH" "Copy deploy/infrastructure/oci/bootstrap-nat/terraform.tfvars.example to .private/oci/bootstrap-nat.tfvars and fill in your real OCI values."

required_vars=(
  tenancy_ocid
  user_ocid
  fingerprint
  private_key_path
  region
  compartment_ocid
  vcn_id
  private_subnet_id
)

require_tfvars_values "$TFVARS_PATH" "${required_vars[@]}"
reject_placeholder_tfvars_values "$TFVARS_PATH" "Fill in real OCI values before planning." compartment_ocid vcn_id private_subnet_id

STATE_PATH="$(resolve_output_path "$ROOT_DIR" "$STATE_FILE")"
PLAN_PATH="$(resolve_output_path "$ROOT_DIR" "$PLAN_FILE")"

mkdir -p "$(dirname "$STATE_PATH")"
mkdir -p "$(dirname "$PLAN_PATH")"

terraform -chdir="$NAT_DIR" init
terraform -chdir="$NAT_DIR" plan -state="$STATE_PATH" -var-file="$TFVARS_PATH" -out="$PLAN_PATH" "${extra_args[@]}"
