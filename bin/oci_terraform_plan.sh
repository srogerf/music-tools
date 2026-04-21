#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OCI_DIR="$ROOT_DIR/deploy/infrastructure/oci/app"
TFVARS_FILE="${TFVARS_FILE:-$ROOT_DIR/.private/oci/app.tfvars}"
PLAN_FILE="${PLAN_FILE:-$ROOT_DIR/.private/terraform/oci-app.tfplan}"

# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/terraform_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/oci_terraform_plan.sh [--var-file FILE] [--plan-file FILE] [terraform plan args...]

Defaults:
  --var-file .private/oci/app.tfvars
  --plan-file .private/terraform/oci-app.tfplan

Examples:
  bash bin/oci_terraform_plan.sh
  bash bin/oci_terraform_plan.sh --var-file .private/oci/app.test.tfvars
  bash bin/oci_terraform_plan.sh --plan-file .private/terraform/oci-app.test.tfplan
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

TFVARS_PATH="$(resolve_repo_path "$ROOT_DIR" "$OCI_DIR" "$TFVARS_FILE")"
require_tfvars_file "$TFVARS_PATH" "Copy deploy/infrastructure/oci/app/terraform.tfvars.example to .private/oci/app.tfvars and fill in your real OCI values."

required_vars=(
  tenancy_ocid
  user_ocid
  fingerprint
  private_key_path
  region
  ssh_public_key
  instance_image_ocid
)

require_tfvars_values "$TFVARS_PATH" "${required_vars[@]}"
reject_placeholder_tfvars_values "$TFVARS_PATH" "Fill in a real value before planning." ssh_public_key instance_image_ocid

PLAN_PATH="$(resolve_output_path "$ROOT_DIR" "$PLAN_FILE")"

mkdir -p "$(dirname "$PLAN_PATH")"

terraform -chdir="$OCI_DIR" init
terraform -chdir="$OCI_DIR" plan -var-file="$TFVARS_PATH" -out="$PLAN_PATH" "${extra_args[@]}"
