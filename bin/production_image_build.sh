#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PRODUCTION_ENV_FILE:-$ROOT_DIR/.private/deploy/production.env}"
IMAGE_TAG_OVERRIDE=""
BUILD_ARTIFACTS="false"
MANIFEST_FILE="$ROOT_DIR/build/test/artifact-manifest.json"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_image_build.sh [--tag TAG] [--build-artifacts]

Builds the production application image for GHCR from the verified build/test
artifacts.

Defaults:
  --env-file via PRODUCTION_ENV_FILE or .private/deploy/production.env
  tag from IMAGE_TAG or the artifact manifest's artifact_id
  reuse existing build/test artifacts unless --build-artifacts is provided
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      IMAGE_TAG_OVERRIDE="${2:-}"
      shift 2
      ;;
    --build-artifacts)
      BUILD_ARTIFACTS="true"
      shift
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

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing production env file: $ENV_FILE" >&2
  echo "Copy deploy/cicd/production.env.example to .private/deploy/production.env and fill it in." >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

GHCR_IMAGE_REPO="${GHCR_IMAGE_REPO:-ghcr.io/srogerf/music-tools/rifferone}"

bash "$ROOT_DIR/bin/localhost_docker_access_check.sh"

if [[ "$BUILD_ARTIFACTS" == "true" ]]; then
  bash "$ROOT_DIR/bin/build_artifacts.sh"
fi

if [[ ! -f "$MANIFEST_FILE" ]]; then
  echo "Missing artifact manifest: $MANIFEST_FILE" >&2
  echo "Run bash bin/build_artifacts.sh first, or pass --build-artifacts." >&2
  exit 1
fi

manifest_value() {
  local key="$1"
  grep -E "\"$key\"[[:space:]]*:" "$MANIFEST_FILE" | head -n 1 | sed -E 's/^[^:]*:[[:space:]]*//; s/[[:space:]]*,?[[:space:]]*$//; s/^\"//; s/\"$//'
}

IMAGE_TAG="${IMAGE_TAG_OVERRIDE:-${IMAGE_TAG:-$(manifest_value artifact_id)}}"
GIT_REVISION="$(manifest_value git_commit)"
BUILD_UTC="$(manifest_value build_utc)"
MANIFEST_SHA256="$(sha256sum "$MANIFEST_FILE" | awk '{print $1}')"

docker build \
  -t "$GHCR_IMAGE_REPO:$IMAGE_TAG" \
  --label "org.opencontainers.image.revision=$GIT_REVISION" \
  --label "org.opencontainers.image.created=$BUILD_UTC" \
  --label "com.rifferone.artifact.id=$IMAGE_TAG" \
  --label "com.rifferone.artifact.manifest-sha256=$MANIFEST_SHA256" \
  -f "$ROOT_DIR/deploy/container/docker/rifferOne/Dockerfile" \
  "$ROOT_DIR"

echo "Built image: $GHCR_IMAGE_REPO:$IMAGE_TAG"

if [[ -n "${EXTRA_IMAGE_TAGS:-}" ]]; then
  IFS=',' read -r -a extra_tags <<<"$EXTRA_IMAGE_TAGS"
  for extra_tag in "${extra_tags[@]}"; do
    extra_tag="$(echo "$extra_tag" | xargs)"
    if [[ -z "$extra_tag" ]]; then
      continue
    fi
    docker tag "$GHCR_IMAGE_REPO:$IMAGE_TAG" "$GHCR_IMAGE_REPO:$extra_tag"
    echo "Tagged image: $GHCR_IMAGE_REPO:$extra_tag"
  done
fi
