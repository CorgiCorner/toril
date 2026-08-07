# Toril

Toril is an early self-hosted project from CorgiCorner. The public home will be
[toril.dev](https://toril.dev).

This `0.0.2` foundation intentionally contains only a small, containerized
placeholder. It establishes a reproducible image and a guarded release path
before product development starts.

## Run locally

```sh
docker compose up --build
```

Open <http://localhost:8080>. The health endpoint is available at
<http://localhost:8080/healthz>.

The released preview is also runnable with:

```sh
docker run --rm --read-only \
  --tmpfs /data:uid=10001,gid=10001 --tmpfs /config:uid=10001,gid=10001 \
  --cap-drop ALL --security-opt no-new-privileges \
  -p 8080:8080 ghcr.io/corgicorner/toril:0.0.2
```

## Status

Toril is pre-release software. The current supported release is `v0.0.2`.

## License

Toril is licensed under the GNU Affero General Public License v3.0 only.
See [LICENSE](LICENSE).
