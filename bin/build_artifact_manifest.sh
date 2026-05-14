#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_DIR="${BUILD_DIR:-$ROOT_DIR/build/test}"
FRONTEND_DIR="${FRONTEND_DIR:-$BUILD_DIR/frontend/app}"
SERVER_BINARY="${SERVER_BINARY:-$BUILD_DIR/server/rifferone}"
VERSIONS_FILE="${VERSIONS_FILE:-$ROOT_DIR/db/postgres/versions.json}"
MANIFEST_FILE="${MANIFEST_FILE:-$BUILD_DIR/artifact-manifest.json}"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/build_artifact_manifest.sh

Writes a build manifest for the current test artifacts to build/test/artifact-manifest.json.
EOF
}

json_escape() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  value="${value//$'\n'/\\n}"
  value="${value//$'\r'/\\r}"
  value="${value//$'\t'/\\t}"
  printf '%s' "$value"
}

trim_whitespace() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

file_sha256() {
  sha256sum "$1" | awk '{print $1}'
}

dir_sha256() {
  local dir="$1"
  find "$dir" -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}'
}

json_field() {
  local key="$1"
  local file="$2"
  grep -E "\"$key\"[[:space:]]*:" "$file" | head -n 1 | sed -E 's/^[^:]*:[[:space:]]*//; s/[[:space:]]*,?[[:space:]]*$//'
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

if [[ ! -f "$SERVER_BINARY" ]]; then
  echo "Missing server artifact: $SERVER_BINARY" >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "Missing frontend artifact directory: $FRONTEND_DIR" >&2
  exit 1
fi

if [[ ! -f "$VERSIONS_FILE" ]]; then
  echo "Missing versions file: $VERSIONS_FILE" >&2
  exit 1
fi

mkdir -p "$BUILD_DIR"

git_commit="$(git -C "$ROOT_DIR" rev-parse HEAD)"
git_commit_short="$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)"
git_branch="$(git -C "$ROOT_DIR" branch --show-current || true)"
git_dirty="false"
if ! git -C "$ROOT_DIR" diff --quiet --ignore-submodules -- . ':!build'; then
  git_dirty="true"
fi

build_utc="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
server_sha256="$(file_sha256 "$SERVER_BINARY")"
frontend_sha256="$(dir_sha256 "$FRONTEND_DIR")"
versions_sha256="$(file_sha256 "$VERSIONS_FILE")"
schema_version="$(json_field schema_version "$VERSIONS_FILE" | tr -d '[:space:]')"
data_format_version="$(json_field data_format_version "$VERSIONS_FILE" | tr -d '[:space:]')"

if [[ -z "$schema_version" || -z "$data_format_version" ]]; then
  echo "Unable to read schema_version or data_format_version from $VERSIONS_FILE" >&2
  exit 1
fi

artifact_id="sha-$git_commit_short"

cat >"$MANIFEST_FILE" <<EOF
{
  "artifact_id": "$(json_escape "$artifact_id")",
  "git_commit": "$(json_escape "$git_commit")",
  "git_commit_short": "$(json_escape "$git_commit_short")",
  "git_branch": "$(json_escape "$git_branch")",
  "git_dirty": $git_dirty,
  "build_utc": "$(json_escape "$build_utc")",
  "server_binary": {
    "path": "build/test/server/rifferone",
    "sha256": "$(json_escape "$server_sha256")"
  },
  "frontend_bundle": {
    "path": "build/test/frontend/app",
    "sha256": "$(json_escape "$frontend_sha256")"
  },
  "db_versions": {
    "path": "db/postgres/versions.json",
    "sha256": "$(json_escape "$versions_sha256")",
    "schema_version": $schema_version,
    "data_format_version": $data_format_version
  }
}
EOF

echo "Wrote artifact manifest to $MANIFEST_FILE"
