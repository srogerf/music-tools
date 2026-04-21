#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BOOTSTRAP_DIR="$ROOT_DIR/deploy/infrastructure/oci/bootstrap"
TFVARS_FILE="${TFVARS_FILE:-terraform.tfvars.local}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/oci_state_bootstrap_plan.sh [--var-file FILE] [terraform plan args...]

Defaults:
  --var-file terraform.tfvars.local

Examples:
  bash bin/oci_state_bootstrap_plan.sh
  bash bin/oci_state_bootstrap_plan.sh --var-file terraform.tfvars.local
  bash bin/oci_state_bootstrap_plan.sh -out state-bootstrap.tfplan
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

if [[ ! -f "$BOOTSTRAP_DIR/$TFVARS_FILE" ]]; then
  echo "Missing tfvars file: $BOOTSTRAP_DIR/$TFVARS_FILE" >&2
  echo "Copy deploy/infrastructure/oci/bootstrap/terraform.tfvars.example to $TFVARS_FILE and fill in your real OCI values." >&2
  exit 1
fi

terraform -chdir="$BOOTSTRAP_DIR" init
terraform -chdir="$BOOTSTRAP_DIR" plan -var-file="$TFVARS_FILE" "${extra_args[@]}"
