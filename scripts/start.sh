#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
if [[ ! -f "$STUDIO_ROOT/web/dist/index.html" ]]; then
    echo 'Build the web client first: bash scripts/build.sh' >&2
    exit 1
fi
cd "$STUDIO_ROOT/server"
if [[ -f "$STUDIO_ROOT/server/Jellyfin.Server/bin/Debug/net10.0/jellyfin.dll" ]]; then
    studio_server=(dotnet run --project Jellyfin.Server --no-build --no-launch-profile --)
elif [[ -x "$STUDIO_ROOT/.local/publish-v12/jellyfin" ]]; then
    studio_server=("$STUDIO_ROOT/.local/publish-v12/jellyfin")
else
    echo 'Build Jellyfin 12.4 first: bash scripts/build.sh' >&2
    exit 1
fi
exec "${studio_server[@]}" \
    --webdir "$STUDIO_ROOT/web/dist" \
    --datadir "$STUDIO_ROOT/.local/data" \
    --cachedir "$STUDIO_ROOT/.local/cache" \
    --configdir "$STUDIO_ROOT/.local/config" \
    --logdir "$STUDIO_ROOT/.local/log" \
    --ffmpeg "$(command -v ffmpeg)" "$@"
