#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
command -v node >/dev/null
command -v ffmpeg >/dev/null
command -v ffprobe >/dev/null
mkdir -p "$STUDIO_TOOLS"
if [[ ! -x "$STUDIO_TOOLS/npm/node_modules/.bin/npm" ]]; then
    npm install --prefix "$STUDIO_TOOLS/npm" --no-audit --no-fund npm@10.9.4
fi
if ! command -v dotnet >/dev/null || ! dotnet --list-sdks | grep -q '^9\.'; then
    installer="$(mktemp)"
    trap 'rm -f "$installer"' EXIT
    curl --fail --location --retry 2 https://dot.net/v1/dotnet-install.sh -o "$installer"
    bash "$installer" --version 9.0.320 --install-dir "$STUDIO_TOOLS/dotnet" --no-path
fi
source "$(dirname "$0")/env.sh"
cd "$STUDIO_ROOT/web"
npm ci --no-audit --no-fund
cd "$STUDIO_ROOT/server"
dotnet restore Jellyfin.Server/Jellyfin.Server.csproj --disable-parallel
