#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
IMAGE="${TORIL_IMAGE:-toril:smoke}"
NAME="toril-smoke-$RANDOM-$$"

trap 'docker rm --force "$NAME" >/dev/null 2>&1 || true' EXIT

docker build \
  --build-arg APP_VERSION="$(node -p "require('$ROOT/package.json').version")" \
  --build-arg APP_REVISION="$(git -C "$ROOT" rev-parse --verify HEAD 2>/dev/null || echo local)" \
  --tag "$IMAGE" "$ROOT"
docker run --detach --name "$NAME" \
  --read-only \
  --tmpfs /data:uid=10001,gid=10001 --tmpfs /config:uid=10001,gid=10001 \
  --cap-drop ALL --security-opt no-new-privileges \
  --publish 127.0.0.1::8080 "$IMAGE" >/dev/null

PORT="$(docker port "$NAME" 8080/tcp | awk -F: 'NR == 1 { print $NF }')"
for _ in $(seq 1 30); do
  if curl --fail --silent "http://127.0.0.1:${PORT}/healthz" | grep -qx ok; then
    curl --fail --silent "http://127.0.0.1:${PORT}/" | grep -q "<h1>Toril</h1>"
    test "$(docker inspect --format '{{.Config.User}}' "$NAME")" = "10001:10001"
    echo "Toril image smoke test passed on port ${PORT}."
    exit 0
  fi
  sleep 1
done

docker logs "$NAME" >&2
echo "Toril image did not become healthy." >&2
exit 1
