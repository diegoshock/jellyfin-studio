#!/usr/bin/env bash
# Source this file from another Studio script.
STUDIO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STUDIO_TOOLS="${JELLYFIN_STUDIO_TOOLS:-$(dirname "$STUDIO_ROOT")/.tools}"
if [[ -x "$STUDIO_TOOLS/dotnet/dotnet" ]]; then
    export DOTNET_ROOT="$STUDIO_TOOLS/dotnet"
    export PATH="$DOTNET_ROOT:$PATH"
fi
if [[ -x "$STUDIO_TOOLS/npm/node_modules/.bin/npm" ]]; then
    export PATH="$STUDIO_TOOLS/npm/node_modules/.bin:$PATH"
fi
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export DOTNET_NOLOGO=1
