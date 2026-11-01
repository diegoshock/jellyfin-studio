# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS web-build
WORKDIR /src/web
COPY web/package.json web/package-lock.json web/.npmrc ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then \
      NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca npm ci --no-audit --no-fund; \
    else npm ci --no-audit --no-fund; fi
COPY web/ ./
RUN npm run build:production

FROM mcr.microsoft.com/dotnet/sdk:9.0-bookworm-slim AS server-build
WORKDIR /src/server
COPY server/ ./
RUN --mount=type=secret,id=system_ca \
    if [ -f /run/secrets/system_ca ]; then \
      SSL_CERT_FILE=/run/secrets/system_ca dotnet publish Jellyfin.Server/Jellyfin.Server.csproj \
        -c Release -r linux-x64 --self-contained true -o /out -m:2; \
    else dotnet publish Jellyfin.Server/Jellyfin.Server.csproj \
      -c Release -r linux-x64 --self-contained true -o /out -m:2; fi

FROM jellyfin/jellyfin:10.11.11 AS runtime
WORKDIR /jellyfin
LABEL org.opencontainers.image.title="Jellyfin Studio" \
      org.opencontainers.image.source="https://github.com/diegoshock/jellyfin-studio" \
      org.opencontainers.image.licenses="GPL-2.0-or-later" \
      org.opencontainers.image.description="Jellyfin server with the Studio web interface"
COPY --chmod=755 --from=server-build /out/ /jellyfin/
COPY --chmod=755 --from=web-build /src/web/dist/ /jellyfin/jellyfin-web/
ENV JELLYFIN_DATA_DIR=/config \
    JELLYFIN_CONFIG_DIR=/config/config \
    JELLYFIN_LOG_DIR=/config/log \
    JELLYFIN_CACHE_DIR=/cache \
    JELLYFIN_WEB_DIR=/jellyfin/jellyfin-web
EXPOSE 8096/tcp
VOLUME /config /cache
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl --noproxy localhost --fail --silent http://localhost:8096/health || exit 1
ENTRYPOINT ["/jellyfin/jellyfin"]
CMD ["--webdir", "/jellyfin/jellyfin-web", "--ffmpeg", "/usr/lib/jellyfin-ffmpeg/ffmpeg"]
