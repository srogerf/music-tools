#!/usr/bin/env bash
set -euo pipefail

SMOKE_BASE_URL="${SMOKE_BASE_URL:-http://localhost:8081}"

curl -fsS "$SMOKE_BASE_URL/" >/dev/null
curl -fsS "$SMOKE_BASE_URL/api/v1/scales" >/dev/null

echo "Artifact smoke checks passed against $SMOKE_BASE_URL"
