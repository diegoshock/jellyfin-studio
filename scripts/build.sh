#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
cd "$STUDIO_ROOT/web"
npm run build:development
cd "$STUDIO_ROOT/server"
dotnet build Jellyfin.Server/Jellyfin.Server.csproj --no-restore -m:2
