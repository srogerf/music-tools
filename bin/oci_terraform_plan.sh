#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OCI_DIR="$ROOT_DIR/deploy/infrastructure/oci/app"
TFVARS_FILE="${TFVARS_FILE:-terraform.tfvars.local}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/oci_terraform_plan.sh [--var-file FILE] [terraform plan args...]

Defaults:
  --var-file terraform.tfvars.local

Examples:
  bash bin/oci_terraform_plan.sh
  bash bin/oci_terraform_plan.sh --var-file terraform.tfvars.staging
  bash bin/oci_terraform_plan.sh -out oci.tfplan
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

if [[ ! -f "$OCI_DIR/$TFVARS_FILE" ]]; then
  echo "Missing tfvars file: $OCI_DIR/$TFVARS_FILE" >&2
  echo "Copy deploy/infrastructure/oci/app/terraform.tfvars.example to $TFVARS_FILE and fill in your real OCI values." >&2
  exit 1
fi

terraform -chdir="$OCI_DIR" init
terraform -chdir="$OCI_DIR" plan -var-file="$TFVARS_FILE" "${extra_args[@]}"
