# Toril

Toril is an early self-hosted project from CorgiCorner. The reserved project
domain is [toril.dev](https://toril.dev); documentation currently lives in this
repository.

The `0.0.x` line is Toril's distribution foundation. It provides a reproducible,
hardened container and a guarded release path around a minimal status page. It
does not connect to Redis or inspect Bull or BullMQ queues.

## Install a release

```sh
TORIL_VERSION=0.0.3 docker compose pull
TORIL_VERSION=0.0.3 docker compose up -d
```

Open <http://localhost:8080>. The health endpoint is available at
<http://localhost:8080/healthz>.

The Compose service binds to loopback by default. Put an authenticated reverse
proxy in front of it before exposing it beyond the host.

For a digest-pinned installation, replace the version tag with the digest from
the matching GitHub Release manifest:

```sh
docker run --rm --read-only \
  --tmpfs /data:uid=10001,gid=10001 --tmpfs /config:uid=10001,gid=10001 \
  --cap-drop ALL --security-opt no-new-privileges \
  -p 127.0.0.1:8080:8080 \
  ghcr.io/corgicorner/toril@sha256:<release-manifest-digest>
```

## Build from source

```sh
docker compose -f docker-compose.dev.yml up --build
```

The development Compose file is intentionally separate from the release
installation path.

## Release status

The current supported distribution foundation release is `v0.0.3`. It validates
packaging and installation, but it is not a functional queue dashboard release.

## License

Toril is licensed under the GNU Affero General Public License v3.0 only.
See [LICENSE](LICENSE).
