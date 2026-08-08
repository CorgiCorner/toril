FROM caddy:2.10.2-alpine@sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d

ARG APP_VERSION
ARG APP_REVISION=unknown

RUN setcap -r /usr/bin/caddy \
    && addgroup -S -g 10001 toril \
    && adduser -S -D -H -u 10001 -G toril toril

LABEL org.opencontainers.image.title="Toril" \
      org.opencontainers.image.description="Toril distribution foundation" \
      org.opencontainers.image.url="https://toril.dev" \
      org.opencontainers.image.source="https://github.com/CorgiCorner/toril" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${APP_REVISION}"

COPY --chown=10001:10001 Caddyfile /etc/caddy/Caddyfile
COPY --chown=10001:10001 site/ /srv/

USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=3s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
