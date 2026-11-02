# Upstream sources

Jellyfin Studio imports the official Jellyfin server and web client into one
repository. These directories are source copies, not Git submodules.

| Directory | Upstream | Release | Commit |
| --- | --- | --- | --- |
| `server/` | https://github.com/jellyfin/jellyfin | v12.4 | `83d0d0e7f76e23e2e085c8ff67d28b772d35967d` |
| `web/` | https://github.com/jellyfin/jellyfin-web | v12.4 | `0a580ce8df89282dfd120b6d5efb8e106da23bd5` |

Both projects retain their original license and copyright notices. See
`server/LICENSE` and `web/LICENSE` (GPL-2.0-or-later). Jellyfin Studio is an
independent derivative, not an official Jellyfin release.

The server starts from the upstream implementation. Studio's initial visual
changes are isolated in `web/src/themes/studio/`, its MUI color scheme in
`web/src/themes/studio/index.ts`, and the default theme selection in
`web/src/config.json` and `web/src/hooks/useUserTheme.ts`. Authentication, libraries, playback and administration
continue to use the upstream client and API.

`web/src/themes/themeStorageManager.ts` also preserves the active theme when
React mounts, keeping the legacy and React palettes consistent.

React islands use Jellyfin 12's `CustomThemeProvider` to synchronize the selected
theme without replacing the root color scheme.
Header, loading and dashboard logos use the original `@jellyfin/ux-web` artwork
as a CSS mask in burgundy, preserving the Jellyfin silhouette. Player sliders
read Studio's accent variables, with upstream colors as fallbacks for other themes.
The logo artwork remains under CC-BY-SA-4.0; see `unraid/LOGO-LICENSE.md` for
attribution and the color modification notice.

The modern home spotlight in `web/src/components/studio/` is mounted by
`web/src/apps/legacy/controllers/hometab.js`. It queries the current user's latest movies
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
