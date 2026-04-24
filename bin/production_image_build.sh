#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PRODUCTION_ENV_FILE:-$ROOT_DIR/.private/deploy/production.env}"
IMAGE_TAG_OVERRIDE=""
SKIP_ARTIFACTS="false"

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_image_build.sh [--tag TAG] [--skip-artifacts]

Builds the production application image for GHCR from the verified build/test
artifacts.

Defaults:
  --env-file via PRODUCTION_ENV_FILE or .private/deploy/production.env
  tag from IMAGE_TAG or sha-<git-sha>
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag)
      IMAGE_TAG_OVERRIDE="${2:-}"
      shift 2
      ;;
    --skip-artifacts)
      SKIP_ARTIFACTS="true"
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
IMAGE_TAG="${IMAGE_TAG_OVERRIDE:-${IMAGE_TAG:-sha-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)}}"

bash "$ROOT_DIR/bin/localhost_docker_access_check.sh"

if [[ "$SKIP_ARTIFACTS" != "true" ]]; then
  bash "$ROOT_DIR/bin/build_artifacts.sh"
fi

docker build \
  -t "$GHCR_IMAGE_REPO:$IMAGE_TAG" \
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
