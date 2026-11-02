#!/usr/bin/env bash
# Source this file from another Studio script.
STUDIO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STUDIO_TOOLS="${JELLYFIN_STUDIO_TOOLS:-$(dirname "$STUDIO_ROOT")/.tools}"
for studio_dotnet_dir in "$STUDIO_TOOLS/dotnet10" "$STUDIO_TOOLS/dotnet"; do
    if [[ -x "$studio_dotnet_dir/dotnet" ]]; then
        export DOTNET_ROOT="$studio_dotnet_dir"
        export PATH="$DOTNET_ROOT:$PATH"
        break
    fi
done
if [[ -x "$STUDIO_TOOLS/npm/node_modules/.bin/npm" ]]; then
    export PATH="$STUDIO_TOOLS/npm/node_modules/.bin:$PATH"
fi
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export DOTNET_NOLOGO=1
