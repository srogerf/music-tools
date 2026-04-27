#!/usr/bin/env bash
set -euo pipefail

SMOKE_BASE_URL="${SMOKE_BASE_URL:-http://localhost:8081}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/test_smoke.sh

Runs a small HTTP smoke check against the built test artifact server.

Environment overrides:
  SMOKE_BASE_URL  Base URL to check. Defaults to http://localhost:8081
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

curl -fsS "$SMOKE_BASE_URL/" >/dev/null
curl -fsS "$SMOKE_BASE_URL/api/v1/scales" >/dev/null

echo "Artifact smoke checks passed against $SMOKE_BASE_URL"
