#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
command -v node >/dev/null
node -e 'if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("Jellyfin 12.4 requires Node.js 24 or newer")'
command -v ffmpeg >/dev/null
command -v ffprobe >/dev/null
mkdir -p "$STUDIO_TOOLS"
if [[ ! -x "$STUDIO_TOOLS/npm/node_modules/.bin/npm" ]] || [[ "$(node "$STUDIO_TOOLS/npm/node_modules/npm/bin/npm-cli.js" --version)" != 11.21.1 ]]; then
    npm install --prefix "$STUDIO_TOOLS/npm" --no-audit --no-fund npm@11.21.1
fi
if [[ ! -x "$STUDIO_TOOLS/dotnet10/dotnet" ]] || ! "$STUDIO_TOOLS/dotnet10/dotnet" --list-sdks | grep -q '^10\.'; then
    installer="$(mktemp)"
    trap 'rm -f "$installer"' EXIT
    curl --fail --location --retry 2 https://dot.net/v1/dotnet-install.sh -o "$installer"
    bash "$installer" --version 10.0.403 --install-dir "$STUDIO_TOOLS/dotnet10" --no-path
fi
source "$(dirname "$0")/env.sh"
cd "$STUDIO_ROOT/web"
npm ci --no-audit --no-fund
cd "$STUDIO_ROOT/server"
dotnet restore Jellyfin.Server/Jellyfin.Server.csproj --disable-parallel
