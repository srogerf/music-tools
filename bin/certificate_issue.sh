#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GODADDY_ENV_FILE="${GODADDY_ENV_FILE:-$ROOT_DIR/.private/certificates/godaddy.env}"
LETSENCRYPT_ENV_FILE="${LETSENCRYPT_ENV_FILE:-$ROOT_DIR/.private/certificates/letsencrypt.env}"
DOMAIN="${CERTIFICATE_DOMAIN:-www.riffexchange.com}"
LETSENCRYPT_SERVER="https://acme-staging-v02.api.letsencrypt.org/directory"
MODE="run"

if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  PATH="$HOME/.local/bin:$PATH"
fi
if [[ ":$PATH:" != *":/snap/bin:"* ]]; then
  PATH="/snap/bin:$PATH"
fi

# shellcheck disable=SC1091
source "$ROOT_DIR/bin/lib/shell_helpers.sh"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/certificate_issue.sh [--production] [--renew] [--domain DOMAIN]

Issues or renews a Let's Encrypt certificate with lego using DNS-01 through
GoDaddy. Staging is used by default; pass --production only after staging works.

Private config:
  .private/certificates/godaddy.env
    GODADDY_API_KEY=...
    GODADDY_API_SECRET=...

  .private/certificates/letsencrypt.env
    LETSENCRYPT_EMAIL=operator@example.com

Output:
  .private/certificates/lego/
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --production)
      LETSENCRYPT_SERVER="https://acme-v02.api.letsencrypt.org/directory"
      shift
      ;;
    --renew)
      MODE="renew"
      shift
      ;;
    --domain)
      DOMAIN="${2:-}"
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

if ! command -v lego >/dev/null 2>&1; then
  echo "Missing lego. Install lego before running certificate issuance." >&2
  echo "Run: bash bin/localhost_bootstrap_env.sh" >&2
  echo "Then confirm ~/.local/bin is on PATH." >&2
  echo "See: https://go-acme.github.io/lego/installation/" >&2
  exit 1
fi

LEGO_BIN="$(command -v lego)"
if [[ -z "${LEGO_PATH:-}" ]]; then
  if [[ "$LEGO_BIN" == /snap/bin/lego ]]; then
    LEGO_PATH="${SNAP_USER_COMMON:-$HOME/snap/lego/common}/.lego"
  else
    LEGO_PATH="$ROOT_DIR/.private/certificates/lego"
  fi
fi

if [[ ! -f "$GODADDY_ENV_FILE" ]]; then
  echo "Missing GoDaddy env file: $GODADDY_ENV_FILE" >&2
  echo "Create it with GODADDY_API_KEY and GODADDY_API_SECRET." >&2
  exit 1
fi

if [[ ! -f "$LETSENCRYPT_ENV_FILE" ]]; then
  echo "Missing Let's Encrypt env file: $LETSENCRYPT_ENV_FILE" >&2
  echo "Create it with LETSENCRYPT_EMAIL=operator@example.com." >&2
  exit 1
fi

GODADDY_API_KEY="${GODADDY_API_KEY:-$(env_file_value "$GODADDY_ENV_FILE" GODADDY_API_KEY)}"
GODADDY_API_SECRET="${GODADDY_API_SECRET:-$(env_file_value "$GODADDY_ENV_FILE" GODADDY_API_SECRET)}"
LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL:-$(env_file_value "$LETSENCRYPT_ENV_FILE" LETSENCRYPT_EMAIL)}"

if [[ -z "${GODADDY_API_KEY:-}" || -z "${GODADDY_API_SECRET:-}" ]]; then
  echo "GoDaddy env must define GODADDY_API_KEY and GODADDY_API_SECRET." >&2
  exit 1
fi
export GODADDY_API_KEY GODADDY_API_SECRET

if [[ -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "Let's Encrypt env must define LETSENCRYPT_EMAIL." >&2
  exit 1
fi
export LETSENCRYPT_EMAIL

mkdir -p "$LEGO_PATH"
chmod 700 "$LEGO_PATH"
if [[ "$LEGO_PATH" == "$ROOT_DIR/.private/certificates/"* ]]; then
  chmod 700 "$ROOT_DIR/.private/certificates"
fi

echo "Using lego path: $LEGO_PATH"
echo "Certificate domain: $DOMAIN"
if [[ "$LETSENCRYPT_SERVER" == *staging* ]]; then
  echo "ACME server: staging"
else
  echo "ACME server: production"
fi

lego \
  --path "$LEGO_PATH" \
  --server "$LETSENCRYPT_SERVER" \
  --email "$LETSENCRYPT_EMAIL" \
  --dns godaddy \
  --domains "$DOMAIN" \
  --accept-tos \
  "$MODE"
