#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/env.sh"
if [[ ! -f "$STUDIO_ROOT/web/dist/index.html" ]]; then
    echo 'Build the web client first: bash scripts/build.sh' >&2
    exit 1
fi
cd "$STUDIO_ROOT/server"
exec dotnet run --project Jellyfin.Server --no-build --no-launch-profile -- \
    --webdir "$STUDIO_ROOT/web/dist" \
    --datadir "$STUDIO_ROOT/.local/data" \
    --cachedir "$STUDIO_ROOT/.local/cache" \
    --configdir "$STUDIO_ROOT/.local/config" \
    --logdir "$STUDIO_ROOT/.local/log" \
    --ffmpeg "$(command -v ffmpeg)" "$@"
