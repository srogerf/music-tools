#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PRODUCTION_ENV_FILE:-$ROOT_DIR/.private/deploy/production.env}"
DOMAIN="${CERTIFICATE_DOMAIN:-www.riffexchange.com}"
REMOTE_CERTS_PATH="${REMOTE_CERTS_PATH:-/srv/rifferone/certs}"
LOCAL_CERT_DIR="${LOCAL_CERT_DIR:-}"
ALLOW_STAGING_CERT="${ALLOW_STAGING_CERT:-false}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_certificate_deploy.sh [--domain DOMAIN] [--cert-dir DIR]

Copies issued lego certificate material to the production host over the
existing Bastion SSH tunnel.

Expected local files:
  <cert-dir>/<domain>.crt
  <cert-dir>/<domain>.issuer.crt
  <cert-dir>/<domain>.key

Remote output:
  /srv/rifferone/certs/fullchain.pem
  /srv/rifferone/certs/privkey.pem

This expects the Bastion SSH tunnel to already be available on localhost:2222.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      DOMAIN="${2:-}"
      shift 2
      ;;
    --cert-dir)
      LOCAL_CERT_DIR="${2:-}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$DOMAIN" ]]; then
  echo "Certificate domain cannot be empty." >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production env file: $ENV_FILE" >&2
  echo "Copy deploy/cicd/production.env.example to .private/deploy/production.env and fill it in." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

BASTION_ENV_FILE="${BASTION_ENV_FILE:-$ROOT_DIR/.private/bastion/music-tools.env}"
REMOTE_USER="${REMOTE_USER:-opc}"
REMOTE_STAGE_DIR="${REMOTE_STAGE_DIR:-/home/${REMOTE_USER}/tmp/rifferone-certs}"

if [[ ! -f "$BASTION_ENV_FILE" ]]; then
  echo "Missing Bastion env file: $BASTION_ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$BASTION_ENV_FILE"

INSTANCE_SSH_KEY="${INSTANCE_SSH_KEY:-${SSH_KEY:-}}"
LOCAL_PORT="${LOCAL_PORT:-2222}"

if [[ -z "$INSTANCE_SSH_KEY" ]]; then
  echo "Set INSTANCE_SSH_KEY or SSH_KEY in $BASTION_ENV_FILE." >&2
  exit 1
fi

if [[ -z "$LOCAL_CERT_DIR" ]]; then
  candidate_dirs=(
    "$ROOT_DIR/.private/certificates/lego/certificates"
    "$HOME/snap/lego/common/.lego/certificates"
  )

  for candidate_dir in "${candidate_dirs[@]}"; do
    candidate_cert="$candidate_dir/$DOMAIN.crt"
    if [[ -f "$candidate_cert" ]] && ! openssl x509 -in "$candidate_cert" -noout -issuer 2>/dev/null | grep -q '(STAGING)'; then
      LOCAL_CERT_DIR="$candidate_dir"
      break
    fi
  done

  if [[ -z "$LOCAL_CERT_DIR" ]]; then
    for candidate_dir in "${candidate_dirs[@]}"; do
      if [[ -f "$candidate_dir/$DOMAIN.crt" ]]; then
        LOCAL_CERT_DIR="$candidate_dir"
        break
      fi
    done
  fi
fi

if [[ -z "$LOCAL_CERT_DIR" ]]; then
  echo "Could not find a lego certificates directory." >&2
  echo "Pass --cert-dir DIR or set LOCAL_CERT_DIR." >&2
  exit 1
fi

CERT_FILE="$LOCAL_CERT_DIR/$DOMAIN.crt"
ISSUER_FILE="$LOCAL_CERT_DIR/$DOMAIN.issuer.crt"
KEY_FILE="$LOCAL_CERT_DIR/$DOMAIN.key"

for required_file in "$CERT_FILE" "$ISSUER_FILE" "$KEY_FILE"; do
  if [[ ! -f "$required_file" ]]; then
    echo "Missing certificate file: $required_file" >&2
    exit 1
  fi
done

if openssl x509 -in "$CERT_FILE" -noout -issuer 2>/dev/null | grep -q '(STAGING)' && [[ "$ALLOW_STAGING_CERT" != "true" ]]; then
  echo "Refusing to deploy staging certificate: $CERT_FILE" >&2
  echo "Set ALLOW_STAGING_CERT=true only for an intentional staging deploy." >&2
  exit 1
fi

TEMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

FULLCHAIN_FILE="$TEMP_DIR/fullchain.pem"
PRIVKEY_FILE="$TEMP_DIR/privkey.pem"

cat "$CERT_FILE" "$ISSUER_FILE" >"$FULLCHAIN_FILE"
cp "$KEY_FILE" "$PRIVKEY_FILE"
chmod 600 "$FULLCHAIN_FILE" "$PRIVKEY_FILE"

if ! ssh -i "$INSTANCE_SSH_KEY" \
  -p "$LOCAL_PORT" \
  -o BatchMode=yes \
  -o ConnectTimeout=3 \
  -o StrictHostKeyChecking=accept-new \
  "$REMOTE_USER@localhost" true >/dev/null 2>&1; then
  cat >&2 <<EOF
Production Bastion SSH tunnel is not reachable on localhost:$LOCAL_PORT.

Start the tunnel in another terminal, then rerun this command:

  bash bin/oci_bastion_ssh.sh --no-ssh
EOF
  exit 1
fi

ssh -i "$INSTANCE_SSH_KEY" -p "$LOCAL_PORT" "$REMOTE_USER@localhost" "mkdir -p '$REMOTE_STAGE_DIR'"

scp -i "$INSTANCE_SSH_KEY" -P "$LOCAL_PORT" \
  "$FULLCHAIN_FILE" \
  "$REMOTE_USER@localhost:$REMOTE_STAGE_DIR/fullchain.pem"

scp -i "$INSTANCE_SSH_KEY" -P "$LOCAL_PORT" \
  "$PRIVKEY_FILE" \
  "$REMOTE_USER@localhost:$REMOTE_STAGE_DIR/privkey.pem"

ssh -i "$INSTANCE_SSH_KEY" -p "$LOCAL_PORT" "$REMOTE_USER@localhost" \
  REMOTE_CERTS_PATH="$REMOTE_CERTS_PATH" \
  REMOTE_STAGE_DIR="$REMOTE_STAGE_DIR" \
  'bash -s' <<'EOF'
set -euo pipefail
sudo mkdir -p "$REMOTE_CERTS_PATH"
sudo install -m 0644 "$REMOTE_STAGE_DIR/fullchain.pem" "$REMOTE_CERTS_PATH/fullchain.pem"
sudo install -m 0600 "$REMOTE_STAGE_DIR/privkey.pem" "$REMOTE_CERTS_PATH/privkey.pem"
sudo rm -f "$REMOTE_STAGE_DIR/fullchain.pem" "$REMOTE_STAGE_DIR/privkey.pem"
if docker ps --format '{{.Names}}' | grep -qx rifferone-nginx; then
  docker exec rifferone-nginx nginx -t
  docker exec rifferone-nginx nginx -s reload
fi
EOF

echo "Certificate deployed to $REMOTE_CERTS_PATH on production host."
