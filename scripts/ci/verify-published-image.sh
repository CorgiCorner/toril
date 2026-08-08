#!/usr/bin/env bash
set -euo pipefail

image_ref="${1:-}"
expected_version="${2:-}"
expected_revision="${3:-}"

[[ "$image_ref" =~ ^ghcr\.io/[a-z0-9-]+/[a-z0-9-]+@sha256:[0-9a-f]{64}$ ]] || {
  echo "A digest-pinned GHCR image is required." >&2
  exit 2
}
[[ "$expected_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "A semantic version is required." >&2
  exit 2
}
[[ "$expected_revision" =~ ^[0-9a-f]{40}$ ]] || {
  echo "A full source revision is required." >&2
  exit 2
}

manifest_json="$(docker buildx imagetools inspect "$image_ref" --format '{{json .Manifest}}')"
image_json="$(docker buildx imagetools inspect "$image_ref" --format '{{json .Image}}')"
expected_digest="${image_ref##*@}"
printf '%s' "$manifest_json" | jq -e --arg digest "$expected_digest" '
  .digest == $digest and
  ([.manifests[] | select(.platform.os == "linux" and .platform.architecture == "amd64")] | length) == 1 and
  ([.manifests[] | select(.platform.os == "linux" and .platform.architecture == "arm64")] | length) == 1
' >/dev/null
printf '%s' "$image_json" | jq -e --arg version "$expected_version" --arg revision "$expected_revision" '
  .["linux/amd64"].architecture == "amd64" and
  .["linux/arm64"].architecture == "arm64" and
  .["linux/amd64"].config.User == "10001:10001" and
  .["linux/arm64"].config.User == "10001:10001" and
  .["linux/amd64"].config.Labels["org.opencontainers.image.version"] == $version and
  .["linux/arm64"].config.Labels["org.opencontainers.image.version"] == $version and
  .["linux/amd64"].config.Labels["org.opencontainers.image.revision"] == $revision and
  .["linux/arm64"].config.Labels["org.opencontainers.image.revision"] == $revision and
  .["linux/amd64"].config.Labels["org.opencontainers.image.licenses"] == "AGPL-3.0-only" and
  .["linux/arm64"].config.Labels["org.opencontainers.image.licenses"] == "AGPL-3.0-only"
' >/dev/null

for platform in linux/amd64 linux/arm64; do
  architecture="${platform##*/}"
  platform_digest="$(printf '%s' "$manifest_json" | jq -er --arg architecture "$architecture" '
    .manifests[] | select(.platform.os == "linux" and .platform.architecture == $architecture) | .digest
  ')"
  platform_ref="${image_ref%@*}@${platform_digest}"
  name="toril-published-${platform##*/}-${RANDOM}-$$"
  cleanup_container() { docker rm --force "$name" >/dev/null 2>&1 || true; }
  trap cleanup_container EXIT
  docker run --detach --name "$name" --platform "$platform" \
    --read-only \
    --tmpfs /data:uid=10001,gid=10001 --tmpfs /config:uid=10001,gid=10001 \
    --cap-drop ALL --security-opt no-new-privileges \
    --publish 127.0.0.1::8080 "$platform_ref" >/dev/null
  port="$(docker port "$name" 8080/tcp | awk -F: 'NR == 1 { print $NF }')"
  passed=false
  for _ in $(seq 1 30); do
    if curl --fail --silent "http://127.0.0.1:${port}/healthz" | grep -qx ok; then
      curl --fail --silent "http://127.0.0.1:${port}/" | grep -q '<h1>Toril</h1>'
      test "$(docker inspect --format '{{.Config.User}}' "$name")" = "10001:10001"
      passed=true
      break
    fi
    sleep 1
  done
  if [[ "$passed" != true ]]; then
    docker logs "$name" >&2
    echo "Published image smoke test failed for ${platform}." >&2
    exit 1
  fi
  cleanup_container
  trap - EXIT
done

echo "Published image verification passed for linux/amd64 and linux/arm64."
