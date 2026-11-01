# Upstream sources

Jellyfin Studio imports the official Jellyfin server and web client into one
repository. These directories are source copies, not Git submodules.

| Directory | Upstream | Release | Commit |
| --- | --- | --- | --- |
| `server/` | https://github.com/jellyfin/jellyfin | v10.11.11 | `1fbd8739292cce610231be93daf43368733edf63` |
| `web/` | https://github.com/jellyfin/jellyfin-web | v10.11.11 | `35c0793ece3adbd247eab290ae1effab851f3d37` |

Both projects retain their original license and copyright notices. See
`server/LICENSE` and `web/LICENSE` (GPL-2.0-or-later). Jellyfin Studio is an
independent derivative, not an official Jellyfin release.

The server starts from the upstream implementation. Studio's initial visual
changes are isolated in `web/src/themes/studio/`, its MUI color scheme in
`web/src/themes/themes.ts`, and the default theme selection in
`web/src/config.json` and `web/src/hooks/useUserTheme.ts`. Authentication, libraries, playback and administration
continue to use the upstream client and API.

`web/src/themes/themeStorageManager.ts` also preserves the active theme when
React mounts, keeping the legacy and React palettes consistent.

The same storage manager is used by React islands in `web/src/utils/reactUtils.tsx`.
Header, loading and dashboard logos use the original `@jellyfin/ux-web` artwork
as a CSS mask in burgundy, preserving the Jellyfin silhouette. Player sliders
read Studio's accent variables, with upstream colors as fallbacks for other themes.
The logo artwork remains under CC-BY-SA-4.0; see `unraid/LOGO-LICENSE.md` for
attribution and the color modification notice.

The modern home spotlight in `web/src/components/studio/` is mounted by
`web/src/controllers/hometab.js`. It queries the current user's latest movies
and delegates playback and detail routing to Jellyfin. Home sections retain
their existing configuration; Studio uses compact library buttons on desktop
and mobile while TV retains upstream library tiles.

## Updating

Choose a matching stable release for both projects. Obtain the old and new
upstream trees in temporary directories, generate a diff for each component,
and apply those diffs to `server/` and `web/` while resolving Studio changes.
Do not replace the directories wholesale: that would erase local work.
Update the commit IDs above and rerun the build, tests and API smoke checks.

This source import does not create a GitHub fork relationship. Creating forks
under a GitHub account requires authenticated GitHub API access separately.
