#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
cd "$STUDIO_ROOT/web"
npm run build:production
cd "$STUDIO_ROOT/server"
dotnet publish Jellyfin.Server/Jellyfin.Server.csproj -c Release -r linux-x64 \
    --self-contained true -o "$STUDIO_ROOT/.local/publish" -m:2
cd "$STUDIO_ROOT"
docker build -f Dockerfile.local -t jellyfin-studio:local .
