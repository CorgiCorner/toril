# Toril

Toril is an early self-hosted project from CorgiCorner. The public home will be
[toril.dev](https://toril.dev).

This `0.0.1` foundation intentionally contains only a small, containerized
placeholder. It establishes a reproducible image and a guarded release path
before product development starts.

## Run locally

```sh
docker compose up --build
```

Open <http://localhost:8080>. The health endpoint is available at
<http://localhost:8080/healthz>.

Once the first release is published, the same preview will be runnable with:

```sh
docker run --rm --read-only \
  --tmpfs /data:uid=10001,gid=10001 --tmpfs /config:uid=10001,gid=10001 \
  --cap-drop ALL --security-opt no-new-privileges \
  -p 8080:8080 ghcr.io/corgicorner/toril:0.0.1
```

## Status

Toril is pre-release software. No public image or release is available until the
maintainer approves and publishes `v0.0.1`.

## License

Toril is licensed under the GNU Affero General Public License v3.0 only.
See [LICENSE](LICENSE).
