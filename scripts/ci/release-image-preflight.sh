#!/usr/bin/env bash
set -euo pipefail

: "${GH_TOKEN:?GH_TOKEN is required}"
: "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required}"
: "${IMAGE:?IMAGE is required}"
: "${ORIGIN_SHA:?ORIGIN_SHA is required}"
: "${PUBLIC_SHA:?PUBLIC_SHA is required}"
: "${VERSION:?VERSION is required}"

[[ "$PUBLIC_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid public SHA." >&2; exit 1; }
[[ "$ORIGIN_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "Invalid origin SHA." >&2; exit 1; }
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Invalid version." >&2; exit 1; }
[[ "$IMAGE" =~ ^ghcr\.io/[a-z0-9-]+/[a-z0-9-]+$ ]] || { echo "Invalid image." >&2; exit 1; }

release_file="$(mktemp)"
inspect_error="$(mktemp)"
work_dir="$(mktemp -d)"
cleanup() { rm -f "$release_file" "$inspect_error"; rm -rf "$work_dir"; }
trap cleanup EXIT

release_status="$(
  curl --silent --show-error --output "$release_file" --write-out '%{http_code}' \
    --header 'Accept: application/vnd.github+json' \
    --header "Authorization: Bearer $GH_TOKEN" \
    --header 'X-GitHub-Api-Version: 2022-11-28' \
    "https://api.github.com/repos/${GITHUB_REPOSITORY}/releases/tags/v${VERSION}"
)"
case "$release_status" in
  200) release_exists=true ;;
  404) release_exists=false ;;
  *) echo "GitHub Release preflight returned HTTP ${release_status}." >&2; exit 1 ;;
esac

image_ref="${IMAGE}:${VERSION}"
if digest="$(docker buildx imagetools inspect "$image_ref" --format '{{.Manifest.Digest}}' 2>"$inspect_error")"; then
  [[ "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || { echo "Invalid existing image digest." >&2; exit 1; }
  image_exists=true
else
  if grep -Eqi '(manifest unknown|not found|does not exist)' "$inspect_error"; then
    image_exists=false
    digest=""
  else
    cat "$inspect_error" >&2
    echo "Cannot determine whether ${image_ref} exists." >&2
    exit 1
  fi
fi

if [[ "$release_exists" == true ]]; then
  [[ "$image_exists" == true ]] || { echo "GitHub Release exists without its image tag." >&2; exit 1; }
  jq -e --arg tag "v${VERSION}" '
    .tag_name == $tag and .name == $tag and .draft == false and .prerelease == false
  ' "$release_file" >/dev/null
  gh release download "v${VERSION}" --repo "$GITHUB_REPOSITORY" \
    --pattern release-manifest.json --dir "$work_dir"
  node scripts/ci/release-image-manifest.mjs verify \
    --manifest "$work_dir/release-manifest.json" \
    --version "$VERSION" \
    --source-sha "$PUBLIC_SHA" \
    --origin-sha "$ORIGIN_SHA" \
    --image "$IMAGE" \
    --digest "$digest"
  mode=verify
elif [[ "$image_exists" == true ]]; then
  mode=recover
else
  mode=publish
fi

{
  echo "digest=$digest"
  echo "mode=$mode"
} >> "$GITHUB_OUTPUT"
echo "Immutable release preflight selected mode=${mode}."
