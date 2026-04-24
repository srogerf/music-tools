#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PRODUCTION_ENV_FILE:-$ROOT_DIR/.private/deploy/production.env}"
IMAGE_TAG_OVERRIDE=""

usage() {
  cat >&2 <<'EOF'
Usage: bash bin/production_image_push.sh [--tag TAG]

Pushes a previously built production image to GHCR.

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
GHCR_USER="${GHCR_USER:-}"
GHCR_PUSH_TOKEN="${GHCR_PUSH_TOKEN:-${GHCR_TOKEN:-}}"
IMAGE_TAG="${IMAGE_TAG_OVERRIDE:-${IMAGE_TAG:-sha-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD)}}"

if [[ -z "$GHCR_USER" || -z "$GHCR_PUSH_TOKEN" ]]; then
  echo "Set GHCR_USER and GHCR_PUSH_TOKEN in $ENV_FILE before pushing." >&2
  echo "GHCR_PUSH_TOKEN falls back to GHCR_TOKEN if you intentionally use one token for both pull and push." >&2
  exit 1
fi

bash "$ROOT_DIR/bin/localhost_docker_access_check.sh"

if ! docker image inspect "$GHCR_IMAGE_REPO:$IMAGE_TAG" >/dev/null 2>&1; then
  echo "Missing local image: $GHCR_IMAGE_REPO:$IMAGE_TAG" >&2
  echo "Run bash bin/production_image_build.sh --tag $IMAGE_TAG first." >&2
  exit 1
fi

echo "$GHCR_PUSH_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker push "$GHCR_IMAGE_REPO:$IMAGE_TAG"
echo "Pushed image: $GHCR_IMAGE_REPO:$IMAGE_TAG"

if [[ -n "${EXTRA_IMAGE_TAGS:-}" ]]; then
  IFS=',' read -r -a extra_tags <<<"$EXTRA_IMAGE_TAGS"
  for extra_tag in "${extra_tags[@]}"; do
    extra_tag="$(echo "$extra_tag" | xargs)"
    if [[ -z "$extra_tag" ]]; then
      continue
    fi
    if ! docker image inspect "$GHCR_IMAGE_REPO:$extra_tag" >/dev/null 2>&1; then
      docker tag "$GHCR_IMAGE_REPO:$IMAGE_TAG" "$GHCR_IMAGE_REPO:$extra_tag"
    fi
    docker push "$GHCR_IMAGE_REPO:$extra_tag"
    echo "Pushed image: $GHCR_IMAGE_REPO:$extra_tag"
  done
fi
